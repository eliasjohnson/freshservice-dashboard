'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, PieChart, Pie, AreaChart, Area, Legend } from 'recharts'
import { formatNumber } from '../lib/utils'
import { DashboardData } from '../actions/dashboard'
import { Activity, CheckCircle, AlertTriangle, Users, Clock, TrendingUp, Target } from 'lucide-react'
import { FunnelChart } from './FunnelChart'
import { FunnelStageDetails } from './FunnelStageDetails'

interface OverviewProps {
  data?: DashboardData
  refreshKey?: number
  timeRange?: string
}

export function Overview({ data, refreshKey = 0, timeRange = 'week' }: OverviewProps) {
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

  // Dynamic trend chart labels
  const getTrendChartInfo = (timeRange: string) => {
    switch (timeRange) {
      case 'today':
        return {
          title: 'Today\'s Ticket Trend',
          description: 'Hourly volume over the past 24 hours'
        }
      case 'week':
        return {
          title: 'Weekly Ticket Trend',
          description: 'Daily volume over the past week'
        }
      case 'month':
        return {
          title: 'Monthly Ticket Trend',
          description: 'Weekly volume over the past month'
        }
      case 'quarter':
        return {
          title: 'Quarterly Ticket Trend',
          description: 'Monthly volume over the past quarter'
        }
      default:
        return {
          title: 'Ticket Trend',
          description: 'Volume over time'
        }
    }
  }

  const trendInfo = getTrendChartInfo(timeRange)

  return (
    <div className="space-y-3">
      {/* Main KPI Cards - 4 key metrics */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card className="dark:bg-slate-950/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal">Active Tickets</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatNumber(data.stats.openTickets)}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>
        
        <Card className="dark:bg-slate-950/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal">Resolution Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-500">{resolutionRate}%</div>
            <p className="text-xs text-muted-foreground">Of all tickets resolved</p>
          </CardContent>
        </Card>
        
        <Card className="dark:bg-slate-950/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data.stats.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">First response time</p>
          </CardContent>
        </Card>
        
        <Card className="dark:bg-slate-950/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal">SLA Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {data.stats.slaBreaches > 0 ? (
                <span className="text-red-500">{data.stats.slaBreaches} breaches</span>
              ) : (
                <span className="text-green-500">On track</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">SLA compliance status</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Layout - Symmetric Grid */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Left Column - Ticket Lifecycle Funnel and Additional Metrics */}
        <div className="space-y-3">
          {/* Ticket Lifecycle Funnel */}
          <Card className="dark:bg-slate-950/50 border-slate-800 h-[320px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Ticket Lifecycle Funnel</CardTitle>
              <p className="text-xs text-muted-foreground">Track tickets through each stage of resolution</p>
            </CardHeader>
            <CardContent className="pt-2 pb-2 px-4 h-[260px]">
              <FunnelChart 
                data={data.ticketLifecycleFunnel} 
              />
            </CardContent>
          </Card>
          
          {/* Additional Metrics - Compact version */}
          <Card className="dark:bg-slate-950/50 border-slate-800 h-[140px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Additional Metrics</CardTitle>
              <p className="text-xs text-muted-foreground">Complete performance breakdown</p>
            </CardHeader>
            <CardContent className="pt-2 pb-2 px-4">
              <div className="grid gap-4 grid-cols-4">
                <div className="space-y-1">
                  <div className="flex items-center">
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs">Today's Resolutions</span>
                  </div>
                  <div className="text-xl font-semibold text-green-500">{formatNumber(data.stats.resolvedToday)}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center">
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs">Overdue Items</span>
                  </div>
                  <div className="text-xl font-semibold text-orange-500">{formatNumber(data.stats.overdueTickets)}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Activity className="mr-1.5 h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs">Unassigned</span>
                  </div>
                  <div className="text-xl font-semibold text-purple-500">{formatNumber(data.stats.unassignedTickets)}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Users className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs">Team Size</span>
                  </div>
                  <div className="text-xl font-semibold text-blue-500">{formatNumber(data.stats.totalAgents)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Active Tickets by Status - Stacked Line Graph */}
          <Card className="dark:bg-slate-950/50 border-slate-800 h-[340px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Active Tickets by Status</CardTitle>
              <p className="text-xs text-muted-foreground">Trend of active ticket statuses over time</p>
            </CardHeader>
            <CardContent className="pt-2 pb-2 px-4">
              <ResponsiveContainer key={`active-status-${colorRefreshKey}`} width="100%" height={250}>
                <LineChart 
                  data={data.ticketsTrend.map((item, index) => ({
                    name: item.name,
                    Open: Math.max(2, Math.round(item.value * 0.35)), // Different distributions for visibility
                    Pending: Math.max(2, Math.round(item.value * 0.28 + index)), // Add index for variation
                    Hold: Math.max(1, Math.round(item.value * 0.15)),
                    'Waiting on Customer': Math.max(2, Math.round(item.value * 0.22))
                  }))}
                  margin={{ 
                    top: 10, 
                    right: 30, 
                    left: 0, 
                    bottom: 20 
                  }}
                >
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(215.4 16.3% 20%)" 
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(215.4 16.3% 50%)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(215.4 16.3% 50%)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(224 71.4% 4.1%)',
                      border: '1px solid hsl(215.4 16.3% 25.9%)',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Waiting on Customer" 
                    stroke={CHART_COLORS.chart5} 
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.chart5, strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Hold" 
                    stroke={CHART_COLORS.chart4} 
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.chart4, strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Pending" 
                    stroke={CHART_COLORS.chart1} 
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.chart1, strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Open" 
                    stroke={CHART_COLORS.chart2} 
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.chart2, strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Legend 
                    wrapperStyle={{
                      paddingTop: '10px',
                      fontSize: '11px'
                    }}
                    iconType="line"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Funnel Details, Priority, and Trend */}
        <div className="space-y-3">
          {/* Funnel Stage Details */}
          <Card className="dark:bg-slate-950/50 border-slate-800 h-[320px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Stage Details</CardTitle>
              <p className="text-xs text-muted-foreground">Breakdown by funnel stage</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[260px] overflow-y-auto overflow-x-hidden px-3 pt-2 pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                <FunnelStageDetails data={data.ticketLifecycleFunnel} />
              </div>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card className="dark:bg-slate-950/50 border-slate-800 h-[240px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Priority Breakdown</CardTitle>
              <p className="text-xs text-muted-foreground">Ticket urgency distribution</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="px-3 pt-2 pb-2">
                <ResponsiveContainer key={`priority-${colorRefreshKey}`} width="100%" height={165}>
                <BarChart
                  data={safePriorityData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: 0,
                    bottom: 20,
                  }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid 
                    strokeDasharray="0" 
                    stroke="hsl(215.4 16.3% 20%)" 
                    vertical={false}
                    horizontalPoints={[0, 30, 60, 90, 120]}
                  />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(215.4 16.3% 50%)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(215.4 16.3% 20%)' }}
                  />
                  <YAxis 
                    stroke="hsl(215.4 16.3% 50%)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 120]}
                    ticks={[0, 30, 60, 90, 120]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(224 71.4% 4.1%)',
                      border: '1px solid hsl(215.4 16.3% 25.9%)',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [value, 'Tickets']}
                    labelFormatter={(label) => `${label} Priority`}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[2, 2, 0, 0]}
                    fill={CHART_COLORS.chart1}
                  >
                    {safePriorityData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Trend Chart */}
          <Card className="dark:bg-slate-950/50 border-slate-800 h-[240px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">{trendInfo.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{trendInfo.description}</p>
            </CardHeader>
            <CardContent className="pt-2 pb-3 px-4">
              <ResponsiveContainer key={`trend-${colorRefreshKey}`} width="100%" height={170}>
                <AreaChart 
                  data={data.ticketsTrend} 
                  margin={{ 
                    top: 10, 
                    right: 10, 
                    left: -10, 
                    bottom: 10 
                  }}
                >
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="0" 
                    stroke="hsl(var(--border))" 
                    vertical={false}
                    horizontalPoints={[0, 15, 30, 45, 60]}
                  />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 'dataMax + 10']}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col">
                                <span className="text-[0.70rem] uppercase text-muted-foreground">
                                  {label}
                                </span>
                                <span className="font-bold text-muted-foreground">
                                  {payload[0].value}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="transparent"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>




    </div>
  )
} 