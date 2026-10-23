<?php
/** MyRehat Test child theme — functions.php. Contains 3 planted PHP bugs (Part 2). */

add_action( 'wp_enqueue_scripts', 'myrehat_test_assets' );
function myrehat_test_assets() {
    wp_enqueue_style( 'myrehat-test-style', get_stylesheet_uri(), array(), '1.0.0' );
    wp_enqueue_script(
        'myrehat-test-trails',
        get_stylesheet_directory_uri() . '/trails.js',
        array(),
        '1.0.0',
        true
    );
}

// BUG P1: missing text domain — should be __( 'Book a guided hike', 'myrehat-test' ).
function myrehat_test_booking_title() {
    return __( 'Book a guided hike' );
}

// BUG P2: raw $_POST used, no nonce check, no sanitization.
add_action( 'template_redirect', 'myrehat_test_booking_handler' );
function myrehat_test_booking_handler() {
    if ( isset( $_POST['trails_booking'] ) ) {
        $date = $_POST['date'];
        set_transient( 'trails_last_booking', $date, HOUR_IN_SECONDS );
    }
}

// BUG P3: callback expects 2 args but only 1 accepted — $trail_id is always null.
add_action( 'myrehat_trail_viewed', 'myrehat_test_count_view', 10, 1 );
function myrehat_test_count_view( $trail_id, $count = 1 ) {
    $key = 'trail_views_' . $trail_id;
    $total = (int) get_option( $key, 0 );
    update_option( $key, $total + $count );
}
