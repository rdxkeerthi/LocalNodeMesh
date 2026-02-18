import { useState, useEffect } from 'react';
import { db } from '../firebase-config';
import { ref, onValue, push, set } from 'firebase/database';

interface FileNode {
    path: string;
    name: string;
    size: number;
    is_dir: boolean;
    last_mod: number;
}

interface FileBrowserProps {
    deviceId: string;
}

export default function FileBrowser({ deviceId }: FileBrowserProps) {
    const [files, setFiles] = useState<FileNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);

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

            // Listen for response
            const respRef = ref(db, `responses/${deviceId}/${reqId}`);
            const unsubscribe = onValue(respRef, (snapshot) => {
                const data = snapshot.val();
                if (data && data.status === 'ready') {
                    // Determine download logic.
                    // Protocol: fetch chunks from file_stream/{file_id}
                    downloadChunks(data.file_id, data.total_chunks, data.filename);
                    unsubscribe();
                    setDownloading(null);
                }
            });

            // Timeout 30s
            setTimeout(() => {
                if (downloading === file.path) {
                    unsubscribe();
                    setDownloading(null);
                    alert('Download timed out');
                }
            }, 30000);

        } catch (e) {
            console.error(e);
            setDownloading(null);
            alert('Request failed');
        }
    };

    const downloadChunks = async (fileId: string, totalChunks: number, filename: string) => {
        // Fetch all chunks
        const chunks: Uint8Array[] = [];
        for (let i = 0; i < totalChunks; i++) {
            const chunkRef = ref(db, `file_stream/${fileId}/${i}`);
            // We need to fetch once.
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

    // Simple flat list for now, filtering by "current path" simulation if needed.
    // or just filter client side.
    // Since index is flat list of all files.

    // Let's implement robust search/filter
    const [searchTerm, setSearchTerm] = useState('');

    const filteredFiles = files.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.path.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Index...</div>;

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-800 flex gap-4">
                <input
                    type="text"
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white px-3 py-1 rounded w-full focus:outline-none focus:border-blue-500"
                />
            </div>
            <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left text-sm text-gray-400">
                    <thead className="bg-gray-800/50 text-gray-200 sticky top-0">
                        <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Size</th>
                            <th className="p-3">Path</th>
                            <th className="p-3">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFiles.slice(0, 500).map((file, i) => ( // Render limit
                            <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/30">
                                <td className="p-3 font-mono text-white">
                                    <i className={`fas ${file.is_dir ? 'fa-folder text-yellow-500' : 'fa-file text-blue-400'} mr-2`}></i>
                                    {file.name}
                                </td>
                                <td className="p-3">{(file.size / 1024).toFixed(1)} KB</td>
                                <td className="p-3 truncate max-w-xs" title={file.path}>{file.path}</td>
                                <td className="p-3">
                                    <button
                                        disabled={!!downloading}
                                        onClick={() => handleDownload(file)}
                                        className="bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 p-1 rounded transition-colors disabled:opacity-50"
                                    >
                                        {downloading === file.path ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-download"></i>}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-2 text-xs text-center text-gray-600">Showing top 500 matches</div>
            </div>
        </div>
    );
}
