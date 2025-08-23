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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    ignoreHTTPSErrors: true
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115 Safari/537.36');
  await page.setViewport({ width: 1280, height: 900 });


  let inflight = 0;
  let lastActivity = Date.now();
  const inflightUrls = new Set();

  page.on('request', req => {
    const rt = req.resourceType ? req.resourceType() : '';

    inflight++;
    inflightUrls.add(req.url());
    lastActivity = Date.now();
  });

  page.on('requestfinished', async req => {
    inflight = Math.max(0, inflight - 1);
    inflightUrls.delete(req.url());
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
      const rtype = req.resourceType ? req.resourceType() : '';
      if (rtype === 'xhr' || rtype === 'fetch' || resp.headers()['content-type']?.includes('application/json')) {
        const urlr = resp.url();
        const status = resp.status();
        const headers = resp.headers();
        let body = null;
        try {
          const text = await resp.text();

          try {
            body = JSON.parse(text);
          } catch (e) {
            body = text;
          }
        } catch (e) {
          body = null;
        }
        xhrResponses.push({ url: urlr, status, headers, body });
      }
    } catch (e) {

    }
  });


  async function waitForNetworkIdle({ idleMs = 1000, timeoutMs = 30000 } = {}) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      (function check() {
        const now = Date.now();
        if (inflight === 0 && (now - lastActivity) >= idleMs) {
          return resolve();
        }
        if ((now - start) > timeoutMs) {
          return resolve(); 
        }
        setTimeout(check, 200);
      })();
    });
  }

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await waitForNetworkIdle({ idleMs: 1200, timeoutMs: 45000 });


    if (typeof page.waitForTimeout === 'function') {
      await page.waitForTimeout(500);
    } else if (typeof page.waitFor === 'function') {
      await page.waitFor(500);
    } else {
      await new Promise(r => setTimeout(r, 500));
    }


    const xhrPath = path.join(outDir, 'xhr_responses.json');
    fs.writeFileSync(xhrPath, JSON.stringify(xhrResponses, null, 2), 'utf8');
    console.log('Guardadas respuestas XHR en:', xhrPath);


    const hasSenaRoot = await page.$('sena-root') !== null;
    let senaRootHTML = null;
    if (hasSenaRoot) {
      try {
        senaRootHTML = await page.$eval('sena-root', el => el.innerHTML);
        console.log('sena-root innerHTML length:', senaRootHTML ? senaRootHTML.length : 0);
      } catch (e) {
        senaRootHTML = null;
      }
    }


    let requestedData = null;
    if (requestedSelector) {
      try {
        const exists = await page.$(requestedSelector);
        if (exists) {
          requestedData = await page.$$eval(requestedSelector, nodes => nodes.map(n => ({
            text: n.innerText ? n.innerText.trim() : null,
            html: n.innerHTML || null,
            href: (n.querySelector && n.querySelector('a') ? n.querySelector('a').href : null)
          })));
        } else {
          console.log('Selector solicitado no encontrado:', requestedSelector);
        }
      } catch (e) {
        console.log('Error extrayendo selector solicitado:', e.message);
      }
    }


    const candidateSelectors = ['.course-card', '.card', '.curso', '.item', 'article', 'li', '.card-body', '.card-title', '.list-group-item'];
    let foundCandidates = {};
    for (const s of candidateSelectors) {
      try {
        const exists = await page.$(s);
        if (exists) {
          const arr = await page.$$eval(s, nodes => nodes.map(n => ({
            text: n.innerText ? n.innerText.trim() : null,
            html: n.innerHTML || null,
            href: (n.querySelector && n.querySelector('a') ? n.querySelector('a').href : null)
          })));
          foundCandidates[s] = { count: arr.length, sample: arr.slice(0,5) };
        }
      } catch (e) {

      }
    }


    const pageHtml = await page.content();
    const htmlPath = path.join(outDir, 'page_full.html');
    fs.writeFileSync(htmlPath, pageHtml, 'utf8');
    const shotPath = path.join(outDir, 'screenshot.png');
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log('Guardado HTML completo y screenshot para inspección:', htmlPath, shotPath);


    const summary = {
      url,
      timestamp: new Date().toISOString(),
      inflightSnapshot: Array.from(inflightUrls).slice(0, 40),
      senaRootExists: hasSenaRoot,
      senaRootInnerHTMLLength: senaRootHTML ? senaRootHTML.length : 0,
      requestedSelector,
      requestedDataSummary: requestedData ? { items: requestedData.length } : null,
      foundCandidatesKeys: Object.keys(foundCandidates),
      foundCandidates,
      xhrCount: xhrResponses.length,
      outputs: { xhrPath: 'xhr_responses.json', htmlPath: 'page_full.html', screenshot: 'screenshot.png' }
    };
    fs.writeFileSync(path.join(outDir, 'scrape_summary.json'), JSON.stringify(summary, null, 2), 'utf8');

    console.log('Resumen guardado en scrape_summary.json');
    console.log('Resumen breve:', { xhrCount: xhrResponses.length, senaRootInnerHTMLLength: senaRootHTML ? senaRootHTML.length : 0, candidateKeys: Object.keys(foundCandidates) });

    await browser.close();
    process.exit(0);

  } catch (err) {
    console.error('ERROR durante scraping:', err.message);
    try { await page.screenshot({ path: path.join(outDir, 'error_screenshot.png'), fullPage: true }); } catch (e) {}
    await browser.close();
    process.exit(2);
  }
})();
