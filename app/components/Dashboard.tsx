'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, Treemap } from 'recharts'
import { formatNumber } from '../lib/utils'
import { useState, useEffect } from 'react'
import { DashboardData, DashboardFilters, fetchDashboardData, fetchAgentList, testApiConnection, clearDashboardCache, getCacheStatus } from '../actions/dashboard'
import { Users, Clock, AlertTriangle, CheckCircle, Activity, RotateCcw, Play, Pause } from 'lucide-react'

// Modern color palette inspired by shadcn/ui
const COLORS = {
  // Primary colors
  primary: 'hsl(222.2 84% 4.9%)',      // Almost black
  primaryForeground: 'hsl(210 40% 98%)', // Almost white
  
  // Muted colors for backgrounds
  muted: 'hsl(210 40% 96%)',           // Very light gray
  mutedForeground: 'hsl(215.4 16.3% 46.9%)', // Medium gray
  
  // Border and accents
  border: 'hsl(214.3 31.8% 91.4%)',   // Light border
  accent: 'hsl(210 40% 96%)',          // Accent background
  
  // Chart colors - modern and accessible
  chart: {
    blue: 'hsl(221.2 83.2% 53.3%)',    // Modern blue
    green: 'hsl(142.1 76.2% 36.3%)',   // Success green
    orange: 'hsl(24.6 95% 53.1%)',     // Warning orange
    red: 'hsl(0 84.2% 60.2%)',         // Error red
    purple: 'hsl(262.1 83.3% 57.8%)',  // Purple accent
    gray: 'hsl(215.4 16.3% 46.9%)',    // Neutral gray
    yellow: 'hsl(47.9 95.8% 53.1%)',   // Bright yellow
    cyan: 'hsl(189.6 94.5% 42.7%)',    // Cyan
    pink: 'hsl(336.5 84.4% 69.8%)',    // Pink
  }
}

// Status colors for active tickets only (more vibrant and distinct)
const STATUS_COLORS: Record<string, string> = {
  'Open': COLORS.chart.blue,           // Blue for open
  'Pending': COLORS.chart.orange,      // Orange for pending  
  'Hold': COLORS.chart.yellow,         // Yellow for hold
  'Waiting on Customer': COLORS.chart.purple, // Purple for waiting
  'Resolved': COLORS.chart.green,      // Green for resolved
  'Closed': COLORS.chart.gray,         // Gray for closed (if shown)
  'New': COLORS.chart.cyan             // Cyan for new
}

// Priority colors - distinct and meaningful
const PRIORITY_COLORS: Record<string, string> = {
  'Low': COLORS.chart.green,           // Green = low priority
  'Medium': COLORS.chart.blue,         // Blue = medium priority  
  'High': COLORS.chart.orange,         // Orange = high priority
  'Urgent': COLORS.chart.red           // Red = urgent priority
}

// Workload colors - intuitive progression from light to heavy
const WORKLOAD_COLORS: Record<string, string> = {
  'Light': COLORS.chart.green,         // Green = light workload
  'Moderate': COLORS.chart.blue,       // Blue = moderate workload
  'Heavy': COLORS.chart.orange,        // Orange = heavy workload
  'Overloaded': COLORS.chart.red       // Red = overloaded
}

