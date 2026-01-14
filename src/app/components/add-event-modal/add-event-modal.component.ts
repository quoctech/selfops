import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PluginListenerHandle } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
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
  Platform,
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

// Static Data: Khai báo ngoài class để không tốn bộ nhớ khởi tạo lại
const EMOTION_CHIPS = [
  'Lo lắng',
  'Tức giận',
  'Hào hứng',
  'Mệt mỏi',
  'Tự tin',
  'Vội vàng',
  'Buồn',
  'Biết ơn',
];

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
            [disabled]="isSaving() || !context()"
          >
            @if (isSaving()) {
            <ion-spinner name="crescent" class="custom-spinner"></ion-spinner>
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

    <ion-content class="ion-padding" #content>
      <div class="segment-container">
        <ion-segment
          [value]="selectedType()"
          (ionChange)="onTypeChange($event)"
          [color]="dynamicColor()"
          mode="ios"
          class="custom-segment"
        >
          @for (item of uiEventTypes; track item.value) {
          <ion-segment-button [value]="item.value">
            <ion-label class="segment-text">{{ item.label }}</ion-label>
          </ion-segment-button>
          }
        </ion-segment>
      </div>

      <div class="input-container" #inputContainer>
        <ion-textarea
          class="custom-textarea"
          [ngModel]="context()"
          (ngModelChange)="context.set($event)"
          rows="5"
          label="Nội dung sự kiện"
          labelPlacement="floating"
          placeholder="Ví dụ: Đã chốt được phương án deploy mới..."
          [autoGrow]="true"
          inputmode="text"
        ></ion-textarea>
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
            [class.active]="selectedEmotions().has(emo)"
            (click)="toggleEmotion(emo)"
          >
            @if(selectedEmotions().has(emo)) {
            <ion-icon name="checkmark-circle" class="check-icon"></ion-icon>
            }
            <span>{{ emo }}</span>
          </div>
          }
        </div>
      </div>

      <div class="keyboard-spacer"></div>
    </ion-content>
  `,
  styles: [
    `
      /* === OPTIMIZED CSS === */

      /* Utilities */
      .custom-spinner {
        width: 24px;
        height: 24px;
      }
      ion-toolbar {
        --border-style: none;
      }

      /* Segment */
      .segment-container {
        margin-bottom: 24px;
        padding: 4px;
        background: var(--ion-color-light);
        border-radius: 12px;
        /* Performance: Giúp trình duyệt paint riêng layer này */
        contain: content;
      }

      ion-segment-button {
        --padding-start: 4px;
        --padding-end: 4px;
        min-width: auto;
      }
      .segment-text {
        white-space: normal;
        font-size: 0.85rem;
        line-height: 1.1;
        padding: 4px 0;
        font-weight: 600;
        letter-spacing: 0.3px;
      }

      /* Input Box */
      .input-container {
        background: var(--ion-card-background);
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 24px;
        border: 1px solid var(--ion-color-step-150, #e0e0e0);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        transition: border-color 0.2s ease;
        contain: content;
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

      /* Emotion Section */
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
        /* Fix layout shift */
        min-height: 40px;
      }

      /* Chip Styles - Tối ưu selector */
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
        transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1),
          background-color 0.2s;
        border: 1px solid transparent;
        /* Performance: Báo trước cho trình duyệt */
        will-change: transform, background-color;
      }

      .custom-chip:active {
        transform: scale(0.95);
      } /* Feedback vật lý */

      .custom-chip.active {
        background-color: var(--ion-color-primary);
        color: white;
        box-shadow: 0 4px 12px rgba(var(--ion-color-primary-rgb), 0.3);
        padding-left: 12px;
        font-weight: 600;
      }

      .check-icon {
        margin-right: 6px;
        font-size: 1.1rem;
        animation: scaleIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
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

      .keyboard-spacer {
        height: 350px;
        pointer-events: none;
      }

      /* --- DARK MODE OVERRIDES --- */
      :host-context(body.dark) {
        .segment-container {
          background: var(--ion-color-step-100);
        }
        .input-container {
          border-color: var(--ion-color-step-200);
        }
        .custom-chip {
          background-color: var(--ion-color-step-150);
        }
        .custom-chip:hover {
          background-color: var(--ion-color-step-250);
        }
      }
    `,
  ],
})
export class AddEventModalComponent implements OnInit, OnDestroy {
  // Signals quản lý State (Reactive & Performant)
  isSaving = signal(false);
  selectedType = signal<SelfOpsEventType>(SelfOpsEventType.DECISION);
  context = signal('');

  // Tối ưu: Dùng Set để lookup O(1)
  selectedEmotions = signal<Set<string>>(new Set());

  readonly emotionChips = EMOTION_CHIPS;
  // Pre-calculate Labels cho HTML đỡ phải gọi function
  readonly uiEventTypes = Object.values(SelfOpsEventType).map((type) => ({
    value: type,
    label: AppUtils.getTypeConfig(type).label,
  }));

  @ViewChild('content') content!: IonContent;
  @ViewChild('inputContainer', { read: ElementRef })
  inputContainer!: ElementRef;

  private modalCtrl = inject(ModalController);
  private databaseService = inject(DatabaseService);
  private platform = inject(Platform);
  private keyboardListener: PluginListenerHandle | undefined;

  constructor() {
    addIcons({ heartOutline, closeOutline, checkmarkCircle, checkmarkOutline });
  }

  dynamicColor = computed(() => {
    switch (this.selectedType()) {
      case SelfOpsEventType.DECISION:
        return 'primary';
      case SelfOpsEventType.MISTAKE:
        return 'danger';
      case SelfOpsEventType.STRESS:
        return 'warning';
      default:
        return 'primary';
    }
  });

  ngOnInit() {
    if (this.platform.is('capacitor')) {
      this.initKeyboardLogic();
    }
  }

  ngOnDestroy() {
    if (this.keyboardListener) this.keyboardListener.remove();
  }

  async initKeyboardLogic() {
    this.keyboardListener = await Keyboard.addListener(
      'keyboardDidShow',
      () => {
        const el = this.inputContainer.nativeElement;
        const y = el.offsetTop - 16;
        this.content.scrollToPoint(0, y, 300);
      }
    );

    if (this.platform.is('ios')) {
      try {
        await Keyboard.setAccessoryBarVisible({ isVisible: true });
      } catch (e) {
        console.warn('Keyboard accessory bar error', e);
      }
    }
  }

  async onTypeChange(ev: any) {
    this.selectedType.set(ev.detail.value);
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  }

  toggleEmotion(emo: string) {
    Haptics.impact({ style: ImpactStyle.Light });

    // Update Set immutable way
    const currentSet = new Set(this.selectedEmotions());
    if (currentSet.has(emo)) {
      currentSet.delete(emo);
    } else {
      currentSet.add(emo);
    }
    this.selectedEmotions.set(currentSet);
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  async save() {
    const text = this.context();
    if (!text) return;

    await Haptics.impact({ style: ImpactStyle.Medium });
    this.isSaving.set(true);

    try {
      const emotionStr = Array.from(this.selectedEmotions()).join(',');

      const newEvent: SelfOpsEvent = {
        uuid: AppUtils.generateUUID(),
        type: this.selectedType(),
        context: text,
        emotion: emotionStr,
        tags: [],
        meta_data: [],
        is_reviewed: false,
        review_due_date: Date.now() + ONE_WEEK_MS,
        created_at: Date.now(),
      };

      await this.databaseService.addEvent(newEvent);
      await Haptics.notification({ type: NotificationType.Success });
      await this.modalCtrl.dismiss(true, 'confirm');
    } catch (e) {
      console.error(e);
      await Haptics.notification({ type: NotificationType.Error });
    } finally {
      this.isSaving.set(false);
    }
  }
}
