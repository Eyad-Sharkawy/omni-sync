import { ComponentFixture, TestBed } from "@angular/core/testing";

import { CreateBoardForm } from "./create-board-form";

describe("CreateBoardForm", () => {
  let component: CreateBoardForm;
  let fixture: ComponentFixture<CreateBoardForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateBoardForm],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateBoardForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
