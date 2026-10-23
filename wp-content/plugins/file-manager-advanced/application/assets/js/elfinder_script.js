/**
 * Content search uses elFinder's built-in SearchTag radio (commandsOptions.search.searchTypes).
 * That radio is only usable when scope is "Here" (current folder); Volume/All disable it.
 * Do not use customData as a function — this elFinder build ignores it (no action on requests).
 */
(function () {
    if (typeof window === 'undefined') {
        return;
    }

    window.fmaInstallContentSearchUi = function (fm) {
        if (!fm || fm._fmaContentSearchWired) {
            return;
        }
        fm._fmaContentSearchWired = true;

        function nsId(name) {
            return fm.namespace + fm.escape(name);
        }

        function searchScopeIsHere() {
            var $cwd = jQuery('#' + nsId('SearchFromCwd'));
            if (!$cwd.length) {
                return true;
            }
            return $cwd.prop('checked') === true;
        }

        function updateContentSearchAvailability() {
            var $tag = jQuery('#' + nsId('SearchTag'));
            if (!$tag.length) {
                return;
            }
            var here = searchScopeIsHere();
            $tag.prop('disabled', !here);
            $tag.next('label').toggleClass('ui-state-disabled', !here);
            if (!here && $tag.prop('checked')) {
                jQuery('#' + nsId('SearchName')).prop('checked', true).trigger('change');
            }
        }

        var evNs = 'fmacs-' + String(fm.namespace || 'ns').replace(/[^\w-]/g, '');
        fm.getUI().on('change.' + evNs + ' click.' + evNs, 'input[name="serchfrom"]', function () {
            setTimeout(updateContentSearchAvailability, 0);
        });

        fm.bind('open', function () {
            setTimeout(updateContentSearchAvailability, 0);
        });

        fm.bind('destroy', function () {
            try {
                fm.getUI().off('.' + evNs);
            } catch (ignore) { }
        });

        var cmd = fm.getCommand('search');
        if (cmd && !cmd._fmaExecWrapped) {
            cmd._fmaExecWrapped = true;
            var origExec = cmd.exec;
            cmd.exec = function (q, target, mime, type) {
                type = (type === undefined || type === null) ? '' : type;
                if (type === 'SearchTag') {
                    if (!searchScopeIsHere()) {
                        fm.error('Content search is only available when the search scope is the current folder (Here).');
                        return jQuery.Deferred().reject();
                    }
                    // Dual-safe payload: keep SearchTag and also prefix q marker.
                    // If PHP drops trailing POST vars (e.g. max_input_vars), backend can still detect content search from q.
                    if (typeof q === 'string' && q.length && q.indexOf('__CONTENT_SEARCH__:') !== 0) {
                        q = '__CONTENT_SEARCH__:' + q;
                    }
                }
                return origExec.call(this, q, target, mime, type);
            };
        }
    };
}());

