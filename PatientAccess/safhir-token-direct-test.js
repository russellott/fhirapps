import process from 'node:process';

const tokenUrl = process.env.TOKEN_URL || 'https://api-dmdh-alpha.safhir.io/slapv3/o/pdex/token/';
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const scope = process.env.SCOPE || 'system/Group.read';

if (!clientId || !clientSecret) {
  console.error('Missing CLIENT_ID or CLIENT_SECRET environment variables.');
  console.error('Example:');
  console.error('  $env:CLIENT_ID="..."');
  console.error('  $env:CLIENT_SECRET="..."');
  console.error('  node PatientAccess/safhir-token-direct-test.js');
  process.exit(1);
}

const body = new URLSearchParams({
  grant_type: 'client_credentials',
  scope,
});

const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

const response = await fetch(tokenUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'Authorization': `Basic ${authHeader}`,
  },
  body: body.toString(),
});

const text = await response.text();
console.log('Status:', response.status, response.statusText);
console.log('Body:');
console.log(text);
