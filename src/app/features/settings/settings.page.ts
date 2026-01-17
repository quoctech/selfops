import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  chatbubbleEllipsesOutline,
  checkmarkOutline,
  chevronForwardOutline,
  closeOutline,
  cloudDownloadOutline,
  constructOutline,
  hammerOutline,
  infiniteOutline,
  moonOutline,
  notificationsOutline,
  rocketOutline,
  shieldCheckmarkOutline,
  timeOutline,
  trashBinOutline,
  warningOutline,
} from 'ionicons/icons';

// Capacitor
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { StatusBar, Style } from '@capacitor/status-bar';

// Services
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';
import { FeedbackModalComponent } from 'src/app/components/feedback/feedback.component';
import { DatabaseService } from 'src/app/core/services/database/database.service';
import { NotificationService } from 'src/app/core/services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonToggle,
    IonIcon,
    IonButton,
    IonButtons,
    IonSpinner,
    IonDatetime,
    IonModal,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonInput,
  ],
  template: `
    <ion-header class="ion-no-border native-glass-header">
      <div class="glass-pane"></div>
      <ion-toolbar class="transparent-toolbar">
        <ion-title class="page-title">Cài đặt</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="settings-content">
      <div class="header-spacer"></div>

      <div class="layout-container">
        <ion-list [inset]="true" class="premium-list">
          <ion-list-header>
            <ion-label>Thông báo</ion-label>
          </ion-list-header>

          <ion-item lines="full" class="premium-item">
            <div class="icon-box yellow" slot="start">
              <ion-icon name="notifications-outline"></ion-icon>
            </div>
            <ion-label>
              <h3>Nhắc nhở hàng ngày</h3>
              <p>Đừng quên ghi lại khoảnh khắc</p>
            </ion-label>
            <ion-toggle
              [checked]="notificationEnabled()"
              (ionChange)="toggleNotification($event)"
              mode="ios"
              slot="end"
            ></ion-toggle>
          </ion-item>

          @if (notificationEnabled()) {
          <ion-item
            button
            [detail]="true"
            lines="none"
            (click)="openTimeModal()"
            class="premium-item"
          >
            <div class="icon-box blue-light" slot="start">
              <ion-icon name="time-outline"></ion-icon>
            </div>
            <ion-label>Thời gian nhắc</ion-label>
            <div slot="end" class="time-badge">
              {{ displayTime() }}
            </div>
          </ion-item>
          }
        </ion-list>

        <ion-list [inset]="true" class="premium-list">
          <ion-list-header>
            <ion-label>Giao diện</ion-label>
          </ion-list-header>

          <ion-item lines="none" class="premium-item">
            <div class="icon-box purple" slot="start">
              <ion-icon name="moon-outline"></ion-icon>
            </div>
            <ion-label>Chế độ tối</ion-label>
            <ion-toggle
              [checked]="isDarkMode()"
              (ionChange)="toggleTheme($event)"
              mode="ios"
              slot="end"
            ></ion-toggle>
          </ion-item>
        </ion-list>

        <ion-list [inset]="true" class="premium-list">
          <ion-list-header>
            <ion-label>Dữ liệu</ion-label>
          </ion-list-header>

          <ion-item
            button
            (click)="exportData()"
            [disabled]="isProcessing()"
            class="premium-item"
          >
            <div class="icon-box blue" slot="start">
              <ion-icon name="cloud-download-outline"></ion-icon>
            </div>
            <ion-label>Sao lưu dữ liệu (JSON)</ion-label>
            @if (isProcessing() && actionType() === 'EXPORT') {
            <ion-spinner name="crescent" slot="end"></ion-spinner>
            }
          </ion-item>

          <ion-item
            button
            lines="none"
            (click)="confirmReset()"
            [disabled]="isProcessing()"
            class="premium-item"
          >
            <div class="icon-box red" slot="start">
              <ion-icon name="trash-bin-outline"></ion-icon>
            </div>
            <ion-label color="danger">Xóa tất cả dữ liệu</ion-label>
            @if (isProcessing() && actionType() === 'DELETE') {
            <ion-spinner
              name="crescent"
              color="danger"
              slot="end"
            ></ion-spinner>
            }
          </ion-item>
        </ion-list>

        <ion-list [inset]="true" class="premium-list">
          <ion-list-header>
            <ion-label>Hỗ trợ</ion-label>
          </ion-list-header>

          <ion-item button (click)="openFeedback()" class="premium-item">
            <div class="icon-box green" slot="start">
              <ion-icon name="chatbubble-ellipses-outline"></ion-icon>
            </div>
            <ion-label>Gửi góp ý & Báo lỗi</ion-label>
          </ion-item>
        </ion-list>

        @if (isDevMode()) {
        <div class="dev-zone fade-in">
          <ion-card class="dev-card">
            <ion-card-header>
              <div class="dev-header">
                <ion-icon name="construct-outline"></ion-icon>
                <span>Developer Zone</span>
              </div>
            </ion-card-header>
            <ion-card-content>
              <ion-item lines="none" class="dev-input">
                <ion-label position="stacked">Số lượng Fake Data</ion-label>
                <ion-input type="number" [(ngModel)]="dummyCount"></ion-input>
              </ion-item>

              <div class="dev-actions">
                <ion-button
                  expand="block"
                  color="dark"
                  (click)="generateDummyData()"
                  [disabled]="isProcessing()"
                  class="action-btn"
                >
                  <ion-icon name="hammer-outline" slot="start"></ion-icon>
                  Sinh dữ liệu
                </ion-button>

                <ion-button
                  expand="block"
                  color="warning"
                  (click)="testNotification()"
                  class="action-btn"
                >
                  <ion-icon
                    name="notifications-outline"
                    slot="start"
                  ></ion-icon>
                  Test Noti (5s)
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
        }

        <div class="footer-wrapper">
          <div class="logo-container">
            <ion-icon name="rocket-outline" class="brand-icon"></ion-icon>
            <span class="brand-name">SelfOps</span>
          </div>

          <div
            class="version-pill noselect"
            (touchstart)="startPress()"
            (touchend)="endPress()"
            (mousedown)="startPress()"
            (mouseup)="endPress()"
          >
            v1.3.3 (Build 2026.01)
          </div>
        </div>
      </div>

      <ion-modal
        [isOpen]="isTimeModalOpen()"
        (didDismiss)="onTimeModalDismiss()"
        [initialBreakpoint]="0.5"
        [breakpoints]="[0, 0.5]"
        handleBehavior="cycle"
      >
        <ng-template>
          <ion-header class="ion-no-border">
            <ion-toolbar>
              <ion-buttons slot="start">
                <ion-button color="medium" (click)="onTimeModalDismiss()"
                  >Hủy</ion-button
                >
              </ion-buttons>
              <ion-title>Chọn giờ</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="confirmTimeChange()" [strong]="true"
                  >Lưu</ion-button
                >
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content class="ion-padding time-picker-content">
            <ion-datetime
              presentation="time"
              [value]="modalInitialTime()"
              (ionChange)="onPickerScroll($event)"
              [preferWheel]="true"
              class="wheel-datetime"
            ></ion-datetime>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [
    `
      /* =========================================
         1. GLOBAL LAYOUT
      ========================================= */
      :host {
        --toolbar-height: 56px;
        --header-offset: calc(
          var(--toolbar-height) + var(--ion-safe-area-top, 0px)
        );
      }

      .settings-content {
        --background: var(--ion-color-step-50, #f2f2f7);
      }
      .layout-container {
        padding-bottom: 40px;
        transform: translateZ(0); /* GPU Layer */
      }

      /* =========================================
         2. HEADER (GLASS EFFECT)
      ========================================= */
      .native-glass-header {
        position: absolute;
        inset: 0;
        bottom: auto;
        z-index: 999;
        pointer-events: none;
        transform: translateZ(0);
      }
      .native-glass-header ion-toolbar {
        pointer-events: auto;
        --background: transparent;
        --border-width: 0;
        padding-top: var(--ion-safe-area-top, 0px);
        --min-height: var(--toolbar-height);
      }

      .glass-pane {
        position: absolute;
        inset: 0;
        background: var(--glass-bg-light);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--ion-color-light-shade);
      }

      .page-title {
        font-weight: 800;
        font-size: 1.2rem;
      }

      .header-spacer {
        height: var(--header-offset);
        flex-shrink: 0;
        background: transparent;
      }

      /* =========================================
         3. PREMIUM LIST & ITEMS
      ========================================= */
      .premium-list {
        margin-top: 4px;
        margin-bottom: 4px;
        background: transparent;
        contain: content;
      }

      ion-list-header {
        text-transform: uppercase;
        font-size: 0.8rem;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
        padding-left: 16px;
        color: var(--ion-color-medium);
        font-weight: 600;
      }

      .premium-item {
        --background: var(--ion-card-background);
        --border-color: var(--ion-border-color);
        --inner-padding-end: 16px;
        font-size: 0.95rem;
      }

      .icon-box {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 14px;
        color: white;
        font-size: 18px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }
      .icon-box.green {
        background: linear-gradient(135deg, #34c759, #30b0c7);
      }
      .icon-box.purple {
        background: linear-gradient(135deg, #5856d6, #8e8cec);
      }
      .icon-box.blue {
        background: linear-gradient(135deg, #007aff, #5ac8fa);
      }
      .icon-box.red {
        background: linear-gradient(135deg, #ff3b30, #ff9500);
      }
      .icon-box.yellow {
        background: linear-gradient(135deg, #ffcc00, #ff9500);
      }
      .icon-box.blue-light {
        background: #32ade6;
      }

      .time-badge {
        background: var(--ion-color-step-150);
        color: var(--ion-text-color);
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.9rem;
      }

      /* =========================================
         4. FOOTER & BRANDING
      ========================================= */
      .footer-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 20px;
        padding-bottom: 60px;
        transform: translateZ(0);
      }

      .logo-container {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 10px;
      }
      .brand-icon {
        font-size: 26px;
        color: var(--ion-color-primary);
      }
      .brand-name {
        font-size: 1.6rem;
        font-weight: 900;
        letter-spacing: -0.5px;
        background: var(--brand-gradient);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .version-pill {
        background: var(--ion-card-background);
        color: var(--ion-color-medium);
        font-size: 0.75rem;
        font-weight: 600;
        padding: 6px 14px;
        border-radius: 20px;
        margin-bottom: 8px;
        user-select: none;
        transition: transform 0.2s;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        border: 1px solid var(--ion-border-color);
      }
      .version-pill:active {
        transform: scale(0.95);
        opacity: 0.7;
      }

      .copyright {
        font-size: 0.75rem;
        color: var(--ion-color-medium);
        opacity: 0.6;
      }

      /* =========================================
         5. MODALS & DEV ZONE
      ========================================= */
      .wheel-datetime {
        margin: 0 auto;
        border-radius: 12px;
      }
      .time-picker-content {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .dev-zone {
        padding: 0 16px;
        margin-top: 10px;
      }
      .dev-card {
        border: 1px dashed var(--ion-color-warning);
        box-shadow: none;
        background: transparent;
        margin: 0;
      }
      .dev-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--ion-color-warning);
        font-weight: 700;
        text-transform: uppercase;
        font-size: 0.8rem;
      }
      .dev-input {
        border: 1px solid var(--ion-color-step-200);
        border-radius: 8px;
        margin-bottom: 12px;
      }
      .dev-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .action-btn {
        --border-radius: 12px;
        margin: 0;
      }

      .fade-in {
        animation: fadeIn 0.3s ease-out;
        will-change: opacity;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* DARK MODE */
      :host-context(body.dark) {
        .settings-content {
          --background: #000000;
        }
        .glass-pane {
          background: rgba(0, 0, 0, 0.85); /* Black Glass */
          border-bottom-color: #333;
        }
        .premium-item {
          --background: #1c1c1e;
          --border-color: #38383a;
        }
        .version-pill {
          background: #1c1c1e;
          border-color: #38383a;
        }
      }
    `,
  ],
})
export class SettingsPage implements OnInit {
  private db = inject(DatabaseService);
  private notiService = inject(NotificationService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private modalCtrl = inject(ModalController);

  // States
  isDarkMode = signal(false);
  isProcessing = signal(false);
  actionType = signal<'EXPORT' | 'DELETE' | 'SEED' | null>(null);

  notificationEnabled = signal(false);

  // Time Selection
  selectedTime = signal({ hour: 21, minute: 0 });
  modalInitialTime = signal('');
  private tempPickerValue = '';
  isTimeModalOpen = signal(false);

  // Dev Mode
  isDevMode = signal(false);
  dummyCount = 50;
  private pressTimer: any;

  displayTime = computed(() => {
    const h = this.selectedTime().hour.toString().padStart(2, '0');
    const m = this.selectedTime().minute.toString().padStart(2, '0');
    return `${h}:${m}`;
  });

  constructor() {
    addIcons({
      moonOutline,
      cloudDownloadOutline,
      trashBinOutline,
      chevronForwardOutline,
      shieldCheckmarkOutline,
      notificationsOutline,
      timeOutline,
      closeOutline,
      checkmarkOutline,
      constructOutline,
      hammerOutline,
      infiniteOutline,
      warningOutline,
      rocketOutline,
      chatbubbleEllipsesOutline,
    });
  }

  async ngOnInit() {
    this.checkTheme();
    const settings = await this.notiService.getSettings();
    this.notificationEnabled.set(settings.isEnabled);

    // Load giờ đã lưu vào state
    this.selectedTime.set({ hour: settings.hour, minute: settings.minute });

    const { value } = await Preferences.get({ key: 'theme_dark_mode' });
    this.isDarkMode.set(value === 'true');
  }

  // UX FIX: BINDING GIỜ CHUẨN XÁC
  openTimeModal() {
    const now = new Date();
    // Set giờ phút từ state đã lưu
    now.setHours(this.selectedTime().hour);
    now.setMinutes(this.selectedTime().minute);
    now.setSeconds(0);
    now.setMilliseconds(0);

    // Tạo chuỗi Local ISO (YYYY-MM-DDTHH:mm:ss)
    // Để tránh việc toISOString() chuyển về UTC làm lệch giờ hiển thị
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const localIso = `${year}-${month}-${day}T${hours}:${minutes}:00`;

    // Bind vào modal (1 lần duy nhất khi mở)
    this.modalInitialTime.set(localIso);
    this.tempPickerValue = localIso;

    this.isTimeModalOpen.set(true);
  }

  async openFeedback() {
    const modal = await this.modalCtrl.create({
      component: FeedbackModalComponent,
    });
    await modal.present();
  }

  onTimeModalDismiss() {
    this.isTimeModalOpen.set(false);
  }

  onPickerScroll(ev: any) {
    this.tempPickerValue = ev.detail.value;
  }

  async confirmTimeChange() {
    const date = new Date(this.tempPickerValue);
    const newHour = date.getHours();
    const newMinute = date.getMinutes();

    this.selectedTime.set({ hour: newHour, minute: newMinute });
    this.isTimeModalOpen.set(false);

    if (this.notificationEnabled()) {
      await this.notiService.scheduleDailyReminder(newHour, newMinute);
      this.showToast('Đã cập nhật giờ nhắc', 'success');
    }
  }

  async toggleTheme(ev: any) {
    const isDark = ev.detail.checked;
    this.isDarkMode.set(isDark);
    document.body.classList.toggle('dark', isDark);

    if (Capacitor.isNativePlatform()) {
      try {
        if (isDark) {
          await StatusBar.setStyle({ style: Style.Dark });
          await Keyboard.setStyle({ style: KeyboardStyle.Dark }); // Ép bàn phím đen

          if (Capacitor.getPlatform() === 'android')
            await StatusBar.setBackgroundColor({ color: '#000000' });
        } else {
          await StatusBar.setStyle({ style: Style.Light });
          await Keyboard.setStyle({ style: KeyboardStyle.Light }); // Ép bàn phím trắng
          if (Capacitor.getPlatform() === 'android')
            await StatusBar.setBackgroundColor({ color: '#ffffff' });
        }
      } catch (e) {
        console.warn(e);
      }
    }

    await Preferences.set({
      key: 'theme_dark_mode',
      value: isDark ? 'true' : 'false',
    });
    Haptics.impact({ style: ImpactStyle.Light });
  }

  async toggleNotification(ev: any) {
    const isChecked = ev.detail.checked;
    this.notificationEnabled.set(isChecked);
    Haptics.impact({ style: ImpactStyle.Light });
    if (isChecked) {
      await this.notiService.scheduleDailyReminder(
        this.selectedTime().hour,
        this.selectedTime().minute
      );
      this.showToast('Đã bật nhắc nhở', 'success');
    } else {
      await this.notiService.cancelAllPending();
      this.showToast('Đã tắt nhắc nhở', 'warning');
    }
  }

  checkTheme() {
    const hasDarkClass = document.body.classList.contains('dark');
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    this.isDarkMode.set(hasDarkClass || prefersDark);
  }

  // Dev & Data Actions
  startPress() {
    this.pressTimer = setTimeout(() => this.activateDevMode(), 1500);
  }
  endPress() {
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  async activateDevMode() {
    if (this.isDevMode()) return;
    this.isDevMode.set(true);
    await Haptics.notification({ type: NotificationType.Success });
    this.showToast('🔓 Developer Mode Activated', 'success');
  }

  async generateDummyData() {
    this.isProcessing.set(true);
    this.actionType.set('SEED');
    try {
      await this.db.seedDummyData(this.dummyCount);
      await Haptics.notification({ type: NotificationType.Success });
      this.showToast(`Đã tạo ${this.dummyCount} sự kiện giả`, 'success');
    } catch (e) {
      console.error(e);
    } finally {
      this.isProcessing.set(false);
      this.actionType.set(null);
    }
  }

  async exportData() {
    this.isProcessing.set(true);
    this.actionType.set('EXPORT');
    try {
      const data = await this.db.getAllEvents();
      if (!data.length) {
        this.showToast('Không có dữ liệu', 'warning');
        return;
      }
      await Share.share({
        title: 'SelfOps Backup',
        text: JSON.stringify(data, null, 2),
        dialogTitle: 'Backup',
      });
    } catch (e) {
      console.error(e);
    } finally {
      this.isProcessing.set(false);
      this.actionType.set(null);
    }
  }

  async confirmReset() {
    const alert = await this.alertCtrl.create({
      header: 'Cảnh báo',
      message: 'Dữ liệu sẽ mất vĩnh viễn.',
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Xóa',
          role: 'destructive',
          handler: () => this.resetAllData(),
        },
      ],
    });
    await alert.present();
  }

  async resetAllData() {
    this.isProcessing.set(true);
    this.actionType.set('DELETE');
    try {
      await this.db.deleteAll();
      await this.showToast('Đã xóa sạch dữ liệu', 'success');
    } catch (e) {
      this.showToast('Lỗi', 'danger');
    } finally {
      this.isProcessing.set(false);
      this.actionType.set(null);
    }
  }

  private async showToast(
    msg: string,
    color: 'success' | 'warning' | 'danger'
  ) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color,
      position: 'top',
      icon:
        color === 'success' ? 'shield-checkmark-outline' : 'warning-outline',
    });
    await toast.present();
  }

  async testNotification() {
    await Haptics.impact({ style: ImpactStyle.Medium });
    await this.notiService.scheduleTest();
    this.showToast('⏳ Đợi 5 giây nhé...', 'warning');
  }
}
