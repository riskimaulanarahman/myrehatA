/*
 * Elementor hero rebuild for the "Trails" page, driven through the Elementor UI with Playwright.
 *
 * Phases: pre-flight → login → identify page → rebuild hero (Container + Heading + Text Editor + HTML)
 * → responsive (390px) → Publish → reload check → public verification → save as template
 * → export template JSON (real download) → JSON validation.
 *
 * Environment (credentials are read from env only and never printed):
 *   BASE_URL           WordPress URL (default http://127.0.0.1:8770)
 *   WP_USER, WP_PASS   WordPress account with Elementor access
 *   CHROME_PATH        Chrome/Chromium executable (optional)
 *   PLAYWRIGHT_MODULE  path to the playwright package (default 'playwright')
 *
 * Usage: BASE_URL=... WP_USER=... WP_PASS=... node scripts/elementor-hero-rebuild.js
 */
const path = require('path');
const fs = require('fs');
const PW = process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = require(PW);
const { expect } = require(path.join(PW, 'test'));

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8770').replace(/\/$/, '');
const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'artifacts', 'screenshots');
const EXPORT_DIR = path.join(ROOT, 'artifacts', 'elementor');
const TEMPLATE_NAME = 'Trails Hero';

// Existing hero content (kept as-is; no new copy).
const HERO = {
  heading: 'Tropic Hiking Trails',
  text: 'Find your next trail with MyRehat',
  searchHtml: '<input id="main-search" type="text" placeholder="Search homepage...">',
  background: '#0C6B4F',
};

const report = { steps: [], checks: [] };
let activePage; // for an optional failure screenshot (DEBUG_SHOT)
const step = msg => { report.steps.push(msg); console.log('STEP  ' + msg); };
const check = (ok, msg) => { report.checks.push({ ok, msg }); console.log((ok ? 'PASS  ' : 'FAIL  ') + msg); return ok; };

// ---------------------------------------------------------------- helpers

