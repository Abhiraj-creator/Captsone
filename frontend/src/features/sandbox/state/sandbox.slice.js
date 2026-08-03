import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sandboxId: null,
  previewUrl: null,
  status: 'idle', // 'idle' | 'starting' | 'running' | 'error'
  error: null,
  fileList: [], // array of string paths (e.g. ['package.json', 'src/App.jsx'])
  openFiles: [], // array of open file paths
  activeFile: null, // active file path
  fileContents: {}, // maps path -> content string
  dirtyFiles: {}, // maps path -> boolean (modified locally)
  terminalLogs: '', // stream of stdout/stderr from socket
  messages: [
    {
      id: 'welcome',
      sender: 'agent',
      text: 'Hello! I am your AI Developer Agent. Ask me to make changes, build features, or debug your workspace.',
      timestamp: new Date().toISOString()
    }
  ]
};

const sandboxSlice = createSlice({
  name: 'sandbox',
  initialState,
  reducers: {
    startSandboxPending: (state) => {
      state.status = 'starting';
      state.error = null;
    },
    startSandboxSuccess: (state, action) => {
      state.status = 'running';
      state.sandboxId = action.payload.sandboxId;
      state.previewUrl = action.payload.previewUrl;
    },
    startSandboxFailed: (state, action) => {
      state.status = 'error';
      state.error = action.payload;
    },
    stopSandbox: (state) => {
      state.sandboxId = null;
      state.previewUrl = null;
      state.status = 'idle';
      state.fileList = [];
      state.openFiles = [];
      state.activeFile = null;
      state.fileContents = {};
      state.dirtyFiles = {};
      state.terminalLogs = '';
    },
    setFileList: (state, action) => {
      state.fileList = action.payload;
    },
    openFile: (state, action) => {
      const filePath = action.payload;
      if (!state.openFiles.includes(filePath)) {
        state.openFiles.push(filePath);
      }
      state.activeFile = filePath;
    },
    closeFile: (state, action) => {
      const filePath = action.payload;
      state.openFiles = state.openFiles.filter((f) => f !== filePath);
      
      if (state.activeFile === filePath) {
        state.activeFile = state.openFiles.length > 0 ? state.openFiles[state.openFiles.length - 1] : null;
      }
    },
    setActiveFile: (state, action) => {
      state.activeFile = action.payload;
    },
    setFileContent: (state, action) => {
      const { file, content } = action.payload;
      state.fileContents[file] = content;
      // When loaded from server, it's not dirty
      state.dirtyFiles[file] = false;
    },
    updateLocalContent: (state, action) => {
      const { file, content } = action.payload;
      state.fileContents[file] = content;
      state.dirtyFiles[file] = true;
    },
    markFileSaved: (state, action) => {
      const file = action.payload;
      state.dirtyFiles[file] = false;
    },
    addTerminalLog: (state, action) => {
      state.terminalLogs += action.payload;
      // Cap terminal logs at 50,000 chars to avoid memory issues
      if (state.terminalLogs.length > 50000) {
        state.terminalLogs = state.terminalLogs.slice(state.terminalLogs.length - 30000);
      }
    },
    clearTerminalLogs: (state) => {
      state.terminalLogs = '';
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    updateLastAgentMessage: (state, action) => {
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg && lastMsg.sender === 'agent') {
        lastMsg.text = action.payload.text;
        if (action.payload.status) {
          lastMsg.status = action.payload.status;
        }
      }
    }
  }
});

export const {
  startSandboxPending,
  startSandboxSuccess,
  startSandboxFailed,
  stopSandbox,
  setFileList,
  openFile,
  closeFile,
  setActiveFile,
  setFileContent,
  updateLocalContent,
  markFileSaved,
  addTerminalLog,
  clearTerminalLogs,
  addMessage,
  updateLastAgentMessage
} = sandboxSlice.actions;

export default sandboxSlice.reducer;
