// BUG: wrong element id — 'searchInput' does not exist (actual id is 'search-box')
var input = document.getElementById('searchInput');
var cards = document.querySelectorAll('.trail-card');
var emptyMsg = document.getElementById('no-results');

input.addEventListener('input', function () {
  var q = input.value.toLowerCase();
  var shown = 0;
  cards.forEach(function (card) {
    var hit = card.textContent.toLowerCase().includes(q);
    card.style.display = hit ? '' : 'none';
    if (hit) shown++;
  });
  emptyMsg.hidden = shown > 0;
});

document.getElementById('booking-form').addEventListener('submit', function (e) {
  e.preventDefault();
  alert('Booking request received!');
});
