import {
  useRef,
  useEffect,
  useCallback,
  useState,
  type ReactNode,
  type CSSProperties,
} from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  style?: CSSProperties;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  keyExtractor: (item: T) => string;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  renderItem,
  className = '',
  style,
  onEndReached,
  endReachedThreshold = 200,
  keyExtractor,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const endReachedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });

    resizeObserver.observe(container);
    setContainerHeight(container.clientHeight);

    return () => resizeObserver.disconnect();
  }, []);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      setScrollTop(target.scrollTop);

      // Check if we've reached the end
      if (onEndReached) {
        const distanceToEnd =
          target.scrollHeight - target.scrollTop - target.clientHeight;
        if (distanceToEnd < endReachedThreshold && !endReachedRef.current) {
          endReachedRef.current = true;
          onEndReached();
        } else if (distanceToEnd >= endReachedThreshold) {
          endReachedRef.current = false;
        }
      }
    },
    [onEndReached, endReachedThreshold]
  );

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={style}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, localIndex) => {
            const globalIndex = startIndex + localIndex;
            return (
              <div
                key={keyExtractor(item)}
                style={{ height: itemHeight }}
              >
                {renderItem(item, globalIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Alternative: use react-window for more advanced use cases
// This component wraps react-window for easier use
interface WindowedListProps<T> {
  items: T[];
  height: number;
  itemSize: number | ((index: number) => number);
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  width?: number | string;
  className?: string;
  keyExtractor: (item: T) => string;
}

// Dynamic import for react-window (optional - reduce bundle size)
export function WindowedList<T>({
  items,
  height,
  itemSize,
  renderItem,
  width = '100%',
  className,
}: WindowedListProps<T>) {
  // This is a placeholder - in production, you'd dynamically import react-window
  // For now, we use the basic VirtualList above
  const isVariableSize = typeof itemSize === 'function';

  if (isVariableSize) {
    // For variable size items, use react-window's VariableSizeList
    console.warn('Variable size items require react-window. Using fallback.');
  }

  const constantItemSize = typeof itemSize === 'number' ? itemSize : 50;

  return (
    <div className={className} style={{ height, width, overflow: 'auto' }}>
      {items.map((item, index) => (
        <div
          key={index}
          style={{ height: constantItemSize }}
        >
          {renderItem(item, index, { height: constantItemSize })}
        </div>
      ))}
    </div>
  );
}
