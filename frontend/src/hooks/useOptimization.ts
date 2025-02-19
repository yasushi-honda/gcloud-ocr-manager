import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash';

// デバウンス付きの状態更新フック
export const useDebounceState = <T>(initialValue: T, delay: number = 500) => {
  const [value, setValue] = useState<T>(initialValue);
  const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return [value, debouncedValue, setValue] as const;
};

// 無限スクロール用フック
export const useInfiniteScroll = (
  callback: () => Promise<void>,
  options = {
    threshold: 0.8,
    rootMargin: '20px',
  }
) => {
  const [loading, setLoading] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      async (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !loading) {
          setLoading(true);
          await callback();
          setLoading(false);
        }
      },
      {
        threshold: options.threshold,
        rootMargin: options.rootMargin,
      }
    );

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [callback, loading, options.threshold, options.rootMargin]);

  useEffect(() => {
    if (targetRef.current && observer.current) {
      observer.current.observe(targetRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [targetRef.current]);

  return { targetRef, loading };
};

// メモ化されたソート関数
export const useSortedData = <T>(
  data: T[],
  sortKey: keyof T,
  sortOrder: 'asc' | 'desc' = 'asc'
) => {
  return useMemo(() => {
    return [...data].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (aValue instanceof Date && bValue instanceof Date) {
        return sortOrder === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      return 0;
    });
  }, [data, sortKey, sortOrder]);
};

// データフェッチング用フック
export const useFetchData = <T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [...dependencies]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

// フィルタリング用フック
export const useFilteredData = <T>(
  data: T[],
  filterFn: (item: T) => boolean
) => {
  return useMemo(() => {
    return data.filter(filterFn);
  }, [data, filterFn]);
};

// ページネーション用フック
export const usePagination = <T>(
  data: T[],
  itemsPerPage: number
) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalPages = Math.ceil(data.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  }, [data, currentPage, itemsPerPage]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages));
  }, [totalPages]);

  return {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
  };
};

// キャッシュ用フック
export const useCache = <T>(
  key: string,
  initialData: T,
  expirationTime: number = 5 * 60 * 1000 // デフォルト5分
) => {
  const getInitialData = () => {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < expirationTime) {
        return data;
      }
    }
    return initialData;
  };

  const [data, setData] = useState<T>(getInitialData());

  useEffect(() => {
    localStorage.setItem(
      key,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );
  }, [data, key]);

  return [data, setData] as const;
};
