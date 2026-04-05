import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { getCloudbaseAuth, pickWebAuthUserIdEmail } from '@nftt/lib/cloudbase';
import { ensureHmrsProfile } from '@nftt/lib/hmrsDb';
import { ensureUserProfile, setMyDisplayName } from '@nftt/lib/userProfile';

type Mode = 'signIn' | 'signUp';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function formatSignInError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('HMRS_PROFILE_CREATE_FAILED')) {
    return 'HMRS 档案异常：请检查集合 HMRS 与安全规则。';
  }
  if (msg.includes('PROFILE_CREATE_VERIFY_FAILED')) {
    return '用户档案无法校验：请检查云数据库 user_profiles 是否已创建，且安全规则允许当前用户读取自己的文档（可使用 uid 模板查询）；也可稍后重试。';
  }
  if (msg.includes('NOT_FOUND') || msg.includes('用户不存在')) return '账号或密码错误';
  if (msg.includes('INVALID_PASSWORD') || msg.includes('密码')) return '账号或密码错误';
  return msg || '登录失败';
}

function formatSignUpError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('PhoneNumber') || msg.includes('phone_number') || msg.includes('INVALID_ARGUMENT')) {
    return '注册请求异常（已按邮箱注册绕过手机号字段）。若仍失败，请刷新后重试或联系管理员检查 CloudBase 认证配置。';
  }
  if (msg.includes('HMRS_PROFILE_CREATE_FAILED')) {
    return 'HMRS 档案创建失败：请在云开发创建集合 HMRS 并配置读写规则（uid 与 auth.uid 一致）。';
  }
  if (msg.includes('PROFILE_CREATE_VERIFY_FAILED')) {
    return '注册成功，但用户档案未通过校验：请在控制台检查 user_profiles 集合及读权限，或稍后重试。';
  }
  return msg || '认证失败';
}

async function resolveUidWithRetry(auth: ReturnType<typeof getCloudbaseAuth>, user: unknown): Promise<string> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 12; i += 1) {
    const u = i === 0 && user != null ? user : await auth.getCurrentUser();
    const picked = pickWebAuthUserIdEmail(u);
    if (picked?.uid) return picked.uid;
    await sleep(i === 0 ? 0 : 60 * i);
  }
  throw new Error('登录成功但未获取到用户 ID，请刷新重试');
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** 登录/注册成功后立即同步到外壳 UI（不依赖 onAuthStateChange 时机） */
  onSignedIn?: (info: { uid: string; email: string }) => void;
};

