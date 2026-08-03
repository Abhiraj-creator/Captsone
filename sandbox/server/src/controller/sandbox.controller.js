import { v7 as uuid } from 'uuid';
import { createPod } from '../kubernetes/pod.js';
import { createService } from '../kubernetes/service.js';
import k8sApi from '../kubernetes/config.js';

const SANDBOX_ID_REGEX = /^[a-f0-9-]{36}$/i;
const NAMESPACE = 'default';

function isValidSandboxId(sandboxId) {
    return SANDBOX_ID_REGEX.test(sandboxId);
}

async function getSandboxServiceClusterIp(sandboxId) {
    const serviceName = `sandbox-service-${sandboxId}`;
    const serviceResponse = await k8sApi.readNamespacedService({
        name: serviceName,
        namespace: NAMESPACE
    });

    const service = serviceResponse?.body ?? serviceResponse;
    const clusterIP = service?.spec?.clusterIP;

    if (!clusterIP || clusterIP === 'None') {
        throw new Error(`sandbox service ${serviceName} has no clusterIP`);
    }

    return clusterIP;
}

async function proxyToAgent({ sandboxId, path, method = 'GET', query, body }) {
    const clusterIP = await getSandboxServiceClusterIp(sandboxId);
    const targetUrl = new URL(`http://${clusterIP}:3000${path}`);

    if (query) {
        Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                targetUrl.searchParams.set(key, String(value));
            }
        });
    }

    const response = await fetch(targetUrl, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000)
    });

    const raw = await response.text();
    let data = {};
    try {
        data = raw ? JSON.parse(raw) : {};
    } catch {
        data = { message: raw || 'non-json response from sandbox agent' };
    }

    return {
        status: response.status,
        data
    };
}

export const healthCheck = (req, res) => {
    res.json({
        message: 'Sandbox API is healthy',
        status: 'ok'
    });
};

export const getActiveSandbox = async (req, res) => {
    try {
        const podsResponse = await k8sApi.listNamespacedPod({ namespace: NAMESPACE });
        const podItems = podsResponse?.items ?? podsResponse?.body?.items ?? [];

        const activePod = podItems.find((pod) => {
            const sandboxId = pod.metadata?.labels?.sandboxId;
            return sandboxId && (pod.status?.phase === 'Running' || pod.status?.phase === 'Pending');
        });

        if (activePod) {
            const sandboxId = activePod.metadata.labels.sandboxId;
            const previewUrl = `http://${sandboxId}.preview.localhost`;
            return res.json({
                active: true,
                sandboxId,
                previewUrl
            });
        }

        return res.json({ active: false });
    } catch (error) {
        console.error('Failed to get active sandbox', error);
        return res.status(200).json({
            active: false,
            warning: 'failed to query active sandbox',
            error: error.message
        });
    }
};

export const startSandbox = async (req, res) => {
    try {
        const sandboxId = uuid();
        const previewUrl = `http://${sandboxId}.preview.localhost`;

        await Promise.all([
            createPod(sandboxId),
            createService(sandboxId)
        ]);

        return res.status(201).json({
            message: 'sandbox environment created successfully',
            sandboxId,
            previewUrl
        });
    } catch (error) {
        console.error('Failed to start sandbox', error);
        return res.status(500).json({
            message: 'failed to create sandbox environment',
            error: error.message
        });
    }
};

export const listFiles = async (req, res) => {
    const { sandboxId } = req.params;

    if (!isValidSandboxId(sandboxId)) {
        return res.status(400).json({ message: 'invalid sandboxId format' });
    }

    try {
        const result = await proxyToAgent({ sandboxId, path: '/list-files' });
        return res.status(result.status).json(result.data);
    } catch (error) {
        console.error('Failed to proxy list-files', error);
        return res.status(502).json({
            message: 'failed to reach sandbox agent',
            error: error.message
        });
    }
};

export const readFiles = async (req, res) => {
    const { sandboxId } = req.params;
    const files = req.query.files;

    if (!isValidSandboxId(sandboxId)) {
        return res.status(400).json({ message: 'invalid sandboxId format' });
    }

    try {
        const result = await proxyToAgent({
            sandboxId,
            path: '/read-files',
            query: { files }
        });
        return res.status(result.status).json(result.data);
    } catch (error) {
        console.error('Failed to proxy read-files', error);
        return res.status(502).json({
            message: 'failed to reach sandbox agent',
            error: error.message
        });
    }
};

export const updateFiles = async (req, res) => {
    const { sandboxId } = req.params;

    if (!isValidSandboxId(sandboxId)) {
        return res.status(400).json({ message: 'invalid sandboxId format' });
    }

    try {
        const result = await proxyToAgent({
            sandboxId,
            path: '/update-files',
            method: 'PATCH',
            body: req.body
        });
        return res.status(result.status).json(result.data);
    } catch (error) {
        console.error('Failed to proxy update-files', error);
        return res.status(502).json({
            message: 'failed to reach sandbox agent',
            error: error.message
        });
    }
};
