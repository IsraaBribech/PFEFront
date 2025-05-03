import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizRepondComponent } from './quiz-repond.component';

describe('QuizRepondComponent', () => {
  let component: QuizRepondComponent;
  let fixture: ComponentFixture<QuizRepondComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QuizRepondComponent]
    });
    fixture = TestBed.createComponent(QuizRepondComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
