import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DailyCheckInComponent } from './daily-checkin.component';

describe('DailyCheckinComponent', () => {
  let component: DailyCheckInComponent;
  let fixture: ComponentFixture<DailyCheckInComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [DailyCheckInComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DailyCheckInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
