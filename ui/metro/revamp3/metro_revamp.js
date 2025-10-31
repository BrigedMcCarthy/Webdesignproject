// metro_revamp.js (revamp3)
// Implements insertion-based drag-and-drop and localStorage persistence per group-grid
(function () {
  function qs(selector, root) { return (root || document).querySelector(selector); }
  function qsa(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  // initialize grids
  var grids = qsa('.group-grid');

  // capture default order (initial HTML order) for each grid — used for DOM-only reset
  var defaultOrders = {};
  grids.forEach(function (g) {
    var id = g.id || ('grid_' + Math.random().toString(36).slice(2,8));
    defaultOrders[id] = qsa('.tile', g).map(function(t){ return t.getAttribute('data-id'); });
  });

  grids.forEach(function (grid) {
    var gridId = grid.id || 'default';
    var key = 'revamp3_order_' + gridId;

    // restore order if present
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(key)); } catch (e) { saved = null; }
    if (saved && saved.length) {
      // map data-id to elements
      var map = {};
      qsa('.tile', grid).forEach(function (t) { map[t.getAttribute('data-id')] = t; });
      saved.forEach(function (id) {
        var el = map[id];
        if (el) grid.appendChild(el);
      });
    }

    var dragEl = null;
    var placeholder = document.createElement('div');
    placeholder.className = 'tile placeholder';
    placeholder.style.minHeight = '0';

    function saveOrder() {
      try {
        var ids = qsa('.tile', grid).map(function (t) { return t.getAttribute('data-id'); });
        localStorage.setItem(key, JSON.stringify(ids));
      } catch (e) { /* ignore */ }
    }

    grid.addEventListener('dragstart', function (e) {
      var t = e.target.closest('.tile');
      if (!t) return;
      dragEl = t;
      t.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', t.getAttribute('data-id')); } catch (err) {}
    }, false);

    grid.addEventListener('dragover', function (e) {
      e.preventDefault();
      var target = e.target.closest('.tile');
      if (!target || target === dragEl) {
        // if over empty area, ensure placeholder at end
        if (!grid.contains(placeholder)) grid.appendChild(placeholder);
        return;
      }
      // insert placeholder before or after based on pointer
      var rect = target.getBoundingClientRect();
      var after = (e.clientX > rect.left + rect.width/2);
      if (grid.contains(placeholder)) grid.removeChild(placeholder);
      if (after) target.parentNode.insertBefore(placeholder, target.nextSibling);
      else target.parentNode.insertBefore(placeholder, target);
    }, false);

    grid.addEventListener('drop', function (e) {
      e.preventDefault();
      if (!dragEl) return;
      // insert dragged element where placeholder is
      if (grid.contains(placeholder)) grid.insertBefore(dragEl, placeholder);
      else grid.appendChild(dragEl);
      dragEl.classList.remove('dragging');
      if (grid.contains(placeholder)) grid.removeChild(placeholder);
      dragEl = null;
      saveOrder();
    }, false);

    grid.addEventListener('dragend', function (e) {
      if (dragEl) dragEl.classList.remove('dragging');
      if (grid.contains(placeholder)) grid.removeChild(placeholder);
      dragEl = null;
    }, false);

    // touch: simple tap-hold then move using pointer events fallback
    var touchInfo = { el: null, startX: 0, startY: 0, moved:false };
    grid.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      var t = e.target.closest('.tile');
      if (!t) return;
      touchInfo.el = t;
      touchInfo.startX = e.touches[0].clientX; touchInfo.startY = e.touches[0].clientY; touchInfo.moved = false;
      // mark as potential drag (visual only)
      t.classList.add('dragging');
    }, false);
    grid.addEventListener('touchmove', function (e) {
      if (!touchInfo.el) return;
      touchInfo.moved = true;
      var touch = e.touches[0];
      var el = document.elementFromPoint(touch.clientX, touch.clientY);
      var target = el && el.closest ? el.closest('.tile') : null;
      if (!target || target === touchInfo.el) {
        if (!grid.contains(placeholder)) grid.appendChild(placeholder);
        return;
      }
      var rect = target.getBoundingClientRect();
      var after = (touch.clientX > rect.left + rect.width/2);
      if (grid.contains(placeholder)) grid.removeChild(placeholder);
      if (after) target.parentNode.insertBefore(placeholder, target.nextSibling);
      else target.parentNode.insertBefore(placeholder, target);
    }, false);
    grid.addEventListener('touchend', function (e) {
      if (!touchInfo.el) return;
      if (grid.contains(placeholder)) grid.insertBefore(touchInfo.el, placeholder);
      touchInfo.el.classList.remove('dragging');
      if (grid.contains(placeholder)) grid.removeChild(placeholder);
      touchInfo.el = null; touchInfo.moved = false;
      saveOrder();
    }, false);
  });

  // expose captured defaults for external handlers
  window.revamp3DefaultOrders = defaultOrders;

})();

