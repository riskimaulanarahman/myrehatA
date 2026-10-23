<?php
/* Template Name: Trails Test Page */
get_header();

// Contact destinations are not configured yet; supply the final URLs via these filters.
// Until a URL is set, the button is shown as a non-link label.
$contact_links = array(
  'whatsapp' => array( 'WhatsApp', apply_filters( 'myrehat_test_whatsapp_url', '' ) ),
  'line'     => array( 'LINE', apply_filters( 'myrehat_test_line_url', '' ) ),
);
?>
<nav class="trails-contact-bar" aria-label="Contact">
  <?php foreach ( $contact_links as $key => list( $label, $url ) ) : ?>
    <?php myrehat_test_external_link( $label, $url, 'trails-contact-btn trails-contact-' . $key ); ?>
  <?php endforeach; ?>
</nav>

<?php if ( myrehat_test_hero_from_elementor() ) : ?>
  <?php
  // The hero is the page content built with Elementor.
  while ( have_posts() ) :
    the_post();
    the_content();
  endwhile;
  ?>
<?php else : ?>
<header class="site-header-trails">
  <h1>Tropic Hiking Trails</h1>
  <p>Find your next trail with MyRehat</p>
  <input id="main-search" type="text" placeholder="Search homepage...">
</header>
<?php endif; ?>

<div class="trails-promo">
  <strong>Limited offer:</strong> 20% off all guided hikes this month.
</div>

<main class="trails-main">
  <div class="trails-search-row">
    <input id="search-box" type="text" placeholder="Search trails...">
    <select id="category">
      <option value="all">All categories</option>
      <option value="mountain">Mountain</option>
      <option value="beach">Beach</option>
      <option value="forest">Forest</option>
    </select>
  </div>
  <p id="trails-no-results" hidden>No trails found.</p>

  <div class="trails-cards">
    <article class="trail-card" data-category="mountain">
      <h3>Mount Rinjani Sunrise</h3>
      <p>2-day guided summit trek, Lombok.</p>
      <span class="price">RM 350 / pax</span>
    </article>
    <article class="trail-card" data-category="beach">
      <h3>Pulau Perhentian Coastal Walk</h3>
      <p>Easy coastal trail, Terengganu.</p>
      <span class="price">RM 120 / pax</span>
    </article>
    <article class="trail-card" data-category="forest">
      <h3>Taman Negara Canopy Trail</h3>
      <p>Rainforest walk, Pahang.</p>
      <span class="price">RM 180 / pax</span>
    </article>
    <article class="trail-card" data-category="mountain">
      <h3>Mount Kinabalu Base Trek</h3>
      <p>Highland trek, Sabah.</p>
      <span class="price">RM 420 / pax</span>
    </article>
    <article class="trail-card" data-category="beach">
      <h3>Langkawi Sunset Ridge</h3>
      <p>Evening ridge walk, Kedah.</p>
      <span class="price">RM 95 / pax</span>
    </article>
    <article class="trail-card" data-category="forest">
      <h3>Belum Mossy Forest</h3>
      <p>Misty forest trail, Perak.</p>
      <span class="price">RM 150 / pax</span>
    </article>
  </div>

  <section class="trails-booking">
    <h2><?php echo esc_html( myrehat_test_booking_title() ); ?></h2>
    <form id="booking-form" method="post">
      <input type="hidden" name="trails_booking" value="1">
      <?php wp_nonce_field( 'myrehat_test_booking', 'trails_booking_nonce' ); ?>
      <label>Name <input type="text" name="booking_name" maxlength="100" required></label>
      <label>Date <input type="date" name="date" required></label>
      <fieldset class="trails-choice">
        <legend>Digital Nomad</legend>
        <?php foreach ( myrehat_test_digital_nomad_options() as $option ) : ?>
          <label><input type="radio" name="digital_nomad" value="<?php echo esc_attr( $option ); ?>" required> <?php echo esc_html( $option ); ?></label>
        <?php endforeach; ?>
      </fieldset>
      <fieldset class="trails-choice">
        <legend>Plan</legend>
        <?php foreach ( myrehat_test_booking_plans() as $plan_key => $plan ) : ?>
          <label><input type="radio" name="plan" value="<?php echo esc_attr( $plan_key ); ?>" data-price="<?php echo esc_attr( $plan['price'] ); ?>" required> <?php echo esc_html( $plan['label'] ); ?></label>
        <?php endforeach; ?>
      </fieldset>
      <label class="trails-consent"><input type="checkbox" name="host_terms" value="1" required>I agree to the Host Terms</label>
      <p id="trails-total">Total: -</p>
      <button type="submit">Request booking</button>
    </form>
    <?php $booking_result = myrehat_test_booking_result(); ?>
    <div id="trails-confirmation" aria-live="polite"<?php echo $booking_result ? ' class="' . ( $booking_result['success'] ? 'is-success' : 'is-error' ) . '"' : ' hidden'; ?>>
      <?php if ( $booking_result ) : ?>
        <p><?php echo esc_html( $booking_result['message'] ); ?></p>
        <?php if ( $booking_result['errors'] ) : ?>
          <ul>
            <?php foreach ( $booking_result['errors'] as $error ) : ?>
              <li><?php echo esc_html( $error ); ?></li>
            <?php endforeach; ?>
          </ul>
        <?php endif; ?>
      <?php endif; ?>
    </div>
  </section>
</main>

<footer class="trails-footer">
  <nav>
    <a href="#">FAQ</a>
    <a href="#">Contact Us</a>
    <a href="#">PDPA</a>
    <a href="#">Privacy Policy</a>
  </nav>
  <nav class="trails-social" aria-label="Social media">
    <?php
    // Social profile URLs are not configured yet; supply them via this filter, keyed by network name.
    $social_urls = apply_filters( 'myrehat_test_social_urls', array() );
    foreach ( array( 'Facebook', 'LinkedIn', 'Instagram', 'TikTok', 'YouTube' ) as $network ) {
      myrehat_test_external_link( $network, isset( $social_urls[ $network ] ) ? $social_urls[ $network ] : '', 'trails-social-link' );
    }
    ?>
  </nav>
  <p>&copy; 2026 MyRehat</p>
</footer>
<?php get_footer(); ?>
