import express from 'express';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use(morgan('combined'));

app.get('/api/status/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/status/readyz', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

const previewProxies = {};
const agentProxies = {};
const previewAgentPathProxies = {};

function getPreviewProxy(sandboxId) {
  const target = `http://sandbox-service-${sandboxId}`; // Service port 80 -> targetPort 3000 (agent API)

  if (!previewProxies[sandboxId]) {
    previewProxies[sandboxId] = createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
    });
  }

  return previewProxies[sandboxId];
}

function getAgentProxy(sandboxId) {
  const target = `http://sandbox-service-${sandboxId}:3000`; // Service port 3000 -> targetPort 3000 (agent API)

  if (!agentProxies[sandboxId]) {
    agentProxies[sandboxId] = createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
    });
  }

  return agentProxies[sandboxId];
}

function getPreviewAgentPathProxy(sandboxId) {
  const target = `http://sandbox-service-${sandboxId}:3000`;

  if (!previewAgentPathProxies[sandboxId]) {
    previewAgentPathProxies[sandboxId] = createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      pathRewrite: (path) => {
        const rewrittenPath = path.replace(/^\/api\/agent(?=\/|$)/, '');
        return rewrittenPath || '/';
      },
    });
  }

  return previewAgentPathProxies[sandboxId];
}

// Route by sandbox host: both preview and agent hosts now reach the agent API.
app.use((req, res, next) => {
  const hostname = (req.headers.host || '').split(':')[0];
  const hostParts = hostname.split('.');
  const sandboxId = hostParts[0];
  const sandboxType = hostParts[1];

  if (sandboxType === 'agent') {
    return getAgentProxy(sandboxId)(req, res, next);
  }

  if (sandboxType === 'preview') {
    if (req.path === '/api/agent' || req.path.startsWith('/api/agent/')) {
      return getPreviewAgentPathProxy(sandboxId)(req, res, next);
    }

    return getPreviewProxy(sandboxId)(req, res, next);
  }

  return res.status(404).json({
    message: 'Unknown sandbox host',
    status: 'error',
  });
});

export default app;
