// filters.js
import { renderGallery, updateCameraCount } from './gallery.js';
import { updateSelectedFilters, updateURLParameters } from './ui.js';

// ... rest of the filtering code unchanged ...
function isCameraOnSingleRoute(camera, { name, mpMin, mpMax }) {
  if (camera.RoadwayOption1 === name) {
    const mp = camera.MilepostOption1;
    if (mpMin != null && mp < mpMin) return false;
    if (mpMax != null && mp > mpMax) return false;
    return true;
  }
  if (camera.RoadwayOption2 === name) {
    const mp = camera.MilepostOption2;
    if (mpMin != null && mp < mpMin) return false;
    if (mpMax != null && mp > mpMax) return false;
    return true;
  }
  return false;
}

function isCameraOnRoute(camera, routeObj) {
  if (Array.isArray(routeObj.routes)) {
    return routeObj.routes.some(sub => isCameraOnSingleRoute(camera, sub));
  }
  return isCameraOnSingleRoute(camera, routeObj);
}

export function filterImages() {
  const cameras = window.camerasList;
  const routes  = window.curatedRoutes;
  let filtered;

  if (window.selectedOtherFilter === 'Inactive Cameras') {
    filtered = cameras.filter(cam =>
      cam.Views?.[0]?.Status === 'Disabled'
    );
    window.visibleCameras = filtered;
    updateCameraCount();
    renderGallery(filtered);
    window.currentIndex = 0;
    updateSelectedFilters();
    updateURLParameters();
    return;
  }

  filtered = cameras.filter(cam => {
    if (cam.Views?.[0]?.Status === 'Disabled') return false;
    const txt = `${cam.SignalID || ''} ${cam.Location || ''}`.toLowerCase();
    const matchesSearch = !window.searchQuery ||
      txt.includes(window.searchQuery.toLowerCase());
    const matchesMaintenance = !window.selectedMaintenanceStation ||
      ((cam.MaintenanceStationOption1 === window.selectedMaintenanceStation &&
        cam.MaintenanceStationOption1.toLowerCase() !== 'not available') ||
       (cam.MaintenanceStationOption2 === window.selectedMaintenanceStation &&
        cam.MaintenanceStationOption2.toLowerCase() !== 'not available'));
    const routeObj = window.selectedRoute !== 'All'
      ? routes.find(r => (r.displayName || r.name) === window.selectedRoute)
      : null;
    const matchesRoute  = routeObj ? isCameraOnRoute(cam, routeObj) : true;
    const matchesRegion = !window.selectedRegion || cam.Region == window.selectedRegion;
    const matchesCounty = !window.selectedCounty || cam.CountyBoundary === window.selectedCounty;
    const matchesCity   = !window.selectedCity || cam.MunicipalBoundary === window.selectedCity;
    return matchesSearch &&
           matchesMaintenance &&
           matchesRoute &&
           matchesRegion &&
           matchesCounty &&
           matchesCity;
  });

  if (window.selectedRoute !== 'All') {
    const routeObj = routes.find(r => (r.displayName || r.name) === window.selectedRoute);
    if (routeObj) {
      if (Array.isArray(routeObj.routes)) {
        filtered.sort((a, b) => {
          const subA = routeObj.routes.find(sr => isCameraOnSingleRoute(a, sr));
          const subB = routeObj.routes.find(sr => isCameraOnSingleRoute(b, sr));
          const idxA = routeObj.routes.indexOf(subA);
          const idxB = routeObj.routes.indexOf(subB);
          if (idxA !== idxB) return idxA - idxB;
          const getMp = (c, s) =>
            c.RoadwayOption1 === s.name ? c.MilepostOption1 : c.MilepostOption2;
          const mpA = getMp(a, subA);
          const mpB = getMp(b, subB);
          return (subA.sortOrder === 'desc') ? mpB - mpA : mpA - mpB;
        });
      } else {
        filtered.sort((a, b) => {
          const mpA = isCameraOnSingleRoute(a, routeObj)
            ? (a.RoadwayOption1 === routeObj.name ? a.MilepostOption1 : a.MilepostOption2)
            : 0;
          const mpB = isCameraOnSingleRoute(b, routeObj)
            ? (b.RoadwayOption1 === routeObj.name ? b.MilepostOption1 : b.MilepostOption2)
            : 0;
          return mpA - mpB;
        });
      }
    }
  }

  window.visibleCameras = filtered;
  updateCameraCount();
  renderGallery(filtered);
  window.currentIndex = 0;
  updateSelectedFilters();
  updateURLParameters();
}
