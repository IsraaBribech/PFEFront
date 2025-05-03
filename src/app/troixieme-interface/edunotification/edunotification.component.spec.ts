import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EdunotificationComponent } from './edunotification.component';

describe('EdunotificationComponent', () => {
  let component: EdunotificationComponent;
  let fixture: ComponentFixture<EdunotificationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EdunotificationComponent]
    });
    fixture = TestBed.createComponent(EdunotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
