'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { formatNumber, formatDate, formatHours } from '../lib/utils'
import { useState } from 'react'
import { DashboardData, DashboardFilters, fetchDashboardData, testApiConnection } from '../actions/dashboard'
import FilterBar from './FilterBar'

const PRIORITY_COLORS: Record<string, string> = {
  'Low': '#94a3b8',
  'Medium': '#64748b', 
  'High': '#475569',
  'Urgent': '#0f172a'
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

  // Add colors to priority data for the pie chart
  const priorityDataWithColors = dashboardData.ticketsByPriority.map(item => ({
    ...item,
    color: PRIORITY_COLORS[item.name] || '#64748b'
  }))

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Freshservice Dashboard</h1>
              <p className="text-muted-foreground mt-2">Monitor your support tickets and team performance</p>
              
              {/* Status indicator */}
              <div className="flex items-center mt-3 space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'testing' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm text-muted-foreground">
                    {connectionStatus === 'connected' ? 'Connected to Freshservice' :
                     connectionStatus === 'testing' ? 'Testing connection...' :
                     'Connection issues'}
                  </span>
                </div>
                
                {isUsingMockData && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    Using sample data
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex space-x-2">
              {connectionStatus === 'failed' && (
                <Button 
                  onClick={handleTestConnection}
                  disabled={false}
                  variant="outline"
                  size="lg"
                >
                  Test Connection
                </Button>
              )}
              
              {connectionStatus === 'testing' && (
                <Button 
                  disabled={true}
                  variant="outline"
                  size="lg"
                >
                  Testing...
                </Button>
              )}
              
              <Button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                variant="outline"
                size="lg"
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

        {/* Enhanced Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">📋</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(dashboardData.ticketsByStatus.reduce((sum, item) => sum + item.value, 0))}
              </div>
              <p className="text-xs text-muted-foreground">In selected period</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">🟢</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatNumber(dashboardData.stats.openTickets)}</div>
              <p className="text-xs text-muted-foreground">Currently open</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">⚠️</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatNumber(dashboardData.stats.slaBreaches)}</div>
              <p className="text-xs text-muted-foreground">Past due date</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">👤</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{formatNumber(dashboardData.stats.unassignedTickets)}</div>
              <p className="text-xs text-muted-foreground">Need assignment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">✅</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatNumber(dashboardData.stats.resolvedToday)}</div>
              <p className="text-xs text-muted-foreground">Closed today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <div className="h-4 w-4 text-muted-foreground">👥</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{formatNumber(dashboardData.stats.totalAgents)}</div>
              <p className="text-xs text-muted-foreground">Available agents</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Tickets by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Tickets by Status</CardTitle>
              <CardDescription>Current distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={dashboardData.ticketsByStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {dashboardData.ticketsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tickets by Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Tickets by Priority</CardTitle>
              <CardDescription>Priority distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={priorityDataWithColors}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
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
          <Card>
            <CardHeader>
              <CardTitle>Agent Workload</CardTitle>
              <CardDescription>Team capacity overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={dashboardData.agentWorkload}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {dashboardData.agentWorkload.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={
                        entry.name === 'Light' ? '#10b981' :
                        entry.name === 'Moderate' ? '#3b82f6' :
                        entry.name === 'Heavy' ? '#f59e0b' :
                        '#ef4444'
                      } />
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
          {/* Tickets by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Top Categories</CardTitle>
              <CardDescription>Most common issue categories</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.ticketsByCategory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Resolution Times */}
          <Card>
            <CardHeader>
              <CardTitle>Resolution Time Analysis</CardTitle>
              <CardDescription>How quickly tickets are resolved</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.resolutionTimes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Trend Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Weekly Ticket Trend</CardTitle>
            <CardDescription>Tickets created in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dashboardData.ticketsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Enhanced Agent Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Performance Overview</CardTitle>
            <CardDescription>Detailed agent metrics and workload analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Performance Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.agentPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'tickets' ? formatNumber(value as number) : `${value}%`,
                      name === 'tickets' ? 'Tickets Handled' : 'Resolution Rate'
                    ]}
                  />
                  <Bar dataKey="tickets" fill="#10b981" name="tickets" />
                  <Bar dataKey="resolution" fill="#3b82f6" name="resolution" />
                </BarChart>
              </ResponsiveContainer>

              {/* Agent Details Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Agent</th>
                      <th className="text-right p-2 font-medium">Tickets</th>
                      <th className="text-right p-2 font-medium">Resolution Rate</th>
                      <th className="text-right p-2 font-medium">Avg Response</th>
                      <th className="text-center p-2 font-medium">Workload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.agentPerformance.map((agent, index) => (
                      <tr key={agent.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{agent.name}</td>
                        <td className="text-right p-2">{formatNumber(agent.tickets)}</td>
                        <td className="text-right p-2">
                          <span className={`${
                            agent.resolution >= 90 ? 'text-green-600' :
                            agent.resolution >= 80 ? 'text-blue-600' :
                            agent.resolution >= 70 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {agent.resolution}%
                          </span>
                        </td>
                        <td className="text-right p-2">{agent.avgResponseTime}</td>
                        <td className="text-center p-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            agent.workload === 'Light' ? 'bg-green-100 text-green-800' :
                            agent.workload === 'Moderate' ? 'bg-blue-100 text-blue-800' :
                            agent.workload === 'Heavy' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {agent.workload}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 