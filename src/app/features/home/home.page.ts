import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ViewWillEnter } from '@ionic/angular';

import { addIcons } from 'ionicons';
import {
  add,
  alertCircleOutline,
  batteryDeadOutline,
  calendarOutline,
  closeCircle,
  documentTextOutline,
  filterOutline,
  happyOutline,
  helpBuoyOutline,
  searchOutline,
  statsChartOutline,
  timeOutline,
} from 'ionicons/icons';

import {
  InfiniteScrollCustomEvent,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonRippleEffect,
  IonSearchbar,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';

import { Subject, takeUntil } from 'rxjs';
import { AddEventModalComponent } from 'src/app/components/add-event-modal/add-event-modal.component';
import { EventDetailModalComponent } from 'src/app/components/event-detail-modal/event-detail-modal.component';
import { StatsModalComponent } from 'src/app/components/stats-modal/stats-modal.component';
import { SelfOpsEvent, SelfOpsEventType } from 'src/app/core/models/event.type';
import { DatabaseService } from 'src/app/core/services/database/database.service';
import { AppUtils } from 'src/app/core/utils/app.utils';
import { DailyCheckInComponent } from './components/daily-checkin/daily-checkin.component';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonList,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSearchbar,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
    IonRippleEffect,
    DailyCheckInComponent,
  ],
  template: `
    <ion-header
      [translucent]="true"
      class="ion-padding ion-no-border main-header"
    >
      <ion-toolbar>
        <div class="header-inner ion-padding-horizontal">
          <div class="brand-section">
            <h1 class="brand-title">
              <span class="text-gradient">SelfOps</span
              ><span class="dot">.</span>
            </h1>
            <p class="date-label">
              <ion-icon name="calendar-outline"></ion-icon>
              {{ today | date : 'EEEE, dd/MM' }}
            </p>
          </div>

          <div
            class="stats-btn-wrapper ion-activatable ripple-parent"
            (click)="openStats()"
          >
            <ion-icon name="stats-chart-outline"></ion-icon>
            <ion-ripple-effect></ion-ripple-effect>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="main-content">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="dashboard-scrollable ion-padding-horizontal ion-padding-top">
        <div class="section-checkin">
          <app-daily-checkin></app-daily-checkin>
        </div>

        <div class="stats-grid">
          @for (type of eventTypes; track type) { @let conf =
          getEventConfig(type);
          <div
            class="mini-card ion-activatable ripple-parent"
            [class.active]="filterType() === type"
            (click)="handleFilterChange(type)"
          >
            <div
              class="icon-box"
              [style.background]="'var(--ion-color-' + conf.color + ')'"
            >
              <ion-icon
                [name]="conf.icon"
                style="color: #ffffff; font-size: 24px;"
              ></ion-icon>
            </div>
            <div class="stat-info">
              <span class="stat-count">{{ stats()[type] || 0 }}</span>
              <span class="stat-label">{{ conf.label }}</span>
            </div>
            <ion-ripple-effect></ion-ripple-effect>
          </div>
          }
        </div>
      </div>

      <div class="sticky-tools ion-padding-horizontal">
        <ion-searchbar
          placeholder="Tìm kiếm dòng suy nghĩ..."
          [debounce]="300"
          (ionInput)="handleSearch($event)"
          class="custom-searchbar"
          mode="ios"
        ></ion-searchbar>

        @if (filterType() !== 'ALL') {
        <div class="filter-badge fade-in" (click)="handleFilterChange('ALL')">
          <span>Đang lọc: {{ getEventConfig(filterType()).label }}</span>
          <ion-icon name="close-circle"></ion-icon>
        </div>
        }

        <div class="timeline-divider">
          <h3>Dòng thời gian</h3>
          @if (totalEventsCount() > 0) {
          <span class="count-badge fade-in">
            @if (displayEvents().length < totalEventsCount()) {
            {{ displayEvents().length }}
            <span style="opacity: 0.6">/ {{ totalEventsCount() }}</span>
            } @else {
            {{ totalEventsCount() }}
            }
          </span>
          }
        </div>
      </div>

      <ion-list lines="none" class="timeline-list">
        @for (event of displayEvents(); track event.uuid) { @let config =
        getEventConfig(event.type);

        <div
          class="timeline-item ion-activatable ripple-parent"
          (click)="openDetail(event)"
        >
          <div
            class="color-strip"
            [style.background]="'var(--ion-color-' + config.color + ')'"
          ></div>

          <div class="item-content">
            <div class="item-header">
              <span
                class="item-type"
                [style.color]="'var(--ion-color-' + config.color + ')'"
              >
                {{ config.label }}
              </span>
              <span class="item-time">
                {{ event.created_at | date : 'HH:mm' }}
              </span>
            </div>

            <h3 class="item-context">{{ event.context }}</h3>

            @if (event.emotion) {
            <div class="item-footer">
              <span class="emotion-tag">{{ event.emotion }}</span>
            </div>
            }
          </div>
          <ion-ripple-effect></ion-ripple-effect>
        </div>
        } @empty { @if (!isLoading() && events().length === 0) {
        <div class="empty-state">
          <div class="icon-circle">
            <ion-icon
              [name]="
                searchQuery() ? 'search-outline' : 'document-text-outline'
              "
            ></ion-icon>
          </div>
          <h3>{{ searchQuery() ? 'Không tìm thấy' : 'Trang giấy trắng' }}</h3>
          <p>
            {{
              searchQuery()
                ? 'Thử từ khóa khác xem sao.'
                : 'Hãy bắt đầu ghi lại dòng suy nghĩ đầu tiên.'
            }}
          </p>
        </div>
        } }
      </ion-list>

      <ion-infinite-scroll
        threshold="100px"
        (ionInfinite)="onIonInfinite($event)"
        [disabled]="isEndOfData()"
      >
        <ion-infinite-scroll-content
          loadingSpinner="bubbles"
        ></ion-infinite-scroll-content>
      </ion-infinite-scroll>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="openAddModal()" class="custom-fab">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [
    `
      /* PERFORMANCE: Ẩn scrollbar để giao diện sạch */
      ion-content::part(scroll)::-webkit-scrollbar {
        display: none;
        width: 0 !important;
        height: 0 !important;
        background: transparent; /* Ẩn nền scrollbar */
      }

      ion-content::part(scroll) {
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox & Chrome mới */
      }

      /* --- HEADER & BRANDING --- */
      ion-toolbar {
        --background: transparent;
      }
      .main-header {
        /* Fallback color cho máy yếu */
        background: var(--ion-background-color);
        background: rgba(var(--ion-background-color-rgb), 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }

      .header-inner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 4px;
        padding-bottom: 4px;
      }

      .brand-title {
        font-size: 1.6rem;
        font-weight: 800;
        margin: 0;
        letter-spacing: -0.5px;
        line-height: 1;
      }

      .text-gradient {
        background: linear-gradient(
          135deg,
          var(--ion-color-primary) 0%,
          #8b5cf6 100%
        );
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        display: inline-block;
      }
      .dot {
        color: var(--ion-color-primary);
        font-size: 1.8rem;
        line-height: 0;
      }

      .date-label {
        margin: 4px 0 0 0;
        font-size: 0.75rem;
        color: var(--ion-color-medium);
        display: flex;
        align-items: center;
        gap: 4px;
        text-transform: capitalize;
        font-weight: 500;
      }

      .stats-btn-wrapper {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ion-color-primary);
        font-size: 1.3rem;
        background: rgba(var(--ion-color-primary-rgb), 0.1);
        border: 1px solid rgba(var(--ion-color-primary-rgb), 0.2);
        animation: pulse-glow 3s infinite ease-in-out;
        /* PERFORMANCE: Tách layer riêng cho animation */
        will-change: transform, box-shadow;
      }
      @keyframes pulse-glow {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(var(--ion-color-primary-rgb), 0.4);
        }
        50% {
          box-shadow: 0 0 0 6px rgba(var(--ion-color-primary-rgb), 0);
        }
      }

      /* --- DASHBOARD --- */
      .section-checkin {
        margin-bottom: 16px;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
        margin-bottom: 24px;
      }
      .mini-card {
        background: var(--ion-card-background);
        border-radius: 14px;
        padding: 10px 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        border: 1px solid var(--ion-color-light-shade);
        position: relative;
        overflow: hidden;
        transition: transform 0.1s;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
        /* PERFORMANCE: Tối ưu render */
        contain: content;
      }
      .mini-card:active {
        transform: scale(0.96);
      }
      .mini-card.active {
        background: var(--ion-color-light);
        border-color: var(--ion-color-primary);
      }

      .icon-box {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 6px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .stat-info {
        display: flex;
        align-items: center;
      }

      .stat-count {
        font-size: 1.15rem;
        font-weight: 700;
        line-height: 1;
        margin-bottom: 2px;
        margin-right: 4px;
      }
      .stat-label {
        font-size: 0.65rem;
        color: var(--ion-color-medium);
      }

      /* --- STICKY TOOLS (Tối ưu) --- */
      .sticky-tools {
        position: sticky;
        top: 0;
        z-index: 50;
        background: rgba(var(--ion-background-color-rgb), 0.96);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding-top: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid transparent;
        transition: all 0.3s;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        /* PERFORMANCE: Báo trước trình duyệt */
        will-change: position, transform;
        transform: translateZ(0); /* Kích hoạt GPU */
      }

      .custom-searchbar {
        --background: var(--ion-color-step-50, #f4f5f8);
        --border-radius: 14px;
        --box-shadow: none;
        padding-inline: 0;
        height: 42px;
        min-height: 42px;
      }
      :host-context(body.dark) .custom-searchbar {
        --background: var(--ion-color-step-100);
      }

      .filter-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: var(--ion-color-primary);
        color: var(--ion-color-primary-contrast);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        margin-top: 10px;
        cursor: pointer;
        box-shadow: 0 4px 10px rgba(var(--ion-color-primary-rgb), 0.3);
      }

      .timeline-divider {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 14px;
      }
      .timeline-divider h3 {
        font-size: 0.95rem;
        font-weight: 700;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--ion-color-medium);
      }
      .count-badge {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--ion-color-primary);
        background: rgba(var(--ion-color-primary-rgb), 0.1);
        padding: 4px 10px;
        border-radius: 8px;
      }

      /* --- TIMELINE LIST --- */
      .timeline-list {
        padding: 8px 16px 80px 16px;
        background: transparent;
      }

      .timeline-item {
        background: var(--ion-card-background);
        border-radius: 16px;
        margin-bottom: 14px;
        position: relative;
        overflow: hidden;
        display: flex;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        min-height: 85px;
        border: 1px solid var(--ion-color-light-shade);
        /* PERFORMANCE: Quan trọng cho list dài */
        contain: content;
      }
      :host-context(body.dark) .timeline-item {
        border-color: var(--ion-color-step-100);
      }
      .timeline-item:active {
        transform: scale(0.98);
      }

      .color-strip {
        width: 6px;
        flex-shrink: 0;
      }
      .item-content {
        padding: 14px 16px;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .item-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .item-time {
        color: var(--ion-color-medium);
        font-weight: 500;
        font-size: 0.75rem;
      }
      .item-context {
        margin: 0 0 10px 0;
        font-size: 1rem;
        font-weight: 500;
        line-height: 1.5;
        color: var(--ion-text-color);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .emotion-tag {
        font-size: 0.75rem;
        color: var(--ion-color-dark);
        background: var(--ion-color-light);
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 500;
      }

      /* FAB & EMPTY STATE */
      ion-fab[vertical='bottom'] {
        bottom: 20px;
      }
      .custom-fab {
        --background: var(--ion-text-color);
        --color: var(--ion-background-color);
        --box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      }

      .empty-state {
        text-align: center;
        padding-top: 60px;
        opacity: 0.8;
      }
      .icon-circle {
        width: 70px;
        height: 70px;
        background: var(--ion-color-light);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px auto;
        font-size: 32px;
        color: var(--ion-color-medium);
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .fade-in {
        animation: fadeIn 0.3s ease-out;
      }
    `,
  ],
})
export class HomePage implements OnInit, OnDestroy, ViewWillEnter {
  private databaseService = inject(DatabaseService);
  private modalCtrl = inject(ModalController);
  private destroy$ = new Subject<void>();
  private lastLoadTime = 0;

  currentPage = 0;
  readonly PAGE_SIZE = 30;

  events = signal<SelfOpsEvent[]>([]);
  // State quản lý Stats (Toàn bộ DB)
  stats = signal<Record<string, number>>({});
  isLoading = signal(false);
  isEndOfData = signal(false);

  // Filter & Search
  searchQuery = signal('');
  filterType = signal<SelfOpsEventType | 'ALL'>('ALL');

  today = Date.now();
  eventTypes = Object.values(SelfOpsEventType);

  displayEvents = computed(() => {
    const all = this.events();
    const query = this.searchQuery().toLowerCase().trim();
    const type = this.filterType();

    return all.filter((ev) => {
      const matchType = type === 'ALL' || ev.type === type;
      const matchText =
        query === '' ||
        ev.context.toLowerCase().includes(query) ||
        (ev.emotion && ev.emotion.toLowerCase().includes(query));
      return matchType && matchText;
    });
  });

  totalEventsCount = computed(() => {
    const type = this.filterType();
    const stats = this.stats();

    if (type === 'ALL') {
      return Object.values(stats).reduce((a, b) => a + b, 0);
    } else {
      return stats[type] || 0;
    }
  });

  constructor() {
    addIcons({
      add,
      helpBuoyOutline,
      alertCircleOutline,
      batteryDeadOutline,
      timeOutline,
      searchOutline,
      statsChartOutline,
      documentTextOutline,
      happyOutline,
      filterOutline,
      calendarOutline,
      closeCircle,
    });
  }

  ngOnInit() {
    this.databaseService.dbReady$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isReady) => {
        if (isReady) this.refreshDashboard();
      });

    this.databaseService.dataChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.refreshDashboard();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async ionViewWillEnter() {
    // Chỉ reload nếu events đang rỗng (lần đầu vào lại tab)
    // Nếu đã có data thì giữ nguyên scroll position, không reload lại gây giật
    const now = Date.now();
    if (now - this.lastLoadTime < 500) {
      return;
    }
    this.lastLoadTime = now;

    if (this.events().length === 0) {
      await this.refreshDashboard();
    } else {
      // Vẫn nên update lại Stats vì có thể thay đổi từ tab khác
      this.loadStats();
    }
  }

  // --- LOGIC LOAD DỮ LIỆU ---

  // Hàm Refresh tổng (Gọi khi Pull-to-refresh hoặc Init)
  async refreshDashboard() {
    this.currentPage = 0;
    this.isEndOfData.set(false);
    this.events.set([]);
    this.stats.set({});

    // Chạy song song 2 luồng: Load List (Page 0) & Load Stats (All)
    await Promise.all([this.loadEvents(true), this.loadStats()]);
  }

  async handleRefresh(event: any) {
    await this.refreshDashboard();
    event.target.complete();
  }

  async loadEvents(
    reset: boolean = false,
    infiniteScrollEvent?: InfiniteScrollCustomEvent
  ) {
    if (this.isLoading() && !reset) return;

    this.isLoading.set(true);

    try {
      const pageToLoad = reset ? 0 : this.currentPage;

      const newEvents = await this.databaseService.getEventsPaging(
        pageToLoad,
        this.PAGE_SIZE
      );

      // Check xem đã hết dữ liệu chưa
      if (newEvents.length < this.PAGE_SIZE) {
        this.isEndOfData.set(true);
      }

      if (reset) {
        this.events.set(newEvents);
        this.currentPage = 1; // Reset về page 1 (vì page 0 đã load)
      } else {
        this.events.update((old) => [...old, ...newEvents]);
        this.currentPage++;
      }
    } catch (error) {
      console.error('Load error', error);
    } finally {
      this.isLoading.set(false);
      if (infiniteScrollEvent) infiniteScrollEvent.target.complete();
    }
  }

  // Load Thống kê (Toàn bộ DB)
  async loadStats() {
    try {
      const data = await this.databaseService.getDashboardStats();
      this.stats.set(data);
    } catch (e) {
      console.error('Load stats failed', e);
    }
  }

  async onIonInfinite(ev: any) {
    await this.loadEvents(false, ev);
  }

  getCountByType(type: SelfOpsEventType) {
    return this.events().filter((e) => e.type === type).length;
  }

  handleFilterChange(type: SelfOpsEventType | 'ALL') {
    this.filterType.set(this.filterType() === type ? 'ALL' : type);
    // Khi filter, có thể user muốn search trong toàn bộ DB thay vì chỉ list hiện tại?
    // Hiện tại ta chỉ filter trên client (displayEvents)
  }

  handleSearch(ev: any) {
    this.searchQuery.set(ev.detail.value);
  }

  getEventConfig(type: string | SelfOpsEventType) {
    return AppUtils.getTypeConfig(type);
  }

  // --- MODALS ---
  async openAddModal() {
    const modal = await this.modalCtrl.create({
      component: AddEventModalComponent,
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 0.75,
    });
    await modal.present();
    const { role } = await modal.onWillDismiss();
    if (role === 'confirm') this.loadEvents(true);
  }

  async openDetail(event: any) {
    const modal = await this.modalCtrl.create({
      component: EventDetailModalComponent,
      componentProps: { event },
    });
    await modal.present();

    const { role } = await modal.onWillDismiss();
    // --- XỬ LÝ SAU KHI ĐÓNG MODAL ---
    if (role === 'deleted') {
      // 1. Xóa ngay lập tức khỏi UI (Client-side update)
      this.events.update((currentList) =>
        currentList.filter((e) => e.uuid !== event.uuid)
      );

      // 2. Load lại Stats ngầm
      this.loadStats();
    } else if (role === 'saved') {
      // Nếu update nội dung thì cần load lại để cập nhật text/reflection mới
      // Cách tối ưu: Tìm item trong mảng và update field, nhưng reload cho an toàn data
      this.refreshDashboard();
    }
  }

  async openStats() {
    const allEvents = await this.databaseService.getAllEvents();
    const modal = await this.modalCtrl.create({
      component: StatsModalComponent,
      componentProps: { events: allEvents },
    });
    await modal.present();
  }
}