(function () {
    function normalizeAjaxUrl(url) {
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

    window.analyzePHPDebug = function analyzePHPDebug(code, filename, callback) {
        var afm = window.afm_object || {};
        return jQuery.ajax({
            url: normalizeAjaxUrl(afm.ajaxurl),
            type: 'POST',
            data: {
                action: 'fma_debug_php',
                nonce: afm.nonce,
                php_code: code,
                filename: filename,
            },
            success: function (response) {
                if (callback && typeof callback === 'function') {
                    callback(response, 'success');
                }
            },
            error: function (xhr, status) {
                if (status === 'abort') {
                    if (callback && typeof callback === 'function') {
                        callback(null, 'abort');
                    }
                    return;
                }
                if (callback && typeof callback === 'function') {
                    callback({
                        valid: false,
                        errors: [{ line: 1, message: 'Failed to analyze PHP code', type: 'error' }],
                        debug_info: {},
                        message: 'Failed to analyze PHP code',
                    }, 'error');
                }
            },
        });
    };
}());

jQuery(document).ready(function () {
    function normalizeToCurrentOrigin(url) {
        if (!url || typeof url !== 'string') return url;
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

    // Function to check if debug feature is enabled (check dynamically)
    function isDebugEnabled() {
        var enabled = window.afm_object && window.afm_object.debug_enabled;
        return enabled === '1' || enabled === 1 || enabled === true;
    }

    // Global variables for error tracking
    var hasErrors = false;
    var currentEditor = null;
    var currentErrors = [];
    var lastButtonState = null;
    var tooltipTimeout = null;
    var lastTooltipLine = null;
    var isSaveButtonClicked = false;
    var forceSaveWithErrors = false;

    // CSS styles for error highlighting
    var errorStyles = `
        <style>
        .fma-error-line {
            background-color: #fed7d7 !important;
            border-left: 3px solid #c53030 !important;
        }
        .fma-error-underline {
            text-decoration: underline wavy #c53030 !important;
            text-decoration-thickness: 2px !important;
        }
        .fma-error-marker {
            color: #c53030 !important;
            font-size: 14px !important;
            font-weight: bold !important;
            text-align: center !important;
            line-height: 1 !important;
        }
        .fma-error-gutter {
            background-color: #fed7d7 !important;
            border-right: 2px solid #c53030 !important;
        }
        .fma-save-close-disabled {
            opacity: 0.5 !important;
            cursor: not-allowed !important;
            pointer-events: none !important;
        }
        .fma-error-tooltip {
            position: fixed;
            background: #2d3748;
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-family: 'Courier New', monospace;
            z-index: 100150;
            pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 300px;
            word-wrap: break-word;
            line-height: 1.4;
        }
        .fma-error-tooltip::before {
            content: '';
            position: absolute;
            top: -5px;
            left: 50%;
            transform: translateX(-50%);
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 5px solid #2d3748;
        }
        .fma-error-tooltip .error-title {
            font-weight: bold;
            color: #feb2b2;
            margin-bottom: 4px;
        }
        .fma-error-tooltip .error-message {
            color: #e2e8f0;
        }
        .fma-error-tooltip .error-line {
            color: #a0aec0;
            font-size: 11px;
            margin-top: 4px;
        }
        </style>
    `;
    jQuery('head').append(errorStyles);

    if (1 == afm_object.hide_path) {
        var custom_css = `<style id="hide-path" type="text/css">.elfinder-info-path { display:none; } .elfinder-info-tb tr:nth-child(2) { display:none; }</style>`;
        jQuery("head").append(custom_css);
    }

    var hide_preferences_css = `<style id="hide-preferences" type="text/css">
        .elfinder-contextmenu-item:has( .elfinder-button-icon.elfinder-button-icon-preference.elfinder-contextmenu-icon ) {display: none;}
        .elfinder-button-icon-replace {
            background-image: url(${afm_object.plugin_url}application/assets/images/replace.png);
            background-size: 16px;
            background-repeat: no-repeat;
            background-position: center;
        }
        .elfinder-contextmenu-icon-replace {
            background-image: url(${afm_object.plugin_url}application/assets/images/replace.png);
            background-size: 16px;
            background-repeat: no-repeat;
            background-position: center;
        }
    </style>`;
    jQuery('head').append(hide_preferences_css);

    var fmakey = afm_object.nonce;
    var fma_locale = afm_object.locale;
    var fma_cm_theme = afm_object.cm_theme;
    var afmAjaxUrl = normalizeToCurrentOrigin(afm_object.ajaxurl);

    function escapeHtml(text) {
        return jQuery('<div>').text(text || '').html();
    }

    function getErrorForLine(lineNumber) {
        if (!currentErrors || currentErrors.length === 0) {
            return null;
        }
        var oneBased = lineNumber + 1;
        for (var i = 0; i < currentErrors.length; i++) {
            var errLine = currentErrors[i].line;
            if (!errLine || errLine < 1) {
                errLine = 1;
            }
            if (errLine === oneBased) {
                return currentErrors[i];
            }
        }
        return null;
    }

    function wireEditorErrorTooltips(editor) {
        if (!editor || editor._fmaTooltipWired) {
            return;
        }

        editor._fmaTooltipWired = true;
        var wrapper = editor.getWrapperElement();
        if (!wrapper) {
            return;
        }

        jQuery(wrapper).on('mousemove.fma-error-tooltip', function (e) {
            if (!hasErrors || !currentErrors || !currentErrors.length) {
                hideErrorTooltip();
                return;
            }

            var pos = editor.coordsChar({ left: e.clientX, top: e.clientY }, 'window');
            var error = getErrorForLine(pos.line);

            if (error) {
                showErrorTooltip(e, error);
            } else {
                hideErrorTooltip();
            }
        });

        jQuery(wrapper).on('mouseleave.fma-error-tooltip', function () {
            hideErrorTooltip();
        });
    }

    function clearMarkedErrorLines(editor) {
        if (!editor || !editor._fmaErrorLines || !editor._fmaErrorLines.length) {
            return;
        }
        editor._fmaErrorLines.forEach(function (lineNumber) {
            editor.removeLineClass(lineNumber, 'background', 'fma-error-line');
            editor.removeLineClass(lineNumber, 'text', 'fma-error-underline');
            editor.setGutterMarker(lineNumber, 'fma-error-gutter', null);
        });
        editor._fmaErrorLines = [];
    }

    // Highlight error lines in CodeMirror (only touches affected lines — safe for large files)
    function highlightErrorLines(editor, errors) {
        if (!editor) {
            return;
        }

        if (!errors || errors.length === 0) {
            clearErrorHighlights(editor);
            return;
        }

        currentErrors = errors;
        clearMarkedErrorLines(editor);

        var marked = [];
        errors.forEach(function (error) {
            var reportedLine = error.line && error.line > 0 ? error.line : 1;
            var lineNumber = reportedLine - 1;
            if (lineNumber >= 0 && lineNumber < editor.lineCount()) {
                marked.push(lineNumber);
                editor.addLineClass(lineNumber, 'background', 'fma-error-line');
                editor.addLineClass(lineNumber, 'text', 'fma-error-underline');

                var marker = document.createElement('div');
                marker.className = 'fma-error-marker';
                marker.innerHTML = '!';
                marker.title = error.message || 'PHP Error';
                editor.setGutterMarker(lineNumber, 'fma-error-gutter', marker);
            }
        });

        if (marked.length === 0 && errors.length > 0) {
            hasErrors = true;
            updateSaveCloseButton();
            return;
        }

        editor._fmaErrorLines = marked;
        hasErrors = true;
        wireEditorErrorTooltips(editor);
        updateSaveCloseButton();
    }

    // Clear error highlights
    function clearErrorHighlights(editor) {
        if (!editor) return;

        // Clear currentErrors first to prevent tooltip from showing
        currentErrors = [];
        hasErrors = false;

        // Hide any visible tooltip immediately
        hideErrorTooltip();

        clearMarkedErrorLines(editor);
        updateSaveCloseButton();
    }

    // Make functions globally available for FileManagerPanel reinitialization
    window.highlightErrorLines = highlightErrorLines;
    window.clearErrorHighlights = clearErrorHighlights;


    // Show error tooltip on hover
    function showErrorTooltip(event, error) {
        // Double-check that we still have errors before showing tooltip
        if (!currentErrors || currentErrors.length === 0 || !hasErrors) {
            hideErrorTooltip();
            return;
        }

        // Verify the error still exists in currentErrors
        var errorExists = false;
        for (var i = 0; i < currentErrors.length; i++) {
            if (currentErrors[i].line === error.line) {
                errorExists = true;
                break;
            }
        }

        if (!errorExists) {
            hideErrorTooltip();
            return;
        }

        // Clear existing timeout
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
        }

        var errLine = error.line && error.line > 0 ? error.line : 1;

        // Check if we're already showing tooltip for this line
        if (lastTooltipLine === errLine && jQuery('.fma-error-tooltip').length) {
            return;
        }

        // Debounce tooltip showing
        var clientX = event.clientX;
        var clientY = event.clientY;
        tooltipTimeout = setTimeout(function () {
            // Double-check again before showing (errors might have been cleared)
            if (!currentErrors || currentErrors.length === 0 || !hasErrors) {
                hideErrorTooltip();
                return;
            }

            // Remove existing tooltip
            jQuery('.fma-error-tooltip').remove();

            var safeMessage = escapeHtml(error.message || 'PHP Error');
            var tooltipHtml = `
                <div class="fma-error-tooltip">
                    <div class="error-title">PHP Error</div>
                    <div class="error-message">${safeMessage}</div>
                    <div class="error-line">Line ${errLine}</div>
                </div>
            `;

            var tooltip = jQuery(tooltipHtml).appendTo('body');

            // Position above cursor (fixed — works in fullscreen / body-moved dialog)
            var tooltipWidth = tooltip.outerWidth();
            var tooltipHeight = tooltip.outerHeight();
            var windowWidth = jQuery(window).width();
            var windowHeight = jQuery(window).height();
            var x = clientX + 12;
            var y = clientY - tooltipHeight - 12;

            if (x + tooltipWidth > windowWidth - 8) {
                x = Math.max(8, windowWidth - tooltipWidth - 8);
            }
            if (y < 8) {
                y = clientY + 16;
            }
            if (y + tooltipHeight > windowHeight - 8) {
                y = Math.max(8, windowHeight - tooltipHeight - 8);
            }

            tooltip.css({
                left: x + 'px',
                top: y + 'px'
            });

            lastTooltipLine = errLine;
        }, 150);
    }

    // Hide error tooltip
    function hideErrorTooltip() {
        // Clear timeout
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
        }

        // Remove tooltip
        jQuery('.fma-error-tooltip').remove();

        // Reset tracking
        lastTooltipLine = null;
    }

    // Update Save & Close button state based on error status
    function updateSaveCloseButton() {
        // Check if state has changed to avoid unnecessary updates
        var currentState = hasErrors ? 'disabled' : 'enabled';
        if (lastButtonState === currentState) {
            return; // No change needed
        }
        lastButtonState = currentState;

        // Find the Save & Close button with multiple selectors
        var selectors = [
            '.elfinder-button-save-close',
            '.elfinder-button-save',
            '[title*="Save"]',
            '[title*="save"]',
            '.ui-button[title*="Save"]',
            '.ui-button[title*="save"]',
            'button[title*="Save"]',
            'button[title*="save"]',
            '.elfinder-toolbar button[title*="Save"]',
            '.elfinder-toolbar button[title*="save"]',
            '.elfinder-toolbar .ui-button[title*="Save"]',
            '.elfinder-toolbar .ui-button[title*="save"]',
            '.elfinder .ui-button[title*="Save"]',
            '.elfinder .ui-button[title*="save"]',
            '.elfinder button[title*="Save"]',
            '.elfinder button[title*="save"]'
        ];

        var saveCloseBtn = jQuery(selectors.join(', ')).filter(':visible');

        // Also try to find buttons by text content
        if (saveCloseBtn.length === 0) {
            var textSelectors = [
                'button:contains("Save")',
                'button:contains("save")',
                '.ui-button:contains("Save")',
                '.ui-button:contains("save")',
                '.elfinder button:contains("Save")',
                '.elfinder button:contains("save")',
                '.elfinder .ui-button:contains("Save")',
                '.elfinder .ui-button:contains("save")'
            ];
            saveCloseBtn = jQuery(textSelectors.join(', ')).filter(':visible');
        }

        if (saveCloseBtn.length > 0) {
            if (hasErrors) {
                // Disable button when errors exist
                saveCloseBtn.addClass('fma-save-close-disabled');
                saveCloseBtn.attr('disabled', 'disabled');
                saveCloseBtn.attr('title', 'Please fix PHP errors before saving');
                saveCloseBtn.css('opacity', '0.5');
                saveCloseBtn.css('cursor', 'not-allowed');
                saveCloseBtn.prop('disabled', true);
                saveCloseBtn.off('click.fma-disable'); // Remove existing handlers
                saveCloseBtn.on('click.fma-disable', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                });

                // Track when save button is actually clicked
                saveCloseBtn.on('click.fma-save-track', function (e) {
                    isSaveButtonClicked = true;
                    setTimeout(function () {
                        isSaveButtonClicked = false;
                    }, 1000);
                });
            } else {
                // Enable button when no errors
                saveCloseBtn.removeClass('fma-save-close-disabled');
                saveCloseBtn.removeAttr('disabled');
                saveCloseBtn.attr('title', 'Save & Close');
                saveCloseBtn.css('opacity', '1');
                saveCloseBtn.css('cursor', 'pointer');
                saveCloseBtn.prop('disabled', false);
                saveCloseBtn.off('click.fma-disable'); // Remove disable handlers

                // Track when save button is actually clicked
                saveCloseBtn.off('click.fma-save-track'); // Remove existing handlers
                saveCloseBtn.on('click.fma-save-track', function (e) {
                    isSaveButtonClicked = true;
                    setTimeout(function () {
                        isSaveButtonClicked = false;
                    }, 1000);
                });
            }
        }
    }

    // Periodic button check (since elFinder buttons load dynamically)
    setInterval(function () {
        if (currentEditor && hasErrors) {
            // Only check when there are errors to avoid unnecessary updates
            updateSaveCloseButton();
        }
    }, 10000); // Reduced frequency to every 10 seconds and only when errors exist

    // Show error popup on save attempt
    function showErrorSavePopup(errors, callback) {
        var errorList = errors.map(function (error) {
            return `Line ${error.line}: ${error.message}`;
        }).join('<br>');

        var popupHtml = `
            <div class="fma-modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; justify-content: center; align-items: center;">
                <div class="fma-error-popup" style="background: white; border-radius: 8px; padding: 20px; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <div style="font-size: 24px; margin-right: 10px;">⚠️</div>
                        <h3 style="margin: 0; color: #c53030; font-size: 18px;">PHP Syntax Errors Found</h3>
                    </div>
                    <div style="margin-bottom: 20px; color: #4a5568; line-height: 1.5;">
                        <p style="margin: 0 0 10px 0;">Please fix the following errors before saving:</p>
                        <div style="background: #fed7d7; padding: 10px; border-radius: 4px; border-left: 3px solid #c53030; font-family: monospace; font-size: 12px;">
                            ${errorList}
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="fma-error-okay" style="background: #4299e1; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            Okay
                        </button>
                        <button class="fma-error-save-anyway" style="background: #c53030; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px;">
                            Save Anyway
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing popup
        jQuery('.fma-modal-overlay').remove();

        // Add new popup
        var popup = jQuery(popupHtml).appendTo('body');

        // Okay button - close popup and return to editor
        popup.find('.fma-error-okay').on('click', function () {
            popup.remove();
            if (callback) callback(false); // Don't save
        });

        // Save Anyway button - close popup and save file
        popup.find('.fma-error-save-anyway').on('click', function () {
            popup.remove();
            if (callback) callback(true); // Save anyway
        });

        // Close on overlay click
        popup.find('.fma-modal-overlay').on('click', function (e) {
            if (e.target === this) {
                popup.remove();
                if (callback) callback(false); // Don't save
            }
        });
    }

    // Show simple success modal (with duplicate prevention)
    function showSuccessModal(message) {
        // Prevent duplicate modals
        if (jQuery('.fma-modal-overlay').length > 0) {
            return;
        }

        var modalHtml = `
            <div class="fma-modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10001; display: flex; align-items: center; justify-content: center;">
                <div class="fma-modal" style="background: white; border-radius: 8px; padding: 30px; max-width: 400px; width: 90%; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.3); font-family: Arial, sans-serif;">
                    <div style="color: #46b450; font-size: 48px; margin-bottom: 15px;">✓</div>
                    <h3 style="margin: 0 0 10px 0; color: #46b450; font-size: 18px;">Success!</h3>
                    <p style="margin: 0 0 20px 0; color: #333; font-size: 14px;">${message}</p>
                    <button class="fma-modal-close" style="padding: 10px 20px; background: #46b450; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">OK</button>
                </div>
            </div>
        `;

        var modal = jQuery(modalHtml).appendTo('body');

        // Close modal on click
        modal.find('.fma-modal-close, .fma-modal-overlay').on('click', function (e) {
            if (e.target === this) {
                modal.remove();
            }
        });

        // Auto close after 3 seconds
        setTimeout(function () {
            modal.remove();
        }, 3000);
    }

    // Unsaved-changes warning when switching files in fullscreen explorer
    function showUnsavedFileSwitchPopup(options, callback) {
        options = options || {};
        var currentName = escapeHtml(options.currentName || 'this file');
        var nextName = escapeHtml(options.nextName || 'another file');

        jQuery('.fma-unsaved-switch-overlay').remove();

        var popupHtml =
            '<div class="fma-unsaved-switch-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 100150; display: flex; justify-content: center; align-items: center;">' +
            '<div class="fma-unsaved-switch-popup" style="background: white; border-radius: 8px; padding: 24px; max-width: 480px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3); font-family: Arial, sans-serif;">' +
            '<div style="display: flex; align-items: flex-start; margin-bottom: 16px;">' +
            '<div style="font-size: 28px; margin-right: 12px; line-height: 1;">⚠️</div>' +
            '<div>' +
            '<h3 style="margin: 0 0 8px 0; color: #c05621; font-size: 18px;">Unsaved changes</h3>' +
            '<p style="margin: 0; color: #4a5568; line-height: 1.5; font-size: 14px;">' +
            '<strong>' +
            currentName +
            '</strong> has unsaved changes. Save before opening <strong>' +
            nextName +
            '</strong>, or your edits will be lost.' +
            '</p>' +
            '</div>' +
            '</div>' +
            '<div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">' +
            '<button type="button" class="fma-unsaved-cancel" style="background: #e2e8f0; color: #2d3748; border: none; padding: 10px 18px; border-radius: 4px; cursor: pointer; font-size: 14px;">Cancel</button>' +
            '<button type="button" class="fma-unsaved-discard" style="background: #fff; color: #c53030; border: 1px solid #fc8181; padding: 10px 18px; border-radius: 4px; cursor: pointer; font-size: 14px;">Discard changes</button>' +
            '<button type="button" class="fma-unsaved-save" style="background: #3182ce; color: white; border: none; padding: 10px 18px; border-radius: 4px; cursor: pointer; font-size: 14px;">Save &amp; open</button>' +
            '</div>' +
            '</div>' +
            '</div>';

        var popup = jQuery(popupHtml).appendTo('body');

        function finish(action) {
            popup.remove();
            if (callback) {
                callback(action);
            }
        }

        popup.find('.fma-unsaved-save').on('click', function () {
            finish('save');
        });
        popup.find('.fma-unsaved-discard').on('click', function () {
            finish('discard');
        });
        popup.find('.fma-unsaved-cancel').on('click', function () {
            finish('cancel');
        });
        popup.on('click', function (e) {
            if (e.target === popup[0]) {
                finish('cancel');
            }
        });
    }

    window.highlightErrorLines = highlightErrorLines;
    window.clearErrorHighlights = clearErrorHighlights;
    window.showErrorSavePopup = showErrorSavePopup;
    window.showUnsavedFileSwitchPopup = showUnsavedFileSwitchPopup;
    window.updateSaveCloseButton = updateSaveCloseButton;
    window.afmGetPhpDebugState = function () {
        return {
            hasErrors: hasErrors,
            isSaveButtonClicked: isSaveButtonClicked,
            forceSaveWithErrors: forceSaveWithErrors,
            errors: currentErrors || [],
        };
    };

    // One-shot bypass used by "Save Anyway" (Ctrl+S / save gate)
    window.afmAllowPhpSaveWithErrorsOnce = function () {
        forceSaveWithErrors = true;
        setTimeout(function () {
            forceSaveWithErrors = false;
        }, 1500);
    };

    // CRITICAL: Check if we're on the new React UI and NOT on filemanager tab
    // If we're on settings, logs, notifications, etc., DON'T initialize elFinder
    // This prevents elFinder from overriding the hash on page reload
    const currentHash = window.location.hash.replace(/^#/, '').replace(/^\//, '');
    const validTabs = ['dashboard', 'filemanager', 'settings', 'logs', 'notifications', 'extension', 'docs', 'pro', 'planaccess'];
    let currentTab = 'filemanager'; // Default

    // Check hash for tab
    if (currentHash) {
        const hashParts = currentHash.split('/');
        const mainTab = hashParts[0] ? hashParts[0].toLowerCase() : '';
        if (validTabs.includes(mainTab)) {
            currentTab = mainTab;
        } else if (!currentHash.startsWith('elf_') && currentHash.length < 20) {
            // Not an elFinder hash, might be a valid tab
            if (validTabs.includes(currentHash.toLowerCase())) {
                currentTab = currentHash.toLowerCase();
            }
        }
    }

    // Also check sessionStorage for saved tab (in case hash was lost)
    const savedTab = sessionStorage.getItem('afm-active-tab');
    const shouldRestoreTab = sessionStorage.getItem('afm-should-restore-tab') === 'true';
    if (shouldRestoreTab && savedTab && validTabs.includes(savedTab)) {
        currentTab = savedTab;
    }

    // React admin mounts FileManagerPanel — it pulls latest settings via REST and inits/refreshes elFinder.
    // If we init here, CodeMirror theme + ui: are frozen from page-load PHP; tab-switch "reload" never applies new settings.
    if (typeof afm_object !== 'undefined' && afm_object.react_shell) {
        return;
    }

    // Only initialize elFinder if we're on filemanager tab
    // This prevents elFinder from overriding hash when on other tabs
    if (currentTab !== 'filemanager') {
        return; // Don't initialize elFinder
    }

    if (typeof window.afmMountElfinder === 'function') {
        window.afmMountElfinder(jQuery('#file_manager_advanced'), {
            nonce: fmakey,
            ajaxUrl: afmAjaxUrl,
            locale: fma_locale,
            cmTheme: fma_cm_theme,
            ui: afm_object.ui,
            pluginUrl: afm_object.plugin_url,
        });
    }

});



