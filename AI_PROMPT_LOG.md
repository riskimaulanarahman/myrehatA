# AI Prompt Log

---

## Task A1 — Listing Search

Date:
`2026-10-23 14:59`

### Request

Fix the listing search: typing in the search input did not filter the trail listing. It should filter live, ignore case, show all listings when empty, and add no new JavaScript errors.

### AI Instruction

Senior WordPress Engineer / Frontend Debugger role, working one task at a time with a fixed workflow: audit → root cause → minimal fix → verify → regression check → git diff review → prompt log → report → wait for confirmation. Scope is A1 only: no category dropdown (A2), no header search (A10), no booking changes.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php` (listing markup, search input, cards, empty-state element)
- `wp-content/themes/myrehat-test/trails.js` (search logic)
- `wp-content/themes/myrehat-test/functions.php` (script enqueue: footer, no dependencies, loaded on all pages)
- `wp-content/themes/myrehat-test/style.css`
- `.gitignore`, theme/plugin directory listing (`hello-elementor` is the parent theme, `myrehat-test` is the active child theme)

### Files Changed

- `wp-content/themes/myrehat-test/trails.js`

### Root Cause

1. `trails.js` selected `#searchInput`, but the template's input has `id="search-box"`. `getElementById` returned `null`, so `input.addEventListener(...)` threw `TypeError: Cannot read properties of null` and stopped the script. No listener was ever attached.
2. A second latent bug: the empty-state lookup used `#no-results`, but the element is `#trails-no-results`. Once bug 1 was fixed, `emptyMsg.hidden = ...` would have thrown on the first keystroke.

### Changes Made

- Corrected the selectors to `#search-box` and `#trails-no-results`.
- Moved the filtering into a named `filterTrails()` function so A2 and A10 can reuse it instead of adding separate logic.
- Search text = the card's visible text (title, location, price) plus its `data-category`. Matching ignores case, and the query is trimmed.
- An empty query shows all cards.
- Attach the listener only if the search input and cards exist, and guard the empty-state element against `null`. The script is enqueued on every page.

### Verification

- `node --check trails.js`: syntax OK.
- Headless Chrome (Playwright + installed Google Chrome) against a static harness built from `page-trails.php` (PHP tags stripped) with the real `style.css` and `trails.js`. Typed input:
  - `""` → 6/6 · `mount` → 2 · `MOUNT` → 2 (ignores case) · `"  Sabah  "` → 1 (trimmed, location) · `pahang` → 1 (location) · `beach` / `FOREST` → 2 each (category) · `rm 350` → 1 · `zzzz` → 0 and the "No trails found." message shows · cleared → 6/6 and the message hides.
  - No console or page errors on the trails page.
- Not verified: the live WordPress page. No WordPress instance is running locally (`localhost` serves the default Apache page, and there is no Docker or WP-CLI).

### Regression Check

- `#main-search` (header) still does not filter. Confirmed unchanged, since it is A10 scope.
- Category `<select>` untouched (A2 scope).
- On a page without the listing, the original script and the fixed script both throw exactly one `TypeError`. Before the fix it came from the search code. Now it comes from the unchanged `booking-form` listener, so this is not a new error.
- Booking submit handler code unchanged.

### Result

`PARTIAL`. The search works and every acceptance criterion passed in a real browser using the template markup. Still to do: one manual check on the live WordPress trails page.

### Remaining Notes

- Findings for other tasks:
  - A2: category `<select id="category">` has no listener. Its option values match `data-category` (`mountain`/`beach`/`forest`).
  - A10: `#main-search` has no listener.
  - A9/A12: `document.getElementById('booking-form')` has no `null` guard, so it throws on every page without the form. Its submit handler shows a fake "Booking request received!" alert without any server request. Now that the script no longer stops early, this alert is active on the trails page.
  - A5: heading reads `Hiking Advantures`.
  - A4: footer has extra links (Blog, Careers, Terms of Service, Sitemap, Twitter), and the label "Privacy Policy Statement" differs from the target.
  - A7: `.trail-card { min-width: 320px }` inside a non-wrapping flex row, and `.trails-promo { display: none }` under 600px.
  - Outside A1–A12: `functions.php` has PHP issues marked as planted: missing text domain, raw `$_POST` with no nonce or sanitization, and the `add_action` arg count. The booking handler issues may matter for A6/A9/A11/A12.

---

## Task A2 — Category Filter

Date:
`2026-10-23 15:04`

### Request

Make the category dropdown filter the listing, combined with the A1 search (`visible = matchesSearch && matchesCategory`). It must use one reusable filter, update live, add no duplicate listeners, and produce no console errors.

### AI Instruction

Same per-task workflow as A1, scoped to A2 only. Reuse the A1 filter function instead of adding a second filter mechanism. Do not touch the header search (A10) or the booking code.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php` (`<select id="category">` options, `data-category` on cards)
- `wp-content/themes/myrehat-test/trails.js` (A1 `filterTrails()`)
- `wp-content/themes/myrehat-test/style.css` (no category-related rules)

### Files Changed

- `wp-content/themes/myrehat-test/trails.js`

### Root Cause

Nothing handled the category dropdown: `#category` was never selected in JS and had no `change` listener. The markup was already correct. Option values `mountain`/`beach`/`forest` match the cards' `data-category` values exactly, and `all` is the default.

### Changes Made

- Added a `categorySelect` reference (`#category`).
- Extended the existing `filterTrails()` into the single filter: `matchesSearch && matchesCategory`, where `all` matches every card. It reads the current state of both controls on every call, so either control re-filters using both.
- Attached one `change` listener on the select that calls the same `filterTrails`. Each control is guarded on its own, so a missing control does not break the other.

### Verification

- `node --check trails.js`: syntax OK.
- Headless Chrome, same static harness built from `page-trails.php` with the real CSS and JS:
  - Category only: all → 6, mountain → 2, beach → 2, forest → 2, back to all → 6.
  - Combined: `sunset`+beach → 1 · `mount`+mountain → 2 · `sabah`+mountain → 1 · `mount`+beach → 0 and the "No trails found." message shows · `mount`+all → 2 (search kept).
  - Category chosen first, then typing `pahang` with forest → only Taman Negara (typing respects the category).
  - Duplicate listeners, checked via CDP `DOMDebugger.getEventListeners`: `#search-box` has one `input` listener and `#category` has one `change` listener.
  - No console or page errors.
- Not verified: the live WordPress page (no running instance, same as A1).

### Regression Check

- A1 search test suite re-run: all pass.
- Header `#main-search` still does not filter (A10 scope, unchanged).
- Non-listing page: same single pre-existing `booking-form` `TypeError` as after A1. No new error.

### Result

`PARTIAL`. All acceptance criteria pass in a real browser on the template markup. Still to do: a manual check on the live WordPress page.

### Remaining Notes

- The brief's example `beach` + `family` cannot be reproduced because there is no `family` category in the markup. Available categories: Mountain, Beach, Forest. The filter reads option values directly, so adding a matching `<option>` and `data-category` later needs no JS change.
- Findings for other tasks: unchanged from A1 (A4, A5, A7, A9/A12, A10, and the `functions.php` handler issues).

---

## Task A3 — WhatsApp and LINE Sticky Buttons

Date:
`2026-10-23 15:09`

### Request

Add WhatsApp and LINE buttons at the top of the page. They must be sticky, bold, clearly visible, and responsive, must not cover the navigation, and must not cause horizontal overflow. Use existing contact data if it exists, and never invent destination URLs.

### AI Instruction

Same per-task workflow, scoped to A3 only. Do not touch the footer (A4/A8), heading (A5), or the mobile layout bugs (A7).

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php`, `style.css`, `functions.php`
- `wp-content/themes/hello-elementor/header.php`, `template-parts/header.php` (parent header and nav markup)
- `wp-content/themes/hello-elementor/assets/css/reset.css`, `theme.css`, `header-footer.css` (sticky/overflow/link rules)
- `wp-content/uploads/elementor/css/post-4.css` (Elementor kit)
- `wp-includes/css/admin-bar.css` (admin-bar height variable and position)
- Repo-wide search for `wa.me`, `whatsapp`, `line.me`, `lin.ee` in the theme and uploads: no matches.

### Files Changed

- `wp-content/themes/myrehat-test/page-trails.php`
- `wp-content/themes/myrehat-test/style.css`

### Root Cause

Missing feature: the template had no contact buttons. No WhatsApp number or LINE URL exists anywhere in the theme files or uploads. The database is not reachable in this environment, so theme options and Customizer settings could not be checked.

### Changes Made

- `page-trails.php`: added `<nav class="trails-contact-bar" aria-label="Contact">` right after `get_header()`, so it sits in normal flow below the parent theme's nav.
  - Destinations come from two new filters, `myrehat_test_whatsapp_url` and `myrehat_test_line_url`, which default to empty. Each URL goes through `esc_url()` before use.
  - With a valid URL, the button is `<a href target="_blank" rel="noopener">`.
  - Without one (including a URL `esc_url` rejects, such as `javascript:`), the button is a plain `<span>` label. No placeholder or invented URL is used.
- `style.css`:
  - `.trails-contact-bar` is `position: sticky; top: 0; z-index: 100` with a white background, wraps on narrow screens, and is centred.
  - Pill buttons, `font-weight: 700`, 40px minimum height. WhatsApp `#075e54` (contrast 7.67:1), LINE `#00873c` (4.63:1), both with white text.
  - When logged in, the bar offsets by `--wp-admin--admin-bar--height`. Under 600px it resets to `top: 0`, because WP makes the admin bar non-fixed there.
- A first attempt rendered pending buttons as `<a>` without `href`. The browser test caught it: the parent reset's `a:not([href]):not([tabindex]) { color: inherit }` overrode the white text (contrast 1.65). Switching pending buttons to `<span>` fixed it at the root.

### Verification

