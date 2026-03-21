import { ComponentFixture, TestBed } from "@angular/core/testing";

import { TaskTag } from "./task-tag.component";

describe("TaskMetaTag", () => {
  let component: TaskTag;
  let fixture: ComponentFixture<TaskTag>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskTag],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskTag);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
