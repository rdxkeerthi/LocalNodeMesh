import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase-config';
import { ref, onValue, push, set } from 'firebase/database';

interface FileNode {
    path: string;
    name: string;
    size: number;
    is_dir: boolean;
    last_mod: number;
}

interface TreeNode {
    name: string;
    fullPath: string;
    children: Map<string, TreeNode>;
    files: FileNode[];
    fileCount: number;
}

interface FileBrowserProps {
    deviceId: string;
}

// ——— File type icons (SVG inline for zero dependencies) ———
const FolderIcon = ({ open }: { open?: boolean }) => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        {open ? (
            <path d="M1 3.5A1.5 1.5 0 012.5 2h3.879a1.5 1.5 0 011.06.44l.622.62A1.5 1.5 0 009.12 3.5H13.5A1.5 1.5 0 0115 5v7.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z" fill="#FCD34D" />
        ) : (
            <path d="M1 3.5A1.5 1.5 0 012.5 2h3.879a1.5 1.5 0 011.06.44l.622.62A1.5 1.5 0 009.12 3.5H13.5A1.5 1.5 0 0115 5v7.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z" fill="#F59E0B" />
        )}
    </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
        style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease', flexShrink: 0 }}>
        <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
);

const FileTypeIcon = ({ name }: { name: string }) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    let color = '#94A3B8'; // default gray
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(ext)) color = '#A78BFA'; // purple - images
    else if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(ext)) color = '#F472B6'; // pink - video
    else if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext)) color = '#34D399'; // green - audio
    else if (['doc', 'docx', 'pdf', 'txt', 'rtf', 'odt'].includes(ext)) color = '#60A5FA'; // blue - docs
    else if (['xls', 'xlsx', 'csv'].includes(ext)) color = '#4ADE80'; // green - spreadsheets
    else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) color = '#FB923C'; // orange - archives
    else if (['exe', 'msi', 'bat', 'cmd', 'ps1'].includes(ext)) color = '#F87171'; // red - executables
    else if (['js', 'ts', 'py', 'cs', 'java', 'cpp', 'c', 'h', 'tsx', 'jsx', 'html', 'css', 'json', 'xml', 'yaml', 'yml'].includes(ext)) color = '#38BDF8'; // cyan - code
    else if (['dll', 'sys', 'ini', 'cfg', 'conf'].includes(ext)) color = '#A1A1AA'; // gray - system

    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M3 1.5A1.5 1.5 0 014.5 0h4.879a1.5 1.5 0 011.06.44l2.122 2.12A1.5 1.5 0 0113 3.62V14.5a1.5 1.5 0 01-1.5 1.5h-7A1.5 1.5 0 013 14.5v-13z" fill={color} opacity="0.2" stroke={color} strokeWidth="0.5" />
            <path d="M9.5 0v2.5A1.5 1.5 0 0011 4h2" stroke={color} strokeWidth="0.5" />
        </svg>
    );
};

// ——— Build folder tree from flat file list ———
function buildTree(files: FileNode[]): TreeNode {
    const root: TreeNode = { name: 'Root', fullPath: '', children: new Map(), files: [], fileCount: 0 };

    for (const file of files) {
        // Normalize path separators
        const normalizedPath = file.path.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');
        parts.pop(); // Remove filename, keep only directory parts

        let current = root;
        let pathSoFar = '';

        for (const part of parts) {
            if (!part) continue;
            pathSoFar += (pathSoFar ? '/' : '') + part;
            if (!current.children.has(part)) {
                current.children.set(part, {
                    name: part,
                    fullPath: pathSoFar,
                    children: new Map(),
                    files: [],
                    fileCount: 0,
                });
            }
            current = current.children.get(part)!;
        }
        current.files.push(file);
    }

    // Count files recursively
    function countFiles(node: TreeNode): number {
        let count = node.files.length;
        for (const child of node.children.values()) {
            count += countFiles(child);
        }
        node.fileCount = count;
        return count;
    }
    countFiles(root);

    return root;
}

// Get the first meaningful folder (skip single-child chains like C:/Users/admin)
function getDefaultPath(root: TreeNode): string {
    let node = root;
    while (node.children.size === 1 && node.files.length === 0) {
        node = node.children.values().next().value!;
    }
    return node.fullPath;
}

