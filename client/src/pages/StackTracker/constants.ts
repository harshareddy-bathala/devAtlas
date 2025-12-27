import { Sparkles, BookOpen, Target } from 'lucide-react';

/**
 * Status configuration for skills
 */
export const STATUS_CONFIG = {
  want_to_learn: { 
    label: 'Want to Learn', 
    color: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
    icon: Sparkles,
    description: 'Skills you want to learn in the future'
  },
  learning: { 
    label: 'Learning', 
    color: 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30',
    icon: BookOpen,
    description: 'Skills you are actively learning'
  },
  mastered: { 
    label: 'Mastered', 
    color: 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30',
    icon: Target,
    description: 'Skills you have mastered with project evidence'
  }
} as const;

/**
 * Category options for skills
 */
export const CATEGORY_OPTIONS = [
  { value: 'language', label: 'Language' },
  { value: 'framework', label: 'Framework' },
  { value: 'library', label: 'Library' },
  { value: 'tool', label: 'Tool' },
  { value: 'database', label: 'Database' },
  { value: 'runtime', label: 'Runtime' },
  { value: 'other', label: 'Other' }
] as const;

/**
 * Available icons for skills
 */
export const ICON_OPTIONS = [
  '🟨', '🔷', '⚛️', '🟩', '🐍', '🦀', 
  '🐳', '🐘', '☕', '💎', '🔶', '🟣', 
  '📚', '⚡', '🔥', '🌐'
] as const;

/**
 * Debounce delay for batching status changes (ms)
 */
export const DEBOUNCE_DELAY = 2000;

export type SkillStatus = keyof typeof STATUS_CONFIG;
export type SkillCategory = typeof CATEGORY_OPTIONS[number]['value'];
