'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { DashboardFilters, fetchAgentList } from '../actions/dashboard'

interface FilterBarProps {
  filters: DashboardFilters
  onFiltersChange: (filters: DashboardFilters) => void
  onApplyFilters: () => void
  isLoading?: boolean
}

interface Agent {
  id: number
  name: string
  department?: string
}

export default function FilterBar({ filters, onFiltersChange, onApplyFilters, isLoading = false }: FilterBarProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loadingAgents, setLoadingAgents] = useState(true)

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      const result = await fetchAgentList()
      if (result.success && result.agents) {
        setAgents(result.agents)
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setLoadingAgents(false)
    }
  }

  const handleAgentChange = (value: string) => {
    const agentId = value === 'all' ? 'all' : parseInt(value)
    onFiltersChange({ ...filters, agentId })
  }

  const handleTimeRangeChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      timeRange: value as DashboardFilters['timeRange'] 
    })
  }

  const handlePriorityChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, priority: undefined })
    } else {
      const priorities = value.split(',').map(p => parseInt(p))
      onFiltersChange({ ...filters, priority: priorities })
    }
  }

  const handleStatusChange = (value: string) => {
    if (value === 'all') {
      onFiltersChange({ ...filters, status: undefined })
    } else {
      const statuses = value.split(',').map(s => parseInt(s))
      onFiltersChange({ ...filters, status: statuses })
    }
  }

  const resetFilters = () => {
    onFiltersChange({
      agentId: 'all',
      timeRange: 'week',
      priority: undefined,
      status: undefined
    })
  }

  const getSelectedAgentName = () => {
    if (filters.agentId === 'all' || !filters.agentId) return 'All Agents'
    const agent = agents.find(a => a.id === filters.agentId)
    return agent ? agent.name : 'Unknown Agent'
  }

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case 'today': return 'Today'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      case 'quarter': return 'This Quarter'
      default: return range
    }
  }

  const getPriorityLabel = () => {
    if (!filters.priority || filters.priority.length === 0) return 'All Priorities'
    const priorityNames = filters.priority.map(p => {
      switch (p) {
        case 1: return 'Low'
        case 2: return 'Medium'
        case 3: return 'High'
        case 4: return 'Urgent'
        default: return 'Unknown'
      }
    })
    return priorityNames.join(', ')
  }

  const getStatusLabel = () => {
    if (!filters.status || filters.status.length === 0) return 'All Statuses'
    const statusNames = filters.status.map(s => {
      switch (s) {
        case 1: return 'Open'
        case 2: return 'Pending'
        case 3: return 'Resolved'
        case 4: return 'Closed'
        case 5: return 'New'
        default: return 'Unknown'
      }
    })
    return statusNames.join(', ')
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Data Filters</h3>
            <div className="flex items-center space-x-2">
              <Button
                onClick={resetFilters}
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                Reset
              </Button>
              <Button
                onClick={onApplyFilters}
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? 'Applying...' : 'Apply Filters'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Agent Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Agent</label>
              <Select
                value={filters.agentId?.toString() || 'all'}
                onValueChange={handleAgentChange}
                disabled={loadingAgents || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingAgents ? 'Loading...' : getSelectedAgentName()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.id} value={agent.id.toString()}>
                      {agent.name}
                      {agent.department && (
                        <span className="text-muted-foreground ml-1">({agent.department})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Time Range</label>
              <Select
                value={filters.timeRange}
                onValueChange={handleTimeRangeChange}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={getTimeRangeLabel(filters.timeRange)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <Select
                value={filters.priority ? filters.priority.join(',') : 'all'}
                onValueChange={handlePriorityChange}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={getPriorityLabel()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="4">Urgent</SelectItem>
                  <SelectItem value="3">High</SelectItem>
                  <SelectItem value="2">Medium</SelectItem>
                  <SelectItem value="1">Low</SelectItem>
                  <SelectItem value="4,3">Urgent + High</SelectItem>
                  <SelectItem value="2,1">Medium + Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status</label>
              <Select
                value={filters.status ? filters.status.join(',') : 'all'}
                onValueChange={handleStatusChange}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={getStatusLabel()} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="5">New</SelectItem>
                  <SelectItem value="1">Open</SelectItem>
                  <SelectItem value="2">Pending</SelectItem>
                  <SelectItem value="3">Resolved</SelectItem>
                  <SelectItem value="4">Closed</SelectItem>
                  <SelectItem value="1,2,5">Active (New + Open + Pending)</SelectItem>
                  <SelectItem value="3,4">Completed (Resolved + Closed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Summary */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            
            {filters.agentId !== 'all' && filters.agentId && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                Agent: {getSelectedAgentName()}
              </span>
            )}
            
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              Time: {getTimeRangeLabel(filters.timeRange)}
            </span>
            
            {filters.priority && filters.priority.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                Priority: {getPriorityLabel()}
              </span>
            )}
            
            {filters.status && filters.status.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                Status: {getStatusLabel()}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 