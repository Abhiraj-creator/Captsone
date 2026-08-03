/**
 * API Service for Capstone Cloud Sandbox - Powered by Axios
 */
import axios from 'axios';


/**
 * Starts a new sandbox environment
 * @returns {Promise<{ sandboxId: string, previewUrl: string }>}
 */
export async function startSandbox() {
  try {
    const response = await axios.post('/api/sandbox/start');
    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message || 'Failed to start sandbox environment';
    throw new Error(errMsg);
  }
}

/**
 * Checks if there is an active sandbox environment running
 * @returns {Promise<{ active: boolean, sandboxId?: string, previewUrl?: string }>}
 */
export async function getActiveSandbox() {
  try {
    const response = await axios.get('/api/sandbox/active');
    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message || 'Failed to check active sandbox';
    throw new Error(errMsg);
  }
}

/**
 * Lists files in the active sandbox
 * @param {string} sandboxId 
 * @returns {Promise<string[]>}
 */
export async function listFiles(sandboxId) {
  try {
    const response = await axios.get(`/api/sandbox/${sandboxId}/list-files`);
    return response.data.files || [];
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message || 'Failed to list files from sandbox agent';
    throw new Error(errMsg);
  }
}

/**
 * Reads file contents from the sandbox
 * @param {string} sandboxId 
 * @param {string[]} files array of file paths
 * @returns {Promise<Record<string, string>>} maps path -> content
 */
export async function readFiles(sandboxId, files) {
  if (!files || files.length === 0) return {};

  // Ensure paths are formatted properly (agent expects paths, e.g. src/App.jsx)
  const encodedFiles = files.map(f => f.startsWith('/') ? f.slice(1) : f).join(',');
  
  try {
    const response = await axios.get(`/api/sandbox/${sandboxId}/read-files`, {
      params: { files: encodedFiles }
    });
    
    // Transform agent response array [{ "/src/App.jsx": "content" }] to unified key-value object
    const fileContents = {};
    if (response.data.files && Array.isArray(response.data.files)) {
      response.data.files.forEach((fileObj) => {
        Object.entries(fileObj).forEach(([pathKey, content]) => {
          // Normalize pathKey (remove leading slash if present, to match listFiles format)
          const normKey = pathKey.startsWith('/') ? pathKey.slice(1) : pathKey;
          fileContents[normKey] = content;
        });
      });
    }
    return fileContents;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message || 'Failed to read files from sandbox agent';
    throw new Error(errMsg);
  }
}

/**
 * Updates files in bulk on the sandbox
 * @param {string} sandboxId 
 * @param {{ file: string, content: string }[]} updates 
 */
export async function updateFiles(sandboxId, updates) {
  if (!updates || updates.length === 0) return;
  
  // Normalize paths (ensure agent receives relative paths starting with /)
  const formattedUpdates = updates.map(u => ({
    file: u.file.startsWith('/') ? u.file : `/${u.file}`,
    content: u.content
  }));

  try {
    const response = await axios.patch(`/api/sandbox/${sandboxId}/update-files`, {
      updates: formattedUpdates
    });
    return response.data;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message || 'Failed to update files in sandbox';
    throw new Error(errMsg);
  }
}

/**
 * Invokes the AI orchestration agent and reads the SSE response stream
 * @param {string} message 
 * @param {string} projectId 
 * @param {(chunk: string) => void} onChunk 
 */
export async function invokeAgentStream(message, projectId, onChunk) {
  // We use the native fetch API specifically for streaming SSE data chunks,
  // since reading standard browser ReadableStreams is native and lightweight.
  const response = await fetch('/api/ai/invoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, projectId }),
  });

  if (!response.ok) {
    throw new Error('Failed to invoke AI Agent orchestrator');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  
  const processSseFrame = (frame) => {
    if (!frame.trim()) return;

    const lines = frame.split('\n').map((line) => line.trimEnd());
    const dataLines = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart());

    if (dataLines.length === 0) return;
    const dataPayload = dataLines.join('\n');

    // New backend sends structured JSON payloads. Keep backward compatibility
    // with plain text chunks by falling back when JSON parse fails.
    try {
      const parsed = JSON.parse(dataPayload);
      if (!parsed || typeof parsed !== 'object') return;

      if (parsed.type === 'chunk') {
        if (typeof parsed.text === 'string' && parsed.text.length > 0) {
          onChunk(parsed.text);
        } else if (parsed.raw !== undefined) {
          onChunk(`\n[${parsed.mode || 'chunk'}] ${JSON.stringify(parsed.raw)}\n`);
        }
      } else if (parsed.type === 'error') {
        const errorText = parsed.error || 'Unknown stream error';
        onChunk(`\n[stream error] ${errorText}\n`);
      }
      return;
    } catch {
      // Legacy mode: plain `data: <text>`
      onChunk(dataPayload);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      if (buffer.trim()) {
        processSseFrame(buffer.replace(/\r/g, ''));
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const normalized = buffer.replace(/\r/g, '');
    const frames = normalized.split('\n\n');
    buffer = frames.pop() || ''; // Keep incomplete last chunk in buffer

    for (const frame of frames) {
      processSseFrame(frame);
    }
  }
}
