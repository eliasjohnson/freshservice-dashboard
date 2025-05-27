import { freshserviceApi } from './lib/freshservice';

async function debugTicketStructure() {
  console.log('🔍 Debug: Exploring ticket data structure for workspace info...');
  
  try {
    // Get a sample of tickets
    console.log('\n🎫 Fetching tickets...');
    const ticketsResponse = await freshserviceApi.getTickets(1, 5);
    
    if (ticketsResponse.tickets && ticketsResponse.tickets.length > 0) {
      console.log('✅ Tickets response:', ticketsResponse.tickets.length, 'tickets found');
      
      console.log('\n📋 Full Ticket Data Structure (first ticket):');
      const sampleTicket = ticketsResponse.tickets[0];
      console.log('Sample ticket:', JSON.stringify(sampleTicket, null, 2));
      
      console.log('\n📊 All Available Fields:');
      Object.keys(sampleTicket).forEach(key => {
        const value = (sampleTicket as any)[key];
        console.log(`   ${key}: ${typeof value} = ${value}`);
      });
      
      // Look for workspace-related fields
      console.log('\n🔍 Looking for workspace-related data...');
      ticketsResponse.tickets.forEach((ticket, index) => {
        console.log(`\nTicket ${index + 1}:`);
        console.log(`   ID: ${ticket.id}`);
        console.log(`   Subject: ${ticket.subject}`);
        console.log(`   Group ID: ${ticket.group_id || 'None'}`);
        console.log(`   Department ID: ${ticket.department_id || 'None'}`);
        console.log(`   Category: ${ticket.category || 'None'}`);
        console.log(`   Source: ${ticket.source}`);
        
        // Check if there are any custom fields that might contain workspace info
        if (ticket.custom_fields) {
          console.log(`   Custom Fields:`, ticket.custom_fields);
        }
        
        // Check all other fields
        Object.keys(ticket).forEach(key => {
          if (key.toLowerCase().includes('workspace') || 
              key.toLowerCase().includes('work') ||
              key.toLowerCase().includes('space')) {
            console.log(`   WORKSPACE FIELD: ${key} = ${(ticket as any)[key]}`);
          }
        });
      });
      
    } else {
      console.log('⚠️ No tickets found');
    }
    
  } catch (error: any) {
    console.error('💥 Error:', error.message);
  }
}

debugTicketStructure(); 