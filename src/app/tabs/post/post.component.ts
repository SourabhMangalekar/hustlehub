import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatabaseService } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { CITIES, CITY_CODES, ROLE_CODES, APP_ROUTES } from '../../core/master-data';

@Component({
  selector: 'app-post',
  templateUrl: './post.component.html',
  styleUrls: ['./post.component.scss']
})
export class PostComponent {
  postForm: FormGroup;
  private fb = inject(FormBuilder);
  private db = inject(DatabaseService);
  public auth = inject(AuthService);
  private toastController = inject(ToastController);
  private router = inject(Router);
  
  isLoading = false;

  // Expose to template
  public readonly CITIES = CITIES;

  constructor() {
    this.postForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      budget: ['', Validators.required],
      city: [CITY_CODES.REMOTE]
    });
  }

  async onPost() {
    if (this.postForm.valid) {
      this.isLoading = true;
      try {
        const user = this.auth.currentUser();
        if (!user) throw new Error('Must be logged in to post');

        // Role gate: unassigned users must complete profile first
        const profile = await this.db.getUserProfile(user.uid);
        if (!profile || profile.role === ROLE_CODES.UNASSIGNED) {
          const toast = await this.toastController.create({
            message: '⚡ Complete your profile first to post a requirement!',
            duration: 3000,
            color: 'warning',
            position: 'top'
          });
          toast.present();
          this.router.navigate([APP_ROUTES.ONBOARDING]);
          this.isLoading = false;
          return;
        }
        
        await this.db.createPost({
          ...this.postForm.value,
          createdBy: user.uid
        });

        const toast = await this.toastController.create({
          message: 'Collaboration requested successfully!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        toast.present();
        
        this.postForm.reset({ city: CITY_CODES.REMOTE });
        this.router.navigate([APP_ROUTES.HOME]);
      } catch (error: any) {
        // Safe to ignore minor console UI errors if any
        const toast = await this.toastController.create({
          message: error.message || 'Failed to create post',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        toast.present();
      } finally {
        this.isLoading = false;
      }
    }
  }
}
