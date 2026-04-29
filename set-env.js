const fs = require("fs");

// Ensure the directory exists
fs.mkdirSync("./src/environments", { recursive: true });

const requiredVars = [
  "FIREBASE_API_KEY",
  "FIREBASE_AUTH_DOMAIN",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_STORAGE_BUCKET",
  "FIREBASE_MESSAGING_SENDER_ID",
  "FIREBASE_APP_ID",
  "FIREBASE_MEASUREMENT_ID",
];

const hasAllVars = requiredVars.every((key) => !!process.env[key]);
if (!hasAllVars) {
  console.log(
    "set-env: Missing one or more FIREBASE_* vars. Skipping generation and keeping existing environment files.",
  );
  process.exit(0);
}

// Create the environment file content using Node's process.env
const targetPath = "./src/environments/environment.ts";
const envConfigFile = `
export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: '${process.env.FIREBASE_API_KEY}',
    authDomain: '${process.env.FIREBASE_AUTH_DOMAIN}',
    projectId: '${process.env.FIREBASE_PROJECT_ID}',
    storageBucket: '${process.env.FIREBASE_STORAGE_BUCKET}',
    messagingSenderId: '${process.env.FIREBASE_MESSAGING_SENDER_ID}',
    appId: '${process.env.FIREBASE_APP_ID}',
    measurementId: '${process.env.FIREBASE_MEASUREMENT_ID}',
  }
};
`;

fs.writeFileSync(targetPath, envConfigFile);
console.log("Environment variables injected successfully!");
