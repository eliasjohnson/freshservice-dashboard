'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { formatNumber, formatDate, formatHours } from '../lib/utils'
import { useState, useEffect } from 'react'
import { DashboardData, DashboardFilters, fetchDashboardData, testApiConnection } from '../actions/dashboard'
import FilterBar from './FilterBar'
import Link from 'next/link'
import { Info, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { DashboardSkeleton, ChartCardSkeleton, StatsCardSkeleton, AgentTableSkeleton } from './LoadingSkeleton'

// CONSISTENT COLOR PALETTE - Following Data Rocks principles
const DASHBOARD_COLORS = {
  // Primary brand colors
  primary: '#4F46E5',      // Indigo - main brand color
  primaryLight: '#A5B4FC', // Light indigo for secondary elements
  
  // Status colors with good contrast
  success: '#059669',      // Green - positive/resolved
  warning: '#D97706',      // Orange - attention needed  
  danger: '#DC2626',       // Red - critical/urgent
  info: '#0284C7',         // Blue - informational
  
  // Neutral colors for hierarchy
  neutral: '#6B7280',      // Gray for secondary text
  neutralLight: '#F3F4F6', // Light gray for backgrounds
  background: '#FFFFFF',   // Pure white background
  
  // Chart colors - limited palette for consistency
  chart: {
    primary: '#4F46E5',    // Main data color
    secondary: '#10B981',  // Secondary data color  
    tertiary: '#F59E0B',   // Third data color (sparingly used)
    neutral: '#6B7280',    // For less important data
  }
}

// Simplified priority colors - better contrast
const PRIORITY_COLORS: Record<string, string> = {
  'Low': DASHBOARD_COLORS.neutral,
  'Medium': DASHBOARD_COLORS.info, 
  'High': DASHBOARD_COLORS.warning,
  'Urgent': DASHBOARD_COLORS.danger
}

// Status colors for consistency across charts
const STATUS_COLORS: Record<string, string> = {
  'Open': DASHBOARD_COLORS.chart.primary,
  'Pending': DASHBOARD_COLORS.warning,
  'Resolved': DASHBOARD_COLORS.success,
  'Closed': DASHBOARD_COLORS.neutral,
  'New': DASHBOARD_COLORS.info
}

// Workload colors with clear meaning
const WORKLOAD_COLORS: Record<string, string> = {
  'Light': DASHBOARD_COLORS.success,
  'Moderate': DASHBOARD_COLORS.info,
  'Heavy': DASHBOARD_COLORS.warning,
  'Overloaded': DASHBOARD_COLORS.danger
}

// Mock data for initial rendering
const initialMockData: DashboardData = {
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

interface FastDashboardProps {
  initialData?: DashboardData | null
  error?: string | null
}

export default function FastDashboard({ initialData, error }: FastDashboardProps) {
  // State management
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialData || initialMockData)
  const [isLoading, setIsLoading] = useState(!initialData) // Start loading if no initial data
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentError, setCurrentError] = useState<string | null>(error || null)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'failed' | 'testing'>('connected')
  const [isUsingRealData, setIsUsingRealData] = useState(!!initialData)
  const [filters, setFilters] = useState<DashboardFilters>({
    agentId: 'all',
    timeRange: 'week'
  })

  // Load real data on component mount if we don't have initial data
  useEffect(() => {
    if (!initialData) {
      loadDashboardData()
    }
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    setCurrentError(null)
    
    try {
      console.log('🚀 Loading dashboard data client-side with filters:', filters)
      const result = await fetchDashboardData(filters)
      
      if (result.success && result.data) {
        setDashboardData(result.data)
        setIsUsingRealData(true)
        setConnectionStatus('connected')
        console.log('✅ Dashboard loaded successfully')
      } else {
        console.warn('⚠️ Load failed, using mock data:', result.error)
        setCurrentError(result.error || 'Failed to load data')
        setConnectionStatus('failed')
        setIsUsingRealData(false)
      }
    } catch (err: any) {
      console.error('💥 Error during load:', err)
      setCurrentError(err.message || 'Failed to load data')
      setConnectionStatus('failed')
      setIsUsingRealData(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setCurrentError(null)
    
    try {
      console.log('🔄 Refreshing dashboard data with filters:', filters)
      const result = await fetchDashboardData(filters)
      
      if (result.success && result.data) {
        setDashboardData(result.data)
        setIsUsingRealData(true)
        setConnectionStatus('connected')
        console.log('✅ Dashboard refreshed successfully')
      } else {
        console.warn('⚠️ Refresh failed:', result.error)
        setCurrentError(result.error || 'Failed to refresh data')
        setConnectionStatus('failed')
      }
    } catch (err: any) {
      console.error('💥 Error during refresh:', err)
      setCurrentError(err.message || 'Failed to refresh data')
      setConnectionStatus('failed')
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

  // Show full skeleton during initial load
  if (isLoading && !isUsingRealData) {
    return <DashboardSkeleton />
  }

  // Add consistent colors to data
  const statusDataWithColors = dashboardData.ticketsByStatus.map(item => ({
    ...item,
    color: STATUS_COLORS[item.name] || DASHBOARD_COLORS.chart.neutral
  }))

  const priorityDataWithColors = dashboardData.ticketsByPriority.map(item => ({
    ...item,
    color: PRIORITY_COLORS[item.name] || DASHBOARD_COLORS.chart.neutral
  }))

  const workloadDataWithColors = dashboardData.agentWorkload.map(item => ({
    ...item,
    color: WORKLOAD_COLORS[item.name] || DASHBOARD_COLORS.chart.neutral
  }))

  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">IT Support Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage your IT support operations</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link href="/about">
            <Button variant="outline" size="sm" className="gap-2">
              <Info className="h-4 w-4" />
              About Metrics
            </Button>
          </Link>
          <Button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="sm"
            className="gap-2"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {isRefreshing ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      {connectionStatus === 'failed' && (
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4 text-red-600" />
            <span className="text-red-800 text-sm">
              {currentError || 'Connection failed. Using cached data.'}
            </span>
          </div>
          <Button 
            onClick={handleTestConnection}
            variant="outline"
            size="sm"
            disabled={connectionStatus === 'testing'}
            className="gap-2"
          >
            {connectionStatus === 'testing' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4" />
            )}
            {connectionStatus === 'testing' ? 'Testing...' : 'Retry'}
          </Button>
        </div>
      )}

      {connectionStatus === 'connected' && isUsingRealData && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <Wifi className="h-4 w-4 text-green-600" />
          <span className="text-green-800 text-sm">Connected to Freshservice API</span>
        </div>
      )}

      {!isUsingRealData && (
        <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <span className="text-blue-800 text-sm">Showing demo data. Check connection to load real data.</span>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar 
        filters={filters}
        onFiltersChange={setFilters}
        onApplyFilters={handleApplyFilters}
        isLoading={isRefreshing}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-gray-600">Open Tickets</p>
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.stats.openTickets)}</p>
              <p className="text-xs text-gray-500">Awaiting resolution</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-gray-600">Resolved Today</p>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.stats.resolvedToday)}</p>
              <p className="text-xs text-gray-500">Completed tickets</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
              <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.avgResponseTime}</p>
              <p className="text-xs text-gray-500">First response</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-gray-600">Customer Satisfaction</p>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{dashboardData.stats.customerSatisfaction}</p>
              <p className="text-xs text-gray-500">Overall rating</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-gray-600">SLA Breaches</p>
              <div className="h-2 w-2 bg-red-500 rounded-full"></div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.stats.slaBreaches)}</p>
              <p className="text-xs text-gray-500">Exceeded deadline</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-gray-600">Overdue Tickets</p>
              <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.stats.overdueTickets)}</p>
              <p className="text-xs text-gray-500">Past due date</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-gray-600">Unassigned</p>
              <div className="h-2 w-2 bg-gray-500 rounded-full"></div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.stats.unassignedTickets)}</p>
              <p className="text-xs text-gray-500">Need assignment</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium text-gray-600">IT Team Size</p>
              <div className="h-2 w-2 bg-indigo-500 rounded-full"></div>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-gray-900">{formatNumber(dashboardData.stats.totalAgents)}</p>
              <p className="text-xs text-gray-500">Active agents</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tickets by Status Chart */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Tickets by Status</CardTitle>
                <CardDescription className="text-gray-600">Current ticket distribution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusDataWithColors}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill={DASHBOARD_COLORS.chart.primary}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tickets by Priority - Pie Chart */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Tickets by Priority</CardTitle>
                <CardDescription className="text-gray-600">Priority level distribution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityDataWithColors}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {priorityDataWithColors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {priorityDataWithColors.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Weekly Trend</CardTitle>
                <CardDescription className="text-gray-600">Tickets created this week</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData.ticketsTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#64748b' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={DASHBOARD_COLORS.chart.primary}
                    strokeWidth={3}
                    dot={{ fill: DASHBOARD_COLORS.chart.primary, strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8, stroke: DASHBOARD_COLORS.chart.primary, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Agent Workload Distribution */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Agent Workload</CardTitle>
                <CardDescription className="text-gray-600">IT team workload distribution</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workloadDataWithColors}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {workloadDataWithColors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {workloadDataWithColors.map((item, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tickets by Category */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Tickets by Category</CardTitle>
                  <CardDescription className="text-gray-600">Top support categories</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.ticketsByCategory} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      type="number"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b' }}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill={DASHBOARD_COLORS.chart.primary}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resolution Times */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Resolution Times</CardTitle>
                  <CardDescription className="text-gray-600">Time to resolve tickets</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboardData.resolutionTimes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b' }}
                    />
                    <YAxis 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar 
                      dataKey="value" 
                      fill={DASHBOARD_COLORS.chart.secondary}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Agent Performance */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">IT Agent Performance</CardTitle>
              <CardDescription className="text-gray-600">Individual agent metrics and workload</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.agentPerformance.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{agent.name}</h4>
                  <p className="text-sm text-gray-600">
                    {agent.tickets} tickets • {agent.avgResponseTime} avg response
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{agent.resolution}%</p>
                    <p className="text-xs text-gray-500">Resolution rate</p>
                  </div>
                  <div 
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      agent.workload === 'Light' ? 'bg-green-100 text-green-800' :
                      agent.workload === 'Moderate' ? 'bg-blue-100 text-blue-800' :
                      agent.workload === 'Heavy' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    {agent.workload}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 