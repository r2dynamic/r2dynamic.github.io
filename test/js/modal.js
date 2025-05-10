// modal.js
// Embedded Google Map toggle + Overview modal with custom small markers,
// dynamic tooltip placement (including corners), sticky tooltips,
// 120px 16:9 thumbnails, anti‑collision, hover previews, zoom auto‑open/close,
// Open‑All/Close‑All buttons, and OSM tile layer.

const mapButton           = document.getElementById('mapButton');
const modalBody           = document.getElementById('modalBody');
const modalImageContainer = document.getElementById('modalImageContainer');
let mapDisplayed          = false;

// 1) Image modal Google‑Maps toggle
export function setupModalMapToggle() {
  if (!mapButton) return;
  mapButton.addEventListener('click', () => {
    if (!mapDisplayed) {
      const imgEl = document.querySelector('#imageModal img');
      const lat   = imgEl.dataset.latitude;
      const lon   = imgEl.dataset.longitude;
      if (!lat || !lon) return alert('No location data');

      const container = document.createElement('div');
      container.id    = 'modalMapContainer';
      container.style.flex = '1';
      const iframe = document.createElement('iframe');
      Object.assign(iframe, { width:'100%', height:'100%', frameBorder:'0', style:'border:0;' });
      iframe.src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&t=k&output=embed`;
      container.append(iframe);
      modalBody.append(container);
      modalImageContainer.style.flex = '1';
      modalBody.style.display       = 'flex';
      mapButton.textContent         = 'Hide Map';
      mapDisplayed                  = true;
    } else {
      document.getElementById('modalMapContainer')?.remove();
      modalImageContainer.style.flex = '1';
      mapButton.textContent         = 'Map';
      mapDisplayed                  = false;
    }
  });
}

// 2) Cleanup embedded map when modal closes
export function setupModalCleanup() {
  document.getElementById('imageModal')
    .addEventListener('hidden.bs.modal', () => {
      document.getElementById('modalMapContainer')?.remove();
      modalImageContainer.style.flex = '1';
      mapButton.textContent         = 'Map';
      mapDisplayed                  = false;
    });
}

// 3) Long‑press sharing (unchanged)
export async function shareImageFile(imageUrl, extraInfo="") {
  try {
    const res  = await fetch(imageUrl);
    const blob = await res.blob();
    const file = new File([blob],"sharedImage.png",{type:blob.type});
    const shareData = { files:[file], title:extraInfo, text:extraInfo };
    if (navigator.canShare && navigator.canShare({ files:[file] })) {
      await navigator.share(shareData);
    } else {
      alert("Your device does not support sharing files.");
    }
  } catch(e) {
    console.error("Sharing error:", e);
  }
}
export function setupLongPressShare(selector) {
  const threshold = 500;
  document.querySelectorAll(selector).forEach(img => {
    let timer;
    img.addEventListener('contextmenu', e => e.preventDefault());
    img.addEventListener('touchstart', () => {
      timer = setTimeout(() => shareImageFile(img.src, img.dataset.cameraInfo||""), threshold);
    });
    ['touchend','touchcancel'].forEach(evt => img.addEventListener(evt, () => clearTimeout(timer)));
  });
}

// 4) Overview modal setup
export function setupOverviewModal() {
  // ---- create a tiny custom circle icon ----
  const smallIcon = L.divIcon({
    className:  'custom-marker',
    iconSize:   [12,12],
    iconAnchor: [6,6],
    tooltipAnchor: [0,-6]
  });

  let map;
  const markers = [];
  const openTips = [];

  // simple rectangle intersection test
  function rectsIntersect(a,b) {
    return !(b.left > a.right ||
             b.right < a.left ||
             b.top > a.bottom ||
             b.bottom < a.top);
  }

  const modalEl = document.getElementById('overviewMapModal');
  modalEl.addEventListener('shown.bs.modal', () => {
    // reset state
    if (map) { map.remove(); map = null; }
    markers.length = 0;
    openTips.length = 0;

    const cams = window.visibleCameras || [];
    if (!cams.length) return;

    // build map with OSM tiles
    const coords = cams.map(c=>[c.Latitude,c.Longitude]);
    const bounds = L.latLngBounds(coords);
    map = L.map('overviewMap', {
      attributionControl: true,
      zoomControl:        false,
      dragging:           true,
      scrollWheelZoom:    true
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // helper for generating tooltip HTML
    const makeHtml = cam => `
      <div class="glass-popup-content">
        <img src="${cam.Views[0].Url}" />
      </div>
    `;

    // constants for sizing & collision
    const TW = 120;           // tooltip width
    const arrowHalf = 6;      // half the arrow width
    const markerRadius = 6;   // half our icon size

    // add each camera as a small marker
    cams.forEach(cam => {
      const marker = L.marker([cam.Latitude,cam.Longitude], { icon: smallIcon }).addTo(map);
      markers.push(marker);
      marker.sticky = false;
      marker._autoOpened = false;
      let hoverTip = null;

      // hover = temporary preview
      marker.on('mouseover', () => {
        if (!marker.sticky && !hoverTip) {
          hoverTip = L.tooltip({ permanent:false, interactive:false })
            .setLatLng(marker.getLatLng())
            .setContent(makeHtml(cam))
            .addTo(map);
        }
      });
      marker.on('mouseout', () => {
        if (hoverTip) { map.removeLayer(hoverTip); hoverTip = null; }
      });

      // click = toggle sticky + dynamic placement
      marker.on('click', () => {
        // if it's already sticky, remove it
        if (marker.sticky) {
          const idx = openTips.findIndex(e => e.marker === marker);
          if (idx !== -1) {
            const entry = openTips[idx];
            map.removeLayer(entry.tooltip);
            map.removeLayer(entry.connector);
            map.off('moveend zoomend', entry.updateConn);
            openTips.splice(idx,1);
          }
          marker.sticky = false;
          marker._autoOpened = false;
          return;
        }

        const html = makeHtml(cam);

        // build marker bounding boxes
        const markerBoxes = markers.map(m => {
          const p = map.latLngToContainerPoint(m.getLatLng());
          return {
            left: p.x - markerRadius,
            top:  p.y - markerRadius,
            right:p.x + markerRadius,
            bottom:p.y + markerRadius
          };
        });

        // list of directions+offsets including corners
        const candidates = [
          { dir:'top',    offset:[0, -markerRadius] },
          { dir:'bottom', offset:[0,  markerRadius] },
          { dir:'left',   offset:[-markerRadius, 0] },
          { dir:'right',  offset:[markerRadius,  0] },
          // corners:
          { dir:'top',    offset:[-(TW/2 - arrowHalf), -markerRadius] },
          { dir:'top',    offset:[ (TW/2 - arrowHalf), -markerRadius] },
          { dir:'bottom', offset:[-(TW/2 - arrowHalf),  markerRadius] },
          { dir:'bottom', offset:[ (TW/2 - arrowHalf),  markerRadius] },
        ];

        // measure & test collisions
        const measured = candidates.map(c => {
          const tmp = L.tooltip({
            direction:   c.dir,
            offset:      c.offset,
            permanent:   true,
            interactive: false,
            opacity:     0
          })
            .setLatLng(marker.getLatLng())
            .setContent(html)
            .addTo(map);
          const rect = tmp.getElement().getBoundingClientRect();
          map.removeLayer(tmp);
          return {...c, rect};
        });

        // find first non‑colliding candidate
        const chosen = measured.find(c =>
          !markerBoxes.some(mb => rectsIntersect(mb, c.rect)) &&
          !openTips.some(e => rectsIntersect(e.tooltip.getElement().getBoundingClientRect(), c.rect))
        ) || measured[0];

        // bind & open the real tooltip
        marker.bindTooltip(html, {
          direction:   chosen.dir,
          offset:      chosen.offset,
          permanent:   true,
          interactive: true,
          className:   'glass-popup',
          maxWidth:    TW
        }).openTooltip();
        const perm = marker.getTooltip();

        // draw connector line
        const connector = L.polyline([], {
          color:'#ff7800',
          weight:3,
          interactive:false
        }).addTo(map);
        const updateConn = () => {
          const mLL = marker.getLatLng();
          const te  = perm.getElement().getBoundingClientRect();
          const me  = map.getContainer().getBoundingClientRect();
          const cx  = te.left - me.left + te.width/2;
          const cy  = te.top  - me.top  + te.height;
          connector.setLatLngs([ mLL, map.containerPointToLatLng([cx,cy]) ]);
        };
        updateConn();
        map.on('moveend zoomend', updateConn);

        openTips.push({ marker, tooltip:perm, connector, updateConn });
        marker.sticky = true;
      });
    });

    // 5) On pan/zoom: close any overlapping tooltip
    map.on('moveend zoomend', () => {
      openTips.slice().forEach(entry => {
        const rect = entry.tooltip.getElement().getBoundingClientRect();
        // overlaps marker?
        const ovM = markers.some(m => {
          const p = map.latLngToContainerPoint(m.getLatLng());
          const mb = {
            left: p.x - markerRadius,
            top:  p.y - markerRadius,
            right:p.x + markerRadius,
            bottom:p.y + markerRadius
          };
          return rectsIntersect(rect, mb);
        });
        // overlaps another tooltip?
        const ovT = openTips.some(other =>
          other !== entry &&
          rectsIntersect(rect, other.tooltip.getElement().getBoundingClientRect())
        );
        if (ovM || ovT) entry.marker.fire('click');
      });
    });

    // 6) Zoom‑threshold auto open/close
    const zoomThreshold = 13;
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

    // 7) Footer buttons
    document.getElementById('openAllTips').onclick  =
      () => markers.forEach(m => !m.sticky && m.fire('click'));
    document.getElementById('closeAllTips').onclick =
      () => markers.forEach(m =>  m.sticky &&  m.fire('click'));

    // 8) Fit map
    map.invalidateSize();
    map.fitBounds(bounds, { padding:[10,10], maxZoom:12 });
  });

  // on hide: clean up
  modalEl.addEventListener('hidden.bs.modal', () => {
    if (map) { map.remove(); map = null; }
  });
}
