'use client'

import { useState, useEffect } from 'react'
import { AuthGuard } from '../components/AuthGuard'
import { OptimizedLayout } from '../components/OptimizedLayout'
import { AgentPerformance } from '../components/AgentPerformance'
import { DashboardData, fetchDashboardData, fetchAgentList } from '../actions/dashboard'

export default function AgentsPage() {
  const [data, setData] = useState<DashboardData | undefined>(undefined)
  const [availableAgents, setAvailableAgents] = useState<Array<{ id: number; name: string; department?: string; active?: boolean }>>([])
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'q1' | 'q2' | 'q3' | 'q4'>('week')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashboardResult, agentsResult] = await Promise.all([
          fetchDashboardData({ agentId: 'all', timeRange }),
          fetchAgentList()
        ])

        if (dashboardResult.success && dashboardResult.data) {
          setData(dashboardResult.data)
        }

        if (agentsResult.success && agentsResult.agents) {
          setAvailableAgents(agentsResult.agents)
        }
      } catch (error) {
        console.error('Error loading agent data:', error)
      }
    }

    loadData()
  }, [timeRange])

  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1)
    const result = await fetchDashboardData({ agentId: 'all', timeRange, forceRefresh: true })
    if (result.success && result.data) {
      setData(result.data)
    }
  }

  return (
    <AuthGuard>
      <OptimizedLayout>
        <AgentPerformance 
          data={data}
          availableAgents={availableAgents}
          timeRange={timeRange}
          refreshKey={refreshKey}
        />
      </OptimizedLayout>
    </AuthGuard>
  )
} 