import { TestBed } from "@angular/core/testing";
import { provideHttpClientTesting } from "@angular/common/http/testing";

import { Gemini } from "./gemini";

describe("Gemini", () => {
  let service: Gemini;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    service = TestBed.inject(Gemini);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });
});
