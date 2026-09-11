#!/usr/bin/env node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { startServer } from './dev-server.mjs';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const output = join(root, 'assets', 'writemark-demo.gif');
const port = 4185;

function run(command, args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', code => {
      if (code === 0) resolveRun();
      else reject(new Error(`${command} exited with status ${code}.`));
    });
  });
}

async function main() {
  const temporary = await mkdtemp(join(tmpdir(), 'writemark-demo-gif-'));
  const videoPath = join(temporary, 'capture.webm');
  const server = startServer([`--port=${port}`], {});
  if (!server) throw new Error('The demo server did not start.');
  await new Promise(resolveListening => server.once('listening', resolveListening));

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      recordVideo: { dir: temporary, size: { height: 540, width: 900 } },
      viewport: { height: 540, width: 900 }
    });
    const page = await context.newPage();
    const video = page.video();

    await page.goto(`http://127.0.0.1:${port}/demo/gif.html`);
    await page.waitForFunction(() => window.gifDemoReady === true);
    await page.evaluate(() => window.gifDemo.reset());
    await page.waitForTimeout(700);

    await page.evaluate(() => window.gifDemo.setStory('Markdown becomes structure as you type'));
    await page.evaluate(() => window.gifDemo.typeDocument(3600));
    await page.waitForTimeout(900);

    await page.evaluate(() => window.gifDemo.setStory('Rich editing, plain Markdown'));
    await page.waitForTimeout(1200);

    await page.evaluate(() => {
      window.gifDemo.prepareLine('Ready for ');
      window.gifDemo.setStory('Autocomplete from your catalog');
    });
    await page.keyboard.type('#re', { delay: 140 });
    await page.waitForTimeout(1500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    await page.evaluate(() => {
      window.gifDemo.prepareLine('QA owner: ');
      window.gifDemo.setStory('Catalog additions stay explicit');
    });
    await page.keyboard.type('#launch/qa', { delay: 90 });
    await page.waitForTimeout(1700);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(900);

    await page.evaluate(() => {
      window.gifDemo.setStory('Markdown remains the portable source');
      window.gifDemo.setMode('source');
    });
    await page.waitForTimeout(2300);

    await page.evaluate(() => {
      window.gifDemo.setStory('Markdown and tags stay portable');
      window.gifDemo.setMode('live');
    });
    await page.waitForTimeout(1800);

    await page.close();
    await video.saveAs(videoPath);
    await context.close();

    await run('ffmpeg', [
      '-y',
      '-hide_banner',
      '-loglevel', 'error',
      '-i', videoPath,
      '-filter_complex',
      '[0:v]fps=10,scale=900:540:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
      output
    ]);
    console.log(`Wrote ${output}`);
  } finally {
    await browser?.close();
    await new Promise(resolveClose => server.close(resolveClose));
    await rm(temporary, { force: true, recursive: true });
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