// Mock data for fallback
const mockData: DashboardData = {
  ticketsByStatus: [
    { name: 'Open', value: 43 },
    { name: 'Pending', value: 27 },
    { name: 'Resolved', value: 85 },
    { name: 'Closed', value: 125 },
  ],
  ticketsByPriority: [
    { name: 'Low', value: 24 },
    { name: 'Medium', value: 56 },
    { name: 'High', value: 37 },
    { name: 'Urgent', value: 18 },
  ],
  ticketsByCategory: [
    { name: 'Group 1', value: 45 },
    { name: 'Group 2', value: 38 },
    { name: 'Marketing', value: 28 },
    { name: 'Sales', value: 24 },
    { name: 'Finance', value: 19 },
    { name: 'HR', value: 16 },
    { name: 'Operations', value: 12 },
    { name: 'Unknown Dept', value: 8 },
  ],
  ticketsTrend: [
    { name: 'Sun', value: 6 },
    { name: 'Mon', value: 12 },
    { name: 'Tue', value: 18 },
    { name: 'Wed', value: 15 },
    { name: 'Thu', value: 21 },
    { name: 'Fri', value: 14 },
    { name: 'Sat', value: 8 },
  ],
  resolutionTimes: [
    { name: '< 1 hour', value: 15 },
    { name: '1-4 hours', value: 32 },
    { name: '4-24 hours', value: 45 },
    { name: '1-3 days', value: 23 },
    { name: '> 3 days', value: 8 },
  ],
  agentPerformance: [
    { id: 1, name: 'Alice Johnson', tickets: 34, resolution: 82, avgResponseTime: '2.1h', workload: 'Moderate' },
    { id: 2, name: 'Bob Smith', tickets: 27, resolution: 75, avgResponseTime: '3.2h', workload: 'Light' },
    { id: 3, name: 'Charlie Brown', tickets: 42, resolution: 91, avgResponseTime: '1.8h', workload: 'Heavy' },
    { id: 4, name: 'Diana Ross', tickets: 19, resolution: 68, avgResponseTime: '4.1h', workload: 'Light' },
  ],
  agentWorkload: [
    { name: 'Light', value: 3 },
    { name: 'Moderate', value: 2 },
    { name: 'Heavy', value: 2 },
    { name: 'Overloaded', value: 1 },
  ],
  stats: {
    openTickets: 87,
    resolvedToday: 23,
    avgResponseTime: '2.4h',
    customerSatisfaction: '87%',
    slaBreaches: 5,
    overdueTickets: 12,
    unassignedTickets: 3,
    totalAgents: 8,
  },
  recentActivity: [],
  requesterDepartments: []
}

interface DashboardProps {
  initialData?: DashboardData | null
  error?: string | null
}

