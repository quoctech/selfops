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
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonRippleEffect,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowUpOutline,
  closeOutline,
  happyOutline,
  pricetagsOutline,
  saveOutline,
} from 'ionicons/icons';
import {
  ONE_WEEK_MS,
  SelfOpsEvent,
  SelfOpsEventType,
} from 'src/app/core/models/event.type';
import { DatabaseService } from 'src/app/core/services/database/database.service';
import { TagService } from 'src/app/core/services/tag.service';
import { AppUtils } from 'src/app/core/utils/app.utils';

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
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonContent,
    IonFooter,
    IonTextarea,
    IonIcon,
    IonRippleEffect,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title class="modal-title">Ghi Nhận</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content
      class="ion-padding-horizontal no-scroll-bounce"
      [scrollY]="true"
      #content
    >
      <div class="custom-tabs-wrapper top-spacing">
        @for (item of uiEventTypes; track item.value) {
        <div
          class="tab-item ion-activatable"
          [class.selected]="selectedType() === item.value"
          (click)="onTypeChange(item.value)"
        >
          <span class="tab-label">{{ item.label }}</span>
          <div
            class="active-indicator"
            [style.background-color]="
              selectedType() === item.value
                ? getTypeColor(item.value)
                : 'transparent'
            "
          ></div>
          <ion-ripple-effect></ion-ripple-effect>
        </div>
        }
      </div>

      <div class="section-wrapper input-wrapper-relative">
        <div class="input-container" #inputContainer>
          <ion-textarea
            #mainInput
            class="hero-input"
            [ngModel]="context()"
            (ngModelChange)="onContextChange($event)"
            rows="5"
            placeholder="Viết gì đó... #tag"
            [autoGrow]="true"
            inputmode="text"
            autofocus="true"
          ></ion-textarea>
        </div>

        @if (showSuggestions() && filteredTags().length > 0) {
        <div class="suggestion-dropdown fade-in">
          <div class="suggestion-header">
            <ion-icon name="pricetags-outline"></ion-icon>
            <span>Gợi ý thẻ</span>
          </div>
          <div class="suggestion-body">
            @for (tag of filteredTags(); track tag) {
            <div
              class="suggestion-item ion-activatable"
              (click)="selectTag(tag)"
            >
              <span class="hash">#</span>{{ tag }}
              <ion-ripple-effect></ion-ripple-effect>
            </div>
            }
          </div>
        </div>
        }
      </div>

      <div class="section-wrapper emotion-section">
        <div class="section-label">
          <ion-icon name="happy-outline"></ion-icon>
          <span>Cảm xúc</span>
        </div>
        <div class="chips-grid">
          @for (emo of emotionChips; track emo) {
          <div
            class="chip-item ion-activatable"
            [class.active]="selectedEmotions().has(emo)"
            (click)="toggleEmotion(emo)"
          >
            {{ emo }}
            <ion-ripple-effect></ion-ripple-effect>
          </div>
          }
        </div>
      </div>

      <div class="footer-spacer"></div>
    </ion-content>

    <ion-footer class="ion-no-border modal-footer">
      <ion-toolbar class="footer-toolbar">
        <div class="footer-actions">
          <ion-button
            fill="clear"
            class="btn-icon-only btn-cancel"
            (click)="cancel()"
          >
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>

          <ion-button
            shape="round"
            [color]="dynamicColor()"
            class="btn-save"
            [disabled]="isSaving() || !context()"
            (click)="save()"
          >
            @if (isSaving()) {
            <ion-spinner name="crescent" color="light"></ion-spinner>
            } @else {
            <ion-icon
              slot="icon-only"
              name="arrow-up-outline"
              size="large"
            ></ion-icon>
            }
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [
    `
      /* --- GLOBAL LAYOUT --- */
      ion-content {
        --background: var(--ion-background-color);
      }
      /* Chặn scroll nảy trên iOS */
      .no-scroll-bounce::part(scroll) {
        overscroll-behavior-y: none;
      }

      .section-wrapper {
        margin-bottom: 20px;
        position: relative;
      }
      .top-spacing {
        margin-top: 8px;
      }
      .modal-title {
        font-weight: 800;
        font-size: 1.1rem;
        text-align: center;
        opacity: 0.9;
        letter-spacing: -0.02em;
      }

      /* --- 1. MINIMAL TABS --- */
      .custom-tabs-wrapper {
        display: flex;
        justify-content: space-between;
        padding: 0 4px 12px 4px;
        border-bottom: 1px solid var(--ion-color-light-shade);
      }
      .tab-item {
        position: relative;
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
        text-align: center;
      }
      .tab-label {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--ion-color-medium);
        transition: color 0.2s, font-weight 0.2s;
      }
      .active-indicator {
        width: 24px;
        height: 3px;
        border-radius: 2px;
        margin-top: 4px;
        opacity: 0;
        transform: scaleX(0);
        transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      }

      .tab-item.selected .tab-label {
        color: var(--ion-text-color);
        font-weight: 700;
      }
      .tab-item.selected .active-indicator {
        opacity: 1;
        transform: scaleX(1);
      }

      /* --- 2. HERO INPUT --- */
      .input-container {
        background: transparent;
      }
      .hero-input {
        --padding-start: 0;
        --padding-end: 0;
        --padding-top: 12px;
        --padding-bottom: 0;
        --placeholder-color: var(--ion-color-step-300, #999);
        font-size: 1.4rem;
        line-height: 1.5;
        font-weight: 500;
        min-height: 120px;
      }

      /* Dropdown Suggestion */
      .suggestion-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--ion-card-background);
        border: 1px solid var(--ion-color-light-shade);
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
        z-index: 100;
        overflow: hidden;
        margin-top: -10px;
      }
      .suggestion-header {
        background: var(--ion-color-step-50);
        padding: 8px 16px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--ion-color-medium);
        display: flex;
        align-items: center;
        gap: 6px;
        border-bottom: 1px solid var(--ion-color-light-shade);
      }
      .suggestion-body {
        max-height: 150px;
        overflow-y: auto;
      }
      .suggestion-item {
        padding: 12px 16px;
        font-size: 1rem;
        font-weight: 500;
        color: var(--ion-text-color);
        border-bottom: 1px solid var(--ion-color-light-shade);
        position: relative;
        overflow: hidden;
      }
      .suggestion-item .hash {
        color: var(--ion-color-primary);
        font-weight: 800;
        margin-right: 4px;
      }
      .fade-in {
        animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* --- 3. EMOTION CHIPS (Stable Layout) --- */
      .emotion-section {
        margin-top: 10px;
      }
      .section-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--ion-color-medium);
        margin-bottom: 12px;
      }
      .chips-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .chip-item {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 36px;
        padding: 0 16px;
        border-radius: 18px; /* Viên thuốc */
        background-color: var(--ion-color-step-50, #f4f5f8);
        color: var(--ion-text-color);
        font-size: 0.9rem;
        font-weight: 500;
        /* Border transparent giữ kích thước cố định */
        border: 1px solid transparent;
        transition: background-color 0.2s, color 0.2s, transform 0.1s;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        user-select: none;
      }
      .chip-item:active {
        transform: scale(0.95);
      }

      /* Active State: Chỉ đổi màu, không đổi size */
      .chip-item.active {
        background-color: var(--ion-color-primary);
        color: #fff;
        font-weight: 600;
        box-shadow: 0 4px 10px rgba(var(--ion-color-primary-rgb), 0.3);
      }

      /* --- 4. FOOTER ACTIONS --- */
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
        padding: 0 16px;
        width: 100%;
      }

      .btn-icon-only {
        width: 52px;
        height: 52px;
        margin: 0;
        --padding-start: 0;
        --padding-end: 0;
        --border-radius: 50%;
        font-size: 1.5rem;
      }

      .btn-cancel {
        --color: var(--ion-color-medium);
        --background: var(--ion-color-step-100);
      }

      .btn-save {
        width: 64px;
        height: 64px; /* Nút Save to hơn để dễ bấm */
        --box-shadow: 0 6px 20px rgba(var(--ion-color-primary-rgb), 0.35);
        font-size: 1.8rem;
      }

      .footer-spacer {
        height: 90px;
      }

      /* DARK MODE */
      :host-context(body.dark) {
        .custom-tabs-wrapper {
          border-bottom-color: var(--ion-color-step-150);
        }
        .hero-input {
          --placeholder-color: var(--ion-color-step-400);
        }
        .chip-item {
          background-color: var(--ion-color-step-150);
        }
        .btn-cancel {
          --background: var(--ion-color-step-150);
        }
        .suggestion-dropdown {
          border-color: var(--ion-color-step-200);
        }
      }
    `,
  ],
})
export class AddEventModalComponent implements OnInit, OnDestroy {
  // Services & Injects
  private modalCtrl = inject(ModalController);
  private databaseService = inject(DatabaseService);
  private tagService = inject(TagService);
  private platform = inject(Platform);

