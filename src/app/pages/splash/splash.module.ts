import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { SplashRoutingModule } from './splash-routing.module';
import { SplashComponent } from './splash.component';

@NgModule({
  declarations: [SplashComponent],
  imports: [
    CommonModule,
    IonicModule,
    SplashRoutingModule
  ]
})
export class SplashModule { }
