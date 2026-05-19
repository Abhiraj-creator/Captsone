import express from 'express';
import morgan from 'morgan';
import { v7 as uuid } from 'uuid';
import { createPod } from './kubernetes/pod.js';
import { createService } from './kubernetes/service.js';


const app = express();

app.use(express.json());
app.use(morgan('dev'));




app.get('/api/sandbox/health', (req, res) => {
    res.json({
        message: 'Sandbox API is healthy',
        status: 'ok'
    });
});

app.post('/api/sandbox/start', async (req, res) => {
    try {
        const sandboxId = uuid();
        const previewUrl = `http://${sandboxId}.preview.localhost`;

        await Promise.all([
            createPod(sandboxId),
            createService(sandboxId)
        ]);

        res.status(201).json({
            message: 'sandbox environment created successfully',
            sandboxId: sandboxId,
            previewUrl
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
