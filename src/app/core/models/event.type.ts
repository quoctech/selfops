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
