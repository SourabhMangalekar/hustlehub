import { Component, OnInit, inject, signal } from '@angular/core';
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
  public isPostOwnerView = signal<boolean>(false);
  public postId = signal<string | null>(null);

  // Expose label helpers
  readonly getLabelForCity = getLabelForCity;
  readonly getLabelForSubtype = getLabelForSubtype;
  readonly getLabelForApplicationStatus = getLabelForApplicationStatus;

  async ngOnInit() {
    // Route can either be /tabs/applications (my applications) 
    // or /tabs/applications/:postId (post owner viewing applicants)
    const pId = this.route.snapshot.paramMap.get('postId');
    if (pId) {
      this.postId.set(pId);
      this.isPostOwnerView.set(true);
    } else {
      this.isPostOwnerView.set(false);
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

      if (this.isPostOwnerView()) {
        const pId = this.postId();
        if (!pId) return;
        result = await this.db.getApplicationsForPost(pId, this.nextCursor);
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
    if (this.isPostOwnerView()) {
      this.router.navigate([APP_ROUTES.POST_DETAIL, this.postId()]);
    } else {
      this.router.navigate([APP_ROUTES.HOME]);
    }
  }
}
