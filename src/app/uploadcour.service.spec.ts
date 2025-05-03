import { TestBed } from '@angular/core/testing';

import { UploadcourService } from './uploadcour.service';

describe('UploadcourService', () => {
  let service: UploadcourService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadcourService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
