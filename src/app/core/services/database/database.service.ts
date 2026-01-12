import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Platform } from '@ionic/angular/standalone';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SelfOpsEvent } from '../../models/event.type';

import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';

import { CapgoCapacitorDataStorageSqlite as CapacitorDataStorageSqlite } from '@capgo/capacitor-data-storage-sqlite';

const DB_NAME = 'self_ops_db';
const TABLE_NAME = 'events';

@Injectable({
  providedIn: 'root',
})
export class DatabaseService {
  private platform = inject(Platform);

  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;

  private isDbReady = new BehaviorSubject<boolean>(false);
  public dbReady$ = this.isDbReady.asObservable();

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
          table: TABLE_NAME,
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
        const schema = `
          CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid TEXT UNIQUE NOT NULL,
            type TEXT NOT NULL,
            context TEXT,
            tags TEXT,
            meta_data TEXT,
            is_reviewed INTEGER DEFAULT 0,
            review_due_date INTEGER,
            reflection TEXT, 
            actual_outcome TEXT,
            created_at INTEGER,
            updated_at INTEGER
          );
        `;
        await this.db.execute(schema);
        console.log('✅ NATIVE DB Ready');
      }

      this.isDbReady.next(true);
    } catch (e) {
      console.error('❌ Database Init Error:', e);
    }
  }

  // --- CRUD METHODS ---

  async addEvent(event: any) {
    await this.ensureDbReady();

    const uuid = event.uuid || crypto.randomUUID();
    const now = Date.now();
    const dueDate = event.review_due_date || now + 7 * 24 * 60 * 60 * 1000;

    const tagsStr = JSON.stringify(event.tags || []);
    const metaStr =
      typeof event.meta_data === 'string'
        ? event.meta_data
        : JSON.stringify(event.meta_data || {});

    if (this.isWeb) {
      const newEvent = {
        ...event,
        uuid,
        created_at: now,
        review_due_date: dueDate,
        is_reviewed: false,
        tags: event.tags || [],
        meta_data: event.meta_data || {},
        reflection: '',
      };
      await CapacitorDataStorageSqlite.set({
        key: uuid,
        value: JSON.stringify(newEvent),
      });
    } else {
      const query = `
        INSERT INTO ${TABLE_NAME} (uuid, type, context, tags, meta_data, created_at, review_due_date, reflection) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.db.run(query, [
        uuid,
        event.type,
        event.context,
        tagsStr,
        metaStr,
        now,
        dueDate,
        '',
      ]);
    }
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
        UPDATE ${TABLE_NAME} 
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
      await this.db.run(`DELETE FROM ${TABLE_NAME} WHERE uuid = ?`, [uuid]);
    }
  }

  async deleteAll() {
    await this.ensureDbReady();
    if (this.isWeb) {
      await CapacitorDataStorageSqlite.clear();
    } else {
      await this.db.run(`DELETE FROM ${TABLE_NAME}`);
    }
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
          .sort((a: any, b: any) => b.created_at - a.created_at);

        const start = page * pageSize;
        return allEvents.slice(start, start + pageSize);
      } catch (e) {
        return [];
      }
    } else {
      const offset = page * pageSize;
      const query = `SELECT * FROM ${TABLE_NAME} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
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
      return (res.values || [])
        .map((v: string) => {
          try {
            return JSON.parse(v);
          } catch {
            return null;
          }
        })
        .filter((e: any) => e !== null)
        .sort((a: any, b: any) => b.created_at - a.created_at);
    } else {
      const res = await this.db.query(
        `SELECT * FROM ${TABLE_NAME} ORDER BY created_at DESC`
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
      const res = await this.db.query(
        `SELECT COUNT(*) as count FROM ${TABLE_NAME}`
      );
      return res.values?.[0]?.count || 0;
    }
  }
}
