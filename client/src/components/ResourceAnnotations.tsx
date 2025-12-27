/**
 * ResourceAnnotations - Rich notes with markdown support
 * 
 * Features:
 * - Markdown editor and preview
 * - Highlights/quotes extraction
 * - Bookmarks within resource
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Edit3, 
  Eye, 
  Save, 
  X, 
  Quote, 
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  List,
  Link2,
  Code
} from 'lucide-react';

interface Highlight {
  id: string;
  text: string;
  note: string;
  createdAt: string;
}

interface ResourceAnnotationsProps {
  resourceId: string;
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
}

const HIGHLIGHTS_KEY = 'devOrbit_resource_highlights';

function loadHighlights(): Record<string, Highlight[]> {
  try {
    const stored = localStorage.getItem(HIGHLIGHTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveHighlights(highlights: Record<string, Highlight[]>): void {
  try {
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(highlights));
  } catch {}
}

export function ResourceAnnotations({ 
  resourceId, 
  initialNotes = '', 
  onNotesChange 
}: ResourceAnnotationsProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showHighlights, setShowHighlights] = useState(true);
  const [newHighlight, setNewHighlight] = useState({ text: '', note: '' });
  const [showAddHighlight, setShowAddHighlight] = useState(false);

  // Load highlights for this resource
  useEffect(() => {
    const allHighlights = loadHighlights();
    setHighlights(allHighlights[resourceId] || []);
  }, [resourceId]);

  // Save notes
  const handleSaveNotes = useCallback(() => {
    onNotesChange?.(notes);
    setIsEditing(false);
  }, [notes, onNotesChange]);

  // Add highlight
  const addHighlight = useCallback(() => {
    if (!newHighlight.text.trim()) return;

    const highlight: Highlight = {
      id: `hl_${Date.now()}`,
      text: newHighlight.text.trim(),
      note: newHighlight.note.trim(),
      createdAt: new Date().toISOString()
    };

    const allHighlights = loadHighlights();
    allHighlights[resourceId] = [...(allHighlights[resourceId] || []), highlight];
    saveHighlights(allHighlights);
    
    setHighlights(prev => [...prev, highlight]);
    setNewHighlight({ text: '', note: '' });
    setShowAddHighlight(false);
  }, [resourceId, newHighlight]);

  // Delete highlight
  const deleteHighlight = useCallback((highlightId: string) => {
    const allHighlights = loadHighlights();
    allHighlights[resourceId] = (allHighlights[resourceId] || []).filter(h => h.id !== highlightId);
    saveHighlights(allHighlights);
    
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
  }, [resourceId]);

  // Insert markdown formatting
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = document.getElementById('notes-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = notes.substring(start, end);
    const newText = notes.substring(0, start) + prefix + selectedText + suffix + notes.substring(end);
    
    setNotes(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  // Simple markdown to HTML (basic support)
  const renderMarkdown = (text: string): string => {
    return text
      // Headers
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-white mt-4 mb-2">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-4 mb-2">$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-dark-600 rounded text-accent-primary text-sm">$1</code>')
      // Lists
      .replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4">$1</li>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-accent-primary hover:underline">$1</a>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mt-2">')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="space-y-4">
      {/* Notes Section */}
      <div className="bg-dark-700/50 border border-dark-600 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600">
          <span className="text-sm font-medium text-light-300">Notes</span>
          <div className="flex items-center gap-1">
            {isEditing && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`p-1.5 rounded transition-colors ${
                  showPreview ? 'bg-dark-600 text-accent-primary' : 'hover:bg-dark-600 text-light-500'
                }`}
                title={showPreview ? 'Edit' : 'Preview'}
              >
                {showPreview ? <Edit3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveNotes}
                  className="p-1.5 hover:bg-dark-600 rounded transition-colors text-green-400"
                  title="Save"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setIsEditing(false); setNotes(initialNotes); }}
                  className="p-1.5 hover:bg-dark-600 rounded transition-colors text-light-500"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 hover:bg-dark-600 rounded transition-colors text-light-500"
                title="Edit"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div>
            {/* Formatting Toolbar */}
            {!showPreview && (
              <div className="flex items-center gap-1 px-3 py-2 border-b border-dark-600 bg-dark-700">
                <button
                  onClick={() => insertFormatting('**')}
                  className="p-1.5 hover:bg-dark-600 rounded transition-colors text-light-500"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('*')}
                  className="p-1.5 hover:bg-dark-600 rounded transition-colors text-light-500"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('`')}
                  className="p-1.5 hover:bg-dark-600 rounded transition-colors text-light-500"
                  title="Code"
                >
                  <Code className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('\n- ', '')}
                  className="p-1.5 hover:bg-dark-600 rounded transition-colors text-light-500"
                  title="List"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('[', '](url)')}
                  className="p-1.5 hover:bg-dark-600 rounded transition-colors text-light-500"
                  title="Link"
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {showPreview ? (
              <div 
                className="p-4 prose prose-invert max-w-none text-sm text-light-300"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(notes) || '<p class="text-light-500">Nothing to preview</p>' }}
              />
            ) : (
              <textarea
                id="notes-editor"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this resource... Supports **markdown** formatting!"
                className="w-full min-h-[150px] p-4 bg-transparent text-light-300 placeholder:text-light-500 text-sm focus:outline-none resize-y font-mono"
              />
            )}
          </div>
        ) : (
          <div className="p-4">
            {notes ? (
              <div 
                className="prose prose-invert max-w-none text-sm text-light-300"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(notes) }}
              />
            ) : (
              <p className="text-sm text-light-500 italic">
                No notes yet. Click edit to add notes with markdown support.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Highlights Section */}
      <div className="bg-dark-700/50 border border-dark-600 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowHighlights(!showHighlights)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-dark-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Quote className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-light-300">Highlights & Quotes</span>
            {highlights.length > 0 && (
              <span className="px-1.5 py-0.5 bg-dark-600 rounded text-xs text-light-500">
                {highlights.length}
              </span>
            )}
          </div>
          {showHighlights ? (
            <ChevronUp className="w-4 h-4 text-light-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-light-500" />
          )}
        </button>

        {showHighlights && (
          <div className="border-t border-dark-600">
            {/* Highlights List */}
            {highlights.length > 0 ? (
              <div className="divide-y divide-dark-600">
                {highlights.map(highlight => (
                  <div key={highlight.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-1 h-full bg-yellow-500 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <blockquote className="text-sm text-light-300 italic border-l-2 border-yellow-500/50 pl-3">
                          "{highlight.text}"
                        </blockquote>
                        {highlight.note && (
                          <p className="text-xs text-light-500 mt-2">
                            Note: {highlight.note}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-light-500">
                            {new Date(highlight.createdAt).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => deleteHighlight(highlight.id)}
                            className="p-1 hover:bg-dark-600 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-light-500">No highlights yet</p>
              </div>
            )}

            {/* Add Highlight Form */}
            {showAddHighlight ? (
              <div className="p-4 border-t border-dark-600 space-y-3">
                <textarea
                  value={newHighlight.text}
                  onChange={(e) => setNewHighlight(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Paste or type the quote/highlight..."
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded text-sm text-light-300 placeholder:text-light-500 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary resize-none"
                  rows={2}
                />
                <input
                  type="text"
                  value={newHighlight.note}
                  onChange={(e) => setNewHighlight(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Add a note (optional)"
                  className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded text-sm text-light-300 placeholder:text-light-500 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => { setShowAddHighlight(false); setNewHighlight({ text: '', note: '' }); }}
                    className="px-3 py-1.5 text-sm text-light-500 hover:text-light-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addHighlight}
                    className="px-3 py-1.5 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm rounded transition-colors"
                  >
                    Add Highlight
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddHighlight(true)}
                className="w-full flex items-center justify-center gap-2 py-3 border-t border-dark-600 text-sm text-accent-primary hover:bg-dark-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Highlight
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ResourceAnnotations;
