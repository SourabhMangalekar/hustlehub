import { Component, OnInit, inject, signal } from '@angular/core';
import { DatabaseService, Post } from '../../services/database.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private db = inject(DatabaseService);
  public auth = inject(AuthService);
  
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

  doRefresh(event: any) {
    this.loadPosts().then(() => {
      event.target.complete();
    });
  }
}
