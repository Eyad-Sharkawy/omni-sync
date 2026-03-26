import { ComponentFixture, TestBed } from "@angular/core/testing";

import { AddColumnForm } from "./add-column-form";

describe("AddColumnForm", () => {
  let component: AddColumnForm;
  let fixture: ComponentFixture<AddColumnForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddColumnForm],
    }).compileComponents();

    fixture = TestBed.createComponent(AddColumnForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
