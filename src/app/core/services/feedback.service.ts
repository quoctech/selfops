import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private readonly API_URL =
    'https://script.google.com/macros/s/AKfycbw70Qi6jj3CjJQPWNusuV2nZZRi_qx_QneSubxCklY9pbj8yfwjrUJXepobmw_CB36U/exec';

  constructor() {}

  async sendFeedback(content: string, contact: string, deviceInfo: string) {
    // Dùng mode 'no-cors' để tránh lỗi CORS của Google
    return fetch(this.API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        contact: contact,
        deviceInfo: deviceInfo,
        appVersion: '1.3.1',
      }),
    });
  }
}
