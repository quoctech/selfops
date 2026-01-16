import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonRange,
  IonRippleEffect,
  IonSpinner,
  IonTextarea,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircle } from 'ionicons/icons';
import { DatabaseService } from 'src/app/core/services/database/database.service';

@Component({
  selector: 'app-daily-checkin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonCard,
    IonCardContent,
    IonRange,
    IonIcon,
    IonTextarea,
    IonButton,
    IonSpinner,
    IonRippleEffect,
  ],
  template: `
    <ion-card class="checkin-card gpu-layer">
      <ion-card-content class="card-inner">
        @if (hasCheckedIn()) {
        <div class="done-widget fade-in">
          <div class="emoji-circle" [style.background]="scoreColor() + '15'">
            <span class="emoji-vibe">{{ scoreEmoji() }}</span>
          </div>

          <div class="info-col">
            <div class="status-row">
              <span class="score-num" [style.color]="scoreColor()">{{
                score()
              }}</span>
              <span class="status-label">{{ scoreLabel() }}</span>
            </div>
            <div class="note-text text-truncate">
              "{{ reason() || 'Một ngày bình ổn.' }}"
            </div>
          </div>

          <div class="check-col">
            <ion-icon name="checkmark-circle" color="success"></ion-icon>
          </div>
        </div>
        } @else {
        <div class="header-section">
          <div
            class="dynamic-emoji-wrapper"
            [style.background]="scoreColor() + '15'"
          >
            <span class="main-emoji bounce-in">
              {{ scoreEmoji() }}
            </span>
          </div>

          <div class="text-group">
            <h3>Tâm trạng của bạn?</h3>
            <div class="score-display">
              <span class="big-score" [style.color]="scoreColor()">{{
                score()
              }}</span>
              <span
                class="label-badge"
                [style.background]="scoreColor() + '15'"
                [style.color]="scoreColor()"
              >
                {{ scoreLabel() }}
              </span>
            </div>
          </div>
        </div>

        <div class="slider-wrapper">
          <ion-range
            [ngModel]="score()"
            (ionInput)="onRangeChange($event)"
            [min]="0"
            [max]="100"
            mode="ios"
            class="custom-range"
            [style.--active-color]="scoreColor()"
          >
            <span slot="start" class="range-hint">😫</span>
            <span slot="end" class="range-hint">🤣</span>
          </ion-range>
        </div>

        <div class="input-area">
          <ion-textarea
            [(ngModel)]="reason"
            placeholder="Ghi chú nhanh..."
            rows="1"
            [autoGrow]="true"
            class="custom-textarea"
            enterkeyhint="done"
          ></ion-textarea>

          <ion-button
            (click)="submit()"
            [disabled]="isSaving()"
            class="save-btn ion-activatable ripple-parent"
          >
            @if (isSaving()) {
            <ion-spinner name="crescent" class="btn-spinner"></ion-spinner>
            } @else { Chốt }
            <ion-ripple-effect></ion-ripple-effect>
          </ion-button>
        </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      .checkin-card {
        margin: 16px 0 0 0;
        border-radius: 24px;
        background: var(--ion-card-background);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.03);
        border: 1px solid var(--ion-border-color);
        contain: content;
      }
      .card-inner {
        padding: 18px;
      }

      /* === DONE WIDGET (Sau khi chốt) === */
      .done-widget {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .emoji-circle {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
      }
      .info-col {
        flex: 1;
        min-width: 0;
      }
      .status-row {
        display: flex;
        align-items: baseline;
        gap: 6px;
      }
      .score-num {
        font-size: 1.4rem;
        font-weight: 900;
        letter-spacing: -1px;
      }
      .status-label {
        font-size: 0.85rem;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--ion-text-color);
      }
      .note-text {
        font-size: 0.85rem;
        color: var(--ion-color-medium);
        font-style: italic;
        margin-top: -2px;
      }
      .text-truncate {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .check-col {
        font-size: 1.6rem;
      }

      /* === HEADER SECTION === */
      .header-section {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
      }
      .dynamic-emoji-wrapper {
        width: 72px;
        height: 72px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 22px;
        transition: background 0.3s ease;
      }
      .main-emoji {
        font-size: 42px;
        display: block;
      }

      .text-group h3 {
        margin: 0 0 4px 0;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--ion-color-medium);
      }
      .score-display {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .big-score {
        font-size: 2.2rem;
        font-weight: 900;
        line-height: 1;
        letter-spacing: -1px;
      }
      .label-badge {
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      /* === SLIDER === */
      .slider-wrapper {
        margin-bottom: 20px;
        padding: 0 4px;
      }
      .custom-range {
        --bar-height: 8px;
        --bar-border-radius: 10px;
        --knob-size: 28px;
        --bar-background: var(--ion-color-light);
        --bar-background-active: var(--active-color);
        --knob-background: #fff;
        --knob-box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      }
      .range-hint {
        font-size: 1.4rem;
        padding: 0 8px;
      }

      /* === INPUT AREA === */
      .input-area {
        display: flex;
        align-items: flex-end;
        gap: 10px;
      }
      .custom-textarea {
        --background: var(--ion-color-light);
        --padding-start: 16px;
        --padding-end: 16px;
        --padding-top: 14px;
        --padding-bottom: 14px;
        --border-radius: 16px;
        font-size: 0.95rem;
        min-height: 48px;
        flex: 1;
      }

      .save-btn {
        margin: 0;
        height: 48px;
        min-width: 64px;
        font-weight: 800;
        --border-radius: 16px;
        --background: var(--btn-basic-bg);
        --color: var(--btn-basic-text);
      }

      /* === ANIMATIONS === */
      .bounce-in {
        animation: bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      @keyframes bounceIn {
        0% {
          transform: scale(0.5);
          opacity: 0;
        }
        70% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      .fade-in {
        animation: fadeIn 0.5s ease-out;
      }

      :host-context(body.dark) {
        .custom-textarea {
          --background: #1e1e20;
        }
        .dynamic-emoji-wrapper {
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
      }
    `,
  ],
})
export class DailyCheckInComponent implements OnInit {
  private db = inject(DatabaseService);
  private destroyRef = inject(DestroyRef);

