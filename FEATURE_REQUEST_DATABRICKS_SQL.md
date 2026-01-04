# Feature Request: Enhanced Databricks SQL Syntax Support

## Status: ✅ RESOLVED in SDK v1.6.1

**Update**: SDK v1.6.1 includes enhanced Databricks support, including fixes for multiline COMMENT clauses. This feature request has been addressed in the SDK. The frontend code has been updated to leverage SDK v1.6.1+ native Databricks support, with preprocessing kept as a fallback for compatibility.

## Summary
~~The SQL parser in the WASM SDK and API backend currently does not support Databricks-specific syntax patterns, particularly the `IDENTIFIER()` function with variable references and string concatenation. This prevents users from importing Databricks SQL DDL statements that use dynamic table name construction.~~

**SDK v1.6.1+ now supports:**
- `IDENTIFIER()` function with variable references
- Variable references in STRUCT/ARRAY type definitions  
- Databricks-specific syntax (USING DELTA, COMMENT, TBLPROPERTIES, CLUSTER BY)
- Enhanced Databricks SQL parsing and export

## Problem Statement

### Current Behavior
When attempting to import Databricks SQL that contains `IDENTIFIER()` functions with variable references, the parser fails with errors like:

```
ParseError: sql parser error: Expected: column name or constraint definition, found: : at Line: 1, Column: 39
```

### Example Failing SQL

**Full Example with All Databricks-Specific Patterns:**

```sql
CREATE TABLE IF NOT EXISTS IDENTIFIER(:catalog_name || '.schema.example_table') (
  id STRING COMMENT 'Unique identifier for each record.',
  name STRING COMMENT 'Name of the record.',
  
  -- ARRAY with STRUCT containing variable references
  rulesTriggered ARRAY<STRUCT<
    id: STRING,
    name: STRING,
    priorityOrder: INT,
    group: STRING,
    sound: STRING,
    alertOperation: STRUCT<
      name: STRING,
      field: STRING,
      revert: :variable_type,  -- Variable reference in nested STRUCT (Line 5, Column 7 error)
      timestamp: TIMESTAMP
    >
  >>,
  
  -- Nested STRUCT with variables
  metadata STRUCT<
    key: STRING,
    value: :value_type,  -- Variable reference in STRUCT field type
    timestamp: TIMESTAMP,
    nested: STRUCT<
      field1: :nested_type,  -- Variable in nested STRUCT
      field2: STRING
    >
  >,
  
  -- ARRAY with variable type
  items ARRAY<:element_type>,  -- Variable as ARRAY element type
  
  -- Column with variable reference
  status :status_type STRING,  -- Variable reference in column definition
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
USING DELTA
COMMENT ':table_comment_variable'  -- Variable in COMMENT
TBLPROPERTIES (
  'key1' = ':variable_value',  -- Variable in TBLPROPERTIES
  'key2' = 'static_value'
)
CLUSTER BY (id);
```

**Specific Error Pattern:**
The parser fails at Line 5, Column 7 with: `Expected: >, found: :`

This occurs when encountering variable references like `:variable_type` inside STRUCT or ARRAY type definitions, where the parser expects a closing `>` but finds a `:` instead.

### Root Cause
The SQL parser does not recognize:
1. `IDENTIFIER()` function calls
2. Variable references (e.g., `:catalog_name`)
3. String concatenation with `||` operator in table name context
4. Dynamic table name construction patterns

## Current Workaround (Temporary - To Be Replaced by SDK Implementation)

**Note:** The frontend preprocessing is a temporary workaround. The proper solution will be implemented in the **WASM SDK / API Backend** to natively support Databricks syntax patterns. Once SDK support is complete, the frontend preprocessing will be removed.

The frontend currently implements a comprehensive preprocessing step that handles multiple Databricks-specific syntax patterns:

### 1. IDENTIFIER() Function Patterns
- Replaces `IDENTIFIER(:variable || 'schema.table')` with literal table names using backticks
- Handles simple `IDENTIFIER(:variable)` patterns (converts to placeholder table names)
- Converts complex concatenation expressions like `IDENTIFIER(:var || '.schema.table' || '.suffix')`

