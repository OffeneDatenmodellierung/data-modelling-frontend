/**
 * Table Status Badge Component
 * Displays data level indicator badge
 */

import React from 'react';
import type { DataLevel } from '@/stores/modelStore';

export interface TableStatusBadgeProps {
  dataLevel: DataLevel;
  size?: 'sm' | 'md' | 'lg';
}

export const TableStatusBadge: React.FC<TableStatusBadgeProps> = ({ dataLevel, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const colorClasses = {
    operational: 'bg-blue-100 text-blue-800 border-blue-300',
    bronze: 'bg-amber-100 text-amber-800 border-amber-300',
    silver: 'bg-gray-100 text-gray-800 border-gray-300',
    gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded border
        ${sizeClasses[size]}
        ${colorClasses[dataLevel]}
      `}
      title={`Data Level: ${dataLevel}`}
    >
      {dataLevel.charAt(0).toUpperCase() + dataLevel.slice(1)}
    </span>
  );
};



