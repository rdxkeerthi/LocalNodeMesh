function updateSystemInfo(d) {
    // Update simple info cards that exist in HTML
    const hostname = document.getElementById('info-hostname');
    const os = document.getElementById('info-os');
    const ram = document.getElementById('info-ram');
    const activity = document.getElementById('info-activity');

    if (hostname) hostname.textContent = d.hostname || '-';
    if (os) os.textContent = d.os_name || '-';
    if (ram) ram.textContent = d.ram_usage || '-';
    if (activity) activity.textContent = d.active_window || 'Idle';
}
