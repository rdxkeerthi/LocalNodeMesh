import { useEffect, useState } from 'react';
import { db } from '../firebase-config';
import { ref, onValue } from 'firebase/database';

interface DeviceListProps {
    onSelectDevice: (device: any) => void;
    selectedId?: string;
}

export default function DeviceList({ onSelectDevice, selectedId }: DeviceListProps) {
    const [devices, setDevices] = useState<any[]>([]);

    useEffect(() => {
        const devicesRef = ref(db, 'devices');
        const unsubscribe = onValue(devicesRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const deviceList = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                deviceList.sort((a, b) => (b.last_seen || 0) - (a.last_seen || 0));
                setDevices(deviceList);
            } else {
                setDevices([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const timeAgo = (ts: number) => {
        if (!ts) return 'Offline';
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const getOsIcon = (os: string) => {
        if (!os) return 'linux';
        const lower = os.toLowerCase();
        if (lower.includes('win')) return 'windows';
        if (lower.includes('mac') || lower.includes('darwin')) return 'apple';
        return 'linux';
    };

    if (devices.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mb-4"></div>
                <p className="text-slate-500 text-sm">Scanning for signals...</p>
            </div>
        );
    }

    return (
        <div>
            {devices.map(device => {
                const isOnline = (Date.now() - (device.last_seen || 0)) < 60000;
                const isSelected = selectedId === device.id;

                return (
                    <div
                        key={device.id}
                        onClick={() => onSelectDevice(device)}
                        className={`px-4 py-3 border-b border-slate-800/50 cursor-pointer transition-all duration-200 group relative overflow-hidden
                            ${isSelected
                                ? 'bg-cyan-900/10'
                                : 'hover:bg-slate-800/40'
                            }
                        `}
                    >
                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>}

                        <div className="flex justify-between items-center mb-1">
                            <span className={`font-semibold tracking-tight text-sm truncate ${isSelected ? 'text-cyan-400' : 'text-slate-300 group-hover:text-white'}`}>
                                {device.hostname || 'Unknown'}
                            </span>
                            {isOnline ? (
                                <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                                </div>
                            ) : (
                                <span className="h-2 w-2 rounded-full bg-slate-700 border border-slate-600"></span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mb-1">
                            <i className={`fab fa-${getOsIcon(device.os)} w-4`}></i>
                            <span className="opacity-80">{device.private_ip}</span>
                        </div>

                        <div className="text-[10px] text-slate-600 flex justify-between items-center mt-1">
                            <span className="uppercase tracking-wider font-bold bg-slate-800/50 px-1.5 py-0.5 rounded text-[9px]">{device.os?.substring(0, 3) || '???'}</span>
                            <span>{timeAgo(device.last_seen)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
