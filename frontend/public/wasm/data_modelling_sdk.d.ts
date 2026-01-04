/* tslint:disable */
/* eslint-disable */

/**
 * Add a CADS node to a domain in a DataModel.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 * * `domain_id` - Domain UUID as string
 * * `node_json` - JSON string containing CADSNode
 *
 * # Returns
 *
 * JSON string containing updated DataModel, or JsValue error
 */
export function add_cads_node_to_domain(workspace_json: string, domain_id: string, node_json: string): string;

/**
 * Add an ODCS node to a domain in a DataModel.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 * * `domain_id` - Domain UUID as string
 * * `node_json` - JSON string containing ODCSNode
 *
 * # Returns
 *
 * JSON string containing updated DataModel, or JsValue error
 */
export function add_odcs_node_to_domain(workspace_json: string, domain_id: string, node_json: string): string;

/**
 * Add a system to a domain in a DataModel.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 * * `domain_id` - Domain UUID as string
 * * `system_json` - JSON string containing System
 *
 * # Returns
 *
 * JSON string containing updated DataModel, or JsValue error
 */
export function add_system_to_domain(workspace_json: string, domain_id: string, system_json: string): string;

/**
 * Check for circular dependencies in relationships.
 *
 * # Arguments
 *
 * * `relationships_json` - JSON string containing array of existing relationships
 * * `source_table_id` - Source table ID (UUID string) of the new relationship
 * * `target_table_id` - Target table ID (UUID string) of the new relationship
 *
 * # Returns
 *
 * JSON string with result: `{"has_cycle": true/false, "cycle_path": [...]}` or error
 */
export function check_circular_dependency(relationships_json: string, source_table_id: string, target_table_id: string): string;

/**
 * Convert any format to ODCS v3.1.0 YAML format.
 *
 * # Arguments
 *
 * * `input` - Format-specific content as a string
 * * `format` - Optional format identifier. If None, attempts auto-detection.
 *   Supported formats: "sql", "json_schema", "avro", "protobuf", "odcl", "odcs", "cads", "odps", "domain"
 *
 * # Returns
 *
 * ODCS v3.1.0 YAML string, or JsValue error
 */
export function convert_to_odcs(input: string, format?: string | null): string;

/**
 * Create a new business domain.
 *
 * # Arguments
 *
 * * `name` - Domain name
 *
 * # Returns
 *
 * JSON string containing Domain, or JsValue error
 */
export function create_domain(name: string): string;

/**
 * Detect naming conflicts between existing and new tables.
 *
 * # Arguments
 *
 * * `existing_tables_json` - JSON string containing array of existing tables
 * * `new_tables_json` - JSON string containing array of new tables
 *
 * # Returns
 *
 * JSON string containing array of naming conflicts
 */
export function detect_naming_conflicts(existing_tables_json: string, new_tables_json: string): string;

/**
 * Export a data model to AVRO schema.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 *
 * # Returns
 *
 * AVRO schema JSON string, or JsValue error
 */
export function export_to_avro(workspace_json: string): string;

/**
 * Export a CADS asset to YAML format.
 *
 * # Arguments
 *
 * * `asset_json` - JSON string containing CADS asset
 *
 * # Returns
 *
 * CADS YAML format string, or JsValue error
 */
export function export_to_cads(asset_json: string): string;

/**
 * Export a Domain to YAML format.
 *
 * # Arguments
 *
 * * `domain_json` - JSON string containing Domain
 *
 * # Returns
 *
 * Domain YAML format string, or JsValue error
 */
export function export_to_domain(domain_json: string): string;

/**
 * Export a data model to JSON Schema definition.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 *
 * # Returns
 *
 * JSON Schema definition string, or JsValue error
 */
export function export_to_json_schema(workspace_json: string): string;

/**
 * Export a workspace structure to ODCS YAML format.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 *
 * # Returns
 *
 * ODCS YAML format string, or JsValue error
 */
export function export_to_odcs_yaml(workspace_json: string): string;

/**
 * Export an ODPS data product to YAML format.
 *
 * # Arguments
 *
 * * `product_json` - JSON string containing ODPS data product
 *
 * # Returns
 *
 * ODPS YAML format string, or JsValue error
 */
export function export_to_odps(product_json: string): string;

