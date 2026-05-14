import express from 'express';
import morgan from 'morgan';
import { v7 as uuid } from 'uuid';
import { createPod } from './kubernetes/pod.js';
import { createService } from './kubernetes/service.js';

const app = express();

app.use(express.json());
app.use(morgan('dev'));
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.get('/api/sandbox/health', (req, res) => {
    res.json({
        message: 'Sandbox API is healthy',
        status: 'ok'
    });
});

app.post('/api/sandbox/start', async (req, res) => {
    try {
        const sandboxId = uuid();

        await Promise.all([
            createPod(sandboxId),
            createService(sandboxId)
        ]);

        res.status(201).json({
            message: 'sandbox environment created successfully',
            sandboxId: sandboxId,
            previewUrl: `http://${sandboxId}.preview.localhost`
        });
    } catch (error) {
        console.error('Failed to start sandbox', error);
        res.status(500).json({
            message: 'failed to create sandbox environment',
            error: error.message
        });
    }
});

export default app;