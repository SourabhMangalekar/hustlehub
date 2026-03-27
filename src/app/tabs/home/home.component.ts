import { Component, OnInit, inject, signal } from '@angular/core';
import { DatabaseService, Post, Application, PageCursor } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import {
  ROLE_CODES,
  APP_ROUTES,
  getLabelForCity,
  getLabelForPostStatus,
  getLabelForSubtype
} from '../../core/master-data';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private db    = inject(DatabaseService);
  public auth   = inject(AuthService);
  private router = inject(Router);

  public posts       = signal<Post[]>([]);
  public myItems     = signal<(Post | Application)[]>([]);
  public isLoading   = signal<boolean>(true);
  public isLoadingMore = signal<boolean>(false);
  public activeTab   = signal<'all' | 'my'>('all');
  public hasMore     = signal<boolean>(false);

  private nextCursor: PageCursor | null = null;

  // Expose label helpers to template
  readonly getLabelForCity       = getLabelForCity;
  readonly getLabelForPostStatus = getLabelForPostStatus;
  readonly getLabelForSubtype    = getLabelForSubtype;
  readonly ROLE_CODES            = ROLE_CODES;

  // Current user role (cached after first load)
  public userRole = signal<string | null>(null);

  async ngOnInit() {
    await this.loadUserRole();
    await this.loadAll();
  }

  private async loadUserRole() {
    const user = this.auth.currentUser();
    if (!user) return;
    const profile = await this.db.getUserProfile(user.uid);
    this.userRole.set(profile?.system?.role ?? null);
  }

  async switchTab(tab: 'all' | 'my') {
    this.activeTab.set(tab);
    await this.loadAll();
  }

  async loadAll(append = false) {
    if (append) {
      this.isLoadingMore.set(true);
    } else {
      this.isLoading.set(true);
      this.nextCursor = null;
      this.posts.set([]);
      this.myItems.set([]);
    }
    try {
      if (this.activeTab() === 'all') {
        const result = await this.db.getRecentPosts(this.nextCursor);
        this.posts.update(p => [...p, ...result.items]);
        this.nextCursor = result.nextCursor;
        this.hasMore.set(result.nextCursor !== null);
      } else {
        await this.loadMyItems(append);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading.set(false);
      this.isLoadingMore.set(false);
    }
  }

  private async loadMyItems(append = false) {
    const user = this.auth.currentUser();
    if (!user) {
      console.warn('[Home] loadMyItems: no user logged in');
      return;
    }

    // Re-fetch live from Firestore (don't rely on cached signal)
    const profile = await this.db.getUserProfile(user.uid);
    const role = profile?.system?.role ?? null;
    this.userRole.set(role);

    console.log('[Home] loadMyItems for role:', role);

    if (role === ROLE_CODES.SUPPLY) {
      // Supply: see my submitted applications
      const result = await this.db.getMyApplications(user.uid, this.nextCursor);
      console.log('[Home] myApplications:', result.items.length);
      this.myItems.update(a => append ? [...a, ...result.items] : result.items);
      this.nextCursor = result.nextCursor;
      this.hasMore.set(result.nextCursor !== null);
    } else {
      // Demand (or unassigned): see posts created by this user
      const result = await this.db.getMyPosts(user.uid, this.nextCursor);
      console.log('[Home] myPosts:', result.items.length);
      this.myItems.update(p => append ? [...p, ...result.items] : result.items);
      this.nextCursor = result.nextCursor;
      this.hasMore.set(result.nextCursor !== null);
    }
  }

  /** Load next page */
  loadMore() {
    if (this.nextCursor) this.loadAll(true);
  }

  /** Navigate to Post Detail */
  goToPost(post: Post) {
    this.router.navigate([APP_ROUTES.POST_DETAIL, post.id]);
  }

  /** Navigate to Post Detail from an application */
  goToApplicationPost(app: Application) {
    this.router.navigate([APP_ROUTES.POST_DETAIL, app.profile.postId]);
  }

  isPost(item: Post | Application): item is Post {
    return !!(item as Post).profile?.title;
  }

  isApplication(item: Post | Application): item is Application {
    return !!(item as Application).profile?.applicantId;
  }

  doRefresh(event: any) {
    this.loadAll().then(() => event.target.complete());
  }
}
