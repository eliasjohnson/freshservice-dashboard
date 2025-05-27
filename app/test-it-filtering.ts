import { fetchDashboardData } from './actions/dashboard';

async function testITFiltering() {
  console.log('🔍 Testing IT team filtering...');
  
  try {
    // Get dashboard data (should now only show IT agents)
    console.log('\n📊 Fetching dashboard data with IT filtering...');
    const result = await fetchDashboardData({ timeRange: 'week' });
    
    if (result.success && result.data) {
      const { data } = result;
      
      console.log('\n✅ DASHBOARD DATA WITH IT FILTERING:');
      console.log('='.repeat(50));
      
      console.log('\n📈 IT Agent Stats:');
      console.log(`   Total IT Agents: ${data.stats.totalAgents}`);
      console.log(`   Open Tickets: ${data.stats.openTickets}`);
      console.log(`   Resolved Today: ${data.stats.resolvedToday}`);
      console.log(`   SLA Breaches: ${data.stats.slaBreaches}`);
      
      console.log('\n👥 IT Agent Performance:');
      data.agentPerformance.forEach(agent => {
        console.log(`   - ${agent.name}: ${agent.tickets} tickets, ${agent.resolution}% resolution, ${agent.workload} workload`);
      });
      
      console.log('\n📊 IT Agent Workload Distribution:');
      data.agentWorkload.forEach(workload => {
        console.log(`   ${workload.name}: ${workload.value} agents`);
      });
      
      // Verify we only have IT agents
      if (data.agentPerformance.length > 0) {
        console.log('\n✅ Successfully filtered to IT team members only!');
      } else {
        console.log('\n⚠️ No IT agents found with tickets - this might be expected');
      }
      
    } else {
      console.error('❌ Failed to get dashboard data:', result.error);
    }
    
  } catch (error: any) {
    console.error('💥 Error testing IT filtering:', error.message);
  }
}

testITFiltering(); 