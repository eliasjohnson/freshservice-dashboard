'use server'

import { freshserviceApi, Ticket, Agent } from '../lib/freshservice';

// Enhanced dashboard data interface with more relevant metrics
export interface DashboardData {
  ticketsByStatus: Array<{ name: string; value: number }>;
  ticketsByPriority: Array<{ name: string; value: number }>;
  ticketsTrend: Array<{ name: string; value: number }>;
  agentPerformance: Array<{ 
    id: number;
    name: string; 
    tickets: number; 
    resolution: number;
    avgResponseTime: string;
    workload: 'Light' | 'Moderate' | 'Heavy' | 'Overloaded';
  }>;
  // Enhanced stats with more IT-relevant metrics
  stats: {
    openTickets: number;
    resolvedToday: number;
    avgResponseTime: string;
    customerSatisfaction: string;
    slaBreaches: number;
    overdueTickets: number;
    unassignedTickets: number;
    totalAgents: number;
  };
  // New category breakdown for IT support
  ticketsByCategory: Array<{ name: string; value: number }>;
  // Time-based analysis
  resolutionTimes: Array<{ name: string; value: number }>;
  // Agent workload distribution
  agentWorkload: Array<{ name: string; value: number }>;
}

// Filtering options interface
export interface DashboardFilters {
  agentId?: number | 'all';
  timeRange: 'today' | 'week' | 'month' | 'quarter';
  department?: string;
  priority?: number[];
  status?: number[];
}

// Status and priority mappings
const TICKET_STATUS: Record<number, string> = {
  1: 'Open',
  2: 'Pending',
  3: 'Resolved',
  4: 'Closed',
  5: 'New',
};

const TICKET_PRIORITY: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};

/**
 * Filter tickets based on criteria
 */
function filterTickets(tickets: Ticket[], filters: DashboardFilters): Ticket[] {
  let filtered = [...tickets];

  // FIRST: Filter by IT Support workspace only (workspace_id: 2)
  filtered = filtered.filter(ticket => ticket.workspace_id === 2);
  console.log(`🏢 Filtered to ${filtered.length} tickets from IT Support workspace`);

  // Filter by agent
  if (filters.agentId && filters.agentId !== 'all') {
    filtered = filtered.filter(ticket => ticket.responder_id === filters.agentId);
  }

  // Filter by time range
  const now = new Date();
  let startDate: Date;
  
  switch (filters.timeRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStart, 1);
      break;
    default:
      startDate = new Date(0);
  }

  filtered = filtered.filter(ticket => new Date(ticket.created_at) >= startDate);

  // Filter by priority
  if (filters.priority && filters.priority.length > 0) {
    filtered = filtered.filter(ticket => filters.priority!.includes(ticket.priority));
  }

  // Filter by status
  if (filters.status && filters.status.length > 0) {
    filtered = filtered.filter(ticket => filters.status!.includes(ticket.status));
  }

  return filtered;
}

/**
 * Transform tickets to chart data by status
 */
function createTicketsByStatusChartData(tickets: Ticket[]): Array<{ name: string; value: number }> {
  const statusCounts: Record<string, number> = {};
  
  tickets.forEach(ticket => {
    const status = TICKET_STATUS[ticket.status] || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
}

/**
 * Transform tickets to chart data by priority
 */
function createTicketsByPriorityChartData(tickets: Ticket[]): Array<{ name: string; value: number }> {
  const priorityCounts: Record<string, number> = {};
  
  tickets.forEach(ticket => {
    const priority = TICKET_PRIORITY[ticket.priority] || 'Unknown';
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
  });
  
  return Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));
}

/**
 * Transform tickets to chart data by category
 */
function createTicketsByCategoryChartData(tickets: Ticket[]): Array<{ name: string; value: number }> {
  const categoryCounts: Record<string, number> = {};
  
  tickets.forEach(ticket => {
    const category = ticket.category || 'Uncategorized';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });
  
  return Object.entries(categoryCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 categories
}

/**
 * Create weekly trend data
 */
function createTicketsTrendChartData(tickets: Ticket[]): Array<{ name: string; value: number }> {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCounts: Record<string, number> = days.reduce((acc, day) => ({...acc, [day]: 0}), {});
  
  // Get tickets from the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  tickets.forEach(ticket => {
    const createdAt = new Date(ticket.created_at);
    if (createdAt >= oneWeekAgo) {
      const day = days[createdAt.getDay()];
      dayCounts[day]++;
    }
  });
  
  return days.map(day => ({
    name: day,
    value: dayCounts[day]
  }));
}

