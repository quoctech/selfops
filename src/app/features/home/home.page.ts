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
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonRippleEffect,
  IonSearchbar,
  IonSpinner,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  barChart,
  calendarClearOutline,
  closeCircle,
  filterCircleOutline,
  happyOutline,
  searchOutline,
  settingsOutline,
  sparkles,
  timeOutline,
} from 'ionicons/icons';
import {
  debounceTime,
  distinctUntilChanged,
  Subject,
  Subscription,
  takeUntil,
} from 'rxjs';

// Components
import { AddEventModalComponent } from 'src/app/components/add-event-modal/add-event-modal.component';
import { EventDetailModalComponent } from 'src/app/components/event-detail-modal/event-detail-modal.component';
import { StatsModalComponent } from 'src/app/components/stats-modal/stats-modal.component';
import { DailyCheckInComponent } from './components/daily-checkin/daily-checkin.component';

// Models & Services
import { SelfOpsEvent, SelfOpsEventType } from 'src/app/core/models/event.type';
import { DatabaseService } from 'src/app/core/services/database/database.service';
import { TagService } from 'src/app/core/services/tag.service';
import { AppUtils } from 'src/app/core/utils/app.utils';

@Component({
  selector: 'app-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DatePipe,
    ScrollingModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSearchbar,
    IonRippleEffect,
    IonSpinner,
    IonButton,
    DailyCheckInComponent,
  ],
  template: `
    <ion-header class="ion-padding ion-no-border native-glass-header gpu-layer">
      <div class="glass-pane gpu-layer" [class.active]="isScrolled()"></div>

      <ion-toolbar class="transparent-toolbar">
        <div class="header-inner">
          <div class="brand-col">
            <h1 class="logo-text">SelfOps<span class="dot-accent">.</span></h1>
            <div class="date-capsule gpu-layer" [class.hidden]="isScrolled()">
              <ion-icon name="calendar-clear-outline"></ion-icon>
              <span>{{ today | date : 'EEE, dd MMM' }}</span>
            </div>
          </div>

          <div class="action-col">
            <div
              class="icon-btn glow-effect ion-activatable"
              (click)="openStats()"
            >
              <ion-icon name="bar-chart"></ion-icon>
              <ion-ripple-effect></ion-ripple-effect>
            </div>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content
      [scrollX]="false"
      [scrollY]="false"
      [fullscreen]="true"
      class="main-content"
    >
      <div class="layout-container">
        <div class="header-spacer"></div>

        <div class="hero-wrapper gpu-layer" [class.collapsed]="isScrolled()">
          <div class="hero-inner">
            <app-daily-checkin></app-daily-checkin>
          </div>
        </div>

        <div class="sticky-tools-wrapper gpu-layer">
          <div class="tools-content">
            <div class="search-box">
              <ion-searchbar
                [value]="searchQuery()"
                placeholder="Tìm kiếm..."
                [debounce]="300"
                (ionInput)="handleSearch($event)"
                class="premium-searchbar"
                mode="ios"
              ></ion-searchbar>
            </div>

            <div class="filter-scroll-view">
              <div
                class="filter-pill ion-activatable"
                [class.active]="filterType() === 'ALL'"
                (click)="handleFilterChange('ALL')"
              >
                <span>Tất cả</span>
                <ion-ripple-effect></ion-ripple-effect>
              </div>

              @for (type of eventTypes; track type) { @let count = stats()[type]
              || 0; @let conf = getEventConfig(type);
              <div
                class="filter-pill ion-activatable"
                [class.active]="filterType() === type"
                (click)="handleFilterChange(type)"
              >
                <div
                  class="dot"
                  [style.background]="'var(--ion-color-' + conf.color + ')'"
                ></div>
                <span class="label">{{ conf.label }}</span>
                <span class="count">{{ count }}</span>
                <ion-ripple-effect></ion-ripple-effect>
              </div>
              }
            </div>

            @if (filterTag()) {
            <div class="active-tag-strip fade-in" (click)="handleTagClick('')">
              <div class="tag-info">
                <ion-icon name="filter-circle-outline"></ion-icon>
                <span
                  >Filter: <b>#{{ filterTag() }}</b></span
                >
              </div>
              <ion-icon name="close-circle" class="remove-icon"></ion-icon>
            </div>
            }
          </div>
        </div>

        <div class="list-container">
          @if (isFirstLoading()) {
          <div class="center-state">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
          </div>
          } @else if (displayEvents().length === 0) {
          <div class="center-state fade-in">
            @if (isFiltering()) {
            <div class="empty-illustration">
              <ion-icon name="search-outline"></ion-icon>
            </div>
            <h3>Không tìm thấy kết quả</h3>
            <p>Thử thay đổi từ khóa hoặc bộ lọc xem sao.</p>
            <ion-button fill="clear" (click)="resetFilters()" class="reset-btn">
              Xóa bộ lọc
            </ion-button>
            } @else {
            <div class="empty-illustration">
              <ion-icon name="sparkles"></ion-icon>
            </div>
            <h3>Hành trình vạn dặm...</h3>
            <p>
              ...bắt đầu từ dòng suy nghĩ đầu tiên. <br />Hãy ghi lại khoảnh
              khắc ngay bây giờ!
            </p>
            }
          </div>
          } @else {
          <cdk-virtual-scroll-viewport
            #viewportRef
            itemSize="125"
            minBufferPx="400"
            maxBufferPx="800"
            class="custom-viewport"
            (scrolledIndexChange)="onScrollIndexChange($event)"
          >
            <div class="list-spacer-top"></div>

            <div
              *cdkVirtualFor="let event of displayEvents(); trackBy: trackByFn"
              class="list-item-wrapper"
            >
              @let config = getEventConfig(event.type);

              <div
                class="premium-card ion-activatable ripple-parent"
                (click)="openDetail(event)"
              >
                <div
                  class="accent-line"
                  [style.background]="'var(--ion-color-' + config.color + ')'"
                ></div>

                <div class="card-inner">
                  <div class="card-meta">
                    <div
                      class="type-badge"
                      [style.color]="'var(--ion-color-' + config.color + ')'"
                    >
                      {{ config.label }}
                    </div>
                    <div class="time-badge">
                      {{ event.created_at | date : 'HH:mm' }}
                    </div>
                  </div>

                  <div
                    class="card-body text-truncate"
                    [innerHTML]="event.context"
                  ></div>

                  <div class="card-footer">
                    <div class="tags-list">
                      @for (tag of (event.tags || []).slice(0, 3); track $index)
                      {
                      <span
                        class="tag-chip"
                        (click)="handleTagClick(tag); $event.stopPropagation()"
                        >#{{ tag }}</span
                      >
                      } @if ((event.tags || []).length > 3) {
                      <span class="tag-more">...</span> }
                    </div>

                    @if (event.emotion) {
                    <div class="emotion-pill">
                      <ion-icon name="happy-outline"></ion-icon>
                      <span>{{ event.emotion }}</span>
                    </div>
                    }
                  </div>
                </div>
                <ion-ripple-effect></ion-ripple-effect>
              </div>
            </div>

            @if (isLoadingMore()) {
            <div class="footer-loader">
              <ion-spinner name="dots" color="medium"></ion-spinner>
            </div>
            }
            <div class="list-end-spacer"></div>
          </cdk-virtual-scroll-viewport>
          }
        </div>
      </div>
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="openAddModal()" class="basic-fab">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [
    `
      /* =========================================
       1. GLOBAL LAYOUT & VARIABLES
      ========================================= */
      :host {
        --toolbar-height: 56px;
        --header-offset: calc(
          var(--toolbar-height) + var(--ion-safe-area-top, 0px)
        );
        --page-margin: 16px;
      }

      .layout-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--ion-background-color);
        /* Tách layer để GPU xử lý riêng background */
        transform: translateZ(0);
      }

      /* =========================================
       2. HEADER (GLASS EFFECT - GPU OPTIMIZED)
      ========================================= */
      .native-glass-header {
        position: absolute;
        inset: 0;
        bottom: auto;
        z-index: 999;
        pointer-events: none;
        /* GPU Optimization */
        transform: translateZ(0);
        will-change: transform;
      }

      .native-glass-header ion-toolbar {
        pointer-events: auto;
        --border-width: 0;
        padding-top: var(--ion-safe-area-top, 0px);
        --min-height: var(--toolbar-height);
      }

      .transparent-toolbar {
        --background: transparent;
        --border-width: 0;
      }

      .glass-pane {
        position: absolute;
        inset: 0;
        background: var(--glass-bg-light);
        backdrop-filter: blur(12px); /* Tăng độ mờ lên chút cho premium */
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--ion-color-light-shade);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;

        /* GPU: Báo trước cho trình duyệt biết opacity sẽ thay đổi */
        will-change: opacity;
        transform: translateZ(0);
      }
      .glass-pane.active {
        opacity: 0;
      }

      .header-inner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 16px 8px 16px;
        height: 100%;
      }

      /* Branding */
      .brand-col {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .logo-text {
        font-size: 1.7rem;
        font-weight: 900;
        letter-spacing: -0.04em;
        margin: 0;
        background: linear-gradient(
          135deg,
          var(--ion-color-primary),
          var(--ion-color-secondary)
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        line-height: 1;
        /* Tối ưu render text gradient */
        transform: translateZ(0);
      }
      .dot-accent {
        color: var(--ion-color-secondary);
      }

      .date-capsule {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--ion-color-medium);
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 4px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform-origin: top left;
        /* GPU */
        will-change: transform, opacity;
      }
      .date-capsule.hidden {
        opacity: 0;
        transform: translateY(-8px) scale(0.95);
        margin: 0;
        max-height: 0;
      }

      /* Actions */
      .action-col {
        display: flex;
        align-items: center;
      }
      .icon-btn {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: var(--ion-card-background);
        border: 1px solid var(--ion-color-light-shade);
        color: var(--ion-text-color);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.4rem;
        position: relative;
        overflow: hidden;
        transition: transform 0.2s;
        /* Fix lỗi flicker trên iOS */
        -webkit-backface-visibility: hidden;
      }
      .icon-btn:active {
        transform: scale(0.92);
      }

      .glow-effect {
        color: #fff;
        background: linear-gradient(
          135deg,
          var(--ion-color-primary),
          var(--ion-color-secondary)
        );
        border: none;
        animation: glow-pulse 3s infinite ease-in-out;
      }
      @keyframes glow-pulse {
        0%,
        100% {
          box-shadow: 0 4px 15px rgba(var(--ion-color-primary-rgb), 0.3);
        }
        50% {
          box-shadow: 0 6px 20px rgba(var(--ion-color-secondary-rgb), 0.6);
        }
      }

      /* =========================================
       3. HERO & SPACER (ANIMATION CORE)
      ========================================= */

      .header-spacer {
        height: var(--header-offset);
        flex-shrink: 0;
        background: transparent;
      }

      .hero-wrapper {
        padding: 0 16px;
        background: var(--ion-background-color);
        /* Khoảng cách chuẩn 16px dưới header */
        margin-top: 16px;

        /* Animation Performance */
        transition: max-height 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
          opacity 0.3s ease, margin-top 0.3s ease;
        will-change: max-height, opacity, margin-top;

        max-height: 500px;
        opacity: 1;
        overflow: hidden;
        flex-shrink: 0;
        /* Isolation: Tạo stacking context riêng để tránh repaint cả trang */
        contain: content;
      }

      .hero-wrapper.collapsed {
        max-height: 0;
        opacity: 0;
        margin-top: 0; /* Thu hồi margin để Tools dính sát */
      }

      .hero-inner {
        padding-bottom: 8px;
      }

      /* =========================================
       4. STICKY TOOLS (SEARCH & FILTER)
      ========================================= */
      .sticky-tools-wrapper {
        position: sticky;
        top: var(--header-offset);
        z-index: 90;
        background: var(--ion-background-color);

        /* Padding top tạo khoảng cách 16px khi dính */
        padding-top: 16px;

        /* Hiệu ứng bo góc khi dính (Visual trick) */
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.02);
        margin-top: -1px; /* Fix pixel gap */

        transition: padding 0.3s;
        /* GPU */
        transform: translateZ(0);
        will-change: padding;
      }

      .hero-wrapper.collapsed + .sticky-tools-wrapper {
        margin-top: 16px;
        border-bottom: 1px solid var(--ion-color-light-shade);
      }

      .tools-content {
        padding: 0 16px 8px 16px;
      }

      .premium-searchbar {
        --background: var(--ion-color-light);
        --border-radius: 14px;
        --box-shadow: none;
        --icon-color: var(--ion-color-medium);
        padding-inline: 0;
        height: 44px;
        margin-bottom: 12px;
        font-size: 0.95rem;
      }

      /* Filter Scroll Optimized */
      .filter-scroll-view {
        display: flex;
        overflow-x: auto;
        gap: 8px;
        padding-bottom: 4px;
        scrollbar-width: none;
        /* Tăng tốc độ cuộn ngang trên iOS */
        -webkit-overflow-scrolling: touch;
      }
      .filter-scroll-view::-webkit-scrollbar {
        display: none;
      }

      .filter-pill {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 14px;
        height: 36px;
        border-radius: 20px;
        background: var(--ion-card-background);
        border: 1px solid var(--ion-color-light-shade);
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--ion-text-color);
        position: relative;
        overflow: hidden;
        transition: all 0.2s;
        /* Tối ưu render */
        contain: content;
      }
      .filter-pill.active {
        border-color: var(--ion-color-primary);
        background: rgba(var(--ion-color-primary-rgb), 0.08);
        color: var(--ion-color-primary);
      }
      .filter-pill .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }
      .filter-pill .count {
        font-size: 0.75rem;
        opacity: 0.6;
        margin-left: 2px;
        font-weight: 400;
      }

      .active-tag-strip {
        margin-top: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(var(--ion-color-primary-rgb), 0.08);
        padding: 8px 12px;
        border-radius: 10px;
        color: var(--ion-color-primary);
        font-size: 0.85rem;
        cursor: pointer;
        animation: fadeIn 0.3s ease-out;
      }
      .tag-info {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 500;
      }

      /* =========================================
       5. LIST & CARDS (CONTAINMENT)
      ========================================= */
      .list-container {
        flex: 1;
        position: relative;
        background: var(--ion-background-color);
        min-height: 0;
        /* Isolate list rendering context */
        contain: layout paint;
      }

      .custom-viewport {
        height: 100%;
        width: 100%;
      }
      .list-spacer-top {
        height: 12px;
      }
      .list-item-wrapper {
        padding: 0 16px 16px 16px;
      }

      .premium-card {
        background: var(--ion-card-background);
        border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        border: 1px solid var(--ion-color-light-shade);
        position: relative;
        overflow: hidden;
        display: flex;
        min-height: 110px;
        transition: transform 0.1s;

        /* Performance Boost: 
           Trình duyệt biết nội dung card ko ảnh hưởng layout bên ngoài 
        */
        contain: content;
        transform: translateZ(0);
      }
      .premium-card:active {
        transform: scale(0.98);
      }

      .accent-line {
        width: 5px;
        flex-shrink: 0;
      }
      .card-inner {
        flex: 1;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .card-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .type-badge {
        font-size: 0.7rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .time-badge {
        font-size: 0.75rem;
        color: var(--ion-color-medium);
        font-weight: 500;
      }

      .card-body {
        font-size: 1rem;
        line-height: 1.5;
        color: var(--ion-text-color);
        font-weight: 500;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card-body ::ng-deep p {
        margin: 0;
        padding: 0;
        display: inline;
      }

      /* Nếu có list trong card thì ẩn bullet point đi cho gọn */
      .card-body ::ng-deep ul,
      .card-body ::ng-deep ol {
        margin: 0;
        padding: 0;
        list-style: none;
        display: inline;
      }
      .card-body ::ng-deep li {
        display: inline;
        margin-right: 5px; /* Thêm khoảng cách nhỏ giữa các ý */
      }
      /* Thêm dấu phẩy hoặc gạch giữa các li nếu muốn (tùy chọn) */
      .card-body ::ng-deep li::after {
        content: ' • ';
        color: var(--ion-color-medium);
      }
      .card-body ::ng-deep li:last-child::after {
        content: '';
      }

      .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 2px;
      }
      .tags-list {
        display: flex;
        gap: 6px;
      }
      .tag-chip {
        font-size: 0.7rem;
        color: var(--ion-color-medium);
        background: var(--ion-color-light);
        padding: 4px 8px;
        border-radius: 6px;
        font-weight: 600;
      }
      .tag-more {
        font-size: 0.7rem;
        color: var(--ion-color-medium);
        align-self: center;
      }
      .emotion-pill {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.75rem;
        color: var(--ion-color-medium);
        font-weight: 600;
      }

      /* =========================================
       6. STATES & FAB
      ========================================= */
      .basic-fab {
        --background: var(--ion-text-color);
        --color: var(--ion-background-color);
        --box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
        --border-radius: 18px;
        transform: translateZ(0); /* Fab luôn ở layer trên cùng */
      }

      .center-state {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 0 24px;
      }
      .empty-illustration {
        font-size: 3rem;
        color: var(--ion-color-medium);
        opacity: 0.5;
      }
      .center-state h3 {
        margin: 0 0 8px 0;
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--ion-text-color);
      }
      .center-state p {
        margin: 0 0 20px 0;
        font-size: 0.9rem;
        color: var(--ion-color-medium);
        line-height: 1.5;
      }

      .cta-btn {
        --background: var(--ion-color-primary);
        --border-radius: 20px;
        font-weight: 600;
        width: 140px;
      }
      .reset-btn {
        font-weight: 600;
        text-transform: none;
      }
      .footer-loader {
        padding: 16px;
        display: flex;
        justify-content: center;
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
          background: rgba(30, 30, 30, 0.85);
          border-bottom-color: #333;
        }
        .premium-searchbar {
          --background: var(--ion-color-step-100);
        }
        .sticky-tools-wrapper {
          background: var(--ion-background-color);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
        }
        .premium-card {
          border-color: #333;
          box-shadow: none;
        }
        .icon-btn {
          border-color: #333;
        }
      }

      /* Tăng chiều cao vùng đệm cuối cùng lên bằng chiều cao màn hình */
      /* Điều này đảm bảo Viewport LUÔN LUÔN có thể scroll được, dù chỉ có 1 item */
      .list-end-spacer {
        height: 45vh;
        width: 100%;

        /* Optional: Thêm cái này để trông nó "xịn" hơn, đỡ giống lỗi */
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 20px;
        color: var(--ion-color-medium);
        font-size: 0.8rem;
        opacity: 0.5;
      }
    `,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  private db = inject(DatabaseService);
  private modalCtrl = inject(ModalController);
  private tagService = inject(TagService);
  private router = inject(Router);

  // SIGNALS
  events = signal<SelfOpsEvent[]>([]);
  stats = signal<Record<string, number>>({});
  isFirstLoading = signal(true);
  isLoadingMore = signal(false);
  isScrolled = signal(false);

  searchQuery = signal('');
  filterType = signal<SelfOpsEventType | 'ALL'>('ALL');
  filterTag = signal<string>('');

  private currentPage = 0;
  private readonly PAGE_SIZE = 40;
  private isEndOfData = false;

  today = AppUtils.getNow();
  eventTypes = Object.values(SelfOpsEventType);

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  private scrollSubscription: Subscription | undefined;

  displayEvents = computed(() => this.events());

  // LOGIC EMPTY STATE
  isFiltering = computed(() => {
    return (
      this.searchQuery().length > 0 ||
      this.filterType() !== 'ALL' ||
      this.filterTag().length > 0
    );
  });

  // VIEWPORT REFERENCE
  private _viewport: CdkVirtualScrollViewport | undefined;

  @ViewChild(CdkVirtualScrollViewport)
  set viewportRef(vp: CdkVirtualScrollViewport) {
    // Unsubscribe old
    if (this.scrollSubscription) {
      this.scrollSubscription.unsubscribe();
      this.scrollSubscription = undefined;
    }

    this._viewport = vp;
    if (!vp) return;

    // Subscribe new (Zoneless logic using RxJS)
    this.scrollSubscription = vp
      .elementScrolled()
      .pipe(debounceTime(10), takeUntil(this.destroy$))
      .subscribe(() => {
        const offset = vp.measureScrollOffset();
        const scrolled = offset > 40;

        // Signal update triggers change detection efficiently
        if (this.isScrolled() !== scrolled) {
          this.isScrolled.set(scrolled);
        }
      });
  }

  constructor() {
    addIcons({
      add,
      calendarClearOutline,
      barChart,
      searchOutline,
      closeCircle,
      filterCircleOutline,
      timeOutline,
      happyOutline,
      sparkles,
      settingsOutline,
    });
  }

  ngOnInit() {
    this.refreshAll(true);

    this.db.dataChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.refreshAll(false));

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((val) => {
        this.searchQuery.set(val);
        this.refreshAll(false);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    if (this.scrollSubscription) this.scrollSubscription.unsubscribe();
  }

  // --- ACTIONS ---
  async refreshAll(showLoading: boolean) {
    if (showLoading) this.isFirstLoading.set(true);

    // FIX: Reset Scroll & Header Logic
    if (this._viewport) {
      this._viewport.scrollToIndex(0);
      this.isScrolled.set(false);
    }

    this.currentPage = 0;
    this.isEndOfData = false;
    this.events.set([]);
    this.tagService.loadTags();
    await Promise.all([this.loadNextPage(), this.loadStats()]);
    this.isFirstLoading.set(false);
  }

  // Reset Filters UI
  resetFilters() {
    this.searchQuery.set('');
    this.filterType.set('ALL');
    this.filterTag.set('');
    this.refreshAll(false);
  }

  async loadNextPage() {
    if (this.isEndOfData) return;
    try {
      const newEvents = await this.db.getEventsPaging(
        this.currentPage,
        this.PAGE_SIZE,
        this.filterType(),
        this.searchQuery(),
        this.filterTag()
      );
      if (newEvents.length < this.PAGE_SIZE) this.isEndOfData = true;
      this.events.update((current) => [...current, ...newEvents]);
      this.currentPage++;
    } catch (e) {
      console.error(e);
    }
  }

  async onScrollIndexChange(index: number) {
    if (this.isLoadingMore() || this.isEndOfData) return;
    const total = this.events().length;
    if (index >= total - 15) {
      this.isLoadingMore.set(true);
      await this.loadNextPage();
      this.isLoadingMore.set(false);
    }
  }

  async loadStats() {
    const s = await this.db.getDashboardStats();
    this.stats.set(s);
  }

  handleSearch(ev: any) {
    this.searchSubject.next(ev.detail.value);
  }

  handleFilterChange(type: SelfOpsEventType | 'ALL') {
    if (this.filterType() !== type) {
      this.filterType.set(type);
      this.refreshAll(false); // Sẽ trigger reset scroll
    }
  }

  handleTagClick(tag: string) {
    if (this.filterTag() !== tag) {
      this.filterTag.set(tag);
      this.refreshAll(false); // Sẽ trigger reset scroll
    }
  }

  openSettings() {
    this.router.navigate(['/settings']);
  }

  async openAddModal() {
    const modal = await this.modalCtrl.create({
      component: AddEventModalComponent,
    });
    await modal.present();
  }

  async openDetail(event: SelfOpsEvent) {
    const modal = await this.modalCtrl.create({
      component: EventDetailModalComponent,
      componentProps: { event },
    });

    await modal.present();
  }

  async openStats() {
    const modal = await this.modalCtrl.create({
      component: StatsModalComponent,
      componentProps: { events: await this.db.getAllEvents() },
    });
    await modal.present();
  }

  getEventConfig(type: string) {
    return AppUtils.getTypeConfig(type as SelfOpsEventType);
  }

  trackByFn(index: number, item: SelfOpsEvent) {
    return item.uuid;
  }
}
