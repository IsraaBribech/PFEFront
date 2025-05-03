import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnsprofilComponent } from './ensprofil.component';

describe('EnsprofilComponent', () => {
  let component: EnsprofilComponent;
  let fixture: ComponentFixture<EnsprofilComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EnsprofilComponent]
    });
    fixture = TestBed.createComponent(EnsprofilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
