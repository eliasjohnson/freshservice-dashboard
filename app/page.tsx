import { Suspense } from 'react'
import Dashboard from './components/Dashboard'
import { fetchDashboardData } from './actions/dashboard'

export default async function HomePage() {
  let dashboardData = null;
  let error = null;

  try {
    console.log('🚀 === INITIAL SERVER-SIDE DATA FETCH ===');
    
    const result = await fetchDashboardData({ timeRange: 'week' });
    
    if (result.success && result.data) {
      dashboardData = result.data;
      console.log('✅ Initial data loaded successfully on server');
    } else {
      error = result.error || 'Failed to load initial data';
      console.error('❌ Initial data load failed:', error);
    }
  } catch (err: any) {
    error = err.message || 'Server error during initial data fetch';
    console.error('💥 Server error during initial data fetch:', err);
  }
  
  return <Dashboard initialData={dashboardData} error={error} />
} 