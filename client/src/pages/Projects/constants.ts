import { Lightbulb, Rocket, CheckCircle } from 'lucide-react';

/**
 * Project status configuration
 */
export const STATUS_CONFIG = {
  idea: { 
    label: 'Ideas', 
    color: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
    icon: Lightbulb,
    description: 'Future project concepts'
  },
  active: { 
    label: 'In Progress', 
    color: 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30',
    icon: Rocket,
    description: 'Currently building'
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30',
    icon: CheckCircle,
    description: 'Shipped & done'
  }
} as const;

export type ProjectStatus = keyof typeof STATUS_CONFIG;

/**
 * Debounce delay for batching status changes (ms)
 */
export const DEBOUNCE_DELAY = 2000;

/**
 * Items per page for pagination
 */
export const ITEMS_PER_PAGE = 12;
