import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  checkmarkOutline,
  closeOutline,
  heartOutline,
} from 'ionicons/icons';
import {
  ONE_WEEK_MS,
  SelfOpsEvent,
  SelfOpsEventType,
} from 'src/app/core/models/event.type';
import { DatabaseService } from 'src/app/core/services/database/database.service';
import { AppUtils } from 'src/app/core/utils/app.utils';

// 👇 1. IMPORT HAPTICS
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

@Component({
  selector: 'app-add-event-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonTextarea,
    IonIcon,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button color="medium" (click)="cancel()">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>

        <ion-title>Nhật ký hôm nay</ion-title>

        <ion-buttons slot="end">
          <ion-button
            color="primary"
            (click)="save()"
            [strong]="true"
            [disabled]="isSaving() || !eventData.context"
          >
            @if (isSaving()) {
            <ion-spinner
              name="crescent"
              style="width: 24px; height: 24px;"
            ></ion-spinner>
            } @else {
            <ion-icon
              slot="icon-only"
              name="checkmark-outline"
              size="large"
            ></ion-icon>
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="segment-container">
        <ion-segment
          [(ngModel)]="eventData.type"
          [color]="currentSegmentColor"
          mode="ios"
          class="custom-segment"
          (ionChange)="hapticSelection()"
        >
          @for (type of eventTypes; track type) {
          <ion-segment-button [value]="type">
            <ion-label class="segment-text">{{ getLabel(type) }}</ion-label>
          </ion-segment-button>
          }
        </ion-segment>
      </div>

      <div class="input-container">
        <ion-textarea
          class="custom-textarea"
          [(ngModel)]="eventData.context"
          rows="6"
          label="Nội dung sự kiện"
          labelPlacement="floating"
          placeholder="Ví dụ: Đã chốt được phương án deploy mới, hoặc lỡ tay xóa nhầm data..."
          [autoGrow]="true"
        >
        </ion-textarea>
      </div>

      <div class="emotion-section">
        <p class="section-title">
          <ion-icon name="heart-outline"></ion-icon>
          Bạn cảm thấy thế nào?
        </p>

        <div class="chips-wrapper">
          @for (emo of emotionChips; track emo) {
          <div
            class="custom-chip"
            [class.active]="isEmotionSelected(emo)"
            (click)="selectEmotion(emo)"
          >
            @if(isEmotionSelected(emo)) {
            <ion-icon name="checkmark-circle" class="check-icon"></ion-icon>
            }
            <span>{{ emo }}</span>
          </div>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      /* ... Giữ nguyên style cũ của bạn ... */
      /* Header & Toolbar */
      ion-toolbar {
        --border-style: none;
      }

      .segment-container {
        margin-bottom: 24px;
        padding: 4px;
        background: var(--ion-color-light);
        border-radius: 12px;
      }
      :host-context(body.dark) .segment-container {
        background: var(--ion-color-step-100);
      }

      ion-segment-button {
        --padding-start: 4px;
        --padding-end: 4px;
        min-width: auto;
      }

      .segment-text {
        white-space: normal;
        text-overflow: clip;
        overflow: visible;
        font-size: 0.85rem;
        line-height: 1.1;
        padding: 4px 0;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      .input-container {
        background: var(--ion-card-background);
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 24px;
        border: 1px solid var(--ion-color-step-150, #e0e0e0);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        transition: border-color 0.3s;
      }
      :host-context(body.dark) .input-container {
        border-color: var(--ion-color-step-200);
      }
      .input-container:focus-within {
        border-color: var(--ion-color-primary);
      }

      .custom-textarea {
        --padding-start: 0;
        --padding-end: 0;
        --padding-top: 0;
        --placeholder-color: var(--ion-color-medium);
        font-size: 1.1rem;
        line-height: 1.6;
      }

      .emotion-section {
        margin-top: 10px;
      }
      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        color: var(--ion-text-color);
        margin-bottom: 16px;
        font-size: 1rem;
      }

      .chips-wrapper {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .custom-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 8px 16px;
        border-radius: 24px;
        background-color: var(--ion-color-light);
        color: var(--ion-text-color);
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        user-select: none;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        border: 1px solid transparent;
      }
      :host-context(body.dark) .custom-chip {
        background-color: var(--ion-color-step-150);
      }
      .custom-chip:hover {
        background-color: var(--ion-color-step-100);
      }
      :host-context(body.dark) .custom-chip:hover {
        background-color: var(--ion-color-step-250);
      }

      .custom-chip.active {
        background-color: var(--ion-color-primary);
        color: white;
        box-shadow: 0 4px 12px rgba(var(--ion-color-primary-rgb), 0.3);
        transform: translateY(-2px);
        padding-left: 12px;
        font-weight: 600;
      }

      .check-icon {
        margin-right: 6px;
        font-size: 1.1rem;
        animation: scaleIn 0.2s ease-out;
      }
      @keyframes scaleIn {
        from {
          transform: scale(0);
          width: 0;
        }
        to {
          transform: scale(1);
          width: 1.1rem;
        }
      }
    `,
  ],
})
export class AddEventModalComponent {
  isSaving = signal(false);

  eventData = {
    type: SelfOpsEventType.DECISION,
    context: '',
    emotion: '',
  };

  eventTypes = Object.values(SelfOpsEventType);
  emotionChips = [
    'Lo lắng',
    'Tức giận',
    'Hào hứng',
    'Mệt mỏi',
    'Tự tin',
    'Vội vàng',
    'Buồn',
    'Biết ơn',
  ];

  private modalCtrl = inject(ModalController);
  private databaseService = inject(DatabaseService);

  constructor() {
    addIcons({ heartOutline, closeOutline, checkmarkCircle, checkmarkOutline });
  }

  get currentSegmentColor(): string {
    switch (this.eventData.type) {
      case SelfOpsEventType.DECISION:
        return 'primary';
      case SelfOpsEventType.MISTAKE:
        return 'danger';
      case SelfOpsEventType.STRESS:
        return 'warning';
      default:
        return 'primary';
    }
  }

  getLabel(type: SelfOpsEventType) {
    return AppUtils.getTypeConfig(type).label;
  }

  isEmotionSelected(emo: string): boolean {
    return this.eventData.emotion.split(',').includes(emo);
  }

  // 👇 Helper: Rung nhẹ khi chọn item (Selection)
  async hapticSelection() {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  }

  selectEmotion(emo: string) {
    // 2. Rung nhẹ khi chọn cảm xúc
    Haptics.impact({ style: ImpactStyle.Light });

    let tags = this.eventData.emotion ? this.eventData.emotion.split(',') : [];
    tags = tags.map((t) => t.trim()).filter((t) => t !== '');

    if (tags.includes(emo)) {
      tags = tags.filter((t) => t !== emo);
    } else {
      tags.push(emo);
    }
    this.eventData.emotion = tags.join(',');
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  async save() {
    if (!this.eventData.context) return;

    // 3. Rung MEDIUM khi bấm nút Lưu (Cảm giác chắc tay)
    await Haptics.impact({ style: ImpactStyle.Medium });

    this.isSaving.set(true);

    try {
      const newEvent: SelfOpsEvent = {
        uuid: AppUtils.generateUUID(),
        type: this.eventData.type,
        context: this.eventData.context,
        emotion: this.eventData.emotion,
        is_reviewed: false,
        review_due_date: Date.now() + ONE_WEEK_MS, // Hẹn 7 ngày sau sẽ Review
        created_at: Date.now(),
      };

      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.databaseService.addEvent(newEvent);

      // 4. Rung SUCCESS khi lưu thành công (Rung kép: tạch-tạch)
      await Haptics.notification({ type: NotificationType.Success });

      await this.modalCtrl.dismiss(true, 'confirm');
    } catch (e) {
      console.error(e);
      // Rung ERROR nếu lỗi (Rung dài)
      await Haptics.notification({ type: NotificationType.Error });
    } finally {
      this.isSaving.set(false);
    }
  }
}
