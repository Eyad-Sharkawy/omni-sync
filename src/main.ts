import { bootstrapApplication } from "@angular/platform-browser";
import { appConfig } from "./app/app.config";

import { inject } from "@vercel/analytics";
import { injectSpeedInsights } from "@vercel/speed-insights";

import { App } from "./app/app";

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

inject();
injectSpeedInsights();
