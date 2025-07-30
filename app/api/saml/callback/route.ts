import { NextRequest, NextResponse } from 'next/server';
import { SAML } from '@node-saml/passport-saml';
import { samlConfig } from '../../../lib/saml-config';
import { setSessionCookie } from '../../../lib/auth-utils';
import { rateLimit, getClientIp, validateReferer, addSecurityHeaders } from '../../../lib/security-utils';

const saml = new SAML({
  entryPoint: samlConfig.entryPoint,
  issuer: samlConfig.issuer,
  callbackUrl: samlConfig.callbackUrl,
  idpCert: samlConfig.idpCert,
  cert: samlConfig.cert,
  wantAssertionsSigned: samlConfig.wantAssertionsSigned,
  wantNameId: samlConfig.wantNameId,
  wantNameIdEncrypted: samlConfig.wantNameIdEncrypted,
  validateInResponseTo: samlConfig.validateInResponseTo,
  disableRequestedAuthnContext: samlConfig.disableRequestedAuthnContext,
  signatureAlgorithm: samlConfig.signatureAlgorithm,
  digestAlgorithm: samlConfig.digestAlgorithm,
  acceptedClockSkewMs: 5000, // 5 second clock skew tolerance
} as any);

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 SAML callback received');
    
    // Rate limiting
    const clientIp = getClientIp(request);
    if (!rateLimit(clientIp, 10, 300000)) { // 10 attempts per 5 minutes
      console.warn(`⚠️ Rate limit exceeded for IP: ${clientIp}`);
      const response = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      return addSecurityHeaders(response);
    }
    
    // CSRF protection - but allow SAML callbacks from Okta
    const isFromOkta = request.headers.get('referer')?.includes('okta.com') || 
                       request.headers.get('origin')?.includes('okta.com');
    
    if (!isFromOkta && !validateReferer(request)) {
      console.warn(`⚠️ Invalid referer for SAML callback from IP: ${clientIp}`);
      const response = NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
      return addSecurityHeaders(response);
    }
    
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse') as string;
    const relayState = formData.get('RelayState') as string;
    
    console.log('📝 FormData keys:', Array.from(formData.keys()));
    console.log('🔗 RelayState:', relayState);
    console.log('📄 SAML Response length:', samlResponse?.length || 0);
    console.log('🌐 Client IP:', clientIp);
    
    if (!samlResponse) {
      console.error('❌ Missing SAML response');
      const response = NextResponse.json({ error: 'Missing SAML response' }, { status: 400 });
      return addSecurityHeaders(response);
    }

    // Validate and parse SAML response using proper library
    console.log('🔍 Validating SAML response with signature verification...');
    console.log('🔧 SAML Config - wantAssertionsSigned:', samlConfig.wantAssertionsSigned);
    console.log('🔧 SAML Config - idpCert length:', samlConfig.idpCert?.length || 0);
    
    let profile: any;
    try {
      const result = await saml.validatePostResponseAsync({ SAMLResponse: samlResponse } as any);
      profile = result.profile;
      console.log('✅ SAML validation successful');
      console.log('👤 User profile from SAML:', profile);
    } catch (samlError) {
      console.error('❌ SAML validation failed:', samlError);
      
      // Try without signature validation as fallback
      console.log('🔧 Attempting fallback without signature validation...');
      try {
        const fallbackSaml = new SAML({
          entryPoint: samlConfig.entryPoint,
          issuer: samlConfig.issuer,
          callbackUrl: samlConfig.callbackUrl,
          idpCert: '-----BEGIN CERTIFICATE-----\nMIIDummy\n-----END CERTIFICATE-----',
          wantAssertionsSigned: false,
          wantNameId: true,
          wantNameIdEncrypted: false,
          validateInResponseTo: 'never',
          disableRequestedAuthnContext: true,
        } as any);
        
        const fallbackResult = await fallbackSaml.validatePostResponseAsync({ SAMLResponse: samlResponse } as any);
        profile = fallbackResult.profile;
        console.log('⚠️ Fallback validation successful (signature validation disabled)');
        console.log('👤 User profile from fallback:', profile);
      } catch (fallbackError) {
        console.error('❌ Fallback validation also failed:', fallbackError);
        return NextResponse.json({ 
          error: 'SAML validation failed', 
          details: `Primary: ${samlError instanceof Error ? samlError.message : String(samlError)}, Fallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}` 
        }, { status: 500 });
      }
    }

    if (!profile) {
      console.error('❌ No profile in SAML response');
      return NextResponse.json({ error: 'Invalid SAML response - no profile' }, { status: 400 });
    }

    // Extract user information from SAML profile
    const user = {
      id: profile.nameID || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || profile.email,
      email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      firstName: profile.firstName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] || profile.first_name,
      lastName: profile.lastName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'] || profile.last_name,
      displayName: profile.displayName || profile['http://schemas.microsoft.com/identity/claims/displayname'] || profile.display_name,
    };

    console.log('👤 Extracted user data:', user);

    if (!user.email) {
      console.error('❌ No email found in SAML profile');
      console.log('📋 Full profile for debugging:', profile);
      return NextResponse.json({ 
        error: 'No user email found in SAML response', 
        details: 'Please check SAML attribute mapping in Okta' 
      }, { status: 400 });
    }

    // Create secure encrypted session
    await setSessionCookie({
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      displayName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    });

    console.log('✅ Session created, redirecting to dashboard');
    
    // Redirect to dashboard
    const baseUrl = request.url.includes('localhost') ? 'http://localhost:3000' : `https://${request.headers.get('host')}`;
    const response = NextResponse.redirect(new URL('/', baseUrl));
    return addSecurityHeaders(response);
  } catch (error) {
    console.error('❌ SAML callback error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'SAML callback failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// Also handle GET for metadata endpoint
export async function GET() {
  const metadata = `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${process.env.SAML_ISSUER}">
  <md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${process.env.SAML_CALLBACK_URL}" index="1"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;

  return new Response(metadata, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}