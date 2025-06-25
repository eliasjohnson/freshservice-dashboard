'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { formatNumber } from '../lib/utils'
import { DashboardData } from '../actions/dashboard'
import { Users, Trophy, Clock, TrendingUp, Activity, Target, AlertCircle } from 'lucide-react'

interface AgentPerformanceProps {
  data?: DashboardData
  refreshKey?: number
  availableAgents?: Array<{ id: number; name: string; department?: string; active?: boolean }>
  timeRange?: string
}

export function AgentPerformance({ data, refreshKey = 0, availableAgents = [], timeRange = 'week' }: AgentPerformanceProps) {
  const [selectedAgent, setSelectedAgent] = useState<number | 'all'>('all')
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
          <p className="mt-4 text-muted-foreground">Loading agent performance data...</p>
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

  const WORKLOAD_COLORS: Record<string, string> = {
    'Light': CHART_COLORS.chart1,
    'Moderate': CHART_COLORS.chart2,
    'Heavy': CHART_COLORS.chart3,
    'Overloaded': CHART_COLORS.chart4
  }

  // Filter agent performance data based on selection
  const filteredAgentData = selectedAgent === 'all' 
    ? data.agentPerformance 
    : data.agentPerformance.filter(agent => agent.id === selectedAgent)

  const selectedAgentDetails = selectedAgent !== 'all' 
    ? data.agentPerformance.find(agent => agent.id === selectedAgent)
    : null

  // Workload distribution with colors
  const workloadDataWithColors = data.agentWorkload.map(item => ({
    ...item,
    color: WORKLOAD_COLORS[item.name] || CHART_COLORS.chart5
  }))

  // Team performance metrics - Enhanced with comprehensive scoring
  const teamStats = {
    totalTickets: data.agentPerformance.reduce((sum, agent) => sum + agent.tickets, 0),
    totalResolved: data.agentPerformance.reduce((sum, agent) => sum + Math.round(agent.tickets * agent.resolution / 100), 0),
    avgResolutionRate: Math.round(data.agentPerformance.reduce((sum, agent) => sum + agent.resolution, 0) / data.agentPerformance.length),
    // Calculate a composite performance score: (tickets_resolved) gives more weight to actual work done
    topPerformer: data.agentPerformance.reduce((best, agent) => {
      const agentResolvedTickets = Math.round(agent.tickets * agent.resolution / 100);
      const bestResolvedTickets = Math.round(best.tickets * best.resolution / 100);
      return agentResolvedTickets > bestResolvedTickets ? agent : best;
    }, data.agentPerformance[0]),
    overloadedAgents: data.agentPerformance.filter(agent => agent.workload === 'Overloaded').length
  }

  // Prepare radar chart data for selected agent
  const getRadarData = (agent: typeof selectedAgentDetails) => {
    if (!agent) return []
    
    return [
      {
        metric: 'Resolution Rate',
        value: agent.resolution,
        fullMark: 100
      },
      {
        metric: 'Ticket Volume',
        value: Math.min((agent.tickets / 50) * 100, 100), // Normalize to 100 scale
        fullMark: 100
      },
      {
        metric: 'Workload Balance',
        value: agent.workload === 'Light' ? 100 : 
               agent.workload === 'Moderate' ? 75 :
               agent.workload === 'Heavy' ? 50 : 25,
        fullMark: 100
      }
    ]
  }

  return (
    <div className="space-y-6">
      {/* Agent Selection and Quick Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Agent Performance</h2>
          <p className="text-muted-foreground">Individual and team analytics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-muted-foreground">Focus on:</span>
            <select 
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">All Agents</option>
              {availableAgents
                .filter(agent => data.agentPerformance.some(perf => perf.id === agent.id))
                .map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                  {agent.department ? ` - ${agent.department}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Team Overview Cards */}
      {selectedAgent === 'all' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(teamStats.totalResolved)}</div>
              <p className="text-xs text-muted-foreground">Tickets resolved ({teamStats.avgResolutionRate}% rate)</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workload</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(teamStats.totalTickets)}</div>
              <p className="text-xs text-muted-foreground">Tickets handled by team</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{teamStats.topPerformer?.name}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round(teamStats.topPerformer?.tickets * teamStats.topPerformer?.resolution / 100)} resolved 
                ({teamStats.topPerformer?.tickets} total)
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Need Attention</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{teamStats.overloadedAgents}</div>
              <p className="text-xs text-muted-foreground">Overloaded agents</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Individual Agent Details */}
      {selectedAgentDetails && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Handled</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(selectedAgentDetails.tickets)}</div>
              <p className="text-xs text-muted-foreground">Total assignments</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                selectedAgentDetails.resolution >= 90 ? 'text-green-600' :
                selectedAgentDetails.resolution >= 80 ? 'text-blue-600' :
                selectedAgentDetails.resolution >= 70 ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {selectedAgentDetails.resolution}%
              </div>
              <p className="text-xs text-muted-foreground">Success rate</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedAgentDetails.avgResponseTime}</div>
              <p className="text-xs text-muted-foreground">Average response</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Workload</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                selectedAgentDetails.workload === 'Light' ? 'text-green-600' :
                selectedAgentDetails.workload === 'Moderate' ? 'text-blue-600' :
                selectedAgentDetails.workload === 'Heavy' ? 'text-orange-600' :
                'text-red-600'
              }`}>
                {selectedAgentDetails.workload}
              </div>
              <p className="text-xs text-muted-foreground">Capacity status</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedAgent === 'all' ? 'Team Performance Comparison' : `${selectedAgentDetails?.name} Performance`}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedAgent === 'all' ? 'Resolution rates across the team' : 'Individual performance metrics'}
            </p>
          </CardHeader>
          <CardContent>
            {selectedAgent === 'all' ? (
              <ResponsiveContainer key={`team-${colorRefreshKey}`} width="100%" height={300}>
                <BarChart 
                  data={filteredAgentData} 
                  margin={{ 
                    top: 20, 
                    right: 30, 
                    left: 20, 
                    bottom: 80 
                  }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215.4 16.3% 25.9%)" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    fontSize={14}
                    stroke="hsl(215.4 16.3% 65.9%)"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    fontSize={16}
                    stroke="hsl(215.4 16.3% 65.9%)"
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
                    formatter={(value, name) => [
                      name === 'resolution' ? `${value}%` : value,
                      name === 'resolution' ? 'Resolution Rate' : 'Tickets'
                    ]} 
                  />
                  <Bar 
                    dataKey="resolution" 
                    fill={CHART_COLORS.chart1} 
                    name="resolution" 
                    radius={[4, 4, 0, 0]}
                    style={{
                      filter: 'brightness(1.1)',
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer key={`agent-${colorRefreshKey}`} width="100%" height={300}>
                <RadarChart data={getRadarData(selectedAgentDetails)}>
                  <PolarGrid 
                    stroke="hsl(215.4 16.3% 25.9%)" 
                    opacity={0.3}
                  />
                  <PolarAngleAxis 
                    dataKey="metric" 
                    fontSize={14}
                    stroke="hsl(215.4 16.3% 65.9%)"
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    fontSize={14}
                    stroke="hsl(215.4 16.3% 65.9%)"
                  />
                  <Radar
                    name="Performance"
                    dataKey="value"
                    stroke={CHART_COLORS.chart2}
                    fill={CHART_COLORS.chart2}
                    fillOpacity={0.3}
                    strokeWidth={3}
                    dot={{ 
                      r: 5, 
                      fill: CHART_COLORS.chart2,
                      stroke: 'white',
                      strokeWidth: 2
                    }}
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
                    formatter={(value) => [`${value}%`, 'Score']} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Workload Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Team Workload Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">Current capacity across agents</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer key={`workload-${colorRefreshKey}`} width="100%" height={300}>
              <BarChart 
                data={workloadDataWithColors} 
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
                  fontSize={16}
                  stroke="hsl(215.4 16.3% 65.9%)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  fontSize={16}
                  stroke="hsl(215.4 16.3% 65.9%)"
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
                  formatter={(value, name) => [value, 'Agents']} 
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {workloadDataWithColors.map((entry, index) => (
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

      {/* Detailed Agent Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedAgent === 'all' ? 'All Agent Details' : `${selectedAgentDetails?.name} - Detailed View`}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Complete performance breakdown
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="relative w-full overflow-auto max-h-[400px]">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b sticky top-0 bg-background">
                  <tr className="border-b transition-colors hover:bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Agent</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tickets</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Resolution Rate</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Response Time</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Workload</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {filteredAgentData.map((agent) => (
                    <tr key={agent.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle font-medium">{agent.name}</td>
                      <td className="p-4 align-middle">{formatNumber(agent.tickets)}</td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center space-x-2">
                          <span className={`font-semibold ${
                            agent.resolution >= 90 ? 'text-green-600' :
                            agent.resolution >= 80 ? 'text-blue-600' :
                            agent.resolution >= 70 ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {agent.resolution}%
                          </span>
                          <div className="w-16 h-2 bg-gray-200 rounded-full">
                            <div 
                              className={`h-2 rounded-full ${
                                agent.resolution >= 90 ? 'bg-green-500' :
                                agent.resolution >= 80 ? 'bg-blue-500' :
                                agent.resolution >= 70 ? 'bg-orange-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${agent.resolution}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">{agent.avgResponseTime}</td>
                      <td className="p-4 align-middle">
                        <div className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          agent.workload === 'Light' ? 'bg-green-100 text-green-700' :
                          agent.workload === 'Moderate' ? 'bg-blue-100 text-blue-700' :
                          agent.workload === 'Heavy' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
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
        </CardContent>
      </Card>
    </div>
  )
} 