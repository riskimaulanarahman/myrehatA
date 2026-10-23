<?php
/**
 * Notification message helpers (Quill HTML save/send).
 *
 * @package File_Manager_Advanced
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'class_fma_notification_message' ) ) :

	/**
	 * Sanitize and convert notification templates between HTML and Slack mrkdwn.
	 */
	class class_fma_notification_message {

		/**
		 * Allowed HTML tags/classes from the ReactQuill notification editor.
		 *
		 * @return array
		 */
		public static function allowed_html() {
			$allowed = wp_kses_allowed_html( 'post' );

			// Quill snow theme: block tags + alignment classes / inline styles.
			foreach ( array( 'p', 'div', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'span' ) as $tag ) {
				if ( ! isset( $allowed[ $tag ] ) || ! is_array( $allowed[ $tag ] ) ) {
					$allowed[ $tag ] = array();
				}
				$allowed[ $tag ]['class'] = true;
				$allowed[ $tag ]['style'] = true;
			}

			foreach ( array( 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'br' ) as $tag ) {
				if ( ! isset( $allowed[ $tag ] ) || ! is_array( $allowed[ $tag ] ) ) {
					$allowed[ $tag ] = array();
				}
			}

			if ( ! isset( $allowed['a'] ) || ! is_array( $allowed['a'] ) ) {
				$allowed['a'] = array();
			}
			$allowed['a']['href']   = true;
			$allowed['a']['target'] = true;
			$allowed['a']['rel']    = true;
			$allowed['a']['class']  = true;

			if ( ! isset( $allowed['img'] ) || ! is_array( $allowed['img'] ) ) {
				$allowed['img'] = array();
			}
			$allowed['img']['src']    = true;
			$allowed['img']['alt']    = true;
			$allowed['img']['width']  = true;
			$allowed['img']['height'] = true;
			$allowed['img']['class']  = true;
			$allowed['img']['style']  = true;

			return $allowed;
		}

		/**
		 * Canonical plain-text default notification body (with line breaks).
		 *
		 * @return string
		 */
		public static function default_message_plain() {
			return "Hi {admin_email},\n\nA quick update from the Advanced File Manager plugin on your site {site_name}.\nA {item_type} was {event} by {username} on {date_time}. The {item_type} name is {file_name} with the extension {ext}, and the action was performed from the following IP Address: {ip_address}.";
		}

		/**
		 * Canonical Quill HTML for the default notification body.
		 *
		 * @return string
		 */
		public static function default_message_html() {
			return '<p>Hi {admin_email},</p><p>A quick update from the Advanced File Manager plugin on your site {site_name}.<br>A {item_type} was {event} by {username} on {date_time}. The {item_type} name is {file_name} with the extension {ext}, and the action was performed from the following IP Address: {ip_address}.</p>';
		}

		/**
		 * Fingerprint message text for comparing structured vs collapsed defaults.
		 *
		 * @param string $content Message content.
		 * @return string
		 */
		private static function message_fingerprint( $content ) {
			$text = wp_strip_all_tags( (string) $content );
			$text = html_entity_decode( $text, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
			$text = preg_replace( '/\s+/u', '', $text );
			return strtolower( (string) $text );
		}

		/**
		 * Whether the template already has usable line/paragraph structure.
		 *
		 * @param string $content Message content.
		 * @return bool
		 */
		private static function has_message_structure( $content ) {
			$content = (string) $content;
			if ( false !== strpos( $content, "\n" ) ) {
				return true;
			}
			if ( preg_match( '/<br\s*\/?>/i', $content ) ) {
				return true;
			}
			if ( preg_match_all( '/<p\b/i', $content ) >= 2 ) {
				return true;
			}
			return false;
		}

		/**
		 * Restore line breaks when a previous sanitize stripped HTML/newlines from the default template.
		 *
		 * @param string $content Stored message.
		 * @return string
		 */
		public static function restore_message_structure( $content ) {
			if ( ! is_string( $content ) || '' === trim( $content ) ) {
				return $content;
			}

			if ( self::has_message_structure( $content ) ) {
				return $content;
			}

			$fingerprints = array(
				self::message_fingerprint( self::default_message_plain() ),
				self::message_fingerprint( "Hi {admin_email},\n\nA quick update from the Advanced File Manager plugin on your site {site_name}.\nA file was {event} by {username} on {date_time}. The file name is {file_name} with the extension {ext}, and the action was performed from the following IP Address: {ip_address}." ),
			);

			$current = self::message_fingerprint( $content );
			if ( in_array( $current, $fingerprints, true ) ) {
				return self::default_message_html();
			}

			return $content;
		}

		/**
		 * Sanitize a notification template saved from the Quill editor.
		 *
		 * @param string $html Raw message HTML.
		 * @return string
		 */
		public static function sanitize_message( $html ) {
			$html = is_string( $html ) ? $html : '';
			if ( '' === trim( $html ) ) {
				return '';
			}

			$sanitized = wp_kses( wp_unslash( $html ), self::allowed_html() );
			return self::restore_message_structure( $sanitized );
		}

		/**
		 * Sanitize a Slack template (strip formats Slack cannot send safely).
		 *
		 * @param string $html Raw message HTML.
		 * @return string
		 */
		public static function sanitize_slack_message( $html ) {
			return self::prepare_message_for_slack( self::sanitize_message( $html ) );
		}

		/**
		 * Whether the stored template contains Quill/HTML markup (not legacy plain text).
		 *
		 * @param string $content Message template.
		 * @return bool
		 */
		public static function is_html_message( $content ) {
			if ( ! is_string( $content ) || '' === trim( $content ) ) {
				return false;
			}

			return (bool) preg_match( '/<(?:p|br|strong|b|em|i|u|s|strike|h[1-6]|ul|ol|li|a)\b/i', $content );
		}

		/**
		 * Convert Quill alignment classes to inline styles for HTML email clients.
		 *
		 * @param string $html Sanitized HTML.
		 * @return string
		 */
		public static function prepare_html_for_email( $html ) {
			$html = (string) $html;
			if ( '' === trim( $html ) ) {
				return '';
			}

			$alignments = array(
				'ql-align-center'  => 'text-align: center;',
				'ql-align-right'   => 'text-align: right;',
				'ql-align-justify' => 'text-align: justify;',
			);

			foreach ( $alignments as $class => $style ) {
				$pattern = '/<(p|h[1-4])(\s[^>]*?)class="([^"]*\b' . preg_quote( $class, '/' ) . '\b[^"]*)"([^>]*)>/i';
				$html    = preg_replace_callback(
					$pattern,
					static function ( $matches ) use ( $style ) {
						$tag   = $matches[1];
						$before = $matches[2];
						$after  = $matches[4];
						if ( preg_match( '/\bstyle="/i', $before . $after ) ) {
							return $matches[0];
						}
						return '<' . $tag . $before . ' style="' . $style . '"' . $after . '>';
					},
					$html
				);
			}

			// Email clients often collapse bare <p> spacing — add a reliable bottom margin.
			$html = preg_replace_callback(
				'/<p(\s[^>]*)?>/i',
				static function ( $matches ) {
					$attrs = isset( $matches[1] ) ? $matches[1] : '';
					if ( preg_match( '/\bstyle\s*=\s*"/i', $attrs ) ) {
						return '<p' . preg_replace( '/\bstyle\s*=\s*"/i', 'style="margin: 0 0 12px 0; ', $attrs ) . '>';
					}
					return '<p' . $attrs . ' style="margin: 0 0 12px 0;">';
				},
				$html
			);

			// Lists: keep spacing readable in HTML email clients.
			$html = preg_replace(
				'/<ul(\s[^>]*)?>/i',
				'<ul$1 style="margin: 0 0 12px 0; padding-left: 24px;">',
				$html
			);
			$html = preg_replace(
				'/<ol(\s[^>]*)?>/i',
				'<ol$1 style="margin: 0 0 12px 0; padding-left: 24px;">',
				$html
			);
			$html = preg_replace(
				'/<li(\s[^>]*)?>/i',
				'<li$1 style="margin: 0 0 4px 0;">',
				$html
			);

			// Images: constrain width so large uploads don't break the layout.
			$html = preg_replace_callback(
				'/<img\b([^>]*)>/i',
				static function ( $matches ) {
					$attrs = $matches[1];
					if ( preg_match( '/\bstyle\s*=\s*"/i', $attrs ) ) {
						$attrs = preg_replace( '/\bstyle\s*=\s*"/i', 'style="max-width:100%;height:auto;display:block;margin:8px 0; ', $attrs );
					} else {
						$attrs .= ' style="max-width:100%;height:auto;display:block;margin:8px 0;"';
					}
					return '<img' . $attrs . '>';
				},
				$html
			);

			return $html;
		}

		/**
		 * Collect image URLs from a Quill HTML template (for Slack image blocks).
		 *
		 * @param string $html Message HTML.
		 * @return array
		 */
		public static function extract_image_urls( $html ) {
			$html = (string) $html;
			if ( '' === trim( $html ) || false === stripos( $html, '<img' ) ) {
				return array();
			}

			$urls = array();
			if ( preg_match_all( '/<img\b[^>]*\bsrc=["\']([^"\']+)["\']/i', $html, $matches ) ) {
				foreach ( $matches[1] as $src ) {
					$src = esc_url_raw( html_entity_decode( $src, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) );
					if ( '' !== $src && preg_match( '#^https?://#i', $src ) ) {
						$urls[] = $src;
					}
				}
			}

			return array_values( array_unique( $urls ) );
		}

		/**
		 * Strip HTML that Slack cannot reliably render / that breaks webhooks.
		 * Local media image URLs cause Slack to reject the entire payload.
		 *
		 * @param string $html Message HTML.
		 * @return string
		 */
		public static function prepare_message_for_slack( $html ) {
			$html = is_string( $html ) ? $html : '';
			if ( '' === trim( $html ) ) {
				return '';
			}

			// Images: Slack needs a public https URL; local/media URLs fail the webhook.
			$html = preg_replace( '/<img\b[^>]*>/i', '', $html );

			// Underline / alignment are not supported in Slack mrkdwn.
			$html = preg_replace( '/<\/?u\b[^>]*>/i', '', $html );
			$html = preg_replace( '/\s*\bql-align-(?:center|right|justify|left)\b/i', '', $html );
			$html = preg_replace( '/\sclass="\s*"/i', '', $html );

			// Headings → bold paragraphs (Slack has no heading styles).
			$html = preg_replace_callback(
				'/<h([1-6])(\s[^>]*)?>(.*?)<\/h\1>/is',
				static function ( $m ) {
					return '<p><strong>' . $m[3] . '</strong></p>';
				},
				$html
			);

			return $html;
		}

		/**
		 * Convert Quill HTML to Slack mrkdwn (best-effort).
		 *
		 * @param string $html Sanitized HTML.
		 * @return string
		 */
		public static function html_to_slack_mrkdwn( $html ) {
			$html = trim( (string) $html );
			if ( '' === $html ) {
				return '';
			}

			if ( ! class_exists( 'DOMDocument' ) ) {
				return trim( wp_strip_all_tags( $html ) );
			}

			$previous = libxml_use_internal_errors( true );
			$doc      = new DOMDocument();
			$wrapped  = '<?xml encoding="utf-8" ?><div id="afm-root">' . $html . '</div>';
			$doc->loadHTML( $wrapped, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );
			libxml_clear_errors();
			libxml_use_internal_errors( $previous );

			$root = $doc->getElementsByTagName( 'div' )->item( 0 );
			if ( ! $root ) {
				return trim( wp_strip_all_tags( $html ) );
			}

			$text = '';
			$child = $root->firstChild;
			while ( $child ) {
				$text .= self::dom_node_to_slack_mrkdwn( $child );
				$child  = $child->nextSibling;
			}
			$text = preg_replace( "/\n{3,}/", "\n\n", $text );

			return trim( $text );
		}

		/**
		 * Walk a DOM node and build Slack mrkdwn.
		 *
		 * @param DOMNode $node Node.
		 * @return string
		 */
		private static function dom_node_to_slack_mrkdwn( $node ) {
			if ( XML_TEXT_NODE === $node->nodeType ) {
				return html_entity_decode( $node->textContent, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
			}

			if ( XML_ELEMENT_NODE !== $node->nodeType ) {
				return '';
			}

			$tag     = strtolower( $node->nodeName );
			$inner   = '';
			$child   = $node->firstChild;
			while ( $child ) {
				$inner .= self::dom_node_to_slack_mrkdwn( $child );
				$child  = $child->nextSibling;
			}

			switch ( $tag ) {
				case 'strong':
				case 'b':
					return '*' . trim( $inner ) . '*';
				case 'em':
				case 'i':
					return '_' . trim( $inner ) . '_';
				case 's':
				case 'strike':
				case 'del':
					return '~' . trim( $inner ) . '~';
				case 'u':
					// Slack mrkdwn has no underline — keep emphasis via italic.
					return '_' . trim( $inner ) . '_';
				case 'a':
					$href = $node instanceof DOMElement ? trim( $node->getAttribute( 'href' ) ) : '';
					$label = trim( $inner );
					if ( '' === $href ) {
						return $label;
					}
					if ( '' === $label || $label === $href ) {
						return $href;
					}
					return '<' . $href . '|' . $label . '>';
				case 'img':
					$src = $node instanceof DOMElement ? trim( $node->getAttribute( 'src' ) ) : '';
					$alt = $node instanceof DOMElement ? trim( $node->getAttribute( 'alt' ) ) : '';
					if ( '' === $src ) {
						return '';
					}
					$label = '' !== $alt ? $alt : 'Image';
					return '<' . $src . '|' . $label . ">\n";
				case 'br':
					return "\n";
				case 'p':
				case 'div':
					return trim( $inner ) . "\n\n";
				case 'h1':
				case 'h2':
				case 'h3':
				case 'h4':
					return '*' . trim( $inner ) . "*\n\n";
				case 'li':
					return trim( $inner ) . "\n";
				case 'ul':
					$out  = '';
					$child = $node->firstChild;
					while ( $child ) {
						if ( XML_ELEMENT_NODE === $child->nodeType && 'li' === strtolower( $child->nodeName ) ) {
							$li_inner = '';
							$li_child = $child->firstChild;
							while ( $li_child ) {
								$li_inner .= self::dom_node_to_slack_mrkdwn( $li_child );
								$li_child  = $li_child->nextSibling;
							}
							$out .= '• ' . trim( $li_inner ) . "\n";
						} else {
							$out .= self::dom_node_to_slack_mrkdwn( $child );
						}
						$child = $child->nextSibling;
					}
					return $out . "\n";
				case 'ol':
					$n     = 1;
					$out   = '';
					$child = $node->firstChild;
					while ( $child ) {
						if ( XML_ELEMENT_NODE === $child->nodeType && 'li' === strtolower( $child->nodeName ) ) {
							$li_inner = '';
							$li_child = $child->firstChild;
							while ( $li_child ) {
								$li_inner .= self::dom_node_to_slack_mrkdwn( $li_child );
								$li_child  = $li_child->nextSibling;
							}
							$out .= $n . '. ' . trim( $li_inner ) . "\n";
							++$n;
						} else {
							$out .= self::dom_node_to_slack_mrkdwn( $child );
						}
						$child = $child->nextSibling;
					}
					return $out . "\n";
				default:
					return $inner;
			}
		}
	}

endif;
