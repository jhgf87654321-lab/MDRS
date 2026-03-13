import React, { useEffect, useState } from 'react';
import { View } from '../../types';
import { getMe, likePost, listPosts, type Post } from '../../lib/apiClient';

interface ShareHubProps {
  onNavigate: (view: View) => void;
}

export default function ShareHubModule({ onNavigate }: ShareHubProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchPosts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedPosts = await listPosts();
        if (!isMounted) return;
        setPosts(fetchedPosts);
      } catch (e) {
        console.error('Failed to fetch posts', e);
        if (!isMounted) return;
        setError('Failed to load posts.');
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    void fetchPosts();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLike = async (postId: string) => {
    const me = await getMe();
    if (!me) {
      alert('Please sign in to like posts.');
      return;
    }

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p)),
    );

    try {
      await likePost(postId);
    } catch (e) {
      console.error('Failed to like post', e);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likesCount: Math.max(0, p.likesCount - 1) } : p)),
      );
      alert('Failed to like post.');
    }
  };

  return (
    <div className="min-h-screen bg-background-dark text-white flex flex-col font-future">
      <header className="relative z-50 px-6 pt-12 pb-4 flex justify-between items-center bg-background-dark/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-4">
          <button className="text-xl font-black tracking-tighter uppercase">Explore</button>
          <button className="text-xl font-black tracking-tighter uppercase text-white/40">Following</button>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
          <span className="material-icons-round text-lg">search</span>
        </button>
      </header>

      <main className="flex-1 px-4 py-4 overflow-y-auto pb-32">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40">
            <span className="material-icons-round text-4xl mb-2">error</span>
            <p className="text-sm font-bold uppercase tracking-widest">{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40">
            <span className="material-icons-round text-4xl mb-2">grid_off</span>
            <p className="text-sm font-bold uppercase tracking-widest">No posts yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {posts.map((post, index) => (
              <div key={post.id} className="flex flex-col gap-2 break-inside-avoid mb-4">
                <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                  <img
                    src={post.mediaUrls[0]}
                    alt={post.title}
                    className="w-full object-cover"
                    style={{ aspectRatio: index % 3 === 0 ? '3/4' : '1/1' }}
                    referrerPolicy="no-referrer"
                  />
                  {post.mediaUrls.length > 1 && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1">
                      <span className="material-icons-round text-[10px]">collections</span>
                      <span className="text-[10px] font-bold">{post.mediaUrls.length}</span>
                    </div>
                  )}
                </div>

                <div className="px-1">
                  <h3 className="text-sm font-bold line-clamp-2 leading-tight mb-2">{post.title}</h3>
                  {Array.isArray((post as any).hashtags) && (post as any).hashtags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {((post as any).hashtags as string[]).slice(0, 10).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold tracking-wider text-primary/90 normal-case"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <img
                        src={post.authorAvatar}
                        alt={post.authorName}
                        className="w-5 h-5 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[10px] text-white/60 truncate max-w-[80px]">{post.authorName}</span>
                    </div>
                    <button
                      onClick={() => handleLike(post.id)}
                      className="flex items-center gap-1 text-white/60 hover:text-primary transition-colors"
                    >
                      <span className="material-icons-round text-sm">favorite_border</span>
                      <span className="text-[10px] font-bold">{post.likesCount}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <button
        onClick={() => onNavigate(View.WARDROBE)}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 w-14 h-14 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(212,255,0,0.3)] z-50 hover:scale-105 transition-transform"
      >
        <span className="material-icons-round text-3xl">add</span>
      </button>
    </div>
  );
}

