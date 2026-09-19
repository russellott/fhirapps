/*
 * Cloudflare Worker that publishes the public JWKS required for
 * SMART Backend Services private_key_jwt registration.
 *
 * Deploy this worker and configure its JWKS_JSON environment variable with a
 * public JWK Set, for example: {"keys":[{"kty":"RSA","kid":"...","n":"...","e":"AQAB"}]}.
 * Register https://<worker>.<account>.workers.dev/jwks.json as the payer's
 * JWKS URI. Never place a private JWK in this worker or this file.
 */

/*
 * Cloudflare Worker for SMART Backend Services.
 *
 * GET  /jwks.json publishes the public JWK Set in JWKS_JSON.
 * POST /token exchanges an allowlisted payer/scope request using a private JWK
 * held in PAYER_CONFIG_JSON. Never send a private JWK from the browser.
 *
 * Required secrets:
 *   JWKS_JSON: {"keys":[<public JWK>]}
 *   PAYER_CONFIG_JSON: {
 *     "payer-key": {
 *       "fhirBaseUrl":"https://payer.example/fhir",
 *       "tokenEndpoint":"https://payer.example/token",
 *       "clientId":"registered-client-id",
 *       "jwksUri":"https://worker.example/jwks.json",
 *       "privateKeyJwk": {<private JWK including kid>},
 *       "systemScopes":["system/*.rs"],
 *       "allowPatientScopes":true,
 *       "requiresMtls":false
 *     }
 *   }
 * Optional secret: ALLOWED_ORIGIN (defaults to https://russellott.github.io).
 * Set REQUIRE_ACCESS_JWT=true and protect the Worker with Cloudflare Access to
 * require Access-authenticated browser calls. Configure an MTLS_CERT binding
 * when any payer sets requiresMtls=true.
 */

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://russellott.github.io',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(body, status, env) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { ...corsHeaders(env), 'Content-Type': 'application/json' }
  });
}

