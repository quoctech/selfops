import { Location } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';
import { Preferences } from '@capacitor/preferences';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Platform } from '@ionic/angular';
import {
  IonApp,
  IonRouterOutlet,
  ToastController,
} from '@ionic/angular/standalone';
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
  @ViewChild(IonRouterOutlet, { static: true }) routerOutlet!: IonRouterOutlet;
  private platform = inject(Platform);
  private destroyRef = inject(DestroyRef);
  private toastCtrl = inject(ToastController);
  private databaseService = inject(DatabaseService);
  private location = inject(Location);
  private router = inject(Router);

  private lastTimeBackPress = 0;
  private timePeriodToExit = 2000;

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

      this.registerAndroidBackButton();
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

  registerAndroidBackButton() {
    // Priority 10: Đủ thấp để Modal/Alert tự xử lý (Priority của tụi nó là 100+)
    // Nhưng đủ cao để ghi đè hành động thoát mặc định
    this.platform.backButton.subscribeWithPriority(10, async () => {
      // Lấy URL hiện tại (Bỏ qua các query params nếu có)
      // Ví dụ: /home, /settings
      const currentUrl = this.router.url.split('?')[0];

      // CHECK: NẾU KHÔNG PHẢI TRANG HOME -> THÌ LÙI TRANG
      if (currentUrl !== '/home') {
        // Cách lùi trang chuẩn nhất của Angular
        this.location.back();
        return; // Dừng lại, không chạy logic thoát
      }

      // CHECK: NẾU ĐANG Ở HOME -> CHẠY LOGIC 2 LẦN THOÁT
      const currentTime = new Date().getTime();

      if (currentTime - this.lastTimeBackPress < this.timePeriodToExit) {
        App.exitApp();
      } else {
        this.showExitToast();
        this.lastTimeBackPress = currentTime;
      }
    });
  }

  async showExitToast() {
    const toast = await this.toastCtrl.create({
      message: 'Ấn lần nữa để thoát',
      duration: 2000,
      position: 'bottom',
      color: 'dark',
      mode: 'ios',
      cssClass: 'exit-toast',
      buttons: [
        {
          text: 'Thoát',
          role: 'cancel',
          handler: () => {
            App.exitApp();
          },
        },
      ],
    });
    await toast.present();
  }
}
