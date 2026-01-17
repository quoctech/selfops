import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PluginListenerHandle } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { Preferences } from '@capacitor/preferences';
import {
  IonButton,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonRippleEffect,
  IonSpinner,
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
  trashOutline,
} from 'ionicons/icons';
import { ContentChange, QuillModule } from 'ngx-quill';
import Quill from 'quill';
import { debounceTime, Subject } from 'rxjs';

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
    QuillModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonContent,
    IonFooter,
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
          <quill-editor
            [(ngModel)]="eventContent"
            [modules]="quillModules"
            placeholder="Viết gì đó... #tag"
            (onContentChanged)="onEditorUpdate($event)"
            (onEditorCreated)="onEditorCreated($event)"
            style="display: block; width: 100%;"
          >
          </quill-editor>
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

          <div class="action-group">
            <ion-button
              fill="clear"
              class="btn-icon-only btn-trash"
              (click)="confirmClear()"
            >
              <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
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
        </div>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [
    `
      ion-content {
        --background: var(--ion-background-color);
      }
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

      /* --- QUILL EDITOR (TỐI ƯU NATIVE & DARK MODE) --- */
      .input-container {
        background: transparent;
        width: 100%;
        display: block;
      }

      /* Khung Editor: Font chữ native */
      ::ng-deep .ql-container.ql-snow {
        border: none !important;
        font-family: var(--ion-font-family, inherit) !important;
        font-size: 1.1rem !important; /* ~17-18px chuẩn Mobile */
      }

      /* Vùng nhập liệu: Padding và Line-height thoáng */
      ::ng-deep .ql-editor {
        padding: 12px 0 !important; /* Padding trên dưới */
        min-height: 180px; /* Cao hơn chút để dễ nhìn */
        color: var(--ion-text-color);
        line-height: 1.6;
      }

      /* Placeholder: Màu xám chuẩn */
      ::ng-deep .ql-editor.ql-blank::before {
        left: 0 !important;
        color: var(--ion-color-step-300, #999) !important;
        font-style: normal !important;
        opacity: 1;
      }

      /* Toolbar: Tối giản, viền mảnh */
      ::ng-deep .ql-toolbar.ql-snow {
        border: none !important;
        border-bottom: 0.55px solid var(--ion-color-light-shade) !important;
        padding: 8px 0 !important;
        margin-bottom: 8px;
        background: transparent;
      }

      /* Ép màu icon theo theme Ionic */
      ::ng-deep .ql-snow .ql-stroke {
        stroke: var(--ion-color-medium) !important;
      }
      ::ng-deep .ql-snow .ql-fill {
        fill: var(--ion-color-medium) !important;
      }
      ::ng-deep .ql-snow .ql-picker {
        color: var(--ion-color-medium) !important;
      }
      /* Icon khi được Active (Đang chọn) -> Màu Primary */
      ::ng-deep .ql-snow .ql-active .ql-stroke {
        stroke: var(--ion-color-primary) !important;
      }
      ::ng-deep .ql-snow .ql-active .ql-fill {
        fill: var(--ion-color-primary) !important;
      }

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
        border-radius: 18px;
        background-color: var(--ion-color-step-50, #f4f5f8);
        color: var(--ion-text-color);
        font-size: 0.9rem;
        font-weight: 500;
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
      .chip-item.active {
        background-color: var(--ion-color-primary);
        color: #fff;
        font-weight: 600;
        box-shadow: 0 4px 10px rgba(var(--ion-color-primary-rgb), 0.3);
      }

      .modal-footer {
        --background: transparent;
        /* Padding này giúp footer cách đáy/bàn phím 16px */
        padding-bottom: 16px;
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
      /* Group bên phải chứa Trash + Save */
      .action-group {
        display: flex;
        align-items: center;
        gap: 8px;
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
        width: 48px;
        height: 48px;
        --border-radius: 50%;
        --color: var(--ion-color-medium);
        --background: var(--ion-color-step-100);
        margin: 0;
      }
      .btn-trash {
        width: 48px;
        height: 48px;
        --border-radius: 50%;
        --color: var(--ion-color-danger);
        background: transparent;
        margin: 0;
        opacity: 0.8;
      }
      .btn-save {
        width: 64px;
        height: 64px;
        --box-shadow: 0 6px 20px rgba(var(--ion-color-primary-rgb), 0.35);
        font-size: 1.8rem;
        margin: 0;
      }
      .footer-spacer {
        height: 90px;
      }

      /* DARK MODE*/
      :host-context(body.dark) {
        .custom-tabs-wrapper {
          border-bottom-color: var(--ion-color-step-150);
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
  private modalCtrl = inject(ModalController);
  private databaseService = inject(DatabaseService);
  private tagService = inject(TagService);
  private platform = inject(Platform);

  // State
  isSaving = signal(false);
  selectedType = signal<SelfOpsEventType>(SelfOpsEventType.DECISION);
  context = signal(''); // Dùng để lưu text thuần (validate nút Save)
  selectedEmotions = signal<Set<string>>(new Set());

  // UX State
  showSuggestions = signal(false);
  filteredTags = signal<string[]>([]);

  // INTERNAL QUILL
  eventContent = ''; // Bind với Quill (HTML)
  private quillInstance: any; // Instance Quill
  private listeners: PluginListenerHandle[] = [];

  // Lưu nháp
  private draftSubject = new Subject<string>();
  private readonly DRAFT_KEY = 'ops_event_draft';

  readonly emotionChips = EMOTION_CHIPS;
  readonly uiEventTypes = Object.values(SelfOpsEventType).map((type) => ({
    value: type,
    label: AppUtils.getTypeConfig(type).label,
  }));

  // CẤU HÌNH TOOLBAR
  readonly quillModules = {
    toolbar: [
      ['bold', 'italic'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['clean'],
    ],
  };

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
      trashOutline,
    });

    // SETUP AUTO-SAVE LOGIC
    // Đợi 1000ms (1 giây) sau lần gõ cuối cùng mới lưu xuống bộ nhớ
    this.draftSubject.pipe(debounceTime(1000)).subscribe((htmlContent) => {
      this.saveDraftToStorage(htmlContent);
    });
  }

  ngOnInit() {
    this.tagService.loadTags();
    this.loadDraft();

    if (this.platform.is('capacitor')) {
      this.initKeyboardListener();
    }
  }

  ngOnDestroy() {
    this.listeners.forEach((h) => h.remove());
  }

  // --- 1. XỬ LÝ FOCUS KHI MỞ MODAL ---
  onEditorCreated(quill: any) {
    this.quillInstance = quill;
    setTimeout(() => {
      if (this.quillInstance && this.quillInstance.hasFocus()) {
        return;
      }

      this.quillInstance?.focus();
    }, 200);
  }

  // --- 2. XỬ LÝ DỮ LIỆU & TAGS (#) ---
  onEditorUpdate(event: ContentChange) {
    const text = event.text || '';
    const html = event.html || '';

    // Cập nhật context để validate nút Save
    this.context.set(text.trim());
    this.eventContent = html;

    // Đẩy nội dung vào luồng để chờ lưu
    this.draftSubject.next(html);

    // Logic detect tag
    setTimeout(() => this.detectTagLogic(event.editor), 0);
  }

  detectTagLogic(editor: Quill) {
    // Lấy vị trí con trỏ hiện tại.
    // Không cần force=true vì onContentChanged đảm bảo model đã update.
    const selection = editor.getSelection();

    if (selection) {
      const index = selection.index;

      // Lấy toàn bộ text từ đầu đến vị trí con trỏ (Sync từ model Quill)
      const textBefore = editor.getText(0, index);
      const lastHash = textBefore.lastIndexOf('#');

      if (lastHash !== -1) {
        // Lấy chuỗi từ sau dấu # đến con trỏ
        const tagPart = textBefore.slice(lastHash + 1);

        // Logic Check:
        // 1. tagPart rỗng (vừa gõ #) -> Hợp lệ -> Filter ''
        // 2. tagPart có chữ (gõ #a) -> Hợp lệ -> Filter 'a'
        // 3. tagPart có dấu cách (gõ #a b) -> Không hợp lệ -> Ẩn
        // 4. Kiểm tra không chứa ký tự xuống dòng (\n) để tránh lỗi đa dòng

        if (!/\s/.test(tagPart)) {
          this.filterTags(tagPart);
          return; // Kết thúc, giữ dropdown hiện
        }
      }
    }

    // Nếu không thỏa mãn các điều kiện trên thì ẩn gợi ý
    this.showSuggestions.set(false);
  }

  // CÁC HÀM XỬ LÝ NHÁP (MỚI)
  async saveDraftToStorage(html: string) {
    if (!html || html === '<p><br></p>') return; // Không lưu rỗng
    await Preferences.set({
      key: this.DRAFT_KEY,
      value: html,
    });
    // console.log('Auto-saved draft');
  }

  async confirmClear() {
    // Rung nhẹ báo hiệu
    await Haptics.impact({ style: ImpactStyle.Medium });

    // Xóa UI
    this.eventContent = '';
    this.context.set('');

    // Xóa Storage
    await Preferences.remove({ key: this.DRAFT_KEY });
  }

  async loadDraft() {
    const { value } = await Preferences.get({ key: this.DRAFT_KEY });
    if (value) {
      this.eventContent = value;
      // Strip HTML đơn giản để update signal context (để nút Save sáng lên)
      const plainText = value.replace(/<[^>]*>/g, ' ').trim();
      this.context.set(plainText);
    }
  }

  // --- 3. CÁC HÀM CŨ GIỮ NGUYÊN LOGIC ---
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

  selectTag(tag: string) {
    if (!this.quillInstance) return;

    const selection = this.quillInstance.getSelection();
    if (selection) {
      const index = selection.index;
      const textBefore = this.quillInstance.getText(0, index);
      const lastHash = textBefore.lastIndexOf('#');

      if (lastHash !== -1) {
        // Xóa text từ dấu # đến con trỏ
        this.quillInstance.deleteText(lastHash, index - lastHash);
        // Chèn tag mới vào
        this.quillInstance.insertText(lastHash, `#${tag} `);

        this.showSuggestions.set(false);
        this.quillInstance.focus();
      }
    }
  }

  // Logic màu sắc (giữ nguyên)
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
    if (!rawText) return; // Validate dựa trên text thuần

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
        // LƯU Ý: Lưu HTML của Quill vào DB
        context: this.eventContent,
        emotion: emotionStr,
        tags: extractedTags,
        meta_data: [],
        is_reviewed: false,
        review_due_date: now + ONE_WEEK_MS,
        created_at: now,
      };

      await this.databaseService.addEvent(newEvent);
      // Xóa nháp sau khi lưu thành công
      await Preferences.remove({ key: this.DRAFT_KEY });
      await Haptics.notification({ type: NotificationType.Success });
      await this.modalCtrl.dismiss(true, 'confirm');
    } catch (e) {
      console.error(e);
      await Haptics.notification({ type: NotificationType.Error });
    } finally {
      this.isSaving.set(false);
    }
  }

  async initKeyboardListener() {
    const show = await Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        if (this.inputContainer?.nativeElement) {
          const inputTop = this.inputContainer.nativeElement.offsetTop;

          if (this.content) {
            const y = Math.max(0, inputTop - 60);
            this.content.scrollToPoint(0, y, 300);
          }
        }
      }, 50);
    });
    this.listeners.push(show);
  }
}
