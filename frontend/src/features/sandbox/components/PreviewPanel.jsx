import React, { useState } from 'react';

export default function PreviewPanel({ previewUrl }) {
  const [iframeKey, setIframeKey] = useState(0);

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-outline-variant/10 bg-surface-container flex justify-between items-center shrink-0 select-none">
        <span className="font-label-xs text-label-xs text-on-surface uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px]">visibility</span> Preview
        </span>
        {previewUrl && (
          <button
            onClick={handleRefresh}
            title="Reload Preview"
            className="text-on-surface-variant hover:text-primary cursor-pointer flex items-center justify-center p-0.5 rounded hover:bg-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
          </button>
        )}
      </div>

      {/* Preview Content */}
      <div className="flex-1 bg-white relative">
        {previewUrl ? (
          <iframe
            key={iframeKey}
            src={previewUrl}
            title="Sandbox Live Preview"
            className="w-full h-full border-none bg-white"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-on-surface-variant/50 bg-[#1e1e1e] font-sans">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20 mb-3">
              web_asset
            </span>
            <h4 className="text-sm font-bold text-on-surface-variant mb-1">Live Web Preview</h4>
            <p className="text-xs max-w-xs">
              Once you start the sandbox environment, your running web application will load here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
