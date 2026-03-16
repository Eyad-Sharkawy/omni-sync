import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TasksColumn } from './tasks-column';

describe('TasksColumn', () => {
  let component: TasksColumn;
  let fixture: ComponentFixture<TasksColumn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TasksColumn]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TasksColumn);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