// ——— Folder Tree Item (Recursive) ———
function FolderTreeItem({
    node,
    depth,
    selectedPath,
    onSelect,
    expandedPaths,
    onToggle,
}: {
    node: TreeNode;
    depth: number;
    selectedPath: string;
    onSelect: (path: string) => void;
    expandedPaths: Set<string>;
    onToggle: (path: string) => void;
}) {
    const isExpanded = expandedPaths.has(node.fullPath);
    const isSelected = selectedPath === node.fullPath;
    const hasChildren = node.children.size > 0;
    const sortedChildren = Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div>
            <div
                className={`tree-item flex items-center gap-1 cursor-pointer select-none py-[3px] pr-2 rounded-md transition-all duration-100 ${isSelected
                    ? 'bg-cyan-500/15 text-cyan-300'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                style={{ paddingLeft: `${depth * 16 + 4}px` }}
                onClick={() => {
                    onSelect(node.fullPath);
                    if (hasChildren) onToggle(node.fullPath);
                }}
            >
                <span className="w-3 flex items-center justify-center text-slate-600">
                    {hasChildren && <ChevronIcon expanded={isExpanded} />}
                </span>
                <FolderIcon open={isExpanded} />
                <span className="truncate text-[13px] font-medium flex-1">{node.name}</span>
                <span className="text-[10px] text-slate-600 tabular-nums">{node.fileCount}</span>
            </div>
            {isExpanded && hasChildren && (
                <div>
                    {sortedChildren.map(child => (
                        <FolderTreeItem
                            key={child.fullPath}
                            node={child}
                            depth={depth + 1}
                            selectedPath={selectedPath}
                            onSelect={onSelect}
                            expandedPaths={expandedPaths}
                            onToggle={onToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ——— Format helpers ———
function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(timestamp: number): string {
    if (!timestamp) return '—';
    const d = new Date(timestamp);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
        ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ——— Find node by path ———
function findNode(root: TreeNode, path: string): TreeNode | null {
    if (root.fullPath === path) return root;
    for (const child of root.children.values()) {
        const found = findNode(child, path);
        if (found) return found;
    }
    return null;
}

// ——— Main Component ———
export default function FileBrowser({ deviceId }: FileBrowserProps) {
    const [files, setFiles] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);
    const [selectedPath, setSelectedPath] = useState('');
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
    const [sortAsc, setSortAsc] = useState(true);

    useEffect(() => {
        const filesRef = ref(db, `files/${deviceId}`);
        const unsubscribe = onValue(filesRef, (snapshot) => {
            const data = snapshot.val();
            if (data && Array.isArray(data)) {
                setFiles(data);
            } else {
                setFiles([]);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [deviceId]);

    // Build tree from flat file list
    const tree = useMemo(() => buildTree(files), [files]);

    // Auto-expand to default path on first load
    useEffect(() => {
        if (files.length > 0 && selectedPath === '') {
            const defaultPath = getDefaultPath(tree);
            setSelectedPath(defaultPath);

            // Auto-expand path to default
            const pathsToExpand = new Set<string>();
            const parts = defaultPath.split('/');
            let p = '';
            for (const part of parts) {
                if (!part) continue;
                p += (p ? '/' : '') + part;
                pathsToExpand.add(p);
            }
            pathsToExpand.add(''); // root
            setExpandedPaths(pathsToExpand);
        }
    }, [files, tree, selectedPath]);

    const toggleExpand = (path: string) => {
        setExpandedPaths(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    // Get files + subfolders for the selected path
    const currentNode = useMemo(() => findNode(tree, selectedPath), [tree, selectedPath]);

    const currentItems = useMemo(() => {
        if (!currentNode) return { folders: [] as TreeNode[], files: [] as FileNode[] };

        let displayFiles = currentNode.files;
        if (searchTerm) {
            displayFiles = displayFiles.filter(f =>
                f.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Sort files
        displayFiles = [...displayFiles].sort((a, b) => {
            let cmp = 0;
            if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
            else if (sortBy === 'size') cmp = a.size - b.size;
            else if (sortBy === 'date') cmp = a.last_mod - b.last_mod;
            return sortAsc ? cmp : -cmp;
        });

        const folders = Array.from(currentNode.children.values())
            .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));

        return { folders, files: displayFiles };
    }, [currentNode, searchTerm, sortBy, sortAsc]);

    // Breadcrumb
    const breadcrumbs = useMemo(() => {
        if (!selectedPath) return [{ name: 'Root', path: '' }];
        const parts = selectedPath.split('/');
        const crumbs = [{ name: 'Root', path: '' }];
        let p = '';
        for (const part of parts) {
            if (!part) continue;
            p += (p ? '/' : '') + part;
            crumbs.push({ name: part, path: p });
        }
        return crumbs;
    }, [selectedPath]);

    const handleDownload = async (file: FileNode) => {
        setDownloading(file.path);
        try {
            const reqRef = push(ref(db, `requests/${deviceId}`));
            const reqId = reqRef.key;
            await set(reqRef, {
                type: 'download',
                path: file.path,
                timestamp: Date.now()
            });

            const respRef = ref(db, `responses/${deviceId}/${reqId}`);
            const unsubscribe = onValue(respRef, (snapshot) => {
                const data = snapshot.val();
                if (data && data.status === 'ready') {
                    downloadChunks(data.file_id, data.total_chunks, data.filename);
                    unsubscribe();
                    setDownloading(null);
                }
            });

            setTimeout(() => {
                unsubscribe();
                setDownloading(null);
            }, 30000);
        } catch (e) {
            console.error(e);
            setDownloading(null);
        }
    };

    const downloadChunks = async (fileId: string, totalChunks: number, filename: string) => {
        const chunks: Uint8Array[] = [];
        for (let i = 0; i < totalChunks; i++) {
            const chunkRef = ref(db, `file_stream/${fileId}/${i}`);
            await new Promise<void>((resolve) => {
                onValue(chunkRef, (snap) => {
                    const b64 = snap.val();
                    if (b64) {
                        const binaryString = window.atob(b64);
                        const len = binaryString.length;
                        const bytes = new Uint8Array(len);
                        for (let j = 0; j < len; j++) {
                            bytes[j] = binaryString.charCodeAt(j);
                        }
                        chunks.push(bytes);
                    }
                    resolve();
                }, { onlyOnce: true });
            });
        }
        const blob = new Blob(chunks as BlobPart[], { type: 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleSort = (col: 'name' | 'size' | 'date') => {
        if (sortBy === col) setSortAsc(!sortAsc);
        else { setSortBy(col); setSortAsc(true); }
    };

    if (loading) return (
        <div className="h-full flex items-center justify-center text-slate-500">
            <div className="flex flex-col items-center gap-3">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full" />
                <span className="text-sm">Indexing files...</span>
            </div>
        </div>
    );

    if (files.length === 0) return (
        <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
                <svg width="48" height="48" viewBox="0 0 16 16" fill="none" className="mx-auto mb-3 opacity-40">
                    <path d="M1 3.5A1.5 1.5 0 012.5 2h3.879a1.5 1.5 0 011.06.44l.622.62A1.5 1.5 0 009.12 3.5H13.5A1.5 1.5 0 0115 5v7.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z" fill="#334155" />
                </svg>
                <p className="text-sm">No files indexed yet</p>
                <p className="text-xs text-slate-600 mt-1">Agent will upload file index shortly</p>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/50">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 flex-1 overflow-x-auto text-[13px] min-w-0">
                    {breadcrumbs.map((crumb, i) => (
                        <span key={crumb.path} className="flex items-center gap-1 shrink-0">
                            {i > 0 && <span className="text-slate-700">›</span>}
                            <button
                                onClick={() => {
                                    setSelectedPath(crumb.path);
                                    setExpandedPaths(prev => {
                                        const next = new Set(prev);
                                        next.add(crumb.path);
                                        return next;
                                    });
                                }}
                                className={`px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors truncate max-w-[120px] ${i === breadcrumbs.length - 1 ? 'text-cyan-400 font-medium' : 'text-slate-400'
                                    }`}
                            >
                                {crumb.name}
                            </button>
                        </span>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-56 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.442.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search this folder..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800/60 border border-slate-700/50 text-white text-[12px] pl-8 pr-3 py-1.5 rounded-md focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600"
                    />
                </div>

                {/* File count */}
                <span className="text-[11px] text-slate-600 tabular-nums shrink-0">
                    {currentItems.folders.length + currentItems.files.length} items
                </span>
            </div>

            {/* Main Content: Tree + Files */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: Folder Tree */}
                <div className="w-60 border-r border-slate-800 overflow-y-auto bg-slate-950/30 py-1 custom-scrollbar shrink-0"
                    style={{ minWidth: '200px', maxWidth: '300px', resize: 'horizontal', overflow: 'auto' }}>
                    {Array.from(tree.children.values()).sort((a, b) => a.name.localeCompare(b.name)).map(node => (
                        <FolderTreeItem
                            key={node.fullPath}
                            node={node}
                            depth={0}
                            selectedPath={selectedPath}
                            onSelect={setSelectedPath}
                            expandedPaths={expandedPaths}
                            onToggle={toggleExpand}
                        />
                    ))}
                </div>

                {/* Right: File List */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Column Headers */}
                    <div className="flex items-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-800 bg-slate-900/30 select-none shrink-0">
                        <button onClick={() => handleSort('name')} className="flex-1 px-3 py-2 text-left hover:text-slate-300 transition-colors flex items-center gap-1">
                            Name {sortBy === 'name' && <span className="text-cyan-400">{sortAsc ? '↑' : '↓'}</span>}
                        </button>
                        <button onClick={() => handleSort('date')} className="w-44 px-3 py-2 text-left hover:text-slate-300 transition-colors flex items-center gap-1">
                            Date Modified {sortBy === 'date' && <span className="text-cyan-400">{sortAsc ? '↑' : '↓'}</span>}
                        </button>
                        <button onClick={() => handleSort('size')} className="w-24 px-3 py-2 text-right hover:text-slate-300 transition-colors flex items-center gap-1 justify-end">
                            Size {sortBy === 'size' && <span className="text-cyan-400">{sortAsc ? '↑' : '↓'}</span>}
                        </button>
                        <div className="w-16 px-3 py-2 text-center">⬇</div>
                    </div>

                    {/* File Rows */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* Subfolders first */}
                        {currentItems.folders.map(folder => (
                            <div
                                key={folder.fullPath}
                                className="flex items-center hover:bg-slate-800/40 cursor-pointer transition-colors group border-b border-slate-800/30"
                                onDoubleClick={() => {
                                    setSelectedPath(folder.fullPath);
                                    setExpandedPaths(prev => {
                                        const next = new Set(prev);
                                        next.add(folder.fullPath);
                                        return next;
                                    });
                                }}
                            >
                                <div className="flex-1 px-3 py-1.5 flex items-center gap-2.5 min-w-0">
                                    <FolderIcon />
                                    <span className="text-[13px] text-yellow-200/90 truncate group-hover:text-yellow-100">{folder.name}</span>
                                </div>
                                <div className="w-44 px-3 py-1.5 text-[12px] text-slate-600">—</div>
                                <div className="w-24 px-3 py-1.5 text-[12px] text-slate-600 text-right">
                                    {folder.fileCount} items
                                </div>
                                <div className="w-16 px-3 py-1.5"></div>
                            </div>
                        ))}

                        {/* Files */}
                        {currentItems.files.map((file, i) => (
                            <div
                                key={file.path + i}
                                className="flex items-center hover:bg-slate-800/40 transition-colors group border-b border-slate-800/30"
                            >
                                <div className="flex-1 px-3 py-1.5 flex items-center gap-2.5 min-w-0">
                                    <FileTypeIcon name={file.name} />
                                    <span className="text-[13px] text-slate-300 truncate group-hover:text-white">{file.name}</span>
                                </div>
                                <div className="w-44 px-3 py-1.5 text-[12px] text-slate-500 tabular-nums">
                                    {formatDate(file.last_mod)}
                                </div>
                                <div className="w-24 px-3 py-1.5 text-[12px] text-slate-500 text-right tabular-nums">
                                    {formatSize(file.size)}
                                </div>
                                <div className="w-16 px-3 py-1.5 text-center">
                                    <button
                                        disabled={!!downloading}
                                        onClick={() => handleDownload(file)}
                                        className="opacity-0 group-hover:opacity-100 bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-400 p-1 rounded transition-all disabled:opacity-30"
                                        title="Download"
                                    >
                                        {downloading === file.path ? (
                                            <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M8 12l-4-4h2.5V2h3v6H12L8 12zM2 14h12v-1.5H2V14z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {currentItems.folders.length === 0 && currentItems.files.length === 0 && (
                            <div className="flex items-center justify-center h-full text-slate-600 text-sm py-16">
                                {searchTerm ? 'No matching files' : 'This folder is empty'}
                            </div>
                        )}
                    </div>

                    {/* Status Bar */}
                    <div className="flex items-center justify-between px-3 py-1 border-t border-slate-800 bg-slate-950/50 text-[11px] text-slate-600 shrink-0">
                        <span>{files.length.toLocaleString()} files indexed</span>
                        <span>{currentItems.files.length} files in current folder</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
