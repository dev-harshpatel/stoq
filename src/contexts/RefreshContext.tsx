'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface RefreshContextType {
  refreshKey: number
  triggerRefresh: () => void
}

const RefreshContext = createContext<RefreshContextType | undefined>(undefined)

interface RefreshProviderProps {
  children: ReactNode
}

export function RefreshProvider({ children }: RefreshProviderProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
  }, [])

  return (
    <RefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  )
}

export function useRefresh() {
  const context = useContext(RefreshContext)
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider')
  }
  return context
}
