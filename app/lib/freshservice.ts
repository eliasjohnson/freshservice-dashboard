import axios, { AxiosInstance } from 'axios';
import { serverConfig } from './config';

// Types from the existing project
export interface Ticket {
  id: number;
  subject: string;
  description: string;
  status: number;
  priority: number;
  requester_id: number;
  responder_id?: number;
  created_at: string;
  updated_at: string;
  source: number;
  impact?: number;
  category?: string;
  sub_category?: string;
  item_category?: string;
  due_by: string;
  fr_due_by?: string;
  group_id?: number;
  department_id?: number;
  custom_fields?: Record<string, any>;
  tags?: string[];
  stats?: {
    response_time?: number;
    resolution_time?: number;
  };
}

export interface Agent {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  role?: string;
  department?: string;
  active: boolean;
  occasional?: boolean;
  job_title?: string;
  phone?: string;
  mobile_phone_number?: string;
  department_ids?: number[];
  group_ids?: number[];
  role_ids?: number[];
  created_at: string;
  updated_at: string;
  stats?: {
    tickets_resolved?: number;
    avg_response_time?: number;
  };
}

export interface TicketResponse {
  tickets: Ticket[];
  meta?: {
    total_pages: number;
    current_page: number;
    next_page?: number;
    prev_page?: number;
    total_entries: number;
    per_page: number;
  };
}

export interface AgentResponse {
  agents: Agent[];
}

/**
 * Server-side Freshservice API client
 * This runs only on the server and keeps API keys secure
 */
class FreshserviceApiClient {
  private client: AxiosInstance;

  constructor() {
    const authHeader = `Basic ${Buffer.from(`${serverConfig.freshservice.apiKey}:X`).toString('base64')}`;

    this.client = axios.create({
      baseURL: serverConfig.freshservice.baseUrl,
      timeout: serverConfig.freshservice.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
    });

    // Add request interceptor for debugging
    if (serverConfig.features.debug) {
      this.client.interceptors.request.use(
        (config) => {
          console.log(`🔄 API REQUEST: ${config.method?.toUpperCase()} ${config.url}`);
          console.log(`📤 Headers:`, config.headers);
          return config;
        },
        (error) => {
          console.error('❌ Request Error:', error);
          return Promise.reject(error);
        }
      );
    }

    // Add response interceptor for debugging and error handling
    this.client.interceptors.response.use(
      (response) => {
        if (serverConfig.features.debug) {
          console.log(`✅ API RESPONSE: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
          console.log(`📊 Response Status:`, response.status, response.statusText);
          
          if (response.data?.tickets) {
            console.log(`🎫 Tickets Count: ${response.data.tickets.length}`);
          } else if (response.data?.agents) {
            console.log(`👥 Agents Count: ${response.data.agents.length}`);
          }
        }
        return response;
      },
      (error) => {
        console.error('❌ API ERROR:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          method: error.config?.method,
        });

        if (error.response?.data) {
          console.error('💥 Error Response Body:', error.response.data);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get tickets with pagination
   */
  async getTickets(page = 1, per_page = 30): Promise<TicketResponse> {
    try {
      const response = await this.client.get('/tickets', {
        params: { page, per_page },
      });

      // Handle different response formats
      if (response.data && response.data.tickets) {
        return response.data;
      } else if (Array.isArray(response.data)) {
        return {
          tickets: response.data.map(this.transformTicket),
          meta: {
            total_pages: Math.ceil(100 / per_page),
            current_page: page,
            total_entries: response.data.length,
            per_page: per_page,
          }
        };
      }

      return { tickets: [] };
    } catch (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }
  }

  /**
   * Get agents with pagination
   */
  async getAgents(page = 1, per_page = 30): Promise<AgentResponse> {
    try {
      let response;
      
      // Try agents endpoint first, fallback to requesters
      try {
        response = await this.client.get('/agents', {
          params: { page, per_page },
        });
      } catch (error: any) {
        if (error.response?.status === 404) {
          response = await this.client.get('/requesters', {
            params: { page, per_page },
          });
        } else {
          throw error;
        }
      }

      // Handle different response formats
      let agents = [];
      if (response.data && response.data.agents) {
        agents = response.data.agents.map(this.transformAgent);
      } else if (response.data && response.data.requesters) {
        agents = response.data.requesters.map(this.transformAgent);
      } else if (Array.isArray(response.data)) {
        agents = response.data.map(this.transformAgent);
      }

      return { agents };
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔌 Testing Freshservice API Connection...');
      console.log(`   Domain: ${serverConfig.freshservice.domain}`);
      console.log(`   Base URL: ${serverConfig.freshservice.baseUrl}`);

      const response = await this.client.get('/tickets', {
        params: { page: 1, per_page: 1 }
      });

      console.log('🎉 API Connection Successful!');
      console.log(`   Status: ${response.status}`);
      
      return true;
    } catch (error: any) {
      console.error('💥 API Connection Failed:', error.response?.status, error.response?.statusText);
      return false;
    }
  }

  /**
   * Transform ticket data to ensure consistency
   */
  private transformTicket(ticket: any): Ticket {
    return {
      id: ticket.id || ticket.display_id,
      subject: ticket.subject || '',
      description: ticket.description || ticket.description_html || '',
      status: ticket.status || 2,
      priority: ticket.priority || 1,
      requester_id: ticket.requester_id || 0,
      responder_id: ticket.responder_id || ticket.owner_id,
      created_at: ticket.created_at || new Date().toISOString(),
      updated_at: ticket.updated_at || new Date().toISOString(),
      source: ticket.source || 2,
      impact: ticket.impact || 1,
      category: ticket.category,
      sub_category: ticket.sub_category,
      item_category: ticket.item_category,
      due_by: ticket.due_by || ticket.fr_due_by || new Date().toISOString(),
      fr_due_by: ticket.fr_due_by,
      group_id: ticket.group_id,
      department_id: ticket.department_id,
      custom_fields: ticket.custom_fields || ticket.custom_field || {},
      tags: ticket.tags || [],
      stats: {
        response_time: ticket.stats?.response_time,
        resolution_time: ticket.stats?.resolution_time,
      }
    };
  }

  /**
   * Transform agent data to ensure consistency
   */
  private transformAgent(agent: any): Agent {
    return {
      id: agent.id,
      name: agent.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
      first_name: agent.first_name,
      last_name: agent.last_name,
      email: agent.email || agent.primary_email || '',
      role: agent.role,
      department: agent.department,
      active: agent.active !== false,
      occasional: agent.occasional || false,
      job_title: agent.job_title,
      phone: agent.phone || agent.work_phone_number,
      mobile_phone_number: agent.mobile_phone_number,
      department_ids: agent.department_ids || [],
      group_ids: agent.group_ids || [],
      role_ids: agent.role_ids || [],
      created_at: agent.created_at || new Date().toISOString(),
      updated_at: agent.updated_at || new Date().toISOString(),
      stats: {
        tickets_resolved: agent.stats?.tickets_resolved,
        avg_response_time: agent.stats?.avg_response_time,
      }
    };
  }
}

// Export singleton instance
export const freshserviceApi = new FreshserviceApiClient(); 