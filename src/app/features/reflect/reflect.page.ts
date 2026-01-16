import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import {
  IonBadge,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonRippleEffect,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ModalController,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  calendarClearOutline,
  checkmarkDoneOutline,
  fileTrayFullOutline,
  trophyOutline,
} from 'ionicons/icons';
import { EventDetailModalComponent } from 'src/app/components/event-detail-modal/event-detail-modal.component';

import { SelfOpsEvent } from 'src/app/core/models/event.type';
import { DatabaseService } from 'src/app/core/services/database/database.service';
import { AppUtils } from 'src/app/core/utils/app.utils';

type FilterType = 'PENDING' | 'REVIEWED';

@Component({
  selector: 'app-reflect',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ScrollingModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonBadge,
    IonIcon,
    IonRippleEffect,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
  template: `
    <ion-header class="ion-no-border native-glass-header">
      <div class="glass-pane"></div>

      <ion-toolbar class="title-toolbar">
        <ion-title class="page-title">
          Góc nhìn lại @if (totalPendingBadge() > 0) {
          <span class="count-badge">{{ totalPendingBadge() }}</span>
          }
        </ion-title>
      </ion-toolbar>

      <ion-toolbar class="segment-toolbar">
        <ion-segment
          [value]="filterStatus()"
          (ionChange)="onFilterChange($event)"
          mode="ios"
          class="custom-segment"
        >
          <ion-segment-button value="PENDING">
            <ion-label>Chờ Review</ion-label>
          </ion-segment-button>
          <ion-segment-button value="REVIEWED">
            <ion-label>Đã Review</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content [scrollY]="false" [fullscreen]="true" class="main-content">
      <div class="layout-container">
        <div class="header-spacer"></div>

        @if (isLoading()) {
        <div class="center-state">
          <ion-spinner name="crescent" color="primary"></ion-spinner>
        </div>
        } @else if (displayList().length === 0) {
        <div class="center-state fade-in">
          <div class="illustration-circle">
            <ion-icon
              [name]="
                filterStatus() === 'PENDING'
                  ? 'checkmark-done-outline'
                  : 'file-tray-full-outline'
              "
            ></ion-icon>
          </div>
          <h3>
            {{
              filterStatus() === 'PENDING' ? 'Tuyệt vời!' : 'Chưa có lịch sử'
            }}
          </h3>
          <p>
            {{
              filterStatus() === 'PENDING'
                ? 'Bạn đã hoàn thành việc review tất cả sự kiện.'
                : 'Các bài học sau khi review sẽ xuất hiện tại đây.'
            }}
          </p>
        </div>
        } @else {
        <cdk-virtual-scroll-viewport
          itemSize="170"
          minBufferPx="400"
          maxBufferPx="800"
          class="custom-viewport"
          (scrolledIndexChange)="onScrollIndexChange($event)"
        >
          <div class="list-spacer-top"></div>

          <div
            *cdkVirtualFor="let evt of displayList(); trackBy: trackByFn"
            class="list-item-wrapper"
          >
            <div
              class="reflect-card ion-activatable ripple-parent"
              [class.reviewed-card]="filterStatus() === 'REVIEWED'"
              (click)="openReflectModal(evt)"
            >
              <div class="card-top">
                <ion-badge
                  [color]="getTypeConfig(evt.type).color"
                  mode="ios"
                  class="type-badge"
                >
                  {{ getTypeConfig(evt.type).label }}
                </ion-badge>

                @if (filterStatus() === 'PENDING') {
                <div class="date-capsule pending">
                  <ion-icon name="calendar-clear-outline"></ion-icon>
                  <span>Viết ngày {{ evt.created_at | date : 'dd/MM' }}</span>
                </div>
                } @else {
                <div class="date-capsule reviewed">
                  <ion-icon name="checkmark-done-outline"></ion-icon>
                  <span
                    >Xong ngày
                    {{
                      evt.updated_at || evt.created_at | date : 'dd/MM'
                    }}</span
                  >
                </div>
                }
              </div>

              <div class="card-body">
                <p class="context text-truncate">
                  {{ evt.context }}
                </p>
              </div>

              <div class="card-footer">
                @if (filterStatus() === 'PENDING') {
                <span class="cta-text">Nhìn lại ngay</span>
                <ion-icon name="arrow-forward-outline"></ion-icon>
                } @else {
                <span class="cta-text reviewed-text">Xem bài học</span>
                <ion-icon name="trophy-outline"></ion-icon>
                }
              </div>
              <ion-ripple-effect></ion-ripple-effect>
            </div>
          </div>

          @if (isLoadingMore()) {
          <div class="footer-loader">
            <ion-spinner name="dots" color="medium"></ion-spinner>
          </div>
          }
          <div style="height: 40px"></div>
        </cdk-virtual-scroll-viewport>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      /* =========================================
         1. GLOBAL & VARIABLES
      ========================================= */
      :host {
        /* Tính toán chiều cao Header */
        --title-height: 56px;
        --segment-height: 52px; /* 44px height + 8px padding-bottom */

        /* Tổng chiều cao Header bao gồm Safe Area */
        --header-offset: calc(
          var(--ion-safe-area-top, 0px) + var(--title-height) +
            var(--segment-height)
        );
      }

      .main-content {
        --background: var(--ion-background-color);
      }

      .layout-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--ion-background-color);
        transform: translateZ(0); /* GPU Layer */
      }

      /* =========================================
         2. HEADER (GLASS & GPU)
      ========================================= */
      .native-glass-header {
        position: absolute;
        inset: 0;
        bottom: auto;
        z-index: 999;
        pointer-events: none;
        transform: translateZ(0);
        will-change: transform;
      }

      .native-glass-header ion-toolbar {
        pointer-events: auto;
        --background: transparent;
        --border-width: 0;
      }

      /* Toolbar 1: Title (Có padding top cho Safe Area) */
      .title-toolbar {
        padding-top: var(--ion-safe-area-top, 0px);
        --min-height: var(--title-height);
      }

      /* Toolbar 2: Segment */
      .segment-toolbar {
        --min-height: var(--segment-height);
        padding: 0 16px 8px 16px;
      }

      .glass-pane {
        position: absolute;
        inset: 0;
        background: var(--glass-bg-light);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--ion-color-light-shade);
        /* Luôn hiện (hoặc xử lý scroll opacity nếu muốn) */
      }

      .page-title {
        font-weight: 800;
        font-size: 1.4rem;
        color: var(--ion-text-color);
        padding-inline: 16px;
      }

      .count-badge {
        background: var(--ion-color-danger);
        color: white;
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 12px;
        vertical-align: middle;
        margin-left: 4px;
        font-weight: 700;
        transform: translateY(-2px);
        display: inline-block;
      }

      .custom-segment {
        background: var(--ion-color-light);
        border-radius: 12px;
        padding: 4px;
        height: 44px;
        --background: var(--ion-color-light);
      }
      ion-segment-button {
        --indicator-color: var(--ion-card-background);
        --color: var(--ion-color-medium);
        --color-checked: var(--ion-text-color);
        --border-radius: 8px;
        font-weight: 600;
        min-height: 36px;
        --box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      }

      /* =========================================
         3. CONTENT & VIRTUAL SCROLL
      ========================================= */

      /* Spacer đẩy content xuống đúng chiều cao Header */
      .header-spacer {
        height: var(--header-offset);
        flex-shrink: 0;
        background: transparent;
      }

      .custom-viewport {
        height: 100%;
        width: 100%;
      }
      .list-spacer-top {
        height: 16px;
      }
      .list-item-wrapper {
        padding: 0 16px 16px 16px;
      }

      /* =========================================
         4. CARD DESIGN (PERFORMANCE)
      ========================================= */
      .reflect-card {
        background: var(--ion-card-background);
        border-radius: 20px;
        padding: 16px;
        height: 154px; /* Fixed height for CDK efficiency */
        position: relative;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        border: 1px solid var(--ion-border-color);
        display: flex;
        flex-direction: column;
        transition: transform 0.1s;

        /* Optimization */
        contain: content;
        transform: translateZ(0);
      }
      .reflect-card:active {
        transform: scale(0.98);
      }
      .reviewed-card {
        border-color: rgba(var(--ion-color-success-rgb), 0.3);
      }

      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        height: 24px;
      }
      .type-badge {
        font-weight: 700;
        padding: 6px 10px;
        font-size: 0.7rem;
        border-radius: 8px;
        text-transform: uppercase;
      }

      .date-capsule {
        font-size: 0.75rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--ion-color-medium);
      }
      .date-capsule.reviewed {
        color: var(--ion-color-success);
        font-weight: 700;
      }

      .card-body {
        flex: 1;
        overflow: hidden;
        margin-bottom: 8px;
      }
      .context {
        font-size: 0.95rem;
        line-height: 1.5;
        color: var(--ion-text-color);
        margin: 0;
        font-weight: 500;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card-footer {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 6px;
        padding-top: 10px;
        border-top: 1px dashed var(--ion-border-color);
        color: var(--ion-color-primary);
        font-weight: 700;
        font-size: 0.85rem;
        height: 30px;
      }
      .reviewed-card .card-footer {
        color: var(--ion-color-success);
      }

      /* =========================================
         5. STATES
      ========================================= */
      .center-state {
        height: 60vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 0 32px;
      }
      .illustration-circle {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        background: var(--ion-color-light);
        color: var(--ion-color-medium);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
        margin-bottom: 16px;
      }
      .center-state h3 {
        margin: 0 0 8px 0;
        font-size: 1.2rem;
        font-weight: 800;
        color: var(--ion-text-color);
      }
      .center-state p {
        color: var(--ion-color-medium);
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .footer-loader {
        display: flex;
        justify-content: center;
        padding: 8px;
      }
      .fade-in {
        animation: fadeIn 0.3s ease-out forwards;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* DARK MODE */
      :host-context(body.dark) {
        .glass-pane {
          background: var(--glass-bg-dark);
          border-bottom-color: var(--ion-border-color);
        }
        .custom-segment {
          --background: var(--ion-color-step-100);
        }
        ion-segment-button {
          --indicator-color: var(--ion-color-step-300);
        }
        .illustration-circle {
          background: var(--ion-color-step-50);
        }
      }
    `,
  ],
})
export class ReflectPage implements ViewWillEnter {
  private databaseService = inject(DatabaseService);
  private modalCtrl = inject(ModalController);

  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;

