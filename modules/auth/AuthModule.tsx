import React, { useEffect, useMemo, useState } from 'react';
import { View } from '../../types';
import { getCloudbaseAuth } from '../../lib/cloudbase';
import { ensureUserProfile, setMyDisplayName } from '../../lib/userProfile';

type Mode = 'signIn' | 'signUp';
type Channel = 'email' | 'phone';

type Props = {
  onNavigate: (view: View) => void;
};

function isNonEmpty(v: string) {
  return v.trim().length > 0;
}

// CloudBase 要求手机号形如 "+86 13800000000"
function normalizePhone(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  if (/^1\d{10}$/.test(digits)) {
    return `+86 ${digits}`;
  }
  return trimmed;
}

function getErrorDescription(err: unknown) {
  const anyErr = err as any;
  return (
    anyErr?.error_description ??
    anyErr?.errorDescription ??
    anyErr?.message ??
    anyErr?.error?.message ??
    ''
  );
}

function formatSignInError(err: unknown) {
  const desc = String(getErrorDescription(err) || '');
  const normalized = desc.toLowerCase();
  if (
    normalized.includes('invalid login') ||
    normalized.includes('invalid credentials') ||
    normalized.includes('wrong password') ||
    normalized.includes('password') ||
    normalized.includes('not found') ||
    normalized.includes('does not exist') ||
    normalized.includes('user not found')
  ) {
    return '账号不存在或密码错误';
  }
  return desc ? `登录失败：${desc}` : '登录失败，请检查账号和密码';
}

