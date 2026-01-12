import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { Platform } from '@ionic/angular';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { filter } from 'rxjs/operators';
import { DatabaseService } from './core/services/database/database.service';

@Component({
  selector: 'app-root',
  template: `<ion-app>
    <ion-router-outlet></ion-router-outlet>
  </ion-app> `,
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  private platform = inject(Platform);
  private databaseService = inject(DatabaseService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  constructor() {
    // Kích hoạt fix lỗi focus ngay khi App khởi tạo
    this.fixFocusOnNavigation();
  }

  async ngOnInit() {
    this.initDB();

    // 1. Kiểm tra cài đặt Theme đã lưu
    const { value } = await Preferences.get({ key: 'theme_dark_mode' });
    const isDark = value === 'true';

    // 2. Áp dụng Theme
    document.body.classList.toggle('dark', isDark);

    // Ẩn Splash Screen
    await SplashScreen.hide();
  }

  private initDB() {
    this.platform.ready().then(async () => {
      await this.databaseService.init();
    });
  }

  /**
   * HÀM FIX LỖI "Blocked aria-hidden"
   * Tự động nhả focus (blur) khỏi nút bấm mỗi khi bắt đầu chuyển trang.
   */
  private fixFocusOnNavigation() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });
  }
}
