// The listing search and the header search share one query and are kept in sync.
var searchInputs = [document.getElementById('search-box'), document.getElementById('main-search')].filter(Boolean);
var categorySelect = document.getElementById('category');
var cards = document.querySelectorAll('.trail-card');
var emptyMsg = document.getElementById('trails-no-results');

// Searchable text of a card: its visible text (title, location, price) plus its category.
function cardSearchText(card) {
  return (card.textContent + ' ' + (card.dataset.category || '')).toLowerCase();
}

// Single filter for the listing: a card is visible when it matches both the search and the category.
function filterTrails() {
  var q = searchInputs.length ? searchInputs[0].value.trim().toLowerCase() : '';
  var category = categorySelect ? categorySelect.value : 'all';
  var shown = 0;
  cards.forEach(function (card) {
    var matchesSearch = q === '' || cardSearchText(card).includes(q);
    var matchesCategory = category === 'all' || card.dataset.category === category;
    var hit = matchesSearch && matchesCategory;
    card.style.display = hit ? '' : 'none';
    if (hit) shown++;
  });
  if (emptyMsg) emptyMsg.hidden = shown > 0;
}

// Copies the typed query into the other search box (setting .value fires no event), then filters.
function onSearchInput(e) {
  searchInputs.forEach(function (other) {
    if (other !== e.target) other.value = e.target.value;
  });
  filterTrails();
}

if (cards.length) {
  searchInputs.forEach(function (searchInput) {
    searchInput.addEventListener('input', onSearchInput);
  });
  if (categorySelect) categorySelect.addEventListener('change', filterTrails);
}

// Live booking total. Prices come from the server-rendered data-price of each plan;
// the server recalculates the price itself on submit.
var totalEl = document.getElementById('trails-total');
var planInputs = document.querySelectorAll('input[name="plan"]');

function updateTotal() {
  var checked = document.querySelector('input[name="plan"]:checked');
  totalEl.textContent = 'Total: ' + (checked ? 'RM ' + Number(checked.dataset.price).toLocaleString('en-US') : '-');
}

if (totalEl && planInputs.length) {
  planInputs.forEach(function (planInput) {
    planInput.addEventListener('change', updateTotal);
  });
  updateTotal(); // reflect a plan the browser restored (e.g. after back navigation)
}

// Booking submit: sends the form to the server and shows success only when the server confirms it.
var bookingForm = document.getElementById('booking-form');
var confirmationEl = document.getElementById('trails-confirmation');

function showBookingResult(isSuccess, message, details) {
  confirmationEl.className = isSuccess ? 'is-success' : 'is-error';
  confirmationEl.textContent = '';
  var text = document.createElement('p');
  text.textContent = message;
  confirmationEl.appendChild(text);
  if (details && details.length) {
    var list = document.createElement('ul');
    details.forEach(function (detail) {
      var item = document.createElement('li');
      item.textContent = detail;
      list.appendChild(item);
    });
    confirmationEl.appendChild(list);
  }
  confirmationEl.hidden = false;
}

if (bookingForm && confirmationEl) {
  bookingForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var button = bookingForm.querySelector('[type="submit"]');
    if (button.disabled) return; // a request is already in flight
    button.disabled = true;
    confirmationEl.hidden = true;

    var data = new FormData(bookingForm);
    data.append('ajax', '1');

    fetch(bookingForm.action, { method: 'POST', body: data, credentials: 'same-origin' })
      .then(function (response) {
        return response.json().catch(function () { return null; }).then(function (json) {
          if (response.ok && json && json.success === true) {
            showBookingResult(true, json.data.message);
            bookingForm.reset();
            if (totalEl && planInputs.length) updateTotal();
          } else {
            var error = json && json.success === false && json.data ? json.data : {};
            showBookingResult(false, error.message || 'Your booking could not be sent. Please try again.', error.errors);
          }
        });
      })
      .catch(function () {
        showBookingResult(false, 'Could not reach the server. Please check your connection and try again.');
      })
      .then(function () {
        button.disabled = false;
      });
  });
}