export default function AuthModule({ onNavigate }: Props) {
  const auth = useMemo(() => getCloudbaseAuth(), []);
  const [mode, setMode] = useState<Mode>('signIn');
  const [channel, setChannel] = useState<Channel>('email');
  const [identifier, setIdentifier] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<{ uid?: string; email?: string } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await auth.getCurrentUser();
        if (!mounted) return;
        setMe(user ? { uid: (user as any).uid, email: (user as any).email } : null);
      } catch {
        if (!mounted) return;
        setMe(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [auth]);

  const sendCode = async () => {
    setError(null);
    if (mode !== 'signUp') {
      setError('当前为登录模式，请切换到注册再获取验证码');
      return;
    }
    if (!isNonEmpty(identifier)) {
      setError(channel === 'email' ? '请输入邮箱' : '请输入手机号');
      return;
    }
    setStatus('sending');
    try {
      const trimmed = identifier.trim();
      const payload =
        channel === 'email'
          ? { email: trimmed.toLowerCase() }
          : { phone_number: normalizePhone(trimmed) };
      // CloudBase getVerification 发送验证码，返回 verification_id（非 verification_token）
      const res = await (auth as any).getVerification(payload);
      const id = res?.verification_id ?? res?.verificationId;
      if (!id) throw new Error('获取验证码失败');
      setVerificationId(String(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setStatus('idle');
    }
  };

  const submit = async () => {
    setError(null);
    if (!isNonEmpty(identifier)) {
      setError(channel === 'email' ? '请输入邮箱' : '请输入手机号');
      return;
    }
    if (!isNonEmpty(password)) {
      setError('请输入密码');
      return;
    }
    if (mode === 'signUp') {
      if (!isNonEmpty(displayName)) {
        setError('请输入用户名 / 昵称');
        return;
      }
      if (!isNonEmpty(confirmPassword)) {
        setError('请确认密码');
        return;
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
    }

    setStatus('submitting');
    try {
      if (mode === 'signIn') {
        const trimmedId = identifier.trim();
        const base =
          channel === 'email'
            ? { email: trimmedId.toLowerCase() }
            : { phone_number: normalizePhone(trimmedId) };
        await (auth as any).signInWithPassword({
          ...base,
          password,
        });
      } else {
        if (!isNonEmpty(code)) {
          throw new Error('请输入验证码');
        }
        if (!verificationId) {
          throw new Error('请先发送验证码');
        }
        const trimmedId = identifier.trim();
        const base =
          channel === 'email'
            ? { email: trimmedId.toLowerCase() }
            : { phone_number: normalizePhone(trimmedId) };
        // 先用 verify 将 verification_id + code 换取 verification_token
        const verifyRes = await (auth as any).verify({
          verification_id: verificationId,
          verification_code: code.trim(),
        });
        const verificationToken =
          verifyRes?.verification_token ?? verifyRes?.verificationToken;
        if (!verificationToken) throw new Error('验证码校验失败');
        await (auth as any).signUp({
          ...base,
          password,
          verification_code: code.trim(),
          verification_token: verificationToken,
        });
      }

      const user = await auth.getCurrentUser();
      setMe(user ? { uid: (user as any).uid, email: (user as any).email } : null);
      try {
        // 创建 / 确保用户档案存在
        const profile = await ensureUserProfile();
        // 注册时，把用户填写的昵称写入档案，仅影响 displayName，不参与登录
        if (mode === 'signUp' && isNonEmpty(displayName)) {
          await setMyDisplayName(displayName.trim());
        }
      } catch (e) {
        // Surface profile init issues to browser console for debugging
        console.error('ensureUserProfile error', e);
      }
      onNavigate(View.CREATOR);
    } catch (err) {
      if (mode === 'signIn') {
        setError(formatSignInError(err));
      } else {
        const desc = getErrorDescription(err);
        setError(desc ? String(desc) : '认证失败');
      }
    } finally {
      setStatus('idle');
    }
  };

  const signOut = async () => {
    setError(null);
    setStatus('submitting');
    try {
      await auth.signOut();
      setMe(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '退出失败');
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-background-dark text-white flex flex-col font-future">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <button
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
          onClick={() => onNavigate(View.HOME)}
        >
          <span className="material-icons-round text-lg">west</span>
        </button>
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">AUTH PROTOCOL</div>
          <div className="text-2xl font-black tracking-tighter">
            {mode === 'signIn' ? 'SIGN IN' : 'SIGN UP'}
          </div>
        </div>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 px-6 pb-28">
        {me?.uid ? (
          <div className="glass rounded-[2.5rem] border border-white/10 p-8">
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-bold mb-2">SIGNED IN</div>
            <div className="text-sm font-bold break-all">{me.email || me.uid}</div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => onNavigate(View.CREATOR)}
                className="w-full bg-white text-black py-5 rounded-[2rem] font-black uppercase tracking-[0.25em] text-[12px] shadow-2xl active:scale-95 transition-all"
              >
                Continue
              </button>
              <button
                onClick={signOut}
                disabled={status !== 'idle'}
                className="w-full bg-white/5 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] border border-white/10 active:scale-95 transition-all disabled:opacity-60"
              >
                {status === 'submitting' ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-6">
          <button
            onClick={() => setChannel('email')}
            className={`flex-1 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${
              channel === 'email' ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setChannel('phone')}
            className={`flex-1 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${
              channel === 'phone' ? 'bg-white text-black border-white' : 'bg-white/5 text-white/60 border-white/10'
            }`}
          >
            Phone
          </button>
            </div>

            <div className="glass rounded-[2.5rem] border border-white/10 p-8">
          <div className="space-y-5">
            {mode === 'signUp' && (
              <div>
                <label className="text-[10px] uppercase font-bold text-white/20 tracking-[0.3em] block mb-2 ml-1">
                  Username / Nickname
                </label>
                <input
                  value={displayName}
                  onChange={(ev) => setDisplayName(ev.target.value)}
                  type="text"
                  placeholder="Your name or handle"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white normal-case focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                />
              </div>
            )}
            <div>
              <label className="text-[10px] uppercase font-bold text-white/20 tracking-[0.3em] block mb-2 ml-1">
                {channel === 'email' ? 'Email' : 'Phone'}
              </label>
              <input
                value={identifier}
                onChange={(ev) => setIdentifier(ev.target.value)}
                type={channel === 'email' ? 'email' : 'tel'}
                placeholder={channel === 'email' ? 'user@domain.com' : '+86 138 0000 0000'}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white normal-case focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-white/20 tracking-[0.3em] block mb-2 ml-1">
                Password
              </label>
              <input
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                type="password"
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white normal-case focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
              />
            </div>

            {mode === 'signUp' && (
              <div>
                <label className="text-[10px] uppercase font-bold text-white/20 tracking-[0.3em] block mb-2 ml-1">
                  Confirm Password
                </label>
                <input
                  value={confirmPassword}
                  onChange={(ev) => setConfirmPassword(ev.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white normal-case focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
                />
              </div>
            )}

            {mode === 'signUp' && (
              <div>
              <div className="flex items-end justify-between gap-3 mb-2">
                <label className="text-[10px] uppercase font-bold text-white/20 tracking-[0.3em] block ml-1">
                  {channel === 'email' ? 'Email Code' : 'SMS Code'}
                </label>
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={status !== 'idle'}
                  className="text-[10px] font-black uppercase tracking-[0.25em] text-primary hover:text-primary/80 disabled:opacity-60"
                >
                  {status === 'sending' ? 'Sending...' : 'Send Code'}
                </button>
              </div>
              <input
                value={code}
                onChange={(ev) => setCode(ev.target.value)}
                inputMode="numeric"
                placeholder="123456"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white normal-case focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
              />
              {verificationId ? (
                <div className="mt-2 text-[10px] text-white/40 uppercase tracking-[0.2em]">验证码已发送</div>
              ) : null}
              </div>
            )}

            {error ? (
              <div className="text-sm text-red-400 font-bold break-words">{error}</div>
            ) : (
              <div className="text-sm text-white/30">
                {mode === 'signIn'
                  ? `使用${channel === 'email' ? '邮箱' : '手机'} + 密码登录。`
                  : `先发送${channel === 'email' ? '邮箱' : '短信'}验证码，再使用密码完成注册。`}
              </div>
            )}

            <button
              onClick={submit}
              disabled={status !== 'idle'}
              className="w-full bg-white text-black py-5 rounded-[2rem] font-black uppercase tracking-[0.25em] text-[12px] shadow-2xl active:scale-95 transition-all disabled:opacity-60"
            >
              {status === 'submitting' ? 'Working...' : mode === 'signIn' ? 'Start Session' : 'Create Account'}
            </button>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signIn' ? 'signUp' : 'signIn');
                  if (mode === 'signUp') {
                    setVerificationId(null);
                    setCode('');
                    setConfirmPassword('');
                  }
                }}
                className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/90 hover:text-primary transition-colors underline underline-offset-4"
              >
                {mode === 'signIn' ? 'SIGN UP HERE' : 'SIGN IN HERE'}
              </button>
            </div>
          </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

