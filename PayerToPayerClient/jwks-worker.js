/*
 * Cloudflare Worker that publishes the public JWKS required for
 * SMART Backend Services private_key_jwt registration.
 *
 * Deploy this worker and configure its JWKS_JSON environment variable with a
 * public JWK Set, for example: {"keys":[{"kty":"RSA","kid":"...","n":"...","e":"AQAB"}]}.
 * Register https://<worker>.<account>.workers.dev/jwks.json as the payer's
 * JWKS URI. Never place a private JWK in this worker or this file.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept',
  'Access-Control-Max-Age': '86400'
};

export default {
  async fetch(request, env) {
    var url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== 'GET' || url.pathname !== '/jwks.json') {
      return new Response('Not found', { status: 404 });
    }
    if (!env.JWKS_JSON) {
      return new Response(JSON.stringify({ error: 'JWKS_JSON is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    try {
      var jwks = JSON.parse(env.JWKS_JSON);
      if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) throw new Error('JWKS must contain keys');
      return new Response(JSON.stringify(jwks), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/jwk-set+json',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    } catch (_) {
      return new Response(JSON.stringify({ error: 'JWKS_JSON must be a valid public JWK Set' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};