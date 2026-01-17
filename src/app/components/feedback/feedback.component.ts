import { Component, inject, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Device } from '@capacitor/device';
import { Haptics, NotificationType } from '@capacitor/haptics';
import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chatboxEllipsesOutline,
  closeOutline,
  heart,
  mailOutline,
  paperPlaneOutline,
} from 'ionicons/icons';
import { FeedbackService } from 'src/app/core/services/feedback.service';

@Component({
  selector: 'app-feedback-modal',
  standalone: true,
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonButton,
    IonIcon,
    IonItem,
    IonTextarea,
    IonInput,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Góp ý</ion-title>
        <ion-button slot="end" fill="clear" color="medium" (click)="close()">
          <ion-icon name="close-outline" slot="icon-only"></ion-icon>
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content #content class="ion-padding content-bg">
      <div class="header-section">
        <div class="icon-circle">
          <ion-icon name="chatbox-ellipses-outline" color="primary"></ion-icon>
        </div>
        <h3>Giúp SelfOps tốt hơn</h3>
        <p>
          Mọi ý kiến đóng góp, báo lỗi hay yêu cầu tính năng của bạn đều vô cùng
          quý giá.
        </p>
      </div>

      <div class="form-wrapper">
        <ion-item lines="none" class="custom-input-item main-input">
          <ion-textarea
            [(ngModel)]="contentVal"
            rows="6"
            placeholder="Hãy chia sẻ suy nghĩ của bạn..."
            [autoGrow]="true"
            (ionFocus)="scrollToInput($event)"
          ></ion-textarea>
        </ion-item>

        <ion-item lines="none" class="custom-input-item mt-3">
          <ion-icon
            name="mail-outline"
            slot="start"
            class="input-icon"
          ></ion-icon>
          <ion-input
            [(ngModel)]="contact"
            type="email"
            placeholder="Email liên hệ (Tùy chọn)"
            (ionFocus)="scrollToInput($event)"
          ></ion-input>
        </ion-item>

        <div class="device-info-wrapper">
          <div class="info-pill">
            {{ deviceInfoStr() }}
          </div>
        </div>

        <div style="height: 300px"></div>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border safe-area-footer">
      <ion-button
        expand="block"
        shape="round"
        class="submit-btn"
        (click)="send()"
        [disabled]="!contentVal() || isSending()"
      >
        @if (isSending()) {
        <ion-spinner name="crescent" color="light"></ion-spinner>
        } @else {
        <ion-icon name="paper-plane-outline" slot="start"></ion-icon>
        Gửi ngay }
      </ion-button>
    </ion-footer>
  `,
  styles: [
    `
      /* ... Giữ nguyên CSS cũ của bạn ở đây ... */

      /* GLOBAL LAYOUT */
      ion-content {
        --background: var(--ion-background-color);
      }
      .header-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        margin-bottom: 24px;
        margin-top: 10px;
      }
      .icon-circle {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(var(--ion-color-primary-rgb), 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;
      }
      .icon-circle ion-icon {
        font-size: 32px;
      }
      .header-section h3 {
        margin: 0 0 8px 0;
        font-weight: 700;
        font-size: 1.2rem;
      }
      .header-section p {
        margin: 0;
        color: var(--ion-color-medium);
        font-size: 0.9rem;
        line-height: 1.5;
        max-width: 80%;
      }
      .custom-input-item {
        --background: var(--ion-color-step-50, #f4f5f8);
        --border-radius: 16px;
        --padding-start: 16px;
        --min-height: 56px;
      }
      .main-input {
        --padding-top: 12px;
        --padding-bottom: 12px;
        border: 1px solid transparent;
        transition: border-color 0.2s;
      }
      :host-context(.ion-focused) .main-input {
        border-color: var(--ion-color-primary);
      }
      .input-icon {
        color: var(--ion-color-medium);
        margin-inline-end: 12px;
      }
      .mt-3 {
        margin-top: 16px;
      }
      .device-info-wrapper {
        display: flex;
        justify-content: center;
        margin-top: 24px;
        margin-bottom: 20px;
      }
      .info-pill {
        background: var(--ion-color-step-100);
        color: var(--ion-color-medium);
        font-size: 0.7rem;
        padding: 4px 12px;
        border-radius: 12px;
        font-family: monospace;
        letter-spacing: 0.5px;
      }
      .safe-area-footer {
        background: var(--ion-background-color);
        padding: 16px 16px calc(16px + var(--ion-safe-area-bottom)) 16px;
        box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.02);
      }
      .submit-btn {
        height: 52px;
        font-weight: 600;
        font-size: 1rem;
        --box-shadow: 0 8px 20px rgba(var(--ion-color-primary-rgb), 0.25);
      }
      :host-context(body.dark) {
        .custom-input-item {
          --background: var(--ion-color-step-100);
        }
        .header-section h3 {
          color: var(--ion-text-color);
        }
      }
    `,
  ],
})
export class FeedbackModalComponent {
  private feedbackService = inject(FeedbackService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  contentVal = signal(''); // Đổi tên biến tránh trùng với ViewChild content
  contact = signal('');
  isSending = signal(false);
  deviceInfoStr = signal('...');

  // 1. Lấy tham chiếu đến IonContent
  @ViewChild('content') content!: IonContent;

  constructor() {
    addIcons({
      closeOutline,
      paperPlaneOutline,
      chatboxEllipsesOutline,
      mailOutline,
      heart,
    });
    this.loadDeviceInfo();
  }

  // 2. Logic Scroll thông minh
  scrollToInput(ev: any) {
    const target = ev.target;

    // Tìm thẻ ion-item bao ngoài (vì ion-input nằm trong shadow dom)
    const item = target.closest('ion-item');

    if (item) {
      // Đợi bàn phím nảy lên xong (khoảng 300ms) rồi mới scroll
      setTimeout(() => {
        // Lấy vị trí Y của input
        const y = item.offsetTop;

        // Scroll đến vị trí đó trừ đi 80px (để chừa header ra cho dễ nhìn)
        // Duration 400ms để mượt
        this.content.scrollToPoint(0, y - 80, 400);
      }, 300);
    }
  }

  async loadDeviceInfo() {
    try {
      const info = await Device.getInfo();
      let os = info.operatingSystem;
      this.deviceInfoStr.set(`${os} ${info.osVersion} • ${info.model}`);
    } catch {
      this.deviceInfoStr.set('Unknown Device');
    }
  }

  close() {
    this.modalCtrl.dismiss();
  }

  async send() {
    if (!this.contentVal().trim()) return;

    this.isSending.set(true);

    try {
      this.feedbackService.sendFeedback(
        this.contentVal(),
        this.contact(),
        this.deviceInfoStr()
      );

      await Haptics.notification({ type: NotificationType.Success });
      this.showToast('Góp ý đã được gửi. Cảm ơn bạn! ❤️', 'success');
      this.modalCtrl.dismiss();
    } catch (e) {
      await Haptics.notification({ type: NotificationType.Error });
      this.showToast('Có lỗi xảy ra. Vui lòng thử lại sau.', 'danger');
    } finally {
      this.isSending.set(false);
    }
  }

  async showToast(msg: string, color: string) {
    const toast = await this.toastCtrl.create({
      message: msg,
      duration: 2000,
      color: color,
      position: 'top',
      mode: 'ios',
    });
    await toast.present();
  }
}
