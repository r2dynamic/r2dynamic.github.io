// gallery.js
const galleryContainer   = document.getElementById('imageGallery');
const cameraCountElement = document.getElementById('cameraCount');
let currentIndex = 0;

/**
 * Renders an array of camera objects into the gallery.
 * @param {Array} cameras
 */
export function renderGallery(cameras) {
  galleryContainer.innerHTML = '';
  cameras.forEach((camera, i) => {
    const col = document.createElement('div'); col.classList.add('col');
    const arb = document.createElement('div'); arb.classList.add('aspect-ratio-box');
    const anc = document.createElement('a');
    anc.href = '#';
    anc.setAttribute('data-bs-toggle', 'modal');
    anc.setAttribute('data-bs-target', '#imageModal');
    anc.addEventListener('click', e => { e.preventDefault(); showImage(i); });
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src     = camera.Views[0].Url;
    img.alt     = `Camera at ${camera.Location}`;
    img.dataset.cameraInfo = `Location: ${camera.Location}\nUrl: ${camera.Views[0].Url}`;
    anc.append(img);
    arb.append(anc);
    col.append(arb);
    galleryContainer.append(col);
  });
}

/**
 * Updates the camera count display.
 */
export function updateCameraCount() {
  cameraCountElement.textContent = `${visibleCameras.length}`;
}

/**
 * Shows the selected image in the modal.
 * @param {number} index
 */
export function showImage(index) {
  document.querySelectorAll('.aspect-ratio-box.selected')
    .forEach(el => el.classList.remove('selected'));
  currentIndex = index;
  const cam = visibleCameras[index];
  const modalImage = document.getElementById('imageModal').querySelector('img');
  const modalTitle = document.querySelector('.modal-title');
  modalImage.src         = cam.Views[0].Url;
  modalTitle.textContent = cam.Location;
  modalImage.dataset.latitude  = cam.Latitude;
  modalImage.dataset.longitude = cam.Longitude;
  document.querySelectorAll('.aspect-ratio-box')[index]
    .classList.add('selected');
}