### 2. Variable References in Type Definitions
- **STRUCT types**: Replaces `STRUCT<field: :variable>` with `STRUCT<field: STRING>`
- **Nested STRUCT**: Handles `STRUCT<field: STRUCT<:variable>>` patterns
- **ARRAY types**: Replaces `ARRAY<:variable>` with `ARRAY<STRING>`
- **ARRAY<STRUCT>**: Handles `ARRAY<STRUCT<field: :variable>>` patterns

### 3. Variable References in Column Definitions
- Replaces `column_name :variable TYPE` with `column_name TYPE`
- Removes variable references while preserving column names and types

### 4. Variable References in Metadata Clauses
- **COMMENT clauses**: Replaces `COMMENT ':variable'` with `COMMENT 'Generated from Databricks SQL'`
- **TBLPROPERTIES**: Replaces variable references in `TBLPROPERTIES ('key' = ':variable')` with static values

### 5. Type Context Variable References
- Catches remaining variable references in type contexts (after `:` or `<`)
- Replaces with appropriate fallback types (typically `STRING`)

**Limitations of Workaround:**
- Regex-based preprocessing may not catch all edge cases (e.g., variable references in nested STRUCT at specific positions like Line 5, Column 7)
- Variable substitution values are hardcoded (no actual variable resolution)
- Complex nested expressions may require multiple preprocessing passes
- May not preserve the original intent (variable substitution)
- Not ideal for production use - requires native parser support
- Some patterns may still fail if they don't match the regex patterns
- **This workaround will be removed once SDK support is implemented**

## Proposed Solution

**Implementation Target:** **WASM SDK / API Backend** (not frontend preprocessing)

### Option 1: Enhanced Parser Support (Recommended - To Be Implemented in SDK)
Extend the SQL parser in the WASM SDK to natively support Databricks syntax:

1. **Parse `IDENTIFIER()` function calls**
   - Recognize `IDENTIFIER(expression)` as a table identifier
   - Support both literal strings and expressions

2. **Handle Variable References**
   - Parse `:variable_name` as a parameter placeholder
   - Support variable substitution or extraction

3. **Support String Concatenation**
   - Parse `||` operator in identifier context
   - Evaluate concatenation expressions

4. **Table Name Resolution**
   - Extract literal table names from `IDENTIFIER()` expressions when possible
   - Fall back to placeholder names when variables are involved
   - Preserve schema/table structure information

### Option 2: Preprocessing API Endpoint
Add a dedicated API endpoint for SQL preprocessing:

```
POST /api/v1/preprocess/databricks-sql
{
  "sql_text": "...",
  "variables": {
    "catalog_name": "example_catalog"
  }
}
```

This would:
- Accept variable bindings
- Preprocess the SQL before parsing
- Return preprocessed SQL or parsed result

### Option 3: Parser Configuration
Add parser configuration options:

```json
{
  "dialect": "databricks",
  "parser_options": {
    "resolve_identifiers": true,
    "variable_substitution": {
      "catalog_name": "example_catalog"
    },
    "fallback_to_placeholder": true
  }
}
```

## Databricks-Specific Syntax Patterns to Support

### 1. IDENTIFIER with String Concatenation
```sql
CREATE TABLE IDENTIFIER(:catalog || '.schema.table_name')
CREATE TABLE IDENTIFIER(:catalog || '.' || :schema || '.' || :table)
```

### 2. IDENTIFIER with Literal Strings
```sql
CREATE TABLE IDENTIFIER('catalog.schema.table_name')
```

### 3. IDENTIFIER with Simple Variable
```sql
CREATE TABLE IDENTIFIER(:table_name)
```

### 4. Variable References in Type Definitions
```sql
-- In STRUCT types
metadata STRUCT<key: :variable_type, value: STRING>

-- In ARRAY types
items ARRAY<:element_type>

-- Nested patterns
complex ARRAY<STRUCT<field: :nested_type>>
```

### 5. Variable References in Column Definitions
```sql
column_name :variable_reference STRING
```

### 6. Variable References in Metadata
```sql
COMMENT ':variable_value'
TBLPROPERTIES ('key' = ':variable_value')
```

### 7. Other Databricks-Specific Features
- `USING DELTA` clause
- `COMMENT ON` statements
- `TBLPROPERTIES` clause
- `CLUSTER BY` clause
- Complex nested `STRUCT` and `ARRAY` types
- Databricks-specific data types

## Benefits

1. **Better User Experience**
   - Users can import Databricks SQL without manual preprocessing
   - Supports real-world Databricks DDL patterns

