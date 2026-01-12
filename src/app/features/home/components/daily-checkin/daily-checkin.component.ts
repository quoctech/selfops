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
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonRange,
  IonSpinner,
  IonTextarea,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  happyOutline,
  sadOutline,
  saveOutline,
} from 'ionicons/icons';
import { DatabaseService } from 'src/app/core/services/database/database.service';

@Component({
  selector: 'app-daily-checkin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonCard,
    IonCardContent,
    IonRange,
    IonIcon,
    IonTextarea,
    IonButton,
    IonSpinner,
  ],
  template: `
    <ion-card class="checkin-card">
      <ion-card-content class="card-inner">
        @if (hasCheckedIn()) {
        <div class="done-state fade-in">
          <div class="score-circle" [style.--circle-color]="scoreColor()">
            {{ score() }}
          </div>
          <div class="message">
            <h3>Đã lưu vào hồ sơ</h3>
            <p>"{{ reason() || 'Một ngày không lời' }}"</p>
          </div>
          <ion-icon
            name="checkmark-circle"
            color="success"
            class="check-icon"
          ></ion-icon>
        </div>
        } @else {
        <div class="header-row">
          <div class="question-box">
            <h3>Hôm nay bạn chấm mình mấy điểm?</h3>
            <p class="score-desc" [style.color]="scoreColor()">
              {{ scoreLabel() }}
            </p>
          </div>
          <div class="score-badge" [style.color]="scoreColor()">
            {{ score() }}
          </div>
        </div>

        <ion-range
          [ngModel]="score()"
          (ionInput)="onRangeChange($event)"
          [min]="0"
          [max]="100"
          [pin]="true"
          [debounce]="0"
          mode="ios"
          class="custom-range"
        >
          <ion-icon slot="start" name="sad-outline" color="medium"></ion-icon>
          <ion-icon slot="end" name="happy-outline" color="warning"></ion-icon>
        </ion-range>

        <div class="input-area">
          <ion-textarea
            [(ngModel)]="reason"
            placeholder="Lý do chính là gì? (Ngắn gọn...)"
            rows="1"
            [autoGrow]="true"
            class="reason-input"
            enterkeyhint="done"
          ></ion-textarea>

          <ion-button
            (click)="submit()"
            [disabled]="isSaving()"
            class="submit-btn"
            color="primary"
          >
            @if (isSaving()) {
            <ion-spinner name="crescent"></ion-spinner>
            } @else { Chốt }
          </ion-button>
        </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      /* --- CARD CONTAINER --- */
      .checkin-card {
        margin: 0 0 24px 0;
        border-radius: 20px;
        background: var(--ion-card-background);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        border: 1px solid var(--ion-color-light-shade);
      }

      .card-inner {
        padding: 16px;
      }

      /* --- HEADER ROW --- */
      .header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
      }
      .question-box h3 {
        margin: 0 0 4px 0;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.3;
        color: var(--ion-text-color);
      }
      .score-desc {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 600;
        transition: color 0.2s ease;
      }
      .score-badge {
        font-size: 1.5rem;
        font-weight: 800;
        min-width: 44px;
        text-align: right;
        line-height: 1;
      }

      /* --- RANGE SLIDER --- */
      .custom-range {
        padding-top: 0;
        padding-bottom: 12px;
        --bar-height: 6px;
        --bar-border-radius: 4px;
        --knob-size: 24px;
        --knob-box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
      }

      /* --- INPUT AREA (Chat-like) --- */
      .input-area {
        display: flex;
        gap: 12px;
        align-items: flex-end;
      }

      .reason-input {
        --background: var(
          --ion-color-step-50,
          #f6f6f6
        ); /* Auto Dark Mode support */
        --padding-start: 16px;
        --padding-end: 16px;
        --padding-top: 12px;
        --padding-bottom: 12px;
        --border-radius: 24px; /* Tròn kiểu iMessage */
        font-size: 0.95rem;
        min-height: 48px;
        flex: 1;
        border: 1px solid transparent;
        transition: all 0.2s;
      }
      /* Fix Dark Mode Background */
      :host-context(body.dark) .reason-input {
        --background: var(--ion-color-step-100);
      }

      .reason-input.ion-focused {
        border-color: var(--ion-color-primary);
        transform: translateY(-1px);
      }

      .submit-btn {
        margin: 0;
        height: 48px;
        width: 80px;
        font-weight: 700;
        --border-radius: 16px;
        --box-shadow: 0 4px 12px rgba(var(--ion-color-primary-rgb), 0.3);
      }

      /* --- DONE STATE --- */
      .done-state {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 6px 0;
      }
      .score-circle {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff; /* Chữ luôn trắng để nổi trên nền màu */
        font-weight: 800;
        font-size: 1.3rem;
        background: var(--circle-color);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      }
      .message {
        flex: 1;
      }
      .message h3 {
        margin: 0 0 4px 0;
        font-size: 1rem;
        color: var(--ion-text-color);
        font-weight: 700;
      }
      .message p {
        margin: 0;
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        font-style: italic;
      }
      .check-icon {
        font-size: 28px;
        opacity: 0.8;
      }

      /* Animation */
      .fade-in {
        animation: fadeIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class DailyCheckInComponent implements OnInit {
  private db = inject(DatabaseService);

  score = signal(50);
  reason = signal('');
  isSaving = signal(false);
  hasCheckedIn = signal(false);

  // 1. Tối ưu: Sử dụng Ionic Variables cho màu sắc (Hỗ trợ Dark Mode)
  scoreColor = computed(() => {
    const s = this.score();
    if (s >= 80) return 'var(--ion-color-success)';
    if (s >= 60) return 'var(--ion-color-secondary)'; // Thay hex bằng variable
    if (s >= 40) return 'var(--ion-color-warning)';
    if (s >= 20) return 'var(--ion-color-danger)';
    return 'var(--ion-color-medium)'; // Thay hex bằng variable
  });

  scoreLabel = computed(() => {
    const s = this.score();
    if (s >= 90) return 'Tuyệt vời 🤩'; // Rút gọn text cho đỡ rườm rà
    if (s >= 75) return 'Năng suất 😊';
    if (s >= 60) return 'Khá ổn 🙂';
    if (s >= 40) return 'Bình thường 😐';
    if (s >= 25) return 'Áp lực 😕';
    if (s >= 10) return 'Mệt mỏi 😞';
    return 'Tệ hại 💀';
  });

  constructor() {
    addIcons({ happyOutline, sadOutline, saveOutline, checkmarkCircle });
  }

  async ngOnInit() {
    const log = await this.db.getTodayLog();
    if (log) {
      this.score.set(log.score);
      this.reason.set(log.reason);
      this.hasCheckedIn.set(true);
    }
  }

  onRangeChange(ev: any) {
    this.score.set(ev.detail.value);
  }

  async submit() {
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
