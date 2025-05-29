import { fetchDashboardData } from './actions/dashboard'
import { DashboardLayout } from './components/DashboardLayout'
import { Overview } from './components/Overview'

export default async function Home() {
  // Fetch initial data on the server
  let initialData = null
  let error = null

  try {
    const result = await fetchDashboardData({ agentId: 'all', timeRange: 'week' })
    if (result.success) {
      initialData = result.data
    } else {
      error = result.error
    }
  } catch (err: any) {
    error = err.message || 'Failed to load initial data'
  }

  return (
    <DashboardLayout initialData={initialData} error={error}>
      <Overview />
    </DashboardLayout>
  )
} 