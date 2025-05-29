/**
 * Server-side configuration for Next.js
 * This configuration is only available on the server side
 */

export const serverConfig = {
  freshservice: {
    domain: process.env.FRESHSERVICE_DOMAIN || 'patterntickets.freshservice.com',
    apiKey: process.env.FRESHSERVICE_API_KEY || '',
    get baseUrl() {
      const domainWithoutProtocol = this.domain.replace(/^https?:\/\//, '');
      return `https://${domainWithoutProtocol}/api/v2`;
    },
    timeout: 30000,
  },
  features: {
    debug: process.env.NODE_ENV === 'development',
  },
};

// Client-side configuration (can be used in client components)
export const clientConfig = {
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Freshservice Dashboard',
  },
  ui: {
    theme: {
      default: 'light',
    },
    dateFormat: 'MMM dd, yyyy',
  },
}; 