import { Component, inject, OnInit } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { Platform } from '@ionic/angular';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { DatabaseService } from './core/services/database/database.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private platform = inject(Platform);
  private databaseService = inject(DatabaseService);
  constructor() {}

  async ngOnInit() {
    this.initDB();

    // 1. Kiểm tra cài đặt Theme đã lưu
    const { value } = await Preferences.get({ key: 'theme_dark_mode' });
    const isDark = value === 'true';
    // 2. Áp dụng Theme
    document.body.classList.toggle('dark', isDark);

    await SplashScreen.hide();
  }

  private initDB() {
    this.platform.ready().then(async () => {
      await this.databaseService.init();
    });
  }
}
