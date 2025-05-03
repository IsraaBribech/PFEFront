import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChefDepartementComponent } from './chef-departement.component';

describe('ChefDepartementComponent', () => {
  let component: ChefDepartementComponent;
  let fixture: ComponentFixture<ChefDepartementComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ChefDepartementComponent]
    });
    fixture = TestBed.createComponent(ChefDepartementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