2. **Reduced Maintenance**
   - Centralized parsing logic in SDK/API
   - No need for frontend preprocessing workarounds

3. **More Accurate Parsing**
   - Native parser support is more reliable than regex-based preprocessing
   - Better error messages for unsupported patterns

4. **Future-Proof**
   - Foundation for supporting other Databricks-specific features
   - Can extend to support variable substitution if needed

## Implementation Considerations

### Parser Changes
- Extend the SQL AST to include `IDENTIFIER()` function nodes
- Add support for variable references in the parser grammar
- Implement expression evaluation for string concatenation

### Backward Compatibility
- Ensure existing SQL dialects continue to work
- Make Databricks-specific parsing opt-in via dialect selection

### Error Handling
- Provide clear error messages when variables cannot be resolved
- Suggest alternatives when preprocessing fails

### Testing
- Add test cases for all supported `IDENTIFIER()` patterns
- Test edge cases (nested expressions, multiple variables, etc.)
- Verify backward compatibility with existing SQL dialects

## Priority

**High** - This is blocking users from importing real-world Databricks SQL schemas.

## Related Issues

- Frontend preprocessing implementation (temporary workaround in `frontend/src/services/sdk/importExportService.ts`)
- Databricks dialect support in SQL parser
- Variable substitution in SQL imports

## Current Preprocessing Implementation Details (Temporary)

**Note:** This preprocessing will be removed once SDK support is implemented.

The frontend preprocessing is implemented in `preprocessDatabricksSQL()` method and handles:

1. **IDENTIFIER() patterns** - 3 different regex patterns for various concatenation scenarios
2. **STRUCT type variables** - Replaces `:variable` in STRUCT field type definitions
3. **ARRAY type variables** - Replaces `:variable` in ARRAY element type definitions
4. **Nested type patterns** - Handles ARRAY<STRUCT<:variable>> combinations
5. **Column definition variables** - Removes variable references from column type definitions
6. **Metadata variables** - Replaces variables in COMMENT and TBLPROPERTIES clauses
7. **Type context variables** - Catch-all for remaining variable references in type contexts

**Preprocessing Order**: Patterns are applied in a specific order (1-9) to avoid conflicts and ensure comprehensive coverage.

**Debug Logging**: The preprocessing logs changes to help identify what transformations were applied, including:
- Original vs processed SQL length
- First line where changes occurred
- Original and processed versions of changed lines

**Known Error Patterns Encountered**:
- `ParseError: Expected: column name or constraint definition, found: :` (IDENTIFIER context)
- `ParseError: Expected: >, found: :` (STRUCT/ARRAY type context)

## Acceptance Criteria

- [ ] Parser recognizes `IDENTIFIER()` function calls
- [ ] Parser handles variable references (`:variable_name`) in all contexts:
  - [ ] Table identifiers (IDENTIFIER expressions)
  - [ ] STRUCT type definitions
  - [ ] ARRAY type definitions
  - [ ] Column definitions
  - [ ] COMMENT clauses
  - [ ] TBLPROPERTIES clauses
- [ ] Parser supports string concatenation in identifier context (`||` operator)
- [ ] Table names are correctly extracted from `IDENTIFIER()` expressions
- [ ] Variable references in type definitions are handled gracefully
- [ ] Nested type patterns (ARRAY<STRUCT<:variable>>) are supported
- [ ] Error messages are clear when parsing fails
- [ ] Existing SQL dialects continue to work
- [ ] Test coverage for all supported patterns (including edge cases)
- [ ] Documentation updated with Databricks syntax examples
- [ ] Preprocessing workaround can be removed once native support is implemented

## Example Implementation

### Parser Grammar Addition (Pseudocode)
```
identifier_expression:
  IDENTIFIER '(' (string_literal | variable_reference | concatenation_expression) ')'
  
concatenation_expression:
  (string_literal | variable_reference) ('||' (string_literal | variable_reference))+
  
variable_reference:
  ':' identifier
```

### Table Name Resolution Logic
```rust
fn resolve_identifier_expr(expr: &IdentifierExpr, vars: &HashMap<String, String>) -> String {
    match expr {
        IdentifierExpr::Literal(s) => s.clone(),
        IdentifierExpr::Variable(v) => vars.get(v).cloned().unwrap_or_else(|| format!("{}_table", v)),
        IdentifierExpr::Concat(parts) => {
            parts.iter()
                .map(|p| resolve_part(p, vars))
                .collect::<Vec<_>>()
                .join("")
        }
    }
}
```