- `php -l page-trails.php`: no syntax errors.
- Rendered the real template through PHP with small WP function stubs (mock parent header and nav, with the parent theme's `reset.css`, `theme.css`, `header-footer.css` loaded) and tested in headless Chrome at 1280×800 and 390×844:
  - Both buttons render with labels WhatsApp and LINE, `font-weight: 700`, 40px tall, inside the viewport, contrast ≥ 4.5:1.
  - The bar's `scrollWidth` equals its `clientWidth` (1280 / 390), so the bar itself does not overflow.
  - At load the bar sits directly below the nav (nav bottom = bar top), and a nav link is hit-testable (not covered).
  - After scrolling 600px the bar's top is 0 (sticky works with the parent's `body { overflow-x: clip }`), and the button is the top-most element at its position.
  - Simulated logged-in admin bar: sticky top is 32px on desktop and 0 at 390px.
  - With a WhatsApp URL set via the filter: `<a>` rendered with the URL escaped (`&amp;`, `&quot;`), and hover contrast 7.67:1. A `javascript:` LINE URL fell back to a `<span>`.
  - No page errors. Screenshots reviewed at 390px (top and scrolled).
- Not verified: the live WordPress page, Elementor dynamic header (`hello_header_footer_experiment_active`), and a real logged-in admin bar.

### Regression Check

- A1 search suite and A2 category suite re-run on the new markup: all pass.
- Page overflow compared with the original template at 1280px and 390px: identical (`scrollWidth` 2150 / 2010, same widest element), so the bar adds no overflow. The existing overflow comes from the trail cards (A7).

### Result

`PARTIAL`. The buttons are implemented and every visual and behavioural criterion passed in a real browser using the parent theme CSS. Still to do: the final WhatsApp and LINE destination URLs (none exist in the project), and a check on the live WordPress page.

### Remaining Notes

- To activate the links, add the final URLs from a plugin or `functions.php` (values are placeholders):
  `add_filter( 'myrehat_test_whatsapp_url', fn() => 'https://wa.me/<number>' );`
  `add_filter( 'myrehat_test_line_url', fn() => 'https://line.me/R/ti/p/<id>' );`
- Findings for other tasks:
  - A7: the parent `reset.css` sets `body { overflow-x: clip }`, yet `documentElement.scrollWidth` is still 2010 at 390px because of the trail cards. Investigate in A7.
  - Other findings unchanged.

---

## Task A4 — Footer Links

Date:
`2026-10-23 15:11`

### Request

The footer navigation links must be exactly FAQ, Contact Us, PDPA, Privacy Policy. Remove Twitter and every other link without breaking the footer wrapper or layout. Social icons are A8, not this task.

### AI Instruction

Same per-task workflow. The user authorised running A4 to A12 back to back ("auto lanjut sampai task 12"), so there is no stop between tasks, but each task is still logged and verified separately.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php` (`.trails-footer nav`, hardcoded)
- `wp-content/themes/hello-elementor/footer.php`, `template-parts/footer.php` (parent footer: WP menu location `menu-2`, shown only if a menu is assigned)
- `wp-content/themes/myrehat-test/style.css` (footer rules)

### Files Changed

- `wp-content/themes/myrehat-test/page-trails.php`

### Root Cause

The hardcoded footer `<nav>` contained 9 links: the 4 required ones plus Blog, Careers, Terms of Service, Sitemap, Twitter. The fourth required link was labelled "Privacy Policy Statement" instead of "Privacy Policy".

### Changes Made

- Removed Blog, Careers, Terms of Service, Sitemap, Twitter.
- Renamed "Privacy Policy Statement" to "Privacy Policy".
- `<footer>`, `<nav>`, copyright, and CSS are unchanged. The existing `href="#"` placeholders are kept, since no real URLs exist in the project.

### Verification

- `php -l`: OK. Rendered through the PHP stub harness (now a reusable `build.sh` that renders the current template with the parent theme CSS) in headless Chrome at 1280px and 390px:
  - Footer links are exactly `["FAQ","Contact Us","PDPA","Privacy Policy"]`, in that order.
  - No "Twitter" text anywhere in the footer.
  - Nav `scrollWidth` equals `clientWidth` (1240 / 350), and links fit on one row at both widths.
  - Copyright kept. No page errors.
  - Screenshot at 390px reviewed.
- Not verified: whether a WP menu is assigned to the parent's `menu-2` location (database not reachable). If one is, it renders as a separate parent footer and should be checked in WP Admin → Appearance → Menus.

### Regression Check

- A1 and A2 test suites: all pass.

### Result

`PARTIAL`. The template's footer link group meets all criteria, verified in the browser. Still to check on the live site: any DB-driven footer menu.

### Remaining Notes

- Link destinations are still `#` placeholders (pre-existing). Privacy Policy could later use `get_privacy_policy_url()` once a privacy page is set in WP.

---

## Task A5 — Heading

Date:
`2026-10-23 15:12`

### Request

The page heading must read exactly `Tropic Hiking Trails`, with exact capitalisation, spacing, and spelling. No other headings may change.

### AI Instruction

Same per-task workflow (A4–A12 run back to back as authorised by the user). Find the real source of the heading (template, PHP, shortcode, Elementor, theme option, or JS) before changing anything.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php`
- `wp-content/themes/myrehat-test/functions.php` (no `the_title`, `wp_title`, or `document_title` filters)
- `wp-content/themes/myrehat-test/trails.js` (does not write to any heading or to `document.title`)
- `wp-content/uploads` (no Elementor data mentioning the heading)

### Files Changed

- `wp-content/themes/myrehat-test/page-trails.php`

### Root Cause

The heading is hardcoded in the template as `<h1>Hiking Advantures</h1>`. The text is wrong and "Adventures" is misspelled. No other source overrides it.

### Changes Made

- `<h1>Hiking Advantures</h1>` changed to `<h1>Tropic Hiking Trails</h1>`. The tagline and all other headings are unchanged.

### Verification

- `php -l`: OK. Headless Chrome at 1280px and 390px, after a 200ms wait for any late script:
  - There is exactly one `h1`. Its `textContent` and rendered `innerText` both equal `Tropic Hiking Trails`.
  - The `h1` stays within the viewport.
  - The other 7 headings (6 card `h3`s and "Book a guided hike") are unchanged. No page errors.
- `grep "Advantures"` in the template returns 0 matches.
- Not verified: the live page. The WP page's own post title (database) is a separate value. This custom template does not output it.

### Regression Check

- A1, A2, A4 test suites: all pass.

### Result

`PARTIAL`. The heading is exact and verified in the browser. Still to do: a check on the live WordPress page.

### Remaining Notes

- If the browser-tab `<title>` should also say "Tropic Hiking Trails", that comes from the WP page title in WP Admin (database), not from this template.

---

## Task A6 — Digital Nomad Field

Date:
`2026-10-23 15:14`

### Request

Add a required "Digital Nomad" field with options Ya and Tidak to the booking form. Validate it in the frontend where possible and in the server handler. The server must accept only `Ya` or `Tidak`.

### AI Instruction

Same per-task workflow (A4–A12 run back to back as authorised). Check for a form builder, JS validation, AJAX, the PHP handler, storage, and confirmation before changing anything. Do not take on A9/A11/A12 work.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php` (`#booking-form`)
- `wp-content/themes/myrehat-test/functions.php` (`myrehat_test_booking_handler` on `template_redirect`)
- `wp-content/themes/myrehat-test/trails.js` (submit listener)
- `wp-content/plugins/` (Akismet, Elementor free, File Manager Advanced, Hello Dolly: no form builder)

### Files Changed

- `wp-content/themes/myrehat-test/functions.php`
- `wp-content/themes/myrehat-test/page-trails.php`
- `wp-content/themes/myrehat-test/style.css`

### Root Cause

Missing field: the plain-HTML form had no Digital Nomad input, and the server handler had no validation. Note on the flow: the form has no `method`, `action`, or `trails_booking` marker, and `trails.js` cancels the submit with an alert. So nothing reaches the server handler today. That flow is fixed in A12.

### Changes Made

- `functions.php`:
  - `myrehat_test_digital_nomad_options()` defines the allowed values once, as `['Ya','Tidak']`.
  - New `myrehat_test_validate_booking( $input )` returns `[ $booking, $errors ]`. It unslashes and sanitises `digital_nomad`, then does a strict `in_array` against the allowed list. Missing, empty, wrong-case, arbitrary, or array values produce an error message. A9 and A11 will extend this same helper.
  - `myrehat_test_booking_handler()` now calls the validator, returns without storing anything if there are errors, and stores the validated `digital_nomad` with the date. The transient value changed from a date string to an array; nothing else reads `trails_last_booking`.
- `page-trails.php`: added `<fieldset class="trails-choice"><legend>Digital Nomad</legend>` with one required radio per allowed option, rendered from the same PHP list and escaped with `esc_attr` / `esc_html`.
- `style.css`: compact bordered fieldset with a bold legend, wrapping inline radio labels.

### Verification

- `php -l` on both PHP files: OK.
- Server, PHP CLI running the real `functions.php` with WP API stubs:
  - Validator: `Ya` and `Tidak` accepted. Missing, empty, `ya`, `Maybe`, `<b>Ya</b>x`, and `['Ya']` rejected with an error. `" Ya "` normalised to `Ya`.
  - Handler: invalid and missing values are not stored. A valid booking is stored as `{"digital_nomad":"Tidak","date":"2026-11-01"}`.
- Browser (harness now renders the template with the real `functions.php`), headless Chrome at 1280px and 390px:
  - Legend reads "Digital Nomad". Options are Ya and Tidak, both `required`.
  - Submitting without a choice is blocked natively ("Please select one of these options."); the submit handler does not run.
  - Ya and Tidak are each selectable by clicking their label and are mutually exclusive.
  - With a choice made, submit goes through to the existing handler.
  - Fieldset fits the viewport. No page errors. Screenshot at 390px reviewed.

### Regression Check

- A1, A2, A4, A5 test suites: all pass. Name and Date fields unchanged.

### Result

`PARTIAL`. The field, frontend validation, and server validation are implemented and tested. The full browser-to-server booking flow can't be exercised until A12 connects the form to the handler, and the live WP page is not tested.

### Remaining Notes

- The handler still has the pre-existing problems flagged in the file as "BUG P2": raw `date`, no nonce. These are left for A12, where the form is actually connected to the server.

---

## Task A7 — Mobile 390px

Date:
`2026-10-23 15:16`

