import { Component } from '@angular/core';
import { APP_CONTEXT } from './core/master-data';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor() {
    document.body.classList.add(`theme-${APP_CONTEXT.toLowerCase()}`);
  }
}
