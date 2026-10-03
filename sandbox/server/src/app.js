import express from 'express';
import morgan from 'morgan';
import sandboxRoutes from './routes/sandbox.routes.js';

const app = express();

app.use(express.json());
app.use(morgan('dev'));
app.get('/', (req, res) => res.json({ status: 'ok' }));
app.get('/api/status/healthz', (req, res) => res.json({ status: 'ok' }));
app.use('/api/sandbox', sandboxRoutes);

export default app;
