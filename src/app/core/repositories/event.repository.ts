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

  private readonly DUMMY_SCENARIOS = [
    // --- MISTAKE (Sai lầm / Sự cố) ---
    {
      context: 'Deploy production bị lỗi CSS vỡ layout mobile',
      type: SelfOpsEventType.MISTAKE,
      tags: ['coding', 'frontend', 'deploy', 'production'],
    },
    {
      context: 'Quên backup database trước khi chạy migration',
      type: SelfOpsEventType.MISTAKE,
      tags: ['database', 'devops', 'risk'],
    },
    {
      context: 'Lỡ lời tranh cãi gay gắt với PM trong cuộc họp',
      type: SelfOpsEventType.MISTAKE,
      tags: ['communication', 'soft-skill', 'meeting'],
    },
    {
      context: 'Estimate sai task dẫn đến trễ deadline 2 ngày',
      type: SelfOpsEventType.MISTAKE,
      tags: ['planning', 'management', 'time'],
    },
    {
      context: 'Merge code vào nhánh master mà chưa resolve conflict kỹ',
      type: SelfOpsEventType.MISTAKE,
      tags: ['git', 'coding', 'teamwork'],
    },

    // --- DECISION (Quyết định) ---
    {
      context: 'Quyết định refactor lại module User sang kiến trúc mới',
      type: SelfOpsEventType.DECISION,
      tags: ['refactor', 'architecture', 'backend'],
    },
    {
      context: 'Chốt phương án sử dụng Ionic thay vì Flutter cho dự án mới',
      type: SelfOpsEventType.DECISION,
      tags: ['tech-stack', 'mobile', 'research'],
    },
    {
      context: 'Từ chối làm thêm tính năng ngoài scope để bảo vệ team',
      type: SelfOpsEventType.DECISION,
      tags: ['management', 'leadership', 'negotiation'],
    },
    {
      context: 'Đầu tư mua khóa học System Design nâng cao',
      type: SelfOpsEventType.DECISION,
      tags: ['learning', 'career', 'investment'],
    },
    {
      context: 'Chuyển server từ AWS sang DigitalOcean để tiết kiệm chi phí',
      type: SelfOpsEventType.DECISION,
      tags: ['devops', 'finance', 'cloud'],
    },

    // --- STRESS (Căng thẳng / Cảm xúc) ---
    {
      context: 'Server bị quá tải, request timeout liên tục lúc 2h sáng',
      type: SelfOpsEventType.STRESS,
      tags: ['incident', 'server', 'stress'],
    },
    {
      context: 'Khách hàng thay đổi yêu cầu phút chót trước khi demo',
      type: SelfOpsEventType.STRESS,
      tags: ['client', 'change-request', 'pressure'],
    },
    {
      context: 'Debug lỗi memory leak suốt 5 tiếng chưa ra',
      type: SelfOpsEventType.STRESS,
      tags: ['bug', 'coding', 'performance'],
    },
    {
      context: 'Cảm thấy burnout vì làm việc liên tục 12 tiếng/ngày',
      type: SelfOpsEventType.STRESS,
      tags: ['health', 'burnout', 'work-life-balance'],
    },
    {
      context: 'Lo lắng về tình hình cắt giảm nhân sự của công ty',
      type: SelfOpsEventType.STRESS,
      tags: ['career', 'job-security', 'anxiety'],
    },
  ];

  private readonly DUMMY_EMOTIONS = [
    'Lo lắng',
    'Tức giận',
    'Hào hứng',
    'Mệt mỏi',
    'Tự tin',
    'Vội vàng',
    'Buồn',
    'Biết ơn',
    'Bất lực',
    'Hy vọng',
  ];

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

      console.log('>> tagsStr', tagsStr);

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
    searchQuery?: string,
    filterTag?: string
  ): Promise<SelfOpsEvent[]> {
    if (this.sql.isWeb) {
      let all = await this.getAllFromWeb();
      if (filterType && filterType !== 'ALL') {
        all = all.filter((e) => e.type === filterType);
      }

      if (filterTag) {
        all = all.filter((e) => (e.tags || []).includes(filterTag));
      }

      if (searchQuery && searchQuery.trim() !== '') {
        const lowerQ = searchQuery.toLowerCase().trim();
        all = all.filter((e) => {
          // Strip HTML tags để chỉ tìm trong text (tránh tìm nhầm chữ 'p' trong <p>)
          const cleanContext = (e.context || '')
            .replace(/<[^>]*>/g, ' ')
            .toLowerCase();
          const inContext = cleanContext.includes(lowerQ);

          // Tìm trong Emotion
          const inEmotion =
            e.emotion && e.emotion.toLowerCase().includes(lowerQ);

          // Tìm trong mảng Tags (nếu user gõ tên tag vào ô search)
          const inTags = (e.tags || []).some((t) =>
            t.toLowerCase().includes(lowerQ)
          );

          return inContext || inEmotion || inTags;
        });
      }

      all.sort((a, b) => b.created_at - a.created_at);

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

      // Vì tags lưu dạng '["code","bug"]', ta dùng LIKE '%"tag"%' để tìm chính xác
      if (filterTag) {
        query += ` AND tags LIKE ?`;
        params.push(`%"${filterTag}"%`);
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

  async getEventsByReviewStatus(isReviewed: boolean): Promise<SelfOpsEvent[]> {
    const now = AppUtils.getNow();

    if (this.sql.isWeb) {
      // --- LOGIC WEB ---
      const all = await this.getAllFromWeb();
      return all
        .filter((e) => {
          const statusMatch = !!e.is_reviewed === isReviewed;

          // QUAN TRỌNG:
          // Nếu là Tab Chờ Review (false) -> Chỉ lấy cái nào ĐÃ ĐẾN HẠN (<= now)
          if (!isReviewed) {
            return statusMatch && e.review_due_date <= now;
          }
          // Nếu Tab Đã Review -> Lấy hết
          return statusMatch;
        })
        .sort((a, b) => {
          // Sắp xếp:
          // - Đã review: Mới nhất lên đầu (updated_at giảm dần)
          // - Chưa review: Cái nào hết hạn lâu nhất lên đầu (deadline tăng dần) để ưu tiên xử lý
          if (isReviewed) return (b.updated_at || 0) - (a.updated_at || 0);
          return a.review_due_date - b.review_due_date;
        });
    } else {
      // --- LOGIC NATIVE (SQLite) ---
      const orderBy = isReviewed ? 'updated_at DESC' : 'review_due_date ASC';
      let query = '';
      let params: any[] = [];

      if (isReviewed) {
        // Tab Đã Review: Lấy bình thường
        query = `SELECT * FROM events WHERE is_reviewed = 1 ORDER BY ${orderBy}`;
      } else {
        // Tab Chờ Review: Thêm điều kiện Time Capsule (review_due_date <= ?)
        query = `SELECT * FROM events WHERE is_reviewed = 0 AND review_due_date <= ? ORDER BY ${orderBy}`;
        params = [now];
      }

      const res = await this.sql.query(query, params);
      return (res.values || []).map(this.mapRowToEvent);
    }
  }

  // Hàm đếm nhanh (Lightweight count)
  async getPendingCount(): Promise<number> {
    const now = AppUtils.getNow();

    if (this.sql.isWeb) {
      const all = await this.getAllFromWeb();
      // Chỉ đếm những cái chưa review VÀ đã đến hạn
      return all.filter((e) => !e.is_reviewed && e.review_due_date <= now)
        .length;
    } else {
      // NATIVE SQL
      const query =
        'SELECT COUNT(*) as c FROM events WHERE is_reviewed = 0 AND review_due_date <= ?';
      const res = await this.sql.query(query, [now]);
      return res.values?.[0]?.c || 0;
    }
  }

  // Thêm hàm đếm search
  async countByFilterAndSearch(
    type: string,
    search: string,
    filterTag?: string
  ): Promise<number> {
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

      if (filterTag) {
        query += ` AND tags LIKE ?`;
        params.push(`%"${filterTag}"%`);
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

  // Lấy toàn bộ chuỗi JSON tags từ DB (Chỉ lấy cột tags => Siêu nhẹ)
  async getAllTagsRaw(): Promise<string[]> {
    if (this.sql.isWeb) {
      const all = await this.getAllFromWeb();
      // Map ra mảng các chuỗi tag array
      return all.map((e) => JSON.stringify(e.tags || []));
    } else {
      // Chỉ select cột tags, bỏ qua các dòng không có tag
      const query = `SELECT tags FROM events WHERE tags IS NOT NULL AND tags != '[]'`;
      const res = await this.sql.query(query);
      return (res.values || []).map((r) => r.tags);
    }
  }

  // SEEDING DATA (Logic tạo dữ liệu giả)
  // 2. Hàm tạo 1 Event giả lập
  private createDummyEvent(index: number): SelfOpsEvent {
    // Random kịch bản
    const scenario =
      this.DUMMY_SCENARIOS[
        Math.floor(Math.random() * this.DUMMY_SCENARIOS.length)
      ];
    const emotion =
      this.DUMMY_EMOTIONS[
        Math.floor(Math.random() * this.DUMMY_EMOTIONS.length)
      ];

    // Random ngày: Phân bổ dữ liệu đều trong 60 ngày qua
    const daysAgo = Math.floor(Math.random() * 60);
    // Random giờ phút để không bị trùng timestamp tuyệt đối
    const randomTimeOffset = Math.floor(Math.random() * 86400000);
    const createdTime =
      Date.now() - daysAgo * 24 * 60 * 60 * 1000 - randomTimeOffset;

    // Tỉ lệ có Reflection (Bài học): 40%
    const hasReflection = Math.random() > 0.6;

    // Tỉ lệ đã Review: 50%
    const isReviewed = Math.random() > 0.5;

    return {
      uuid: AppUtils.generateUUID(),
      type: scenario.type,
      context: `${scenario.context}`, // Có thể thêm suffix nếu muốn debug: ` [Auto #${index}]`
      emotion: emotion,
      tags: scenario.tags, // Tags chuẩn theo ngữ cảnh
      meta_data: {
        source: 'dummy_seeder',
        index: index,
      },
      is_reviewed: isReviewed,
      review_due_date: createdTime + ONE_WEEK_MS, // Mặc định review sau 1 tuần
      created_at: createdTime,
      reflection: hasReflection
        ? `Bài học rút ra: Cần chú ý hơn về vấn đề ${scenario.tags[0]}...`
        : '',
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
