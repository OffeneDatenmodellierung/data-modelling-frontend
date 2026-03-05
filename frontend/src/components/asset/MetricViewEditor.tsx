/**
 * Metric View Editor Component
 * Full editor/viewer for Databricks Metric Views (DBMV)
 * Supports edit mode (owned domain) and read-only mode (shared/viewer)
 */

import React, { useState, useEffect } from 'react';
import { DraggableModal } from '@/components/common/DraggableModal';
import { useModelStore } from '@/stores/modelStore';
import { useUIStore } from '@/stores/uiStore';
import { isViewerMode } from '@/services/viewerMode';
import type {
  MetricView,
  MetricViewType,
  MetricViewDimension,
  MetricViewMeasure,
  MetricViewJoin,
  Materialization,
  MaterializedViewSpec,
} from '@/types/metricView';

export interface MetricViewEditorProps {
  metricView?: MetricView;
  domainId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MetricViewEditor: React.FC<MetricViewEditorProps> = ({
  metricView,
  domainId,
  isOpen,
  onClose,
}) => {
  const { addMetricView, updateMetricView, selectedDomainId } = useModelStore();
  const { addToast } = useUIStore();

  const isEditable = !isViewerMode() && (!metricView || metricView.domain_id === selectedDomainId);

  // Basic fields
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [viewType, setViewType] = useState<MetricViewType>('standard');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('');
  const [filter, setFilter] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // List fields
  const [dimensions, setDimensions] = useState<MetricViewDimension[]>([]);
  const [measures, setMeasures] = useState<MetricViewMeasure[]>([]);
  const [joins, setJoins] = useState<MetricViewJoin[]>([]);

  // Materialization
  const [matSchedule, setMatSchedule] = useState('');
  const [matMode, setMatMode] = useState('');
  const [matViews, setMatViews] = useState<MaterializedViewSpec[]>([]);

  // Initialize form when dialog opens or view changes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setSource('');
      setViewType('standard');
      setDescription('');
      setVersion('');
      setFilter('');
      setTagsInput('');
      setTags([]);
      setDimensions([]);
      setMeasures([]);
      setJoins([]);
      setMatSchedule('');
      setMatMode('');
      setMatViews([]);
      return;
    }

