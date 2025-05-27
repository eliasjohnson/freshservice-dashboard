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
 * Create enhanced agent performance data with workload analysis
 */
function createAgentPerformanceData(tickets: Ticket[], agents: Agent[]): Array<{ 
  id: number;
  name: string; 
  tickets: number; 
  resolution: number;
  avgResponseTime: string;
  workload: 'Light' | 'Moderate' | 'Heavy' | 'Overloaded';
}> {
  const agentMap: Record<number, { 
    id: number;
    name: string; 
    tickets: number; 
    resolved: number;
    totalResponseTime: number;
    responseCount: number;
  }> = {};
  
  // Initialize agent data
  agents.forEach(agent => {
    agentMap[agent.id] = {
      id: agent.id,
      name: agent.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
      tickets: 0,
      resolved: 0,
      totalResponseTime: 0,
      responseCount: 0
    };
  });
  
  // Count tickets for each agent
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

  // Calculate averages and determine workload
  const totalTickets = tickets.length;
  const avgTicketsPerAgent = totalTickets / agents.length;
  
  return Object.values(agentMap)
    .filter(agent => agent.tickets > 0)
    .map(agent => {
      const resolutionRate = agent.tickets > 0 ? Math.round((agent.resolved / agent.tickets) * 100) : 0;
      const avgResponseTime = agent.responseCount > 0 
        ? `${(agent.totalResponseTime / agent.responseCount / 60).toFixed(1)}h` 
        : 'N/A';
      
      // Determine workload based on tickets compared to average
      let workload: 'Light' | 'Moderate' | 'Heavy' | 'Overloaded';
      const ratio = agent.tickets / avgTicketsPerAgent;
      if (ratio < 0.5) workload = 'Light';
      else if (ratio < 1.0) workload = 'Moderate';
      else if (ratio < 1.5) workload = 'Heavy';
      else workload = 'Overloaded';

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
 * Create agent workload distribution chart data
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
 * Server action to fetch dashboard data with filtering
 */
export async function fetchDashboardData(filters: DashboardFilters = { timeRange: 'week' }): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
  try {
    console.log('🏗️ Fetching dashboard data from server action with filters:', filters);

    // Fetch data from Freshservice API
    const [ticketsResponse, agentsResponse] = await Promise.allSettled([
      freshserviceApi.getTickets(1, 100),
      freshserviceApi.getAgents(1, 50),
    ]);

    let tickets: Ticket[] = [];
    let agents: Agent[] = [];

    if (ticketsResponse.status === 'fulfilled') {
      tickets = ticketsResponse.value.tickets || [];
      console.log(`✅ Retrieved ${tickets.length} tickets`);
    } else {
      console.warn('⚠️ Failed to fetch tickets:', ticketsResponse.reason);
    }

    if (agentsResponse.status === 'fulfilled') {
      agents = agentsResponse.value.agents || [];
      console.log(`✅ Retrieved ${agents.length} agents`);
    } else {
      console.warn('⚠️ Failed to fetch agents:', agentsResponse.reason);
    }

    // Apply filters to tickets
    const filteredTickets = filterTickets(tickets, filters);
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
        totalAgents: agents.filter(a => a.active).length
      }
    };

    console.log('🎉 Dashboard data processed successfully');
    console.log('📊 Data Summary:', {
      tickets: filteredTickets.length,
      agents: agents.length,
      openTickets: dashboardData.stats.openTickets,
      resolvedToday: dashboardData.stats.resolvedToday,
      slaBreaches: dashboardData.stats.slaBreaches
    });

    return { success: true, data: dashboardData };

  } catch (error: any) {
    console.error('💥 Error fetching dashboard data:', error);
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