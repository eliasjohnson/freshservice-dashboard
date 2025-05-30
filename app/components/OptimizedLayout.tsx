'use client'

import React, { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Button } from './ui/button'
import { RotateCcw, Clock, Play, Pause, RefreshCw } from 'lucide-react'
import { ThemeSelector } from './theme-selector'
import { useData } from '../lib/data-context'

interface OptimizedLayoutProps {
  children: React.ReactNode
}

export function OptimizedLayout({ children }: OptimizedLayoutProps) {
  const {
    dashboardData,
    isLoading,
    error,
    lastUpdated,
    refreshKey,
    availableAgents,
    filters,
    setFilters,
    refreshData,
    clearError
  } = useData()

  // Auto-refresh functionality
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(5) // minutes
  const [countdown, setCountdown] = useState(0)

  // Connection status based on data state
  const connectionStatus = error ? 'failed' : (isLoading ? 'testing' : 'connected')

  // Auto-refresh timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    let countdownInterval: NodeJS.Timeout | null = null

    if (autoRefresh && !error) {
      interval = setInterval(() => {
        refreshData()
      }, refreshInterval * 60 * 1000)

      setCountdown(refreshInterval * 60)
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return refreshInterval * 60
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [autoRefresh, refreshInterval, error, refreshData])

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRefreshClick = () => {
    refreshData()
    if (autoRefresh) {
      setCountdown(refreshInterval * 60)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'testing' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {connectionStatus === 'connected' ? 'Connected' :
                     connectionStatus === 'testing' ? 'Loading...' :
                     'Connection issues'}
                  </span>
                </div>
                
                {lastUpdated && (
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Last: {lastUpdated.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center space-x-3">
              {/* Filters */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">Agent:</span>
                <select 
                  value={filters.agentId}
                  onChange={(e) => setFilters({...filters, agentId: e.target.value as any})}
                  className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={isLoading}
                >
                  <option value="all">All Agents ({availableAgents.length})</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                      {agent.department ? ` - ${agent.department}` : ''}
                      {agent.active === false ? ' (Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">Period:</span>
                <select 
                  value={filters.timeRange}
                  onChange={(e) => setFilters({...filters, timeRange: e.target.value as any})}
                  className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  disabled={isLoading}
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                </select>
              </div>

              {/* Auto-refresh controls */}
              <div className="flex items-center space-x-2 px-3 py-1 rounded-md border border-input bg-background">
                <Button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={isLoading}
                >
                  {autoRefresh ? (
                    <Pause className="h-3 w-3 text-green-600" />
                  ) : (
                    <Play className="h-3 w-3 text-muted-foreground" />
                  )}
                </Button>
                
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  disabled={autoRefresh || isLoading}
                  className="h-6 border-0 bg-transparent text-xs focus:outline-none text-muted-foreground"
                >
                  <option value={1}>1m</option>
                  <option value={2}>2m</option>
                  <option value={5}>5m</option>
                  <option value={10}>10m</option>
                  <option value={15}>15m</option>
                </select>
                
                {autoRefresh && !error && (
                  <span className="text-xs text-muted-foreground min-w-[35px]">
                    {formatCountdown(countdown)}
                  </span>
                )}
                
                {autoRefresh && (
                  <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>

              {/* Single Refresh Button */}
              <Button 
                onClick={handleRefreshClick}
                disabled={isLoading}
                size="sm"
                className="h-8"
              >
                <RotateCcw className={`mr-1 h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
              
              {/* Theme Toggle */}
              <ThemeSelector />
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="px-6 pb-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-destructive">API Error</h4>
                    <p className="text-sm text-destructive/80 mt-1">{error}</p>
                  </div>
                  <Button
                    onClick={clearError}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/80"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </div>
          )}
        </header>
        
        {/* Main Content Area */}
        <main className={`flex-1 overflow-auto p-6 transition-opacity duration-200 ${isLoading && !dashboardData ? 'opacity-50' : 'opacity-100'}`}>
          {dashboardData ? (
            React.cloneElement(children as React.ReactElement, {
              data: dashboardData,
              refreshKey,
              availableAgents,
              filters,
              setFilters,
              isLoading
            })
          ) : isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
                <p className="mt-1 text-xs text-muted-foreground">This may take a few moments</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="rounded-full h-12 w-12 bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="h-6 w-6 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Unable to load data</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  There was an error connecting to the Freshservice API. Please check your connection and try again.
                </p>
                <Button onClick={() => refreshData()} variant="outline">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-muted-foreground">No data available</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
} 