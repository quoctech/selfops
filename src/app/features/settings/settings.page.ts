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
  ToastController,
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  checkmarkOutline,
  chevronForwardOutline,
  closeOutline,
  cloudDownloadOutline,
  codeSlashOutline,
  constructOutline, // Dev mode
  hammerOutline, // Dev mode
  moonOutline,
  notificationsOutline,
  shieldCheckmarkOutline,
  timeOutline,
  trashBinOutline,
} from 'ionicons/icons';

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
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
    IonSpinner,
    IonDatetime,
    IonModal,
    IonCard, // Dev mode
    IonCardHeader,
    IonCardContent,
    IonInput, // Dev Zone
  ],
  template: `
    <ion-header [translucent]="true" class="ion-padding ion-no-border">
      <ion-toolbar>
        <ion-title>Cài đặt</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="settings-content">
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
            slot="end"
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
            slot="end"
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

      @if (isDevMode()) {
      <div class="dev-zone">
        <ion-card class="dev-card">
          <ion-card-header>
            <div class="dev-header">
              <ion-icon name="construct-outline"></ion-icon>
              <ion-label>Developer Zone</ion-label>
            </div>
          </ion-card-header>
          <ion-card-content>
            <ion-item lines="none" class="dev-input-item">
              <ion-label position="stacked">Số lượng Fake Data</ion-label>
              <ion-input
                type="number"
                placeholder="VD: 50"
                [(ngModel)]="dummyCount"
              ></ion-input>
            </ion-item>

            <ion-button
              expand="block"
              color="dark"
              class="ion-margin-top"
              (click)="generateDummyData()"
              [disabled]="isProcessing()"
            >
              @if(isProcessing() && actionType() === 'SEED') {
              <ion-spinner name="dots"></ion-spinner>
              } @else {
              <ion-icon name="hammer-outline" slot="start"></ion-icon>
              Sinh dữ liệu giả }
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
      }

      <div class="footer-info">
        <div class="app-logo">
          <ion-icon name="code-slash-outline"></ion-icon>
        </div>
        <h3 class="app-name">SelfOps</h3>

        <div
          class="meta-info noselect"
          (touchstart)="startPress()"
          (touchend)="endPress()"
          (mousedown)="startPress()"
          (mouseup)="endPress()"
        >
          <span>v1.2.9</span>
          <span class="dot">•</span>
          <span>Build 2026.01</span>
        </div>

        <p class="copyright">© 2026 SelfOps Inc.</p>
      </div>

      <ion-modal
        [isOpen]="isTimeModalOpen()"
        (didDismiss)="onTimeModalDismiss()"
        [initialBreakpoint]="0.5"
        [breakpoints]="[0, 0.5]"
      >
        <ng-template>
          <div class="modal-wrapper ion-padding">
            <div class="modal-header">
              <span class="modal-title">Chọn giờ nhắc nhở</span>
            </div>

            <ion-datetime
              presentation="time"
              [value]="tempIsoTime()"
              (ionChange)="onTimePickerChange($event)"
              [preferWheel]="true"
              class="custom-datetime"
            ></ion-datetime>

            <ion-button
              expand="block"
              (click)="confirmTimeChange()"
              class="confirm-btn ion-margin-top"
            >
              Lưu thay đổi
            </ion-button>
          </div>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [
    `
      /* ... Các style cũ giữ nguyên ... */
      .settings-content {
        --background: var(--ion-color-step-50, #f2f2f7);
      }
      :host-context(body.dark) .settings-content {
        --background: #000000;
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
      }
      .icon-box.purple {
        background-color: #5856d6;
      }
      .icon-box.blue {
        background-color: #007aff;
      }
      .icon-box.red {
        background-color: #ff3b30;
      }
      .icon-box.yellow {
        background-color: #ffcc00;
      }
      .icon-box.blue-light {
        background-color: #32ade6;
      }

      .time-badge {
        background: var(--ion-color-step-150, #e3e3e3);
        color: var(--ion-text-color);
        padding: 6px 12px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.95rem;
      }

      /* Modal Styling */
      .modal-wrapper {
        height: 100%;
        background: var(--ion-background-color);
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .modal-title {
        font-weight: 700;
        font-size: 1.1rem;
      }
      .custom-datetime {
        border-radius: 16px;
        margin-top: 20px;
        --background: var(--ion-item-background);
      }
      .confirm-btn {
        --border-radius: 12px;
        width: 100%;
        font-weight: 600;
      }

      /* Footer */
      .footer-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-top: 40px;
        padding-bottom: 80px;
        color: var(--ion-color-medium);
        opacity: 0.8;
      }
      .app-logo {
        width: 60px;
        height: 60px;
        background: var(--ion-color-step-100);
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        margin-bottom: 12px;
        color: var(--ion-text-color);
      }
      .app-name {
        font-size: 1.2rem;
        font-weight: 800;
        margin: 0 0 6px 0;
        color: var(--ion-text-color);
      }
      .meta-info {
        font-size: 0.8rem;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        user-select: none;
        cursor: pointer;
        padding: 10px;
      }
      .meta-info:active {
        opacity: 0.5;
      }

      .dot {
        font-weight: bold;
      }
      .copyright {
        font-size: 0.75rem;
        margin-top: 8px;
        opacity: 0.6;
      }

      ion-list-header {
        font-size: 0.8rem;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-bottom: 4px;
        color: var(--ion-color-medium);
      }

      /* DEV ZONE STYLES */
      .dev-zone {
        padding: 0 16px;
        animation: slideIn 0.3s ease-out;
      }
      .dev-card {
        border: 2px dashed var(--ion-color-medium);
        box-shadow: none;
        background: transparent;
        margin-top: 20px;
      }
      .dev-header {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--ion-color-dark);
        font-weight: 700;
        text-transform: uppercase;
        font-size: 0.8rem;
      }
      .dev-input-item {
        border: 1px solid var(--ion-color-medium);
        border-radius: 8px;
        margin-bottom: 10px;
        --background: transparent;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
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

  // States
  isDarkMode = signal(false);
  isProcessing = signal(false);
  actionType = signal<'EXPORT' | 'DELETE' | 'SEED' | null>(null);

  // Notification States
  notificationEnabled = signal(false);
  selectedTime = signal({ hour: 21, minute: 0 });
  tempTime = signal({ hour: 21, minute: 0 });
  isTimeModalOpen = signal(false);

  // DEV MODE States
  isDevMode = signal(false);
  dummyCount = 50;
  private pressTimer: any;

  // Computed
  displayTime = computed(() => {
    const h = this.selectedTime().hour.toString().padStart(2, '0');
    const m = this.selectedTime().minute.toString().padStart(2, '0');
    return `${h}:${m}`;
  });

  tempIsoTime = computed(() => {
    const d = new Date();
    d.setHours(this.tempTime().hour);
    d.setMinutes(this.tempTime().minute);
    return d.toISOString();
  });

  constructor() {
    addIcons({
      moonOutline,
      cloudDownloadOutline,
      trashBinOutline,
      codeSlashOutline,
      chevronForwardOutline,
      shieldCheckmarkOutline,
      notificationsOutline,
      timeOutline,
      closeOutline,
      checkmarkOutline,
      constructOutline,
      hammerOutline,
    });
  }

  async ngOnInit() {
    this.checkTheme();

    const settings = await this.notiService.getSettings();
    this.notificationEnabled.set(settings.isEnabled);
    this.selectedTime.set({ hour: settings.hour, minute: settings.minute });
    this.tempTime.set({ hour: settings.hour, minute: settings.minute });

    const { value } = await Preferences.get({ key: 'theme_dark_mode' });
    this.isDarkMode.set(value === 'true');
  }

  // --- LOGIC LONG PRESS (ẤN GIỮ) ---
  startPress() {
    this.pressTimer = setTimeout(async () => {
      await this.activateDevMode();
    }, 1500);
  }

  endPress() {
    // Nếu thả tay ra trước 1.5s thì hủy timer
    if (this.pressTimer) {
      clearTimeout(this.pressTimer);
      this.pressTimer = null;
    }
  }

  async activateDevMode() {
    // Nếu đã bật rồi thì thôi (hoặc có thể làm logic tắt)
    if (this.isDevMode()) return;

    this.isDevMode.set(true);

    await Haptics.notification({ type: NotificationType.Success });
    this.showToast('🔓 Đã mở khóa Developer Zone!', 'success');
  }

  // --- LOGIC DEV ZONE ---
  async generateDummyData() {
    if (this.dummyCount <= 0) return;

    this.isProcessing.set(true);
    this.actionType.set('SEED');

    try {
      await this.db.seedDummyData(this.dummyCount);

      await Haptics.notification({ type: NotificationType.Success });
      this.showToast(`✅ Đã sinh ${this.dummyCount} sự kiện giả!`, 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Lỗi khi tạo data', 'danger');
    } finally {
      this.isProcessing.set(false);
      this.actionType.set(null);
    }
  }

  // --- CÁC LOGIC CŨ ---

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
    document.body.classList.toggle('dark', isDark);
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
      this.showToast('Đã bật nhắc nhở hàng ngày', 'success');
    } else {
      await this.notiService.cancelAllPending();
      this.showToast('Đã tắt nhắc nhở', 'warning');
    }
  }

  openTimeModal() {
    this.tempTime.set(this.selectedTime());
    this.isTimeModalOpen.set(true);
  }

  onTimeModalDismiss() {
    this.isTimeModalOpen.set(false);
  }

  onTimePickerChange(ev: any) {
    const date = new Date(ev.detail.value);
    this.tempTime.set({ hour: date.getHours(), minute: date.getMinutes() });
  }

  async confirmTimeChange() {
    const newTime = this.tempTime();
    this.selectedTime.set(newTime);
    this.isTimeModalOpen.set(false);

    if (this.notificationEnabled()) {
      await this.notiService.scheduleDailyReminder(
        newTime.hour,
        newTime.minute
      );
      this.showToast('Đã cập nhật giờ nhắc', 'success');
    }
  }

  async exportData() {
    this.isProcessing.set(true);
    this.actionType.set('EXPORT');
    try {
      const data = await this.db.getAllEvents();
      if (!data || data.length === 0) {
        this.showToast('Chưa có dữ liệu để sao lưu.', 'warning');
        return;
      }
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
      message:
        'Hành động này sẽ xóa vĩnh viễn toàn bộ nhật ký. Bạn có chắc chắn không?',
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
    } catch (error) {
      this.showToast('Lỗi khi xóa dữ liệu.', 'danger');
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
      color: color,
      position: 'top',
      icon: color === 'success' ? 'shield-checkmark-outline' : undefined,
    });
    await toast.present();
  }
}
