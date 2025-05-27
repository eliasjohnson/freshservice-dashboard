import { freshserviceApi } from './lib/freshservice';

async function debugWorkspaces() {
  console.log('🔍 Debug: Exploring Freshservice Workspaces...');
  
  try {
    // Get workspaces
    console.log('\n🏢 Fetching workspaces...');
    const workspacesResponse = await freshserviceApi.getWorkspaces(1, 50);
    
    if (workspacesResponse.workspaces && workspacesResponse.workspaces.length > 0) {
      console.log('✅ Workspaces response:', workspacesResponse.workspaces.length, 'workspaces found');
      
      console.log('\n📋 All Workspaces:');
      workspacesResponse.workspaces.forEach(workspace => {
        console.log(`   - ${workspace.name} (ID: ${workspace.id}) - ${workspace.description || 'No description'}`);
      });
      
      // Look for IT Support workspace
      const itWorkspace = workspacesResponse.workspaces.find(workspace => 
        workspace.name.toLowerCase().includes('it support') ||
        workspace.name.toLowerCase() === 'it support' ||
        workspace.description?.toLowerCase().includes('it support')
      );
      
      if (itWorkspace) {
        console.log('\n🎯 Found IT Support Workspace:');
        console.log(`   Name: ${itWorkspace.name}`);
        console.log(`   ID: ${itWorkspace.id}`);
        console.log(`   Description: ${itWorkspace.description || 'No description'}`);
      } else {
        console.log('\n❌ IT Support workspace not found. Available workspaces:');
        workspacesResponse.workspaces.forEach(workspace => {
          console.log(`   - ${workspace.name}`);
        });
      }
      
    } else {
      console.log('⚠️ No workspaces found');
    }
    
    // Also check some sample tickets to see their workspace IDs
    console.log('\n🎫 Checking sample tickets for workspace IDs...');
    const ticketsResponse = await freshserviceApi.getTickets(1, 10);
    
    if (ticketsResponse.tickets) {
      const workspaceGroups: Record<number, number> = {};
      
      ticketsResponse.tickets.forEach(ticket => {
        const workspaceId = ticket.workspace_id || 0;
        workspaceGroups[workspaceId] = (workspaceGroups[workspaceId] || 0) + 1;
      });
      
      console.log('\n📊 Workspace ID distribution in sample tickets:');
      Object.entries(workspaceGroups).forEach(([workspaceId, count]) => {
        console.log(`   Workspace ID ${workspaceId}: ${count} tickets`);
      });
    }
    
  } catch (error: any) {
    console.error('💥 Error fetching workspaces:', error.message);
    console.error('   Response:', error.response?.data);
  }
}

debugWorkspaces(); 