  // Signals (State)
  isSaving = signal(false);
  selectedType = signal<SelfOpsEventType>(SelfOpsEventType.DECISION);
  context = signal('');
  selectedEmotions = signal<Set<string>>(new Set());

  // UX State
  showSuggestions = signal(false);
  filteredTags = signal<string[]>([]);

  // Internal
  private cursorPos = 0;
  private listeners: PluginListenerHandle[] = [];

  readonly emotionChips = EMOTION_CHIPS;
  readonly uiEventTypes = Object.values(SelfOpsEventType).map((type) => ({
    value: type,
    label: AppUtils.getTypeConfig(type).label,
  }));

  @ViewChild('mainInput') mainInput!: IonTextarea;
  @ViewChild('content') content!: IonContent;
  @ViewChild('inputContainer', { read: ElementRef })
  inputContainer!: ElementRef;

  constructor() {
    addIcons({
      closeOutline,
      happyOutline,
      pricetagsOutline,
      saveOutline,
      arrowUpOutline,
    });
  }

  ngOnInit() {
    this.tagService.loadTags();
    if (this.platform.is('capacitor')) {
      this.initKeyboardListener();
    }
  }

  ngOnDestroy() {
    this.listeners.forEach((h) => h.remove());
  }

  ionViewDidEnter() {
    // Focus sau 150ms để animation modal mượt hơn
    setTimeout(() => this.mainInput.setFocus(), 150);
  }

