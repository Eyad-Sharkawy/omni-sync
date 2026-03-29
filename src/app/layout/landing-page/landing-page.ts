import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";

@Component({
  selector: "os-landing-page",
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./landing-page.html",
  styleUrl: "./landing-page.css",
})
export class landingPage {}
