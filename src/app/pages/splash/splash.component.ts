import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss']
})
export class SplashComponent implements OnInit {
  private router = inject(Router);
  private authService = inject(AuthService);

  constructor() {}

  ngOnInit(): void {
    setTimeout(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.router.navigate(['/tabs'], { replaceUrl: true });
      } else {
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    }, 2500);
  }
}