/**
 * Create resolution time analysis
 */
function createResolutionTimesData(tickets: Ticket[]): Array<{ name: string; value: number }> {
  const timeRanges = {
    '< 1 hour': 0,
    '1-4 hours': 0,
    '4-24 hours': 0,
    '1-3 days': 0,
    '> 3 days': 0
  };

  const resolvedTickets = tickets.filter(t => t.status === 3 || t.status === 4);
  
  resolvedTickets.forEach(ticket => {
    const created = new Date(ticket.created_at);
    const updated = new Date(ticket.updated_at);
    const diffHours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      timeRanges['< 1 hour']++;
    } else if (diffHours < 4) {
      timeRanges['1-4 hours']++;
    } else if (diffHours < 24) {
      timeRanges['4-24 hours']++;
    } else if (diffHours < 72) {
      timeRanges['1-3 days']++;
    } else {
      timeRanges['> 3 days']++;
    }
  });

  return Object.entries(timeRanges).map(([name, value]) => ({ name, value }));
}

/**
 * Filter agents to only include IT team members
 * Now based on agents who actually handle tickets in the IT Support workspace
 */
function filterITAgents(agents: Agent[], tickets: Ticket[]): Agent[] {
  // Get all responder IDs from IT Support workspace tickets
  const itTickets = tickets.filter(ticket => ticket.workspace_id === 2);
  const itResponderIds = new Set(
    itTickets
      .map(ticket => ticket.responder_id)
      .filter(id => id !== null && id !== undefined) as number[]
  );

  console.log(`🎯 Found ${itResponderIds.size} unique responders in IT Support workspace`);

  // Filter agents to only those who handle IT Support tickets
  const itAgents = agents.filter(agent => {
    // Check if agent is active first
    if (!agent.active) return false;
    
    // Check if agent handles tickets in IT Support workspace
    const isITResponder = itResponderIds.has(agent.id);
    
    if (isITResponder) {
      console.log(`   ✅ IT Agent: ${agent.first_name} ${agent.last_name} - ${agent.job_title || 'No title'}`);
    }
    
    return isITResponder;
  });
  
  console.log(`🎯 Filtered to ${itAgents.length} IT team members from ${agents.length} total agents (based on IT workspace ticket handling)`);
  return itAgents;
}

/**
 * Create enhanced agent performance data with workload analysis - IT TEAM ONLY
 */
function createAgentPerformanceData(tickets: Ticket[], agents: Agent[]): Array<{ 
  id: number;
  name: string; 
  tickets: number; 
  resolution: number;
  avgResponseTime: string;
  workload: 'Light' | 'Moderate' | 'Heavy' | 'Overloaded';
}> {
  // FILTER TO ONLY IT TEAM MEMBERS
  const itAgents = filterITAgents(agents, tickets);
  
  const agentMap: Record<number, { 
    id: number;
    name: string; 
    tickets: number; 
    resolved: number;
    totalResponseTime: number;
    responseCount: number;
  }> = {};
  
  // Initialize agent data - ONLY IT AGENTS
  itAgents.forEach(agent => {
    agentMap[agent.id] = {
      id: agent.id,
      name: agent.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
      tickets: 0,
      resolved: 0,
      totalResponseTime: 0,
      responseCount: 0
    };
  });
  
  // Count tickets for each IT agent
  tickets.forEach(ticket => {
    if (ticket.responder_id && agentMap[ticket.responder_id]) {
      agentMap[ticket.responder_id].tickets++;
      
      // Count as resolved if status is resolved or closed
      if (ticket.status === 3 || ticket.status === 4) {
        agentMap[ticket.responder_id].resolved++;
      }

      // Add response time if available
      if (ticket.stats?.response_time) {
        agentMap[ticket.responder_id].totalResponseTime += ticket.stats.response_time;
        agentMap[ticket.responder_id].responseCount++;
      }
    }
  });

  // Calculate averages and determine workload - based on IT team size
  const totalTickets = tickets.length;
  const avgTicketsPerAgent = itAgents.length > 0 ? totalTickets / itAgents.length : 0;
  
  return Object.values(agentMap)
    .filter(agent => agent.tickets > 0) // Only show agents with actual tickets
    .map(agent => {
      const resolutionRate = agent.tickets > 0 ? Math.round((agent.resolved / agent.tickets) * 100) : 0;
      const avgResponseTime = agent.responseCount > 0 
        ? `${(agent.totalResponseTime / agent.responseCount / 60).toFixed(1)}h` 
        : 'N/A';
      
      // Determine workload based on tickets compared to average
      let workload: 'Light' | 'Moderate' | 'Heavy' | 'Overloaded';
      if (avgTicketsPerAgent === 0) {
        workload = 'Light';
      } else {
        const ratio = agent.tickets / avgTicketsPerAgent;
        if (ratio < 0.5) workload = 'Light';
        else if (ratio < 1.0) workload = 'Moderate';
        else if (ratio < 1.5) workload = 'Heavy';
        else workload = 'Overloaded';
      }

      return {
        id: agent.id,
        name: agent.name,
        tickets: agent.tickets,
        resolution: resolutionRate,
        avgResponseTime,
        workload
      };
    })
    .sort((a, b) => b.resolution - a.resolution);
}

