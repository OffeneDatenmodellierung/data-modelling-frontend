/**
 * Help Category Badge
 * Displays a styled category label
 */

import React from 'react';
import { HelpCategory, getCategoryLabel } from '@/types/help';

interface HelpCategoryBadgeProps {
  category: HelpCategory;
  size?: 'sm' | 'md';
  className?: string;
}

const categoryColors: Record<HelpCategory, string> = {
  [HelpCategory.GettingStarted]: 'bg-green-100 text-green-800',
  [HelpCategory.Git]: 'bg-orange-100 text-orange-800',
  [HelpCategory.Canvas]: 'bg-blue-100 text-blue-800',
  [HelpCategory.Tables]: 'bg-purple-100 text-purple-800',
  [HelpCategory.Relationships]: 'bg-pink-100 text-pink-800',
  [HelpCategory.Systems]: 'bg-indigo-100 text-indigo-800',
  [HelpCategory.DataProducts]: 'bg-cyan-100 text-cyan-800',
  [HelpCategory.Decisions]: 'bg-amber-100 text-amber-800',
  [HelpCategory.Knowledge]: 'bg-teal-100 text-teal-800',
  [HelpCategory.Sketch]: 'bg-rose-100 text-rose-800',
  [HelpCategory.KeyboardShortcuts]: 'bg-gray-100 text-gray-800',
  [HelpCategory.Advanced]: 'bg-slate-100 text-slate-800',
};

export const HelpCategoryBadge: React.FC<HelpCategoryBadgeProps> = ({
  category,
  size = 'sm',
  className = '',
}) => {
  const colorClass = categoryColors[category] || 'bg-gray-100 text-gray-800';
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colorClass} ${sizeClass} ${className}`}
    >
      {getCategoryLabel(category)}
    </span>
  );
};
