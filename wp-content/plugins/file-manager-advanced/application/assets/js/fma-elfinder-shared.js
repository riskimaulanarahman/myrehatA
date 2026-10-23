/**
 * Shared elFinder configuration — performance tuning, dynamic height, unified UI hooks.
 */
(function (window, $) {
	'use strict';

	if (!$) {
		return;
	}

	// elfinder.min.js hardcodes maxHeight:'window' on edit dialogs — disable height sync so our layout controls size.
	if ($.fn.elfinderdialog && !$.fn.elfinderdialog.__fmaEditorMaxHeightPatch) {
		var elfinderDialogOriginal = $.fn.elfinderdialog;
		var patchedElfinderDialog = function (opts, fm) {
			if (opts && typeof opts === 'object' && !Array.isArray(opts)) {
				var patch = null;
				if (opts.maxHeight === 'window' && opts.allowMaximize) {
					patch = { maxHeight: null };
				} else if (opts.cssClass && /elfinder-dialog-(confirm|error)/.test(String(opts.cssClass))) {
					patch = {
						maxHeight: null,
						maxWidth: null,
						width: opts.width || 'auto',
						resizable: false,
					};
				}
				if (patch) {
					opts = $.extend({}, opts, patch);
				}
			}
			return elfinderDialogOriginal.call(this, opts, fm);
		};
		// Preserve plugin defaults/methods attached to the original jQuery plugin function.
		$.extend(patchedElfinderDialog, elfinderDialogOriginal);
		patchedElfinderDialog.__fmaEditorMaxHeightPatch = true;
		$.fn.elfinderdialog = patchedElfinderDialog;
	}

	function isConfirmNotSaveMessage(text) {
		if (text === 'confirmNotSave') {
			return true;
		}
		return $.isArray(text) && text.indexOf('confirmNotSave') !== -1;
	}

	function patchElfinderConfirm() {
		if (typeof elFinder === 'undefined' || !elFinder.prototype || elFinder.prototype._fmaConfirmPatched) {
			return;
		}
		var originalConfirm = elFinder.prototype.confirm;
		elFinder.prototype.confirm = function (opts) {
			opts = $.extend(true, {}, opts || {});
			if (isConfirmNotSaveMessage(opts.text)) {
				opts.title = 'Unsaved changes';
			}
			var userOptionsCallback = opts.optionsCallback;
			opts.optionsCallback = function (options) {
				options.width = 420;
				options.maxWidth = null;
				options.maxHeight = null;
				options.resizable = false;
				if (typeof userOptionsCallback === 'function') {
					userOptionsCallback(options);
				}
			};
			return originalConfirm.call(this, opts);
		};
		elFinder.prototype._fmaConfirmPatched = true;
	}

	patchElfinderConfirm();

	/**
	 * AFM-919: Legacy released-Pro Code Pilot shim for Free 6.0 dialog/fullscreen editor.
	 * Skipped entirely when modern Pro sets window.afmpCodePilotModern = true.
	 */
	var CODE_PILOT_PANEL_WIDTH = 380;

	function isCodePilotScriptLoaded() {
		return $('script[src*="ai-code-pilot.js"]').length > 0;
	}

	var legacyCodePilotSyncTimer = null;
	var legacyCodePilotPanelOpen = null;

	function isLegacyCodePilotShimActive() {
		return window._fmaLegacyCodePilotShimActive === true;
	}

	function tryActivateLegacyCodePilotShim() {
		if (window._fmaLegacyCodePilotShimSkipped) {
			return false;
		}
		if (window._fmaLegacyCodePilotShimActive) {
			return true;
		}
		if (window.afmpCodePilotModern === true) {
			window._fmaLegacyCodePilotShimSkipped = true;
			return false;
		}
		if (!isCodePilotScriptLoaded()) {
			return false;
		}
		window._fmaLegacyCodePilotShimActive = true;
		bindLegacyCodePilotShim();
		return true;
	}

	function ensureLegacyCodePilotStyles() {
		if ($('#afmp-cp-main-styles').length || $('#afmp-cp-legacy-shim-styles').length) {
			return;
		}

		var style = document.createElement('style');
		style.id = 'afmp-cp-legacy-shim-styles';
		style.textContent =
			'#afmp-code-pilot-btn{position:absolute;bottom:120px;right:20px;z-index:100101;cursor:pointer;transition:transform .2s ease;width:auto;height:auto;line-height:0}' +
			'#afmp-code-pilot-btn:hover{transform:scale(1.1)}' +
			'#afmp-code-pilot-btn .afmp-cp-btn-icon img{width:48px;height:48px;background:#0b3c41;border-radius:50%;padding:6px;box-shadow:0 4px 15px rgba(0,0,0,.3);display:block;object-fit:contain}' +
			'#afmp-code-pilot-btn .afmp-cp-btn-tooltip{position:absolute;right:60px;top:50%;transform:translateY(-50%);background:#0b3c41;color:#fff;padding:6px 14px;border-radius:20px;font-size:13px;white-space:nowrap;opacity:0;transition:all .3s ease;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.1)}' +
			'#afmp-code-pilot-btn:hover .afmp-cp-btn-tooltip{opacity:1;right:70px}' +
			'#afmp-code-pilot-btn.panel-open{display:none}';
		document.head.appendChild(style);
	}

	function patchLegacyCodePilotRemovalGuard() {
		if ($.fn.remove.__fmaLegacyCodePilotGuard) {
			return;
		}

		var originalRemove = $.fn.remove;
		$.fn.remove = function () {
			if (isLegacyCodePilotShimActive() && getActiveEditorDialog().length) {
				var $nodes = this;
				var isBulkCleanup = $nodes.length > 1;
				var $keep = $nodes.filter(function () {
					var id = this.id || '';
					if (id === 'afmp-code-pilot-btn') {
						return false;
					}
					if (id === 'afmp-code-pilot-panel' && isBulkCleanup) {
						return false;
					}
					return true;
				});
				if (!$keep.length) {
					return this;
				}
				return originalRemove.call($keep);
			}
			return originalRemove.apply(this, arguments);
		};
		$.fn.remove.__fmaLegacyCodePilotGuard = true;
	}

	function prepareLegacyCodePilotForEditor() {
		if (window.afmpCodePilotModern === true) {
			window._fmaLegacyCodePilotShimSkipped = true;
			return false;
		}
		if (!isCodePilotScriptLoaded() || window._fmaLegacyCodePilotShimSkipped) {
			return false;
		}
		window._fmaLegacyCodePilotProbeComplete = true;
		return tryActivateLegacyCodePilotShim();
	}

	function getActiveEditorDialog() {
		var $dialogs = $('.elfinder-dialog:visible').filter(function () {
			return $(this).find('.CodeMirror, textarea.elfinder-file-edit').length > 0;
		});

		if ($dialogs.length) {
			return $dialogs.last();
		}

		var $maximized = $('.elfinder-dialog.elfinder-maximized').filter(function () {
			return $(this).find('.CodeMirror, textarea.elfinder-file-edit').length > 0;
		});
		if ($maximized.length) {
			return $maximized.last();
		}

		return $();
	}

	function getCodePilotIconUrl() {
		if (window.wpApiSettings && window.wpApiSettings.codePilotIconUrl) {
			return window.wpApiSettings.codePilotIconUrl;
		}
		if (window.wpApiSettings && window.wpApiSettings.pluginUrl) {
			return String(window.wpApiSettings.pluginUrl).replace(/\/?$/, '/') + 'images/codepilot.png';
		}
		var $script = $('script[src*="ai-code-pilot.js"]').last();
		if ($script.length && $script.attr('src')) {
			return $script.attr('src').replace(/js\/ai-code-pilot\.js(?:\?.*)?$/, 'images/codepilot.png');
		}
		if (window.afm_object && window.afm_object.plugin_url) {
			return String(window.afm_object.plugin_url).replace(/\/?$/, '/') + 'application/assets/images/codepilot.png';
		}
		return '';
	}

	function getCodePilotMountTarget($dialog) {
		if (!$dialog || !$dialog.length) {
			return $();
		}

		if ($dialog.hasClass('elfinder-maximized')) {
			var $editorWrap = $dialog.find('.fma-maximized-editor').first();
			if ($editorWrap.length) {
				return $editorWrap;
			}
		}

		return $dialog;
	}

	function positionLegacyCodePilotButton($dialog) {
		var $btn = $('#afmp-code-pilot-btn');
		if (!$btn.length || !$dialog || !$dialog.length || $btn.hasClass('panel-open')) {
			return;
		}

		var btnPaneH = $dialog.find('.ui-dialog-buttonpane').outerHeight() || 0;
		var isMaximized = $dialog.hasClass('elfinder-maximized');
		var panelOpen = $('#afmp-code-pilot-panel').length > 0;
		var rightOffset = isMaximized ? 28 : 18;

		if (panelOpen) {
			rightOffset = CODE_PILOT_PANEL_WIDTH + (isMaximized ? 28 : 18);
		}

		if (isMaximized) {
			$btn.css({
				position: 'fixed',
				bottom: btnPaneH + 20 + 'px',
				right: rightOffset + 'px',
				zIndex: 100102,
				pointerEvents: 'auto',
				display: '',
				visibility: 'visible',
				opacity: '',
			});
			return;
		}

		$btn.css({
			position: 'absolute',
			bottom: btnPaneH + 14 + 'px',
			right: rightOffset + 'px',
			zIndex: 100101,
			pointerEvents: 'auto',
			display: '',
			visibility: 'visible',
			opacity: '',
		});
	}

	function ensureLegacyCodePilotButton() {
		if (!isLegacyCodePilotShimActive()) {
			return;
		}

		ensureLegacyCodePilotStyles();

		var $dialog = getActiveEditorDialog();
		if (!$dialog.length || $('#afmp-code-pilot-panel').length) {
			return;
		}

		var $btn = $('#afmp-code-pilot-btn');
		if (!$btn.length) {
			var iconUrl = getCodePilotIconUrl();
			if (!iconUrl) {
				return;
			}

			var $mount = getCodePilotMountTarget($dialog);
			if (!$mount.length) {
				return;
			}

			if ($mount.css('position') === 'static') {
				$mount.css('position', 'relative');
			}

			$btn = $(
				'<div id="afmp-code-pilot-btn">' +
					'<div class="afmp-cp-btn-icon"><img src="' + iconUrl + '" alt="Code Pilot" /></div>' +
					'<span class="afmp-cp-btn-tooltip">Ask Code Pilot</span>' +
				'</div>'
			);
			$mount.append($btn);
		}

		var $mountTarget = getCodePilotMountTarget($dialog);
		if ($mountTarget.length && $btn.parent()[0] !== $mountTarget[0]) {
			if ($mountTarget.css('position') === 'static') {
				$mountTarget.css('position', 'relative');
			}
			$btn.appendTo($mountTarget);
		} else if (!$dialog.hasClass('elfinder-maximized') && $btn.parent()[0] !== $dialog[0]) {
			if ($dialog.css('position') === 'static') {
				$dialog.css('position', 'relative');
			}
			$btn.appendTo($dialog);
		}

		positionLegacyCodePilotButton($dialog);
	}

	function refreshLegacyCodePilotEditorLayout() {
		var $dialog = getActiveEditorDialog();
		if (!$dialog.length) {
			if (typeof window.afmResizeElfinder === 'function') {
				window.afmResizeElfinder();
			}
			return;
		}

		if (!$dialog.hasClass('elfinder-maximized')) {
			centerNormalEditorDialog($dialog, $dialog.data('fma-fm') || null);
		}

		$dialog.trigger('resize');

		var editor = $dialog.data('fma-cm-editor');
		var $ta = $dialog.data('fma-edit-ta');
		if (editor && $ta && $ta.length) {
			syncCodeMirrorEditorSize(editor, $ta);
		}

		if (typeof window.afmResizeElfinder === 'function') {
			window.afmResizeElfinder();
		}
	}

	function syncLegacyCodePilotPanelLayout(forceHeavy) {
		if (!isLegacyCodePilotShimActive()) {
			return;
		}

		var panelOpen = $('#afmp-code-pilot-panel').length > 0;
		var stateChanged = legacyCodePilotPanelOpen !== panelOpen;

		if (stateChanged) {
			legacyCodePilotPanelOpen = panelOpen;
			if (panelOpen) {
				$('body').addClass('afmp-code-pilot-open');
			} else {
				$('body').removeClass('afmp-code-pilot-open');
			}
			$('#file_manager_advanced, #file_manager_advanced_proxy').css('margin-right', '');
		}

		if (forceHeavy || stateChanged) {
			refreshLegacyCodePilotEditorLayout();
		}

		positionLegacyCodePilotButton(getActiveEditorDialog());
	}

	function runLegacyCodePilotLightSync() {
		if (!isLegacyCodePilotShimActive()) {
			return;
		}
		ensureLegacyCodePilotButton();
		syncLegacyCodePilotPanelLayout(false);
	}

	function runLegacyCodePilotFullSync() {
		if (!isLegacyCodePilotShimActive()) {
			return;
		}
		ensureLegacyCodePilotButton();
		syncLegacyCodePilotPanelLayout(true);
	}

	function scheduleLegacyCodePilotSync(options) {
		var opts = options || {};
		if (window._fmaLegacyCodePilotShimSkipped) {
			return;
		}
		if (window.afmpCodePilotModern !== true && isCodePilotScriptLoaded()) {
			prepareLegacyCodePilotForEditor();
		}
		if (!isLegacyCodePilotShimActive()) {
			return;
		}
		clearTimeout(legacyCodePilotSyncTimer);
		legacyCodePilotSyncTimer = setTimeout(function () {
			if (opts.full) {
				runLegacyCodePilotFullSync();
			} else {
				runLegacyCodePilotLightSync();
			}
		}, opts.delay || 0);
	}

	function bindLegacyCodePilotShim() {
		if (window._fmaLegacyCodePilotShimBound) {
			return;
		}
		window._fmaLegacyCodePilotShimBound = true;

		patchLegacyCodePilotRemovalGuard();

		setInterval(function () {
			if (!isLegacyCodePilotShimActive()) {
				return;
			}
			var $dialog = getActiveEditorDialog();
			if (!$dialog.length) {
				return;
			}
			var $btn = $('#afmp-code-pilot-btn');
			if ($btn.length && !$btn.hasClass('panel-open')) {
				positionLegacyCodePilotButton($dialog);
			}
		}, 2000);

		var resizeTimer = null;
		$(window).on('resize.fmaLegacyCodePilot', function () {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function () {
				scheduleLegacyCodePilotSync({ full: true, delay: 50 });
			}, 150);
		});

		$(document).on(
			'afmp:editor-file-changed.fmaLegacyCodePilot dialogopen.fmaLegacyCodePilot dialogresize.fmaLegacyCodePilot',
			function () {
				scheduleLegacyCodePilotSync({ delay: 80 });
			}
		);

		$(document).on('click.fmaLegacyCodePilot', '#afmp-code-pilot-btn, #afmp-code-pilot-close', function () {
			scheduleLegacyCodePilotSync({ full: true, delay: 0 });
			scheduleLegacyCodePilotSync({ full: true, delay: 350 });
		});
	}

	window.fmaSyncLegacyCodePilot = function () {
		scheduleLegacyCodePilotSync({ full: true, delay: 0 });
	};
	window.fmaSyncCodePilotPanelLayout = function () {
		if (!tryActivateLegacyCodePilotShim()) {
			return;
		}
		syncLegacyCodePilotPanelLayout(true);
	};

	$(function () {
		setTimeout(function () {
			if (window.afmpCodePilotModern === true) {
				window._fmaLegacyCodePilotShimSkipped = true;
			} else if (isCodePilotScriptLoaded()) {
				tryActivateLegacyCodePilotShim();
				if (isLegacyCodePilotShimActive() && getActiveEditorDialog().length) {
					runLegacyCodePilotFullSync();
				}
			}
			window._fmaLegacyCodePilotProbeComplete = true;
		}, 900);
	});

	function normalizeToCurrentOrigin(url) {
		if (!url || typeof url !== 'string') {
			return url;
		}
		try {
			var parsed = new URL(url, window.location.origin);
			parsed.protocol = window.location.protocol;
			parsed.host = window.location.host;
			return parsed.toString();
		} catch (e) {
			if (url.charAt(0) === '/') {
				return window.location.origin + url;
			}
			return url;
		}
	}

	/**
	 * Route integration/cloud previews through admin-ajax cmd=file (same-origin proxy).
	 */
	function buildElfinderConnectorFileUrl(fm, file, opts) {
		opts = opts || {};
		var connectorUrl = fm.options.url;
		var params = $.extend({}, fm.customData, {
			cmd: 'file',
			target: file.hash,
			_t: file.ts || Math.floor(Date.now() / 1000),
		});
		if (opts.download) {
			params.download = 1;
		}
		return connectorUrl + (connectorUrl.indexOf('?') === -1 ? '?' : '&') + $.param(params);
	}

	function isConnectorAjaxUrl(url) {
		return !!(url && typeof url === 'string' && url.indexOf('admin-ajax.php') !== -1);
	}

	/**
	 * Download via POST form + hidden iframe (reliable on InstaWP; avoids GET admin-ajax 500s).
	 */
	function submitConnectorFileDownload(fm, file) {
		if (!fm || !file) {
			return;
		}
		var uniq = 'afmdl' + Date.now();
		var $iframe = $('<iframe style="display:none" name="' + uniq + '"></iframe>').appendTo('body');
		var $form = $('<form method="post" target="' + uniq + '" style="display:none"></form>').attr(
			'action',
			fm.options.url
		);
		var params = $.extend({}, fm.customData, {
			cmd: 'file',
			target: file.hash,
			download: 1,
			_t: file.ts || Math.floor(Date.now() / 1000),
		});
		$.each(params, function (key, val) {
			$form.append($('<input type="hidden">').attr('name', key).val(val));
		});
		if (typeof fm.pauseUnloadCheck === 'function') {
			fm.pauseUnloadCheck(true);
		}
		$form.appendTo('body').submit().remove();
		setTimeout(function () {
			$iframe.remove();
			if (typeof fm.pauseUnloadCheck === 'function') {
				fm.pauseUnloadCheck(false);
			}
		}, 60000);
	}

	function handleConnectorDownload(fm, file, callback) {
		if (!fm || !file || typeof callback !== 'function') {
			return false;
		}
		// Prefer GET stream URL (AFM-966): POST iframe downloads were returning
		// net::ERR_INVALID_RESPONSE / 500 on Blocks frontend admin-ajax.
		var getUrl = buildElfinderConnectorFileUrl(fm, file, { download: true });
		if (getUrl) {
			if (typeof fm.pauseUnloadCheck === 'function') {
				fm.pauseUnloadCheck(true);
			}
			callback(getUrl);
			return true;
		}
		submitConnectorFileDownload(fm, file);
		callback('');
		return true;
	}

	/**
	 * True when local volume has no usable public base URL (hide_path / InstaWP mismatch).
	 */
	function localVolumeNeedsConnectorProxy(fm, file) {
		if (!isLocalFilesystemVolume(fm, file)) {
			return false;
		}
		var volUrl = fm.option('url', file.hash);
		if (!volUrl || String(volUrl).indexOf('admin-ajax.php') !== -1) {
			return true;
		}
		try {
			var probe = String(volUrl).replace(/\/?$/, '/') + 'wp-content/x';
			return isMisalignedPublicFileUrl(probe) || isMisalignedPublicFileUrl(volUrl);
		} catch (e) {
			return true;
		}
	}

	function isCrossOriginAbsoluteUrl(url) {
		if (!url || typeof url !== 'string' || url.indexOf('http') !== 0) {
			return false;
		}
		try {
			return new URL(url, window.location.origin).origin !== window.location.origin;
		} catch (e) {
			return false;
		}
	}

	function isLocalFilesystemVolume(fm, file) {
		if (!fm || !file) {
			return false;
		}
		var volUrl = fm.option('url', file.hash);
		// Cloud/integration volumes stream via admin-ajax; local volumes use a public base URL (or empty when hidden).
		if (volUrl && String(volUrl).indexOf('admin-ajax.php') !== -1) {
			return false;
		}
		return true;
	}

	function isMisalignedPublicFileUrl(url) {
		if (!url || typeof url !== 'string' || url.indexOf('admin-ajax.php') !== -1) {
			return false;
		}
		try {
			var parsed = new URL(url, window.location.origin);
			if (parsed.origin !== window.location.origin) {
				return false;
			}

			var path = parsed.pathname || '';
			var adminPath = window.location.pathname || '';
			var homePath = '';
			if (window.afm_object && window.afm_object.home_path) {
				homePath = String(window.afm_object.home_path);
			} else {
				var adminMatch = adminPath.match(/^(.*?)\/wp-admin(?:\/|$)/);
				if (adminMatch) {
					homePath = adminMatch[1];
				} else {
					// Frontend Blocks: detect WP subdirectory (e.g. /i) from REST root link.
					try {
						var apiLink = document.querySelector('link[rel="https://api.w.org/"]');
						if (apiLink && apiLink.href) {
							homePath = new URL(apiLink.href, window.location.origin).pathname.replace(/\/wp-json\/?$/, '') || '';
						}
					} catch (ignoreApiLink) {}
				}
			}

			// WP installed in a subdirectory (e.g. /i): static /{subdir}/wp-content/... is usually a 404.
			if (homePath && homePath !== '/') {
				var prefix = homePath.replace(/\/$/, '');
				if (
					path.indexOf(prefix + '/wp-content/') === 0 ||
					path.indexOf(prefix + '/wp-includes/') === 0 ||
					path === prefix + '/wp-content' ||
					path === prefix + '/wp-includes'
				) {
					return true;
				}
			}

			return false;
		} catch (e) {
			return false;
		}
	}

	/**
	 * Files that the web server executes when hit via public URL (not served as download).
	 * Direct /uploads/foo.php downloads fail in Chrome with "File wasn't available on site".
	 */
	function isServerExecutedFilename(name) {
		if (!name || typeof name !== 'string') {
			return false;
		}
		var lower = name.toLowerCase();
		return (
			/\.php\d?$/i.test(lower) ||
			/\.phtml$/i.test(lower) ||
			/\.phar$/i.test(lower) ||
			/\.php\./i.test(lower)
		);
	}

	function isServerExecutedElfinderFile(file) {
		if (!file || file.mime === 'directory') {
			return false;
		}
		if (file.name && isServerExecutedFilename(file.name)) {
			return true;
		}
		var mime = String(file.mime || '').toLowerCase();
		return (
			mime.indexOf('php') !== -1 ||
			mime === 'application/x-httpd-php' ||
			mime === 'application/x-httpd-php-source'
		);
	}

	function shouldProxyElfinderFileUrl(fm, file, candidateUrl) {
		if (!file || file.mime === 'directory') {
			return false;
		}
		if (isCrossOriginAbsoluteUrl(candidateUrl)) {
			return true;
		}
		if (candidateUrl && candidateUrl.indexOf('admin-ajax.php') !== -1) {
			return false;
		}
		// Always stream PHP via connector — public URL executes the script instead of downloading.
		if (isServerExecutedElfinderFile(file)) {
			return true;
		}
		// AFM-906 / AFM-966: proxy local files only when the public URL is missing or
		// misaligned (e.g. InstaWP /i/). On normal installs use direct static URLs so
		// Blocks open/preview/download do not depend on admin-ajax streaming.
		if (localVolumeNeedsConnectorProxy(fm, file)) {
			return true;
		}
		if (isMisalignedPublicFileUrl(candidateUrl)) {
			return true;
		}
		return false;
	}

	/**
	 * Build a same-origin file URL from the elFinder hash path (reliable right after upload).
	 *
	 * @param {object} fm
	 * @param {object} file
	 * @return {string}
	 */
	function buildLocalFileUrlFromHash(fm, file) {
		if (!fm || !file || file.mime === 'directory') {
			return '';
		}
		// PHP must stream via connector — never synthesize a public executable URL.
		if (isServerExecutedElfinderFile(file)) {
			return '';
		}
		// Only skip synthesizing URLs when the volume must stream via connector.
		if (localVolumeNeedsConnectorProxy(fm, file)) {
			return '';
		}
		var volUrl = fm.option('url', file.hash);
		if (!volUrl || volUrl.indexOf('admin-ajax.php') !== -1) {
			return '';
		}
		var parts = $.map(fm.path2array(file.hash), function (n) {
			return encodeURIComponent(n);
		}).slice(1);
		if (!parts.length) {
			return '';
		}
		var built = volUrl + parts.join('/');
		if (isMisalignedPublicFileUrl(built)) {
			return '';
		}
		return built;
	}

	function appendElfinderFileCacheBust(url, file) {
		if (!url) {
			return url;
		}
		var ts = file && file.ts ? file.ts : Math.floor(Date.now() / 1000);
		return url + (url.indexOf('?') === -1 ? '?' : '&') + '_t=' + ts;
	}

	function resolveElfinderFileCandidateUrl(fm, file) {
		if (isServerExecutedElfinderFile(file) || localVolumeNeedsConnectorProxy(fm, file)) {
			return '';
		}
		var built = buildLocalFileUrlFromHash(fm, file);
		if (built) {
			return built;
		}
		if (file.url && file.url !== '1' && !isMisalignedPublicFileUrl(file.url)) {
			return file.url;
		}
		var volUrl = fm.option('url', file.hash);
		if (!volUrl || volUrl.indexOf('admin-ajax.php') !== -1 || isMisalignedPublicFileUrl(volUrl + 'wp-content/x')) {
			return '';
		}
		var parts = $.map(fm.path2array(file.hash), function (n) {
			return encodeURIComponent(n);
		}).slice(1);
		if (!parts.length) {
			return '';
		}
		var fallback = volUrl + parts.join('/');
		return isMisalignedPublicFileUrl(fallback) ? '' : fallback;
	}

	/**
	 * Cloud stream volume base URL (admin-post.php?action=afmp_*_stream&path=).
	 */
	function isCloudStreamVolumeUrl(volUrl) {
		return !!(
			volUrl &&
			typeof volUrl === 'string' &&
			volUrl.indexOf('admin-post.php') !== -1 &&
			/_stream/i.test(volUrl)
		);
	}

	/**
	 * Rebuild stream URL from hash path (avoids truncated/stale upload URLs).
	 */
	function buildCloudStreamUrlFromHash(fm, file) {
		if (!fm || !file || file.mime === 'directory') {
			return '';
		}
		var volUrl = fm.option('url', file.hash);
		if (!isCloudStreamVolumeUrl(volUrl)) {
			return '';
		}
		var parts = $.map(fm.path2array(file.hash), function (n) {
			return encodeURIComponent(n);
		}).slice(1);
		if (!parts.length) {
			return '';
		}
		return volUrl + parts.join('/');
	}

	/**
	 * Upload responses can include a stale/wrong file.url; refresh cache after upload (AFM-906).
	 *
	 * @param {object} fm
	 * @param {object} data
	 */
	function refreshUploadedFileUrls(fm, data) {
		if (!fm || !data || !data.added || !data.added.length) {
			return;
		}
		var targets = [];
		$.each(data.added, function (_, item) {
			var hash = item && item.hash ? item.hash : item;
			var cached = fm.file(hash);
			if (!cached || cached.mime === 'directory') {
				return;
			}
			// Prefer a freshly built stream URL from the hash path (pCloud/S3/etc).
			var rebuilt = buildCloudStreamUrlFromHash(fm, cached);
			if (rebuilt) {
				cached.url = rebuilt;
				if (item && typeof item === 'object') {
					item.url = rebuilt;
				}
				return;
			}
			delete cached.url;
			targets.push(hash);
		});
		if (!targets.length) {
			return;
		}
		fm.request({
			data: { cmd: 'info', targets: targets },
			preventDefault: true,
			options: { async: true },
			notify: false,
		}).done(function (res) {
			if (res && res.files && res.files.length) {
				fm.updateCache({ changed: res.files });
			}
		});
	}

	/**
	 * AFM-966: Folder ZIP phase-2 on modern Chrome uses GET <a download>
	 * (download attribute supported). PHP 302s that request to uploads/afm-zipdl.
	 * Do NOT also fetch→blob on click — that caused double downloads (one fail + one tiny).
	 */
	function downloadZipBlob(url, body, zipName) {
		// Keep download URL on the same scheme as the page (avoid https→http mixed content).
		if (url && typeof url === 'string' && window.location.protocol === 'https:' && url.indexOf('http://') === 0) {
			url = 'https://' + url.substring('http://'.length);
		}

		var opts = {
			credentials: 'same-origin',
			cache: 'no-store',
			redirect: 'follow',
		};
		if (body !== null && body !== undefined) {
			opts.method = 'POST';
			opts.headers = {
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
			};
			opts.body = body;
		} else {
			opts.method = 'GET';
		}

		return fetch(url, opts)
			.then(function (res) {
				if (!res.ok) {
					throw new Error('zipdl HTTP ' + res.status);
				}
				var ct = (res.headers.get('content-type') || '').toLowerCase();
				if (ct.indexOf('application/json') !== -1 || ct.indexOf('text/html') !== -1) {
					throw new Error('zipdl not binary');
				}
				return res.blob();
			})
			.then(function (blob) {
				if (!blob || !blob.size) {
					throw new Error('empty zip');
				}
				var objectUrl = (window.URL || window.webkitURL).createObjectURL(blob);
				var link = document.createElement('a');
				link.href = objectUrl;
				link.setAttribute('download', zipName || 'download.zip');
				link.style.display = 'none';
				document.body.appendChild(link);
				link.click();
				setTimeout(function () {
					if (link.parentNode) {
						link.parentNode.removeChild(link);
					}
					try {
						(window.URL || window.webkitURL).revokeObjectURL(objectUrl);
					} catch (err) {}
				}, 2000);
			});
	}

	function isZipdlDownloadUrl(url) {
		if (!url || typeof url !== 'string') {
			return false;
		}
		return (
			url.indexOf('admin-ajax.php') !== -1 &&
			url.indexOf('cmd=zipdl') !== -1 &&
			(url.indexOf('download=1') !== -1 || url.indexOf('download%3D1') !== -1)
		);
	}

	function bindZipdlGetDownloadInterceptor() {
		if (window._fmaZipdlFormInterceptBound || !$) {
			return;
		}
		window._fmaZipdlFormInterceptBound = true;

		// POST iframe path (rare on desktop Chrome): one fetch→blob download only.
		$(document).on('submit.fmaZipdlGet', 'form', function (e) {
			var $form = $(this);
			var cmd = $form.find('input[name="cmd"]').val();
			var download = $form.find('input[name="download"]').val();
			if (cmd !== 'zipdl' || String(download) !== '1') {
				return;
			}

			var action = $form.attr('action') || '';
			if (!action || action.indexOf('admin-ajax.php') === -1) {
				return;
			}

			e.preventDefault();
			e.stopImmediatePropagation();

			var zipName = 'download.zip';
			$form.find('input[name="targets[]"]').each(function (idx) {
				if (idx === 2 && $(this).val()) {
					zipName = $(this).val();
				}
			});

			downloadZipBlob(action, $form.serialize(), zipName).catch(function (err) {
				if (window.console && console.warn) {
					console.warn('AFM: folder ZIP download failed', err);
				}
			});

			return false;
		});

		// Chrome GET <a download> path: only fix http→https on the href.
		// Letting the browser handle a single navigation avoids double downloads.
		document.addEventListener(
			'click',
			function (e) {
				var a = e.target && e.target.closest ? e.target.closest('a') : null;
				if (!a || !a.href || !isZipdlDownloadUrl(a.href)) {
					return;
				}
				if (window.location.protocol === 'https:' && a.href.indexOf('http://') === 0) {
					a.href = 'https://' + a.href.substring('http://'.length);
				}
			},
			true
		);
	}

	function bindElfinderIntegrationFileUrls(fm) {
		if (!fm || fm._fmaIntegrationFileUrlPatched) {
			return;
		}
		fm._fmaIntegrationFileUrlPatched = true;

		bindZipdlGetDownloadInterceptor();

		fm.bind('upload', function (e, data) {
			refreshUploadedFileUrls(fm, data);
		});

		var scrubFilePublicUrl = function (file) {
			if (!file || file.mime === 'directory') {
				return;
			}
			// Force connector URL for PHP (public URL executes instead of downloading).
			if (isServerExecutedElfinderFile(file)) {
				file.url = '1';
				return;
			}
			// Only force connector URL when public URL is unusable (AFM-966).
			if (
				file.url &&
				file.url !== '1' &&
				(localVolumeNeedsConnectorProxy(fm, file) || isMisalignedPublicFileUrl(file.url))
			) {
				file.url = '1';
			}
		};

		fm.bind('open upload add change', function (e) {
			var data = e.data || {};
			var lists = [];
			if (data.files) {
				lists.push(data.files);
			}
			if (data.added) {
				lists.push(data.added);
			}
			if (data.changed) {
				lists.push(data.changed);
			}
			$.each(lists, function (_, list) {
				$.each(list, function (__, item) {
					scrubFilePublicUrl(typeof item === 'object' ? item : fm.file(item));
				});
			});
		});

		var originalOpenUrl = fm.openUrl;
		fm.openUrl = function (hash, download, callback, requestOpts) {
			var file = fm.file(hash);
			if (!file) {
				return originalOpenUrl.apply(this, arguments);
			}

			scrubFilePublicUrl(file);

			// Cloud stream volumes: always rebuild URL from hash so post-upload
			// opens don't use a truncated/stale path (pCloud 404 without reload).
			var cloudStreamUrl = buildCloudStreamUrlFromHash(fm, file);
			if (cloudStreamUrl) {
				file.url = cloudStreamUrl;
				var opened = appendElfinderFileCacheBust(cloudStreamUrl, file);
				if (typeof callback === 'function') {
					callback(opened);
					return;
				}
				return opened;
			}

					// AFM-906: stream through connector only when public URL is unusable (AFM-966).
					if (shouldProxyElfinderFileUrl(fm, file, file.url || '')) {
				if (download === true && typeof callback === 'function') {
					handleConnectorDownload(fm, file, callback);
					return;
				}
				var proxyUrl = buildElfinderConnectorFileUrl(fm, file, { download: !!download });
				if (typeof callback === 'function') {
					callback(proxyUrl);
					return;
				}
				return proxyUrl;
			}

			if (download === true && typeof callback === 'function') {
				// Never use direct public URL for PHP — server executes the file.
				if (isServerExecutedElfinderFile(file)) {
					handleConnectorDownload(fm, file, callback);
					return;
				}
				var directCandidate = resolveElfinderFileCandidateUrl(fm, file);
				if (directCandidate) {
					try {
						var directUrl = new URL(directCandidate, window.location.origin);
						if (directUrl.origin === window.location.origin) {
							if (typeof fm.pauseUnloadCheck === 'function') {
								fm.pauseUnloadCheck(true);
							}
							callback(appendElfinderFileCacheBust(directUrl.toString(), file));
							return;
						}
					} catch (ignoreDirectUrl) { }
				}

				return originalOpenUrl.call(this, hash, download, function (url) {
					if (!url) {
						callback(url);
						return;
					}
					if (isConnectorAjaxUrl(url) || isMisalignedPublicFileUrl(url) || isServerExecutedElfinderFile(file)) {
						handleConnectorDownload(fm, file, callback);
						return;
					}
					callback(url);
				}, requestOpts);
			}

			if (typeof callback === 'function') {
				return originalOpenUrl.call(this, hash, download, function (url) {
					if (file && url && isMisalignedPublicFileUrl(url)) {
						callback(buildElfinderConnectorFileUrl(fm, file, { download: !!download }));
						return;
					}
					callback(url);
				}, requestOpts);
			}

			var syncResult = originalOpenUrl.apply(this, arguments);
			if (file && syncResult && isMisalignedPublicFileUrl(syncResult)) {
				return buildElfinderConnectorFileUrl(fm, file, { download: !!download });
			}
			return syncResult;
		};

		var originalUrl = fm.url.bind(fm);
		fm.url = function (hash, opts) {
			opts = opts || {};
			var file = fm.file(hash);
			var async = !!opts.async;

			if (file) {
				scrubFilePublicUrl(file);
			}

			if (file) {
				var streamUrl = buildCloudStreamUrlFromHash(fm, file);
				if (streamUrl) {
					file.url = streamUrl;
					if (async) {
						return $.Deferred().resolve(streamUrl).promise();
					}
					return streamUrl;
				}
			}

			if (file && shouldProxyElfinderFileUrl(fm, file, file.url || '')) {
				var proxyUrl = buildElfinderConnectorFileUrl(fm, file, { download: !!opts.download });
				if (async) {
					return $.Deferred().resolve(proxyUrl).promise();
				}
				return proxyUrl;
			}

			var result = originalUrl(hash, opts);
			if (async && result && typeof result.then === 'function') {
				return result.then(function (resolvedUrl) {
					if (file && (isCrossOriginAbsoluteUrl(resolvedUrl) || isMisalignedPublicFileUrl(resolvedUrl))) {
						return buildElfinderConnectorFileUrl(fm, file, { download: !!opts.download });
					}
					return resolvedUrl;
				});
			}
			if (!async && file && (isCrossOriginAbsoluteUrl(result) || isMisalignedPublicFileUrl(result))) {
				return buildElfinderConnectorFileUrl(fm, file, { download: !!opts.download });
			}
			return result;
		};
	}

	window.bindElfinderIntegrationFileUrls = bindElfinderIntegrationFileUrls;

	function isDebugEnabled() {
		var enabled = window.afm_object && window.afm_object.debug_enabled;
		return enabled === '1' || enabled === 1 || enabled === true;
	}

	function hideLoadingPlaceholder() {
		var root = document.getElementById('file_manager_advanced');
		if (!root) {
			return;
		}
		var center = root.querySelector('center');
		if (center) {
			center.style.display = 'none';
		}
	}

	window.afmGetElfinderHeight = function afmGetElfinderHeight() {
		var adminBar = document.getElementById('wpadminbar');
		var adminBarH = adminBar ? adminBar.offsetHeight : 32;
		var header = document.querySelector('.afm-header-banner');
		var topbar = document.querySelector('.afm-topbar');
		var review = document.getElementById('fma_rate_us');
		var reviewH = review && review.offsetParent !== null ? (review.offsetHeight + 24) : 0;
		// Header/nav + review + tab inset + footer breathing room (Figma: compact FM pane).
		var chrome =
			adminBarH +
			(header ? header.offsetHeight : 80) +
			(topbar ? topbar.offsetHeight : 52) +
			reviewH +
			140;
		var available = window.innerHeight - chrome;
		// Cap so the pane stays shorter than the viewport (less empty space under icons).
		return Math.max(400, Math.min(available, 500));
	};

	window.afmGetElfinderWidth = function afmGetElfinderWidth() {
		var $root = $('#file_manager_advanced');
		if (!$root.length) {
			return 0;
		}
		var $card = $root.closest('.afm-fm-layout__card');
		var $main = $root.closest('.afm-fm-layout__main');
		var $proxy = $('#file_manager_advanced_proxy');
		var $tab = $('#afm-file-manager-tab');
		var $left = $root.closest('.afm__left-side');
		var width =
			($card.length ? Math.max(0, $card.innerWidth() - 20) : 0) ||
			($main.length ? $main.innerWidth() : 0) ||
			($proxy.length ? $proxy.innerWidth() : 0) ||
			($tab.length ? $tab.innerWidth() : 0) ||
			($left.length ? $left.innerWidth() : 0) ||
			$root.parent().innerWidth() ||
			$root.innerWidth();
		return Math.max(width, 320);
	};

	window.afmResizeElfinder = function afmResizeElfinder() {
		var height = window.afmGetElfinderHeight();
		var width = window.afmGetElfinderWidth();
		var $root = $('#file_manager_advanced');
		if (!$root.length) {
			return;
		}
		$root.css({ width: '100%', minHeight: height + 'px' });
		$root.find('.elfinder').css({ width: '100%', maxWidth: '100%' });
		try {
			var instance = $root.elfinder('instance');
			if (instance && typeof instance.resize === 'function') {
				// elFinder API: resize(width, height) — not (height, width).
				instance.resize(width, height);
			}
		} catch (e) {
			// Not initialized yet.
		}
	};

	function resolveCodeMirrorMode(mime, filename) {
		var mimeMap = {
			'text/x-php': 'application/x-httpd-php',
			'application/x-php': 'application/x-httpd-php',
			'text/html': 'htmlmixed',
			'application/xhtml+xml': 'htmlmixed',
			'text/javascript': 'javascript',
			'application/javascript': 'javascript',
			'text/css': 'css',
			'application/json': { name: 'javascript', json: true },
			'text/xml': 'xml',
			'application/xml': 'xml',
		};

		if (mime && mimeMap[mime]) {
			return mimeMap[mime];
		}

		if (filename) {
			var match = String(filename).match(/\.([^.]+)$/);
			if (match) {
				var extMap = {
					php: 'application/x-httpd-php',
					html: 'htmlmixed',
					htm: 'htmlmixed',
					js: 'javascript',
					css: 'css',
					json: { name: 'javascript', json: true },
					xml: 'xml',
				};
				var ext = match[1].toLowerCase();
				if (extMap[ext]) {
					return extMap[ext];
				}
			}
		}

		return mime || 'text/plain';
	}

	var PHP_DEBUG_MAX_CHARS = 200000;
	var PHP_DEBUG_MAX_LINES = 4000;
	var PHP_DEBUG_DEBOUNCE_MS = 650;
	var PHP_DEBUG_OPEN_DELAY_MS = 300;

	function getEditorPanelHeight() {
		return Math.max(360, Math.min(Math.floor(window.innerHeight * 0.58), 720));
	}

	function getElfinderUiSize(fm) {
		var $ui = fm && typeof fm.getUI === 'function' ? fm.getUI() : $();
		var width = ($ui.length && $ui.innerWidth()) || window.innerWidth || 960;
		var height = ($ui.length && $ui.innerHeight()) || window.innerHeight || 720;
		return {
			width: Math.max(320, width),
			height: Math.max(360, height),
		};
	}

	function getNormalEditorDialogMetrics(fm) {
		var ui = getElfinderUiSize(fm);
		var dialogWidth = Math.min(1120, Math.max(720, Math.floor(ui.width * 0.78)));
		dialogWidth = Math.min(dialogWidth, ui.width - 32);
		var editorHeight = Math.max(320, Math.min(Math.floor(ui.height * 0.52), 500));
		return {
			width: dialogWidth,
			editorHeight: editorHeight,
		};
	}

	function clearElfinderDialogSizeArtifacts($dialog, $content) {
		$dialog.css({ minHeight: '', maxHeight: '' });
		$content.css({ minHeight: '', maxHeight: '', height: '' });
		if ($dialog[0] && $dialog[0].style) {
			$dialog[0].style.removeProperty('min-height');
			$dialog[0].style.removeProperty('max-height');
		}
		if ($content[0] && $content[0].style) {
			$content[0].style.removeProperty('min-height');
			$content[0].style.removeProperty('max-height');
			$content[0].style.removeProperty('height');
		}
	}

	function isElfinderMessageDialog($dialog) {
		return (
			$dialog &&
			$dialog.length &&
			($dialog.hasClass('elfinder-dialog-confirm') || $dialog.hasClass('elfinder-dialog-error'))
		);
	}

	function normalizeMessageDialogContent($content) {
		if (!$content || !$content.length || $content.data('fma-message-normalized')) {
			return;
		}

		var $icon = $content.children('.elfinder-dialog-icon').first();
		var html = $content.html();

		if ($icon.length) {
			var iconHtml = $icon[0].outerHTML;
			var rest = html.slice(html.indexOf(iconHtml) + iconHtml.length);
			$content.html(iconHtml + '<div class="fma-elfinder-dialog-message">' + rest + '</div>');
		} else {
			$content.html('<div class="fma-elfinder-dialog-message">' + html + '</div>');
		}

		$content.data('fma-message-normalized', true);
	}

	function applyElfinderMessageDialogLayout($dialog, fm) {
		if (!$dialog || !$dialog.length || $dialog.hasClass('elfinder-maximized')) {
			return;
		}
		if (!isElfinderMessageDialog($dialog)) {
			return;
		}

		fm = fm || $dialog.data('fma-fm');
		var $content = $dialog.find('.ui-dialog-content').first();
		$dialog.addClass('fma-elfinder-message-dialog');
		normalizeMessageDialogContent($content);
		clearElfinderDialogSizeArtifacts($dialog, $content);
		$content.css({
			height: 'auto',
			minHeight: 0,
			maxHeight: 'none',
			overflow: 'visible',
		});

		var finalize = function () {
			if (!$dialog.is(':visible') || $dialog.hasClass('elfinder-maximized')) {
				return;
			}

			var ui = getElfinderUiSize(fm);
			var $title = $dialog.find('.ui-dialog-titlebar');
			var $buttons = $dialog.find('.ui-dialog-buttonpane');
			var $icon = $content.children('.elfinder-dialog-icon').first();
			var $message = $content.find('.fma-elfinder-dialog-message').first();
			var titleH = $title.outerHeight(true) || 0;
			var btnH = $buttons.outerHeight(true) || 0;
			var pad = 16;
			var maxDialogW = Math.max(260, ui.width - pad * 2);
			var maxDialogH = Math.max(200, ui.height - pad * 2);
			var maxTextW = $dialog.hasClass('elfinder-dialog-error') ? 420 : 360;

			$dialog.css({ width: 'auto', maxWidth: 'none', minWidth: 0 });
			$content.css({
				width: 'auto',
				maxWidth: maxDialogW + 'px',
				maxHeight: Math.max(100, maxDialogH - titleH - btnH) + 'px',
				overflow: 'auto',
			});
			$message.css({
				width: 'auto',
				maxWidth: Math.min(maxTextW, maxDialogW - ($icon.length ? 56 : 36)) + 'px',
			});

			var measuredW = 0;
			if ($message.length) {
				measuredW = Math.max(measuredW, $message[0].scrollWidth || $message.outerWidth(true) || 0);
			}
			if ($icon.length) {
				measuredW += $icon.outerWidth(true) || 0;
			}
			measuredW = Math.max(measuredW, $title.outerWidth(true) || 0, $content[0] ? $content[0].scrollWidth : 0);

			var width = Math.min(Math.ceil(measuredW + 36), maxDialogW);
			width = Math.max(width, 260);

			var contentH = $content.outerHeight(true) || 0;
			var totalH = Math.min(maxDialogH, titleH + contentH + btnH);

			$dialog.css({
				width: width + 'px',
				maxWidth: width + 'px',
				minWidth: 0,
				height: totalH + 'px',
				minHeight: totalH + 'px',
				maxHeight: totalH + 'px',
				overflow: 'hidden',
			});

			centerNormalEditorDialog($dialog, fm);
		};

		requestAnimationFrame(function () {
			requestAnimationFrame(finalize);
		});
	}

	function isElfinderNotifyDialog($dialog) {
		return $dialog && $dialog.length && $dialog.hasClass('elfinder-dialog-notify');
	}

	function applyElfinderNotifyDialogLayout($dialog) {
		if (!$dialog || !$dialog.length || !$dialog.is(':visible')) {
			return;
		}
		if (!isElfinderNotifyDialog($dialog)) {
			return;
		}

		var $content = $dialog.find('.ui-dialog-content').first();
		clearElfinderDialogSizeArtifacts($dialog, $content);
		$content.css({
			height: 'auto',
			minHeight: 0,
			maxHeight: 'none',
			overflow: 'visible',
			padding: 0,
		});

		var contentH = $content.outerHeight(true) || 0;
		$dialog.css({
			width: '260px',
			maxWidth: '260px',
			height: contentH + 'px',
			minHeight: contentH + 'px',
			maxHeight: contentH + 'px',
			overflow: 'hidden',
		});
	}

	function bindElfinderNotifyDialogLayout(fm) {
		if (!fm || typeof fm.bind !== 'function' || fm._fmaNotifyDialogLayoutBound) {
			return;
		}
		fm._fmaNotifyDialogLayoutBound = true;

		var scheduleLayout = function ($dialog) {
			if (!isElfinderNotifyDialog($dialog)) {
				return;
			}
			requestAnimationFrame(function () {
				requestAnimationFrame(function () {
					applyElfinderNotifyDialogLayout($dialog);
				});
			});
			$dialog
				.off('resize.fma-notify-layout')
				.on('resize.fma-notify-layout', function () {
					applyElfinderNotifyDialogLayout($dialog);
				});
		};

		fm.bind('dialogopen', function (e) {
			scheduleLayout(e.data && e.data.dialog);
		});
		fm.bind('dialogopened', function (e) {
			scheduleLayout(e.data && e.data.dialog);
		});

		var bindNotifyResize = function () {
			var $notify = fm.ui && fm.ui.notify;
			if (!$notify || !$notify.length) {
				return;
			}
			$notify
				.off('resize.fma-notify-layout')
				.on('resize.fma-notify-layout', function () {
					scheduleLayout($notify.closest('.elfinder-dialog'));
				});
		};

		bindNotifyResize();
		if (typeof fm.one === 'function') {
			fm.one('uiready', bindNotifyResize);
		}
	}

	function bindElfinderMessageDialogLayout(fm) {
		if (!fm || typeof fm.bind !== 'function' || fm._fmaMessageDialogLayoutBound) {
			return;
		}
		fm._fmaMessageDialogLayoutBound = true;

		var scheduleLayout = function ($dialog) {
			if (!isElfinderMessageDialog($dialog)) {
				return;
			}
			applyElfinderMessageDialogLayout($dialog, fm);
			$dialog
				.off('resize.fma-message-layout')
				.on('resize.fma-message-layout', function () {
					applyElfinderMessageDialogLayout($dialog, fm);
				});
		};

		fm.bind('dialogopen', function (e) {
			scheduleLayout(e.data && e.data.dialog);
		});
		fm.bind('dialogopened', function (e) {
			scheduleLayout(e.data && e.data.dialog);
		});
		fm.bind('dialogposinited', function (e) {
			scheduleLayout(e.data && e.data.dialog);
		});
	}

	window.afmBindElfinderMessageDialogLayout = function afmBindElfinderMessageDialogLayout(fm) {
		bindElfinderMessageDialogLayout(fm);
	};

	function isElfinderInfoDialog($dialog) {
		return (
			$dialog &&
			$dialog.length &&
			$dialog.find('.elfinder-info-tb').length > 0
		);
	}

	function applyElfinderInfoDialogLayout($dialog, fm) {
		if (!$dialog || !$dialog.length || $dialog.hasClass('elfinder-maximized')) {
			return;
		}
		if (!isElfinderInfoDialog($dialog)) {
			return;
		}

		fm = fm || $dialog.data('fma-fm');
		var $content = $dialog.find('.ui-dialog-content').first();
		$dialog.addClass('fma-elfinder-info-dialog');
		clearElfinderDialogSizeArtifacts($dialog, $content);
		$content.css({
			height: 'auto',
			minHeight: 0,
			maxHeight: 'none',
			overflow: 'visible',
		});

		var finalize = function () {
			if (!$dialog.is(':visible') || $dialog.hasClass('elfinder-maximized')) {
				return;
			}

			var ui = getElfinderUiSize(fm);
			var $title = $dialog.find('.ui-dialog-titlebar');
			var $buttons = $dialog.find('.ui-dialog-buttonpane');
			var titleH = $title.outerHeight(true) || 0;
			var btnH = $buttons.outerHeight(true) || 0;
			var pad = 16;
			var maxDialogH = Math.max(240, ui.height - pad * 2);
			var maxDialogW = Math.max(220, ui.width - pad * 2);

			$dialog.css({ width: 'auto', maxWidth: 'none', minWidth: 0 });
			$content.css({
				width: 'auto',
				maxWidth: maxDialogW + 'px',
				maxHeight: Math.max(120, maxDialogH - titleH - btnH) + 'px',
				overflow: 'auto',
			});

			var $infoTitle = $content.find('.elfinder-info-title').first();
			var $infoTable = $content.find('.elfinder-info-tb').first();
			var measuredW = 0;
			if ($infoTitle.length) {
				measuredW = Math.max(measuredW, $infoTitle[0].scrollWidth || $infoTitle.outerWidth(true) || 0);
			}
			if ($infoTable.length) {
				measuredW = Math.max(measuredW, $infoTable[0].scrollWidth || $infoTable.outerWidth(true) || 0);
			}
			if ($content[0]) {
				measuredW = Math.max(measuredW, $content[0].scrollWidth || 0);
			}
			measuredW = Math.max(measuredW, $title.outerWidth(true) || 0);

			var contentPad = 20;
			var width = Math.min(Math.ceil(measuredW + contentPad), maxDialogW);
			width = Math.max(width, 180);

			var contentH = $content.outerHeight(true) || 0;
			var totalH = Math.min(maxDialogH, titleH + contentH + btnH);

			$content.css({
				width: 'auto',
				maxWidth: width + 'px',
			});

			$dialog.css({
				width: width + 'px',
				maxWidth: width + 'px',
				minWidth: 0,
				height: totalH + 'px',
				minHeight: totalH + 'px',
				maxHeight: totalH + 'px',
				overflow: 'hidden',
			});

			centerNormalEditorDialog($dialog, fm);
		};

		requestAnimationFrame(function () {
			requestAnimationFrame(finalize);
		});
	}

	function bindElfinderInfoDialogLayout(fm) {
		if (!fm || typeof fm.bind !== 'function' || fm._fmaInfoDialogLayoutBound) {
			return;
		}
		fm._fmaInfoDialogLayoutBound = true;

		var scheduleLayout = function ($dialog) {
			if (!isElfinderInfoDialog($dialog)) {
				return;
			}
			applyElfinderInfoDialogLayout($dialog, fm);
			$dialog
				.off('resize.fma-info-layout')
				.on('resize.fma-info-layout', function () {
					applyElfinderInfoDialogLayout($dialog, fm);
				});
			[50, 200, 500, 1000].forEach(function (delay) {
				setTimeout(function () {
					applyElfinderInfoDialogLayout($dialog, fm);
				}, delay);
			});
		};

		fm.bind('dialogopen', function (e) {
			scheduleLayout(e.data && e.data.dialog);
		});
		fm.bind('dialogopened', function (e) {
			scheduleLayout(e.data && e.data.dialog);
		});
		fm.bind('dialogposinited', function (e) {
			scheduleLayout(e.data && e.data.dialog);
		});
	}

	function syncElfinderModalOverflowState(fm) {
		if (!fm || typeof fm.getUI !== 'function') {
			return;
		}

		var $ui = fm.getUI();
		if (!$ui || !$ui.length) {
			return;
		}

		var hasModal =
			$ui.find('.elfinder-dialog:visible').length > 0 ||
			$ui.find('.elfinder-quicklook:visible').length > 0 ||
			$ui.find('.elfinder-contextmenu:visible').length > 0;

		$ui.toggleClass('fma-modal-open', hasModal);
	}

	function clampElfinderFloatingPanel($panel, fm) {
		if (!$panel || !$panel.length || $panel.hasClass('elfinder-maximized')) {
			return;
		}
		if ($panel.hasClass('elfinder-quicklook-fullscreen')) {
			return;
		}

		fm = fm || $panel.data('fma-fm');
		var $ui = fm && typeof fm.getUI === 'function' ? fm.getUI() : $();
		if (!$ui.length || !$panel.closest($ui).length) {
			return;
		}

		var pad = 12;
		var containerW = $ui.innerWidth() || 0;
		var containerH = $ui.innerHeight() || 0;
		var panelW = $panel.outerWidth(true) || 0;
		var panelH = $panel.outerHeight(true) || 0;
		var top = parseFloat($panel.css('top'));
		var left = parseFloat($panel.css('left'));

		if (isNaN(top) || isNaN(left)) {
			return;
		}

		top = Math.max(pad, top);
		left = Math.max(pad, left);

		if (panelW < containerW - pad * 2) {
			left = Math.min(left, containerW - panelW - pad);
		}
		if (panelH < containerH - pad * 2) {
			top = Math.min(top, containerH - panelH - pad);
		} else {
			top = pad;
		}

		$panel.css({
			position: 'absolute',
			top: Math.round(top) + 'px',
			left: Math.round(left) + 'px',
			margin: 0,
			transform: 'none',
		});
	}

	function clampVisibleElfinderFloatingPanels(fm) {
		if (!fm || typeof fm.getUI !== 'function') {
			return;
		}

		var $ui = fm.getUI();
		$ui.find('.elfinder-dialog:visible').each(function () {
			clampElfinderFloatingPanel($(this), fm);
		});
		$ui.find('.elfinder-quicklook:visible').each(function () {
			clampElfinderFloatingPanel($(this), fm);
		});
	}

	function scheduleElfinderFloatingPanelLayout(fm) {
		if (!fm) {
			return;
		}
		requestAnimationFrame(function () {
			syncElfinderModalOverflowState(fm);
			clampVisibleElfinderFloatingPanels(fm);
		});
	}

	function bindElfinderModalOverflowFix(fm) {
		if (!fm || typeof fm.bind !== 'function' || fm._fmaModalOverflowBound) {
			return;
		}
		fm._fmaModalOverflowBound = true;

		var scheduleLayout = function () {
			scheduleElfinderFloatingPanelLayout(fm);
			[80, 350, 700].forEach(function (delay) {
				setTimeout(function () {
					scheduleElfinderFloatingPanelLayout(fm);
				}, delay);
			});
		};

		fm.bind('dialogopen', scheduleLayout);
		fm.bind('dialogopened', scheduleLayout);
		fm.bind('dialogposinited', scheduleLayout);
		fm.bind('dialogclosed', function () {
			setTimeout(function () {
				syncElfinderModalOverflowState(fm);
			}, 0);
		});
		fm.bind('exec', function (e) {
			var cmd = e.data && e.data.cmd;
			if (cmd === 'quicklook' || cmd === 'upload') {
				scheduleLayout();
			}
		});

		var $ui = fm.getUI();
		if ($ui && $ui.length) {
			$ui
				.off('resize.fma-modal-overflow')
				.on('resize.fma-modal-overflow', '.elfinder-dialog, .elfinder-quicklook', function () {
					scheduleElfinderFloatingPanelLayout(fm);
				});
		}

		if (typeof fm.one === 'function') {
			fm.one('uiready', scheduleLayout);
		}
	}

	function centerNormalEditorDialog($dialog, fm) {
		if (!$dialog || !$dialog.length || $dialog.hasClass('elfinder-maximized')) {
			return;
		}
		fm = fm || $dialog.data('fma-fm');
		var $container = $dialog.parent();
		var $ui = fm && typeof fm.getUI === 'function' ? fm.getUI() : $();
		if ($ui.length && $dialog.closest($ui).length) {
			$container = $ui;
		}
		if (!$container.length) {
			return;
		}

		// Dialog lives inside .elfinder (position:relative) — use parent coords, not document offset.
		var pad = 16;
		var containerW = $container.innerWidth() || 0;
		var containerH = $container.innerHeight() || 0;
		var dlgW = $dialog.outerWidth(true) || 0;
		var dlgH = $dialog.outerHeight(true) || 0;
		var left = pad + Math.max(0, (containerW - dlgW - pad * 2) / 2);
		var top = pad + Math.max(0, (containerH - dlgH - pad * 2) / 2);

		$dialog.css({
			position: 'absolute',
			top: Math.round(top) + 'px',
			left: Math.round(left) + 'px',
			right: 'auto',
			bottom: 'auto',
			margin: 0,
			transform: 'none',
		});
	}

	function applyNormalEditorDialogLayout($dialog, $ta, editor, fm) {
		if (!$dialog || !$dialog.length || $dialog.hasClass('elfinder-maximized')) {
			return;
		}
		if (!$ta || !$ta.length || !editor) {
			return;
		}

		fm = fm || $dialog.data('fma-fm');
		var $content = $dialog.find('.ui-dialog-content').first();
		teardownMaximizedSplitLayout($content);

		var metrics = getNormalEditorDialogMetrics(fm);
		var editorH = metrics.editorHeight;
		$dialog.data('fma-normal-dialog-metrics', metrics);

		setNormalEditorModalState($dialog, true);
		clearElfinderDialogSizeArtifacts($dialog, $content);

		$dialog.css({
			width: metrics.width + 'px',
			maxWidth: metrics.width + 'px',
			overflow: 'hidden',
		});

		$content.css({
			height: editorH + 'px',
			minHeight: 0,
			maxHeight: editorH + 'px',
			overflow: 'hidden',
			padding: 0,
		});

		var $panel = $ta.parent().addClass('fma-cm-editor-panel');
		var $cm = $(editor.getWrapperElement());
		$panel.css({
			width: '100%',
			height: editorH + 'px',
			minHeight: editorH + 'px',
			maxHeight: editorH + 'px',
		});
		$cm.css({
			height: editorH + 'px',
			minHeight: editorH + 'px',
			maxHeight: editorH + 'px',
		});
		editor.setSize('100%', editorH);

		if ($dialog.data('hasResizable')) {
			try {
				$dialog.resizable('option', 'disabled', true);
			} catch (ignore) { }
		}

		hideElfinderOverlayForEditor(fm);

		var finalizeLayout = function () {
			if ($dialog.hasClass('elfinder-maximized') || !$dialog.is(':visible')) {
				return;
			}

			clearElfinderDialogSizeArtifacts($dialog, $content);

			var titleH = $dialog.find('.ui-dialog-titlebar').outerHeight(true) || 0;
			var btnH = $dialog.find('.ui-dialog-buttonpane').outerHeight(true) || 0;
			var totalH = titleH + editorH + btnH;

			$content.css({
				height: editorH + 'px',
				maxHeight: editorH + 'px',
			});
			$dialog.css({
				height: totalH + 'px',
				minHeight: totalH + 'px',
				maxHeight: totalH + 'px',
			});

			centerNormalEditorDialog($dialog, fm);
			editor.refresh();
		};

		requestAnimationFrame(function () {
			requestAnimationFrame(finalizeLayout);
		});
	}

	function bindNormalEditorDialogResizeGuard($dialog, $ta, editor, fm) {
		if (!$dialog || !$dialog.length || $dialog.data('fma-normal-resize-guard')) {
			return;
		}
		$dialog.data('fma-normal-resize-guard', true);
		var guardNamespace = '.fma-normal-guard-' + ($dialog.attr('id') || String(Date.now()));
		var reapplyNormalLayout = function () {
			if ($dialog.data('fma-normal-layout-lock')) {
				return;
			}
			if (!$dialog.is(':visible') || $dialog.hasClass('elfinder-maximized')) {
				return;
			}
			$dialog.data('fma-normal-layout-lock', true);
			requestAnimationFrame(function () {
				applyNormalEditorDialogLayout($dialog, $ta, editor, fm);
				$dialog.removeData('fma-normal-layout-lock');
			});
		};
		$dialog.on('resize.fma-normal-guard', function (e, data) {
			if ($dialog.hasClass('elfinder-maximized')) {
				return;
			}
			if (data && (data.minimize || data.maxmize)) {
				return;
			}
			reapplyNormalLayout();
		});
		if (fm && typeof fm.getUI === 'function') {
			var $elfNode = fm.getUI();
			if ($elfNode && $elfNode.length) {
				$elfNode.on('resize' + guardNamespace, reapplyNormalLayout);
				$dialog.data('fma-normal-guard-namespace', guardNamespace);
			}
		}
	}

	function syncMaximizedSplitHeight($dialog) {
		var $content = $dialog.find('.ui-dialog-content').first();
		var $split = $content.children('.fma-maximized-split');
		if (!$content.length || !$split.length) {
			return;
		}
		var contentH = $content.innerHeight() || 0;
		if (contentH > 0) {
			$split.css({
				height: contentH + 'px',
				minHeight: contentH + 'px',
				maxHeight: contentH + 'px',
			});
		}
	}

	function measureEncodingSelectWidth(label, fontSize) {
		var text = String(label || 'UTF-8');
		var $probe = $('<select></select>')
			.append($('<option></option>').text(text))
			.css({
				position: 'absolute',
				left: '-9999px',
				top: '0',
				visibility: 'hidden',
				fontSize: fontSize || '13px',
				height: '34px',
				padding: '6px 28px 6px 10px',
			})
			.appendTo(document.body);
		var width = $probe.outerWidth() || 0;
		$probe.remove();
		return Math.max(88, Math.ceil(width) + 6);
	}

	function syncMaximizedEncodingSelect($dialog) {
		if (!$dialog || !$dialog.length || !$dialog.hasClass('elfinder-maximized')) {
			return;
		}

		if (!$dialog.data('fma-encoding-width-bound')) {
			$dialog.data('fma-encoding-width-bound', true);
			$dialog.on('change.fma-encoding-width', '.ui-dialog-buttonpane .elfinder-edit-extras select', function () {
				syncMaximizedEncodingSelect($dialog);
			});
		}

		$dialog.find('.ui-dialog-buttonpane .elfinder-edit-extras select.ui-corner-all').each(function () {
			var $sel = $(this);
			var label = $sel.find('option:selected').text() || $sel.val() || 'UTF-8';
			var width = measureEncodingSelectWidth(label, $sel.css('font-size'));
			$sel.css({
				width: width + 'px',
				minWidth: '88px',
				maxWidth: '200px',
			});
		});

		$dialog.find('.ui-dialog-buttonpane .elfinder-edit-extras > select').not('.ui-corner-all').hide();
	}

	function hideElfinderOverlayForEditor(fm) {
		if (!fm || typeof fm.getUI !== 'function') {
			return;
		}
		var $overlay = fm.getUI('overlay');
		if (!$overlay || !$overlay.length) {
			return;
		}
		var guard = 0;
		while (($overlay.data('cnt') || 0) > 0 && guard < 20) {
			$overlay.elfinderoverlay('hide');
			guard++;
		}
		$overlay.hide().css({ opacity: 0, visibility: 'hidden' });
	}

	function resetElfinderOverlayStyles(fm) {
		if (!fm || typeof fm.getUI !== 'function') {
			return;
		}
		var $overlay = fm.getUI('overlay');
		if ($overlay && $overlay.length && ($overlay.data('cnt') || 0) <= 0) {
			$overlay.css({ opacity: '', visibility: '' });
		}
	}

	function setNormalEditorModalState($dialog, enabled) {
		if (!$dialog || !$dialog.length) {
			return;
		}
		var fm = $dialog.data('fma-fm');
		if (enabled && !$dialog.hasClass('elfinder-maximized')) {
			$dialog.addClass('fma-editor-modal-dialog');
			hideElfinderOverlayForEditor(fm);
			return;
		}
		$dialog.removeClass('fma-editor-modal-dialog');
		if (!$('.elfinder-dialog.fma-editor-modal-dialog:visible').length) {
			resetElfinderOverlayStyles(fm);
		}
	}

	function getStoredNavbarWidth(fm) {
		var width = fm && typeof fm.storage === 'function' ? parseInt(fm.storage('navbarWidth'), 10) : 0;
		return width > 0 ? width : 280;
	}

	function escHtml(text) {
		return $('<div/>').text(text == null ? '' : String(text)).html();
	}

	function sortTreeEntries(entries) {
		return entries.sort(function (a, b) {
			var aDir = a.mime === 'directory' ? 0 : 1;
			var bDir = b.mime === 'directory' ? 0 : 1;
			if (aDir !== bDir) {
				return aDir - bDir;
			}
			return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
		});
	}

	function getFolderChildren(fm, hash) {
		var entries = [];
		var seen = {};

		function pushFile(file) {
			if (!file || seen[file.hash]) {
				return;
			}
			seen[file.hash] = true;
			entries.push(file);
		}

		$.each(fm.files(hash), function (_childHash, file) {
			pushFile(file);
		});

		// Tree cache often has subfolders only — scan index for file siblings.
		if (entries.length && entries.every(isDirectory)) {
			$.each(fm.files(), function (_childHash, file) {
				if (file && file.phash === hash && !isDirectory(file)) {
					pushFile(file);
				}
			});
		}

		return sortTreeEntries(entries);
	}

	function getVolumeRoots(fm) {
		var roots = [];
		$.each(fm.roots, function (_volumeId, hash) {
			var file = fm.file(hash);
			if (file) {
				roots.push(file);
			}
		});
		return sortTreeEntries(roots);
	}

	function getExplorerRoots(fm, activeHash) {
		var roots = getVolumeRoots(fm);
		if (roots.length) {
			return roots;
		}
		var activeFile = fm.file(activeHash);
		if (!activeFile) {
			return [];
		}
		var rootFile = fm.file(fm.root(activeFile.hash));
		return rootFile ? [rootFile] : [];
	}

	function isDirectory(file) {
		return !!(file && (file.mime === 'directory' || file.isdir));
	}

	function isEditableInCodeEditor(fm, file) {
		if (!file || !file.read || isDirectory(file)) {
			return false;
		}
		var editorMimes = ['text/plain', 'text/html', 'text/javascript', 'text/css', 'text/x-php', 'application/x-php'];
		return fm.mimeIsText(file.mime) || editorMimes.indexOf(file.mime) !== -1;
	}

	function getVscodeTreeIconMarkup(fm, file) {
		if (!file || !fm || typeof fm.mime2class !== 'function') {
			return '<span class="fma-vscode-icon elfinder-cwd-icon" aria-hidden="true"></span>';
		}

		var mimeClass = fm.mime2class(file.mime);
		var extraClass = file.icon ? ' elfinder-cwd-bgurl' : '';
		var iconStyle = file.icon && typeof fm.getIconStyle === 'function' ? fm.getIconStyle(file) : '';

		return [
			'<span class="fma-vscode-icon elfinder-cwd-icon ',
			mimeClass,
			extraClass,
			'" aria-hidden="true"',
			iconStyle ? ' ' + iconStyle : '',
			'></span>',
		].join('');
	}

	function decodeEditorContent(fm, file, data) {
		var content = data && data.content != null ? data.content : '';
		if (!fm.mimeIsText(file.mime) || typeof content !== 'string') {
			return content;
		}
		var reg = new RegExp('^(data:' + String(file.mime).replace(/([.+])/g, '\\$1') + ';base64,)', 'i');
		var parts = content.match(reg);
		if (window.atob && parts) {
			return atob(content.substr(parts[1].length));
		}
		return content;
	}

	function applyOpenResponseToCache(fm, response) {
		if (!response || !fm || typeof fm.updateCache !== 'function') {
			return;
		}

		var files = [];
		if (response.cwd) {
			files.push(response.cwd);
		}
		if (response.files && response.files.length) {
			files = files.concat(response.files);
		}
		if (files.length) {
			fm.updateCache({ files: files });
		}
	}

	function loadFolderChildren(fm, hash, state, force) {
		if (state && state.loaded[hash] && !force) {
			return $.when();
		}

		// preventDefault skips elFinder's done handler — cache response ourselves.
		return fm
			.request({
				data: { cmd: 'open', target: hash },
				preventDefault: true,
				asNotOpen: true,
			})
			.done(function (response) {
				applyOpenResponseToCache(fm, response);
				if (state) {
					state.loaded[hash] = true;
				}
			});
	}

	function invalidateTreeLoadedState(state, phash) {
		if (!state || !phash) {
			return;
		}
		delete state.loaded[phash];
	}

	function loadExpandedFolders($dialog, fm, state, force) {
		var jobs = [];

		$.each(state.expanded, function (hash, expanded) {
			if (expanded) {
				jobs.push(loadFolderChildren(fm, hash, state, force));
			}
		});

		if (!jobs.length) {
			return $.when();
		}

		return $.when.apply($, jobs);
	}

	function getTreeState($dialog) {
		var state = $dialog.data('fma-tree-state');
		if (!state) {
			state = { expanded: {}, loaded: {} };
			$dialog.data('fma-tree-state', state);
		}
		return state;
	}

	function renderVscodeTreeNode(fm, file, depth, state, activeHash) {
		if (!file) {
			return '';
		}

		var dir = isDirectory(file);
		var expanded = !!state.expanded[file.hash];
		var active = file.hash === activeHash ? ' is-active' : '';
		var html = [
			'<li class="fma-vscode-node',
			dir ? ' is-dir' : ' is-file',
			expanded ? ' is-expanded' : ' is-collapsed',
			active,
			'" data-hash="',
			escHtml(file.hash),
			'">',
			'<button type="button" class="fma-vscode-row" data-hash="',
			escHtml(file.hash),
			'" style="padding-left:',
			String(8 + depth * 14),
			'px" title="',
			escHtml(file.name),
			'">',
			'<span class="fma-vscode-twistie',
			dir ? '' : ' is-empty',
			'" aria-hidden="true">',
			dir ? (expanded ? '▾' : '▸') : '',
			'</span>',
			getVscodeTreeIconMarkup(fm, file),
			'<span class="fma-vscode-label">',
			escHtml(file.name),
			'</span>',
			'</button>',
		];

		if (dir && expanded) {
			html.push('<ul class="fma-vscode-children">');
			getFolderChildren(fm, file.hash).forEach(function (child) {
				html.push(renderVscodeTreeNode(fm, child, depth + 1, state, activeHash));
			});
			html.push('</ul>');
		}

		html.push('</li>');
		return html.join('');
	}

	function buildVscodeExplorerSkeletonHtml() {
		var rows = [];
		var i;
		for (i = 0; i < 14; i++) {
			var indent = (i % 3) * 14;
			var width = 42 + (i % 4) * 11;
			rows.push(
				'<div class="fma-vscode-skeleton-row" style="padding-left:' +
				String(10 + indent) +
				'px">' +
				'<span class="fma-vscode-skeleton-icon"></span>' +
				'<span class="fma-vscode-skeleton-line" style="width:' +
				String(width) +
				'%"></span>' +
				'</div>'
			);
		}
		return '<div class="fma-vscode-tree-skeleton" aria-hidden="true">' + rows.join('') + '</div>';
	}

	function showVscodeExplorerSkeleton($dialog) {
		var $wrap = $dialog.find('.fma-vscode-tree-wrap');
		if (!$wrap.length) {
			return;
		}
		if (!$wrap.children('.fma-vscode-tree-skeleton').length) {
			$wrap.prepend(buildVscodeExplorerSkeletonHtml());
		}
		$wrap.addClass('is-loading');
	}

	function hideVscodeExplorerSkeleton($dialog) {
		var $wrap = $dialog.find('.fma-vscode-tree-wrap');
		if (!$wrap.length) {
			return;
		}
		$wrap.removeClass('is-loading');
	}

	function renderVscodeExplorer($dialog, fm) {
		var $tree = $dialog.find('.fma-vscode-tree');
		if (!$tree.length || !fm) {
			hideVscodeExplorerSkeleton($dialog);
			return;
		}

		var state = getTreeState($dialog);
		var activeHash = $dialog.data('fma-edit-hash') || '';
		var html = ['<ul class="fma-vscode-tree-root">'];

		getExplorerRoots(fm, activeHash).forEach(function (root) {
			html.push(renderVscodeTreeNode(fm, root, 0, state, activeHash));
		});

		html.push('</ul>');
		$tree.html(html.join(''));
		hideVscodeExplorerSkeleton($dialog);
	}

	function primeVscodeExplorer($dialog, fm, activeHash) {
		showVscodeExplorerSkeleton($dialog);

		var state = getTreeState($dialog);
		var chain = $.when();
		var parents = fm.parents(activeHash) || [];

		state.loaded = {};

		parents.forEach(function (hash) {
			var file = fm.file(hash);
			if (!file || !isDirectory(file)) {
				return;
			}
			state.expanded[hash] = true;
			chain = chain.then(function () {
				return loadFolderChildren(fm, hash, state, true);
			});
		});

		$.each(fm.roots, function (_volumeId, hash) {
			state.expanded[hash] = true;
			chain = chain.then(function () {
				return loadFolderChildren(fm, hash, state, true);
			});
		});

		return chain
			.then(function () {
				return loadExpandedFolders($dialog, fm, state, true);
			})
			.always(function () {
				renderVscodeExplorer($dialog, fm);
			})
			.fail(function () {
				hideVscodeExplorerSkeleton($dialog);
			});
	}

	function setEditorSavedBaseline($dialog, content) {
		if (!$dialog || !$dialog.length) {
			return;
		}
		$dialog.data('fma-edit-baseline', content == null ? '' : String(content));
	}

	function isEditorDirty($dialog, editor) {
		if (!$dialog || !$dialog.length || !editor || typeof editor.getValue !== 'function') {
			return false;
		}
		var baseline = $dialog.data('fma-edit-baseline');
		if (baseline === undefined || baseline === null) {
			return false;
		}
		return editor.getValue() !== baseline;
	}

	function saveEditorContent($dialog, fm) {
		var deferred = $.Deferred();
		var editor = $dialog.data('fma-cm-editor');
		var $ta = $dialog.data('fma-edit-ta');
		var hash = ($ta && $ta.data('hash')) || $dialog.data('fma-edit-hash');

		if (!editor || !hash || !fm) {
			return deferred.reject().promise();
		}

		var code = editor.getValue();
		var filename =
			editor.fma_file_info && editor.fma_file_info.filename ? editor.fma_file_info.filename : '';

		function putContent() {
			if ($ta && $ta.length) {
				$ta.val(code);
			}
			fm.request({
				options: { type: 'post' },
				data: { cmd: 'put', target: hash, content: code },
				notify: { type: 'save', cnt: 1 },
				syncOnFail: true,
				preventFail: true,
			})
				.done(function () {
					setEditorSavedBaseline($dialog, code);
					deferred.resolve();
				})
				.fail(function (error) {
					deferred.reject(error);
				});
		}

		if (filename.toLowerCase().endsWith('.php') && typeof window.analyzePHPDebug === 'function') {
			window.analyzePHPDebug(code, filename, function (result) {
				if (!result.valid && result.errors && typeof window.showErrorSavePopup === 'function') {
					window.showErrorSavePopup(result.errors, function (saveAnyway) {
						if (saveAnyway) {
							putContent();
						} else {
							deferred.reject();
						}
					});
				} else {
					putContent();
				}
			});
			return deferred.promise();
		}

		putContent();
		return deferred.promise();
	}

	function promptUnsavedBeforeFileSwitch(fm, currentName, nextName, callback) {
		if (typeof window.showUnsavedFileSwitchPopup === 'function') {
			window.showUnsavedFileSwitchPopup(
				{ currentName: currentName, nextName: nextName },
				callback
			);
			return;
		}

		if (
			window.confirm(
				'You have unsaved changes in "' +
				currentName +
				'". Save before opening "' +
				nextName +
				'" or your changes will be lost.'
			)
		) {
			callback('save');
		} else {
			callback('cancel');
		}
	}

	function setEditorDialogTitle($dialog, filename) {
		if (!$dialog || !$dialog.length) {
			return;
		}
		var name = filename == null ? '' : String(filename);
		var $title = $dialog.find('.elfinder-dialog-title').first();
		if (!$title.length) {
			$title = $dialog.find('.ui-dialog-title').first();
		}
		if ($title.length) {
			$title.text(name);
		}
	}

	function loadFileIntoMaximizedEditor($dialog, fm, file) {
		var editor = $dialog.data('fma-cm-editor');
		var $ta = $dialog.data('fma-edit-ta');
		var ctx = $dialog.data('fma-edit-ctx');
		if (!editor || !$ta || !$ta.length) {
			return;
		}

		fm.request({
			data: { cmd: 'get', target: file.hash, _t: file.ts },
			options: { type: 'get', cache: true },
			notify: { type: 'file', cnt: 1 },
			preventDefault: true,
		})
			.done(function (data) {
				var content = decodeEditorContent(fm, file, data);

				editor.setValue(content);
				editor.setOption('mode', resolveCodeMirrorMode(file.mime, file.name));
				editor.fma_file_info = {
					filename: file.name,
					mime: file.mime,
					hash: file.hash,
				};

				$dialog.data('fma-edit-hash', file.hash);
				$ta.data('hash', file.hash);
				setEditorSavedBaseline($dialog, content);

				if (ctx) {
					ctx.file = file;
				}

				setEditorDialogTitle($dialog, file.name);

				if (typeof window.clearErrorHighlights === 'function') {
					window.clearErrorHighlights(editor);
				}

				renderVscodeExplorer($dialog, fm);
				editor.focus();
				editor.refresh();
				scheduleLegacyCodePilotSync({ delay: 80 });

				$(document).trigger('afmp:editor-file-changed', [{ name: file.name, hash: file.hash }]);

				var $content = $ta.closest('.ui-dialog-content');
				var $editorWrap = $content.find('.fma-maximized-editor');
				if ($editorWrap.length) {
					syncCodeMirrorEditorSize(editor, $ta);
				}
			})
			.fail(function (error) {
				fm.error(error);
			});
	}

	function openFileInMaximizedEditor($dialog, fm, file) {
		if (!file || isDirectory(file) || !isEditableInCodeEditor(fm, file)) {
			if (file && fm) {
				fm.error(['errOpen', file.name, 'errPerm']);
			}
			return;
		}

		if (file.hash === $dialog.data('fma-edit-hash')) {
			return;
		}

		var editor = $dialog.data('fma-cm-editor');
		var $ta = $dialog.data('fma-edit-ta');
		if (!editor || !$ta || !$ta.length) {
			return;
		}

		if (!isEditorDirty($dialog, editor)) {
			loadFileIntoMaximizedEditor($dialog, fm, file);
			return;
		}

		var currentHash = $dialog.data('fma-edit-hash');
		var currentFile = currentHash ? fm.file(currentHash) : null;
		var currentName = currentFile ? currentFile.name : 'this file';

		promptUnsavedBeforeFileSwitch(fm, currentName, file.name, function (action) {
			if (action === 'cancel') {
				return;
			}
			if (action === 'save') {
				saveEditorContent($dialog, fm)
					.done(function () {
						loadFileIntoMaximizedEditor($dialog, fm, file);
					})
					.fail(function (error) {
						if (error) {
							fm.error(error);
						}
					});
				return;
			}
			loadFileIntoMaximizedEditor($dialog, fm, file);
		});
	}

	function toggleVscodeFolder($dialog, fm, hash) {
		var state = getTreeState($dialog);
		var $row = $dialog.find('.fma-vscode-row').filter(function () {
			return $(this).attr('data-hash') === hash;
		});

		if (state.expanded[hash]) {
			delete state.expanded[hash];
			renderVscodeExplorer($dialog, fm);
			return;
		}

		$row.addClass('is-loading');
		loadFolderChildren(fm, hash, state, true)
			.done(function () {
				state.expanded[hash] = true;
				renderVscodeExplorer($dialog, fm);
			})
			.fail(function (error) {
				invalidateTreeLoadedState(state, hash);
				if (error) {
					fm.error(error);
				}
			})
			.always(function () {
				$row.removeClass('is-loading');
			});
	}

	function ensureVscodeExplorer($sidebar, $dialog, fm) {
		var $explorer = $sidebar.children('.fma-vscode-explorer');
		if (!$explorer.length) {
			$explorer = $(
				'<div class="fma-vscode-explorer">' +
				'<div class="fma-vscode-explorer-head">Explorer</div>' +
				'<div class="fma-vscode-tree-wrap"><div class="fma-vscode-tree"></div></div>' +
				'</div>'
			);
			$sidebar.append($explorer);
		}

		var activeHash = $dialog.data('fma-edit-hash') || '';
		primeVscodeExplorer($dialog, fm, activeHash);

		$explorer
			.off('click.fma-vscode-tree')
			.on('click.fma-vscode-tree', '.fma-vscode-row', function (e) {
				var $btn = $(this);
				var hash = $btn.attr('data-hash');
				var file = fm.file(hash);
				if (!file) {
					return;
				}

				if (isDirectory(file)) {
					var $twistie = $(e.target).closest('.fma-vscode-twistie');
					if ($twistie.length && !$twistie.hasClass('is-empty')) {
						toggleVscodeFolder($dialog, fm, hash);
						return;
					}
					toggleVscodeFolder($dialog, fm, hash);
					return;
				}

				openFileInMaximizedEditor($dialog, fm, file);
			});

		bindVscodeExplorerFmEvents($dialog, fm);
	}

	function bindVscodeExplorerFmEvents($dialog, fm) {
		if (!fm || typeof fm.bind !== 'function') {
			return;
		}

		teardownVscodeExplorer($dialog, fm);

		var handler = function (e) {
			if (!$dialog.hasClass('elfinder-maximized')) {
				return;
			}

			var data = e && e.data ? e.data : {};
			var state = getTreeState($dialog);

			if (data.added) {
				data.added.forEach(function (file) {
					invalidateTreeLoadedState(state, file.phash);
				});
			}
			if (data.removed) {
				data.removed.forEach(function (hash) {
					var removedFile = fm.file(hash);
					invalidateTreeLoadedState(state, removedFile ? removedFile.phash : '');
				});
			}
			if (data.changed) {
				data.changed.forEach(function (file) {
					invalidateTreeLoadedState(state, file.phash);
				});
			}

			showVscodeExplorerSkeleton($dialog);
			loadExpandedFolders($dialog, fm, state, false).always(function () {
				renderVscodeExplorer($dialog, fm);
			});
		};

		fm.bind('add', handler);
		fm.bind('remove', handler);
		fm.bind('change', handler);
		$dialog.data('fma-tree-fm-handler', handler);
	}

	function teardownVscodeExplorer($dialog, fm) {
		if (!fm || typeof fm.unbind !== 'function' || !$dialog || !$dialog.length) {
			return;
		}

		var handler = $dialog.data('fma-tree-fm-handler');
		if (handler) {
			fm.unbind('add', handler);
			fm.unbind('remove', handler);
			fm.unbind('change', handler);
			$dialog.removeData('fma-tree-fm-handler');
		}
	}

	function ensureMaximizedSplitLayout($content) {
		var $split = $content.children('.fma-maximized-split');
		if ($split.length) {
			return $split;
		}

		$split = $('<div class="fma-maximized-split"></div>');
		var $sidebar = $('<div class="fma-maximized-sidebar" aria-label="Folder tree"></div>');
		var $editorWrap = $('<div class="fma-maximized-editor"></div>');

		$content.children().appendTo($editorWrap);
		$split.append($sidebar, $editorWrap);
		$content.append($split);

		return $split;
	}

	function teardownMaximizedSplitLayout($content) {
		var $split = $content.children('.fma-maximized-split');
		if (!$split.length) {
			return;
		}

		$split.find('.fma-maximized-editor').children().appendTo($content);
		$split.remove();
	}

	function getFindReplaceState($dialog) {
		var state = $dialog.data('fma-find-replace');
		if (!state) {
			state = {
				query: '',
				replace: '',
				caseSensitive: false,
				regex: false,
				matchIndex: -1,
				matchRanges: [],
				marks: [],
				currentMark: null,
				visible: false,
				replaceOpen: false,
			};
			$dialog.data('fma-find-replace', state);
		}
		return state;
	}

	function clearFindReplaceMarks(state) {
		if (!state) {
			return;
		}
		state.marks.forEach(function (mark) {
			if (mark && mark.clear) {
				mark.clear();
			}
		});
		state.marks = [];
		if (state.currentMark && state.currentMark.clear) {
			state.currentMark.clear();
		}
		state.currentMark = null;
	}

	function findLineMatch(text, start, query, state) {
		if (!query) {
			return null;
		}
		if (state.regex) {
			var pattern;
			try {
				pattern = new RegExp(query, state.caseSensitive ? '' : 'i');
			} catch (ignore) {
				return null;
			}
			var slice = text.slice(start);
			var match = pattern.exec(slice);
			if (!match || !match[0]) {
				return null;
			}
			return { from: start + match.index, to: start + match.index + match[0].length };
		}
		var needle = state.caseSensitive ? query : query.toLowerCase();
		var hay = state.caseSensitive ? text : text.toLowerCase();
		var idx = hay.indexOf(needle, start);
		if (idx === -1) {
			return null;
		}
		return { from: idx, to: idx + query.length };
	}

	function collectFindMatches(editor, state) {
		var matches = [];
		if (!editor || !state.query) {
			return matches;
		}
		var doc = editor.getDoc();
		var i;
		for (i = 0; i < doc.lineCount(); i++) {
			var text = doc.getLine(i);
			var ch = 0;
			var hit;
			while ((hit = findLineMatch(text, ch, state.query, state))) {
				matches.push({
					from: { line: i, ch: hit.from },
					to: { line: i, ch: hit.to },
				});
				ch = hit.to;
				if (hit.from === hit.to) {
					ch += 1;
				}
			}
		}
		return matches;
	}

	function cmpPos(a, b) {
		if (a.line !== b.line) {
			return a.line - b.line;
		}
		return a.ch - b.ch;
	}

	function posBefore(a, b) {
		return cmpPos(a, b) < 0;
	}

	function posEqual(a, b) {
		return a.line === b.line && a.ch === b.ch;
	}

	function refreshFindHighlights(editor, $dialog) {
		var state = getFindReplaceState($dialog);
		var $bar = $dialog.find('.fma-vscode-find-bar');
		clearFindReplaceMarks(state);
		state.matchRanges = collectFindMatches(editor, state);
		state.matchIndex = -1;

		state.matchRanges.forEach(function (range) {
			state.marks.push(
				editor.markText(range.from, range.to, {
					className: 'fma-cm-search-match',
				})
			);
		});

		if ($bar.length) {
			var total = state.matchRanges.length;
			$bar.find('.fma-vscode-find-status').text(total ? '' : state.query ? 'No results' : '');
		}
	}

	function highlightCurrentFindMatch(editor, $dialog, index) {
		var state = getFindReplaceState($dialog);
		var $bar = $dialog.find('.fma-vscode-find-bar');
		if (!state.matchRanges.length) {
			state.matchIndex = -1;
			if (state.currentMark && state.currentMark.clear) {
				state.currentMark.clear();
			}
			state.currentMark = null;
			if ($bar.length) {
				$bar.find('.fma-vscode-find-status').text(state.query ? 'No results' : '');
			}
			return null;
		}

		if (index < 0) {
			index = state.matchRanges.length - 1;
		} else if (index >= state.matchRanges.length) {
			index = 0;
		}

		state.matchIndex = index;
		var range = state.matchRanges[index];
		if (state.currentMark && state.currentMark.clear) {
			state.currentMark.clear();
		}
		state.currentMark = editor.markText(range.from, range.to, {
			className: 'fma-cm-search-match fma-cm-search-match-current',
		});
		editor.setSelection(range.from, range.to);
		editor.scrollIntoView({ from: range.from, to: range.to }, 40);
		if ($bar.length) {
			$bar
				.find('.fma-vscode-find-status')
				.text(String(index + 1) + ' of ' + String(state.matchRanges.length));
		}
		return range;
	}

	function findNextMatch(editor, $dialog, reverse) {
		var state = getFindReplaceState($dialog);
		if (!state.query) {
			return;
		}
		if (!state.matchRanges.length) {
			refreshFindHighlights(editor, $dialog);
		}
		if (!state.matchRanges.length) {
			return;
		}

		var cursor = editor.getCursor('from');
		var idx = -1;
		var i;

		if (reverse) {
			for (i = state.matchRanges.length - 1; i >= 0; i--) {
				if (posBefore(state.matchRanges[i].from, cursor)) {
					idx = i;
					break;
				}
			}
			if (idx === -1) {
				idx = state.matchRanges.length - 1;
			}
		} else {
			for (i = 0; i < state.matchRanges.length; i++) {
				if (cmpPos(state.matchRanges[i].from, cursor) > 0) {
					idx = i;
					break;
				}
			}
			if (idx === -1) {
				idx = 0;
			}
		}
		highlightCurrentFindMatch(editor, $dialog, idx);
	}

	function replaceCurrentFindMatch(editor, $dialog, all) {
		var state = getFindReplaceState($dialog);
		if (!state.query) {
			return;
		}
		if (!state.matchRanges.length) {
			refreshFindHighlights(editor, $dialog);
		}
		if (!state.matchRanges.length) {
			return;
		}

		if (all) {
			var ranges = state.matchRanges.slice().reverse();
			editor.operation(function () {
				ranges.forEach(function (range) {
					var replacement = state.replace;
					if (state.regex) {
						try {
							var re = new RegExp(state.query, state.caseSensitive ? '' : 'i');
							var source = editor.getRange(range.from, range.to);
							replacement = source.replace(re, state.replace);
						} catch (ignore) { }
					}
					editor.replaceRange(replacement, range.from, range.to);
				});
			});
			refreshFindHighlights(editor, $dialog);
			return;
		}

		var idx = state.matchIndex >= 0 ? state.matchIndex : 0;
		var range = state.matchRanges[idx];
		if (!range) {
			return;
		}
		var replacement = state.replace;
		if (state.regex) {
			try {
				var regex = new RegExp(state.query, state.caseSensitive ? '' : 'i');
				var source = editor.getRange(range.from, range.to);
				replacement = source.replace(regex, state.replace);
			} catch (ignore) { }
		}
		editor.replaceRange(replacement, range.from, range.to);
		refreshFindHighlights(editor, $dialog);
		if (state.matchRanges.length) {
			highlightCurrentFindMatch(editor, $dialog, Math.min(idx, state.matchRanges.length - 1));
		}
	}

	function setFindReplaceBarVisible($dialog, editor, visible, openReplace) {
		var $bar = $dialog.find('.fma-vscode-find-bar');
		var state = getFindReplaceState($dialog);
		state.visible = !!visible;
		if (typeof openReplace === 'boolean') {
			state.replaceOpen = openReplace;
		}
		if (!$bar.length) {
			return;
		}
		$bar.toggleClass('is-visible', state.visible);
		$bar.attr('aria-hidden', state.visible ? 'false' : 'true');
		$bar.find('.fma-vscode-replace-row').toggleClass('is-open', !!state.replaceOpen);
		$bar.find('.fma-vscode-find-toggle').toggleClass('is-open', !!state.replaceOpen);
		if (!state.visible) {
			clearFindReplaceMarks(state);
			$bar.find('.fma-vscode-find-status').text('');
			return;
		}
		if (editor) {
			setTimeout(function () {
				var $focus = state.replaceOpen
					? $bar.find('.fma-vscode-replace-input')
					: $bar.find('.fma-vscode-find-input');
				$focus.trigger('focus').trigger('select');
				refreshFindHighlights(editor, $dialog);
				if (state.query) {
					findNextMatch(editor, $dialog, false);
				}
			}, 0);
		}
		syncCodeMirrorEditorSize(editor, $dialog.data('fma-edit-ta'));
	}

	/**
	 * Host for the VS Code–style find bar: maximized editor wrap, else normal CM panel.
	 */
	function getFindReplaceBarHost($dialog) {
		var $host = $dialog.find('.fma-maximized-editor').first();
		if ($host.length) {
			return $host;
		}
		$host = $dialog.find('.fma-cm-editor-panel').first();
		if ($host.length) {
			$host.css('position', 'relative');
			return $host;
		}
		$host = $dialog.find('.ui-dialog-content').first();
		if ($host.length) {
			$host.css('position', 'relative');
		}
		return $host;
	}

	function ensureFindReplaceBar($dialog) {
		var $existing = $dialog.find('.fma-vscode-find-bar');
		if ($existing.length) {
			var $host = getFindReplaceBarHost($dialog);
			if ($host.length && !$existing.parent().is($host)) {
				$existing.appendTo($host);
			}
			return $existing;
		}

		var $editorWrap = getFindReplaceBarHost($dialog);
		if (!$editorWrap.length) {
			return $();
		}

		var html = [
			'<div class="fma-vscode-find-bar" aria-hidden="true" role="search">',
			'<div class="fma-vscode-find-panel">',
			'<div class="fma-vscode-find-row">',
			'<button type="button" class="fma-vscode-find-toggle" title="Toggle Replace" aria-label="Toggle Replace">▸</button>',
			'<input type="text" class="fma-vscode-find-input" placeholder="Find" aria-label="Find" autocomplete="off" spellcheck="false" />',
			'<span class="fma-vscode-find-status" aria-live="polite"></span>',
			'<div class="fma-vscode-find-actions">',
			'<button type="button" class="fma-vscode-find-btn" data-action="prev" title="Previous match (Shift+Enter)">↑</button>',
			'<button type="button" class="fma-vscode-find-btn" data-action="next" title="Next match (Enter)">↓</button>',
			'<button type="button" class="fma-vscode-find-opt" data-opt="case" title="Match Case">Aa</button>',
			'<button type="button" class="fma-vscode-find-opt" data-opt="regex" title="Use Regular Expression">.*</button>',
			'<button type="button" class="fma-vscode-find-close" title="Close (Escape)">×</button>',
			'</div>',
			'</div>',
			'<div class="fma-vscode-replace-row">',
			'<span class="fma-vscode-find-spacer" aria-hidden="true"></span>',
			'<input type="text" class="fma-vscode-replace-input" placeholder="Replace" aria-label="Replace" autocomplete="off" spellcheck="false" />',
			'<div class="fma-vscode-replace-actions">',
			'<button type="button" class="fma-vscode-find-btn fma-vscode-find-btn-text" data-action="replace">Replace</button>',
			'<button type="button" class="fma-vscode-find-btn fma-vscode-find-btn-text" data-action="replace-all">All</button>',
			'</div>',
			'</div>',
			'</div>',
			'</div>',
		].join('');

		return $(html).appendTo($editorWrap);
	}

	function bindFindReplaceBar($dialog, editor) {
		var $bar = ensureFindReplaceBar($dialog);
		var state = getFindReplaceState($dialog);

		if (!$bar.length) {
			return;
		}

		if ($dialog.data('fma-find-replace-bound')) {
			return;
		}
		$dialog.data('fma-find-replace-bound', true);

		$bar.on('click.fma-find', '.fma-vscode-find-toggle', function () {
			state.replaceOpen = !state.replaceOpen;
			$bar.find('.fma-vscode-replace-row').toggleClass('is-open', state.replaceOpen);
			$(this).toggleClass('is-open', state.replaceOpen);
			syncCodeMirrorEditorSize(editor, $dialog.data('fma-edit-ta'));
		});

		$bar.on('click.fma-find', '.fma-vscode-find-close', function () {
			setFindReplaceBarVisible($dialog, editor, false);
		});

		$bar.on('click.fma-find', '.fma-vscode-find-opt', function () {
			var opt = $(this).data('opt');
			if (opt === 'case') {
				state.caseSensitive = !state.caseSensitive;
				$(this).toggleClass('is-active', state.caseSensitive);
			} else if (opt === 'regex') {
				state.regex = !state.regex;
				$(this).toggleClass('is-active', state.regex);
			}
			refreshFindHighlights(editor, $dialog);
			if (state.matchRanges.length) {
				findNextMatch(editor, $dialog, false);
			}
		});

		$bar.on('click.fma-find', '.fma-vscode-find-btn', function () {
			var action = $(this).data('action');
			if (action === 'prev') {
				findNextMatch(editor, $dialog, true);
			} else if (action === 'next') {
				findNextMatch(editor, $dialog, false);
			} else if (action === 'replace') {
				replaceCurrentFindMatch(editor, $dialog, false);
			} else if (action === 'replace-all') {
				replaceCurrentFindMatch(editor, $dialog, true);
			}
		});

		$bar.on('input.fma-find', '.fma-vscode-find-input', function () {
			state.query = $(this).val();
			refreshFindHighlights(editor, $dialog);
			if (state.query) {
				findNextMatch(editor, $dialog, false);
			}
		});

		$bar.on('input.fma-find', '.fma-vscode-replace-input', function () {
			state.replace = $(this).val();
		});

		$bar.on('keydown.fma-find', 'input', function (e) {
			if (e.key === 'Escape') {
				e.preventDefault();
				e.stopPropagation();
				setFindReplaceBarVisible($dialog, editor, false);
				editor.focus();
				return;
			}
			if (e.key === 'Enter') {
				e.preventDefault();
				if (e.shiftKey) {
					findNextMatch(editor, $dialog, true);
				} else if ($(this).hasClass('fma-vscode-replace-input') && (e.ctrlKey || e.metaKey)) {
					replaceCurrentFindMatch(editor, $dialog, true);
				} else if ($(this).hasClass('fma-vscode-replace-input')) {
					replaceCurrentFindMatch(editor, $dialog, false);
				} else {
					findNextMatch(editor, $dialog, false);
				}
			}
		});

		// AFMIS-335: same in-editor Find as fullscreen — intercept Ctrl/Cmd+F (and replace) in normal mode too.
		var keyMap = {
			'Ctrl-F': function (cm) {
				setFindReplaceBarVisible($dialog, cm || editor, true, false);
				return true;
			},
			'Cmd-F': function (cm) {
				setFindReplaceBarVisible($dialog, cm || editor, true, false);
				return true;
			},
			'Ctrl-H': function (cm) {
				setFindReplaceBarVisible($dialog, cm || editor, true, true);
				return true;
			},
			'Cmd-Alt-F': function (cm) {
				setFindReplaceBarVisible($dialog, cm || editor, true, true);
				return true;
			},
		};
		editor.addKeyMap(keyMap);
		$dialog.data('fma-find-replace-keymap', keyMap);
	}

	function attachFindReplace($dialog, editor) {
		if (!$dialog || !$dialog.length || !editor) {
			return;
		}
		ensureFindReplaceBar($dialog);
		bindFindReplaceBar($dialog, editor);
	}

	// Keep legacy names used by maximize handlers.
	function attachMaximizedFindReplace($dialog, editor) {
		attachFindReplace($dialog, editor);
	}

	function detachMaximizedFindReplace($dialog, editor) {
		if (!$dialog || !$dialog.length) {
			return;
		}
		editor = editor || $dialog.data('fma-cm-editor');
		var state = $dialog.data('fma-find-replace');
		if (state) {
			clearFindReplaceMarks(state);
			state.visible = false;
			state.replaceOpen = false;
		}
		var keyMap = $dialog.data('fma-find-replace-keymap');
		if (editor && keyMap) {
			editor.removeKeyMap(keyMap);
		}
		$dialog.removeData('fma-find-replace-keymap');
		$dialog.removeData('fma-find-replace-bound');
		var $bar = $dialog.find('.fma-vscode-find-bar');
		$bar.off('.fma-find');
		$bar.removeClass('is-visible').attr('aria-hidden', 'true');
		$dialog.off('.fma-find');
	}

	function attachMaximizedExplorer($dialog, fm) {
		if (!fm) {
			return;
		}

		var $content = $dialog.find('.ui-dialog-content').first();
		var $split = ensureMaximizedSplitLayout($content);
		var $sidebar = $split.children('.fma-maximized-sidebar');

		if (!$sidebar.length) {
			return;
		}

		$sidebar.width(getStoredNavbarWidth(fm));
		ensureVscodeExplorer($sidebar, $dialog, fm);
		syncMaximizedSplitHeight($dialog);
		syncMaximizedExplorer($dialog);
	}

	function detachMaximizedExplorer($dialog, fm) {
		teardownVscodeExplorer($dialog, fm);
	}

	function syncMaximizedExplorer($dialog) {
		var $sidebar = $dialog.find('.fma-maximized-sidebar');
		var $wrap = $sidebar.find('.fma-vscode-tree-wrap');
		if (!$sidebar.length || !$wrap.length) {
			return;
		}

		var sidebarHeight = $sidebar.innerHeight() || 0;
		var headHeight = $sidebar.find('.fma-vscode-explorer-head').outerHeight(true) || 0;
		$wrap.height(Math.max(160, sidebarHeight - headHeight));
	}

	function syncCodeMirrorEditorSize(editor, $ta) {
		if (!editor || !$ta || !$ta.length) {
			return;
		}

		var $dialog = $ta.closest('.elfinder-dialog');
		if (!$dialog.hasClass('elfinder-maximized')) {
			applyNormalEditorDialogLayout($dialog, $ta, editor, $dialog.data('fma-fm'));
			return;
		}

		var $content = $ta.closest('.ui-dialog-content');
		var $editorWrap = $content.find('.fma-maximized-editor');
		var $panel = $editorWrap.length ? $editorWrap : $ta.parent().addClass('fma-cm-editor-panel');
		var $cm = $(editor.getWrapperElement());
		var height = getEditorPanelHeight();
		var width = '100%';
		var maximized = true;

		syncMaximizedSplitHeight($dialog);

		if (maximized && $editorWrap.length) {
			height = $editorWrap.innerHeight() || height;
			width = $editorWrap.innerWidth() || '100%';
			$editorWrap.children().each(function () {
				var $child = $(this);
				if (
					!$child.hasClass('fma-cm-editor') &&
					!$child.is('textarea.elfinder-file-edit') &&
					!$child.hasClass('fma-vscode-find-bar')
				) {
					height -= $child.outerHeight(true) || 0;
				}
			});
			height = Math.max(280, height - 4);
		} else if (maximized && $content.length) {
			height = $content.innerHeight() || height;
			$content.children().each(function () {
				var $child = $(this);
				if (
					!$child.hasClass('fma-cm-editor') &&
					!$child.is('textarea.elfinder-file-edit') &&
					!$child.hasClass('fma-maximized-split')
				) {
					height -= $child.outerHeight(true) || 0;
				}
			});
			height = Math.max(280, height - 8);
		}

		$panel.css({ width: '100%', minHeight: height + 'px', flex: '1 1 auto', minWidth: 0 });
		$cm.css({ height: height + 'px', minHeight: height + 'px' });
		editor.setSize(width, height);
		editor.refresh();
		syncMaximizedExplorer($dialog);
	}

	function moveMaximizedDialogToBody($dialog) {
		if (!$dialog || !$dialog.length || $dialog.data('fma-moved-to-body')) {
			return;
		}

		$dialog.data('fma-parent', $dialog.parent());
		$dialog.appendTo(document.body);
		$dialog.data('fma-moved-to-body', true);
		$('body').addClass('fma-editor-maximized-open');
	}

	function restoreMaximizedDialogParent($dialog) {
		if (!$dialog || !$dialog.length || !$dialog.data('fma-moved-to-body')) {
			return;
		}

		var $parent = $dialog.data('fma-parent');
		if ($parent && $parent.length) {
			$dialog.appendTo($parent);
		}
		$dialog.removeData('fma-moved-to-body');
		$dialog.removeData('fma-parent');

		if (!$('.elfinder-dialog.elfinder-maximized').length) {
			$('body').removeClass('fma-editor-maximized-open');
		}
	}

	function prepareMaximizedDialogForClose($dialog, fm) {
		if (!$dialog || !$dialog.length) {
			return;
		}

		if ($dialog.hasClass('elfinder-maximized')) {
			detachMaximizedFindReplace($dialog);
			detachMaximizedExplorer($dialog, fm);
			teardownMaximizedSplitLayout($dialog.find('.ui-dialog-content').first());
			if (fm && typeof fm.toggleMaximize === 'function') {
				fm.toggleMaximize($dialog, false);
			}
		}

		restoreMaximizedDialogParent($dialog);
	}

	function bindMaximizedDialogCloseGuard($dialog, fm) {
		var dialogEl = $dialog[0];
		if (!dialogEl || $dialog.data('fma-close-guard-bound')) {
			return;
		}

		$dialog.data('fma-close-guard-bound', true);
		dialogEl.addEventListener(
			'click',
			function (e) {
				if (
					!e.target.closest(
						'.ui-dialog-buttonpane button, .ui-dialog-titlebar-close, .elfinder-titlebar-button .ui-icon-closethick'
					)
				) {
					return;
				}
				prepareMaximizedDialogForClose($dialog, fm);
			},
			true
		);
		dialogEl.addEventListener(
			'keydown',
			function (e) {
				if (e.keyCode === 27 && $dialog.hasClass('elfinder-maximized')) {
					prepareMaximizedDialogForClose($dialog, fm);
				}
			},
			true
		);
	}

	function wrapEditorCloseActions(self, $dialog) {
		var fm = self.fm || null;
		['doCancel', 'doClose'].forEach(function (method) {
			if (typeof self[method] !== 'function') {
				return;
			}
			var original = self[method];
			self[method] = function () {
				prepareMaximizedDialogForClose($dialog, fm);
				return original.apply(self, arguments);
			};
		});
	}

	function handleEditorDialogMaximize($dialog, $ta, editor, data) {
		if (!$dialog.length) {
			return;
		}

		var fm = $dialog.data('fma-fm');

		if (data && data.maximize === 'on') {
			setNormalEditorModalState($dialog, false);
			moveMaximizedDialogToBody($dialog);
			$dialog.css({ minHeight: '', maxHeight: '' });
			$dialog.find('.ui-dialog-buttonpane').css({ height: '', minHeight: '', maxHeight: '' });
			attachMaximizedExplorer($dialog, fm);
			attachMaximizedFindReplace($dialog, editor);
			syncMaximizedEncodingSelect($dialog);
			scheduleLegacyCodePilotSync({ full: true, delay: 400 });
			setTimeout(function () {
				syncMaximizedSplitHeight($dialog);
				syncMaximizedEncodingSelect($dialog);
				syncCodeMirrorEditorSize(editor, $ta);
			}, 0);
			setTimeout(function () {
				syncMaximizedSplitHeight($dialog);
				syncMaximizedEncodingSelect($dialog);
				syncCodeMirrorEditorSize(editor, $ta);
			}, 120);
			return;
		} else if (data && data.maximize === 'off') {
			detachMaximizedFindReplace($dialog, editor);
			detachMaximizedExplorer($dialog, fm);
			teardownMaximizedSplitLayout($dialog.find('.ui-dialog-content').first());
			restoreMaximizedDialogParent($dialog);
			setTimeout(function () {
				applyNormalEditorDialogLayout($dialog, $ta, editor, fm);
				attachFindReplace($dialog, editor);
			}, 0);
			setTimeout(function () {
				applyNormalEditorDialogLayout($dialog, $ta, editor, fm);
				attachFindReplace($dialog, editor);
			}, 140);
			return;
		}

		setTimeout(function () {
			syncCodeMirrorEditorSize(editor, $ta);
		}, 0);
		setTimeout(function () {
			syncCodeMirrorEditorSize(editor, $ta);
		}, 120);
	}

	function bindEditorSaveBaselineSync($dialog, fm) {
		if (!$dialog || !$dialog.length || !fm || typeof fm.bind !== 'function') {
			return;
		}
		if ($dialog.data('fma-baseline-sync-bound')) {
			return;
		}

		var pendingPutHash = null;
		var requestHandler = function (e) {
			var bindData = e && e.data ? e.data : {};
			var opts = bindData.opts || {};
			var reqData = opts.data || {};
			if (reqData.cmd === 'put' && reqData.target) {
				pendingPutHash = reqData.target;
			}
		};
		var doneHandler = function () {
			var hash = $dialog.data('fma-edit-hash');
			var editor = $dialog.data('fma-cm-editor');
			if (!hash || !editor || pendingPutHash !== hash) {
				pendingPutHash = null;
				return;
			}
			setEditorSavedBaseline($dialog, editor.getValue());
			pendingPutHash = null;
		};

		$dialog.data('fma-baseline-sync-bound', true);
		$dialog.data('fma-baseline-sync-request', requestHandler);
		$dialog.data('fma-baseline-sync-done', doneHandler);
		fm.bind('request.put', requestHandler);
		fm.bind('put', doneHandler);
	}

	function teardownEditorSaveBaselineSync($dialog) {
		if (!$dialog || !$dialog.length) {
			return;
		}
		var fm = $dialog.data('fma-fm');
		var requestHandler = $dialog.data('fma-baseline-sync-request');
		var doneHandler = $dialog.data('fma-baseline-sync-done');
		if (fm && typeof fm.unbind === 'function') {
			if (requestHandler) {
				fm.unbind('request.put', requestHandler);
			}
			if (doneHandler) {
				fm.unbind('put', doneHandler);
			}
		}
		$dialog.removeData('fma-baseline-sync-bound');
		$dialog.removeData('fma-baseline-sync-request');
		$dialog.removeData('fma-baseline-sync-done');
		$dialog.removeData('fma-edit-baseline');
	}

	function teardownEditorDialogHooks($dialog) {
		if (!$dialog || !$dialog.length) {
			return;
		}

		var fm = $dialog.data('fma-fm');
		setNormalEditorModalState($dialog, false);
		teardownEditorSaveBaselineSync($dialog);
		detachMaximizedFindReplace($dialog);
		prepareMaximizedDialogForClose($dialog, fm);

		$dialog.off('.fma-cm-max');
		$dialog.off('.fma-editor-modal');
		$dialog.off('.fma-normal-guard');
		$dialog.off('posinit.fma-editor-modal');
		var guardNamespace = $dialog.data('fma-normal-guard-namespace');
		if (guardNamespace && fm && typeof fm.getUI === 'function') {
			fm.getUI().off('resize' + guardNamespace);
		}
		$dialog.removeData('fma-normal-guard-namespace');
		$dialog.removeData('fma-normal-resize-guard');
		$dialog.removeData('fma-normal-dialog-metrics');
		$dialog.removeData('fma-normal-layout-lock');
		$dialog.removeData('fma-fm');
		$dialog.removeData('fma-edit-ta');
		$dialog.removeData('fma-edit-ctx');
		$dialog.removeData('fma-edit-hash');
		$dialog.removeData('fma-tree-state');
		$dialog.removeData('fma-cm-editor');
		$dialog.removeData('fma-close-guard-bound');
	}

	function attachPhpDebug(editor, mimeType, filename) {
		if (
			!isDebugEnabled() ||
			!(
				mimeType === 'text/x-php' ||
				mimeType === 'application/x-php' ||
				filename.toLowerCase().endsWith('.php')
			)
		) {
			return;
		}

		var debugTimeout;
		var activeDebugRequest = null;
		var lastAnalyzedCode = '';

		function isFileTooLargeForLiveDebug() {
			return editor.getValue().length > PHP_DEBUG_MAX_CHARS || editor.lineCount() > PHP_DEBUG_MAX_LINES;
		}

		function applyDebugResult(result) {
			if (!result) {
				return;
			}
			if (result.valid && typeof window.clearErrorHighlights === 'function') {
				window.clearErrorHighlights(editor);
				return;
			}
			if (!result.valid && result.errors && result.errors.length && typeof window.highlightErrorLines === 'function') {
				window.highlightErrorLines(editor, result.errors);
			}
		}

		function analyzeCode(force) {
			if (typeof window.analyzePHPDebug !== 'function') {
				return;
			}

			var code = editor.getValue();
			if (!code.trim()) {
				return;
			}

			if (!force && isFileTooLargeForLiveDebug()) {
				return;
			}

			if (!force && code === lastAnalyzedCode) {
				return;
			}

			if (activeDebugRequest && typeof activeDebugRequest.abort === 'function') {
				activeDebugRequest.abort();
				activeDebugRequest = null;
			}

			if (force) {
				lastAnalyzedCode = '';
			}
			lastAnalyzedCode = code;

			var debugFilename =
				editor.fma_file_info && editor.fma_file_info.filename ? editor.fma_file_info.filename : filename;
			activeDebugRequest = window.analyzePHPDebug(code, debugFilename, function (result, status) {
				if (status === 'abort') {
					return;
				}
				activeDebugRequest = null;
				applyDebugResult(result);
			});
		}

		editor.on('keydown', function (cm, event) {
			if (event.ctrlKey && event.shiftKey && event.keyCode === 68) {
				event.preventDefault();
				analyzeCode(true);
			}
		});

		editor.on('change', function () {
			if (isFileTooLargeForLiveDebug()) {
				return;
			}
			clearTimeout(debugTimeout);
			debugTimeout = setTimeout(function () {
				analyzeCode(false);
			}, PHP_DEBUG_DEBOUNCE_MS);
		});

		setTimeout(function () {
			if (!isFileTooLargeForLiveDebug()) {
				analyzeCode(false);
			}
		}, PHP_DEBUG_OPEN_DELAY_MS);
	}

	function wireActiveLineHighlight(editor) {
		var activeLine = null;

		function clearActiveLine() {
			if (activeLine === null) {
				return;
			}
			editor.removeLineClass(activeLine, 'background', 'fma-cm-active-line');
			activeLine = null;
		}

		function updateActiveLine() {
			var line = editor.getCursor().line;
			if (activeLine === line) {
				return;
			}
			editor.operation(function () {
				clearActiveLine();
				activeLine = line;
				editor.addLineClass(activeLine, 'background', 'fma-cm-active-line');
			});
		}

		editor.on('cursorActivity', updateActiveLine);
		editor.on('blur', clearActiveLine);
		updateActiveLine();
	}

	function buildEditOptions(fmaCmTheme) {
		return {
			mimes: [],
			dialogWidth: '78%',
			dialogMaxHeight: null,
			editors: [
				{
					mimes: ['text/plain', 'text/html', 'text/javascript', 'text/css', 'text/x-php', 'application/x-php'],
					info: { name: 'Code Editor' },
					load: function (textarea) {
						var mimeType = this.file.mime;
						var filename = this.file.name;
						var self = this;
						var $ta = $(textarea);
						var $base = $ta.parent().addClass('fma-cm-editor-panel');
						var $dialog = $ta.closest('.elfinder-dialog');
						$dialog.data('fma-fm', self.fm || null);
						$dialog.data('fma-edit-ta', $ta);
						$dialog.data('fma-edit-ctx', self);
						$dialog.data('fma-edit-hash', self.file.hash || '');

						var metrics = getNormalEditorDialogMetrics(self.fm || null);
						$base.css({
							height: metrics.editorHeight + 'px',
							minHeight: metrics.editorHeight + 'px',
							width: '100%',
						});

						var editor = window.CodeMirror.fromTextArea(textarea, {
							mode: resolveCodeMirrorMode(mimeType, filename),
							indentUnit: 4,
							tabSize: 4,
							indentWithTabs: false,
							smartIndent: true,
							lineNumbers: true,
							lineWrapping: false,
							theme: fmaCmTheme,
							gutters: ['CodeMirror-linenumbers', 'fma-error-gutter'],
							extraKeys: (function () {
								function trySaveWithPhpDebugGate() {
									var debugState =
										typeof window.afmGetPhpDebugState === 'function'
											? window.afmGetPhpDebugState()
											: { hasErrors: false, forceSaveWithErrors: false, errors: [] };
									if (debugState.hasErrors && !debugState.forceSaveWithErrors) {
										if (
											debugState.errors &&
											debugState.errors.length &&
											typeof window.showErrorSavePopup === 'function'
										) {
											window.showErrorSavePopup(debugState.errors, function (saveAnyway) {
												if (saveAnyway) {
													if (typeof window.afmAllowPhpSaveWithErrorsOnce === 'function') {
														window.afmAllowPhpSaveWithErrorsOnce();
													}
													if (typeof self.doSave === 'function') {
														self.doSave();
													}
												}
											});
										}
										return;
									}
									if (typeof self.doSave === 'function') {
										self.doSave();
									}
								}
								return {
									'Ctrl-S': trySaveWithPhpDebugGate,
									'Cmd-S': trySaveWithPhpDebugGate,
									'Ctrl-W': function () {
										if (typeof self.doCancel === 'function') {
											self.doCancel();
										}
									},
									'Ctrl-Q': function () {
										if (typeof self.doCancel === 'function') {
											self.doCancel();
										}
									},
									Tab: function (cm) {
										if (cm.somethingSelected()) {
											cm.indentSelection('add');
										} else {
											cm.replaceSelection('    ', 'end', '+input');
										}
									},
									'Shift-Tab': function (cm) {
										cm.indentSelection('subtract');
									},
								};
							})(),
						});

						editor.setSize('100%', metrics.editorHeight);
						$(editor.getWrapperElement()).addClass('fma-cm-editor');

						wireActiveLineHighlight(editor);
						attachPhpDebug(editor, mimeType, filename);

						editor.fma_file_info = {
							filename: filename,
							mime: mimeType,
							hash: self.file.hash,
						};

						$dialog.data('fma-cm-editor', editor);
						setEditorSavedBaseline($dialog, editor.getValue());
						bindEditorSaveBaselineSync($dialog, self.fm || null);
						bindMaximizedDialogCloseGuard($dialog, self.fm || null);
						wrapEditorCloseActions(self, $dialog);
						scheduleLegacyCodePilotSync({ full: true, delay: 0 });
						attachFindReplace($dialog, editor);

						$dialog.on('resize.fma-cm-max', function (e, data) {
							handleEditorDialogMaximize($dialog, $ta, editor, data);
						});
						bindNormalEditorDialogResizeGuard($dialog, $ta, editor, self.fm || null);
						hideElfinderOverlayForEditor(self.fm || null);

						$dialog.on('posinit.fma-editor-modal', function () {
							if (!$dialog.hasClass('elfinder-maximized')) {
								applyNormalEditorDialogLayout($dialog, $ta, editor, self.fm || null);
							}
						});

						$dialog.on('open.fma-editor-modal', function () {
							if (!$dialog.hasClass('elfinder-maximized')) {
								applyNormalEditorDialogLayout($dialog, $ta, editor, self.fm || null);
							}
						});

						setTimeout(function () {
							if (!$dialog.hasClass('elfinder-maximized')) {
								applyNormalEditorDialogLayout($dialog, $ta, editor, self.fm || null);
							}
							editor.focus();
						}, 80);
						setTimeout(function () {
							if (!$dialog.hasClass('elfinder-maximized')) {
								applyNormalEditorDialogLayout($dialog, $ta, editor, self.fm || null);
							}
						}, 220);

						if (typeof window.updateSaveCloseButton === 'function') {
							setTimeout(window.updateSaveCloseButton, 500);
						}

						return editor;
					},
					close: function (textarea, instance) {
						teardownEditorDialogHooks($(textarea).closest('.elfinder-dialog'));
						if (instance && typeof window.clearErrorHighlights === 'function') {
							window.clearErrorHighlights(instance);
							instance.fma_file_info = null;
						}
						this.myCodeMirror = null;
					},
					focus: function (textarea, instance) {
						if (instance && typeof instance.focus === 'function') {
							instance.focus();
						}
					},
					resize: function (textarea, instance) {
						if (!instance) {
							return;
						}
						syncCodeMirrorEditorSize(instance, $(textarea));
					},
					save: function (textarea, editor) {
						var code = editor.getValue();
						var filename = editor.fma_file_info ? editor.fma_file_info.filename : 'unknown.php';

						if (
							filename.toLowerCase().endsWith('.php') ||
							editor.getMode().name === 'php' ||
							editor.getMode().name === 'application/x-httpd-php'
						) {
							var debugState =
								typeof window.afmGetPhpDebugState === 'function'
									? window.afmGetPhpDebugState()
									: {
											hasErrors: false,
											forceSaveWithErrors: false,
											errors: [],
									  };
							// Block all save paths (button + Ctrl/Cmd+S) while PHP debug has errors,
							// unless user explicitly chose "Save Anyway".
							if (debugState.hasErrors && !debugState.forceSaveWithErrors) {
								return false;
							}
						}

						$(textarea).val(code);
						return true;
					},
				},
			],
		};
	}

	window.afmBuildElfinderOptions = function afmBuildElfinderOptions(params) {
		params = params || {};
		var afm = window.afm_object || {};
		var pluginUrl = params.pluginUrl || afm.plugin_url || '';
		var libraryUrl = params.libraryUrl || (pluginUrl ? pluginUrl + 'application/library/' : '');
		var fmakey = params.nonce || afm.nonce || '';
		var ajaxUrl = normalizeToCurrentOrigin(params.ajaxUrl || afm.ajaxurl || '');
		var locale = params.locale || afm.locale || 'en';
		var cmTheme = params.cmTheme || afm.cm_theme || 'default';
		var ui =
			params.ui !== undefined
				? params.ui
				: afm.ui !== undefined
					? afm.ui
					: ['toolbar', 'tree', 'path', 'stat'];

		return {
			cssAutoLoad: false,
			url: ajaxUrl,
			requestType: 'post',
			customData: {
				action: 'fma_load_fma_ui',
				_fmakey: fmakey,
			},
			defaultView: 'icons',
			height: window.afmGetElfinderHeight(),
			lang: locale,
			i18nBaseUrl: libraryUrl ? libraryUrl + 'js/i18n/' : '',
			workerBaseUrl: libraryUrl ? libraryUrl + 'js/worker/' : '',
			ui: ui,
			rememberLastDir: true,
			useBrowserHistory: false,
			requestMaxConn: 4,
			showThreshold: 80,
			sync: 0,
			commandsOptions: {
				search: {
					searchTypes: {
						SearchTag: { name: 'Content', title: 'Search inside file text (current folder only)' },
					},
				},
				edit: buildEditOptions(cmTheme),
				getfile: { onlyURL: false, multiple: false, folders: false },
			},
			handlers: {
				load: function (e, fm) {
					hideLoadingPlaceholder();
					bindElfinderMessageDialogLayout(fm);
					bindElfinderNotifyDialogLayout(fm);
					bindElfinderInfoDialogLayout(fm);
					bindElfinderModalOverflowFix(fm);
					bindElfinderIntegrationFileUrls(fm);
					window.dispatchEvent(new CustomEvent('afm-elfinder-loaded', { detail: { fm: fm } }));
					if (!window._afmElfinderResizeBound) {
						window._afmElfinderResizeBound = true;
						$(window).on('resize.afm-elfinder', function () {
							window.afmResizeElfinder();
						});
					}
					setTimeout(window.afmResizeElfinder, 50);
				},
				init: function (ev, fm) {
					bindElfinderMessageDialogLayout(fm);
					bindElfinderNotifyDialogLayout(fm);
					bindElfinderInfoDialogLayout(fm);
					bindElfinderModalOverflowFix(fm);
					bindElfinderIntegrationFileUrls(fm);
					if (typeof window.fmaInstallContentSearchUi === 'function') {
						window.fmaInstallContentSearchUi(fm);
					}
				},
			},
		};
	};

	window.afmMountElfinder = function afmMountElfinder($container, params) {
		if (!$container || !$container.length || !$.fn.elfinder) {
			return null;
		}
		var opts = window.afmBuildElfinderOptions(params);
		$container.elfinder(opts);
		return $container;
	};
})(window, window.jQuery);
