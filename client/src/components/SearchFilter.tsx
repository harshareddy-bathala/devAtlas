import { Search, X, Filter, SortAsc, SortDesc } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useDebounce } from '../hooks';
import type { Tag } from '../types';
import { TagChips } from './TagSelect';

interface SearchFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  sortOptions?: { value: string; label: string }[];
  onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
  filterTags?: Tag[];
  selectedTagIds?: string[];
  onTagFilterChange?: (tagIds: string[]) => void;
  className?: string;
}

export default function SearchFilter({
  searchValue,
  onSearchChange,
  placeholder = 'Search...',
  sortField,
  sortDirection = 'desc',
  sortOptions = [],
  onSortChange,
  filterTags = [],
  selectedTagIds = [],
  onTagFilterChange,
  className = '',
}: SearchFilterProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(localSearch, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Update parent when debounced value changes
  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close filters on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleSort = () => {
    if (sortField && onSortChange) {
      onSortChange(sortField, sortDirection === 'asc' ? 'desc' : 'asc');
    }
  };

  const handleTagToggle = (tagId: string) => {
    if (!onTagFilterChange) return;
    if (selectedTagIds.includes(tagId)) {
      onTagFilterChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onTagFilterChange([...selectedTagIds, tagId]);
    }
  };

  const hasActiveFilters = selectedTagIds.length > 0;

  return (
    <div className={`flex flex-col sm:flex-row gap-3 ${className}`}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={localSearch}
          onChange={e => setLocalSearch(e.target.value)}
          placeholder={placeholder}
          className="input-field pl-10 pr-10"
        />
        {localSearch && (
          <button
            onClick={() => {
              setLocalSearch('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-dark-600 rounded"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hidden sm:block">
          {!localSearch && '/'}
        </span>
      </div>

      {/* Sort and Filter */}
      <div className="flex gap-2">
        {/* Sort Button */}
        {sortOptions.length > 0 && onSortChange && (
          <div className="relative">
            <select
              value={sortField}
              onChange={e => onSortChange(e.target.value, sortDirection)}
              className="input-field appearance-none pr-10 min-w-[140px]"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={toggleSort}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-dark-600 rounded"
              title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
            >
              {sortDirection === 'asc' ? (
                <SortAsc className="w-4 h-4 text-gray-400" />
              ) : (
                <SortDesc className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        )}

        {/* Filter Button */}
        {filterTags.length > 0 && onTagFilterChange && (
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center gap-2 ${
                hasActiveFilters ? 'border-accent-blue' : ''
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
              {hasActiveFilters && (
                <span className="w-5 h-5 bg-accent-blue text-white text-xs rounded-full flex items-center justify-center">
                  {selectedTagIds.length}
                </span>
              )}
            </button>

            {/* Filter Dropdown */}
            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-dark-700 border border-dark-500 rounded-lg shadow-xl z-20">
                <div className="p-3 border-b border-dark-500">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filter by tags</h4>
                    {hasActiveFilters && (
                      <button
                        onClick={() => onTagFilterChange([])}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-2 max-h-60 overflow-y-auto">
                  {filterTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                        selectedTagIds.includes(tag.id)
                          ? 'bg-accent-blue/20'
                          : 'hover:bg-dark-600'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-left">{tag.name}</span>
                      {selectedTagIds.includes(tag.id) && (
                        <span className="text-accent-blue">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="w-full sm:hidden">
          <TagChips
            tags={filterTags.filter(t => selectedTagIds.includes(t.id))}
            maxVisible={5}
          />
        </div>
      )}
    </div>
  );
}
