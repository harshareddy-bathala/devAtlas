/**
 * BulkActions - Bulk action toolbar for multi-select operations
 * 
 * Features:
 * - Multi-select with checkboxes
 * - Bulk status change
 * - Bulk delete with confirmation
 * - Select all functionality
 */

import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  RefreshCw, 
  X,
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import { Modal } from './common';
import toast from 'react-hot-toast';

interface BulkActionsProps<T> {
  items: T[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onBulkStatusChange: (ids: string[], status: string) => Promise<void>;
  onBulkDelete: (ids: string[]) => Promise<void>;
  statusOptions: { value: string; label: string }[];
  itemLabel: string; // e.g., "skill", "project"
  hideSelectAll?: boolean;
  onExitBulkMode?: () => void;
}

export function BulkActions<T extends { id: string }>({
  items,
  selectedIds,
  onSelectionChange,
  onBulkStatusChange,
  onBulkDelete,
  statusOptions,
  itemLabel,
  hideSelectAll = false,
  onExitBulkMode
}: BulkActionsProps<T>) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const selectedCount = selectedIds.size;
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  // Toggle select all
  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(items.map(item => item.id)));
    }
  };

  // Clear selection
  const clearSelection = () => {
    onSelectionChange(new Set());
  };

  // Handle bulk status change
  const handleStatusChange = async (status: string) => {
    if (selectedCount === 0) return;
    
    setProcessing(true);
    setShowStatusMenu(false);
    
    try {
      await onBulkStatusChange(Array.from(selectedIds), status);
      toast.success(`Updated ${selectedCount} ${itemLabel}${selectedCount > 1 ? 's' : ''}`);
      clearSelection();
    } catch (error) {
      toast.error(`Failed to update ${itemLabel}s`);
    } finally {
      setProcessing(false);
    }
  };

  // Handle bulk delete
  const handleDelete = async () => {
    if (selectedCount === 0) return;
    
    setProcessing(true);
    setShowDeleteConfirm(false);
    
    try {
      await onBulkDelete(Array.from(selectedIds));
      toast.success(`Deleted ${selectedCount} ${itemLabel}${selectedCount > 1 ? 's' : ''}`);
      clearSelection();
    } catch (error) {
      toast.error(`Failed to delete ${itemLabel}s`);
    } finally {
      setProcessing(false);
    }
  };

  // Don't show if no items
  if (items.length === 0) return null;

  return (
    <>
      {/* Bulk Actions Bar */}
      <div 
        className={`
          flex items-center gap-4 px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg
          transition-all duration-200
          ${selectedCount > 0 ? 'bg-accent-primary/5 border-accent-primary/30' : ''}
        `}
      >
        {/* Select All Checkbox */}
        {!hideSelectAll && (
          <>
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-light-400 hover:text-white transition-colors"
            >
              {allSelected ? (
                <CheckSquare className="w-5 h-5 text-accent-primary" />
              ) : someSelected ? (
                <div className="w-5 h-5 border-2 border-accent-primary bg-accent-primary/30 rounded flex items-center justify-center">
                  <div className="w-2 h-0.5 bg-accent-primary" />
                </div>
              ) : (
                <Square className="w-5 h-5" />
              )}
              <span>Select All</span>
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-dark-600" />
          </>
        )}

        {/* Selection Count */}
        <span className="text-sm text-light-500">
          {selectedCount} of {items.length} selected
        </span>

        {/* Actions - Only show when items are selected */}
        {selectedCount > 0 && (
          <>
            <div className="h-6 w-px bg-dark-600" />
            
            {/* Status Change Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                disabled={processing}
                className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 border border-dark-600 rounded text-sm text-light-300 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
                Change Status
                <ChevronDown className="w-4 h-4" />
              </button>

              {showStatusMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowStatusMenu(false)} 
                  />
                  <div className="absolute top-full left-0 mt-1 py-1 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-20 min-w-[160px]">
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleStatusChange(option.value)}
                        className="w-full px-3 py-2 text-left text-sm text-light-300 hover:bg-dark-700 transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Delete Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={processing}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 border border-red-500/30 rounded text-sm text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>

            {/* Clear Selection */}
            <button
              onClick={() => {
                clearSelection();
                onExitBulkMode?.();
              }}
              className="p-1.5 hover:bg-dark-600 rounded transition-colors ml-auto"
              title="Clear selection and exit"
            >
              <X className="w-4 h-4 text-light-500" />
            </button>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteConfirm(false)}
          title="Confirm Delete"
          size="sm"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-light-300">
                  Are you sure you want to delete {selectedCount} {itemLabel}
                  {selectedCount > 1 ? 's' : ''}?
                </p>
                <p className="text-sm text-light-500 mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-dark-600">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-light-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={processing}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-medium rounded transition-colors"
              >
                {processing ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// Selection checkbox for individual items
interface SelectionCheckboxProps {
  id: string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export function SelectionCheckbox({ id, selectedIds, onSelectionChange }: SelectionCheckboxProps) {
  const isSelected = selectedIds.has(id);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelection = new Set(selectedIds);
    if (isSelected) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  };

  return (
    <button
      onClick={toggle}
      className="p-1 rounded hover:bg-dark-600 transition-colors"
    >
      {isSelected ? (
        <CheckSquare className="w-5 h-5 text-accent-primary" />
      ) : (
        <Square className="w-5 h-5 text-light-500 hover:text-light-300" />
      )}
    </button>
  );
}

// Hook for managing bulk selection
export function useBulkSelection<T extends { id: string }>() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (items: T[]) => {
    setSelectedIds(new Set(items.map(item => item.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const isSelected = (id: string) => selectedIds.has(id);

  return {
    selectedIds,
    setSelectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount: selectedIds.size
  };
}

export default BulkActions;
