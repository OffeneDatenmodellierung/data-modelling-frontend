/**
 * Create System Dialog Component
 * Allows creating or importing a new system within a domain
 * Supports SDK system-schema.json with environment-specific connections
 */

import React, { useState, useEffect } from 'react';
import { DraggableModal } from '@/components/common/DraggableModal';
import { useModelStore } from '@/stores/modelStore';
import { useUIStore } from '@/stores/uiStore';
import type {
  System,
  EnvironmentConnection,
  SlaProperty,
  AuthMethod,
  EnvironmentStatus,
} from '@/types/system';
import type { ContactDetails } from '@/types/relationship';

export interface CreateSystemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (systemId: string) => void;
  domainId: string;
  editingSystemId?: string | null;
  linkTableId?: string | null;
}

// Default empty environment
const createEmptyEnvironment = (envName: string = ''): EnvironmentConnection => ({
  environment: envName,
  owner: '',
  status: 'active',
});

// Collapsible section component
const CollapsibleSection: React.FC<{
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: string;
}> = ({ title, isOpen, onToggle, children, badge }) => (
  <div className="border border-gray-200 rounded-md">
    <button
      type="button"
      onClick={onToggle}
      className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-t-md"
    >
      <span className="flex items-center gap-2">
        {title}
        {badge && (
          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">{badge}</span>
        )}
      </span>
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

// Environment editor component
const EnvironmentEditor: React.FC<{
  env: EnvironmentConnection;
  index: number;
  onChange: (index: number, env: EnvironmentConnection) => void;
  onRemove: (index: number) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}> = ({ env, index, onChange, onRemove, isExpanded, onToggleExpand }) => {
  const updateField = <K extends keyof EnvironmentConnection>(
    field: K,
    value: EnvironmentConnection[K]
  ) => {
    onChange(index, { ...env, [field]: value });
  };

  const updateContactDetails = (field: keyof ContactDetails, value: string) => {
    onChange(index, {
      ...env,
      contactDetails: { ...env.contactDetails, [field]: value },
    });
  };

  // SLA management
  const addSla = () => {
    const newSla: SlaProperty = { property: '', value: '', unit: '' };
    onChange(index, { ...env, sla: [...(env.sla || []), newSla] });
  };

  const updateSla = (slaIndex: number, field: keyof SlaProperty, value: string | number) => {
    const newSla = [...(env.sla || [])];
    const currentSla = newSla[slaIndex];
    if (currentSla) {
      newSla[slaIndex] = { ...currentSla, [field]: value };
      onChange(index, { ...env, sla: newSla });
    }
  };

  const removeSla = (slaIndex: number) => {
    onChange(index, { ...env, sla: (env.sla || []).filter((_, i) => i !== slaIndex) });
  };

  return (
    <div className="border border-gray-300 rounded-md bg-white">
      {/* Environment header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-md">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{env.environment || `Environment ${index + 1}`}</span>
          {env.status && env.status !== 'active' && (
            <span
              className={`px-1.5 py-0.5 text-xs rounded ${
                env.status === 'deprecated'
                  ? 'bg-yellow-100 text-yellow-700'
                  : env.status === 'maintenance'
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-600'
              }`}
            >
              {env.status}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
          title="Remove environment"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Environment details */}
      {isExpanded && (
        <div className="p-3 space-y-4">
          {/* Basic info row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Environment Name *
              </label>
              <input
                type="text"
                value={env.environment}
                onChange={(e) => updateField('environment', e.target.value)}
                placeholder="e.g., production"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Owner/Team</label>
              <input
                type="text"
                value={env.owner || ''}
                onChange={(e) => updateField('owner', e.target.value)}
                placeholder="e.g., Platform Team"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select
                value={env.status || 'active'}
                onChange={(e) => updateField('status', e.target.value as EnvironmentStatus)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="deprecated">Deprecated</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Connection details row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Endpoint</label>
              <input
                type="text"
                value={env.endpoint || ''}
                onChange={(e) => updateField('endpoint', e.target.value)}
                placeholder="e.g., db.example.com"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
              <input
                type="number"
                value={env.port || ''}
                onChange={(e) =>
                  updateField('port', e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                placeholder="e.g., 5432"
                min={1}
                max={65535}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Region</label>
              <input
                type="text"
                value={env.region || ''}
                onChange={(e) => updateField('region', e.target.value)}
                placeholder="e.g., us-east-1"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Auth and support row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Auth Method</label>
              <select
                value={env.authMethod || ''}
                onChange={(e) =>
                  updateField('authMethod', (e.target.value || undefined) as AuthMethod)
                }
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Select --</option>
                <option value="iamRole">IAM Role</option>
                <option value="oauth2">OAuth 2.0</option>
                <option value="apiKey">API Key</option>
                <option value="basicAuth">Basic Auth</option>
                <option value="certificate">Certificate</option>
                <option value="saml">SAML</option>
                <option value="oidc">OIDC</option>
                <option value="kerberos">Kerberos</option>
                <option value="awsSignatureV4">AWS Signature V4</option>
                <option value="gcpServiceAccount">GCP Service Account</option>
                <option value="azureActiveDirectory">Azure AD</option>
                <option value="mtls">mTLS</option>
                <option value="none">None</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Support Team</label>
              <input
                type="text"
                value={env.supportTeam || ''}
                onChange={(e) => updateField('supportTeam', e.target.value)}
                placeholder="e.g., oncall-database"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Secret Link</label>
              <input
                type="text"
                value={env.secretLink || ''}
                onChange={(e) => updateField('secretLink', e.target.value)}
                placeholder="e.g., vault://secrets/db"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Contact Details</label>
            <div className="grid grid-cols-4 gap-2">
              <input
                type="text"
                value={env.contactDetails?.name || ''}
                onChange={(e) => updateContactDetails('name', e.target.value)}
                placeholder="Name"
                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="email"
                value={env.contactDetails?.email || ''}
                onChange={(e) => updateContactDetails('email', e.target.value)}
                placeholder="Email"
                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="tel"
                value={env.contactDetails?.phone || ''}
                onChange={(e) => updateContactDetails('phone', e.target.value)}
                placeholder="Phone"
                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                value={env.contactDetails?.role || ''}
                onChange={(e) => updateContactDetails('role', e.target.value)}
                placeholder="Role"
                className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* SLA Properties */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              SLA Properties {env.sla && env.sla.length > 0 && `(${env.sla.length})`}
            </label>
            <div className="space-y-2">
              {(env.sla || []).map((sla, slaIndex) => (
                <div
                  key={slaIndex}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                >
                  <input
                    type="text"
                    value={sla.property}
                    onChange={(e) => updateSla(slaIndex, 'property', e.target.value)}
                    placeholder="Property (e.g., availability)"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={sla.value}
                    onChange={(e) => updateSla(slaIndex, 'value', e.target.value)}
                    placeholder="Value (e.g., 99.9)"
                    className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={sla.unit}
                    onChange={(e) => updateSla(slaIndex, 'unit', e.target.value)}
                    placeholder="Unit (e.g., %)"
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeSla(slaIndex)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Remove SLA"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                onClick={addSla}
                className="w-full py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded hover:border-blue-500"
              >
                + Add SLA Property
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              value={env.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Additional notes about this environment..."
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

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

  // Environments array
  const [environments, setEnvironments] = useState<EnvironmentConnection[]>([]);
  const [expandedEnvIndex, setExpandedEnvIndex] = useState<number | null>(null);

  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [envSectionOpen, setEnvSectionOpen] = useState(false);

  const isEditMode = !!editingSystemId;
  const editingSystem = editingSystemId ? systems.find((s) => s.id === editingSystemId) : null;

  // Load system data when editing
  useEffect(() => {
    if (isOpen && isEditMode && editingSystem) {
      setName(editingSystem.name);
      setSystemType(editingSystem.system_type);
      setDescription(editingSystem.description || '');
      setEnvironments(editingSystem.environments || []);
      setEnvSectionOpen((editingSystem.environments?.length ?? 0) > 0);
      setExpandedEnvIndex(editingSystem.environments?.length ? 0 : null);
      setImportMode(false);
    } else if (isOpen && !isEditMode) {
      resetForm();
    }
  }, [isOpen, isEditMode, editingSystem]);

  // Filter valid environments (must have environment name)
  const getValidEnvironments = (envs: EnvironmentConnection[]) =>
    envs.filter((e) => e.environment.trim().length > 0);

  const handleCreate = async () => {
    setError(null);

    if (!name.trim()) {
      setError('System name is required.');
      return;
    }

    // Check for duplicate system name
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
      const validEnvironments = getValidEnvironments(environments);

      if (isEditMode && editingSystemId) {
        updateSystem(editingSystemId, {
          name: name.trim(),
          system_type: systemType,
          description: description.trim() || undefined,
          environments: validEnvironments.length > 0 ? validEnvironments : undefined,
        });
        addToast({
          type: 'success',
          message: `System '${name.trim()}' updated successfully!`,
        });
        onCreated(editingSystemId);
      } else {
        const { generateUUID } = await import('@/utils/validation');
        const systemId = generateUUID();

        const newSystem: System = {
          id: systemId,
          domain_id: domainId,
          name: name.trim(),
          system_type: systemType,
          description: description.trim() || undefined,
          environments: validEnvironments.length > 0 ? validEnvironments : undefined,
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
      const text = await importFile.text();
      let systemData: Partial<System>;
      try {
        systemData = JSON.parse(text);
      } catch {
        setError('Import currently supports JSON format only.');
        setIsCreating(false);
        return;
      }

      const { generateUUID } = await import('@/utils/validation');
      const systemId = generateUUID();
      const newSystem: System = {
        id: systemId,
        domain_id: domainId,
        name: systemData.name || importFile.name.replace(/\.[^/.]+$/, ''),
        system_type: systemData.system_type || 'postgresql',
        description: systemData.description,
        environments: systemData.environments,
        created_at: new Date().toISOString(),
        last_modified_at: new Date().toISOString(),
        table_ids: systemData.table_ids || [],
        asset_ids: systemData.asset_ids || [],
      };

      addSystem(newSystem);
      addToast({ type: 'success', message: `System imported successfully!` });
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
    setEnvironments([]);
    setExpandedEnvIndex(null);
    setImportMode(false);
    setImportFile(null);
    setError(null);
    setEnvSectionOpen(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Environment management
  const addEnvironment = (envName: string = '') => {
    const newEnv = createEmptyEnvironment(envName);
    setEnvironments([...environments, newEnv]);
    setExpandedEnvIndex(environments.length);
    setEnvSectionOpen(true);
  };

  const updateEnvironment = (index: number, env: EnvironmentConnection) => {
    const newEnvs = [...environments];
    newEnvs[index] = env;
    setEnvironments(newEnvs);
  };

  const removeEnvironment = (index: number) => {
    setEnvironments(environments.filter((_, i) => i !== index));
    if (expandedEnvIndex === index) {
      setExpandedEnvIndex(null);
    } else if (expandedEnvIndex !== null && expandedEnvIndex > index) {
      setExpandedEnvIndex(expandedEnvIndex - 1);
    }
  };

  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit System' : importMode ? 'Import System' : 'Create New System'}
      size="lg"
    >
      <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
        {error && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {/* Mode Toggle */}
        {!isEditMode && (
          <div className="flex gap-2 border-b pb-3">
            <button
              type="button"
              onClick={() => {
                setImportMode(false);
                if (importMode) resetForm();
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
                if (!importMode) resetForm();
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
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={isCreating || !importFile}
              >
                {isCreating ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Basic Fields */}
            <div>
              <label htmlFor="system-name" className="block text-sm font-medium text-gray-700 mb-2">
                System Name *
              </label>
              <input
                id="system-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., PostgreSQL Production"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="system-type" className="block text-sm font-medium text-gray-700 mb-2">
                System Type
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
                  <option value="sqlite">SQLite</option>
                  <option value="mariadb">MariaDB</option>
                </optgroup>
                <optgroup label="AWS">
                  <option value="rds_postgresql">RDS PostgreSQL</option>
                  <option value="rds_mysql">RDS MySQL</option>
                  <option value="redshift">Redshift</option>
                  <option value="aurora">Aurora</option>
                  <option value="dynamodb">DynamoDB</option>
                  <option value="s3">S3</option>
                  <option value="athena">Athena</option>
                  <option value="glue">Glue</option>
                  <option value="kinesis">Kinesis</option>
                  <option value="lambda">Lambda</option>
                </optgroup>
                <optgroup label="Azure">
                  <option value="azure_sql_database">Azure SQL Database</option>
                  <option value="cosmosdb">CosmosDB</option>
                  <option value="azure_synapse_analytics">Synapse Analytics</option>
                  <option value="azure_blob_storage">Blob Storage</option>
                  <option value="event_hubs">Event Hubs</option>
                  <option value="powerbi">Power BI</option>
                </optgroup>
                <optgroup label="GCP">
                  <option value="bigquery">BigQuery</option>
                  <option value="cloud_sql_postgresql">Cloud SQL PostgreSQL</option>
                  <option value="cloud_spanner">Cloud Spanner</option>
                  <option value="firestore">Firestore</option>
                  <option value="pubsub">Pub/Sub</option>
                  <option value="looker">Looker</option>
                </optgroup>
                <optgroup label="Data Platforms">
                  <option value="snowflake">Snowflake</option>
                  <option value="databricks">Databricks</option>
                  <option value="teradata">Teradata</option>
                  <option value="vertica">Vertica</option>
                </optgroup>
                <optgroup label="NoSQL">
                  <option value="mongodb">MongoDB</option>
                  <option value="cassandra">Cassandra</option>
                  <option value="redis">Redis</option>
                  <option value="elasticsearch">Elasticsearch</option>
                  <option value="neo4j">Neo4j</option>
                </optgroup>
                <optgroup label="Message Queues">
                  <option value="kafka">Kafka</option>
                  <option value="rabbitmq">RabbitMQ</option>
                  <option value="pulsar">Pulsar</option>
                  <option value="sqs">SQS</option>
                  <option value="sns">SNS</option>
                </optgroup>
                <optgroup label="BI & Analytics">
                  <option value="tableau">Tableau</option>
                  <option value="metabase">Metabase</option>
                  <option value="superset">Superset</option>
                  <option value="grafana">Grafana</option>
                </optgroup>
                <optgroup label="Infrastructure">
                  <option value="kubernetes">Kubernetes</option>
                  <option value="docker">Docker</option>
                  <option value="hdfs">HDFS</option>
                  <option value="minio">MinIO</option>
                </optgroup>
                <optgroup label="Generic">
                  <option value="database">Database</option>
                  <option value="system">System</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description of this system..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Environments Section */}
            <CollapsibleSection
              title="Environments"
              isOpen={envSectionOpen}
              onToggle={() => setEnvSectionOpen(!envSectionOpen)}
              badge={environments.length > 0 ? `${environments.length}` : undefined}
            >
              <div className="space-y-3">
                {environments.map((env, index) => (
                  <EnvironmentEditor
                    key={index}
                    env={env}
                    index={index}
                    onChange={updateEnvironment}
                    onRemove={removeEnvironment}
                    isExpanded={expandedEnvIndex === index}
                    onToggleExpand={() =>
                      setExpandedEnvIndex(expandedEnvIndex === index ? null : index)
                    }
                  />
                ))}

                {/* Quick add buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addEnvironment('development')}
                    className="flex-1 py-2 text-sm text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded hover:border-blue-500"
                  >
                    + Dev
                  </button>
                  <button
                    type="button"
                    onClick={() => addEnvironment('staging')}
                    className="flex-1 py-2 text-sm text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded hover:border-blue-500"
                  >
                    + Staging
                  </button>
                  <button
                    type="button"
                    onClick={() => addEnvironment('production')}
                    className="flex-1 py-2 text-sm text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded hover:border-blue-500"
                  >
                    + Production
                  </button>
                  <button
                    type="button"
                    onClick={() => addEnvironment('')}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-dashed border-gray-300 rounded hover:border-gray-500"
                    title="Add custom environment"
                  >
                    + Custom
                  </button>
                </div>
              </div>
            </CollapsibleSection>

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
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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
