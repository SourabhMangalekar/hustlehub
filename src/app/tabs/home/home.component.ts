import { Component, OnInit, inject, signal } from '@angular/core';
import { DatabaseService, Post } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private db = inject(DatabaseService);
  public auth = inject(AuthService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  
  public posts = signal<Post[]>([]);
  public isLoading = signal<boolean>(true);

  async ngOnInit() {
    await this.loadPosts();
  }

  async loadPosts() {
    this.isLoading.set(true);
    try {
      const recentPosts = await this.db.getRecentPosts();
      this.posts.set(recentPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async applyToPost(post: Post) {
    const user = this.auth.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    const profile = await this.db.getUserProfile(user.uid);
    if (!profile || profile.role === 'unassigned') {
      const toast = await this.toastController.create({
        message: '⚡ Complete your profile first to apply!',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      toast.present();
      this.router.navigate(['/tabs/onboarding']);
      return;
    }
    // TODO: open application modal / navigate to application flow
    console.log('Applying to post:', post.id);
  }

  doRefresh(event: any) {
    this.loadPosts().then(() => {
      event.target.complete();
    });
  }
}
