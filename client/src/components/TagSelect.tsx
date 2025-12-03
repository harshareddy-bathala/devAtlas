import { useState, useMemo } from 'react';
import { X, Plus, Check } from 'lucide-react';
import type { Tag } from '../types';
import { cn } from '../lib/utils';

interface TagSelectProps {
  tags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onCreateTag?: (name: string) => Promise<Tag>;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export default function TagSelect({
  tags,
  selectedTagIds,
  onChange,
  onCreateTag,
  placeholder = 'Add tags...',
  maxTags = 10,
  className,
}: TagSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const selectedTags = useMemo(
    () => tags.filter(tag => selectedTagIds.includes(tag.id)),
    [tags, selectedTagIds]
  );

  const filteredTags = useMemo(
    () =>
      tags.filter(
        tag =>
          !selectedTagIds.includes(tag.id) &&
          tag.name.toLowerCase().includes(search.toLowerCase())
      ),
    [tags, selectedTagIds, search]
  );

  const canCreate =
    onCreateTag &&
    search.trim() &&
    !tags.some(tag => tag.name.toLowerCase() === search.toLowerCase().trim());

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else if (selectedTagIds.length < maxTags) {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!canCreate || !onCreateTag) return;

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(search.trim());
      onChange([...selectedTagIds, newTag.id]);
      setSearch('');
    } catch (error) {
      console.error('Failed to create tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* Selected tags */}
      <div
        className="input-field flex flex-wrap gap-1 min-h-[42px] cursor-text"
        onClick={() => setIsOpen(true)}
      >
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm"
            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
          >
            {tag.name}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                handleRemoveTag(tag.id);
              }}
              className="hover:opacity-70"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selectedTagIds.length < maxTags && (
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedTags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm"
          />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-dark-700 border border-dark-500 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {filteredTags.length > 0 ? (
              <ul>
                {filteredTags.map(tag => (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-dark-600 transition-colors"
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1">{tag.name}</span>
                      {selectedTagIds.includes(tag.id) && (
                        <Check className="w-4 h-4 text-accent-green" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : search && !canCreate ? (
              <p className="px-3 py-2 text-sm text-gray-400">No tags found</p>
            ) : null}

            {canCreate && (
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={isCreating}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-dark-600 transition-colors text-accent-blue border-t border-dark-500"
              >
                <Plus className="w-4 h-4" />
                <span>Create "{search}"</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Simple tag chip display component
interface TagChipsProps {
  tags: Tag[];
  size?: 'sm' | 'md';
  maxVisible?: number;
  className?: string;
}

export function TagChips({ tags, size = 'sm', maxVisible = 3, className }: TagChipsProps) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  };

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visibleTags.map(tag => (
        <span
          key={tag.id}
          className={cn('rounded-full', sizeClasses[size])}
          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
        >
          {tag.name}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className={cn('rounded-full bg-dark-600 text-gray-400', sizeClasses[size])}>
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
