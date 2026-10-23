/*
 * UAT end-to-end — Task A1–A12 (halaman "Trails Test Page", theme myrehat-test).
 *
 * Menjalankan skenario UAT dengan Playwright terhadap WordPress yang sedang berjalan,
 * menyimpan screenshot bukti ke docs/uat/screenshots/, hasil mentah ke docs/uat/results.json,
 * dan membuat laporan docs/uat/README.md dari hasil yang benar-benar terjadi.
 *
 * Environment variables:
 *   BASE_URL           URL halaman trails (default http://127.0.0.1:8770/)
 *   WP_USER, WP_PASS   akun WordPress untuk skenario logged-in (opsional; dilewati jika kosong)
 *   WP_PATH            path instalasi WordPress lokal untuk membaca transient booking (opsional)
 *   CHROME_PATH        executable Chrome/Chromium (opsional; default browser bawaan Playwright)
 *   PLAYWRIGHT_MODULE  path modul playwright (default 'playwright')
 *
 * Contoh: BASE_URL=http://127.0.0.1:8770/ WP_USER=admin WP_PASS=... node docs/uat/uat-e2e.js
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:8770/';
const ORIGIN = new URL(BASE_URL).origin;
const OUT_DIR = __dirname;
const SHOT_DIR = path.join(OUT_DIR, 'screenshots');
const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true };

const results = [];
let browser;

// ---------------------------------------------------------------- helpers

async function newPage(viewport, options = {}) {
  const { isMobile, hasTouch, ...size } = viewport;
  const context = await browser.newContext({ viewport: size, isMobile: !!isMobile, hasTouch: !!hasTouch, javaScriptEnabled: options.js !== false });
  if (options.login) {
    const login = await context.newPage();
    await login.goto(ORIGIN + '/wp-login.php');
    await login.fill('#user_login', process.env.WP_USER);
    await login.fill('#user_pass', process.env.WP_PASS);
    await Promise.all([login.waitForNavigation(), login.click('#wp-submit')]);
    await login.close();
  }
  const page = await context.newPage();
  page.consoleErrors = [];
  page.on('pageerror', e => page.consoleErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') page.consoleErrors.push(m.text()); });
  await page.goto(BASE_URL);
  return page;
}

// Outline the element(s) under test so the screenshot shows what was checked.
async function mark(page, selectors) {
  await page.evaluate(sels => {
    document.querySelectorAll('[data-uat-mark]').forEach(e => { e.style.outline = ''; e.removeAttribute('data-uat-mark'); });
    sels.forEach(s => document.querySelectorAll(s).forEach(e => { e.setAttribute('data-uat-mark', ''); e.style.outline = '3px solid #e11d48'; e.style.outlineOffset = '2px'; }));
  }, [].concat(selectors));
}
const unmark = page => mark(page, []);

async function shot(page, name, opts = {}) {
  const file = path.join(SHOT_DIR, name + '.png');
  if (opts.selector) await page.locator(opts.selector).first().screenshot({ path: file });
  else await page.screenshot({ path: file, fullPage: !!opts.fullPage });
  return 'screenshots/' + name + '.png';
}

async function typeSearch(page, selector, text) {
  await page.fill(selector, '');
  await page.dispatchEvent(selector, 'input');
  if (text) await page.type(selector, text);
}

const visibleCards = page => page.$$eval('.trail-card', cs => cs.filter(c => getComputedStyle(c).display !== 'none').map(c => c.querySelector('h3').textContent));
const noResultsShown = page => page.$eval('#trails-no-results', e => !e.hidden);
const confirmation = page => page.$eval('#trails-confirmation', e => ({ hidden: e.hidden, cls: e.className, text: e.innerText.trim().replace(/\s*\n\s*/g, ' · ') }));
const waitForResult = page => page.waitForFunction(() => !document.getElementById('trails-confirmation').hidden && !document.querySelector('#booking-form [type=submit]').disabled);

async function fillBooking(page, o = {}) {
  await page.fill('input[name=booking_name]', o.name || 'UAT Tester');
  await page.fill('input[name=date]', o.date || '2026-12-01');
  await page.check(`input[name=digital_nomad][value=${o.digitalNomad || 'Ya'}]`);
  await page.check(`input[name=plan][value=${o.plan || 'monthly'}]`);
  if (o.terms !== false) await page.check('input[name=host_terms]');
}

// Sends a booking straight to the server with the page's real nonce (simulates a client that skips browser validation).
function postBooking(page, fields) {
  return page.evaluate(async f => {
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, v));
    const res = await fetch(location.href, { method: 'POST', body: fd, credentials: 'same-origin' });
    return { status: res.status, json: await res.json().catch(() => null) };
  }, fields);
}

function savedBooking() {
  if (!process.env.WP_PATH) return undefined;
  const code = "$_SERVER['HTTP_HOST']='" + new URL(BASE_URL).host + "'; require getenv('WP_PATH') . '/wp-load.php'; echo PHP_EOL . json_encode(get_transient('trails_last_booking'));";
  const out = execFileSync('php', ['-r', code], { cwd: process.env.WP_PATH, env: process.env }).toString().trim().split('\n').pop();
  return JSON.parse(out);
}

