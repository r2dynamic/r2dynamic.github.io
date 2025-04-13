// main.js
// Main module that imports data fetching functions and handles UI and events

import { getCamerasList, getCuratedRoutes } from './cameraData.js';

// --- Constants ---
const DEBOUNCE_DELAY = 300;
const MIN_IMAGE_SIZE = 80; // Enforced minimum grid image size

// --- Global Variables ---
// Interdependent filter selections
let selectedRegion = "";
let selectedCounty = "";
let selectedCity = "";
let selectedMaintenanceStation = "";
let selectedRoute = "All";
let searchQuery = "";

let camerasList = [];
let curatedRoutes = [];
let visibleCameras = [];
let currentIndex = 0;
let debounceTimer;

// --- Helper Function ---
// Returns cameras filtered by all selected filter values except the one being updated (exclude)
function getFilteredCameras(exclude) {
  return camerasList.filter(camera => {
    if (exclude !== "region" && selectedRegion) {
      if (!camera.Region || camera.Region.toString() !== selectedRegion) return false;
    }
    if (exclude !== "county" && selectedCounty) {
      if (!camera.CountyBoundary || camera.CountyBoundary !== selectedCounty) return false;
    }
    if (exclude !== "city" && selectedCity) {
      if (!camera.MunicipalBoundary || camera.MunicipalBoundary !== selectedCity) return false;
    }
    if (exclude !== "maintenance" && selectedMaintenanceStation) {
      const validMaint = (camera.MaintenanceStationOption1 &&
            camera.MaintenanceStationOption1.toLowerCase() !== "not available" &&
            camera.MaintenanceStationOption1 === selectedMaintenanceStation) ||
          (camera.MaintenanceStationOption2 &&
            camera.MaintenanceStationOption2.toLowerCase() !== "not available" &&
            camera.MaintenanceStationOption2 === selectedMaintenanceStation);
      if (!validMaint) return false;
    }
    return true;
  });
}

// --- Initialization ---
function initialize() {
  getCamerasList()
    .then(data => {
      camerasList = data;
      visibleCameras = camerasList.slice();
      updateCameraCount();
      updateRegionDropdown();
      updateCountyDropdown();
      updateCityDropdown();
      updateMaintenanceStationDropdown();

      if (window.location.search) {
        applyFiltersFromURL();
      } else if (localStorage.getItem('locationAllowed') === 'true') {
        autoSortByLocation();
      } else if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' })
          .then((result) => {
            if (result.state === 'granted') {
              localStorage.setItem('locationAllowed', 'true');
              autoSortByLocation();
            } else {
              renderGallery(visibleCameras);
            }
          })
          .catch(err => {
            console.error('Permissions API error:', err);
            renderGallery(visibleCameras);
          });
      } else {
         renderGallery(visibleCameras);
      }
    })
    .catch(err => console.error("Error loading cameras:", err));

  getCuratedRoutes()
    .then(routes => {
      curatedRoutes = routes;
      updateRouteOptions();
    })
    .catch(err => console.error("Error loading curated routes:", err));
}

// --- Reveal Main Content ---
function revealMainContent() {
  const headerControls = document.querySelector('.header-controls');
  const imageGallery = document.getElementById('imageGallery');
  if (headerControls) {
    headerControls.classList.remove('hidden-on-load');
    headerControls.classList.add('fade-in');
  }
  if (imageGallery) {
    imageGallery.classList.remove('hidden-on-load');
    imageGallery.classList.add('fade-in');
  }
}

// --- Splash Screen Fade-Out ---
// Modified: Instead of waiting for animationend event, we use setTimeout.
function fadeOutSplash() {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    revealMainContent();
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
      updateSelectedFilters();
    }, 1000); // 1 second matches the fadeOut animation duration
  }
}

