'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, PieChart, Pie, Treemap } from 'recharts'
import { formatNumber } from '../lib/utils'
import { DashboardData } from '../actions/dashboard'
import { Activity, CheckCircle, AlertTriangle, Users, Clock, TrendingUp, Target } from 'lucide-react'

// Color palette for charts
const COLORS = {
  chart: {
    blue: 'hsl(221.2 83.2% 53.3%)',
    green: 'hsl(142.1 76.2% 36.3%)',
    orange: 'hsl(24.6 95% 53.1%)',
    red: 'hsl(0 84.2% 60.2%)',
    purple: 'hsl(262.1 83.3% 57.8%)',
    gray: 'hsl(215.4 16.3% 46.9%)',
    yellow: 'hsl(47.9 95.8% 53.1%)',
    cyan: 'hsl(189.6 94.5% 42.7%)',
  }
}

const STATUS_COLORS: Record<string, string> = {
  'Open': COLORS.chart.blue,
  'Pending': COLORS.chart.orange,
  'Hold': COLORS.chart.yellow,
  'Waiting on Customer': COLORS.chart.purple,
  'Resolved': COLORS.chart.green,
  'Closed': COLORS.chart.gray,
}

const PRIORITY_COLORS: Record<string, string> = {
  'Low': COLORS.chart.green,
  'Medium': COLORS.chart.blue,
  'High': COLORS.chart.orange,
  'Urgent': COLORS.chart.red
}

interface OverviewProps {
  data?: DashboardData
  refreshKey?: number
}

export function Overview({ data, refreshKey = 0 }: OverviewProps) {
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

  // Filter to show only active tickets for better executive view
  const activeStatusData = data.ticketsByStatus
    .filter(item => item.name !== 'Closed' && item.name !== 'Resolved')
    .map(item => ({
      ...item,
      color: STATUS_COLORS[item.name] || COLORS.chart.gray
    }))

  const priorityDataWithColors = data.ticketsByPriority.map(item => ({
    ...item,
    color: PRIORITY_COLORS[item.name] || COLORS.chart.gray
  }))

  // Fallback data
  const safeStatusData = activeStatusData.length > 0 ? activeStatusData : [
    { name: 'No Data', value: 0, color: COLORS.chart.gray }
  ]
  
  const safePriorityData = priorityDataWithColors.length > 0 ? priorityDataWithColors : [
    { name: 'No Data', value: 0, color: COLORS.chart.gray }
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
            <ResponsiveContainer key={`status-${refreshKey}`} width="100%" height={300}>
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
            <ResponsiveContainer key={`priority-${refreshKey}`} width="100%" height={300}>
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
            <ResponsiveContainer key={`trend-${refreshKey}`} width="100%" height={250}>
              <LineChart data={data.ticketsTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={COLORS.chart.blue} 
                  strokeWidth={3}
                  dot={{ fill: COLORS.chart.blue, strokeWidth: 2, r: 5 }}
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
            <ResponsiveContainer key={`departments-${refreshKey}`} width="100%" height={250}>
              <Treemap
                data={data.ticketsByCategory}
                dataKey="value"
                aspectRatio={4/3}
                stroke="#fff"
                fill={COLORS.chart.blue}
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
          <ResponsiveContainer key={`resolution-${refreshKey}`} width="100%" height={250}>
            <BarChart data={data.resolutionTimes} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value, name) => [value, 'Tickets']} />
              <Bar dataKey="value" fill={COLORS.chart.green} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
} 