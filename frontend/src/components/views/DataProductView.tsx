/**
 * Data Product View Component
 * ODPS product visualization
 */

import React, { useState } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { DataProductEditor } from '@/components/product/DataProductEditor';
import type { DataProduct } from '@/types/odps';

export interface DataProductViewProps {
  workspaceId: string;
  domainId: string;
}

export const DataProductView: React.FC<DataProductViewProps> = ({ domainId }) => {
  const { products, removeProduct } = useModelStore();
  const [selectedProduct, setSelectedProduct] = useState<DataProduct | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DataProduct | undefined>(undefined);

  const domainProducts = products.filter((p) => p.domain_id === domainId);

  const handleCardClick = (product: DataProduct) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleEdit = (product: DataProduct) => {
    setEditingProduct(product);
    setShowDetailModal(false);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingProduct(undefined);
    setShowEditor(true);
  };

  const handleDelete = (productId: string) => {
    if (confirm('Are you sure you want to delete this data product?')) {
      removeProduct(productId);
    }
  };

  return (
    <>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Data Products</h2>
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            + Create/Import Product
          </button>
        </div>

        {domainProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No data products in this domain</p>
            <button
              onClick={handleCreate}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Create/Import your first data product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {domainProducts.map((product) => (
              <div
                key={product.id}
                className="relative group"
              >
                <ProductCard product={product} onClick={() => handleCardClick(product)} />
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(product);
                      }}
                      className="p-1 bg-white rounded shadow text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(product.id);
                      }}
                      className="p-1 bg-white rounded shadow text-red-600 hover:text-red-800"
                      title="Delete"
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedProduct(null);
          }}
          onEdit={() => handleEdit(selectedProduct)}
        />
      )}

      {/* Editor Modal */}
      <DataProductEditor
        product={editingProduct}
        domainId={domainId}
        isOpen={showEditor}
        onClose={() => {
          setShowEditor(false);
          setEditingProduct(undefined);
        }}
      />
    </>
  );
};

