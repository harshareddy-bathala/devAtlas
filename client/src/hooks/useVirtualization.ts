import { useMemo } from 'react';

interface VirtualizationOptions {
  /**
   * Threshold for enabling virtualization
   * @default 50
   */
  threshold?: number;
  /**
   * Height of each item in pixels (required for virtualization)
   */
  itemHeight?: number;
  /**
   * Number of items to render outside the visible area
   * @default 5
   */
  overscan?: number;
}

interface VirtualizationResult<T> {
  /** Whether virtualization should be used for this list */
  shouldVirtualize: boolean;
  /** Configuration for VirtualList component */
  virtualListConfig: {
    itemHeight: number;
    overscan: number;
  } | null;
  /** Items to render (all items if not virtualized) */
  items: T[];
  /** Total count of items */
  totalCount: number;
}

/**
 * Hook to determine if a list should use virtualization
 * based on the number of items
 *
 * @example
 * ```tsx
 * const { shouldVirtualize, virtualListConfig, items } = useVirtualization(skills, {
 *   threshold: 50,
 *   itemHeight: 60,
 * });
 *
 * if (shouldVirtualize && virtualListConfig) {
 *   return (
 *     <VirtualList
 *       items={items}
 *       itemHeight={virtualListConfig.itemHeight}
 *       overscan={virtualListConfig.overscan}
 *       renderItem={(item, index) => <SkillCard skill={item} />}
 *       keyExtractor={(item) => item.id}
 *     />
 *   );
 * }
 *
 * return items.map((item) => <SkillCard key={item.id} skill={item} />);
 * ```
 */
export function useVirtualization<T>(
  items: T[],
  options: VirtualizationOptions = {}
): VirtualizationResult<T> {
  const {
    threshold = 50,
    itemHeight = 60,
    overscan = 5,
  } = options;

  const result = useMemo(() => {
    const totalCount = items.length;
    const shouldVirtualize = totalCount > threshold;

    return {
      shouldVirtualize,
      virtualListConfig: shouldVirtualize
        ? { itemHeight, overscan }
        : null,
      items,
      totalCount,
    };
  }, [items, threshold, itemHeight, overscan]);

  return result;
}

/**
 * Calculate optimal item height based on content
 * This is a utility for dynamic height calculation
 */
export function estimateItemHeight(options: {
  hasDescription?: boolean;
  hasTags?: boolean;
  hasActions?: boolean;
  baseHeight?: number;
}): number {
  const {
    hasDescription = false,
    hasTags = false,
    hasActions = false,
    baseHeight = 48,
  } = options;

  let height = baseHeight;
  if (hasDescription) height += 24;
  if (hasTags) height += 28;
  if (hasActions) height += 36;

  return height;
}

export default useVirtualization;
