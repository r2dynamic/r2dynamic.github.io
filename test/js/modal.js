// modal.js
// Image modal map toggle & Overview modal with hover previews, sticky tooltips, anti-collision, and zoom-triggered open/close

const mapButton           = document.getElementById('mapButton');
const modalBody           = document.getElementById('modalBody');
const modalImageContainer = document.getElementById('modalImageContainer');
let mapDisplayed          = false;

// Toggle Google Maps iframe in the image modal
export function setupModalMapToggle() {
  if (!mapButton) return;
  mapButton.addEventListener('click', () => {
    if (!mapDisplayed) {
      const imgEl = document.querySelector('#imageModal img');
      const lat = imgEl.dataset.latitude;
      const lon = imgEl.dataset.longitude;
      if (!lat || !lon) return alert('No location data');
      const mapContainer = document.createElement('div');
      mapContainer.id = 'modalMapContainer';
      mapContainer.style.flex = '1';
      const iframe = document.createElement('iframe');
      Object.assign(iframe, { width: '100%', height: '100%', frameBorder: '0', style: 'border:0;' });
      iframe.src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&t=k&output=embed`;
      mapContainer.append(iframe);
      modalBody.append(mapContainer);
      modalImageContainer.style.flex = '1';
      modalBody.style.display = 'flex';
      mapButton.textContent = 'Hide Map';
      mapDisplayed = true;
    } else {
      document.getElementById('modalMapContainer')?.remove();
      modalImageContainer.style.flex = '1';
      mapButton.textContent = 'Map';
      mapDisplayed = false;
    }
  });
}

// Cleanup image modal on hide
export function setupModalCleanup() {
  const imageModalEl = document.getElementById('imageModal');
  imageModalEl.addEventListener('hidden.bs.modal', () => {
    document.getElementById('modalMapContainer')?.remove();
    modalImageContainer.style.flex = '1';
    mapButton.textContent = 'Map';
    mapDisplayed = false;
  });
}

// Enable long‑press sharing on images
export async function shareImageFile(imageUrl, extraInfo = "") {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const file = new File([blob], "sharedImage.png", { type: blob.type });
    const shareData = { files: [file], title: extraInfo, text: extraInfo };
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share(shareData);
    else alert("Your device does not support sharing files.");
  } catch (err) {
    console.error("Error sharing image file:", err);
  }
}

export function setupLongPressShare(selector) {
  const threshold = 500;
  document.querySelectorAll(selector).forEach(img => {
    let timer;
    img.addEventListener('contextmenu', e => e.preventDefault());
    img.addEventListener('touchstart', () => {
      timer = setTimeout(() => shareImageFile(img.src, img.dataset.cameraInfo || ""), threshold);
    });
    ['touchend','touchcancel'].forEach(evt => img.addEventListener(evt, () => clearTimeout(timer)));
  });
}

// --- Overview Map modal with advanced tooltip logic ---
export function setupOverviewModal() {
  let map;
  const openTips = [];
  const markers = [];

  // AABB intersection test
  function rectsIntersect(a, b) {
    return !(b.left > a.right || b.right < a.left || b.top > a.bottom || b.bottom < a.top);
  }

  // Render invisible tooltip to measure bounds
  function measureTip(marker, html, dir, offset) {
    const temp = L.tooltip({ className: 'glass-popup', direction: dir, offset, permanent: true, interactive: false, opacity: 0 })
      .setLatLng(marker.getLatLng())
      .setContent(html)
      .addTo(map);
    const rect = temp.getElement().getBoundingClientRect();
    map.removeLayer(temp);
    return rect;
  }

  const modalEl = document.getElementById('overviewMapModal');
  modalEl.addEventListener('shown.bs.modal', () => {
    // Clear state
    openTips.length = 0;
    markers.length = 0;

    // Update header
    document.getElementById('overviewMapModalLabel').textContent = window.selectedRoute || 'Route Overview';
    const cams = window.visibleCameras || [];
    if (!cams.length) return;

    // Remove previous map
    if (map) { map.remove(); map = null; }

    // Create map
    const coords = cams.map(c => [c.Latitude, c.Longitude]);
    const bounds = L.latLngBounds(coords);
    map = L.map('overviewMap', { attributionControl: true, zoomControl: false, dragging: true, scrollWheelZoom: true });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri' }).addTo(map);

    // HTML and offset settings
    const generateHtml = cam => `<div class=\"glass-popup-content\"><img src=\"${cam.Views[0].Url}\" class=\"glass-popup-img\"/></div>`;
    const off = { top:[0,-10], right:[30,0], bottom:[0,30], left:[-30,0] };
    const dirs = ['top','right','bottom','left'];

    cams.forEach(cam => {
      const marker = L.circleMarker([cam.Latitude, cam.Longitude], { radius:6, fillColor:'#ff7800', color:'#000', weight:1, opacity:1, fillOpacity:0.8 }).addTo(map);
      marker.sticky = false;
      marker._autoOpened = false;
      markers.push(marker);
      let tempHover = null;

      // Hover preview
      marker.on('mouseover', () => {
        if (!marker.sticky && !tempHover) {
          tempHover = L.tooltip({ className:'glass-popup', direction:'top', offset:off.top, permanent:false, interactive:false })
            .setLatLng(marker.getLatLng())
            .setContent(generateHtml(cam))
            .addTo(map);
        }
      });
      marker.on('mouseout', () => {
        if (tempHover) { map.removeLayer(tempHover); tempHover = null; }
      });

      // Click to toggle with collision avoidance
      marker.on('click', () => {
        if (marker.sticky) {
          // remove permanent
          const entry = openTips.find(e => e.marker === marker);
          if (entry) {
            map.removeLayer(entry.tooltip);
            map.removeLayer(entry.connector);
            openTips.splice(openTips.indexOf(entry),1);
          }
          marker.sticky = false;
          marker._autoOpened = false;
          return;
        }
        // choose placement
        const html = generateHtml(cam);
        const candidates = dirs.map(d => ({ d, rect: measureTip(marker, html, d, off[d]) }));
        const chosen = candidates.find(c => !openTips.some(e => rectsIntersect(e.bounds, c.rect))) || candidates[0];
        // add permanent tooltip
        const perm = L.tooltip({ className:'glass-popup', direction:chosen.d, offset:off[chosen.d], permanent:true, interactive:true })
          .setLatLng(marker.getLatLng())
          .setContent(html)
          .addTo(map);
        // connector line
        const connector = L.polyline([], { color:'#ff7800', weight:3, interactive:false }).addTo(map);
        const updateConn = () => {
          const mLL = marker.getLatLng();
          const te = perm.getElement().getBoundingClientRect();
          const me = map.getContainer().getBoundingClientRect();
          connector.setLatLngs([ mLL, map.containerPointToLatLng([te.left - me.left + te.width/2, te.top - me.top + te.height]) ]);
        };
        map.on('move zoom viewreset', updateConn);
        updateConn();
        openTips.push({ marker, tooltip:perm, connector, bounds:perm.getElement().getBoundingClientRect() });
        marker.sticky = true;
      });
    });

    // Zoom-based auto open/close
    const zoomThreshold = 13; // adjust zoom level as needed
    map.on('zoomend', () => {
      const z = map.getZoom();
      if (z >= zoomThreshold) {
        markers.forEach(m => {
          if (!m.sticky) { m._autoOpened = true; m.fire('click'); }
        });
      } else {
        markers.forEach(m => {
          if (m._autoOpened) { m.fire('click'); m._autoOpened = false; }
        });
      }
    });

    // Open/Close all buttons
    document.getElementById('openAllTips').onclick  = () => markers.forEach(m => { if (!m.sticky) m.fire('click'); });
    document.getElementById('closeAllTips').onclick = () => markers.forEach(m => { if (m.sticky)  m.fire('click'); });

    // Fit map
    map.invalidateSize();
    map.fitBounds(bounds, { padding:[10,10], maxZoom:12 });
  });

  // Cleanup on hide
  modalEl.addEventListener('hidden.bs.modal', () => { if (map) { map.remove(); map = null; }});
}
