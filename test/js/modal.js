// modal.js
// Image‑modal map toggle & Overview modal with hover previews, sticky tooltips,
// simple “no‑overlap” logic on pan/zoom by closing offending tooltips.

const mapButton           = document.getElementById('mapButton');
const modalBody           = document.getElementById('modalBody');
const modalImageContainer = document.getElementById('modalImageContainer');
let mapDisplayed          = false;

// 1) Image modal toggle
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

// 2) Cleanup on hide
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
    if (navigator.canShare && navigator.canShare({files:[file]})) {
      await navigator.share(shareData);
    } else {
      alert("Your device does not support sharing files.");
    }
  } catch(e) { console.error("Sharing error:", e); }
}
export function setupLongPressShare(selector) {
  const threshold = 500;
  document.querySelectorAll(selector).forEach(img => {
    let timer;
    img.addEventListener('contextmenu', e=>e.preventDefault());
    img.addEventListener('touchstart', ()=>{
      timer = setTimeout(()=>shareImageFile(img.src,img.dataset.cameraInfo||""), threshold);
    });
    ['touchend','touchcancel'].forEach(evt =>
      img.addEventListener(evt, ()=>clearTimeout(timer))
    );
  });
}

// 4) Overview‐map modal with manual anti‑collision (closing overlaps)
export function setupOverviewModal() {
  let map;
  const markers = [];
  const openTips = [];

  // simple AABB intersection
  function rectsIntersect(a,b) {
    return !(b.left   > a.right ||
             b.right  < a.left  ||
             b.top    > a.bottom||
             b.bottom < a.top);
  }

  const modalEl = document.getElementById('overviewMapModal');
  modalEl.addEventListener('shown.bs.modal', () => {
    // reset state
    markers.length = 0;
    openTips.length= 0;
    if (map) { map.remove(); map=null; }

    // build map & tiles
    const cams = window.visibleCameras||[];
    if (!cams.length) return;
    const coords = cams.map(c=>[c.Latitude,c.Longitude]);
    const bounds = L.latLngBounds(coords);

    map = L.map('overviewMap', {
      attributionControl: true,
      zoomControl:        false,
      dragging:           true,
      scrollWheelZoom:    true
    });
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '&copy; Esri' }
    ).addTo(map);

    // HTML generator + offsets + directions
    const getHtml = cam=>`
      <div class="glass-popup-content">
        <img src="${cam.Views[0].Url}" class="glass-popup-img"/>
      </div>`;
    const off = { top:[0,-15], right:[30,0], bottom:[0,30], left:[-30,0] };
    const dirs = ['top','right','bottom','left'];

    // create each marker + its sticky logic
    cams.forEach((cam,i)=>{
      const marker = L.circleMarker([cam.Latitude,cam.Longitude], {
        radius:6, fillColor:'#ff7800', color:'#000', weight:1, opacity:1, fillOpacity:0.8
      }).addTo(map);
      markers.push(marker);
      marker.sticky = false;
      marker._autoOpened = false;
      let hoverTip = null;

      // hover preview
      marker.on('mouseover',()=>{
        if(!marker.sticky && !hoverTip){
          hoverTip = L.tooltip({
            className:'glass-popup',
            direction:'top',
            offset:off.top,
            permanent:false,
            interactive:false
          })
            .setLatLng(marker.getLatLng())
            .setContent(getHtml(cam))
            .addTo(map);
        }
      });
      marker.on('mouseout',()=>{
        if(hoverTip){ map.removeLayer(hoverTip); hoverTip=null; }
      });

      // click toggles sticky + collision check
      marker.on('click',()=>{
        if(marker.sticky){
          // remove it
          const idx = openTips.findIndex(e=>e.marker===marker);
          if(idx!==-1){
            map.removeLayer(openTips[idx].tooltip);
            map.removeLayer(openTips[idx].connector);
            openTips.splice(idx,1);
          }
          marker.sticky=false;
          marker._autoOpened=false;
          return;
        }
        // pick a direction that avoids covering any marker
        const html = getHtml(cam);
        const candidates = dirs.map(d=>{
          // measure an invisible tooltip
          const tmp = L.tooltip({className:'glass-popup',direction:d,offset:off[d],permanent:true,interactive:false,opacity:0})
            .setLatLng(marker.getLatLng())
            .setContent(html)
            .addTo(map);
          const rect = tmp.getElement().getBoundingClientRect();
          map.removeLayer(tmp);
          return {d,rect};
        });
        // find first that doesn’t cover any marker
        let chosen = candidates[0];
        for(let c of candidates){
          let hitsMarker = markers.some(m=>{
            const p = map.latLngToContainerPoint(m.getLatLng());
            const r = m.options.radius;
            const mb = {left:p.x-r,top:p.y-r,right:p.x+r,bottom:p.y+r};
            if(rectsIntersect(c.rect,mb)) return true;
          });
          if(!hitsMarker){ chosen=c; break; }
        }
        // add permanent tooltip & connector
        const perm = L.tooltip({
          className:'glass-popup',
          direction:chosen.d,
          offset:off[chosen.d],
          permanent:true,
          interactive:true
        })
          .setLatLng(marker.getLatLng())
          .setContent(html)
          .addTo(map);
        const connector = L.polyline([], {color:'#ff7800',weight:3,interactive:false}).addTo(map);
        const updateConn = ()=>{
          const mLL = marker.getLatLng();
          const te  = perm.getElement().getBoundingClientRect();
          const me  = map.getContainer().getBoundingClientRect();
          const cx  = te.left - me.left + te.width/2;
          const cy  = te.top  - me.top  + te.height;
          connector.setLatLngs([ mLL, map.containerPointToLatLng([cx,cy]) ]);
        };
        updateConn();
        map.on('moveend zoomend', updateConn);

        openTips.push({marker,tooltip:perm,connector});
        marker.sticky=true;
      });
    });

    // 5) On pan/zoom, close any tooltip that overlaps a marker or another tooltip
    map.on('moveend zoomend', ()=>{
      openTips.slice().forEach(entry=>{
        const rect = entry.tooltip.getElement().getBoundingClientRect();
        const overlapsTip = openTips.some(other=>
          other!==entry &&
          rectsIntersect(rect, other.tooltip.getElement().getBoundingClientRect())
        );
        const overlapsMarker = markers.some(m=>{
          const p = map.latLngToContainerPoint(m.getLatLng());
          const r = m.options.radius;
          const mb = {left:p.x-r,top:p.y-r,right:p.x+r,bottom:p.y+r};
          return rectsIntersect(rect, mb);
        });
        if(overlapsTip||overlapsMarker){
          // fire click to close
          entry.marker.fire('click');
        }
      });
    });

    // 6) Zoom‐triggered open/close (optional)
    const zoomThreshold = 13;
    map.on('zoomend', ()=>{
      const z = map.getZoom();
      if(z>=zoomThreshold){
        markers.forEach(m=>{
          if(!m.sticky){ m._autoOpened=true; m.fire('click'); }
        });
      }else{
        markers.forEach(m=>{
          if(m._autoOpened){ m.fire('click'); m._autoOpened=false; }
        });
      }
    });

    // 7) Footer buttons (you already added these in HTML)
    document.getElementById('openAllTips').onclick  = ()=> markers.forEach(m=>!m.sticky && m.fire('click'));
    document.getElementById('closeAllTips').onclick = ()=> markers.forEach(m=> m.sticky && m.fire('click'));

    // 8) Fit & show
    map.invalidateSize();
    map.fitBounds(bounds, {padding:[10,10],maxZoom:12});
  });

  modalEl.addEventListener('hidden.bs.modal', ()=>{
    if(map){ map.remove(); map=null; }
  });
}
