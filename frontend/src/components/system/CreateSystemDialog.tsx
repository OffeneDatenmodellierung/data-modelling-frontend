/**
 * Create System Dialog Component
 * Allows creating or importing a new system within a domain
 * Supports SDK 2.3.0+ DataFlow metadata fields
 */

import React, { useState, useEffect } from 'react';
import { DraggableModal } from '@/components/common/DraggableModal';
import { useModelStore } from '@/stores/modelStore';
import { useUIStore } from '@/stores/uiStore';
import type { System } from '@/types/system';
import type { Owner } from '@/types/table';
import type { SLAProperty, ContactDetails, InfrastructureType } from '@/types/relationship';
import { InfrastructureType as InfrastructureTypeEnum } from '@/types/relationship';

export interface CreateSystemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (systemId: string) => void;
  domainId: string;
  editingSystemId?: string | null; // If provided, edit mode is enabled
  linkTableId?: string | null; // If provided, link this table to the created system
}

// Collapsible section component
const CollapsibleSection: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, isOpen, onToggle, children }) => (
  <div className="border border-gray-200 rounded-md">
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-t-md"
    >
      <span>{title}</span>
      <svg
        className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    {isOpen && <div className="p-3 border-t border-gray-200 space-y-3">{children}</div>}
  </div>
);

