import React, { useEffect, useRef, useState } from 'react';
import { useSandbox } from '../hook/useSandbox';
import FileTree from '../components/FileTree';
import CodeEditor from '../components/CodeEditor';
import TerminalView from '../components/TerminalView';
import PreviewPanel from '../components/PreviewPanel';
import AgentChat from '../components/AgentChat';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default function Dashboard() {
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
    refreshFileList,
  } = useSandbox();

  const [centerMode, setCenterMode] = useState('code');
  const [leftPaneWidth, setLeftPaneWidth] = useState(300);
  const [rightPaneWidth, setRightPaneWidth] = useState(300);
  const [terminalHeight, setTerminalHeight] = useState(230);
  const [isCompact, setIsCompact] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth < 1100 : false
  ));
  const dragStateRef = useRef(null);

  useEffect(() => {
    hydrateActiveSandbox();
  }, [hydrateActiveSandbox]);

  useEffect(() => {
    if (fileList.length > 0 && !activeFile) {
      const defaultFiles = ['src/App.jsx', 'src/main.jsx', 'index.html', 'package.json'];
      const fileToOpen = defaultFiles.find((f) => fileList.includes(f)) || fileList[0];
      openFileInEditor(fileToOpen);
    }
  }, [fileList, activeFile, openFileInEditor]);

  useEffect(() => {
    const handlePointerMove = (e) => {
      const drag = dragStateRef.current;
      if (!drag) return;

      if (drag.type === 'left') {
        const next = drag.startWidth + (e.clientX - drag.startX);
        setLeftPaneWidth(clamp(next, 220, 480));
      }

      if (drag.type === 'right') {
        const next = drag.startWidth - (e.clientX - drag.startX);
        setRightPaneWidth(clamp(next, 240, 500));
      }

      if (drag.type === 'terminal') {
        const next = drag.startHeight - (e.clientY - drag.startY);
        setTerminalHeight(clamp(next, 140, 420));
      }
    };

    const handlePointerUp = () => {
      if (dragStateRef.current) {
        dragStateRef.current = null;
        document.body.classList.remove('resizing-workspace');
        document.body.classList.remove('resizing-workspace-row');
      }
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      document.body.classList.remove('resizing-workspace');
      document.body.classList.remove('resizing-workspace-row');
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onResize = () => {
      setIsCompact(window.innerWidth < 1100);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startDrag = (type) => (e) => {
    e.preventDefault();
    if (type === 'left') {
      dragStateRef.current = {
        type,
        startX: e.clientX,
        startWidth: leftPaneWidth
      };
    }
    if (type === 'right') {
      dragStateRef.current = {
        type,
        startX: e.clientX,
        startWidth: rightPaneWidth
      };
    }
    if (type === 'terminal') {
      dragStateRef.current = {
        type,
        startY: e.clientY,
        startHeight: terminalHeight
      };
    }
    document.body.classList.add('resizing-workspace');
    if (type === 'terminal') {
      document.body.classList.add('resizing-workspace-row');
    } else {
      document.body.classList.remove('resizing-workspace-row');
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0a0a0a] text-on-surface font-sans">
      <header className="flex justify-between items-center w-full px-4 h-16 bg-[#101010] border-b border-outline-variant select-none shrink-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="font-sans text-[20px] font-bold tracking-tight text-primary">CAPSTONE</h1>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
            <span className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-primary animate-pulse' : 'bg-on-surface-variant/40'}`} />
            {status === 'running' ? 'RUNNING' : status.toUpperCase()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status === 'running' && (
            <button
              onClick={stopActiveSandbox}
              className="border border-outline-variant text-on-surface px-3 py-1.5 rounded-lg font-mono text-[11px] hover:bg-white/5 cursor-pointer"
            >
              Stop
            </button>
          )}
          {status !== 'running' && (
            <button
              onClick={startNewSandbox}
              disabled={status === 'starting'}
              className="bg-primary text-black px-4 py-1.5 rounded-lg font-mono text-[11px] font-bold hover:bg-primary/85 transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
            >
              {status === 'starting' ? 'Starting...' : 'Create Sandbox'}
            </button>
          )}
        </div>
      </header>

      {status === 'idle' || status === 'starting' || status === 'error' ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0b0b0b] relative p-6">
          <div className="relative z-10 max-w-md w-full bg-[#111111] border border-outline-variant p-8 rounded-xl text-center">
            <span className="material-symbols-outlined text-[64px] text-primary mb-4 animate-pulse">cloud_queue</span>
            <h2 className="text-2xl font-bold tracking-tight text-on-surface mb-2">Capstone Cloud Sandbox</h2>
            <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
              Create an isolated container workspace with live preview and AI orchestration.
            </p>
            {error && (
              <div className="mb-6 p-3 bg-error-container/20 border border-error/20 rounded text-error text-xs text-left leading-relaxed">
                <span className="font-bold">Error:</span> {error}
              </div>
            )}
            <button
              onClick={startNewSandbox}
              disabled={status === 'starting'}
              className="w-full bg-primary text-black py-3 rounded-lg font-mono text-sm font-bold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'starting' ? 'Starting Environment...' : 'Initialize Sandbox'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 p-2 md:p-3 bg-[#070707]">
          {isCompact ? (
            <div className="h-full min-h-0 w-full border border-outline-variant rounded-[24px] p-3 flex flex-col gap-3 overflow-auto">
              <div className="rounded-[20px] border border-outline-variant bg-[#0b0b0b] overflow-hidden">
                <div className="px-4 py-3 border-b border-outline-variant/50 flex justify-between items-center select-none">
                  <span className="font-mono text-[11px] font-bold text-primary uppercase tracking-wider">File Explorer</span>
                  <button
                    onClick={() => refreshFileList(sandboxId)}
                    title="Refresh File Explorer"
                    className="text-on-surface-variant hover:text-primary cursor-pointer flex items-center justify-center p-0.5 rounded"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                  </button>
                </div>
                <div className="h-52 overflow-y-auto">
                  <FileTree fileList={fileList} activeFile={activeFile} onOpenFile={openFileInEditor} />
                </div>
              </div>

              <div className="rounded-[20px] border border-outline-variant bg-[#090909] overflow-hidden min-h-[380px]">
                <div className="p-4 flex justify-center shrink-0">
                  <div className="inline-flex rounded-2xl border border-outline-variant overflow-hidden bg-[#0f0f0f]">
                    <button
                      onClick={() => setCenterMode('code')}
                      className={`px-8 py-2 text-base capitalize border-r border-outline-variant transition-colors cursor-pointer ${
                        centerMode === 'code' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      code
                    </button>
                    <button
                      onClick={() => setCenterMode('preview')}
                      className={`px-8 py-2 text-base capitalize transition-colors cursor-pointer ${
                        centerMode === 'preview' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      preview
                    </button>
                  </div>
                </div>
                <div className="h-[420px] px-2 pb-2">
                  {centerMode === 'code' ? (
                    <CodeEditor
                      openFiles={openFiles}
                      activeFile={activeFile}
                      fileContents={fileContents}
                      dirtyFiles={dirtyFiles}
                      onSelectTab={selectActiveTab}
                      onCloseTab={closeFileTab}
                      onEditContent={editFileContent}
                      onSaveFile={saveActiveFile}
                    />
                  ) : (
                    <PreviewPanel previewUrl={previewUrl} />
                  )}
                </div>
              </div>

              <div className="rounded-[20px] border border-outline-variant bg-[#0b0b0b] overflow-hidden h-64">
                <TerminalView
                  previewUrl={previewUrl}
                  terminalLogs={terminalLogs}
                  onAppendOutput={appendTerminalOutput}
                  onClearTerminal={clearTerminal}
                />
              </div>

              <div className="rounded-[20px] border border-outline-variant bg-[#0b0b0b] overflow-hidden h-[440px]">
                <AgentChat
                  messages={messages}
                  status={status}
                  previewUrl={previewUrl}
                  onSendMessage={sendMessageToAgent}
                />
              </div>
            </div>
          ) : (
            <div className="h-full min-h-0 w-full border border-outline-variant rounded-[24px] p-2 md:p-3 flex gap-2 md:gap-3">
            <aside
              style={{ width: `${leftPaneWidth}px` }}
              className="h-full min-h-0 shrink-0 rounded-[20px] border border-outline-variant bg-[#0b0b0b] flex flex-col overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-outline-variant/50 flex justify-between items-center select-none shrink-0">
                <span className="font-mono text-[11px] font-bold text-primary uppercase tracking-wider">File Explorer</span>
                <button
                  onClick={() => refreshFileList(sandboxId)}
                  title="Refresh File Explorer"
                  className="text-on-surface-variant hover:text-primary cursor-pointer flex items-center justify-center p-0.5 rounded"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <FileTree fileList={fileList} activeFile={activeFile} onOpenFile={openFileInEditor} />
              </div>
            </aside>

            <div
              onMouseDown={startDrag('left')}
              className="workspace-resizer workspace-resizer-vertical"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize file explorer"
            />

            <section className="flex-1 min-w-0 min-h-0 flex flex-col gap-2 md:gap-3">
              <div className="flex-1 min-h-0 rounded-[20px] border border-outline-variant bg-[#090909] overflow-hidden flex flex-col">
                <div className="p-4 flex justify-center shrink-0">
                  <div className="inline-flex rounded-2xl border border-outline-variant overflow-hidden bg-[#0f0f0f]">
                    <button
                      onClick={() => setCenterMode('code')}
                      className={`px-12 py-2.5 text-lg capitalize border-r border-outline-variant transition-colors cursor-pointer ${
                        centerMode === 'code' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      code
                    </button>
                    <button
                      onClick={() => setCenterMode('preview')}
                      className={`px-12 py-2.5 text-lg capitalize transition-colors cursor-pointer ${
                        centerMode === 'preview' ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-primary'
                      }`}
                    >
                      preview
                    </button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 px-2 pb-2">
                  {centerMode === 'code' ? (
                    <CodeEditor
                      openFiles={openFiles}
                      activeFile={activeFile}
                      fileContents={fileContents}
                      dirtyFiles={dirtyFiles}
                      onSelectTab={selectActiveTab}
                      onCloseTab={closeFileTab}
                      onEditContent={editFileContent}
                      onSaveFile={saveActiveFile}
                    />
                  ) : (
                    <PreviewPanel previewUrl={previewUrl} />
                  )}
                </div>
              </div>

              <div
                onMouseDown={startDrag('terminal')}
                className="workspace-resizer workspace-resizer-horizontal"
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize terminal"
              />

              <div
                style={{ height: `${terminalHeight}px` }}
                className="rounded-[20px] border border-outline-variant bg-[#0b0b0b] overflow-hidden shrink-0"
              >
                <TerminalView
                  previewUrl={previewUrl}
                  terminalLogs={terminalLogs}
                  onAppendOutput={appendTerminalOutput}
                  onClearTerminal={clearTerminal}
                />
              </div>
            </section>

            <div
              onMouseDown={startDrag('right')}
              className="workspace-resizer workspace-resizer-vertical"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize agent panel"
            />

            <aside
              style={{ width: `${rightPaneWidth}px` }}
              className="h-full min-h-0 shrink-0 rounded-[20px] border border-outline-variant bg-[#0b0b0b] overflow-hidden"
            >
              <AgentChat
                messages={messages}
                status={status}
                previewUrl={previewUrl}
                onSendMessage={sendMessageToAgent}
              />
            </aside>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
