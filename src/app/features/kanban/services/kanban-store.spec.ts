import { TestBed } from '@angular/core/testing';

import { KanbanStore } from './kanban-store';

describe('Kanban', () => {
  let service: KanbanStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KanbanStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