// --- URL Parameter Functions ---
function updateURLParameters() {
  const params = new URLSearchParams();
  if (selectedRegion) params.set("region", selectedRegion);
  if (selectedCounty) params.set("county", selectedCounty);
  if (selectedCity) params.set("city", selectedCity);
  if (selectedRoute && selectedRoute !== "All") params.set("route", selectedRoute);
  if (searchQuery) params.set("search", searchQuery);
  if (selectedMaintenanceStation) params.set("maintenance", selectedMaintenanceStation);
  const newUrl = window.location.pathname + '?' + params.toString();
  window.history.replaceState({}, '', newUrl);
}

function applyFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("region")) selectedRegion = params.get("region");
  if (params.has("county")) selectedCounty = params.get("county");
  if (params.has("city")) selectedCity = params.get("city");
  if (params.has("route")) selectedRoute = params.get("route");
  if (params.has("search")) {
    searchQuery = params.get("search");
    if (searchInput) searchInput.value = searchQuery;
  }
  if (params.has("maintenance")) selectedMaintenanceStation = params.get("maintenance");
  updateRegionDropdown();
  updateCountyDropdown();
  updateCityDropdown();
  updateMaintenanceStationDropdown();
  updateRouteOptions();
  filterImages();
}

// --- Copy URL to Clipboard ---
function copyURLToClipboard() {
  const url = window.location.href;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => alert("URL copied to clipboard!"))
      .catch(err => console.error("Failed to copy URL:", err));
  } else {
    const input = document.createElement("input");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    alert("URL copied to clipboard!");
  }
}

// --- DOM Elements ---
const galleryContainer = document.getElementById("imageGallery");
const imageModalEl = document.getElementById("imageModal");
const modalImage = imageModalEl.querySelector("img");
const modalTitle = document.querySelector(".modal-title");
const cameraCountElement = document.getElementById("cameraCount");
const searchInput = document.getElementById("searchInput");
const routeFilterMenu = document.getElementById("routeFilterMenu");
const nearestButton = document.getElementById("nearestButton");
const refreshButton = document.getElementById("refreshButton");
const sizeSlider = document.getElementById("sizeSlider");
const sizeControlButton = document.getElementById("sizeControlButton");
const sizeSliderContainer = document.getElementById("sizeSliderContainer");

// --- Modal Map Toggle ---
const mapButton = document.getElementById("mapButton");
const modalBody = document.getElementById("modalBody");
const modalImageContainer = document.getElementById("modalImageContainer");
let mapDisplayed = false;

if (mapButton) {
  mapButton.addEventListener("click", () => {
    if (!mapDisplayed) {
      const lat = modalImage.dataset.latitude;
      const lon = modalImage.dataset.longitude;
      if (!lat || !lon) {
        alert("No location data available for this camera.");
        return;
      }
      const mapContainer = document.createElement("div");
      mapContainer.id = "modalMapContainer";
      mapContainer.style.flex = "1";
      const iframe = document.createElement("iframe");
      iframe.width = "100%";
      iframe.height = "100%";
      iframe.frameBorder = "0";
      iframe.style.border = "0";
      iframe.src = `https://maps.google.com/maps?q=${lat},${lon}&z=15&t=k&output=embed`;
      mapContainer.appendChild(iframe);
      modalBody.appendChild(mapContainer);
      modalImageContainer.style.flex = "1";
      modalBody.style.display = "flex";
      mapButton.textContent = "Hide Map";
      mapDisplayed = true;
    } else {
      const mapContainer = document.getElementById("modalMapContainer");
      if (mapContainer) modalBody.removeChild(mapContainer);
      modalImageContainer.style.flex = "1";
      mapButton.textContent = "Map";
      mapDisplayed = false;
    }
  });
}

if (imageModalEl) {
  imageModalEl.addEventListener("hidden.bs.modal", () => {
    const mapContainer = document.getElementById("modalMapContainer");
    if (mapContainer) modalBody.removeChild(mapContainer);
    modalImageContainer.style.flex = "1";
    mapButton.textContent = "Map";
    mapDisplayed = false;
  });
}

