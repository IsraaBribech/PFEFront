import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageEnvoyerComponent } from './message-envoyer.component';

describe('MessageEnvoyerComponent', () => {
  let component: MessageEnvoyerComponent;
  let fixture: ComponentFixture<MessageEnvoyerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MessageEnvoyerComponent]
    });
    fixture = TestBed.createComponent(MessageEnvoyerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
