/**
 * CustomCategoriesContext - Manage custom skill categories
 * 
 * Features:
 * - Add custom skill categories
 * - Edit/delete categories
 * - Persist to local storage (with future backend sync)
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  isCustom: boolean;
  createdAt: string;
}

interface CustomCategoriesContextValue {
  categories: CustomCategory[];
  addCategory: (name: string, color: string, icon: string) => CustomCategory;
  updateCategory: (id: string, updates: Partial<CustomCategory>) => void;
  deleteCategory: (id: string) => void;
  getAllCategories: () => CustomCategory[];
}

const CustomCategoriesContext = createContext<CustomCategoriesContextValue | null>(null);

const CATEGORIES_STORAGE_KEY = 'devOrbit_custom_categories';

// Default categories
const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'language', name: 'Language', color: '#F59E0B', icon: '📝', isCustom: false, createdAt: '' },
  { id: 'framework', name: 'Framework', color: '#3B82F6', icon: '🏗️', isCustom: false, createdAt: '' },
  { id: 'library', name: 'Library', color: '#8B5CF6', icon: '📚', isCustom: false, createdAt: '' },
  { id: 'tool', name: 'Tool', color: '#22C55E', icon: '🔧', isCustom: false, createdAt: '' },
  { id: 'database', name: 'Database', color: '#06B6D4', icon: '🗄️', isCustom: false, createdAt: '' },
  { id: 'runtime', name: 'Runtime', color: '#EC4899', icon: '⚡', isCustom: false, createdAt: '' },
  { id: 'other', name: 'Other', color: '#6B7280', icon: '📦', isCustom: false, createdAt: '' },
];

function loadCustomCategories(): CustomCategory[] {
  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomCategories(categories: CustomCategory[]): void {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch {}
}

export function CustomCategoriesProvider({ children }: { children: React.ReactNode }) {
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(loadCustomCategories());

  // Sync to storage on changes
  useEffect(() => {
    saveCustomCategories(customCategories);
  }, [customCategories]);

  // Add a new category
  const addCategory = useCallback((name: string, color: string, icon: string): CustomCategory => {
    const id = `custom_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    const category: CustomCategory = {
      id,
      name,
      color,
      icon,
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    setCustomCategories(prev => [...prev, category]);
    toast.success(`Category "${name}" created`);
    return category;
  }, []);

  // Update a category
  const updateCategory = useCallback((id: string, updates: Partial<CustomCategory>) => {
    setCustomCategories(prev => 
      prev.map(cat => cat.id === id ? { ...cat, ...updates } : cat)
    );
  }, []);

  // Delete a category
  const deleteCategory = useCallback((id: string) => {
    setCustomCategories(prev => {
      const category = prev.find(c => c.id === id);
      if (category) {
        toast.success(`Category "${category.name}" deleted`);
      }
      return prev.filter(c => c.id !== id);
    });
  }, []);

  // Get all categories (default + custom)
  const getAllCategories = useCallback((): CustomCategory[] => {
    return [...DEFAULT_CATEGORIES, ...customCategories];
  }, [customCategories]);

  const value: CustomCategoriesContextValue = {
    categories: customCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    getAllCategories
  };

  return (
    <CustomCategoriesContext.Provider value={value}>
      {children}
    </CustomCategoriesContext.Provider>
  );
}

export function useCustomCategories(): CustomCategoriesContextValue {
  const context = useContext(CustomCategoriesContext);
  if (!context) {
    throw new Error('useCustomCategories must be used within a CustomCategoriesProvider');
  }
  return context;
}

// Category Manager Component
interface CategoryManagerProps {
  onSelect?: (categoryId: string) => void;
  selectedCategory?: string;
}

export function CategoryManager({ onSelect, selectedCategory }: CategoryManagerProps) {
  const { getAllCategories, addCategory, deleteCategory } = useCustomCategories();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#8B5CF6');
  const [newIcon, setNewIcon] = useState('⭐');

  const categories = getAllCategories();

  const handleAdd = () => {
    if (!newName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    addCategory(newName.trim(), newColor, newIcon);
    setNewName('');
    setShowAddForm(false);
  };

  const ICON_OPTIONS = ['⭐', '🎯', '🔥', '💡', '🚀', '🎨', '🔐', '☁️', '📱', '🌐', '🤖', '📊'];
  const COLOR_OPTIONS = [
    '#F59E0B', '#3B82F6', '#8B5CF6', '#22C55E', 
    '#06B6D4', '#EC4899', '#EF4444', '#6B7280'
  ];

  return (
    <div className="space-y-3">
      {/* Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => onSelect?.(category.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
              selectedCategory === category.id
                ? 'border-accent-primary bg-accent-primary/10'
                : 'border-dark-600 bg-dark-700 hover:border-dark-500'
            }`}
          >
            <span 
              className="w-6 h-6 rounded flex items-center justify-center text-sm"
              style={{ backgroundColor: `${category.color}20` }}
            >
              {category.icon}
            </span>
            <span className="text-sm text-light-300 flex-1 text-left truncate">
              {category.name}
            </span>
            {category.isCustom && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteCategory(category.id);
                }}
                className="p-1 hover:bg-dark-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-xs text-red-400">×</span>
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Add New Category */}
      {showAddForm ? (
        <div className="p-3 bg-dark-700 border border-dark-600 rounded-lg space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded focus:border-accent-primary focus:ring-1 focus:ring-accent-primary text-white placeholder:text-light-500 text-sm"
          />
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-light-500">Icon:</span>
            <div className="flex gap-1">
              {ICON_OPTIONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className={`w-7 h-7 rounded flex items-center justify-center text-sm ${
                    newIcon === icon ? 'bg-accent-primary/20 ring-1 ring-accent-primary' : 'hover:bg-dark-600'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-light-500">Color:</span>
            <div className="flex gap-1">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewColor(color)}
                  className={`w-6 h-6 rounded ${
                    newColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-dark-700' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-sm text-light-500 hover:text-light-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-accent-primary hover:bg-accent-primary-hover text-white text-sm rounded transition-colors"
            >
              Add Category
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-2 border border-dashed border-dark-600 rounded-lg text-sm text-light-500 hover:text-light-300 hover:border-dark-500 transition-colors"
        >
          + Add Custom Category
        </button>
      )}
    </div>
  );
}

export default CustomCategoriesContext;
