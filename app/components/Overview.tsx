'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, PieChart, Pie, Treemap } from 'recharts'
import { formatNumber } from '../lib/utils'
import { DashboardData } from '../actions/dashboard'
import { Activity, CheckCircle, AlertTriangle, Users, Clock, TrendingUp, Target } from 'lucide-react'

interface OverviewProps {
  data?: DashboardData
  refreshKey?: number
}

export function Overview({ data, refreshKey = 0 }: OverviewProps) {
  const [colorRefreshKey, setColorRefreshKey] = useState(0)

  // Force chart re-render when refreshKey changes
  useEffect(() => {
    setColorRefreshKey(prev => prev + 1)
  }, [refreshKey])

  // Handle case when data is not yet loaded
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading overview data...</p>
        </div>
      </div>
    )
  }

  // Static chart colors
  const CHART_COLORS = {
    chart1: 'hsl(12 76% 61%)',
    chart2: 'hsl(173 58% 39%)',
    chart3: 'hsl(197 37% 24%)',
    chart4: 'hsl(43 74% 66%)',
    chart5: 'hsl(27 87% 67%)'
  }

  const STATUS_COLORS: Record<string, string> = {
    'Open': CHART_COLORS.chart2,
    'Pending': CHART_COLORS.chart3,
    'Hold': CHART_COLORS.chart4,
    'Waiting on Customer': CHART_COLORS.chart5,
    'Resolved': CHART_COLORS.chart1,
    'Closed': 'hsl(215.4 16.3% 46.9%)',
  }

  const PRIORITY_COLORS: Record<string, string> = {
    'Low': CHART_COLORS.chart1,
    'Medium': CHART_COLORS.chart2,
    'High': CHART_COLORS.chart3,
    'Urgent': CHART_COLORS.chart4
  }

  // Filter to show only active tickets for better executive view
  const activeStatusData = data.ticketsByStatus
    .filter(item => item.name !== 'Closed' && item.name !== 'Resolved')
    .map(item => ({
      ...item,
      color: STATUS_COLORS[item.name] || 'hsl(215.4 16.3% 46.9%)'
    }))

  const priorityDataWithColors = data.ticketsByPriority.map(item => ({
    ...item,
    color: PRIORITY_COLORS[item.name] || 'hsl(215.4 16.3% 46.9%)'
  }))

  // Fallback data
  const safeStatusData = activeStatusData.length > 0 ? activeStatusData : [
    { name: 'No Data', value: 0, color: 'hsl(215.4 16.3% 46.9%)' }
  ]
  
  const safePriorityData = priorityDataWithColors.length > 0 ? priorityDataWithColors : [
    { name: 'No Data', value: 0, color: 'hsl(215.4 16.3% 46.9%)' }
  ]

  // Executive KPI calculations
  const totalTickets = data.ticketsByStatus.reduce((sum, item) => sum + item.value, 0)
  const resolvedTickets = data.ticketsByStatus.find(item => item.name === 'Resolved')?.value || 0
  const closedTickets = data.ticketsByStatus.find(item => item.name === 'Closed')?.value || 0
  const resolutionRate = totalTickets > 0 ? Math.round(((resolvedTickets + closedTickets) / totalTickets) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Executive KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.stats.openTickets)}</div>
            <p className="text-xs text-muted-foreground">
              Requiring attention
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolutionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Of all tickets resolved
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">
              First response time
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.stats.slaBreaches > 0 ? (
                <span className="text-red-600">{data.stats.slaBreaches} breaches</span>
              ) : (
                <span className="text-green-600">On track</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              SLA compliance status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Resolutions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.stats.resolvedToday)}</div>
            <p className="text-xs text-muted-foreground">Tickets closed today</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatNumber(data.stats.overdueTickets)}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.stats.totalAgents)}</div>
            <p className="text-xs text-muted-foreground">Active agents</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.stats.customerSatisfaction}</div>
            <p className="text-xs text-muted-foreground">Overall rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Executive Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Tickets Status */}
        <Card>
          <CardHeader>
            <CardTitle>Active Tickets by Status</CardTitle>
            <p className="text-sm text-muted-foreground">Current workload breakdown</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer key={`status-${colorRefreshKey}`} width="100%" height={300}>
              <BarChart data={safeStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value, name) => [value, 'Tickets']} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {safeStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Urgency breakdown</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer key={`priority-${colorRefreshKey}`} width="100%" height={300}>
              <PieChart>
                <Pie
                  data={safePriorityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={40}
                  dataKey="value"
                  stroke="#fff"
                  strokeWidth={2}
                >
                  {safePriorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, 'Tickets']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Ticket Trend</CardTitle>
            <p className="text-sm text-muted-foreground">Daily volume over the past week</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer key={`trend-${colorRefreshKey}`} width="100%" height={250}>
              <LineChart data={data.ticketsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={CHART_COLORS.chart1} 
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.chart1, strokeWidth: 2, r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Requests by Department</CardTitle>
            <p className="text-sm text-muted-foreground">Which teams need most support</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer key={`departments-${colorRefreshKey}`} width="100%" height={250}>
              <Treemap
                data={data.ticketsByCategory}
                dataKey="value"
                aspectRatio={4/3}
                stroke="#fff"
                fill={CHART_COLORS.chart2}
              >
                <Tooltip 
                  labelFormatter={(label) => `Department: ${label}`}
                  formatter={(value) => [`${value} tickets`, 'Count']}
                />
              </Treemap>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Resolution Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Time Analysis</CardTitle>
          <p className="text-sm text-muted-foreground">How quickly tickets are being resolved</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer key={`resolution-${colorRefreshKey}`} width="100%" height={250}>
            <BarChart data={data.resolutionTimes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value, name) => [value, 'Tickets']} />
              <Bar dataKey="value" fill={CHART_COLORS.chart3} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
} 