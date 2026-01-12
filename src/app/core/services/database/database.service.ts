import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ONE_WEEK_MS, SelfOpsEvent } from '../../models/event.type';

import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

import { CapgoCapacitorDataStorageSqlite as CapacitorDataStorageSqlite } from '@capgo/capacitor-data-storage-sqlite';
import { AppUtils } from '../../utils/app.utils';

const DB_NAME = 'self_ops_db';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;

  private isDbReady = new BehaviorSubject<boolean>(false);
  public dbReady$ = this.isDbReady.asObservable();

  private pendingCount = new BehaviorSubject<number>(0);
  public pendingCount$ = this.pendingCount.asObservable();

  constructor() {
    this.init();
  }

  private get isWeb(): boolean {
    return Capacitor.getPlatform() === 'web';
  }

  private async ensureDbReady() {
    if (this.isDbReady.value) return;
    await firstValueFrom(this.dbReady$.pipe(filter((ready) => ready === true)));
  }

  async init() {
    try {
      if (this.isWeb) {
        // --- 1. WEB ---
        await CapacitorDataStorageSqlite.openStore({
          database: DB_NAME,
          encrypted: false,
          mode: 'no-encryption',
        });
        console.log('✅ WEB DB Ready');
      } else {
        // --- 2. NATIVE (Fix lỗi Connection Exists) ---

        // Kiểm tra xem native có đang giữ kết nối nào không
        await this.sqlite.checkConnectionsConsistency();

        try {
          // Cố gắng tạo kết nối mới
          this.db = await this.sqlite.createConnection(
            DB_NAME,
            false,
            'no-encryption',
            1,
            false
          );
        } catch (err: any) {
          // Nếu lỗi báo "Connection exists" -> Lấy lại kết nối cũ
          if (err.message && err.message.includes('already exists')) {
            console.warn('⚠️ Connection exists, retrieving...');
            this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
          } else {
            // Nếu là lỗi khác thì ném ra
            throw err;
          }
        }

        await this.db.open();

        // Tạo bảng (Lưu ý: Chỉ chạy nếu bảng chưa tồn tại. Nếu bảng cũ thiếu cột, cần gỡ app cài lại)
        const schemaEvent = `
          CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL,
            context TEXT,
            emotion TEXT,
            tags TEXT,
            is_reviewed INTEGER DEFAULT 0,
            review_due_date INTEGER,
            reflection TEXT, 
            actual_outcome TEXT,
            created_at INTEGER,
            updated_at INTEGER
          );
        `;
        await this.db.execute(schemaEvent);

        const schemaDaily = `
          CREATE TABLE IF NOT EXISTS daily_logs (
            id TEXT PRIMARY KEY,
            date_str TEXT UNIQUE NOT NULL, -- Format YYYY-MM-DD (Mỗi ngày chỉ 1 dòng)
            score INTEGER,                 -- 0 đến 100
            reason TEXT,                   -- Ghi chú ngắn gọn
            created_at INTEGER
          );
        `;
        await this.db.execute(schemaDaily);
        console.log('✅ NATIVE DB Ready');
      }

      this.isDbReady.next(true);
      await this.updatePendingCount();
      console.log('✅ Database Initialized & Count Updated');
    } catch (e) {
      console.error('❌ Database Init Error:', e);
    }
  }

  async updatePendingCount() {
    await this.ensureDbReady();
    const now = Date.now();
    let count = 0;

    if (this.isWeb) {
      // WEB: Lấy hết -> Filter thủ công
      try {
        const res = await CapacitorDataStorageSqlite.values();
        const all = (res.values || [])
          .map((v: string) => {
            try {
              return JSON.parse(v);
            } catch {
              return null;
            }
          })
          .filter((e: any) => e !== null);

        count = all.filter((e: any) => {
          // Logic filter: Chưa review VÀ Đã đến hạn
          const isNotReviewed = e.is_reviewed === false || e.is_reviewed === 0;
          const isDue = e.review_due_date <= now;
          return isNotReviewed && isDue;
        }).length;
      } catch (e) {
        count = 0;
      }
    } else {
      // NATIVE: Count bằng SQL cho nhanh
      try {
        const query = `SELECT COUNT(*) as c FROM events WHERE is_reviewed = 0 AND review_due_date <= ?`;
        const res = await this.db.query(query, [now]);
        count = res.values?.[0]?.c || 0;
      } catch (e) {
        count = 0;
      }
    }

    // Emit giá trị mới ra cho toàn App biết
    this.pendingCount.next(count);
  }

  // --- CRUD METHODS ---
  async addEvent(event: any) {
    await this.ensureDbReady();

    const uuid = event.uuid || AppUtils.generateUUID();
    const now = Date.now();
    const dueDate = event.review_due_date || now + ONE_WEEK_MS;

    const tagsStr = JSON.stringify(event.tags || []);
    // Meta data giờ chỉ lưu các cái lặt vặt khác, không chứa emotion nữa
    const metaStr =
      typeof event.meta_data === 'string'
        ? event.meta_data
        : JSON.stringify(event.meta_data || {});

    const emotion = event.emotion || '';

    if (this.isWeb) {
      const newEvent = {
        ...event,
        uuid,
        emotion,
        created_at: now,
        review_due_date: dueDate,
        is_reviewed: false,
        tags: event.tags || [],
        reflection: '',
      };

      await CapacitorDataStorageSqlite.set({
        key: uuid,
        value: JSON.stringify(newEvent),
      });
    } else {
      // NATIVE: Thêm cột emotion vào câu INSERT
      const query = `
        INSERT INTO events (uuid, type, context, emotion, tags, created_at, review_due_date, reflection) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.db.run(query, [
        uuid,
        event.type,
        event.context,
        emotion,
        tagsStr,
        now,
        dueDate,
        '',
      ]);
    }

    await this.updatePendingCount();
  }

  async updateReflection(uuid: string, reflectionContent: string) {
    await this.ensureDbReady();
    const now = Date.now();

    if (this.isWeb) {
      try {
        const res = await CapacitorDataStorageSqlite.get({ key: uuid });
        if (res && res.value) {
          const evt = JSON.parse(res.value);
          evt.reflection = reflectionContent;
          evt.updated_at = now;
          evt.is_reviewed = true;
          await CapacitorDataStorageSqlite.set({
            key: uuid,
            value: JSON.stringify(evt),
          });
        }
      } catch (err) {
        console.error('❌ Web Update Error', err);
      }
    } else {
      // NATIVE
      const query = `
        UPDATE events 
        SET reflection = ?, is_reviewed = 1, updated_at = ? 
        WHERE uuid = ?
      `;
      await this.db.run(query, [reflectionContent, now, uuid]);
    }
  }

  async deleteEvent(uuid: string) {
    await this.ensureDbReady();
    if (this.isWeb) {
      await CapacitorDataStorageSqlite.remove({ key: uuid });
    } else {
      await this.db.run('DELETE FROM events WHERE uuid = ?', [uuid]);
    }

    await this.updatePendingCount();
  }

  async deleteAll() {
    await this.ensureDbReady();
    if (this.isWeb) {
      await CapacitorDataStorageSqlite.clear();
    } else {
      await this.db.run('DELETE FROM events');
    }

    this.pendingCount.next(0);
  }

  // --- QUERY METHODS ---

  async getEventsPaging(
    page: number,
    pageSize: number
  ): Promise<SelfOpsEvent[]> {
    await this.ensureDbReady();

    if (this.isWeb) {
      try {
        const res = await CapacitorDataStorageSqlite.values();
        const allEvents = (res.values || [])
          .map((v: string) => {
            try {
              return JSON.parse(v);
            } catch {
              return null;
            }
          })
          .filter((e: any) => e !== null)
          // FIX: Lọc bỏ Daily Logs (nếu có date_str hoặc không có type)
          .filter((e: any) => !e.date_str && e.type)
          .sort((a: any, b: any) => b.created_at - a.created_at);

        const start = page * pageSize;
        return allEvents.slice(start, start + pageSize);
      } catch (e) {
        return [];
      }
    } else {
      const offset = page * pageSize;
      const query =
        'SELECT * FROM events ORDER BY created_at DESC LIMIT ? OFFSET ?';
      try {
        const res = await this.db.query(query, [pageSize, offset]);
        return (res.values || []).map((item) => ({
          ...item,
          is_reviewed: !!item.is_reviewed,
        })) as SelfOpsEvent[];
      } catch (e) {
        return [];
      }
    }
  }

  async getAllEvents(): Promise<SelfOpsEvent[]> {
    await this.ensureDbReady();

    if (this.isWeb) {
      const res = await CapacitorDataStorageSqlite.values();
      return (
        (res.values || [])
          .map((v: string) => {
            try {
              return JSON.parse(v);
            } catch {
              return null;
            }
          })
          .filter((e: any) => e !== null)
          // FIX: Lọc bỏ Daily Logs
          .filter((e: any) => !e.date_str && e.type)
          .sort((a: any, b: any) => b.created_at - a.created_at)
      );
    } else {
      const res = await this.db.query(
        'SELECT * FROM events ORDER BY created_at DESC'
      );
      return (res.values || []) as SelfOpsEvent[];
    }
  }

  async countTotalEvents(): Promise<number> {
    await this.ensureDbReady();
    if (this.isWeb) {
      const res = await CapacitorDataStorageSqlite.keys();
      return res.keys ? res.keys.length : 0;
    } else {
      const res = await this.db.query('SELECT COUNT(*) as count FROM events');
      return res.values?.[0]?.count || 0;
    }
  }

  async updateReview(uuid: string, reflection: string, outcome: string) {
    await this.ensureDbReady();
    const now = Date.now();

    if (this.isWeb) {
      // WEB
      const res = await CapacitorDataStorageSqlite.get({ key: uuid });
      if (res && res.value) {
        const evt = JSON.parse(res.value);
        evt.reflection = reflection;
        evt.actual_outcome = outcome;
        evt.updated_at = now;
        evt.is_reviewed = true;
        await CapacitorDataStorageSqlite.set({
          key: uuid,
          value: JSON.stringify(evt),
        });
      }
    } else {
      // NATIVE
      const query =
        'UPDATE event SET reflection = ?, actual_outcome = ?, is_reviewed = 1, updated_at = ? WHERE uuid = ?';
      await this.db.run(query, [reflection, outcome, now, uuid]);
    }

    await this.updatePendingCount();
  }

  async getPendingReviews(): Promise<SelfOpsEvent[]> {
    await this.ensureDbReady();
    const now = Date.now();

    if (this.isWeb) {
      // WEB: Lấy hết -> Filter bằng JS
      try {
        const res = await CapacitorDataStorageSqlite.values();
        const allEvents = (res.values || [])
          .map((v: string) => {
            try {
              return JSON.parse(v);
            } catch {
              return null;
            }
          })
          .filter((e: any) => e !== null)
          // 👇 FIX 4: Lọc bỏ Daily Logs
          .filter((e: any) => !e.date_str && e.type);

        return allEvents
          .filter((e: SelfOpsEvent) => {
            const isDue = e.review_due_date <= now;
            return !e.is_reviewed && isDue;
          })
          .sort((a: any, b: any) => a.review_due_date - b.review_due_date);
      } catch (e) {
        console.error('Web Pending Error', e);
        return [];
      }
    } else {
      // NATIVE: SQL Query tối ưu
      const query =
        'SELECT * FROM events WHERE is_reviewed = 0 AND review_due_date <= ? ORDER BY review_due_date ASC';
      try {
        const res = await this.db.query(query, [now]);
        return (res.values || []).map((item) => ({
          ...item,
          is_reviewed: !!item.is_reviewed,
        })) as SelfOpsEvent[];
      } catch (e) {
        console.error('Native Pending Error', e);
        return [];
      }
    }
  }

  // --- DAILY LOGS METHODS ---
  async getTodayLog() {
    await this.ensureDbReady();
    const key = AppUtils.getTodayKey();

    if (this.isWeb) {
      try {
        const res = await CapacitorDataStorageSqlite.get({
          key: `daily_${key}`,
        });
        return res.value ? JSON.parse(res.value) : null;
      } catch {
        return null;
      }
    } else {
      const query = `SELECT * FROM daily_logs WHERE date_str = ?`;
      const res = await this.db.query(query, [key]);
      return res.values?.[0] || null;
    }
  }

  async saveDailyLog(score: number, reason: string) {
    await this.ensureDbReady();
    const key = AppUtils.getTodayKey();
    const now = AppUtils.getNow();
    const uuid = AppUtils.generateUUID();

    if (this.isWeb) {
      // WEB: Lưu vào kho chung nhưng ID là daily_YYYY-MM-DD
      const log = {
        id: uuid,
        uuid: uuid,
        date_str: key,
        score,
        reason,
        created_at: now,
      };
      await CapacitorDataStorageSqlite.set({
        key: `daily_${key}`,
        value: JSON.stringify(log),
      });
    } else {
      // NATIVE: Lưu vào bảng riêng
      const checkQuery = `SELECT id FROM daily_logs WHERE date_str = ?`;
      const existing = await this.db!.query(checkQuery, [key]);
      let finalId = uuid;
      if (existing.values && existing.values.length > 0) {
        finalId = existing.values[0].id;
      }
      const query = `INSERT OR REPLACE INTO daily_logs (id, date_str, score, reason, created_at) VALUES (?, ?, ?, ?, ?)`;
      await this.db!.run(query, [finalId, key, score, reason, now]);
    }
  }
}
