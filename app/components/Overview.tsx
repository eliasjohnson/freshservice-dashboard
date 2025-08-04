'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { XAxis, YAxis, CartesianGrid, LineChart, Line, BarChart, Bar, Cell, PieChart, Pie, Area, AreaChart } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "./ui/chart"
import { formatNumber } from '../lib/utils'
import { DashboardData } from '../actions/dashboard'
import { Activity, CheckCircle, AlertTriangle, Users, Clock, TrendingUp, Target, Award, Timer, Zap } from 'lucide-react'
import { FunnelChart } from './FunnelChart'

const STAGE_COLORS = [
  'hsl(221.2 83.2% 53.3%)', // blue-600
  'hsl(215.3 78.2% 55.3%)', // blue-500
  'hsl(210.2 73.2% 58.3%)', // blue-400
  'hsl(160.1 66.2% 40.3%)', // green-500
  'hsl(142.1 76.2% 36.3%)', // green-600
]

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

  // Static chart colors - vibrant and distinct for better readability
  const CHART_COLORS = {
    blue: 'hsl(221.2, 83.2%, 53.3%)',
    orange: 'hsl(24.6, 95%, 53.1%)',
    purple: 'hsl(262.1, 83.3%, 57.8%)',
    yellow: 'hsl(47.9, 95.8%, 53.1%)',
    green: 'hsl(142.1, 76.2%, 36.3%)',
    red: 'hsl(0, 84.2%, 60.2%)',
  }

  const STATUS_COLORS: Record<string, string> = {
    'Open': CHART_COLORS.blue,
    'Pending': CHART_COLORS.orange,
    'Hold': CHART_COLORS.yellow,
    'Waiting on Customer': CHART_COLORS.purple,
    'Resolved': CHART_COLORS.green,
    'Closed': 'hsl(215.4, 16.3%, 46.9%)',
  }

  const PRIORITY_COLORS: Record<string, string> = {
    'Low': CHART_COLORS.green,
    'Medium': CHART_COLORS.blue,
    'High': CHART_COLORS.orange,
    'Urgent': CHART_COLORS.red,
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
          description: 'Monthly volume over the current quarter'
        }
      case 'q1':
        return {
          title: 'Q1 Ticket Trend',
          description: 'Monthly volume for Q1 (Jan-Mar)'
        }
      case 'q2':
        return {
          title: 'Q2 Ticket Trend',
          description: 'Monthly volume for Q2 (Apr-Jun)'
        }
      case 'q3':
        return {
          title: 'Q3 Ticket Trend',
          description: 'Monthly volume for Q3 (Jul-Sep)'
        }
      case 'q4':
        return {
          title: 'Q4 Ticket Trend',
          description: 'Monthly volume for Q4 (Oct-Dec)'
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
            <p className="text-xs text-muted-foreground">
              {timeRange === 'today' ? 'Active today' : 
               timeRange === 'week' ? 'From this week' : 
               timeRange === 'month' ? 'From this month' : 
               timeRange === 'quarter' ? 'From this quarter' :
               timeRange === 'q1' ? 'From Q1 (Jan-Mar)' :
               timeRange === 'q2' ? 'From Q2 (Apr-Jun)' :
               timeRange === 'q3' ? 'From Q3 (Jul-Sep)' :
               timeRange === 'q4' ? 'From Q4 (Oct-Dec)' :
               'From selected period'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="dark:bg-slate-950/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal">Resolution Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-500">{resolutionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {timeRange === 'today' ? 'Resolved today' : 
               timeRange === 'week' ? 'This week\'s rate' : 
               timeRange === 'month' ? 'This month\'s rate' : 
               timeRange === 'quarter' ? 'This quarter\'s rate' :
               timeRange === 'q1' ? 'Q1 resolution rate' :
               timeRange === 'q2' ? 'Q2 resolution rate' :
               timeRange === 'q3' ? 'Q3 resolution rate' :
               timeRange === 'q4' ? 'Q4 resolution rate' :
               'Selected period rate'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="dark:bg-slate-950/50 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-normal">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground opacity-50" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{data.stats.avgResponseTime}</div>
            <p className="text-xs text-muted-foreground">
              {timeRange === 'today' ? 'Today\'s average' : 
               timeRange === 'week' ? 'This week\'s average' : 
               timeRange === 'month' ? 'This month\'s average' : 
               timeRange === 'quarter' ? 'This quarter\'s average' :
               timeRange === 'q1' ? 'Q1 average' :
               timeRange === 'q2' ? 'Q2 average' :
               timeRange === 'q3' ? 'Q3 average' :
               timeRange === 'q4' ? 'Q4 average' :
               'Selected period average'}
            </p>
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
            <p className="text-xs text-muted-foreground">
              {timeRange === 'today' ? 'Today\'s SLA status' : 
               timeRange === 'week' ? 'This week\'s SLA' : 
               timeRange === 'month' ? 'This month\'s SLA' : 
               timeRange === 'quarter' ? 'This quarter\'s SLA' :
               timeRange === 'q1' ? 'Q1 SLA status' :
               timeRange === 'q2' ? 'Q2 SLA status' :
               timeRange === 'q3' ? 'Q3 SLA status' :
               timeRange === 'q4' ? 'Q4 SLA status' :
               'Selected period SLA'}
            </p>
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
                    <span className="text-xs">
                      {timeRange === 'today' ? 'Today\'s' : 
                       timeRange === 'week' ? 'This Week\'s' : 
                       timeRange === 'month' ? 'This Month\'s' : 
                       timeRange === 'quarter' ? 'This Quarter\'s' :
                       timeRange === 'q1' ? 'Q1' :
                       timeRange === 'q2' ? 'Q2' :
                       timeRange === 'q3' ? 'Q3' :
                       timeRange === 'q4' ? 'Q4' : 'Selected Period\'s'} Resolutions
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-green-500">{formatNumber(data.stats.resolvedToday)}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Award className="mr-1.5 h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs">Resolution Rate</span>
                  </div>
                  <div className="text-xl font-semibold text-green-500">{data.stats.resolutionRate}%</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Timer className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs">Avg Resolution Time</span>
                  </div>
                  <div className="text-xl font-semibold text-blue-500">{data.stats.avgResolutionTime}</div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center">
                    <Zap className="mr-1.5 h-3.5 w-3.5 text-purple-500" />
                    <span className="text-xs">First Call Resolution</span>
                  </div>
                  <div className="text-xl font-semibold text-purple-500">{data.stats.firstCallResolution}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Tickets by Status with Insights */}
          <Card className="dark:bg-slate-950/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Tickets by Status</CardTitle>
              <p className="text-xs text-muted-foreground">Current status distribution for {timeRange === 'today' ? 'today' : timeRange === 'week' ? 'this week' : timeRange === 'month' ? 'this month' : timeRange === 'quarter' ? 'this quarter' : timeRange === 'q1' ? 'Q1 (Jan-Mar)' : timeRange === 'q2' ? 'Q2 (Apr-Jun)' : timeRange === 'q3' ? 'Q3 (Jul-Sep)' : timeRange === 'q4' ? 'Q4 (Oct-Dec)' : 'selected period'}</p>
            </CardHeader>
            <CardContent className="pt-2 pb-2 px-4">
              <ChartContainer
                key={`status-bar-${colorRefreshKey}`}
                config={{
                  open: {
                    label: "Open",
                    color: "hsl(221.2, 83.2%, 53.3%)",
                  },
                  pending: {
                    label: "Pending",
                    color: "hsl(24.6, 95%, 53.1%)",
                  },
                  hold: {
                    label: "Hold",
                    color: "hsl(47.9, 95.8%, 53.1%)",
                  },
                  waiting: {
                    label: "Waiting on Customer",
                    color: "hsl(262.1, 83.3%, 57.8%)",
                  },
                }}
                className="h-[200px] w-full"
              >
                <BarChart data={safeStatusData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    fontSize={11}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={4}>
                    {safeStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              
              {/* Chart Insights */}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  {(() => {
                    const total = safeStatusData.reduce((sum, item) => sum + item.value, 0);
                    const mostCommon = safeStatusData.reduce((max, item) => 
                      item.value > max.value ? item : max, safeStatusData[0]);
                    const percent = total > 0 ? Math.round((mostCommon.value / total) * 100) : 0;
                    
                    return `${percent}% of tickets are ${mostCommon.name.toLowerCase()}`;
                  })()}
                </div>
                <Activity className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Funnel Details, Priority, and Trend */}
        <div className="space-y-3">
          {/* Funnel Stage Details */}
          <Card className="dark:bg-slate-950/50 border-slate-800 h-[320px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Stage Details</CardTitle>
              <p className="text-xs text-muted-foreground">Detailed breakdown of the ticket funnel</p>
            </CardHeader>
            <CardContent className="overflow-y-auto h-[260px] px-4 pt-2 pb-2">
              <ul className="space-y-3">
                {data.ticketLifecycleFunnel.map((stage, index) => {
                  // For status-based funnel, show conversion rates instead of traditional drop-offs
                  let conversionInfo = null;
                  
                  if (index === 1) { // Active stage
                    const conversionRate = data.ticketLifecycleFunnel[0].value > 0 
                      ? (stage.value / data.ticketLifecycleFunnel[0].value) * 100 
                      : 0;
                    conversionInfo = {
                      text: `${conversionRate.toFixed(1)}% of submitted tickets`,
                      color: conversionRate > 70 ? 'text-orange-400' : 'text-muted-foreground'
                    };
                  } else if (index === 2) { // Resolved stage
                    const resolutionRate = data.ticketLifecycleFunnel[0].value > 0 
                      ? (stage.value / data.ticketLifecycleFunnel[0].value) * 100 
                      : 0;
                    conversionInfo = {
                      text: `${resolutionRate.toFixed(1)}% completion rate`,
                      color: resolutionRate < 50 ? 'text-red-400' : resolutionRate < 70 ? 'text-yellow-400' : 'text-green-400'
                    };
                  }

                  return (
                    <li key={index} className="border-b border-slate-800 pb-2 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span 
                            className="w-2.5 h-2.5 rounded-full mr-3 shrink-0" 
                            style={{ backgroundColor: STAGE_COLORS[index % STAGE_COLORS.length] }}
                          ></span>
                          <span className="font-semibold text-sm">{stage.name}</span>
                        </div>
                        <span className="text-base font-bold">{formatNumber(stage.value)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 pl-[22px]">{stage.description}</p>
                      {conversionInfo && (
                        <div className={`text-xs mt-1 pl-[22px] ${conversionInfo.color}`}>
                          {conversionInfo.text}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          {/* Priority Distribution with Insights */}
          <Card className="dark:bg-slate-950/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Priority Breakdown</CardTitle>
              <p className="text-xs text-muted-foreground">Ticket urgency distribution</p>
            </CardHeader>
            <CardContent className="pt-2 pb-3 px-4">
              <ChartContainer
                key={`priority-${colorRefreshKey}`}
                config={{
                  low: {
                    label: "Low",
                    color: "hsl(142.1, 76.2%, 36.3%)",
                  },
                  medium: {
                    label: "Medium", 
                    color: "hsl(221.2, 83.2%, 53.3%)",
                  },
                  high: {
                    label: "High",
                    color: "hsl(24.6, 95%, 53.1%)",
                  },
                  urgent: {
                    label: "Urgent",
                    color: "hsl(0, 84.2%, 60.2%)",
                  },
                }}
                className="h-[140px] w-full"
              >
                <BarChart data={safePriorityData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    fontSize={12}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <Bar dataKey="value" radius={4}>
                    {safePriorityData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
              
              {/* Chart Insights */}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  {(() => {
                    const total = safePriorityData.reduce((sum, item) => sum + item.value, 0);
                    const urgent = safePriorityData.find(item => item.name === 'Urgent')?.value || 0;
                    const high = safePriorityData.find(item => item.name === 'High')?.value || 0;
                    const criticalPercent = total > 0 ? Math.round(((urgent + high) / total) * 100) : 0;
                    
                    if (criticalPercent > 50) {
                      return `${criticalPercent}% critical priority tickets`;
                    } else if (criticalPercent > 25) {
                      return `${criticalPercent}% high priority • manageable load`;
                    } else {
                      return `${criticalPercent}% critical • healthy distribution`;
                    }
                  })()}
                </div>
                <AlertTriangle className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          {/* Trend Chart with Insights */}
          <Card className="dark:bg-slate-950/50 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">{trendInfo.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{trendInfo.description}</p>
            </CardHeader>
            <CardContent className="pt-2 pb-3 px-4">
              <ChartContainer
                key={`trend-${colorRefreshKey}`}
                config={{
                  tickets: {
                    label: "Tickets",
                    color: "hsl(var(--primary))",
                  },
                }}
                className="h-[140px] w-full"
              >
                <AreaChart data={data.ticketsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={12}
                  />
                  <YAxis
                    tickLine={false}
                    axialLine={false}
                    tickMargin={8}
                    fontSize={12}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="value"
                    type="monotone"
                    fill="var(--color-tickets)"
                    fillOpacity={0.4}
                    stroke="var(--color-tickets)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
              
              {/* Chart Insights */}
              <div className="mt-3 flex items-center gap-2 text-sm">
                <div className="flex gap-2 font-medium leading-none">
                  {(() => {
                    const values = data.ticketsTrend.map(d => d.value);
                    const total = values.reduce((sum, val) => sum + val, 0);
                    const average = Math.round(total / values.length);
                    const peak = Math.max(...values);
                    const peakIndex = values.indexOf(peak);
                    const peakPeriod = data.ticketsTrend[peakIndex]?.name;
                    
                    if (timeRange === 'today') {
                      return `Peak activity: ${peakPeriod} (${peak} tickets)`;
                    } else if (timeRange === 'week') {
                      return `${average} avg daily tickets • Peak: ${peakPeriod}`;
                    } else if (timeRange === 'month') {
                      return `${average} avg weekly tickets • Peak: ${peakPeriod}`;
                    } else {
                      return `${average} avg monthly tickets • Peak: ${peakPeriod}`;
                    }
                  })()}
                </div>
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>




    </div>
  )
} 