/**
 * Export a data model to Protobuf schema.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 *
 * # Returns
 *
 * Protobuf schema text, or JsValue error
 */
export function export_to_protobuf(workspace_json: string): string;

/**
 * Export a data model to SQL CREATE TABLE statements.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 * * `dialect` - SQL dialect ("postgresql", "mysql", "sqlserver", "databricks")
 *
 * # Returns
 *
 * SQL CREATE TABLE statements, or JsValue error
 */
export function export_to_sql(workspace_json: string, dialect: string): string;

/**
 * Filter Data Flow nodes and relationships by tag.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 * * `tag` - Tag to filter by
 *
 * # Returns
 *
 * JSON string containing object with `nodes` and `relationships` arrays, or JsValue error
 */
export function filter_by_tags(workspace_json: string, tag: string): string;

/**
 * Filter Data Flow nodes (tables) by infrastructure type.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 * * `infrastructure_type` - Infrastructure type string (e.g., "Kafka", "PostgreSQL")
 *
 * # Returns
 *
 * JSON string containing array of matching tables, or JsValue error
 */
export function filter_nodes_by_infrastructure_type(workspace_json: string, infrastructure_type: string): string;

/**
 * Filter Data Flow nodes (tables) by owner.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 * * `owner` - Owner name to filter by (case-sensitive exact match)
 *
 * # Returns
 *
 * JSON string containing array of matching tables, or JsValue error
 */
export function filter_nodes_by_owner(workspace_json: string, owner: string): string;

/**
 * Filter Data Flow relationships by infrastructure type.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 * * `infrastructure_type` - Infrastructure type string (e.g., "Kafka", "PostgreSQL")
 *
 * # Returns
 *
 * JSON string containing array of matching relationships, or JsValue error
 */
export function filter_relationships_by_infrastructure_type(workspace_json: string, infrastructure_type: string): string;

/**
 * Filter Data Flow relationships by owner.
 *
 * # Arguments
 *
 * * `workspace_json` - JSON string containing workspace/data model structure
 * * `owner` - Owner name to filter by (case-sensitive exact match)
 *
 * # Returns
 *
 * JSON string containing array of matching relationships, or JsValue error
 */
export function filter_relationships_by_owner(workspace_json: string, owner: string): string;

/**
 * Import data model from AVRO schema.
 *
 * # Arguments
 *
 * * `avro_content` - AVRO schema JSON as a string
 *
 * # Returns
 *
 * JSON string containing ImportResult object, or JsValue error
 */
export function import_from_avro(avro_content: string): string;

/**
 * Import CADS YAML content and return a structured representation.
 *
 * # Arguments
 *
 * * `yaml_content` - CADS YAML content as a string
 *
 * # Returns
 *
 * JSON string containing CADS asset, or JsValue error
 */
export function import_from_cads(yaml_content: string): string;

/**
 * Import Domain YAML content and return a structured representation.
 *
 * # Arguments
 *
 * * `yaml_content` - Domain YAML content as a string
 *
 * # Returns
 *
 * JSON string containing Domain, or JsValue error
 */
export function import_from_domain(yaml_content: string): string;

/**
 * Import data model from JSON Schema definition.
 *
 * # Arguments
 *
 * * `json_schema_content` - JSON Schema definition as a string
 *
 * # Returns
 *
 * JSON string containing ImportResult object, or JsValue error
 */
export function import_from_json_schema(json_schema_content: string): string;

/**
 * Import ODPS YAML content and return a structured representation.
 *
 * # Arguments
 *
 * * `yaml_content` - ODPS YAML content as a string
 *
 * # Returns
 *
 * JSON string containing ODPS data product, or JsValue error
 */
export function import_from_odps(yaml_content: string): string;

/**
 * Import data model from Protobuf schema.
 *
 * # Arguments
 *
 * * `protobuf_content` - Protobuf schema text
 *
 * # Returns
 *
 * JSON string containing ImportResult object, or JsValue error
 */
export function import_from_protobuf(protobuf_content: string): string;

/**
 * Import data model from SQL CREATE TABLE statements.
 *
 * # Arguments
 *
 * * `sql_content` - SQL CREATE TABLE statements
 * * `dialect` - SQL dialect ("postgresql", "mysql", "sqlserver", "databricks")
 *
 * # Returns
 *
 * JSON string containing ImportResult object, or JsValue error
 */
