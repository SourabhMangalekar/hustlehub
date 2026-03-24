import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { TabsRoutingModule } from './tabs-routing.module';

import { TabsComponent } from './tabs/tabs.component';
import { HomeComponent } from './home/home.component';
import { PostComponent } from './post/post.component';
import { ApplicationsComponent } from './applications/applications.component';
import { ChatComponent } from './chat/chat.component';
import { ProfileComponent } from './profile/profile.component';

@NgModule({
  declarations: [
    TabsComponent,
    HomeComponent,
    PostComponent,
    ApplicationsComponent,
    ChatComponent,
    ProfileComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TabsRoutingModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class TabsModule {}