    if (metricView) {
      setName(metricView.name);
      setSource(metricView.source || '');
      setViewType(metricView.view_type || 'standard');
      setDescription(metricView.description || '');
      setVersion(metricView.version || '');
      setFilter(metricView.filter || '');
      setTags(metricView.tags || []);
      setTagsInput((metricView.tags || []).join(', '));
      setDimensions(metricView.dimensions || []);
      setMeasures(metricView.measures || []);
      setJoins(metricView.joins || []);
      const mat = metricView.materialization;
      setMatSchedule(mat?.schedule || '');
      setMatMode(mat?.mode || '');
      setMatViews(mat?.materialized_views || []);
    }
  }, [metricView, isOpen]);

  const handleTagsInputChange = (value: string) => {
    setTagsInput(value);
    const parsed = value
      .split(/, /)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    setTags(parsed);
  };

  // Dimension helpers
  const handleAddDimension = () => {
    setDimensions([...dimensions, { name: '', expr: '' }]);
  };
  const handleRemoveDimension = (index: number) => {
    setDimensions(dimensions.filter((_, i) => i !== index));
  };
  const handleDimensionChange = (
    index: number,
    field: keyof MetricViewDimension,
    value: string
  ) => {
    setDimensions(dimensions.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  // Measure helpers
  const handleAddMeasure = () => {
    setMeasures([...measures, { name: '', expr: '' }]);
  };
  const handleRemoveMeasure = (index: number) => {
    setMeasures(measures.filter((_, i) => i !== index));
  };
  const handleMeasureChange = (index: number, field: keyof MetricViewMeasure, value: string) => {
    setMeasures(measures.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };

  // Join helpers
  const handleAddJoin = () => {
    setJoins([...joins, { table: '', on: '' }]);
  };
  const handleRemoveJoin = (index: number) => {
    setJoins(joins.filter((_, i) => i !== index));
  };
  const handleJoinChange = (index: number, field: keyof MetricViewJoin, value: string) => {
    setJoins(joins.map((j, i) => (i === index ? { ...j, [field]: value } : j)));
  };

  // Materialized view spec helpers
  const handleAddMatView = () => {
    setMatViews([...matViews, { name: '', type: 'aggregated' }]);
  };
  const handleRemoveMatView = (index: number) => {
    setMatViews(matViews.filter((_, i) => i !== index));
  };
  const handleMatViewChange = (index: number, field: string, value: string) => {
    setMatViews(
      matViews.map((mv, i) => {
        if (i !== index) return mv;
        if (field === 'dimensions' || field === 'measures') {
          const arr = value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
          return { ...mv, [field]: arr.length > 0 ? arr : undefined };
        }
        return { ...mv, [field]: value };
      })
    );
  };

  const handleExport = async () => {
    if (!metricView) return;
    setIsExporting(true);
    try {
      const { dbmvService } = await import('@/services/sdk/dbmvService');
      const yamlContent = await dbmvService.toSingleViewYAML(metricView);
      const blob = new Blob([yamlContent], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${metricView.name.replace(/\s+/g, '_')}.dbmv.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({ type: 'success', message: `Exported ${metricView.name} as DBMV YAML` });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to export metric view',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({ type: 'error', message: 'Metric view name is required' });
      return;
    }
    if (!source.trim()) {
      addToast({ type: 'error', message: 'Source table is required' });
      return;
    }

    const filteredDimensions = dimensions.filter((d) => d.name.trim() && d.expr.trim());
    const filteredMeasures = measures.filter((m) => m.name.trim() && m.expr.trim());
    const filteredJoins = joins.filter((j) => j.table.trim() && j.on.trim());

    const materialization: Materialization | undefined =
      viewType === 'materialized'
        ? {
            schedule: matSchedule.trim() || undefined,
            mode: matMode.trim() || undefined,
            materialized_views:
              matViews.filter((mv) => mv.name.trim()).length > 0
                ? matViews.filter((mv) => mv.name.trim())
                : undefined,
          }
        : undefined;

    const viewData: Partial<MetricView> = {
      name: name.trim(),
      view_type: viewType,
      source: source.trim(),
      description: description.trim() || undefined,
      version: version.trim() || undefined,
      filter: filter.trim() || undefined,
      dimensions: filteredDimensions,
      measures: filteredMeasures,
      joins: filteredJoins.length > 0 ? filteredJoins : undefined,
      materialization,
      tags: tags.length > 0 ? tags : undefined,
      last_modified_at: new Date().toISOString(),
    };

    if (metricView) {
      updateMetricView(metricView.id, viewData);
      addToast({ type: 'success', message: `Metric view "${name.trim()}" updated` });
    } else {
      const { generateUUID } = await import('@/utils/validation');
      addMetricView({
        ...viewData,
        id: generateUUID(),
        domain_id: domainId,
        dimensions: filteredDimensions,
        measures: filteredMeasures,
        created_at: new Date().toISOString(),
      } as MetricView);
      addToast({ type: 'success', message: `Metric view "${name.trim()}" created` });
    }

    onClose();
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm';
  const disabledInputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  // Read-only view
  if (!isEditable && metricView) {
    return (
      <DraggableModal
        isOpen={isOpen}
        onClose={onClose}
        title="Metric View — Read Only"
        size="xl"
        initialPosition={{
          x: window.innerWidth / 2 - 450,
          y: window.innerHeight / 2 - 350,
        }}
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Read-Only Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-yellow-800">Read-Only View</h3>
                <p className="text-xs text-yellow-700">
                  {isViewerMode()
                    ? 'Viewer mode — editing is disabled.'
                    : 'This metric view belongs to another domain.'}
                </p>
              </div>
            </div>
          </div>

          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <input type="text" value={metricView.name} disabled className={disabledInputClass} />
            </div>
            <div>
              <label className={labelClass}>View Type</label>
              <input
                type="text"
                value={metricView.view_type === 'materialized' ? 'Materialized' : 'Standard'}
                disabled
                className={disabledInputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Source</label>
            <input
              type="text"
              value={metricView.source || ''}
              disabled
              className={disabledInputClass}
            />
          </div>
          {metricView.description && (
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={metricView.description}
                disabled
                rows={2}
                className={disabledInputClass}
              />
            </div>
          )}
          {metricView.version && (
            <div>
              <label className={labelClass}>Version</label>
              <input
                type="text"
                value={metricView.version}
                disabled
                className={disabledInputClass}
              />
            </div>
          )}
          {metricView.filter && (
            <div>
              <label className={labelClass}>Filter</label>
              <input
                type="text"
                value={metricView.filter}
                disabled
                className={disabledInputClass}
              />
            </div>
          )}

          {/* Dimensions */}
          {metricView.dimensions.length > 0 && (
            <div>
              <label className={labelClass}>Dimensions ({metricView.dimensions.length})</label>
              <div className="space-y-1">
                {metricView.dimensions.map((d, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded p-2 text-sm">
                    <span className="font-medium">{d.name}</span>
                    <span className="text-gray-500 ml-2">= {d.expr}</span>
                    {d.comment && <span className="text-gray-400 ml-2">({d.comment})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Measures */}
          {metricView.measures.length > 0 && (
            <div>
              <label className={labelClass}>Measures ({metricView.measures.length})</label>
              <div className="space-y-1">
                {metricView.measures.map((m, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded p-2 text-sm">
                    <span className="font-medium">{m.name}</span>
                    <span className="text-gray-500 ml-2">= {m.expr}</span>
                    {m.filter && <span className="text-blue-500 ml-2">FILTER: {m.filter}</span>}
                    {m.comment && <span className="text-gray-400 ml-2">({m.comment})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Joins */}
          {metricView.joins && metricView.joins.length > 0 && (
            <div>
              <label className={labelClass}>Joins ({metricView.joins.length})</label>
              <div className="space-y-1">
                {metricView.joins.map((j, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded p-2 text-sm">
                    <span className="font-medium uppercase text-xs text-purple-600 mr-1">
                      {j.type || 'inner'}
                    </span>
                    <span className="font-medium">{j.table}</span>
                    <span className="text-gray-500 ml-2">ON {j.on}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Materialization */}
          {metricView.materialization && (
            <div>
              <label className={labelClass}>Materialization</label>
              <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm space-y-1">
                {metricView.materialization.schedule && (
                  <div>
                    <span className="text-gray-500">Schedule:</span>{' '}
                    {metricView.materialization.schedule}
                  </div>
                )}
                {metricView.materialization.mode && (
                  <div>
                    <span className="text-gray-500">Mode:</span> {metricView.materialization.mode}
                  </div>
                )}
                {metricView.materialization.materialized_views?.map((mv, i) => (
                  <div key={i} className="border-t border-gray-200 pt-1 mt-1">
                    <span className="font-medium">{mv.name}</span>
                    <span className="text-gray-500 ml-2">({mv.type})</span>
                    {mv.dimensions && (
                      <div className="text-xs text-gray-400 ml-4">
                        dims: {mv.dimensions.join(', ')}
                      </div>
                    )}
                    {mv.measures && (
                      <div className="text-xs text-gray-400 ml-4">
                        measures: {mv.measures.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {metricView.tags && metricView.tags.length > 0 && (
            <div>
              <label className={labelClass}>Tags</label>
              <div className="flex flex-wrap gap-1">
                {metricView.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-gray-200">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Export YAML'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </DraggableModal>
    );
  }

  // Editable form
  return (
    <DraggableModal
      isOpen={isOpen}
      onClose={onClose}
      title={metricView ? 'Edit Metric View' : 'Create Metric View'}
      size="xl"
      initialPosition={{
        x: window.innerWidth / 2 - 450,
        y: window.innerHeight / 2 - 350,
      }}
    >
      <div className="space-y-4 max-h-[80vh] overflow-y-auto">
        {/* Basic fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="mv-ed-name" className={labelClass}>
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="mv-ed-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g., Sales Revenue Metrics"
            />
          </div>
          <div>
            <label htmlFor="mv-ed-type" className={labelClass}>
              View Type
            </label>
            <select
              id="mv-ed-type"
              value={viewType}
              onChange={(e) => setViewType(e.target.value as MetricViewType)}
              className={inputClass}
            >
              <option value="standard">Standard</option>
              <option value="materialized">Materialized</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="mv-ed-source" className={labelClass}>
            Source <span className="text-red-500">*</span>
          </label>
          <input
            id="mv-ed-source"
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={inputClass}
            placeholder="e.g., catalog.schema.sales_facts"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="mv-ed-version" className={labelClass}>
              Version
            </label>
            <input
              id="mv-ed-version"
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className={inputClass}
              placeholder="e.g., 1.1"
            />
          </div>
          <div>
            <label htmlFor="mv-ed-filter" className={labelClass}>
              Global Filter
            </label>
            <input
              id="mv-ed-filter"
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={inputClass}
              placeholder="e.g., status = 'active'"
            />
          </div>
        </div>

        <div>
          <label htmlFor="mv-ed-desc" className={labelClass}>
            Description
          </label>
          <textarea
            id="mv-ed-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="Purpose of this metric view"
          />
        </div>

        {/* Dimensions */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Dimensions ({dimensions.length})</label>
            <button
              type="button"
              onClick={handleAddDimension}
              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200"
            >
              + Add
            </button>
          </div>
          {dimensions.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No dimensions defined</p>
          ) : (
            <div className="space-y-2">
              {dimensions.map((dim, i) => (
                <div
                  key={i}
                  className="flex gap-2 items-start bg-gray-50 border border-gray-200 rounded p-2"
                >
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={dim.name}
                      onChange={(e) => handleDimensionChange(i, 'name', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                      placeholder="Name"
                    />
                    <input
                      type="text"
                      value={dim.expr}
                      onChange={(e) => handleDimensionChange(i, 'expr', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 font-mono"
                      placeholder="Expression"
                    />
                    <input
                      type="text"
                      value={dim.comment || ''}
                      onChange={(e) => handleDimensionChange(i, 'comment', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                      placeholder="Comment (optional)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDimension(i)}
                    className="p-1 text-red-500 hover:text-red-700 mt-1"
                    title="Remove dimension"
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
            </div>
          )}
        </div>

        {/* Measures */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Measures ({measures.length})</label>
            <button
              type="button"
              onClick={handleAddMeasure}
              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200"
            >
              + Add
            </button>
          </div>
          {measures.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No measures defined</p>
          ) : (
            <div className="space-y-2">
              {measures.map((meas, i) => (
                <div
                  key={i}
                  className="flex gap-2 items-start bg-gray-50 border border-gray-200 rounded p-2"
                >
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      value={meas.name}
                      onChange={(e) => handleMeasureChange(i, 'name', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                      placeholder="Name"
                    />
                    <input
                      type="text"
                      value={meas.expr}
                      onChange={(e) => handleMeasureChange(i, 'expr', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 font-mono"
                      placeholder="Expression (e.g., SUM(amount))"
                    />
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="text"
                        value={meas.filter || ''}
                        onChange={(e) => handleMeasureChange(i, 'filter', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                        placeholder="Filter (optional)"
                      />
                      <input
                        type="text"
                        value={meas.comment || ''}
                        onChange={(e) => handleMeasureChange(i, 'comment', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                        placeholder="Comment (optional)"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMeasure(i)}
                    className="p-1 text-red-500 hover:text-red-700 mt-1"
                    title="Remove measure"
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
            </div>
          )}
        </div>

        {/* Joins */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={labelClass}>Joins ({joins.length})</label>
            <button
              type="button"
              onClick={handleAddJoin}
              className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200"
            >
              + Add
            </button>
          </div>
          {joins.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No joins defined</p>
          ) : (
            <div className="space-y-2">
              {joins.map((join, i) => (
                <div
                  key={i}
                  className="flex gap-2 items-start bg-gray-50 border border-gray-200 rounded p-2"
                >
                  <div className="flex-1 space-y-1">
                    <div className="grid grid-cols-3 gap-1">
                      <select
                        value={join.type || 'inner'}
                        onChange={(e) => handleJoinChange(i, 'type', e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="inner">INNER</option>
                        <option value="left">LEFT</option>
                        <option value="right">RIGHT</option>
                        <option value="full">FULL</option>
                      </select>
                      <input
                        type="text"
                        value={join.table}
                        onChange={(e) => handleJoinChange(i, 'table', e.target.value)}
                        className="col-span-2 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                        placeholder="Table name"
                      />
                    </div>
                    <input
                      type="text"
                      value={join.on}
                      onChange={(e) => handleJoinChange(i, 'on', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 font-mono"
                      placeholder="ON expression"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveJoin(i)}
                    className="p-1 text-red-500 hover:text-red-700 mt-1"
                    title="Remove join"
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
            </div>
          )}
        </div>

        {/* Materialization (only for materialized views) */}
        {viewType === 'materialized' && (
          <div className="border border-purple-200 rounded-lg p-3 bg-purple-50">
            <label className="block text-sm font-medium text-purple-800 mb-2">
              Materialization Settings
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label htmlFor="mv-ed-mat-schedule" className="block text-xs text-gray-600 mb-1">
                  Schedule
                </label>
                <input
                  id="mv-ed-mat-schedule"
                  type="text"
                  value={matSchedule}
                  onChange={(e) => setMatSchedule(e.target.value)}
                  className={inputClass}
                  placeholder="e.g., 0 */6 * * *"
                />
              </div>
              <div>
                <label htmlFor="mv-ed-mat-mode" className="block text-xs text-gray-600 mb-1">
                  Mode
                </label>
                <input
                  id="mv-ed-mat-mode"
                  type="text"
                  value={matMode}
                  onChange={(e) => setMatMode(e.target.value)}
                  className={inputClass}
                  placeholder="e.g., relaxed"
                />
              </div>
            </div>

            {/* Materialized view specs */}
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-gray-600">
                Materialized Views ({matViews.length})
              </label>
              <button
                type="button"
                onClick={handleAddMatView}
                className="px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-200 rounded hover:bg-purple-300"
              >
                + Add
              </button>
            </div>
            {matViews.length > 0 && (
              <div className="space-y-2">
                {matViews.map((mv, i) => (
                  <div
                    key={i}
                    className="flex gap-2 items-start bg-white border border-purple-200 rounded p-2"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="grid grid-cols-2 gap-1">
                        <input
                          type="text"
                          value={mv.name}
                          onChange={(e) => handleMatViewChange(i, 'name', e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                          placeholder="View name"
                        />
                        <select
                          value={mv.type}
                          onChange={(e) => handleMatViewChange(i, 'type', e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                        >
                          <option value="aggregated">Aggregated</option>
                          <option value="unaggregated">Unaggregated</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={mv.dimensions?.join(', ') || ''}
                        onChange={(e) => handleMatViewChange(i, 'dimensions', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                        placeholder="Dimensions (comma-separated)"
                      />
                      <input
                        type="text"
                        value={mv.measures?.join(', ') || ''}
                        onChange={(e) => handleMatViewChange(i, 'measures', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-purple-500"
                        placeholder="Measures (comma-separated)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMatView(i)}
                      className="p-1 text-red-500 hover:text-red-700 mt-1"
                      title="Remove"
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
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        <div>
          <label htmlFor="mv-ed-tags" className={labelClass}>
            Tags
          </label>
          <input
            id="mv-ed-tags"
            type="text"
            value={tagsInput}
            onChange={(e) => handleTagsInputChange(e.target.value)}
            className={inputClass}
            placeholder="e.g., sales, revenue (comma + space separated)"
          />
          {tags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          {metricView ? (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {isExporting ? 'Exporting...' : 'Export YAML'}
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              {metricView ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </DraggableModal>
  );
};
