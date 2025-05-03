import { TestBed } from '@angular/core/testing';

import { SoumissionsService } from './soumissions.service';

describe('SoumissionsService', () => {
  let service: SoumissionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SoumissionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
