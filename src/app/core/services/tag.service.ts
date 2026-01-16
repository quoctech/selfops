import { inject, Injectable, signal } from '@angular/core';
import { EventRepository } from '../repositories/event.repository';

@Injectable({ providedIn: 'root' })
export class TagService {
  private eventRepo = inject(EventRepository);

  // Signal chứa danh sách Unique Tags (đã sắp xếp)
  uniqueTags = signal<string[]>([]);

  // Cache để search O(1)
  private tagSet = new Set<string>();

  async loadTags() {
    try {
      // 1. Lấy raw data từ DB
      const rawTagsList = await this.eventRepo.getAllTagsRaw();

      // 2. Xử lý flatten và unique
      this.tagSet.clear();
      rawTagsList.forEach((jsonStr) => {
        try {
          const tags: string[] = JSON.parse(jsonStr);
          tags.forEach((t) => this.tagSet.add(t.trim())); // Giữ nguyên Case (Hoa/Thường)
        } catch (e) {
          /* Ignore parse error */
        }
      });

      // 3. Update signal (Sort A-Z)
      this.uniqueTags.set(Array.from(this.tagSet).sort());
    } catch (e) {
      console.error('Load tags error', e);
    }
  }

  // Hàm search cho UI (Autocomplete)
  search(query: string): string[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    // Tìm các tag có chứa từ khóa
    return this.uniqueTags().filter((t) => t.toLowerCase().includes(q));
  }

  // Thêm tag mới vào cache ngay lập tức (Optimistic update)
  addTagToCache(tag: string) {
    if (!this.tagSet.has(tag)) {
      this.tagSet.add(tag);
      this.uniqueTags.set(Array.from(this.tagSet).sort());
    }
  }
}
