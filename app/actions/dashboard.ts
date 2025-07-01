'use server'

import { freshserviceApi, Ticket, Agent, Department, Contact, Group } from '../lib/freshservice';
import { apiCache, rateLimitTracker, withRateLimitRetry } from '../lib/cache';

// Enhanced performance metrics interface for comprehensive IT agent evaluation
export interface EnhancedAgentPerformance {
  id: number;
  name: string;
  
  // Core Volume Metrics
  tickets: number;
  resolution: number;
  
  // Quality Metrics
  firstCallResolution: number;
  escalationRate: number;
  reopenedRate: number;
  
  // Efficiency Metrics
  avgResponseTime: string;
  avgResolutionTime: string;
  slaCompliance: number;
  
  // Priority Performance
  urgentTicketPerformance: number;
  highPriorityResolution: number;
  
  // Workload & Capacity
  workload: 'Light' | 'Moderate' | 'Heavy' | 'Overloaded';
  peakTimePerformance: number;
  
  // Composite Scores
  qualityScore: number;
  efficiencyScore: number;
  overallScore: number;
}

// Enhanced dashboard data interface with more relevant metrics
export interface DashboardData {
  ticketsByStatus: Array<{ name: string; value: number }>;
  ticketsByPriority: Array<{ name: string; value: number }>;
  ticketsTrend: Array<{ name: string; value: number }>;
  ticketLifecycleFunnel: Array<{ 
    name: string; 
    value: number; 
    description: string;
    percentage: number;
  }>;
  agentPerformance: Array<EnhancedAgentPerformance>;
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
  // Department breakdown for understanding which teams need most support
  ticketsByCategory: Array<{ name: string; value: number }>;
  // Time-based analysis
  resolutionTimes: Array<{ name: string; value: number }>;
  // Agent workload distribution
  agentWorkload: Array<{ name: string; value: number }>;
  recentActivity: Array<{ id: number; subject: string; type: string; time: string }>;
  requesterDepartments: Array<{ name: string; value: number }>;
  // New analytics for enhanced insights
  recurringIssues: Array<{ 
    name: string; 
    value: number; 
    frequency: number;
    impact: 'Low' | 'Medium' | 'High' | 'Critical';
    trend: 'Increasing' | 'Stable' | 'Decreasing';
  }>;
  timeBasedAnalytics: {
    hourlyDistribution: Array<{ hour: string; value: number }>;
    dailyDistribution: Array<{ day: string; value: number }>;
    peakHours: Array<{ time: string; load: number }>;
  };
  geographicDistribution: Array<{ 
    region: string; 
    value: number;
    performance: number; // Average resolution time in hours
    lat?: number;
    lng?: number;
  }>;
}

// Filtering options interface
export interface DashboardFilters {
  agentId?: number | 'all';
  timeRange: 'today' | 'week' | 'month' | 'quarter';
  department?: string;
  priority?: number[];
  status?: number[];
  forceRefresh?: boolean; // Add option to bypass cache
}

// Status and priority mappings
const TICKET_STATUS: Record<number, string> = {
  2: 'Open',
  3: 'Pending',
  4: 'Resolved',
  5: 'Closed',
  6: 'Hold',                    // Custom Status 6
  8: 'Waiting on Customer',     // Custom Status 8
  1: 'New', // Keep this in case there are any status 1 tickets
};

// According to Freshservice API docs, status codes are:
// Standard: Open = 2, Pending = 3, Resolved = 4, Closed = 5
// Custom (from admin interface): Hold = 6, Waiting on Customer = 8
const getStatusName = (status: number): string => {
  return TICKET_STATUS[status] || `Custom Status ${status}`;
};

// Define which statuses represent "active" tickets that need attention
const ACTIVE_TICKET_STATUSES = [2, 3, 6, 8]; // Open, Pending, Hold, Waiting on Customer
const RESOLVED_STATUSES = [4, 5]; // Resolved, Closed

const TICKET_PRIORITY: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};

// Add interface for conversation type
interface Conversation {
  id: number;
  user_id: number;
  created_at: string;
  body?: string;
  private?: boolean;
}

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
    `${getStatusName(parseInt(status))} (${status}): ${count}`
  ).join(', '));

  // FLEXIBLE: Try to find IT Support workspace or use all tickets if only one workspace
  const uniqueWorkspaces = [...new Set(tickets.map(t => t.workspace_id).filter(id => id !== undefined))] as number[];
  console.log(`🏢 Found ${uniqueWorkspaces.length} unique workspaces: [${uniqueWorkspaces.join(', ')}]`);
  
  if (uniqueWorkspaces.length === 0) {
    // No workspace information available, use all tickets
    console.log(`🏢 No workspace information found, using all tickets`);
  } else if (uniqueWorkspaces.length === 1) {
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
        // Use workspace with most tickets - with proper initial value
        targetWorkspace = uniqueWorkspaces.reduce((max, current) => 
          workspaceCounts[current] > workspaceCounts[max] ? current : max,
          uniqueWorkspaces[0] // Use first workspace as initial value
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
      `${getStatusName(parseInt(status))} (${status}): ${count}`
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
    const status = getStatusName(ticket.status);
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  
  // Sort by value (descending) for better visual hierarchy  
  return Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
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
  
  // Sort by priority level (Urgent -> High -> Medium -> Low)
  const priorityOrder = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1, 'Unknown': 0 };
  return Object.entries(priorityCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => (priorityOrder[b.name as keyof typeof priorityOrder] || 0) - (priorityOrder[a.name as keyof typeof priorityOrder] || 0));
}

/**
 * Transform tickets to chart data by requester department (based on requester's actual department)
 */
