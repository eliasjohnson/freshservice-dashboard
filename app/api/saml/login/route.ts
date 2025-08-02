import { NextRequest, NextResponse } from 'next/server';
import { SAML } from '@node-saml/passport-saml';
import { samlConfig } from '../../../lib/saml-config';

// Lazy initialize SAML to avoid build-time errors
let saml: any = null;

function getSamlInstance() {
  if (!saml) {
    saml = new SAML({
      entryPoint: samlConfig.entryPoint,
      issuer: samlConfig.issuer,
      callbackUrl: samlConfig.callbackUrl,
      idpCert: samlConfig.idpCert || '-----BEGIN CERTIFICATE-----\nMIIDummy\n-----END CERTIFICATE-----', // Dummy cert if none provided
      wantAssertionsSigned: false,
      wantNameId: samlConfig.wantNameId,
      wantNameIdEncrypted: samlConfig.wantNameIdEncrypted,
      validateInResponseTo: 'never',
      disableRequestedAuthnContext: true,
      // Disable all signature validation for testing
      acceptedClockSkewMs: -1,
    } as any);
  }
  return saml;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🚀 Initiating SAML login');
    console.log('⚙️ SAML Config:', {
      entryPoint: samlConfig.entryPoint,
      issuer: samlConfig.issuer,
      callbackUrl: samlConfig.callbackUrl,
      hasCert: !!samlConfig.idpCert,
    });

    // Generate proper SAML AuthnRequest
    const samlInstance = getSamlInstance();
    const loginUrl = await samlInstance.getAuthorizeUrlAsync({} as any, {} as any, {} as any);
    console.log('🔗 Generated login URL:', loginUrl);

    return NextResponse.redirect(loginUrl);
  } catch (error) {
    console.error('❌ SAML login error:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'SAML login failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}