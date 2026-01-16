import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
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
    this.fixFocusOnNavigation();
  }

  async ngOnInit() {
    // Đợi Platform Native sẵn sàng rồi mới chạy logic native
    this.platform.ready().then(async () => {
      // Khởi tạo DB
      await this.databaseService.initialize();

      // Cấu hình Giao diện & Status Bar (Quan trọng)
      await this.configureAppTheme();

      // Sau khi setup xong hết mới ẩn Splash Screen để tránh chớp trắng
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide();
      }
    });
  }

  /**
   * Logic đồng bộ Theme App và Status Bar
   */
  private async configureAppTheme() {
    // Lấy cài đặt theme đã lưu
    const { value } = await Preferences.get({ key: 'theme_dark_mode' });

    // Kiểm tra System Preference (nếu chưa lưu setting nào)
    const systemDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;

    // Quyết định: Dùng setting đã lưu HOẶC theo hệ thống
    const isDark = value === 'true' || (value === null && systemDark);

    // Áp dụng CSS cho Body
    document.body.classList.toggle('dark', isDark);

    // Áp dụng cho Status Bar (Native)
    if (Capacitor.isNativePlatform()) {
      await this.setStatusBarStyle(isDark);
    }
  }

  /**
   * Set màu Status Bar theo trạng thái Dark/Light
   */
  private async setStatusBarStyle(isDark: boolean) {
    if (!Capacitor.isNativePlatform()) return;

    try {
      if (isDark) {
        // --- DARK MODE ---
        // Style.Dark nghĩa là chữ màu sáng (Light Content)
        await StatusBar.setStyle({ style: Style.Dark });
        await Keyboard.setStyle({ style: KeyboardStyle.Dark }); // Bàn phím đen

        if (Capacitor.getPlatform() === 'android') {
          // Màu nền đen tệp với app
          await StatusBar.setBackgroundColor({ color: '#000000' });
        }
      } else {
        // --- LIGHT MODE ---
        // Style.Light nghĩa là chữ màu tối (Dark Content)
        await StatusBar.setStyle({ style: Style.Light });
        await Keyboard.setStyle({ style: KeyboardStyle.Light }); // Bàn phím trắng

        if (Capacitor.getPlatform() === 'android') {
          // Màu nền trắng hoặc xám nhạt (theo variables.scss --ion-background-color)
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        }
      }
    } catch (e) {
      console.warn('StatusBar plugin error (ignore if web):', e);
    }
  }

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
