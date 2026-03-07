
import React, { useState } from 'react';

interface HomeProps {
  onEnter: () => void;
}

type AuthMode = 'signIn' | 'signUp';

const Home: React.FC<HomeProps> = ({ onEnter }) => {
  const [activeFeature, setActiveFeature] = useState<number | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('signIn');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSuccess(true);
    setTimeout(() => {
      setIsAuthOpen(false);
      setIsSuccess(false);
    }, 1800);
  };

  const toggleMode = () => {
    setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn');
  };

  const features = [
    {
      title: 'Virtual Wardrobe',
      desc: 'Secured NFT Asset Management',
      icon: 'grid_view',
      stats: '42+ ASSETS'
    },
    {
      title: 'AI Scanned Try-On',
      desc: '98.5% Fit Precision Protocol',
      icon: 'view_in_ar',
      stats: 'LIVE SYNC'
    },
    {
      title: 'Genesis Creator',
      desc: 'V.2 Biometric Identity Node',
      icon: 'biotech',
      stats: 'ACTIVE'
    }
  ];

  return (
    <div className="relative min-h-screen bg-background-dark text-white overflow-x-hidden flex flex-col font-future">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[50%] bg-primary/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[40%] bg-accent/5 blur-[100px] rounded-full"></div>
        <div className="absolute inset-0 grid-bg opacity-10"></div>
      </div>

      {/* Redesigned Header: Unified size and position */}
      <header className="relative z-50 px-8 pt-12 flex justify-between items-center">
        <div className="flex flex-col items-start">
          <div className="mb-3 px-3 py-1 border border-primary/30 rounded-full text-[7px] font-black uppercase tracking-[0.4em] bg-primary/10 text-primary shadow-[0_0_15px_rgba(212,255,0,0.2)] animate-pulse">
            System Online
          </div>
          <div className="text-[72px] font-black tracking-[-0.3em] leading-[0.55] flex items-end">
            <span className="inline-block transform -skew-x-[20deg] origin-bottom">A</span>
            <span className="inline-block transform skew-x-[20deg] origin-bottom -ml-5">X</span>
          </div>
        </div>

        <div className="flex items-center">
          <button 
            onClick={() => {
              setAuthMode('signIn');
              setIsAuthOpen(true);
            }}
            className="glass p-1 rounded-full border border-white/10 shadow-2xl hover:border-primary/50 transition-all active:scale-90"
          >
            <img src="/images/avatar-axon.jpg" alt="User" className="w-14 h-14 rounded-full object-cover" />
          </button>
        </div>
      </header>

      {/* Hero Visual Section */}
      <main className="relative z-10 flex flex-col px-8 mt-10">
        <div className="relative w-full aspect-[4/5] mb-12">
          {/* Main Character with Dynamic Frame */}
          <div className="absolute top-[10%] right-0 left-[20%] bottom-0 bg-white/5 backdrop-blur-3xl rounded-l-[5rem] border-l border-white/10 overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.6)]">
             <div className="absolute inset-0 opacity-[0.03] select-none flex items-center justify-center">
                <h1 className="text-[200px] font-black leading-none text-center">20<br/>99</h1>
             </div>
             
             {/* Tech Overlay Elements */}
             <div className="absolute top-12 right-12 flex flex-col items-end gap-4">
                <div className="flex gap-2">
                   <div className="w-8 h-1.5 bg-primary/60 rounded-full shadow-[0_0_10px_#D4FF00]"></div>
                   <div className="w-1.5 h-1.5 bg-white/10 rounded-full"></div>
                </div>
                <span className="text-2xl font-black text-white/80 tracking-tighter uppercase">S-384x_PRIME</span>
             </div>

             <div className="absolute bottom-16 right-10 flex flex-col items-end gap-2">
                <span className="text-[8px] font-bold text-primary uppercase tracking-[0.5em]">Global Market</span>
                <span className="text-4xl font-display font-black text-white">$14.2K</span>
             </div>
          </div>

          {/* Character Image */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center translate-y-6">
            <img 
              src="/images/hero-model.jpg" 
              alt="Fashion Model"
              className="h-full object-contain scale-[1.2] drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
            />
          </div>

          {/* Floating Identity Pin */}
          <div className="absolute left-0 top-[15%]">
            <div className="w-24 h-24 glass rounded-full flex flex-col items-center justify-center border-2 border-primary/20 shadow-[0_0_30px_rgba(212,255,0,0.1)]">
              <span className="material-icons-round text-primary/60 text-xl">biotech</span>
              <span className="text-[32px] font-black tracking-tighter leading-none mt-1">158</span>
              <span className="text-[6px] font-bold opacity-40 uppercase tracking-widest -mt-1">Biometric</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-center mb-16">
          <button 
            onClick={onEnter}
            className="group relative bg-white text-black px-12 py-5 rounded-full flex items-center gap-16 overflow-hidden shadow-[0_30px_60px_rgba(212,255,0,0.1)] active:scale-95 transition-all"
          >
            <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            <span className="relative z-10 font-black uppercase tracking-[0.3em] text-[12px]">Enter The Vault</span>
            <div className="relative z-10 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center group-hover:bg-black transition-colors">
              <span className="material-icons-round text-lg group-hover:translate-x-1 transition-transform">east</span>
            </div>
          </button>
        </div>

        {/* Feature Showcase Grid (Bento Style) */}
        <div className="flex flex-col gap-6 mb-32">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">CORE FUNCTIONS</h3>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Neural Network Subsystems</p>
            </div>
            <div className="w-12 h-[2px] bg-primary/30"></div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {features.map((f, i) => (
              <div 
                key={i}
                onMouseEnter={() => setActiveFeature(i)}
                onMouseLeave={() => setActiveFeature(null)}
                className={`group relative p-8 rounded-[2.5rem] border transition-all duration-500 overflow-hidden ${activeFeature === i ? 'bg-primary border-primary' : 'bg-white/5 border-white/10'}`}
              >
                <div className="relative z-10 flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${activeFeature === i ? 'bg-black text-primary' : 'bg-white/10 text-white'}`}>
                      <span className="material-icons-round text-2xl">{f.icon}</span>
                    </div>
                    <div>
                      <h4 className={`text-lg font-black uppercase tracking-tighter transition-colors ${activeFeature === i ? 'text-black' : 'text-white'}`}>{f.title}</h4>
                      <p className={`text-[10px] font-bold uppercase transition-colors ${activeFeature === i ? 'text-black/60' : 'text-white/40'}`}>{f.desc}</p>
                    </div>
                  </div>
                  <div className={`text-right transition-colors ${activeFeature === i ? 'text-black' : 'text-primary'}`}>
                    <span className="text-[10px] font-black tracking-widest uppercase">{f.stats}</span>
                  </div>
                </div>
                
                {/* Background Decor */}
                <div className={`absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-all ${activeFeature === i ? 'text-black' : 'text-white'}`}>
                   <span className="material-icons-round text-[120px]">{f.icon}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer Vertical Mark */}
      <footer className="relative z-10 px-8 pb-40">
        <div className="font-black text-[56px] leading-[0.85] tracking-tighter opacity-10 select-none">
          FUT<br/>URE
        </div>
        <div className="mt-8 flex justify-between items-center border-t border-white/5 pt-8">
           <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.5em]">Protocol V.2.1-AXON</span>
           <div className="flex gap-4">
              <span className="w-2 h-2 rounded-full bg-primary/20"></span>
              <span className="w-2 h-2 rounded-full bg-primary/20"></span>
              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_#D4FF00]"></span>
           </div>
        </div>
      </footer>

      {/* Authentication Protocol Modal */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/70 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="w-full max-w-[390px] bg-card-dark border border-white/10 rounded-[4.5rem] p-12 shadow-2xl relative overflow-hidden">
            <button 
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-10 right-10 w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/30 hover:text-white z-20 transition-all hover:rotate-90"
            >
              <span className="material-icons-round">close</span>
            </button>

            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-28 h-28 bg-primary rounded-full flex items-center justify-center text-black mb-10 animate-pulse shadow-[0_0_60px_rgba(212,255,0,0.5)]">
                  <span className="material-icons-round text-6xl">sync</span>
                </div>
                <h3 className="text-3xl font-black mb-2 uppercase text-white tracking-tighter leading-none">Protocol<br/>Synced</h3>
                <p className="text-white/30 text-[11px] uppercase tracking-[0.4em] font-bold mt-2">Neural Node Online</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="mb-14">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-[0.5em] mb-4 block underline underline-offset-8">Auth V.2.1</span>
                  <h3 className="text-4xl font-black leading-[0.9] uppercase tracking-tighter text-white">
                    {authMode === 'signIn' ? <>Establish<br/>Link</> : <>Avatar<br/>Genesis</>}
                  </h3>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/20 ml-6 tracking-[0.3em]">Address</label>
                    <input 
                      required
                      type="email" 
                      placeholder="USER_CORE@AXON.SYS"
                      className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-10 py-6 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10 font-space"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/20 ml-6 tracking-[0.3em]">Key</label>
                    <input 
                      required
                      type="password" 
                      placeholder="••••••••••••"
                      className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] px-10 py-6 text-sm text-white focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-white text-black py-7 rounded-[3rem] flex items-center justify-between px-12 font-black uppercase tracking-[0.2em] text-[12px] mt-10 shadow-2xl active:scale-95 transition-all group"
                  >
                    <span>{authMode === 'signIn' ? 'Initiate' : 'Establish'}</span>
                    <div className="bg-primary p-3 rounded-2xl text-black group-hover:scale-110 transition-transform">
                      <span className="material-icons-round text-lg">{authMode === 'signIn' ? 'vpn_key' : 'fingerprint'}</span>
                    </div>
                  </button>
                </form>

                <button 
                  onClick={toggleMode} 
                  className="mt-12 text-[10px] text-white/30 uppercase tracking-[0.4em] hover:text-primary transition-colors text-center w-full font-bold"
                >
                  {authMode === 'signIn' ? "Request Protocol access" : "Node already active?"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