// Reset layout handler: clears saved orders and reloads to restore default HTML order
(function(){
  var btn = document.getElementById('resetLayout');
  if (!btn) return;
  btn.addEventListener('click', function(){
    try {
      var prefix = 'revamp3_order_';
      var keys = Object.keys(localStorage).filter(function(k){ return k.indexOf(prefix) === 0; });
      keys.forEach(function(k){ localStorage.removeItem(k); });
    } catch(e) { /* ignore */ }

    // Rebuild each grid using the captured default order (DOM-only, no reload)
    try {
      var defaults = window.revamp3DefaultOrders || {};
      var grids = document.querySelectorAll('.group-grid');
      grids.forEach(function(g){
        var id = g.id || ('grid_' + Math.random().toString(36).slice(2,8));
        var order = defaults[id];
        if (!order || !order.length) return;
        var map = {};
        Array.prototype.slice.call(g.querySelectorAll('.tile')).forEach(function(t){ map[t.getAttribute('data-id')] = t; });
        order.forEach(function(did){ var el = map[did]; if (el) g.appendChild(el); });
      });
    } catch (err) { /* ignore */ }

    // after rebuilding, trigger fit recalculation
    if (window.revamp3AdjustTilesToFit) window.revamp3AdjustTilesToFit();
  }, false);
})();

/*
  Deterministic fit-to-viewport helper
  Computes a scale factor from available viewport height and current document height,
  then applies the scale to --tile-size and --gap in one pass. Falls back to min sizes.
*/
(function(){
  var root = document.documentElement;

  function getPx(varName, fallback){
    var v = getComputedStyle(root).getPropertyValue(varName).trim();
    if (!v) return fallback;
    if (v.endsWith('px')) return parseFloat(v);
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  function fitsInViewport(){
    return document.documentElement.scrollHeight <= window.innerHeight + 1;
  }

  function adjustToFitDeterministic(){
    var minTile = 56; // px minimum tile size (smaller to allow compact screens)
    var minGap = 6; // px minimum gap

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var header = document.querySelector('.start-header');
    var footer = document.querySelector('.start-footer');
    var main = document.querySelector('.start-main');
    var headerH = header ? header.getBoundingClientRect().height : 0;
    var footerH = footer ? footer.getBoundingClientRect().height : 0;
    var mainStyle = main ? getComputedStyle(main) : null;
    var mainPadLR = 0;
    if (mainStyle) mainPadLR = parseFloat(mainStyle.paddingLeft || 0) + parseFloat(mainStyle.paddingRight || 0);

    // determine rows per grid and sum them to compute vertical space required
    var columns = 4;
    var grids = document.querySelectorAll('.group-grid');
    var totalRows = 0;
    var totalGroupMargins = 0;
    Array.prototype.forEach.call(grids, function(g){
      var tiles = g.querySelectorAll('.tile');
      var maxRowInGrid = 0;
      Array.prototype.forEach.call(tiles, function(t){
        var cs = getComputedStyle(t);
        var rStart = parseInt(cs.gridRowStart, 10);
        var rEnd = parseInt(cs.gridRowEnd, 10);
        var endRow = 0;
        if (!isNaN(rEnd)) {
          endRow = rEnd - 1;
        } else if (!isNaN(rStart)) {
          var s = t.getAttribute('style') || '';
          var m = s.match(/grid-row\s*:\s*(\d+)\s*\/\s*span\s*(\d+)/i);
          if (m) endRow = parseInt(m[1],10) + parseInt(m[2],10) - 1;
          else endRow = rStart;
        }
        if (endRow > maxRowInGrid) maxRowInGrid = endRow;
      });
      if (maxRowInGrid < 1) maxRowInGrid = 1;
      totalRows += maxRowInGrid;
      // accumulate group margins (vertical spacing between groups)
      var gs = getComputedStyle(g);
      var mb = parseFloat(gs.marginBottom) || 0;
      totalGroupMargins += mb;
    });

    var availableWidth = Math.max(200, vw - mainPadLR - 2 * 20);
    var availableHeight = Math.max(200, vh - headerH - footerH - 2 * 12 - totalGroupMargins);

    var gap = getPx('--gap', 18);
    var tileFromWidth = Math.floor((availableWidth - (columns - 1) * gap) / columns);
    var tileFromHeight = Math.floor((availableHeight - Math.max(0, (totalRows - 1)) * gap) / totalRows);
    var tileSize = Math.min(tileFromWidth, tileFromHeight);
    tileSize = Math.max(minTile, tileSize);

    var baseTile = getPx('--tile-size', 140);
    var newGap = Math.max(minGap, Math.round(gap * (tileSize / baseTile)));

    root.style.setProperty('--tile-size', tileSize + 'px');
    root.style.setProperty('--gap', newGap + 'px');

    if (!fitsInViewport()){
      var fs = parseFloat(getComputedStyle(document.body).fontSize) || 16;
      document.body.style.fontSize = Math.max(11, Math.round(fs * 0.92)) + 'px';
    }
  }

  var tid;
  function scheduleAdjust(){ clearTimeout(tid); tid = setTimeout(adjustToFitDeterministic, 80); }

  window.addEventListener('resize', scheduleAdjust);
  window.addEventListener('orientationchange', function(){ setTimeout(adjustToFitDeterministic, 140); });
  window.addEventListener('load', function(){ setTimeout(adjustToFitDeterministic, 40); });

  window.revamp3AdjustTilesToFit = adjustToFitDeterministic;
})();

// populate footer with user-agent string
(function(){
  function setUA(){
    var uaSpan = document.getElementById('ua');
    if (!uaSpan) return;
    try { uaSpan.textContent = navigator.userAgent || 'unknown'; }
    catch(e){ uaSpan.textContent = 'unknown'; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setUA);
  else setUA();
})();
