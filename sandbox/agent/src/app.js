import express from 'express';
import morgan from 'morgan';

const app = express();

app.use(morgan('combined'));

app.get('/healthz', (req, res) => {
    res.json({
        message: 'Sandbox agent is healthy',
        status: 'ok'
    });
});

app.get('/readyz', (req, res) => {
    res.json({
        message: 'Sandbox agent is healthy',
        status: 'ok'
    });
});

export default app;