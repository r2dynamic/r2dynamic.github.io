// dropdowns.js

/**
 * Returns filtered cameras based on global selected* settings.
 */
export function getFilteredCameras(exclude) {
  return camerasList.filter(camera => {
    if (exclude !== 'region'      && selectedRegion             && `${camera.Region}` !== selectedRegion) return false;
    if (exclude !== 'county'      && selectedCounty             && camera.CountyBoundary !== selectedCounty) return false;
    if (exclude !== 'city'        && selectedCity               && camera.MunicipalBoundary !== selectedCity) return false;
    if (exclude !== 'maintenance' && selectedMaintenanceStation) {
      const ok = (camera.MaintenanceStationOption1 === selectedMaintenanceStation &&
                  camera.MaintenanceStationOption1.toLowerCase() !== 'not available')
               || (camera.MaintenanceStationOption2 === selectedMaintenanceStation &&
                   camera.MaintenanceStationOption2.toLowerCase() !== 'not available');
      if (!ok) return false;
    }
    return true;
  });
}

/**
 * Populates the Region dropdown menu.
 */
export function updateRegionDropdown() {
  const avail = getFilteredCameras('region');
  const set   = new Set(avail.map(c => c.Region).filter(v => v != null).map(v => v.toString()));
  const menu  = document.getElementById('regionFilterMenu');
  if (!menu) return;
  menu.innerHTML = '';
  const li0 = document.createElement('li'), a0 = document.createElement('a');
  a0.classList.add('dropdown-item'); a0.href = '#'; a0.dataset.value = '';
  a0.textContent = 'All Regions';
  a0.addEventListener('click', e => {
    e.preventDefault();
    selectedRegion = '';
    updateCountyDropdown();
    updateCityDropdown();
    updateMaintenanceStationDropdown();
    filterImages();
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('regionOptions')).hide();
  });
  li0.append(a0); menu.append(li0);

  Array.from(set).sort().forEach(val => {
    const li = document.createElement('li'), a = document.createElement('a');
    a.classList.add('dropdown-item'); a.href = '#'; a.dataset.value = val; a.textContent = val;
    a.addEventListener('click', e => {
      e.preventDefault();
      selectedRegion = val;
      updateCountyDropdown();
      updateCityDropdown();
      updateMaintenanceStationDropdown();
      filterImages();
      bootstrap.Collapse.getOrCreateInstance(document.getElementById('regionOptions')).hide();
    });
    li.append(a); menu.append(li);
  });
}

/**
 * Populates the County dropdown menu.
 */
export function updateCountyDropdown() {
  const avail = getFilteredCameras('county');
  const set   = new Set(avail.map(c => c.CountyBoundary).filter(v => v));
  const menu  = document.getElementById('countyFilterMenu');
  if (!menu) return;
  menu.innerHTML = '';
  const li0 = document.createElement('li'), a0 = document.createElement('a');
  a0.classList.add('dropdown-item'); a0.href = '#'; a0.dataset.value = '';
  a0.textContent = 'All Counties';
  a0.addEventListener('click', e => {
    e.preventDefault();
    selectedCounty = '';
    updateCityDropdown();
    updateRegionDropdown();
    updateMaintenanceStationDropdown();
    filterImages();
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('countyOptions')).hide();
  });
  li0.append(a0); menu.append(li0);

  Array.from(set).sort().forEach(val => {
    const li = document.createElement('li'), a = document.createElement('a');
    a.classList.add('dropdown-item'); a.href = '#'; a.dataset.value = val; a.textContent = val;
    a.addEventListener('click', e => {
      e.preventDefault();
      selectedCounty = val;
      updateCityDropdown();
      updateRegionDropdown();
      updateMaintenanceStationDropdown();
      filterImages();
      bootstrap.Collapse.getOrCreateInstance(document.getElementById('countyOptions')).hide();
    });
    li.append(a); menu.append(li);
  });
}

/**
 * Populates the City dropdown menu.
 */
