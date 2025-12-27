import { useState } from 'react';
import { Plus, Cloud } from 'lucide-react';
import { PageLoader } from '../../components/LoadingStates';
import ConfirmDialog from '../../components/ConfirmDialog';
import Pagination from '../../components/Pagination';
import { useProjects, Project, Skill } from './useProjects';
import { ProjectColumn } from './ProjectColumn';
import { ProjectModal } from './ProjectModal';
import { STATUS_CONFIG, ProjectStatus } from './constants';

/**
 * Projects page - Kanban-style project management
 */
function Projects() {
  const {
    loading,
    saving,
    hasPendingSync,
    currentPage,
    totalPages,
    usePagination,
    groupedProjects,
    handlePageChange,
    handleStatusChange,
    handleCreate,
    handleUpdate,
    handleDelete,
    getLinkedSkillsForProject,
  } = useProjects();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<ProjectStatus>('idea');

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    project: Project | null;
    linkedSkills: Skill[];
  }>({ open: false, project: null, linkedSkills: [] });

  const openModal = (project: Project | null = null, statusOverride?: ProjectStatus) => {
    setEditingProject(project);
    setDefaultStatus(statusOverride || 'idea');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProject(null);
  };

  const confirmDelete = (project: Project) => {
    const linkedSkills = getLinkedSkillsForProject(project);
    setDeleteConfirm({ open: true, project, linkedSkills });
  };

  const onConfirmDelete = async () => {
    if (!deleteConfirm.project) return;
    await handleDelete(deleteConfirm.project, deleteConfirm.linkedSkills);
    setDeleteConfirm({ open: false, project: null, linkedSkills: [] });
  };

  const handleSubmit = async (data: Parameters<typeof handleCreate>[0]) => {
    if (editingProject) {
      return handleUpdate(editingProject.id, data);
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-white">Projects</h1>
          <p className="text-light-500">From idea to deployment - track your builds</p>
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
            New Project
          </button>
        </div>
      </div>

      {/* Kanban-style columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(Object.keys(STATUS_CONFIG) as ProjectStatus[]).map(status => (
          <ProjectColumn
            key={status}
            status={status}
            projects={groupedProjects[status] || []}
            saving={saving}
            onEdit={(project) => openModal(project)}
            onDelete={confirmDelete}
            onStatusChange={handleStatusChange}
            onAddNew={(s) => openModal(null, s)}
          />
        ))}
      </div>

      {/* Modal */}
      <ProjectModal
        isOpen={showModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        editingProject={editingProject}
        defaultStatus={defaultStatus}
        saving={saving}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, project: null, linkedSkills: [] })}
        onConfirm={onConfirmDelete}
        title="Delete Project"
        message={
          deleteConfirm.linkedSkills?.length > 0
            ? `Are you sure you want to delete "${deleteConfirm.project?.name}"? This will also unlink ${deleteConfirm.linkedSkills.length} skill${deleteConfirm.linkedSkills.length > 1 ? 's' : ''} (${deleteConfirm.linkedSkills.map(s => s.name).join(', ')}) from this project and move them to "Learning" stage. This action cannot be undone.`
            : `Are you sure you want to delete "${deleteConfirm.project?.name}"? This action cannot be undone.`
        }
        confirmText="Delete"
        variant="danger"
      />

      {/* Pagination */}
      {usePagination && totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

export default Projects;
