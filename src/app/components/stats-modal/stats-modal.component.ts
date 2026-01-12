import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  Input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  batteryDeadOutline,
  close,
  helpBuoyOutline,
  trendingUpOutline,
} from 'ionicons/icons';

import { SelfOpsEvent, SelfOpsEventType } from 'src/app/core/models/event.type';
import { AppUtils } from 'src/app/core/utils/app.utils';

const COLOR_MAP: Record<string, string> = {
  [SelfOpsEventType.DECISION]: 'var(--ion-color-primary)', // Xanh
  [SelfOpsEventType.MISTAKE]: 'var(--ion-color-danger)', // Đỏ
  [SelfOpsEventType.STRESS]: 'var(--ion-color-warning)', // Vàng
};

@Component({
  selector: 'app-stats-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonContent, IonIcon, IonHeader, IonToolbar],
  template: `
    <ion-header class="ion-padding ion-no-border">
      <ion-toolbar class="transparent-toolbar">
        <div class="custom-header">
          <div class="header-text">
            <span class="subtitle">Thống kê dữ liệu</span>
            <h1 class="main-title">Insight<span class="dot">.</span></h1>
          </div>
          <div class="close-btn" (click)="close()">
            <ion-icon name="close"></ion-icon>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-horizontal stats-content">
      <div class="section-wrapper chart-section">
        <div class="pie-chart-wrapper">
          <div class="pie-chart" [style.background]="chartGradient()">
            <div class="inner-circle">
              <span class="total-number">{{ animatedTotal() }}</span>
              <span class="total-label">Sự kiện</span>
            </div>
          </div>
        </div>

        <div class="legend-grid">
          @for (type of eventTypes; track type) { @let config =
          getEventConfig(type); @let colorVar = getColorVar(type);

          <div class="legend-card">
            <div
              class="legend-icon"
              [style.background]="'var(--ion-color-' + config.color + '-tint)'"
              [style.color]="colorVar"
            >
              <ion-icon [name]="config.icon"></ion-icon>
            </div>

            <div class="legend-info">
              <span class="legend-count" [style.color]="colorVar">{{
                getCountByType(type)
              }}</span>
              <span class="legend-label">{{ config.label }}</span>
            </div>
          </div>
          }
        </div>
      </div>

      <div class="section-wrapper">
        <div class="section-header">
          <ion-icon name="trending-up-outline"></ion-icon>
          <h3>Cảm xúc chủ đạo</h3>
        </div>

        <div class="emotion-list">
          @for (item of topEmotions(); track item.name) {
          <div class="emotion-item">
            <div class="emo-header">
              <span class="emo-name">{{ item.name }}</span>
              <span class="emo-percent"
                >{{ item.percent | number : '1.0-0' }}%</span
              >
            </div>
            <div class="progress-track">
              <div
                class="progress-bar"
                [style.width.%]="item.percent"
                [style.background]="item.color"
              ></div>
            </div>
          </div>
          } @empty {
          <div class="empty-state">Chưa có dữ liệu cảm xúc.</div>
          }
        </div>
      </div>

      <div style="height: 40px;"></div>
    </ion-content>
  `,
  styles: [
    `
      /* HEADER */
      ion-toolbar {
        --background: transparent;
        padding-top: 10px;
      }
      .custom-header {
        display: flex;
        justify-content: space-between;
        padding: 0 8px;
      }
      .subtitle {
        font-size: 0.8rem;
        text-transform: uppercase;
        color: var(--ion-color-medium);
        font-weight: 600;
        display: block;
        margin-bottom: 4px;
      }
      .main-title {
        margin: 0;
        font-size: 2.2rem;
        font-weight: 900;
        letter-spacing: -1px;
        color: var(--ion-text-color);
      }
      .dot {
        color: var(--ion-color-primary);
      }
      .close-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--ion-color-step-100, #f0f0f0);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        color: var(--ion-color-medium);
      }

      /* CHART WRAPPER */
      .chart-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-bottom: 32px;
      }
      .pie-chart-wrapper {
        position: relative;
        margin-bottom: 24px;
        margin-top: 10px;
        filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.08));
      }
      .pie-chart {
        width: 180px;
        height: 180px;
        border-radius: 50%;
        position: relative;
      }
      .inner-circle {
        position: absolute;
        inset: 22px;
        background: var(--ion-background-color);
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.03);
      }
      .total-number {
        font-size: 2.5rem;
        font-weight: 800;
        line-height: 1;
        color: var(--ion-text-color);
      }
      .total-label {
        font-size: 0.7rem;
        color: var(--ion-color-medium);
        text-transform: uppercase;
        font-weight: 600;
        margin-top: 4px;
      }

      /* 👇 LEGEND GRID (NEW DESIGN) */
      .legend-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        width: 100%;
      }
      .legend-card {
        background: var(--ion-card-background);
        border-radius: 16px;
        padding: 12px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        border: 1px solid var(--ion-color-light-shade);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      }
      :host-context(body.dark) .legend-card {
        border-color: var(--ion-color-step-150);
      }

      .legend-icon {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        margin-bottom: 8px;
      }

      .legend-info {
        display: flex;
        align-items: center;
      }

      .legend-count {
        font-size: 1.4rem;
        font-weight: 800;
        line-height: 1;
        margin-bottom: 2px;
        margin-right: 4px;
      }

      .legend-label {
        font-size: 0.65rem;
        color: var(--ion-color-medium);
        font-weight: 600;
      }

      /* EMOTION LIST */
      .section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        color: var(--ion-text-color);
      }
      .section-header h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
      }
      .section-header ion-icon {
        font-size: 1.2rem;
        color: var(--ion-color-primary);
      }

      .emotion-list {
        background: var(--ion-card-background);
        border-radius: 20px;
        padding: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
        border: 1px solid var(--ion-color-light-shade);
      }
      :host-context(body.dark) .emotion-list {
        border-color: var(--ion-color-step-150);
      }

      .emotion-item {
        margin-bottom: 16px;
      }
      .emotion-item:last-child {
        margin-bottom: 0;
      }
      .emo-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        font-size: 0.9rem;
        font-weight: 600;
      }
      .emo-name {
        color: var(--ion-text-color);
      }
      .emo-percent {
        color: var(--ion-color-medium);
        font-size: 0.8rem;
      }
      .progress-track {
        height: 8px;
        width: 100%;
        border-radius: 10px;
        background: var(--ion-color-step-50, #f5f5f5);
        overflow: hidden;
      }
      .progress-bar {
        height: 100%;
        border-radius: 10px;
        transition: width 1s cubic-bezier(0.25, 0.8, 0.25, 1);
      }
      .empty-state {
        text-align: center;
        color: var(--ion-color-medium);
        font-style: italic;
        opacity: 0.7;
        padding: 20px;
      }
    `,
  ],
})
export class StatsModalComponent implements OnInit, OnDestroy {
  protected eventsSignal = signal<SelfOpsEvent[]>([]);
  protected eventTypes = Object.values(SelfOpsEventType);
  private animationFrameId: number | null = null;
  protected animationProgress = signal(0);

