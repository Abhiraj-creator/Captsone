import { Router } from "express";
import agent from '../code.agent.js'
import 'dotenv/config';
const agentRouter = Router();

function toDisplayText(value) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);

    if (Array.isArray(value)) {
        return value.map((entry) => toDisplayText(entry)).filter(Boolean).join('');
    }

    if (value && typeof value === 'object') {
        if (typeof value.text === 'string') return value.text;

        if (typeof value.content === 'string') return value.content;

        if (Array.isArray(value.content)) {
            const fromParts = value.content
                .map((part) => {
                    if (typeof part === 'string') return part;
                    if (part && typeof part.text === 'string') return part.text;
                    return '';
                })
                .join('');
            if (fromParts) return fromParts;
        }
    }

    return '';
}

function normalizeStreamChunk(chunk) {
    // LangChain can stream [mode, payload] tuples for some stream configurations.
    if (Array.isArray(chunk) && chunk.length === 2) {
        const [mode, payload] = chunk;
        const text = toDisplayText(payload);
        return {
            mode: typeof mode === 'string' ? mode : 'chunk',
            text,
            raw: payload
        };
    }

    return {
        mode: 'chunk',
        text: toDisplayText(chunk),
        raw: chunk
    };
}

function writeSse(res, payload) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

agentRouter.post("/invoke", async (req, res) => {
    try {
        const { message, projectId } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({ error: "message is required" });
        }

        res.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        res.flushHeaders?.();

        const response = await agent.stream(
            {
                messages: [ {
                    role: "user",
                    content: message
                } ]
            },
            {
                context: {
                    projectId
                },
                streamMode: ["updates", "messages", "custom"]
            });

        for await (const chunk of response) {
            const normalized = normalizeStreamChunk(chunk);
            writeSse(res, {
                type: 'chunk',
                mode: normalized.mode,
                text: normalized.text,
                raw: normalized.raw
            });
        }

        writeSse(res, { type: 'done' });
        res.end();
    } catch (error) {
        console.error("Error invoking agent:", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Failed to invoke agent" });
        }
        writeSse(res, { type: 'error', error: error.message || 'Failed to invoke agent' });
        res.end();
    }
});

export default agentRouter;