function createTicketsByDepartmentChartData(tickets: Ticket[], departments: Department[], contacts: Contact[]): Array<{ name: string; value: number }> {
  const departmentCounts: Record<string, number> = {};
  
  console.log('🏢 === REQUESTER DEPARTMENT ANALYSIS ===');
  console.log(`📊 Analyzing ${tickets.length} tickets by requester department`);
  console.log(`🏛️ Available departments: ${departments.length}`);
  console.log(`👤 Available contacts: ${contacts.length}`);
  
  // Create a map from department ID to department name
  const departmentMap: Record<number, string> = {};
  departments.forEach(dept => {
    departmentMap[dept.id] = dept.name;
  });
  
  // Create a map from contact ID to their department info
  const contactDepartmentMap: Record<number, string[]> = {};
  contacts.forEach(contact => {
    if (contact.department_ids && contact.department_ids.length > 0) {
      // Map department IDs to department names
      contactDepartmentMap[contact.id] = contact.department_ids
        .map(deptId => departmentMap[deptId])
        .filter(name => name !== undefined);
    } else if (contact.department_names && contact.department_names.length > 0) {
      // Use department names directly if available
      contactDepartmentMap[contact.id] = contact.department_names;
    }
  });
  
  console.log('👤 Sample contact department mappings:');
  Object.entries(contactDepartmentMap).slice(0, 5).forEach(([contactId, depts]) => {
    console.log(`  Contact ${contactId}: ${depts.join(', ')}`);
  });
  
  let ticketsWithRequesterDepts = 0;
  let ticketsWithoutRequesterDepts = 0;
  
  tickets.forEach(ticket => {
    let departmentName = 'Unknown Department';
    
    // Look up the requester's department
    if (ticket.requester_id && contactDepartmentMap[ticket.requester_id]) {
      const requesterDepts = contactDepartmentMap[ticket.requester_id];
      if (requesterDepts.length > 0) {
        // Use the first department if there are multiple
        departmentName = requesterDepts[0];
        ticketsWithRequesterDepts++;
      } else {
        ticketsWithoutRequesterDepts++;
      }
    } else {
      ticketsWithoutRequesterDepts++;
    }
    
    // Clean up department name for better display
    departmentName = departmentName
      .replace(/[_-]/g, ' ') // Replace underscores and dashes with spaces
      .replace(/\b\w/g, l => l.toUpperCase()) // Title case
      .trim();
    
    // Limit length for better chart display
    if (departmentName.length > 30) {
      departmentName = departmentName.substring(0, 30) + '...';
    }
    
    departmentCounts[departmentName] = (departmentCounts[departmentName] || 0) + 1;
  });
  
  console.log(`📊 Tickets with requester departments: ${ticketsWithRequesterDepts}`);
  console.log(`📊 Tickets without requester departments: ${ticketsWithoutRequesterDepts}`);
  
  // Debug: Show some tickets that still ended up as unknown
  const unknownTickets = tickets.filter(ticket => 
    !ticket.requester_id || !contactDepartmentMap[ticket.requester_id] || 
    contactDepartmentMap[ticket.requester_id].length === 0
  );
  
  if (unknownTickets.length > 0) {
    console.log(`🔍 Sample tickets still unknown (first 5):`);
    unknownTickets.slice(0, 5).forEach((ticket, index) => {
      console.log(`  Unknown Ticket ${index + 1}:`, {
        id: ticket.id,
        subject: ticket.subject?.substring(0, 50) + '...',
        requester_id: ticket.requester_id,
        requester_in_contacts: !!contactDepartmentMap[ticket.requester_id],
        requester_depts: contactDepartmentMap[ticket.requester_id] || []
      });
    });
  }
  
  const result = Object.entries(departmentCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 departments for better chart readability
  
  console.log('🏢 Final requester department breakdown:', result);
  
  return result;
}

/**
 * Create ticket lifecycle funnel data
 * Restored to original business logic: status distribution funnel
 */
function createTicketLifecycleFunnelData(tickets: Ticket[]): Array<{ 
  name: string; 
  value: number; 
  description: string;
  percentage: number;
}> {
  const totalTickets = tickets.length;
  
  if (totalTickets === 0) {
    return [];
  }
  
  // RESTORED: Original status-based funnel logic
  const submitted = totalTickets; // All tickets in the time period
  
  // Active = tickets currently needing attention (Open + Pending + Hold + Waiting on Customer)
  const active = tickets.filter(t => [2, 3, 6, 8].includes(t.status)).length;
  
  // Resolved = tickets currently completed (Resolved + Closed)
  const resolved = tickets.filter(t => [4, 5].includes(t.status)).length;
  
  return [
    {
      name: 'Submitted',
      value: submitted,
      description: 'Total tickets created',
      percentage: 100
    },
    {
      name: 'Active',
      value: active,
      description: 'Currently needing attention',
      percentage: Math.round((active / submitted) * 100)
    },
    {
      name: 'Resolved',
      value: resolved,
      description: 'Currently completed',
      percentage: Math.round((resolved / submitted) * 100)
    }
  ];
}

/**
 * Create dynamic trend data based on time period
 */
function createTicketsTrendChartData(tickets: Ticket[], timeRange: string): Array<{ name: string; value: number }> {
  switch (timeRange) {
    case 'today': {
      // Show last 24 hours in 4-hour blocks
      const blocks = ['0-4h', '4-8h', '8-12h', '12-16h', '16-20h', '20-24h'];
      const blockCounts: Record<string, number> = blocks.reduce((acc, block) => ({...acc, [block]: 0}), {});
      
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      tickets.forEach(ticket => {
        const createdAt = new Date(ticket.created_at);
        if (createdAt >= twentyFourHoursAgo) {
          const hoursDiff = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
          const blockIndex = Math.floor(hoursDiff / 4);
          if (blockIndex >= 0 && blockIndex < blocks.length) {
            blockCounts[blocks[blocks.length - 1 - blockIndex]]++;
          }
        }
      });
      
      return blocks.map(block => ({
        name: block,
        value: blockCounts[block]
      }));
    }
    
    case 'week': {
      // Show last 7 days
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayCounts: Record<string, number> = days.reduce((acc, day) => ({...acc, [day]: 0}), {});
      
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
    
    case 'month': {
      // Show last 30 days in weeks
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      const weekCounts: Record<string, number> = weeks.reduce((acc, week) => ({...acc, [week]: 0}), {});
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      tickets.forEach(ticket => {
        const createdAt = new Date(ticket.created_at);
        if (createdAt >= thirtyDaysAgo) {
          const daysDiff = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          const weekIndex = Math.floor(daysDiff / 7);
          if (weekIndex >= 0 && weekIndex < weeks.length) {
            weekCounts[weeks[weeks.length - 1 - weekIndex]]++;
          }
        }
      });
      
      return weeks.map(week => ({
        name: week,
        value: weekCounts[week]
      }));
    }
    
    default: {
      // Quarter view - show by month
      const months = ['Month 1', 'Month 2', 'Month 3'];
      const monthCounts: Record<string, number> = months.reduce((acc, month) => ({...acc, [month]: 0}), {});
      
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      tickets.forEach(ticket => {
        const createdAt = new Date(ticket.created_at);
        if (createdAt >= threeMonthsAgo) {
          const monthsDiff = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
          if (monthsDiff >= 0 && monthsDiff < months.length) {
            monthCounts[months[months.length - 1 - monthsDiff]]++;
          }
        }
      });
      
      return months.map(month => ({
        name: month,
        value: monthCounts[month]
      }));
    }
  }
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

  const resolvedTickets = tickets.filter(t => RESOLVED_STATUSES.includes(t.status)); // Use RESOLVED_STATUSES constant
  
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
  
  if (uniqueWorkspaces.length === 0) {
    // No workspace information available, use all tickets
    console.log(`🎯 No workspace information found in filterITAgents, using all tickets`);
    const responderIds = new Set(
      tickets
        .map(ticket => ticket.responder_id)
        .filter(id => id !== null && id !== undefined) as number[]
    );

    console.log(`🎯 Found ${responderIds.size} unique responders across all tickets`);

    // Filter agents to only those who handle tickets
    const activeAgents = agents.filter(agent => {
      if (!agent.active) return false;
      const isResponder = responderIds.has(agent.id);
      if (isResponder) {
        console.log(`   ✅ Active Agent: ${agent.first_name} ${agent.last_name} - ${agent.job_title || 'No title'}`);
      }
      return isResponder;
    });
    
    console.log(`🎯 Filtered to ${activeAgents.length} active team members from ${agents.length} total agents (no workspace filtering)`);
    return activeAgents;
  } else if (uniqueWorkspaces.length === 1) {
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
          workspaceCounts[current] > workspaceCounts[max] ? current : max,
          uniqueWorkspaces[0] // Use first workspace as initial value
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

// Precise IT support agent identification using department-based filtering
function getITSpecificAgents(agents: Agent[], tickets: Ticket[], groups: Group[] = [], departments: Department[] = []): Agent[] {
  console.log(`🎯 === IT SUPPORT TEAM IDENTIFICATION ===`);
  console.log(`📊 Input: ${agents.length} agents total`);
  
  // Create department lookup map
  const departmentMap = new Map(departments.map(d => [d.id, d.name]));
  
  // Debug: Log all unique departments to see what's available
  const allDepartments = [...new Set(agents.map(agent => agent.department).filter(Boolean))];
  console.log(`🔍 All unique departments found: ${allDepartments.join(', ')}`);
  
  // Debug: Log sample agents with their departments
  console.log(`🔍 Sample agents and their departments:`);
  agents.slice(0, 10).forEach(agent => {
    const deptNames = agent.department_ids ? agent.department_ids.map(id => departmentMap.get(id)).filter(Boolean) : [];
    console.log(`   - ${agent.first_name} ${agent.last_name}: dept="${agent.department}", dept_ids=[${deptNames.join(', ')}], active=${agent.active}`);
  });
  
  const itAgents = agents.filter(agent => {
    
    // Check department field and department_ids for specific department
    const department = agent.department?.toLowerCase() || '';
    const departmentNames = agent.department_ids ? 
      agent.department_ids.map(id => departmentMap.get(id)?.toLowerCase()).filter(Boolean) : [];
    
    // Check for specific department ID 11000324230 or "Freshservice-dashboard" department
    const hasTargetDepartment = 
      agent.department_ids?.includes(11000324230) ||
      department === 'freshservice-dashboard' ||
      department.includes('freshservice-dashboard') ||
      departmentNames.some(name => 
        name === 'freshservice-dashboard' ||
        name?.includes('freshservice-dashboard')
      );
    
    if (hasTargetDepartment) {
      const deptInfo = departmentNames.length > 0 ? departmentNames.join(', ') : agent.department;
      console.log(`   ✅ Freshservice-dashboard Agent: ${agent.first_name} ${agent.last_name} (dept:"${deptInfo}") - ${agent.email}`);
      return true;
    }
    
    return false;
  });
  
  console.log(`🎯 Identified ${itAgents.length} Freshservice-dashboard agents from ${agents.length} total agents`);
  
  // If no agents found, let's see what departments are available
  if (itAgents.length === 0) {
    console.log(`⚠️ No IT agents found! Let's check what departments are available:`);
    agents.slice(0, 20).forEach(agent => {
      if (agent.active) {
        const deptNames = agent.department_ids ? agent.department_ids.map(id => departmentMap.get(id)).filter(Boolean) : [];
        console.log(`   - ${agent.first_name} ${agent.last_name}: dept="${agent.department}", dept_ids=[${deptNames.join(', ')}]`);
      }
    });
  }
  
  // List the found IT agents for verification
  if (itAgents.length > 0) {
    console.log(`📋 Found IT agents:`);
    itAgents.forEach((agent, index) => {
      const deptInfo = agent.department_ids ? 
        agent.department_ids.map(id => departmentMap.get(id)).filter(Boolean).join(', ') : 
        agent.department;
      console.log(`   ${index + 1}. ${agent.first_name} ${agent.last_name} (dept:"${deptInfo}")`);
    });
  }
  
  return itAgents;
}

// Helper function to get agents who handle tickets in the primary IT workspace
function getWorkspaceResponders(tickets: Ticket[]): Set<number> {
  // Use the same workspace logic as ticket filtering
  const uniqueWorkspaces = [...new Set(tickets.map(t => t.workspace_id).filter(id => id !== undefined))] as number[];
  let targetWorkspace: number;
  
  if (uniqueWorkspaces.length === 0) {
    // No workspace information, use all responders
    const responderIds = new Set(
      tickets
        .map(ticket => ticket.responder_id)
        .filter(id => id !== null && id !== undefined) as number[]
    );
    return responderIds;
  } else if (uniqueWorkspaces.length === 1) {
    targetWorkspace = uniqueWorkspaces[0];
  } else {
    // Prefer workspace 2 (IT), then 1, then highest ticket count
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
          workspaceCounts[current] > workspaceCounts[max] ? current : max,
          uniqueWorkspaces[0]
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
  return responderIds;
}

/**
 * Create enhanced agent performance data with workload analysis - IT TEAM ONLY
 */
function createAgentPerformanceData(tickets: Ticket[], agents: Agent[], groups: Group[] = [], departments: Department[] = []): Array<EnhancedAgentPerformance> {
  // INCLUDE ONLY IT-SPECIFIC AGENTS using comprehensive filtering
  const itSpecificAgents = getITSpecificAgents(agents, tickets, groups, departments);
  
  const agentMap: Record<number, { 
    id: number;
    name: string; 
    
    // Volume tracking
    tickets: number; 
    resolved: number;
    
    // Quality tracking
    firstCallResolutions: number;
    escalations: number;
    reopened: number;
    
    // Timing tracking
    totalResponseTime: number;
    totalResolutionTime: number;
    responseCount: number;
    resolutionCount: number;
    
    // SLA tracking
    slaCompliant: number;
    slaTotal: number;
    
    // Priority tracking
    urgentTickets: number;
    urgentResolved: number;
    highPriorityTickets: number;
    highPriorityResolved: number;
    
    // Peak time tracking
    peakTimeTickets: number;
    peakTimeResolved: number;
  }> = {};
  
  // Initialize agent data - IT-SPECIFIC AGENTS ONLY
  itSpecificAgents.forEach(agent => {
    agentMap[agent.id] = {
      id: agent.id,
      name: agent.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
      
      // Volume tracking
      tickets: 0,
      resolved: 0,
      
      // Quality tracking
      firstCallResolutions: 0,
      escalations: 0,
      reopened: 0,
      
      // Timing tracking
      totalResponseTime: 0,
      totalResolutionTime: 0,
      responseCount: 0,
      resolutionCount: 0,
      
      // SLA tracking
      slaCompliant: 0,
      slaTotal: 0,
      
      // Priority tracking
      urgentTickets: 0,
      urgentResolved: 0,
      highPriorityTickets: 0,
      highPriorityResolved: 0,
      
      // Peak time tracking
      peakTimeTickets: 0,
      peakTimeResolved: 0
    };
  });
  
  // Helper functions for enhanced metric calculations
  const isPeakTime = (dateString: string): boolean => {
    const date = new Date(dateString);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    // Peak hours: 9AM-12PM and 1PM-5PM, Monday-Friday
    return (dayOfWeek >= 1 && dayOfWeek <= 5) && 
           ((hour >= 9 && hour < 12) || (hour >= 13 && hour < 17));
  };
  
  const isUrgentTicket = (priority: number): boolean => priority === 4; // Priority 4 = Urgent
  const isHighPriorityTicket = (priority: number): boolean => priority >= 3; // Priority 3+ = High/Urgent
  
  const calculateTimeDiff = (start: string, end: string): number => {
    return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60); // Hours
  };
  
  const isSLACompliant = (ticket: Ticket): boolean => {
    if (!ticket.due_by || !ticket.updated_at) return false;
    return new Date(ticket.updated_at) <= new Date(ticket.due_by);
  };
  
  // Process tickets with comprehensive metric collection
  console.log(`📊 Processing ${tickets.length} tickets for comprehensive agent performance metrics...`);
  
  tickets.forEach(ticket => {
    // Enhanced ticket-agent matching using multiple assignment fields
    const assignedAgentId = ticket.responder_id || ticket.agent_id || ticket.assigned_agent_id || ticket.owner_id;
    
    if (assignedAgentId && agentMap[assignedAgentId]) {
      const agent = agentMap[assignedAgentId];
      
      // Core volume metrics
      agent.tickets++;
      
      // Resolved ticket tracking
      if (RESOLVED_STATUSES.includes(ticket.status)) {
        agent.resolved++;
        agent.resolutionCount++;
        
        // Resolution time calculation
        if (ticket.created_at && ticket.updated_at) {
          const resolutionTime = calculateTimeDiff(ticket.created_at, ticket.updated_at);
          if (resolutionTime > 0 && resolutionTime < 720) { // Max 30 days
            agent.totalResolutionTime += resolutionTime;
          }
        }
      }
      
      // Response time calculation (for all tickets with timestamps)
      if (ticket.created_at && ticket.updated_at) {
        const responseTime = calculateTimeDiff(ticket.created_at, ticket.updated_at);
        if (responseTime > 0.016 && responseTime < 168) { // 1 min to 7 days
          agent.totalResponseTime += responseTime;
          agent.responseCount++;
        }
      }
      
      // SLA compliance tracking
      if (ticket.due_by) {
        agent.slaTotal++;
        if (isSLACompliant(ticket)) {
          agent.slaCompliant++;
        }
      }
      
      // Priority-based performance
      if (isUrgentTicket(ticket.priority)) {
        agent.urgentTickets++;
        if (RESOLVED_STATUSES.includes(ticket.status)) {
          agent.urgentResolved++;
        }
      }
      
      if (isHighPriorityTicket(ticket.priority)) {
        agent.highPriorityTickets++;
        if (RESOLVED_STATUSES.includes(ticket.status)) {
          agent.highPriorityResolved++;
        }
      }
      
      // Peak time performance
      if (ticket.created_at && isPeakTime(ticket.created_at)) {
        agent.peakTimeTickets++;
        if (RESOLVED_STATUSES.includes(ticket.status)) {
          agent.peakTimeResolved++;
        }
      }
      
      // Quality metrics (simplified heuristics)
      // First-call resolution: resolved tickets with minimal updates (estimated)
      if (RESOLVED_STATUSES.includes(ticket.status)) {
        if (ticket.created_at && ticket.updated_at) {
          const resolutionTime = calculateTimeDiff(ticket.created_at, ticket.updated_at);
          // Assume quick resolution (< 4 hours) indicates first-call resolution
          if (resolutionTime < 4) {
            agent.firstCallResolutions++;
          }
        }
      }
      
      // TODO: Escalation and reopened tracking would require conversation/activity data
      // For now, using simplified heuristics based on available data
    }
  });

  // Calculate comprehensive performance metrics and scoring
  const totalTickets = tickets.length;
  const avgTicketsPerAgent = itSpecificAgents.length > 0 ? totalTickets / itSpecificAgents.length : 0;
  
  console.log(`📈 Calculating comprehensive performance metrics for ${Object.keys(agentMap).length} IT agents...`);
  
  return Object.values(agentMap)
    .map((agent): EnhancedAgentPerformance => {
      // Core metrics
      const resolutionRate = agent.tickets > 0 ? Math.round((agent.resolved / agent.tickets) * 100) : 0;
      
      // Quality metrics
      const firstCallResolution = agent.resolved > 0 ? Math.round((agent.firstCallResolutions / agent.resolved) * 100) : 0;
      const escalationRate = agent.tickets > 0 ? Math.round((agent.escalations / agent.tickets) * 100) : 0;
      const reopenedRate = agent.resolved > 0 ? Math.round((agent.reopened / agent.resolved) * 100) : 0;
      
      // Efficiency metrics
      const avgResponseTime = agent.responseCount > 0 
        ? (() => {
            const avgHours = agent.totalResponseTime / agent.responseCount;
            if (avgHours < 1) return `${Math.round(avgHours * 60)}min`;
            else if (avgHours < 24) return `${avgHours.toFixed(1)}h`;
            else return `${(avgHours / 24).toFixed(1)}d`;
          })()
        : agent.tickets === 0 ? 'No tickets' : 'N/A';
        
      const avgResolutionTime = agent.resolutionCount > 0
        ? (() => {
            const avgHours = agent.totalResolutionTime / agent.resolutionCount;
            if (avgHours < 1) return `${Math.round(avgHours * 60)}min`;
            else if (avgHours < 24) return `${avgHours.toFixed(1)}h`;
            else return `${(avgHours / 24).toFixed(1)}d`;
          })()
        : 'N/A';
        
      const slaCompliance = agent.slaTotal > 0 ? Math.round((agent.slaCompliant / agent.slaTotal) * 100) : 0;
      
      // Priority performance
      const urgentTicketPerformance = agent.urgentTickets > 0 ? Math.round((agent.urgentResolved / agent.urgentTickets) * 100) : 0;
      const highPriorityResolution = agent.highPriorityTickets > 0 ? Math.round((agent.highPriorityResolved / agent.highPriorityTickets) * 100) : 0;
      
      // Workload assessment
      let workload: 'Light' | 'Moderate' | 'Heavy' | 'Overloaded';
      if (agent.tickets === 0) {
        workload = 'Light';
      } else if (avgTicketsPerAgent === 0) {
        workload = 'Light';
      } else {
        const ratio = agent.tickets / avgTicketsPerAgent;
        if (ratio < 0.5) workload = 'Light';
        else if (ratio < 1.0) workload = 'Moderate';
        else if (ratio < 1.5) workload = 'Heavy';
        else workload = 'Overloaded';
      }
      
      // Peak time performance
      const peakTimePerformance = agent.peakTimeTickets > 0 ? Math.round((agent.peakTimeResolved / agent.peakTimeTickets) * 100) : 0;
      
      // Composite scoring (0-100 scale)
      const qualityScore = Math.round((
        (firstCallResolution * 0.4) +
        ((100 - escalationRate) * 0.3) +
        ((100 - reopenedRate) * 0.3)
      ));
      
      const efficiencyScore = Math.round((
        (slaCompliance * 0.5) +
        (resolutionRate * 0.3) +
        (urgentTicketPerformance * 0.2)
      ));
      
      const overallScore = Math.round((
        (qualityScore * 0.4) +
        (efficiencyScore * 0.4) +
        (highPriorityResolution * 0.2)
      ));
      
      return {
        id: agent.id,
        name: agent.name,
        
        // Core volume metrics
        tickets: agent.tickets,
        resolution: resolutionRate,
        
        // Quality metrics
        firstCallResolution,
        escalationRate,
        reopenedRate,
        
        // Efficiency metrics
        avgResponseTime,
        avgResolutionTime,
        slaCompliance,
        
        // Priority performance
        urgentTicketPerformance,
        highPriorityResolution,
        
        // Workload & capacity
        workload,
        peakTimePerformance,
        
        // Composite scores
        qualityScore,
        efficiencyScore,
        overallScore
      };
    })
    .sort((a, b) => {
      // Sort by tickets count (highest first), then by overall score
      if (a.tickets !== b.tickets) {
        return b.tickets - a.tickets;
      }
      return b.overallScore - a.overallScore;
    });
}

/**
 * Create agent workload distribution chart data - IT TEAM ONLY
 */
function createAgentWorkloadData(tickets: Ticket[], agents: Agent[], groups: Group[] = [], departments: Department[] = []): Array<{ name: string; value: number }> {
  const agentPerformance = createAgentPerformanceData(tickets, agents, groups, departments);
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
    return updated === today && RESOLVED_STATUSES.includes(ticket.status); // Use RESOLVED_STATUSES constant
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
    return now > dueDate && ACTIVE_TICKET_STATUSES.includes(ticket.status); // Use ACTIVE_TICKET_STATUSES
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
    return now > dueDate && ACTIVE_TICKET_STATUSES.includes(ticket.status); // Use ACTIVE_TICKET_STATUSES
  }).length;
}

/**
 * Count unassigned tickets
 */
function countUnassignedTickets(tickets: Ticket[]): number {
  return tickets.filter(ticket => 
    !ticket.responder_id && ACTIVE_TICKET_STATUSES.includes(ticket.status) // Use ACTIVE_TICKET_STATUSES
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
 * OPTIMIZED: Calculate actual first response time using conversations API with intelligent caching
 * This matches Freshservice's official calculation methodology
 * Only processes recent tickets to reduce API load
 */
async function calculateActualFirstResponseTime(tickets: Ticket[], filters: DashboardFilters): Promise<string> {
  console.log('📞 === RESPONSE TIME CALCULATION ===');
  
  // Use the same time range as the dashboard filter
  let recentTickets = tickets; // Already filtered by time range
  
  console.log(`🎯 Processing ${recentTickets.length} tickets for ${filters.timeRange} period`);
  
  // OPTIMIZATION 2: Limit to maximum 15 tickets to prevent excessive API calls
  const limitedTickets = recentTickets.slice(0, 15);
  console.log(`⚡ Limited to ${limitedTickets.length} tickets for response time analysis`);
  
  if (limitedTickets.length === 0) {
    console.log('⚠️ No recent tickets found for response time calculation');
    return 'N/A';
  }
  
  let totalResponseTimeMinutes = 0;
  let validResponseCount = 0;
  
  // OPTIMIZATION 3: Process tickets with intelligent caching and delays
  for (const ticket of limitedTickets) {
    if (!ticket.created_at) continue;
    
    try {
      const createdAt = new Date(ticket.created_at);
      
      // Check cache first
      const cacheKey = `conversations_${ticket.id}`;
      let conversations = apiCache.get<Conversation[]>(cacheKey);
      
      if (!conversations) {
        console.log(`🌐 Cache MISS: fetching conversations for ticket ${ticket.id}...`);
        
        // Add longer delay to respect rate limits (200ms instead of 100ms)
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const result = await withRateLimitRetry(
          () => freshserviceApi.getTicketConversations(Number(ticket.id))
        );
        
        conversations = result.conversations || [];
        
        // Cache conversations for 10 minutes
        apiCache.set(cacheKey, conversations, 10 * 60 * 1000);
        console.log(`💾 Cached conversations for ticket ${ticket.id}`);
      }
      
      if (!conversations || conversations.length === 0) {
        console.log(`🎫 Tickets Count: ${conversations?.length || 0}`);
        continue;
      }
      
      // Find first agent response (non-private conversation from an agent)
      const firstAgentResponse = conversations
        .filter(conv => 
          conv.user_id && 
          conv.user_id !== ticket.requester_id && 
          !conv.private &&
          conv.created_at
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
      
      if (firstAgentResponse) {
        const responseAt = new Date(firstAgentResponse.created_at);
        const responseTimeMinutes = (responseAt.getTime() - createdAt.getTime()) / (1000 * 60);
        
        // Only include reasonable response times (1 minute to 7 days)
        if (responseTimeMinutes > 1 && responseTimeMinutes < 10080) {
          totalResponseTimeMinutes += responseTimeMinutes;
          validResponseCount++;
          
          console.log(`  ✅ Ticket ${ticket.id}: ${responseTimeMinutes.toFixed(1)} minutes`);
        }
      }
      
    } catch (error) {
      console.warn(`⚠️ Failed to get conversations for ticket ${ticket.id}:`, error);
      // Continue with other tickets
    }
  }
  
  if (validResponseCount === 0) {
    console.log('⚠️ No valid first response times found from conversations');
    return 'N/A';
  }
  
  const avgResponseTimeMinutes = totalResponseTimeMinutes / validResponseCount;
  console.log(`📊 Average first response time: ${avgResponseTimeMinutes.toFixed(1)} minutes (from ${validResponseCount} tickets)`);
  console.log(`📊 This represents response time for recent activity (last 30 days)`);
  
  return `${avgResponseTimeMinutes.toFixed(1)} min`;
}

/**
 * Server action to fetch dashboard data with filtering - OPTIMIZED for rate limits and caching
 * PRO Plan: 400 calls/min overall, 120 calls/min for tickets
 */
export async function fetchDashboardData(filters: DashboardFilters = { timeRange: 'week' }): Promise<{ success: boolean; data?: DashboardData; error?: string }> {
  try {
    console.log('🚀 === DASHBOARD DATA FETCH STARTING ===');
    console.log('🎯 Filters received:', filters);
    
    // DON'T clear cache - let it work intelligently!
    // Only clear cache if explicitly requested (e.g., force refresh)
    if (filters.forceRefresh) {
      console.log('🔄 Force refresh requested - clearing cache...');
      apiCache.clear();
      freshserviceApi.clearCache();
    }
    
    // Check cache status
    const cacheStats = apiCache.getStats();
    console.log('💾 Current cache status:', cacheStats);

    // OPTIMIZED: Use intelligent ticket fetching with caching
    let allTickets: Ticket[] = [];
    let page = 1;
    let totalEntries: number | undefined;
    const cachedTickets = !filters.forceRefresh ? apiCache.get<Ticket[]>('all_tickets') : null;
    
    if (cachedTickets) {
      console.log(`💾 Using cached tickets: ${cachedTickets.length} tickets (cache hit!)`);
      allTickets = cachedTickets;
    } else {
      console.log('🔄 Cache miss - fetching fresh ticket data...');
      
      // Fetch all tickets with intelligent pagination
      let hasMorePages = true;
      let totalPages: number | undefined;
      // Smart pagination: Use API meta info to determine optimal page count
      // Default to 30 pages (3,000 tickets) as a reasonable maximum for quarterly data
      let maxSafePages = 30;
      
      console.log('📋 Fetching tickets with smart pagination (optimized for ~3,000 quarterly tickets)...');
      
      while (hasMorePages && page <= maxSafePages) {
        try {
          const ticketsResponse = await freshserviceApi.getTickets(page, 100);
          
          // Extract pagination info from first response and optimize page limit
          if (page === 1) {
            if (ticketsResponse.meta) {
              totalPages = ticketsResponse.meta.total_pages;
              totalEntries = ticketsResponse.meta.total_entries;
              console.log(`📊 API Meta Info: ${totalEntries} total tickets across ${totalPages} pages`);
              
              // Optimize page limit based on actual data size
              if (totalPages && totalPages < maxSafePages) {
                maxSafePages = totalPages;
                console.log(`🚀 Optimized: Reducing page limit to ${maxSafePages} based on actual data`);
              } else if (totalEntries && totalEntries > 4000) {
                // If more than 4,000 tickets, we might need more pages
                maxSafePages = Math.min(40, Math.ceil(totalEntries / 100));
                console.log(`📈 Adjusted: Increasing page limit to ${maxSafePages} for ${totalEntries} tickets`);
              }
            }
          }
          
          if (ticketsResponse.tickets && ticketsResponse.tickets.length > 0) {
            allTickets = allTickets.concat(ticketsResponse.tickets);
            console.log(`✅ Page ${page}${totalPages ? `/${totalPages}` : ''}: ${ticketsResponse.tickets.length} tickets (Total: ${allTickets.length})`);
            
            // Smart early termination for performance optimization
            if (totalPages && page >= totalPages) {
              hasMorePages = false;
              console.log(`📊 Reached end based on API meta info (${totalPages} pages)`);
            } else if (ticketsResponse.tickets.length < 100) {
              hasMorePages = false;
              console.log(`📊 Reached end based on response size (${ticketsResponse.tickets.length} < 100)`);
            } else if (allTickets.length >= 3000 && page >= 15) {
              // Early termination if we have enough quarterly data
              const threeMonthsAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000));
              const recentTickets = allTickets.filter(ticket => new Date(ticket.created_at) >= threeMonthsAgo);
              if (recentTickets.length >= 2000) {
                hasMorePages = false;
                console.log(`🚀 Early termination: ${recentTickets.length} quarterly tickets found (sufficient for analysis)`);
              } else {
                page++;
              }
            } else {
              page++;
            }
          } else {
            hasMorePages = false;
            console.log(`📊 No more tickets found on page ${page}`);
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

      // Enhanced caching with longer TTL for better performance
      if (allTickets.length > 0) {
        apiCache.set('all_tickets', allTickets, 15 * 60 * 1000); // Extended to 15 minutes
        console.log(`💾 Cached ${allTickets.length} tickets for 15 minutes (reduced reloading)`);
      }
    }

    console.log(`🎉 Successfully fetched ${allTickets.length} total tickets (from ${page - 1} pages)`);

    // Quarterly data validation
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
    const quarterlyTickets = allTickets.filter(ticket => new Date(ticket.created_at) >= threeMonthsAgo);
    const quarterlyPercentage = allTickets.length > 0 ? Math.round((quarterlyTickets.length / allTickets.length) * 100) : 0;
    
    console.log(`📊 Quarterly Data Coverage: ${quarterlyTickets.length}/${allTickets.length} tickets (${quarterlyPercentage}%) from last 3 months`);
    if (quarterlyTickets.length < 1000) {
      console.log(`⚠️  Warning: Low quarterly ticket count (${quarterlyTickets.length}). Consider increasing pagination if data appears incomplete.`);
    }

    // Also implement caching for agents and other data
    let agents: Agent[] = [];
    const cachedAgents = !filters.forceRefresh ? apiCache.get<Agent[]>('all_agents') : null;
    
    if (cachedAgents) {
      console.log(`💾 Using cached agents: ${cachedAgents.length} agents (cache hit!)`);
      agents = cachedAgents;
    } else {
      console.log('🔄 Fetching fresh agent data...');
      try {
        const agentsResponse = await freshserviceApi.getAgents(1, 100);
        agents = agentsResponse.agents || [];
        
        // Cache agents for 30 minutes (they change infrequently)
        if (agents.length > 0) {
          apiCache.set('all_agents', agents, 30 * 60 * 1000);
          console.log(`💾 Cached ${agents.length} agents for 30 minutes`);
        }
        console.log(`✅ Retrieved ${agents.length} agents`);
      } catch (agentsError: any) {
        console.warn('⚠️ Failed to fetch agents:', agentsError);
        console.log('📊 Continuing without agent data...');
      }
    }

    // Also cache departments
    let departments: Department[] = [];
    const cachedDepartments = !filters.forceRefresh ? apiCache.get<Department[]>('all_departments') : null;
    
    if (cachedDepartments) {
      console.log(`💾 Using cached departments: ${cachedDepartments.length} departments (cache hit!)`);
      departments = cachedDepartments;
    } else {
      console.log('🔄 Fetching fresh department data...');
      try {
        const departmentsResponse = await freshserviceApi.getDepartments(1, 100);
        departments = departmentsResponse.departments || [];
        
        // Cache departments for 60 minutes (they rarely change)
        if (departments.length > 0) {
          apiCache.set('all_departments', departments, 60 * 60 * 1000);
          console.log(`💾 Cached ${departments.length} departments for 60 minutes`);
        }
        
        // If we got 100 departments, there might be more on the next page
        if (departments.length === 100) {
          try {
            const departmentsPage2 = await freshserviceApi.getDepartments(2, 100);
            if (departmentsPage2.departments && departmentsPage2.departments.length > 0) {
              departments = departments.concat(departmentsPage2.departments);
              console.log(`✅ Retrieved additional ${departmentsPage2.departments.length} departments from page 2 (total: ${departments.length})`);
            }
          } catch (page2Error: any) {
            console.warn('⚠️ Failed to fetch departments page 2:', page2Error);
          }
        }
        console.log(`✅ Retrieved ${departments.length} departments`);
      } catch (departmentsError: any) {
        console.warn('⚠️ Failed to fetch departments:', departmentsError);
        console.log('📊 Continuing without department data...');
      }
    }

    // Also cache groups for IT agent identification
    let groups: Group[] = [];
    const cachedGroups = !filters.forceRefresh ? apiCache.get<Group[]>('all_groups') : null;
    
    if (cachedGroups) {
      console.log(`💾 Using cached groups: ${cachedGroups.length} groups (cache hit!)`);
      groups = cachedGroups;
    } else {
      console.log('🔄 Fetching fresh group data...');
      try {
        const groupsResponse = await freshserviceApi.getGroups(1, 100);
        groups = groupsResponse.groups || [];
        
        // Cache groups for 30 minutes (they rarely change)
        if (groups.length > 0) {
          apiCache.set('all_groups', groups, 30 * 60 * 1000);
          console.log(`💾 Cached ${groups.length} groups for 30 minutes`);
        }
        
        // If we got 100 groups, there might be more on the next page
        if (groups.length === 100) {
          try {
            const groupsPage2 = await freshserviceApi.getGroups(2, 100);
            if (groupsPage2.groups && groupsPage2.groups.length > 0) {
              groups = groups.concat(groupsPage2.groups);
              console.log(`✅ Retrieved additional ${groupsPage2.groups.length} groups from page 2 (total: ${groups.length})`);
            }
          } catch (page2Error: any) {
            console.warn('⚠️ Failed to fetch groups page 2:', page2Error);
          }
        }
        console.log(`✅ Retrieved ${groups.length} groups`);
      } catch (groupsError: any) {
        console.warn('⚠️ Failed to fetch groups:', groupsError);
        console.log('📊 Continuing without group data...');
      }
    }

    // Fetch contacts (requesters) to get their department information
    let contacts: Contact[] = [];
    const cachedContacts = !filters.forceRefresh ? apiCache.get<Contact[]>('all_contacts') : null;
    
    if (cachedContacts) {
      console.log(`💾 Using cached contacts: ${cachedContacts.length} contacts (cache hit!)`);
      contacts = cachedContacts;
    } else {
      console.log('🔄 Fetching fresh contact data...');
      try {
        const contactsResponse = await freshserviceApi.getContacts(1, 100);
        // Handle both possible response formats
        contacts = contactsResponse.requesters || contactsResponse.contacts || [];
        
        // Get more contacts if needed - many requesters might be on later pages
        if (contacts.length === 100) {
          try {
            const contactsPage2 = await freshserviceApi.getContacts(2, 100);
            const page2Contacts = contactsPage2.requesters || contactsPage2.contacts || [];
            if (page2Contacts && page2Contacts.length > 0) {
              contacts = contacts.concat(page2Contacts);
              console.log(`✅ Retrieved additional ${page2Contacts.length} contacts from page 2 (total: ${contacts.length})`);
            }
          } catch (page2Error: any) {
            console.warn('⚠️ Failed to fetch contacts page 2:', page2Error);
          }
        }
        
        // Cache contacts for 10 minutes
        if (contacts.length > 0) {
          apiCache.set('all_contacts', contacts, 10 * 60 * 1000);
          console.log(`💾 Cached ${contacts.length} contacts for future requests`);
        }
        console.log(`✅ Retrieved ${contacts.length} contacts/requesters`);
      } catch (contactsError: any) {
        console.warn('⚠️ Failed to fetch contacts:', contactsError);
        console.warn('⚠️ Error details:', contactsError.response?.status, contactsError.response?.statusText);
        console.log('📊 Continuing without contact data...');
      }
    }

    // Apply filters to tickets
    console.log('🔧 === STARTING FILTERING ===');
    const filteredTickets = filterTickets(allTickets, filters);
    console.log(`🎯 === FILTERING COMPLETE: ${filteredTickets.length} tickets remain ===`);

    // DEBUGGING: Let's test what happens with user's exact filter criteria
    console.log('🔍 === TESTING USER\'S FRESHSERVICE FILTER CRITERIA ===');
    
    // Test 1: This month filter instead of this week
    const thisMonth = new Date();
    thisMonth.setDate(1); // First day of current month
    const thisMonthTickets = allTickets.filter(ticket => {
      const ticketDate = new Date(ticket.created_at);
      return ticketDate >= thisMonth && 
             ticket.workspace_id === 2 && // IT Support workspace
             ACTIVE_TICKET_STATUSES.includes(ticket.status);
    });
    console.log(`📅 THIS MONTH filter (no onboarding exclusion): ${thisMonthTickets.length} active tickets`);
    
    // Test 2: With onboarding exclusion
    const thisMonthNoOnboarding = thisMonthTickets.filter(ticket => {
      const subject = (ticket.subject || '').toLowerCase();
      const category = (ticket.category || '').toLowerCase();
      const subCategory = (ticket.sub_category || '').toLowerCase();
      const itemCategory = (ticket.item_category || '').toLowerCase();
      const description = (ticket.description || '').toLowerCase();
      const tags = (ticket.tags || []).map(tag => tag.toLowerCase());
      
      const excludeKeywords = [
        'onboarding', 'onboard', 'on-boarding', 'on boarding',
        'offboarding', 'offboard', 'off-boarding', 'off boarding',
        'new hire', 'new employee', 'employee setup', 'user setup',
        'account setup', 'employee onboarding', 'employee offboarding',
        'termination', 'departure', 'leaving', 'exit',
        'deactivate user', 'disable user', 'remove access',
        'workday', 'okta provisioning', 'auto provision'
      ];
      
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
    console.log(`📅 THIS MONTH filter (with onboarding exclusion): ${thisMonthNoOnboarding.length} active tickets`);
    
    // Test 3: Check pagination coverage
    console.log(`📋 PAGINATION ANALYSIS:`);
    console.log(`  - We fetched: ${allTickets.length} tickets from ${page - 1} pages`);
    if (totalEntries) {
      console.log(`  - API reports: ${totalEntries} total tickets available`);
      console.log(`  - Coverage: ${((allTickets.length / totalEntries) * 100).toFixed(1)}%`);
      if (allTickets.length < totalEntries) {
        console.log(`  - Missing tickets: ${totalEntries - allTickets.length} (likely due to rate limit protection)`);
      }
    } else {
      console.log(`  - User sees: 243 tickets in Freshservice (manual count)`);
      console.log(`  - Potential missing tickets: ${243 - allTickets.length > 0 ? 243 - allTickets.length : 0}`);
    }

    // Transform data for dashboard
    const dashboardData: DashboardData = {
      ticketsByStatus: createTicketsByStatusChartData(filteredTickets),
      ticketsByPriority: createTicketsByPriorityChartData(filteredTickets),
      ticketsByCategory: createTicketsByDepartmentChartData(filteredTickets, departments, contacts),
      ticketsTrend: createTicketsTrendChartData(filteredTickets, filters.timeRange),
      ticketLifecycleFunnel: createTicketLifecycleFunnelData(filteredTickets),
      resolutionTimes: createResolutionTimesData(filteredTickets),
      agentPerformance: createAgentPerformanceData(filteredTickets, agents, groups, departments),
      agentWorkload: createAgentWorkloadData(filteredTickets, agents, groups, departments),
      stats: {
        // ACTIVE TICKETS CALCULATION (Updated with identified custom statuses):
        // Status 2 (Open) + Status 3 (Pending) + Status 6 (Hold) + Status 8 (Waiting on Customer)
        // These all represent tickets that need attention from the IT team
        openTickets: filteredTickets.filter(t => ACTIVE_TICKET_STATUSES.includes(t.status)).length,
        resolvedToday: countResolvedToday(filteredTickets),
        avgResponseTime: await calculateActualFirstResponseTime(filteredTickets, filters),
        customerSatisfaction: '92%', // This would come from surveys/feedback in real implementation
        slaBreaches: countSLABreaches(filteredTickets),
        overdueTickets: countOverdueTickets(filteredTickets),
        unassignedTickets: countUnassignedTickets(filteredTickets),
        totalAgents: filterITAgents(agents, allTickets).length // Use all tickets for agent filtering, not just filtered ones
      },
      recentActivity: [],
      requesterDepartments: [],
      recurringIssues: [],
      timeBasedAnalytics: {
        hourlyDistribution: [],
        dailyDistribution: [],
        peakHours: []
      },
      geographicDistribution: []
    };

    // DEBUGGING: Final stats calculation
    console.log('📈 === FINAL STATS CALCULATION ===');
    console.log('🔍 Active tickets calculation (Open + Pending + Hold + Waiting on Customer):');
    const activeTicketsDebug = filteredTickets.filter(t => ACTIVE_TICKET_STATUSES.includes(t.status));
    console.log(`  - Total active tickets: ${activeTicketsDebug.length}`);
    
    // Breakdown by status
    const activeBreakdown: Record<number, number> = {};
    activeTicketsDebug.forEach(ticket => {
      activeBreakdown[ticket.status] = (activeBreakdown[ticket.status] || 0) + 1;
    });
    console.log('  - Active tickets breakdown:');
    Object.entries(activeBreakdown).forEach(([status, count]) => {
      console.log(`    * ${getStatusName(parseInt(status))} (${status}): ${count} tickets`);
    });
    
    console.log(`  - Sample active tickets:`, activeTicketsDebug.slice(0, 3).map(t => ({
      id: t.id,
      status: t.status,
      statusName: getStatusName(t.status),
      subject: t.subject?.substring(0, 30)
    })));

    // DEBUGGING: Any remaining unhandled statuses
    const unhandledStatuses = filteredTickets.filter(t => 
      !ACTIVE_TICKET_STATUSES.includes(t.status) && !RESOLVED_STATUSES.includes(t.status)
    );
    if (unhandledStatuses.length > 0) {
      console.log('🔍 Unhandled status tickets found:');
      const unhandledStatusCounts: Record<number, number> = {};
      unhandledStatuses.forEach(ticket => {
        unhandledStatusCounts[ticket.status] = (unhandledStatusCounts[ticket.status] || 0) + 1;
      });
      console.log(`  - Unhandled statuses: ${Object.entries(unhandledStatusCounts).map(([status, count]) => 
        `${getStatusName(parseInt(status))} (${status}): ${count}`
      ).join(', ')}`);
      console.log(`  - Sample unhandled tickets:`, unhandledStatuses.slice(0, 3).map(t => ({
        id: t.id,
        status: t.status,
        statusName: getStatusName(t.status),
        subject: t.subject?.substring(0, 30)
      })));
      console.log('⚠️  RECOMMENDATION: These statuses may need to be classified as active or resolved');
    } else {
      console.log('✅ All ticket statuses are properly classified');
    }

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
 * Server action to get available agents for filtering - ALL AGENTS for dropdown, filtered agents for metrics
 */
export async function fetchAgentList(): Promise<{ success: boolean; agents?: Array<{ id: number; name: string; department?: string; active?: boolean }>; error?: string }> {
  try {
    // Fetch ALL agents (multiple pages) with retry logic to handle rate limits
    let allAgents: Agent[] = [];
    let page = 1;
    let hasMore = true;
    const maxPages = 10; // Increased to 10 pages (1000 agents) to ensure we get everyone
    
    console.log('👥 === ENHANCED AGENT SEARCH ===');
    console.log('🔍 Searching for ALL agents including Tanmoy Biswas...');
    
    while (hasMore && page <= maxPages) {
      try {
        console.log(`📄 Fetching agents page ${page}...`);
        
        const agentsResponse = await withRateLimitRetry(async () => {
          return await freshserviceApi.getAgents(page, 100);
        });
        
        const pageAgents = agentsResponse.agents || [];
        allAgents = [...allAgents, ...pageAgents];
        
        console.log(`✅ Page ${page}: ${pageAgents.length} agents (total: ${allAgents.length})`);
        
        // Check if this page had fewer agents than requested (indicates last page)
        hasMore = pageAgents.length === 100;
        
        // Also check for specific agent we're looking for
        const tanmoyFound = pageAgents.find(agent => {
          const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.trim().toLowerCase();
          return fullName.includes('tanmoy') || fullName.includes('biswas');
        });
        
        if (tanmoyFound) {
          console.log(`🎉 FOUND TANMOY BISWAS on page ${page}:`, {
            id: tanmoyFound.id,
            name: tanmoyFound.name || `${tanmoyFound.first_name} ${tanmoyFound.last_name}`,
            active: tanmoyFound.active,
            job_title: tanmoyFound.job_title,
            department: tanmoyFound.department
          });
        }
        
        page++;
        
        // Add small delay between pages to avoid rate limits
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error: any) {
        console.error(`❌ Failed to fetch agents page ${page}:`, error.message);
        break;
      }
    }
    
    console.log(`📊 Retrieved ${allAgents.length} total agents from ${page - 1} pages`);
    
    // Search for Tanmoy one more time in the complete list
    const tanmoyInList = allAgents.find(agent => {
      const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.trim().toLowerCase();
      const displayName = (agent.name || '').toLowerCase();
      return fullName.includes('tanmoy') || fullName.includes('biswas') || 
             displayName.includes('tanmoy') || displayName.includes('biswas');
    });
    
    if (tanmoyInList) {
      console.log(`✅ CONFIRMED: Tanmoy Biswas found in complete agent list:`, {
        id: tanmoyInList.id,
        name: tanmoyInList.name || `${tanmoyInList.first_name} ${tanmoyInList.last_name}`,
        active: tanmoyInList.active
      });
    } else {
      console.log(`❌ WARNING: Tanmoy Biswas not found in ${allAgents.length} agents`);
      console.log('📝 First 5 agents for debugging:', allAgents.slice(0, 5).map(a => ({
        id: a.id,
        name: a.name || `${a.first_name} ${a.last_name}`,
        active: a.active
      })));
    }
    
    // Debug: Log all unique departments to see what's available
    const allDepartments = [...new Set(allAgents.map(agent => agent.department).filter(Boolean))];
    console.log(`🔍 All unique departments found for dropdown: ${allDepartments.join(', ')}`);
    
    // Filter agents by specific department for dropdown
    const itAgents = allAgents.filter(agent => {
      // Check department field and department_ids for specific department
      const department = agent.department?.toLowerCase() || '';
      
      const hasTargetDepartment = 
        agent.department_ids?.includes(11000324230) ||
        department === 'freshservice-dashboard' ||
        department.includes('freshservice-dashboard');
      
      if (hasTargetDepartment) {
        console.log(`   ✅ IT Agent for dropdown: ${agent.first_name} ${agent.last_name} (dept:"${agent.department}")`);
      }
      
      return hasTargetDepartment;
    });
    
    const agentList = itAgents.map(agent => ({
      id: agent.id,
      name: agent.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
      department: agent.department,
      active: agent.active,
      role: agent.role
    })).sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`📋 Filtered to ${itAgents.length} IT agents from ${allAgents.length} total agents`);
    console.log(`📋 Returning ${agentList.length} IT agents for dropdown`);
    
    return {
      success: true,
      agents: agentList
    };
    
  } catch (error: any) {
    console.error('❌ Failed to fetch agent list:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch agents'
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

/**
 * Debug function to find specific agents by name
 */
export async function debugFindAgent(searchName: string): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    console.log(`🔍 Searching for agent: "${searchName}"`);
    
    // Fetch ALL agents (multiple pages)
    let allAgents: Agent[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore && page <= 3) { // Limit to 3 pages (300 agents) for safety
      const agentsResponse = await freshserviceApi.getAgents(page, 100);
      const pageAgents = agentsResponse.agents || [];
      allAgents = [...allAgents, ...pageAgents];
      
      console.log(`📄 Fetched page ${page}: ${pageAgents.length} agents (total: ${allAgents.length})`);
      
      if (pageAgents.length < 100) {
        hasMore = false;
      }
      page++;
    }
    
    // Search for agents matching the name (case-insensitive, including partial matches)
    const searchTerms = [
      searchName.toLowerCase(),
      ...searchName.toLowerCase().split(' '), // Individual words
      searchName.toLowerCase().replace(' ', ''), // Without spaces
    ];
    
    const matchingAgents = allAgents.filter(agent => {
      const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.trim().toLowerCase();
      const displayName = (agent.name || '').toLowerCase();
      const firstName = (agent.first_name || '').toLowerCase();
      const lastName = (agent.last_name || '').toLowerCase();
      
      return searchTerms.some(term => 
        fullName.includes(term) || 
        displayName.includes(term) ||
        firstName.includes(term) ||
        lastName.includes(term)
      );
    });
    
    console.log(`🔍 Found ${matchingAgents.length} matching agents for "${searchName}" from ${allAgents.length} total agents`);
    
    if (matchingAgents.length === 0) {
      console.log(`❌ No agents found matching "${searchName}"`);
      console.log(`📋 Search terms used:`, searchTerms);
      console.log(`📋 Sample agent names (first 15):`, 
        allAgents.slice(0, 15).map(a => ({
          id: a.id,
          name: a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim(),
          active: a.active,
          job_title: a.job_title
        }))
      );
      
      // Look for similar names
      console.log(`🔍 Looking for similar names containing "tanmoy" or "biswas":`);
      const similarAgents = allAgents.filter(agent => {
        const fullName = `${agent.first_name || ''} ${agent.last_name || ''}`.trim().toLowerCase();
        const displayName = (agent.name || '').toLowerCase();
        return fullName.includes('tanmoy') || fullName.includes('biswas') || 
               displayName.includes('tanmoy') || displayName.includes('biswas');
      });
      
      if (similarAgents.length > 0) {
        console.log(`🎯 Found ${similarAgents.length} agents with similar names:`, 
          similarAgents.map(a => ({
            id: a.id,
            name: a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim(),
            active: a.active,
            job_title: a.job_title
          }))
        );
      } else {
        console.log(`❌ No agents found with "tanmoy" or "biswas" in their names`);
      }
    } else {
      // Show details for each matching agent
      for (const agent of matchingAgents) {
        console.log(`\n👤 Agent Details for: ${agent.name || `${agent.first_name} ${agent.last_name}`}`);
        console.log(`   - ID: ${agent.id}`);
        console.log(`   - Active: ${agent.active}`);
        console.log(`   - Job Title: ${agent.job_title || 'No title'}`);
        console.log(`   - Department: ${agent.department || 'No department'}`);
        console.log(`   - Email: ${agent.email || 'No email'}`);
        
        // Check if this agent has handled any tickets using comprehensive dataset
        console.log(`   - Fetching comprehensive ticket data for agent validation...`);
        
        // Use cached tickets if available, otherwise fetch comprehensive dataset (same as main dashboard)
        let allTickets: Ticket[] = [];
        const cachedTickets = apiCache.get<Ticket[]>('all_tickets');
        
        if (cachedTickets) {
          console.log(`   - Using cached tickets: ${cachedTickets.length} tickets`);
          allTickets = cachedTickets;
        } else {
          console.log(`   - Fetching fresh comprehensive ticket dataset...`);
          let page = 1;
          let hasMorePages = true;
          const maxPages = 50; // Same as main dashboard function
          
          while (hasMorePages && page <= maxPages) {
            try {
              const ticketsResponse = await freshserviceApi.getTickets(page, 100);
              if (ticketsResponse.tickets && ticketsResponse.tickets.length > 0) {
                allTickets = allTickets.concat(ticketsResponse.tickets);
                console.log(`     Page ${page}: ${ticketsResponse.tickets.length} tickets (Total: ${allTickets.length})`);
                
                if (ticketsResponse.tickets.length < 100) {
                  hasMorePages = false;
                } else {
                  page++;
                }
              } else {
                hasMorePages = false;
              }
            } catch (error) {
              console.log(`     Error fetching page ${page}, stopping pagination`);
              hasMorePages = false;
            }
          }
          
          // Cache the results for future debug calls
          if (allTickets.length > 0) {
            apiCache.set('all_tickets', allTickets, 5 * 60 * 1000); // 5 minutes TTL
          }
        }
        
        // Enhanced ticket matching with multiple assignment fields
        const agentTickets = allTickets.filter(ticket => 
          ticket.responder_id === agent.id ||
          ticket.agent_id === agent.id ||
          ticket.assigned_agent_id === agent.id ||
          ticket.owner_id === agent.id
        );
        
        // Separate counts for different assignment types
        const responderTickets = allTickets.filter(ticket => ticket.responder_id === agent.id);
        const agentIdTickets = allTickets.filter(ticket => ticket.agent_id === agent.id);
        const assignedTickets = allTickets.filter(ticket => ticket.assigned_agent_id === agent.id);
        const ownerTickets = allTickets.filter(ticket => ticket.owner_id === agent.id);
        
        console.log(`   - Total tickets handled: ${agentTickets.length} out of ${allTickets.length} total tickets`);
        console.log(`     • Responder tickets: ${responderTickets.length}`);
        console.log(`     • Agent ID tickets: ${agentIdTickets.length}`);
        console.log(`     • Assigned tickets: ${assignedTickets.length}`);
        console.log(`     • Owner tickets: ${ownerTickets.length}`);
        
        // Enhanced debugging for ticket matching
        if (agentTickets.length === 0) {
          // Check if there are any tickets with similar IDs or potential matches
          const potentialMatches = allTickets.filter(ticket => 
            ticket.responder_id && String(ticket.responder_id).includes(String(agent.id).slice(-3))
          );
          console.log(`   - Potential ID matches (last 3 digits): ${potentialMatches.length}`);
          
          // Check tickets in the agent's department
          const departmentTickets = allTickets.filter(ticket => 
            ticket.department_id && agent.department_ids?.includes(ticket.department_id)
          );
          console.log(`   - Tickets in agent's department: ${departmentTickets.length}`);
          
          // Show sample responder IDs to help identify patterns
          const uniqueResponders = [...new Set(allTickets.map(t => t.responder_id).filter(Boolean))];
          console.log(`   - Sample responder IDs in system: [${uniqueResponders.slice(0, 10).join(', ')}]`);
          console.log(`   - Agent ID to match: ${agent.id}`);
          
          // Special debugging for Sandra, Shrikant, and Tanmoy
          const agentName = (agent.name || `${agent.first_name} ${agent.last_name}`).toLowerCase();
          if (agentName.includes('sandra') || agentName.includes('shrikant') || agentName.includes('tanmoy')) {
            console.log(`🔍 SPECIAL DEBUG for ${agentName.toUpperCase()}:`);
            
            // Check if agent appears anywhere in ticket data
            const mentionedInSubject = allTickets.filter(ticket => 
              ticket.subject?.toLowerCase().includes(agentName.split(' ')[0])
            );
            console.log(`     - Mentioned in subjects: ${mentionedInSubject.length} tickets`);
            
            // Check custom fields for agent references
            const inCustomFields = allTickets.filter(ticket => {
              if (!ticket.custom_fields) return false;
              const customFieldsStr = JSON.stringify(ticket.custom_fields).toLowerCase();
              return customFieldsStr.includes(agentName.split(' ')[0]) || customFieldsStr.includes(String(agent.id));
            });
            console.log(`     - Mentioned in custom fields: ${inCustomFields.length} tickets`);
            
            // Check if agent is in any group that has tickets
            if (agent.group_ids?.length) {
              const groupTickets = allTickets.filter(ticket => 
                agent.group_ids?.includes(ticket.group_id || 0)
              );
              console.log(`     - Tickets in agent's groups: ${groupTickets.length} tickets`);
              if (groupTickets.length > 0) {
                console.log(`     - Sample group tickets:`, groupTickets.slice(0, 3).map(t => ({
                  id: t.id,
                  group_id: t.group_id,
                  responder_id: t.responder_id,
                  subject: t.subject?.substring(0, 40) + '...'
                })));
              }
            }
          }
        } else {
          console.log(`   - Sample tickets:`, agentTickets.slice(0, 3).map(t => ({
            id: t.id,
            subject: t.subject?.substring(0, 50) + '...',
            status: t.status,
            workspace_id: t.workspace_id,
            created_at: t.created_at?.substring(0, 10) // Just the date part
          })));
          
          // Show date range of tickets for this agent
          const sortedTickets = agentTickets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const oldest = sortedTickets[0]?.created_at?.substring(0, 10);
          const newest = sortedTickets[sortedTickets.length - 1]?.created_at?.substring(0, 10);
          console.log(`   - Ticket date range: ${oldest} to ${newest}`);
        }
      }
    }
    
    return { 
      success: true, 
      result: {
        searchName,
        totalAgents: allAgents.length,
        matchingAgents: matchingAgents.length,
        matches: matchingAgents.map(agent => ({
          id: agent.id,
          name: agent.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
          active: agent.active,
          job_title: agent.job_title,
          department: agent.department
        }))
      }
    };
  } catch (error: any) {
    console.error('❌ Error in debugFindAgent:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to search for agent' 
    };
  }
}

/**
 * Clear all cached data (useful for testing or when data is stale)
 */
export async function clearDashboardCache(): Promise<{ success: boolean; message: string }> {
  try {
    apiCache.clear();
    freshserviceApi.clearCache();
    console.log('🧹 All dashboard cache cleared successfully');
    return { success: true, message: 'Cache cleared successfully' };
  } catch (error: any) {
    console.error('❌ Failed to clear cache:', error);
    return { success: false, message: error.message || 'Failed to clear cache' };
  }
}

/**
 * Get cache status for debugging
 */
export async function getCacheStatus(): Promise<{ success: boolean; cacheStats?: any; error?: string }> {
  try {
    const cacheStats = apiCache.getStats();
    const rateLimitStats = rateLimitTracker.getStats();
    
    const status = {
      cache: cacheStats,
      rateLimit: rateLimitStats,
      cached_data: {
        tickets: !!apiCache.get('all_tickets'),
        agents: !!apiCache.get('all_agents'),
        departments: !!apiCache.get('all_departments'),
        contacts: !!apiCache.get('all_contacts')
      }
    };
    
    console.log('📊 Cache status:', status);
    return { success: true, cacheStats: status };
  } catch (error: any) {
    console.error('❌ Failed to get cache status:', error);
    return { success: false, error: error.message || 'Failed to get cache status' };
  }
}