// --- Utility Functions ---
function debounce(func, delay) {
  return function (...args) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(this, args), delay);
  };
}
function toRadians(deg) {
  return deg * Math.PI / 180;
}

// --- Route Matching Helper ---
function isCameraOnRoute(camera, routeObj) {
  if (!routeObj || !routeObj.name) return false;
  const location = camera.Location || "";
  const parts = location.split("@");
  const routeSegment = parts.length > 1 ? parts[0].trim() : location;
  const pattern = routeObj.name.replace(/[-\s]/g, "[-\\s]*");
  const regex = new RegExp(`\\b${pattern}(?!\\d)`, "i");
  if (!regex.test(routeSegment)) return false;
  const mpMatch = location.match(/(?:MP|Milepost)\s*([\d.]+)/i);
  if (!mpMatch) return false;
  const milepost = parseFloat(mpMatch[1]);
  if (routeObj.mpMin !== undefined && milepost < routeObj.mpMin) return false;
  if (routeObj.mpMax !== undefined && milepost > routeObj.mpMax) return false;
  return true;
}

// --- computeDistance ---
function computeDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- Dropdown Population Functions ---
// Update Region Dropdown based on filtered cameras (excluding region)
function updateRegionDropdown() {
  const available = getFilteredCameras("region");
  const regionsSet = new Set();
  available.forEach(camera => {
    if (camera.Region !== undefined && camera.Region !== null)
      regionsSet.add(camera.Region.toString());
  });
  const regionsArray = Array.from(regionsSet).sort();
  const regionMenu = document.getElementById("regionFilterMenu");
  if (!regionMenu) return;
  regionMenu.innerHTML = "";
  const defaultLi = document.createElement("li");
  const defaultA = document.createElement("a");
  defaultA.classList.add("dropdown-item");
  defaultA.href = "#";
  defaultA.setAttribute("data-value", "");
  defaultA.textContent = "All Regions";
  defaultA.addEventListener("click", (e) => {
    e.preventDefault();
    selectedRegion = "";
    updateCountyDropdown();
    updateCityDropdown();
    updateMaintenanceStationDropdown();
    filterImages();
    const regionOptions = document.getElementById("regionOptions");
    if (regionOptions) {
      const collapseInstance = bootstrap.Collapse.getInstance(regionOptions) || new bootstrap.Collapse(regionOptions, { toggle: false });
      collapseInstance.hide();
    }
  });
  defaultLi.appendChild(defaultA);
  regionMenu.appendChild(defaultLi);
  regionsArray.forEach(region => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.href = "#";
    a.setAttribute("data-value", region);
    a.textContent = region;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      selectedRegion = region;
      updateCountyDropdown();
      updateCityDropdown();
      updateMaintenanceStationDropdown();
      filterImages();
      const regionOptions = document.getElementById("regionOptions");
      if (regionOptions) {
        const collapseInstance = bootstrap.Collapse.getInstance(regionOptions) || new bootstrap.Collapse(regionOptions, { toggle: false });
        collapseInstance.hide();
      }
    });
    li.appendChild(a);
    regionMenu.appendChild(li);
  });
}

