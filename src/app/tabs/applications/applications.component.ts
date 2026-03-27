import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService, Application, PageCursor, PaginatedResult } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import {
  ROLE_CODES,
  APP_ROUTES,
  getLabelForCity,
  getLabelForSubtype,
  getLabelForApplicationStatus
} from '../../core/master-data';

@Component({
  selector: 'app-applications',
  templateUrl: './applications.component.html',
  styleUrls: ['./applications.component.scss']
})
export class ApplicationsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private db = inject(DatabaseService);
  private auth = inject(AuthService);

  public applications = signal<Application[]>([]);
  public isLoading = signal<boolean>(true);
  public isLoadingMore = signal<boolean>(false);
  public hasMore = signal<boolean>(false);
  private nextCursor: PageCursor | null = null;

  // View modes
  public viewMode = signal<'forPost' | 'myApplications' | 'ownerGlobal'>('myApplications');
  public postId = signal<string | null>(null);

  // Grouped computed signal for ownerGlobal mode
  public groupedApplications = computed(() => {
    const apps = this.applications();
    const groups = new Map<string, { postId: string, postTitle: string, applications: Application[] }>();
    
    for (const app of apps) {
      const pId = app.profile.postId;
      if (!groups.has(pId)) {
        groups.set(pId, { postId: pId, postTitle: app.profile.postTitle, applications: [] });
      }
      groups.get(pId)!.applications.push(app);
    }
    return Array.from(groups.values());
  });

  // Expose label helpers
  readonly getLabelForCity = getLabelForCity;
  readonly getLabelForSubtype = getLabelForSubtype;
  readonly getLabelForApplicationStatus = getLabelForApplicationStatus;

  async ngOnInit() {
    const pId = this.route.snapshot.paramMap.get('postId');
    
    // Determine view mode before loading
    const user = this.auth.currentUser();
    if (user) {
      const profile = await this.db.getUserProfile(user.uid);
      if (pId) {
        this.postId.set(pId);
        this.viewMode.set('forPost');
      } else if (profile?.system?.role === ROLE_CODES.DEMAND) {
        this.viewMode.set('ownerGlobal');
      } else {
        this.viewMode.set('myApplications');
      }
    }

    await this.loadApplications();
  }

  async loadApplications(append = false) {
    if (append) {
      this.isLoadingMore.set(true);
    } else {
      this.isLoading.set(true);
      this.nextCursor = null;
      this.applications.set([]);
    }

    try {
      const user = this.auth.currentUser();
      if (!user) {
        this.router.navigate([APP_ROUTES.LOGIN]);
        return;
      }

      let result: PaginatedResult<Application>;

      const mode = this.viewMode();

      if (mode === 'forPost') {
        const pId = this.postId();
        if (!pId) return;
        result = await this.db.getApplicationsForPost(pId, this.nextCursor);
      } else if (mode === 'ownerGlobal') {
        result = await this.db.getApplicationsForOwner(user.uid, this.nextCursor);
      } else {
        result = await this.db.getMyApplications(user.uid, this.nextCursor);
      }

      this.applications.update(apps => append ? [...apps, ...result.items] : result.items);
      this.nextCursor = result.nextCursor;
      this.hasMore.set(result.nextCursor !== null);
    } catch (e) {
      console.error('Error loading applications:', e);
    } finally {
      this.isLoading.set(false);
      this.isLoadingMore.set(false);
    }
  }

  loadMore() {
    if (this.nextCursor) this.loadApplications(true);
  }

  viewApplicationDetail(app: Application) {
    this.router.navigate([APP_ROUTES.APPLICATION_DETAIL, app.id]);
  }

  doRefresh(event: any) {
    this.loadApplications().then(() => event.target.complete());
  }

  goBack() {
    if (this.viewMode() === 'forPost') {
      this.router.navigate([APP_ROUTES.POST_DETAIL, this.postId()]);
    } else {
      this.router.navigate([APP_ROUTES.HOME]);
    }
  }
}
