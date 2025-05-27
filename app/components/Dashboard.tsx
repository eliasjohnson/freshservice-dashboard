'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { formatNumber, formatDate, formatHours } from '../lib/utils'
import { useState } from 'react'
import { DashboardData, DashboardFilters, fetchDashboardData, testApiConnection } from '../actions/dashboard'
import FilterBar from './FilterBar'
import Link from 'next/link'
import { Info } from 'lucide-react'

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

// Mock data for fallback when API fails
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

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setCurrentError(null)
    
    try {
      console.log('🔄 Refreshing dashboard data with filters:', filters)
      const result = await fetchDashboardData(filters)
      
      if (result.success && result.data) {
        setDashboardData(result.data)
        setIsUsingMockData(false)
        setConnectionStatus('connected')
        console.log('✅ Dashboard refreshed successfully')
      } else {
        console.warn('⚠️ Refresh failed, keeping current data:', result.error)
        setCurrentError(result.error || 'Failed to refresh data')
        setConnectionStatus('failed')
        // Keep current data, don't fall back to mock
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
        // Automatically refresh data after successful connection test
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
    <div className="min-h-screen" style={{ backgroundColor: DASHBOARD_COLORS.background }}>
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Freshservice Dashboard</h1>
              <p className="text-gray-600 mt-2">Monitor your support tickets and team performance</p>
              
              {/* Status indicator */}
              <div className="flex items-center mt-3 space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'testing' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm text-gray-600">
                    {connectionStatus === 'connected' ? 'Connected to Freshservice' :
                     connectionStatus === 'testing' ? 'Testing connection...' :
                     'Connection issues'}
                  </span>
                </div>
                
                {isUsingMockData && (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full border border-orange-200">
                    Using sample data
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Link href="/about">
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="flex items-center border-gray-300 hover:border-gray-400"
                >
                  <Info className="w-4 h-4 mr-2" />
                  About Metrics
                </Button>
              </Link>
              
              {connectionStatus === 'failed' && (
                <Button 
                  onClick={handleTestConnection}
                  disabled={false}
                  variant="outline"
                  size="lg"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  Test Connection
                </Button>
              )}
              
              {connectionStatus === 'testing' && (
                <Button 
                  disabled={true}
                  variant="outline"
                  size="lg"
                  className="border-gray-300"
                >
                  Testing...
                </Button>
              )}
              
              <Button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                size="lg"
                style={{ backgroundColor: DASHBOARD_COLORS.primary }}
                className="text-white hover:opacity-90"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </div>
          </div>

          {/* Error display */}
          {currentError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-red-800">API Error</h4>
                  <p className="text-sm text-red-700 mt-1">{currentError}</p>
                </div>
                <Button
                  onClick={() => setCurrentError(null)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Filter Bar */}
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          onApplyFilters={handleApplyFilters}
          isLoading={isRefreshing}
        />

        {/* Enhanced Overview Cards with consistent colors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Tickets</CardTitle>
              <div className="text-gray-400">📋</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(dashboardData.ticketsByStatus.reduce((sum, item) => sum + item.value, 0))}
              </div>
              <p className="text-xs text-gray-600 mt-1">In selected period</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Open Tickets</CardTitle>
              <div className="text-gray-400">🔵</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.chart.primary }}>
                {formatNumber(dashboardData.stats.openTickets)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Currently open</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">SLA Breaches</CardTitle>
              <div className="text-gray-400">⚠️</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.danger }}>
                {formatNumber(dashboardData.stats.slaBreaches)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Past due date</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Unassigned</CardTitle>
              <div className="text-gray-400">👤</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.warning }}>
                {formatNumber(dashboardData.stats.unassignedTickets)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Need assignment</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Resolved Today</CardTitle>
              <div className="text-gray-400">✅</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.success }}>
                {formatNumber(dashboardData.stats.resolvedToday)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Closed today</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Active Agents</CardTitle>
              <div className="text-gray-400">👥</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.info }}>
                {formatNumber(dashboardData.stats.totalAgents)}
              </div>
              <p className="text-xs text-gray-600 mt-1">Available agents</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Charts Grid with consistent design */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Tickets by Status */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Tickets by Status</CardTitle>
              <CardDescription className="text-gray-600">Current distribution</CardDescription>
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
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Tickets by Priority</CardTitle>
              <CardDescription className="text-gray-600">Priority distribution</CardDescription>
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

          {/* Agent Workload Distribution */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Agent Workload</CardTitle>
              <CardDescription className="text-gray-600">Team capacity overview</CardDescription>
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

        {/* Category and Resolution Analysis Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tickets by Category - Single color for consistency */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Top Categories</CardTitle>
              <CardDescription className="text-gray-600">Most common issue categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.ticketsByCategory} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="value" fill={DASHBOARD_COLORS.chart.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Resolution Times - Single color for consistency */}
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Resolution Time Analysis</CardTitle>
              <CardDescription className="text-gray-600">How quickly tickets are resolved</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.resolutionTimes} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="value" fill={DASHBOARD_COLORS.chart.secondary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Trend Chart - Single color, better design */}
        <Card className="mb-8 border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Weekly Ticket Trend</CardTitle>
            <CardDescription className="text-gray-600">Tickets created in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.ticketsTrend} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="value" fill={DASHBOARD_COLORS.chart.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Enhanced Agent Performance with better layout */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Agent Performance Overview</CardTitle>
            <CardDescription className="text-gray-600">Detailed agent metrics and workload analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Performance Chart with better margins and colors */}
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={dashboardData.agentPerformance}
                  margin={{ top: 20, right: 30, left: 20, bottom: 140 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={140}
                    interval={0}
                    fontSize={11}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'tickets' ? formatNumber(value as number) : `${value}%`,
                      name === 'tickets' ? 'Tickets Handled' : 'Resolution Rate'
                    ]}
                    labelFormatter={(label) => `Agent: ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="tickets" fill={DASHBOARD_COLORS.chart.primary} name="tickets" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="resolution" fill={DASHBOARD_COLORS.chart.secondary} name="resolution" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              {/* Agent Details Table with improved spacing */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-100" style={{ backgroundColor: DASHBOARD_COLORS.neutralLight }}>
                      <th className="text-left p-4 font-semibold text-gray-700 min-w-[160px]">Agent</th>
                      <th className="text-right p-4 font-semibold text-gray-700 min-w-[80px]">Tickets</th>
                      <th className="text-right p-4 font-semibold text-gray-700 min-w-[100px]">Resolution Rate</th>
                      <th className="text-right p-4 font-semibold text-gray-700 min-w-[110px]">Avg Response</th>
                      <th className="text-center p-4 font-semibold text-gray-700 min-w-[100px]">Workload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.agentPerformance.map((agent, index) => (
                      <tr key={agent.id} className="border-b border-gray-50 hover:bg-gray-25 transition-colors">
                        <td className="p-4 font-medium text-gray-900">
                          <div className="truncate max-w-[150px]" title={agent.name}>
                            {agent.name}
                          </div>
                        </td>
                        <td className="text-right p-4 text-gray-700">
                          <span className="font-medium">{formatNumber(agent.tickets)}</span>
                        </td>
                        <td className="text-right p-4">
                          <span className={`font-semibold ${
                            agent.resolution >= 90 ? 'text-green-600' :
                            agent.resolution >= 80 ? 'text-blue-600' :
                            agent.resolution >= 70 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {agent.resolution}%
                          </span>
                        </td>
                        <td className="text-right p-4 text-gray-700 font-medium">
                          {agent.avgResponseTime}
                        </td>
                        <td className="text-center p-4">
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium text-white"
                            style={{ 
                              backgroundColor: WORKLOAD_COLORS[agent.workload] || DASHBOARD_COLORS.neutral 
                            }}
                          >
                            {agent.workload}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Stats with consistent colors */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.chart.primary }}>
                    {dashboardData.agentPerformance.length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Active Agents</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.success }}>
                    {Math.round(dashboardData.agentPerformance.reduce((sum, agent) => sum + agent.resolution, 0) / dashboardData.agentPerformance.length)}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Avg Resolution Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.info }}>
                    {formatNumber(dashboardData.agentPerformance.reduce((sum, agent) => sum + agent.tickets, 0))}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Tickets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: DASHBOARD_COLORS.danger }}>
                    {dashboardData.agentWorkload.find(w => w.name === 'Overloaded')?.value || 0}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Overloaded Agents</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 