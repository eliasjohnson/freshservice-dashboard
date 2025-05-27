import { freshserviceApi } from './lib/freshservice';

async function debugFreshserviceAPI() {
  console.log('🔍 Debug: Testing Freshservice API connection...');
  
  try {
    // Test connection
    const isConnected = await freshserviceApi.testConnection();
    console.log('✅ Connection status:', isConnected);

    // Get tickets
    console.log('\n📋 Fetching tickets...');
    const ticketsResponse = await freshserviceApi.getTickets(1, 50);
    console.log('✅ Tickets response:', ticketsResponse);
    
    if (ticketsResponse.tickets && ticketsResponse.tickets.length > 0) {
      console.log('\n📊 Ticket Analysis:');
      console.log('Total tickets:', ticketsResponse.tickets.length);
      
      // Analyze by status
      const statusCounts: Record<number, number> = {};
      ticketsResponse.tickets.forEach(ticket => {
        statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
      });
      
      console.log('\nStatus breakdown:');
      console.log('Status 1 (Open):', statusCounts[1] || 0);
      console.log('Status 2 (Pending):', statusCounts[2] || 0);
      console.log('Status 3 (Resolved):', statusCounts[3] || 0);
      console.log('Status 4 (Closed):', statusCounts[4] || 0);
      console.log('Status 5 (New):', statusCounts[5] || 0);
      
      // Show first few tickets for inspection
      console.log('\n🔍 Sample tickets:');
      ticketsResponse.tickets.slice(0, 3).forEach((ticket, index) => {
        console.log(`Ticket ${index + 1}:`, {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at
        });
      });
    }

    // Get agents
    console.log('\n👥 Fetching agents...');
    const agentsResponse = await freshserviceApi.getAgents(1, 50);
    console.log('✅ Agents response:', agentsResponse);
    
    if (agentsResponse.agents) {
      console.log('Total agents:', agentsResponse.agents.length);
    }

  } catch (error) {
    console.error('❌ API Error:', error);
  }
}

debugFreshserviceAPI(); 