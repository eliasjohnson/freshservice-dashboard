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
  2: 'Open',
  3: 'Pending',
  4: 'Resolved',
  5: 'Closed',
  1: 'New', // Keep this in case there are any status 1 tickets
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
  console.log(`🎯 Starting with ${filtered.length} total tickets`);

  // Debug: Show workspace distribution
  const workspaceCounts: Record<number, number> = {};
  tickets.forEach(ticket => {
    if (ticket.workspace_id !== undefined) {
      workspaceCounts[ticket.workspace_id] = (workspaceCounts[ticket.workspace_id] || 0) + 1;
    }
  });
  console.log(`🏢 Workspace distribution:`, Object.entries(workspaceCounts).map(([id, count]) => 
    `Workspace ${id}: ${count} tickets`
  ).join(', '));

  // Debug: Show status distribution of all tickets
  const allStatusCounts: Record<number, number> = {};
  tickets.forEach(ticket => {
    allStatusCounts[ticket.status] = (allStatusCounts[ticket.status] || 0) + 1;
  });
  console.log(`📊 All tickets by status:`, Object.entries(allStatusCounts).map(([status, count]) => 
    `${TICKET_STATUS[parseInt(status)] || 'Unknown'} (${status}): ${count}`
  ).join(', '));

  // FLEXIBLE: Try to find IT Support workspace or use all tickets if only one workspace
  const uniqueWorkspaces = [...new Set(tickets.map(t => t.workspace_id).filter(id => id !== undefined))] as number[];
  console.log(`🏢 Found ${uniqueWorkspaces.length} unique workspaces: [${uniqueWorkspaces.join(', ')}]`);
  
  if (uniqueWorkspaces.length === 1) {
    // If only one workspace, use all tickets
    console.log(`🏢 Only one workspace found (${uniqueWorkspaces[0]}), using all tickets`);
  } else {
    // Try workspace_id 2 first, then 1, then use the one with most tickets
    let targetWorkspace = 2;
    if (!uniqueWorkspaces.includes(2)) {
      if (uniqueWorkspaces.includes(1)) {
        targetWorkspace = 1;
        console.log(`🏢 Workspace 2 not found, using workspace 1`);
      } else {
        // Use workspace with most tickets
        targetWorkspace = uniqueWorkspaces.reduce((max, current) => 
          workspaceCounts[current] > workspaceCounts[max] ? current : max
        );
        console.log(`🏢 Using workspace ${targetWorkspace} (has most tickets: ${workspaceCounts[targetWorkspace]})`);
      }
    }
    
    const beforeWorkspace = filtered.length;
    filtered = filtered.filter(ticket => ticket.workspace_id === targetWorkspace);
    console.log(`🏢 Filtered to ${filtered.length} tickets from workspace ${targetWorkspace} (was ${beforeWorkspace})`);
  }

  // EXCLUDE ONBOARDING/OFFBOARDING TICKETS
  const beforeOnboardingFilter = filtered.length;
  filtered = filtered.filter(ticket => {
    const subject = (ticket.subject || '').toLowerCase();
    const category = (ticket.category || '').toLowerCase();
    const subCategory = (ticket.sub_category || '').toLowerCase();
    const itemCategory = (ticket.item_category || '').toLowerCase();
    const description = (ticket.description || '').toLowerCase();
    const tags = (ticket.tags || []).map(tag => tag.toLowerCase());
    
    // Keywords that indicate onboarding/offboarding tickets
    const excludeKeywords = [
      'onboarding', 'onboard', 'on-boarding', 'on boarding',
      'offboarding', 'offboard', 'off-boarding', 'off boarding',
      'new hire', 'new employee', 'employee setup', 'user setup',
      'account setup', 'employee onboarding', 'employee offboarding',
      'termination', 'departure', 'leaving', 'exit',
      'deactivate user', 'disable user', 'remove access',
      'workday', 'okta provisioning', 'auto provision'
    ];
    
    // Check if any exclude keywords are found in any of the fields
    const hasExcludeKeyword = excludeKeywords.some(keyword => 
      subject.includes(keyword) || 
      category.includes(keyword) || 
      subCategory.includes(keyword) || 
      itemCategory.includes(keyword) ||
      description.includes(keyword) ||
      tags.some(tag => tag.includes(keyword))
    );
    
    return !hasExcludeKeyword;
  });
  console.log(`🚫 Excluded onboarding/offboarding tickets: ${beforeOnboardingFilter} → ${filtered.length} tickets (removed ${beforeOnboardingFilter - filtered.length})`);

  // Filter by agent
  if (filters.agentId && filters.agentId !== 'all') {
    const beforeAgent = filtered.length;
    filtered = filtered.filter(ticket => ticket.responder_id === filters.agentId);
    console.log(`👤 Agent filter (${filters.agentId}): ${beforeAgent} → ${filtered.length} tickets`);
  }

  // Filter by time range
  const now = new Date();
  let startDate: Date;
  
  switch (filters.timeRange) {
    case 'today':
      // Show tickets from last 24 hours instead of just since midnight
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
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

  const beforeTime = filtered.length;
  filtered = filtered.filter(ticket => new Date(ticket.created_at) >= startDate);
  console.log(`⏰ Time filter (${filters.timeRange}, since ${startDate.toISOString()}): ${beforeTime} → ${filtered.length} tickets`);

  // Filter by priority
  if (filters.priority && filters.priority.length > 0) {
    const beforePriority = filtered.length;
    filtered = filtered.filter(ticket => filters.priority!.includes(ticket.priority));
    console.log(`🔥 Priority filter (${filters.priority.join(',')}): ${beforePriority} → ${filtered.length} tickets`);
  }

  // Filter by status
  if (filters.status && filters.status.length > 0) {
    const beforeStatus = filtered.length;
    filtered = filtered.filter(ticket => filters.status!.includes(ticket.status));
    console.log(`📊 Status filter (${filters.status.join(',')}): ${beforeStatus} → ${filtered.length} tickets`);
    
    // Debug: Show status distribution of remaining tickets
    const statusCounts: Record<number, number> = {};
    filtered.forEach(ticket => {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
    });
    console.log(`📊 Remaining tickets by status:`, Object.entries(statusCounts).map(([status, count]) => 
      `${TICKET_STATUS[parseInt(status)] || 'Unknown'} (${status}): ${count}`
    ).join(', '));
  }

  console.log(`🎯 Final filtered result: ${filtered.length} tickets`);
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

  const resolvedTickets = tickets.filter(t => t.status === 4 || t.status === 5); // Resolved or Closed
  
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
 * Filter agents to only include team members who handle tickets
 * Now based on agents who actually handle tickets in the primary workspace
 */
function filterITAgents(agents: Agent[], tickets: Ticket[]): Agent[] {
  // Get all responder IDs from tickets (use the same workspace logic as filtering)
  const uniqueWorkspaces = [...new Set(tickets.map(t => t.workspace_id).filter(id => id !== undefined))] as number[];
  let targetWorkspace: number;
  
  if (uniqueWorkspaces.length === 1) {
    targetWorkspace = uniqueWorkspaces[0];
  } else {
    // Use same logic as filterTickets
    targetWorkspace = 2;
    if (!uniqueWorkspaces.includes(2)) {
      if (uniqueWorkspaces.includes(1)) {
        targetWorkspace = 1;
      } else {
        const workspaceCounts: Record<number, number> = {};
        tickets.forEach(ticket => {
          if (ticket.workspace_id !== undefined) {
            workspaceCounts[ticket.workspace_id] = (workspaceCounts[ticket.workspace_id] || 0) + 1;
          }
        });
        targetWorkspace = uniqueWorkspaces.reduce((max, current) => 
          workspaceCounts[current] > workspaceCounts[max] ? current : max
        );
      }
    }
  }

  const relevantTickets = tickets.filter(ticket => ticket.workspace_id === targetWorkspace);
  const responderIds = new Set(
    relevantTickets
      .map(ticket => ticket.responder_id)
      .filter(id => id !== null && id !== undefined) as number[]
  );

  console.log(`🎯 Found ${responderIds.size} unique responders in workspace ${targetWorkspace}`);

  // Filter agents to only those who handle tickets in the target workspace
  const activeAgents = agents.filter(agent => {
    // Check if agent is active first
    if (!agent.active) return false;
    
    // Check if agent handles tickets in target workspace
    const isResponder = responderIds.has(agent.id);
    
    if (isResponder) {
      console.log(`   ✅ Active Agent: ${agent.first_name} ${agent.last_name} - ${agent.job_title || 'No title'}`);
    }
    
    return isResponder;
  });
  
  console.log(`🎯 Filtered to ${activeAgents.length} active team members from ${agents.length} total agents (based on workspace ${targetWorkspace} ticket handling)`);
  return activeAgents;
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
      if (ticket.status === 4 || ticket.status === 5) { // Resolved or Closed
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
    return updated === today && (ticket.status === 4 || ticket.status === 5); // Resolved or Closed
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
    return now > dueDate && (ticket.status === 2 || ticket.status === 3); // Open or Pending
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
    return now > dueDate && (ticket.status === 2 || ticket.status === 3); // Open or Pending
  }).length;
}

