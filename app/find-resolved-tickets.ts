import { fetchDashboardData } from './actions/dashboard';

async function findYourResolvedTickets() {
  console.log('🔍 Searching for your 11 resolved tickets...');
  console.log('Testing different filter combinations to match your Freshservice view\n');
  
  const filterCombinations = [
    { name: 'Today', filters: { timeRange: 'today' as const } },
    { name: 'This Week', filters: { timeRange: 'week' as const } },
    { name: 'This Month', filters: { timeRange: 'month' as const } },
    { name: 'This Quarter', filters: { timeRange: 'quarter' as const } },
  ];
  
  for (const combo of filterCombinations) {
    try {
      console.log(`🗓️ Testing: ${combo.name}`);
      console.log('='.repeat(30));
      
      const result = await fetchDashboardData(combo.filters);
      
      if (result.success && result.data) {
        const resolvedStatus = result.data.ticketsByStatus.find(s => s.name === 'Resolved');
        const resolvedCount = resolvedStatus ? resolvedStatus.value : 0;
        
        console.log(`📊 Total filtered tickets: ${result.data.ticketsByStatus.reduce((sum, s) => sum + s.value, 0)}`);
        console.log(`📈 Resolved tickets: ${resolvedCount}`);
        console.log(`📈 Resolved today stat: ${result.data.stats.resolvedToday}`);
        
        // Check if this matches your expected 11
        if (resolvedCount === 11) {
          console.log('🎯 FOUND IT! This filter shows exactly 11 resolved tickets!');
          console.log('✨ Use this time range in your dashboard to see your expected results.');
        } else if (Math.abs(resolvedCount - 11) <= 2) {
          console.log(`🔍 CLOSE! Off by ${Math.abs(resolvedCount - 11)} tickets - might be due to timing differences.`);
        }
        
        console.log('📊 Full status breakdown:');
        result.data.ticketsByStatus.forEach(status => {
          console.log(`   ${status.name}: ${status.value}`);
        });
        
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
      
      console.log(''); // Empty line for readability
      
    } catch (error) {
      console.error(`❌ Error testing ${combo.name}:`, error);
    }
  }
  
  console.log('\n🎯 SUMMARY:');
  console.log('='.repeat(40));
  console.log('If none of the above exactly match your 11 resolved tickets, it could be because:');
  console.log('1. 📅 Different time zone handling between dashboard and Freshservice UI');
  console.log('2. 👤 Your Freshservice view is filtered by specific agent/requester');
  console.log('3. 🏷️ Your view has specific status, priority, or category filters');
  console.log('4. ⏰ Timing difference - tickets resolved since you last checked');
  console.log('5. 🔄 Cache - the dashboard might be showing cached data');
  console.log('\n💡 NEXT STEPS:');
  console.log('- Check which time range comes closest to 11');
  console.log('- Try using agent filters in the dashboard dropdown');
  console.log('- Clear cache and refresh if needed');
}

findYourResolvedTickets(); 