import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent {
  signupForm: FormGroup;
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  isLoading = false;

  constructor() {
    this.signupForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onSignup() {
    if (this.signupForm.valid) {
      this.isLoading = true;
      try {
        await this.authService.register(this.signupForm.value);
        this.router.navigate(['/tabs'], { replaceUrl: true });
      } catch (error: any) {
        const toast = await this.toastController.create({
          message: error.message || 'Signup failed',
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
