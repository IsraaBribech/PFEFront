import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CourSuivieComponent } from './cour-suivie.component';

describe('CourSuivieComponent', () => {
  let component: CourSuivieComponent;
  let fixture: ComponentFixture<CourSuivieComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CourSuivieComponent]
    });
    fixture = TestBed.createComponent(CourSuivieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