function updateCountyDropdown() {
  const available = getFilteredCameras("county");
  const countiesSet = new Set();
  available.forEach(camera => {
    if (camera.CountyBoundary) {
      countiesSet.add(camera.CountyBoundary);
    }
  });
  const countiesArray = Array.from(countiesSet).sort();
  const countyMenu = document.getElementById("countyFilterMenu");
  if (!countyMenu) return;
  countyMenu.innerHTML = "";
  const defaultLi = document.createElement("li");
  const defaultA = document.createElement("a");
  defaultA.classList.add("dropdown-item");
  defaultA.href = "#";
  defaultA.setAttribute("data-value", "");
  defaultA.textContent = "All Counties";
  defaultA.addEventListener("click", (e) => {
    e.preventDefault();
    selectedCounty = "";
    updateCityDropdown();
    updateRegionDropdown();
    updateMaintenanceStationDropdown();
    filterImages();
    const countyOptions = document.getElementById("countyOptions");
    if (countyOptions) {
      const collapseInstance = bootstrap.Collapse.getInstance(countyOptions) || new bootstrap.Collapse(countyOptions, { toggle: false });
      collapseInstance.hide();
    }
  });
  defaultLi.appendChild(defaultA);
  countyMenu.appendChild(defaultLi);
  countiesArray.forEach(county => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.href = "#";
    a.setAttribute("data-value", county);
    a.textContent = county;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      selectedCounty = county;
      updateCityDropdown();
      updateRegionDropdown();
      updateMaintenanceStationDropdown();
      filterImages();
      const countyOptions = document.getElementById("countyOptions");
      if (countyOptions) {
        const collapseInstance = bootstrap.Collapse.getInstance(countyOptions) || new bootstrap.Collapse(countyOptions, { toggle: false });
        collapseInstance.hide();
      }
    });
    li.appendChild(a);
    countyMenu.appendChild(li);
  });
}

function updateCityDropdown() {
  const available = getFilteredCameras("city");
  const citiesSet = new Set();
  available.forEach(camera => {
    if (camera.MunicipalBoundary) {
      citiesSet.add(camera.MunicipalBoundary);
    }
  });
  const citiesArray = Array.from(citiesSet).sort();
  const cityMenu = document.getElementById("cityFilterMenu");
  if (!cityMenu) return;
  cityMenu.innerHTML = "";
  const defaultLi = document.createElement("li");
  const defaultA = document.createElement("a");
  defaultA.classList.add("dropdown-item");
  defaultA.href = "#";
  defaultA.setAttribute("data-value", "");
  defaultA.textContent = "All Cities";
  defaultA.addEventListener("click", (e) => {
    e.preventDefault();
    selectedCity = "";
    updateRegionDropdown();
    updateCountyDropdown();
    updateMaintenanceStationDropdown();
    filterImages();
    const cityOptions = document.getElementById("cityOptions");
    if (cityOptions) {
      const collapseInstance = bootstrap.Collapse.getInstance(cityOptions) || new bootstrap.Collapse(cityOptions, { toggle: false });
      collapseInstance.hide();
    }
  });
  defaultLi.appendChild(defaultA);
  cityMenu.appendChild(defaultLi);
  citiesArray.forEach(city => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.href = "#";
    a.setAttribute("data-value", city);
    a.textContent = city;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      selectedCity = city;
      updateRegionDropdown();
      updateCountyDropdown();
      updateMaintenanceStationDropdown();
      filterImages();
      const cityOptions = document.getElementById("cityOptions");
      if (cityOptions) {
        const collapseInstance = bootstrap.Collapse.getInstance(cityOptions) || new bootstrap.Collapse(cityOptions, { toggle: false });
        collapseInstance.hide();
      }
    });
    li.appendChild(a);
    cityMenu.appendChild(li);
  });
}

