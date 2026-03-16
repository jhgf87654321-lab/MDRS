import React, { useRef, useState } from 'react';
import { createPost, getMe, uploadImageToCloudBase } from '../../lib/apiClient';

interface CreatePostProps {
  initialMedia?: string[];
  onBack: () => void;
  onSuccess: () => void;
}

export default function CreatePostModule({ initialMedia = [], onBack, onSuccess }: CreatePostProps) {
  const [mediaUrls, setMediaUrls] = useState<string[]>(initialMedia);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const HASHTAGS = ['#CyberFashion', '#OOTD', '#NFT'] as const;
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const selectedFiles: File[] = Array.from(files);
    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          console.error('Unexpected FileReader result', result);
          return;
        }
        setMediaUrls((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMedia = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const submitPost = async () => {
    const me = await getMe();
    if (!me) {
      alert('请先登录后再发布。');
      return;
    }
    if (mediaUrls.length === 0) {
      alert('请至少添加一张图片或视频。');
      return;
    }
    if (!title.trim()) {
      alert('请填写标题。');
      return;
    }
    if (!content.trim()) {
      alert('请填写内容。');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the same identity as the post session (email prefix) to avoid mismatches.
      const authorName = me.email?.split('@')[0] || undefined;
      const urls = await Promise.all(mediaUrls.map((m) => uploadImageToCloudBase(m)));
      await createPost({ mediaUrls: urls, title: title.trim(), content: content.trim(), hashtags: selectedTags, authorName });
      onSuccess();
    } catch (error) {
      console.error('Error creating post', error);
      alert('发布失败。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-dark text-white flex flex-col font-future">
      <header className="relative z-50 px-6 pt-12 pb-4 flex justify-between items-center bg-background-dark/80 backdrop-blur-md sticky top-0 border-b border-white/10">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
        >
          <span className="material-icons-round text-lg">close</span>
        </button>
        <h1 className="text-lg font-black tracking-tighter uppercase">新发布</h1>
        <button
          onClick={() => void submitPost()}
          disabled={isSubmitting || mediaUrls.length === 0 || !title.trim() || !content.trim()}
          className="px-4 py-2 bg-primary text-black font-bold uppercase tracking-widest text-[10px] rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '发布中…' : '发布'}
        </button>
      </header>

      <main className="flex-1 px-6 py-6 overflow-y-auto pb-32">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitPost();
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">媒体</label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {mediaUrls.map((url, index) => (
                <div key={index} className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-white/10 group">
                  <img src={url} alt={`Upload ${index}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="material-icons-round text-[12px]">close</span>
                  </button>
                </div>
              ))}

              {mediaUrls.length < 9 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-24 h-24 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:text-primary transition-colors text-white/40"
                >
                  <span className="material-icons-round text-2xl">add_photo_alternate</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest">添加</span>
                </button>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              multiple
              className="hidden"
            />
          </div>

          <div className="space-y-2 border-b border-white/10 pb-4">
            <input
              required
              type="text"
              placeholder="输入标题…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-xl font-bold placeholder:text-white/20 focus:outline-none normal-case"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <textarea
              required
              placeholder="写点内容、穿搭细节或灵感…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-40 bg-transparent text-sm text-white/80 placeholder:text-white/20 focus:outline-none resize-none normal-case"
              maxLength={5000}
            />
          </div>

          <div className="flex gap-2 flex-wrap pt-4 border-t border-white/10">
            {HASHTAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border transition-colors ${
                    active
                      ? 'bg-primary/20 text-primary border-primary/40'
                      : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white/80'
                  } normal-case`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </form>
      </main>
    </div>
  );
}

