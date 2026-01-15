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
import { barChartOutline, close, trendingUpOutline } from 'ionicons/icons';

import { SelfOpsEvent, SelfOpsEventType } from 'src/app/core/models/event.type';
import { AppUtils } from 'src/app/core/utils/app.utils';

const COLOR_MAP: Record<string, string> = {
  [SelfOpsEventType.DECISION]: 'var(--ion-color-primary)', // Xanh dương
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
      <ion-toolbar>
        <div class="header-container">
          <div class="header-info">
            <span class="sub-title">Dữ liệu tổng quan</span>
            <h1 class="main-title">Insight<span class="dot">.</span></h1>
          </div>
          <button
            class="close-button ion-activatable ripple-parent"
            (click)="close()"
          >
            <ion-icon name="close"></ion-icon>
          </button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding-horizontal">
      <div class="dashboard-container">
        <section class="chart-section pie-section">
          <div class="pie-wrapper filter-shadow">
            <div class="pie-chart" [style.background]="chartGradient()">
              <div class="inner-donut">
                <span class="total-count big-number">{{
                  animatedTotal()
                }}</span>
                <span class="total-label">Sự kiện</span>
              </div>
            </div>
          </div>

          <div class="legend-grid">
            @for (type of eventTypes; track type) { @let config =
            getEventConfig(type); @let colorVar = getColorVar(type);

            <div class="legend-item glass-card">
              <div class="legend-icon-box" [style.background]="colorVar">
                <ion-icon [name]="config.icon"></ion-icon>
              </div>
              <div class="legend-details">
                <span class="legend-number" [style.color]="colorVar">{{
                  getCountByType(type)
                }}</span>
                <span class="legend-name">{{ config.label }}</span>
              </div>
            </div>
            }
          </div>
        </section>

        <section class="chart-section glass-card bar-section">
          <div class="section-title">
            <ion-icon name="bar-chart-outline"></ion-icon>
            <h3>Nhịp độ 7 ngày ({{ totalLast7Days() }})</h3>
          </div>

          <div class="bar-chart-grid">
            @for (item of barData(); track item.label) {
            <div class="bar-column">
              <div class="bar-track">
                <div
                  class="bar-stack"
                  [style.height.%]="
                    item.totalHeightPercent * animationProgress()
                  "
                >
                  @for (seg of item.segments; track $index) {
                  <div
                    class="bar-segment"
                    [style.height.%]="seg.height"
                    [style.background]="seg.color"
                  >
                    @if (seg.height > 10) {
                    <span class="segment-label fade-in"
                      >{{ seg.height | number : '1.0-0' }}%</span
                    >
                    }
                  </div>
                  }
                </div>
              </div>
              <span class="bar-date-label">{{ item.label }}</span>
            </div>
            }
          </div>
        </section>

        <section class="chart-section glass-card emotion-section">
          <div class="section-title">
            <ion-icon name="trending-up-outline"></ion-icon>
            <h3>Cảm xúc chủ đạo</h3>
          </div>

          <div class="emotion-list">
            @for (item of topEmotions(); track item.name) {
            <div class="emotion-row">
              <div class="emotion-header">
                <span class="emotion-name">{{ item.name }}</span>
                <span class="emotion-percent"
                  >{{ item.percent | number : '1.0-0' }}%</span
                >
              </div>
              <div class="progress-track">
                <div
                  class="progress-fill"
                  [style.width.%]="item.percent * animationProgress()"
                  [style.background]="item.color"
                ></div>
              </div>
            </div>
            } @empty {
            <div class="empty-state">Chưa có dữ liệu cảm xúc.</div>
            }
          </div>
        </section>
      </div>
      <div class="bottom-spacer"></div>
    </ion-content>
  `,
  styles: [
    `
      /* ================= SHARED STYLES ================= */
      :host {
        --chart-bg: var(--ion-card-background);
        --chart-border: 1px solid var(--ion-color-light-shade);
        --chart-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
        --track-bg: var(--ion-color-step-50, #f5f5f5);
      }
      :host-context(body.dark) {
        --chart-border: 1px solid var(--ion-color-step-150);
        --chart-shadow: none;
        --track-bg: var(--ion-color-step-150);
      }

      ion-toolbar {
        --background: transparent;
        padding-top: 10px;
      }
      .dashboard-container {
        display: flex;
        flex-direction: column;
        gap: 32px;
        padding-top: 10px;
      }
      .bottom-spacer {
        height: 40px;
      }
      .big-number {
        font-size: 2.5rem;
        font-weight: 800;
        line-height: 1;
        color: var(--ion-text-color);
      }
      .filter-shadow {
        filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.08));
      }

      /* Card Style cơ bản */
      .glass-card {
        background: var(--chart-bg);
        border-radius: 20px;
        border: var(--chart-border);
        box-shadow: var(--chart-shadow);
      }

      /* Titles */
      .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 16px;
        color: var(--ion-text-color);
      }
      .section-title h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 700;
      }
      .section-title ion-icon {
        font-size: 1.2rem;
        color: var(--ion-color-primary);
      }

      /* ================= HEADER ================= */
      .header-container {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 0 8px;
      }
      .sub-title {
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
      .close-button {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--ion-color-step-100, #f0f0f0);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        color: var(--ion-color-medium);
        border: none;
        cursor: pointer;
        transition: background 0.2s;
      }
      .close-button:active {
        background: var(--ion-color-step-200);
      }

      /* ================= 1. PIE CHART & LEGEND ================= */
      .pie-section {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .pie-wrapper {
        position: relative;
        margin-bottom: 24px;
      }
      .pie-chart {
        width: 180px;
        height: 180px;
        border-radius: 50%;
        position: relative;
        transition: background 0.3s;
      }
      .inner-donut {
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
      .total-label {
        font-size: 0.7rem;
        color: var(--ion-color-medium);
        text-transform: uppercase;
        font-weight: 600;
        margin-top: 4px;
      }

      .legend-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        width: 100%;
      }
      .legend-item {
        padding: 12px 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        border-radius: 16px;
      }
      .legend-icon-box {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        margin-bottom: 8px;
        color: #ffffff;
      }

      .legend-details {
        display: flex;
        align-items: center;
      }

      .legend-number {
        font-size: 1.4rem;
        font-weight: 800;
        line-height: 1;
        margin-bottom: 2px;
        margin-right: 4px;
      }
      .legend-name {
        font-size: 0.65rem;
        color: var(--ion-color-medium);
        font-weight: 600;
      }

      /* ================= 2. STACKED BAR CHART ================= */
      .bar-section {
        padding: 20px 16px 16px 16px;
      }
      .bar-chart-grid {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        height: 200px;
        gap: 8px;
      }
      .bar-column {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        gap: 8px;
      }
      .bar-track {
        width: 24px;
        height: 150px;
        background: var(--track-bg);
        border-radius: 8px;
        display: flex;
        align-items: flex-end;
        overflow: hidden;
        position: relative;
      }
      .bar-stack {
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        min-height: 0;
      }
      .bar-segment {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        transition: height 0.3s ease;
        position: relative;
      }
      .bar-segment:first-child {
        border-top-left-radius: 6px;
        border-top-right-radius: 6px;
      }
      .bar-segment:last-child {
        border-bottom-left-radius: 6px;
        border-bottom-right-radius: 6px;
      }
      .segment-label {
        color: #fff;
        font-size: 9px;
        font-weight: 700;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        pointer-events: none;
      }
      .bar-date-label {
        font-size: 0.65rem;
        color: var(--ion-color-medium);
        font-weight: 600;
        text-align: center;
      }

      /* ================= 3. EMOTION LIST ================= */
      .emotion-section {
        padding: 20px;
      }
      .emotion-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .emotion-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        font-size: 0.9rem;
        font-weight: 600;
      }
      .emotion-name {
        color: var(--ion-text-color);
      }
      .emotion-percent {
        color: var(--ion-color-medium);
        font-size: 0.8rem;
      }
      .progress-track {
        height: 8px;
        width: 100%;
        border-radius: 4px;
        background: var(--track-bg);
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.5s ease-out;
      }
      .empty-state {
        text-align: center;
        color: var(--ion-color-medium);
        font-style: italic;
        opacity: 0.7;
        padding: 10px;
      }

      /* Animations */
      .fade-in {
        animation: fadeIn 0.5s ease-in;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `,
  ],
})
export class StatsModalComponent implements OnInit, OnDestroy {
  protected eventsSignal = signal<SelfOpsEvent[]>([]);
  @Input() set events(val: SelfOpsEvent[]) {
    this.eventsSignal.set(val || []);
  }

  protected eventTypes = Object.values(SelfOpsEventType);
  private modalCtrl = inject(ModalController);

  // Animation state
  private animationFrameId: number | null = null;
  protected animationProgress = signal(0);

  constructor() {
    addIcons({ close, trendingUpOutline, barChartOutline });
  }

  ngOnInit() {
    this.runEntranceAnimation();
  }

  ngOnDestroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  close() {
    this.modalCtrl.dismiss();
  }

  // ================== HELPERS ==================
  getEventConfig(type: string) {
    return AppUtils.getTypeConfig(type);
  }
  getColorVar(type: string) {
    return COLOR_MAP[type] || 'var(--ion-color-medium)';
  }
  getCountByType(type: string) {
    return this.stats()[type as SelfOpsEventType] || 0;
  }

  private runEntranceAnimation() {
    const duration = 1000; // 1 giây
    const startTime = performance.now();
    const frame = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // Easing: EaseOutCubic cho mượt
      this.animationProgress.set(1 - Math.pow(1 - progress, 3));
      if (progress < 1) this.animationFrameId = requestAnimationFrame(frame);
    };
    this.animationFrameId = requestAnimationFrame(frame);
  }

  // ================== COMPUTED LOGIC ==================

  // Tổng quan & Pie Chart
  stats = computed(() => {
    const list = this.eventsSignal();
    const counts = {
      [SelfOpsEventType.DECISION]: 0,
      [SelfOpsEventType.MISTAKE]: 0,
      [SelfOpsEventType.STRESS]: 0,
      total: list.length || 1, // Tránh chia 0
    };

    list.forEach((e) => (counts[e.type] = (counts[e.type] || 0) + 1));
    return counts;
  });

  animatedTotal = computed(() =>
    Math.round(this.eventsSignal().length * this.animationProgress())
  );

  chartGradient = computed(() => {
    const s = this.stats();
    const p = this.animationProgress();
    if (this.eventsSignal().length === 0)
      return 'conic-gradient(var(--track-bg) 0% 100%)';

    const getEnd = (val: number) => (val / s.total) * 100 * p;
    const endDec = getEnd(s[SelfOpsEventType.DECISION]);
    const endMis = endDec + getEnd(s[SelfOpsEventType.MISTAKE]);
    const endStr = 100 * p;

    return `conic-gradient(
      ${COLOR_MAP[SelfOpsEventType.DECISION]} 0% ${endDec}%,
      ${COLOR_MAP[SelfOpsEventType.MISTAKE]} ${endDec}% ${endMis}%,
      ${COLOR_MAP[SelfOpsEventType.STRESS]} ${endMis}% ${endStr}%,
      transparent ${endStr}% 100%
    )`;
  });

  // Stacked Bar Chart (7 ngày)
  totalLast7Days = computed(() =>
    this.barData().reduce((a, b) => a + b.total, 0)
  );

  barData = computed(() => {
    const list = this.eventsSignal();
    // Map: YYYY-MM-DD -> Data ngày đó
    const map = new Map<
      string,
      { total: number; counts: Record<string, number> }
    >();

    // Khởi tạo 7 ngày gần nhất
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toLocaleDateString('en-CA'), {
        total: 0,
        counts: {
          [SelfOpsEventType.DECISION]: 0,
          [SelfOpsEventType.MISTAKE]: 0,
          [SelfOpsEventType.STRESS]: 0,
        },
      });
    }

    // Fill dữ liệu
    list.forEach((e) => {
      const key = new Date(e.created_at).toLocaleDateString('en-CA');
      if (map.has(key)) {
        map.get(key)!.total++;
        map.get(key)!.counts[e.type]++;
      }
    });

    const entries = Array.from(map.entries());
    const maxTotal = Math.max(...entries.map((e) => e[1].total), 1); // Tìm max để scale cột
    // Thứ tự chồng: Đỏ (Dưới) -> Vàng -> Xanh (Trên)
    const stackOrder = [
      SelfOpsEventType.MISTAKE,
      SelfOpsEventType.STRESS,
      SelfOpsEventType.DECISION,
    ];

    return entries.map(([dateStr, data]) => {
      const d = new Date(dateStr);
      return {
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        total: data.total,
        totalHeightPercent: (data.total / maxTotal) * 100,
        // Tạo các đoạn màu (segments)
        segments: stackOrder
          .map((type) => ({
            height: data.total > 0 ? (data.counts[type] / data.total) * 100 : 0,
            color: COLOR_MAP[type],
          }))
          .filter((s) => s.height > 0), // Chỉ lấy đoạn có dữ liệu
      };
    });
  });

  // Top Emotions (Màu sắc theo loại chủ đạo)
  topEmotions = computed(() => {
    const list = this.eventsSignal();
    // Map: emotionName -> { total, typeCounts: { DECISION: 5, STRESS: 2... } }
    const map = new Map<
      string,
      { total: number; typeCounts: Record<string, number> }
    >();

    list.forEach((e) => {
      AppUtils.parseEmotions(e.emotion).forEach((emo) => {
        if (!map.has(emo)) map.set(emo, { total: 0, typeCounts: {} });
        const entry = map.get(emo)!;
        entry.total++;
        entry.typeCounts[e.type] = (entry.typeCounts[e.type] || 0) + 1;
      });
    });

    const totalEmotions =
      Array.from(map.values()).reduce((a, b) => a + b.total, 0) || 1;

    return Array.from(map.entries())
      .map(([name, data]) => {
        // Tìm loại sự kiện chiếm đa số cho cảm xúc này
        let dominantType = SelfOpsEventType.DECISION;
        let max = -1;
        Object.entries(data.typeCounts).forEach(([type, count]) => {
          if (count > max) {
            max = count;
            dominantType = type as SelfOpsEventType;
          }
        });

        return {
          name,
          percent: (data.total / totalEmotions) * 100,
          color: COLOR_MAP[dominantType], // Gán màu của loại chủ đạo
        };
      })
      .sort((a, b) => b.percent - a.percent) // Sắp xếp giảm dần
      .slice(0, 5); // Lấy top 5
  });
}
