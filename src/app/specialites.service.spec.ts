import { TestBed } from '@angular/core/testing';

import { SpecialitesService } from './specialites.service';

describe('SpecialitesService', () => {
  let service: SpecialitesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpecialitesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
