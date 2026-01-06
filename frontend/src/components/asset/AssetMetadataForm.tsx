/**
 * Asset Metadata Form Component
 * Form for editing compute asset metadata
 */

import React from 'react';
import type { ComputeAsset, Owner } from '@/types/cads';

export interface AssetMetadataFormProps {
  asset: Partial<ComputeAsset>;
  onChange: (updates: Partial<ComputeAsset>) => void;
}

export const AssetMetadataForm: React.FC<AssetMetadataFormProps> = ({ asset, onChange }) => {
  const handleOwnerChange = (field: keyof Owner, value: string) => {
    const currentOwner = asset.owner || {};
    onChange({
      owner: {
        ...currentOwner,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Owner Information */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Owner Information</h3>
        <div className="space-y-2">
          <label htmlFor="owner-name" className="sr-only">Owner name</label>
          <input
            id="owner-name"
            type="text"
            value={asset.owner?.name || ''}
            onChange={(e) => handleOwnerChange('name', e.target.value)}
            placeholder="Owner name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label htmlFor="owner-email" className="sr-only">Owner email</label>
          <input
            id="owner-email"
            type="email"
            value={asset.owner?.email || ''}
            onChange={(e) => handleOwnerChange('email', e.target.value)}
            placeholder="Owner email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Engineering Team */}
      <div>
        <label htmlFor="engineering-team" className="block text-sm font-medium text-gray-700 mb-2">Engineering Team</label>
        <input
          id="engineering-team"
          type="text"
          value={asset.engineering_team || ''}
          onChange={(e) => onChange({ engineering_team: e.target.value })}
          placeholder="Engineering team name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Source Repository */}
      <div>
        <label htmlFor="source-repo" className="block text-sm font-medium text-gray-700 mb-2">Source Repository</label>
        <input
          id="source-repo"
          type="url"
          value={asset.source_repo || ''}
          onChange={(e) => onChange({ source_repo: e.target.value })}
          placeholder="https://github.com/org/repo"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Status */}
      <div>
        <label htmlFor="asset-status" className="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <select
          id="asset-status"
          value={asset.status || 'development'}
          onChange={(e) =>
            onChange({ status: e.target.value as 'development' | 'production' | 'deprecated' })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="development">Development</option>
          <option value="production">Production</option>
          <option value="deprecated">Deprecated</option>
        </select>
      </div>
    </div>
  );
};

