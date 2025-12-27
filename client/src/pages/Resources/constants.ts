import { FileText, Video, BookOpen, Code, Link as LinkIcon } from 'lucide-react';

/**
 * Resource type configuration
 */
export const TYPE_CONFIG = {
  documentation: { label: 'Documentation', icon: FileText, color: 'text-[#3B82F6]' },
  video: { label: 'Video', icon: Video, color: 'text-[#F59E0B]' },
  course: { label: 'Course', icon: BookOpen, color: 'text-[#8B5CF6]' },
  article: { label: 'Article', icon: FileText, color: 'text-[#06B6D4]' },
  tutorial: { label: 'Tutorial', icon: Code, color: 'text-[#22C55E]' },
  other: { label: 'Other', icon: LinkIcon, color: 'text-light-400' }
} as const;

export type ResourceType = keyof typeof TYPE_CONFIG;

/**
 * Debounce delay for batching updates (ms)
 */
export const DEBOUNCE_DELAY = 2000;
