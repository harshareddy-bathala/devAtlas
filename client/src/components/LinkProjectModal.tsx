import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Link as LinkIcon, Check, FolderKanban, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

interface Project {
  id: string;
  name: string;
  status: string;
  tech_stack?: string;
  linkedSkills?: string[];
}

interface Skill {
  id: string;
  name: string;
  linkedProjects?: string[];
}

interface LinkProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill: Skill | null;
  onLinked: (projectIds: string[]) => void;
}

function LinkProjectModal({ isOpen, onClose, skill, onLinked }: LinkProjectModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && skill) {
      loadProjects();
    }
  }, [isOpen, skill]);

  const loadProjects = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
      // Pre-select already linked projects
      setSelectedProjects(skill?.linkedProjects || []);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectId: string): void => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSave = async (): Promise<void> => {
    if (!skill) return;
    
    setSaving(true);
    try {
      // Update skill with linked projects
      await api.updateSkill(skill.id, {
        ...skill,
        linkedProjects: selectedProjects
      });
      
      // Also update each selected project to link back to this skill
      for (const projectId of selectedProjects) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
          const existingLinkedSkills = project.linkedSkills || [];
          if (!existingLinkedSkills.includes(skill.id)) {
            await api.updateProject(projectId, {
              ...project,
              linkedSkills: [...existingLinkedSkills, skill.id]
            });
          }
        }
      }
      
      toast.success('Projects linked successfully');
      onLinked(selectedProjects);
      onClose();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Failed to link projects');
    } finally {
      setSaving(false);
    }
  };

  const completedProjects = projects.filter(p => p.status === 'completed');
  const otherProjects = projects.filter(p => p.status !== 'completed');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-md m-4 max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <LinkIcon className="w-4 h-4 text-primary-400" />
              </div>
              <div>
                <h2 className="font-semibold">Link Projects</h2>
                <p className="text-xs text-gray-500">
                  {skill?.name} - Select projects using this skill
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-dark-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-4">No projects yet</p>
                <p className="text-sm text-gray-500">
                  Create a project first to link it with skills
                </p>
              </div>
            ) : (
              <>
                {/* Info about mastered requirement */}
                <div className="p-3 bg-primary-500/10 rounded-lg mb-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-300">
                    To mark this skill as <span className="text-success">Mastered</span>, 
                    link at least one <span className="text-success">Completed</span> project.
                  </p>
                </div>

                {/* Completed Projects */}
                {completedProjects.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-xs font-medium text-success mb-2 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Completed Projects
                    </h3>
                    <div className="space-y-2">
                      {completedProjects.map(project => (
                        <button
                          key={project.id}
                          onClick={() => toggleProject(project.id)}
                          className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                            selectedProjects.includes(project.id)
                              ? 'bg-success/20 border border-success/30'
                              : 'bg-dark-700/50 hover:bg-dark-600/50 border border-transparent'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${
                            selectedProjects.includes(project.id)
                              ? 'bg-success text-white'
                              : 'border border-gray-600'
                          }`}>
                            {selectedProjects.includes(project.id) && <Check className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{project.name}</p>
                            {project.tech_stack && (
                              <p className="text-xs text-gray-500 truncate">{project.tech_stack}</p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Projects */}
                {otherProjects.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-gray-400 mb-2">
                      Other Projects
                    </h3>
                    <div className="space-y-2">
                      {otherProjects.map(project => (
                        <button
                          key={project.id}
                          onClick={() => toggleProject(project.id)}
                          className={`w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 ${
                            selectedProjects.includes(project.id)
                              ? 'bg-primary-500/20 border border-primary-500/30'
                              : 'bg-dark-700/50 hover:bg-dark-600/50 border border-transparent'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${
                            selectedProjects.includes(project.id)
                              ? 'bg-primary-500 text-white'
                              : 'border border-gray-600'
                          }`}>
                            {selectedProjects.includes(project.id) && <Check className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{project.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{project.status}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-4 border-t border-dark-600">
            <button onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  Link {selectedProjects.length > 0 ? `(${selectedProjects.length})` : ''}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default LinkProjectModal;
