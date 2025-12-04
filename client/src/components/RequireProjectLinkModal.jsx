import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Link as LinkIcon, Check, AlertCircle, FolderKanban, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

function RequireProjectLinkModal({ isOpen, onClose, skill, onLinked }) {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && skill) {
      loadProjects();
    }
  }, [isOpen, skill]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data.filter(p => p.status === 'completed'));
      // Pre-select already linked completed projects
      const completedIds = data.filter(p => p.status === 'completed').map(p => p.id);
      setSelectedProjects((skill.linkedProjects || []).filter(id => completedIds.includes(id)));
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const toggleProject = (projectId) => {
    setSelectedProjects(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleSave = async () => {
    if (selectedProjects.length === 0) {
      toast.error('Please select at least one completed project');
      return;
    }

    setSaving(true);
    try {
      // Ensure existing linkedProjects is an array
      const existingLinkedProjects = Array.isArray(skill.linkedProjects)
        ? skill.linkedProjects
        : (skill.linkedProjects ? Object.values(skill.linkedProjects) : []);
      
      // Get all current linked projects (both completed and non-completed)
      const allLinkedProjects = [...new Set([...existingLinkedProjects, ...selectedProjects])];
      
      // Update skill with linked projects and change status to mastered
      // Only send required fields to avoid Firestore Timestamp serialization issues
      await api.updateSkill(skill.id, {
        name: skill.name,
        category: skill.category,
        status: 'mastered',
        icon: skill.icon || '📚',
        linkedProjects: allLinkedProjects
      });
      
      // Also update each selected project to link back to this skill
      const allProjects = await api.getProjects();
      for (const projectId of selectedProjects) {
        const project = allProjects.find(p => p.id === projectId);
        if (project) {
          const existingLinkedSkills = project.linkedSkills || [];
          if (!existingLinkedSkills.includes(skill.id)) {
            await api.updateProject(projectId, {
              name: project.name,
              description: project.description || '',
              status: project.status,
              githubUrl: project.githubUrl || project.github_url || '',
              demoUrl: project.demoUrl || project.demo_url || '',
              techStack: project.techStack || project.tech_stack || '',
              linkedSkills: [...existingLinkedSkills, skill.id]
            });
          }
        }
      }
      
      toast.success(`${skill.name} marked as Mastered!`);
      onLinked(allLinkedProjects);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to link projects');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateProject = () => {
    onClose();
    navigate('/projects');
  };

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
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="font-semibold">Link a Project First</h2>
                <p className="text-xs text-gray-500">Required to mark as Mastered</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-dark-600 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Explanation */}
            <div className="p-3 bg-dark-700/50 rounded-lg mb-4">
              <p className="text-sm text-gray-300">
                To mark <span className="font-medium text-primary-400">{skill?.name}</span> as 
                <span className="text-success"> Mastered</span>, you need to link it to at least 
                one <span className="text-success">Completed</span> project that uses this skill.
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-6">
                <FolderKanban className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">No completed projects</p>
                <p className="text-sm text-gray-500 mb-4">
                  You need at least one completed project to demonstrate mastery of this skill.
                </p>
                <button
                  onClick={handleCreateProject}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xs font-medium text-success mb-2 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Completed Projects ({projects.length})
                </h3>
                <div className="space-y-2">
                  {projects.map(project => (
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
                        {(project.techStack || project.tech_stack) && (
                          <p className="text-xs text-gray-500 truncate">{project.techStack || project.tech_stack}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleCreateProject}
                  className="w-full mt-4 p-3 rounded-lg border border-dashed border-dark-500 text-gray-400 hover:border-primary-500/50 hover:text-primary-400 transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create New Project
                </button>
              </>
            )}
          </div>

          {/* Footer */}
          {projects.length > 0 && (
            <div className="flex gap-3 p-4 border-t border-dark-600">
              <button onClick={onClose} className="btn-secondary flex-1" disabled={saving}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selectedProjects.length === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Mark as Mastered
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default RequireProjectLinkModal;
