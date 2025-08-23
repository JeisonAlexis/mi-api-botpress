// scrape_puppeteer.js
// Uso: node scrape_puppeteer.js <URL> [<CSS-selector-opcional>]

const fs = require('fs');
const path = require('path');
let puppeteer;

try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.error('Instala puppeteer: npm install puppeteer');
  process.exit(1);
}

const url = process.argv[2];
const requestedSelector = process.argv[3] || null;

if (!url) {
  console.error('Uso: node scrape_puppeteer.js <URL> [<CSS-selector-opcional>]');
  process.exit(1);
}

(async () => {
  console.log('URL:', url);
  if (requestedSelector) console.log('Selector solicitado:', requestedSelector);

  const outDir = process.cwd();
  const xhrResponses = [];

  // Intenta usar el Chromium descargado por puppeteer
  let executablePath;
  try {
    // puppeteer.executablePath() puede ser sync o async según versión
    const maybe = puppeteer.executablePath?.();
    executablePath = typeof maybe === 'string' ? maybe : (await maybe);
  } catch (_) {
    executablePath = undefined;
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath, // deja que puppeteer resuelva su propio Chromium
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ],
    ignoreHTTPSErrors: true
  });

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36'
  );
  await page.setViewport({ width: 1280, height: 900 });

  let inflight = 0;
  let lastActivity = Date.now();
  const inflightUrls = new Set();

  page.on('request', req => {
    inflight++;
    inflightUrls.add(req.url());
    lastActivity = Date.now();
  });
  page.on('requestfinished', () => {
    inflight = Math.max(0, inflight - 1);
    lastActivity = Date.now();
  });
  page.on('requestfailed', req => {
    inflight = Math.max(0, inflight - 1);
    inflightUrls.delete(req.url());
    lastActivity = Date.now();
  });

  page.on('response', async resp => {
    try {
      const req = resp.request();
      const type = req.resourceType ? req.resourceType() : '';
      const ctype = resp.headers()['content-type'] || '';
      if (type === 'xhr' || type === 'fetch' || ctype.includes('application/json')) {
        const urlr = resp.url();
        const status = resp.status();
        const headers = resp.headers();
        let body = null;
        try {
          const text = await resp.text();
          try { body = JSON.parse(text); } catch { body = text; }
        } catch { body = null; }
        xhrResponses.push({ url: urlr, status, headers, body });
      }
    } catch {}
  });

  function waitForNetworkIdle({ idleMs = 1200, timeoutMs = 45000 } = {}) {
    const start = Date.now();
    return new Promise(resolve => {
      (function check() {
        const now = Date.now();
        if (inflight === 0 && (now - lastActivity) >= idleMs) return resolve();
        if ((now - start) > timeoutMs) return resolve();
        setTimeout(check, 200);
      })();
    });
  }

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForNetworkIdle();
    await page.waitForTimeout(800);

    const xhrPath = path.join(outDir, 'xhr_responses.json');
    fs.writeFileSync(xhrPath, JSON.stringify(xhrResponses, null, 2), 'utf8');
    console.log('Guardadas respuestas XHR en:', xhrPath);


    // Pequeño resumen
    fs.writeFileSync(
      path.join(outDir, 'scrape_summary.json'),
      JSON.stringify({
        url,
        timestamp: new Date().toISOString(),
        xhrCount: xhrResponses.length,
        outputs: { xhrPath: 'xhr_responses.json', htmlPath: 'page_full.html', screenshot: 'screenshot.png' }
      }, null, 2),
      'utf8'
    );

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('ERROR durante scraping:', err.message);
    try { await page.screenshot({ path: path.join(outDir, 'error_screenshot.png'), fullPage: true }); } catch {}
    await browser.close();
    process.exit(2);
  }
})();

