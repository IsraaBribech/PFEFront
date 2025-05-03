import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeuxiemeInterfaceComponent } from './deuxieme-interface.component';

describe('DeuxiemeInterfaceComponent', () => {
  let component: DeuxiemeInterfaceComponent;
  let fixture: ComponentFixture<DeuxiemeInterfaceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DeuxiemeInterfaceComponent]
    });
    fixture = TestBed.createComponent(DeuxiemeInterfaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