// Runs one UAT case and records the outcome. fn returns { pass, actual, shots }.
async function uat(task, id, title, steps, expected, fn) {
  let r;
  try { r = await fn(); } catch (e) { r = { pass: false, actual: 'ERROR: ' + e.message.split('\n')[0], shots: [] }; }
  results.push({ task, id, title, steps, expected, actual: r.actual, status: r.pass ? 'PASS' : 'FAIL', shots: r.shots || [] });
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${id}  ${title}  ->  ${r.actual}`);
}

// ---------------------------------------------------------------- scenarios

async function run() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.readdirSync(SHOT_DIR).filter(f => f.endsWith('.png')).forEach(f => fs.unlinkSync(path.join(SHOT_DIR, f)));
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const canLogin = !!(process.env.WP_USER && process.env.WP_PASS);

  // ---------- A1 Listing search
  let p = await newPage(DESKTOP);
  await uat('A1', 'A1-01', 'Search judul "mount" memfilter listing', ['Buka halaman trails (desktop 1280px)', 'Ketik "mount" di kotak "Search trails..."'], 'Hanya 2 trail yang judulnya mengandung "Mount" yang tampil', async () => {
    await typeSearch(p, '#search-box', 'mount'); const v = await visibleCards(p);
    await mark(p, ['#search-box', '.trail-card:not([style*="none"])']);
    const s = await shot(p, 'A1-01-search-mount', { selector: '.trails-main' }); await unmark(p);
    return { pass: v.length === 2 && v.every(t => /mount/i.test(t)), actual: `${v.length} tampil: ${v.join(', ')}`, shots: [s] };
  });
  await uat('A1', 'A1-02', 'Search tidak case-sensitive', ['Ketik "MOUNT" (huruf besar)'], 'Hasil sama dengan "mount" (2 trail)', async () => {
    await typeSearch(p, '#search-box', 'MOUNT'); const v = await visibleCards(p);
    return { pass: v.length === 2, actual: `${v.length} tampil: ${v.join(', ')}` };
  });
  await uat('A1', 'A1-03', 'Search berdasarkan lokasi', ['Ketik "Sabah"'], 'Mount Kinabalu Base Trek (lokasi Sabah) tampil', async () => {
    await typeSearch(p, '#search-box', 'Sabah'); const v = await visibleCards(p);
    return { pass: v.length === 1 && v[0] === 'Mount Kinabalu Base Trek', actual: `${v.length} tampil: ${v.join(', ')}` };
  });
  await uat('A1', 'A1-04', 'Search tanpa hasil menampilkan pesan kosong', ['Ketik "zzzz"'], 'Tidak ada trail tampil; pesan "No trails found." muncul', async () => {
    await typeSearch(p, '#search-box', 'zzzz'); const v = await visibleCards(p); const empty = await noResultsShown(p);
    await mark(p, ['#search-box', '#trails-no-results']);
    const s = await shot(p, 'A1-04-search-no-results', { selector: '.trails-main' }); await unmark(p);
    return { pass: v.length === 0 && empty, actual: `${v.length} tampil, pesan kosong ${empty ? 'tampil' : 'tidak tampil'}`, shots: [s] };
  });
  await uat('A1', 'A1-05', 'Search dikosongkan menampilkan semua listing', ['Hapus isi kotak search'], 'Semua 6 trail tampil kembali; pesan kosong hilang', async () => {
    await typeSearch(p, '#search-box', ''); const v = await visibleCards(p); const empty = await noResultsShown(p);
    return { pass: v.length === 6 && !empty, actual: `${v.length} tampil, pesan kosong ${empty ? 'tampil' : 'hilang'}` };
  });

  // ---------- A2 Category filter
  await uat('A2', 'A2-01', 'Filter kategori Beach', ['Pilih kategori "Beach"'], 'Hanya trail kategori beach (2) yang tampil', async () => {
    await p.selectOption('#category', 'beach'); const v = await visibleCards(p);
    await mark(p, ['#category', '.trail-card:not([style*="none"])']);
    const s = await shot(p, 'A2-01-category-beach', { selector: '.trails-main' }); await unmark(p);
    return { pass: v.length === 2, actual: `${v.length} tampil: ${v.join(', ')}`, shots: [s] };
  });
  await uat('A2', 'A2-02', 'Kombinasi search + kategori', ['Kategori tetap "Beach"', 'Ketik "sunset"'], 'Hanya trail yang memenuhi kedua kondisi tampil (Langkawi Sunset Ridge)', async () => {
    await typeSearch(p, '#search-box', 'sunset'); const v = await visibleCards(p);
    await mark(p, ['#search-box', '#category', '.trail-card:not([style*="none"])']);
    const s = await shot(p, 'A2-02-search-plus-category', { selector: '.trails-main' }); await unmark(p);
    return { pass: v.length === 1 && v[0] === 'Langkawi Sunset Ridge', actual: `${v.length} tampil: ${v.join(', ')}`, shots: [s] };
  });
  await uat('A2', 'A2-03', 'Kombinasi yang bertentangan', ['Ketik "mount"', 'Kategori "Beach"'], 'Tidak ada hasil; pesan "No trails found." muncul', async () => {
    await typeSearch(p, '#search-box', 'mount'); const v = await visibleCards(p); const empty = await noResultsShown(p);
    return { pass: v.length === 0 && empty, actual: `${v.length} tampil, pesan kosong ${empty ? 'tampil' : 'tidak tampil'}` };
  });
  await uat('A2', 'A2-04', '"All categories" mengikuti search aktif', ['Search tetap "mount"', 'Pilih "All categories"'], 'Hasil sesuai search saja (2 trail Mount)', async () => {
    await p.selectOption('#category', 'all'); const v = await visibleCards(p);
    return { pass: v.length === 2, actual: `${v.length} tampil: ${v.join(', ')}` };
  });
  await uat('A2', 'A2-05', 'Semua kategori dapat dipilih', ['Pilih Mountain, Beach, Forest bergantian dengan search kosong'], 'Masing-masing menampilkan 2 trail sesuai kategorinya', async () => {
    await typeSearch(p, '#search-box', ''); const out = [];
    for (const c of ['mountain', 'beach', 'forest']) { await p.selectOption('#category', c); out.push(`${c}=${(await visibleCards(p)).length}`); }
    await p.selectOption('#category', 'all');
    return { pass: out.join() === 'mountain=2,beach=2,forest=2', actual: out.join(', ') };
  });

  // ---------- A10 Header search (uses the same page state)
  await uat('A10', 'A10-01', 'Header search memfilter listing yang sama', ['Ketik "kinabalu" di kotak search header ("Search homepage...")'], 'Listing terfilter; kotak search listing ikut berisi "kinabalu"', async () => {
    await typeSearch(p, '#main-search', 'kinabalu'); const v = await visibleCards(p); const synced = await p.inputValue('#search-box');
    await mark(p, ['#main-search', '#search-box', '.trail-card:not([style*="none"])']);
    const s1 = await shot(p, 'A10-01-header-search', { selector: '.site-header-trails' });
    const s2 = await shot(p, 'A10-01-header-search-listing', { selector: '.trails-main' }); await unmark(p);
    return { pass: v.length === 1 && synced === 'kinabalu', actual: `${v.length} tampil (${v.join(', ')}); kotak listing = "${synced}"`, shots: [s1, s2] };
  });
  await uat('A10', 'A10-02', 'Kotak search listing sinkron balik ke header', ['Ketik "perak" di kotak search listing'], 'Header berisi "perak"; listing terfilter (1 trail)', async () => {
    await typeSearch(p, '#search-box', 'perak'); const v = await visibleCards(p); const synced = await p.inputValue('#main-search');
    return { pass: v.length === 1 && synced === 'perak', actual: `${v.length} tampil; header = "${synced}"` };
  });
  await uat('A10', 'A10-03', 'Header search + kategori', ['Ketik "mount" di header', 'Pilih kategori "Mountain", lalu "Beach"'], 'Mountain → 2 trail; Beach → 0 dengan pesan kosong', async () => {
    await typeSearch(p, '#main-search', 'mount'); await p.selectOption('#category', 'mountain'); const a = (await visibleCards(p)).length;
    await p.selectOption('#category', 'beach'); const b = (await visibleCards(p)).length; const empty = await noResultsShown(p);
    await p.selectOption('#category', 'all'); await typeSearch(p, '#main-search', '');
    return { pass: a === 2 && b === 0 && empty, actual: `Mountain=${a}, Beach=${b}, pesan kosong ${empty ? 'tampil' : 'tidak'}` };
  });
  await uat('A10', 'A10-04', 'Tidak ada listener ganda', ['Periksa event listener pada #main-search, #search-box, #category (Chrome DevTools Protocol)'], 'Masing-masing tepat 1 listener', async () => {
    const cdp = await p.context().newCDPSession(p); const out = [];
    for (const sel of ['#main-search', '#search-box', '#category']) {
      const { result } = await cdp.send('Runtime.evaluate', { expression: `document.querySelector('${sel}')` });
      const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
      out.push(`${sel}: ${listeners.map(l => l.type).join('+')}`);
    }
    return { pass: out.every(o => !o.includes('+') && /: \w+$/.test(o)), actual: out.join('; ') };
  });

  // ---------- A5 Heading
  await uat('A5', 'A5-01', 'Judul halaman tepat', ['Lihat heading utama halaman'], 'Teks persis "Tropic Hiking Trails"', async () => {
    const h1 = await p.$$eval('h1', hs => hs.map(h => h.innerText));
    await mark(p, ['.site-header-trails h1']); const s = await shot(p, 'A5-01-heading', { selector: '.site-header-trails' }); await unmark(p);
    return { pass: h1.length === 1 && h1[0] === 'Tropic Hiking Trails', actual: `h1 = ${JSON.stringify(h1)}`, shots: [s] };
  });

  // ---------- A3 Sticky contact buttons (desktop)
  await uat('A3', 'A3-01', 'Tombol WhatsApp & LINE tampil di atas, bold', ['Buka halaman (desktop)', 'Lihat area atas halaman'], 'Dua tombol WhatsApp dan LINE terlihat jelas, teks bold, di bawah navigasi utama', async () => {
    await p.evaluate(() => window.scrollTo(0, 0));
    const info = await p.evaluate(() => { const bar = document.querySelector('.trails-contact-bar'); const btns = [...bar.children]; return { labels: btns.map(b => b.textContent), weights: btns.map(b => getComputedStyle(b).fontWeight), barTop: bar.getBoundingClientRect().top, navBottom: document.getElementById('site-header').getBoundingClientRect().bottom }; });
    await mark(p, ['.trails-contact-btn']); const s = await shot(p, 'A3-01-buttons-desktop-top'); await unmark(p);
    return { pass: info.labels.join() === 'WhatsApp,LINE' && info.weights.every(w => +w >= 700) && info.navBottom <= info.barTop + 0.5, actual: `${info.labels.join(' & ')}, font-weight ${info.weights.join('/')}, bar di y=${Math.round(info.barTop)} (nav berakhir y=${Math.round(info.navBottom)})`, shots: [s] };
  });
  await uat('A3', 'A3-02', 'Tombol sticky saat halaman di-scroll', ['Scroll ke bawah 900px'], 'Bar tombol tetap menempel di atas viewport dan tidak tertutup konten', async () => {
    await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(150);
    const top = await p.evaluate(() => document.querySelector('.trails-contact-bar').getBoundingClientRect().top);
    const onTop = await p.evaluate(() => { const b = document.querySelector('.trails-contact-btn'), r = b.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b; });
    await mark(p, ['.trails-contact-bar']); const s = await shot(p, 'A3-02-buttons-desktop-sticky'); await unmark(p);
    await p.evaluate(() => window.scrollTo(0, 0));
    return { pass: Math.abs(top) < 1 && onTop, actual: `posisi bar top=${top}px setelah scroll; tombol ${onTop ? 'tidak tertutup' : 'tertutup'}`, shots: [s] };
  });
  await uat('A3', 'A3-03', 'Link WhatsApp & LINE', ['Periksa tujuan tombol WhatsApp', 'Klik WhatsApp', 'Periksa tombol LINE'], 'WhatsApp → wa.me/6282252081212 di tab baru; LINE tampil sebagai label (URL belum tersedia)', async () => {
    const wa = await p.$eval('.trails-contact-whatsapp', a => ({ tag: a.tagName, href: a.getAttribute('href'), target: a.target, rel: a.rel }));
    const line = await p.$eval('.trails-contact-line', a => ({ tag: a.tagName, href: a.getAttribute('href') }));
    const [popup] = await Promise.all([p.waitForEvent('popup'), p.click('.trails-contact-whatsapp')]);
    await popup.waitForLoadState('domcontentloaded').catch(() => {}); const popupUrl = popup.url(); await popup.close();
    return { pass: wa.tag === 'A' && wa.href === 'https://wa.me/6282252081212' && wa.target === '_blank' && wa.rel === 'noopener' && line.tag === 'SPAN' && !line.href, actual: `WhatsApp href=${wa.href} (target=${wa.target}); tab baru membuka ${popupUrl.slice(0, 70)}; LINE = <${line.tag.toLowerCase()}> tanpa href` };
  });

  // ---------- A4 + A8 Footer
  await uat('A4', 'A4-01', 'Footer navigation hanya 4 link', ['Scroll ke footer', 'Periksa kelompok link navigasi'], 'Hanya FAQ, Contact Us, PDPA, Privacy Policy (tanpa Twitter / link lain)', async () => {
    const links = await p.$$eval('.trails-footer nav:not(.trails-social) a', as => as.map(a => a.textContent));
    const twitter = /twitter/i.test(await p.textContent('body'));
    await mark(p, ['.trails-footer nav:not(.trails-social)']); const s = await shot(p, 'A4-01-footer-links', { selector: '.trails-footer' }); await unmark(p);
    return { pass: links.join('|') === 'FAQ|Contact Us|PDPA|Privacy Policy' && !twitter, actual: `${links.join(', ')}; Twitter di halaman: ${twitter ? 'ada' : 'tidak ada'}`, shots: [s] };
  });
  await uat('A8', 'A8-01', 'Social media footer lengkap', ['Lihat footer', 'Periksa label & tujuan link social'], 'Facebook, LinkedIn, Instagram, TikTok, YouTube tampil dengan link (dummy "task14"), aria-label tersedia', async () => {
    const items = await p.$$eval('.trails-social > *', es => es.map(e => ({ text: e.textContent, href: e.getAttribute('href') })));
    const label = await p.getAttribute('.trails-social', 'aria-label');
    await mark(p, ['.trails-social']); const s = await shot(p, 'A8-01-footer-social-desktop', { selector: '.trails-footer' }); await unmark(p);
    const names = items.map(i => i.text).join(',');
    return { pass: names === 'Facebook,LinkedIn,Instagram,TikTok,YouTube' && items.every(i => i.href && i.href.includes('task14')) && label === 'Social media', actual: items.map(i => `${i.text} → ${i.href}`).join('; ') + `; aria-label="${label}"`, shots: [s] };
  });

  // ---------- A6 / A9 / A11 Booking form fields
  await uat('A6', 'A6-01', 'Field Digital Nomad tampil dengan pilihan Ya/Tidak', ['Scroll ke form booking', 'Periksa field "Digital Nomad"'], 'Label "Digital Nomad", pilihan Ya dan Tidak, wajib diisi', async () => {
    const f = await p.evaluate(() => ({ legend: document.querySelector('.trails-choice legend').textContent, opts: [...document.querySelectorAll('input[name=digital_nomad]')].map(r => r.value + (r.required ? ' (required)' : '')) }));
    await mark(p, ['.trails-choice:first-of-type']); const s = await shot(p, 'A6-01-digital-nomad-field', { selector: '.trails-booking' }); await unmark(p);
    return { pass: f.legend === 'Digital Nomad' && f.opts.join() === 'Ya (required),Tidak (required)', actual: `legend "${f.legend}", opsi: ${f.opts.join(', ')}`, shots: [s] };
  });
  await uat('A6', 'A6-02', 'Ya dan Tidak dapat dipilih', ['Klik label "Ya"', 'Klik label "Tidak"'], 'Masing-masing dapat dipilih dan saling eksklusif', async () => {
    await p.getByLabel('Ya', { exact: true }).check(); const ya = await p.isChecked('input[value=Ya]');
    await p.getByLabel('Tidak', { exact: true }).check(); const tidak = await p.isChecked('input[value=Tidak]') && !(await p.isChecked('input[value=Ya]'));
    return { pass: ya && tidak, actual: `Ya terpilih: ${ya}; Tidak terpilih & Ya lepas: ${tidak}` };
  });
  await uat('A9', 'A9-01', 'Checkbox Host Terms tampil dengan label persis', ['Periksa checkbox persetujuan'], 'Label persis "I agree to the Host Terms", wajib dicentang', async () => {
    const c = await p.$eval('input[name=host_terms]', i => ({ label: i.closest('label').textContent, req: i.required }));
    await mark(p, ['.trails-consent']); const s = await shot(p, 'A9-01-host-terms-checkbox', { selector: '.trails-booking' }); await unmark(p);
    return { pass: c.label === 'I agree to the Host Terms' && c.req, actual: `label "${c.label}", required=${c.req}`, shots: [s] };
  });
  await uat('A11', 'A11-01', 'Plan Daily → total RM 350', ['Pilih plan "Daily"'], 'Total berubah langsung menjadi "Total: RM 350"', async () => {
    await p.getByLabel('Daily', { exact: true }).check(); const t = await p.textContent('#trails-total');
    await mark(p, ['input[name=plan][value=daily]', '#trails-total']); const s = await shot(p, 'A11-01-plan-daily', { selector: '.trails-booking' }); await unmark(p);
    return { pass: t === 'Total: RM 350', actual: t, shots: [s] };
  });
  await uat('A11', 'A11-02', 'Plan Monthly → total RM 8,400', ['Pilih plan "Monthly"'], 'Total berubah langsung menjadi "Total: RM 8,400" (350 × 30 × 0.8)', async () => {
    let navigated = false; p.once('framenavigated', () => { navigated = true; });
    await p.getByLabel('Monthly', { exact: true }).check(); const t = await p.textContent('#trails-total');
    await mark(p, ['input[name=plan][value=monthly]', '#trails-total']); const s = await shot(p, 'A11-02-plan-monthly', { selector: '.trails-booking' }); await unmark(p);
    return { pass: t === 'Total: RM 8,400' && !navigated, actual: `${t}; reload halaman: ${navigated ? 'ya' : 'tidak'}`, shots: [s] };
  });
  await uat('A11', 'A11-03', 'Harga tidak bergantung pada trail', ['Plan Monthly tetap terpilih', 'Filter listing ke "kinabalu" lalu ke kategori lain'], 'Total tetap RM 8,400', async () => {
    await typeSearch(p, '#search-box', 'kinabalu'); const a = await p.textContent('#trails-total');
    await typeSearch(p, '#search-box', ''); await p.selectOption('#category', 'beach'); const b = await p.textContent('#trails-total'); await p.selectOption('#category', 'all');
    return { pass: a === 'Total: RM 8,400' && b === 'Total: RM 8,400', actual: `setelah search: ${a}; setelah kategori: ${b}` };
  });
  await p.context().close();

  // ---------- Form validation (fresh page)
  p = await newPage(DESKTOP);
  await uat('A6', 'A6-03', 'Submit tanpa memilih Digital Nomad ditolak', ['Isi Name, Date, Plan, centang Host Terms', 'Jangan pilih Digital Nomad', 'Klik "Request booking"'], 'Browser menolak submit dan meminta memilih opsi; tidak ada request ke server', async () => {
    let posts = 0; p.on('request', r => { if (r.method() === 'POST') posts++; });
    await p.fill('input[name=booking_name]', 'UAT'); await p.fill('input[name=date]', '2026-12-01'); await p.check('input[name=plan][value=daily]'); await p.check('input[name=host_terms]');
    await p.click('#booking-form [type=submit]'); const msg = await p.$eval('input[name=digital_nomad]', r => r.validationMessage);
    return { pass: posts === 0 && msg.length > 0, actual: `request POST: ${posts}; pesan browser: "${msg}"` };
  });
  await uat('A9', 'A9-02', 'Submit tanpa centang Host Terms ditolak', ['Isi semua field, pilih Digital Nomad', 'Jangan centang Host Terms', 'Klik "Request booking"'], 'Browser menolak submit; tidak ada request ke server', async () => {
    let posts = 0; p.on('request', r => { if (r.method() === 'POST') posts++; });
    await p.check('input[name=digital_nomad][value=Ya]'); await p.uncheck('input[name=host_terms]');
    await p.click('#booking-form [type=submit]'); const msg = await p.$eval('input[name=host_terms]', r => r.validationMessage);
    return { pass: posts === 0 && msg.length > 0, actual: `request POST: ${posts}; pesan browser: "${msg}"` };
  });
  await uat('A11', 'A11-04', 'Submit tanpa memilih plan ditolak', ['Reset form, isi field lain, jangan pilih plan', 'Klik "Request booking"'], 'Browser menolak submit; total tetap "Total: -"', async () => {
    await p.evaluate(() => document.getElementById('booking-form').reset()); await p.evaluate(() => document.querySelector('input[name=plan]').dispatchEvent(new Event('change')));
    await fillBooking(p, { plan: 'daily' }); await p.evaluate(() => document.querySelectorAll('input[name=plan]').forEach(r => { r.checked = false; }));
    await p.click('#booking-form [type=submit]'); const msg = await p.$eval('input[name=plan]', r => r.validationMessage);
    return { pass: msg.length > 0, actual: `pesan browser: "${msg}"` };
  });
  await p.context().close();

  // ---------- A12 Booking flow
  p = await newPage(DESKTOP);
  await uat('A12', 'A12-01', 'Booking valid → pesan sukses otomatis', ['Isi Name "UAT Tester", Date 2026-12-01, Digital Nomad "Ya", Plan "Monthly", centang Host Terms', 'Klik "Request booking"'], 'Server menjawab sukses; pesan konfirmasi tampil otomatis dengan total RM 8,400; form di-reset; booking tersimpan di server', async () => {
    await fillBooking(p); await mark(p, ['#booking-form']);
    const s1 = await shot(p, 'A12-01a-form-filled', { selector: '.trails-booking' }); await unmark(p);
    const [resp] = await Promise.all([p.waitForResponse(r => r.request().method() === 'POST'), p.click('#booking-form [type=submit]')]);
    await waitForResult(p); const c = await confirmation(p); const json = await resp.json();
    await mark(p, ['#trails-confirmation']); const s2 = await shot(p, 'A12-01b-success-message', { selector: '.trails-booking' }); await unmark(p);
    const saved = savedBooking(); const reset = (await p.inputValue('input[name=booking_name]')) === '';
    const savedOk = saved === undefined || (saved && saved.price === 8400 && saved.plan === 'monthly' && saved.name === 'UAT Tester');
    return { pass: resp.status() === 200 && json.success === true && c.cls === 'is-success' && /Thank you, UAT Tester!.*Monthly plan from 2026-12-01\. Total: RM 8,400\./.test(c.text) && reset && savedOk,
      actual: `HTTP ${resp.status()} success=${json.success}; pesan: "${c.text}"; form reset: ${reset}; data tersimpan: ${saved === undefined ? '(tidak dicek, WP_PATH kosong)' : JSON.stringify(saved)}`, shots: [s1, s2] };
  });
  await uat('A12', 'A12-02', 'Tidak ada popup alert palsu', ['Amati selama submit A12-01'], 'Tidak ada alert() — konfirmasi hanya di halaman', async () => {
    let dialogs = 0; p.on('dialog', d => { dialogs++; d.dismiss(); });
    await fillBooking(p, { name: 'UAT Dialog' }); await p.click('#booking-form [type=submit]'); await waitForResult(p);
    return { pass: dialogs === 0, actual: `jumlah alert: ${dialogs}` };
  });
  await uat('A12', 'A12-03', 'Booking ditolak server → pesan error, tanpa sukses', ['Simulasikan klien yang melewati validasi browser (atribut required dihapus)', 'Kosongkan semua field, klik "Request booking"'], 'Pesan error merah berisi daftar kesalahan per field; pesan sukses tidak tampil; tidak ada data tersimpan', async () => {
    const before = JSON.stringify(savedBooking());
    await p.evaluate(() => { const f = document.getElementById('booking-form'); f.reset(); f.querySelectorAll('[required]').forEach(e => e.removeAttribute('required')); });
    await p.click('#booking-form [type=submit]'); await waitForResult(p); const c = await confirmation(p);
    await mark(p, ['#trails-confirmation']); const s = await shot(p, 'A12-03-server-validation-error', { selector: '.trails-booking' }); await unmark(p);
    const after = JSON.stringify(savedBooking());
    return { pass: c.cls === 'is-error' && !/Thank you/.test(c.text) && /Host Terms/.test(c.text) && before === after, actual: `class=${c.cls}; pesan: "${c.text}"; data server berubah: ${before !== after}`, shots: [s] };
  });
  await p.context().close();

  p = await newPage(DESKTOP);
  await uat('A12', 'A12-04', 'Koneksi gagal → pesan error', ['Isi form valid', 'Putuskan request ke server (simulasi jaringan gagal)', 'Klik "Request booking"'], 'Pesan error koneksi tampil; tidak ada pesan sukses; tombol aktif kembali', async () => {
    await fillBooking(p, { name: 'UAT Offline' });
    await p.route(u => u.href.startsWith(ORIGIN), (route, req) => req.method() === 'POST' ? route.abort('failed') : route.continue());
    await p.click('#booking-form [type=submit]'); await waitForResult(p); const c = await confirmation(p);
    const enabled = !(await p.isDisabled('#booking-form [type=submit]'));
    await mark(p, ['#trails-confirmation']); const s = await shot(p, 'A12-04-network-error', { selector: '.trails-booking' }); await unmark(p);
    await p.unroute(u => u.href.startsWith(ORIGIN));
    // The aborted request is logged by the browser as a resource error; it is induced on purpose here, so it is not a page error.
    p.consoleErrors = p.consoleErrors.filter(e => !/net::ERR_FAILED/.test(e));
    return { pass: c.cls === 'is-error' && !/Thank you/.test(c.text) && enabled, actual: `class=${c.cls}; pesan: "${c.text}"; tombol aktif: ${enabled}`, shots: [s] };
  });
  await uat('A12', 'A12-05', 'Mencegah submit ganda', ['Isi form valid', 'Klik "Request booking" lalu submit lagi 2× selagi request berjalan (server diperlambat 800ms)'], 'Hanya 1 request terkirim; tombol nonaktif selama proses', async () => {
    await p.reload(); await fillBooking(p, { name: 'UAT Double' }); let posts = 0; p.on('request', r => { if (r.method() === 'POST') posts++; });
    await p.route(u => u.href.startsWith(ORIGIN), async (route, req) => { if (req.method() === 'POST') await new Promise(r => setTimeout(r, 800)); route.continue(); });
    await p.click('#booking-form [type=submit]'); const disabled = await p.isDisabled('#booking-form [type=submit]');
    await mark(p, ['#booking-form [type=submit]']); const s = await shot(p, 'A12-05-button-disabled-while-sending', { selector: '.trails-booking' }); await unmark(p);
    await p.$eval('#booking-form', f => { f.requestSubmit(); f.requestSubmit(); });
    await waitForResult(p); const c = await confirmation(p); await p.unroute(u => u.href.startsWith(ORIGIN));
    return { pass: posts === 1 && disabled && c.cls === 'is-success', actual: `request POST: ${posts}; tombol nonaktif saat proses: ${disabled}; hasil: ${c.cls}`, shots: [s] };
  });
  await uat('A11', 'A11-05', 'Harga dimanipulasi di browser tetap dihitung server', ['Pilih Monthly', 'Ubah data-price di browser menjadi 1 (tampilan jadi RM 1)', 'Submit booking'], 'Server tetap mengenakan RM 8,400 dan pesan sukses menampilkan RM 8,400', async () => {
    await p.reload(); await fillBooking(p, { name: 'UAT Tamper', plan: 'monthly' });
    await p.evaluate(() => { const m = document.querySelector('input[name=plan][value=monthly]'); m.dataset.price = '1'; m.dispatchEvent(new Event('change')); });
    const shown = await p.textContent('#trails-total');
    await mark(p, ['#trails-total']); const s1 = await shot(p, 'A11-05a-tampered-ui-total', { selector: '.trails-booking' }); await unmark(p);
    await p.click('#booking-form [type=submit]'); await waitForResult(p); const c = await confirmation(p);
    await mark(p, ['#trails-confirmation']); const s2 = await shot(p, 'A11-05b-server-price-wins', { selector: '.trails-booking' }); await unmark(p);
    const saved = savedBooking();
    return { pass: shown === 'Total: RM 1' && /Total: RM 8,400/.test(c.text) && (saved === undefined || saved.price === 8400), actual: `tampilan browser "${shown}"; pesan server: "${c.text}"; harga tersimpan: ${saved === undefined ? '(tidak dicek)' : saved.price}`, shots: [s1, s2] };
  });

  // Server-side rules exercised with the page's real nonce (as a client that skips browser validation would).
  const nonce = await p.inputValue('#trails_booking_nonce');
  const base = { trails_booking: '1', ajax: '1', trails_booking_nonce: nonce, booking_name: 'UAT API', date: '2026-12-02', digital_nomad: 'Ya', plan: 'daily', host_terms: '1' };
  const without = (o, k) => { const c = { ...o }; delete c[k]; return c; };
  for (const [task, id, title, fields, expectText] of [
    ['A6', 'A6-04', 'Server menolak nilai Digital Nomad selain Ya/Tidak ("Maybe")', { ...base, digital_nomad: 'Maybe' }, 'Digital Nomad'],
    ['A6', 'A6-05', 'Server menolak Digital Nomad kosong', without(base, 'digital_nomad'), 'Digital Nomad'],
    ['A9', 'A9-03', 'Server menolak booking tanpa persetujuan Host Terms', without(base, 'host_terms'), 'Host Terms'],
    ['A9', 'A9-04', 'Server menolak nilai persetujuan palsu ("on")', { ...base, host_terms: 'on' }, 'Host Terms'],
    ['A11', 'A11-06', 'Server menolak plan tidak dikenal ("weekly")', { ...base, plan: 'weekly' }, 'Daily or Monthly'],
    ['A12', 'A12-06', 'Server menolak nonce palsu', { ...base, trails_booking_nonce: 'forged0000' }, 'session has expired'],
    ['A12', 'A12-07', 'Server menolak tanggal tidak valid (2026-02-30)', { ...base, date: '2026-02-30' }, 'valid date'],
  ]) {
    await uat(task, id, title, ['Kirim POST langsung ke server dengan nonce halaman', `Field: ${Object.entries(fields).filter(([k]) => !['trails_booking', 'ajax', 'trails_booking_nonce'].includes(k) || k === 'trails_booking_nonce' && fields[k] !== nonce).map(([k, v]) => `${k}=${k === 'trails_booking_nonce' ? v : v}`).join(', ')}`], `HTTP 400, success=false, pesan mengandung "${expectText}"`, async () => {
      const r = await postBooking(p, fields); const text = r.json ? [r.json.data.message].concat(r.json.data.errors || []).join(' / ') : '(bukan JSON)';
      return { pass: r.status === 400 && r.json && r.json.success === false && text.includes(expectText), actual: `HTTP ${r.status}, success=${r.json && r.json.success}: ${text}` };
    });
  }
  await uat('A11', 'A11-07', 'Server mengabaikan field price/total dari browser', ['Kirim POST plan=monthly dengan price=1 dan total=1'], 'HTTP 200; pesan menampilkan RM 8,400', async () => {
    const r = await postBooking(p, { ...base, plan: 'monthly', price: '1', total: '1' });
    return { pass: r.status === 200 && r.json.success === true && /RM 8,400/.test(r.json.data.message), actual: `HTTP ${r.status}: ${r.json && r.json.data.message}` };
  });
  const desktopErrors = p.consoleErrors.filter(e => !/status of 400/.test(e));
  await p.context().close();

  p = await newPage(DESKTOP, { js: false });
  await uat('A12', 'A12-08', 'Tanpa JavaScript: booking tetap berjalan', ['Nonaktifkan JavaScript', 'Isi form valid dan submit'], 'Halaman memuat ulang dengan pesan sukses dari server', async () => {
    await fillBooking(p, { name: 'UAT NoJS' }); await Promise.all([p.waitForNavigation(), p.click('#booking-form [type=submit]')]);
    const c = await confirmation(p);
    await mark(p, ['#trails-confirmation']).catch(() => {}); const s = await shot(p, 'A12-08-no-js-success', { selector: '.trails-booking' });
    return { pass: !c.hidden && c.cls === 'is-success' && /Thank you, UAT NoJS!/.test(c.text), actual: `pesan: "${c.text}"`, shots: [s] };
  });
  await uat('A12', 'A12-09', 'Pesan sukses tidak bisa dipalsukan lewat URL', ['Buka halaman dengan ?booking=success'], 'Tidak ada pesan sukses yang tampil', async () => {
    await p.goto(BASE_URL + (BASE_URL.includes('?') ? '&' : '?') + 'booking=success'); const c = await confirmation(p);
    return { pass: c.hidden, actual: `kotak konfirmasi ${c.hidden ? 'tersembunyi' : 'tampil: ' + c.text}` };
  });
  await p.context().close();

  // ---------- Mobile 390px
  p = await newPage(MOBILE);
  await uat('A7', 'A7-01', 'Mobile 390px: tidak ada scroll horizontal', ['Buka halaman di viewport 390px', 'Coba geser halaman ke kanan'], 'Lebar halaman = 390px; halaman tidak bisa digeser horizontal; tidak ada elemen keluar viewport', async () => {
    const r = await p.evaluate(() => { const vw = document.documentElement.clientWidth; window.scrollTo(300, 0); const sx = window.scrollX; window.scrollTo(0, 0);
      const out = [...document.querySelectorAll('body *')].filter(e => { if (e.closest('#wpadminbar, .screen-reader-text')) return false; const b = e.getBoundingClientRect(); return b.width && (b.right > vw + 0.5 || b.left < -0.5); }).length;
      return { vw, sw: document.documentElement.scrollWidth, sx, out }; });
    const s = await shot(p, 'A7-01-mobile-390-fullpage', { fullPage: true });
    return { pass: r.sw === r.vw && r.sx === 0 && r.out === 0, actual: `scrollWidth ${r.sw}px / viewport ${r.vw}px; scrollX setelah digeser: ${r.sx}; elemen keluar viewport: ${r.out}`, shots: [s] };
  });
  await uat('A7', 'A7-02', 'Mobile 390px: semua section tampil', ['Periksa section utama satu per satu'], 'Contact bar, header, promo, search, listing, form booking, footer semuanya tampil', async () => {
    const secs = { 'Contact bar': '.trails-contact-bar', 'Header': '.site-header-trails', 'Promo': '.trails-promo', 'Search & kategori': '.trails-search-row', 'Listing': '.trails-cards', 'Form booking': '#booking-form', 'Footer': '.trails-footer' };
    const shown = await p.evaluate(s => Object.entries(s).map(([n, sel]) => { const e = document.querySelector(sel); return [n, !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0]; }), secs);
    await mark(p, ['.trails-promo']); const s = await shot(p, 'A7-02-mobile-promo-visible'); await unmark(p);
    return { pass: shown.every(([, v]) => v), actual: shown.map(([n, v]) => `${n}: ${v ? 'tampil' : 'HILANG'}`).join('; '), shots: [s] };
  });
  await uat('A7', 'A7-03', 'Mobile 390px: form & CTA dapat dipakai', ['Isi form booking di 390px dan submit'], 'Semua field di dalam viewport; booking berhasil', async () => {
    await p.locator('#booking-form').scrollIntoViewIfNeeded(); const right = await p.$eval('#booking-form', f => f.getBoundingClientRect().right);
    await fillBooking(p, { name: 'UAT Mobile', plan: 'daily' }); await p.click('#booking-form [type=submit]'); await waitForResult(p); const c = await confirmation(p);
    await mark(p, ['#trails-confirmation']); const s = await shot(p, 'A7-03-mobile-booking-success', { selector: '.trails-booking' }); await unmark(p);
    return { pass: right <= 390 && c.cls === 'is-success' && /Daily plan.*RM 350/.test(c.text), actual: `form berakhir di x=${Math.round(right)}px; pesan: "${c.text}"`, shots: [s] };
  });
  await uat('A3', 'A3-04', 'Mobile 390px: tombol sticky & menu tetap bisa dipakai', ['Lihat bagian atas di 390px', 'Buka menu hamburger', 'Scroll ke bawah'], 'Tombol tampil tanpa overflow; dropdown menu tidak tertutup tombol; tombol menempel di atas saat scroll', async () => {
    await p.evaluate(() => window.scrollTo(0, 0));
    const fits = await p.$eval('.trails-contact-bar', b => b.scrollWidth <= b.clientWidth && b.getBoundingClientRect().right <= innerWidth);
    await mark(p, ['.trails-contact-btn']); const s1 = await shot(p, 'A3-04a-buttons-mobile-top'); await unmark(p);
    let menuOk = 'tidak ada toggle'; let s2;
    if (await p.$('.site-navigation-toggle')) {
      await p.click('.site-navigation-toggle'); await p.waitForTimeout(400);
      menuOk = await p.evaluate(() => { const a = [...document.querySelectorAll('.site-navigation-dropdown a')].find(e => e.getBoundingClientRect().width); if (!a) return 'link tidak terlihat'; const r = a.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t === a || a.contains(t) ? true : 'tertutup ' + t.className; });
      await mark(p, ['.site-navigation-dropdown']); s2 = await shot(p, 'A3-04b-mobile-menu-open'); await unmark(p);
      await p.click('.site-navigation-toggle'); await p.waitForTimeout(400);
    }
    await p.evaluate(() => window.scrollTo(0, 1200)); await p.waitForTimeout(150);
    const top = await p.evaluate(() => document.querySelector('.trails-contact-bar').getBoundingClientRect().top);
    const s3 = await shot(p, 'A3-04c-buttons-mobile-sticky');
    return { pass: fits && menuOk === true && Math.abs(top) < 1, actual: `tombol muat di layar: ${fits}; menu dropdown dapat diklik: ${menuOk}; top bar saat scroll: ${top}px`, shots: [s1, s2, s3].filter(Boolean) };
  });
  await uat('A8', 'A8-02', 'Mobile 390px: footer social rapi tanpa overflow', ['Scroll ke footer di 390px'], 'Semua item social terlihat, membungkus ke baris berikutnya bila perlu, tidak keluar layar', async () => {
    const r = await p.$$eval('.trails-social > *', es => es.map(e => e.getBoundingClientRect().right));
    await mark(p, ['.trails-social']); const s = await shot(p, 'A8-02-footer-social-mobile', { selector: '.trails-footer' }); await unmark(p);
    return { pass: r.length === 5 && r.every(x => x <= 390), actual: `5 item, posisi kanan maks ${Math.round(Math.max(...r))}px`, shots: [s] };
  });
  const mobileErrors = p.consoleErrors;
  await p.context().close();

  // ---------- Logged-in (admin bar)
  if (canLogin) {
    p = await newPage(DESKTOP, { login: true });
    await uat('A3', 'A3-05', 'Login (admin bar): tombol sticky tidak tertutup admin bar', ['Login ke WordPress', 'Buka halaman, scroll ke bawah'], 'Bar tombol menempel tepat di bawah admin bar (32px)', async () => {
      const ab = await p.$('#wpadminbar') !== null;
      await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(150);
      const top = await p.evaluate(() => document.querySelector('.trails-contact-bar').getBoundingClientRect().top);
      await mark(p, ['.trails-contact-bar']); const s = await shot(p, 'A3-05-logged-in-admin-bar-sticky'); await unmark(p);
      return { pass: ab && Math.abs(top - 32) < 1, actual: `admin bar: ${ab ? 'ada' : 'tidak ada'}; top bar saat scroll: ${top}px`, shots: [s] };
    });
    await p.context().close();
  }

  // ---------- General
  await uat('UMUM', 'G-01', 'Tidak ada error JavaScript di halaman trails', ['Kumpulkan error console selama skenario desktop & mobile'], 'Tidak ada error JS (respons 400 dari skenario penolakan server dan koneksi gagal A12-04 sengaja dipicu, sehingga dikecualikan)', async () => {
    const all = desktopErrors.concat(mobileErrors);
    return { pass: all.length === 0, actual: all.length ? all.slice(0, 3).join(' | ') : 'tidak ada error' };
  });
  p = await newPage(DESKTOP);
  await uat('UMUM', 'G-02', 'Halaman lain (tanpa listing/form) tidak error', ['Buka halaman post biasa (/?p=1) yang tetap memuat trails.js'], 'Tidak ada error JavaScript', async () => {
    await p.goto(ORIGIN + '/?p=1'); await p.waitForTimeout(200);
    const loaded = (await p.content()).includes('myrehat-test/trails.js');
    return { pass: loaded && p.consoleErrors.length === 0, actual: `trails.js dimuat: ${loaded}; error: ${p.consoleErrors.length ? p.consoleErrors.join(' | ') : 'tidak ada'}` };
  });
  await p.context().close();

  const meta = { runAt: new Date().toISOString(), baseUrl: BASE_URL, browser: 'Chromium ' + browser.version(), loggedInScenarios: canLogin, serverChecks: !!process.env.WP_PATH };
  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ meta, results }, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), report(meta));
  const failed = results.filter(r => r.status !== 'PASS').length;
  console.log(`\n${results.length} skenario, ${results.length - failed} PASS, ${failed} FAIL`);
  process.exitCode = failed ? 1 : 0;
}

// ---------------------------------------------------------------- report

const TASKS = {
  A1: ['Listing Search', 'Search input memfilter listing secara langsung (judul, lokasi, kategori), tidak case-sensitive, kosong = semua.', [
    'Root cause: `trails.js` memakai selector `#searchInput` (seharusnya `#search-box`) sehingga script berhenti dengan TypeError; selector pesan kosong juga salah (`#no-results` → `#trails-no-results`).',
    'Teks yang dicari: teks kartu (judul, lokasi, harga) + `data-category`. Spasi di awal/akhir query diabaikan.',
  ]],
  A2: ['Category Filter', 'Dropdown kategori memfilter listing dan digabung dengan search (`visible = matchesSearch && matchesCategory`).', [
    'Satu fungsi `filterTrails()` dipakai bersama oleh search, header search, dan kategori — tidak ada mekanisme filter ganda.',
    'Contoh di brief (`beach` + `family`) tidak dapat diuji karena kategori "family" tidak ada di markup; kategori yang tersedia: Mountain, Beach, Forest.',
  ]],
  A3: ['WhatsApp & LINE Sticky Buttons', 'Dua tombol di area atas, sticky, bold, responsif, tidak menutup navigasi, tanpa overflow.', [
    'WhatsApp memakai nomor 082252081212 dalam format internasional `https://wa.me/6282252081212` (diasumsikan nomor Indonesia, prefix 0822).',
    '**LINE belum memiliki URL** sehingga tampil sebagai label (bukan link). Tambahkan lewat filter `myrehat_test_line_url` saat URL tersedia.',
    'Saat login, bar menempel tepat di bawah admin bar WordPress (32px); di ≤600px admin bar tidak fixed sehingga bar menempel di 0.',
    'Di mobile, menu header Hello Elementor berupa hamburger; dropdown-nya berada di atas bar tombol (tidak tertutup).',
  ]],
  A4: ['Footer Links', 'Kelompok link navigasi footer hanya FAQ, Contact Us, PDPA, Privacy Policy.', [
    'Dihapus: Blog, Careers, Terms of Service, Sitemap, Twitter; "Privacy Policy Statement" diganti menjadi "Privacy Policy".',
    'Tujuan link masih placeholder `#` (sudah begitu sebelumnya). Menu footer WordPress dari database produksi (jika ada) tidak tercakup UAT ini.',
  ]],
  A5: ['Heading', 'Judul tampil persis "Tropic Hiking Trails".', [
    'Sebelumnya hardcoded "Hiking Advantures". Judul tab browser (`<title>`) berasal dari judul halaman di WP Admin, bukan dari template.',
  ]],
  A6: ['Digital Nomad Field', 'Field wajib "Digital Nomad" dengan pilihan Ya/Tidak; server hanya menerima `Ya` atau `Tidak`.', [
    'Validasi dua lapis: `required` di browser dan whitelist ketat di server (`myrehat_test_validate_booking`).',
    'Pesan validasi browser (A6-03) adalah tooltip native browser sehingga tidak terekam di screenshot; teksnya dicatat di kolom Actual.',
  ]],
  A7: ['Mobile 390px', 'Di 390px semua section tampil, tidak ada scroll horizontal, form & CTA dapat dipakai.', [
    'Root cause overflow: `.trail-card { min-width: 320px }` di flex row tanpa wrap (halaman ±2010px di 390px; desktop juga overflow). Diganti `flex-wrap: wrap` + `flex: 1 1 260px`.',
    'Root cause section hilang: `.trails-promo { display: none }` di media query ≤600px — dihapus.',
    'Tidak memakai `overflow-x: hidden` sebagai solusi.',
  ]],
  A8: ['Social Media Footer', 'Footer menampilkan Facebook, LinkedIn, Instagram, TikTok, YouTube dengan label aksesibel, rapi, responsif.', [
    '**URL social media adalah dummy "task14"** sesuai permintaan; ganti di `myrehat_test_set_social_urls()` saat akun resmi tersedia.',
    'Memakai label teks (konsisten dengan gaya link footer yang ada); link dibuka di tab baru dengan `rel="noopener"`.',
  ]],
  A9: ['Host Terms Checkbox', 'Checkbox wajib "I agree to the Host Terms"; submit gagal jika tidak dicentang, divalidasi juga di server.', [
    'Server hanya menerima nilai checkbox `"1"`; nilai lain (`on`, `true`, `yes`, kosong) ditolak dengan pesan jelas.',
    'Belum ada halaman Host Terms, sehingga teks belum menjadi link.',
  ]],
  A10: ['Header Search', 'Search di header memfilter listing yang sama dengan A1, tanpa logika filter baru.', [
    'Kedua kotak search merepresentasikan satu query yang sama dan selalu disinkronkan; kategori tetap ikut diterapkan.',
    'Placeholder header masih "Search homepage..." (tidak diubah karena tidak diminta); "Search trails..." akan lebih jelas.',
  ]],
  A11: ['Daily / Monthly Pricing', 'Pilihan Daily (RM 350) / Monthly (RM 350 × 30 × 0.8 = RM 8,400), total update langsung, server menentukan harga.', [
    'Harga dihitung di PHP (`myrehat_test_booking_plans()`); browser hanya menampilkan. Nilai harga dari browser diabaikan server (A11-05, A11-07).',
    'Tidak ada default plan; total menampilkan "Total: -" sampai plan dipilih.',
  ]],
  A12: ['Booking Success Confirmation', 'Pesan sukses hanya tampil jika server menyatakan booking berhasil; error ditampilkan dengan benar; cegah submit ganda.', [
    'Root cause: konfirmasi sebelumnya adalah `alert()` palsu tanpa request ke server; form tidak pernah sampai ke handler.',
    'Temuan saat final verification di WordPress asli: field `name` bentrok dengan query var publik WordPress (respons jadi 404). Field diganti `booking_name`; respons sukses selalu HTTP 200.',
    'Penyimpanan booking masih transient tunggal (`trails_last_booking`, 1 jam) sesuai arsitektur awal — untuk produksi perlu penyimpanan permanen.',
    'Jika halaman di-cache penuh untuk pengunjung anonim, umur cache harus lebih pendek dari umur nonce (12–24 jam).',
  ]],
  UMUM: ['Pemeriksaan Umum', 'Tidak ada error JavaScript baru di halaman trails maupun halaman lain.', []],
};

