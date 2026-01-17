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
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  checkmarkOutline,
  closeOutline,
  happyOutline,
  helpBuoyOutline,
  pricetagsOutline,
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
    IonFooter,
    IonTextarea,
    IonIcon,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title class="modal-title">Chiêm nghiệm</ion-title>

        <ion-buttons slot="end">
          <ion-button color="danger" (click)="confirmDelete()">
            <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-horizontal no-scroll-bounce" #content>
      @if (viewState(); as state) {
      <div class="recap-card top-spacing">
        <div class="meta-row">
          <div
            class="type-pill"
            [style.background]="
              'rgba(var(--ion-color-' + state.config.color + '-rgb), 0.1)'
            "
            [style.color]="'var(--ion-color-' + state.config.color + ')'"
          >
            <ion-icon [name]="state.config.icon"></ion-icon>
            {{ state.config.label }}
          </div>
          <div class="time-label">
            {{ state.originalEvent.created_at | date : 'dd/MM HH:mm' }}
          </div>
        </div>

        <div
          class="context-body"
          [innerHTML]="state.originalEvent.context"
        ></div>

        @if (state.tags.length > 0 || state.emotions.length > 0) {
        <div class="meta-footer">
          @for (tag of state.tags; track tag) {
          <span class="meta-chip tag-chip">#{{ tag }}</span>
          } @for (emo of state.emotions; track emo) {
          <span class="meta-chip emo-chip">{{ emo }}</span>
          }
        </div>
        }
      </div>
      }

      <div class="review-form-container">
        <div class="input-group" #outcomeSection>
          <div class="group-label">
            <ion-icon name="time-outline" color="medium"></ion-icon>
            Kết quả thực tế
          </div>
          <div class="input-box">
            <ion-textarea
              class="custom-textarea"
              [ngModel]="actualOutcome()"
              (ngModelChange)="actualOutcome.set($event)"
              rows="3"
              placeholder="Chuyện gì đã thực sự xảy ra?"
              [autoGrow]="true"
              (ionFocus)="setCurrentFocus('outcome')"
            ></ion-textarea>
          </div>
        </div>

        <div class="input-group" #reflectionSection>
          <div class="group-label">
            <ion-icon name="happy-outline" color="warning"></ion-icon>
            Bài học rút ra
          </div>
          <div class="input-box">
            <ion-textarea
              class="custom-textarea"
              [ngModel]="reflectionNote()"
              (ngModelChange)="reflectionNote.set($event)"
              rows="4"
              placeholder="Lần sau mình sẽ làm gì tốt hơn?"
              [autoGrow]="true"
              (ionFocus)="setCurrentFocus('reflection')"
            ></ion-textarea>
          </div>
        </div>
      </div>

      <div class="footer-spacer"></div>
    </ion-content>

    <ion-footer class="ion-no-border modal-footer">
      <ion-toolbar class="footer-toolbar">
        <div class="footer-actions">
          <ion-button
            fill="clear"
            class="btn-icon-round btn-cancel"
            (click)="close()"
          >
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>

          <ion-button
            shape="circle"
            color="primary"
            class="btn-icon-round btn-save"
            [disabled]="isSaving()"
            (click)="saveReflection()"
          >
            @if (isSaving()) {
            <ion-spinner name="crescent" color="light"></ion-spinner>
            } @else {
            <ion-icon slot="icon-only" name="checkmark-outline"></ion-icon>
            }
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [
    `
      /* --- GLOBAL --- */
      ion-content {
        --background: var(--ion-background-color);
      }
      .no-scroll-bounce::part(scroll) {
        overscroll-behavior-y: none;
      }
      .top-spacing {
        margin-top: 10px;
      }
      .modal-title {
        font-weight: 800;
        font-size: 1.1rem;
        opacity: 0.9;
      }

      /* --- 1. RECAP CARD (Styled like a ticket/card) --- */
      .recap-card {
        background: var(--ion-color-step-50, #f8f9fa);
        border: 1px solid var(--ion-color-step-150, #e9ecef);
        border-radius: 18px;
        padding: 16px;
        margin-bottom: 24px;
        position: relative;
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .type-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .time-label {
        font-size: 0.8rem;
        color: var(--ion-color-medium);
        font-weight: 500;
      }

      .context-body {
        font-size: 1.05rem;
        line-height: 1.6;
        color: var(--ion-text-color);
        font-weight: 500;
        margin-bottom: 16px;
      }

      .meta-footer {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding-top: 12px;
        border-top: 1px dashed var(--ion-color-step-200, #dee2e6);
      }
      .meta-chip {
        font-size: 0.75rem;
        padding: 4px 10px;
        border-radius: 12px;
        font-weight: 600;
      }
      .tag-chip {
        background: var(--ion-color-step-150, #e9ecef);
        color: var(--ion-text-color);
      }
      .emo-chip {
        background: transparent;
        border: 1px solid var(--ion-color-step-250, #ced4da);
        color: var(--ion-color-medium);
      }

      /* --- 2. INPUT FORMS --- */
      .review-form-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .input-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .group-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--ion-color-medium);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding-left: 4px;
      }

      .input-box {
        background: var(--ion-card-background);
        border: 1px solid var(--ion-color-light-shade);
        border-radius: 16px;
        padding: 12px 16px;
        transition: all 0.2s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
      }
      .input-box:focus-within {
        border-color: var(--ion-color-primary);
        box-shadow: 0 4px 12px rgba(var(--ion-color-primary-rgb), 0.15);
        transform: translateY(-1px);
      }

      .custom-textarea {
        --padding-start: 0;
        --padding-end: 0;
        --padding-top: 0;
        --placeholder-color: var(--ion-color-step-300);
        font-size: 1.1rem;
        line-height: 1.6;
      }

      /* --- 3. FOOTER ACTIONS --- */
      .modal-footer {
        --background: transparent;
        padding-bottom: 10px;
      }
      .footer-toolbar {
        --background: transparent;
        --border-width: 0;
      }
      .footer-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 20px;
        width: 100%;
      }

      .btn-icon-round {
        width: 60px;
        height: 60px;
        margin: 0;
        --padding-start: 0;
        --padding-end: 0;
        --border-radius: 50%;
        font-size: 1.8rem;
        transition: transform 0.1s;
      }
      .btn-icon-round:active {
        transform: scale(0.92);
      }

      .btn-cancel {
        --color: var(--ion-color-medium);
        --background: var(--ion-color-step-100); /* Nền xám nhẹ */
      }

      .btn-save {
        --box-shadow: 0 8px 24px rgba(var(--ion-color-primary-rgb), 0.35);
        font-size: 2rem; /* Icon to hơn chút */
      }

      .footer-spacer {
        height: 100px;
      }

      /* DARK MODE */
      :host-context(body.dark) {
        .recap-card {
          background: var(--ion-color-step-100);
          border-color: var(--ion-color-step-200);
        }
        .meta-footer {
          border-top-color: var(--ion-color-step-200);
        }
        .tag-chip {
          background: var(--ion-color-step-200);
        }
        .emo-chip {
          border-color: var(--ion-color-step-300);
        }
        .input-box {
          border-color: var(--ion-color-step-200);
        }
        .btn-cancel {
          --background: var(--ion-color-step-150);
        }
      }
    `,
  ],
})
export class EventDetailModalComponent implements OnInit, OnDestroy {
  // Input Signal Wrapper
  private eventInput = signal<SelfOpsEvent | null>(null);

