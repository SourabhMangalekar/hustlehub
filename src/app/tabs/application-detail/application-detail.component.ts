import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService, Application } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { AlertController, ToastController } from '@ionic/angular';
import {
  ROLE_CODES,
  APPLICATION_STATUS_CODES,
  APP_ROUTES,
  getLabelForCity,
  getLabelForSubtype,
  getLabelForApplicationStatus
} from '../../core/master-data';

@Component({
  selector: 'app-application-detail',
  templateUrl: './application-detail.component.html',
  styleUrls: ['./application-detail.component.scss']
})
export class ApplicationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private db = inject(DatabaseService);
  private auth = inject(AuthService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  public application = signal<Application | null>(null);
  public isLoading = signal<boolean>(true);

  public currentUserId = signal<string | null>(null);
  public currentUserRole = signal<string | null>(null);

  // Template helpers
  readonly getLabelForCity = getLabelForCity;
  readonly getLabelForSubtype = getLabelForSubtype;
  readonly getLabelForApplicationStatus = getLabelForApplicationStatus;
  readonly APPLICATION_STATUS_CODES = APPLICATION_STATUS_CODES;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate([APP_ROUTES.HOME]);
      return;
    }
    await this.loadApplicationData(id);
  }

  private async loadApplicationData(applicationId: string) {
    this.isLoading.set(true);
    try {
      const appDoc = await this.db.getApplicationById(applicationId);
      this.application.set(appDoc);

      const user = this.auth.currentUser();
      if (user) {
        this.currentUserId.set(user.uid);
        const profile = await this.db.getUserProfile(user.uid);
        this.currentUserRole.set(profile?.system?.role ?? null);
      }
    } catch (e) {
      console.error('Error loading application details', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  get isPostOwnerView(): boolean {
    const a = this.application();
    // Demand side views the application for their post. (Note: we didn't track the postOwner ID explicitly 
    // inside the Application doc by default if it's not stored, but Supply role viewing this MUST be the applicantId)
    // Actually, we can check if the current user is NOT the applicant.
    if (!a || !this.currentUserId()) return false;
    return a.profile.applicantId !== this.currentUserId();
  }

  get isApplicantView(): boolean {
    const a = this.application();
    if (!a || !this.currentUserId()) return false;
    return a.profile.applicantId === this.currentUserId();
  }

  async setApplicationStatus(newStatus: string) {
    const a = this.application();
    if (!a || !a.id) return;

    this.isLoading.set(true);
    try {
      await this.db.updateApplicationStatus(a.id, newStatus as any);
      
      this.application.update(curr => {
        if (curr) curr.system.status = newStatus as any;
        return curr;
      });

      const t = await this.toastCtrl.create({
        message: 'Status updated',
        color: 'success',
        duration: 2000
      });
      t.present();
    } catch (e) {
      console.error(e);
      const t = await this.toastCtrl.create({
        message: 'Error updating status',
        color: 'danger',
        duration: 2000
      });
      t.present();
    } finally {
      this.isLoading.set(false);
    }
  }

  async confirmWithdraw() {
    const alert = await this.alertCtrl.create({
      header: 'Withdraw Application',
      message: 'Are you sure you want to withdraw your application?',
      buttons: [
         { text: 'Cancel', role: 'cancel' },
         { text: 'Withdraw', role: 'destructive', handler: () => this.setApplicationStatus(APPLICATION_STATUS_CODES.WITHDRAWN) }
      ]
    });
    await alert.present();
  }

  goBack() {
    // Basic back nav, real app would use ionic navcontroller logic
    this.router.navigate(['/']);
  }
}
