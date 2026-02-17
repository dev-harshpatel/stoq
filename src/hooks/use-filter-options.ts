'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchFilterOptions } from '@/lib/supabase/queries'

export function useFilterOptions() {
  const { data } = useQuery({
    queryKey: ['filterOptions'],
    queryFn: fetchFilterOptions,
    staleTime: Infinity,
  })

  return {
    brands: data?.brands ?? [],
    storageOptions: data?.storageOptions ?? [],
  }
}