  score = signal(50);
  reason = signal('');
  isSaving = signal(false);
  hasCheckedIn = signal(false);

  // --- LOGIC: 5 Levels of Emotion with modern Emojis ---
  scoreConfig = computed(() => {
    const s = this.score();
    // 0-20: Tệ (Rất buồn)
    if (s <= 20)
      return {
        color: '#EF4444', // Danger Red
        emoji: '😫',
        label: 'Tệ hại',
      };
    // 21-40: Áp lực (Hơi buồn/mệt)
    if (s <= 40)
      return {
        color: '#F59E0B', // Warning Orange
        emoji: '🙁',
        label: 'Áp lực',
      };
    // 41-60: Bình thường (Ổn)
    if (s <= 60)
      return {
        color: '#6B7280', // Gray/Medium
        emoji: '😐',
        label: 'Bình thường',
      };
    // 61-80: Tốt (Vui)
    if (s <= 80)
      return {
        color: '#3B82F6', // Primary Blue
        emoji: '🙂',
        label: 'Khá tốt',
      };
    // 81-95: Tuyệt vời (Rất vui)
    if (s <= 95)
      return {
        color: '#10B981', // Success Green
        emoji: '😂',
        label: 'Tuyệt vời',
      };
    // 96-100: Đỉnh cao (Cười rớt nước mắt)
    return {
      color: '#8B5CF6', // Purple Accent
      emoji: '🤣',
      label: 'Đỉnh cao',
    };
  });

  scoreColor = computed(() => this.scoreConfig().color);
  scoreEmoji = computed(() => this.scoreConfig().emoji);
  scoreLabel = computed(() => this.scoreConfig().label);

  constructor() {
    addIcons({ checkmarkCircle });
  }

  ngOnInit() {
    this.checkStatus();
    // Tự động đồng bộ nếu dữ liệu DB thay đổi
    this.db.dataChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.checkStatus());
  }

  async checkStatus() {
    const log = await this.db.getTodayLog();
    if (log) {
      this.score.set(log.score);
      this.reason.set(log.reason);
      this.hasCheckedIn.set(true);
    } else {
      this.hasCheckedIn.set(false);
      this.score.set(50);
      this.reason.set('');
    }
  }

  onRangeChange(ev: any) {
    this.score.set(ev.detail.value);
  }

  async submit() {
    if (this.isSaving()) return;
    this.isSaving.set(true);
    try {
      await this.db.saveDailyLog(this.score(), this.reason());
      this.hasCheckedIn.set(true);
    } catch (e) {
      console.error(e);
    } finally {
      this.isSaving.set(false);
    }
  }
}