export default function Dashboard({ initialData, error }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData || mockData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshType, setRefreshType] = useState<'normal' | 'force' | null>(null) // Track which button was clicked
  const [currentError, setCurrentError] = useState<string | null>(error || null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'failed' | 'testing'>('connected')
  const [isUsingMockData, setIsUsingMockData] = useState(!initialData)
  const [filters, setFilters] = useState<DashboardFilters>({
    agentId: 'all',
    timeRange: 'week'
  })
  const [availableAgents, setAvailableAgents] = useState<Array<{ id: number; name: string; department?: string; active?: boolean }>>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0) // Key to force chart re-animation

  // Auto-refresh functionality for TV displays
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(5) // minutes
  const [countdown, setCountdown] = useState(0)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Fetch available agents on component mount
  useEffect(() => {
    const loadAgents = async () => {
      setAgentsLoading(true)
      try {
        const result = await fetchAgentList()
        if (result.success && result.agents) {
          setAvailableAgents(result.agents)
          console.log(`✅ Loaded ${result.agents.length} agents for filtering`)
        } else {
          console.warn('⚠️ Failed to load agents:', result.error)
        }
      } catch (err: any) {
        console.error('💥 Error loading agents:', err)
      } finally {
        setAgentsLoading(false)
      }
    }

    loadAgents()
  }, [])

  // Auto-refresh when filters change (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isRefreshing) {
        console.log('🔄 Filters changed, refreshing data...', filters)
        handleRefresh()
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [filters.agentId, filters.timeRange]) // Only watch the actual filter values

  // Auto-refresh timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    let countdownInterval: NodeJS.Timeout | null = null

    if (autoRefresh && !currentError) {
      // Set up main refresh timer
      interval = setInterval(() => {
        console.log('🔄 Auto-refresh triggered')
        handleRefresh()
      }, refreshInterval * 60 * 1000)

      // Set up countdown timer for UI
      setCountdown(refreshInterval * 60)
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return refreshInterval * 60 // Reset countdown
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [autoRefresh, refreshInterval, currentError])

  // Initial data fetch effect - fetch data if not provided by server
  useEffect(() => {
    // Only fetch if we don't have initial data or if there was an error
    if (!initialData || currentError) {
      console.log('🎯 No initial data or error detected, fetching fresh data...')
      handleRefresh()
    }
  }, []) // Run once on mount

  // Format countdown for display
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleRefresh = async (forceRefresh = false) => {
    setIsRefreshing(true)
    setRefreshType(forceRefresh ? 'force' : 'normal') // Track which button was clicked
    setCurrentError(null)
    setLastRefresh(new Date())
    
    try {
      console.log(`🔄 ${forceRefresh ? 'Force refreshing' : 'Refreshing'} dashboard data with filters:`, filters)
      const result = await fetchDashboardData({ ...filters, forceRefresh })
      
      if (result.success && result.data) {
        setDashboardData(result.data)
        setIsUsingMockData(false)
        setConnectionStatus('connected')
        console.log('✅ Dashboard refreshed successfully')
        
        // Reset countdown on successful refresh
        if (autoRefresh) {
          setCountdown(refreshInterval * 60)
        }
        
        // Increment refresh key to force chart re-animation
        setRefreshKey(prevKey => prevKey + 1)
      } else {
        console.warn('⚠️ Refresh failed, keeping current data:', result.error)
        setCurrentError(result.error || 'Failed to refresh data')
        setConnectionStatus('failed')
        // Auto-refresh will pause due to error
      }
    } catch (err: any) {
      console.error('💥 Error during refresh:', err)
      setCurrentError(err.message || 'Failed to refresh data')
      setConnectionStatus('failed')
      // Auto-refresh will pause due to error
    } finally {
      setIsRefreshing(false)
      setRefreshType(null) // Reset refresh type
    }
  }

  const handleApplyFilters = async () => {
    await handleRefresh()
  }

  const handleTestConnection = async () => {
    setConnectionStatus('testing')
    
    try {
      console.log('🔌 Testing API connection...')
      const result = await testApiConnection()
      
      if (result.success) {
        setConnectionStatus('connected')
        console.log('✅ Connection test successful')
        await handleRefresh()
      } else {
        setConnectionStatus('failed')
        setCurrentError(result.error || 'Connection test failed')
        console.error('❌ Connection test failed:', result.error)
      }
    } catch (err: any) {
      setConnectionStatus('failed')
      setCurrentError(err.message || 'Connection test failed')
      console.error('💥 Error testing connection:', err)
    }
  }

  // Helper function to get color class for unassigned tickets
  const getUnassignedColor = (count: number): string => {
    if (count === 0) return 'text-green-600'      // Green when perfect (0)
    if (count >= 10) return 'text-red-600'        // Red when high (10+)
    if (count >= 5) return 'text-yellow-600'      // Yellow when moderate (5-9)
    return 'text-blue-600'                        // Blue for low counts (1-4)
  }

  // Add consistent colors to data and filter for better readability
  const statusDataWithColors = dashboardData.ticketsByStatus
    .filter(item => item.name !== 'Closed' && item.name !== 'Resolved') // Only show active tickets that need attention
    .map(item => ({
      ...item,
      color: STATUS_COLORS[item.name] || COLORS.chart.gray
    }))

  const priorityDataWithColors = dashboardData.ticketsByPriority.map(item => ({
    ...item,
    color: PRIORITY_COLORS[item.name] || COLORS.chart.gray
  }))

  const workloadDataWithColors = dashboardData.agentWorkload.map(item => ({
    ...item,
    color: WORKLOAD_COLORS[item.name] || COLORS.chart.gray
  }))

  // Fallback data if filtering results in empty arrays
  const safeStatusData = statusDataWithColors.length > 0 ? statusDataWithColors : [
    { name: 'No Data', value: 0, color: COLORS.chart.gray }
  ]
  
  const safePriorityData = priorityDataWithColors.length > 0 ? priorityDataWithColors : [
    { name: 'No Data', value: 0, color: COLORS.chart.gray }
  ]

  const safeWorkloadData = workloadDataWithColors.length > 0 ? workloadDataWithColors : [
    { name: 'No Data', value: 0, color: COLORS.chart.gray }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header for TV - shadcn style */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Pattern's IT Dashboard</h1>
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-2">
                    <div className={`h-2 w-2 rounded-full ${
                      connectionStatus === 'connected' ? 'bg-green-500' :
                      connectionStatus === 'testing' ? 'bg-orange-500' :
                      'bg-red-500'
                    }`} />
                    <span className="text-xs text-muted-foreground">
                      {connectionStatus === 'connected' ? 'Connected' :
                       connectionStatus === 'testing' ? 'Testing...' :
                       'Connection issues'}
                    </span>
                  </div>
                  
                  {lastRefresh && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Last: {lastRefresh.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  
                  {isUsingMockData && (
                    <div className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold border-transparent bg-secondary text-secondary-foreground">
                      Sample data
                    </div>
                  )}
                  
                  {autoRefresh && (
                    <div className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold border-green-200 bg-green-50 text-green-700">
                      Auto-refresh ON
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Compact Filter Controls in Header */}
            <div className="flex items-center space-x-3">
              {/* Agent Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">Agent:</span>
                <select 
                  value={filters.agentId}
                  onChange={(e) => setFilters({...filters, agentId: e.target.value as any})}
                  disabled={agentsLoading}
                  className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                >
                  <option value="all">
                    {agentsLoading ? 'Loading agents...' : `All Agents${availableAgents.length > 0 ? ` (${availableAgents.length})` : ''}`}
                  </option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id} style={{ 
                      fontStyle: agent.active === false ? 'italic' : 'normal',
                      opacity: agent.active === false ? 0.7 : 1 
                    }}>
                      {agent.name}
                      {agent.department ? ` - ${agent.department}` : ''}
                      {agent.active === false ? ' (Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Range Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-muted-foreground">Period:</span>
                <select 
                  value={filters.timeRange}
                  onChange={(e) => setFilters({...filters, timeRange: e.target.value as any})}
                  className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                {/* Auto-refresh controls */}
                <div className="flex items-center space-x-2 px-3 py-1 rounded-md border border-input bg-background">
                  <Button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
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
                    disabled={autoRefresh}
                    className="h-6 border-0 bg-transparent text-xs focus:outline-none text-muted-foreground"
                  >
                    <option value={1}>1m</option>
                    <option value={2}>2m</option>
                    <option value={5}>5m</option>
                    <option value={10}>10m</option>
                    <option value={15}>15m</option>
                  </select>
                  
                  {autoRefresh && !currentError && (
                    <span className="text-xs text-muted-foreground min-w-[35px]">
                      {formatCountdown(countdown)}
                    </span>
                  )}
                  
                  {autoRefresh && (
                    <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>

                {connectionStatus === 'failed' && (
                  <Button 
                    onClick={handleTestConnection}
                    variant="outline"
                    size="sm"
                    className="h-8"
                  >
                    Test Connection
                  </Button>
                )}
                
                <Button 
                  onClick={() => handleRefresh(false)}
                  disabled={isRefreshing}
                  size="sm"
                  className="h-8"
                >
                  <RotateCcw className={`mr-1 h-3 w-3 ${isRefreshing && refreshType === 'normal' ? 'animate-spin' : ''}`} />
                  {isRefreshing && refreshType === 'normal' ? 'Refreshing...' : 'Refresh'}
                </Button>
                
                <Button 
                  onClick={() => handleRefresh(true)}
                  disabled={isRefreshing}
                  variant="destructive"
                  size="sm"
                  className="h-8"
                  title="Force refresh - clears cache and fetches fresh data"
                >
                  <RotateCcw className={`h-3 w-3 ${isRefreshing && refreshType === 'force' ? 'animate-spin' : ''}`} />
                  Force
                </Button>
              </div>
            </div>
          </div>

          {/* Error display */}
          {currentError && (
            <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-destructive">API Error</h4>
                  <p className="text-sm text-destructive/80 mt-1">{currentError}</p>
                </div>
                <Button
                  onClick={() => setCurrentError(null)}
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive/80"
                >
                  ✕
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Optimized for TV */}
      <div className={`container mx-auto px-6 py-6 transition-opacity duration-300 ${isRefreshing ? 'opacity-75' : 'opacity-100'}`}>
        {/* Stats Cards - More Compact for TV */}
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">All unresolved tickets</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(dashboardData.stats.openTickets)}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(dashboardData.stats.resolvedToday)}</div>
              <p className="text-xs text-muted-foreground">Closed today</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatNumber(dashboardData.stats.slaBreaches)}</div>
              <p className="text-xs text-muted-foreground">Past due</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getUnassignedColor(dashboardData.stats.unassignedTickets)}`}>
                {formatNumber(dashboardData.stats.unassignedTickets)}
              </div>
              <p className="text-xs text-muted-foreground">Need assignment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.avgResponseTime}</div>
              <p className="text-xs text-muted-foreground">Response time</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(dashboardData.stats.totalAgents)}</div>
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid - Optimized Layout for TV */}
        <div className="grid gap-4 lg:grid-cols-3 mb-6">
          {/* Active Tickets by Status - Only show tickets needing attention */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Active Tickets by Status</CardTitle>
              <p className="text-sm text-muted-foreground">Tickets requiring attention ({safeStatusData.length} items, excludes resolved/closed)</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer key={`status-${refreshKey}`} width="100%" height={250}>
                <BarChart 
                  data={safeStatusData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [value, 'Tickets']}
                    labelFormatter={(label) => `Status: ${label}`}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {safeStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tickets by Priority - Horizontal bars for better readability */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tickets by Priority</CardTitle>
              <p className="text-sm text-muted-foreground">Distribution across priority levels ({safePriorityData.length} items)</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer key={`priority-${refreshKey}`} width="100%" height={250}>
                <BarChart 
                  data={safePriorityData}
                  margin={{ top: 20, right: 30, left: 40, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [value, 'Tickets']}
                    labelFormatter={(label) => `Priority: ${label}`}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {safePriorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Agent Workload - Improved pie chart with better spacing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Agent Workload Distribution</CardTitle>
              <p className="text-sm text-muted-foreground">Current team capacity status</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer key={`workload-${refreshKey}`} width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={safeWorkloadData}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={20}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {safeWorkloadData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [value, 'Agents']}
                    labelFormatter={(label) => `Workload: ${label}`}
                  />
                  {/* Custom Legend */}
                  <g>
                    {safeWorkloadData.map((entry, index) => (
                      <g key={`legend-${index}`}>
                        <rect 
                          x={20} 
                          y={20 + index * 20} 
                          width={12} 
                          height={12} 
                          fill={entry.color} 
                        />
                        <text 
                          x={38} 
                          y={20 + index * 20 + 9} 
                          fontSize={12} 
                          fill="#666"
                        >
                          {entry.name}: {entry.value}
                        </text>
                      </g>
                    ))}
                  </g>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Line Charts */}
        <div className="grid gap-4 lg:grid-cols-2 mb-6">
          {/* Weekly Trend */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Weekly Ticket Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer key={`trend-${refreshKey}`} width="100%" height={250}>
                <LineChart data={dashboardData.ticketsTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={COLORS.chart.blue} 
                    strokeWidth={3}
                    dot={{ fill: COLORS.chart.blue, strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, stroke: COLORS.chart.blue, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Departments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tickets by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer key={`departments-${refreshKey}`} width="100%" height={250}>
                <Treemap
                  data={dashboardData.ticketsByCategory}
                  dataKey="value"
                  aspectRatio={4/3}
                  stroke="#fff"
                  fill={COLORS.chart.blue}
                >
                  <Tooltip 
                    labelFormatter={(label) => `Department: ${label}`}
                    formatter={(value) => [`${value} tickets`, 'Ticket Count']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                </Treemap>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Agent Performance - Compact for TV */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Agent Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Performance Chart */}
              <ResponsiveContainer key={`performance-${refreshKey}`} width="100%" height={300}>
                <LineChart 
                  data={dashboardData.agentPerformance}
                  margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                    className="text-xs fill-muted-foreground"
                  />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'tickets' ? formatNumber(value as number) : `${value}%`,
                      name === 'tickets' ? 'Tickets Handled' : 'Resolution Rate'
                    ]}
                    labelFormatter={(label) => `Agent: ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tickets" 
                    stroke={COLORS.chart.blue} 
                    strokeWidth={3}
                    name="tickets"
                    dot={{ fill: COLORS.chart.blue, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: COLORS.chart.blue, strokeWidth: 2 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resolution" 
                    stroke={COLORS.chart.green} 
                    strokeWidth={3}
                    name="resolution"
                    dot={{ fill: COLORS.chart.green, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: COLORS.chart.green, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* Agent Summary Table - Compact */}
              <div className="rounded-md border">
                <div className="relative w-full overflow-auto max-h-[300px]">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b sticky top-0 bg-background">
                      <tr className="border-b transition-colors hover:bg-muted/50">
                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">Agent</th>
                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">Tickets</th>
                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">Rate</th>
                        <th className="h-10 px-3 text-left align-middle font-medium text-muted-foreground">Workload</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {dashboardData.agentPerformance.map((agent) => (
                        <tr key={agent.id} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-3 align-middle font-medium text-sm">{agent.name}</td>
                          <td className="p-3 align-middle text-sm">{formatNumber(agent.tickets)}</td>
                          <td className="p-3 align-middle text-sm">
                            <span className={`font-semibold ${
                              agent.resolution >= 90 ? 'text-green-600' :
                              agent.resolution >= 80 ? 'text-blue-600' :
                              agent.resolution >= 70 ? 'text-orange-600' :
                              'text-red-600'
                            }`}>
                              {agent.resolution}%
                            </span>
                          </td>
                          <td className="p-3 align-middle">
                            <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              agent.workload === 'Light' ? 'bg-gray-100 text-gray-700' :
                              agent.workload === 'Moderate' ? 'bg-gray-200 text-gray-800' :
                              agent.workload === 'Heavy' ? 'bg-gray-400 text-white' :
                              'bg-gray-700 text-white'
                            }`}>
                              {agent.workload}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 