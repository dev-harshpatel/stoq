'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getOntarioTime } from '@/lib/utils'
import { AUTO_REFRESH_INTERVAL_MS, AUTO_REFRESH_DEFAULT_ENABLED } from '@/lib/constants'

interface UseAutoRefreshOptions {
  onRefresh: () => Promise<void>
  intervalMs?: number
  defaultEnabled?: boolean
}

interface UseAutoRefreshReturn {
  autoRefresh: boolean
  setAutoRefresh: (value: boolean) => void
  lastRefreshed: string
  isRefreshing: boolean
  manualRefresh: () => Promise<void>
}

export function useAutoRefresh(options: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const {
    onRefresh,
    intervalMs = AUTO_REFRESH_INTERVAL_MS,
    defaultEnabled = AUTO_REFRESH_DEFAULT_ENABLED,
  } = options

  const [autoRefresh, setAutoRefresh] = useState(defaultEnabled)
  const [lastRefreshed, setLastRefreshed] = useState(getOntarioTime())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const onRefreshRef = useRef(onRefresh)
  const isRefreshingRef = useRef(false) // Use ref to prevent circular dependency

  // Keep the onRefresh ref updated
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  // Perform refresh and update timestamp - stable function reference
  const performRefresh = useCallback(async () => {
    // Use ref to check if already refreshing (avoids dependency on state)
    if (isRefreshingRef.current) return

    isRefreshingRef.current = true
    setIsRefreshing(true)
    try {
      await onRefreshRef.current()
      setLastRefreshed(getOntarioTime())
    } catch (error) {
      console.error('Auto-refresh failed:', error)
    } finally {
      isRefreshingRef.current = false
      setIsRefreshing(false)
    }
  }, []) // Empty deps - stable reference

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    await performRefresh()
  }, [performRefresh])

  // Set up auto-refresh interval
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (autoRefresh) {
      // Perform initial refresh when auto-refresh is enabled
      performRefresh()

      // Set up the interval
      intervalRef.current = setInterval(() => {
        performRefresh()
      }, intervalMs)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [autoRefresh, intervalMs, performRefresh])

  return {
    autoRefresh,
    setAutoRefresh,
    lastRefreshed,
    isRefreshing,
    manualRefresh,
  }
}
