'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { formatNumber } from '../lib/utils'
import { useState, useEffect } from 'react'
import { DashboardData, DashboardFilters, fetchDashboardData, fetchAgentList, testApiConnection } from '../actions/dashboard'
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
  }
}

// Status colors matching shadcn design
const STATUS_COLORS: Record<string, string> = {
  'Open': COLORS.chart.blue,
  'Pending': COLORS.chart.orange,
  'Resolved': COLORS.chart.green,
  'Closed': COLORS.chart.gray,
  'New': COLORS.chart.purple
}

// Priority colors - monochrome gradient showing severity (light to dark)
const PRIORITY_COLORS: Record<string, string> = {
  'Low': 'hsl(220 13% 85%)',      // Very light gray
  'Medium': 'hsl(220 13% 65%)',   // Medium gray  
  'High': 'hsl(220 13% 45%)',     // Dark gray
  'Urgent': 'hsl(220 13% 25%)'    // Very dark gray
}

// Workload colors - monochrome gradient showing load intensity (light to dark)
const WORKLOAD_COLORS: Record<string, string> = {
  'Light': 'hsl(220 13% 85%)',      // Very light gray
  'Moderate': 'hsl(220 13% 65%)',   // Medium gray
  'Heavy': 'hsl(220 13% 45%)',      // Dark gray
  'Overloaded': 'hsl(220 13% 25%)'  // Very dark gray
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
    { name: 'Hardware', value: 45 },
    { name: 'Software', value: 62 },
    { name: 'Network', value: 28 },
    { name: 'Security', value: 19 },
    { name: 'Access', value: 34 },
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
    { name: 'Light', value: 2 },
    { name: 'Moderate', value: 1 },
    { name: 'Heavy', value: 1 },
    { name: 'Overloaded', value: 0 },
  ],
  stats: {
    openTickets: 43,
    resolvedToday: 18,
    avgResponseTime: '2.4 hours',
    customerSatisfaction: '92%',
    slaBreaches: 5,
    overdueTickets: 12,
    unassignedTickets: 8,
    totalAgents: 4,
  },
}

interface DashboardProps {
  initialData?: DashboardData | null
  error?: string | null
}

export default function Dashboard({ initialData, error }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData || mockData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentError, setCurrentError] = useState<string | null>(error || null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'failed' | 'testing'>('connected')
  const [isUsingMockData, setIsUsingMockData] = useState(!initialData)
  const [filters, setFilters] = useState<DashboardFilters>({
    agentId: 'all',
    timeRange: 'week'
  })
  const [availableAgents, setAvailableAgents] = useState<Array<{ id: number; name: string; department?: string }>>([])
  const [agentsLoading, setAgentsLoading] = useState(false)

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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setCurrentError(null)
    setLastRefresh(new Date())
    
    try {
      console.log('🔄 Refreshing dashboard data with filters:', filters)
      const result = await fetchDashboardData(filters)
      
      if (result.success && result.data) {
        setDashboardData(result.data)
        setIsUsingMockData(false)
        setConnectionStatus('connected')
        console.log('✅ Dashboard refreshed successfully')
        
        // Reset countdown on successful refresh
        if (autoRefresh) {
          setCountdown(refreshInterval * 60)
        }
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

  // Add consistent colors to data
  const statusDataWithColors = dashboardData.ticketsByStatus.map(item => ({
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
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                      {agent.department ? ` - ${agent.department}` : ''}
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
                  onClick={handleApplyFilters}
                  disabled={isRefreshing}
                  size="sm"
                  className="h-8"
                >
                  <RotateCcw className={`mr-1 h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
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
      <div className="container mx-auto px-6 py-6">
        {/* Stats Cards - More Compact for TV */}
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(dashboardData.stats.openTickets)}</div>
              <p className="text-xs text-muted-foreground">Currently open</p>
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
              <div className="text-2xl font-bold text-orange-600">{formatNumber(dashboardData.stats.unassignedTickets)}</div>
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
          {/* Tickets by Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tickets by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDataWithColors}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusDataWithColors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tickets by Priority */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tickets by Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={priorityDataWithColors}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {priorityDataWithColors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Agent Workload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Agent Workload</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={workloadDataWithColors}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {workloadDataWithColors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
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
              <ResponsiveContainer width="100%" height={250}>
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

          {/* Top Categories */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Top Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dashboardData.ticketsByCategory}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
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
                    dot={{ fill: COLORS.chart.blue, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: COLORS.chart.blue, strokeWidth: 2 }}
                  />
                </LineChart>
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
              <ResponsiveContainer width="100%" height={300}>
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