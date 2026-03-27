// Shared Assets for Green International
const TNA_FIELDS = [
    { key: 'LD_S_HC_date', label: 'Labdip / Strike off / HL Approval' },
    { key: 'order_confirm_date', label: 'Order Confirmation' },
    { key: 'yarn_inhouse_date', label: 'Yarn Inhouse' },
    { key: 'weave_start_date', label: 'Weaving Start' },
    { key: 'weave_complete_date', label: 'Weaving Complete' },
    { key: 'dye_processing_start_date', label: 'Dyeing / Processing Start' },
    { key: 'dye_processing_end_date', label: 'Dyeing / Processing Complete' },
    { key: 'FOB_ready_date', label: 'FOB Ready' },
    { key: 'FOB_approval_date', label: 'FOB Approval' },
    { key: 'inspection_finishing_complete_date', label: 'Inspection / Finishing Complete' }
];

function formatDate(dateStr) {
    if (!dateStr) return 'TBA';
    const date = new Date(dateStr);
    // Indian format: 02 Mar 2026
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function linkifyTracking(text) {
    if (!text) return '';
    
    const linkStyle = 'color: #007bff; text-decoration: underline; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;';
    const icon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 2px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

    // DHL Detection: DHL + 10-11 digit number (Case Insensitive)
    const dhlRegex = /\b(DHL)\b[^\d]*?(\d{10,11})\b/gi;
    let linkedText = text.replace(dhlRegex, (match, p1, p2) => {
        return `<a href="https://www.dhl.com/en/express/tracking.html?AWB=${p2}" target="_blank" style="${linkStyle}">${match} ${icon}</a>`;
    });
    
    // FedEx Detection: FedEx + 12-22 digit number (Case Insensitive)
    const fedexRegex = /\b(FedEx)\b[^\d]*?(\d{12,22})\b/gi;
    linkedText = linkedText.replace(fedexRegex, (match, p1, p2) => {
        return `<a href="https://www.fedex.com/fedextrack/?trknbr=${p2}" target="_blank" style="${linkStyle}">${match} ${icon}</a>`;
    });

    // Fardar Detection: Fardar + 10-12 digit number (Case Insensitive)
    const fardarRegex = /\b(Fardar)\b(?![^0-9]*?booking)[^\d]*?(\d{10,12})\b/gi;
    linkedText = linkedText.replace(fardarRegex, (match, p1, p2) => {
        return `<a href="http://43.247.68.241:8028/queryEn.aspx?TrackNum=${p2}" target="_blank" style="${linkStyle}">${match} ${icon}</a>`;
    });

    // Pionexxco Detection: Pionexxco + 10 digit number (Case Insensitive)
    const pionexxcoRegex = /\b(Pionexxco)\b[^\d]*?(\d{10})\b/gi;
    linkedText = linkedText.replace(pionexxcoRegex, (match, p1, p2) => {
        return `<a href="https://www.pionexxco.net/Track?awb=${p2}" target="_blank" style="${linkStyle}">${match} ${icon}</a>`;
    });

    // DTDC Detection: DTDC + Tracking Number (Case Insensitive)
    const dtdcRegex = /\b(DTDC)\b[^\d]*?([A-Z]{1,2}\d{7,11})\b/gi;
    linkedText = linkedText.replace(dtdcRegex, (match, p1, p2) => {
        return `<a href="https://www.dtdc.com/track-your-shipment/?awb=${p2}" target="_blank" style="${linkStyle}">${match} ${icon}</a>`;
    });
    
    return linkedText;
}

// Sticky navbar scroll effect
(function() {
    const navbar = document.querySelector('.cid-uXjz86JSEW');
    if (navbar) {
        navbar.setAttribute('data-initial-scrolled', navbar.classList.contains('scrolled') ? 'true' : 'false');
    }
})();

window.addEventListener('scroll', function () {
  const navbar = document.querySelector('.cid-uXjz86JSEW');
  if (navbar) {
    if (navbar.getAttribute('data-initial-scrolled') === 'true') {
        if (!navbar.classList.contains('scrolled')) navbar.classList.add('scrolled');
        return;
    }

    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
});

// Ensure Mobirise additional styles (only for public theme pages)
(function () {
  if (window.location.pathname.match(/\/admin(\/|\.html|$)/)) return;
  
  function ensureAdditionalCss() {
    var links = Array.prototype.slice.call(document.querySelectorAll('link[rel="stylesheet"]'));
    var present = links.some(function (l) { return l.href && l.href.indexOf('mbr-additional.css') !== -1; });
    if (!present) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'assets/mobirise/css/mbr-additional.css?v=ehfSVp';
      document.head.appendChild(link);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureAdditionalCss);
  } else {
    ensureAdditionalCss();
  }
})();