/**
 * Create agent workload distribution chart data - IT TEAM ONLY
 */
function createAgentWorkloadData(tickets: Ticket[], agents: Agent[]): Array<{ name: string; value: number }> {
  const agentPerformance = createAgentPerformanceData(tickets, agents);
  const workloadCounts: Record<string, number> = {
    'Light': 0,
    'Moderate': 0,
    'Heavy': 0,
    'Overloaded': 0
  };

  agentPerformance.forEach(agent => {
    workloadCounts[agent.workload]++;
  });

  return Object.entries(workloadCounts).map(([name, value]) => ({ name, value }));
}

/**
 * Count tickets resolved today
 */
function countResolvedToday(tickets: Ticket[]): number {
  const today = new Date().toISOString().split('T')[0];
  return tickets.filter((ticket: Ticket) => {
    const updated = new Date(ticket.updated_at).toISOString().split('T')[0];
    return updated === today && (ticket.status === 3 || ticket.status === 4);
  }).length;
}

/**
 * Count SLA breaches
 */
function countSLABreaches(tickets: Ticket[]): number {
  const now = new Date();
  return tickets.filter(ticket => {
    if (!ticket.due_by) return false;
    const dueDate = new Date(ticket.due_by);
    return now > dueDate && (ticket.status === 1 || ticket.status === 2 || ticket.status === 5);
  }).length;
}

/**
 * Count overdue tickets
 */
function countOverdueTickets(tickets: Ticket[]): number {
  const now = new Date();
  return tickets.filter(ticket => {
    if (!ticket.fr_due_by) return false;
    const dueDate = new Date(ticket.fr_due_by);
    return now > dueDate && (ticket.status === 1 || ticket.status === 2 || ticket.status === 5);
  }).length;
}

/**
 * Count unassigned tickets
 */
function countUnassignedTickets(tickets: Ticket[]): number {
  return tickets.filter(ticket => 
    !ticket.responder_id && (ticket.status === 1 || ticket.status === 2 || ticket.status === 5)
  ).length;
}

/**
 * Calculate average response time
 */
function calculateAvgResponseTime(tickets: Ticket[]): string {
  let totalResponseTime = 0;
  let count = 0;
  
  tickets.forEach((ticket: Ticket) => {
    if (ticket.stats && ticket.stats.response_time) {
      totalResponseTime += ticket.stats.response_time;
      count++;
    }
  });
  
  if (count === 0) return '0 min';
  
  const avgHours = totalResponseTime / count;
  return `${(avgHours / 60).toFixed(1)} hours`;
}

/**
 * Server action to fetch dashboard data with filtering - OPTIMIZED for rate limits
 * PRO Plan: 400 calls/min overall, 120 calls/min for tickets
 */
