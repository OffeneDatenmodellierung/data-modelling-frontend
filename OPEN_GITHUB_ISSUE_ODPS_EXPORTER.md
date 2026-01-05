# Instructions to Open GitHub Issue for ODPS Exporter Feature Request

## Repository
https://github.com/pixie79/data-modelling-sdk

## Issue Title
Feature Request: Valid ODPS Exporter with Schema Validation

## Issue Body

Copy and paste the following into the GitHub issue:

```markdown
# Feature Request: Valid ODPS Exporter with Schema Validation

## Summary

Request enhancement to the Data Modelling SDK's ODPS (Open Data Product Standard) exporter to ensure all exported YAML files are valid against the official ODPS JSON Schema specification.

## Problem Statement

Currently, the SDK's ODPS exporter (`ODPSExporter`) generates YAML output, but there's no validation to ensure the exported files conform to the ODPS schema specification. This leads to:

1. **Schema Validation Failures**: Exported ODPS YAML files may fail validation against the official ODPS JSON Schema (`odps-json-schema-latest.json`)
2. **Missing Required Fields**: The exporter may not enforce required field presence
3. **Type Mismatches**: Field types may not match schema requirements (e.g., arrays vs objects, string formats)
4. **Inconsistent Field Naming**: Field names may not match schema expectations (camelCase vs snake_case)
5. **No Validation Feedback**: Users have no way to know if their exported files are schema-compliant

## Current Implementation

The SDK currently has:
- `ODPSExporter` in `data-modelling-sdk/src/export/odps.rs`
- WASM binding `export_to_odps(product_json: &str) -> Result<String, JsValue>`
- ODPS model structures in `data-modelling-sdk/src/models/odps.rs`
- Schema reference at `data-modelling-sdk/schemas/odps-json-schema-latest.json`

However, the exporter:
- Does not validate output against the schema
- Does not enforce required field presence
- Does not validate field types and formats
- Does not provide validation error messages

## Proposed Solution

### 1. Schema Validation Integration

Add JSON Schema validation to the ODPS exporter using a Rust JSON Schema validation library (e.g., `jsonschema` crate):

```rust
use jsonschema::{JSONSchema, Draft};

impl ODPSExporter {
    /// Export a Data Product to ODPS YAML format with schema validation
    pub fn export_with_validation(
        &self, 
        product: &ODPSDataProduct
    ) -> Result<String, ExportError> {
        let yaml = self.export(product)?;
        
        // Validate against ODPS schema
        self.validate_against_schema(&yaml)?;
        
        Ok(yaml)
    }
    
    fn validate_against_schema(&self, yaml: &str) -> Result<(), ExportError> {
        // Load ODPS JSON Schema
        let schema = self.load_odps_schema()?;
        
        // Parse YAML to JSON
        let json_value: serde_json::Value = serde_yaml::from_str(yaml)
            .map_err(|e| ExportError::ValidationError(format!("Invalid YAML: {}", e)))?;
        
        // Validate against schema
        let compiled = JSONSchema::compile(&schema)
            .map_err(|e| ExportError::ValidationError(format!("Invalid schema: {}", e)))?;
        
        let validation_result = compiled.validate(&json_value);
        
        if let Err(errors) = validation_result {
            let error_messages: Vec<String> = errors
                .map(|e| format!("{}: {}", e.instance_path, e))
                .collect();
            return Err(ExportError::ValidationError(
                format!("ODPS schema validation failed:\n{}", error_messages.join("\n"))
            ));
        }
        
        Ok(())
    }
}
```

### 2. Required Field Enforcement

Ensure all required fields from the ODPS schema are present:

**Required Fields** (from `odps-json-schema-latest.json`):
- `apiVersion` (string, enum: ["v0.9.0", "v1.0.0"])
- `kind` (string, enum: ["DataProduct"])
- `id` (string, UUID format)
- `status` (string, enum: ["proposed", "draft", "active", "deprecated", "retired"])

**Required Nested Fields**:
- `Support` objects require: `channel`, `url`
- `InputPort` objects require: `name`, `version`, `contractId`
- `OutputPort` objects require: `name`, `version`
- `CustomProperty` objects require: `property`, `value`
- `AuthoritativeDefinition` objects require: `type`, `url`
- `TeamMember` objects require: `username`

### 3. Type and Format Validation

Validate field types and formats according to the schema:
- String formats (URI, date-time, UUID)
- Enum values (status, apiVersion, kind)
- Array vs object types
- Required vs optional fields

### 4. Enhanced Error Messages

Provide detailed validation error messages that include:
- Field path (e.g., `support[0].url`)
- Expected type/format
- Actual value
- Schema requirement reference

## Benefits

1. **Schema Compliance**: All exported ODPS files will be valid against the official schema
2. **Early Error Detection**: Validation errors are caught at export time, not when files are used
3. **Better Developer Experience**: Clear error messages help developers fix issues quickly
4. **Interoperability**: Valid ODPS files can be consumed by any ODPS-compliant tool
5. **Quality Assurance**: Prevents invalid files from being saved or shared

## Implementation Details

### Dependencies

Add to `Cargo.toml`:
```toml
[dependencies]
jsonschema = { version = "0.18", optional = true }

