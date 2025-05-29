import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { serverConfig } from './config';
import { apiCache, rateLimitTracker } from './cache';

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
  workspace_id?: number;
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

export interface Group {
  id: number;
  name: string;
  description?: string;
  agent_ids?: number[];
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  name: string;
  description?: string;
  head_user_id?: number;
  prime_user_id?: number;
  domains?: string[];
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
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

export interface GroupResponse {
  groups: Group[];
}

export interface DepartmentResponse {
  departments: Department[];
}

export interface WorkspaceResponse {
  workspaces: Workspace[];
}

export interface Contact {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  mobile_phone_number?: string;
  department_ids?: number[];
  department_names?: string[];
  job_title?: string;
  active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ContactResponse {
  contacts?: Contact[];
  requesters?: Contact[];
}

/**
 * Freshservice API Client with caching and rate limiting
 * Respects PRO plan limits: 400 calls/min overall, 120 calls/min for tickets
 */
export class FreshserviceApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: serverConfig.freshservice.baseUrl,
      timeout: serverConfig.freshservice.timeout,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${serverConfig.freshservice.apiKey}:X`).toString('base64')}`,
      },
    });

    // Request interceptor for logging and rate limiting
    this.axiosInstance.interceptors.request.use((config) => {
      const endpoint = config.url?.includes('/tickets') ? 'tickets' : 
                     config.url?.includes('/agents') ? 'agents' : 'other';
      
      console.log(`🔄 API REQUEST: ${config.method?.toUpperCase()} ${config.url}`);
      console.log('📤 Headers:', config.headers);
      
      // Record the request for rate limiting
      rateLimitTracker.recordRequest(endpoint);
      
      return config;
    });

    // Response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ API RESPONSE: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        console.log('📊 Response Status:', response.status, response.statusText);
        
        // Log specific data counts for tickets and agents
        if (response.config.url?.includes('/tickets')) {
          console.log('🎫 Tickets Count:', response.data.tickets?.length || 0);
        } else if (response.config.url?.includes('/agents')) {
          console.log('👥 Agents Count:', response.data.agents?.length || 0);
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
        
        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          console.warn(`🚫 Rate limited! Retry after: ${retryAfter} seconds`);
        }
        
        throw error;
      }
    );
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔌 Testing Freshservice API Connection...');
      console.log(`   Domain: ${serverConfig.freshservice.domain}`);
      console.log(`   Base URL: ${serverConfig.freshservice.baseUrl}`);

      const response = await this.axiosInstance.get('/tickets', {
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
   * Get tickets with caching and rate limiting
   * PRO Plan: 120 calls per minute for tickets
   */
  async getTickets(page: number = 1, perPage: number = 100): Promise<TicketResponse> {
    const cacheKey = apiCache.getTicketsCacheKey(page, perPage);
    
    // Check cache first
    const cachedData = apiCache.get<TicketResponse>(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache HIT: tickets page ${page} (${cachedData.tickets?.length || 0} tickets)`);
      return cachedData;
    }
    
    // Check rate limits before making request
    if (!rateLimitTracker.canMakeRequest('tickets')) {
      const waitTime = rateLimitTracker.getWaitTime();
      const waitSeconds = Math.ceil(waitTime / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before making more requests.`);
    }
    
    console.log(`🌐 Cache MISS: fetching tickets page ${page}...`);
    
    try {
      const response: AxiosResponse<TicketResponse> = await this.axiosInstance.get('/tickets', {
        params: { page, per_page: perPage }
      });
      
      // Cache the response
      apiCache.setTickets(cacheKey, response.data);
      console.log(`💾 Cached tickets page ${page}`);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching tickets page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Get agents with caching and rate limiting
   * PRO Plan: 120 calls per minute for agents
   */
  async getAgents(page: number = 1, perPage: number = 100): Promise<AgentResponse> {
    const cacheKey = apiCache.getAgentsCacheKey(page, perPage);
    
    // Check cache first
    const cachedData = apiCache.get<AgentResponse>(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache HIT: agents page ${page} (${cachedData.agents?.length || 0} agents)`);
      return cachedData;
    }
    
    // Check rate limits
    if (!rateLimitTracker.canMakeRequest('agents')) {
      const waitTime = rateLimitTracker.getWaitTime();
      const waitSeconds = Math.ceil(waitTime / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before making more requests.`);
    }
    
    console.log(`🌐 Cache MISS: fetching agents page ${page}...`);
    
    try {
      const response: AxiosResponse<AgentResponse> = await this.axiosInstance.get('/agents', {
        params: { page, per_page: perPage }
      });
      
      // Cache the response
      apiCache.set(cacheKey, response.data);
      console.log(`💾 Cached agents page ${page}`);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching agents page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Get groups with caching and rate limiting
   */
  async getGroups(page: number = 1, perPage: number = 100): Promise<GroupResponse> {
    const cacheKey = `groups_${page}_${perPage}`;
    
    // Check cache first
    const cachedData = apiCache.get<GroupResponse>(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache HIT: groups page ${page} (${cachedData.groups?.length || 0} groups)`);
      return cachedData;
    }
    
    // Check rate limits
    if (!rateLimitTracker.canMakeRequest('other')) {
      const waitTime = rateLimitTracker.getWaitTime();
      const waitSeconds = Math.ceil(waitTime / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before making more requests.`);
    }
    
    console.log(`🌐 Cache MISS: fetching groups page ${page}...`);
    
    try {
      const response: AxiosResponse<GroupResponse> = await this.axiosInstance.get('/groups', {
        params: { page, per_page: perPage }
      });
      
      // Cache the response
      apiCache.set(cacheKey, response.data);
      console.log(`💾 Cached groups page ${page}`);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching groups page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Get workspaces with caching and rate limiting
   */
  async getWorkspaces(page: number = 1, perPage: number = 100): Promise<WorkspaceResponse> {
    const cacheKey = `workspaces_${page}_${perPage}`;
    
    // Check cache first
    const cachedData = apiCache.get<WorkspaceResponse>(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache HIT: workspaces page ${page} (${cachedData.workspaces?.length || 0} workspaces)`);
      return cachedData;
    }
    
    // Check rate limits
    if (!rateLimitTracker.canMakeRequest('other')) {
      const waitTime = rateLimitTracker.getWaitTime();
      const waitSeconds = Math.ceil(waitTime / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before making more requests.`);
    }
    
    console.log(`🌐 Cache MISS: fetching workspaces page ${page}...`);
    
    try {
      const response: AxiosResponse<WorkspaceResponse> = await this.axiosInstance.get('/workspaces', {
        params: { page, per_page: perPage }
      });
      
      // Cache the response
      apiCache.set(cacheKey, response.data);
      console.log(`💾 Cached workspaces page ${page}`);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching workspaces page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Get departments with caching and rate limiting
   */
  async getDepartments(page: number = 1, perPage: number = 100): Promise<DepartmentResponse> {
    const cacheKey = `departments_${page}_${perPage}`;
    
    // Check cache first
    const cachedData = apiCache.get<DepartmentResponse>(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache HIT: departments page ${page} (${cachedData.departments?.length || 0} departments)`);
      return cachedData;
    }
    
    // Check rate limits
    if (!rateLimitTracker.canMakeRequest('other')) {
      const waitTime = rateLimitTracker.getWaitTime();
      const waitSeconds = Math.ceil(waitTime / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before making more requests.`);
    }
    
    console.log(`🌐 Cache MISS: fetching departments page ${page}...`);
    
    try {
      const response: AxiosResponse<DepartmentResponse> = await this.axiosInstance.get('/departments', {
        params: { page, per_page: perPage }
      });
      
      // Cache the response
      apiCache.set(cacheKey, response.data);
      console.log(`💾 Cached departments page ${page}`);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching departments page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Get contacts with caching and rate limiting
   */
  async getContacts(page: number = 1, perPage: number = 100): Promise<ContactResponse> {
    const cacheKey = `contacts_${page}_${perPage}`;
    
    // Check cache first
    const cachedData = apiCache.get<ContactResponse>(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache HIT: contacts page ${page} (${cachedData.contacts?.length || 0} contacts)`);
      return cachedData;
    }
    
    // Check rate limits
    if (!rateLimitTracker.canMakeRequest('other')) {
      const waitTime = rateLimitTracker.getWaitTime();
      const waitSeconds = Math.ceil(waitTime / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before making more requests.`);
    }
    
    console.log(`🌐 Cache MISS: fetching contacts page ${page}...`);
    
    try {
      const response: AxiosResponse<ContactResponse> = await this.axiosInstance.get('/requesters', {
        params: { page, per_page: perPage }
      });
      
      // Cache the response
      apiCache.set(cacheKey, response.data);
      console.log(`💾 Cached contacts page ${page}`);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching contacts page ${page}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache (useful for testing or when fresh data is needed)
   */
  clearCache(): void {
    apiCache.clear();
    console.log('🧹 API cache cleared');
  }

  /**
   * Get cache and rate limiting stats
   */
  getStats(): { cache: any; rateLimit: any } {
    return {
      cache: apiCache.getStats(),
      rateLimit: rateLimitTracker.getStats()
    };
  }

  /**
   * Get ticket conversations with rate limiting
   * This gives us access to actual first response times
   */
  async getTicketConversations(ticketId: number): Promise<any> {
    const cacheKey = `conversations_${ticketId}`;
    
    // Check cache first
    const cachedData = apiCache.get<any>(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache HIT: conversations for ticket ${ticketId}`);
      return cachedData;
    }
    
    // Check rate limits
    if (!rateLimitTracker.canMakeRequest('other')) {
      const waitTime = rateLimitTracker.getWaitTime();
      const waitSeconds = Math.ceil(waitTime / 1000);
      throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before making more requests.`);
    }
    
    console.log(`🌐 Cache MISS: fetching conversations for ticket ${ticketId}...`);
    
    try {
      const response: AxiosResponse<any> = await this.axiosInstance.get(`/tickets/${ticketId}/conversations`);
      
      // Cache the response
      apiCache.set(cacheKey, response.data);
      console.log(`💾 Cached conversations for ticket ${ticketId}`);
      
      return response.data;
    } catch (error) {
      console.error(`Error fetching conversations for ticket ${ticketId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const freshserviceApi = new FreshserviceApiClient(); 