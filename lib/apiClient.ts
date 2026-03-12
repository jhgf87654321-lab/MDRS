export type SessionUser = { uid: string; email: string; role: 'user' | 'admin' };

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new Error(res.ok ? 'Invalid response' : `Server error: ${text.slice(0, 80)}`);
  }
}

export async function getMe(): Promise<SessionUser | null> {
  try {
    const res = await fetch('/api/auth/me', { method: 'GET' });
    const data = await parseJson<{ ok: boolean; user: SessionUser | null }>(res);
    return data.user;
  } catch {
    return null;
  }
}

export async function signUp(email: string, password: string) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<{ ok?: boolean; user?: SessionUser; error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Signup failed');
  return data.user!;
}

export async function signIn(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJson<{ ok?: boolean; user?: SessionUser; error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data.user!;
}

export async function signOut() {
  await fetch('/api/auth/logout', { method: 'POST' });
}

export type Post = {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatar: string;
  mediaUrls: string[];
  title: string;
  content: string;
  likesCount: number;
  createdAt: unknown;
};

export async function listPosts() {
  const res = await fetch('/api/posts', { method: 'GET' });
  const data = await parseJson<{ ok?: boolean; posts?: Post[]; error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to load posts');
  return data.posts ?? [];
}

export async function likePost(postId: string) {
  const res = await fetch('/api/posts/like', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId }),
  });
  const data = await parseJson<{ ok?: boolean; error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to like');
}

export async function createPost(input: { mediaUrls: string[]; title: string; content: string }) {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ ok?: boolean; id?: string; error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to create post');
  return data.id!;
}

export type AestheticReference = { id: string; imageUrl?: string; imageDataUrl?: string | null; prompt?: string };

export async function getRandomAestheticReferences(count = 2) {
  const res = await fetch(`/api/aesthetic-references/random?count=${encodeURIComponent(String(count))}`, { method: 'GET' });
  const data = await parseJson<{ ok?: boolean; references?: AestheticReference[] }>(res);
  return data.references ?? [];
}

export async function saveAestheticReference(input: { imageUrl: string; prompt: string }) {
  const res = await fetch('/api/aesthetic-references', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ ok?: boolean; id?: string; error?: string }>(res);
  if (!res.ok) throw new Error(data.error || 'Failed to save reference');
  return data.id!;
}

export async function uploadImageToCloudBase(
  dataUrl: string,
  options?: {
    prefix?: string;
    fileName?: string;
  },
) {
  // If it's already a remote URL (e.g. COS URL), skip re-upload and return as-is.
  if (typeof dataUrl === 'string' && /^https?:\/\//i.test(dataUrl)) {
    return dataUrl;
  }

  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl, ...(options ?? {}) }),
  });
  const data = await parseJson<{ ok?: boolean; url?: string; error?: string }>(res);
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Failed to upload image');
  }
  return data.url;
}