[features]
default = []
odps-validation = ["jsonschema"]
```

### Schema Loading

Load the ODPS schema from `schemas/odps-json-schema-latest.json` at compile time or runtime:

```rust
fn load_odps_schema() -> Result<serde_json::Value, ExportError> {
    const ODPS_SCHEMA: &str = include_str!("../schemas/odps-json-schema-latest.json");
    serde_json::from_str(ODPS_SCHEMA)
        .map_err(|e| ExportError::ValidationError(format!("Failed to load schema: {}", e)))
}
```

### WASM Binding Updates

Update the WASM binding to use validation:

```rust
#[wasm_bindgen]
pub fn export_to_odps(product_json: &str) -> Result<String, JsValue> {
    let product: ODPSDataProduct = serde_json::from_str(product_json)
        .map_err(|e| JsValue::from_str(&format!("Deserialization error: {}", e)))?;
    
    let exporter = ODPSExporter;
    
    #[cfg(feature = "odps-validation")]
    {
        exporter.export_with_validation(&product)
            .map_err(|e| JsValue::from_str(&format!("Export error: {}", e)))
    }
    
    #[cfg(not(feature = "odps-validation"))]
    {
        exporter.export(&product)
            .map_err(|e| export_error_to_js(e))
    }
}
```

## Testing Requirements

1. **Unit Tests**: Test validation with valid and invalid ODPS products
2. **Integration Tests**: Test full export pipeline with schema validation
3. **Schema Compliance Tests**: Export various product configurations and validate against schema
4. **Error Message Tests**: Verify error messages are clear and actionable

### Test Cases

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_valid_odps_export() {
        // Test export with all required fields
    }
    
    #[test]
    fn test_missing_required_field() {
        // Test export fails when required field is missing
    }
    
    #[test]
    fn test_invalid_status_enum() {
        // Test export fails with invalid status value
    }
    
    #[test]
    fn test_invalid_url_format() {
        // Test export fails with invalid URL format
    }
    
    #[test]
    fn test_support_missing_required_fields() {
        // Test export fails when Support object missing channel or url
    }
    
    #[test]
    fn test_input_port_missing_contract_id() {
        // Test export fails when InputPort missing required contractId
    }
}
```

## Migration Path

1. **Phase 1**: Add validation as optional feature flag (`odps-validation`)
2. **Phase 2**: Enable validation by default, allow disabling via feature flag
3. **Phase 3**: Make validation mandatory (remove feature flag)

## Related Issues

- Frontend currently implements workaround conversion function in `odpsService.ts` to convert simplified `DataProduct` format to ODPS-compliant format
- Exported ODPS files fail validation against official ODPS schema validators
- No way to verify ODPS export compliance without external tools

## References

- ODPS Schema: `data-modelling-sdk/schemas/odps-json-schema-latest.json`
- Official ODPS Repository: https://github.com/bitol-io/open-data-product-standard
- Current Exporter: `data-modelling-sdk/src/export/odps.rs`
- Current Models: `data-modelling-sdk/src/models/odps.rs`

## Acceptance Criteria

- [ ] ODPS exporter validates output against official ODPS JSON Schema
- [ ] All required fields are enforced
- [ ] Field types and formats are validated
- [ ] Clear error messages are provided for validation failures
- [ ] Validation can be enabled/disabled via feature flag
- [ ] Unit tests cover validation scenarios
- [ ] Integration tests verify end-to-end export with validation
- [ ] Documentation updated with validation information
- [ ] WASM bindings updated to support validation
- [ ] No breaking changes to existing API (validation is additive)

## Priority

**High** - This is critical for ensuring ODPS file interoperability and compliance with the official standard.

## Estimated Effort

- Schema validation integration: 2-3 days
- Required field enforcement: 1 day
- Type/format validation: 1-2 days
- Error message improvements: 1 day
- Testing: 2 days
- Documentation: 1 day

**Total**: ~8-10 days
```

## Steps to Open Issue

1. Go to https://github.com/pixie79/data-modelling-sdk/issues
2. Click "New Issue"
3. Select "Feature Request" template (if available) or use blank template
4. Paste the issue body above
5. Add appropriate labels (e.g., `enhancement`, `odps`, `validation`, `schema-compliance`)
6. Submit the issue

## Additional Notes

- The full feature request document is available at `FEATURE_REQUEST_ODPS_EXPORTER.md` in the repository root
- This feature request addresses the issue where exported ODPS files fail validation against the official ODPS schema
- The frontend currently implements a workaround conversion function, but this should be handled by the SDK