### Request

At about 390px no important section may be hidden, and the page must not scroll horizontally. Navigation, buttons, and the booking form must stay usable, and desktop must not break. Find the root cause instead of relying on `overflow-x: hidden`.

### AI Instruction

Same per-task workflow (A4–A12 run back to back as authorised). Measure the overflowing elements and hidden sections before editing. Fix the cause, not the symptom.

### Files Inspected

- `wp-content/themes/myrehat-test/style.css`
- `wp-content/themes/myrehat-test/page-trails.php`
- `wp-content/themes/hello-elementor/assets/css/reset.css` (`body { overflow-x: clip }`), `theme.css`, `header-footer.css`
- Elementor responsive visibility: not applicable. This template has no Elementor content, and `post-4.css` holds only kit variables.

### Files Changed

- `wp-content/themes/myrehat-test/style.css`

### Root Cause

Measured in headless Chrome by listing every element outside the viewport and every hidden section:

1. **Horizontal overflow:** `.trails-cards { display: flex }` does not wrap, and every `.trail-card` has `min-width: 320px`. Six cards made the row about 2010px wide at 390px (2150px at 1280px, so desktop overflowed as well). The cards and their children were the only offenders. The parent's `body { overflow-x: clip }` did not prevent it: `window.scrollTo(200, 0)` actually scrolled.
2. **Missing section:** `@media (max-width: 600px) { .trails-promo { display: none; } }` hid the promo banner on mobile.

### Changes Made

- `.trails-cards`: added `flex-wrap: wrap`.
- `.trail-card`: replaced `min-width: 320px` with `flex: 1 1 260px; min-width: 0`. The result is 1 column below about 570px, 2 columns at 768px, and 3 at 1000px+.
- Removed `.trails-promo { display: none; }` from the 600px media query. The promo text wraps naturally.
- No `overflow-x: hidden` or other overflow masking was added.

### Verification

Headless Chrome at 320, 360, 390, 768, and 1280px, using mobile emulation below 768px:
- `scrollWidth` equals `clientWidth` at every width, and `scrollTo(200, 0)` leaves `scrollX` at 0.
- No element extends outside the viewport. The same checks were repeated with the parent CSS removed (no `overflow-x: clip`), and all passed, which shows the fix removes the cause rather than hiding it.
- All sections are shown: contact bar, header, promo, search row, cards, booking section and form, footer.
- The submit button, name input, search, category select, contact button, and footer link are hit-testable at their centre. Card text is not clipped.
- Card columns: 1, 1, 1, 2, 3 at 320, 360, 390, 768, 1280px.
- No page errors. Full-page screenshot at 390px reviewed (sections, wrapping, form within the viewport).

### Regression Check

- A1, A2, A4, A5, A6 suites: all pass.
- A3: every functional check passes (sticky, bold, contrast, nav not covered, admin-bar offset). Its two "overflow unchanged vs original template" baseline assertions now fail as expected, because the original overflow (2010 / 2150px) is gone (390 / 1280px).
- Desktop 1280px: 3-column card grid with no overflow (previously cards ran off-screen).

### Result

`PARTIAL`. The overflow and the hidden section are fixed at the root and verified across five widths. Still to do: a check on a real device or the live WP page, including any WP admin-bar or plugin markup that isn't in the harness.

### Remaining Notes

- None.

---

## Task A8 — Social Media Footer

Date:
`2026-10-23 15:18`

### Request

Add Facebook, LinkedIn, Instagram, TikTok, and YouTube to the footer, with accessible labels, tidy spacing, and mobile responsiveness. Use existing URLs if present and never invent them. No Twitter.

### AI Instruction

Same per-task workflow (A4–A12 run back to back as authorised). Look for existing social configuration first. Reuse the "link only when configured" pattern from A3 instead of duplicating it.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php` (footer), `functions.php`, `style.css`
- `wp-content/themes/hello-elementor/assets/css/reset.css` (`a`, `a:hover` colours)
- Search for `facebook|linkedin|instagram|tiktok|youtube|social` in the theme and `uploads/elementor`: no matches.

### Files Changed

- `wp-content/themes/myrehat-test/functions.php`
- `wp-content/themes/myrehat-test/page-trails.php`
- `wp-content/themes/myrehat-test/style.css`

### Root Cause

Missing feature: the footer had no social links, and no social URLs are configured anywhere in the project. The database is not reachable.

### Changes Made

- `functions.php`: new helper `myrehat_test_external_link( $label, $url, $class )`. It runs `esc_url()` on the URL and prints `<a target="_blank" rel="noopener">` when the URL is valid, otherwise a plain `<span>` label. Label and class are escaped.
- `page-trails.php`:
  - Added `<nav class="trails-social" aria-label="Social media">` in the footer, below the A4 link group, rendering the five networks in a fixed order.
  - URLs come from a new filter, `myrehat_test_social_urls` (array keyed by network name, default empty). No URLs are invented.
  - Refactor: the A3 contact bar now uses the same helper instead of its own inline if/else, so the logic lives in one place. Its rendered HTML is identical.
- `style.css`: the existing footer text-link style (`#ccc` on `#222`) with an outlined pill so the items read as a group. Spacing is `gap: 8px 10px`, items wrap, and hover/focus shows white text with a lighter border.
- Labels are visible text, which gives each link its accessible name. No icon font or new dependency was added.

### Verification

- `php -l` on both PHP files: OK.
- Headless Chrome at 320, 390, and 1280px, in two states: no URLs (current) and some URLs configured through the filter, including an unsafe `javascript:` TikTok URL and a YouTube URL containing a quote.
  - All five networks render in order. The nav's `aria-label` is "Social media".
  - Item spacing is at least 8px (14px measured), with 2 rows at 320/390px and 1 row at 1280px.
  - No overflow (`scrollWidth` equals viewport width). Text contrast 9.91:1, hover contrast 15.91:1.
  - No Twitter. A4 footer links unchanged.
  - Configured Facebook and YouTube render as links, with the YouTube quote escaped (`&quot;`). The unsafe TikTok URL falls back to a label. The Facebook link is exposed to the accessibility tree by its name.
  - No page errors. Footer screenshot at 390px reviewed.

### Regression Check

- A1, A2, A4, A5, A6, A7 suites: all pass.
- A3 suite, in both URL states, after moving the contact bar onto the shared helper: all functional checks pass. The only failures are the two expected "overflow unchanged vs original" baselines that A7 made obsolete.

### Result

`PARTIAL`. Implemented and verified in the browser. Still to do: the final social profile URLs (not present in the project) and a check on the live WP page.

### Remaining Notes

- To activate the links (values are placeholders):
  `add_filter( 'myrehat_test_social_urls', fn() => array( 'Facebook' => 'https://facebook.com/<page>', 'LinkedIn' => '…', 'Instagram' => '…', 'TikTok' => '…', 'YouTube' => '…' ) );`

---

## Task A9 — Host Terms Checkbox

Date:
`2026-10-23 15:20`

### Request

Add a required checkbox labelled exactly `I agree to the Host Terms`. Submitting must fail when it is unchecked, and the server must validate consent rather than relying only on HTML `required`. The error message must be clear.

### AI Instruction

Same per-task workflow (A4–A12 run back to back as authorised). Extend the shared validator from A6 instead of adding separate validation.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php` (booking form)
- `wp-content/themes/myrehat-test/functions.php` (`myrehat_test_validate_booking`, `myrehat_test_booking_handler`)
- `wp-content/themes/myrehat-test/trails.js` (submit listener)
- Search for `terms|host|checkbox|agree` in the theme: none. There is no Host Terms page or URL.

### Files Changed

- `wp-content/themes/myrehat-test/functions.php`
- `wp-content/themes/myrehat-test/page-trails.php`
- `wp-content/themes/myrehat-test/style.css`

### Root Cause

Missing field: the form had no consent checkbox, and the server had no consent rule.

### Changes Made

- `page-trails.php`: `<label class="trails-consent"><input type="checkbox" name="host_terms" value="1" required>I agree to the Host Terms</label>`. There is no whitespace before the text, so the label's `textContent` is exact. No link is added because no Host Terms URL exists.
- `functions.php` (`myrehat_test_validate_booking`):
  - Consent is valid only when `host_terms` is exactly `'1'`, the checkbox's own value. Missing (unchecked boxes are not submitted), `'0'`, `'on'`, `'true'`, `'yes'`, `'1 '`, and arrays are all rejected.
  - Error message: "You must agree to the Host Terms to request a booking."
  - Validated consent is stored as `host_terms => true`.
- `style.css`: `.trails-consent` is a flex row with an 8px gap between box and text.

### Verification

- `php -l`: OK.
- Server: new cumulative suite (`server-test.php`, real `functions.php` with WP stubs), 22/22 pass. It includes the A6 Digital Nomad cases, the A9 cases listed above, and handler checks: a booking without consent is not stored, an invalid Digital Nomad is not stored, and a valid booking is stored as `{"digital_nomad":"Tidak","host_terms":true,"date":"2026-11-01"}`.
- Browser, headless Chrome at 1280px and 390px:
  - Checkbox is `required` with value `1`. Label `textContent` and accessible name are exactly "I agree to the Host Terms".
  - Unchecked: submit is blocked ("Please check this box if you want to proceed.").
  - Clicking the label text checks the box. Checked: submit proceeds.
  - Row stays within the viewport. No page errors.

### Regression Check

- A1, A2, A4, A5, A6, A7, A8 suites: all pass. The A6 browser test was updated to tick the new required checkbox before asserting that submit proceeds.

### Result

`PARTIAL`. Frontend and server validation are implemented and tested. The end-to-end browser-to-server submission, and showing server error messages in the UI, are connected in A12.

### Remaining Notes

- If a Host Terms page is created later, "Host Terms" can link to it. The label text must stay exactly as is.

---

## Task A10 — Header Search

Date:
`2026-10-23 15:21`

### Request

The header search must filter the same listing, using the A1/A2 filtering with no duplicate logic. The main search and category filter must keep working, there must be no state conflict between the two search boxes, and no console errors.

### AI Instruction

Same per-task workflow (A4–A12 run back to back as authorised). Reuse `filterTrails()` and define clearly how the two search inputs interact.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php` (`#main-search` in `.site-header-trails`; `#search-box` in `.trails-search-row`)
- `wp-content/themes/myrehat-test/trails.js` (A1/A2 `filterTrails()`)
- `wp-content/themes/myrehat-test/style.css`