export function import_from_sql(sql_content: string, dialect: string): string;

/**
 * Load a model from browser storage (IndexedDB/localStorage).
 *
 * # Arguments
 *
 * * `db_name` - IndexedDB database name
 * * `store_name` - Object store name
 * * `workspace_path` - Workspace path to load from
 *
 * # Returns
 *
 * Promise that resolves to JSON string containing ModelLoadResult, or rejects with error
 */
export function load_model(db_name: string, store_name: string, workspace_path: string): Promise<any>;

/**
 * Migrate DataFlow YAML to Domain schema format.
 *
 * # Arguments
 *
 * * `dataflow_yaml` - DataFlow YAML content as a string
 * * `domain_name` - Optional domain name (defaults to "MigratedDomain")
 *
 * # Returns
 *
 * JSON string containing Domain, or JsValue error
 */
export function migrate_dataflow_to_domain(dataflow_yaml: string, domain_name?: string | null): string;

/**
 * Parse ODCS YAML content and return a structured workspace representation.
 *
 * # Arguments
 *
 * * `yaml_content` - ODCS YAML content as a string
 *
 * # Returns
 *
 * JSON string containing ImportResult object, or JsValue error
 */
export function parse_odcs_yaml(yaml_content: string): string;

/**
 * Parse a tag string into a Tag enum.
 *
 * # Arguments
 *
 * * `tag_str` - Tag string (Simple, Pair, or List format)
 *
 * # Returns
 *
 * JSON string containing Tag, or JsValue error
 */
export function parse_tag(tag_str: string): string;

/**
 * Sanitize a description string.
 *
 * # Arguments
 *
 * * `desc` - Description string to sanitize
 *
 * # Returns
 *
 * Sanitized description string
 */
export function sanitize_description(desc: string): string;

/**
 * Sanitize a SQL identifier by quoting it.
 *
 * # Arguments
 *
 * * `name` - SQL identifier to sanitize
 * * `dialect` - SQL dialect ("postgresql", "mysql", "sqlserver", etc.)
 *
 * # Returns
 *
 * Sanitized SQL identifier string
 */
export function sanitize_sql_identifier(name: string, dialect: string): string;

/**
 * Save a model to browser storage (IndexedDB/localStorage).
 *
 * # Arguments
 *
 * * `db_name` - IndexedDB database name
 * * `store_name` - Object store name
 * * `workspace_path` - Workspace path to save to
 * * `model_json` - JSON string containing DataModel to save
 *
 * # Returns
 *
 * Promise that resolves to success message, or rejects with error
 */
export function save_model(db_name: string, store_name: string, workspace_path: string, model_json: string): Promise<any>;

/**
 * Serialize a Tag enum to string format.
 *
 * # Arguments
 *
 * * `tag_json` - JSON string containing Tag
 *
 * # Returns
 *
 * Tag string (Simple, Pair, or List format), or JsValue error
 */
export function serialize_tag(tag_json: string): string;

/**
 * Validate a column name.
 *
 * # Arguments
 *
 * * `name` - Column name to validate
 *
 * # Returns
 *
 * JSON string with validation result: `{"valid": true}` or `{"valid": false, "error": "error message"}`
 */
export function validate_column_name(name: string): string;

/**
 * Validate a data type string.
 *
 * # Arguments
 *
 * * `data_type` - Data type string to validate
 *
 * # Returns
 *
 * JSON string with validation result: `{"valid": true}` or `{"valid": false, "error": "error message"}`
 */
export function validate_data_type(data_type: string): string;

/**
 * Validate a description string.
 *
 * # Arguments
 *
 * * `desc` - Description string to validate
 *
 * # Returns
 *
 * JSON string with validation result: `{"valid": true}` or `{"valid": false, "error": "error message"}`
 */
export function validate_description(desc: string): string;

/**
 * Validate that source and target tables are different (no self-reference).
 *
 * # Arguments
 *
 * * `source_table_id` - Source table ID (UUID string)
 * * `target_table_id` - Target table ID (UUID string)
 *
 * # Returns
 *
 * JSON string with validation result: `{"valid": true}` or `{"valid": false, "self_reference": {...}}`
 */
export function validate_no_self_reference(source_table_id: string, target_table_id: string): string;

