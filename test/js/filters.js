// filters.js
import { renderGallery, updateCameraCount } from './gallery.js';
import { updateSelectedFilters, updateURLParameters } from './events.js';

/**
 * Checks if a camera matches a single route segment.
 */
export function isCameraOnSingleRoute(camera, { name, mpMin, mpMax }) {
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

/**
 * Checks if a camera matches any segment of a composite route.
 */
export function isCameraOnRoute(camera, routeObj) {
  if (Array.isArray(routeObj.routes)) {
    return routeObj.routes.some(sub => isCameraOnSingleRoute(camera, sub));
  }
  return isCameraOnSingleRoute(camera, routeObj);
}

/**
 * Filters the global camerasList based on selected filters,
 * then renders and updates counts/URL.
 */
export function filterImages() {
  const routeObj = selectedRoute !== 'All'
    ? curatedRoutes.find(r => (r.displayName || r.name) === selectedRoute)
    : null;

  if (selectedOtherFilter === 'Inactive Cameras') {
    visibleCameras = camerasList.filter(cam =>
      cam.Views?.[0]?.Status === 'Disabled'
    );
    updateCameraCount();
    renderGallery(visibleCameras);
    currentIndex = 0;
    updateSelectedFilters();
    updateURLParameters();
    return;
  }

  visibleCameras = camerasList.filter(camera => {
    if (camera.Views?.[0]?.Status === 'Disabled') return false;

    const txt = `${camera.SignalID || ''} ${camera.Location || ''}`.toLowerCase();
    const matchesSearch = !searchQuery || txt.includes(searchQuery.toLowerCase());

    const matchesMaintenance = !selectedMaintenanceStation ||
      ((camera.MaintenanceStationOption1 === selectedMaintenanceStation &&
        camera.MaintenanceStationOption1.toLowerCase() !== 'not available') ||
       (camera.MaintenanceStationOption2 === selectedMaintenanceStation &&
        camera.MaintenanceStationOption2.toLowerCase() !== 'not available'));

    const matchesRoute  = routeObj ? isCameraOnRoute(camera, routeObj) : true;
    const matchesRegion = !selectedRegion || camera.Region == selectedRegion;
    const matchesCounty = !selectedCounty || camera.CountyBoundary === selectedCounty;
    const matchesCity   = !selectedCity || camera.MunicipalBoundary === selectedCity;

    return matchesSearch &&
           matchesMaintenance &&
           matchesRoute &&
           matchesRegion &&
           matchesCounty &&
           matchesCity;
  });

  if (routeObj) {
    if (Array.isArray(routeObj.routes)) {
      visibleCameras.sort((a, b) => {
        const subA = routeObj.routes.find(sr => isCameraOnSingleRoute(a, sr));
        const subB = routeObj.routes.find(sr => isCameraOnSingleRoute(b, sr));
        const idxA = routeObj.routes.indexOf(subA);
        const idxB = routeObj.routes.indexOf(subB);
        if (idxA !== idxB) return idxA - idxB;
        const getMp = (cam, sub) =>
          cam.RoadwayOption1 === sub.name ? cam.MilepostOption1 : cam.MilepostOption2;
        const mpA = getMp(a, subA);
        const mpB = getMp(b, subB);
        return (subA.sortOrder === 'desc') ? mpB - mpA : mpA - mpB;
      });
    } else {
      visibleCameras.sort((a, b) => {
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

  updateCameraCount();
  renderGallery(visibleCameras);
  currentIndex = 0;
  updateSelectedFilters();
  updateURLParameters();
}