function base64UrlEncode(value) {
  var bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  var binary = '';
  for (var index = 0; index < bytes.length; index++) binary += String.fromCharCode(bytes[index]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createClientAssertion(payer) {
  var privateKeyJwk = payer.privateKeyJwk;
  var algorithm;
  var signingAlgorithm;
  if (privateKeyJwk.kty === 'RSA') {
    algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' };
    signingAlgorithm = 'RS384';
  } else if (privateKeyJwk.kty === 'EC' && privateKeyJwk.crv === 'P-384') {
    algorithm = { name: 'ECDSA', namedCurve: 'P-384' };
    signingAlgorithm = 'ES384';
  } else {
    throw new Error('Payer private key must be RSA or P-384 EC');
  }
  if (!privateKeyJwk.kid) throw new Error('Payer private key is missing kid');
  var now = Math.floor(Date.now() / 1000);
  var header = { alg: signingAlgorithm, kid: privateKeyJwk.kid, typ: 'JWT', jku: payer.jwksUri };
  var payload = { iss: payer.clientId, sub: payer.clientId, aud: payer.tokenEndpoint, exp: now + 300, jti: crypto.randomUUID() };
  var signingInput = base64UrlEncode(JSON.stringify(header)) + '.' + base64UrlEncode(JSON.stringify(payload));
  var key = await crypto.subtle.importKey('jwk', privateKeyJwk, algorithm, false, ['sign']);
  var signature = await crypto.subtle.sign(
    privateKeyJwk.kty === 'RSA' ? algorithm : { name: 'ECDSA', hash: 'SHA-384' },
    key,
    new TextEncoder().encode(signingInput)
  );
  return signingInput + '.' + base64UrlEncode(new Uint8Array(signature));
}

function isAllowedScope(payer, scope) {
  var requestedScopes = String(scope || '').trim().split(/\s+/).filter(function(item) { return item; });
  if (requestedScopes.length === 0) return false;
  return requestedScopes.every(function(requestedScope) {
    if (Array.isArray(payer.systemScopes) && payer.systemScopes.indexOf(requestedScope) !== -1) return true;
    return payer.allowPatientScopes === true && /^patient\/[A-Za-z0-9\-.]+\.(rs|read)$/.test(requestedScope);
  });
}

function getOutboundFetcher(payer, env) {
  if (!payer.requiresMtls) return fetch;
  if (!env.MTLS_CERT) throw new Error('Payer requires mTLS but MTLS_CERT is not configured');
  return function(url, options) { return env.MTLS_CERT.fetch(url, options); };
}

async function validateSmartConfiguration(payer, fetcher) {
  if (!payer.fhirBaseUrl) throw new Error('Payer configuration is missing fhirBaseUrl');
  var discoveryUrl = payer.fhirBaseUrl.replace(/\/$/, '') + '/.well-known/smart-configuration';
  var response = await fetcher(discoveryUrl, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) throw new Error('SMART configuration request failed: HTTP ' + response.status);
  var configuration = await response.json();
  var authMethods = Array.isArray(configuration.token_endpoint_auth_methods_supported) ? configuration.token_endpoint_auth_methods_supported : [];
  var algorithms = Array.isArray(configuration.token_endpoint_auth_signing_alg_values_supported) ? configuration.token_endpoint_auth_signing_alg_values_supported : [];
  var capabilities = Array.isArray(configuration.capabilities) ? configuration.capabilities : [];
  var expectedAlgorithm = payer.privateKeyJwk && payer.privateKeyJwk.kty === 'EC' ? 'ES384' : 'RS384';
  if (configuration.token_endpoint !== payer.tokenEndpoint) throw new Error('SMART token_endpoint does not match registered payer endpoint');
  if (authMethods.indexOf('private_key_jwt') === -1) throw new Error('SMART configuration does not advertise private_key_jwt');
  if (algorithms.indexOf(expectedAlgorithm) === -1) throw new Error('SMART configuration does not advertise ' + expectedAlgorithm);
  if (capabilities.indexOf('client-confidential-asymmetric') === -1) throw new Error('SMART configuration does not advertise client-confidential-asymmetric');
}

async function handleTokenRequest(request, env) {
  var payload;
  var payers;
  try {
    payload = await request.json();
    payers = JSON.parse(env.PAYER_CONFIG_JSON || '{}');
  } catch (_) {
    return jsonResponse({ error: 'Invalid broker request or PAYER_CONFIG_JSON' }, 400, env);
  }
  var payer = payers[payload.payerKey];
  if (!payer || !isAllowedScope(payer, payload.scope || '')) {
    return jsonResponse({ error: 'Payer or requested scope is not allowed' }, 403, env);
  }
  try {
    var outboundFetch = getOutboundFetcher(payer, env);
    await validateSmartConfiguration(payer, outboundFetch);
    var body = new URLSearchParams();
    body.set('grant_type', 'client_credentials');
    body.set('scope', payload.scope);
    body.set('client_id', payer.clientId);
    body.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
    body.set('client_assertion', await createClientAssertion(payer));
    var response = await outboundFetch(payer.tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: body
    });
    var responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: { ...corsHeaders(env), 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
    });
  } catch (err) {
    return jsonResponse({ error: 'Token broker exchange failed: ' + (err.message || String(err)) }, 502, env);
  }
}

export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(env) });
    if (request.method === 'GET' && url.pathname === '/jwks.json') {
      try {
        var jwks = JSON.parse(env.JWKS_JSON || '');
        if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) throw new Error('Missing keys');
        return new Response(JSON.stringify(jwks), {
          headers: { ...corsHeaders(env), 'Content-Type': 'application/jwk-set+json', 'Cache-Control': 'public, max-age=3600' }
        });
      } catch (_) {
        return jsonResponse({ error: 'JWKS_JSON must be a valid public JWK Set' }, 500, env);
      }
    }
    if (request.method === 'POST' && url.pathname === '/token') {
      if (env.REQUIRE_ACCESS_JWT === 'true' && !request.headers.get('Cf-Access-Jwt-Assertion')) {
        return jsonResponse({ error: 'Cloudflare Access authentication is required' }, 401, env);
      }
      return handleTokenRequest(request, env);
    }
    return jsonResponse({ error: 'Not found' }, 404, env);
  }
};