### Files Changed

- `wp-content/themes/myrehat-test/trails.js`

### Root Cause

`#main-search` was never referenced in JS, so it had no listener. `filterTrails()` read the query from a single input (`#search-box`).

### Changes Made

- **Interaction design:** both inputs represent one shared search query.
  - `searchInputs` holds both boxes (each is optional, missing ones are filtered out).
  - On `input` in either box, `onSearchInput` copies the value into the other box, then calls the same `filterTrails()`. That function still applies the category too (`matchesSearch && matchesCategory`).
  - Setting `.value` from code fires no event, so the sync cannot loop. Because both boxes always hold the same text, `filterTrails()` reads the query from `searchInputs[0]`.
- Replaced the single `input` variable with `searchInputs`. There is no new filter function and no duplicated matching logic.

### Verification

- `node --check`: OK. Headless Chrome on the rendered template:
  - Header `MOUNT` → 2 cards, and the listing box shows `MOUNT`.
  - Listing box `sabah` → 1 card, and the header shows `sabah`.
  - Header `sunset` + category beach → 1. Header `mount` + beach → 0 with the "No trails found." message.
  - Category back to all keeps the query → 2. Clearing the header clears both boxes → 6.
  - Alternating between the boxes (`forest` → `perak` → `TAMAN`) ends in one consistent query, `TAMAN`, with 1 card.
  - Listener count (CDP): exactly one listener each on `#main-search` (input), `#search-box` (input), and `#category` (change).
  - No console or page errors.

### Regression Check

- A1, A2, A4–A9 suites: all pass. The A1/A2 informational line "header search untouched" now prints `false`, as intended: it marked A10 as out of scope at that time and is not an assertion.
- Non-listing page: still only the pre-existing `booking-form` null error (fixed in A12).

### Result

`PARTIAL`. All A10 criteria pass in a real browser on the rendered template. Still to do: a check on the live WP page.

### Remaining Notes

- The header box placeholder still reads "Search homepage...". It now searches trails, so a later copy change to "Search trails..." would be clearer. It was not changed because no copy change was requested.
- Neither search box has a visible `<label>` or `aria-label` (pre-existing accessibility gap).

---

## Task A11 — Daily / Monthly Pricing

Date:
`2026-10-23 15:22`

### Request

Add a Daily / Monthly choice to the booking form. Daily is RM 350. Monthly is RM 350 × 30 × 0.8 = RM 8,400, calculated rather than hardcoded. The price is flat and independent of the trail. The total must update live when the radio changes. The server must decide the price from the plan and ignore any total sent by the browser.

### AI Instruction

Same per-task workflow (A4–A12 run back to back as authorised). Keep one source of truth for the prices and extend the shared validator.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php` (`#trails-total` placeholder, form)
- `wp-content/themes/myrehat-test/trails.js`, `functions.php`, `style.css`
- Search for `total|price|plan|RM`: only the static `Total: -` and the trail-card display prices. No calculation, no hidden price field, no plan input. The form has no trail selector.

### Files Changed

- `wp-content/themes/myrehat-test/functions.php`
- `wp-content/themes/myrehat-test/page-trails.php`
- `wp-content/themes/myrehat-test/trails.js`

### Root Cause

Missing feature: there was no plan field, no price calculation, and no live total. The `#trails-total` element was a static placeholder.

### Changes Made

- `functions.php`:
  - New `myrehat_test_booking_plans()` is the single source of truth. It holds `$daily_rate = 350`; daily `price = $daily_rate`; monthly `price = (int) round( $daily_rate * 30 * 0.8 )` = 8400.
  - `myrehat_test_validate_booking()` reads `plan` (unslash + `sanitize_key`) and accepts only an existing plan key. It sets `$booking['price']` from the server-side table and never reads a price or total from input. An invalid or missing plan returns "Please choose a Daily or Monthly plan."
- `page-trails.php`: a `Plan` fieldset (reusing `.trails-choice`) rendered from `myrehat_test_booking_plans()`. Each radio is `required` and carries `value` (plan key) and `data-price` (server-computed price), both escaped. No hidden price field.
- `trails.js`: `updateTotal()` formats the checked plan's `data-price` as `Total: RM 8,400` (`toLocaleString('en-US')`) or `Total: -` when nothing is chosen. It runs on each plan radio's `change`, and once on load in case the browser restored a selection. The browser only displays the price; it does not compute it.

### Verification

- `php -l`, `node --check`: OK.
- Server suite (real `functions.php`): all pass. A11 cases:
  - Daily = 350, Monthly = 8400 (int).
  - `plan=daily` gives 350 and `plan=monthly` gives 8400.
  - Monthly with tampered `price=1`, `total=1`, `amount=0` is still 8400.
  - A `trail` value does not affect the price.
  - `''`, `weekly`, `yearly`, `daily; DROP`, `__proto__`, a missing plan, and an array plan are all rejected.
  - The handler stores `{"plan":"daily","price":350,…}`.
- Browser, headless Chrome at 1280px and 390px:
  - Options are Daily and Monthly, both required, with rendered `data-price` 350 and 8400.
  - Total goes from `Total: -` to `Total: RM 350` (Daily), `Total: RM 8,400` (Monthly), and back to `Total: RM 350`, with no navigation or reload.
  - Arrow-key switching also updates the total.
  - Trail search and category changes do not affect the total.
  - Submitting without a plan is blocked. Form within the viewport. No page errors. Screenshot at 390px reviewed.

### Regression Check

- A1, A2, A4–A10 suites: all pass. The A6 browser test now also selects a plan, which is now required, before asserting that submit proceeds.

### Result

`PARTIAL`. Pricing, live total, and server-side price authority are implemented and tested. The end-to-end submit, which sends the plan to the server and returns the server price, is connected in A12.

### Remaining Notes

- None.

---

## Task A12 — Booking Success Confirmation

Date:
`2026-10-23 15:27`

### Request

After a booking is actually successful, show a clear success confirmation automatically, and only when the server says the booking succeeded. On failure, show an appropriate error and never the success message. Prevent duplicate submits where possible. AJAX success and error responses must be clearly distinguished.

### AI Instruction

Same per-task workflow (A4–A12 run back to back as authorised). Audit the whole flow (form submit → frontend validation → request → server handler → save → response → UI feedback) and build on the existing `template_redirect` handler.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php` (form, `#trails-confirmation`)
- `wp-content/themes/myrehat-test/trails.js` (submit listener)
- `wp-content/themes/myrehat-test/functions.php` (`myrehat_test_booking_handler`, validator)
- `wp-content/themes/myrehat-test/style.css` (`#trails-confirmation`)

### Files Changed

- `wp-content/themes/myrehat-test/functions.php`
- `wp-content/themes/myrehat-test/page-trails.php`
- `wp-content/themes/myrehat-test/trails.js`
- `wp-content/themes/myrehat-test/style.css`

### Root Cause

The "confirmation" was a hardcoded `alert('Booking request received!')` after `preventDefault()`. It was shown for every submit and never contacted the server. The form also had no `method` (defaulting to GET), no `trails_booking` marker, and no nonce, so the server handler was unreachable. The handler itself had no nonce check, stored a raw `$_POST['date']` (flagged "BUG P2" in the file), and ignored whether the save succeeded. `#trails-confirmation` existed but was never used.

### Changes Made

- `functions.php`:
  - Validator also checks `name` (sanitised, non-empty) and `date` (strict `YYYY-MM-DD` plus `checkdate`). This replaces the raw date.
  - Handler rewritten as the single endpoint:
    - Returns immediately unless `trails_booking` is posted.
    - Verifies the nonce (`myrehat_test_booking`), then validates everything (A6/A9/A11/A12 rules).
    - Saves with `set_transient` and **checks its return value**.
    - Success is set only after a successful save. The message is built server-side from validated data and the server price: "Thank you, {name}! Your booking has been received: {Plan} plan from {date}. Total: RM {price}."
    - Distinct failure messages: expired nonce, a validation summary plus a per-field list, and storage failure.
  - AJAX (`ajax=1`) returns `wp_send_json_success({message})` (200) or `wp_send_json_error({message, errors}, 400)`.
  - Without JS, the result is kept for the page to render via `myrehat_test_booking_result()`. There is deliberately no redirect to `?booking=success`, because that URL could be visited to fake a success message.
  - The outdated "BUG P2" comment was removed now that the nonce and sanitising are in place.
- `page-trails.php`: the form gets `method="post"`, a hidden `trails_booking=1`, and `wp_nonce_field( 'myrehat_test_booking', 'trails_booking_nonce' )`. `#trails-confirmation` gets `aria-live="polite"` and server-renders a no-JS result (`is-success` or `is-error`, message and error list escaped with `esc_html`).
- `trails.js`:
  - Replaced the alert with a `fetch` POST of `FormData` plus `ajax=1` to the form URL.
  - Success is shown **only** when `response.ok && json.success === true`. On success the form is reset and the total cleared.
  - Every other outcome shows the error state: an HTTP error, non-JSON, a contradictory body, or a network failure. Server error text and field errors are used only from a genuine `success:false` response, otherwise a generic message is shown.
  - Messages are built with `textContent` (no HTML injection).
  - The submit button is disabled while a request is in flight; extra submits are ignored, and the button is re-enabled when the request finishes.
  - The listener is guarded, so pages without the form no longer throw the null `addEventListener` error noted since A1.
- `style.css`: `.is-error` variant (red border, background, text), list spacing, and a disabled-button style.

### Verification

