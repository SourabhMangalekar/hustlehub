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
import {
  APP_CONTEXT,
  UserRole,
  UserRoleSubtype,
  UserStatus,
  PostStatus,
  ROLE_CODES,
  POST_STATUS_CODES,
  USER_STATUS_CODES
} from '../core/master-data';

// Re-export types so existing imports from this service still work
export type { UserRole, UserRoleSubtype, UserStatus, PostStatus };

export interface UserMeta {
  social?: {
    instagramHandle?: string;
    followers?: number;
    youtube?: string;
  };
  professional?: {
    skills?: string[];
    equipment?: string[];
    experienceYears?: number;
  };
  business?: {
    companyName?: string;
  };
  personal?: {
    weddingDate?: string;
  };
}

export interface UserStats {
  rating: number;
  reviewCount: number;
  completedJobs: number;
  totalJobs: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  phone?: string;
  email?: string;
  role: UserRole;
  roleSubtype?: UserRoleSubtype;
  bio?: string;
  city?: string;
  profileImage?: string;
  meta?: UserMeta;
  stats: UserStats;
  status: UserStatus;
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
  status: PostStatus;
  meta?: any;
  createdAt: number;
  updatedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db = getFirestore(getApp());
  public readonly APP_CONTEXT = APP_CONTEXT;

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
      role: data.role || ROLE_CODES.UNASSIGNED,
      stats: {
        rating: 0,
        reviewCount: 0,
        completedJobs: 0,
        totalJobs: 0
      },
      status: USER_STATUS_CODES.ACTIVE,
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
      status: postData.status || POST_STATUS_CODES.OPEN,
      createdAt: now,
      updatedAt: now
    };
    return addDoc(postsRef, newPost);
  }

  async getRecentPosts(): Promise<Post[]> {
    const postsRef = collection(this.db, this.getTenantPath('posts'));
    const q = query(postsRef, where('status', '==', POST_STATUS_CODES.OPEN));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
  }
}
