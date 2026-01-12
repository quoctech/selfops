import { CommonModule } from '@angular/common';
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
  IonContent,
  IonDatetime,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
  NavController,
  ToastController,
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkOutline,
  chevronForwardOutline,
  closeOutline,
  cloudDownloadOutline,
  codeSlashOutline,
  moonOutline,
  notificationsOutline,
  shieldCheckmarkOutline,
  timeOutline,
  trashBinOutline,
} from 'ionicons/icons';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { DatabaseService } from 'src/app/core/services/database/database.service';
import { NotificationService } from 'src/app/core/services/notification.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
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
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goBack()" color="primary">
            <ion-icon slot="icon-only" name="arrow-back-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Cài đặt</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-vertical settings-content">
      <ion-list [inset]="true">
        <ion-list-header>
          <ion-label>Nhắc nhở & Thông báo</ion-label>
        </ion-list-header>

        <ion-item lines="full">
          <div class="icon-box yellow" slot="start">
            <ion-icon name="notifications-outline"></ion-icon>
          </div>
          <ion-label>
            <h3>Nhắc nhở hàng ngày</h3>
            <p>Thông báo viết nhật ký</p>
          </ion-label>
          <ion-toggle
            [checked]="notificationEnabled()"
            (ionChange)="toggleNotification($event)"
            mode="ios"
          ></ion-toggle>
        </ion-item>

        @if (notificationEnabled()) {
        <ion-item button [detail]="true" lines="none" (click)="openTimeModal()">
          <div class="icon-box blue-light" slot="start">
            <ion-icon name="time-outline"></ion-icon>
          </div>
          <ion-label>Thời gian</ion-label>
          <div slot="end" class="time-badge">
            {{ displayTime() }}
          </div>
        </ion-item>
        }
      </ion-list>

      <ion-list [inset]="true">
        <ion-list-header>
          <ion-label>Giao diện</ion-label>
        </ion-list-header>

        <ion-item lines="none">
          <div class="icon-box purple" slot="start">
            <ion-icon name="moon-outline"></ion-icon>
          </div>
          <ion-label>Chế độ tối</ion-label>
          <ion-toggle
            [checked]="isDarkMode()"
            (ionChange)="toggleTheme($event)"
            mode="ios"
          ></ion-toggle>
        </ion-item>
      </ion-list>

      <ion-list [inset]="true">
        <ion-list-header>
          <ion-label>Dữ liệu & Sao lưu</ion-label>
        </ion-list-header>

        <ion-item button (click)="exportData()" [disabled]="isProcessing()">
          <div class="icon-box blue" slot="start">
            <ion-icon name="cloud-download-outline"></ion-icon>
          </div>
          <ion-label>
            <h3>Sao lưu dữ liệu</h3>
            <p>Xuất file JSON an toàn</p>
          </ion-label>

          @if (isProcessing() && actionType() === 'EXPORT') {
          <ion-spinner name="crescent" slot="end"></ion-spinner>
          } @else {
          <ion-icon
            name="chevron-forward-outline"
            slot="end"
            color="medium"
            size="small"
          ></ion-icon>
          }
        </ion-item>

        <ion-item
          button
          lines="none"
          (click)="confirmReset()"
          [disabled]="isProcessing()"
        >
          <div class="icon-box red" slot="start">
            <ion-icon name="trash-bin-outline"></ion-icon>
          </div>
          <ion-label color="danger">
            <h3>Xóa tất cả dữ liệu</h3>
            <p>Cẩn thận, không thể phục hồi</p>
          </ion-label>

          @if (isProcessing() && actionType() === 'DELETE') {
          <ion-spinner name="crescent" color="danger" slot="end"></ion-spinner>
          }
        </ion-item>
      </ion-list>

      <div class="footer-info">
        <div class="app-logo">
          <ion-icon name="code-slash-outline"></ion-icon>
        </div>
        <h3 class="app-name">SelfOps</h3>
        <div class="meta-info">
          <span>Version 1.0.0</span>
          <span class="dot">•</span>
          <span>Build 2026.01</span>
        </div>
        <p class="copyright">© 2026 SelfOps Inc.</p>
      </div>

      <ion-modal
        [isOpen]="isTimeModalOpen()"
        (didDismiss)="onTimeModalDismiss()"
        [initialBreakpoint]="0.45"
        [breakpoints]="[0, 0.45]"
      >
        <ng-template>
          <div class="modal-wrapper">
            <div class="modal-header">
              <span class="modal-title">Chọn giờ nhắc</span>
            </div>

            <ion-datetime
              presentation="time"
              [value]="selectedIsoTime()"
              (ionChange)="timeChanged($event)"
              [preferWheel]="true"
              class="custom-datetime"
            ></ion-datetime>

            <ion-button
              expand="block"
              (click)="closeModal()"
              class="confirm-btn"
            >
              Xong
            </ion-button>
          </div>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [
    `
      /* Fix nền Dark/Light tự động */
      .settings-content {
        --background: var(--ion-color-light);
      }
      :host-context(body.dark) .settings-content {
        --background: var(--ion-background-color);
      }

      /* --- ICON BOX STYLES --- */
      .icon-box {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        color: white;
        font-size: 18px;
      }
      .icon-box.purple {
        background: #5e5ce6;
      }
      .icon-box.blue {
        background: #007aff;
      }
      .icon-box.red {
        background: #ff3b30;
      }
      .icon-box.yellow {
        background: #ffcc00;
      }
      .icon-box.blue-light {
        background: #5ac8fa;
      }

      /* Time Badge Styles */
      .time-badge {
        background: var(--ion-color-step-100, #e0e0e0);
        color: var(--ion-color-dark);
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.9rem;
      }

      /* --- MODAL STYLES --- */
      .modal-wrapper {
        padding: 20px;
        height: 100%;
        background: var(--ion-background-color);
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .modal-header {
        width: 100%;
        text-align: center;
        margin-bottom: 20px;
      }
      .modal-title {
        font-weight: 700;
        font-size: 1.1rem;
      }

      .custom-datetime {
        border-radius: 16px;
        border: 1px solid var(--ion-color-light-shade);
        overflow: hidden;
      }
      .confirm-btn {
        margin-top: 20px;
        width: 100%;
        --border-radius: 12px;
      }

      /* --- FOOTER --- */
      .footer-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 40px;
        padding-bottom: 60px;
        color: var(--ion-color-medium);
        opacity: 0.8;
      }
      .app-logo {
        width: 56px;
        height: 56px;
        background: var(--ion-color-step-150, #e0e0e0);
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        margin-bottom: 12px;
        color: var(--ion-text-color);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
      }
      .app-name {
        font-size: 1.2rem;
        font-weight: 700;
        margin: 0 0 6px 0;
        color: var(--ion-text-color);
        letter-spacing: 0.5px;
      }
      .meta-info {
        display: flex;
        align-items: center;
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        font-weight: 500;
      }
      .dot {
        margin: 0 6px;
        font-weight: bold;
      }
      .copyright {
        font-size: 0.75rem;
        margin-top: 8px;
        opacity: 0.6;
      }

      ion-list-header {
        padding-left: 20px;
        margin-bottom: 4px;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    `,
  ],
})
export class SettingsPage implements OnInit {
  private db = inject(DatabaseService);
  private notiService = inject(NotificationService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private navCtrl = inject(NavController);

  // States
  isDarkMode = signal(false);
  isProcessing = signal(false);
  actionType = signal<'EXPORT' | 'DELETE' | null>(null);

  // Notification States
  notificationEnabled = signal(false);
  selectedTime = signal({ hour: 21, minute: 0 }); // Mặc định 21:00

  // FIX: Signal điều khiển Modal
  isTimeModalOpen = signal(false);

  // Computed
  selectedIsoTime = computed(() => {
    const d = new Date();
    d.setHours(this.selectedTime().hour);
    d.setMinutes(this.selectedTime().minute);
    return d.toISOString();
  });

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
      arrowBackOutline,
      codeSlashOutline,
      chevronForwardOutline,
      shieldCheckmarkOutline,
      notificationsOutline,
      timeOutline,
      closeOutline,
      checkmarkOutline,
    });
  }

  async ngOnInit() {
    this.checkTheme();

    // FIX: Load settings theo cấu trúc mới
    const settings = await this.notiService.getSettings();
    this.notificationEnabled.set(settings.isEnabled);
    this.selectedTime.set({ hour: settings.hour, minute: settings.minute });

    const { value } = await Preferences.get({ key: 'theme_dark_mode' });
    this.isDarkMode.set(value === 'true');
  }

  // --- THEME ---
  checkTheme() {
    const hasDarkClass = document.body.classList.contains('dark');
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    this.isDarkMode.set(hasDarkClass || prefersDark);
  }

  async toggleTheme(ev: any) {
    const isDark = ev.detail.checked;
    this.isDarkMode.set(isDark);

    // 1. Bật/Tắt class dark trên body
    document.body.classList.toggle('dark', isDark);

    // 2. LƯU LẠI để lần sau mở app nó nhớ
    await Preferences.set({
      key: 'theme_dark_mode',
      value: isDark ? 'true' : 'false',
    });

    Haptics.impact({ style: ImpactStyle.Light });
  }

  // --- NOTIFICATION ---
  async toggleNotification(ev: any) {
    const isChecked = ev.detail.checked;
    this.notificationEnabled.set(isChecked);
    Haptics.impact({ style: ImpactStyle.Light });

    if (isChecked) {
      await this.notiService.scheduleDailyReminder(
        this.selectedTime().hour,
        this.selectedTime().minute
      );
      this.showToast('Đã bật nhắc nhở hàng ngày', 'success');
    } else {
      await this.notiService.cancelAllPending();
      this.showToast('Đã tắt nhắc nhở', 'warning');
    }
  }

  // FIX: Các hàm điều khiển Modal
  openTimeModal() {
    this.isTimeModalOpen.set(true);
  }

  closeModal() {
    this.isTimeModalOpen.set(false);
  }

  onTimeModalDismiss() {
    this.isTimeModalOpen.set(false);
  }

  async timeChanged(ev: any) {
    const dateStr = ev.detail.value;
    const date = new Date(dateStr);
    const newHour = date.getHours();
    const newMinute = date.getMinutes();

    this.selectedTime.set({ hour: newHour, minute: newMinute });

    if (this.notificationEnabled()) {
      await this.notiService.scheduleDailyReminder(newHour, newMinute);
    }
  }

  // --- DATA ---
  async exportData() {
    this.isProcessing.set(true);
    this.actionType.set('EXPORT');

    try {
      const data = await this.db.getAllEvents();
      if (!data || data.length === 0) {
        this.showToast('Chưa có dữ liệu để sao lưu.', 'warning');
        return;
      }
      const fileName = `selfops_backup_${Date.now()}.json`;
      const jsonContent = JSON.stringify(data, null, 2);

      await Share.share({
        title: 'Sao lưu SelfOps',
        text: jsonContent,
        dialogTitle: 'Chia sẻ file Backup',
      });
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      this.isProcessing.set(false);
      this.actionType.set(null);
    }
  }

  async confirmReset() {
    const alert = await this.alertCtrl.create({
      header: 'Vùng nguy hiểm!',
      message: 'Bạn có chắc chắn muốn xóa vĩnh viễn toàn bộ nhật ký không?',
      buttons: [
        { text: 'Thôi', role: 'cancel' },
        {
          text: 'XÓA HẾT',
          role: 'destructive',
          handler: async () => {
            await this.resetAllData();
          },
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
      await this.showToast('Đã xóa sạch dữ liệu.', 'success');
      this.navCtrl.navigateRoot('/home');
    } catch (error) {
      this.showToast('Lỗi khi xóa dữ liệu.', 'danger');
    } finally {
      this.isProcessing.set(false);
      this.actionType.set(null);
    }
  }

  goBack() {
    this.navCtrl.back();
  }

  private async showToast(
    msg: string,
    color: 'success' | 'warning' | 'danger'
  ) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'top',
      icon: color === 'success' ? 'shield-checkmark-outline' : undefined,
    });
    await toast.present();
  }
}