  @Input() set events(val: SelfOpsEvent[]) {
    this.eventsSignal.set(val || []);
  }

  private modalCtrl = inject(ModalController);

  constructor() {
    addIcons({
      close,
      trendingUpOutline,
      helpBuoyOutline,
      alertCircleOutline,
      batteryDeadOutline,
    });
  }

  ngOnInit() {
    this.animateChart();
  }

  animateChart() {
    const duration = 1200;
    const startTime = performance.now();
    const frame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);
      this.animationProgress.set(easeOut);
      if (progress < 1) this.animationFrameId = requestAnimationFrame(frame);
      else this.animationFrameId = null;
    };
    this.animationFrameId = requestAnimationFrame(frame);
  }

  close() {
    this.modalCtrl.dismiss();
  }

  getEventConfig(type: SelfOpsEventType | string) {
    return AppUtils.getTypeConfig(type);
  }

  // Helper lấy đúng mã màu HEX/VAR từ COLOR_MAP
  getColorVar(type: SelfOpsEventType | string) {
    return COLOR_MAP[type as string] || 'var(--ion-color-medium)';
  }

  getCountByType(type: SelfOpsEventType | string) {
    return this.stats()[type as SelfOpsEventType] || 0;
  }

  stats = computed(() => {
    const list = this.eventsSignal();
    const counts = {
      [SelfOpsEventType.DECISION]: 0,
      [SelfOpsEventType.MISTAKE]: 0,
      [SelfOpsEventType.STRESS]: 0,
      total: list.length || 1,
    };
    list.forEach((e) => {
      if (counts[e.type] !== undefined) counts[e.type]++;
    });
    return counts;
  });

  animatedTotal = computed(() =>
    Math.round(this.eventsSignal().length * this.animationProgress())
  );

  // Tạo Gradient đồng bộ tuyệt đối với Legend
  chartGradient = computed(() => {
    const s = this.stats();
    const progress = this.animationProgress();

    if (this.eventsSignal().length === 0)
      return 'conic-gradient(var(--ion-color-step-100) 0% 100%)';

    const pDec = (s[SelfOpsEventType.DECISION] / s.total) * 100;
    const pMis = (s[SelfOpsEventType.MISTAKE] / s.total) * 100;

    const endDec = pDec * progress;
    const endMis = (pDec + pMis) * progress;
    const endStr = 100 * progress;

    const cDec = COLOR_MAP[SelfOpsEventType.DECISION];
    const cMis = COLOR_MAP[SelfOpsEventType.MISTAKE];
    const cStr = COLOR_MAP[SelfOpsEventType.STRESS];

    return `conic-gradient(
      ${cDec} 0% ${endDec}%, 
      ${cMis} ${endDec}% ${endMis}%, 
      ${cStr} ${endMis}% ${endStr}%,
      transparent ${endStr}% 100% 
    )`;
  });

  topEmotions = computed(() => {
    const list = this.eventsSignal();
    const map = new Map<string, number>();
    list.forEach((e) => {
      const emotions = AppUtils.parseEmotions(e.emotion);
      emotions.forEach((emo) => map.set(emo, (map.get(emo) || 0) + 1));
    });
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;

    const barColors = [
      'var(--ion-color-primary)',
      'var(--ion-color-secondary)',
      'var(--ion-color-tertiary)',
      'var(--ion-color-success)',
      'var(--ion-color-warning)',
    ];

    return Array.from(map.entries())
      .map(([name, count], index) => ({
        name,
        count,
        percent: (count / total) * 100,
        color: barColors[index % barColors.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }
}
