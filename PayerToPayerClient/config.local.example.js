// Local credential overrides for PayerToPayerClient.
// Copy this file to config.local.js and fill in your actual values.
// config.local.js is gitignored and must never be committed.
window.__localSecrets = {
    corsProxyUrl: 'https://your-cloudflare-worker.workers.dev/',
    healthInteractiveUAT: {
        clientSecret: 'YOUR_HEALTH_INTERACTIVE_UAT_SECRET'
    },
    deloitteConnectathon: {
        clientSecret: 'YOUR_DELOITTE_CONNECTATHON_SECRET'
    },
    cignaDevSandbox: {
        clientId: 'YOUR_CIGNA_CLIENT_ID',
        clientSecret: 'YOUR_CIGNA_CLIENT_SECRET'
    }
};