/**
 * Validate pattern exclusivity for a table (SCD pattern and Data Vault classification are mutually exclusive).
 *
 * # Arguments
 *
 * * `table_json` - JSON string containing table to validate
 *
 * # Returns
 *
 * JSON string with validation result: `{"valid": true}` or `{"valid": false, "violation": {...}}`
 */
export function validate_pattern_exclusivity(table_json: string): string;

/**
 * Validate a table name.
 *
 * # Arguments
 *
 * * `name` - Table name to validate
 *
 * # Returns
 *
 * JSON string with validation result: `{"valid": true}` or `{"valid": false, "error": "error message"}`
 */
export function validate_table_name(name: string): string;

/**
 * Validate a UUID string.
 *
 * # Arguments
 *
 * * `id` - UUID string to validate
 *
 * # Returns
 *
 * JSON string with validation result: `{"valid": true, "uuid": "..."}` or `{"valid": false, "error": "error message"}`
 */
export function validate_uuid(id: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly parse_odcs_yaml: (a: number, b: number) => [number, number, number, number];
  readonly export_to_odcs_yaml: (a: number, b: number) => [number, number, number, number];
  readonly import_from_sql: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly import_from_avro: (a: number, b: number) => [number, number, number, number];
  readonly import_from_json_schema: (a: number, b: number) => [number, number, number, number];
  readonly import_from_protobuf: (a: number, b: number) => [number, number, number, number];
  readonly export_to_sql: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly export_to_avro: (a: number, b: number) => [number, number, number, number];
  readonly export_to_json_schema: (a: number, b: number) => [number, number, number, number];
  readonly export_to_protobuf: (a: number, b: number) => [number, number, number, number];
  readonly import_from_cads: (a: number, b: number) => [number, number, number, number];
  readonly export_to_cads: (a: number, b: number) => [number, number, number, number];
  readonly import_from_odps: (a: number, b: number) => [number, number, number, number];
  readonly export_to_odps: (a: number, b: number) => [number, number, number, number];
  readonly create_domain: (a: number, b: number) => [number, number, number, number];
  readonly import_from_domain: (a: number, b: number) => [number, number, number, number];
  readonly export_to_domain: (a: number, b: number) => [number, number, number, number];
  readonly migrate_dataflow_to_domain: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly parse_tag: (a: number, b: number) => [number, number, number, number];
  readonly serialize_tag: (a: number, b: number) => [number, number, number, number];
  readonly convert_to_odcs: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly filter_nodes_by_owner: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly filter_relationships_by_owner: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly filter_nodes_by_infrastructure_type: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly filter_relationships_by_infrastructure_type: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly filter_by_tags: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly add_system_to_domain: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
  readonly add_cads_node_to_domain: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
  readonly add_odcs_node_to_domain: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
  readonly validate_table_name: (a: number, b: number) => [number, number, number, number];
  readonly validate_column_name: (a: number, b: number) => [number, number, number, number];
  readonly validate_uuid: (a: number, b: number) => [number, number, number, number];
  readonly validate_data_type: (a: number, b: number) => [number, number, number, number];
  readonly validate_description: (a: number, b: number) => [number, number, number, number];
  readonly sanitize_sql_identifier: (a: number, b: number, c: number, d: number) => [number, number];
  readonly sanitize_description: (a: number, b: number) => [number, number];
  readonly detect_naming_conflicts: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly validate_pattern_exclusivity: (a: number, b: number) => [number, number, number, number];
  readonly check_circular_dependency: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number, number];
  readonly validate_no_self_reference: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly load_model: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
  readonly save_model: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => any;
  readonly wasm_bindgen__convert__closures________invoke__h87c7a578e64daa55: (a: number, b: number, c: any) => void;
  readonly wasm_bindgen__closure__destroy__h55fab0c08c4474f1: (a: number, b: number) => void;
  readonly wasm_bindgen__convert__closures_____invoke__h42c5e6acbbd33cc5: (a: number, b: number, c: any) => void;
  readonly wasm_bindgen__closure__destroy__h46c4eab16e66fc6a: (a: number, b: number) => void;
  readonly wasm_bindgen__convert__closures_____invoke__h316eb2ec948a37b8: (a: number, b: number, c: any, d: any) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
