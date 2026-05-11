import express from 'express';
import morgan from 'morgan';


const app = express();

app.use(morgan('dev'));

app.get('/api/sandbox/health', (req, res) => {
    res.json({
        message: 'Sandbox API is healthy',
        status: 'ok'
    });
});

export default app;