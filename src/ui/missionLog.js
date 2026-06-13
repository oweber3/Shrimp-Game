// Mission log (Phase 7): Tab toggles a panel listing every objective so
// far. All but the latest entry render as completed. missions.js pushes
// each objective text in here as states advance.

export class MissionLog {
  constructor() {
    this.entries = [];
    this.el = document.createElement('div');
    this.el.id = 'mission-log';
    this.el.className = 'panel';
    this.el.innerHTML = `
      <div class="log-title">SHIFT LOG <span class="log-hint">[Tab]</span></div>
      <div id="log-entries"></div>
    `;
    this.el.style.display = 'none';
    (document.getElementById('hud') || document.body).appendChild(this.el);
    this.list = this.el.querySelector('#log-entries');

    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Tab') return;
      e.preventDefault(); // keep focus from cycling through the HUD
      this.toggle();
    });
  }

  push(text) {
    this.entries.push(text);
    this._render();
  }

  _render() {
    this.list.innerHTML = this.entries
      .map((t, i) => {
        const done = i < this.entries.length - 1;
        return `<div class="log-entry ${done ? 'done' : 'current'}">${done ? '&#10003;' : '&#9654;'} ${t}</div>`;
      })
      .join('');
  }

  toggle() {
    this.el.style.display = this.el.style.display === 'none' ? 'block' : 'none';
  }

  isOpen() {
    return this.el.style.display !== 'none';
  }
}
