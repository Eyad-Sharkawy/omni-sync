import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskMetaTag } from './task-meta-tag';

describe('TaskMetaTag', () => {
  let component: TaskMetaTag;
  let fixture: ComponentFixture<TaskMetaTag>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskMetaTag]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskMetaTag);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
