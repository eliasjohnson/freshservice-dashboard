'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, PieChart, Pie, AreaChart, Area } from 'recharts'
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
    <div className="space-y-4">
      {/* Main KPI Cards - 4 key metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tickets</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.stats.openTickets)}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolutionRate}%</div>
            <p className="text-xs text-muted-foreground">Of all tickets resolved</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">First response time</p>
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
            <p className="text-xs text-muted-foreground">SLA compliance status</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts - 2 side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Active Tickets Status */}
        <Card>
          <CardHeader>
            <CardTitle>Active Tickets by Status</CardTitle>
            <p className="text-sm text-muted-foreground">Current workload breakdown</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer key={`status-${colorRefreshKey}`} width="100%" height={300}>
              <BarChart 
                data={safeStatusData} 
                margin={{ 
                  top: 20, 
                  right: 30, 
                  left: 20, 
                  bottom: 5 
                }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215.4 16.3% 25.9%)" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(215.4 16.3% 65.9%)"
                  fontSize={16}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(215.4 16.3% 65.9%)"
                  fontSize={16}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(224 71.4% 4.1%)',
                    border: '1px solid hsl(215.4 16.3% 25.9%)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                  formatter={(value: any) => [value, 'Tickets']} 
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {safeStatusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      style={{
                        filter: 'brightness(1.1)',
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">Ticket urgency distribution</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer key={`priority-${colorRefreshKey}`} width="100%" height={300}>
              <BarChart
                data={safePriorityData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
                barCategoryGap="20%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215.4 16.3% 25.9%)" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(215.4 16.3% 65.9%)"
                  fontSize={16}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(215.4 16.3% 65.9%)"
                  fontSize={16}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(224 71.4% 4.1%)',
                    border: '1px solid hsl(215.4 16.3% 25.9%)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                  }}
                  formatter={(value: any) => [value, 'Tickets']}
                  labelFormatter={(label) => `${label} Priority`}
                />
                <Bar 
                  dataKey="value" 
                  radius={[4, 4, 0, 0]}
                  fill={CHART_COLORS.chart1}
                >
                  {safePriorityData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      style={{
                        filter: 'brightness(1.1)',
                      }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Trend - Full width */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Ticket Trend</CardTitle>
          <p className="text-sm text-muted-foreground">Daily volume over the past week</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer key={`trend-${colorRefreshKey}`} width="100%" height={200}>
            <LineChart 
              data={data.ticketsTrend} 
              margin={{ 
                top: 20, 
                right: 30, 
                left: 20, 
                bottom: 5 
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215.4 16.3% 25.9%)" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                stroke="hsl(215.4 16.3% 65.9%)"
                fontSize={16}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(215.4 16.3% 65.9%)"
                fontSize={16}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(224 71.4% 4.1%)',
                  border: '1px solid hsl(215.4 16.3% 25.9%)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
                formatter={(value: any) => [value, 'Tickets']}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={CHART_COLORS.chart1} 
                strokeWidth={4}
                dot={{ 
                  fill: CHART_COLORS.chart1, 
                  strokeWidth: 3, 
                  r: 6,
                  filter: 'brightness(1.2)'
                }}
                activeDot={{ 
                  r: 9, 
                  stroke: CHART_COLORS.chart1, 
                  strokeWidth: 3, 
                  fill: 'white' 
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Additional Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Metrics</CardTitle>
          <p className="text-sm text-muted-foreground">Complete performance breakdown</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Today's Resolutions</span>
              </div>
              <div className="text-xl font-bold text-green-600">{formatNumber(data.stats.resolvedToday)}</div>
              <p className="text-xs text-muted-foreground">Tickets closed today</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <AlertTriangle className="mr-2 h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Overdue Items</span>
              </div>
              <div className="text-xl font-bold text-orange-600">{formatNumber(data.stats.overdueTickets)}</div>
              <p className="text-xs text-muted-foreground">Past due date</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Team Size</span>
              </div>
              <div className="text-xl font-bold text-blue-600">{formatNumber(data.stats.totalAgents)}</div>
              <p className="text-xs text-muted-foreground">Active agents</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center">
                <TrendingUp className="mr-2 h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Customer Satisfaction</span>
              </div>
              <div className="text-xl font-bold text-green-600">{data.stats.customerSatisfaction}</div>
              <p className="text-xs text-muted-foreground">Overall rating</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 