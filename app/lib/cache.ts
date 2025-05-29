/**
 * Simple in-memory cache to reduce API calls and respect Freshservice rate limits
 * PRO Plan: 400 calls/min overall, 120 calls/min for tickets
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly TICKETS_TTL = 3 * 60 * 1000; // 3 minutes for tickets (they change more frequently)
  
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    };
    this.cache.set(key, entry);
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Get cache key for tickets with pagination
  getTicketsCacheKey(page: number, perPage: number): string {
    return `tickets_${page}_${perPage}`;
  }
  
  // Get cache key for agents
  getAgentsCacheKey(page: number, perPage: number): string {
    return `agents_${page}_${perPage}`;
  }
  
  // Cache tickets with shorter TTL
  setTickets<T>(key: string, data: T): void {
    this.set(key, data, this.TICKETS_TTL);
  }
  
  // Get cache stats
  getStats(): { entries: number; totalSize: string } {
    const entries = this.cache.size;
    const totalSize = `${Math.round(JSON.stringify([...this.cache.values()]).length / 1024)}KB`;
    return { entries, totalSize };
  }
}

// Rate limiting tracker
class RateLimitTracker {
  private requests: { timestamp: number; endpoint: string }[] = [];
  private readonly WINDOW_MS = 60 * 1000; // 1 minute
  private readonly OVERALL_LIMIT = 400; // PRO plan overall limit
  private readonly TICKETS_LIMIT = 120; // PRO plan tickets limit
  
  canMakeRequest(endpoint: 'tickets' | 'agents' | 'other' = 'other'): boolean {
    this.cleanupOldRequests();
    
    const now = Date.now();
    const recentRequests = this.requests.filter(r => now - r.timestamp < this.WINDOW_MS);
    
    // Check overall limit
    if (recentRequests.length >= this.OVERALL_LIMIT) {
      console.warn(`⚠️ Rate limit: Overall limit (${this.OVERALL_LIMIT}/min) would be exceeded`);
      return false;
    }
    
    // Check endpoint-specific limits
    if (endpoint === 'tickets') {
      const ticketRequests = recentRequests.filter(r => r.endpoint === 'tickets');
      if (ticketRequests.length >= this.TICKETS_LIMIT) {
        console.warn(`⚠️ Rate limit: Tickets limit (${this.TICKETS_LIMIT}/min) would be exceeded`);
        return false;
      }
    }
    
    return true;
  }
  
  recordRequest(endpoint: 'tickets' | 'agents' | 'other' = 'other'): void {
    this.requests.push({
      timestamp: Date.now(),
      endpoint
    });
  }
  
  private cleanupOldRequests(): void {
    const cutoff = Date.now() - this.WINDOW_MS;
    this.requests = this.requests.filter(r => r.timestamp > cutoff);
  }
  
  getStats(): { totalRequests: number; ticketRequests: number; timeWindow: string } {
    this.cleanupOldRequests();
    const ticketRequests = this.requests.filter(r => r.endpoint === 'tickets').length;
    return {
      totalRequests: this.requests.length,
      ticketRequests,
      timeWindow: '1 minute'
    };
  }
  
  // Get time until we can make more requests
  getWaitTime(): number {
    this.cleanupOldRequests();
    if (this.requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...this.requests.map(r => r.timestamp));
    const waitTime = this.WINDOW_MS - (Date.now() - oldestRequest);
    return Math.max(0, waitTime);
  }
}

// Export singleton instances
export const apiCache = new APICache();
export const rateLimitTracker = new RateLimitTracker();

// Add rate limit retry logic
export async function withRateLimitRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 5000 // 5 seconds
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      if (error.response?.status === 429 && attempt < maxRetries) {
        const retryAfter = parseInt(error.response.headers['retry-after']) || 5;
        const delay = Math.max(retryAfter * 1000, baseDelay * attempt);
        
        console.log(`⏳ Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Operation failed after ${maxRetries} attempts`);
} 