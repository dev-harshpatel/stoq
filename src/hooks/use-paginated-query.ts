'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

export const PAGE_SIZE = 10

export interface PaginatedResult<T> {
  data: T[]
  count: number
}

export interface UsePaginatedQueryOptions<T> {
  fetchFn: (range: { from: number; to: number }) => Promise<PaginatedResult<T>>
  dependencies?: any[]
  realtimeTable?: string
  pageSize?: number
  refreshKey?: number
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
  const { fetchFn, dependencies = [], realtimeTable, pageSize = PAGE_SIZE, refreshKey = 0 } = options

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

  const fetchData = useCallback(async (page: number) => {
    const fetchId = ++fetchIdRef.current
    setIsFetching(true)

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
      if (fetchId === fetchIdRef.current) {
        setIsFetching(false)
      }
    }
  }, [fetchFn, pageSize])

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

  // Fetch data when page changes, fetchFn changes, or refreshKey changes
  useEffect(() => {
    fetchData(currentPage)
  }, [currentPage, fetchData, refreshKey])

  // Real-time subscription
  useEffect(() => {
    if (!realtimeTable) return

    const channel = supabase
      .channel(`${realtimeTable}-paginated-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: realtimeTable },
        () => {
          fetchData(currentPage)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realtimeTable, currentPage, fetchData])

  // Clamp currentPage if it exceeds totalPages after a re-fetch
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0 && !isLoading) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages, isLoading])

  const refresh = useCallback(async () => {
    await fetchData(currentPage)
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
