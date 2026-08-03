import React, { useMemo } from 'react';

// Simple file icon helper for tabs
const FileTabIcon = ({ name }) => {
  const ext = name.split('.').pop().toLowerCase();
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
    return <span className="material-symbols-outlined text-[16px] text-[#61DAFB] shrink-0">javascript</span>;
  }
  if (['css', 'scss'].includes(ext)) {
    return <span className="material-symbols-outlined text-[16px] text-[#2965F1] shrink-0">css</span>;
  }
  return <span className="material-symbols-outlined text-[16px] text-on-surface-variant/70 shrink-0">description</span>;
};

export default function CodeEditor({
  openFiles,
  activeFile,
  fileContents,
  dirtyFiles,
  onSelectTab,
  onCloseTab,
  onEditContent,
  onSaveFile
}) {
  const content = activeFile ? fileContents[activeFile] || '' : '';
  const isDirty = activeFile ? !!dirtyFiles[activeFile] : false;

  // Generate line numbers based on content line count
  const lineNumbers = useMemo(() => {
    const lineCount = content.split('\n').length;
    return Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);
  }, [content]);

  // Handle text changes
  const handleChange = (e) => {
    if (activeFile) {
      onEditContent(activeFile, e.target.value);
    }
  };

  // Keyboard shortcut: Ctrl + S to save
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (isDirty) {
        onSaveFile();
      }
    }
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#1A1A1A] text-on-surface-variant p-8 text-center font-body-sm h-full">
        <span className="material-symbols-outlined text-[48px] text-primary/30 mb-4">code</span>
        <h3 className="text-lg font-bold text-on-surface mb-2">No File Open</h3>
        <p className="max-w-xs text-sm">Select a file from the explorer on the left or ask the AI agent to generate code.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#1A1A1A] h-full overflow-hidden select-text">
      {/* Editor Tabs */}
      <div className="flex items-center bg-surface-container-lowest border-b border-outline-variant/10 overflow-x-auto no-scrollbar shrink-0 select-none">
        {openFiles.map((file) => {
          const isActive = file === activeFile;
          const fileName = file.split('/').pop();
          const fileDirty = !!dirtyFiles[file];

          return (
            <div
              key={file}
              onClick={() => onSelectTab(file)}
              className={`flex items-center gap-2 px-4 py-2 border-r border-outline-variant/10 min-w-fit cursor-pointer transition-all ${
                isActive
                  ? 'bg-[#1A1A1A] border-t-2 border-primary text-primary font-medium'
                  : 'opacity-60 hover:opacity-100 text-on-surface bg-surface-container-lowest'
              }`}
            >
              <FileTabIcon name={fileName} />
              <span className={`font-code-md text-code-md ${isActive ? 'text-primary' : 'text-on-surface'}`}>
                {fileName}
                {fileDirty && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(file);
                }}
                className="ml-2 text-on-surface-variant/60 hover:text-on-surface rounded p-0.5 hover:bg-white/5 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Editor Toolbar */}
      <div className="px-4 py-2 flex justify-between items-center border-b border-outline-variant/10 bg-surface/50 backdrop-blur-sm shrink-0 select-none">
        <div className="flex items-center gap-4 text-label-xs font-label-xs text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">account_tree</span> main
          </span>
          <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
          <span className="truncate">{activeFile}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSaveFile}
            disabled={!isDirty}
            className={`px-3 py-1 text-label-xs font-label-xs border rounded transition-all flex items-center gap-1 ${
              isDirty
                ? 'border-primary bg-primary/10 text-primary hover:bg-primary hover:text-black cursor-pointer shadow-[0_0_8px_rgba(137,233,0,0.3)]'
                : 'border-outline-variant/30 text-on-surface-variant/50 cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">save</span> Save
          </button>
        </div>
      </div>

      {/* Code Editor Workspace */}
      <div className="flex-1 overflow-auto flex relative bg-[#1A1A1A]">
        {/* Line Numbers */}
        <div className="py-4 flex flex-col items-end pr-4 text-on-surface-variant/40 font-code-md text-code-md bg-surface-container-lowest border-r border-outline-variant/5 select-none shrink-0 min-h-full w-12 text-right">
          {lineNumbers.map((line) => (
            <div key={line} className="h-6 leading-6 select-none">{line}</div>
          ))}
        </div>

        {/* Text Area Code Editor */}
        <textarea
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck="false"
          className="flex-1 p-4 font-mono font-code-md text-code-md leading-6 text-on-surface bg-transparent border-none outline-none resize-none focus:ring-0 min-h-full whitespace-pre overflow-y-visible overflow-x-auto tab-size-4"
          style={{ tabSize: 4 }}
        />
      </div>
    </div>
  );
}
