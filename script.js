// Wrap everything in an async IIFE so we can await the fetch
(async function() {
  'use strict';

  // --- Constants ---
  const DEBOUNCE_DELAY = 300;
  const LEFT_COUNT = 10;
  const RIGHT_COUNT = 10;

  // --- Fetch cameras JSON from external file ---
  let camerasList = [];
  try {
    const response = await fetch('cameras.json');
    const data = await response.json();
    camerasList = data.CamerasList.filter(camera => !(camera.Latitude === 0.0 && camera.Longitude === 0.0));
  } catch(e) {
    console.error('Error fetching cameras JSON:', e);
  }

  // Global array to store the cameras that pass the filters
  let visibleCameras = [];

  // --- Mappings & Data (same as original) ---
  const cityFullNames = {
    "ALP": "Alpine",
    "ALT": "Alta",
    "ALM": "Altamont",
    "ALN": "Alton",
    "AMG": "Amalga",
    "AFK": "American Fork",
    "ANB": "Annabella",
    "ANT": "Antimony",
    "APV": "Apple Valley",
    "ARA": "Aurora",
    "BAL": "Ballard",
    "BRV": "Bear River",
    "BVR": "Beaver",
    "BRL": "Beryl",
    "BKL": "Bicknell",
    "BGW": "Big Water",
    "BLA": "Blanding",
    "BMT": "Bloomington",
    "BLF": "Bluffdale",
    "BLD": "Boulder",
    "BTF": "Bountiful",
    "BTN": "Brighton",
    "BHD": "Brian Head",
    "BRC": "Brigham City",
    "BCC": "Bryce Canyon City"
    // ... additional mappings as needed
  };

  const regionCities = {
    "Region 1": ["AMG","BRV","BTF","BRC","CVL","CLK","CFD","CTN","CRN","CNS","ELW","FRM","FRW","FLD","FRU","GRC","GAR","HRV","HYV","HPR","HWL","HTV","HYD","HYR","KAY","LKT","LTN","LEW","LGN","MTU","MSV","MDN","MLV","MGN","NTN","NIB","NLG","NOG","NSL","OGD","PDS","PRY","PLC","PLV","PLY","PTG","PVD","RAN","RMD","RHT","RDL","ROY","SMF","SNO","SOG","SWE","SUN","SYR","TRE","TNT","UIN","VAL","WTE","WVL","WBN","WHV","WPT","WIL","WDF","WXS","BE","CA","RI","WB","MN","DA"],
    "Region 2": ["ALT","BLF","CNR","CLV","CWH","CWW","DPR","DUG","EMC","ERD","FRA","GNT","GVL","HFR","HRR","HDY","KMS","KRN","LKP","MAG","MDV","MCK","MTO","MUR","OKY","OPH","OQR","PKC","RVT","RVY","SLC","SND","SJO","SSL","STP","STO","TAY","TLE","UNI","VRN","WEN","WJD","WVC","WHC","SU","SL","TE"],
    "Region 3": ["ALP","ALM","AFK","BAL","CDF","CDH","CHR","DAN","DCH","EAG","ELK","EUR","FRF","FTD","GEN","GOS","HBR","HLD","KTY","LHI","LVN","LDN","MAE","MNL","MPL","MWY","MNA","MYT","NPL","NEO","NPH","ORM","PSN","PLG","PVO","RDT","RKR","RSV","STQ","SSP","SOL","SPF","SPV","TAB","THI","VNL","VIN","WBG","WRK","WLH","JU","UT","WA","DU","UN","DG"],
    "Region 4": ["ALN","ANB","ANT","APV","ARA","BVR","BRL","BKL","BGW","BLA","BMT","BLD","BHD","BCC","CNV","CDL","CVY","CDC","CNF","CEV","CRV","CLW","CVD","DLT","ECB","EMO","ELS","EMR","ENO","ENT","EPH","ESC","FRV","FAY","FRN","FIL","FOU","GDL","GWD","GRR","GUN","HKV","HAT","HLP","HNV","HIA","HDL","HKY","HDN","HTN","HRC","IVN","JSP","JCT","KNB","KRV","KSH","KNG","KOO","LVR","LMT","LED","LOA","LUN","LYM","LDL","MTI","MRV","MAY","MDW","MXH","MFD","MRV","MAB","MRO","MZC","MNC","MRN","MCR","MCJ","MTP","NCL","NHR","OAC","OGV","ODV","PNG","PGH","PWN","PRC","RED","RFD","RKV","SLA","SCL","SCP","SCO","SIG","SPC","SDL","STG","STE","SMT","SNY","TOQ","TOR","TRO","VEY","VRG","WAL","WAS","WTN","MD","SJ","CC","GR","EM","SE","BV","PT","SJ","RN","GA","WN","KN","WE","SP"]
  };

  // --- Load Curated Routes from external file ---
  let curatedRoutes = [];
  try {
    const response = await fetch('routes.json');
    curatedRoutes = await response.json();
  } catch(e) {
    console.error('Error fetching routes:', e);
  }
  const defaultRoute = "All";

  // --- DOM Elements ---
  const galleryContainer = document.getElementById("imageGallery");
  const modalImage = document.getElementById("modalImage");
  const modalTitle = document.querySelector(".modal-title");
  const cameraCountElement = document.getElementById("cameraCount");
  const cityFilterDropdown = document.getElementById("cityFilter");
  const regionFilterDropdown = document.getElementById("regionFilter");
  const routeFilterDropdown = document.getElementById("routeFilter");
  const imageSizeRange = document.getElementById("imageSizeRange");
  const cameraSearchInput = document.getElementById("cameraSearch");
  const itsOnlyCheckbox = document.getElementById("itsOnly");

  const prevImageBtn = document.getElementById("prevImageBtn");
  const nextImageBtn = document.getElementById("nextImageBtn");
  const openInNewTabBtn = document.getElementById("openInNewTabBtn");
  const googleMapsLink = document.getElementById("googleMapsLink");
  const udotTrafficLink = document.getElementById("udotTrafficLink");
  const thumbnailContainer = document.getElementById("thumbnailContainer");

  let currentIndex = 0;
  let itsOnly = false;
  let debounceTimer;

  // --- Utility: Debounce Function ---
  function debounce(func, delay) {
    return function(...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
  }

  // --- Splash Screen Button Handlers ---
  const btnFiltered = document.getElementById("btnFiltered");
  const btnAll = document.getElementById("btnAll");
  const splash = document.getElementById("splash");
  const headerControls = document.getElementById("headerControls");
  const gallerySection = document.getElementById("gallerySection");

  btnFiltered.addEventListener("click", () => {
    // For example, set a default filter (adjust as needed)
    routeFilterDropdown.value = "US-89/91 (Sardine Canyon)";
    hideSplashAndLoadGallery();
  });

  btnAll.addEventListener("click", () => {
    routeFilterDropdown.value = "All";
    hideSplashAndLoadGallery();
  });

  function hideSplashAndLoadGallery() {
    splash.style.display = "none";
    headerControls.style.display = "flex";
    gallerySection.style.display = "block";
    filterImages();
  }

  // --- Populate Dropdowns ---
  function updateRouteOptions() {
    routeFilterDropdown.innerHTML = '<option value="All">All Routes</option>';
    curatedRoutes.forEach(route => {
      const option = document.createElement("option");
      option.value = route.name;
      option.textContent = route.name;
      routeFilterDropdown.appendChild(option);
    });
    routeFilterDropdown.value = defaultRoute;
  }
  updateRouteOptions();

  function populateRegionOptions() {
    Object.keys(regionCities).forEach(region => {
      const option = document.createElement("option");
      option.value = region;
      option.textContent = region;
      regionFilterDropdown.appendChild(option);
    });
    regionFilterDropdown.value = "";
  }
  populateRegionOptions();

  const cities = camerasList.map(camera => camera.Location.split(",").pop().trim());
  const uniqueCities = [...new Set(cities.filter(city => city.length <= 4))];

  function updateCityOptions() {
    const regionValue = regionFilterDropdown.value;
    let filteredCities = uniqueCities;
    if (regionValue && regionCities[regionValue]) {
      filteredCities = uniqueCities.filter(city => regionCities[regionValue].includes(city));
    }
    cityFilterDropdown.innerHTML = '<option value="">All</option>';
    filteredCities.sort().forEach(city => {
      const option = document.createElement("option");
      option.value = city;
      const fullName = cityFullNames[city] || "";
      option.textContent = fullName ? `${city} (${fullName})` : city;
      cityFilterDropdown.appendChild(option);
    });
  }
  updateCityOptions();

  // --- Event Listeners for Filters ---
  regionFilterDropdown.addEventListener("change", () => {
    updateCityOptions();
    filterImages();
  });
  cityFilterDropdown.addEventListener("change", filterImages);
  routeFilterDropdown.addEventListener("change", filterImages);
  itsOnlyCheckbox.addEventListener("change", () => {
    itsOnly = itsOnlyCheckbox.checked;
    filterImages();
  });
  cameraSearchInput.addEventListener("input", debounce(filterImages, DEBOUNCE_DELAY));
  imageSizeRange.addEventListener("input", () => changeImageSize(imageSizeRange.value));

  cameraCountElement.addEventListener("click", () => {
    const versionModalEl = document.getElementById("versionModal");
    const versionModalInstance = new bootstrap.Modal(versionModalEl);
    versionModalInstance.show();
  });

  // --- Build Image Gallery ---
  function createImageElements() {
    galleryContainer.innerHTML = "";
    camerasList.forEach((camera, index) => {
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
      image.src = camera.Views[0].Url;
      image.alt = `Camera at ${camera.Location}`;
      anchor.appendChild(image);
      aspectBox.appendChild(anchor);
      col.appendChild(aspectBox);
      galleryContainer.appendChild(col);
    });
  }
  createImageElements();
  filterImages();

  function updateCameraCount() {
    cameraCountElement.innerHTML = `${visibleCameras.length}`;
  }

  function filterImages() {
    visibleCameras = camerasList.filter(camera => {
      const city = camera.Location.split(",").pop().trim();
      const matchesCity = !cityFilterDropdown.value || city === cityFilterDropdown.value;
      const matchesRegion = !regionFilterDropdown.value || (regionCities[regionFilterDropdown.value] && regionCities[regionFilterDropdown.value].includes(city));
      const matchesSearch = camera.Location.toLowerCase().includes(cameraSearchInput.value.toLowerCase());
      const description = camera.Views[0].Description.toLowerCase();
      const matchesITSOnly = !itsOnly || !description.includes("rwis");
      let routeMatches = true;
      if (routeFilterDropdown.value !== "All") {
        const routeObj = curatedRoutes.find(route => route.name === routeFilterDropdown.value);
        if (routeObj) {
          routeMatches = routeObj.locations.includes(camera.Location);
        }
      }
      return matchesCity && matchesRegion && matchesSearch && matchesITSOnly && routeMatches;
    });
    updateCameraCount();
    renderGallery(visibleCameras);
    currentIndex = 0;
    buildCarousel();
  }

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
      image.src = camera.Views[0].Url;
      image.alt = `Camera at ${camera.Location}`;
      anchor.appendChild(image);
      aspectBox.appendChild(anchor);
      col.appendChild(aspectBox);
      galleryContainer.appendChild(col);
    });
  }

  function changeImageSize(minWidth) {
    galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${minWidth}px, 1fr))`;
  }
  changeImageSize(imageSizeRange.value);

  function getVisibleImageIndices() {
    const cols = Array.from(document.querySelectorAll("#imageGallery .col"));
    return cols.map((col, idx) => idx);
  }

  function showImage(index) {
    const prevSelected = document.querySelector(".aspect-ratio-box.selected");
    if(prevSelected) prevSelected.classList.remove("selected");
    currentIndex = index;
    const camera = visibleCameras[index];
    modalImage.src = camera.Views[0].Url;
    modalTitle.textContent = camera.Location;
    const selectedBox = galleryContainer.children[index].querySelector(".aspect-ratio-box");
    if(selectedBox) selectedBox.classList.add("selected");
    buildCarousel();
  }

  function buildCarousel() {
    thumbnailContainer.innerHTML = "";
    const visibleImages = getVisibleImageIndices();
    if(visibleImages.length === 0) return;
    const totalVisible = visibleImages.length;
    const desiredWindow = LEFT_COUNT + 1 + RIGHT_COUNT;
    const windowSize = Math.min(totalVisible, desiredWindow);
    let currentVisibleIndex = visibleImages.indexOf(currentIndex);
    if(currentVisibleIndex === -1) currentVisibleIndex = 0;
    const start = (((currentVisibleIndex - LEFT_COUNT) % totalVisible) + totalVisible) % totalVisible;
    const carouselIndices = [];
    for(let i = 0; i < windowSize; i++){
      const idx = (start + i) % totalVisible;
      carouselIndices.push(visibleImages[idx]);
    }
    carouselIndices.forEach(camIdx => {
      const camera = visibleCameras[camIdx];
      const thumbImg = document.createElement("img");
      thumbImg.src = camera.Views[0].Url;
      thumbImg.alt = `Thumbnail for ${camera.Location}`;
      thumbImg.style.height = "70px";
      thumbImg.style.width = "auto";
      thumbImg.style.objectFit = "contain";
      thumbImg.style.border = "2px solid transparent";
      thumbImg.style.borderRadius = "4px";
      thumbImg.style.cursor = "pointer";
      thumbImg.draggable = false;
      thumbImg.style.userSelect = "none";
      if(camIdx === currentIndex) {
        thumbImg.style.border = "2px solid orange";
        thumbImg.classList.add("selected-carousel");
      }
      thumbImg.addEventListener("click", () => showImage(camIdx));
      thumbnailContainer.appendChild(thumbImg);
    });
    const selectedThumb = thumbnailContainer.querySelector("img.selected-carousel");
    if(selectedThumb) {
      centerThumbnail(thumbnailContainer, selectedThumb);
    }
  }

  function centerThumbnail(container, thumb) {
    const containerWidth = container.offsetWidth;
    const thumbLeft = thumb.offsetLeft;
    const thumbWidth = thumb.offsetWidth;
    const scrollPos = thumbLeft - (containerWidth / 2) + (thumbWidth / 2);
    container.scroll({ left: scrollPos, behavior: "smooth" });
  }

  function showNextImage() {
    const visibleImages = getVisibleImageIndices();
    if(visibleImages.length === 0) return;
    const currentVisibleIndex = visibleImages.indexOf(currentIndex);
    if(currentVisibleIndex === -1) return;
    const nextIndex = (currentVisibleIndex + 1) % visibleImages.length;
    showImage(visibleImages[nextIndex]);
  }
  function showPreviousImage() {
    const visibleImages = getVisibleImageIndices();
    if(visibleImages.length === 0) return;
    const currentVisibleIndex = visibleImages.indexOf(currentIndex);
    if(currentVisibleIndex === -1) return;
    const prevIndex = (currentVisibleIndex - 1 + visibleImages.length) % visibleImages.length;
    showImage(visibleImages[prevIndex]);
  }

  function openGoogleMaps() {
    const camera = visibleCameras[currentIndex];
    const googleMapsUrl = `https://www.google.com/maps?q=${camera.Latitude},${camera.Longitude}`;
    window.open(googleMapsUrl, "_blank");
  }
  function openUdotTraffic() {
    const camera = visibleCameras[currentIndex];
    const udotTrafficUrl = `https://www.udottraffic.utah.gov/map/#camera-${camera.Id}`;
    window.open(udotTrafficUrl, "_blank");
  }
  function openImageInNewTab() {
    window.open(modalImage.src, "_blank");
  }

  document.addEventListener("keydown", (event) => {
    const modalIsOpen = document.querySelector("#imageModal.show");
    if(!modalIsOpen) return;
    if(event.key === "ArrowLeft") showPreviousImage();
    else if(event.key === "ArrowRight") showNextImage();
    else if(event.key === "Escape") {
      const modal = bootstrap.Modal.getInstance(document.getElementById("imageModal"));
      if(modal) modal.hide();
    }
  });

  prevImageBtn.addEventListener("click", showPreviousImage);
  nextImageBtn.addEventListener("click", showNextImage);
  openInNewTabBtn.addEventListener("click", openImageInNewTab);
  googleMapsLink.addEventListener("click", (e) => { e.preventDefault(); openGoogleMaps(); });
  udotTrafficLink.addEventListener("click", (e) => { e.preventDefault(); openUdotTraffic(); });

})();
