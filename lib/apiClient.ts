export type SessionUser = { uid: string; email: string; role: 'user' | 'admin' };

export async function getMe() {
  const res = await fetch('/api/auth/me', { method: 'GET' });
  const data = (await res.json()) as { ok: boolean; user: SessionUser | null };
  return data.user;
}

export async function signUp(email: string, password: string) {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { ok?: boolean; user?: SessionUser; error?: string };
  if (!res.ok) throw new Error(data.error || 'Signup failed');
  return data.user!;
}

export async function signIn(email: string, password: string) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { ok?: boolean; user?: SessionUser; error?: string };
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
  const data = (await res.json()) as { ok?: boolean; posts?: Post[]; error?: string };
  if (!res.ok) throw new Error(data.error || 'Failed to load posts');
  return data.posts ?? [];
}

export async function likePost(postId: string) {
  const res = await fetch('/api/posts/like', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error || 'Failed to like');
}

export async function createPost(input: { mediaUrls: string[]; title: string; content: string }) {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
  if (!res.ok) throw new Error(data.error || 'Failed to create post');
  return data.id!;
}

export type AestheticReference = { id: string; imageUrl?: string; prompt?: string };

export async function getRandomAestheticReferences(count = 2) {
  const res = await fetch(`/api/aesthetic-references/random?count=${encodeURIComponent(String(count))}`, { method: 'GET' });
  const data = (await res.json()) as { ok?: boolean; references?: AestheticReference[] };
  return data.references ?? [];
}

export async function saveAestheticReference(input: { imageUrl: string; prompt: string }) {
  const res = await fetch('/api/aesthetic-references', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
  if (!res.ok) throw new Error(data.error || 'Failed to save reference');
  return data.id!;
}

export async function uploadImageToCloudBase(dataUrl: string) {
  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  });
  const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'Failed to upload image');
  }
  return data.url;
}


