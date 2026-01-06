/**
 * Product Card Component
 * Displays a data product as a card object
 */

import React from 'react';
import type { DataProduct } from '@/types/odps';

export interface ProductCardProps {
  product: DataProduct;
  onClick?: () => void;
  selected?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, selected = false }) => {
  return (
    <div
      onClick={onClick}
      onDragStart={(e) => e.stopPropagation()} // Prevent card click from interfering with drag
      className={`
        bg-white border-2 rounded-lg p-4 shadow-sm cursor-pointer transition-all
        ${selected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
        {product.status && (
          <span
            className={`
              px-2 py-1 text-xs rounded capitalize
              ${
                product.status === 'published'
                  ? 'bg-green-100 text-green-800'
                  : product.status === 'deprecated'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
              }
            `}
          >
            {product.status}
          </span>
        )}
      </div>

      {product.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {typeof product.description === 'string' ? product.description : JSON.stringify(product.description)}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        {product.linked_tables && product.linked_tables.length > 0 && (
          <span>{product.linked_tables.length} linked table(s)</span>
        )}
        {product.team && <span>Team: {product.team}</span>}
      </div>

      {(product.input_ports && product.input_ports.length > 0) ||
        (product.output_ports && product.output_ports.length > 0) ? (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex gap-4 text-xs text-gray-500">
            {product.input_ports && product.input_ports.length > 0 && (
              <span>Inputs: {product.input_ports.length}</span>
            )}
            {product.output_ports && product.output_ports.length > 0 && (
              <span>Outputs: {product.output_ports.length}</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};


