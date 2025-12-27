import { useState } from 'react';
import { Plus, Cloud, LayoutGrid, List, BookOpen } from 'lucide-react';
import { PageLoader } from '../../components/LoadingStates';
import ConfirmDialog from '../../components/ConfirmDialog';
import { VirtualList } from '../../components/common';
import { ResourceAnnotations } from '../../components/ResourceAnnotations';
import { useResources, Resource, ResourceFormData } from './useResources';
import { ResourceCard } from './ResourceCard';
import { ResourceListItem } from './ResourceListItem';
import { ResourceModal } from './ResourceModal';
import { TYPE_CONFIG } from './constants';

/**
 * Resources page - Manage learning resources
 */
function Resources() {
  const {
    skills,
    projects,
    loading,
    saving,
    hasPendingSync,
    filter,
    viewMode,
    filteredResources,
    setFilter,
    setViewMode,
    handleCreate,
    handleUpdate,
    handleDelete,
    getDomain,
  } = useResources();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    resource: Resource | null;
  }>({ open: false, resource: null });

  // Annotation state
  const [annotatingResourceId, setAnnotatingResourceId] = useState<string | null>(null);

  const openModal = (resource: Resource | null = null) => {
    setEditingResource(resource);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingResource(null);
  };

  const confirmDelete = (resource: Resource) => {
    setDeleteConfirm({ open: true, resource });
  };

  const onConfirmDelete = async () => {
    if (!deleteConfirm.resource) return;
    await handleDelete(deleteConfirm.resource);
    setDeleteConfirm({ open: false, resource: null });
  };

  const handleSubmit = async (data: ResourceFormData) => {
    if (editingResource) {
      return handleUpdate(editingResource.id, data);
    }
    return handleCreate(data);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">Resources</h1>
          <p className="text-light-500">Curate your learning materials</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sync status indicator */}
          {hasPendingSync && (
            <div className="flex items-center gap-2 text-sm text-light-500 bg-dark-700 px-3 py-1.5 rounded">
              <Cloud className="w-4 h-4 animate-pulse text-accent-primary" />
              <span>Syncing...</span>
            </div>
          )}
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Resource
          </button>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex items-center justify-between bg-dark-800 border border-dark-600 rounded p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-light-500">Filter:</span>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="input-field py-1.5 text-sm"
          >
            <option value="all">All Types</option>
            {Object.entries(TYPE_CONFIG).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'grid' 
                ? 'bg-accent-primary text-white' 
                : 'text-light-400 hover:bg-dark-600'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded transition-colors ${
              viewMode === 'list' 
                ? 'bg-accent-primary text-white' 
                : 'text-light-400 hover:bg-dark-600'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Resources Grid/List */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-16 bg-dark-800 border border-dark-600 rounded">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-light-500 opacity-50" />
          <h3 className="text-lg font-medium text-white mb-2">No resources yet</h3>
          <p className="text-light-500 mb-4">Start building your knowledge library</p>
          <button onClick={() => openModal()} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Resource
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map(resource => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onEdit={openModal}
              onDelete={confirmDelete}
              onAnnotate={(r) => setAnnotatingResourceId(r.id)}
              getDomain={getDomain}
            />
          ))}
        </div>
      ) : (
        <div className="bg-dark-800 border border-dark-600 rounded divide-y divide-dark-600">
          {filteredResources.length > 50 ? (
            <VirtualList
              items={filteredResources}
              itemHeight={120}
              overscan={5}
              renderItem={(resource) => (
                <ResourceListItem
                  resource={resource}
                  onEdit={openModal}
                  onDelete={confirmDelete}
                  onAnnotate={(r) => setAnnotatingResourceId(r.id)}
                  getDomain={getDomain}
                />
              )}
              keyExtractor={(resource) => resource.id}
            />
          ) : (
            filteredResources.map(resource => (
              <ResourceListItem
                key={resource.id}
                resource={resource}
                onEdit={openModal}
                onDelete={confirmDelete}
                onAnnotate={(r) => setAnnotatingResourceId(r.id)}
                getDomain={getDomain}
              />
            ))
          )}
        </div>
      )}

      {/* Modal */}
      <ResourceModal
        isOpen={showModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        editingResource={editingResource}
        skills={skills}
        projects={projects}
        saving={saving}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, resource: null })}
        onConfirm={onConfirmDelete}
        title="Delete Resource"
        message={`Are you sure you want to delete "${deleteConfirm.resource?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Annotations Panel */}
      {annotatingResourceId && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setAnnotatingResourceId(null)}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-dark-800 shadow-xl overflow-y-auto">
            <div className="p-4 border-b border-dark-600 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">Annotations</h3>
              <button 
                onClick={() => setAnnotatingResourceId(null)}
                className="text-light-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <ResourceAnnotations resourceId={annotatingResourceId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Resources;
