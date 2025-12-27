import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Cloud, MoreVertical, RefreshCw, Trash2, X } from 'lucide-react';
import { PageLoader } from '../../components/LoadingStates';
import ConfirmDialog from '../../components/ConfirmDialog';
import RequireProjectLinkModal from '../../components/RequireProjectLinkModal';
import { Modal } from '../../components/common';
import { SkillDependencies } from '../../components/SkillDependencies';
import { useSkills, Skill, SkillFormData } from './useSkills';
import { SkillColumn } from './SkillColumn';
import { SkillModal } from './SkillModal';
import { STATUS_CONFIG, SkillStatus } from './constants';

/**
 * StackTracker page - Track your technology journey
 */
function StackTracker() {
  const {
    skills,
    projects,
    loading,
    saving,
    hasPendingSync,
    groupedSkills,
    loadSkills,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleStatusChange,
    handleBulkStatusChange,
    handleBulkDelete,
    handleProjectLinked,
    getLinkedProjectNames,
    setSaving,
  } = useSkills();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<SkillStatus>('want_to_learn');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    skill: Skill | null;
  }>({ open: false, skill: null });

  // Require project link modal
  const [requireProjectModal, setRequireProjectModal] = useState<{
    open: boolean;
    skill: Skill | null;
  }>({ open: false, skill: null });

  // Dependencies modal
  const [showDependencies, setShowDependencies] = useState<Skill | null>(null);

  // Bulk selection
  const [selectedSkillIds, setSelectedSkillIds] = useState(new Set<string>());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // ESC key to exit bulk select mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && bulkSelectMode) {
        setBulkSelectMode(false);
        setSelectedSkillIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bulkSelectMode]);

  const openModal = (skill: Skill | null = null, status?: SkillStatus) => {
    setEditingSkill(skill);
    setDefaultStatus(status || skill?.status || 'want_to_learn');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSkill(null);
  };

  const onSubmit = async (data: SkillFormData) => {
    // Check mastered requirement
    if (data.status === 'mastered') {
      const linkedProjects = editingSkill?.linkedProjects || data.linkedProjects || [];
      const completedProjectIds = projects.filter(p => p.status === 'completed').map(p => p.id);
      const hasLinkedCompletedProject = linkedProjects.some(id => completedProjectIds.includes(id));

      if (!hasLinkedCompletedProject) {
        closeModal();
        setRequireProjectModal({
          open: true,
          skill: editingSkill ? { ...editingSkill, ...data } : ({ ...data, id: '' } as Skill)
        });
        toast('Please link a completed project first to mark as Mastered', { icon: '⚠️' });
        return;
      }
    }

    setSaving(true);
    try {
      if (editingSkill) {
        await handleUpdate(editingSkill.id, data);
        toast.success('Skill updated successfully');
      } else {
        await handleCreate(data);
        toast.success('Skill added successfully');
      }
      closeModal();
    } catch (error: any) {
      loadSkills();
      toast.error(error.message || 'Failed to save skill');
    } finally {
      setSaving(false);
    }
  };

  const onStatusChange = async (skill: Skill, newStatus: SkillStatus) => {
    try {
      await handleStatusChange(skill, newStatus);
    } catch (error: any) {
      if (error.message === 'NEEDS_PROJECT_LINK') {
        setRequireProjectModal({ open: true, skill });
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.skill) return;
    await handleDelete(deleteConfirm.skill);
    setDeleteConfirm({ open: false, skill: null });
  };

  const toggleSkillSelection = (skillId: string) => {
    setSelectedSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
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
          <h1 className="text-3xl font-bold mb-2 text-white">Stack Tracker</h1>
          <p className="text-light-500">Track your technology journey from interest to mastery</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sync status */}
          {hasPendingSync && (
            <div className="flex items-center gap-2 text-sm text-light-500 bg-dark-700 px-3 py-1.5 rounded">
              <Cloud className="w-4 h-4 animate-pulse text-accent-primary" />
              <span>Syncing...</span>
            </div>
          )}

          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Skill
          </button>

          {/* Bulk actions toggle */}
          {!bulkSelectMode ? (
            <div className="relative">
              <button
                onClick={() => setShowThreeDotMenu(!showThreeDotMenu)}
                className="p-2 hover:bg-dark-700 rounded transition-colors text-light-500 hover:text-white"
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showThreeDotMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowThreeDotMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-40 bg-dark-800 border border-dark-600 rounded-lg shadow-lg z-20">
                    <button
                      onClick={() => {
                        setBulkSelectMode(true);
                        setShowThreeDotMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-light-400 hover:bg-dark-700 hover:text-white transition-colors rounded-lg"
                    >
                      Select
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-light-500">
                {selectedSkillIds.size} of {skills.length} selected
              </span>

              {/* Change Status */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded transition-colors text-light-400 hover:text-white"
                  disabled={selectedSkillIds.size === 0}
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-sm">Change Status</span>
                </button>
                {showStatusMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-dark-800 border border-dark-600 rounded-lg shadow-lg z-20">
                      {(Object.entries(STATUS_CONFIG) as [SkillStatus, typeof STATUS_CONFIG[SkillStatus]][]).map(
                        ([value, { label }]) => (
                          <button
                            key={value}
                            onClick={async () => {
                              await handleBulkStatusChange(Array.from(selectedSkillIds), value);
                              setShowStatusMenu(false);
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm text-light-400 hover:bg-dark-700 hover:text-white transition-colors first:rounded-t-lg last:rounded-b-lg"
                          >
                            {label}
                          </button>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Bulk Delete */}
              <button
                onClick={async () => {
                  if (window.confirm(`Delete ${selectedSkillIds.size} skill(s)?`)) {
                    await handleBulkDelete(Array.from(selectedSkillIds));
                    setSelectedSkillIds(new Set());
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-red-600/10 hover:bg-red-600/20 rounded transition-colors text-red-400 hover:text-red-300"
                disabled={selectedSkillIds.size === 0}
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Delete</span>
              </button>

              {/* Exit bulk mode */}
              <button
                onClick={() => {
                  setBulkSelectMode(false);
                  setSelectedSkillIds(new Set());
                }}
                className="p-2 hover:bg-dark-700 rounded transition-colors text-light-500 hover:text-white"
                title="Exit selection mode"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(Object.keys(STATUS_CONFIG) as SkillStatus[]).map(status => (
          <SkillColumn
            key={status}
            status={status}
            skills={groupedSkills[status]}
            selectedSkillIds={selectedSkillIds}
            bulkSelectMode={bulkSelectMode}
            onEdit={openModal}
            onDelete={(skill) => setDeleteConfirm({ open: true, skill })}
            onStatusChange={onStatusChange}
            onShowDependencies={setShowDependencies}
            onToggleSelection={toggleSkillSelection}
            onAddSkill={(status) => openModal(null, status)}
            getLinkedProjectNames={getLinkedProjectNames}
          />
        ))}
      </div>

      {/* Skill Modal */}
      <SkillModal
        isOpen={showModal}
        onClose={closeModal}
        onSubmit={onSubmit}
        editingSkill={editingSkill}
        projects={projects}
        saving={saving}
        defaultStatus={defaultStatus}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, skill: null })}
        onConfirm={confirmDelete}
        title="Delete Skill"
        message={`Are you sure you want to delete "${deleteConfirm.skill?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Require Project Link Modal */}
      <RequireProjectLinkModal
        isOpen={requireProjectModal.open}
        onClose={() => setRequireProjectModal({ open: false, skill: null })}
        skill={requireProjectModal.skill}
        onLinked={(linkedProjects: string[]) => {
          if (requireProjectModal.skill?.id) {
            handleProjectLinked(requireProjectModal.skill.id, linkedProjects);
          }
        }}
      />

      {/* Dependencies Modal */}
      <Modal
        isOpen={!!showDependencies}
        onClose={() => setShowDependencies(null)}
        title={`Dependencies: ${showDependencies?.name || ''}`}
        size="lg"
      >
        {showDependencies && (
          <SkillDependencies
            skillId={showDependencies.id}
            skillName={showDependencies.name}
            onUpdate={() => loadSkills()}
          />
        )}
      </Modal>
    </div>
  );
}

export default StackTracker;
