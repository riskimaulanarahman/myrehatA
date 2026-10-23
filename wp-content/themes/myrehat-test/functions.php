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

/**
 * Whether the trails page hero comes from Elementor: the page is open in the Elementor editor,
 * or it is built with Elementor and has content. Otherwise page-trails.php shows its default hero.
 * (Opening the editor alone marks a page as built with Elementor, so an empty document is ignored.)
 */
function myrehat_test_hero_from_elementor() {
    if ( ! did_action( 'elementor/loaded' ) ) {
        return false;
    }
    $page_id   = get_queried_object_id();
    $elementor = \Elementor\Plugin::$instance;
    if ( $elementor->preview->is_preview_mode( $page_id ) ) {
        return true;
    }
    $document = $elementor->documents->get( $page_id );
    return $document && $document->is_built_with_elementor() && ! empty( $document->get_elements_data() );
}

// Heading of the booking section, translatable in the theme's text domain.
function myrehat_test_booking_title() {
    return __( 'Book a guided hike', 'myrehat-test' );
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
    if ( '' === $name ) {
        $errors['booking_name'] = __( 'Please enter your name.', 'myrehat-test' );
    } elseif ( mb_strlen( $name ) > 100 ) {
        $errors['booking_name'] = __( 'Your name must be 100 characters or fewer.', 'myrehat-test' );
    } else {
        $booking['name'] = $name;
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
 * Stores a validated booking. Returns true only when the booking is actually stored.
 *
 * set_transient() also returns false when the stored value is unchanged (the same booking
 * submitted twice), so that case is confirmed by reading the value back.
 */
function myrehat_test_save_booking( $booking ) {
    return set_transient( 'trails_last_booking', $booking, HOUR_IN_SECONDS )
        || get_transient( 'trails_last_booking' ) === $booking;
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
        } elseif ( ! myrehat_test_save_booking( $booking ) ) {
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

    // trails.js sends ajax=1; anything else gets the normal (server-rendered) response.
    if ( isset( $_POST['ajax'] ) && '1' === $_POST['ajax'] ) {
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

// Returns $value as a positive integer, or 0 when it is not a whole number above zero (null, '', '42abc', 4.5, true, -5).
function myrehat_test_positive_int( $value ) {
    if ( is_int( $value ) || ( is_string( $value ) && ctype_digit( $value ) ) ) {
        return max( 0, (int) $value );
    }
    return 0;
}

/**
 * Counts a trail view. Fired as do_action( 'myrehat_trail_viewed', $trail_id, $count ).
 *
 * @param int|string $trail_id Trail ID (positive integer).
 * @param int|string $count    Views to add (positive integer, default 1).
 */
add_action( 'myrehat_trail_viewed', 'myrehat_test_count_view', 10, 2 );
function myrehat_test_count_view( $trail_id, $count = 1 ) {
    $trail_id = myrehat_test_positive_int( $trail_id );
    $count    = myrehat_test_positive_int( $count );
    if ( ! $trail_id || ! $count ) {
        return; // Never count under an empty or invalid ID.
    }

    $key = 'trail_views_' . $trail_id;
    $total = (int) get_option( $key, 0 );
    update_option( $key, $total + $count );
}
