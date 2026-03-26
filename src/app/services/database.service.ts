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

// ─────────────────────────────────────────────────────────────
// USER DOCUMENT  (apps/HUSTLEHUB/users/{uid})
// ─────────────────────────────────────────────────────────────
export interface UserProfile {
  profile: {
    name: string;
    phone?: string;
    email?: string;
    city?: string;
    bio?: string;
    profileImage?: string;
  };

  meta: {
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
  };

  stats: {
    rating: number;
    reviewCount: number;
    completedJobs: number;
    totalJobs: number;
  };

  system: {
    uid: string;
    role: UserRole;
    roleSubtype?: UserRoleSubtype;
    status: UserStatus;
    createdAt: number;
    updatedAt: number;
  };
}

// ─────────────────────────────────────────────────────────────
// POST DOCUMENT  (apps/HUSTLEHUB/posts/{postId})
// ─────────────────────────────────────────────────────────────
export interface Post {
  id?: string;

  profile: {
    title: string;
    description: string;
    budget: string;
    city?: string;
    roleSubtypeRequired?: string;
  };

  meta: {
    platform?: string;
    deliverables?: string;
    eventDate?: string;
    additionalRequirements?: string;
  };

  stats: {
    applicationCount: number;
    viewCount: number;
  };

  system: {
    createdBy: string;
    status: PostStatus;
    createdAt: number;
    updatedAt: number;
  };
}

// ─────────────────────────────────────────────────────────────
// APPLICATION DOCUMENT  (apps/HUSTLEHUB/applications/{id})
// ─────────────────────────────────────────────────────────────
export interface Application {
  id?: string;

  profile: {
    postId: string;
    applicantId: string;
    applicantRoleSubtype?: string;
    message?: string;
    priceQuoted?: number;
  };

  meta: {
    attachments?: string[];
    portfolioLinks?: string[];
  };

  system: {
    status: 'APPLICATION_STATUS.PENDING' | 'APPLICATION_STATUS.ACCEPTED' | 'APPLICATION_STATUS.REJECTED' | 'APPLICATION_STATUS.WITHDRAWN';
    createdAt: number;
    updatedAt: number;
  };
}

// ─────────────────────────────────────────────────────────────
// REVIEW DOCUMENT  (apps/HUSTLEHUB/reviews/{id})
// ─────────────────────────────────────────────────────────────
export interface Review {
  id?: string;

  profile: {
    fromUserId: string;
    toUserId: string;
    postId: string;
    rating: number;
    comment?: string;
  };

  system: {
    createdAt: number;
  };
}

// ─────────────────────────────────────────────────────────────
// NOTIFICATION DOCUMENT  (apps/HUSTLEHUB/notifications/{id})
// ─────────────────────────────────────────────────────────────
export interface Notification {
  id?: string;

  profile: {
    userId: string;
    title: string;
    message: string;
    type: 'NOTIFICATION_TYPE.APPLICATION' | 'NOTIFICATION_TYPE.CHAT' | 'NOTIFICATION_TYPE.SYSTEM';
  };

  system: {
    isRead: boolean;
    createdAt: number;
  };
}

// ─────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────
@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db = getFirestore(getApp());
  public readonly APP_CONTEXT = APP_CONTEXT;

  constructor() {}

  /** Strictly enforces multi-tenant paths: apps/{APP_CONTEXT}/{collection} */
  private getTenantPath(collectionName: string): string {
    return `apps/${this.APP_CONTEXT}/${collectionName}`;
  }

  // ─── USERS ─────────────────────────────────────────────────

  async createUserProfile(uid: string, data: { name: string; email?: string; phone?: string }) {
    const userRef = doc(this.db, this.getTenantPath('users'), uid);
    const now = Date.now();

    const newUser: UserProfile = {
      profile: {
        name: data.name,
        email: data.email,
        phone: data.phone
      },
      meta: {},
      stats: {
        rating: 0,
        reviewCount: 0,
        completedJobs: 0,
        totalJobs: 0
      },
      system: {
        uid,
        role: ROLE_CODES.UNASSIGNED,
        status: USER_STATUS_CODES.ACTIVE,
        createdAt: now,
        updatedAt: now
      }
    };
    return setDoc(userRef, newUser);
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userRef = doc(this.db, this.getTenantPath('users'), uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? (snap.data() as UserProfile) : null;
  }

  async updateUserProfile(uid: string, data: Record<string, any>) {
    const userRef = doc(this.db, this.getTenantPath('users'), uid);
    return updateDoc(userRef, { ...data, 'system.updatedAt': Date.now() });
  }

  // ─── POSTS ─────────────────────────────────────────────────

  async createPost(data: { title: string; description: string; budget: string; city?: string; createdBy: string }) {
    const postsRef = collection(this.db, this.getTenantPath('posts'));
    const now = Date.now();

    const newPost: Omit<Post, 'id'> = {
      profile: {
        title: data.title,
        description: data.description,
        budget: data.budget,
        city: data.city
      },
      meta: {},
      stats: {
        applicationCount: 0,
        viewCount: 0
      },
      system: {
        createdBy: data.createdBy,
        status: POST_STATUS_CODES.OPEN,
        createdAt: now,
        updatedAt: now
      }
    };
    return addDoc(postsRef, newPost);
  }

  async getRecentPosts(): Promise<Post[]> {
    const postsRef = collection(this.db, this.getTenantPath('posts'));
    const q = query(postsRef, where('system.status', '==', POST_STATUS_CODES.OPEN));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Post));
  }

  // ─── APPLICATIONS (stub) ───────────────────────────────────

  async createApplication(data: Omit<Application, 'id'>) {
    const ref = collection(this.db, this.getTenantPath('applications'));
    return addDoc(ref, data);
  }

  async getApplicationsForPost(postId: string): Promise<Application[]> {
    const ref = collection(this.db, this.getTenantPath('applications'));
    const q = query(ref, where('profile.postId', '==', postId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Application));
  }

  // ─── REVIEWS (stub) ────────────────────────────────────────

  async createReview(data: Omit<Review, 'id'>) {
    const ref = collection(this.db, this.getTenantPath('reviews'));
    return addDoc(ref, data);
  }

  // ─── NOTIFICATIONS (stub) ──────────────────────────────────

  async getNotifications(userId: string): Promise<Notification[]> {
    const ref = collection(this.db, this.getTenantPath('notifications'));
    const q = query(ref, where('profile.userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
  }
}
