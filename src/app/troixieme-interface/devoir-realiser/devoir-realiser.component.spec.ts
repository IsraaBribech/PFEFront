import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevoirRealiserComponent } from './devoir-realiser.component';

describe('DevoirRealiserComponent', () => {
  let component: DevoirRealiserComponent;
  let fixture: ComponentFixture<DevoirRealiserComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DevoirRealiserComponent]
    });
    fixture = TestBed.createComponent(DevoirRealiserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
