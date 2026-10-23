/**
 * elFinder security hardening for File Manager Advanced.
 *
 * Patches AFM-929 class issues without modifying bundled elFinder library files:
 * - postMessage origin prefix bypass
 * - playsound DOM XSS via soundFile
 */
(function ($) {
	'use strict';

	if (!$ || !$.fn.elfinder) {
		return;
	}

	var corsMessageType = 'io.studio-42.github';
	var soundFilePattern = /^[A-Za-z0-9._-]+\.wav$/;
	var bindPattern = /^[a-zA-Z0-9._-]+$/;
	var originalElf = $.fn.elfinder;

	function trustedOrigins(fm) {
		var origins = {};

		try {
			origins[new URL(fm.convAbsUrl(fm.options.url)).origin] = true;
		} catch (e) {}

		try {
			origins[new URL(fm.convAbsUrl(fm.uploadURL)).origin] = true;
		} catch (e) {}

		return origins;
	}

	function soundPathFor(fm) {
		if (fm.options.soundPath) {
			return fm.options.soundPath.replace(/\/+$/, '') + '/';
		}

		return fm.baseUrl + 'sounds/';
	}

	function getBeeper() {
		var audios = document.body.getElementsByTagName('audio');
		return audios.length ? audios[audios.length - 1] : null;
	}

	function handleCorsMessage(fm, origins, ev) {
		var res = ev.originalEvent || null;
		var obj, data, bind;

		if (!res || !res.origin || !origins[res.origin]) {
			return;
		}

		try {
			if (typeof res.data !== 'string') {
				return;
			}

			obj = JSON.parse(res.data);
			if (obj.type !== corsMessageType) {
				return;
			}

			data = obj.data || null;
			if (!data) {
				return;
			}

			bind = obj.bind;
			if (bind && (!bindPattern.test(bind) || !fm.commands[bind])) {
				return;
			}

			if (data.error) {
				if (bind) {
					fm.trigger(bind + 'fail', data);
				}
				fm.error(data.error);
				return;
			}

			data.warning && fm.error(data.warning);
			fm.updateCache(data);
			data.removed && data.removed.length && fm.remove(data);
			data.added && data.added.length && fm.add(data);
			data.changed && data.changed.length && fm.change(data);
			if (bind) {
				fm.trigger(bind, data);
				fm.trigger(bind + 'done');
			}
			data.sync && fm.sync();
		} catch (err) {
			fm.sync();
		}
	}

	function securePlaySound(fm, data) {
		var beeper = getBeeper();
		var play = beeper && beeper.canPlayType && beeper.canPlayType('audio/wav; codecs="1"');
		var file = data && data.soundFile;

		if (!play || !file || play === '' || play === 'no' || !soundFilePattern.test(file)) {
			return;
		}

		beeper.innerHTML = '';
		var source = document.createElement('source');
		source.src = soundPathFor(fm) + file;
		source.type = 'audio/wav';
		beeper.appendChild(source);
		beeper.play();
	}

	/**
	 * AFM-935: Integration stream URLs also live on admin-ajax.php, so elFinder's
	 * open command treats them as the connector URL and rewrites open/preview to
	 * POST cmd=file. Force GET so afmp_stream_* URLs open/download correctly.
	 */
	function patchOpenForStreamUrls(fm) {
		var openCmd;

		if (fm._fmaOpenStreamPatched) {
			return;
		}

		fm._fmaOpenStreamPatched = true;
		openCmd = fm.getCommand && fm.getCommand('open');

		if (openCmd) {
			openCmd.options = openCmd.options || {};
			openCmd.options.method = 'get';
		}
	}

	function hardenInstance(fm) {
		if (fm._fmaSecurityHardened) {
			return;
		}

		fm._fmaSecurityHardened = true;

		patchOpenForStreamUrls(fm);

		// elFinder unbind() only removes a handler when the exact callback is passed.
		// Intercept playsound at trigger() so the vulnerable handler never runs.
		if (!fm._fmaOriginalTrigger) {
			fm._fmaOriginalTrigger = fm.trigger;
			fm.trigger = function (evType, data, allowModify) {
				if (String(evType).toLowerCase() === 'playsound') {
					securePlaySound(fm, data);
					return fm;
				}
				return fm._fmaOriginalTrigger.apply(fm, arguments);
			};
		}

		fm.bind('opendone', function () {
			var origins = trustedOrigins(fm);

			$(window).off('message.' + fm.namespace);
			$(window).on('message.' + fm.namespace, function (ev) {
				handleCorsMessage(fm, origins, ev);
			});
		});
	}

	function wrapBootCallback(userCallback) {
		return function (fm, extra) {
			hardenInstance(fm);
			if (typeof userCallback === 'function') {
				userCallback.call(this, fm, extra);
			}
		};
	}

	$.fn.elfinder = function (opt, bootCallback) {
		if (typeof opt === 'string') {
			return originalElf.apply(this, arguments);
		}

		var options = opt;
		var userBoot = typeof bootCallback === 'function' ? bootCallback : null;

		if (options && typeof options.bootCallback === 'function') {
			var optionBoot = options.bootCallback;
			options = $.extend({}, options, {
				bootCallback: function (fm, extra) {
					hardenInstance(fm);
					optionBoot.call(this, fm, extra);
				}
			});
		}

		if (arguments.length === 1) {
			return originalElf.call(this, options, wrapBootCallback(null));
		}

		return originalElf.call(this, options, wrapBootCallback(userBoot));
	};

	$.fn.elfinder._fmaSecurityPatched = true;
	window.afmElfinderSecurity = { patched: true, version: '1.0.2' };
})(jQuery);
