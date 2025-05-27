import { freshserviceApi } from './lib/freshservice';

async function debugGroups() {
  console.log('🔍 Debug: Exploring Freshservice Groups...');
  
  try {
    // Get groups
    console.log('\n👥 Fetching groups...');
    const groupsResponse = await freshserviceApi.getGroups(1, 50);
    
    if (groupsResponse.groups && groupsResponse.groups.length > 0) {
      console.log('✅ Groups response:', groupsResponse.groups.length, 'groups found');
      
      console.log('\n📋 All Groups:');
      groupsResponse.groups.forEach(group => {
        console.log(`   - ${group.name} (ID: ${group.id}) - ${group.description || 'No description'}`);
        if (group.agent_ids && group.agent_ids.length > 0) {
          console.log(`     Agent IDs: ${group.agent_ids.length} agents`);
        }
      });
      
      // Look for IT-related groups
      const itGroups = groupsResponse.groups.filter(group => 
        group.name.toLowerCase().includes('it') || 
        group.name.toLowerCase().includes('support') ||
        group.name.toLowerCase().includes('technical') ||
        group.description?.toLowerCase().includes('it') ||
        group.description?.toLowerCase().includes('support')
      );
      
      console.log('\n🎯 IT-related Groups:');
      itGroups.forEach(group => {
        console.log(`   - ${group.name} (ID: ${group.id})`);
        console.log(`     Description: ${group.description || 'No description'}`);
        if (group.agent_ids) {
          console.log(`     Agents: ${group.agent_ids.length} members`);
        }
      });
      
    } else {
      console.log('⚠️ No groups found');
    }
    
  } catch (error: any) {
    console.error('💥 Error fetching groups:', error.message);
    console.error('   Response:', error.response?.data);
  }
}

debugGroups(); 