import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChapitreComponent } from './chapitre.component';

describe('ChapitreComponent', () => {
  let component: ChapitreComponent;
  let fixture: ComponentFixture<ChapitreComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChapitreComponent]
    });
    fixture = TestBed.createComponent(ChapitreComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