- `php -l`, `node --check`: OK.
- **End-to-end over HTTP.** PHP built-in server running the real `functions.php` handler, with WP stubs for nonce, JSON responses, and a switchable storage failure, driven by headless Chrome. 26/26 pass:
  - Valid booking: 200 `{success:true}`, message shown automatically, no `alert()`, booking saved server-side with price 8400, form reset, total cleared, region is `aria-live`.
  - Unchecked Host Terms with native validation bypassed: error with a field list, nothing saved. After fixing and resubmitting, success replaces the error.
  - Empty form: all 5 field errors listed.
  - Tampered `data-price=1` (UI showed RM 1): the server still charges and reports RM 8,400. A tampered plan value `weekly` is rejected and nothing is saved.
  - Forged nonce: "Your session has expired…", nothing saved.
  - Storage failure: "We could not save your booking…", no success.
  - Network abort, HTTP 500 HTML, HTTP 200 non-JSON, and HTTP 500 with a `{success:true}` body: all show the error state, no success, button re-enabled. The last case first showed the body's text in the error box; fixed so error text comes only from genuine `success:false` responses, then re-tested.
  - Duplicate submits (click, 2× `requestSubmit()`, Enter) during an 800ms-delayed request: exactly 1 POST, button disabled during the request.
  - Messages fit at 390px. Screenshots of both states reviewed.
  - No-JS: a normal POST renders the success message server-side. An invalid POST (Feb 30, no terms) renders the error list with no success. `GET ?booking=success` shows nothing. A name containing `<script>` is sanitised and escaped.
  - A page without the form or listing now has no JS errors.
- Server unit suite: all pass, including the new name and date cases (`2026-02-30`, `01/11/2026`, `2026-1-1`, an injection-like string, and an empty value are rejected; the leap day `2028-02-29` is accepted).
- No PHP warnings or notices in the server log.

### Regression Check

- A1, A2, A4–A11 browser suites: all pass. The A6 test now counts the POST request instead of the removed alert, and the server-suite baseline now includes `name` and `date`.
- A3 functional checks were unaffected by this task (no header or contact changes).

### Result

`PARTIAL`. The flow works end-to-end over real HTTP with the real handler code. Still to do: verification on the actual WordPress install, which has real nonces, a real `set_transient`, caching, and logged-in vs. logged-out sessions.

### Remaining Notes

- Storage is still the existing single transient `trails_last_booking` (1 hour, overwritten by each booking). It works as "save", but real bookings need durable storage (custom post type, table, or email) — a product decision outside this task.
- If the page is fully cached for logged-out visitors, the nonce can go stale after 12–24h. The UI then shows "Your session has expired…", which is correct, but the cache lifetime should stay below the nonce lifetime.
- The parent reset styles `button:focus` with a pink background (`#c36`), which overrides the green submit button after a click (pre-existing).
- Still in `functions.php`, untouched and outside A1–A12: "BUG P1" (`myrehat_test_booking_title` missing its text domain) and "BUG P3" (`myrehat_trail_viewed` registered with 1 accepted arg).

---

## Final Verification — A1–A12 on a real WordPress runtime

Date:
`2026-10-23 15:52`

### Request

After A12, the user confirmed ("lanjut") a final verification of all tasks A1–A12.

### AI Instruction

Close the gap left by every earlier `PARTIAL` (no live WordPress) if that is possible without touching the user's systems. Re-verify every acceptance criterion together, fix only what the verification proves broken, and report honestly.

### Environment

- This site's own database is not reachable. MySQL runs locally, but the project's `wp-config.php` defaults are rejected (error 1045). No credentials were guessed and nothing was printed.
- Built an **isolated copy** of the project in the session scratchpad (outside the repo) with WordPress 6.8.3 on PHP 8.4 and the official SQLite Database Integration plugin 3.1.1 (`db.php` drop-in). It has a throwaway `wp-config.php` with random keys and debug logging to file. The repo, its `wp-config.php`, and the user's MySQL were not modified.
- Fresh install: `myrehat-test` active (parent Hello Elementor), Elementor 4.3.4 active, a "Trails" page using `page-trails.php` set as the front page, and a 4-item menu in `menu-1`. Served with `php -S 127.0.0.1:8770`, now stopped.
- Limitation: this is a fresh install, not the production database. Site-specific menus, Elementor kit or template overrides, caching, and real contact or social URLs are not represented.

### Bug Found and Fixed

- **A12 on real WordPress:** the booking was saved, but the UI showed "Your booking could not be sent", and the no-JS submit rendered the 404 template.
  - Root cause: the form field `name` (present in the original form) is a WordPress **public query var**. WP looked for a post with slug "final-tester", found none, and set HTTP 404 before `template_redirect`. The handler then returned `{success:true}` with status 404, so the UI correctly refused to show success.
  - This was invisible in the stub harness, which has no WP query parsing.
  - Fix: renamed the field to `booking_name` (the stored key stays `name`, with a code comment explaining why), and `wp_send_json_success( …, 200 )` now sends an explicit status.
  - Confirmed with curl: before the fix, POST with `name=…` returned 404.
  - Files: `functions.php`, `page-trails.php`.

### Verification

Consolidated suite on the real WordPress page: 1280px and 390px (mobile emulation), each logged out and logged in through `wp-login.php`. **200/200 checks pass.**

- A1 search (6 cases) and A2 category plus search (5 cases).
- A10 header and listing boxes sync both ways and combine with category, with one listener per control.
- A3: bold, contrast 7.67 and 4.63, sits below the real Hello Elementor header, sticky at top 0 (logged out) and 32px under the fixed admin bar (1280 logged in), top 0 at 390 where the admin bar is not fixed. Navigation stays usable: the inline menu at 1280, and at 390 the hamburger toggle opens a dropdown that is not covered by the sticky bar.
- A4 footer links exact. A8 five networks with `aria-label`, and no Twitter anywhere on the page.
- A5 `h1` exactly "Tropic Hiking Trails".
- A7: no horizontal scroll (`scrollWidth` equals viewport width, `scrollX` 0), no element outside the viewport, all sections shown.
- A6, A9, A11 fields present and required. Live total RM 350 / RM 8,400, unaffected by the trail filter. Unchecked Host Terms blocks submit.
- A12 real submit:
  - 200 `success:true` with a real WP nonce, the success message shown automatically, and the booking saved in the real WP transient (read back with `get_transient`: price 8400).
  - With real nonces, the server returns 400 `success:false` for: `digital_nomad=Maybe` or missing, `host_terms` missing or `on`, `plan=weekly`, a forged nonce, and the date `2026-02-30`.
  - Tampered `price=1`/`total=1` is still charged RM 8,400.
  - Duplicate submits produce 1 POST. A network failure shows the error state.
  - No-JS POST renders the success message server-side. `?booking=success` cannot fake it.
- JS: no console or page errors during normal use of the trails page, and none on a normal post page where `trails.js` loads without the listing or form.
- WP `debug.log`: 0 entries from `myrehat-test`. Only PHP 8.4 deprecation notices from WP core and Elementor.
- All earlier layers re-run after the fix, all pass: server unit suite; harness suites A1, A2, A4–A11; stub-HTTP A12 suite (26 checks). A3: all functional checks pass; only its two baseline assertions fail, as expected after A7.
- Two first-run failures were test artifacts and were corrected in the test, not the product: the skip link is deliberately off-screen (`.screen-reader-text`), and the real dynamic header hides the inline menu behind a toggle below 992px.

### Git Diff Review

- Changed: `wp-content/themes/myrehat-test/{functions.php, page-trails.php, style.css, trails.js}` (+314 / −29) and the new `AI_PROMPT_LOG.md`. No other files.
- No credential-like strings in the diff. Nothing committed or pushed.

### Result (status after final verification)

| Task | Status | Note |
|---|---|---|
| A1–A2, A4–A7, A9–A12 | `PASS` | All acceptance criteria verified on a real WordPress runtime (fresh install) |
| A3, A8 | `PASS` (criteria) | Rendered, sticky/responsive, accessible. **Destination URLs still needed**: no WhatsApp, LINE, or social URLs exist in the project, so they show as labels until set through the filters |

### Remaining Notes

- Not covered: the production database and content (menus, Elementor templates, caching, a real mail or storage backend).
- A booking is stored in a single 1-hour transient. Real bookings need durable storage (product decision).
- With full-page caching for logged-out visitors, keep the cache lifetime below the nonce lifetime (12–24h).
- Out of scope and untouched: "BUG P1" (text domain) and "BUG P3" (hook arg count) in `functions.php`. The parent reset's pink `button:focus` style is also unchanged.

---

## Follow-up A3 / A8 — Contact and Social URLs

Date:
`2026-10-23 15:59`

### Request

The user provided the WhatsApp number `082252081212` and asked for dummy social media URLs using the name "task14".

### AI Instruction

Fill the destination data that A3 and A8 left pending, using the filters built for that purpose (no template change). Re-verify on the real WordPress copy.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php` (filters `myrehat_test_whatsapp_url`, `myrehat_test_line_url`, `myrehat_test_social_urls`)
- `wp-content/themes/myrehat-test/functions.php` (`myrehat_test_external_link`)

### Files Changed

- `wp-content/themes/myrehat-test/functions.php`

### Root Cause

Not a bug. The destination data was missing, so the buttons and social items were rendered as labels by design.

### Changes Made

- `myrehat_test_set_whatsapp_url()` on `myrehat_test_whatsapp_url` returns `https://wa.me/6282252081212`. `wa.me` requires international format without the leading 0, and 0822 is an Indonesian mobile prefix, so +62.
- `myrehat_test_set_social_urls()` on `myrehat_test_social_urls` returns dummy "task14" URLs, commented as placeholders:
  - Facebook `https://www.facebook.com/task14`
  - LinkedIn `https://www.linkedin.com/company/task14`
  - Instagram `https://www.instagram.com/task14`
  - TikTok `https://www.tiktok.com/@task14`
  - YouTube `https://www.youtube.com/@task14`
- LINE left unset: no LINE URL was provided, and LINE is a contact button, not one of the five social networks. It stays a label until `myrehat_test_line_url` is set.

### Verification

- `php -l`: OK. Real WordPress copy (fresh install, SQLite), 1280px and 390px:
  - WhatsApp and all five social items render as `<a>` with the exact URLs, `target="_blank"`, `rel="noopener"`, and accessible names. LINE is still a `<span>`.
  - WhatsApp keeps white bold text with no underline. Social links keep the footer colour `#ccc`.
  - Clicking WhatsApp opens a new tab, which WhatsApp redirects to `api.whatsapp.com/send/?phone=6282252081212`, so the number format is accepted.
  - No horizontal overflow, no page errors. Footer screenshot at 390px reviewed.