  filterStatus = signal<FilterType>('PENDING');
  isLoading = signal(true);
  isLoadingMore = signal(false);

  loadedEvents = signal<SelfOpsEvent[]>([]);
  totalPendingBadge = signal(0);

  private PAGE_SIZE = 20;
  currentPage = signal(1);

  displayList = computed(() => {
    const list = this.loadedEvents();
    const limit = this.currentPage() * this.PAGE_SIZE;
    return list.slice(0, limit);
  });

  isEndOfData = computed(() => {
    return this.displayList().length >= this.loadedEvents().length;
  });

  constructor() {
    addIcons({
      arrowForwardOutline,
      checkmarkDoneOutline,
      fileTrayFullOutline,
      trophyOutline,
      calendarClearOutline,
    });
  }

  async ionViewWillEnter() {
    this.loadData();
  }

  async loadData(event?: any) {
    if (!event) this.isLoading.set(true);

    try {
      const isReviewed = this.filterStatus() === 'REVIEWED';
      const [data, count] = await Promise.all([
        this.databaseService.getEventsByReviewStatus(isReviewed),
        this.databaseService.getPendingCount(),
      ]);

      this.loadedEvents.set(data);
      this.totalPendingBadge.set(count);
      this.currentPage.set(1);

      if (this.viewport) this.viewport.scrollToIndex(0);
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading.set(false);
      if (event) event.target.complete();
    }
  }

  async doRefresh(event: any) {
    await this.loadData(event);
  }

  onFilterChange(event: any) {
    this.filterStatus.set(event.detail.value);
    this.loadData();
  }

  onScrollIndexChange(index: number) {
    if (this.isLoadingMore() || this.isEndOfData()) return;
    const displayedCount = this.displayList().length;
    if (index >= displayedCount - 5) {
      this.isLoadingMore.set(true);
      setTimeout(() => {
        this.currentPage.update((p) => p + 1);
        this.isLoadingMore.set(false);
      }, 100);
    }
  }

  async openReflectModal(event: SelfOpsEvent) {
    const modal = await this.modalCtrl.create({
      component: EventDetailModalComponent,
      componentProps: { event },
    });

    await modal.present();
    const { role } = await modal.onWillDismiss();

    if (role === 'saved' || role === 'deleted') {
      this.loadData();
    }
  }

  getTypeConfig(type: string) {
    return AppUtils.getTypeConfig(type);
  }

  trackByFn(index: number, item: SelfOpsEvent) {
    return item.uuid;
  }
}
