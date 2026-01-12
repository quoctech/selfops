import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReflectPage } from './reflect.page';

describe('ReflectPage', () => {
  let component: ReflectPage;
  let fixture: ComponentFixture<ReflectPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReflectPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
