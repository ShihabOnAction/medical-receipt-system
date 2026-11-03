import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import { renderReceiptHtml } from '../templates/receipt.template.js';
import { getSettingsRow } from './settings.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, '../../assets/logo.png');

let browserPromise = null;
let logoCache;

/** One shared Chromium instance - launching per request is far too slow. */
async function getBrowser() {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      if (!b || !b.isConnected()) {
        browserPromise = null;
      }
    } catch {
      browserPromise = null;
    }
  }

  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: 'new',
        executablePath: env.puppeteerExecutablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--no-first-run',
          '--no-zygote',
          '--disable-extensions',
          '--hide-scrollbars',
          '--mute-audio',
          '--font-render-hinting=none',
        ],
      })
      .catch((error) => {
        browserPromise = null;
        throw error;
      });

    const browser = await browserPromise;
    browser.on('disconnected', () => {
      browserPromise = null;
    });
  }
  return browserPromise;
}

/**
 * The renderer runs with no network access to the app, so the logo has to
 * travel inside the HTML as a data URI.
 */
async function getLogoDataUri(settings) {
  if (settings?.logo_url && /^(https?:|data:)/.test(settings.logo_url)) return settings.logo_url;
  if (logoCache !== undefined) return logoCache;
  try {
    const buffer = await fs.readFile(LOGO_PATH);
    logoCache = `data:image/png;base64,${buffer.toString('base64')}`;
  } catch {
    logoCache = '';
  }
  return logoCache;
}

let pdfRenderQueue = Promise.resolve();

/**
 * Renders the receipt as a real vector A4 PDF (text stays selectable and
 * prints crisply - never a screenshot). Serialized to prevent concurrent Chromium
 * page spikes and avoid OOM on limited memory hosting.
 * @returns {Promise<Buffer>}
 */
export function generateReceiptPdf(receipt, { settings } = {}) {
  const task = async () => {
    const config = settings || (await getSettingsRow());
    const logoSrc = await getLogoDataUri(config);
    const html = renderReceiptHtml(receipt, config, { logoSrc });

    let page;
    try {
      const browser = await getBrowser();
      page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load', timeout: 20_000 });
      await page.emulateMediaType('print');
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
      });
      return Buffer.from(pdf);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[pdf] generation failed:', error?.message);
      throw ApiError.internal('The receipt PDF could not be generated. Please try again.');
    } finally {
      if (page) await page.close().catch(() => {});
    }
  };

  const next = pdfRenderQueue.then(task, task);
  pdfRenderQueue = next.catch(() => {});
  return next;
}

/** Returns the raw HTML - used by the in-app print preview. */
export async function renderReceiptPreview(receipt, { settings } = {}) {
  const config = settings || (await getSettingsRow());
  const logoSrc = await getLogoDataUri(config);
  return renderReceiptHtml(receipt, config, { logoSrc });
}

export async function warmUpPdfEngine() {
  try {
    await getBrowser();
    // eslint-disable-next-line no-console
    console.log('[pdf] Chromium ready');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[pdf] Chromium could not be started yet:', error?.message);
  }
}

export async function shutdownPdfEngine() {
  if (!browserPromise) return;
  try {
    const browser = await browserPromise;
    await browser.close();
  } catch {
    /* already gone */
  }
  browserPromise = null;
}

export default generateReceiptPdf;