/**
 * Count unassigned tickets
 */
function countUnassignedTickets(tickets: Ticket[]): number {
  return tickets.filter(ticket => 
    !ticket.responder_id && (ticket.status === 2 || ticket.status === 3) // Open or Pending
  ).length;
}

/**
 * Calculate average response time
 * Since Freshservice doesn't provide stats.response_time in basic API calls,
 * we'll estimate based on available timestamp data
 */
function calculateAvgResponseTime(tickets: Ticket[]): string {
  let totalResponseTime = 0;
  let count = 0;
  
  console.log('🔍 === RESPONSE TIME ANALYSIS ===');
  
  // First, try to use the stats.response_time field (if available)
  tickets.forEach((ticket: Ticket) => {
    if (ticket.stats && ticket.stats.response_time) {
      totalResponseTime += ticket.stats.response_time;
      count++;
    }
  });
  
  console.log(`📊 Tickets with stats.response_time: ${count} out of ${tickets.length}`);
  
  // If no stats data, calculate estimated response time from timestamps
  if (count === 0) {
    console.log('📊 No stats.response_time found, estimating from timestamps...');
    
    // Sample first few tickets to see what data is available
    console.log('🔍 Sample ticket data structures:');
    tickets.slice(0, 3).forEach((ticket, index) => {
      console.log(`  Ticket ${index + 1}:`, {
        id: ticket.id,
        status: ticket.status,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        responder_id: ticket.responder_id,
        stats: ticket.stats,
        // Show all top-level properties to see what's available
        properties: Object.keys(ticket)
      });
    });
    
    // For estimation, use tickets that have been assigned and are not just created
    // This gives us a rough idea of how long it takes to assign/start working on tickets
    const processedTickets = tickets.filter(ticket => {
      // Must have a responder and been updated after creation
      return ticket.responder_id && 
             ticket.updated_at !== ticket.created_at &&
             ticket.status !== 2; // Not just open/new tickets
    });
    
    console.log(`📊 Tickets suitable for response time estimation: ${processedTickets.length}`);
    
    processedTickets.forEach(ticket => {
      const created = new Date(ticket.created_at);
      const updated = new Date(ticket.updated_at);
      const responseTimeHours = (updated.getTime() - created.getTime()) / (1000 * 60 * 60);
      
      // Only include reasonable response times (between 1 minute and 7 days)
      if (responseTimeHours > 0.016 && responseTimeHours < 168) { // 1 min to 7 days
        totalResponseTime += responseTimeHours;
        count++;
      }
    });
    
    console.log(`📊 Calculated estimated response times for ${count} tickets`);
    
    // If still no data, provide a more generic estimate
    if (count === 0) {
      // Look at just assigned tickets vs unassigned to give some insight
      const assignedTickets = tickets.filter(t => t.responder_id).length;
      const totalTickets = tickets.length;
      const assignmentRate = totalTickets > 0 ? (assignedTickets / totalTickets * 100).toFixed(0) : 0;
      
      console.log(`📊 Assignment rate: ${assignedTickets}/${totalTickets} (${assignmentRate}%)`);
      return `${assignmentRate}% assigned`;
    }
  }
  
  if (count === 0) {
    console.log('⚠️ No response time data available');
    return 'N/A';
  }
  
  const avgHours = totalResponseTime / count;
  let result: string;
  
  if (avgHours < 1) {
    result = `${Math.round(avgHours * 60)} min`;
  } else if (avgHours < 24) {
    result = `${avgHours.toFixed(1)} hours`;
  } else {
    result = `${(avgHours / 24).toFixed(1)} days`;
  }
    
  console.log(`📊 Average response time: ${result} (from ${count} tickets)`);
  return result;
}

