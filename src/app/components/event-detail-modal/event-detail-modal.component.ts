import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PluginListenerHandle } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
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
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  bulbOutline,
  checkmarkCircleOutline,
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

    <ion-content class="ion-padding" #content>
      @if (viewState(); as state) {
      <ion-card class="read-only-card">
        <ion-card-header>
          <div class="card-meta">
            <ion-badge [color]="state.config.color" mode="ios">
              <ion-icon
                [name]="state.config.icon"
                style="margin-right: 4px;"
              ></ion-icon>
              {{ state.config.label }}
            </ion-badge>

            <span class="date-text">
              <ion-icon name="time-outline"></ion-icon>
              {{ state.originalEvent.created_at | date : 'short' }}
            </span>
          </div>
        </ion-card-header>

        <ion-card-content>
          <p class="context-label">Bạn đã quyết định/suy nghĩ:</p>
          <p class="context-text">{{ state.originalEvent.context }}</p>

          @if (state.emotions.length > 0) {
          <div class="emotion-container">
            @for (emo of state.emotions; track emo) {
            <ion-chip outline color="medium" class="mini-chip">
              <ion-label>{{ emo }}</ion-label>
            </ion-chip>
            }
          </div>
          }
        </ion-card-content>
      </ion-card>
      }

      <div class="input-section" #outcomeSection>
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
            placeholder="Ví dụ: Kết quả tốt hơn mình nghĩ..."
            class="custom-textarea"
            [autoGrow]="true"
            (ionFocus)="setCurrentFocus('outcome')"
          ></ion-textarea>
        </div>
      </div>

      <div class="input-section ion-margin-top" #reflectionSection>
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
            (ionFocus)="setCurrentFocus('reflection')"
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

      <div class="keyboard-spacer"></div>
    </ion-content>
  `,
  styles: [
    `
      /* === OPTIMIZED CSS === */

      /* 1. READ ONLY CARD */
      .read-only-card {
        margin: 0 0 24px 0;
        background: var(--ion-color-light);
        box-shadow: none;
        border-radius: 16px;
        border: 1px solid var(--ion-color-light-shade);
        /* Performance: Tách layer render riêng biệt */
        contain: content;
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

      /* 2. INPUT SECTIONS */
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
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        /* Performance: Tối ưu paint */
        contain: layout paint;
      }
      .input-wrapper:focus-within {
        border-color: var(--ion-color-primary);
        box-shadow: 0 4px 12px rgba(var(--ion-color-primary-rgb), 0.1);
      }

      .custom-textarea {
        --padding-start: 0;
        font-size: 1rem;
      }

      .save-btn {
        --border-radius: 12px;
        height: 48px;
        font-weight: 600;
        margin-bottom: 40px;
      }

      .keyboard-spacer {
        height: 300px;
        pointer-events: none;
      }

      /* 3. DARK MODE GROUPED */
      :host-context(body.dark) {
        .read-only-card {
          background: var(--ion-color-step-100);
          border-color: var(--ion-color-step-200);
        }
        .input-wrapper {
          background: var(--ion-color-step-50);
          border-color: var(--ion-color-step-150);
        }
      }
    `,
  ],
})
export class EventDetailModalComponent implements OnInit, OnDestroy {
  // --- STATE ---
  private eventSignal = signal<SelfOpsEvent | null>(null);

  // Computed View State: Tính toán 1 lần duy nhất khi input thay đổi
  // Giúp template render cực nhanh, không gọi hàm lặp đi lặp lại.
  protected viewState = computed(() => {
    const evt = this.eventSignal();
    if (!evt) return null;

    return {
      originalEvent: evt,
      config: AppUtils.getTypeConfig(evt.type),
      emotions: AppUtils.parseEmotions(evt.emotion || ''),
    };
  });

  // Editable Signals
  protected reflectionNote = signal('');
  protected actualOutcome = signal('');
  protected isSaving = signal(false);

  // Logic Focus Keyboard
  private currentFocus: 'outcome' | 'reflection' | null = null;

  @ViewChild('content') content!: IonContent;
  @ViewChild('outcomeSection', { read: ElementRef }) outcomeEl!: ElementRef;
  @ViewChild('reflectionSection', { read: ElementRef })
  reflectionEl!: ElementRef;

  @Input() set event(val: SelfOpsEvent) {
    this.eventSignal.set(val);
    this.reflectionNote.set(val.reflection || '');
    this.actualOutcome.set(val.actual_outcome || '');
  }

  private modalCtrl = inject(ModalController);
  private db = inject(DatabaseService);
  private alertCtrl = inject(AlertController);
  private platform = inject(Platform);
  private keyboardListener: PluginListenerHandle | undefined;

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

  ngOnInit() {
    if (this.platform.is('capacitor')) {
      this.initKeyboardLogic();
    }
  }

  ngOnDestroy() {
    if (this.keyboardListener) this.keyboardListener.remove();
  }

  // --- KEYBOARD LOGIC ---
  async initKeyboardLogic() {
    this.keyboardListener = await Keyboard.addListener(
      'keyboardDidShow',
      () => {
        this.scrollToFocusedInput();
      }
    );
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  }

  setCurrentFocus(section: 'outcome' | 'reflection') {
    this.currentFocus = section;
  }

  scrollToFocusedInput() {
    if (!this.currentFocus) return;

    const targetEl =
      this.currentFocus === 'outcome'
        ? this.outcomeEl.nativeElement
        : this.reflectionEl.nativeElement;

    // Scroll section lên sát mép trên (cách 10px)
    const y = targetEl.offsetTop - 10;
    this.content.scrollToPoint(0, y, 300);
  }
  // ----------------------

  close() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  async saveReflection() {
    const evt = this.eventSignal();
    if (!evt) return;

    this.isSaving.set(true);
    try {
      await this.db.updateReview(
        evt.uuid,
        this.reflectionNote(),
        this.actualOutcome()
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
        { text: 'Giữ lại', role: 'cancel', cssClass: 'secondary' },
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
