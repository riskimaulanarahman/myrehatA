<?php
/**
  Plugin Name: File Manager Advanced
  Plugin URI: https://wordpress.org/plugins/file-manager-advanced
  Description: Cpanel for files management in wordpress
  Author: wpexpertsio
  Version: 6.0.0
  Author URI: https://wpexperts.io
  License: GPLv2
**/

if ( ! defined( 'FMA_PLUGIN_FILE' ) ) {
	define( 'FMA_PLUGIN_FILE', __FILE__ );
}

/**
 * Integrate Freemius SDK
 *
 * @package Advance File Manager
 */

if ( ! function_exists( 'fma_fs' ) ) {
    // Create a helper function for easy SDK access.
    function fma_fs() {
        global $fma_fs;

        if ( ! isset( $fma_fs ) ) {
            // Include Freemius SDK.
            require_once dirname( __FILE__ ) . '/vendor/freemius/start.php';

            $fma_fs = fs_dynamic_init( array(
                'id'                  => '22156',
                'slug'                => 'file-manager-advanced',
                'premium_slug'        => 'advanced-file-manager-pro',
                'type'                => 'plugin',
                'public_key'          => 'pk_0fd5cbcb84f5aa475cb00b852ceaf',
                'is_premium'          => false,
                'has_addons'          => false,
                'has_paid_plans'      => false,
                'menu'                => array(
                    'slug'           => 'file_manager_advanced_ui',
                    'first-path'     => 'admin.php?page=file_manager_advanced_ui',
                    'contact'        => false,
                    'support'        => false,
                    'account'        => false,
                ),
            ) );
        }

        return $fma_fs;
    }

	// Init Freemius.
	fma_fs();
	// Signal that SDK was initiated.
	do_action( 'fma_fs_loaded' );
	
	// Hook into Freemius after_uninstall action
	// This hook fires when plugin is uninstalled through Freemius SDK
	add_action( 'fs_after_uninstall_file-manager-advanced', 'fma_freemius_after_uninstall', 10, 0 );
}

/**
 * Loading constants
 */
require_once('constants.php');
require_once FMAFILEPATH . 'application/fma-oauth-legacy-redirect.php';
require_once FMAFILEPATH . 'application/fma-elfinder-helpers.php';
require_once FMAFILEPATH . 'application/class_fma_permissions.php';

function fma_get_installed_pro_version() {
	$pro_main = function_exists( 'fma_get_pro_plugin_main_file' ) ? fma_get_pro_plugin_main_file() : '';
	if ( $pro_main === '' || ! function_exists( 'get_file_data' ) ) {
		return '';
	}
	$data = get_file_data( $pro_main, array( 'Version' => 'Version' ) );
	return ! empty( $data['Version'] ) ? $data['Version'] : '';
}

if ( ! function_exists( 'fma_pro_version_notice' ) ) {
	function fma_pro_version_notice() {
		$dismissed_until = (int) get_user_meta( get_current_user_id(), 'fma_pro_version_notice_dismissed_until', true );
		$pro_version     = fma_get_installed_pro_version();
		if ( ! current_user_can( 'manage_options' ) || $pro_version === '' || version_compare( $pro_version, '4.0.0', '>=' ) || $dismissed_until > time() ) {
			return;
		}

		printf(
			'<div class="notice notice-error is-dismissible fma-pro-version-notice" data-nonce="%1$s"><div class="fma-pro-version-notice__content"><div class="fma-pro-version-notice__message"><p><strong>%2$s</strong> %3$s <strong>%4$s</strong>.</p><span>%5$s</span></div><a class="button button-primary fma-pro-version-notice__action" href="%6$s" target="_blank" rel="noopener noreferrer">%7$s</a></div><style>.fma-pro-version-notice{border-left-width:4px;margin:20px 0;padding:0}.fma-pro-version-notice__content{align-items:center;display:flex;gap:16px;min-height:54px;padding:12px 42px 12px 16px}.fma-pro-version-notice__message{flex:1;min-width:220px}.fma-pro-version-notice__message p{font-size:15px;line-height:1.4;margin:0 0 2px}.fma-pro-version-notice__message span{color:#50575e;font-size:13px;line-height:1.4}.fma-pro-version-notice__action{flex:0 0 auto;margin:0;white-space:nowrap}@media screen and (max-width:600px){.fma-pro-version-notice__content{align-items:flex-start;flex-direction:column;gap:10px;padding-right:42px}.fma-pro-version-notice__action{width:100%%}}</style></div>',
			esc_attr( wp_create_nonce( 'fma_dismiss_pro_version_notice' ) ),
			esc_html__( 'File Manager Advanced 6.0.0', 'file-manager-advanced' ),
			esc_html__( 'requires', 'file-manager-advanced' ),
			esc_html__( 'File Manager Advanced Pro 4.0.0', 'file-manager-advanced' ),
			esc_html__( 'Update the Pro plugin to use the new File Manager experience.', 'file-manager-advanced' ),
			esc_url( 'https://objectsws.atlassian.net/servicedesk/customer/portal/37' ),
			esc_html__( 'Get Pro Plugin', 'file-manager-advanced' )
		);
	}

	function fma_dismiss_pro_version_notice() {
		check_ajax_referer( 'fma_dismiss_pro_version_notice', 'nonce' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( null, 403 );
		}
		update_user_meta( get_current_user_id(), 'fma_pro_version_notice_dismissed_until', time() + ( 15 * MINUTE_IN_SECONDS ) );
		wp_send_json_success();
	}

	function fma_pro_version_notice_dismiss_script() {
		?>
		<script>
		jQuery(document).on('click', '.fma-pro-version-notice .notice-dismiss', function () {
			jQuery.post(ajaxurl, {action: 'fma_dismiss_pro_version_notice', nonce: jQuery(this).closest('.fma-pro-version-notice').data('nonce')});
		});
		</script>
		<?php
	}

	add_action( 'admin_notices', 'fma_pro_version_notice' );
	add_action( 'wp_ajax_fma_dismiss_pro_version_notice', 'fma_dismiss_pro_version_notice' );
	add_action( 'admin_footer', 'fma_pro_version_notice_dismiss_script' );
}

