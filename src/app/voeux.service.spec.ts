import { TestBed } from '@angular/core/testing';

import { VoeuxService } from './voeux.service';

describe('VoeuxService', () => {
  let service: VoeuxService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VoeuxService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
