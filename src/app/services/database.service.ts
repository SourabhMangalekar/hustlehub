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
  updateDoc,
  increment,
  writeBatch,
  limit,
  orderBy,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { getApp } from 'firebase/app';
import {
  APP_CONTEXT,
  UserRole,
  UserRoleSubtype,
  UserStatus,
  PostStatus,
  ApplicationStatus,
  ROLE_CODES,
  POST_STATUS_CODES,
  USER_STATUS_CODES,
  APPLICATION_STATUS_CODES,
  PAGE_SIZE
} from '../core/master-data';

// ─────────────────────────────────────────────────────────────
// PAGINATION TYPES
// ─────────────────────────────────────────────────────────────
export type PageCursor = QueryDocumentSnapshot<DocumentData>;

export interface PaginatedResult<T> {
  items: T[];
  /** Pass this as cursor to the next call to get the next page. Null = no more pages. */
  nextCursor: PageCursor | null;
}

// Re-export types so existing imports from this service still work
export type { UserRole, UserRoleSubtype, UserStatus, PostStatus, ApplicationStatus };

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
// APPLICATION DOCUMENT  (apps/HUSTLEHUB/applications/{postId_applicantId})
//
// applicationId = postId + "_" + applicantId  → prevents duplicates
// applicantSnapshot → avoids extra user reads (denormalization)
// ─────────────────────────────────────────────────────────────
export interface ApplicantSnapshot {
  name: string;
  profileImage?: string;
  city?: string;
  roleSubtype?: string;
  rating: number;
  reviewCount: number;
  followers?: number;
}

export interface Application {
  id?: string;

  profile: {
    postId: string;
    postTitle: string;
    postOwnerId: string;
    applicantId: string;
    applicantSnapshot: ApplicantSnapshot;
    message?: string;
    priceQuoted?: number;
  };

  meta: {
    attachments?: string[];
    portfolioLinks?: string[];
  };

