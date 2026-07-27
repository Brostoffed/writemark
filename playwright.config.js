import { defineConfig, devices } from "@playwright/test";
import { release } from "node:os";

const port = 4173;
const baseURL = `http://127.0.0.1:${port}`;
const darwinMajor = process.platform === "darwin"
  ? Number.parseInt(release().split(".")[0], 10)
  : null;
const frozenLocalWebKit = darwinMajor != null
  && darwinMajor <= 23
  && !process.env.CI;

const projects = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] }
  },
  {
    name: "firefox",
    use: { ...devices["Desktop Firefox"] }
  }
];

if (!frozenLocalWebKit) {
  projects.push({
    name: "webkit",
    use: { ...devices["Desktop Safari"] }
  });
  projects.push({
    name: "mobile-safari",
    grepInvert: /@desktop-safari/,
    testMatch: "**/input-contract.spec.js",
    use: {
      ...devices["iPhone 13"],
      browserName: "webkit"
    }
  });
}

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  reporter: [
    ["line"],
    ["html", {
      open: "never",
      outputFolder: "output/playwright/report"
    }]
  ],
  outputDir: "output/playwright/test-results",
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: `node scripts/dev-server.mjs --port=${port}`,
    url: `${baseURL}/tests/fixtures/editor.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 15_000
  },
  projects
});
