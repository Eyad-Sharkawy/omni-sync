import { ComponentFixture, TestBed } from "@angular/core/testing";

import { landingPage } from "./landing-page";

describe("Shell", () => {
  let component: landingPage;
  let fixture: ComponentFixture<landingPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [landingPage],
    }).compileComponents();

    fixture = TestBed.createComponent(landingPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
