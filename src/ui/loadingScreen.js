import * as THREE from 'three';

// Loading overlay (Phase 7): owns a THREE.LoadingManager that the world's
// TextureLoader runs through. Shows a progress bar while sign textures
// load, fades out on completion. pointer-events is none in CSS so it can
// never block the start overlay click underneath it.

export class LoadingScreen {
  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'loading-screen';
    this.el.innerHTML = `
      <div class="load-title">SHRIMP SHIFT</div>
      <div class="load-bar"><div class="load-fill" id="load-fill"></div></div>
      <div class="load-text">Clocking in&hellip;</div>
    `;
    document.body.appendChild(this.el);
    this.fill = this.el.querySelector('#load-fill');
    this._hidden = false;

    this.manager = new THREE.LoadingManager();
    this.manager.onProgress = (url, loaded, total) => {
      this.fill.style.width = `${Math.round((loaded / total) * 100)}%`;
    };
    this.manager.onLoad = () => this.hide();
    // Never trap the player behind the overlay if an asset stalls.
    setTimeout(() => this.hide(), 8000);
  }

  hide() {
    if (this._hidden) return;
    this._hidden = true;
    this.fill.style.width = '100%';
    this.el.style.opacity = '0';
    setTimeout(() => {
      this.el.style.display = 'none';
    }, 600);
  }
}
