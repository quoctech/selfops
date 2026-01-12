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
  closeOutline,
  heartOutline,
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

        <ion-title>Chi tiết sự kiện</ion-title>

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

      <div class="reflection-section">
        <div class="section-header">
          <ion-icon name="bulb-outline" color="warning"></ion-icon>
          <h3>Góc nhìn lại</h3>
        </div>

        <p class="helper-text">
          Sau khi bình tâm lại, bạn rút ra được bài học gì cho lần sau?
        </p>

        <div class="input-wrapper">
          <ion-textarea
            [ngModel]="reflectionNote()"
            (ngModelChange)="reflectionNote.set($event)"
            rows="6"
            placeholder="Ví dụ: Lần sau mình sẽ kiểm tra kỹ hơn trước khi quyết định..."
            class="custom-textarea"
            [autoGrow]="true"
          ></ion-textarea>
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
          Lưu bài học }
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `
      /* Card hiển thị thông tin cũ */
      .read-only-card {
        margin: 0 0 24px 0;
        background: var(--ion-color-light); /* Mặc định Light Mode */
        box-shadow: none;
        border-radius: 16px;
        border: 1px solid var(--ion-color-light-shade);
      }

      /* FIX DARK MODE: Đổi màu nền card thành xám đậm khi ở chế độ tối */
      :host-context(body.dark) .read-only-card {
        background: var(--ion-color-step-100); /* Màu xám đậm */
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

      .context-text {
        font-size: 1.1rem;
        color: var(--ion-text-color);
        white-space: pre-wrap;
        line-height: 1.6;
        margin-bottom: 16px;
      }

      /* Emotion Chips */
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

      /* Phần Reflection */
      .reflection-section {
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
        margin: 0 0 16px 0;
        font-size: 0.9rem;
        color: var(--ion-color-medium);
      }

      .input-wrapper {
        background: var(--ion-card-background);
        border: 1px solid var(--ion-color-light-shade);
        border-radius: 12px;
        padding: 8px 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      }

      /* FIX DARK MODE: Input wrapper cũng cần viền tối hơn */
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
      }
    `,
  ],
})
export class EventDetailModalComponent {
  // Signals
  protected eventSignal = signal<SelfOpsEvent | null>(null);
  protected reflectionNote = signal('');
  protected isSaving = signal(false); // Signal cho loading state

  @Input() set event(val: SelfOpsEvent) {
    this.eventSignal.set(val);
    this.reflectionNote.set(val.reflection || '');
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
    });
  }

  // Wrapper gọi Utils
  getEventConfig(type: string) {
    return AppUtils.getTypeConfig(type);
  }

  // Wrapper để parse emotion string thành mảng
  parseEmotions(emoStr: string) {
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
      await this.db.updateReflection(evt.uuid, this.reflectionNote());
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
