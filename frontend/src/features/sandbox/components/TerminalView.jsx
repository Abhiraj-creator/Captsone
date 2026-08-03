import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const getAgentSocketUrl = (previewUrl) => {
  if (!previewUrl) return '';
  const cleanUrl = previewUrl.endsWith('/') ? previewUrl.slice(0, -1) : previewUrl;
  return cleanUrl.replace('.preview.', '.agent.');
};

export default function TerminalView({
  previewUrl,
  terminalLogs,
  onAppendOutput,
  onClearTerminal
}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const logEndRef = useRef(null);
  const terminalFocusRef = useRef(null);

  // Set up WebSocket connection to the active sandbox agent
  useEffect(() => {
    if (!previewUrl) {
      setIsConnected(false);
      return;
    }

    const agentSocketUrl = getAgentSocketUrl(previewUrl);
    const socket = io(agentSocketUrl, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      onAppendOutput('\r\n*** Terminal connected successfully ***\r\n');
      if (terminalFocusRef.current) {
        terminalFocusRef.current.focus();
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      onAppendOutput('\r\n*** Terminal disconnected ***\r\n');
    });

    socket.on('terminal-output', (data) => {
      onAppendOutput(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [previewUrl, onAppendOutput]);

  // Keep terminal scrolled to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

  // Focus terminal when clicking the terminal container
  const handleContainerClick = () => {
    if (terminalFocusRef.current) {
      terminalFocusRef.current.focus();
    }
  };

  // Capture keystrokes and map to standard terminal characters
  const handleKeyDown = (e) => {
    const socket = socketRef.current;
    if (!socket || !isConnected) return;

    if (e.key === 'Enter') {
      socket.emit('terminal-input', '\r');
      e.preventDefault();
    } else if (e.key === 'Backspace') {
      socket.emit('terminal-input', '\x7f');
      e.preventDefault();
    } else if (e.key === 'Tab') {
      socket.emit('terminal-input', '\t');
      e.preventDefault();
    } else if (e.key === 'c' && e.ctrlKey) {
      socket.emit('terminal-input', '\x03');
      e.preventDefault();
    } else if (e.key === 'd' && e.ctrlKey) {
      socket.emit('terminal-input', '\x04');
      e.preventDefault();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      socket.emit('terminal-input', e.key);
      e.preventDefault();
    }
  };

  const formatLogs = (logs) => {
    if (!logs) return '';
    return logs
      .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
      .split('\n')
      .map((line, i) => {
        const cleanLine = line.endsWith('\r') ? line.slice(0, -1) : line;
        return <div key={i} className="min-h-[1.2rem] leading-relaxed">{cleanLine}</div>;
      });
  };

  return (
    <div className="h-full flex flex-col bg-[#1A1A1A]">
      <div className="px-4 py-2 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="font-label-xs text-label-xs text-on-surface uppercase tracking-wider">Terminal</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-primary animate-pulse' : 'bg-on-surface-variant/40'}`} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClearTerminal}
            title="Clear Console"
            className="text-on-surface-variant hover:text-primary cursor-pointer flex items-center justify-center p-0.5 rounded hover:bg-white/5"
          >
            <span className="material-symbols-outlined text-[14px]">delete</span>
          </button>
        </div>
      </div>

      <div
        onClick={handleContainerClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        ref={terminalFocusRef}
        className="flex-1 p-3 overflow-y-auto font-mono font-code-md text-code-md text-on-surface-variant cursor-text select-text outline-none focus:ring-1 focus:ring-primary/40"
      >
        {!previewUrl ? (
          <div className="text-on-surface-variant/50 text-center py-6">
            Start sandbox to open terminal session.
          </div>
        ) : (
          <>
            {formatLogs(terminalLogs)}
            {isConnected && (
              <div className="flex items-center mt-1">
                <span className="text-primary mr-1">{'>'}</span>
                <span className="animate-pulse w-2 h-4 bg-primary inline-block align-middle" />
              </div>
            )}
            <div ref={logEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