function updateMaintenanceStationDropdown() {
  const available = getFilteredCameras("maintenance");
  const stationsSet = new Set();
  available.forEach(camera => {
    const opt1 = camera.MaintenanceStationOption1;
    const opt2 = camera.MaintenanceStationOption2;
    if (opt1 && opt1.toLowerCase() !== "not available") {
      stationsSet.add(opt1);
    }
    if (opt2 && opt2.toLowerCase() !== "not available") {
      stationsSet.add(opt2);
    }
  });
  const stationsArray = Array.from(stationsSet).sort();
  const maintenanceMenu = document.getElementById("maintenanceStationMenu");
  if (!maintenanceMenu) return;
  maintenanceMenu.innerHTML = "";
  const defaultLi = document.createElement("li");
  const defaultA = document.createElement("a");
  defaultA.classList.add("dropdown-item");
  defaultA.href = "#";
  defaultA.setAttribute("data-value", "");
  defaultA.textContent = "All Stations";
  defaultA.addEventListener("click", (e) => {
    e.preventDefault();
    selectedMaintenanceStation = "";
    updateRegionDropdown();
    updateCountyDropdown();
    updateCityDropdown();
    filterImages();
    const maintenanceOptions = document.getElementById("maintenanceOptions");
    if (maintenanceOptions) {
      const collapseInstance = bootstrap.Collapse.getInstance(maintenanceOptions) || new bootstrap.Collapse(maintenanceOptions, { toggle: false });
      collapseInstance.hide();
    }
  });
  defaultLi.appendChild(defaultA);
  maintenanceMenu.appendChild(defaultLi);
  stationsArray.forEach(station => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.href = "#";
    a.setAttribute("data-value", station);
    a.textContent = station;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      selectedMaintenanceStation = station;
      updateRegionDropdown();
      updateCountyDropdown();
      updateCityDropdown();
      filterImages();
      const maintenanceOptions = document.getElementById("maintenanceOptions");
      if (maintenanceOptions) {
        const collapseInstance = bootstrap.Collapse.getInstance(maintenanceOptions) || new bootstrap.Collapse(maintenanceOptions, { toggle: false });
        collapseInstance.hide();
      }
    });
    li.appendChild(a);
    maintenanceMenu.appendChild(li);
  });
}

// --- Selected Filters Display & Reset ---
function updateSelectedFilters() {
  const filtersContainer = document.getElementById("selectedFilters");
  const splash = document.getElementById("splashScreen");
  if (splash && splash.style.display !== 'none') {
    filtersContainer.style.display = "none";
    return;
  }
  filtersContainer.innerHTML = "";
  const badgesContainer = document.createElement("div");
  badgesContainer.className = "badges";
  if (selectedRegion) {
    const regionDiv = document.createElement("div");
    regionDiv.className = "filter-item";
    regionDiv.innerHTML = '<i class="fas fa-map"></i> Region: ' + selectedRegion;
    badgesContainer.appendChild(regionDiv);
  }
  if (selectedCounty) {
    const countyDiv = document.createElement("div");
    countyDiv.className = "filter-item";
    countyDiv.innerHTML = '<i class="fas fa-building"></i> County: ' + selectedCounty;
    badgesContainer.appendChild(countyDiv);
  }
  if (selectedCity) {
    const cityDiv = document.createElement("div");
    cityDiv.className = "filter-item";
    cityDiv.innerHTML = '<i class="fas fa-city"></i> City: ' + selectedCity;
    badgesContainer.appendChild(cityDiv);
  }
  if (selectedMaintenanceStation) {
    const maintDiv = document.createElement("div");
    maintDiv.className = "filter-item";
    maintDiv.innerHTML = '<i class="fas fa-tools"></i> Maintenance: ' + selectedMaintenanceStation;
    badgesContainer.appendChild(maintDiv);
  }
  if (selectedRoute && selectedRoute !== "All") {
    const routeDiv = document.createElement("div");
    routeDiv.className = "filter-item";
    routeDiv.innerHTML = '<i class="fas fa-road"></i> Route: ' + selectedRoute;
    badgesContainer.appendChild(routeDiv);
  }
  if (searchQuery) {
    const searchDiv = document.createElement("div");
    searchDiv.className = "filter-item";
    searchDiv.innerHTML = '<i class="fas fa-search"></i> Search: ' + searchQuery;
    badgesContainer.appendChild(searchDiv);
  }
  filtersContainer.appendChild(badgesContainer);
  const hasFilters = selectedRegion || selectedCounty || selectedCity ||
                     selectedMaintenanceStation || (selectedRoute && selectedRoute !== "All") || searchQuery;
  if (hasFilters) {
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "action-buttons";
    const resetButton = document.createElement("button");
    resetButton.innerHTML = '<i class="fas fa-undo"></i>';
    resetButton.title = "Reset Filters";
    resetButton.classList.add("reset-button");
    resetButton.addEventListener("click", resetFilters);
    buttonContainer.appendChild(resetButton);
    const copyButton = document.createElement("button");
    copyButton.innerHTML = '<i class="fas fa-link"></i>';
    copyButton.title = "Copy Link";
    copyButton.classList.add("reset-button");
    copyButton.addEventListener("click", (e) => {
      e.preventDefault();
      copyURLToClipboard();
    });
    buttonContainer.appendChild(copyButton);
    filtersContainer.appendChild(buttonContainer);
    filtersContainer.style.display = "flex";
  } else {
    filtersContainer.style.display = "none";
  }
}