export const CreateSystemDialog: React.FC<CreateSystemDialogProps> = ({
  isOpen,
  onClose,
  onCreated,
  domainId,
  editingSystemId,
  linkTableId,
}) => {
  const { addSystem, updateSystem, systems } = useModelStore();
  const { addToast } = useUIStore();

  // Basic fields
  const [name, setName] = useState('');
  const [systemType, setSystemType] = useState<System['system_type']>('postgresql');
  const [description, setDescription] = useState('');
  const [connectionString, setConnectionString] = useState('');

  // SDK 2.3.0+ DataFlow metadata fields
  const [owner, setOwner] = useState<Owner>({});
  const [sla, setSla] = useState<SLAProperty[]>([]);
  const [contactDetails, setContactDetails] = useState<ContactDetails>({});
  const [infrastructureType, setInfrastructureType] = useState<InfrastructureType | ''>('');
  const [notes, setNotes] = useState('');
  const [version, setVersion] = useState('');

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Collapsible sections state
  const [ownerSectionOpen, setOwnerSectionOpen] = useState(false);
  const [contactSectionOpen, setContactSectionOpen] = useState(false);
  const [slaSectionOpen, setSlaSectionOpen] = useState(false);
  const [metadataSectionOpen, setMetadataSectionOpen] = useState(false);

  const isEditMode = !!editingSystemId;
  const editingSystem = editingSystemId ? systems.find((s) => s.id === editingSystemId) : null;

  // Load system data when editing
  useEffect(() => {
    if (isOpen && isEditMode && editingSystem) {
      setName(editingSystem.name);
      setSystemType(editingSystem.system_type);
      setDescription(editingSystem.description || '');
      setConnectionString(editingSystem.connection_string || '');

      // SDK 2.3.0+ fields
      setOwner(editingSystem.owner || {});
      setSla(editingSystem.sla || []);
      setContactDetails(editingSystem.contact_details || {});
      setInfrastructureType(editingSystem.infrastructure_type || '');
      setNotes(editingSystem.notes || '');
      setVersion(editingSystem.version || '');

      // Auto-expand sections that have data
      setOwnerSectionOpen(
        !!(editingSystem.owner?.name || editingSystem.owner?.email || editingSystem.owner?.team)
      );
      setContactSectionOpen(
        !!(
          editingSystem.contact_details?.name ||
          editingSystem.contact_details?.email ||
          editingSystem.contact_details?.phone
        )
      );
      setSlaSectionOpen(!!(editingSystem.sla && editingSystem.sla.length > 0));
      setMetadataSectionOpen(
        !!(editingSystem.infrastructure_type || editingSystem.notes || editingSystem.version)
      );

      setImportMode(false);
    } else if (isOpen && !isEditMode) {
      resetForm();
    }
  }, [isOpen, isEditMode, editingSystem]);

  // Helper to check if owner has any content
  const hasOwnerContent = (o: Owner) => !!(o.name || o.email || o.team || o.role);

  // Helper to check if contact details has any content
  const hasContactContent = (c: ContactDetails) =>
    !!(c.name || c.email || c.phone || c.role || c.other);

  // Helper to filter valid SLA entries
  const getValidSla = (slaItems: SLAProperty[]) =>
    slaItems.filter((item) => item.name.trim() && item.value.trim());

  const handleCreate = async () => {
    setError(null);

    if (!name.trim()) {
      setError('System name is required.');
      return;
    }

    // Check if system name already exists in this domain (excluding current system if editing)
    const domainSystems = systems.filter((s) => s.domain_id === domainId);
    const conflictingSystem = domainSystems.find(
      (s) => s.name.toLowerCase() === name.trim().toLowerCase() && s.id !== editingSystemId
    );
    if (conflictingSystem) {
      setError('A system with this name already exists in this domain.');
      return;
    }

    setIsCreating(true);
    try {
      // Prepare SDK 2.3.0+ fields (only include if they have content)
      const validSla = getValidSla(sla);
      const systemUpdates: Partial<System> = {
        name: name.trim(),
        system_type: systemType,
        description: description.trim() || undefined,
        connection_string: connectionString.trim() || undefined,
        owner: hasOwnerContent(owner) ? owner : undefined,
        sla: validSla.length > 0 ? validSla : undefined,
        contact_details: hasContactContent(contactDetails) ? contactDetails : undefined,
        infrastructure_type: infrastructureType || undefined,
        notes: notes.trim() || undefined,
        version: version.trim() || undefined,
      };

      if (isEditMode && editingSystemId) {
        // Update existing system
        updateSystem(editingSystemId, systemUpdates);
        addToast({
          type: 'success',
          message: `System '${name.trim()}' updated successfully!`,
        });
        onCreated(editingSystemId);
      } else {
        // Create new system - always use UUIDs
        const { generateUUID } = await import('@/utils/validation');
        const systemId = generateUUID();

        const newSystem: System = {
          id: systemId,
          domain_id: domainId,
          ...systemUpdates,
          name: name.trim(),
          system_type: systemType,
          created_at: new Date().toISOString(),
          last_modified_at: new Date().toISOString(),
          table_ids: linkTableId ? [linkTableId] : [],
          asset_ids: [],
        };

        addSystem(newSystem);
        addToast({
          type: 'success',
          message: `System '${name.trim()}' created successfully!`,
        });
        onCreated(systemId);
      }
      onClose();
      resetForm();
    } catch (err) {
      console.error(`Failed to ${isEditMode ? 'update' : 'create'} system:`, err);
      setError(
        err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} system.`
      );
      addToast({
        type: 'error',
        message: `Failed to ${isEditMode ? 'update' : 'create'} system: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      setError('Please select a file to import.');
      return;
    }

    setIsCreating(true);
    try {
      // Read file content
      const text = await importFile.text();

      // Parse JSON/YAML (basic implementation - can be enhanced)
      let systemData: Partial<System>;
      try {
        systemData = JSON.parse(text);
      } catch {
        // Try YAML parsing if JSON fails (would need yaml library)
        setError('Import currently supports JSON format only. YAML support coming soon.');
        setIsCreating(false);
        return;
      }

      // Always use UUIDs for system IDs
      const { generateUUID } = await import('@/utils/validation');
      const systemId = generateUUID();
      const newSystem: System = {
        id: systemId,
        domain_id: domainId,
        name: systemData.name || importFile.name.replace(/\.[^/.]+$/, ''),
        system_type: systemData.system_type || 'postgresql',
        description: systemData.description,
        connection_string: systemData.connection_string,
        created_at: new Date().toISOString(),
        last_modified_at: new Date().toISOString(),
        table_ids: systemData.table_ids || [],
        asset_ids: systemData.asset_ids || [],
        // SDK 2.3.0+ fields from import
        owner: systemData.owner,
        sla: systemData.sla,
        contact_details: systemData.contact_details,
        infrastructure_type: systemData.infrastructure_type,
        notes: systemData.notes,
        version: systemData.version,
      };

      addSystem(newSystem);
      addToast({
        type: 'success',
        message: `System imported successfully!`,
      });
      onCreated(systemId);
      onClose();
      resetForm();
    } catch (err) {
      console.error('Failed to import system:', err);
      setError(err instanceof Error ? err.message : 'Failed to import system.');
      addToast({
        type: 'error',
        message: `Failed to import system: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSystemType('postgresql');
    setDescription('');
    setConnectionString('');
    setOwner({});
    setSla([]);
    setContactDetails({});
    setInfrastructureType('');
    setNotes('');
    setVersion('');
    setImportMode(false);
    setImportFile(null);
    setError(null);
    setOwnerSectionOpen(false);
    setContactSectionOpen(false);
    setSlaSectionOpen(false);
    setMetadataSectionOpen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // SLA item handlers
  const addSlaItem = () => {
    setSla([...sla, { name: '', value: '' }]);
  };

  const updateSlaItem = (index: number, field: keyof SLAProperty, value: string) => {
    const newSla = [...sla];
    const currentItem = newSla[index];
    if (!currentItem) return;
    newSla[index] = {
      name: field === 'name' ? value : currentItem.name,
      value: field === 'value' ? value : currentItem.value,
      unit: field === 'unit' ? value : currentItem.unit,
    };
    setSla(newSla);
  };

  const removeSlaItem = (index: number) => {
    setSla(sla.filter((_, i) => i !== index));
  };

  // Group infrastructure types for better UX (using actual enum values from relationship.ts)
  const infrastructureTypeGroups = {
    'Message Queues & Streaming': [
      InfrastructureTypeEnum.Kafka,
      InfrastructureTypeEnum.Pulsar,
      InfrastructureTypeEnum.RabbitMQ,
      InfrastructureTypeEnum.SQS,
      InfrastructureTypeEnum.SNS,
      InfrastructureTypeEnum.AzureServiceBus,
      InfrastructureTypeEnum.GooglePubSub,
      InfrastructureTypeEnum.NATS,
      InfrastructureTypeEnum.ActiveMQ,
      InfrastructureTypeEnum.AmazonMQ,
      InfrastructureTypeEnum.Kinesis,
      InfrastructureTypeEnum.EventHub,
      InfrastructureTypeEnum.EventBridge,
    ],
    'Orchestration & Workflow': [
      InfrastructureTypeEnum.Airflow,
      InfrastructureTypeEnum.Prefect,
      InfrastructureTypeEnum.Dagster,
      InfrastructureTypeEnum.Luigi,
      InfrastructureTypeEnum.Argo,
      InfrastructureTypeEnum.Temporal,
      InfrastructureTypeEnum.Conductor,
      InfrastructureTypeEnum.StepFunctions,
      InfrastructureTypeEnum.AzureDataFactory,
      InfrastructureTypeEnum.GoogleCloudComposer,
    ],
    'Data Processing': [
      InfrastructureTypeEnum.Spark,
      InfrastructureTypeEnum.Flink,
      InfrastructureTypeEnum.Beam,
      InfrastructureTypeEnum.Dask,
      InfrastructureTypeEnum.Ray,
      InfrastructureTypeEnum.Polars,
      InfrastructureTypeEnum.Presto,
      InfrastructureTypeEnum.Trino,
      InfrastructureTypeEnum.Hive,
      InfrastructureTypeEnum.Impala,
      InfrastructureTypeEnum.Storm,
      InfrastructureTypeEnum.Samza,
    ],
    'Cloud Data Platforms': [
      InfrastructureTypeEnum.Databricks,
      InfrastructureTypeEnum.Snowflake,
      InfrastructureTypeEnum.BigQuery,
      InfrastructureTypeEnum.Redshift,
      InfrastructureTypeEnum.Synapse,
      InfrastructureTypeEnum.EMR,
      InfrastructureTypeEnum.Dataproc,
      InfrastructureTypeEnum.HDInsight,
      InfrastructureTypeEnum.Glue,
      InfrastructureTypeEnum.DataFusion,
    ],
    'ETL/ELT Tools': [
      InfrastructureTypeEnum.Fivetran,
      InfrastructureTypeEnum.Airbyte,
      InfrastructureTypeEnum.Stitch,
      InfrastructureTypeEnum.Matillion,
      InfrastructureTypeEnum.Talend,
      InfrastructureTypeEnum.Informatica,
      InfrastructureTypeEnum.SSIS,
      InfrastructureTypeEnum.Pentaho,
      InfrastructureTypeEnum.NiFi,
      InfrastructureTypeEnum.StreamSets,
    ],
    Transformation: [
      InfrastructureTypeEnum.DBT,
      InfrastructureTypeEnum.SQLMesh,
      InfrastructureTypeEnum.Coalesce,
      InfrastructureTypeEnum.DataformGoogle,
    ],
    Databases: [
      InfrastructureTypeEnum.PostgreSQL,
      InfrastructureTypeEnum.MySQL,
      InfrastructureTypeEnum.MongoDB,
      InfrastructureTypeEnum.DynamoDB,
      InfrastructureTypeEnum.Cassandra,
      InfrastructureTypeEnum.CosmosDB,
      InfrastructureTypeEnum.Redis,
      InfrastructureTypeEnum.Elasticsearch,
      InfrastructureTypeEnum.ClickHouse,
      InfrastructureTypeEnum.DuckDB,
      InfrastructureTypeEnum.SQLite,
      InfrastructureTypeEnum.Oracle,
      InfrastructureTypeEnum.SQLServer,
      InfrastructureTypeEnum.DB2,
    ],
    'File/Object Storage': [
      InfrastructureTypeEnum.S3,
      InfrastructureTypeEnum.GCS,
      InfrastructureTypeEnum.ADLS,
      InfrastructureTypeEnum.MinIO,
      InfrastructureTypeEnum.HDFS,
    ],
    'Data Lake Formats': [
      InfrastructureTypeEnum.Delta,
      InfrastructureTypeEnum.Iceberg,
      InfrastructureTypeEnum.Hudi,
    ],
    'API & Integration': [
      InfrastructureTypeEnum.REST,
      InfrastructureTypeEnum.GraphQL,
      InfrastructureTypeEnum.gRPC,
      InfrastructureTypeEnum.Webhook,
      InfrastructureTypeEnum.SFTP,
      InfrastructureTypeEnum.FTP,
    ],
    'Data Catalogs & Governance': [
      InfrastructureTypeEnum.DataHub,
      InfrastructureTypeEnum.Amundsen,
      InfrastructureTypeEnum.Atlas,
      InfrastructureTypeEnum.Collibra,
      InfrastructureTypeEnum.Alation,
      InfrastructureTypeEnum.Purview,
      InfrastructureTypeEnum.OpenMetadata,
    ],
    'BI & Visualization': [
      InfrastructureTypeEnum.Looker,
      InfrastructureTypeEnum.Tableau,
      InfrastructureTypeEnum.PowerBI,
      InfrastructureTypeEnum.Metabase,
      InfrastructureTypeEnum.Superset,
      InfrastructureTypeEnum.Mode,
      InfrastructureTypeEnum.Sigma,
      InfrastructureTypeEnum.ThoughtSpot,
    ],
    Other: [
      InfrastructureTypeEnum.Custom,
      InfrastructureTypeEnum.Manual,
      InfrastructureTypeEnum.Unknown,
      InfrastructureTypeEnum.Other,
    ],
  };

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit System' : importMode ? 'Import System' : 'Create New System'}
      size="lg"
    >
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* Mode Toggle - only show in create mode, not edit mode */}
        {!isEditMode && (
          <div className="flex gap-2 border-b pb-3">
            <button
              type="button"
              onClick={() => {
                setImportMode(false);
                if (importMode) {
                  setName('');
                  setSystemType('postgresql');
                  setDescription('');
                  setConnectionString('');
                  setImportFile(null);
                  setError(null);
                }
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded ${
                !importMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Create New
            </button>
            <button
              type="button"
              onClick={() => {
                setImportMode(true);
                if (!importMode) {
                  setName('');
                  setSystemType('system');
                  setDescription('');
                  setConnectionString('');
                  setError(null);
                }
              }}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded ${
                importMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Import
            </button>
          </div>
        )}

        {importMode ? (
          /* Import Mode */
          <div className="space-y-4">
            <div>
              <label htmlFor="import-file" className="block text-sm font-medium text-gray-700 mb-2">
                System File (JSON)
              </label>
              <input
                id="import-file"
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isCreating || !importFile}
              >
                {isCreating ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        ) : (
          /* Create/Edit Mode */
          <div className="space-y-4">
            {/* Basic Fields */}
            <div>
              <label htmlFor="system-name" className="block text-sm font-medium text-gray-700 mb-2">
                System Name *
              </label>
              <input
                key="system-name-input"
                id="system-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., PostgreSQL Production"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreating && name.trim()) {
                    handleCreate();
                  }
                }}
              />
            </div>

            <div>
              <label htmlFor="system-type" className="block text-sm font-medium text-gray-700 mb-2">
                System Type *
              </label>
              <select
                id="system-type"
                value={systemType}
                onChange={(e) => setSystemType(e.target.value as System['system_type'])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="Relational Databases">
                  <option value="postgresql">PostgreSQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="mssql">Microsoft SQL Server</option>
                  <option value="oracle">Oracle</option>
                  <option value="db2">DB2</option>
                  <option value="sqlite">SQLite</option>
                  <option value="mariadb">MariaDB</option>
                  <option value="percona">Percona</option>
                </optgroup>
                <optgroup label="Cloud Databases">
                  <option value="dynamodb">DynamoDB</option>
                  <option value="cassandra">Cassandra</option>
                  <option value="mongodb">MongoDB</option>
                  <option value="redis">Redis</option>
                  <option value="elasticsearch">Elasticsearch</option>
                  <option value="influxdb">InfluxDB</option>
                  <option value="timescaledb">TimescaleDB</option>
                  <option value="clickhouse">ClickHouse</option>
                  <option value="bigquery">BigQuery</option>
                  <option value="snowflake">Snowflake</option>
                  <option value="redshift">Amazon Redshift</option>
                  <option value="databricks">Databricks</option>
                  <option value="deltalake">Delta Lake</option>
                  <option value="duckdb">DuckDB</option>
                  <option value="motherduck">MotherDuck</option>
                </optgroup>
                <optgroup label="Data Warehouses & Analytics">
                  <option value="hive">Apache Hive</option>
                  <option value="presto">Presto</option>
                  <option value="trino">Trino</option>
                </optgroup>
                <optgroup label="NoSQL & Document Stores">
                  <option value="couchdb">CouchDB</option>
                  <option value="rethinkdb">RethinkDB</option>
                </optgroup>
                <optgroup label="Graph Databases">
                  <option value="neo4j">Neo4j</option>
                  <option value="arangodb">ArangoDB</option>
                </optgroup>
                <optgroup label="BI Applications">
                  <option value="looker">Looker</option>
                  <option value="quicksight">Amazon QuickSight</option>
                  <option value="tableau">Tableau</option>
                  <option value="powerbi">Power BI</option>
                  <option value="qlik">Qlik</option>
                  <option value="metabase">Metabase</option>
                  <option value="superset">Apache Superset</option>
                  <option value="mode">Mode</option>
                  <option value="chartio">Chartio</option>
                  <option value="periscope">Periscope</option>
                  <option value="sisense">Sisense</option>
                  <option value="domo">Domo</option>
                  <option value="thoughtspot">ThoughtSpot</option>
                  <option value="microstrategy">MicroStrategy</option>
                  <option value="cognos">IBM Cognos</option>
                  <option value="businessobjects">SAP BusinessObjects</option>
                </optgroup>
                <optgroup label="Message Bus & Event Streaming">
                  <option value="kafka">Apache Kafka</option>
                  <option value="pulsar">Apache Pulsar</option>
                  <option value="eventbus">EventBus</option>
                  <option value="rabbitmq">RabbitMQ</option>
                  <option value="activemq">Apache ActiveMQ</option>
                  <option value="nats">NATS</option>
                  <option value="amazonmq">Amazon MQ</option>
                  <option value="azureservicebus">Azure Service Bus</option>
                  <option value="googlepubsub">Google Pub/Sub</option>
                </optgroup>
                <optgroup label="Cache Services">
                  <option value="elasticache">AWS ElastiCache</option>
                  <option value="memcached">Memcached</option>
                  <option value="hazelcast">Hazelcast</option>
                  <option value="aerospike">Aerospike</option>
                  <option value="couchbase">Couchbase</option>
                </optgroup>
                <optgroup label="Cloud Infrastructure & Servers">
                  <option value="ec2">Amazon EC2</option>
                  <option value="eks">Amazon EKS</option>
                  <option value="docker">Docker</option>
                  <option value="kubernetes">Kubernetes</option>
                  <option value="lambda">AWS Lambda</option>
                  <option value="azurefunctions">Azure Functions</option>
                  <option value="gcpcloudfunctions">GCP Cloud Functions</option>
                  <option value="azurevm">Azure Virtual Machines</option>
                  <option value="gcpcomputeengine">GCP Compute Engine</option>
                  <option value="azurecontainerinstances">Azure Container Instances</option>
                  <option value="gcpcloudrun">GCP Cloud Run</option>
                  <option value="fargate">AWS Fargate</option>
                  <option value="ecs">Amazon ECS</option>
                </optgroup>
                <optgroup label="Legacy/Generic">
                  <option value="database">Database (Generic)</option>
                  <option value="schema">Schema (Generic)</option>
                  <option value="namespace">Namespace (Generic)</option>
                  <option value="system">System (Generic)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label
                htmlFor="system-description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description
              </label>
              <textarea
                id="system-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Production PostgreSQL database for customer data"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label
                htmlFor="connection-string"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Connection String
              </label>
              <input
                id="connection-string"
                type="text"
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                placeholder="e.g., postgresql://host:5432/dbname"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Advanced Sections (Collapsible) */}
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-3">Advanced Options (SDK 2.3.0+)</p>

              {/* Owner Section */}
              <CollapsibleSection
                title="Owner"
                isOpen={ownerSectionOpen}
                onToggle={() => setOwnerSectionOpen(!ownerSectionOpen)}
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={owner.name || ''}
                      onChange={(e) => setOwner({ ...owner, name: e.target.value })}
                      placeholder="Owner name"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={owner.email || ''}
                      onChange={(e) => setOwner({ ...owner, email: e.target.value })}
                      placeholder="owner@example.com"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Team</label>
                    <input
                      type="text"
                      value={owner.team || ''}
                      onChange={(e) => setOwner({ ...owner, team: e.target.value })}
                      placeholder="Team name"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                    <input
                      type="text"
                      value={owner.role || ''}
                      onChange={(e) => setOwner({ ...owner, role: e.target.value })}
                      placeholder="e.g., Data Owner"
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </CollapsibleSection>

              {/* Contact Details Section */}
              <div className="mt-2">
                <CollapsibleSection
                  title="Contact Details"
                  isOpen={contactSectionOpen}
                  onToggle={() => setContactSectionOpen(!contactSectionOpen)}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                      <input
                        type="text"
                        value={contactDetails.name || ''}
                        onChange={(e) =>
                          setContactDetails({ ...contactDetails, name: e.target.value })
                        }
                        placeholder="Contact name"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <input
                        type="email"
                        value={contactDetails.email || ''}
                        onChange={(e) =>
                          setContactDetails({ ...contactDetails, email: e.target.value })
                        }
                        placeholder="contact@example.com"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={contactDetails.phone || ''}
                        onChange={(e) =>
                          setContactDetails({ ...contactDetails, phone: e.target.value })
                        }
                        placeholder="+1 234 567 8900"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                      <input
                        type="text"
                        value={contactDetails.role || ''}
                        onChange={(e) =>
                          setContactDetails({ ...contactDetails, role: e.target.value })
                        }
                        placeholder="e.g., DBA"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Other</label>
                      <input
                        type="text"
                        value={contactDetails.other || ''}
                        onChange={(e) =>
                          setContactDetails({ ...contactDetails, other: e.target.value })
                        }
                        placeholder="Additional contact info"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </CollapsibleSection>
              </div>

              {/* SLA Properties Section */}
              <div className="mt-2">
                <CollapsibleSection
                  title={`SLA Properties ${sla.length > 0 ? `(${sla.length})` : ''}`}
                  isOpen={slaSectionOpen}
                  onToggle={() => setSlaSectionOpen(!slaSectionOpen)}
                >
                  <div className="space-y-2">
                    {sla.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateSlaItem(index, 'name', e.target.value)}
                            placeholder="Name (e.g., Uptime)"
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={item.value}
                            onChange={(e) => updateSlaItem(index, 'value', e.target.value)}
                            placeholder="Value (e.g., 99.9)"
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            value={item.unit || ''}
                            onChange={(e) => updateSlaItem(index, 'unit', e.target.value)}
                            placeholder="Unit (e.g., %)"
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSlaItem(index)}
                          className="p-1 text-red-500 hover:text-red-700"
                          title="Remove SLA"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addSlaItem}
                      className="w-full py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded hover:border-blue-500"
                    >
                      + Add SLA Property
                    </button>
                  </div>
                </CollapsibleSection>
              </div>

              {/* Infrastructure & Metadata Section */}
              <div className="mt-2">
                <CollapsibleSection
                  title="Infrastructure & Metadata"
                  isOpen={metadataSectionOpen}
                  onToggle={() => setMetadataSectionOpen(!metadataSectionOpen)}
                >
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Infrastructure Type
                      </label>
                      <select
                        value={infrastructureType}
                        onChange={(e) =>
                          setInfrastructureType(e.target.value as InfrastructureType | '')
                        }
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">-- Select Infrastructure Type --</option>
                        {Object.entries(infrastructureTypeGroups).map(([group, types]) => (
                          <optgroup key={group} label={group}>
                            {types.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Version
                      </label>
                      <input
                        type="text"
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        placeholder="e.g., 1.0.0"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes about this system..."
                        rows={3}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </CollapsibleSection>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isCreating || !name.trim()}
              >
                {isCreating
                  ? isEditMode
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditMode
                    ? 'Update'
                    : 'Create'}
              </button>
            </div>
          </div>
        )}
      </div>
    </DraggableModal>
  );
};
