import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService, Post } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { AlertController, ToastController } from '@ionic/angular';
import {
  ROLE_CODES,
  APP_ROUTES,
  getLabelForCity,
  getLabelForPostStatus,
  getLabelForSubtype,
  POST_STATUS_CODES
} from '../../core/master-data';

@Component({
  selector: 'app-post-detail',
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.scss']
})
export class PostDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private db = inject(DatabaseService);
  private auth = inject(AuthService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  public post = signal<Post | null>(null);
  public isLoading = signal<boolean>(true);
  
  public currentUserId = signal<string | null>(null);
  public currentUserRole = signal<string | null>(null);
  
  // State for supply users
  public hasApplied = signal<boolean>(false);
  
  // Template helpers
  readonly getLabelForCity       = getLabelForCity;
  readonly getLabelForPostStatus = getLabelForPostStatus;
  readonly getLabelForSubtype    = getLabelForSubtype;
  readonly ROLE_CODES            = ROLE_CODES;
  readonly POST_STATUS_CODES     = POST_STATUS_CODES;

  async ngOnInit() {
    const postId = this.route.snapshot.paramMap.get('id');
    if (!postId) {
      this.router.navigate([APP_ROUTES.HOME]);
      return;
    }
    await this.loadPostAndUser(postId);
  }

  private async loadPostAndUser(postId: string) {
    this.isLoading.set(true);
    try {
      // Load Post
      const p = await this.db.getPostById(postId);
      this.post.set(p);

      if (!p) return;

      // Load User context
      const user = this.auth.currentUser();
      if (user) {
        this.currentUserId.set(user.uid);
        const profile = await this.db.getUserProfile(user.uid);
        const role = profile?.system?.role || (profile as any)?.role || null;
        this.currentUserRole.set(role);

        // If supply user, check if already applied
        if (role === ROLE_CODES.SUPPLY) {
          const applied = await this.db.hasApplied(p.id!, user.uid);
          this.hasApplied.set(applied);
        }
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  isPostOwner(): boolean {
    const p = this.post();
    if (!p) return false;
    const ownerId = p.system?.createdBy || (p.profile as any)?.userId;
    return ownerId === this.currentUserId();
  }

  getPostStatus(): string {
    const p = this.post();
    if (!p) return '';
    return p.system?.status || (p as any).status || this.POST_STATUS_CODES.OPEN;
  }

  async viewApplications() {
    const p = this.post();
    if (!p) return;
    // Route to applications list for this post
    this.router.navigate(['/tabs/applications', p.id]);
  }

  async markAsCompleted() {
    // TODO: implement logic to mark post as completed
    const toast = await this.toastCtrl.create({
      message: 'Feature coming soon',
      duration: 2000
    });
    toast.present();
  }

  async applyForJob() {
    const userRole = this.currentUserRole();
    if (userRole === ROLE_CODES.UNASSIGNED || !userRole) {
      const toast = await this.toastCtrl.create({
        message: '⚡ Complete your profile first to apply!',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      toast.present();
      this.router.navigate([APP_ROUTES.ONBOARDING]);
      return;
    }

    const p = this.post();
    const user = this.auth.currentUser();
    if (!p || !user || !p.id) return;

    const alert = await this.alertCtrl.create({
      header: 'Apply for Job',
      message: 'Add a message for the post owner (optional)',
      inputs: [
        {
          name: 'message',
          type: 'textarea',
          placeholder: 'Why are you a good fit?'
        },
        {
          name: 'priceQuoted',
          type: 'number',
          placeholder: 'Quote your price (optional)'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Submit Application',
          handler: async (data) => {
            const profile = await this.db.getUserProfile(user.uid);
            if (!profile) return;
            
            this.isLoading.set(true);
            try {
              await this.db.applyToPost({
                postId: p.id!,
                postTitle: p.profile.title,
                postOwnerId: p.system.createdBy,
                applicant: profile,
                message: data.message,
                priceQuoted: data.priceQuoted ? Number(data.priceQuoted) : undefined
              });
              
              this.hasApplied.set(true);
              
              // Increment local count for UI update
              this.post.update(post => {
                if(post) {
                  post.stats.applicationCount++;
                }
                return post;
              });

              const toast = await this.toastCtrl.create({
                message: 'Application submitted successfully!',
                duration: 2000,
                color: 'success'
              });
              toast.present();
            } catch (err) {
              console.error(err);
              const toast = await this.toastCtrl.create({
                message: 'Error submitting application.',
                duration: 2000,
                color: 'danger'
              });
              toast.present();
            } finally {
              this.isLoading.set(false);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  goBack() {
    this.router.navigate([APP_ROUTES.HOME]);
  }
}
