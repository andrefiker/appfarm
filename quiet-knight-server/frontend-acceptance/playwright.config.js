import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'.',testMatch:'*.spec.js',timeout:120000,expect:{timeout:20000},fullyParallel:false,workers:1,retries:0,reporter:'list',use:{browserName:'chromium',viewport:{width:390,height:844},serviceWorkers:'allow',trace:'off',video:'off',screenshot:'off'}});
