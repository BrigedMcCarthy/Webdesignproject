// metro_revamp.js
// Simple HTML5 drag-and-drop swapping for tiles in the revamp2 grid
(function () {
  var dragged = null;
  var grid = document.getElementById('tileGrid');

  if (!grid) return;

  function closestTile(el) {
    while (el && el !== grid) {
      if (el.classList && el.classList.contains('tile')) return el;
      el = el.parentNode;
    }
    return null;
  }

  function swapNodes(a, b) {
    if (!a || !b || a === b) return;
    var aParent = a.parentNode;
    var bParent = b.parentNode;
    var aNext = a.nextSibling === b ? a : a.nextSibling;
    bParent.insertBefore(a, b);
    aParent.insertBefore(b, aNext);
  }

  grid.addEventListener('dragstart', function (e) {
    var t = closestTile(e.target);
    if (!t) return;
    dragged = t;
    t.classList.add('dragging');
    try { e.dataTransfer.setData('text/plain', 'drag'); } catch (err) { /* IE fallback ignore */ }
    e.dataTransfer.effectAllowed = 'move';
  }, false);

  grid.addEventListener('dragover', function (e) {
    e.preventDefault(); // allow drop
    var t = closestTile(e.target);
    // highlight potential drop target
    Array.prototype.forEach.call(grid.querySelectorAll('.tile'), function (el) { el.classList.remove('over'); });
    if (t && t !== dragged) t.classList.add('over');
  }, false);

  grid.addEventListener('dragleave', function (e) {
    var t = closestTile(e.target);
    if (t) t.classList.remove('over');
  }, false);

  grid.addEventListener('drop', function (e) {
    e.preventDefault();
    var t = closestTile(e.target);
    if (!t || !dragged) return;
    // perform swap
    swapNodes(dragged, t);
    // cleanup classes
    Array.prototype.forEach.call(grid.querySelectorAll('.tile'), function (el) { el.classList.remove('over'); el.classList.remove('dragging'); });
    dragged = null;
  }, false);

  grid.addEventListener('dragend', function (e) {
    if (dragged) dragged.classList.remove('dragging');
    Array.prototype.forEach.call(grid.querySelectorAll('.tile'), function (el) { el.classList.remove('over'); });
    dragged = null;
  }, false);

  // Touch fallback: support reordering via long-press + move (basic)
  var touchInfo = { startEl: null, moved: false };
  grid.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    var t = closestTile(e.target);
    touchInfo.startEl = t;
    touchInfo.moved = false;
    if (t) t.classList.add('dragging');
  }, false);

  grid.addEventListener('touchmove', function (e) {
    if (!touchInfo.startEl) return;
    touchInfo.moved = true;
    var touch = e.touches[0];
    var el = document.elementFromPoint(touch.clientX, touch.clientY);
    var over = closestTile(el);
    Array.prototype.forEach.call(grid.querySelectorAll('.tile'), function (el) { el.classList.remove('over'); });
    if (over && over !== touchInfo.startEl) over.classList.add('over');
  }, false);

  grid.addEventListener('touchend', function (e) {
    if (!touchInfo.startEl) return;
    var over = grid.querySelector('.tile.over');
    if (over && touchInfo.moved) {
      swapNodes(touchInfo.startEl, over);
    }
    Array.prototype.forEach.call(grid.querySelectorAll('.tile'), function (el) { el.classList.remove('over'); el.classList.remove('dragging'); });
    touchInfo.startEl = null; touchInfo.moved = false;
  }, false);

})();
