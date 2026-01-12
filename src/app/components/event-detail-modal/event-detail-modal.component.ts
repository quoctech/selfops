import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AlertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  bulbOutline,
  checkmarkCircleOutline, // 👈 Import icon mới
  closeOutline,
  heartOutline,
  helpBuoyOutline,
  saveOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';

import { SelfOpsEvent } from 'src/app/core/models/event.type';
import { DatabaseService } from 'src/app/core/services/database/database.service';
import { AppUtils } from 'src/app/core/utils/app.utils';

@Component({
  selector: 'app-event-detail-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonTextarea,
    IonIcon,
    IonBadge,
    IonChip,
    IonLabel,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button color="medium" (click)="close()">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>Chiêm nghiệm & Đánh giá</ion-title>

        <ion-buttons slot="end">
          <ion-button color="danger" (click)="confirmDelete()">
            <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (eventSignal(); as evt) { @let config = getEventConfig(evt.type);

      <ion-card class="read-only-card">
        <ion-card-header>
          <div class="card-meta">
            <ion-badge [color]="config.color" mode="ios">
              <ion-icon
                [name]="config.icon"
                style="margin-right: 4px;"
              ></ion-icon>
              {{ config.label }}
            </ion-badge>

            <span class="date-text">
              <ion-icon name="time-outline"></ion-icon>
              {{ evt.created_at | date : 'short' }}
            </span>
          </div>
        </ion-card-header>

        <ion-card-content>
          <p class="context-label">Bạn đã quyết định/suy nghĩ:</p>
          <p class="context-text">
            {{ evt.context }}
          </p>

          @if (evt.emotion) {
          <div class="emotion-container">
            @for (emo of parseEmotions(evt.emotion); track emo) {
            <ion-chip outline color="medium" class="mini-chip">
              <ion-label>{{ emo }}</ion-label>
            </ion-chip>
            }
          </div>
          }
        </ion-card-content>
      </ion-card>
      }

      <div class="input-section">
        <div class="section-header">
          <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
          <h3>Kết quả thực tế</h3>
        </div>
        <p class="helper-text">
          Sau 1 thời gian, chuyện gì đã thực sự xảy ra? Có giống kỳ vọng không?
        </p>

        <div class="input-wrapper">
          <ion-textarea
            [ngModel]="actualOutcome()"
            (ngModelChange)="actualOutcome.set($event)"
            rows="3"
            placeholder="Ví dụ: Kết quả tốt hơn mình nghĩ, khách hàng đã đồng ý..."
            class="custom-textarea"
            [autoGrow]="true"
          ></ion-textarea>
        </div>
      </div>

      <div class="input-section ion-margin-top">
        <div class="section-header">
          <ion-icon name="bulb-outline" color="warning"></ion-icon>
          <h3>Góc nhìn lại</h3>
        </div>

        <p class="helper-text">
          Bài học cốt lõi bạn rút ra được để lần sau làm tốt hơn?
        </p>

        <div class="input-wrapper">
          <ion-textarea
            [ngModel]="reflectionNote()"
            (ngModelChange)="reflectionNote.set($event)"
            rows="4"
            placeholder="Ví dụ: Lần sau mình sẽ kiểm tra kỹ hơn..."
            class="custom-textarea"
            [autoGrow]="true"
          ></ion-textarea>
        </div>
      </div>

      <ion-button
        expand="block"
        class="ion-margin-top save-btn"
        (click)="saveReflection()"
        [disabled]="isSaving()"
      >
        @if (isSaving()) {
        <ion-spinner name="crescent"></ion-spinner>
        } @else {
        <ion-icon name="save-outline" slot="start"></ion-icon>
        Hoàn tất Review }
      </ion-button>
    </ion-content>
  `,
  styles: [
    `
      /* Card hiển thị thông tin cũ */
      .read-only-card {
        margin: 0 0 24px 0;
        background: var(--ion-color-light);
        box-shadow: none;
        border-radius: 16px;
        border: 1px solid var(--ion-color-light-shade);
      }

      :host-context(body.dark) .read-only-card {
        background: var(--ion-color-step-100);
        border-color: var(--ion-color-step-200);
      }

      .card-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .date-text {
        font-size: 0.8rem;
        color: var(--ion-color-medium);
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .context-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        color: var(--ion-color-medium);
        margin-bottom: 6px;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .context-text {
        font-size: 1.1rem;
        color: var(--ion-text-color);
        white-space: pre-wrap;
        line-height: 1.6;
        margin-bottom: 16px;
      }

      .emotion-container {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding-top: 12px;
        border-top: 1px dashed var(--ion-color-medium-shade);
      }

      .mini-chip {
        height: 24px;
        font-size: 0.8rem;
        margin: 0;
      }

      /* Phần Input Section */
      .input-section {
        padding: 0 4px;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .section-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--ion-text-color);
      }

      .helper-text {
        margin: 0 0 12px 0;
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        line-height: 1.4;
      }

      .input-wrapper {
        background: var(--ion-card-background);
        border: 1px solid var(--ion-color-light-shade);
        border-radius: 12px;
        padding: 8px 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      }

      :host-context(body.dark) .input-wrapper {
        background: var(--ion-color-step-50);
        border-color: var(--ion-color-step-150);
      }

      .custom-textarea {
        --padding-start: 0;
        font-size: 1rem;
      }

      .save-btn {
        --border-radius: 12px;
        height: 48px;
        font-weight: 600;
        margin-bottom: 40px; /* Thêm khoảng trống dưới cùng */
      }
    `,
  ],
})
export class EventDetailModalComponent {
  // Signals
  protected eventSignal = signal<SelfOpsEvent | null>(null);
  protected reflectionNote = signal('');
  protected actualOutcome = signal(''); // Signal mới cho Kết quả thực tế
  protected isSaving = signal(false);

  @Input() set event(val: SelfOpsEvent) {
    this.eventSignal.set(val);
    this.reflectionNote.set(val.reflection || '');
    // Load outcome cũ lên (nếu có)
    this.actualOutcome.set(val.actual_outcome || '');
  }

  private modalCtrl = inject(ModalController);
  private db = inject(DatabaseService);
  private alertCtrl = inject(AlertController);

  constructor() {
    addIcons({
      trashOutline,
      saveOutline,
      closeOutline,
      timeOutline,
      heartOutline,
      bulbOutline,
      helpBuoyOutline,
      checkmarkCircleOutline,
    });
  }

  getEventConfig(type: string) {
    return AppUtils.getTypeConfig(type);
  }

  parseEmotions(emoStr: string | string[]) {
    // Fix nhỏ: Đảm bảo tương thích nếu emotion đã là mảng
    if (Array.isArray(emoStr)) return emoStr;
    return AppUtils.parseEmotions(emoStr);
  }

  close() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  async saveReflection() {
    const evt = this.eventSignal();
    if (!evt) return;

    this.isSaving.set(true);

    try {
      // Gọi hàm updateReview trong DatabaseService
      await this.db.updateReview(
        evt.uuid,
        this.reflectionNote(),
        this.actualOutcome() // Truyền thêm kết quả thực tế
      );

      await this.modalCtrl.dismiss(true, 'saved');
    } catch (e) {
      console.error(e);
    } finally {
      this.isSaving.set(false);
    }
  }

  async confirmDelete() {
    const alert = await this.alertCtrl.create({
      header: 'Xác nhận xóa',
      message:
        'Bạn có chắc muốn xóa dòng nhật ký này không? Hành động này không thể hoàn tác.',
      buttons: [
        {
          text: 'Giữ lại',
          role: 'cancel',
          cssClass: 'secondary',
        },
        {
          text: 'Xóa luôn',
          role: 'destructive',
          handler: async () => {
            const evt = this.eventSignal();
            if (evt) {
              await this.db.deleteEvent(evt.uuid);
              this.modalCtrl.dismiss(null, 'deleted');
            }
          },
        },
      ],
    });
    await alert.present();
  }
}