  async initKeyboardListener() {
    const show = await Keyboard.addListener('keyboardDidShow', () => {
      // Đẩy nội dung lên nhẹ để tránh bị che
      setTimeout(() => {
        const inputTop = this.inputContainer.nativeElement.offsetTop;
        const y = Math.max(0, inputTop - 60);
        this.content.scrollToPoint(0, y, 300);
      }, 50);
    });
    this.listeners.push(show);
  }

  // --- LOGIC ---

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

  getTypeColor(type: SelfOpsEventType) {
    switch (type) {
      case SelfOpsEventType.DECISION:
        return 'var(--ion-color-primary)';
      case SelfOpsEventType.MISTAKE:
        return 'var(--ion-color-danger)';
      case SelfOpsEventType.STRESS:
        return 'var(--ion-color-warning)';
      default:
        return 'var(--ion-color-medium)';
    }
  }

  async onTypeChange(type: SelfOpsEventType) {
    this.selectedType.set(type);
    await Haptics.selectionStart();
  }

  toggleEmotion(emo: string) {
    Haptics.impact({ style: ImpactStyle.Light });
    const currentSet = new Set(this.selectedEmotions());
    if (currentSet.has(emo)) currentSet.delete(emo);
    else currentSet.add(emo);
    this.selectedEmotions.set(currentSet);
  }

  // Detect Hashtag
  async onContextChange(newVal: string) {
    this.context.set(newVal);
    const textarea = await this.mainInput.getInputElement();
    const cursor = textarea.selectionStart || 0;
    this.cursorPos = cursor;

    const textUpToCursor = newVal.slice(0, cursor);
    const lastHashIndex = textUpToCursor.lastIndexOf('#');

    if (lastHashIndex !== -1) {
      const textAfterHash = textUpToCursor.slice(lastHashIndex + 1);
      // Regex: Chỉ chữ cái, số, gạch dưới, không khoảng trắng
      if (!/\s/.test(textAfterHash)) {
        this.filterTags(textAfterHash);
        return;
      }
    }
    this.showSuggestions.set(false);
  }

  filterTags(term: string) {
    const all = this.tagService.uniqueTags();
    if (!all || all.length === 0) {
      this.showSuggestions.set(false);
      return;
    }
    const matches = all.filter((t) =>
      t.toLowerCase().includes(term.toLowerCase())
    );
    if (matches.length > 0) {
      this.filteredTags.set(matches);
      this.showSuggestions.set(true);
    } else {
      this.showSuggestions.set(false);
    }
  }

  async selectTag(tag: string) {
    const fullText = this.context();
    const cursor = this.cursorPos;
    const textUpToCursor = fullText.slice(0, cursor);
    const lastHashIndex = textUpToCursor.lastIndexOf('#');

    if (lastHashIndex !== -1) {
      const beforeHash = fullText.slice(0, lastHashIndex);
      const afterCursor = fullText.slice(cursor);
      const newText = `${beforeHash}#${tag} ${afterCursor}`;

      this.context.set(newText);
      this.showSuggestions.set(false);

      setTimeout(async () => {
        const textarea = await this.mainInput.getInputElement();
        textarea.focus();
      }, 50);
    }
  }

  private extractTags(text: string): string[] {
    const regex = /#[\w\u00C0-\u1EF9]+/g;
    const matches = text.match(regex);
    if (!matches) return [];
    return [...new Set(matches.map((tag) => tag.substring(1)))];
  }

  cancel() {
    return this.modalCtrl.dismiss(null, 'cancel');
  }

  async save() {
    const rawText = this.context();
    if (!rawText) return;

    await Haptics.impact({ style: ImpactStyle.Medium });
    this.isSaving.set(true);

    const now = AppUtils.getNow();
    try {
      const extractedTags = this.extractTags(rawText);
      extractedTags.forEach((t) => this.tagService.addTagToCache(t));

      const emotionStr = Array.from(this.selectedEmotions()).join(',');
      const newEvent: SelfOpsEvent = {
        uuid: AppUtils.generateUUID(),
        type: this.selectedType(),
        context: rawText,
        emotion: emotionStr,
        tags: extractedTags,
        meta_data: [],
        is_reviewed: false,
        review_due_date: now + ONE_WEEK_MS,
        created_at: now,
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
