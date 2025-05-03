import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourComponent } from './cour.component';

describe('CourComponent', () => {
  let component: CourComponent;
  let fixture: ComponentFixture<CourComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CourComponent]
    });
    fixture = TestBed.createComponent(CourComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
