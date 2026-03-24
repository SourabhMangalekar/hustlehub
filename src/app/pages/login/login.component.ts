import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  isLoading = false;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onLogin() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      try {
        await this.authService.login(this.loginForm.value);
        this.router.navigate(['/tabs'], { replaceUrl: true });
      } catch (error: any) {
        const toast = await this.toastController.create({
          message: error.message || 'Login failed',
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