export function MtmAuth({ open, onClose, onSignedIn }: Props) {
  const auth = React.useMemo(() => getCloudbaseAuth(), []);
  const [mode, setMode] = React.useState<Mode>('signIn');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [verificationId, setVerificationId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'sending'>('idle');

  React.useEffect(() => {
    if (!open) {
      setError(null);
      setMode('signIn');
      setStatus('idle');
    }
  }, [open]);

  const sendCode = async () => {
    setError(null);
    if (mode !== 'signUp') {
      setError('请切换到注册后再获取验证码');
      return;
    }
    if (!isNonEmptyString(email)) {
      setError('请输入邮箱');
      return;
    }
    setStatus('sending');
    try {
      const res = await (auth as any).getVerification({ email: email.trim().toLowerCase() });
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
    if (!isNonEmptyString(email)) {
      setError('请输入邮箱');
      return;
    }
    if (!isNonEmptyString(password)) {
      setError('请输入密码');
      return;
    }
    if (mode === 'signUp') {
      if (!isNonEmptyString(displayName)) {
        setError('请输入用户名 / 昵称');
        return;
      }
      if (!isNonEmptyString(confirmPassword)) {
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
        await (auth as any).signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
      } else {
        if (!isNonEmptyString(code)) throw new Error('请输入验证码');
        if (!verificationId) throw new Error('请先发送验证码');
        const verifyRes = await (auth as any).verify({
          verification_id: verificationId,
          verification_code: code.trim(),
        });
        const verificationToken = verifyRes?.verification_token ?? verifyRes?.verificationToken;
        if (!verificationToken) throw new Error('验证码校验失败');
        /**
         * 勿直接调 auth.signUp({ email, verification_* })：SDK 在存在 verification_code 时会执行
         * formatPhone(phone_number)，未填手机会把 undefined 格式成非法字符串，触发
         * SignUpRequest.PhoneNumber 正则错误。改为只走 OAuth authApi，不传 phone_number。
         */
        const a = auth as any;
        await a.oauthInstance.authApi.signUp({
          email: email.trim().toLowerCase(),
          password,
          verification_code: code.trim(),
          verification_token: verificationToken,
        });
        await a.createLoginState();
      }

      const user = await auth.getCurrentUser();
      const uid = await resolveUidWithRetry(auth, user);
      // 先写 HMRS（MTM 主档案）；user_profiles 为跨端扩展，规则未就绪时不阻塞登录
      await ensureHmrsProfile(uid, {
        email: email.trim().toLowerCase(),
        displayName: mode === 'signUp' && isNonEmptyString(displayName) ? displayName.trim() : undefined,
      });
      try {
        await ensureUserProfile(uid);
      } catch (e) {
        console.warn('[MtmAuth] user_profiles 未就绪（可在云开发检查集合与安全规则）', e);
      }
      if (mode === 'signUp' && isNonEmptyString(displayName)) {
        try {
          await setMyDisplayName(displayName.trim());
        } catch (e) {
          console.warn('[MtmAuth] user_profiles 昵称同步失败，昵称已写入 HMRS', e);
        }
      }
      onSignedIn?.({ uid, email: email.trim().toLowerCase() });
      onClose();
    } catch (err) {
      if (mode === 'signIn') {
        setError(formatSignInError(err));
      } else {
        setError(formatSignUpError(err));
      }
    } finally {
      setStatus('idle');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mtm-auth-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
          onClick={() => onClose()}
        >
          <motion.div
            key="mtm-auth-card"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative w-full max-w-md border border-black/10 bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onClose()}
              className="absolute right-5 top-5 text-black/25 transition-colors hover:text-black"
              aria-label="关闭"
            >
              <X size={20} />
            </button>

            <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-black">账号</h1>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-black/40">
              与主站相同的 CloudBase 登录
            </p>

            <div className="mt-8 flex gap-4 text-[10px] font-bold uppercase tracking-widest">
              <button
                type="button"
                onClick={() => {
                  setMode('signIn');
                  setError(null);
                }}
                className={mode === 'signIn' ? 'border-b-2 border-black pb-1 text-black' : 'pb-1 text-black/30'}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signUp');
                  setError(null);
                }}
                className={mode === 'signUp' ? 'border-b-2 border-black pb-1 text-black' : 'pb-1 text-black/30'}
              >
                注册
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-black/40">邮箱</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-b border-black/10 py-2 text-sm outline-none focus:border-black"
                  autoComplete="email"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-black/40">密码</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-b border-black/10 py-2 text-sm outline-none focus:border-black"
                  autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                />
              </label>
              {mode === 'signUp' && (
                <>
                  <label className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-black/40">确认密码</span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-b border-black/10 py-2 text-sm outline-none focus:border-black"
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-black/40">昵称</span>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="border-b border-black/10 py-2 text-sm outline-none focus:border-black"
                    />
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="验证码"
                      className="min-w-0 flex-1 border-b border-black/10 py-2 text-sm outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => void sendCode()}
                      disabled={status === 'sending'}
                      className="shrink-0 bg-black px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-white disabled:opacity-40"
                    >
                      {status === 'sending' ? '发送中…' : '发验证码'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {error && <p className="mt-4 text-xs text-red-600">{error}</p>}

            <button
              type="button"
              onClick={() => void submit()}
              disabled={status === 'submitting'}
              className="mt-8 w-full bg-black py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white disabled:opacity-40"
            >
              {status === 'submitting' ? '处理中…' : mode === 'signIn' ? '登录' : '创建账号'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
