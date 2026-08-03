import React, { useState, useMemo } from 'react';

// Icon selector helper based on file extension
const FileIcon = ({ name }) => {
  const ext = name.split('.').pop().toLowerCase();
  
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
    return <span className="material-symbols-outlined text-[18px] text-[#61DAFB] shrink-0">javascript</span>;
  }
  if (['css', 'scss', 'sass'].includes(ext)) {
    return <span className="material-symbols-outlined text-[18px] text-[#2965F1] shrink-0">css</span>;
  }
  if (['html', 'htm'].includes(ext)) {
    return <span className="material-symbols-outlined text-[18px] text-[#E34F26] shrink-0">html</span>;
  }
  if (['json', 'yml', 'yaml', 'toml', 'config'].includes(ext) || name.startsWith('.')) {
    return <span className="material-symbols-outlined text-[18px] text-[#F1E05A] shrink-0">description</span>;
  }
  return <span className="material-symbols-outlined text-[18px] text-on-surface-variant/70 shrink-0">description</span>;
};

const TreeNode = ({ node, activeFile, onOpenFile, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleOpen = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const isDirectory = node.type === 'directory';
  const isActive = activeFile === node.path;

  // Sorting: Directories first, then files alphabetically
  const sortedChildren = useMemo(() => {
    if (!node.children) return [];
    return Object.values(node.children).sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [node.children]);

  if (isDirectory) {
    return (
      <div className="w-full select-none">
        <div
          onClick={toggleOpen}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
          className="flex items-center gap-2 py-1.5 hover:bg-white/5 cursor-pointer text-code-md font-code-md text-on-surface transition-colors"
        >
          <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
            keyboard_arrow_down
          </span>
          <span className="material-symbols-outlined text-[18px] text-primary/80 shrink-0">
            {isOpen ? 'folder_open' : 'folder'}
          </span>
          <span className="truncate text-on-surface-variant hover:text-on-surface">{node.name}</span>
        </div>
        {isOpen && (
          <div className="w-full">
            {sortedChildren.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                activeFile={activeFile}
                onOpenFile={onOpenFile}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => onOpenFile(node.path)}
      style={{ paddingLeft: `${depth * 12 + 28}px` }}
      className={`flex items-center gap-2 py-1.5 cursor-pointer text-code-md font-code-md transition-all ${
        isActive
          ? 'bg-primary/10 border-l-2 border-primary text-primary font-semibold'
          : 'hover:bg-white/5 text-on-surface-variant hover:text-on-surface border-l-2 border-transparent'
      }`}
    >
      <FileIcon name={node.name} />
      <span className="truncate">{node.name}</span>
    </div>
  );
};

export default function FileTree({ fileList, activeFile, onOpenFile }) {
  const treeRoot = useMemo(() => {
    const root = { name: 'root', type: 'directory', children: {} };

    fileList.forEach((filePath) => {
      const parts = filePath.split('/');
      let current = root;

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            type: isLast ? 'file' : 'directory',
            children: isLast ? null : {},
          };
        }
        current = current.children[part];
      });
    });

    return root;
  }, [fileList]);

  const rootChildren = useMemo(() => {
    return Object.values(treeRoot.children).sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [treeRoot]);

  if (fileList.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-on-surface-variant font-code-md text-code-md">
        No files in workspace
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto py-2">
      {rootChildren.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          activeFile={activeFile}
          onOpenFile={onOpenFile}
        />
      ))}
    </div>
  );
}
