import { fetchDashboardData } from './actions/dashboard';

async function debugDashboardNoFilter() {
  console.log('🔍 Debug: Testing Dashboard with NO time filters...');
  
  try {
    // Test with different time ranges
    const timeRanges = ['today', 'week', 'month', 'quarter'] as const;
    
    for (const timeRange of timeRanges) {
      console.log(`\n⏰ Testing timeRange: ${timeRange.toUpperCase()}`);
      console.log('='.repeat(40));
      
      const result = await fetchDashboardData({ timeRange });
      
      if (result.success && result.data) {
        const resolvedStatus = result.data.ticketsByStatus.find(s => s.name === 'Resolved');
        const resolvedCount = resolvedStatus ? resolvedStatus.value : 0;
        
        console.log(`📊 Filtered tickets: ${result.data.ticketsByStatus.reduce((sum, s) => sum + s.value, 0)}`);
        console.log(`📈 Resolved tickets: ${resolvedCount}`);
        console.log(`📈 Resolved today: ${result.data.stats.resolvedToday}`);
        console.log(`⚠️ SLA breaches: ${result.data.stats.slaBreaches}`);
      } else {
        console.error(`❌ Failed for ${timeRange}:`, result.error);
      }
    }
    
    // Test the quarter range to see the most tickets
    console.log('\n🎯 DETAILED ANALYSIS FOR QUARTER RANGE:');
    console.log('=====================================');
    
    const quarterResult = await fetchDashboardData({ timeRange: 'quarter' });
    if (quarterResult.success && quarterResult.data) {
      console.log('📊 Status breakdown:');
      quarterResult.data.ticketsByStatus.forEach(status => {
        console.log(`   ${status.name}: ${status.value}`);
      });
      
      const totalTickets = quarterResult.data.ticketsByStatus.reduce((sum, s) => sum + s.value, 0);
      const resolvedTickets = quarterResult.data.ticketsByStatus.find(s => s.name === 'Resolved')?.value || 0;
      
      console.log(`\n📈 Total tickets in quarter: ${totalTickets}`);
      console.log(`📈 Resolved tickets in quarter: ${resolvedTickets}`);
      console.log(`📈 Expected total resolved: 121`);
      
      if (resolvedTickets < 121) {
        console.log(`\n❗ STILL MISSING ${121 - resolvedTickets} resolved tickets!`);
        console.log('🔧 Possible causes:');
        console.log('   - Some resolved tickets are older than quarter');
        console.log('   - Different status codes being used');
        console.log('   - Date filtering logic issues');
      } else {
        console.log('\n✅ All resolved tickets found in quarter range!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugDashboardNoFilter(); 