function resetFilters() {
  selectedRegion = "";
  selectedCounty = "";
  selectedCity = "";
  selectedRoute = "All";
  selectedMaintenanceStation = "";
  searchQuery = "";
  if (searchInput) {
    searchInput.value = "";
  }
  updateRegionDropdown();
  updateCountyDropdown();
  updateCityDropdown();
  updateMaintenanceStationDropdown();
  if (localStorage.getItem('locationAllowed') === 'true') {
    autoSortByLocation();
  } else {
    filterImages();
  }
  updateSelectedFilters();
  updateURLParameters();
}

// --- Route Options ---
function updateRouteOptions() {
  routeFilterMenu.innerHTML = "";
  const defaultLi = document.createElement("li");
  const defaultA = document.createElement("a");
  defaultA.classList.add("dropdown-item");
  defaultA.href = "#";
  defaultA.setAttribute("data-value", "All");
  defaultA.textContent = "All Routes";
  defaultA.addEventListener("click", (e) => {
    e.preventDefault();
    selectedRoute = "All";
    filterImages();
  });
  defaultLi.appendChild(defaultA);
  routeFilterMenu.appendChild(defaultLi);
  curatedRoutes.forEach(route => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.classList.add("dropdown-item");
    a.href = "#";
    const routeLabel = route.displayName || route.name;
    a.setAttribute("data-value", routeLabel);
    a.textContent = routeLabel;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      selectedRoute = routeLabel;
      filterImages();
    });
    li.appendChild(a);
    routeFilterMenu.appendChild(li);
  });
}

// --- Gallery Rendering Functions ---
function renderGallery(cameras) {
  galleryContainer.innerHTML = "";
  cameras.forEach((camera, index) => {
    const col = document.createElement("div");
    col.classList.add("col");
    const aspectBox = document.createElement("div");
    aspectBox.classList.add("aspect-ratio-box");
    const anchor = document.createElement("a");
    anchor.href = "#";
    anchor.setAttribute("data-bs-toggle", "modal");
    anchor.setAttribute("data-bs-target", "#imageModal");
    anchor.addEventListener("click", (e) => {
      e.preventDefault();
      showImage(index);
    });
    const image = document.createElement("img");
    image.setAttribute("loading", "lazy");
    image.src = camera.Views[0].Url;
    image.alt = `Camera at ${camera.Location}`;
    anchor.appendChild(image);
    aspectBox.appendChild(anchor);
    col.appendChild(aspectBox);
    galleryContainer.appendChild(col);
  });
}

function updateCameraCount() {
  cameraCountElement.innerHTML = `${visibleCameras.length}`;
}

function showImage(index) {
  const prevSelected = document.querySelector(".aspect-ratio-box.selected");
  if (prevSelected) prevSelected.classList.remove("selected");
  currentIndex = index;
  const camera = visibleCameras[index];
  modalImage.src = camera.Views[0].Url;
  modalTitle.textContent = camera.Location;
  modalImage.dataset.latitude = camera.Latitude;
  modalImage.dataset.longitude = camera.Longitude;
  const selectedBox = galleryContainer.children[index].querySelector(".aspect-ratio-box");
  if (selectedBox) selectedBox.classList.add("selected");
}

