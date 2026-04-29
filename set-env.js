const fs = require("fs");

// Ensure the directory exists
fs.mkdirSync("./src/environments", { recursive: true });

const sanitize = (value) => String(value ?? "").trim();
const getEnvValue = (upperSnake, camelCase) =>
  sanitize(process.env[upperSnake] || process.env[camelCase] || "");

const firebaseEnv = {
  apiKey: getEnvValue("FIREBASE_API_KEY", "apiKey"),
  authDomain: getEnvValue("FIREBASE_AUTH_DOMAIN", "authDomain"),
  projectId: getEnvValue("FIREBASE_PROJECT_ID", "projectId"),
  storageBucket: getEnvValue("FIREBASE_STORAGE_BUCKET", "storageBucket"),
  messagingSenderId: getEnvValue("FIREBASE_MESSAGING_SENDER_ID", "messagingSenderId"),
  appId: getEnvValue("FIREBASE_APP_ID", "appId"),
  measurementId: getEnvValue("FIREBASE_MEASUREMENT_ID", "measurementId"),
};

const hasAllVars = Object.values(firebaseEnv).every((value) => !!value);
const targetPath = "./src/environments/environment.ts";
const examplePath = "./src/environments/enviroment.example.ts";

let envConfigFile = "";
if (hasAllVars) {
  const maskedApiKey =
    firebaseEnv.apiKey.length > 10
      ? `${firebaseEnv.apiKey.slice(0, 4)}...${firebaseEnv.apiKey.slice(-4)}`
      : firebaseEnv.apiKey;
  console.log(
    `set-env: Using injected Firebase config (apiKey=${maskedApiKey}, projectId=${firebaseEnv.projectId})`,
  );

  envConfigFile = `
export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: '${firebaseEnv.apiKey}',
    authDomain: '${firebaseEnv.authDomain}',
    projectId: '${firebaseEnv.projectId}',
    storageBucket: '${firebaseEnv.storageBucket}',
    messagingSenderId: '${firebaseEnv.messagingSenderId}',
    appId: '${firebaseEnv.appId}',
    measurementId: '${firebaseEnv.measurementId}',
  }
};
`;
} else if (fs.existsSync(examplePath)) {
  envConfigFile = fs.readFileSync(examplePath, "utf8");
  console.log("set-env: FIREBASE_* vars missing. Generated environment.ts from enviroment.example.ts");
} else {
  envConfigFile = `
export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
    measurementId: "",
  }
};
`;
  console.log("set-env: FIREBASE_* vars missing. Generated empty fallback environment.ts");
}

fs.writeFileSync(targetPath, envConfigFile);
console.log("Environment variables injected successfully!");
