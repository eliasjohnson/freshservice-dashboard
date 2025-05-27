import { freshserviceApi } from './lib/freshservice';

async function debugAgentGroups() {
  console.log('🔍 Debug: Agent-Group Relationships...');
  
  try {
    // Get groups first
    console.log('\n👥 Fetching groups...');
    const groupsResponse = await freshserviceApi.getGroups(1, 50);
    
    // Find IT-related groups
    const itGroups = groupsResponse.groups?.filter(group => 
      group.name.toLowerCase().includes('it support') ||
      group.name.toLowerCase() === 'it support' ||
      group.id === 11000188797 || // IT Support
      group.id === 11000411096    // IT Support - International
    ) || [];
    
    console.log('\n🎯 IT Support Groups:');
    itGroups.forEach(group => {
      console.log(`   - ${group.name} (ID: ${group.id})`);
      if (group.agent_ids) {
        console.log(`     Agent IDs: [${group.agent_ids.join(', ')}]`);
      }
    });
    
    // Get all agents
    console.log('\n👥 Fetching all agents...');
    const agentsResponse = await freshserviceApi.getAgents(1, 100);
    const allAgents = agentsResponse.agents || [];
    
    // Extract IT group IDs
    const itGroupIds = itGroups.map(group => group.id);
    console.log('\n🎯 IT Group IDs:', itGroupIds);
    
    // Find agents that belong to IT groups
    const itAgentsFromGroups = allAgents.filter(agent => {
      if (!agent.group_ids || agent.group_ids.length === 0) return false;
      return agent.group_ids.some(groupId => itGroupIds.includes(groupId));
    });
    
    console.log('\n👥 Agents in IT Support Groups:');
    itAgentsFromGroups.forEach(agent => {
      const name = agent.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim();
      console.log(`   - ${name} (ID: ${agent.id}) - ${agent.job_title || 'No title'}`);
      console.log(`     Group IDs: [${agent.group_ids?.join(', ') || 'None'}]`);
      console.log(`     Active: ${agent.active}`);
    });
    
    // Also check if we can find agents by name mentioned by user
    const targetAgentNames = [
      'Billy Chambers', 'Deepak Chougule', 'Elias Johnson', 'James Thompson', 
      'Kuhio Clark', 'Mike Hincks', 'Miles Ward', 'Peru Poudel', 
      'Predrag Jovanovic', 'Sandra Mills', 'Skyler Northcut', 'Tanmoy Biswas'
    ];
    
    console.log('\n🔍 Looking for specific agents mentioned by user:');
    targetAgentNames.forEach(targetName => {
      const foundAgent = allAgents.find(agent => {
        const fullName = agent.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim();
        return fullName.toLowerCase() === targetName.toLowerCase();
      });
      
      if (foundAgent) {
        console.log(`   ✅ ${targetName} (ID: ${foundAgent.id})`);
        console.log(`      Title: ${foundAgent.job_title || 'No title'}`);
        console.log(`      Group IDs: [${foundAgent.group_ids?.join(', ') || 'None'}]`);
        console.log(`      Active: ${foundAgent.active}`);
      } else {
        console.log(`   ❌ ${targetName} - Not found`);
      }
    });
    
  } catch (error: any) {
    console.error('💥 Error:', error.message);
  }
}

debugAgentGroups(); 