// --- Main Filtering ---
function filterImages() {
  const routeObj = selectedRoute !== "All"
    ? curatedRoutes.find(route => (route.displayName || route.name) === selectedRoute)
    : null;
  visibleCameras = camerasList.filter(camera => {
    const searchableText = ((camera.SignalID !== undefined ? camera.SignalID.toString() : "") + " " + (camera.Location || "")).toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = query.length === 0 || searchableText.includes(query);
    const matchesMaintenance =
      !selectedMaintenanceStation ||
      ((camera.MaintenanceStationOption1 && camera.MaintenanceStationOption1.toLowerCase() !== "not available" && camera.MaintenanceStationOption1 === selectedMaintenanceStation) ||
       (camera.MaintenanceStationOption2 && camera.MaintenanceStationOption2.toLowerCase() !== "not available" && camera.MaintenanceStationOption2 === selectedMaintenanceStation));
    let matchesRoute = true;
    if (routeObj) {
      if (routeObj.routes && Array.isArray(routeObj.routes)) {
        matchesRoute = routeObj.routes.some(subRoute => isCameraOnRoute(camera, subRoute));
      } else {
        matchesRoute = isCameraOnRoute(camera, routeObj);
      }
    }
    const matchesRegion = !selectedRegion || (camera.Region && camera.Region.toString() === selectedRegion);
    const matchesCounty = !selectedCounty || (camera.CountyBoundary && camera.CountyBoundary === selectedCounty);
    const matchesCity = !selectedCity || (camera.MunicipalBoundary && camera.MunicipalBoundary === selectedCity);
    return matchesSearch && matchesMaintenance && matchesRoute && matchesRegion && matchesCounty && matchesCity;
  });
  updateCameraCount();
  renderGallery(visibleCameras);
  currentIndex = 0;
  updateSelectedFilters();
  updateURLParameters();
}

// --- Nearest Cameras Feature ---
function setupNearestCameraButton() {
  if (nearestButton) {
    nearestButton.addEventListener("click", () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            localStorage.setItem('locationAllowed', 'true');
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            const camerasWithDistance = camerasList.map(camera => ({
              camera,
              distance: computeDistance(userLat, userLng, camera.Latitude, camera.Longitude)
            }));
            camerasWithDistance.sort((a, b) => a.distance - b.distance);
            visibleCameras = camerasWithDistance.map(item => item.camera);
            updateCameraCount();
            renderGallery(visibleCameras);
            currentIndex = 0;
            showImage(0);
            updateSelectedFilters();
            updateURLParameters();
          },
          (error) => {
            alert("Error getting your location: " + error.message);
          }
        );
      } else {
        alert("Geolocation is not supported by your browser.");
      }
    });
  }
}

// --- Auto-Sort by Location ---
function autoSortByLocation() {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        localStorage.setItem('locationAllowed', 'true');
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const camerasWithDistance = camerasList.map(camera => ({
          camera,
          distance: computeDistance(userLat, userLng, camera.Latitude, camera.Longitude)
        }));
        camerasWithDistance.sort((a, b) => a.distance - b.distance);
        visibleCameras = camerasWithDistance.map(item => item.camera);
        updateCameraCount();
        renderGallery(visibleCameras);
        currentIndex = 0;
        updateSelectedFilters();
        updateURLParameters();
      },
      (error) => {
        console.error("Location not granted or error:", error);
        renderGallery(visibleCameras);
      }
    );
  }
}

// --- Refresh Button ---
function setupRefreshButton() {
  if (refreshButton) {
    refreshButton.addEventListener("click", (event) => {
      event.preventDefault();
      const images = galleryContainer.querySelectorAll("img");
      images.forEach(img => {
        let originalUrl = img.getAttribute("data-original-src");
        if (!originalUrl) {
          originalUrl = img.src;
          img.setAttribute("data-original-src", originalUrl);
        }
        originalUrl = originalUrl.split("&refresh=")[0].split("?refresh=")[0];
        const separator = originalUrl.includes('?') ? '&' : '?';
        img.src = originalUrl + separator + "refresh=" + Date.now();
      });
    });
  }
}

