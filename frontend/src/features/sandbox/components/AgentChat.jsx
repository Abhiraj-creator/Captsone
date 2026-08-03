import React, { useState, useRef, useEffect } from 'react';

// Render text and format code blocks nested in messages
const renderMessageText = (text) => {
  if (!text) return null;
  
  // Split on triple backticks to identify code blocks
  const parts = text.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const lines = part.split('\n');
      const header = lines[0].slice(3).trim(); // Remove ``` and get language
      const codeContent = lines.slice(1, -1).join('\n');
      
      return (
        <div 
          key={index} 
          className="my-2 bg-[#1A1A1A] rounded p-2.5 border border-outline-variant/20 font-mono text-[12px] text-on-surface-variant overflow-x-auto select-text"
        >
          {header && (
            <div className="text-[10px] text-primary/80 font-bold uppercase tracking-wider mb-1 select-none">
              {header}
            </div>
          )}
          <pre className="leading-relaxed">{codeContent}</pre>
        </div>
      );
    }
    
    // Normal text lines
    return (
      <div key={index} className="whitespace-pre-line leading-relaxed">
        {part}
      </div>
    );
  });
};

export default function AgentChat({
  messages,
  status,
  previewUrl,
  onSendMessage
}) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);
  
  const isAgentWorking = messages.length > 0 && messages[messages.length - 1].status === 'streaming';

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isAgentWorking) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="h-full flex flex-col bg-surface-container-low overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-outline-variant/10 bg-surface-container flex justify-between items-center shrink-0 select-none">
        <span className="font-label-xs text-label-xs text-primary uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">smart_toy</span> AI Agent
        </span>
        {isAgentWorking && (
          <div className="flex gap-1 items-center">
            <span className="text-[10px] font-label-xs text-primary mr-1">Orchestrating...</span>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          </div>
        )}
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.map((msg) => {
          const isAgent = msg.sender === 'agent';
          const isStreaming = msg.status === 'streaming';
          
          if (!isAgent) {
            // User message bubble (Right side)
            return (
              <div key={msg.id} className="flex gap-3 justify-end items-start select-none">
                <div className="bg-surface-variant rounded-lg p-3 max-w-[85%] border border-outline-variant/20 select-text">
                  <p className="font-body-sm text-body-sm text-on-surface whitespace-pre-wrap">{msg.text}</p>
                </div>
                <img 
                  alt="User" 
                  className="w-6 h-6 rounded-full shrink-0 border border-outline-variant/20"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuG2GSlwOIdc9Gm3GsBduQ_Mhx8bi8Dab-QPTXhTxlrA5bc5EKyJv2DysD14IHNUBOQ2J-NwURIygKtK5hjOB2N_wkqBKYX8kgy-6ZOGfh7urUInLDhDB_GLvSG9Zmr3iJvMakbBuaI1dVeCRoKEZW80UeD5ShlVck-V3Cp9pUoQn791hsJ124_UXNZf5EPDpd7HnM0joRIFW1z1E1ibWrUq-UYDGuwitxk-eavUZJ2sKVnFSlo_NmLBHHFwHNz0vkfwT1gxmj7GCbNX"
                />
              </div>
            );
          }

          // Agent message bubble (Left side)
          return (
            <div key={msg.id} className="flex gap-3 items-start select-none">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-primary/20 text-primary shrink-0 border border-primary/30">
                <span className="material-symbols-outlined text-[14px]">smart_toy</span>
              </div>
              <div className="bg-surface-container-high rounded-lg p-3 max-w-[85%] border border-outline-variant/10 relative select-text min-w-[50px]">
                {/* Visual accent bar */}
                <div className="absolute -left-[1px] top-4 w-[2px] h-6 bg-primary rounded-r"></div>
                <div className="font-body-sm text-body-sm text-on-surface">
                  {msg.text ? renderMessageText(msg.text) : <span className="text-on-surface-variant/50 italic">Agent is thinking...</span>}
                </div>
                {isStreaming && (
                  <div className="mt-2 flex items-center gap-1.5 text-primary text-[10px] font-label-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                    <span>Streaming updates...</span>
                  </div>
                )}
                {msg.status === 'done' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-label-xs border border-primary/20 select-none">
                      Action Applied
                    </span>
                  </div>
                )}
                {msg.status === 'error' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-error/10 text-error-container text-[10px] font-label-xs border border-error/20 select-none">
                      Agent Error
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form 
        onSubmit={handleSubmit}
        className="p-4 border-t border-outline-variant/10 bg-surface select-none"
      >
        <div className="flex items-center bg-[#1A1A1A] border border-outline-variant/30 rounded-lg p-1 focus-within:border-primary focus-within:shadow-[0_0_8px_rgba(137,233,0,0.2)] transition-all">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!previewUrl || isAgentWorking}
            placeholder={!previewUrl ? "Start sandbox to enable AI Agent..." : "Instruct the AI agent..."}
            className="flex-1 bg-transparent border-none outline-none text-body-sm font-body-sm text-on-surface px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isAgentWorking || !previewUrl}
            className="w-8 h-8 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary hover:text-black transition-colors mr-1 disabled:opacity-30 disabled:hover:bg-primary/10 disabled:hover:text-primary disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
