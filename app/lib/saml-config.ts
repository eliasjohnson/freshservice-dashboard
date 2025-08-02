export interface SamlUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

// Helper function to format certificate
function formatCertificate(cert: string): string {
  if (!cert || cert === 'CERTIFICATE_NEEDED_FROM_OKTA') {
    return '';
  }
  
  // Remove any existing headers/footers and whitespace
  let cleanCert = cert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s+/g, '');
  
  // Add proper headers if not empty
  if (cleanCert) {
    return `-----BEGIN CERTIFICATE-----\n${cleanCert}\n-----END CERTIFICATE-----`;
  }
  
  return '';
}

// Determine if we're in production or forcing production security
const isProduction = process.env.NODE_ENV === 'production';
const forceProductionSecurity = process.env.FORCE_PRODUCTION_SECURITY === 'true';
const useProductionSecurity = isProduction || forceProductionSecurity;

const baseUrl = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000'
  : (process.env.SAML_ISSUER || 'https://freshservice-dashboard.vercel.app');

export const samlConfig = {
  entryPoint: process.env.SAML_ENTRY_POINT || 'https://pattern.okta.com/app/pattern_freshservicedashboard_1/exk1x7g8ko6vipqKy1d8/sso/saml',
  issuer: process.env.SAML_SP_ENTITY_ID || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://freshservice-dashboard.vercel.app'), // SP Entity ID - what this app identifies as
  callbackUrl: process.env.SAML_CALLBACK_URL || `${baseUrl}/api/saml/callback`,
  idpCert: formatCertificate(process.env.SAML_CERT || ''),
  wantAssertionsSigned: useProductionSecurity, // Enable signature validation in production or when testing
  wantNameId: true,
  wantNameIdEncrypted: false,
  validateInResponseTo: 'never',
  disableRequestedAuthnContext: true,
  signatureAlgorithm: 'sha256',
  digestAlgorithm: 'sha256',
  cert: formatCertificate(process.env.SAML_CERT || ''),
};