/**
 * Server action to fetch dashboard data with filtering - OPTIMIZED for rate limits
 * PRO Plan: 400 calls/min overall, 120 calls/min for tickets
 */
export async function fetchDashboardData(filters: DashboardFilters = { timeRange: 'week' }): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
  try {
    console.log('🚀 === DASHBOARD DATA FETCH STARTING ===');
    console.log('🎯 Filters received:', filters);

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

    // DEBUGGING: Check raw ticket data
    console.log('🔍 === RAW TICKET ANALYSIS ===');
    console.log(`📊 Total tickets fetched: ${allTickets.length}`);
    
    if (allTickets.length > 0) {
      // Check first few tickets
      console.log('📋 Sample tickets (first 3):');
      allTickets.slice(0, 3).forEach((ticket, index) => {
        console.log(`  Ticket ${index + 1}:`, {
          id: ticket.id,
          status: ticket.status,
          workspace_id: ticket.workspace_id,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          responder_id: ticket.responder_id,
          subject: ticket.subject?.substring(0, 50) + '...',
          stats: ticket.stats,
          // Show all top-level properties to see what's available
          properties: Object.keys(ticket)
        });
      });

      // Check status distribution
      const statusDistribution: Record<number, number> = {};
      allTickets.forEach(ticket => {
        statusDistribution[ticket.status] = (statusDistribution[ticket.status] || 0) + 1;
      });
      console.log('📊 Status distribution (raw):', statusDistribution);
      
      // Check workspace distribution  
      const workspaceDistribution: Record<number, number> = {};
      allTickets.forEach(ticket => {
        if (ticket.workspace_id !== undefined) {
          workspaceDistribution[ticket.workspace_id] = (workspaceDistribution[ticket.workspace_id] || 0) + 1;
        }
      });
      console.log('🏢 Workspace distribution:', workspaceDistribution);
      
      // Check response time related fields
      console.log('🔍 Response time field analysis:');
      let hasStatsField = 0;
      let hasResponseTime = 0;
      let hasResolvedTickets = 0;
      let hasResponders = 0;
      
      allTickets.forEach(ticket => {
        if (ticket.stats) hasStatsField++;
        if (ticket.stats?.response_time) hasResponseTime++;
        if (ticket.status === 4 || ticket.status === 5) hasResolvedTickets++;
        if (ticket.responder_id) hasResponders++;
      });
      
      console.log(`  - Tickets with stats field: ${hasStatsField}/${allTickets.length}`);
      console.log(`  - Tickets with response_time: ${hasResponseTime}/${allTickets.length}`);
      console.log(`  - Resolved/Closed tickets: ${hasResolvedTickets}/${allTickets.length}`);
      console.log(`  - Tickets with responders: ${hasResponders}/${allTickets.length}`);
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
    console.log('🔧 === STARTING FILTERING ===');
    const filteredTickets = filterTickets(allTickets, filters);
    console.log(`🎯 === FILTERING COMPLETE: ${filteredTickets.length} tickets remain ===`);

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
        totalAgents: filterITAgents(agents, allTickets).length // Use all tickets for agent filtering, not just filtered ones
      }
    };

    // DEBUGGING: Final stats calculation
    console.log('📈 === FINAL STATS CALCULATION ===');
    console.log('🔍 Open tickets calculation:');
    const openTicketsDebug = filteredTickets.filter(t => t.status === 2);
    console.log(`  - Tickets with status === 2 (Open): ${openTicketsDebug.length}`);
    console.log(`  - Sample open tickets:`, openTicketsDebug.slice(0, 3).map(t => ({
      id: t.id,
      status: t.status,
      subject: t.subject?.substring(0, 30)
    })));

    // Debug: Log the generated dashboard data
    console.log('📊 Generated Dashboard Data:');
    console.log(`   Status breakdown:`, dashboardData.ticketsByStatus);
    console.log(`   Priority breakdown:`, dashboardData.ticketsByPriority);
    console.log(`   Stats:`, dashboardData.stats);

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