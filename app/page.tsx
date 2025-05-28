import Dashboard from './components/Dashboard'
import { fetchDashboardData } from './actions/dashboard'

export default async function HomePage() {
  // Fetch initial data on the server side
  console.log('🚀 === INITIAL SERVER-SIDE DATA FETCH ===')
  
  let initialData = null
  let error = null
  
  try {
    const result = await fetchDashboardData({ timeRange: 'week' })
    
    if (result.success && result.data) {
      initialData = result.data
      console.log('✅ Initial data loaded successfully on server')
    } else {
      error = result.error || 'Failed to load initial data'
      console.warn('⚠️ Initial data fetch failed:', error)
    }
  } catch (err: any) {
    error = err.message || 'Server error during initial data fetch'
    console.error('💥 Error during initial data fetch:', err)
  }
  
  return <Dashboard initialData={initialData} error={error} />
} 