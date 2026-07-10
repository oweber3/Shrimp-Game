// Stunt HUD: a score panel that appears while driving the cart, plus the
// big center-screen trick popups on landing. DOM only; scoring logic lives
// in mechanics/stunts.js.

export class StuntHud {
  constructor() {
    this.panel = document.createElement('div');
    this.panel.id = 'stunt-hud';
    this.panel.className = 'panel';
    this.panel.innerHTML = `
      <h2>Stunts</h2>
      <div class="score-line">
        <span id="stunt-score">0</span>
        <span id="stunt-mult"></span>
      </div>
      <div class="best" id="stunt-best"></div>
    `;
    document.body.appendChild(this.panel);
    this.scoreEl = this.panel.querySelector('#stunt-score');
    this.multEl = this.panel.querySelector('#stunt-mult');
    this.bestEl = this.panel.querySelector('#stunt-best');

    this.popupEl = document.createElement('div');
    this.popupEl.id = 'trick-popup';
    document.body.appendChild(this.popupEl);
    this.popupTimer = null;
    this.hideTimer = null;
    this.driving = false;
  }

  // Panel shows while driving and lingers a moment after hopping off.
  setDriving(driving) {
    if (driving === this.driving) return;
    this.driving = driving;
    clearTimeout(this.hideTimer);
    if (driving) {
      this.panel.style.display = 'block';
    } else {
      this.hideTimer = setTimeout(() => {
        this.panel.style.display = 'none';
      }, 4000);
    }
  }

  setScore(score, multiplier) {
    this.scoreEl.textContent = score.toLocaleString();
    this.multEl.textContent = multiplier > 1 ? `x${multiplier}` : '';
  }

  setBestTrick(best) {
    this.bestEl.textContent = `Best: ${best.name} — ${best.points.toLocaleString()}`;
  }

  // kind: 'clean' | 'sketchy' | 'crash' (drives the popup color).
  popup(text, kind) {
    this.popupEl.textContent = text;
    this.popupEl.className = `show ${kind}`;
    clearTimeout(this.popupTimer);
    this.popupTimer = setTimeout(() => {
      this.popupEl.className = '';
    }, 2400);
  }
}
