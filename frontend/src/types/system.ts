/**
 * System Type Definition
 * Represents a physical system (database, schema, namespace) within a domain
 * Based on SDK system-schema.json
 */

import type { ContactDetails } from './relationship';

/**
 * SystemType - Type of system infrastructure
 * Based on SDK SystemType enum
 */
export type SystemType =
  // Relational Databases
  | 'postgresql'
  | 'mysql'
  | 'mssql'
  | 'oracle'
  | 'db2'
  | 'sqlite'
  | 'mariadb'
  | 'percona'
  // AWS RDS
  | 'rds_postgresql'
  | 'rds_mysql'
  | 'rds_mariadb'
  | 'rds_oracle'
  | 'rds_sqlserver'
  // Cloud Databases
  | 'dynamodb'
  | 'cassandra'
  | 'mongodb'
  | 'redis'
  | 'elasticsearch'
  | 'influxdb'
  | 'timescaledb'
  | 'clickhouse'
  | 'bigquery'
  | 'snowflake'
  | 'redshift'
  | 'databricks'
  | 'deltalake'
  | 'duckdb'
  | 'motherduck'
  | 'aurora'
  | 'documentdb'
  | 'neptune'
  | 'elasticache'
  // Azure
  | 'azure_sql_database'
  | 'cosmosdb'
  | 'azure_synapse_analytics'
  | 'azure_data_lake_storage'
  | 'azure_blob_storage'
  | 'aks'
  | 'aci'
  | 'azurefunctions'
  | 'event_hubs'
  | 'service_bus'
  | 'azure_data_factory'
  | 'powerbi'
  // GCP
  | 'cloud_sql_postgresql'
  | 'cloud_sql_mysql'
  | 'cloud_sql_sqlserver'
  | 'cloud_spanner'
  | 'firestore'
  | 'cloud_storage'
  | 'gke'
  | 'cloud_run'
  | 'gcpcloudfunctions'
  | 'pubsub'
  | 'dataflow'
  | 'looker'
  // Data Warehouses & Analytics
  | 'hive'
  | 'presto'
  | 'trino'
  | 'teradata'
  | 'vertica'
  | 'athena'
  | 'glue'
  | 'quicksight'
  // NoSQL & Document Stores
  | 'couchdb'
  | 'rethinkdb'
  // Graph Databases
  | 'neo4j'
  | 'arangodb'
  // Message Bus & Event Streaming
  | 'kafka'
  | 'pulsar'
  | 'eventbus'
  | 'rabbitmq'
  | 'activemq'
  | 'nats'
  | 'amazonmq'
  | 'azureservicebus'
  | 'googlepubsub'
  | 'kinesis'
  | 'sqs'
  | 'sns'
  // BI Applications
  | 'tableau'
  | 'qlik'
  | 'metabase'
  | 'superset'
  | 'mode'
  | 'chartio'
  | 'periscope'
  | 'sisense'
  | 'domo'
  | 'thoughtspot'
  | 'microstrategy'
  | 'cognos'
  | 'businessobjects'
  | 'grafana'
  // Cloud Infrastructure & Servers
  | 'ec2'
  | 'eks'
  | 'docker'
  | 'kubernetes'
  | 'lambda'
  | 'fargate'
  | 'ecs'
  // Storage
  | 's3'
  | 'hdfs'
  | 'minio'
  // Legacy/Generic types for backward compatibility
  | 'database'
  | 'schema'
  | 'namespace'
  | 'system';

/**
 * AuthMethod - Authentication method for connecting to the system
 * Based on SDK AuthMethod enum
 */
export type AuthMethod =
  | 'oauth2'
  | 'apiKey'
  | 'iamRole'
  | 'certificate'
  | 'basicAuth'
  | 'saml'
  | 'oidc'
  | 'kerberos'
  | 'awsSignatureV4'
  | 'gcpServiceAccount'
  | 'azureActiveDirectory'
  | 'mtls'
  | 'none'
  | 'custom';

/**
 * EnvironmentStatus - Current status of an environment
 * Based on SDK EnvironmentStatus enum
 */
export type EnvironmentStatus = 'active' | 'deprecated' | 'maintenance' | 'inactive';

/**
 * SlaProperty - SLA (Service Level Agreement) property
 * Based on SDK common-types-schema.json SlaProperty definition
 */
export interface SlaProperty {
  property: string; // Name of the SLA property (e.g., 'latency', 'availability')
  value: string | number; // Value of the SLA property
  unit: string; // Unit of measurement (e.g., 'hours', 'percent')
  description?: string; // Description of the SLA property
  element?: string; // Element this SLA applies to
  driver?: string; // Driver or reason for the SLA
  scheduler?: string; // Scheduler for SLA enforcement
}

/**
 * EnvironmentConnection - Environment-specific connection details for a system
 * Based on SDK system-schema.json EnvironmentConnection definition
 *
 * Systems may have multiple environments (production, staging, etc.)
 * each with different connection details, SLAs, and ownership.
 */
export interface EnvironmentConnection {
  environment: string; // Required: Environment name (e.g., 'production', 'staging', 'development')
  owner?: string; // Owner/team responsible for this environment
  contactDetails?: ContactDetails; // Contact information for this environment
  sla?: SlaProperty[]; // SLA properties for this environment
  authMethod?: AuthMethod; // Authentication method
  supportTeam?: string; // Support team or on-call rotation name
  connectionString?: string; // Connection string (sensitive - may be placeholder or reference)
  secretLink?: string; // Link to secrets manager entry (URI format)
  endpoint?: string; // Primary endpoint URL or hostname
  port?: number; // Port number (1-65535)
  region?: string; // Cloud region or data center location
  status?: EnvironmentStatus; // Environment status (default: 'active')
  notes?: string; // Additional notes about this environment
  customProperties?: Record<string, unknown>; // Additional custom properties
}

/**
 * System - System reference within a domain
 * Based on SDK system-schema.json SystemReference definition
 *
 * Systems represent infrastructure components like databases, message queues,
 * or cloud services that contain tables and assets.
 */
export interface System {
  // Required fields (per SDK schema)
  id: string; // UUID - System identifier
  name: string; // System name (alphanumeric with hyphens/underscores, max 255 chars)

  // Optional fields from SDK schema
  description?: string; // Optional description of the system
  system_type?: SystemType; // Type of system infrastructure

  // Table and asset references
  table_ids?: string[]; // Array of table UUIDs that belong to this system
  asset_ids?: string[]; // Array of compute asset (CADS) UUIDs that belong to this system

  // Environment-specific connection details (SDK 2.3.0+)
  environments?: EnvironmentConnection[]; // List of environment connections (production, staging, etc.)

  // Frontend-specific fields (not in SDK schema)
  domain_id: string; // UUID - parent domain (frontend tracking)
  position_x?: number; // Canvas position X
  position_y?: number; // Canvas position Y
  created_at: string; // ISO timestamp
  last_modified_at: string; // ISO timestamp

  // Legacy field - kept for backward compatibility during migration
  connection_string?: string; // Deprecated: Use environments[].connectionString instead
}

export interface CreateSystemRequest {
  domain_id: string;
  name: string;
  system_type?: SystemType;
  description?: string;
  environments?: EnvironmentConnection[];
}

export interface UpdateSystemRequest {
  name?: string;
  system_type?: SystemType;
  description?: string;
  position_x?: number;
  position_y?: number;
  table_ids?: string[];
  asset_ids?: string[];
  environments?: EnvironmentConnection[];
}
