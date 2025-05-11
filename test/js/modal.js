// modal.js
import { debounce } from './utils.js';

// DOM references
const mapButton           = document.getElementById('mapButton');
const modalBody           = document.getElementById('modalBody');
const modalImageContainer = document.getElementById('modalImageContainer');
let mapDisplayed          = false;

// 1) Toggle embedded Google Map iframe in image modal
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

// 2) Cleanup embedded map when image modal closes
export function setupModalCleanup() {
  document.getElementById('imageModal')
    .addEventListener('hidden.bs.modal', () => {
      document.getElementById('modalMapContainer')?.remove();
      modalImageContainer.style.flex = '1';
      mapButton.textContent          = 'Map';
      mapDisplayed                   = false;
    });
}

// 3) Long‐press sharing (unchanged)
export async function shareImageFile(url, info = "") {
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], 'sharedImage.png', { type: blob.type });
    const data = { files: [file], title: info, text: info };
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
    img.addEventListener('contextmenu', e => e.preventDefault());
    img.addEventListener('touchstart', () => {
      timer = setTimeout(() => shareImageFile(img.src, img.dataset.cameraInfo || ''), threshold);
    });
    ['touchend','touchcancel'].forEach(evt => img.addEventListener(evt, () => clearTimeout(timer)));
  });
}

