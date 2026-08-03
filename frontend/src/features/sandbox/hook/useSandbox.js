import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import * as api from '../service/sandbox.api';
import {
  startSandboxPending,
  startSandboxSuccess,
  startSandboxFailed,
  stopSandbox as stopSandboxAction,
  setFileList,
  openFile,
  closeFile,
  setActiveFile,
  setFileContent,
  updateLocalContent as updateLocalContentAction,
  markFileSaved,
  addTerminalLog,
  clearTerminalLogs,
  addMessage,
  updateLastAgentMessage
} from '../state/sandbox.slice';

export function useSandbox() {
  const dispatch = useDispatch();

  const {
    sandboxId,
    previewUrl,
    status,
    error,
    fileList,
    openFiles,
    activeFile,
    fileContents,
    dirtyFiles,
    terminalLogs,
    messages
  } = useSelector((state) => state.sandbox);

  const refreshFileList = useCallback(async (id = sandboxId) => {
    const resolvedSandboxId = typeof id === 'string' ? id : sandboxId;
    if (!resolvedSandboxId) return;
    try {
      const files = await api.listFiles(resolvedSandboxId);
      dispatch(setFileList(files));
    } catch (err) {
      console.error('Error refreshing files:', err);
    }
  }, [sandboxId, dispatch]);

  const startNewSandbox = useCallback(async () => {
    dispatch(startSandboxPending());
    try {
      const data = await api.startSandbox();
      dispatch(startSandboxSuccess({
        sandboxId: data.sandboxId,
        previewUrl: data.previewUrl
      }));
      // Initial list of files
      await refreshFileList(data.sandboxId);
    } catch (err) {
      dispatch(startSandboxFailed(err.message || 'Failed to start sandbox'));
    }
  }, [dispatch, refreshFileList]);

  const stopActiveSandbox = useCallback(() => {
    dispatch(stopSandboxAction());
  }, [dispatch]);

  const hydrateActiveSandbox = useCallback(async () => {
    dispatch(startSandboxPending());
    try {
      const data = await api.getActiveSandbox();
      if (data.active && data.sandboxId && data.previewUrl) {
        dispatch(startSandboxSuccess({
          sandboxId: data.sandboxId,
          previewUrl: data.previewUrl
        }));
        // Load files
        await refreshFileList(data.sandboxId);
      } else {
        dispatch(stopSandboxAction());
      }
    } catch (err) {
      dispatch(stopSandboxAction());
    }
  }, [dispatch, refreshFileList]);

  const openFileInEditor = useCallback(async (file) => {
    // If not in cache, load content from agent
    if (fileContents[file] === undefined && sandboxId) {
      try {
        const contents = await api.readFiles(sandboxId, [file]);
        if (contents[file] !== undefined) {
          dispatch(setFileContent({ file, content: contents[file] }));
        } else {
          dispatch(setFileContent({ file, content: '' }));
        }
      } catch (err) {
        console.error(`Error reading file ${file}:`, err);
        dispatch(setFileContent({ file, content: `// Error loading file: ${err.message}` }));
      }
    }
    dispatch(openFile(file));
  }, [sandboxId, fileContents, dispatch]);

  const editFileContent = useCallback((file, content) => {
    dispatch(updateLocalContentAction({ file, content }));
  }, [dispatch]);

  const saveActiveFile = useCallback(async () => {
    if (!activeFile || !sandboxId) return;
    const content = fileContents[activeFile] || '';
    try {
      await api.updateFiles(sandboxId, [{ file: activeFile, content }]);
      dispatch(markFileSaved(activeFile));
      // Refresh the file tree to account for any structure changes
      await refreshFileList();
    } catch (err) {
      console.error('Error saving file:', err);
    }
  }, [activeFile, sandboxId, fileContents, dispatch, refreshFileList]);

  const closeFileTab = useCallback((file) => {
    dispatch(closeFile(file));
  }, [dispatch]);

  const selectActiveTab = useCallback((file) => {
    dispatch(setActiveFile(file));
  }, [dispatch]);

  const sendMessageToAgent = useCallback(async (text) => {
    if (!text.trim() || !sandboxId) return;

    const userMessageId = `user-${Date.now()}`;
    dispatch(addMessage({
      id: userMessageId,
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    }));

    const agentMessageId = `agent-${Date.now()}`;
    dispatch(addMessage({
      id: agentMessageId,
      sender: 'agent',
      text: '',
      status: 'streaming',
      timestamp: new Date().toISOString()
    }));

    let accumulatedResponse = '';
    try {
      await api.invokeAgentStream(text, sandboxId, (chunk) => {
        accumulatedResponse += chunk;
        dispatch(updateLastAgentMessage({
          text: accumulatedResponse,
          status: 'streaming'
        }));
      });

      dispatch(updateLastAgentMessage({
        text: accumulatedResponse,
        status: 'done'
      }));

      // Since the agent has completed actions, it may have modified files
      // Sync the file tree and reload open files to reflect changes
      await refreshFileList();
      
      // Re-read all currently open files to show updates in editor tabs
      if (openFiles.length > 0) {
        try {
          const updatedContents = await api.readFiles(sandboxId, openFiles);
          Object.entries(updatedContents).forEach(([file, content]) => {
            dispatch(setFileContent({ file, content }));
          });
        } catch (readErr) {
          console.error('Error syncing open files after agent update:', readErr);
        }
      }

    } catch (err) {
      console.error('Error invoking agent:', err);
      dispatch(updateLastAgentMessage({
        text: accumulatedResponse + `\n\n[Error: ${err.message}]`,
        status: 'error'
      }));
    }
  }, [sandboxId, openFiles, dispatch, refreshFileList]);

  const appendTerminalOutput = useCallback((output) => {
    dispatch(addTerminalLog(output));
  }, [dispatch]);

  const clearTerminal = useCallback(() => {
    dispatch(clearTerminalLogs());
  }, [dispatch]);

  return {
    sandboxId,
    previewUrl,
    status,
    error,
    fileList,
    openFiles,
    activeFile,
    fileContents,
    dirtyFiles,
    terminalLogs,
    messages,
    startNewSandbox,
    stopActiveSandbox,
    hydrateActiveSandbox,
    openFileInEditor,
    editFileContent,
    saveActiveFile,
    closeFileTab,
    selectActiveTab,
    sendMessageToAgent,
    appendTerminalOutput,
    clearTerminal,
    refreshFileList
  };
}
