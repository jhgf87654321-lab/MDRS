import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, checkIsAdmin, logout, saveAestheticReference, signInWithGoogle } from '../../firebase';
import { generateGeminiImage } from '../../lib/geminiClient';

export default function AdminModule() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [prompt, setPrompt] = useState(
    'A high-end avant-garde fashion editorial shot of a model wearing futuristic streetwear. Cinematic lighting, 8k, photorealistic.',
  );
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const adminStatus = await checkIsAdmin(currentUser.uid);
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed', error);
      alert('Login failed. Check console for details.');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGeneratedImage(null);

    try {
      const img = await generateGeminiImage({ prompt: prompt.trim() });
      setGeneratedImage(img);
    } catch (error) {
      console.error('Generation error', error);
      alert('Failed to generate image.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRate = async (rating: number) => {
    if (!generatedImage || rating !== 5) {
      if (rating !== 5) {
        alert('Only 5-star images are saved to the reference library.');
        setGeneratedImage(null);
      }
      return;
    }

    setIsSaving(true);
    try {
      await saveAestheticReference(generatedImage, prompt);
      alert('Saved to Aesthetic Reference Library!');
      setGeneratedImage(null);
    } catch (error) {
      console.error('Error saving reference', error);
      alert('Failed to save reference.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background-dark text-white flex items-center justify-center">Loading...</div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background-dark text-white p-8 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-display font-black mb-4">Admin Access Required</h1>
        <p className="text-white/60 mb-8 text-center">
          You must be logged in as an administrator to access the Aesthetic Training System.
        </p>

        {user ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-primary">Logged in as: {user.email} (Not Admin)</p>
            <button onClick={() => void logout()} className="px-6 py-2 bg-white/10 rounded-full hover:bg-white/20">
              Sign Out
            </button>
          </div>
        ) : (
          <button onClick={() => void handleLogin()} className="px-8 py-3 bg-primary text-black font-bold rounded-full uppercase tracking-widest">
            Sign In with Google
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark text-white p-6 overflow-y-auto pb-24">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-display font-black uppercase tracking-tighter text-primary">Aesthetic Training</h1>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Admin Test Node</p>
        </div>
        <button onClick={() => void logout()} className="text-[10px] uppercase tracking-widest text-white/40 hover:text-white">
          Sign Out
        </button>
      </div>

      <div className="space-y-6">
        <div className="glass p-4 rounded-2xl border border-white/10">
          <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Test Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary/50 resize-none"
          />
          <button
            onClick={() => void handleGenerate()}
            disabled={isGenerating || !prompt.trim()}
            className="w-full mt-4 py-3 bg-primary text-black font-bold uppercase tracking-widest rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="material-icons-round animate-spin">sync</span> Generating...
              </>
            ) : (
              <>
                <span className="material-icons-round">auto_awesome</span> Generate Test Image
              </>
            )}
          </button>
        </div>

        {generatedImage && (
          <div className="glass p-4 rounded-2xl border border-primary/30 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-center mb-4">Evaluate Result</h2>
            <div className="aspect-[3/4] rounded-xl overflow-hidden mb-4 border border-white/10">
              <img src={generatedImage} alt="Generated Test" className="w-full h-full object-cover" />
            </div>

            <p className="text-xs text-center text-white/60 mb-4">
              Rate this image. Only 5-star images will be saved to the reference library.
            </p>

            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => void handleRate(star)}
                  disabled={isSaving}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                    star === 5
                      ? 'bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-black shadow-[0_0_15px_rgba(212,255,0,0.2)]'
                      : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="material-icons-round">{star === 5 ? 'star' : 'star_border'}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