// --- Link Dropdown Items to Modals ---
document.querySelectorAll('[data-modal]').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const modalId = item.getAttribute('data-modal');
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
  });
});

// --- Image Size Slider ---
if (sizeControlButton && sizeSliderContainer) {
  sizeControlButton.addEventListener("click", (e) => {
    e.stopPropagation();
    sizeSliderContainer.classList.toggle("active");
    setTimeout(() => {
      sizeSliderContainer.classList.remove("active");
    }, 3000);
  });
}
if (sizeSlider) {
  sizeSlider.addEventListener("input", () => {
    const sliderValue = parseInt(sizeSlider.value, 10);
    const newSize = Math.max(sliderValue, MIN_IMAGE_SIZE);
    galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${newSize}px, 1fr))`;
    clearTimeout(sizeSlider.autoHideTimeout);
    sizeSlider.autoHideTimeout = setTimeout(() => {
      sizeSliderContainer.classList.remove("active");
    }, 3000);
  });
}
document.addEventListener("click", (e) => {
  if (!sizeControlButton.contains(e.target) && !sizeSliderContainer.contains(e.target)) {
    sizeSliderContainer.classList.remove("active");
  }
});

// --- Pinch-to-Zoom for Gallery ---
let initialGridDistance = null;
let initialGridSize = parseInt(sizeSlider.value, 10) || 120;
galleryContainer.style.touchAction = "pan-y pinch-zoom";
galleryContainer.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    initialGridDistance = getDistance(e.touches[0], e.touches[1]);
    initialGridSize = parseInt(sizeSlider.value, 10) || 120;
  }
}, { passive: false });
galleryContainer.addEventListener("touchmove", (e) => {
  if (e.touches.length === 2 && initialGridDistance) {
    e.preventDefault();
    const currentGridDistance = getDistance(e.touches[0], e.touches[1]);
    const scaleFactor = currentGridDistance / initialGridDistance;
    let newGridSize = Math.round(initialGridSize * scaleFactor);
    newGridSize = Math.max(MIN_IMAGE_SIZE, Math.min(newGridSize, parseInt(sizeSlider.max, 10) || 380));
    sizeSlider.value = newGridSize;
    galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${newGridSize}px, 1fr))`;
  }
}, { passive: false });
galleryContainer.addEventListener("touchend", (e) => {
  if (e.touches.length < 2) {
    initialGridDistance = null;
  }
}, { passive: true });
function getDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Search Input Listener ---
if (searchInput) {
  searchInput.addEventListener("input", debounce((e) => {
    searchQuery = e.target.value;
    filterImages();
  }, DEBOUNCE_DELAY));
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      let instance = bootstrap.Dropdown.getInstance(document.getElementById("searchDropdownButton"));
      if (instance) {
        instance.hide();
      }
    }
  });
}

document.getElementById('filterDropdownButton').parentElement.addEventListener('hide.bs.dropdown', () => {
  const collapseElements = document.querySelectorAll('#regionOptions, #countyOptions, #cityOptions, #maintenanceOptions');
  collapseElements.forEach(elem => {
    let collapseInstance = bootstrap.Collapse.getInstance(elem);
    if (!collapseInstance) {
      collapseInstance = new bootstrap.Collapse(elem, { toggle: false });
    }
    collapseInstance.hide();
  });
});

// --- Main Initialization & Splash Setup ---
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  setupNearestCameraButton();
  setupRefreshButton();
  
  const splash = document.getElementById('splashScreen');
  if (splash) {
    let desktopVideo = document.getElementById('desktopVideo');
    if (desktopVideo && getComputedStyle(desktopVideo).display !== 'none') {
      const videos = splash.querySelectorAll('video');
      videos.forEach(video => {
        video.addEventListener('playing', () => {
          setTimeout(fadeOutSplash, 2300);
        });
      });
    } else {
      setTimeout(fadeOutSplash, 2000);
    }
  }
});
