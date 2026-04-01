/**
 * Cloudflare Worker — lightweight CORS proxy for OAuth token exchanges.
 *
 * PURPOSE
 * -------
 * Some FHIR / OAuth token endpoints (e.g. Deloitte Keycloak) do not return
 * Access-Control-Allow-Origin headers, which blocks browser-based
 * (GitHub Pages) apps from completing the token exchange via fetch().
 * This worker sits in front of the real token endpoint, forwards the
 * request server-to-server (no CORS restriction), and returns the
 * response with the correct CORS headers so the browser is happy.
 *
 * DEPLOYMENT (free Cloudflare Workers account)
 * ---------------------------------------------
 * 1. Sign up at https://dash.cloudflare.com/
 * 2. Go to Workers & Pages → Create Worker
 * 3. Paste this entire file into the editor
 * 4. Deploy — note the *.workers.dev URL
 * 5. Set CORS_PROXY_URL in config.js to that URL
 *
 * SECURITY
 * --------
 * • Only POST is allowed (token exchange).
 * • Only your GitHub Pages origin is accepted.
 * • Only HTTPS target URLs are allowed.
 * • The worker never exposes secrets — it simply relays the request.
 */

const ALLOWED_ORIGIN = 'https://russellott.github.io';

export default {
  async fetch(request) {

    // --- Preflight -----------------------------------------------------------
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders()
      });
    }

    // --- Only POST -----------------------------------------------------------
    if (request.method !== 'POST') {
      return jsonError(405, 'Only POST requests are supported');
    }

    // --- Origin check --------------------------------------------------------
    const origin = request.headers.get('Origin') || '';
    if (origin !== ALLOWED_ORIGIN) {
      return jsonError(403, `Origin ${origin} is not allowed`);
    }

    // --- Target URL ----------------------------------------------------------
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return jsonError(400, 'Missing ?url= query parameter');
    }

    try {
      new URL(targetUrl); // validate
    } catch {
      return jsonError(400, 'Invalid target URL');
    }

    if (!targetUrl.startsWith('https://')) {
      return jsonError(400, 'Only HTTPS target URLs are allowed');
    }

    // --- Forward the request server-to-server --------------------------------
    try {
      const body = await request.text();
      const proxyResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': request.headers.get('Content-Type') || 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body
      });

      // Read the response and return it with CORS headers
      const responseBody = await proxyResponse.text();
      return new Response(responseBody, {
        status: proxyResponse.status,
        headers: {
          ...corsHeaders(),
          'Content-Type': proxyResponse.headers.get('Content-Type') || 'application/json'
        }
      });

    } catch (err) {
      return jsonError(502, `Upstream request failed: ${err.message}`);
    }
  }
};

// ---------------------------------------------------------------------------
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonError(status, message) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json'
    }
  });
}
