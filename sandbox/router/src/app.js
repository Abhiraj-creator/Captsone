import express from 'express';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { EventEmitter } from 'events';
import * as k8s from '@kubernetes/client-node';

EventEmitter.defaultMaxListeners = 100;

const app = express();
const NAMESPACE = 'default';
const proxyCache = new Map();

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

app.use(morgan('combined'));

app.get('/api/status/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/status/readyz', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

function parseHost(host = '') {
  const hostname = host.split(':')[0];
  const [sandboxId, serviceType] = hostname.split('.');
  return { sandboxId, serviceType };
}

async function getServiceClusterIp(sandboxId) {
  const serviceName = `sandbox-service-${sandboxId}`;
  const serviceResponse = await k8sApi.readNamespacedService({
    name: serviceName,
    namespace: NAMESPACE
  });

  const service = serviceResponse?.body ?? serviceResponse;
  const clusterIP = service?.spec?.clusterIP;

  if (!clusterIP || clusterIP === 'None') {
    throw new Error(`service ${serviceName} has no clusterIP`);
  }

  return clusterIP;
}

async function createServiceProxy(sandboxId, serviceType) {
  const clusterIP = await getServiceClusterIp(sandboxId);
  const targetPort = serviceType === 'agent' ? 3000 : 80;
  const target = `http://${clusterIP}:${targetPort}`;

  return createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true,
    proxyTimeout: 60000,
    timeout: 60000
  });
}

async function getProxyForHost(host) {
  const { sandboxId, serviceType } = parseHost(host);
  if (!sandboxId || !serviceType) {
    return null;
  }
  if (serviceType !== 'preview' && serviceType !== 'agent') {
    return null;
  }

  const cacheKey = `${sandboxId}:${serviceType}`;
  if (proxyCache.has(cacheKey)) {
    return proxyCache.get(cacheKey);
  }

  const proxy = await createServiceProxy(sandboxId, serviceType);
  proxyCache.set(cacheKey, proxy);
  return proxy;
}

app.use(async (req, res, next) => {
  const host = req.headers.host;
  const { sandboxId } = parseHost(host);

  console.log(host, sandboxId);

  try {
    const proxy = await getProxyForHost(host);
    if (proxy) {
      return proxy(req, res, next);
    }
    return res.status(404).json({ message: 'Unknown sandbox host' });
  } catch (error) {
    console.error('Failed to route sandbox host', error);
    return res.status(502).json({
      message: 'failed to resolve sandbox service',
      error: error.message
    });
  }
});

export { getProxyForHost };
export default app;