async function login(page) {
  await page.goto(BASE + '/wp-login.php');
  const user = page.getByLabel('Username or Email Address');
  await user.waitFor();
  // wp-login.php focuses and selects #user_login ~200ms after load; wait so it cannot interfere with typing.
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'user_login', null, { timeout: 5000 }).catch(() => {});
  await user.fill(process.env.WP_USER);
  await page.getByLabel('Password', { exact: true }).fill(process.env.WP_PASS);
  await Promise.all([
    page.waitForResponse(r => r.url().includes('/wp-login.php') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Log In' }).click(),
  ]);
  await page.waitForURL(/\/wp-admin\//, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await expect(page.locator('#wpadminbar')).toBeVisible();
}

async function openEditor(page, postId) {
  await page.goto(`${BASE}/wp-admin/post.php?post=${postId}&action=elementor`);
  const frame = page.frameLocator('#elementor-preview-iframe');
  await expect(frame.getByRole('button', { name: 'Add New Container' })).toBeVisible({ timeout: 120000 });
  await expect(page.locator('#elementor-loading')).toBeHidden({ timeout: 60000 });
  const closeStructure = page.locator('#elementor-navigator').getByRole('button', { name: /close/i });
  if (await closeStructure.isVisible().catch(() => false)) await closeStructure.click();
  return frame;
}

const panel = page => page.locator('#elementor-panel');
// Responsive controls render one copy per device (name, name_tablet, name_mobile); the visible one is the active device.
const controlSelector = name => [name, `${name}_tablet`, `${name}_mobile`].map(n => `.elementor-control-${n}:visible`).join(', ');
const control = (page, name) => panel(page).locator(controlSelector(name)).first();

async function panelTab(page, name) {
  await page.locator('.elementor-panel-navigation').getByText(name, { exact: true }).click();
}

// Real mouse drag from an Elementor panel item into the canvas iframe (HTML5 drag-and-drop, cross-frame).
async function dragFromPanel(page, category, name, target, where = 'center') {
  if (!(await page.locator('#elementor-panel-elements').isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Add Element' }).click();
  }
  const source = page.locator(`#elementor-panel-category-${category}`).getByText(name, { exact: true });
  await source.scrollIntoViewIfNeeded();
  await target.waitFor();
  const s = await source.boundingBox();
  const t = await target.boundingBox();
  const tx = t.x + t.width / 2;
  const ty = where === 'below' ? t.y + t.height - 2 : t.y + t.height / 2;
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 25; i++) await page.mouse.move(s.x + (tx - s.x) * i / 25, s.y + (ty - s.y) * i / 25);
  await page.mouse.up();
}

// Choose-control option by its (screen-reader) label, e.g. "Center", "Classic".
async function choose(page, controlName, option) {
  await control(page, controlName).locator('label', { hasText: option }).first().click();
}

async function setColor(page, controlName, hex, previewCheck) {
  await control(page, controlName).locator('.pickr button').click();
  const picker = page.locator('.pcr-app.visible');
  const input = picker.getByRole('textbox', { name: 'color input field' });
  await input.fill(hex);
  await input.press('Enter');
  // Elementor's picker closes on an outside click.
  await page.locator('#elementor-panel-header-title').click();
  await expect(picker).toBeHidden();
  if (previewCheck) await previewCheck();
}

async function setTypographySize(page, size) {
  await control(page, 'typography_typography').locator('.elementor-control-popover-toggle-toggle-label').click();
  const popover = panel(page).locator('.elementor-controls-popover:visible').first();
  await expect(popover).toBeVisible();
  await popover.locator(controlSelector('typography_font_size')).first().locator('input[data-setting="size"]').fill(String(size));
  await control(page, 'typography_typography').locator('.elementor-control-popover-toggle-toggle-label').click();
  await expect(popover).toBeHidden();
}

async function setPadding(page, values) {
  const pad = control(page, 'padding');
  const link = pad.getByRole('button', { name: 'Link values together' });
  if (!(await link.evaluate(b => b.classList.contains('unlinked')))) await link.click();
  for (const side of ['top', 'right', 'bottom', 'left']) await pad.locator(`input[data-setting="${side}"]`).fill(String(values[side]));
}

// Top-bar responsive mode (a tablist: "Desktop", "Tablet Portrait (up to …)", "Mobile Portrait (up to …)").
async function device(page, name) {
  await page.getByRole('tab', { name }).click();
}

// Selects an element by name in the Structure (navigator) panel, e.g. "Container" → "Edit Container".
async function selectInStructure(page, name, panelTitle) {
  const nav = page.locator('#elementor-navigator');
  if (!(await nav.isVisible().catch(() => false))) await page.getByRole('button', { name: 'Structure' }).click();
  await nav.getByText(name, { exact: true }).click();
  await expect(page.locator('#elementor-panel-header-title')).toHaveText(panelTitle);
}

async function heroMetrics(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('.trails-hero');
    if (!hero) return null;
    const r = hero.getBoundingClientRect();
    const h1 = hero.querySelector('h1');
    const input = hero.querySelector('#main-search');
    const vw = document.documentElement.clientWidth;
    const inside = [...hero.querySelectorAll('*')].every(e => { const b = e.getBoundingClientRect(); return !b.width || (b.left >= -0.5 && b.right <= vw + 0.5); });
    return {
      vw, scrollWidth: document.documentElement.scrollWidth, width: Math.round(r.width), height: Math.round(r.height),
      // Boxed containers put block padding on .e-con-inner and inline padding on the container itself.
      bg: getComputedStyle(hero).backgroundColor, padding: `${getComputedStyle(hero.querySelector('.e-con-inner') || hero).paddingTop} ${getComputedStyle(hero).paddingRight}`,
      h1: h1 && { text: h1.textContent.trim(), size: getComputedStyle(h1).fontSize, color: getComputedStyle(h1).color, align: getComputedStyle(h1).textAlign, lines: Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight || 1)) },
      text: (hero.querySelector('.elementor-widget-text-editor') || {}).textContent?.trim(),
      input: input && { width: Math.round(input.getBoundingClientRect().width), left: Math.round(input.getBoundingClientRect().left), right: Math.round(input.getBoundingClientRect().right) },
      allInside: inside,
    };
  });
}

// ---------------------------------------------------------------- run

