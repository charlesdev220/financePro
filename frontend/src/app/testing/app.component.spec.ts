import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { AppComponent } from '../app.component';
import { routes } from '../app.routes';

describe('AppComponent', () => {
  let spectator: Spectator<AppComponent>;

  const createComponent = createComponentFactory({
    component: AppComponent,
    providers: [
      provideRouter(routes),
      provideIonicAngular(),
    ],
  });

  beforeEach(() => {
    spectator = createComponent();
  });

  it('should create the app', () => {
    expect(spectator.component).toBeTruthy();
  });
});
