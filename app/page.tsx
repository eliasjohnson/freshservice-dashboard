import Dashboard from './components/Dashboard'
import { fetchDashboardData } from './actions/dashboard'

export default async function HomePage() {
  // Attempt to fetch real data on the server with default filters
  let initialData = null
  let error = null

  try {
    console.log('🏠 Loading initial dashboard data on server...')
    const defaultFilters = { timeRange: 'week' as const }
    const result = await fetchDashboardData(defaultFilters)
    
    if (result.success && result.data) {
      initialData = result.data
      console.log('✅ Initial data loaded successfully on server')
      console.log('📊 Data preview:', {
        totalTickets: result.data.ticketsByStatus.reduce((sum, item) => sum + item.value, 0),
        openTickets: result.data.stats.openTickets,
        agents: result.data.agentPerformance.length,
        slaBreaches: result.data.stats.slaBreaches,
        unassignedTickets: result.data.stats.unassignedTickets
      })
    } else {
      error = result.error || 'Failed to load initial data'
      console.warn('⚠️ Server-side data loading failed:', error)
    }
  } catch (err: any) {
    error = err.message || 'Server error while loading data'
    console.error('💥 Server-side error:', err)
  }

  return <Dashboard initialData={initialData} error={error} />
} 