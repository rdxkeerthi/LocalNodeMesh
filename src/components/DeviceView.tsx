import { useState } from 'react';
import FileBrowser from './FileBrowser';
import { db } from '../firebase-config';
import { ref, remove } from 'firebase/database';

interface DeviceViewProps {
    device: any;
}

export default function DeviceView({ device }: DeviceViewProps) {
    const [activeTab, setActiveTab] = useState('overview');

    const handleDeleteDevice = async () => {
        if (!confirm('Are you sure you want to delete this device and ALL its data? This cannot be undone.')) return;

        try {
            const updates = [
                remove(ref(db, `devices/${device.id}`)),
                remove(ref(db, `files/${device.id}`)),
                remove(ref(db, `requests/${device.id}`)),
                remove(ref(db, `responses/${device.id}`))
            ];
            await Promise.all(updates);
        } catch (error) {
            console.error("Error deleting device:", error);
            alert("Failed to delete device.");
        }
    };

    const getOsIcon = (os: string) => {
        if (!os) return 'linux';
        const lower = os.toLowerCase();
        if (lower.includes('win')) return 'windows';
        if (lower.includes('mac') || lower.includes('darwin')) return 'apple';
        return 'linux';
    };

    return (
        <div className="flex-1 bg-[#020617] text-slate-200 flex flex-col h-screen relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/[0.03] rounded-full blur-3xl pointer-events-none"></div>

            {/* Header */}
            <div className="h-20 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/60 backdrop-blur-md relative z-10">
                <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-700 shadow-lg">
                        <i className={`fab fa-${getOsIcon(device.os)} text-2xl text-slate-300`}></i>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-white">{device.hostname || 'Unknown Host'}</h2>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="font-mono text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-900/50">{device.private_ip}</span>
                            <span>•</span>
                            <span className="uppercase tracking-widest font-bold">{device.os}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleDeleteDevice}
                        className="group px-4 py-2 bg-red-500/5 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-500/10 transition-all border border-red-500/20 hover:border-red-500/40 flex items-center gap-2"
                    >
                        <i className="fas fa-trash-alt group-hover:scale-110 transition-transform"></i>
                        <span>PURGE DATA</span>
                    </button>
                    <button className="group px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-700 transition-all border border-slate-700 flex items-center gap-2">
                        <i className="fas fa-power-off group-hover:text-amber-400 transition-colors"></i>
                        <span>TERMINATE</span>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex px-6 border-b border-slate-800 bg-slate-900/20 backdrop-blur-sm z-10 pt-2">
                {['Overview', 'Files', 'Terminal', 'Downloads'].map((tab) => {
                    const id = tab.toLowerCase();
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 mb-[-1px] ${isActive
                                ? 'border-cyan-500 text-cyan-400 shadow-[0_10px_20px_-10px_rgba(6,182,212,0.15)] bg-slate-800/30 rounded-t-lg'
                                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/20 rounded-t-lg'
                                }`}
                        >
                            {tab}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative z-0">
                <div className="absolute inset-0 overflow-y-auto p-8 custom-scrollbar">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <InfoCard title="CPU Usage" value="0%" icon="fa-microchip" color="cyan" />
                            <InfoCard title="Memory" value={`${device.free_ram || 0} MB`} sub={`${device.total_ram || 0} MB Total`} icon="fa-memory" color="purple" />
                            <InfoCard title="Disk (C:)" value={`${device.free_disk_gb || 0} GB`} sub={`${device.total_disk_gb || 0} GB Total`} icon="fa-hdd" color="emerald" />
                            <InfoCard title="MAC Address" value={device.mac_address || '-'} icon="fa-fingerprint" color="blue" />
                            <InfoCard title="Uptime" value={device.uptime || '-'} icon="fa-clock" color="orange" />
                            <InfoCard title="User" value={device.user || '-'} icon="fa-user" color="purple" />
                        </div>
                    )}
                    {activeTab === 'files' && (
                        <div className="h-full bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden backdrop-blur-sm shadow-xl relative">
                            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50"></div>
                            <FileBrowser deviceId={device.id} />
                        </div>
                    )}
                    {activeTab === 'terminal' && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                            <div className="h-20 w-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 animate-pulse">
                                <i className="fas fa-terminal text-3xl opacity-50"></i>
                            </div>
                            <p className="font-mono text-sm tracking-widest uppercase">Uplink Pending...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoCard({ title, value, sub, icon, color = 'blue' }: any) {
    const colorClasses: any = {
        cyan: 'text-cyan-400 bg-cyan-950/20 border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]',
        purple: 'text-purple-400 bg-purple-950/20 border-purple-500/30 hover:border-purple-400/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]',
        emerald: 'text-emerald-400 bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]',
        orange: 'text-orange-400 bg-orange-950/20 border-orange-500/30 hover:border-orange-400/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.1)]',
        blue: 'text-blue-400 bg-blue-950/20 border-blue-500/30 hover:border-blue-400/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]',
    };

    return (
        <div className={`border rounded-xl p-6 transition-all duration-300 hover:-translate-y-1 ${colorClasses[color]}`}>
            <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{title}</span>
                <i className={`fas ${icon} opacity-60 text-lg`}></i>
            </div>
            <div className="text-3xl font-mono font-light text-white tracking-tight">{value}</div>
            {sub && <div className="text-xs text-slate-500 mt-2 font-mono flex items-center gap-1">
                <i className="fas fa-info-circle text-[10px]"></i> {sub}
            </div>}
        </div>
    );
}
