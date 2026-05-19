import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import AgentRouter from './agents/routes/agent.routes.js'

const app = express();

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.get('/api/status/healthz', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'AI Orchestration service is running'
  })
})

app.use('/api/ai', AgentRouter);


export default app;