- Full final suite re-run: **200/200 pass**. WP `debug.log` has 0 theme entries.

### Regression Check

- Covered by the full 200-check suite (A1–A12, both widths, logged in and out).

### Result

`PASS`. WhatsApp and the five social links are active. LINE still needs a URL.

### Remaining Notes

- The social URLs are dummies. Replace them in `myrehat_test_set_social_urls()` when the real accounts exist.
- Add a LINE URL with `add_filter( 'myrehat_test_line_url', … )`, following the WhatsApp pattern.

---

## UAT End-to-End — A1–A12 (Playwright)

Date:
`2026-10-23 16:08`

### Request

Run end-to-end UAT of the completed tasks with Playwright, and save the documentation, screenshots, and per-task notes in a `docs` folder.

### AI Instruction

Write scenario-based UAT from the user's perspective (steps, expected, actual, status) for every A1–A12 acceptance criterion. Run it against the real WordPress runtime, capture highlighted screenshot evidence, and generate the report from the actual results rather than writing it by hand. Keep credentials and local paths out of the docs.

### Files Inspected

- `wp-content/themes/myrehat-test/*` (final code under test)
- Previous verification suites in the session scratchpad (reused as the basis for the scenarios)

### Files Changed

- `docs/uat/uat-e2e.js` (new): the Playwright UAT script, configured by env vars `BASE_URL`, `WP_USER`, `WP_PASS`, `WP_PATH`, `CHROME_PATH`, `PLAYWRIGHT_MODULE`. Credentials come only from env.
- `docs/uat/README.md` (generated): the UAT report in Indonesian, containing:
  - a summary per task;
  - the test environment;
  - how to re-run it;
  - per-task tables (ID, scenario, steps, expected, actual, status) with embedded screenshots and notes;
  - general follow-ups.
- `docs/uat/results.json` (generated): raw results.
- `docs/uat/screenshots/*.png` (31 files, about 1.1 MB): the element under test is outlined in red.

### Root Cause

Not applicable (documentation and test task).

### Changes Made

- 53 UAT scenarios:
  - A1 (5), A2 (5), A3 (5), A4 (1), A5 (1), A6 (5), A7 (3), A8 (2), A9 (4), A10 (4), A11 (7), A12 (9), general (2).
  - They cover desktop 1280px, mobile 390px, logged in with the admin bar, and no JavaScript.
  - Server-side rules are exercised with real nonces: invalid values, a forged nonce, an invalid date, and a tampered price.
  - Saved bookings are read back from the WP transient.
- The first run showed 52/53. G-01 failed on `net::ERR_FAILED`, which is the network abort A12-04 triggers on purpose. The test now removes that induced error after A12-04, so G-01 judges only genuine errors.
- Summary-table anchors were fixed to match GitHub/VS Code heading slugs.

### Verification

- Final run against the isolated real WordPress copy (WP 6.8.3, PHP 8.4, Elementor 4.3.4, SQLite) using Chromium 155 headless: **53/53 PASS**, exit code 0.
- Report checks: all 31 images exist, all 13 anchors resolve, and there is no password or local path anywhere in `docs/uat`. WP `debug.log` has 0 theme entries.
- Key screenshots reviewed: A2-02, A11-05b, A3-04b, A3-05.

### Regression Check

- The UAT is itself a full regression run over A1–A12. No product code changed in this step.

### Result

`PASS`. 53/53 UAT scenarios pass on a real WordPress runtime. The documentation is in `docs/uat/`.

### Remaining Notes

- The UAT ran against a fresh isolated install, not the production database or content.
- Running the UAT writes test bookings (transient `trails_last_booking`) to the target WordPress, so do not run it against production.
- Still open: the LINE URL, and the real social URLs (currently "task14" dummies).

---

## Task B1 — WordPress Translation Text Domain

Date:
`2026-10-23 16:21`

### Request

Fix theme translation calls that do not use the correct text domain. Take the domain from the theme's real `Text Domain` header, fix only the problematic calls, and keep the theme loading with no unrelated changes.

### AI Instruction

New PHP task series B1 → B2 → B3, one task per cycle with confirmation in between (audit → minimum change → `php -l` → functional verification → regression → git diff → prompt log → stop). B1 only. Note other issues as findings without fixing them.

### Files Inspected

- `wp-content/themes/myrehat-test/style.css` (`Text Domain: myrehat-test`)
- `wp-content/themes/myrehat-test/functions.php`: every `__`, `_e`, `_x`, `_ex`, `_n`, `_nx`, `_n_noop`, `_nx_noop`, `esc_html__`, `esc_html_e`, `esc_html_x`, `esc_attr__`, `esc_attr_e`, `esc_attr_x`, and `translate` call
- `wp-content/themes/myrehat-test/page-trails.php`: no translation calls. It prints `myrehat_test_booking_title()` through `esc_html()`.
- Search for `load_theme_textdomain`, `load_child_theme_textdomain`, `Domain Path`, and a `languages/` directory: none found.

### Files Changed

- `wp-content/themes/myrehat-test/functions.php`

### Root Cause

`myrehat_test_booking_title()` returned `__( 'Book a guided hike' )` without a domain (the line marked "BUG P1" in the file). With no domain argument, `__()` uses `'default'`, WordPress core's own translations, so a theme translation of this heading could never apply. The other 10 translation calls in the theme already use `'myrehat-test'`.

### Changes Made

- `__( 'Book a guided hike' )` changed to `__( 'Book a guided hike', 'myrehat-test' )`.
- The stale "BUG P1" comment was replaced with a one-line description of the function.
- The string text, the function name, and the escaping at the call site (`esc_html()` in `page-trails.php`) are unchanged.

### Security Considerations

- No change to output escaping. The heading is still escaped with `esc_html()` where it is printed, which is correct for an HTML text context, so a translated string cannot inject markup.
- No input handling or credentials involved.

### Verification

- `php -l functions.php`: no syntax errors.
- Functional check in the isolated real WordPress copy (WP 6.8.3, theme `myrehat-test` active), loaded through `wp-load.php`.
  - Setup: a `gettext` hook records the domain used for "Book a guided hike", and a sample translation is registered on `gettext_myrehat-test` only.
  - **Before** (git HEAD `functions.php`): domain `default`, output "Book a guided hike". The theme translation was not applied.
  - **After** (working tree): domain `myrehat-test`, output "Pesan pendakian berpemandu". The theme translation applies.
- The real front page returns HTTP 200 and renders `<h2>Book a guided hike</h2>`. `wp-login.php` returns HTTP 200.

### Regression Check

- Full 200-check suite on the real WordPress copy (A1–A12 at 1280px and 390px, logged in and out, including booking AJAX, no-JS POST, and a post page without the form): **200/200 pass**.
- WP `debug.log`: 0 entries from `myrehat-test`.
- The UAT script was deliberately not re-run, because it rewrites `docs/uat/` and would add changes unrelated to B1.
- `git diff`: one file, 2 lines changed (the comment and the call). No credentials.

### Result

`PASS`. The single domain-less translation call now uses the theme's real text domain, verified functionally in WordPress.

### Remaining Notes

- Findings for other tasks:
  - B2: the booking handler (`myrehat_test_booking_handler`) was already given a nonce, sanitising, and allowlists during A12. It will be re-audited against the B2 checklist rather than assumed complete.
  - B3: `myrehat_trail_viewed` is registered with `$accepted_args = 1` while the callback has 2 parameters (marked "BUG P3"). Not touched.
  - Outside B1–B3: the theme never calls `load_child_theme_textdomain()` and has no `languages/` directory. With the domain fixed, translations are picked up from `wp-content/languages/themes/myrehat-test-{locale}.mo`. To ship translations inside the theme, a later change would need a `languages/` directory and a `load_child_theme_textdomain()` call. Not required by B1.
  - Template strings in `page-trails.php` are hardcoded English (not wrapped in translation functions). Left as is: converting them would widen the scope beyond B1.

---

## Task B2 — Form Security: Nonce, Sanitization, Validation

Date:
`2026-10-23 16:28`

### Request

Secure the booking form handler: nonce (present and verified), type-appropriate sanitising, validation, enum allowlists, server-side pricing, escaped output, and clear error handling, with success only after processing succeeds. Valid bookings must keep working.

### AI Instruction

Same B-series workflow. The user authorised continuing through B3 ("lanjut sampai task b3"), so B2 and B3 run back to back, each audited, verified, and logged separately. Map form → request → handler → validation → save → response before changing anything. Do not touch B3.

### Files Inspected

- `wp-content/themes/myrehat-test/page-trails.php` (form fields, nonce field, escaped result output)
- `wp-content/themes/myrehat-test/functions.php` (`myrehat_test_validate_booking`, `myrehat_test_booking_handler`, `myrehat_test_booking_result`)
- `wp-content/themes/myrehat-test/trails.js` (fetch POST with `FormData` plus `ajax=1`)
- Search for `$_POST`, `$_GET`, `$_REQUEST`, `$_COOKIE`, `$_SERVER`, `$_FILES`, `admin_post_*`, `wp_ajax_*`, `register_rest_route`: the only entry point is the `template_redirect` handler. There is no `wp_ajax`, so `check_ajax_referer()` does not apply; `wp_verify_nonce()` is the right API.

### Files Changed

- `wp-content/themes/myrehat-test/functions.php`
- `wp-content/themes/myrehat-test/page-trails.php`

### Root Cause

The original handler from the initial commit (marked "BUG P2") used `$_POST['date']` raw with no nonce. That was already replaced during A12 (commit `e153a72`) when the handler was first connected to the form, so B2 re-audited that code against the B2 checklist. Nonce, unslash plus sanitising, allowlists, required checks, server pricing, and escaping were already in place. The audit and real-WordPress tests found three remaining gaps:

