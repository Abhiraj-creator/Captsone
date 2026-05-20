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
const proxies = {}
const agentProxies = {}

function parseHost(host = '') {
    const hostname = host.split(':')[ 0 ];
    const [ sandboxId, serviceType ] = hostname.split('.');
    return { sandboxId, serviceType };
}

function getProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}`;
    if (!proxies[ sandboxId ]) {
        proxies[ sandboxId ] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,
        });
    }
    return proxies[ sandboxId ];
}

function getAgentProxy(sandboxId) {
    const target = `http://sandbox-service-${sandboxId}:3000`;
    if (!agentProxies[ sandboxId ]) {
        agentProxies[ sandboxId ] = createProxyMiddleware({
            target,
            changeOrigin: true,
            ws: true,
        });
    }
    return agentProxies[ sandboxId ];
}

export function getProxyForHost(host) {
    const { sandboxId, serviceType } = parseHost(host);

    if (!sandboxId || !serviceType) {
        return null;
    }

    if (serviceType === 'agent') {
        return getAgentProxy(sandboxId);
    }

    if (serviceType === 'preview') {
        return getProxy(sandboxId);
    }

    return null;
}

app.use((req, res, next) => {
    const host = req.headers.host;
    const { sandboxId } = parseHost(host);
    const proxy = getProxyForHost(host);

    console.log(host, sandboxId);

    if (proxy) {
        return proxy(req, res, next);
    }

    res.status(404).json({ message: 'Unknown sandbox host' });
});

export default app;
