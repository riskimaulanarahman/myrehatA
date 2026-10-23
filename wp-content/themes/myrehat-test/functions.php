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

/**
 * Prints an external link, or a plain label while its URL is not configured yet.
 *
 * @param string $label Visible link text.
 * @param string $url   Destination URL; empty or unsafe URLs render the label only.
 * @param string $class CSS classes for the element.
 */
function myrehat_test_external_link( $label, $url, $class ) {
    $url = esc_url( $url );
    if ( $url ) {
        printf( '<a class="%s" href="%s" target="_blank" rel="noopener">%s</a>', esc_attr( $class ), $url, esc_html( $label ) );
    } else {
        printf( '<span class="%s">%s</span>', esc_attr( $class ), esc_html( $label ) );
    }
}

// WhatsApp contact (082252081212, written in the international format wa.me requires).
add_filter( 'myrehat_test_whatsapp_url', 'myrehat_test_set_whatsapp_url' );
function myrehat_test_set_whatsapp_url() {
    return 'https://wa.me/6282252081212';
}

// Dummy social profile URLs ("task14") until the real accounts are provided.
add_filter( 'myrehat_test_social_urls', 'myrehat_test_set_social_urls' );
function myrehat_test_set_social_urls() {
    return array(
        'Facebook'  => 'https://www.facebook.com/task14',
        'LinkedIn'  => 'https://www.linkedin.com/company/task14',
        'Instagram' => 'https://www.instagram.com/task14',
        'TikTok'    => 'https://www.tiktok.com/@task14',
        'YouTube'   => 'https://www.youtube.com/@task14',
    );
}

/**
 * Booking plans with their flat price in RM (independent of the trail).
 * Monthly = daily rate x 30 days with a 20% discount.
 *
 * @return array plan key => array( 'label' => string, 'price' => int )
 */
function myrehat_test_booking_plans() {
    $daily_rate = 350;
    return array(
        'daily'   => array( 'label' => 'Daily', 'price' => $daily_rate ),
        'monthly' => array( 'label' => 'Monthly', 'price' => (int) round( $daily_rate * 30 * 0.8 ) ),
    );
}

// Allowed answers for the booking form's "Digital Nomad" question.
function myrehat_test_digital_nomad_options() {
    return array( 'Ya', 'Tidak' );
}

/**
 * Validates submitted booking fields against the allowed values.
 *
 * @param array $input Raw request data (e.g. $_POST).
 * @return array { 0: array validated booking fields, 1: array field => error message }
 */
function myrehat_test_validate_booking( $input ) {
    $booking = array();
    $errors  = array();

    // The field is "booking_name", not "name": "name" is a WordPress public query var and would turn the request into a 404.
    $name = isset( $input['booking_name'] ) ? sanitize_text_field( wp_unslash( $input['booking_name'] ) ) : '';
    if ( '' !== $name ) {
        $booking['name'] = $name;
    } else {
        $errors['booking_name'] = __( 'Please enter your name.', 'myrehat-test' );
    }

    $date  = isset( $input['date'] ) ? sanitize_text_field( wp_unslash( $input['date'] ) ) : '';
    $parts = explode( '-', $date );
    if ( preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) && checkdate( (int) $parts[1], (int) $parts[2], (int) $parts[0] ) ) {
        $booking['date'] = $date;
    } else {
        $errors['date'] = __( 'Please choose a valid date.', 'myrehat-test' );
    }

    $digital_nomad = isset( $input['digital_nomad'] ) ? sanitize_text_field( wp_unslash( $input['digital_nomad'] ) ) : '';
    if ( in_array( $digital_nomad, myrehat_test_digital_nomad_options(), true ) ) {
        $booking['digital_nomad'] = $digital_nomad;
    } else {
        $errors['digital_nomad'] = __( 'Please choose Ya or Tidak for Digital Nomad.', 'myrehat-test' );
    }

    // The price is always derived from the plan on the server; any price sent by the browser is ignored.
    $plans = myrehat_test_booking_plans();
    $plan  = isset( $input['plan'] ) ? sanitize_key( wp_unslash( $input['plan'] ) ) : '';
    if ( isset( $plans[ $plan ] ) ) {
        $booking['plan']  = $plan;
        $booking['price'] = $plans[ $plan ]['price'];
    } else {
        $errors['plan'] = __( 'Please choose a Daily or Monthly plan.', 'myrehat-test' );
    }

    // An unchecked checkbox is not submitted at all; only the checkbox's own value counts as consent.
    if ( isset( $input['host_terms'] ) && '1' === $input['host_terms'] ) {
        $booking['host_terms'] = true;
    } else {
        $errors['host_terms'] = __( 'You must agree to the Host Terms to request a booking.', 'myrehat-test' );
    }

    return array( $booking, $errors );
}

/**
 * Handles booking form submissions (nonce check, validation, save).
 *
 * AJAX submissions (ajax=1) get a JSON response; success is only reported once the booking is saved.
 * Without JavaScript the result is kept for the page to render (see myrehat_test_booking_result()).
 */
add_action( 'template_redirect', 'myrehat_test_booking_handler' );
function myrehat_test_booking_handler() {
    if ( ! isset( $_POST['trails_booking'] ) ) {
        return;
    }

    $nonce   = isset( $_POST['trails_booking_nonce'] ) ? sanitize_text_field( wp_unslash( $_POST['trails_booking_nonce'] ) ) : '';
    $errors  = array();
    $success = false;
    if ( ! wp_verify_nonce( $nonce, 'myrehat_test_booking' ) ) {
        $message = __( 'Your session has expired. Please reload the page and try again.', 'myrehat-test' );
    } else {
        list( $booking, $errors ) = myrehat_test_validate_booking( $_POST );
        if ( $errors ) {
            $message = __( 'Your booking was not sent. Please fix the following:', 'myrehat-test' );
        } elseif ( ! set_transient( 'trails_last_booking', $booking, HOUR_IN_SECONDS ) ) {
            $message = __( 'We could not save your booking. Please try again.', 'myrehat-test' );
        } else {
            $plans   = myrehat_test_booking_plans();
            $message = sprintf(
                /* translators: 1: customer name, 2: plan label, 3: booking date, 4: total price */
                __( 'Thank you, %1$s! Your booking has been received: %2$s plan from %3$s. Total: RM %4$s.', 'myrehat-test' ),
                $booking['name'],
                $plans[ $booking['plan'] ]['label'],
                $booking['date'],
                number_format_i18n( $booking['price'] )
            );
            $success = true;
        }
    }
    $result = array( 'success' => $success, 'message' => $message, 'errors' => array_values( $errors ) );

    if ( ! empty( $_POST['ajax'] ) ) {
        if ( $result['success'] ) {
            wp_send_json_success( array( 'message' => $result['message'] ), 200 );
        }
        wp_send_json_error( array( 'message' => $result['message'], 'errors' => $result['errors'] ), 400 );
    }

    $GLOBALS['myrehat_test_booking_result'] = $result;
}

// Result of a booking submitted without JavaScript in this request, or null.
function myrehat_test_booking_result() {
    return isset( $GLOBALS['myrehat_test_booking_result'] ) ? $GLOBALS['myrehat_test_booking_result'] : null;
}

// BUG P3: callback expects 2 args but only 1 accepted — $trail_id is always null.
add_action( 'myrehat_trail_viewed', 'myrehat_test_count_view', 10, 1 );
function myrehat_test_count_view( $trail_id, $count = 1 ) {
    $key = 'trail_views_' . $trail_id;
    $total = (int) get_option( $key, 0 );
    update_option( $key, $total + $count );
}
