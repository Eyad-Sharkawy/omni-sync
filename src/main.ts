import { bootstrapApplication } from "@angular/platform-browser";
import { appConfig } from "./app/app.config";

import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";

import { App } from "./app/app";

function scheduleIdle(fn: () => void): void {
  if (typeof globalThis.requestIdleCallback === "function") {
    globalThis.requestIdleCallback(fn, { timeout: 4000 });
    return;
  }
  globalThis.setTimeout(fn, 1);
}

bootstrapApplication(App, appConfig)
  .then(() => {
    scheduleIdle(() => {
      inject();
      injectSpeedInsights();
    });
  })
  .catch((err) => console.error(err));
