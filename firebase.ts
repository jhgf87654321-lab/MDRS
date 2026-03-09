import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';

import firebaseConfig from './firebase-applet-config.json';

export type UserRole = 'user' | 'admin';

export type AestheticReference = {
  id: string;
  imageUrl: string; // base64 data URL
  prompt: string;
  rating: 5;
  createdAt: Timestamp;
  authorUid: string;
};

export type Post = {
  id: string;
  authorUid: string;
  authorName: string;
  authorAvatar: string;
  mediaUrls: string[];
  title: string;
  content: string;
  likesCount: number;
  createdAt: Timestamp;
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const provider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((p) => ({
          providerId: p.providerId,
          displayName: p.displayName,
          email: p.email,
          photoUrl: p.photoURL,
        })) ?? [],
    },
    operationType,
    path,
  };

  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        role: 'user' satisfies UserRole,
        createdAt: serverTimestamp(),
      });
    }

    return user;
  } catch (error) {
    console.error('Error signing in with Google', error);
    throw error;
  }
}

export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out', error);
    throw error;
  }
}

export async function checkIsAdmin(uid: string) {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() && userSnap.data().role === 'admin';
  } catch (error) {
    console.error('Error checking admin status', error);
    return false;
  }
}

export async function saveAestheticReference(imageUrl: string, prompt: string) {
  if (!auth.currentUser) throw new Error('Must be logged in to save reference');
  try {
    const docRef = await addDoc(collection(db, 'aesthetic_references'), {
      id: crypto.randomUUID(),
      imageUrl,
      prompt,
      rating: 5,
      createdAt: serverTimestamp(),
      authorUid: auth.currentUser.uid,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'aesthetic_references');
  }
}

export async function getRandomAestheticReferences(count = 2): Promise<AestheticReference[]> {
  try {
    const q = query(collection(db, 'aesthetic_references'), orderBy('createdAt', 'desc'), limit(10));
    const querySnapshot = await getDocs(q);
    const refs: AestheticReference[] = [];
    querySnapshot.forEach((d) => {
      refs.push({ id: d.id, ...(d.data() as Omit<AestheticReference, 'id'>) });
    });

    const shuffled = [...refs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'aesthetic_references');
  }
}

export async function createPost(mediaUrls: string[], title: string, content: string) {
  if (!auth.currentUser) throw new Error('Must be logged in to create a post');

  try {
    const docRef = await addDoc(collection(db, 'posts'), {
      id: crypto.randomUUID(),
      authorUid: auth.currentUser.uid,
      authorName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Anonymous',
      authorAvatar:
        auth.currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser.uid}`,
      mediaUrls,
      title,
      content,
      likesCount: 0,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'posts');
  }
}

export async function getPosts(count = 20): Promise<Post[]> {
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);

    const posts: Post[] = [];
    querySnapshot.forEach((d) => {
      posts.push({ id: d.id, ...(d.data() as Omit<Post, 'id'>) });
    });

    return posts;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'posts');
  }
}

export async function likePost(postId: string) {
  if (!auth.currentUser) throw new Error('Must be logged in to like a post');
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, { likesCount: increment(1) });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `posts/${postId}`);
  }
}

