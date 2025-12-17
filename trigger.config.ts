import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_ccvseuaftpjxzkfypmix",
  runtime: "node",
  logLevel: "log",
  maxDuration: 300, // 5 minutes max for document processing
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  dirs: ["./trigger"],
});
