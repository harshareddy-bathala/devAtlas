import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Pagination metadata from API response
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Options for usePagination hook
 */
export interface UsePaginationOptions {
  initialPage?: number;
  defaultLimit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Return type of usePagination hook
 */
export interface UsePaginationResult<T> {
  // Data
  items: T[];
  pagination: PaginationMeta | null;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Current parameters
  currentPage: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  
  // Actions
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setLimit: (limit: number) => void;
  setSorting: (sortBy: string, sortOrder?: 'asc' | 'desc') => void;
  refresh: () => void;
}

/**
 * Custom hook for handling paginated data fetching
 * 
 * @param fetchFn - Function that fetches paginated data
 * @param options - Pagination options
 * @returns Pagination state and controls
 * 
 * @example
 * ```tsx
 * const {
 *   items,
 *   pagination,
 *   loading,
 *   currentPage,
 *   goToPage,
 *   nextPage,
 *   prevPage
 * } = usePagination(
 *   (params) => api.getProjects(params),
 *   { defaultLimit: 20 }
 * );
 * ```
 */
export function usePagination<T>(
  fetchFn: (params: {
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }) => Promise<PaginatedResponse<T>>,
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const {
    initialPage = 1,
    defaultLimit = 20,
    sortBy: initialSortBy = 'createdAt',
    sortOrder: initialSortOrder = 'desc'
  } = options;

  // State
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [limit, setLimitState] = useState(defaultLimit);
  const [sortBy, setSortByState] = useState(initialSortBy);
  const [sortOrder, setSortOrderState] = useState<'asc' | 'desc'>(initialSortOrder);
  
  // Track if component is mounted
  const isMounted = useRef(true);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchRef.current({
        page: currentPage,
        limit,
        sortBy,
        sortOrder
      });

      if (isMounted.current) {
        setItems(response.items);
        setPagination(response.pagination);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
        setItems([]);
        setPagination(null);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [currentPage, limit, sortBy, sortOrder]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Navigation functions
  const goToPage = useCallback((page: number) => {
    if (page < 1) return;
    if (pagination && page > pagination.totalPages) return;
    setCurrentPage(page);
  }, [pagination]);

  const nextPage = useCallback(() => {
    if (pagination?.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [pagination]);

  const prevPage = useCallback(() => {
    if (pagination?.hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [pagination]);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setCurrentPage(1); // Reset to first page when changing limit
  }, []);

  const setSorting = useCallback((newSortBy: string, newSortOrder?: 'asc' | 'desc') => {
    setSortByState(newSortBy);
    if (newSortOrder) {
      setSortOrderState(newSortOrder);
    } else {
      // Toggle sort order if same field
      setSortOrderState(prev => 
        sortBy === newSortBy ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'
      );
    }
    setCurrentPage(1); // Reset to first page when changing sort
  }, [sortBy]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    items,
    pagination,
    loading,
    error,
    currentPage,
    limit,
    sortBy,
    sortOrder,
    goToPage,
    nextPage,
    prevPage,
    setLimit,
    setSorting,
    refresh
  };
}

export default usePagination;
