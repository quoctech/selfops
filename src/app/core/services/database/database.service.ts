import { Injectable, inject } from '@angular/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { Platform } from '@ionic/angular/standalone';
import { BehaviorSubject } from 'rxjs';
import { SelfOpsEvent } from '../../models/event.type'; // Check lại đường dẫn

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

  async init() {
    if (!this.platform.is('capacitor')) {
      console.warn('⚠️ SQLite chỉ hoạt động trên thiết bị thật/máy ảo!');
      return;
    }

    try {
      await this.sqlite.checkConnectionsConsistency();
      const isExists = await this.sqlite.isConnection(DB_NAME, false);

      if (isExists.result) {
        this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
      } else {
        try {
          this.db = await this.sqlite.createConnection(
            DB_NAME,
            false,
            'no-encryption',
            1,
            false
          );
        } catch (createError: any) {
          if (
            createError.message &&
            createError.message.includes('already exists')
          ) {
            console.log('🔄 Connection existed unexpectedly, retrieving...');
            this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
          } else {
            throw createError;
          }
        }
      }

      const isOpen = await this.db.isDBOpen();
      if (!isOpen.result) {
        await this.db.open();
      }

      const schema = `
        CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT UNIQUE NOT NULL,
          type TEXT NOT NULL,
          context TEXT,
          emotion TEXT,
          reflection TEXT,
          created_at INTEGER
        );
      `;
      await this.db.execute(schema);

      this.isDbReady.next(true);
      console.log('✅ Database initialized successfully');
    } catch (e) {
      console.error('❌ Database init error:', e);
    }
  }

  // --- READ METHODS ---

  // Dùng cho Home Page (Infinite Scroll)
  async getEventsPaging(
    page: number,
    pageSize: number
  ): Promise<SelfOpsEvent[]> {
    if (!this.db) return [];

    const offset = page * pageSize;
    const query = `
      SELECT * FROM ${TABLE_NAME} 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;

    try {
      const result = await this.db.query(query, [pageSize, offset]);
      return (result.values || []) as SelfOpsEvent[];
    } catch (e) {
      console.error('Load paging failed:', e);
      return [];
    }
  }

  // Dùng cho Stats Modal & Export JSON (Load tất cả)
  // Chỉ gọi khi cần thiết, không lưu vào RAM
  async getAllEvents(): Promise<SelfOpsEvent[]> {
    if (!this.db) return [];
    try {
      const query = `SELECT * FROM ${TABLE_NAME} ORDER BY created_at DESC`;
      const result = await this.db.query(query);
      return (result.values || []) as SelfOpsEvent[];
    } catch (e) {
      console.error('Get all events failed:', e);
      return [];
    }
  }

  // Đếm tổng (Dùng để check khi nào stop infinite scroll nếu muốn chính xác tuyệt đối)
  async countTotalEvents(): Promise<number> {
    if (!this.db) return 0;
    try {
      const result = await this.db.query(
        `SELECT COUNT(*) as count FROM ${TABLE_NAME}`
      );
      return result.values?.[0]?.count || 0;
    } catch (e) {
      return 0;
    }
  }

  // --- WRITE METHODS (CRUD) ---
  // Lưu ý: Các hàm này giờ chỉ ghi vào DB, KHÔNG gọi loadEvents() nữa.
  // UI sẽ chịu trách nhiệm reload lại trang hiện tại.

  async addEvent(event: SelfOpsEvent) {
    if (!this.db) return;
    const query = `
      INSERT INTO ${TABLE_NAME} (uuid, type, context, emotion, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `;
    const values = [
      event.uuid,
      event.type,
      event.context,
      event.emotion,
      event.created_at,
    ];
    await this.db.run(query, values);
  }

  async updateReflection(uuid: string, reflection: string) {
    if (!this.db) return;
    const query = `UPDATE ${TABLE_NAME} SET reflection = ? WHERE uuid = ?`;
    await this.db.run(query, [reflection, uuid]);
  }

  async deleteEvent(uuid: string) {
    if (!this.db) return;
    const query = `DELETE FROM ${TABLE_NAME} WHERE uuid = ?`;
    await this.db.run(query, [uuid]);
  }

  async deleteAll() {
    if (!this.db) return;
    const query = `DELETE FROM ${TABLE_NAME}`;
    await this.db.run(query);
  }
}
