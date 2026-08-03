import express from 'express';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import pty from 'node-pty';
import os from 'os';
import http from 'http';
import { Server } from 'socket.io'
import cors from 'cors';
import AgentRoutes from './routes/agent.routes.js';

const app = express();
const WORKING_DIR = '/workspace';

const HttpServer = http.createServer(app);

app.use(morgan('combined'));
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', AgentRoutes);


app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Hello from sandbox agent!',
        status: 'success',
    });
});


let io = new Server(HttpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH", "DELETE"],
    }
});


const Shell ='bash';

const PtyProcess = pty.spawn(Shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: WORKING_DIR,
    env: process.env,
})

PtyProcess.onData((data) => {
    io.emit('terminal-output', data)
    
});

PtyProcess.onExit(({ exitCode, signal }) => {
    console.log(`PTY process exited with code: ${exitCode}, signal: ${signal}`);
});

io.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('terminal-input', (data) => {
        PtyProcess.write(data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});








export default HttpServer;
