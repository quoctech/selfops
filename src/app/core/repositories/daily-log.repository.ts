import { Injectable, inject } from '@angular/core';
import { CapgoCapacitorDataStorageSqlite as WebStorage } from '@capgo/capacitor-data-storage-sqlite';
import { SqliteConnectionService } from '../services/database/sqlite-connection.service';

@Injectable({ providedIn: 'root' })
export class DailyLogRepository {
  private sql = inject(SqliteConnectionService);

  async getByDate(dateKey: string) {
    if (this.sql.isWeb) {
      try {
        const res = await WebStorage.get({ key: `daily_${dateKey}` });
        return res.value ? JSON.parse(res.value) : null;
      } catch {
        return null;
      }
    } else {
      const res = await this.sql.query(
        'SELECT * FROM daily_logs WHERE date_str = ?',
        [dateKey]
      );
      return res.values?.[0] || null;
    }
  }

  async save(log: any) {
    if (this.sql.isWeb) {
      await WebStorage.set({
        key: `daily_${log.date_str}`,
        value: JSON.stringify(log),
      });
    } else {
      // Check exist logic for Native (or use INSERT OR REPLACE)
      const check = await this.sql.query(
        'SELECT id FROM daily_logs WHERE date_str = ?',
        [log.date_str]
      );
      let finalId = log.id;
      if (check.values && check.values.length > 0) {
        finalId = check.values[0].id;
      }

      await this.sql.run(
        `INSERT OR REPLACE INTO daily_logs (id, date_str, score, reason, created_at) VALUES (?, ?, ?, ?, ?)`,
        [finalId, log.date_str, log.score, log.reason, log.created_at]
      );
    }
  }

  async deleteAll() {
    if (!this.sql.isWeb) {
      await this.sql.run('DELETE FROM daily_logs');
    }
  }
}
