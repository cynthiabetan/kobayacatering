/**
 * Kobaya CMS — Google Sheets Content Loader
 * Fetches live content from a published Google Sheet.
 * Falls back to hardcoded HTML if fetch fails.
 * 
 * SETUP:
 * 1. Create a Google Sheet with tabs: Testimonials, Menu, FAQ, Gallery, About, Instagram
 * 2. Publish the sheet: File → Share → Publish to web → Entire Document → Publish
 * 3. Copy the Sheet ID from the URL and paste it below
 */

var KobayaCMS = {

  // ============================================
  // CONFIGURE: Replace with your Google Sheet ID
  // Found in URL: docs.google.com/spreadsheets/d/THIS_PART/edit
  // ============================================
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID_HERE',

  // ============================================
  // CORE: Fetch + Parse
  // ============================================

  fetchSheet: function(tabName, callback) {
    var url = 'https://docs.google.com/spreadsheets/d/' + this.SHEET_ID +
              '/gviz/tq?tqx=out:json&sheet=' + encodeURIComponent(tabName);

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          var jsonText = xhr.responseText.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\);?/);
          if (jsonText && jsonText[1]) {
            callback(null, JSON.parse(jsonText[1]));
          } else {
            callback('Parse error');
          }
        } catch(e) {
          callback(e.message);
        }
      } else {
        callback('HTTP ' + xhr.status);
      }
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

  // Convert Google Drive file URL to displayable image URL
  driveImageUrl: function(driveUrl) {
    if (!driveUrl) return '';
    // Handle: https://drive.google.com/open?id=FILE_ID
    var match = driveUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (!match) {
      // Handle: https://drive.google.com/file/d/FILE_ID/view
      match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    }
    if (match && match[1]) {
      return 'https://lh3.googleusercontent.com/d/' + match[1];
    }
    // Already a direct URL or other format
    return driveUrl;
  },

  // ============================================
  // SECTION LOADERS
  // ============================================

  loadTestimonials: function() {
    var self = this;
    this.fetchSheet('Testimonials', function(err, data) {
      if (err) { console.log('CMS: Testimonials using fallback (' + err + ')'); return; }
      var rows = self.parseRows(data);
      if (rows.length === 0) return;

      var container = document.querySelector('.testimonial-container');
      if (!container) return;

      var html = '';
      var delays = ['', ' reveal-delay-1', ' reveal-delay-2'];
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (!r.Quote) continue;
        html += '<div class="testimonial reveal visible' + (delays[i] || '') + '">';
        html += '<blockquote>' + r.Quote + '</blockquote>';
        html += '<cite>' + (r.Name || '') + (r.Location ? ' — ' + r.Location : '') + '</cite>';
        html += '</div>';
      }
      if (html) container.innerHTML = html;
    });
  },

  loadMenu: function() {
    var self = this;
    this.fetchSheet('Menu', function(err, data) {
      if (err) { console.log('CMS: Menu using fallback (' + err + ')'); return; }
      var rows = self.parseRows(data);
      if (rows.length === 0) return;

      var grid = document.querySelector('.menu-grid');
      if (!grid) return;

      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (!r.Name) continue;
        var delay = (i % 2 === 1) ? ' reveal-delay-1' : '';
        html += '<div class="menu-item reveal visible' + delay + '">';
        html += '<h4>' + r.Name + '</h4>';
        if (r.Japanese) html += '<p class="menu-jp">' + r.Japanese + '</p>';
        html += '<p>' + (r.Description || '') + '</p>';
        html += '</div>';
      }
      if (html) grid.innerHTML = html;
    });
  },

  loadFAQ: function() {
    var self = this;
    this.fetchSheet('FAQ', function(err, data) {
      if (err) { console.log('CMS: FAQ using fallback (' + err + ')'); return; }
      var rows = self.parseRows(data);
      if (rows.length === 0) return;

      var list = document.querySelector('.faq-list');
      if (!list) return;

      var html = '';
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (!r.Question) continue;
        html += '<div class="faq-item">';
        html += '<div class="faq-question" onclick="toggleFaq(this)">';
        html += '<h4>' + r.Question + '</h4>';
        html += '<span class="faq-toggle">+</span></div>';
        html += '<div class="faq-answer"><p>' + (r.Answer || '') + '</p></div>';
        html += '</div>';
      }
      if (html) list.innerHTML = html;
    });
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

  loadAbout: function() {
    var self = this;
    this.fetchSheet('About', function(err, data) {
      if (err) { console.log('CMS: About using fallback (' + err + ')'); return; }
      var rows = self.parseRows(data);
      if (rows.length === 0) return;

      var r = rows[0]; // Single row for About section
      var textDiv = document.querySelector('.about-text');
      if (textDiv && r.Bio) {
        var paragraphs = r.Bio.split('\n');
        var h3 = textDiv.querySelector('h3');
        var heading = h3 ? h3.outerHTML : '';
        var html = heading;
        for (var i = 0; i < paragraphs.length; i++) {
          if (paragraphs[i].trim()) html += '<p>' + paragraphs[i].trim() + '</p>';
        }
        if (r.Signature) html += '<p class="signature">' + r.Signature + '</p>';
        textDiv.innerHTML = html;
      }

      if (r.Heading) {
        var h3El = document.querySelector('.about-text h3');
        if (h3El) h3El.textContent = r.Heading;
      }

      if (r.Image) {
        var imgEl = document.querySelector('.about-image img');
        if (imgEl) imgEl.src = self.driveImageUrl(r.Image);
      }
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
        if (r.Title) {
          var h3 = cards[i].querySelector('h3');
          if (h3) h3.textContent = r.Title;
        }
        if (r.Description) {
          var p = cards[i].querySelector('.service-content p');
          if (p) p.textContent = r.Description;
        }
        if (r.Kanji) {
          var icon = cards[i].querySelector('.service-icon');
          if (icon) icon.textContent = r.Kanji;
        }
        if (r.Image) {
          var img = cards[i].querySelector('.service-image img');
          if (img) img.src = self.driveImageUrl(r.Image);
        }
      }
    });
  },

  // ============================================
  // INIT
  // ============================================
  init: function() {
    if (this.SHEET_ID === 'YOUR_GOOGLE_SHEET_ID_HERE') {
      console.log('CMS: No Sheet ID configured. Using hardcoded content.');
      return;
    }
    console.log('CMS: Loading live content from Google Sheets...');
    this.loadTestimonials();
    this.loadMenu();
    this.loadFAQ();
    this.loadGallery();
    this.loadAbout();
    this.loadInstagram();
    this.loadServices();
  }
};

// Auto-init when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { KobayaCMS.init(); });
} else {
  KobayaCMS.init();
}