  @Input() set event(val: SelfOpsEvent) {
    this.eventInput.set(val);
    this.reflectionNote.set(val.reflection || '');
    this.actualOutcome.set(val.actual_outcome || '');
  }

  // --- STATE ---
  isSaving = signal(false);
  reflectionNote = signal('');
  actualOutcome = signal('');

  // Computed View State
  viewState = computed(() => {
    const evt = this.eventInput();
    if (!evt) return null;
    return {
      originalEvent: evt,
      config: AppUtils.getTypeConfig(evt.type),
      emotions: AppUtils.parseEmotions(evt.emotion || ''),
      tags: evt.tags || [],
    };
  });

  // Keyboard & Scroll Logic
  private currentFocus: 'outcome' | 'reflection' | null = null;
  private keyboardListener: PluginListenerHandle | undefined;

  @ViewChild('content') content!: IonContent;
  @ViewChild('outcomeSection', { read: ElementRef }) outcomeEl!: ElementRef;
  @ViewChild('reflectionSection', { read: ElementRef })
  reflectionEl!: ElementRef;

  // Injects
  private modalCtrl = inject(ModalController);
  private db = inject(DatabaseService);
  private alertCtrl = inject(AlertController);
  private platform = inject(Platform);

  constructor() {
    addIcons({
      checkmarkOutline,
      trashOutline,
      closeOutline,
      timeOutline,
      happyOutline,
      helpBuoyOutline,
      pricetagsOutline,
      alertCircleOutline,
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

  async initKeyboardLogic() {
    this.keyboardListener = await Keyboard.addListener(
      'keyboardDidShow',
      () => {
        this.scrollToFocusedInput();
      }
    );
  }

  setCurrentFocus(section: 'outcome' | 'reflection') {
    this.currentFocus = section;
  }

  scrollToFocusedInput() {
    if (!this.currentFocus) return;
    const targetRef =
      this.currentFocus === 'outcome' ? this.outcomeEl : this.reflectionEl;

    if (targetRef?.nativeElement) {
      setTimeout(() => {
        // Scroll nhẹ để input không bị che, chừa khoảng 20px ở trên
        const y = targetRef.nativeElement.offsetTop - 20;
        this.content.scrollToPoint(0, y, 300);
      }, 50);
    }
  }

  close() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  async saveReflection() {
    const evt = this.eventInput();
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
      message: 'Bạn muốn xóa dòng nhật ký này?',
      buttons: [
        { text: 'Hủy', role: 'cancel', cssClass: 'secondary' },
        {
          text: 'Xóa',
          role: 'destructive',
          handler: async () => {
            const evt = this.eventInput();
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
