import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgOptimizedImage } from "@angular/common";

@Component({
  selector: "os-navbar",
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: "./navbar.html",
  styleUrl: "./navbar.css",
})
export class Navbar {}
