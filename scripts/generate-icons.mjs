import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(join(root, 'public', 'app-icon.svg'), 'utf8');
const browser = await chromium.launch({ channel: 'chrome' });

const outputs = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
];

try {
  for (const { name, size } of outputs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(
      `<style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}svg{display:block;width:100%;height:100%}</style>${source}`,
    );
    await page.locator('svg').screenshot({ path: join(root, 'public', name) });
    await page.close();
  }
} finally {
  await browser.close();
}