function esc(s) { return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' '); }

function report(meta) {
  const order = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'A12', 'UMUM'];
  const pass = results.filter(r => r.status === 'PASS').length;
  const L = [];
  L.push('# UAT End-to-End — Task A1–A12', '');
  L.push('Laporan User Acceptance Test untuk halaman **Trails Test Page** (theme `myrehat-test`). Seluruh isi tabel hasil di bawah dibuat otomatis oleh `uat-e2e.js` dari hasil eksekusi Playwright yang sebenarnya.', '');
  L.push('## Ringkasan', '');
  L.push(`**Hasil: ${pass} / ${results.length} skenario PASS**${pass === results.length ? ' — semua acceptance criteria terpenuhi.' : ` — ${results.length - pass} skenario FAIL, lihat detail.`}`, '');
  L.push('| Task | Nama | Skenario | PASS | FAIL | Status |', '|---|---|---|---|---|---|');
  for (const t of order) {
    const rs = results.filter(r => r.task === t); if (!rs.length) continue;
    const f = rs.filter(r => r.status !== 'PASS').length;
    // Same slug rule as GitHub/VS Code headings: lowercase, drop punctuation, spaces become hyphens.
    const anchor = `${t} — ${TASKS[t][0]}`.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').replace(/ /g, '-');
    L.push(`| [${t}](#${anchor}) | ${TASKS[t][0]} | ${rs.length} | ${rs.length - f} | ${f} | ${f ? '❌ FAIL' : '✅ PASS'} |`);
  }
  L.push('', '## Lingkungan Pengujian', '');
  L.push(`- Waktu eksekusi: ${meta.runAt.replace('T', ' ').slice(0, 16)} UTC`);
  L.push(`- URL: \`${meta.baseUrl}\``);
  L.push(`- Browser: ${meta.browser} (headless) via Playwright`);
  L.push('- Viewport: desktop 1280×800, mobile 390×844 (emulasi mobile + touch)');
  L.push(`- Skenario login (admin bar): ${meta.loggedInScenarios ? 'dijalankan' : 'dilewati (WP_USER/WP_PASS kosong)'}; pengecekan data tersimpan di server: ${meta.serverChecks ? 'dijalankan (membaca transient lewat WP_PATH)' : 'dilewati'}`);
  L.push('- WordPress: 6.8.3 (PHP 8.4), parent theme Hello Elementor, plugin Elementor 4.3.4 aktif, theme `myrehat-test` aktif, halaman "Trails" memakai template `page-trails.php` sebagai front page, menu header 4 item.');
  L.push('- Instalasi WordPress **terpisah** (salinan proyek + SQLite Database Integration) karena database situs ini tidak dapat diakses dari lingkungan pengujian. Kode theme identik dengan repo. Konten produksi (menu, template Elementor, caching) tidak tercakup.');
  L.push('', 'Elemen yang diuji pada screenshot ditandai dengan **garis merah**.', '');
  L.push('## Cara Menjalankan Ulang', '', '```bash',
    '# WordPress dengan theme ini harus sudah berjalan, misalnya di http://127.0.0.1:8770/',
    'BASE_URL=http://127.0.0.1:8770/ \\',
    'WP_USER=<user> WP_PASS=<password> \\        # opsional: skenario login/admin bar',
    'WP_PATH=/path/ke/wordpress \\               # opsional: cek data booking tersimpan',
    'CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \\  # opsional',
    'PLAYWRIGHT_MODULE=/path/ke/node_modules/playwright \\  # jika playwright tidak terpasang lokal',
    'node docs/uat/uat-e2e.js', '```', '',
    'Script menimpa `README.md`, `results.json`, dan isi folder `screenshots/` dengan hasil terbaru. Skenario booking menyimpan data uji (transient `trails_last_booking`) di WordPress target — jangan jalankan terhadap produksi.', '');
  for (const t of order) {
    const rs = results.filter(r => r.task === t); if (!rs.length) continue;
    const [name, req, notes] = TASKS[t];
    L.push(`## ${t} — ${name}`, '', `**Requirement:** ${req}`, '');
    L.push('| ID | Skenario | Langkah | Expected | Actual | Status |', '|---|---|---|---|---|---|');
    for (const r of rs) L.push(`| ${r.id} | ${esc(r.title)} | ${esc(r.steps.map((s, i) => `${i + 1}. ${s}`).join('<br>'))} | ${esc(r.expected)} | ${esc(r.actual)} | ${r.status === 'PASS' ? '✅ PASS' : '❌ FAIL'} |`);
    const shots = rs.flatMap(r => r.shots.map(s => [r.id, s]));
    if (shots.length) { L.push('', '**Bukti screenshot:**', ''); for (const [id, s] of shots) L.push(`- ${id} — \`${path.basename(s)}\``, '', `  ![${id}](${s})`, ''); }
    if (notes.length) { L.push('', '**Catatan:**', ''); notes.forEach(n => L.push(`- ${n}`)); }
    L.push('');
  }
  L.push('## Catatan Umum & Tindak Lanjut', '',
    '- **Data final yang masih dibutuhkan:** URL LINE; URL social media resmi (saat ini dummy "task14").',
    '- **Perlu dicek di lingkungan produksi:** menu/template Elementor dari database produksi, caching halaman, dan akun pengguna sebenarnya.',
    '- **Di luar scope A1–A12 (tidak diubah):** bug P1 (text domain `myrehat_test_booking_title`) dan P3 (jumlah argumen hook `myrehat_trail_viewed`) di `functions.php`; gaya `button:focus` dari reset parent theme yang membuat tombol submit berwarna pink setelah diklik.',
    '- Skenario A6-04 s.d. A12-07 mengirim POST langsung ke server dengan nonce halaman untuk membuktikan validasi server tidak bergantung pada browser.', '');
  return L.join('\n');
}

run().catch(e => { console.error(e); process.exit(1); });
