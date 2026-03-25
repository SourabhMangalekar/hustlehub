import { Injectable } from '@angular/core';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  getDocs, 
  where,
  updateDoc
} from 'firebase/firestore';
import { getApp } from 'firebase/app';

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  role?: 'demand' | 'supply' | 'admin' | 'unassigned';
  roleSubtype?: string;
  bio?: string;
  city?: string;
  profileImage?: string;
  meta?: any;
  rating?: number;
  reviewCount?: number;
  status?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Post {
  id?: string;
  title: string;
  description: string;
  budget: string;
  city?: string;
  createdBy: string;
  roleSubtypeRequired?: string;
  status: 'open' | 'closed' | 'in_progress';
  meta?: any;
  createdAt: number;
  updatedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db = getFirestore(getApp());
  public readonly APP_CONTEXT = 'HUSTLEHUB';

  constructor() {}

  // Helper to strictly enforce multi-tenant paths
  private getTenantPath(collectionName: string): string {
    return `apps/${this.APP_CONTEXT}/${collectionName}`;
  }

  /**
   * Users Management
   */
  async createUserProfile(uid: string, data: Partial<UserProfile>) {
    const userRef = doc(this.db, this.getTenantPath('users'), uid);
    const now = Date.now();
    const defaultData: UserProfile = {
      uid,
      name: data.name || '',
      email: data.email,
      role: data.role || 'unassigned',
      rating: 0,
      reviewCount: 0,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      ...data
    };
    return setDoc(userRef, defaultData);
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(this.db, this.getTenantPath('users'), uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    }
    return null;
  }

  async updateUserProfile(uid: string, data: Partial<UserProfile>) {
    const userRef = doc(this.db, this.getTenantPath('users'), uid);
    return updateDoc(userRef, { ...data, updatedAt: Date.now() });
  }

  /**
   * Posts Management (Requirements)
   */
  async createPost(postData: Partial<Post>) {
    const postsRef = collection(this.db, this.getTenantPath('posts'));
    const now = Date.now();
    const newPost: Partial<Post> = {
      ...postData,
      status: postData.status || 'open',
      createdAt: now,
      updatedAt: now
    };
    return addDoc(postsRef, newPost);
  }

  async getRecentPosts(): Promise<Post[]> {
    const postsRef = collection(this.db, this.getTenantPath('posts'));
    const q = query(postsRef, where('status', '==', 'open'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
  }
}
