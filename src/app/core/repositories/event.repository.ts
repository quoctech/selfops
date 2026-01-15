import { Injectable, inject } from '@angular/core';
import { CapgoCapacitorDataStorageSqlite as WebStorage } from '@capgo/capacitor-data-storage-sqlite';
import {
  ONE_WEEK_MS,
  SelfOpsEvent,
  SelfOpsEventType,
} from '../models/event.type';
import { SqliteConnectionService } from '../services/database/sqlite-connection.service';
import { AppUtils } from '../utils/app.utils';

@Injectable({ providedIn: 'root' })
export class EventRepository {
  private sql = inject(SqliteConnectionService);

  async add(event: SelfOpsEvent) {
    const tagsStr = JSON.stringify(event.tags || []);
    const metaStr = JSON.stringify(event.meta_data || {});

    if (this.sql.isWeb) {
      await WebStorage.set({ key: event.uuid, value: JSON.stringify(event) });
    } else {
      const query = `
        INSERT INTO events (uuid, type, context, emotion, tags, meta_data, created_at, review_due_date, reflection, is_reviewed) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.sql.run(query, [
        event.uuid,
        event.type,
        event.context,
        event.emotion || '',
        tagsStr,
        metaStr,
        event.created_at,
        event.review_due_date,
        event.reflection || '',
        event.is_reviewed ? 1 : 0,
      ]);
    }
  }

  async updateReview(
    uuid: string,
    reflection: string,
    outcome: string,
    updatedAt: number
  ) {
    if (this.sql.isWeb) {
      const res = await WebStorage.get({ key: uuid });
      if (res && res.value) {
        const evt = JSON.parse(res.value);
        evt.reflection = reflection;
        evt.actual_outcome = outcome;
        evt.is_reviewed = true;
        evt.updated_at = updatedAt;
        await WebStorage.set({ key: uuid, value: JSON.stringify(evt) });
      }
    } else {
      const query = `UPDATE events SET reflection = ?, actual_outcome = ?, is_reviewed = 1, updated_at = ? WHERE uuid = ?`;
      await this.sql.run(query, [reflection, outcome, updatedAt, uuid]);
    }
  }

  async delete(uuid: string) {
    if (this.sql.isWeb) {
      await WebStorage.remove({ key: uuid });
    } else {
      await this.sql.run('DELETE FROM events WHERE uuid = ?', [uuid]);
    }
  }

  async deleteAll() {
    if (this.sql.isWeb) {
      await WebStorage.clear();
    } else {
      await this.sql.run('DELETE FROM events');
    }
  }

  // --- QUERIES ---
  async getPaging(
    page: number,
    size: number,
    filterType?: string,
    searchQuery?: string
  ): Promise<SelfOpsEvent[]> {
    if (this.sql.isWeb) {
      let all = await this.getAllFromWeb();
      if (filterType && filterType !== 'ALL') {
        all = all.filter((e) => e.type === filterType);
      }

      if (searchQuery && searchQuery.trim() !== '') {
        const lowerQ = searchQuery.toLowerCase().trim();
        all = all.filter(
          (e) =>
            e.context.toLowerCase().includes(lowerQ) ||
            (e.emotion && e.emotion.toLowerCase().includes(lowerQ))
        );
      }

      const start = page * size;
      return all.slice(start, start + size);
    } else {
      const offset = page * size;

      // Mẹo: Dùng WHERE 1=1 để dễ nối chuỗi AND
      let query = 'SELECT * FROM events WHERE 1=1';
      const params: any[] = [];

      if (filterType && filterType !== 'ALL') {
        query += ' AND type = ?';
        params.push(filterType);
      }

      if (searchQuery && searchQuery.trim() !== '') {
        query += ' AND (context LIKE ? OR emotion LIKE ?)';
        params.push(`%${searchQuery}%`, `%${searchQuery}%`);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(size, offset);

      const res = await this.sql.query(query, params);
      return (res.values || []).map(this.mapRowToEvent);
    }
  }

  async getAll(): Promise<SelfOpsEvent[]> {
    if (this.sql.isWeb) return this.getAllFromWeb();

    const res = await this.sql.query(
      'SELECT * FROM events ORDER BY created_at DESC'
    );
    return (res.values || []).map(this.mapRowToEvent);
  }

  async getPendingReviews(now: number): Promise<SelfOpsEvent[]> {
    if (this.sql.isWeb) {
      return (await this.getAllFromWeb())
        .filter((e) => !e.is_reviewed && e.review_due_date <= now)
        .sort((a, b) => a.review_due_date - b.review_due_date);
    } else {
      const res = await this.sql.query(
        'SELECT * FROM events WHERE is_reviewed = 0 AND review_due_date <= ? ORDER BY review_due_date ASC',
        [now]
      );
      return (res.values || []).map(this.mapRowToEvent);
    }
  }

  async getByReviewStatus(isReviewed: boolean): Promise<SelfOpsEvent[]> {
    const statusVal = isReviewed ? 1 : 0;

    if (this.sql.isWeb) {
      const all = await this.getAllFromWeb();
      return all
        .filter((e) => !!e.is_reviewed === isReviewed)
        .sort((a, b) => {
          if (isReviewed) return (b.updated_at || 0) - (a.updated_at || 0); // Mới review lên đầu
          return a.review_due_date - b.review_due_date; // Hết hạn lên đầu
        });
    } else {
      // NATIVE: Tối ưu SQL
      // Pending -> Sắp xếp theo Deadline (càng gấp càng lên trên)
      // Reviewed -> Sắp xếp theo ngày Review (mới làm xong lên trên)
      const orderBy = isReviewed ? 'updated_at DESC' : 'review_due_date ASC';

      const query = `SELECT * FROM events WHERE is_reviewed = ? ORDER BY ${orderBy}`;

      const res = await this.sql.query(query, [statusVal]);
      return (res.values || []).map(this.mapRowToEvent);
    }
  }

  // Hàm đếm nhanh (Lightweight count)
  async countPending(): Promise<number> {
    if (this.sql.isWeb) {
      return (await this.getAllFromWeb()).filter((e) => !e.is_reviewed).length;
    } else {
      const res = await this.sql.query(
        'SELECT COUNT(*) as c FROM events WHERE is_reviewed = 0'
      );
      return res.values?.[0]?.c || 0;
    }
  }

  // Thêm hàm đếm search
  async countByFilterAndSearch(type: string, search: string): Promise<number> {
    if (this.sql.isWeb) {
      let all = await this.getAllFromWeb();
      if (type && type !== 'ALL') {
        all = all.filter((e) => e.type === type);
      }

      if (search && search.trim() !== '') {
        const lowerQ = search.toLowerCase().trim();
        all = all.filter(
          (e) =>
            e.context.toLowerCase().includes(lowerQ) ||
            (e.emotion && e.emotion.toLowerCase().includes(lowerQ))
        );
      }
      return all.length;
    } else {
      let query = 'SELECT COUNT(*) as c FROM events WHERE 1=1';
      const params: any[] = [];

      if (type && type !== 'ALL') {
        query += ' AND type = ?';
        params.push(type);
      }

      if (search && search.trim() !== '') {
        query += ' AND (context LIKE ? OR emotion LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      const res = await this.sql.query(query, params);
      return res.values?.[0]?.c || 0;
    }
  }

  async getStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {
      DECISION: 0,
      MISTAKE: 0,
      STRESS: 0,
    };
    if (this.sql.isWeb) {
      (await this.getAllFromWeb()).forEach((e) => {
        if (e.type) stats[e.type] = (stats[e.type] || 0) + 1;
      });
    } else {
      const res = await this.sql.query(
        'SELECT type, COUNT(*) as count FROM events GROUP BY type'
      );
      res.values?.forEach((row: any) => (stats[row.type] = row.count));
    }
    return stats;
  }

  // --- HELPERS ---
  private async getAllFromWeb(): Promise<SelfOpsEvent[]> {
    const res = await WebStorage.values();
    return (res.values || [])
      .map((v) => {
        try {
          return JSON.parse(v);
        } catch {
          return null;
        }
      })
      .filter((e: any) => e !== null && !e.date_str && e.type) // Filter logic cho Web
      .sort((a: any, b: any) => b.created_at - a.created_at);
  }

  private mapRowToEvent(row: any): SelfOpsEvent {
    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      meta_data: row.meta_data ? JSON.parse(row.meta_data) : {},
      is_reviewed: !!row.is_reviewed,
    };
  }

  // SEEDING DATA (Logic tạo dữ liệu giả)
  private createDummyEvent(index: number): SelfOpsEvent {
    const contexts = [
      'Deploy production bị lỗi CSS',
      'Quyết định refactor lại module User',
      'Tranh luận với PM về tính năng mới',
      'Quên backup database trước khi update',
      'Tìm ra giải pháp fix bug memory leak',
      'Review code của junior và phát hiện lỗi bảo mật',
      'Họp team chốt phương án marketing',
      'Server bị quá tải do lượng request tăng đột biến',
      'Được khách hàng khen ngợi về giao diện mới',
      'Lỡ tay xóa nhầm config file quan trọng',
    ];
    const emotions = [
      'Lo lắng',
      'Tức giận',
      'Hào hứng',
      'Mệt mỏi',
      'Tự tin',
      'Vội vàng',
      'Buồn',
      'Biết ơn',
    ];
    const types = Object.values(SelfOpsEventType);

    // Random ngày trong quá khứ (0 - 30 ngày trước)
    const daysAgo = Math.floor(Math.random() * 30);
    const createdTime = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

    return {
      uuid: AppUtils.generateUUID(),
      type: types[Math.floor(Math.random() * types.length)],
      context: `${
        contexts[Math.floor(Math.random() * contexts.length)]
      } (Test #${index + 1})`,
      emotion: emotions[Math.floor(Math.random() * emotions.length)],
      tags: [],
      meta_data: {},
      is_reviewed: Math.random() > 0.5,
      review_due_date: createdTime + ONE_WEEK_MS,
      created_at: createdTime,
      reflection:
        Math.random() > 0.7 ? 'Bài học rút ra là cần cẩn thận hơn...' : '',
      actual_outcome: '',
    };
  }

  async seedDummyData(count: number): Promise<void> {
    const eventsToInsert: SelfOpsEvent[] = [];
    for (let i = 0; i < count; i++) {
      eventsToInsert.push(this.createDummyEvent(i));
    }

    if (this.sql.isWeb) {
      // WEB: Lưu từng key
      const promises = eventsToInsert.map((evt) => {
        return WebStorage.set({
          key: evt.uuid,
          value: JSON.stringify(evt),
        });
      });
      await Promise.all(promises);
    } else {
      // NATIVE: Batch Insert (Chia nhỏ mỗi lần 30 items)
      const BATCH_SIZE = 30;
      const lenOfEventsToInsert = eventsToInsert.length;
      for (let i = 0; i < lenOfEventsToInsert; i += BATCH_SIZE) {
        const chunk = eventsToInsert.slice(i, i + BATCH_SIZE);

        const placeholders = chunk
          .map(() => `(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .join(', ');

        const query = `
          INSERT INTO events (uuid, type, context, emotion, tags, meta_data, created_at, review_due_date, reflection, is_reviewed) 
          VALUES ${placeholders}
        `;

        const values: any[] = [];
        chunk.forEach((evt) => {
          values.push(
            evt.uuid,
            evt.type,
            evt.context,
            evt.emotion,
            JSON.stringify(evt.tags || []),
            JSON.stringify(evt.meta_data || {}),
            evt.created_at,
            evt.review_due_date,
            evt.reflection || '',
            evt.is_reviewed ? 1 : 0
          );
        });

        await this.sql.run(query, values);
      }
    }
  }
}
