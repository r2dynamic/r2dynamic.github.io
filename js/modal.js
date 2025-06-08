import { debounce } from './utils.js';

// DOM references
const mapButton           = document.getElementById('mapButton');
const modalBody           = document.getElementById('modalBody');
const modalImageContainer = document.getElementById('modalImageContainer');
let mapDisplayed          = false;

export function setupModalMapToggle() {
  if (!mapButton) return;
  mapButton.addEventListener('click', () => {
    if (!mapDisplayed) {
      const img = document.querySelector('#imageModal img');
      const lat = img.dataset.latitude;
      const lon = img.dataset.longitude;
      if (!lat || !lon) return alert('No location data');

      const container = document.createElement('div');
      container.id    = 'modalMapContainer';
      container.style.flex = '1';
      const iframe = document.createElement('iframe');
      Object.assign(iframe, { width: '100%', height: '100%', frameBorder: '0', style: 'border:0;' });
      iframe.src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&t=k&output=embed`;
      container.append(iframe);
      modalBody.append(container);
      modalImageContainer.style.flex = '1';
      modalBody.style.display        = 'flex';
      mapButton.textContent          = 'Hide Map';
      mapDisplayed                   = true;
    } else {
      document.getElementById('modalMapContainer')?.remove();
      modalImageContainer.style.flex = '1';
      mapButton.textContent          = 'Map';
      mapDisplayed                   = false;
    }
  });
}

export function setupModalCleanup() {
  document.getElementById('imageModal')
    .addEventListener('hidden.bs.modal', () => {
      document.getElementById('modalMapContainer')?.remove();
      modalImageContainer.style.flex = '1';
      mapButton.textContent          = 'Map';
      mapDisplayed                   = false;
    });
}

export async function shareImageFile(url, info = "") {
  try {
    const res   = await fetch(url);
    const blob  = await res.blob();
    const file  = new File([blob], 'sharedImage.png', { type: blob.type });
    const data  = { files: [file], title: info, text: info };
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share(data);
    } else {
      alert('Sharing not supported');
    }
  } catch (e) {
    console.error(e);
  }
}
export function setupLongPressShare(sel) {
  const threshold = 500;
  document.querySelectorAll(sel).forEach(img => {
    let timer;
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      img.addEventListener('contextmenu', e => e.preventDefault());
    }
    img.addEventListener('touchstart', () => {
      timer = setTimeout(() => shareImageFile(img.src, img.dataset.cameraInfo || ''), threshold);
    });
    ['touchend','touchcancel'].forEach(evt => img.addEventListener(evt, () => clearTimeout(timer)));
  });
}

// ---- OVERVIEW MODAL ----
export function setupOverviewModal() {
  const smallIcon = L.divIcon({ className: 'custom-marker', iconSize: [12,12], iconAnchor: [6,6], tooltipAnchor: [0,10] });
  const userDotIcon = L.divIcon({
    className: 'user-dot-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const MAX_TOOLTIPS    = 20;
  const THUMB_WIDTH     = 120;
  const ARROW_HALF      = 6;
  const MARKER_RAD      = 8;
  const MIN_ANCHOR_PX   = 10; // changed from 5 to 10
  const ZOOM_OPEN       = 13;
  const ZOOM_COLLIDE    = 14;

  let map;
  const markers = [];
  const openTips = [];
  let userMarker = null;

  function intersects(a,b) {
    return !(b.left > a.right || b.right < a.left || b.top > a.bottom || b.bottom < a.top);
  }

  function makeHtml(cam) {
    return `<div class="glass-popup-content"><img src="${cam.Views[0].Url}"/></div>`;
  }

  function clearTooltip(marker) {
    if (!marker || !marker.unbindTooltip) return;
    marker.unbindTooltip();
    marker.sticky = false;
    marker._autoOpened = false;
    if (marker._connector) {
      map.removeLayer(marker._connector);
      marker._connector = null;
    }
    if (marker._updateConn) {
      map.off('move zoom viewreset', marker._updateConn);
      marker._updateConn = null;
    }
    const idx = openTips.indexOf(marker);
    if (idx !== -1) openTips.splice(idx, 1);
  }

  function repositionTooltip(marker) {
    if (!marker || !marker.getLatLng) return;
    clearTooltip(marker);
    const html = makeHtml(marker.cam);

    const boxes = markers.map(m => {
      const p = map.latLngToContainerPoint(m.getLatLng());
      return { left: p.x - MARKER_RAD, top: p.y - MARKER_RAD, right: p.x + MARKER_RAD, bottom: p.y + MARKER_RAD };
    });

    const candidates = [
      { dir:'top',    offset:[0, -MARKER_RAD] },
      { dir:'bottom', offset:[0,  MARKER_RAD] },
      { dir:'left',   offset:[-MARKER_RAD, 0] },
      { dir:'right',  offset:[ MARKER_RAD, 0] },
      { dir:'top',    offset:[-(THUMB_WIDTH/2 - ARROW_HALF), -MARKER_RAD] },
      { dir:'top',    offset:[ (THUMB_WIDTH/2 - ARROW_HALF), -MARKER_RAD] },
      { dir:'bottom', offset:[-(THUMB_WIDTH/2 - ARROW_HALF),  MARKER_RAD] },
      { dir:'bottom', offset:[ (THUMB_WIDTH/2 - ARROW_HALF),  MARKER_RAD] }
    ];

    const measured = candidates.map(c => {
      const tmp = L.tooltip({ direction:c.dir, offset:c.offset, permanent:true, interactive:false, opacity:1 })
        .setLatLng(marker.getLatLng())
        .setContent(html)
        .addTo(map);
      const r = tmp.getElement().getBoundingClientRect();
      map.removeLayer(tmp);
      return { ...c, rect: r };
    });

    const chosen = measured.find(c => {
      if (boxes.some(b => intersects(b, c.rect))) return false;
      for (let ot of openTips) {
        if (!ot.getTooltip) continue;
        const r2 = ot.getTooltip().getElement().getBoundingClientRect();
        if (intersects(c.rect, r2)) return false;
      }
      return true;
    }) || measured[0];

    // enforce minimum anchor length of 10px
    let [ox, oy] = chosen.offset;
    const minOffset = Math.max(MARKER_RAD + MIN_ANCHOR_PX, 10);
    const norm = Math.hypot(ox, oy);
    if (norm < minOffset) {
      const factor = minOffset / (norm || minOffset);
      ox *= factor;
      oy *= factor;
    }

    marker.bindTooltip(html, {
      direction:   chosen.dir,
      offset:      [ox, oy], // use adjusted offset
      permanent:   true,
      interactive: true,
      className:   'glass-popup',
      maxWidth:    THUMB_WIDTH,
      opacity:     1
    }).openTooltip();
    marker.sticky = true;
    openTips.push(marker);

    const markerCP = map.latLngToContainerPoint(marker.getLatLng());
    function computeTipCP() {
      const tt = marker.getTooltip().getElement().getBoundingClientRect();
      const mp = map.getContainer().getBoundingClientRect();
      let px, py;
      switch (chosen.dir) {
        case 'top':    px = tt.left - mp.left + tt.width/2; py = tt.bottom - mp.top; break;
        case 'bottom': px = tt.left - mp.left + tt.width/2; py = tt.top - mp.top; break;
        case 'left':   px = tt.right - mp.left; py = tt.top - mp.top + tt.height/2; break;
        default:       px = tt.left - mp.left; py = tt.top - mp.top + tt.height/2;
      }
      return L.point(px, py);
    }

    let tipCP = computeTipCP();
    let vec   = tipCP.subtract(markerCP);
    let dist  = markerCP.distanceTo(tipCP);
    if (dist < MIN_ANCHOR_PX) {
      const unit = dist ? vec.multiplyBy(1/dist) : L.point(0,1);
      tipCP = markerCP.add(unit.multiplyBy(MIN_ANCHOR_PX));
    }
    const tipLL = map.containerPointToLatLng(tipCP);

    const poly  = L.polyline([ marker.getLatLng(), tipLL ], { color:'#ff7800', weight:4, interactive:false }).addTo(map);

    // Tooltip/anchor updates on map move/zoom
    const tooltip = marker.getTooltip();
    const tooltipEl = tooltip.getElement();
    const imgEl = tooltipEl.querySelector('img');
    if (imgEl) {
      imgEl.style.transition = 'transform 0.2s ease';
      imgEl.style.transformOrigin = 'center center';
      imgEl.addEventListener('click', e => e.stopPropagation());

      function panToFit() {
        const scale = 2;
        const imgRect = imgEl.getBoundingClientRect();
        const mapRect = map.getContainer().getBoundingClientRect();
        const cx = imgRect.left + imgRect.width/2;
        const cy = imgRect.top + imgRect.height/2;
        const newW = imgRect.width * scale;
        const newH = imgRect.height * scale;
        const newLeft = cx - newW/2;
        const newTop = cy - newH/2;
        const newRight = cx + newW/2;
        const newBottom = cy + newH/2;
        const posLeft = newLeft - mapRect.left;
        const posRight = newRight - mapRect.left;
        const posTop = newTop - mapRect.top;
        const posBottom = newBottom - mapRect.top;
        let dx = 0, dy = 0;
        if (posLeft < 0) dx = posLeft;
        else if (posRight > mapRect.width) dx = posRight - mapRect.width;
        if (posTop < 0) dy = posTop;
        else if (posBottom > mapRect.height) dy = posBottom - mapRect.height;
        if (dx || dy) map.panBy([dx, dy], { animate: false });
      }
      ['mousedown','touchstart'].forEach(evt =>
        imgEl.addEventListener(evt, e => {
          e.stopPropagation();
          imgEl.style.transform = 'scale(2)';
          tooltip.bringToFront();
          panToFit();
        })
      );
      ['mouseup','touchend','touchcancel'].forEach(evt =>
        imgEl.addEventListener(evt, e => {
          e.stopPropagation();
          imgEl.style.transform = 'scale(1)';
        })
      );
    }

    const updateConn = () => {
      let cp = computeTipCP();
      let v = cp.subtract(markerCP);
      let d = markerCP.distanceTo(cp);
      if (d < MIN_ANCHOR_PX) v = v.multiplyBy(MIN_ANCHOR_PX / (d || MIN_ANCHOR_PX));
      const adjLL = map.containerPointToLatLng(markerCP.add(v));
      poly.setLatLngs([ marker.getLatLng(), adjLL ]);
    };
    map.on('move zoom viewreset', updateConn);
    marker._connector  = poly;
    marker._updateConn = updateConn;
  }

  function openInView() {
    if (map.getZoom() < ZOOM_OPEN) return;
    const bounds = map.getBounds();
    markers.forEach(m => {
      if (!m.sticky && bounds.contains(m.getLatLng())) m.fire('click');
    });
  }

  const collisionPass = debounce(() => {
    if (map.getZoom() < ZOOM_COLLIDE) return;
    openTips.slice().forEach(m => repositionTooltip(m));
  }, 300);

  const modal = document.getElementById('overviewMapModal');
modal.addEventListener('shown.bs.modal', () => {
  // --- SET PROPER MODAL TITLE ---
  let label = "Overview Map";
  if (window.currentGalleryFilterType === 'route' && window.selectedRoute && window.selectedRoute !== 'All') {
    label = window.selectedRoute;
  } else if (window.currentGalleryFilterType === 'region' && window.selectedRegion) {
    label = `Region: ${window.selectedRegion}`;
  } else if (window.currentGalleryFilterType === 'county' && window.selectedCounty) {
    label = `County: ${window.selectedCounty}`;
  } else if (window.currentGalleryFilterType === 'city' && window.selectedCity) {
    label = `City: ${window.selectedCity}`;
  } else if (window.currentGalleryFilterType === 'maintenance' && window.selectedMaintenanceStation) {
    label = `Maintenance: ${window.selectedMaintenanceStation}`;
  } else if (window.currentGalleryFilterType === 'search' && window.searchQuery) {
    label = `Search: ${window.searchQuery}`;
  } else if (window.currentGalleryFilterType === 'other' && window.selectedOtherFilter) {
    label = `${window.selectedOtherFilter}`;
  } else if (window.currentGalleryFilterType === 'nearest' && window.isNearestFilterActive) {
    label = `Nearest Cameras`;
  } else if (window.selectedRoute && window.selectedRoute !== 'All') {
    label = window.selectedRoute;
  }
  document.getElementById('overviewMapModalLabel').textContent = label;

    if (map) { map.remove(); map = null; }
    markers.length = 0;
    openTips.length = 0;
    if (userMarker) { userMarker.remove(); userMarker = null; }
    const cams = window.visibleCameras || [];
    if (!cams.length) return;

    const coords = cams.map(c => [c.Latitude, c.Longitude]);
    const bounds = L.latLngBounds(coords);
    map = L.map('overviewMap', { attributionControl:true, zoomControl:false, dragging:true, doubleClickZoom: true, scrollWheelZoom:true });

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri',
        subdomains: 'abcd', maxZoom:20
      }
    ).addTo(map);
    L.tileLayer(
      'http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        minZoom:0, maxZoom:18,
        attribution: '&copy; OpenStreetMap',
        ext:'png'
      }
    ).addTo(map);

    cams.forEach(cam => {
      const m = L.marker([cam.Latitude, cam.Longitude], { icon: smallIcon }).addTo(map);
      m.cam = cam; m.sticky = false;
      markers.push(m);
      let hover = null;
      m.on('mouseover', () => {
        if (!m.sticky && !hover) {
          hover = L.tooltip({ permanent:false, interactive:false, opacity:1 })
            .setLatLng(m.getLatLng())
            .setContent(makeHtml(cam))
            .addTo(map);
        }
      });
      m.on('mouseout', () => { if (hover) { map.removeLayer(hover); hover = null; } });
      m.on('click', () => {
        if (m.sticky) { clearTooltip(m); return; }
        if (map.getZoom() >= ZOOM_COLLIDE && openTips.length >= MAX_TOOLTIPS) {
          clearTooltip(openTips.shift());
        }
        repositionTooltip(m);
      });
    });

    // --- USER DOT: show if available ---
    if (window.currentGalleryFilterType === 'nearest' && window.nearestUserLocation) {
      userMarker = L.marker(
        [window.nearestUserLocation.lat, window.nearestUserLocation.lng],
        { icon: userDotIcon, interactive: false }
      ).addTo(map);
    }

    map.off('moveend'); map.on('moveend', openInView);
    map.off('zoomend'); map.on('zoomend', () => {
      const z = map.getZoom();
      if (z >= ZOOM_OPEN) openInView(); else openTips.slice().forEach(clearTooltip);
      if (z >= ZOOM_COLLIDE) collisionPass();
    });

    document.getElementById('openAllTips').onclick  = () => markers.forEach(m => !m.sticky && m.fire('click'));
    document.getElementById('closeAllTips').onclick = () => openTips.slice().forEach(clearTooltip);

    map.invalidateSize();
    map.fitBounds(bounds, { padding:[10,10], maxZoom:12 });
  });

  modal.addEventListener('hidden.bs.modal', () => {
    openTips.slice().forEach(clearTooltip);
    if (userMarker) { userMarker.remove(); userMarker = null; }
    if (map) { map.remove(); map = null; }
  });
}


