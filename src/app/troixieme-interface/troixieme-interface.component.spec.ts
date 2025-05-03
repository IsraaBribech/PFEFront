import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TroixiemeInterfaceComponent } from './troixieme-interface.component';

describe('TroixiemeInterfaceComponent', () => {
  let component: TroixiemeInterfaceComponent;
  let fixture: ComponentFixture<TroixiemeInterfaceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TroixiemeInterfaceComponent]
    });
    fixture = TestBed.createComponent(TroixiemeInterfaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
