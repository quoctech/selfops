export enum SelfOpsEventType {
  DECISION = 'DECISION',
  MISTAKE = 'MISTAKE',
  STRESS = 'STRESS',
}

export interface SelfOpsEvent {
  uuid: string;
  type: SelfOpsEventType;
  context: string;
  emotion: string;
  reflection?: string | null;
  actual_outcome?: string;
  is_reviewed: boolean;
  review_due_date: number;
  created_at: number;
}

// Cấu hình hiển thị (Config) cho từng loại
export const EVENT_CONFIG = {
  [SelfOpsEventType.DECISION]: {
    label: 'Quyết định',
    icon: 'help-buoy-outline',
    color: 'primary',
  },
  [SelfOpsEventType.MISTAKE]: {
    label: 'Sự cố / Bài học',
    icon: 'alert-circle-outline',
    color: 'danger',
  },
  [SelfOpsEventType.STRESS]: {
    label: 'Căng thẳng',
    icon: 'battery-dead-outline',
    color: 'warning',
  },
};

// 1. Định nghĩa hằng số thời gian (7 ngày tính bằng mili-giây)
export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
