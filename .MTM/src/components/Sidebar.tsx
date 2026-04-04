import React from 'react';
import { Home, Box, Video, Settings, User } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const navItems = [
  { icon: Home, label: 'Home', id: 'home', short: 'HO' },
  { icon: Box, label: '三视图生成', id: 'three-view', short: '3D' },
  { icon: Video, label: 'VIDEO生成', id: 'video', short: 'VI' },
  { icon: Settings, label: 'Settings', id: 'settings', short: 'SE' },
];

interface SidebarProps {
  onSettingsClick?: () => void;
  onSignOut?: () => void;
  userEmail?: string;
  isLoggedIn?: boolean;
  onOpenAuth?: () => void;
}

export function Sidebar({
  onSettingsClick,
  onSignOut,
  userEmail,
  isLoggedIn,
  onOpenAuth,
}: SidebarProps) {
  const [active, setActive] = React.useState('home');
  const [accountOpen, setAccountOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!accountOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = popoverRef.current;
      if (el && !el.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [accountOpen]);

  const handleClick = (id: string) => {
    setActive(id);
    if (id === 'settings' && onSettingsClick) {
      onSettingsClick();
    }
  };

  const handleAvatarClick = () => {
    if (isLoggedIn) {
      setAccountOpen((v) => !v);
    } else {
      onOpenAuth?.();
    }
  };

  return (
    <div className="fixed left-0 top-0 bottom-0 z-50 flex w-24 flex-col items-center border-r border-black/5 bg-white py-12">
      <motion.div
        className="mb-16 cursor-pointer"
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-black">
          <div className="h-6 w-6 rotate-45 border-2 border-white" />
        </div>
      </motion.div>

      <div className="flex flex-1 flex-col gap-12">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item.id)}
            className={cn(
              'group flex flex-col items-center gap-2 transition-all duration-300',
              active === item.id ? 'text-black' : 'text-black/20 hover:text-black',
            )}
            title={item.label}
          >
            <item.icon
              size={20}
              className={cn('transition-transform duration-300', active === item.id ? 'scale-110' : 'group-hover:scale-110')}
            />
            <span className="vertical-text mt-2 text-[10px] font-bold uppercase tracking-widest">{item.short}</span>
          </button>
        ))}
      </div>

      <div className="relative flex flex-col items-center" ref={popoverRef}>
        <button
          type="button"
          title={isLoggedIn ? '账号' : '登录 / 注册'}
          onClick={handleAvatarClick}
          className={cn(
            'flex h-10 w-10 items-center justify-center overflow-hidden border transition-colors',
            isLoggedIn
              ? 'border-black/10 bg-black text-[10px] font-bold uppercase text-white'
              : 'border-dashed border-black/25 bg-white text-black/35 hover:border-black/40 hover:text-black/60',
          )}
        >
          {isLoggedIn ? (
            (userEmail?.trim().charAt(0) || 'U').toUpperCase()
          ) : (
            <User size={18} strokeWidth={1.75} />
          )}
        </button>

        {isLoggedIn && accountOpen && (
          <div className="absolute bottom-full left-1/2 z-[60] mb-3 w-48 -translate-x-1/2 border border-black/10 bg-white p-4 shadow-xl">
            <p className="text-[9px] font-bold uppercase tracking-widest text-black/40">已登录</p>
            <p className="mt-2 truncate text-[10px] font-bold text-black" title={userEmail}>
              {userEmail || '—'}
            </p>
            <button
              type="button"
              className="mt-4 w-full border border-black/10 py-2 text-[9px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-black hover:text-white"
              onClick={() => {
                setAccountOpen(false);
                onSignOut?.();
              }}
            >
              退出登录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