async function run() {
  if (!process.env.WP_USER || !process.env.WP_PASS) throw new Error('WP_USER and WP_PASS must be set in the environment');
  fs.mkdirSync(SHOTS, { recursive: true });
  fs.mkdirSync(EXPORT_DIR, { recursive: true });

  // Phase 1 — pre-flight
  const home = await fetch(BASE + '/');
  const loginPage = await fetch(BASE + '/wp-login.php');
  check(home.ok, `pre-flight: site reachable (HTTP ${home.status})`);
  check(loginPage.ok, `pre-flight: login reachable (HTTP ${loginPage.status})`);
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  check(true, `pre-flight: Playwright browser launched (${browser.version()})`);

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  activePage = page;
  const editorErrors = [];
  page.on('pageerror', e => editorErrors.push(`after "${report.steps[report.steps.length - 1] || 'start'}": ${e.message} @ ${(e.stack || '').split('\n').slice(1, 3).join(' / ').trim().slice(0, 220)}`));

  // Phase 3 — identify the page with the hero from the public front page
  await page.goto(BASE + '/');
  const pageId = Number((await page.locator('body').getAttribute('class')).match(/page-id-(\d+)/)[1]);
  step(`front page id ${pageId} (${await page.title()})`);

  // Phase 2 — login
  await login(page);
  check(true, 'login: authenticated (admin bar visible)');
  await page.goto(BASE + '/wp-admin/edit.php?post_type=page');
  const row = page.getByRole('row').filter({ has: page.getByRole('link', { name: /Edit with Elementor/i }) }).filter({ hasText: 'Front Page' }).first();
  const pageTitle = (await row.locator('a.row-title').innerText()).trim();
  step(`page: "${pageTitle}" #${pageId}, public ${BASE}/, editor ${BASE}/wp-admin/post.php?post=${pageId}&action=elementor`);
  report.page = { title: pageTitle, id: pageId, publicUrl: BASE + '/', editorUrl: `${BASE}/wp-admin/post.php?post=${pageId}&action=elementor` };

  // Phase 4/5 — open editor (empty document: the hero was hardcoded in the theme template)
  let frame = await openEditor(page, pageId);
  const existing = await frame.locator(`.elementor-${pageId} .elementor-element`).count();
  check(existing === 0, `editor: document empty before rebuild (${existing} elements)`);
  await page.screenshot({ path: path.join(SHOTS, 'elementor-editor-before.png') });

  // Phase 6 — rebuild: Container
  await dragFromPanel(page, 'layout', 'Container', frame.locator('#elementor-add-new-section .elementor-add-section-inner'));
  const hero = frame.locator(`.elementor-${pageId} > .e-con, .elementor-${pageId} .e-con.e-parent`).first();
  await expect(hero).toBeVisible();
  await expect(page.locator('#elementor-panel-header-title')).toHaveText('Edit Container');
  step('container added (Layout → Container, flex column)');
  await panelTab(page, 'Layout');
  await choose(page, 'flex_align_items', 'Center');
  await panelTab(page, 'Style');
  await choose(page, 'background_background', 'Classic');
  await setColor(page, 'background_color', HERO.background, () =>
    expect.poll(() => hero.evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(12, 107, 79)'));
  await panelTab(page, 'Advanced');
  await setPadding(page, { top: 32, right: 20, bottom: 32, left: 20 });
  await control(page, 'css_classes').locator('input[data-setting="css_classes"]').fill('trails-hero');
  step('container: align items center, background #0C6B4F, padding 32/20, CSS class trails-hero');

  // Heading
  await dragFromPanel(page, 'basic', 'Heading', hero.locator('.elementor-empty-view').first());
  const heading = hero.locator('.elementor-widget-heading').first();
  await expect(heading).toBeVisible();
  await control(page, 'title').locator('textarea[data-setting="title"]').fill(HERO.heading);
  await control(page, 'header_size').locator('select[data-setting="header_size"]').selectOption('h1');
  await expect(heading.locator('h1')).toHaveText(HERO.heading);
  await panelTab(page, 'Style');
  await choose(page, 'align', 'Center');
  await setColor(page, 'title_color', '#FFFFFF', () =>
    expect.poll(() => heading.locator('h1').evaluate(e => getComputedStyle(e).color)).toBe('rgb(255, 255, 255)'));
  await setTypographySize(page, 32);
  step('heading: H1 "Tropic Hiking Trails", centered, white, 32px');

  // Text Editor (below the heading)
  await dragFromPanel(page, 'basic', 'Text Editor', heading, 'below');
  const text = hero.locator('.elementor-widget-text-editor').first();
  await expect(text).toBeVisible();
  const editorControl = control(page, 'editor');
  await editorControl.getByRole('button', { name: 'Code' }).click();
  const textarea = editorControl.locator('textarea.wp-editor-area');
  await textarea.fill(HERO.text);
  await textarea.press('End');
  await expect(text).toHaveText(HERO.text);
  await panelTab(page, 'Style');
  await choose(page, 'align', 'Center');
  await setColor(page, 'text_color', '#FFFFFF', () =>
    expect.poll(() => text.evaluate(e => getComputedStyle(e).color)).toBe('rgb(255, 255, 255)'));
  await setTypographySize(page, 16);
  step('text editor: "Find your next trail with MyRehat", centered, white, 16px');

  // HTML widget with the header search input (keeps #main-search used by trails.js / A10)
  await dragFromPanel(page, 'general', 'HTML', text, 'below');
  const htmlWidget = hero.locator('.elementor-widget-html').first();
  await expect(htmlWidget).toBeVisible();
  await control(page, 'html').locator('.ace_content').click();
  await page.keyboard.insertText(HERO.searchHtml);
  await expect(htmlWidget.locator('#main-search')).toBeVisible();
  await panelTab(page, 'Advanced');
  await control(page, '_element_width').locator('select').selectOption({ label: 'Full Width (100%)' });
  step('html: search input #main-search, full width');

  // Order check: heading → text → search
  const order = await hero.locator('.elementor-widget').evaluateAll(ws => ws.map(w => w.getAttribute('data-widget_type')));
  check(JSON.stringify(order) === JSON.stringify(['heading.default', 'text-editor.default', 'html.default']), `structure order: ${order.join(' → ')}`);
  await page.screenshot({ path: path.join(SHOTS, 'elementor-editor-after-desktop.png') });

  // Mobile (Elementor mobile breakpoint ≤767px): smaller heading, tighter padding
  await device(page, /Mobile Portrait/);
  await expect.poll(() => page.locator('#elementor-preview-iframe').evaluate(f => f.getBoundingClientRect().width)).toBeLessThan(500);
  await selectInStructure(page, 'Heading', 'Edit Heading');
  await panelTab(page, 'Style');
  await setTypographySize(page, 28);
  await selectInStructure(page, 'Container', 'Edit Container');
  await panelTab(page, 'Advanced');
  await setPadding(page, { top: 24, right: 16, bottom: 24, left: 16 });
  step('mobile: heading 28px, container padding 24/16');
  await page.screenshot({ path: path.join(SHOTS, 'elementor-editor-after-mobile.png') });
  await device(page, 'Desktop');

  // Phase 7 — Publish and confirm the save request succeeded
  const [saveResponse] = await Promise.all([
    page.waitForResponse(r => r.url().includes('admin-ajax.php') && (r.request().postData() || '').includes('save_builder'), { timeout: 60000 }),
    page.getByRole('button', { name: 'Publish', exact: true }).click(),
  ]);
  const saveJson = await saveResponse.json();
  const saved = saveJson.success === true && saveJson.data.responses.save_builder.success === true;
  check(saved, `publish: save_builder success=${saved} (HTTP ${saveResponse.status()})`);
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeDisabled({ timeout: 15000 });
  await page.screenshot({ path: path.join(SHOTS, 'elementor-after-save.png') });

  // Reload the editor: the hero must persist
  frame = await openEditor(page, pageId);
  await expect(frame.locator('.trails-hero h1')).toHaveText(HERO.heading);
  check(true, 'reload: hero persisted in editor after publish');

  // Phase 9 — Save the hero container as a site template
  await frame.locator('.trails-hero').click({ button: 'right', position: { x: 50, y: 20 } });
  const menu = page.locator('.elementor-context-menu:visible').first();
  await menu.locator('.elementor-context-menu-list__item').filter({ hasText: 'Save as a template' }).click();
  const modal = page.locator('#elementor-template-library-modal');
  await modal.getByPlaceholder('Give your template a name').fill(TEMPLATE_NAME);
  const siteTemplates = modal.getByRole('checkbox', { name: 'Site Templates' });
  await siteTemplates.check();
  await expect(siteTemplates).toBeChecked();
  await expect(modal.locator('#elementor-template-library-save-template-submit')).toBeEnabled();
  const [templateResponse] = await Promise.all([
    page.waitForResponse(r => r.url().includes('admin-ajax.php') && (r.request().postData() || '').includes('save_template'), { timeout: 60000 }),
    modal.locator('#elementor-template-library-save-template-submit').click(),
  ]);
  const templateJson = await templateResponse.json();
  const templateId = templateJson.data?.responses?.save_template?.data?.template_id;
  check(templateJson.success === true && !!templateId, `save as template: "${TEMPLATE_NAME}" #${templateId}`);
  report.templateId = templateId;
  // WordPress core's wp-auth-check.js throws on a heartbeat tick inside the Elementor editor even on an untouched post
  // (its `wrap` is set on document-ready); it is recorded separately and does not come from the hero or the theme.
  const coreAuthCheck = editorErrors.filter(e => e.includes('wp-auth-check'));
  const otherEditorErrors = editorErrors.filter(e => !e.includes('wp-auth-check'));
  if (coreAuthCheck.length) report.knownCoreEditorErrors = coreAuthCheck;
  check(otherEditorErrors.length === 0, `editor: no page errors from the hero/theme ${otherEditorErrors.length ? JSON.stringify(otherEditorErrors.slice(0, 3)) : ''}${coreAuthCheck.length ? ` (known WP core wp-auth-check heartbeat error seen ${coreAuthCheck.length}×)` : ''}`);

  // Phase 8 — public verification (fresh, logged-out context so no editor cache)
  const pub = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pp = await pub.newPage();
  const publicErrors = [];
  pp.on('pageerror', e => publicErrors.push(e.message));
  pp.on('console', m => { if (m.type() === 'error') publicErrors.push(m.text()); });
  await pp.goto(BASE + '/?nocache=' + Date.now());
  await expect(pp.locator('.trails-hero h1')).toHaveText(HERO.heading);
  const desktop = await heroMetrics(pp);
  report.desktop = desktop;
  check(desktop.scrollWidth === desktop.vw && desktop.allInside, `public 1440: no overflow (scrollWidth ${desktop.scrollWidth}/${desktop.vw})`);
  check(desktop.bg === 'rgb(12, 107, 79)' && desktop.h1.color === 'rgb(255, 255, 255)' && desktop.h1.size === '32px' && desktop.h1.align === 'center', `public 1440: h1 32px white centered on #0C6B4F (padding ${desktop.padding})`);
  check(desktop.text === HERO.text && desktop.input && desktop.input.width === 420, `public 1440: text + 420px search input (${desktop.input && desktop.input.left}–${desktop.input && desktop.input.right})`);
  check(await pp.locator('.site-header-trails').count() === 0, 'public: old hardcoded hero replaced by Elementor hero');
  await pp.locator('.trails-hero').screenshot({ path: path.join(SHOTS, 'elementor-after-desktop.png') });
  await pp.screenshot({ path: path.join(SHOTS, 'elementor-public-after.png'), fullPage: true });
  const broken = await pp.$$eval('img', imgs => imgs.filter(i => i.complete && i.naturalWidth === 0).length);
  check(broken === 0, `public: no broken images (${broken})`);
  // Header search (A10) still drives the listing from inside the Elementor hero
  await pp.locator('#main-search').fill('kinabalu');
  await pp.locator('#main-search').dispatchEvent('input');
  await expect(pp.locator('.trail-card:visible')).toHaveCount(1);
  check(await pp.locator('#search-box').inputValue() === 'kinabalu', 'public: header search in the Elementor hero still filters the listing and syncs');

  await pp.setViewportSize({ width: 390, height: 844 });
  await pp.goto(BASE + '/?nocache=' + Date.now());
  const mobile = await heroMetrics(pp);
  report.mobile = mobile;
  check(mobile.scrollWidth === 390 && mobile.allInside, `public 390: no horizontal overflow (scrollWidth ${mobile.scrollWidth})`);
  check(mobile.h1.size === '28px' && mobile.padding === '24px 16px', `public 390: h1 ${mobile.h1.size} (${mobile.h1.lines} line(s)), padding ${mobile.padding}`);
  await pp.locator('.trails-hero').screenshot({ path: path.join(SHOTS, 'elementor-after-390.png') });
  const cta = pp.locator('#main-search');
  await cta.tap().catch(() => cta.click());
  check(await cta.evaluate(e => document.activeElement === e) && mobile.input.right <= 390, `public 390: search input tappable, within viewport (${mobile.input.left}–${mobile.input.right})`);
  await pp.screenshot({ path: path.join(SHOTS, 'elementor-public-after-390.png'), fullPage: true });
  check(publicErrors.length === 0, `public: no console errors ${publicErrors.length ? JSON.stringify(publicErrors.slice(0, 3)) : ''}`);
  await pub.close();

  // Phase 9 — export the saved template from Templates → Saved Templates (real download)
  await page.goto(BASE + '/wp-admin/edit.php?post_type=elementor_library&tabs_group=library');
  const templateRow = page.getByRole('row').filter({ hasText: TEMPLATE_NAME }).first();
  await templateRow.hover();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    // Elementor labels the action by template type ("Export Container"); it calls library_action=export_template.
    templateRow.getByRole('link', { name: /^Export (Container|Template)$/ }).click(),
  ]);
  const suggested = download.suggestedFilename();
  const exportPath = path.join(EXPORT_DIR, 'hero-template.json');
  await download.saveAs(exportPath);
  step(`export: downloaded "${suggested}" → artifacts/elementor/hero-template.json`);
  report.export = { suggestedFilename: suggested, file: 'artifacts/elementor/hero-template.json' };

  // Phase 10 — validate the exported JSON
  const raw = fs.readFileSync(exportPath, 'utf8');
  let json = null;
  try { json = JSON.parse(raw); } catch (e) { /* reported below */ }
  check(!!json, `json: parses (${raw.length} bytes, starts with ${JSON.stringify(raw.slice(0, 1))})`);
  if (json) {
    const all = [];
    const walk = els => (els || []).forEach(e => { all.push(e); walk(e.elements); });
    walk(json.content);
    const types = all.map(e => e.elType === 'widget' ? e.widgetType : e.elType);
    check(typeof json.version === 'string' && Array.isArray(json.content) && json.type === 'container', `json: Elementor template structure (version ${json.version}, type ${json.type}, title "${json.title}")`);
    check(types.includes('container') && types.includes('heading') && types.includes('text-editor') && types.includes('html'), `json: hero elements ${types.join(', ')}`);
    const headingEl = all.find(e => e.widgetType === 'heading');
    check(headingEl && headingEl.settings.title === HERO.heading && headingEl.settings.header_size === 'h1', 'json: heading "Tropic Hiking Trails" (h1) present');
    check(raw.includes('main-search'), 'json: search input #main-search present');
    const secrets = [process.env.WP_PASS, process.env.WP_USER].filter(Boolean).some(s => raw.includes(s)) || /password|passwd|secret|api[_-]?key|token/i.test(raw);
    check(!secrets, 'json: no credential exposure');
    report.json = { version: json.version, type: json.type, title: json.title, elements: types };
  }

  await browser.close();
  fs.writeFileSync(path.join(EXPORT_DIR, 'run-report.json'), JSON.stringify(report, null, 2));
  const failed = report.checks.filter(c => !c.ok).length;
  console.log(`\n${report.checks.length - failed}/${report.checks.length} checks passed`);
  process.exitCode = failed ? 1 : 0;
}

run().catch(async e => {
  console.error('ERROR', e.message.split('\n').slice(0, 3).join(' | '));
  if (process.env.DEBUG_SHOT && activePage) await activePage.screenshot({ path: process.env.DEBUG_SHOT }).catch(() => {});
  process.exit(1);
});
