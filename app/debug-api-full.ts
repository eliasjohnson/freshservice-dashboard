import { freshserviceApi } from './lib/freshservice';

async function debugFullTicketData() {
  console.log('🔍 Debug: Fetching ALL tickets to find resolved ones...');
  
  try {
    let allTickets: any[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      console.log(`\n📋 Fetching page ${page}...`);
      const response = await freshserviceApi.getTickets(page, 100); // Fetch 100 per page
      
      if (response.tickets && response.tickets.length > 0) {
        allTickets = allTickets.concat(response.tickets);
        console.log(`✅ Page ${page}: ${response.tickets.length} tickets`);
        
        // Check if we should continue (if we got less than 100, we're at the end)
        if (response.tickets.length < 100) {
          hasMorePages = false;
        } else {
          page++;
        }
      } else {
        hasMorePages = false;
      }
      
      // Safety check to prevent infinite loops
      if (page > 10) {
        console.log('⚠️ Stopping at page 10 for safety');
        hasMorePages = false;
      }
    }
    
    console.log(`\n📊 TOTAL TICKETS FOUND: ${allTickets.length}`);
    
    // Analyze all statuses
    const statusCounts: Record<number, number> = {};
    const resolvedTickets: any[] = [];
    
    allTickets.forEach(ticket => {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
      
      // Collect resolved tickets for detailed inspection
      if (ticket.status === 3) {
        resolvedTickets.push(ticket);
      }
    });
    
    console.log('\n📈 COMPLETE Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const statusName = {
        '1': 'Open',
        '2': 'Pending', 
        '3': 'Resolved',
        '4': 'Closed',
        '5': 'New',
        '6': 'On-Hold',
        '7': 'In Progress',
        '8': 'Cancelled'
      }[status] || `Status ${status}`;
      
      console.log(`Status ${status} (${statusName}): ${count}`);
    });
    
    console.log(`\n🎯 RESOLVED TICKETS (Status 3): ${resolvedTickets.length}`);
    
    if (resolvedTickets.length > 0) {
      console.log('\n📋 Sample resolved tickets:');
      resolvedTickets.slice(0, 5).forEach((ticket, index) => {
        console.log(`${index + 1}. ID: ${ticket.id}, Subject: ${ticket.subject?.substring(0, 50)}...`);
        console.log(`   Created: ${ticket.created_at}, Updated: ${ticket.updated_at}`);
        console.log(`   Requester ID: ${ticket.requester_id}, Responder ID: ${ticket.responder_id}`);
      });
    }
    
    // Check date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const resolvedToday = resolvedTickets.filter(t => new Date(t.updated_at) >= today).length;
    const resolvedThisWeek = resolvedTickets.filter(t => new Date(t.updated_at) >= thisWeek).length;
    const resolvedThisMonth = resolvedTickets.filter(t => new Date(t.updated_at) >= thisMonth).length;
    
    console.log(`\n🗓️ Resolved tickets by time period:`);
    console.log(`Today: ${resolvedToday}`);
    console.log(`This week: ${resolvedThisWeek}`);
    console.log(`This month: ${resolvedThisMonth}`);
    
  } catch (error) {
    console.error('❌ API Error:', error);
  }
}

debugFullTicketData(); 