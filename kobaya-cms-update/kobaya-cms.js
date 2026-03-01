/**
 * Kobaya CMS — Google Sheets Content Loader
 * Sections: Gallery, Instagram, Services
 * Falls back to hardcoded HTML if fetch fails.
 */

var KobayaCMS = {

  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE',

  fetchSheet: function(tabName, callback) {
    var url = 'https://docs.google.com/spreadsheets/d/' + this.SHEET_ID +
              '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(tabName);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var jsonText = xhr.responseText.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?/);
          if (jsonText && jsonText[1]) { callback(null, JSON.parse(jsonText[1])); }
          else { callback('Parse error'); }
        } catch(e) { callback(e.message); }
      } else { callback('HTTP ' + xhr.status); }
    };
    xhr.onerror = function() { callback('Network error'); };
    xhr.send();
  },

  parseRows: function(data) {
    if (!data || !data.table) return [];
    var cols = data.table.cols;
    var rows = data.table.rows;
    var results = [];
    for (var i = 0; i < rows.length; i++) {
      var row = {};
      for (var j = 0; j < cols.length; j++) {
        var label = cols[j].label || ('col' + j);
        var cell = rows[i].c[j];
        row[label] = cell ? (cell.v || '') : '';
      }
      results.push(row);
    }
    return results;
  },

  driveImageUrl: function(driveUrl) {
    if (!driveUrl) return '';
    var match = driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (!match) { match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/); }
    if (match && match[1]) { return 'https://lh3.googleusercontent.com/d/' + match[1]; }
    return driveUrl;
  },

  loadGallery: function() {
    var self = this;
    this.fetchSheet('Gallery', function(err, data) {
      if (err) { console.log('CMS: Gallery using fallback (' + err + ')'); return; }
      var rows = self.parseRows(data);
      if (rows.length === 0) return;
      var grid = document.querySelector('.gallery-grid');
      if (!grid) return;
      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        var imgUrl = self.driveImageUrl(r.Image);
        if (!imgUrl) continue;
        html += '<div class="gallery-item">';
        html += '<img src="' + imgUrl + '" alt="' + (r.Caption || 'Kobaya Gallery') + '" loading="lazy">';
        html += '</div>';
      }
      if (html) grid.innerHTML = html;
    });
  },

  loadInstagram: function() {
    var self = this;
    this.fetchSheet('Instagram', function(err, data) {
      if (err) { console.log('CMS: Instagram using fallback (' + err + ')'); return; }
      var rows = self.parseRows(data);
      if (rows.length === 0) return;
      var grid = document.querySelector('.instagram-grid');
      if (!grid) return;
      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var imgUrl = self.driveImageUrl(rows[i].Image);
        if (!imgUrl) continue;
        html += '<div class="instagram-item">';
        html += '<img src="' + imgUrl + '" alt="Kobaya Instagram" loading="lazy">';
        html += '</div>';
      }
      if (html) grid.innerHTML = html;
    });
  },

  loadServices: function() {
    var self = this;
    this.fetchSheet('Services', function(err, data) {
      if (err) { console.log('CMS: Services using fallback (' + err + ')'); return; }
      var rows = self.parseRows(data);
      if (rows.length === 0) return;
      var cards = document.querySelectorAll('.service-card');
      for (var i = 0; i < Math.min(rows.length, cards.length); i++) {
        var r = rows[i];
        if (r.Title) { var h3 = cards[i].querySelector('h3'); if (h3) h3.textContent = r.Title; }
        if (r.Description) { var p = cards[i].querySelector('.service-content p'); if (p) p.textContent = r.Description; }
        if (r.Kanji) { var icon = cards[i].querySelector('.service-icon'); if (icon) icon.textContent = r.Kanji; }
        if (r.Image) { var img = cards[i].querySelector('.service-image img'); if (img) img.src = self.driveImageUrl(r.Image); }
      }
    });
  },

  init: function() {
    if (this.SHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE') {
      console.log('CMS: No Sheet ID configured. Using hardcoded content.');
      return;
    }
    console.log('CMS: Loading live content from Google Sheets...');
    this.loadGallery();
    this.loadInstagram();
    this.loadServices();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { KobayaCMS.init(); });
} else {
  KobayaCMS.init();
}
