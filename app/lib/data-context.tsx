'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { DashboardData, DashboardFilters, fetchDashboardData, fetchAgentList } from '../actions/dashboard'

interface DataContextType {
  dashboardData: DashboardData | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refreshKey: number
  availableAgents: Array<{ id: number; name: string; department?: string; active?: boolean }>
  filters: DashboardFilters
  setFilters: (filters: DashboardFilters) => void
  refreshData: () => Promise<void>
  clearError: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}

interface DataProviderProps {
  children: React.ReactNode
  initialData?: DashboardData | null
  initialError?: string | null
}

export function DataProvider({ children, initialData, initialError }: DataProviderProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError || null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(initialData ? new Date() : null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [availableAgents, setAvailableAgents] = useState<Array<{ id: number; name: string; department?: string; active?: boolean }>>([])
  const [filters, setFilters] = useState<DashboardFilters>({
    agentId: 'all',
    timeRange: 'week'
  })

  // Cache for data freshness
  const DATA_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

  const isDataFresh = useCallback(() => {
    return lastUpdated && (Date.now() - lastUpdated.getTime()) < DATA_CACHE_DURATION
  }, [lastUpdated])

  const loadAgents = useCallback(async () => {
    try {
      const result = await fetchAgentList()
      if (result.success && result.agents) {
        setAvailableAgents(result.agents)
      }
    } catch (err) {
      console.error('Error loading agents:', err)
    }
  }, [])

  const refreshData = useCallback(async (force = false) => {
    // Skip if data is fresh and not forced
    if (!force && isDataFresh() && dashboardData && !error) {
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const result = await fetchDashboardData(filters)
      
      if (result.success && result.data) {
        setDashboardData(result.data)
        setLastUpdated(new Date())
        setRefreshKey(prev => prev + 1)
      } else {
        setError(result.error || 'Failed to fetch data')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data')
    } finally {
      setIsLoading(false)
    }
  }, [filters, dashboardData, error, isDataFresh])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Load agents on mount
  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  // Refresh data when filters change (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      refreshData()
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [filters.agentId, filters.timeRange])

  // Initial data fetch if none provided or data is stale
  useEffect(() => {
    if (!dashboardData || (!isDataFresh() && !isLoading)) {
      refreshData()
    }
  }, [dashboardData, isDataFresh, isLoading, refreshData])

  const value: DataContextType = {
    dashboardData,
    isLoading,
    error,
    lastUpdated,
    refreshKey,
    availableAgents,
    filters,
    setFilters,
    refreshData: () => refreshData(true),
    clearError
  }

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
} 