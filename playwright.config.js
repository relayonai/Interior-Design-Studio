import { defineConfig } from '@playwright/test';
const external=process.env.FLAT_STUDIO_TEST_URL;
export default defineConfig({
  testDir:'./e2e',
  use:{
    baseURL:external || 'http://127.0.0.1:5173/',
    launchOptions:{
      executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',
      args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
    },
  },
  webServer:external?undefined:{command:'npm run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:true},
});
