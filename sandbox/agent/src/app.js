import express from 'express';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import pty from 'node-pty';
import ws from 'ws';
import os from 'os';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
app.use(cors({
    methods: ["GET", "POST", "PATCH", "DELETE"],
    origin: "*",
}));

const app = express();
const WORKING_DIR = '/workspace';
const HttpServer = http.createServer(app);

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Hello from sandbox agent!',
        status: 'success',
    });
});


function CreateTerminal() {
    const Shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';

    const PtyProcess = pty.spawn(Shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: WORKING_DIR,
        env: process.env,
    });
    return PtyProcess;

}


    const wss = new WebSocketServer({ server: HttpServer });
    wss.on('connection', (ws) => {
        console.log('Client connected')

        const terminal = CreateTerminal()

        terminal.onData((data) => {
            ws.emit('terminal-output', data)
        })
        terminal.onExit(({ exitCode, signal }) => {
            console.log(`PTY process exited with code: ${exitCode}, signal: ${signal}`);
        })

        ws.on('terminal-input', (data) => {
            terminal.write(data.toString())
        })

        ws.on('close', () => {
            console.log('Client disconnected')
            terminal.kill()
        })
    })

app.get("/list-files", async (req, res) => {

    const listFiles = async (dir, baseDir) => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        const files = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath);

            // Exclude certain directories
            if (entry.isDirectory() && ['node_modules', '.git', 'dist'].includes(entry.name)) {
                continue;
            }

            if (entry.isDirectory()) {
                files.push(...await listFiles(fullPath, baseDir));
            } else {
                files.push(relativePath);
            }
        }

        return files;
    }

    try {
        const files = await listFiles(WORKING_DIR, WORKING_DIR);
        res.status(200).json({
            message: 'Files listed successfully',
            files,
        });
    } catch (err) {
        res.status(500).json({
            message: `Error listing files: ${err.message}`,
            status: 'error',
        });
    }

})


/**
 * @route GET /read-files
 * @description Reads the content of all files requested in the query parameter 'files' and returns their content as a JSON object.
 * - eg. /read-files?files=file1.txt,/src/file2.txt
 */
app.get("/read-files", async (req, res) => {

    const files = req.query.files;

    if (!files) {
        return res.status(400).json({
            message: 'No files specified in query parameter',
            status: 'error',
        });
    }

    const fileList = files.split(',');

    const results = await Promise.all(fileList.map(async (file) => {
        const filePath = path.join(WORKING_DIR, file);
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return {
                [filePath.replace(WORKING_DIR, '')]: content,
            }
        } catch (err) {
            return {
                [filePath.replace(WORKING_DIR, '')]: `Error reading file: ${err.message}`,
            }
        }
    }));

    res.status(200).json({
        message: 'File contents',
        files: results,
    });

})


/**
 * @route PATCH /update-files
 * @description Updates the content of files specified in the request body. The request body should container a property 'updates' with a JSON Array of object, each object should have a 'file' property specifying the file path (relative to the working directory) and a 'content' property specifying the new content for the file.
 */
app.patch("/update-files", async (req, res) => {

    const updates = req.body.updates;

    if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({
            message: 'Invalid request body. Expected a JSON object with an "updates" property containing an array of file updates.',
            status: 'error',
        });
    }

    const results = await Promise.all(updates.map(async (update) => {
        const { file, content } = update;
        const filePath = path.join(WORKING_DIR, file);
        try {

            console.log(path.dirname(filePath), filePath);

            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs.promises.writeFile(filePath, content, 'utf-8');
            return {
                [filePath]: 'File updated successfully',
            }
        } catch (err) {
            return {
                [filePath]: `Error updating file: ${err.message}`,
            }
        }
    }));

    res.status(200).json({
        message: 'File update results',
        results,
    });
})


/**
 * @route POST /create-files
 * @description Creates new files with the content specified in the request body. The request body should contain a property 'files' with a JSON Array of objects, each object should have a 'file' property specifying the file path (relative to the working directory) and a 'content' property specifying the content for the new file.
 */
app.post("/create-files", async (req, res) => {
    const files = req.body.files;

    if (!files || !Array.isArray(files)) {
        return res.status(400).json({
            message: 'Invalid request body. Expected a JSON object with a "files" property containing an array of file objects.',
            status: 'error',
        });
    }

    const results = await Promise.all(files.map(async (fileObj) => {
        const { file, content } = fileObj;
        const filePath = path.join(WORKING_DIR, file);
        try {

            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs.promises.writeFile(filePath, content, 'utf-8');
            return {
                [filePath]: 'File created successfully',
            }
        } catch (err) {
            return {
                [filePath]: `Error creating file: ${err.message}`,
            }
        }
    }));

    res.status(200).json({
        message: 'File creation results',
        results,
    });
})



export default HttpServer;
