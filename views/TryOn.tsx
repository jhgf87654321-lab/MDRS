import React, { useState, useRef, useEffect } from 'react';

const TryOn: React.FC = () => {
  const [cameraMode, setCameraMode] = useState<'front' | 'rear' | 'off'>('off');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [generatedNFT, setGeneratedNFT] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedNFT = localStorage.getItem('generatedNFT');
    if (storedNFT) {
      setGeneratedNFT(storedNFT);
    }
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (cameraMode !== 'off') {
      const facingMode = cameraMode === 'front' ? 'user' : 'environment';
      navigator.mediaDevices.getUserMedia({ video: { facingMode } })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Error accessing camera:", err));
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraMode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setCameraMode('off');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative h-full flex flex-col overflow-hidden">
      <header className="px-8 pt-12 flex justify-between items-start z-20">
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 bg-white flex items-center justify-center rounded-lg">
            <span className="material-icons-round text-black text-xl">blur_on</span>
          </div>
          <span className="text-2xl font-display font-black tracking-tighter">FUTR</span>
        </div>
        <div className="bg-primary text-black px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase animate-pulse-fast">
          AI Active
        </div>
      </header>

      {/* Portrait / Model Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden py-10">
        <div className="relative w-[85%] aspect-[3/4] rounded-[3rem] overflow-hidden grayscale contrast-125 border border-white/10">
          {cameraMode !== 'off' ? (
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${cameraMode === 'front' ? 'scale-x-[-1]' : ''}`}
            />
          ) : (
            <img 
              src={uploadedImage || "https://lh3.googleusercontent.com/aida-public/AB6AXuCKAMKp0TtEWJYJNcZuRTSgY_qvozq8oPMukJQbQpVZgsHfEt4BELcOppAn9n2f69uW7rHKIppo3NkRAt0fNpWMEQet9_wvR1rbxCAsCi4cJxkoEIVWWgVreHMFkfNN0rRiDtjI1zo24VYB5qj6Vspq0H9mvbfg8v8AYD3amnNu3uYh6CPqSLVBcmRRYlxolIlYPXF2Ruc6Jqsn7-U6JhYZaue9IdiNF1JDy4KM4mM5jNjapu6onKj9gQY0JkJrsmRd4rW6qBYwzv45"} 
              alt="Portrait"
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          
          {/* Scanning Line */}
          <div className="absolute left-0 right-0 h-[2px] bg-primary shadow-[0_0_20px_#D4FF00] animate-scan z-20"></div>
          
          <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
            <div className="text-6xl font-display font-black text-white/20 leading-none">
              TECH<br/>WEAR
            </div>
          </div>
        </div>

        {/* Floating Tool Controls */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 glass rounded-full z-30">
          <button 
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black shadow-lg overflow-hidden"
            onClick={() => {
              if (generatedNFT) {
                setUploadedImage(generatedNFT);
                setCameraMode('off');
              } else {
                alert('Please generate an NFT first in the Avatar tab.');
              }
            }}
          >
            {generatedNFT ? (
              <img src={generatedNFT} alt="NFT" className="w-full h-full object-cover" />
            ) : (
              <span className="material-icons-round text-sm">person</span>
            )}
          </button>
          <button 
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${cameraMode === 'rear' ? 'bg-primary text-black' : 'text-white/50'}`}
            onClick={() => setCameraMode(cameraMode === 'rear' ? 'off' : 'rear')}
          >
            <span className="material-icons-round text-sm">flip_camera_ios</span>
          </button>
          <button 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="material-icons-round text-sm">photo_library</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Right Sidebar for Products */}
        <div className={`absolute right-0 top-1/2 -translate-y-1/2 flex items-center transition-transform duration-300 z-30 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <button 
            className="w-8 h-16 bg-black/50 backdrop-blur-md rounded-l-xl flex items-center justify-center border border-r-0 border-white/10 text-white/50 absolute -left-8"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <span className="material-icons-round text-xl">
              {isSidebarOpen ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
          <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-l-3xl flex flex-col gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center p-2">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBG6WqRaM55MRml9LIPs_F5kVbZokZOg2YSXEGbMsVuJaVnAQcul7346_uJBQfrumeMs4RJiVPPq0C4EwSgycaRap4Wa4bVXnw8Oeb26kb3FQX08gbiOAYcgZK5kNmSxC3_IQXEOvQlOiHo1jtmsUxbA-5gYQPmcqtYnorvKBp9s2gJ6jYpum6fuqx7rk1d9NBrIOSAk-Qj_kjrZ9KLLaz1MHOsgcTHCYMcR-spaluEu3woUbt8YGT0nEQQAqMItW19S-MbmrJzPWm" className="max-h-full object-contain mix-blend-multiply" />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center p-2 grayscale">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2Q-pOZFhFDId8Com849gNPMDIdk84Yw2ZccQg-Fvrbaj-Zc-VcMXfDuGuhNxV6s_Idsxl9QHdG75f7fH2GDsi5ALKimD42BMkZz1l24Ws9xMONdRNuZE8BBWc9-ZoJ7GI8bCmAHcuKAAPKAcN7pGtgA42Abo1NAEVMas9UiS38mHh8ZTRGSTnCNC5eBDGrgHCRkSCwsJTibEVnb7wNKt27uPA9T2lT8mm4gucQ12QR81i3kmuRM5oVGnhmkU02I1xgOdTGc88E2SI" className="max-h-full object-contain" />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center p-2 grayscale">
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVucNnGP65fT1VxBGQcOoAzZo1MdQtInARpkrmjQ5DFXf7fJ-90am7UYwO8rJnGOamgndOjTd5M8DPSo31EuJR1CpEjd_w8Nfzf8PHhBjlR5vtEHG7CtmuE1s5e2sue2rQ9D8d9TkFgWbE7ei6X6iwZLk8zcoyu_RYcnlFjNJFEUH1hdJ7EFPAE4WNcpBQnzlTsPQpQe5WCL8cZ07unSfUy7N5r5DAmUQ8VhqEW9XlR_PA8JC9J2dGmALI-KiFraD9M2kyNkERE7vE" className="max-h-full object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* Style Bottom Drawer */}
      <div className="bg-black glass p-4 pb-28 rounded-t-[3rem] border-t border-white/10 z-30 flex justify-center">
        <button className="w-48 bg-white text-black py-3 rounded-full flex items_center justify-between px-6 group active:scale-95 transition-all shadow-lg">
          <span className="text-sm font-black uppercase tracking-widest">Apply Style</span>
          <div className="bg-primary p-1.5 rounded-full text-black">
            <span className="material-icons-round text-sm">arrow_forward</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default TryOn;
