import { fetchDashboardData } from './actions/dashboard';

async function debugDashboardVsActual() {
  console.log('🔍 Debug: Comparing Dashboard Data vs Actual Freshservice Data...');
  
  try {
    // Get what the dashboard currently shows
    console.log('\n📊 Fetching dashboard data...');
    const dashboardResult = await fetchDashboardData({ timeRange: 'week' });
    
    if (dashboardResult.success && dashboardResult.data) {
      const { data } = dashboardResult;
      
      console.log('\n🎯 DASHBOARD SHOWS:');
      console.log('===================');
      console.log('📈 Resolved Today:', data.stats.resolvedToday);
      console.log('📋 Open Tickets:', data.stats.openTickets);
      console.log('⚠️ SLA Breaches:', data.stats.slaBreaches);
      console.log('📥 Unassigned:', data.stats.unassignedTickets);
      console.log('👥 Total Agents:', data.stats.totalAgents);
      
      console.log('\n📊 Status Breakdown:');
      data.ticketsByStatus.forEach(status => {
        console.log(`   ${status.name}: ${status.value}`);
      });
      
      console.log('\n🎯 Priority Breakdown:');
      data.ticketsByPriority.forEach(priority => {
        console.log(`   ${priority.name}: ${priority.value}`);
      });
      
      // Calculate what we SHOULD be showing based on our full data
      console.log('\n🏆 ACTUAL FRESHSERVICE DATA (from our full scan):');
      console.log('==============================================');
      console.log('📈 Total Resolved Tickets (Status 3): 121');
      console.log('📈 Resolved Today: 15');
      console.log('📈 Resolved This Week: 60');
      console.log('📈 Resolved This Month: 121');
      
      console.log('\n❗ DISCREPANCY ANALYSIS:');
      console.log('========================');
      
      const resolvedInDashboard = data.ticketsByStatus.find(s => s.name === 'Resolved');
      const resolvedCount = resolvedInDashboard ? resolvedInDashboard.value : 0;
      
      console.log(`Dashboard shows ${resolvedCount} resolved tickets (from first 100 tickets only)`);
      console.log(`Actual system has 121 total resolved tickets`);
      console.log(`Dashboard "Resolved Today" stat: ${data.stats.resolvedToday}`);
      console.log(`Actual resolved today: 15`);
      
      if (resolvedCount < 121) {
        console.log('\n🔧 SOLUTION: Dashboard needs to fetch ALL tickets, not just first 100!');
      }
      
      if (data.stats.resolvedToday !== 15) {
        console.log('\n🔧 SOLUTION: "Resolved Today" calculation might have filtering issues!');
      }
      
    } else {
      console.error('❌ Failed to fetch dashboard data:', dashboardResult.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugDashboardVsActual(); 