## References

- [Databricks SQL Reference: IDENTIFIER()](https://docs.databricks.com/sql/language-manual/sql-ref-identifier.html)
- Current frontend preprocessing implementation: `frontend/src/services/sdk/importExportService.ts` (method: `preprocessDatabricksSQL()`)
- SQL parser implementation: WASM SDK
- Related error patterns encountered:
  - `ParseError: Expected: column name or constraint definition, found: :`
  - `ParseError: Expected: >, found: :`

## Known Issues with Current Workaround

1. **Regex Limitations**: Some complex nested patterns may not be caught by regex-based preprocessing
2. **Variable Resolution**: No actual variable substitution - uses hardcoded fallback values
3. **Pattern Ordering**: Preprocessing order matters and may need adjustment for edge cases
4. **Error Context**: When preprocessing fails, error messages may not clearly indicate which pattern caused the issue
5. **Performance**: Multiple regex passes over large SQL files may impact performance

## Recommended Implementation Approach (SDK Implementation)

**Target:** Implement in **WASM SDK / API Backend**

1. **Phase 1**: Extend parser grammar to recognize `IDENTIFIER()` function calls
   - Parse `IDENTIFIER(expression)` as a table identifier
   - Support string concatenation with `||` operator
   - Extract literal table names when possible

2. **Phase 2**: Add support for variable references in identifier context
   - Parse `:variable_name` as a parameter placeholder
   - Handle variable references in `IDENTIFIER()` expressions
   - Support variable substitution or placeholder generation

3. **Phase 3**: Extend type system to handle variables in STRUCT/ARRAY definitions
   - **Critical**: Handle `:variable` in STRUCT field types (e.g., `field: :variable_type`)
   - Handle `:variable` in ARRAY element types (e.g., `ARRAY<:element_type>`)
   - Handle nested patterns (e.g., `ARRAY<STRUCT<field: :nested_type>>`)
   - Replace variables with appropriate fallback types (e.g., `STRING`)

4. **Phase 4**: Add variable substitution mechanism (optional, can use placeholders initially)
   - Accept variable bindings via API/config
   - Substitute variables when provided, use placeholders otherwise

5. **Phase 5**: Remove frontend preprocessing workaround once native support is complete
   - Frontend will remove `preprocessDatabricksSQL()` method
   - All Databricks SQL parsing handled natively by SDK

## Test Cases for SDK Implementation

Based on the failing SQL patterns, the SDK should handle these test cases:

### Test Case 1: IDENTIFIER with variable concatenation
```sql
CREATE TABLE IDENTIFIER(:catalog || '.schema.table') (
  id STRING
);
```

### Test Case 2: Variable in STRUCT field type
```sql
CREATE TABLE example (
  field STRUCT<key: :variable_type, value: STRING>
);
```

### Test Case 3: Variable in nested STRUCT (Critical - Causes Line 5, Column 7 error)
```sql
CREATE TABLE example (
  nested ARRAY<STRUCT<
    id: STRING,
    type: :nested_type,  -- This causes "Expected: >, found: :" error
    value: STRING
  >>
);
```

### Test Case 4: Variable as ARRAY element type
```sql
CREATE TABLE example (
  items ARRAY<:element_type>
);
```

### Test Case 5: Variable in COMMENT
```sql
CREATE TABLE example (id STRING) COMMENT ':comment_variable';
```

### Test Case 6: Variable in TBLPROPERTIES
```sql
CREATE TABLE example (id STRING) TBLPROPERTIES ('key' = ':variable_value');
```

### Test Case 7: Complex nested pattern (Full example from real-world usage)
```sql
CREATE TABLE IF NOT EXISTS IDENTIFIER(:catalog || '.schema.table') (
  id STRING,
  rulesTriggered ARRAY<STRUCT<
    id: STRING,
    name: STRING,
    alertOperation: STRUCT<
      name: STRING,
      revert: :variable_type,  -- Variable in nested STRUCT
      timestamp: TIMESTAMP
    >
  >>
);
```

---

**Created:** 2025-01-XX  
**Last Updated:** 2025-01-XX  
**Status:** Open  
**Labels:** enhancement, databricks, sql-parser, high-priority  
**Priority:** High - Blocking real-world Databricks SQL imports

