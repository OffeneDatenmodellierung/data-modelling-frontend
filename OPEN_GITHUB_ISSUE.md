# Instructions to Open GitHub Issue

## Repository
https://github.com/pixie79/data-modelling-sdk

## Issue Title
Bug: Databricks SQL Parser Fails on Multiline COMMENT Clauses

## Issue Body

Copy and paste the following into the GitHub issue:

```markdown
# Bug Report: Databricks SQL Parser Fails on Multiline COMMENT Clauses

## Summary
The Databricks SQL parser in SDK v1.6.0 fails to parse COMMENT clauses that span multiple lines or contain complex content, even though SDK v1.6.0+ claims to support COMMENT clauses natively.

## Environment
- **SDK Version**: 1.6.0
- **Dialect**: Databricks
- **Method**: `import_from_sql()`

## Problem Description

When importing Databricks SQL that contains COMMENT clauses with multiline content or complex text, the parser fails with an error indicating it expected a comma or closing parenthesis but found a different character.

### Error Message
```
ParseError: sql parser error: Expected: ',' or ')' after column definition, found: s at Line: 1, Column: 676
```

## Reproduction Steps

1. Attempt to import the following Databricks SQL using `import_from_sql()`:

```sql
CREATE TABLE IF NOT EXISTS IDENTIFIER(:catalog_name || '.analytics.user_events') (
  event_id STRING COMMENT 'Unique identifier for each event.',
  event_type STRING COMMENT 'The type of event that occurred. This is a finite list which can be found at the bottom of this contract, under the quality section.',
  event_metadata ARRAY<STRUCT<
    id: STRING,
    name: STRING,
    priority: INT,
    category: STRING,
    source: STRING,
    event_details: STRUCT<
      name: STRING,
      field: STRING,
      timestamp: TIMESTAMP
    >
  >>,
  highest_priority INT COMMENT 'If there are multiple events that are completed at once, this value highlights the highest priority from the group of events.',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
USING DELTA
COMMENT 'User events table for analytics processing'
TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
);
```

2. The parser fails at column 676, which corresponds to the multiline COMMENT clause on the `highest_priority` column.

## Expected Behavior

The parser should successfully parse COMMENT clauses regardless of:
- Whether they span multiple lines
- The length of the comment text
- Special characters within the comment text
- COMMENT clauses in nested STRUCT definitions

## Actual Behavior

The parser fails with a parsing error when encountering COMMENT clauses that:
- Span multiple lines (even if properly quoted)
- Contain long text that might wrap
- Are positioned after complex type definitions (like ARRAY<STRUCT<...>>)

## SQL Context Around Error

The error occurs at column 676, which corresponds to this part of the SQL:

```sql
... the events that are completed at once, this value highlights the highest priority from the group of 
```

The parser appears to be having trouble with the multiline COMMENT clause, possibly interpreting the newline or continuation as the end of the column definition.

## Workaround

Currently, the frontend implements preprocessing that:
1. Simplifies multiline COMMENT clauses to single-line
2. Truncates very long comments
3. Removes problematic COMMENT clauses entirely as a last resort

However, this workaround should not be necessary if SDK v1.6.0+ natively supports COMMENT clauses as documented.

## Additional Information

- The `IDENTIFIER()` function parsing works correctly (this was fixed in SDK v1.6.0)
- Variable references in STRUCT/ARRAY type definitions work correctly
- The issue is specifically with COMMENT clause parsing, especially multiline ones
- The error occurs even when the COMMENT clause is properly quoted and formatted

## Suggested Fix

The parser should:
1. Properly handle COMMENT clauses that span multiple lines within quoted strings
2. Recognize COMMENT clauses even when they appear after complex type definitions
3. Handle COMMENT clauses consistently regardless of their position in the column definition

## Related Issues

This is related to the enhanced Databricks support added in SDK v1.6.0, but appears to be an incomplete implementation of COMMENT clause parsing.
```

## Steps to Open Issue

1. Go to https://github.com/pixie79/data-modelling-sdk/issues
2. Click "New Issue"
3. Paste the issue body above
4. Add appropriate labels (e.g., `bug`, `databricks`, `sql-parser`)
5. Submit the issue


