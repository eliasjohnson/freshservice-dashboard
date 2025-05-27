import { freshserviceApi } from './lib/freshservice';

async function debugAgentTeams() {
  console.log('🔍 Debug: Exploring agent team/department data...');
  
  try {
    // Get agents
    console.log('\n👥 Fetching agents...');
    const agentsResponse = await freshserviceApi.getAgents(1, 50);
    
    if (agentsResponse.agents && agentsResponse.agents.length > 0) {
      console.log('✅ Agents response:', agentsResponse.agents.length, 'agents found');
      
      console.log('\n📋 Sample Agent Data Structure:');
      const sampleAgent = agentsResponse.agents[0];
      console.log('Sample agent:', {
        id: sampleAgent.id,
        name: sampleAgent.name,
        first_name: sampleAgent.first_name,
        last_name: sampleAgent.last_name,
        email: sampleAgent.email,
        role: sampleAgent.role,
        department: sampleAgent.department,
        department_ids: sampleAgent.department_ids,
        group_ids: sampleAgent.group_ids,
        job_title: sampleAgent.job_title,
        active: sampleAgent.active
      });
      
      console.log('\n🏢 Department Analysis:');
      const departmentCounts: Record<string, number> = {};
      const roleCounts: Record<string, number> = {};
      
      agentsResponse.agents.forEach(agent => {
        // Count departments
        const dept = agent.department || 'No Department';
        departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
        
        // Count roles
        const role = agent.role || 'No Role';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });
      
      console.log('📊 Departments:');
      Object.entries(departmentCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([dept, count]) => {
          console.log(`   ${dept}: ${count} agents`);
        });
        
      console.log('\n👔 Roles:');
      Object.entries(roleCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([role, count]) => {
          console.log(`   ${role}: ${count} agents`);
        });
        
      console.log('\n🔍 Looking for IT-related terms...');
      const itKeywords = ['IT', 'Information Technology', 'Support', 'Technical', 'Tech', 'System', 'Network', 'Infrastructure'];
      const potentialITAgents = agentsResponse.agents.filter(agent => {
        const searchText = `${agent.department || ''} ${agent.role || ''} ${agent.job_title || ''}`.toLowerCase();
        return itKeywords.some(keyword => searchText.includes(keyword.toLowerCase()));
      });
      
      console.log(`🎯 Found ${potentialITAgents.length} potential IT team members:`);
      potentialITAgents.forEach(agent => {
        console.log(`   - ${agent.name} (${agent.department || 'No Dept'}) - ${agent.role || 'No Role'} - ${agent.job_title || 'No Title'}`);
      });
      
    } else {
      console.log('⚠️ No agents found');
    }
    
  } catch (error: any) {
    console.error('💥 Error fetching agents:', error.message);
  }
}

debugAgentTeams(); 