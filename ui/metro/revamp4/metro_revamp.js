// revamp4 new: Retro file-tree viewer JS
(function(){
  // elements
  var fileTreeEl = document.getElementById('fileTree');
  var refreshBtn = document.getElementById('refreshBtn');
  var autoRefresh = document.getElementById('autoRefresh');
  var buildNumberEl = document.getElementById('buildNumber');
  var lastUpdated = document.getElementById('lastUpdated');
  var searchInput = document.getElementById('searchInput');
  var themeToggleBtn = document.getElementById('themeToggleBtn');
  var previewModal = document.getElementById('previewModal');
  var modalCloseBtn = document.getElementById('modalCloseBtn');
  var previewBody = document.getElementById('previewBody');
  var previewTitle = document.getElementById('previewTitle');
  var previewDownload = document.getElementById('previewDownload');
  var copyPermalinkBtn = document.getElementById('copyPermalinkBtn');
  var polling = null;

  function fmtDate(ts){ if(!ts) return '--'; return new Date(ts).toLocaleString(); }

  // collapsed state persistence key
  var COLLAPSE_KEY = 'revamp4_collapsed';
  function loadCollapsed(){
    try{ var s = localStorage.getItem(COLLAPSE_KEY); return s ? new Set(JSON.parse(s)) : new Set(); }catch(e){ return new Set(); }
  }
  function saveCollapsed(set){
    try{ localStorage.setItem(COLLAPSE_KEY, JSON.stringify(Array.from(set))); }catch(e){}
  }

  // render nested tree with collapsible folders
  // render nested tree with collapsible folders and data attributes used for search/preview
  function renderTree(node){
    var collapsed = loadCollapsed();
    function makeList(n){
      var ul = document.createElement('ul');
      ul.setAttribute('role','group');
      (n.children||[]).forEach(function(ch){
        var li = document.createElement('li'); li.tabIndex = 0; li.setAttribute('role','treeitem');
        // store searchable name and path
        var entryPath = ch.path || ch.name;
        li.dataset.path = entryPath;
        li.dataset.name = (ch.name || '').toLowerCase();
        if (ch.type === 'directory'){
          var header = document.createElement('div'); header.className = 'dir-header';
          var toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'toggle'; toggle.setAttribute('aria-expanded','true');
          toggle.dataset.path = entryPath;
          var isCollapsed = collapsed.has(toggle.dataset.path);
          toggle.textContent = isCollapsed ? '+' : '−';
          toggle.setAttribute('aria-expanded', (!isCollapsed).toString());
          var nameSpan = document.createElement('span'); nameSpan.className = 'folder'; nameSpan.textContent = ch.name + '/';
          nameSpan.tabIndex = -1;
          var meta = document.createElement('span'); meta.className = 'meta'; meta.textContent = '(' + (ch.children?ch.children.length:0) + ')';
          header.appendChild(toggle); header.appendChild(nameSpan); header.appendChild(meta);
          li.appendChild(header);
          var childList = makeList(ch);
          if (isCollapsed) childList.style.display = 'none';
          li.appendChild(childList);
        } else {
          var fileSpan = document.createElement('span'); fileSpan.className = 'file'; fileSpan.textContent = ch.name; fileSpan.tabIndex = -1;
          fileSpan.dataset.path = entryPath;
          var meta = document.createElement('span'); meta.className = 'meta'; meta.textContent = (ch.size? humanSize(ch.size) : '') + ' ' + (ch.mtime? fmtDate(ch.mtime): '');
          var actions = document.createElement('span'); actions.className = 'meta actions';
          var previewBtn = document.createElement('button'); previewBtn.type = 'button'; previewBtn.className = 'preview-btn'; previewBtn.textContent = 'Preview'; previewBtn.dataset.path = entryPath; previewBtn.title = 'Preview file'; previewBtn.setAttribute('aria-label','Preview ' + ch.name);
          var copyBtn = document.createElement('button'); copyBtn.type = 'button'; copyBtn.className = 'copy-link-btn'; copyBtn.textContent = 'Link'; copyBtn.dataset.path = entryPath; copyBtn.title = 'Copy permalink'; copyBtn.setAttribute('aria-label','Copy permalink for ' + ch.name);
          actions.appendChild(previewBtn); actions.appendChild(copyBtn);
          li.appendChild(fileSpan); li.appendChild(meta); li.appendChild(actions);
        }
        ul.appendChild(li);
      });
      return ul;
    }
    return makeList(node || { children: [] });
  }

  function humanSize(n){ if(!n && n!==0) return ''; if(n<1024) return n+' B'; if(n<1024*1024) return Math.round(n/1024)+' KB'; return Math.round(n/(1024*1024))+' MB'; }
  function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function fetchTree(){
    try{
      var res = await fetch('/filetree.json?_=' + Date.now());
      if (!res.ok){
        if (res.status === 404){
          // show a clearer message for missing filetree.json
          fileTreeEl.innerHTML = '<div class="small-note">No <code>/filetree.json</code> was found on the server (HTTP 404).<br>' +
            'Generate it with:<br><code>python3 scripts/generate_filetree.py</code></div>';
          buildNumberEl.textContent = 'Build: (none)';
          lastUpdated.textContent = 'Last updated: --';
          return;
        }
        throw new Error('HTTP ' + res.status);
      }
      var data = await res.json();
      fileTreeEl.innerHTML = '';
      // if top-level node contains children, render them; otherwise show helpful note
      if (data && Array.isArray(data.children)){
        fileTreeEl.appendChild(renderTree(data));
      } else if (data && data.children === undefined && Array.isArray(data)){ 
        // legacy: data itself might be an array of entries
        var wrap = { children: data };
        fileTreeEl.appendChild(renderTree(wrap));
      } else {
        fileTreeEl.innerHTML = '<div class="small-note">No file entries found in filetree.json</div>';
      }
      // display build number if present (incremental integer)
      if (data && typeof data.build !== 'undefined'){
        try{ buildNumberEl.textContent = 'Build: ' + data.build; }catch(e){}
        // use buildTime if provided
        if (data.buildTime && typeof data.buildTime === 'number') lastUpdated.textContent = 'Last updated: ' + fmtDate(data.buildTime);
        else lastUpdated.textContent = 'Last updated: ' + fmtDate(Date.now());
      } else {
        lastUpdated.textContent = 'Last updated: ' + fmtDate(Date.now());
      }
    } catch(e){
      var msg = '<div class="small-note">Error loading <code>/filetree.json</code>: ' + escapeHtml(String(e)) + '</div>' +
        '<div class="small-note">If you don\'t have <code>filetree.json</code>, run the generator:<br><code>python3 scripts/generate_filetree.py</code></div>' +
        '<div class="small-note">See <a href="README.md">revamp4 README</a> for details.</div>';
      fileTreeEl.innerHTML = msg;
      try{ buildNumberEl.textContent = 'Build: (none)'; }catch(e){}
    }
  }

  refreshBtn.addEventListener('click', fetchTree);
  // search filter
  var SEARCH_KEY = 'revamp4_last_query';
  function applyFilter(query){
    query = (query||'').toLowerCase().trim();
    var items = fileTreeEl.querySelectorAll('li');
    items.forEach(function(li){
      if (!query) { li.style.display = ''; return; }
      var name = li.dataset.name || '';
      var path = li.dataset.path || '';
      if (name.indexOf(query) !== -1 || path.indexOf(query) !== -1) li.style.display = '';
      else li.style.display = 'none';
    });
  }
  if (searchInput){
    try{ searchInput.value = localStorage.getItem(SEARCH_KEY) || ''; }catch(e){}
    applyFilter(searchInput.value);
    var filterDebounce = null;
    searchInput.addEventListener('input', function(){ clearTimeout(filterDebounce); filterDebounce = setTimeout(function(){ var q = searchInput.value || ''; applyFilter(q); try{ localStorage.setItem(SEARCH_KEY, q); }catch(e){} }, 180); });
  }
  var resetBuildBtn = document.getElementById('resetBuildBtn');
  var copyResetBtn = document.getElementById('copyResetBtn');
  var expandAllBtn = document.getElementById('expandAllBtn');
  var collapseAllBtn = document.getElementById('collapseAllBtn');
  if (resetBuildBtn){
    resetBuildBtn.addEventListener('click', async function(){
      try{
        var res = await fetch('/filetree.json?_=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json();
        // set build to 1 and update buildTime
        data.build = 1;
        data.buildTime = Date.now();
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = 'filetree.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      } catch(e){
        alert('Failed to fetch filetree.json: ' + String(e) + '\n\nYou can reset build by running the generator on the server with a --reset option (not available) or by running the Python generator and replacing filetree.json manually.');
      }
    }, false);
  }
  // copy reset JSON to clipboard (and fallback to download)
  if (copyResetBtn){
    copyResetBtn.addEventListener('click', async function(){
      try{
        var res = await fetch('/filetree.json?_=' + Date.now());
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var data = await res.json(); data.build = 1; data.buildTime = Date.now();
        var txt = JSON.stringify(data, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText){
          await navigator.clipboard.writeText(txt);
          alert('Reset JSON copied to clipboard. Paste to server filetree.json to apply.');
        } else {
          // fallback to download
          var blob = new Blob([txt], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a'); a.href = url; a.download = 'filetree.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        }
      } catch(e){ alert('Failed to prepare reset JSON: ' + String(e)); }
    }, false);
  }

  // hit counter (client-side, increments per browser)
  function updateHitCounter(){
    try{
      var key = 'revamp4_hits';
      var n = parseInt(localStorage.getItem(key) || '0', 10) || 0;
      n += 1;
      localStorage.setItem(key, String(n));
      var el = document.getElementById('hitCounter');
      if (el) el.textContent = 'Hits: ' + String(n).padStart(3, '0');
    }catch(e){}
  }
  updateHitCounter();

  // guestbook: simple client-side guestbook stored in localStorage
  // guestbook: client + server-aware with moderation controls
  async function loadGuestbook(){
    // try server guestbook first
    try{
      var res = await fetch('/guestbook.json?_=' + Date.now());
      if (res.ok){ var arr = await res.json(); if (Array.isArray(arr)) return arr.map(function(e){ e._server = true; return e; }); }
    } catch(e){}
    try{ var stored = JSON.parse(localStorage.getItem('revamp4_guestbook') || '[]'); return Array.isArray(stored) ? stored.map(function(e){ e._server = false; return e; }) : []; }catch(e){ return []; }
  }
  function saveGuestbook(arr){ try{ localStorage.setItem('revamp4_guestbook', JSON.stringify(arr)); }catch(e){} }
  async function renderGuestbook(){
    var container = document.getElementById('guestbookEntries');
    if (!container) return;
    var entries = await loadGuestbook();
    if (!entries.length) { container.innerHTML = '<div class="small-note">No guestbook entries yet. Be the first!</div>'; return; }
    container.innerHTML = '';
    // show newest first
    entries.slice().reverse().forEach(function(en, idx){
      var d = document.createElement('div'); d.className = 'entry';
      var who = document.createElement('span'); who.className = 'who'; who.textContent = en.name || 'Guest';
      var when = document.createElement('span'); when.className = 'when'; when.textContent = ' ' + (new Date(en.t || Date.now())).toLocaleString();
      var msg = document.createElement('div'); msg.className = 'msg'; msg.textContent = en.msg || '';
      // controls and sync badge
      var controls = document.createElement('div'); controls.className = 'controls';
      var del = document.createElement('button'); del.textContent = 'Delete'; del.title = 'Remove this entry';
      del.addEventListener('click', function(){ if (confirm('Delete this entry?')) deleteGuestbookEntry(en.t); });
      controls.appendChild(del);
      var badge = document.createElement('span'); badge.className = 'sync-badge ' + (en._server ? 'server' : 'local'); badge.textContent = en._server ? 'server' : 'local';
      d.appendChild(who); d.appendChild(when); d.appendChild(badge); d.appendChild(document.createElement('br')); d.appendChild(msg); d.appendChild(controls);
      container.appendChild(d);
    });
  }
  renderGuestbook();

  var guestbookLink = document.getElementById('guestbookLink');
  if (guestbookLink){
    guestbookLink.addEventListener('click', function(e){
      e.preventDefault();
      var name = prompt('Your name (optional):','Guest');
      if (name === null) return;
      var msg = prompt('Leave a short message:','Nice site!');
      if (msg === null) return;
      // try POSTing to server endpoint; fall back to localStorage
      (async function(){
        try{
          var p = await fetch('/guestbook', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name: name, msg: msg }) });
          if (p.ok){ await renderGuestbook(); alert('Thanks — your message was published to the server guestbook.'); return; }
        }catch(e){}
        var arr = JSON.parse(localStorage.getItem('revamp4_guestbook') || '[]'); arr.push({ name: name, msg: msg, t: Date.now(), _server: false }); saveGuestbook(arr); renderGuestbook();
        alert('Saved locally (server publish failed).');
      })();
    }, false);
  }

  // delete an entry (by timestamp). Attempts to sync to server by uploading the new guestbook array.
  async function deleteGuestbookEntry(t){
    try{
      var arr = await loadGuestbook();
      var filtered = (arr||[]).filter(function(e){ return e.t !== t; });
      // try to upload to server overwrite endpoint
      try{
        var up = await fetch('/guestbook/upload', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(filtered) });
        if (up.ok){
          // success - re-render from server
          await renderGuestbook();
          alert('Deleted on server.');
          return;
        }
      }catch(e){}
      // fallback: save locally and re-render
      saveGuestbook(filtered);
      await renderGuestbook();
      alert('Deleted locally. (Server sync failed)');
    }catch(e){ console.error(e); alert('Failed to delete entry: '+String(e)); }
  }

  function startPolling(){ if(polling) clearInterval(polling); polling = setInterval(function(){ if(autoRefresh.checked) fetchTree(); }, 2500); }

  // start
  // handle toggle clicks (event delegation)
  fileTreeEl.addEventListener('click', function(e){
    var btn = e.target.closest('.toggle');
    if (btn){
      var path = btn.dataset.path;
      var collapsed = loadCollapsed();
      var parentLi = btn.closest('li');
      var childUl = parentLi && parentLi.querySelector('ul');
      if (!childUl) return;
      // animate via maxHeight if available
      if (collapsed.has(path)){
        collapsed.delete(path);
        childUl.style.display = '';
        childUl.style.maxHeight = childUl.scrollHeight + 'px';
        btn.textContent = '−';
        btn.setAttribute('aria-expanded','true');
        setTimeout(function(){ childUl.style.maxHeight = ''; }, 260);
      } else {
        collapsed.add(path);
        childUl.style.maxHeight = childUl.scrollHeight + 'px';
        // trigger transition
        requestAnimationFrame(function(){ childUl.style.maxHeight = '0px'; });
        setTimeout(function(){ childUl.style.display = 'none'; childUl.style.maxHeight = ''; }, 260);
        btn.textContent = '+';
        btn.setAttribute('aria-expanded','false');
      }
      saveCollapsed(collapsed);
      return;
    }
    // preview button
    var pbtn = e.target.closest('.preview-btn');
    if (pbtn){
      var url = pbtn.dataset.path;
      openPreview(url);
      return;
    }
    // copy permalink button
    var cbtn = e.target.closest('.copy-link-btn');
    if (cbtn){ copyPermalink(cbtn.dataset.path); return; }
    // fallthrough: ignore other clicks
    return;
  }, false);

  fetchTree(); startPolling();

  // expand/collapse all helpers
  if (expandAllBtn){
    expandAllBtn.addEventListener('click', function(){
      // clear collapsed set and re-render
      saveCollapsed(new Set());
      fetchTree();
    }, false);
  }
  if (collapseAllBtn){
    collapseAllBtn.addEventListener('click', function(){
      // gather all toggle paths, store as collapsed
      var toggles = Array.prototype.slice.call(document.querySelectorAll('.file-tree .toggle'));
      var s = new Set();
      toggles.forEach(function(t){ if (t.dataset && t.dataset.path) s.add(t.dataset.path); });
      saveCollapsed(s);
      // hide all children
      toggles.forEach(function(t){ var li = t.closest('li'); var ul = li && li.querySelector('ul'); if (ul) ul.style.display='none'; t.textContent = '+'; t.setAttribute('aria-expanded','false'); });
    }, false);
  }

  // Theme toggle
  var THEME_KEY = 'revamp4_theme';
  function setTheme(name){
    try{ localStorage.setItem(THEME_KEY, name); }catch(e){}
    if (name === 'modern') document.body.classList.add('modern'), document.querySelector('.page-wrap') && document.querySelector('.page-wrap').classList.add('modern');
    else document.body.classList.remove('modern'), document.querySelector('.page-wrap') && document.querySelector('.page-wrap').classList.remove('modern');
  }
  if (themeToggleBtn){
    var cur = null; try{ cur = localStorage.getItem(THEME_KEY) || 'retro'; }catch(e){ cur = 'retro'; }
    setTheme(cur);
    themeToggleBtn.addEventListener('click', function(){ setTheme(document.body.classList.contains('modern') ? 'retro' : 'modern'); });
  }

  // Preview modal helpers
  function openPreview(path){
    if (!previewModal) return;
    // save last focused element for restoration
    try{ lastFocusedElement = document.activeElement; }catch(e){ lastFocusedElement = null; }
    previewModal.setAttribute('aria-hidden','false');
    previewTitle.textContent = path;
    previewBody.innerHTML = 'Loading…';
    // normalize to site-root absolute path so previews resolve correctly from this page
    var src = (path && path.charAt(0) === '/') ? path : '/' + path;
    previewDownload.href = src; previewDownload.setAttribute('download','');
    copyPermalinkBtn.dataset.path = src;
    // naive type guessing by extension
    var ext = (path.split('.').pop() || '').toLowerCase();
    var textExt = ['txt','md','html','css','js','json','xml','csv','log'];
    var imgExt = ['png','jpg','jpeg','gif','svg','webp'];
    if (imgExt.indexOf(ext) !== -1){
      var img = document.createElement('img'); img.style.maxWidth = '100%'; img.style.height='auto'; img.src = src;
      previewBody.innerHTML = ''; previewBody.appendChild(img);
    } else if (textExt.indexOf(ext) !== -1){
      fetch(src).then(function(r){ if (!r.ok) throw new Error('HTTP '+r.status); return r.text(); }).then(function(txt){ var pre = document.createElement('pre'); pre.textContent = txt; previewBody.innerHTML=''; previewBody.appendChild(pre); }).catch(function(e){ previewBody.textContent = 'Failed to load file: '+String(e); });
    } else {
      previewBody.innerHTML = '<div class="small-note">Preview not available for this file type. You can download it with the link below.</div>';
    }
  }
  function closePreview(){ if (!previewModal) return; previewModal.setAttribute('aria-hidden','true'); previewBody.innerHTML = ''; }
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closePreview);
  // restore focus to last focused element when closing preview
  var lastFocusedElement = null;
  var originalClose = closePreview;
  closePreview = function(){
    if (!previewModal) return; previewModal.setAttribute('aria-hidden','true'); previewBody.innerHTML = '';
    try{ if (lastFocusedElement && lastFocusedElement.focus) lastFocusedElement.focus(); }catch(e){}
  };
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', function(){ closePreview(); });
  if (previewModal) previewModal.addEventListener('click', function(e){ if (e.target === previewModal) closePreview(); });
  if (copyPermalinkBtn){ copyPermalinkBtn.addEventListener('click', function(){ copyPermalink(this.dataset.path); }); }
  function copyPermalink(path){ var url = location.origin + '/' + path.replace(/^\//,''); if (navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(function(){ alert('Permalink copied: '+url); }, function(){ fallbackCopy(url); }); } else fallbackCopy(url); }
  function fallbackCopy(t){ var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); alert('Permalink copied.'); }catch(e){ prompt('Copy this URL', t); } ta.remove(); }

  // basic keyboard navigation within the tree
  fileTreeEl.addEventListener('keydown', function(e){
    var focus = document.activeElement;
    if (!focus || !fileTreeEl.contains(focus)) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){
      e.preventDefault();
      var items = Array.prototype.slice.call(fileTreeEl.querySelectorAll('li'));
      var idx = items.indexOf(focus);
      if (idx === -1) return;
      var next = (e.key === 'ArrowDown') ? items[idx+1] : items[idx-1];
      if (next) next.focus();
    } else if (e.key === 'Enter'){
      // if focus contains a toggle, activate it; otherwise try to open preview for file
      var toggle = focus.querySelector('.toggle');
      if (toggle) { toggle.click(); }
      else {
        var pbtn = focus.querySelector('.preview-btn'); if (pbtn) pbtn.click();
      }
    }
  }, false);

  // expose for debug
  window.revamp4Viewer = { refresh: fetchTree };
})();
