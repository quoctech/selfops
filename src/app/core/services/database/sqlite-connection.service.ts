import { Injectable } from '@angular/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { CapgoCapacitorDataStorageSqlite as WebStorage } from '@capgo/capacitor-data-storage-sqlite';
import { BehaviorSubject } from 'rxjs';

const DB_NAME = 'self_ops_db';

@Injectable({ providedIn: 'root' })
export class SqliteConnectionService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;

  public readonly isWeb: boolean = Capacitor.getPlatform() === 'web';
  public dbReady$ = new BehaviorSubject<boolean>(false);

  constructor() {}

  async init() {
    try {
      if (this.isWeb) {
        await WebStorage.openStore({
          database: DB_NAME,
          encrypted: false,
          mode: 'no-encryption',
        });
        console.log('✅ WEB DB Ready');
      } else {
        await this.sqlite.checkConnectionsConsistency();
        try {
          this.db = await this.sqlite.createConnection(
            DB_NAME,
            false,
            'no-encryption',
            1,
            false
          );
        } catch (err: any) {
          if (err.message && err.message.includes('already exists')) {
            this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
          } else {
            throw err;
          }
        }
        await this.db.open();
        await this.createSchema();
        console.log('✅ NATIVE DB Ready');
      }
      this.dbReady$.next(true);
    } catch (e) {
      console.error('❌ DB Init Error:', e);
    }
  }

  async beginTransaction() {
    if (!this.db) return;
    await this.db.beginTransaction();
  }

  async commitTransaction() {
    if (!this.db) return;
    await this.db.commitTransaction();
  }

  async rollbackTransaction() {
    if (!this.db) return;
    await this.db.rollbackTransaction();
  }

  private async createSchema() {
    // Schema Events
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        context TEXT,
        emotion TEXT,
        tags TEXT,
        meta_data TEXT,
        is_reviewed INTEGER DEFAULT 0,
        review_due_date INTEGER,
        reflection TEXT, 
        actual_outcome TEXT,
        created_at INTEGER,
        updated_at INTEGER
      );
    `);

    // Schema Daily Logs
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS daily_logs (
        id TEXT PRIMARY KEY,
        date_str TEXT UNIQUE NOT NULL,
        score INTEGER,
        reason TEXT,
        created_at INTEGER
      );
    `);
  }

  // --- Wrapper Methods cho Native ---
  async run(statement: string, values?: any[]) {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.run(statement, values);
  }

  async query(statement: string, values?: any[]) {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.query(statement, values);
  }

  async execute(statement: string) {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.execute(statement);
  }
}