export function updateCityDropdown() {
  const avail = getFilteredCameras('city');
  const set   = new Set(avail.map(c => c.MunicipalBoundary).filter(v => v));
  const menu  = document.getElementById('cityFilterMenu');
  if (!menu) return;
  menu.innerHTML = '';
  const li0 = document.createElement('li'), a0 = document.createElement('a');
  a0.classList.add('dropdown-item'); a0.href = '#'; a0.dataset.value = '';
  a0.textContent = 'All Cities';
  a0.addEventListener('click', e => {
    e.preventDefault();
    selectedCity = '';
    updateRegionDropdown();
    updateCountyDropdown();
    updateMaintenanceStationDropdown();
    filterImages();
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('cityOptions')).hide();
  });
  li0.append(a0); menu.append(li0);

  Array.from(set).sort().forEach(val => {
    const li = document.createElement('li'), a = document.createElement('a');
    a.classList.add('dropdown-item'); a.href = '#'; a.dataset.value = val; a.textContent = val;
    a.addEventListener('click', e => {
      e.preventDefault();
      selectedCity = val;
      updateRegionDropdown();
      updateCountyDropdown();
      updateMaintenanceStationDropdown();
      filterImages();
      bootstrap.Collapse.getOrCreateInstance(document.getElementById('cityOptions')).hide();
    });
    li.append(a); menu.append(li);
  });
}

/**
 * Populates the Maintenance Station dropdown menu.
 */
export function updateMaintenanceStationDropdown() {
  const avail = getFilteredCameras('maintenance');
  const set   = new Set();
  avail.forEach(c => {
    const o1 = c.MaintenanceStationOption1, o2 = c.MaintenanceStationOption2;
    if (o1 && o1.toLowerCase() !== 'not available') set.add(o1);
    if (o2 && o2.toLowerCase() !== 'not available') set.add(o2);
  });
  const menu = document.getElementById('maintenanceStationMenu');
  if (!menu) return;
  menu.innerHTML = '';
  const li0 = document.createElement('li'), a0 = document.createElement('a');
  a0.classList.add('dropdown-item'); a0.href = '#'; a0.dataset.value = '';
  a0.textContent = 'All Stations';
  a0.addEventListener('click', e => {
    e.preventDefault();
    selectedMaintenanceStation = '';
    updateRegionDropdown();
    updateCountyDropdown();
    updateCityDropdown();
    filterImages();
    bootstrap.Collapse.getOrCreateInstance(document.getElementById('maintenanceOptions')).hide();
  });
  li0.append(a0); menu.append(li0);

  Array.from(set).sort().forEach(val => {
    const li = document.createElement('li'), a = document.createElement('a');
    a.classList.add('dropdown-item'); a.href = '#'; a.dataset.value = val; a.textContent = val;
    a.addEventListener('click', e => {
      e.preventDefault();
      selectedMaintenanceStation = val;
      updateRegionDropdown();
      updateCountyDropdown();
      updateCityDropdown();
      filterImages();
      bootstrap.Collapse.getOrCreateInstance(document.getElementById('maintenanceOptions')).hide();
    });
    li.append(a); menu.append(li);
  });
}

/**
 * Populates the Route options dropdown.
 */
export function updateRouteOptions() {
  const routeFilterMenu = document.getElementById('routeFilterMenu');
  routeFilterMenu.innerHTML = '';
  const li0 = document.createElement('li'), a0 = document.createElement('a');
  a0.classList.add('dropdown-item'); a0.href = '#'; a0.dataset.value = 'All';
  a0.textContent = 'All Routes';
  a0.addEventListener('click', e => {
    e.preventDefault();
    selectedRoute = 'All';
    filterImages();
  });
  li0.append(a0); routeFilterMenu.append(li0);

  curatedRoutes.forEach(route => {
    const li = document.createElement('li'), a = document.createElement('a');
    a.classList.add('dropdown-item'); a.href = '#';
    const lbl = route.displayName || route.name;
    a.dataset.value = lbl; a.textContent = lbl;
    a.addEventListener('click', e => {
      e.preventDefault();
      selectedRoute = lbl;
      filterImages();
    });
    li.append(a); routeFilterMenu.append(li);
  });
}