  system: {
    status: ApplicationStatus;
    statusUpdatedAt: number;
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
export type NotificationType =
  | 'NOTIFICATION_TYPE.APPLICATION'
  | 'NOTIFICATION_TYPE.CHAT'
  | 'NOTIFICATION_TYPE.SYSTEM';

export interface Notification {
  id?: string;

  profile: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
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
        ...(data.email && { email: data.email }),
        ...(data.phone && { phone: data.phone })
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

  /** Supports Firestore dot-notation for partial nested updates e.g. 'system.role' */
  async updateUserProfile(uid: string, data: Record<string, any>) {
    const userRef = doc(this.db, this.getTenantPath('users'), uid);
    return updateDoc(userRef, { ...data, 'system.updatedAt': Date.now() });
  }

  // ─── POSTS ─────────────────────────────────────────────────

  async createPost(data: {
    title: string;
    description: string;
    budget: string;
    city?: string;
    createdBy: string;
  }) {
    const postsRef = collection(this.db, this.getTenantPath('posts'));
    const now = Date.now();

    const newPost: Omit<Post, 'id'> = {
      profile: {
        title: data.title,
        description: data.description,
        budget: data.budget,
        ...(data.city && { city: data.city })
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

  async getPostById(postId: string): Promise<Post | null> {
    const postRef = doc(this.db, this.getTenantPath('posts'), postId);
    const snap = await getDoc(postRef);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Post) : null;
  }

  async getRecentPosts(cursor?: PageCursor | null): Promise<PaginatedResult<Post>> {
    const postsRef = collection(this.db, this.getTenantPath('posts'));
    const constraints: any[] = [
      where('system.status', '==', POST_STATUS_CODES.OPEN),
      limit(PAGE_SIZE)
    ];
    if (cursor) constraints.push(startAfter(cursor));
    const snap = await getDocs(query(postsRef, ...constraints));
    return {
      items: snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)),
      nextCursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] as PageCursor : null
    };
  }

  async getMyPosts(uid: string, cursor?: PageCursor | null): Promise<PaginatedResult<Post>> {
    const postsRef = collection(this.db, this.getTenantPath('posts'));
    const constraints: any[] = [
      where('system.createdBy', '==', uid),
      limit(PAGE_SIZE)
    ];
    if (cursor) constraints.push(startAfter(cursor));
    const snap = await getDocs(query(postsRef, ...constraints));
    return {
      items: snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)),
      nextCursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] as PageCursor : null
    };
  }

  // ─── APPLICATIONS ──────────────────────────────────────────

  /**
   * Apply to a post.
   * Uses deterministic applicationId = postId_applicantId to prevent duplicates.
   * Atomically:
   *  1. Creates the application document
   *  2. Increments post.stats.applicationCount
   *  3. Creates a notification for the post owner
   */
  async applyToPost(params: {
    postId: string;
    postTitle: string;
    postOwnerId: string;
    applicant: UserProfile;
    message?: string;
    priceQuoted?: number;
    portfolioLinks?: string[];
  }): Promise<void> {
    const { postId, postTitle, postOwnerId, applicant, message, priceQuoted, portfolioLinks } = params;
    const applicantId = applicant.system.uid;
    const applicationId = `${postId}_${applicantId}`;
    const now = Date.now();

    // Build applicant snapshot — only display data, no full profile copy
    const applicantSnapshot: ApplicantSnapshot = {
      name:          applicant.profile.name,
      rating:        applicant.stats.rating,
      reviewCount:   applicant.stats.reviewCount,
      ...(applicant.profile.profileImage && { profileImage: applicant.profile.profileImage }),
      ...(applicant.profile.city && { city: applicant.profile.city }),
      ...(applicant.system.roleSubtype && { roleSubtype: applicant.system.roleSubtype }),
      ...(applicant.meta.social?.followers && { followers: applicant.meta.social.followers })
    };

    const applicationData: Omit<Application, 'id'> = {
      profile: {
        postId,
        postTitle,
        postOwnerId,
        applicantId,
        applicantSnapshot,
        ...(message && { message }),
        ...(priceQuoted !== undefined && { priceQuoted })
      },
      meta: {
        portfolioLinks: portfolioLinks ?? []
      },
      system: {
        status:          APPLICATION_STATUS_CODES.PENDING,
        statusUpdatedAt: now,
        createdAt:       now,
        updatedAt:       now
      }
    };

    // Notification document for the post owner
    const notificationData: Omit<Notification, 'id'> = {
      profile: {
        userId:  postOwnerId,
        title:   'New Application Received',
        message: `${applicant.profile.name} applied to your post "${postTitle}"`,
        type:    'NOTIFICATION_TYPE.APPLICATION'
      },
      system: {
        isRead:    false,
        createdAt: now
      }
    };

    // Batch write: application + post counter increment + notification
    const batch = writeBatch(this.db);

    const appRef = doc(this.db, this.getTenantPath('applications'), applicationId);
    batch.set(appRef, applicationData);

    const postRef = doc(this.db, this.getTenantPath('posts'), postId);
    batch.update(postRef, { 'stats.applicationCount': increment(1) });

    const notifRef = doc(collection(this.db, this.getTenantPath('notifications')));
    batch.set(notifRef, notificationData);

    await batch.commit();
  }


  async getApplicationsForPost(postId: string, cursor?: PageCursor | null): Promise<PaginatedResult<Application>> {
    const ref = collection(this.db, this.getTenantPath('applications'));
    const constraints: any[] = [
      where('profile.postId', '==', postId),
      limit(PAGE_SIZE)
    ];
    if (cursor) constraints.push(startAfter(cursor));
    const snap = await getDocs(query(ref, ...constraints));
    return {
      items: snap.docs.map(d => ({ id: d.id, ...d.data() } as Application)),
      nextCursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] as PageCursor : null
    };
  }

  async getApplicationsForOwner(ownerId: string, cursor?: PageCursor | null): Promise<PaginatedResult<Application>> {
    const ref = collection(this.db, this.getTenantPath('applications'));
    const constraints: any[] = [
      where('profile.postOwnerId', '==', ownerId),
      limit(PAGE_SIZE)
    ];
    if (cursor) constraints.push(startAfter(cursor));
    const snap = await getDocs(query(ref, ...constraints));
    return {
      items: snap.docs.map(d => ({ id: d.id, ...d.data() } as Application)),
      nextCursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] as PageCursor : null
    };
  }

  async getMyApplications(applicantId: string, cursor?: PageCursor | null): Promise<PaginatedResult<Application>> {
    const ref = collection(this.db, this.getTenantPath('applications'));
    const constraints: any[] = [
      where('profile.applicantId', '==', applicantId),
      limit(PAGE_SIZE)
    ];
    if (cursor) constraints.push(startAfter(cursor));
    const snap = await getDocs(query(ref, ...constraints));
    return {
      items: snap.docs.map(d => ({ id: d.id, ...d.data() } as Application)),
      nextCursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] as PageCursor : null
    };
  }

  async getApplicationById(applicationId: string): Promise<Application | null> {
    const appRef = doc(this.db, this.getTenantPath('applications'), applicationId);
    const snap = await getDoc(appRef);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Application) : null;
  }

  /**
   * Check if user has already applied to a post.
   * Uses deterministic ID — no extra Firestore read.
   */
  async hasApplied(postId: string, applicantId: string): Promise<boolean> {
    const applicationId = `${postId}_${applicantId}`;
    const appRef = doc(this.db, this.getTenantPath('applications'), applicationId);
    const snap = await getDoc(appRef);
    return snap.exists();
  }

  /** Update application status (accept / reject / withdraw) */
  async updateApplicationStatus(applicationId: string, status: ApplicationStatus): Promise<void> {
    const appRef = doc(this.db, this.getTenantPath('applications'), applicationId);
    const now = Date.now();
    return updateDoc(appRef, {
      'system.status':          status,
      'system.statusUpdatedAt': now,
      'system.updatedAt':       now
    });
  }

  // ─── REVIEWS ───────────────────────────────────────────────

  async createReview(data: Omit<Review, 'id'>) {
    const ref = collection(this.db, this.getTenantPath('reviews'));
    return addDoc(ref, data);
  }

  // ─── NOTIFICATIONS ─────────────────────────────────────────

  async getNotifications(userId: string, cursor?: PageCursor | null): Promise<PaginatedResult<Notification>> {
    const ref = collection(this.db, this.getTenantPath('notifications'));
    const constraints: any[] = [
      where('profile.userId', '==', userId),
      limit(PAGE_SIZE)
    ];
    if (cursor) constraints.push(startAfter(cursor));
    const snap = await getDocs(query(ref, ...constraints));
    return {
      items: snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)),
      nextCursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] as PageCursor : null
    };
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const ref = doc(this.db, this.getTenantPath('notifications'), notificationId);
    return updateDoc(ref, { 'system.isRead': true });
  }
}
