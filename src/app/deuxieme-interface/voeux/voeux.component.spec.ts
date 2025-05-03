import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VoeuxComponent } from './voeux.component';

describe('VoeuxComponent', () => {
  let component: VoeuxComponent;
  let fixture: ComponentFixture<VoeuxComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VoeuxComponent]
    });
    fixture = TestBed.createComponent(VoeuxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


});