/**
 * Cleanup function - Shared by both uninstall and deactivation hooks
 */
function fma_cleanup_plugin_data() {
	global $wpdb;

	// 1. Delete all WordPress options (direct database query for reliability)
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name = 'fmaoptions'" );
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name = 'fma_hide_review_section'" );
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name = 'fma_blocks_dummy_data_created'" );

	// 2. Delete all fma_blocks custom post type posts and their meta
	// First get all post IDs
	$fma_blocks_ids = $wpdb->get_col( $wpdb->prepare(
		"SELECT ID FROM {$wpdb->posts} WHERE post_type = %s",
		'fma_blocks'
	) );

	if ( ! empty( $fma_blocks_ids ) ) {
		// Delete all post meta for these posts
		$post_ids_placeholders = implode( ',', array_fill( 0, count( $fma_blocks_ids ), '%d' ) );
		$wpdb->query( $wpdb->prepare(
			"DELETE FROM {$wpdb->postmeta} WHERE post_id IN ($post_ids_placeholders)",
			$fma_blocks_ids
		) );
		
		// Delete all posts
		$wpdb->query( $wpdb->prepare(
			"DELETE FROM {$wpdb->posts} WHERE post_type = %s",
			'fma_blocks'
		) );
	}

	// 3. Delete file logs table if it exists (created when pro is active)
	$table_name = $wpdb->prefix . 'fm_filelogs';
	$wpdb->query( "DROP TABLE IF EXISTS {$table_name}" );

	// 4. Clean up any transients
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_fma_%'" );
	$wpdb->query( "DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_fma_%'" );

	// 5. Clean up user meta if any
	$wpdb->query( "DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'fma_%'" );
	$wpdb->query( "DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'afmp_%'" );

	// 6. Clean up site options for multisite
	if ( function_exists( 'is_multisite' ) && is_multisite() ) {
		$wpdb->query( "DELETE FROM {$wpdb->sitemeta} WHERE meta_key LIKE 'fma_%'" );
	}
}

/**
 * Freemius after_uninstall hook callback
 * This hook fires when plugin is uninstalled through Freemius SDK
 * This is the most reliable method as Freemius handles the uninstall process
 */
function fma_freemius_after_uninstall() {
	// Check if user has enabled data deletion on uninstall
	$settings = get_option('fmaoptions', array());
	$delete_data_on_uninstall = isset($settings['fma_delete_data_on_uninstall']) && $settings['fma_delete_data_on_uninstall'] == '1';
	
	// If setting is disabled, don't delete data
	if (!$delete_data_on_uninstall) {
		return;
	}
	
	// Run cleanup when Freemius uninstall hook fires
	fma_cleanup_plugin_data();
}


/*
 * Advanced File Manager
 * Text Domain
 */
add_action('plugins_loaded', 'advanced_file_manager_load_text_domain');
function advanced_file_manager_load_text_domain()
{
    $domain = dirname(plugin_basename(__FILE__));
    $locale = apply_filters('plugin_locale', get_locale(), $domain);
    load_textdomain($domain, trailingslashit(WP_LANG_DIR).'plugins'.'/'.$domain.'-'.$locale.'.mo');
    load_plugin_textdomain($domain, false, basename(dirname(__FILE__)).'/languages/');
}
/**
 * Main application
 */
if(is_admin()) {
	include('application/class_fma_main.php');
	new class_fma_main;
}
/**
 * Shortcode class
 */
include('application/class_fma_shortcode.php');
require_once 'application/class_fma_notification_message.php';
include 'application/rest-api/class-fma-controller.php';
/**
 * Blocks class (for free version)
 */
if ( ! class_exists( 'file_manager_advanced_shortcode' ) ) {
	require_once( 'application/class_fma_blocks.php' );
	// Instantiate the class
	if ( class_exists( 'class_fma_blocks' ) ) {
		new class_fma_blocks();
	}
}


