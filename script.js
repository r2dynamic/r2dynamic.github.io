(function() {
  'use strict';

  // --- Constants ---
  const DEBOUNCE_DELAY = 300;
  const LEFT_COUNT = 10;
  const RIGHT_COUNT = 10;

  // --- Sample JSON Data (expand as needed) ---
  const jsonResponse = JSON.stringify({
    "CamerasList": [
      {"Id":8419,"Source":"ADX","Roadway":"I-215","Direction":"North","Latitude":40.64836,"Longitude":-111.80766,"Location":"I-215 E NB @ 5650 S / MP 5.59, HDY","Views":[{"Id":8419,"Url":"https://www.udottraffic.utah.gov/map/Cctv/8419","Status":"Enabled","Description":"I-215 E NB @ 5650 S / MP 5.59, HDY"}]},
      {"Id":8420,"Source":"ADX","Roadway":"I-215","Direction":"North","Latitude":40.63451,"Longitude":-111.81117,"Location":"I-215 E NB @ 6400 S / MP 6.56, CWH","Views":[{"Id":8420,"Url":"https://www.udottraffic.utah.gov/map/Cctv/8420","Status":"Enabled","Description":"I-215 E NB @ 6400 S / MP 6.56, CWH"}]},
      {"Id":8421,"Source":"ADX","Roadway":"I-215","Direction":"West","Latitude":40.63472,"Longitude":-111.82453,"Location":"I-215 S WB @ 2300 E / MP 7.25, HDY","Views":[{"Id":8421,"Url":"https://www.udottraffic.utah.gov/map/Cctv/8419","Status":"Enabled","Description":"I-215 S WB @ 2300 E / MP 7.25, HDY"}]},
      {"Id":8422,"Source":"ADX","Roadway":"Unknown","Direction":"East","Latitude":40.63153,"Longitude":-111.88975,"Location":"I-215 S EB @ State St / US-89 / MP 10.66, MUR","Views":[{"Id":8422,"Url":"https://www.udottraffic.utah.gov/map/Cctv/8422","Status":"Enabled","Description":"I-215 S EB @ State St / US-89 / MP 10.66, MUR"}]}
    ]
  });
  const camerasList = JSON.parse(jsonResponse).CamerasList.filter(camera => !(camera.Latitude === 0.0 && camera.Longitude === 0.0));

  // --- Mappings & Data ---
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
    // ... add additional mappings as needed
  };

  const regionCities = {
    "Region 1": ["AMG","BRV","BTF","BRC","CVL","CLK","CFD","CTN","CRN","CNS","ELW","FRM","FRW","FLD","FRU","GRC","GAR","HRV","HYV","HPR","HWL","HTV","HYD","HYR","KAY","LKT","LTN","LEW","LGN","MTU","MSV","MDN","MLV","MGN","NTN","NIB","NLG","NOG","NSL","OGD","PDS","PRY","PLC","PLV","PLY","PTG","PVD","RAN","RMD","RHT","RDL","ROY","SMF","SNO","SOG","SWE","SUN","SYR","TRE","TNT","UIN","VAL","WTE","WVL","WBN","WHV","WPT","WIL","WDF","WXS","BE","CA","RI","WB","MN","DA"],
    "Region 2": ["ALT","BLF","CNR","CLV","CWH","CWW","DPR","DUG","EMC","ERD","FRA","GNT","GVL","HFR","HRR","HDY","KMS","KRN","LKP","MAG","MDV","MCK","MTO","MUR","OKY","OPH","OQR","PKC","RVT","RVY","SLC","SND","SJO","SSL","STP","STO","TAY","TLE","UNI","VRN","WEN","WJD","WVC","WHC","SU","SL","TE"],
    "Region 3": ["ALP","ALM","AFK","BAL","CDF","CDH","CHR","DAN","DCH","EAG","ELK","EUR","FRF","FTD","GEN","GOS","HBR","HLD","KTY","LHI","LVN","LDN","MAE","MNL","MPL","MWY","MNA","MYT","NPL","NEO","NPH","ORM","PSN","PLG","PVO","RDT","RKR","RSV","STQ","SSP","SOL","SPF","SPV","TAB","THI","VNL","VIN","WBG","WRK","WLH","JU","UT","WA","DU","UN","DG"],
    "Region 4": ["ALN","ANB","ANT","APV","ARA","BVR","BRL","BKL","BGW","BLA","BMT","BLD","BHD","BCC","CNV","CDL","CVY","CDC","CNF","CEV","CRV","CLW","CVD","DLT","ECB","EMO","ELS","EMR","ENO","ENT","EPH","ESC","FRV","FAY","FRN","FIL","FOU","GDL","GWD","GRR","GUN","HKV","HAT","HLP","HNV","HIA","HDL","HKY","HDN","HTN","HRC","IVN","JSP","JCT","KNB","KRV","KSH","KNG","KOO","LVR","LMT","LED","LOA","LUN","LYM","LDL","MTI","MRV","MAY","MDW","MXH","MFD","MRV","MAB","MRO","MZC","MNC","MRN","MCR","MCJ","MTP","NCL","NHR","OAC","OGV","ODV","PNG","PGH","PWN","PRC","RED","RFD","RKV","SLA","SCL","SCP","SCO","SIG","SPC","SDL","STG","STE","SMT","SNY","TOQ","TOR","TRO","VEY","VRG","WAL","WAS","WTN","MD","SJ","CC","GR","EM","SE","BV","PT","SJ","RN","GA","WN","KN","WE","SP"]
  };

  const curatedRoutes = [
    {
      name: "Big Cottonwood Cyn",
      locations: [
        "Wasatch Blvd / SR-190/SR-210 @ Big Cottonwood Canyon Rd / Fort Union Blvd / SR-190, CWH",
        "Big Cottonwood Canyon Rd / SR-190 @ Dogwood / MP 4.1, SL",
        "Big Cottonwood Canyon Rd / SR-190 @ S-Curves / MP 6.38, SL",
        "Big Cottonwood Canyon Rd / SR-190 @ Butler / MP 10, SL",
        "Big Cottonwood Canyon Rd / SR-190 @ Cardiff Fork / MP 10.74, SL",
        "Big Cottonwood Canyon Rd / SR-190 @ Silver Fork / MP 12.54, SL",
        "Big Cottonwood Canyon Rd / SR-190 @ Solitude / MP 14.53, SL",
        "Big Cottonwood Canyon Rd / SR-190 @ Brighton / MP 16.07, BTN"
      ]
    },
    {
      name: "More Coming soon",
      locations: [
        "500 W / US-89 @ Center St / SR-114, PVO",
        "Redwood Rd / SR-68 @ 3100 S, WVC",
        "State St / US-89 @ 4500 S / SR-266, MUR",
        "Bangerter Hwy / SR-154 @ 3100 S, WVC"
      ]
    }
  ];
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

  // --- Intersection Observer for Lazy Loading ---
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  const lazyLoadObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if(entry.isIntersecting) {
        const img = entry.target;
        if(img.dataset.src) {
          img.src = img.dataset.src;
          img.onload = () => img.classList.add('loaded');
          observer.unobserve(img);
        }
      }
    });
  }, observerOptions);

  // --- Utility: Debounce Function ---
  function debounce(func, delay) {
    return function(...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(this, args), delay);
    };
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

  // Extract unique cities from camera data (using the last comma-separated part)
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
      image.dataset.src = camera.Views[0].Url; // Use data-src for lazy loading
      image.alt = `Camera at ${camera.Location}`;
      image.loading = "lazy";

      // Add a spinner until the image loads
      const spinner = document.createElement("div");
      spinner.className = "spinner";
      aspectBox.appendChild(spinner);

      anchor.appendChild(image);
      aspectBox.appendChild(anchor);
      col.appendChild(aspectBox);
      galleryContainer.appendChild(col);

      lazyLoadObserver.observe(image);
    });
  }
  createImageElements();

  // --- Update Camera Count ---
  function updateCameraCount() {
    const filteredCameras = camerasList.filter(camera => {
      const city = camera.Location.split(",").pop().trim();
      const matchesCity = !cityFilterDropdown.value || city === cityFilterDropdown.value;
      const matchesRegion = !regionFilterDropdown.value || (regionCities[regionFilterDropdown.value] && regionCities[regionFilterDropdown.value].includes(city));
      const matchesSearch = camera.Location.toLowerCase().includes(cameraSearchInput.value.toLowerCase());
      const description = camera.Views[0].Description.toLowerCase();
      const matchesITSOnly = !itsOnly || !description.includes("rwis");
      let routeMatches = true;
      if(routeFilterDropdown.value !== "All") {
        const routeObj = curatedRoutes.find(route => route.name === routeFilterDropdown.value);
        if(routeObj) {
          routeMatches = routeObj.locations.includes(camera.Location);
        }
      }
      return matchesCity && matchesRegion && matchesSearch && matchesITSOnly && routeMatches;
    });
    cameraCountElement.textContent = `${filteredCameras.length}`;
  }

  // --- Filter Images ---
  function filterImages() {
    const images = document.querySelectorAll("#imageGallery .col");
    images.forEach((col, index) => {
      const camera = camerasList[index];
      const city = camera.Location.split(",").pop().trim();
      const matchesCity = !cityFilterDropdown.value || city === cityFilterDropdown.value;
      const matchesRegion = !regionFilterDropdown.value || (regionCities[regionFilterDropdown.value] && regionCities[regionFilterDropdown.value].includes(city));
      const matchesSearch = camera.Location.toLowerCase().includes(cameraSearchInput.value.toLowerCase());
      const description = camera.Views[0].Description.toLowerCase();
      const matchesITSOnly = !itsOnly || !description.includes("rwis");
      let routeMatches = true;
      if(routeFilterDropdown.value !== "All") {
        const routeObj = curatedRoutes.find(route => route.name === routeFilterDropdown.value);
        if(routeObj) {
          routeMatches = routeObj.locations.includes(camera.Location);
        }
      }
      col.style.display = (matchesCity && matchesRegion && matchesSearch && matchesITSOnly && routeMatches) ? "block" : "none";
    });
    updateCameraCount();
    currentIndex = 0;
    buildCarousel();
  }

  // --- Change Image Size ---
  function changeImageSize(minWidth) {
    galleryContainer.style.gridTemplateColumns = `repeat(auto-fit, minmax(${minWidth}px, 1fr))`;
  }
  changeImageSize(imageSizeRange.value);

  // --- Get Visible Image Indices ---
  function getVisibleImageIndices() {
    const cols = Array.from(document.querySelectorAll("#imageGallery .col"));
    return cols.reduce((indices, col, idx) => {
      if (col.style.display !== "none") indices.push(idx);
      return indices;
    }, []);
  }

  // --- Show Image in Modal ---
  function showImage(index) {
    const prevSelected = document.querySelector(".aspect-ratio-box.selected");
    if(prevSelected) prevSelected.classList.remove("selected");

    currentIndex = index;
    const camera = camerasList[index];
    modalImage.src = camera.Views[0].Url;
    modalTitle.textContent = camera.Location;

    const selectedBox = galleryContainer.children[index].querySelector(".aspect-ratio-box");
    if(selectedBox) selectedBox.classList.add("selected");

    buildCarousel();
  }

  // --- Build Carousel for Thumbnails ---
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
      const camera = camerasList[camIdx];
      const thumbImg = document.createElement("img");
      thumbImg.dataset.src = camera.Views[0].Url;
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
      lazyLoadObserver.observe(thumbImg);
    });
    // Center selected thumbnail
    const selectedThumb = thumbnailContainer.querySelector("img.selected-carousel");
    if(selectedThumb) {
      if (!selectedThumb.complete) {
        selectedThumb.addEventListener("load", () => centerThumbnail(thumbnailContainer, selectedThumb));
      } else {
        centerThumbnail(thumbnailContainer, selectedThumb);
      }
    }
  }

  function centerThumbnail(container, thumb) {
    const containerWidth = container.offsetWidth;
    const thumbLeft = thumb.offsetLeft;
    const thumbWidth = thumb.offsetWidth;
    const scrollPos = thumbLeft - (containerWidth / 2) + (thumbWidth / 2);
    container.scroll({ left: scrollPos, behavior: "smooth" });
  }

  // --- Navigation Functions ---
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

  // --- External Link Functions ---
  function openGoogleMaps() {
    const camera = camerasList[currentIndex];
    const googleMapsUrl = `https://www.google.com/maps?q=${camera.Latitude},${camera.Longitude}`;
    window.open(googleMapsUrl, "_blank");
  }
  function openUdotTraffic() {
    const cameraId = camerasList[currentIndex].Id;
    const udotTrafficUrl = `https://www.udottraffic.utah.gov/map/#camera-${cameraId}`;
    window.open(udotTrafficUrl, "_blank");
  }
  function openImageInNewTab() {
    window.open(modalImage.src, "_blank");
  }

  // --- Keyboard Navigation in Modal ---
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

  // --- Button Event Listeners ---
  prevImageBtn.addEventListener("click", showPreviousImage);
  nextImageBtn.addEventListener("click", showNextImage);
  openInNewTabBtn.addEventListener("click", openImageInNewTab);
  googleMapsLink.addEventListener("click", (e) => { e.preventDefault(); openGoogleMaps(); });
  udotTrafficLink.addEventListener("click", (e) => { e.preventDefault(); openUdotTraffic(); });

})();
