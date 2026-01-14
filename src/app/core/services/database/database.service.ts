import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { SelfOpsEvent } from '../../models/event.type';
import { AppUtils } from '../../utils/app.utils';

import { DailyLogRepository } from '../../repositories/daily-log.repository';
import { EventRepository } from '../../repositories/event.repository';
import { SqliteConnectionService } from './sqlite-connection.service';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  // Inject dependencies
  private connection = inject(SqliteConnectionService);
  private eventRepo = inject(EventRepository);
  private dailyRepo = inject(DailyLogRepository);

  // State Management
  public dbReady$ = this.connection.dbReady$;
  public pendingCount$ = new BehaviorSubject<number>(0);
  public dataChanged$ = new Subject<void>();

  constructor() {
    this.dataChanged$
      .pipe(debounceTime(100))
      .subscribe(() => this.updatePendingCount());

    // Listen dbReady để update count
    this.dbReady$
      .pipe(filter((r) => r))
      .subscribe(() => this.updatePendingCount());
  }

  async initialize() {
    await this.connection.init();
  }

  private async ensureDbReady() {
    if (!this.connection.dbReady$.value) {
      await firstValueFrom(
        this.dbReady$.pipe(filter((ready) => ready === true))
      );
    }
  }

  // ================= EVENT =================
  async addEvent(event: SelfOpsEvent) {
    await this.ensureDbReady();
    await this.eventRepo.add(event);
    this.dataChanged$.next();
  }

  async getEventsPaging(page: number, size: number) {
    await this.ensureDbReady();
    return this.eventRepo.getPaging(page, size);
  }

  async getAllEvents() {
    await this.ensureDbReady();
    return this.eventRepo.getAll();
  }

  async updateReflection(uuid: string, reflection: string) {
    await this.ensureDbReady();
    // outcome tạm để trống hoặc handle sau
    await this.eventRepo.updateReview(uuid, reflection, '', AppUtils.getNow());
    this.dataChanged$.next();
  }

  // Hàm này để tương thích code cũ (nếu có chỗ nào gọi full params)
  async updateReview(uuid: string, reflection: string, outcome: string) {
    await this.ensureDbReady();
    await this.eventRepo.updateReview(
      uuid,
      reflection,
      outcome,
      AppUtils.getNow()
    );
    this.dataChanged$.next();
  }

  async deleteEvent(uuid: string) {
    await this.ensureDbReady();
    await this.eventRepo.delete(uuid);
    this.dataChanged$.next();
  }

  async getDashboardStats() {
    await this.ensureDbReady();
    return this.eventRepo.getStats();
  }

  async countTotalEvents() {
    // Có thể thêm hàm count vào Repo sau, giờ dùng tạm getStats hoặc getAll
    const all = await this.getAllEvents();
    return all.length;
  }

  async getPendingReviews() {
    await this.ensureDbReady();
    return this.eventRepo.getPendingReviews(AppUtils.getNow());
  }

  // ================= DAILY LOG =================
  async getTodayLog() {
    await this.ensureDbReady();
    return this.dailyRepo.getByDate(AppUtils.getTodayKey());
  }

  async saveDailyLog(score: number, reason: string) {
    await this.ensureDbReady();
    const log = {
      id: AppUtils.generateUUID(),
      date_str: AppUtils.getTodayKey(),
      score,
      reason,
      created_at: AppUtils.getNow(),
    };
    await this.dailyRepo.save(log);
    this.dataChanged$.next();
  }

  // ================= SYSTEM =================
  async deleteAll() {
    await this.ensureDbReady();
    await this.eventRepo.deleteAll(); // có xóa dữ liệu ở WebStorage rồi
    await this.dailyRepo.deleteAll();
    this.dataChanged$.next();
  }

  private async updatePendingCount() {
    const list = await this.eventRepo.getPendingReviews(AppUtils.getNow());
    this.pendingCount$.next(list.length);
  }

  async seedDummyData(count: number) {
    await this.ensureDbReady();
    await this.eventRepo.seedDummyData(count);
    await this.updatePendingCount();
    this.dataChanged$.next();
  }
}
