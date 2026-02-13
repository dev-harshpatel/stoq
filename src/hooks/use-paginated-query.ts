'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export const PAGE_SIZE = 10

export interface PaginatedResult<T> {
  data: T[]
  count: number
}

export interface UsePaginatedQueryOptions<T> {
  fetchFn: (range: { from: number; to: number }) => Promise<PaginatedResult<T>>
  dependencies?: unknown[]
  realtimeVersion?: number
  pageSize?: number
}

export interface UsePaginatedQueryReturn<T> {
  data: T[]
  totalCount: number
  currentPage: number
  totalPages: number
  pageSize: number
  isLoading: boolean
  isFetching: boolean
  setCurrentPage: (page: number) => void
  refresh: () => Promise<void>
  rangeText: string
}

export function usePaginatedQuery<T>(
  options: UsePaginatedQueryOptions<T>
): UsePaginatedQueryReturn<T> {
  const { fetchFn, dependencies = [], realtimeVersion = 0, pageSize = PAGE_SIZE } = options

  const [data, setData] = useState<T[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isFetching, setIsFetching] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const fetchIdRef = useRef(0)
  const depsRef = useRef(dependencies)

  // isLoading is true only on initial load (no data yet)
  const isLoading = !hasInitialized && data.length === 0

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const fetchData = useCallback(
    async (page: number, reason?: string) => {
      const fetchId = ++fetchIdRef.current
      const isSilentRefetch =
        reason === 'realtime' || reason === 'tab-visibility'
      if (!isSilentRefetch) setIsFetching(true)

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      try {
        const result = await fetchFn({ from, to })
        if (fetchId === fetchIdRef.current) {
          setData(result.data)
          setTotalCount(result.count)
          setHasInitialized(true)
        }
      } catch (error) {
        if (fetchId === fetchIdRef.current) {
          setData([])
          setTotalCount(0)
          setHasInitialized(true)
        }
      } finally {
        if (fetchId === fetchIdRef.current && !isSilentRefetch) {
          setIsFetching(false)
        }
      }
    },
    [fetchFn, pageSize]
  )

  // Reset to page 1 when dependencies change
  const depsKey = JSON.stringify(dependencies)
  useEffect(() => {
    const prevKey = JSON.stringify(depsRef.current)
    if (prevKey !== depsKey) {
      depsRef.current = dependencies
      setCurrentPage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey])

  const prevRealtimeVersionRef = useRef(realtimeVersion)

  // Fetch data when page changes, fetchFn changes, or realtimeVersion changes
  useEffect(() => {
    const isRealtimeTrigger = realtimeVersion !== prevRealtimeVersionRef.current
    const reason =
      isRealtimeTrigger && realtimeVersion > 0 ? 'realtime' : 'page-or-deps'
    prevRealtimeVersionRef.current = realtimeVersion
    fetchData(currentPage, reason)
  }, [currentPage, fetchData, realtimeVersion])

  // Refetch when tab becomes visible (fallback for missed Realtime events, e.g. tab in background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasInitialized) {
        fetchData(currentPage, 'tab-visibility')
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [currentPage, fetchData, hasInitialized])

  // Clamp currentPage if it exceeds totalPages after a re-fetch
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0 && !isLoading) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages, isLoading])

  const refresh = useCallback(async () => {
    await fetchData(currentPage, 'manual-refresh')
  }, [fetchData, currentPage])

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalCount)
  const rangeText = totalCount > 0 ? `${from}-${to} of ${totalCount}` : '0 items'

  return {
    data,
    totalCount,
    currentPage,
    totalPages,
    pageSize,
    isLoading,
    isFetching,
    setCurrentPage,
    refresh,
    rangeText,
  }
}
