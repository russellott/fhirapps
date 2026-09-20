import http from 'node:http';
import { URLSearchParams } from 'node:url';

const PORT = Number(process.env.PORT || 3001);
const TOKEN_URL = process.env.TOKEN_URL || 'https://api-dmdh-alpha.safhir.io/slapv3/o/pdex/token/';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SCOPE = process.env.SCOPE || 'system/Group.read';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing CLIENT_ID or CLIENT_SECRET environment variables.');
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  const corsHeaders = {
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders });
    res.end(JSON.stringify({ ok: true, service: 'token-proxy-server' }));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/token') {
    const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const body = new URLSearchParams({ grant_type: 'client_credentials', scope: SCOPE }).toString();

    try {
      const upstream = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${authHeader}`
        },
        body
      });

      const text = await upstream.text();
      const contentType = upstream.headers.get('content-type') || 'application/json';

      res.writeHead(upstream.status, {
        'Content-Type': contentType,
        ...corsHeaders
      });
      res.end(text);
      return;
    } catch (error) {
      res.writeHead(502, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify({ error: 'Upstream token request failed', detail: error.message }));
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'application/json', ...corsHeaders });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`Token proxy server listening on http://localhost:${PORT}`);
  console.log(`Token endpoint: http://localhost:${PORT}/api/token`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