export async function fetchDashboardData(filters: DashboardFilters = { timeRange: 'week' }): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
  try {
    console.log('🏗️ Fetching dashboard data from server action with filters:', filters);

    // OPTIMIZED: Start with fewer pages to respect rate limits
    let allTickets: Ticket[] = [];
    let page = 1;
    let hasMorePages = true;
    const maxInitialPages = 5; // Start with 5 pages (500 tickets) to avoid rate limits
    
    console.log('📋 Fetching tickets with smart pagination (rate limit aware)...');
    
    while (hasMorePages && page <= maxInitialPages) {
      try {
        const ticketsResponse = await freshserviceApi.getTickets(page, 100);
        
        if (ticketsResponse.tickets && ticketsResponse.tickets.length > 0) {
          allTickets = allTickets.concat(ticketsResponse.tickets);
          console.log(`✅ Page ${page}: ${ticketsResponse.tickets.length} tickets (Total: ${allTickets.length})`);
          
          // Check if we should continue
          if (ticketsResponse.tickets.length < 100) {
            hasMorePages = false;
          } else {
            page++;
          }
        } else {
          hasMorePages = false;
        }
      } catch (pageError: any) {
        console.warn(`⚠️ Error fetching page ${page}:`, pageError);
        
        // If rate limited, don't try more pages
        if (pageError.message?.includes('Rate limit')) {
          console.log('🚫 Rate limit reached, stopping pagination');
          break;
        }
        
        hasMorePages = false;
      }
    }

    // Fetch agents (single call)
    let agents: Agent[] = [];
    try {
      const agentsResponse = await freshserviceApi.getAgents(1, 100);
      agents = agentsResponse.agents || [];
      console.log(`✅ Retrieved ${agents.length} agents`);
    } catch (agentsError: any) {
      console.warn('⚠️ Failed to fetch agents:', agentsError);
      
      // Don't fail the whole dashboard if agents fail
      if (!agentsError.message?.includes('Rate limit')) {
        console.log('📊 Continuing without agent data...');
      }
    }

    console.log(`🎉 Successfully fetched ${allTickets.length} total tickets (from ${page - 1} pages)`);

    // Apply filters to tickets
    const filteredTickets = filterTickets(allTickets, filters);
    console.log(`🔍 Filtered to ${filteredTickets.length} tickets based on criteria`);

    // Transform data for dashboard
    const dashboardData: DashboardData = {
      ticketsByStatus: createTicketsByStatusChartData(filteredTickets),
      ticketsByPriority: createTicketsByPriorityChartData(filteredTickets),
      ticketsByCategory: createTicketsByCategoryChartData(filteredTickets),
      ticketsTrend: createTicketsTrendChartData(filteredTickets),
      resolutionTimes: createResolutionTimesData(filteredTickets),
      agentPerformance: createAgentPerformanceData(filteredTickets, agents),
      agentWorkload: createAgentWorkloadData(filteredTickets, agents),
      stats: {
        openTickets: filteredTickets.filter(t => t.status === 2).length,
        resolvedToday: countResolvedToday(filteredTickets),
        avgResponseTime: calculateAvgResponseTime(filteredTickets),
        customerSatisfaction: '92%', // This would come from surveys/feedback in real implementation
        slaBreaches: countSLABreaches(filteredTickets),
        overdueTickets: countOverdueTickets(filteredTickets),
        unassignedTickets: countUnassignedTickets(filteredTickets),
        totalAgents: filterITAgents(agents, filteredTickets).length // Count only IT team members
      }
    };

    // Get API usage stats
    const apiStats = freshserviceApi.getStats();
    console.log('📊 API Usage Stats:', apiStats);

    console.log('🎉 Dashboard data processed successfully');
    console.log('📊 Data Summary:', {
      totalTicketsFetched: allTickets.length,
      filteredTickets: filteredTickets.length,
      agents: agents.length,
      openTickets: dashboardData.stats.openTickets,
      resolvedToday: dashboardData.stats.resolvedToday,
      slaBreaches: dashboardData.stats.slaBreaches,
      pagesRequested: page - 1,
      cacheStats: apiStats.cache,
      rateLimitStats: apiStats.rateLimit
    });

    return { success: true, data: dashboardData };

  } catch (error: any) {
    console.error('💥 Error fetching dashboard data:', error);
    
    // Provide helpful error messages for rate limiting
    if (error.message?.includes('Rate limit')) {
      return { 
        success: false, 
        error: `API rate limit reached. Please wait a moment before refreshing. ${error.message}` 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'Failed to fetch dashboard data' 
    };
  }
}

/**
 * Server action to get available agents for filtering
 */
export async function fetchAgentList(): Promise<{ success: boolean; agents?: Array<{ id: number; name: string; department?: string }>; error?: string }> {
  try {
    const agentsResponse = await freshserviceApi.getAgents(1, 100);
    const agents = agentsResponse.agents || [];
    
    const agentList = agents
      .filter(agent => agent.active)
      .map(agent => ({
        id: agent.id,
        name: agent.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
        department: agent.department
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, agents: agentList };
  } catch (error: any) {
    console.error('Error fetching agent list:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch agent list' 
    };
  }
}

/**
 * Server action to test API connection
 */
export async function testApiConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const isConnected = await freshserviceApi.testConnection();
    
    if (isConnected) {
      return { success: true };
    } else {
      return { success: false, error: 'Failed to connect to Freshservice API' };
    }
  } catch (error: any) {
    console.error('Error testing API connection:', error);
    return { 
      success: false, 
      error: error.message || 'Connection test failed' 
    };
  }
} 