1. `booking_name` was sanitised but not validated for length. Any size was accepted, stored in the transient, and echoed back.
2. The response-mode flag was read raw with `! empty( $_POST['ajax'] )`, so any non-empty value counted as AJAX instead of the `'1'` contract.
3. **Bug found by testing:** `set_transient()` (via `update_option()`) returns `false` when the stored value is unchanged. Submitting the same booking twice in a row therefore got a false "We could not save your booking". Reproduced against git HEAD: 1st submit HTTP 200, 2nd HTTP 400.

### Changes Made

- `myrehat_test_validate_booking()`: empty name gives "Please enter your name."; more than 100 characters (`mb_strlen`) gives "Your name must be 100 characters or fewer.". Otherwise the name is accepted.
- New `myrehat_test_save_booking( $booking )`: returns `set_transient(...) || get_transient(...) === $booking`. An unchanged value counts as stored only when the stored value really equals this booking; a genuine write failure is still a failure. The handler uses it instead of `set_transient()` directly.
- Handler: the AJAX response is used only when `isset( $_POST['ajax'] ) && '1' === $_POST['ajax']`. Anything else gets the normal server-rendered response.
- `page-trails.php`: `maxlength="100"` on the name input, matching the server rule. This is UX only; the server stays authoritative.

### Security Considerations

- **Trust boundary:** every field is unslashed and sanitised by type (`sanitize_text_field`, `sanitize_key`), then validated separately: required checks, name length, strict `YYYY-MM-DD` date with `checkdate`, `in_array( …, true )` allowlist for Digital Nomad, plan-key allowlist, checkbox exactly `'1'`. Arrays sent in place of scalars are rejected.
- **Nonce:** `wp_nonce_field( 'myrehat_test_booking', 'trails_booking_nonce' )` in the form, and `wp_verify_nonce()` before any validation or save. A missing, garbage, or other-action nonce is rejected with HTTP 400.
- **Business-critical value:** the price comes only from `myrehat_test_booking_plans()` on the server; `price`, `total`, and `amount` from the browser are ignored.
- **Output:** the server-rendered message and errors go through `esc_html()`, class names are fixed strings, and the AJAX message is inserted with `textContent`. Error messages expose no paths, stack traces, or DB errors.
- GET requests carrying the booking parameters are ignored (the handler reads only `$_POST`).

### Verification

- `php -l` on `functions.php` and `page-trails.php`: no syntax errors.
- **33/33 security tests over real HTTP** on the isolated WordPress copy (logged-out visitor, real nonce, real `sanitize_text_field`, stored data read back from the WP transient):
  - **Test 1** valid submit: HTTP 200, stored `{"name":"B2 Valid",…,"price":8400,"host_terms":true}`.
  - **Test 2** missing nonce: HTTP 400 "Your session has expired…", storage unchanged.
  - **Test 3** invalid nonce, both garbage and a real nonce for another action: HTTP 400, storage unchanged.
  - **Test 4** enum manipulation (`digital_nomad=Maybe`, `ya`; `plan=weekly`, `yearly`; `host_terms=on`, `true`): HTTP 400 with the field error, storage unchanged.
  - **Test 5** HTML or script in the name:
    - `<script>alert(1)</script>Eve <b>Bold</b>` is stored as `Eve Bold`.
    - `"><img src=x onerror=alert(1)>Mallory` is stored as `">Mallory` (no tags) and rendered escaped as `&quot;&gt;Mallory`.
    - `O'Brien & Sons` is kept and rendered as `O&#039;Brien &amp; Sons`.
    - No `<script>`, `<img>`, or `onerror` in the JSON or HTML.
    - The first run of this test used a stricter "no `<` or `>` at all" criterion and flagged `">Mallory`. That plain text is harmless once escaped, so the criterion was corrected to "no tags stored, output escaped".
  - **Test 6** required fields (empty, whitespace-only, or tags-only name; missing or impossible date; missing plan; unchecked terms): HTTP 400, storage unchanged.
  - **Test 7** price manipulation (`price=1`, `total=99999`, `plan=daily`): stored price 350, message "Total: RM 350".
  - **Extra:**
    - Name length: 100 characters accepted; 101 and 200,000 characters rejected.
    - Array injection (`booking_name[]`, `digital_nomad[]`) rejected.
    - `ajax=false` gets the HTML response; GET with booking parameters is ignored.
    - The same booking submitted twice: both HTTP 200.
    - A genuine storage failure (a test-only mu-plugin in the scratch copy blocks the write) is still reported: HTTP 400 "could not save", nothing stored.
- Duplicate-submit bug before and after: git HEAD gave 200 then **400**; the fix gives 200 then 200.

### Regression Check

- Full 200-check suite on the real WordPress copy (A1–A12, 1280px and 390px, logged in and out, booking AJAX, no-JS POST, tampering, post page): **200/200 pass**.
- WP `debug.log`: 0 theme entries.
- `git diff`: B1 hunk plus B2 changes only. The B3 hook code is untouched. No credentials.

### Result

`PASS`. The handler meets every B2 criterion, verified over real HTTP in WordPress, and a real false-failure bug in the save step was found and fixed.

### Remaining Notes

- Findings for other tasks and follow-ups (not changed):
  - B3: `myrehat_trail_viewed` / `myrehat_test_count_view` untouched.
  - Business rule not specified, so not enforced: past booking dates are accepted. If bookings must be in the future, add a server check against `current_time( 'Y-m-d' )`.
  - With full-page caching for logged-out visitors, the cache lifetime must stay below the nonce lifetime (12–24h), otherwise valid users get "session expired".
  - Bookings are still a single 1-hour transient (existing architecture). Durable storage is a product decision.
- The scratch WordPress copy contains a test-only mu-plugin (`uat-fail-save.php`, active only while a flag file exists). It is not part of the repo.

---

## Task B3 — Hook Counter Argument

Date:
`2026-10-23 16:31`

### Request

Fix the trail-view counter hook so its callback receives the real ID (reported as always `null`) by correcting the registration, callback signature, accepted args, and how the ID is obtained. Validate the ID and never update the wrong object.

### AI Instruction

Same B-series workflow (B2 and B3 authorised back to back). Find all `add_action`/`do_action` for the hook. Verify the hook contract before using `2`. Explain the root cause from evidence, not guesses.

### Files Inspected

- `wp-content/themes/myrehat-test/functions.php` (registration and callback)
- Search across the repo (theme, plugins, WP core, JS) for `myrehat_trail_viewed`, `trail_viewed`, `myrehat_test_count_view`, `trail_views_`: the only matches are the registration and callback. **No `do_action( 'myrehat_trail_viewed' )` caller exists.**
- `git log -S myrehat_trail_viewed`: present since the first commit (`aeaae38`) as a registration only.
- `page-trails.php`: trail cards are static HTML with no IDs.

### Files Changed

- `wp-content/themes/myrehat-test/functions.php`

### Root Cause

Measured by firing `do_action` directly in the real WordPress copy against the original code (git HEAD) and recording every `trail_views_*` option change:

- `$accepted_args` was **1**, but the callback's contract (its signature, the only definition of this custom hook since nothing calls it) is `( $trail_id, $count )`. The **second argument was always dropped**: `do_action( hook, 42, 3 )` added +1, not +3; `(42, 0)` and `(42, -2)` also added +1.
- **No ID validation.** When the hook was fired without an ID, the ID arrived as `""` or `null` and was **counted under the shared key `trail_views_`** instead of being rejected. That is the "ID is null" symptom.
- Invalid IDs created junk keys (`trail_views_0`, `_-5`, `_42abc`, `_4.5`), and `true` incremented `trail_views_1`, a **different object**.
- Correction to the original "BUG P3" comment: with an ID-first caller, the callback does receive the ID (`do_action( hook, 42 )` incremented `trail_views_42`). "Always null" is not literally true; the null case is a missing or empty ID that was not rejected.

### Changes Made

- Registration: `add_action( 'myrehat_trail_viewed', 'myrehat_test_count_view', 10, 2 )`, changed from `1`. The `2` was verified against the callback signature, which defines this theme-owned hook; no caller contradicts it.
- New `myrehat_test_positive_int( $value )`: accepts only an `int` or a digit-only string and returns a positive int, or `0` otherwise.
- `myrehat_test_count_view()` validates `$trail_id` and `$count` with that helper and returns early, writing nothing, when either is not a positive integer. Otherwise the existing logic is unchanged (`get_option` + `update_option` on `trail_views_{id}`).
- Docblock documents the hook contract: `do_action( 'myrehat_trail_viewed', $trail_id, $count )`. The stale "BUG P3" comment was removed.
- Not changed: no caller was added. The trail cards have no IDs, so choosing an ID source would be inventing data (see Remaining Notes).

### Security Considerations

- Untrusted hook arguments are validated strictly before being used to build an option key. No arbitrary option names (`trail_views_42abc`) or wrong-object writes (`true` → trail 1) remain.
- `absint()` was deliberately not used, because it maps `-5` to `5` (a different trail) and `4.5` to `4`. The strict positive-integer check rejects those instead.
- No input from requests is involved. The option value is still cast with `(int)`.

### Verification

- `php -l` on `functions.php` and `page-trails.php`: no syntax errors.
- Before/after on the real WordPress copy (12 caller shapes; an unrelated `trail_views_7 = 10` used as a control; test options cleaned up afterwards):

| Caller | Original | Fixed |
|---|---|---|
| `(42)` | 42: +1 | 42: +1 |
| `(42, 3)` | callback gets `[42]`, +1 | callback gets `[42,3]`, **+3** |
| `('42')` | +1 | +1 |
| `()` / `(null)` | `trail_views_` +1 | **nothing written** |
| `(0)`, `(-5)`, `('42abc')`, `(4.5)` | junk keys created | **nothing written** |
| `(true)` | `trail_views_1` +1 (wrong object) | **nothing written** |
| `(42, 0)`, `(42, -2)` | +1 | **nothing written** |
| registered `accepted_args` | 1 | 2 |
| control `trail_views_7` | 10 (unchanged) | 10 (unchanged) |

### Regression Check

- Full 200-check suite on the real WordPress copy (A1–A12, both widths, logged in and out): **200/200 pass**.
- B2 security suite: **33/33 pass**.
- WP `debug.log`: 0 theme entries.
- The other hooks (`wp_enqueue_scripts`, `template_redirect`, and the URL filters) are unchanged and exercised by the suites.
- `git diff`: only the hook block in `functions.php` for B3 (plus the earlier B1/B2 hunks). No credentials.

