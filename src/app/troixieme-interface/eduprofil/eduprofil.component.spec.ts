import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EduprofilComponent } from './eduprofil.component';

describe('EduprofilComponent', () => {
  let component: EduprofilComponent;
  let fixture: ComponentFixture<EduprofilComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EduprofilComponent]
    });
    fixture = TestBed.createComponent(EduprofilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