// 4) Overview modal with dynamic connectors
export function setupOverviewModal() {
  // small circular marker
  const smallIcon = L.divIcon({ className: 'custom-marker', iconSize: [12,12], iconAnchor: [6,6], tooltipAnchor: [0,10] });

  // constants
  const MAX_TOOLTIPS = 20;
  const THUMB_WIDTH  = 120;
  const ARROW_HALF   = 6;
  const MARKER_RAD   = 8;
  const ZOOM_OPEN    = 13;
  const ZOOM_COLLIDE = 14;

  let map;
  const markers = [];
  const openTips = [];

  // AABB test
  function intersects(a,b) {
    return !(b.left>a.right||b.right<a.left||b.top>a.bottom||b.bottom<a.top);
  }

  // HTML generator
  function makeHtml(cam) {
    return `<div class="glass-popup-content"><img src="${cam.Views[0].Url}"/></div>`;
  }

  // clear tooltip & connector
  function clearTooltip(marker) {
    // remove tooltip
    marker.unbindTooltip();
    marker.sticky = false;
    marker._autoOpened = false;
    // remove connector & listener
    if (marker._connector) {
      map.removeLayer(marker._connector);
      marker._connector = null;
    }
    if (marker._updateConn) {
      map.off('move zoom viewreset', marker._updateConn);
      marker._updateConn = null;
    }
    // remove from openTips
    const i = openTips.indexOf(marker);
    if (i !== -1) openTips.splice(i,1);
  }

  // reposition & redraw connector
  function repositionTooltip(marker) {
    // clear old
    clearTooltip(marker);

    const cam  = marker.cam;
    const html = makeHtml(cam);

    // build marker boxes
    const boxes = markers.map(m => {
      const p = map.latLngToContainerPoint(m.getLatLng());
      return { left: p.x-MARKER_RAD, top: p.y-MARKER_RAD, right: p.x+MARKER_RAD, bottom: p.y+MARKER_RAD };
    });

    // candidates
    const candidates = [
      { dir:'top',    offset:[0,-MARKER_RAD] },
      { dir:'bottom', offset:[0,MARKER_RAD] },
      { dir:'left',   offset:[-MARKER_RAD,0] },
      { dir:'right',  offset:[MARKER_RAD,0] },
      { dir:'top',    offset:[-(THUMB_WIDTH/2-ARROW_HALF),-MARKER_RAD] },
      { dir:'top',    offset:[ (THUMB_WIDTH/2-ARROW_HALF),-MARKER_RAD] },
      { dir:'bottom', offset:[-(THUMB_WIDTH/2-ARROW_HALF), MARKER_RAD] },
      { dir:'bottom', offset:[ (THUMB_WIDTH/2-ARROW_HALF), MARKER_RAD] }
    ];

    const measured = candidates.map(c => {
      const tmp = L.tooltip({ direction:c.dir, offset:c.offset, permanent:true, interactive:false, opacity:0 })
        .setLatLng(marker.getLatLng())
        .setContent(html)
        .addTo(map);
      const r = tmp.getElement().getBoundingClientRect();
      map.removeLayer(tmp);
      return {...c,rect:r};
    });

    // choose
    const chosen = measured.find(c => {
      if (boxes.some(b=>intersects(b,c.rect))) return false;
      for (let m of openTips) {
        const r2 = m.getTooltip().getElement().getBoundingClientRect();
        if (intersects(c.rect,r2)) return false;
      }
      return true;
    })||measured[0];

    // bind tooltip
    marker.bindTooltip(html, {
      direction:   chosen.dir,
      offset:      chosen.offset,
      permanent:   true,
      interactive: true,
      className:   'glass-popup',
      maxWidth:    THUMB_WIDTH
    }).openTooltip();
    marker.sticky = true;
    openTips.push(marker);

    // draw connector
    let ttEl    = marker.getTooltip().getElement();
    let ttRect  = ttEl.getBoundingClientRect();
    let mpRect  = map.getContainer().getBoundingClientRect();

    function computeTipPoint() {
      ttEl    = marker.getTooltip().getElement();
      ttRect  = ttEl.getBoundingClientRect();
      mpRect  = map.getContainer().getBoundingClientRect();
      let px,py;
      const dir = chosen.dir;
      if (dir==='top') {
        px = ttRect.left - mpRect.left + ttRect.width/2;
        py = ttRect.bottom - mpRect.top;
      } else if (dir==='bottom') {
        px = ttRect.left - mpRect.left + ttRect.width/2;
        py = ttRect.top - mpRect.top;
      } else if (dir==='left') {
        px = ttRect.right - mpRect.left;
        py = ttRect.top - mpRect.top + ttRect.height/2;
      } else {
        // right
        px = ttRect.left - mpRect.left;
        py = ttRect.top - mpRect.top + ttRect.height/2;
      }
      return map.containerPointToLatLng([px,py]);
    }

    const tipLL = computeTipPoint();
    const poly  = L.polyline([ marker.getLatLng(), tipLL ], { color:'#ff7800', weight:4, interactive:false }).addTo(map);

    // update connector on map move/zoom & on reflow
    const updateConn = () => {
      const newTip = computeTipPoint();
      poly.setLatLngs([ marker.getLatLng(), newTip ]);
    };
    map.on('move zoom viewreset', updateConn);

    // stash
    marker._connector   = poly;
    marker._updateConn  = updateConn;
  }

  // auto open in view
  function openInView() {
    if (map.getZoom()<ZOOM_OPEN) return;
    const bounds = map.getBounds();
    markers.forEach(m=>{
      if (!m.sticky && bounds.contains(m.getLatLng())) m.fire('click');
    });
  }

  // debounced collision pass
  const collisionPass = debounce(()=>{
    if (map.getZoom()<ZOOM_COLLIDE) return;
    openTips.slice().forEach(m=>repositionTooltip(m));
  },300);

  // main modal shown
  const modal = document.getElementById('overviewMapModal');
  modal.addEventListener('shown.bs.modal', ()=>{
    // teardown
    if(map){map.remove();map=null;} markers.length=0; openTips.length=0;
    const cams = window.visibleCameras||[]; if(!cams.length) return;

    // init map
    const coords = cams.map(c=>[c.Latitude,c.Longitude]);
    const bounds = L.latLngBounds(coords);
    map = L.map('overviewMap',{attributionControl:true,zoomControl:false,dragging:true,scrollWheelZoom:true});
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map);

    // add markers
    cams.forEach(cam=>{
      const m = L.marker([cam.Latitude, cam.Longitude], { icon: smallIcon }).addTo(map);
      m.cam = cam; m.sticky=false;
      markers.push(m);
      
      let hover=null;
      m.on('mouseover', ()=>{
        if(!m.sticky && !hover){
          hover=L.tooltip({permanent:false,interactive:false})
            .setLatLng(m.getLatLng())
            .setContent(makeHtml(cam))
            .addTo(map);
        }
      });
      m.on('mouseout', ()=>{ if(hover){map.removeLayer(hover); hover=null;} });

      m.on('click', ()=>{
        if(m.sticky){ clearTooltip(m); return; }
        // cap
        if(map.getZoom()>=ZOOM_COLLIDE && openTips.length>=MAX_TOOLTIPS){ clearTooltip(openTips.shift()); }
        repositionTooltip(m);
      });
    });

    // events
    map.off('moveend'); map.on('moveend', openInView);
    map.off('zoomend');
    map.on('zoomend', ()=>{
      const z=map.getZoom();
      if(z>=ZOOM_OPEN) openInView(); else openTips.slice().forEach(clearTooltip);
      if(z>=ZOOM_COLLIDE) collisionPass();
    });

    document.getElementById('openAllTips').onclick  = ()=>markers.forEach(m=>!m.sticky&&m.fire('click'));
    document.getElementById('closeAllTips').onclick = ()=>openTips.slice().forEach(clearTooltip);

    map.invalidateSize(); map.fitBounds(bounds,{padding:[10,10],maxZoom:12});
  });

  modal.addEventListener('hidden.bs.modal', ()=>{
    openTips.slice().forEach(clearTooltip);
    if(map){map.remove();map=null;}
  });
}