### Result

`PASS` for the defect: the callback receives the real ID and count, invalid or null IDs are rejected, and no wrong object is updated, verified with the real `do_action` in WordPress. **Note:** nothing in the codebase fires the hook, so the counter still does not run in the app until a caller is added.

### Remaining Notes

- Finding: **no `do_action( 'myrehat_trail_viewed', … )` caller exists.** To make views count, a caller must be added where a trail is viewed, with a real ID, for example `do_action( 'myrehat_trail_viewed', get_the_ID() )` if trails become posts or a CPT. The current trail cards are static HTML without IDs, which is a product decision.
- Each trail creates its own autoloaded option (existing design). For many trails, post meta or `autoload = false` would scale better. Not changed.

---

## Elementor Hero Rebuild

Date:
`2026-10-23 17:23`

### Request

Rebuild the hero section using Elementor and export the resulting template as JSON.

### AI Instruction

Browser automation was instructed to audit the existing Elementor hero, rebuild only the hero section, verify desktop and 390px layouts, save the page, export the hero as an Elementor JSON template, and verify the exported file.

### Browser Automation

Tool:
`Playwright` (1.62.1, driving Chrome 155). Script: `scripts/elementor-hero-rebuild.js`. Credentials come from env vars `WP_USER`/`WP_PASS` only and are never printed.

### Page

Title:
Trails (front page, template "Trails Test Page" / `page-trails.php`)

Page ID:
4

Public URL:
`http://127.0.0.1:8770/` (isolated WordPress copy, see Remaining Notes)

### Existing Hero Audit

- **Not an Elementor hero.** `<header class="site-header-trails">` was hardcoded in `page-trails.php`: `h1` "Tropic Hiking Trails" (32px/500, system font, white), `p` "Find your next trail with MyRehat" (16px), and search input `#main-search` ("Search homepage...", 420px, used by A10). No CTA, no image. Solid `#0c6b4f`, padding 32px 20px, centred, 223px tall at both 1440px and 390px. No mobile typography rules.
- Page #4 had no Elementor data, and **the template did not call `the_content()`**. The editor confirmed this: *"Sorry, the content area was not found in your page. You must call 'the_content' function…"* (`elementor-editor-before-no-content-area.png`).
- Elementor 4.3.4 with both the classic **Container** experiment and atomic (V4) elements active. "Add New Container → Flexbox" creates an atomic Flexbox.
- Environment-only blocker in the isolated copy: "Your site doesn't have a default kit" (Elementor had been activated programmatically, skipping kit creation; `elementor-editor-no-kit.png`). Resolved through **Elementor → Tools → Recreate Kit** (UI; AJAX `{"success":true}`, kit #10 "Default Kit" with default settings). The production site already has a kit (`uploads/elementor/css/post-4.css` → `.elementor-kit-4`).

### Changes Made

- **Theme, hero slot only:**
  - `page-trails.php` renders `the_content()` in the hero position when `myrehat_test_hero_from_elementor()` is true (page open in the Elementor editor, or built with Elementor *and* has elements). Otherwise it renders the original hardcoded hero unchanged as a fallback.
  - The "has elements" condition was added after testing showed that **merely opening the editor marks a page as built with Elementor**, which made the hero disappear while the document was still empty.
  - The listing, booking form, contact bar, and footer are still rendered by the template and are untouched.
- `style.css`: `.site-header-trails #main-search` changed to `#main-search { display:block; margin:14px auto 0; … }`, so the search box keeps its existing style and stays centred inside the Elementor HTML widget (looks identical in the fallback hero).
- **Elementor, built entirely through the editor UI with real mouse drag-and-drop from the panel into the canvas iframe** (no JSON written by hand, no internal JS API):
  - **Structure used: classic Container** (Layout → Container, flex column) with **Heading, Text Editor, HTML**. Atomic V4 was not used because the search box needs an input element, and V4 offers only the Pro "Atomic Form". No experiment was toggled.
  - Container: Align Items Center; Background Classic `#0C6B4F`; Padding 32/20/32/20 (desktop), 24/16/24/16 (mobile); CSS class `trails-hero`.
  - Heading: "Tropic Hiking Trails", H1, centred, `#FFFFFF`, 32px desktop / 28px mobile.
  - Text Editor (Code tab): "Find your next trail with MyRehat", centred, `#FFFFFF`, 16px.
  - HTML: the original `<input id="main-search" type="text" placeholder="Search homepage...">`, width "Full Width (100%)". No new copy.
  - Mobile values were set in Elementor's Mobile Portrait mode (top-bar tab). Elements were selected through the Structure navigator.
  - Published with **Publish** (`save_builder success=true`), then saved as a site template "Trails Hero" via the context menu → "Save as a template" → Site Templates.
- `docs/uat/uat-e2e.js`: hero selector updated to `.trails-hero, .site-header-trails`, and `.elementor-screen-only` excluded from the off-screen element check, so the existing UAT keeps working with the Elementor hero. **The UAT report and screenshots in `docs/uat/` were not regenerated.**

### Responsive Verification

Desktop:
Public page at 1440×900: `scrollWidth` 1440/1440, everything inside the viewport. H1 32px white centred on `rgb(12,107,79)`, padding 32px (block, on `.e-con-inner`) and 20px (inline). Text present. Search input 420px at x 510–930, centred.

390px:
`scrollWidth` 390, nothing outside the viewport. H1 28px on 1 line, padding 24px/16px, search input at x 34–356, tappable (focus received).

### Files / Artifacts Generated

- `scripts/elementor-hero-rebuild.js` (automation; env-based credentials)
- `artifacts/elementor/hero-template.json` (real Elementor export)
- `artifacts/elementor/run-report.json` (steps and checks of the final run)
- `artifacts/screenshots/*.png` (12 files)
- Theme: `wp-content/themes/myrehat-test/functions.php`, `page-trails.php`, `style.css`. Test tooling: `docs/uat/uat-e2e.js`.

### Elementor JSON

File:
`artifacts/elementor/hero-template.json`. The Playwright download event gave the original name `elementor-47-2026-10-23.json`, saved under the suggested name. Exported from **Templates → Saved Templates → "Export Container"** (Elementor labels the action by template type; it calls `library_action=export_template`). 1449 bytes.

Validation:
- JSON parse PASS (starts with `{`, not HTML).
- Structure PASS: `version` 0.4, `type` "container", `title` "Trails Hero", `content` array.
- Hero content detected: container → heading (`title` "Tropic Hiking Trails", `header_size` h1), text-editor, html (`#main-search`). Desktop and mobile padding and font sizes present.
- Credential exposure: NONE (the env user/password values and generic secret patterns are absent).

### Screenshots

- Before: `elementor-before.png` (public 1440), `elementor-before-390.png`, `elementor-editor-before-no-content-area.png` (editor blocked by template), `elementor-editor-no-kit.png` (environment kit issue), `elementor-editor-before.png` (empty Elementor document at the start of the rebuild)
- Editor: `elementor-editor-after-desktop.png`, `elementor-editor-after-mobile.png` (Structure: Container → Heading, Text Editor, HTML)
- After save: `elementor-after-save.png`
- After: `elementor-after-desktop.png`, `elementor-after-390.png` (hero), `elementor-public-after.png`, `elementor-public-after-390.png` (full page)
- None of them contain the login page or credentials.

### Regression Check

- Final script run from a clean state: **26/26 checks pass**. Publish succeeded, the hero persisted after an editor reload, the public old hero was replaced, there are no broken images and no public console errors, and the A10 header search inside the Elementor hero still filters the listing and syncs.
- Full A1–A12 suite on the real WordPress copy (1280px and 390px, logged in and out, booking AJAX, no-JS POST): **200/200**.
- UAT script (scratch copy, so `docs/uat` was not overwritten): **53/53**. B2 security suite: **33/33**. WP `debug.log`: 0 theme entries.
- Findings in the test tooling (not product defects), fixed in the tests:
  - `SPAN.elementor-screen-only` was counted as "outside the viewport". It is Elementor's visually-hidden text, with the same CSS rule as `.screen-reader-text`, and there was no scroll.
  - Elementor adds `html{scroll-behavior:smooth}`. With JS off, Playwright's automatic scroll stalls on it. A real user with JS off scrolling by wheel reaches the form and gets the server-rendered success message (verified).
- Editor console: WordPress core `wp-auth-check.js` throws `Cannot read properties of undefined (reading 'hasClass')` on a heartbeat tick inside the Elementor editor. This was reproduced on an untouched post (#1), so it is unrelated to the hero. It is recorded as a known core issue and is excluded from the hero check only.

### Result

`PARTIAL`. Every hero criterion passes on a real WordPress runtime: built through the Elementor UI, desktop and 390px verified, published and persisted, real JSON export validated, no regressions. It is PARTIAL because the work ran on the **isolated WordPress copy** (this site's database is not reachable). The Elementor page data and saved template exist only there, so applying it to the real site requires the theme change plus importing `hero-template.json` (or re-running the script) against that site.

### Remaining Notes

- Git: the theme source changed (hero slot plus one CSS selector), as did `docs/uat/uat-e2e.js`. New `scripts/` and `artifacts/`. The Elementor page changes and the "Trails Hero" template were stored in WordPress data in the isolated copy; that data has no corresponding source diff.
- To apply on the real site: deploy the theme change, then either run `scripts/elementor-hero-rebuild.js` with `BASE_URL`/`WP_USER`/`WP_PASS` (the script expects an empty Elementor document on the front page), or import `artifacts/elementor/hero-template.json` via Templates → Import and insert it on the page.
- The Elementor kit typography (Roboto 600) is now used for the hero H1, instead of the theme's system font at 500.
- The search input still has no `<label>` or `aria-label`, carried over unchanged from the original hero. Not changed, to avoid new copy.
- `docs/uat/README.md` and its screenshots still show the pre-Elementor hero. Regenerate them in final verification if wanted.
- Scratch-only helpers (not in the repo): a reset script that clears page 4's Elementor data between development runs, and the earlier B2 test mu-plugin.

---
