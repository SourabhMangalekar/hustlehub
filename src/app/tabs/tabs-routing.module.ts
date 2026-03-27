import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsComponent } from './tabs/tabs.component';
import { HomeComponent } from './home/home.component';
import { PostComponent } from './post/post.component';
import { ApplicationsComponent } from './applications/applications.component';
import { ChatComponent } from './chat/chat.component';
import { ProfileComponent } from './profile/profile.component';
import { OnboardingComponent } from '../pages/onboarding/onboarding.component';
import { PostDetailComponent } from './post-detail/post-detail.component';
import { ApplicationDetailComponent } from './application-detail/application-detail.component';

const routes: Routes = [
  {
    path: '',
    component: TabsComponent,
    children: [
      { path: 'home', component: HomeComponent },
      { path: 'post', component: PostComponent },
      { path: 'applications', component: ApplicationsComponent },
      { path: 'applications/:postId', component: ApplicationsComponent },
      { path: 'chat', component: ChatComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'onboarding', component: OnboardingComponent },
      { path: 'post-detail/:id', component: PostDetailComponent },
      { path: 'application-detail/:id', component: ApplicationDetailComponent },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsRoutingModule {}