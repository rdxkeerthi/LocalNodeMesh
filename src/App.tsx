import { useState, useEffect, type FormEvent } from 'react';
import { auth } from './firebase-config';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import DeviceList from './components/DeviceList';
import DeviceView from './components/DeviceView';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      alert('Login failed');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setSelectedDevice(null);
  };

  if (authLoading) return <div className="h-screen w-screen flex items-center justify-center bg-[#020617] text-cyan-500 animate-pulse">Initializing Command Uplink...</div>;

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#020617] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center]"></div>
        <div className="absolute h-64 w-64 bg-cyan-500/20 rounded-full blur-3xl -top-10 -left-10 animate-pulse-slow"></div>
        <div className="absolute h-64 w-64 bg-purple-500/20 rounded-full blur-3xl bottom-10 right-10 animate-pulse-slow"></div>

        <form onSubmit={handleLogin} className="glass-panel p-8 rounded-2xl shadow-2xl w-96 z-10 flex flex-col gap-4 relative">
          <div className="absolute inset-0 bg-slate-900/40 rounded-2xl -z-10"></div>
          <div className="text-center mb-4">
            <h1 className="text-3xl font-bold text-white tracking-tighter neon-text">OmniAdmin</h1>
            <p className="text-cyan-400/60 text-xs uppercase tracking-widest mt-1">Command & Control</p>
          </div>
          <input
            type="email"
            placeholder="Operator ID"
            className="bg-slate-950/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Access Key"
            className="bg-slate-950/50 border border-slate-700/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 focus:bg-slate-900 transition-all placeholder:text-slate-600"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-[1.02]">
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#020617] text-slate-200 flex overflow-hidden font-sans selection:bg-cyan-500/30">
      {/* Sidebar / Device List */}
      <div className="w-80 border-r border-slate-800 bg-slate-900/60 flex flex-col backdrop-blur-md relative z-20 shadow-xl">
        <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/80">
          <h1 className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
            <i className="fas fa-network-wired text-cyan-400"></i>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">OmniAdmin</span>
          </h1>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors bg-slate-800/50 p-2 rounded-lg hover:bg-slate-800">
            <i className="fas fa-power-off"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Active Targets</div>
          <DeviceList onSelectDevice={setSelectedDevice} selectedId={selectedDevice?.id} />
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-950/30 text-[10px] text-center text-slate-600 font-mono">
          <span className="text-emerald-500">●</span> System Operational • v1.0.2
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 flex flex-col relative z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.02] to-purple-500/[0.02] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

        {selectedDevice ? (
          <DeviceView device={selectedDevice} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="h-32 w-32 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 relative z-10">
                <i className="fas fa-satellite-dish text-5xl text-slate-700 group-hover:text-cyan-500 transition-colors duration-300"></i>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-medium text-slate-300 text-center">No Target Selected</h3>
              <p className="text-sm font-light text-slate-500 mt-2 text-center max-w-xs mx-auto">Select a device from the fleet list to establish a command uplink.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
