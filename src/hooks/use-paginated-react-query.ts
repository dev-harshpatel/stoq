'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'

export const PAGE_SIZE = 10

export interface PaginatedResult<T> {
  data: T[]
  count: number
}

export interface UsePaginatedReactQueryOptions<T> {
  queryKey: readonly unknown[]
  fetchFn: (range: { from: number; to: number }) => Promise<PaginatedResult<T>>
  currentPage: number
  pageSize?: number
  enabled?: boolean
}

export interface UsePaginatedReactQueryReturn<T> {
  data: T[]
  totalCount: number
  totalPages: number
  isLoading: boolean
  isFetching: boolean
  rangeText: string
}

export function usePaginatedReactQuery<T>(
  options: UsePaginatedReactQueryOptions<T>,
): UsePaginatedReactQueryReturn<T> {
  const {
    queryKey,
    fetchFn,
    currentPage,
    pageSize = PAGE_SIZE,
    enabled = true,
  } = options

  const from = (currentPage - 1) * pageSize
  const to = from + pageSize - 1

  const query = useQuery({
    queryKey,
    queryFn: () => fetchFn({ from, to }),
    enabled,
    placeholderData: keepPreviousData,
  })

  const data = query.data?.data ?? []
  const totalCount = query.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const rangeFrom = (currentPage - 1) * pageSize + 1
  const rangeTo = Math.min(currentPage * pageSize, totalCount)
  const rangeText =
    totalCount > 0 ? `${rangeFrom}-${rangeTo} of ${totalCount}` : '0 items'

  return {
    data,
    totalCount,
    totalPages,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    rangeText,
  }
}
