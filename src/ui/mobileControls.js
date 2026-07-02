// On-screen touch controls for phones and tablets.
//
// Design goals (see the task brief):
//   * A fixed-base analog joystick at the lower-left drives the player's
//     analog move axis, so movement is smooth in any direction — not snapped
//     to 8 compass points.
//   * Two action buttons at the lower-right (a large Jump and a smaller
//     Interact) dispatch synthetic keyboard events so they flow through the
//     EXACT same handlers as the physical Space / E keys. No gameplay action
//     is re-implemented here.
//   * Built on Pointer Events. Every control captures its own pointerId, so
//     move + jump + interact can all be held at once (true multi-touch).
//   * Created and shown only on coarse-pointer (touch) devices; desktop is
//     never touched.
//
// The module is deliberately self-contained: its only hooks into the game are
// writing `player.moveAxis` for movement and dispatching window keyboard
// events for actions.

// --- device detection --------------------------------------------------------

// Phones/tablets expose a coarse primary pointer with no hover. Touch-capable
// laptops (coarse + fine + hover) are treated as desktop. `force` (the
// ?mobile=1 query flag) overrides detection for testing on a desktop browser.
export function detectTouch(force = false) {
  if (force) return true;
  const mm = window.matchMedia ? window.matchMedia.bind(window) : null;
  const coarse = mm && mm('(pointer: coarse)').matches;
  const noHover = mm && mm('(hover: none)').matches;
  if (coarse && noHover) return true;
  // Fallback for older browsers without the media queries above.
  if (!mm && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) return true;
  return false;
}

const ACTIONS = {
  // button id -> the keyboard event it emulates
  jump: { code: 'Space', key: ' ' },
  interact: { code: 'KeyE', key: 'e' },
  // Time-of-day advance/rewind. These emulate the [ and ] keys so sky.js's
  // existing keydown handler fires untouched — no time logic is re-implemented.
  timeForward: { code: 'BracketRight', key: ']' },
  timeBack: { code: 'BracketLeft', key: '[' },
};

export class MobileControls {
  constructor(player, options = {}) {
    this.player = player;
    const force = options.force || (typeof window.__forceTouch !== 'undefined' && window.__forceTouch);
    this.enabled = detectTouch(force);
    this.root = null;
    this.joyPointerId = null;
    this.joyRadius = 0;
    this._destroyers = [];

    if (!this.enabled) return;
    document.body.classList.add('touch-device');
    this._build();
    this._installGlobalGuards();
  }

  // ---- DOM construction -----------------------------------------------------

  _build() {
    const root = document.createElement('div');
    root.id = 'mobile-controls';
    root.classList.add('active');
    root.innerHTML = `
      <div id="joystick" aria-label="Movement joystick">
        <div class="joy-knob"></div>
      </div>
      <div id="action-buttons">
        <button type="button" class="action-btn interact" data-action="interact" aria-label="Interact">E</button>
        <button type="button" class="action-btn jump" data-action="jump" aria-label="Jump">JUMP</button>
      </div>
      <div id="time-buttons">
        <button type="button" class="time-btn time-back" data-action="timeBack" aria-label="Rewind time of day">&laquo;</button>
        <button type="button" class="time-btn time-forward" data-action="timeForward" aria-label="Advance time of day">&raquo;</button>
      </div>
    `;
    document.body.appendChild(root);
    this.root = root;

    this.joystick = root.querySelector('#joystick');
    this.knob = root.querySelector('.joy-knob');
    this._initJoystick();

    // Action buttons (jump/interact) and time buttons share the same
    // press → dispatchKey → release lifecycle.
    for (const btn of root.querySelectorAll('.action-btn, .time-btn')) {
      this._initButton(btn);
    }
  }

  // ---- joystick -------------------------------------------------------------

  _initJoystick() {
    const onDown = (e) => {
      // Ignore extra fingers that land on the stick while one already owns it.
      if (this.joyPointerId !== null) return;
      this.joyPointerId = e.pointerId;
      const rect = this.joystick.getBoundingClientRect();
      this.joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      // Knob travel is bounded by the base radius (base stays fixed).
      this.joyRadius = rect.width / 2;
      try {
        this.joystick.setPointerCapture(e.pointerId);
      } catch (err) {
        /* setPointerCapture can throw if the pointer already ended */
      }
      this._moveJoystick(e.clientX, e.clientY);
      e.preventDefault();
    };
    const onMove = (e) => {
      if (e.pointerId !== this.joyPointerId) return;
      this._moveJoystick(e.clientX, e.clientY);
      e.preventDefault();
    };
    const onUp = (e) => {
      if (e.pointerId !== this.joyPointerId) return;
      this.joyPointerId = null;
      this._resetJoystick();
      try {
        this.joystick.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* no-op */
      }
      e.preventDefault();
    };

    this.joystick.addEventListener('pointerdown', onDown, { passive: false });
    this.joystick.addEventListener('pointermove', onMove, { passive: false });
    this.joystick.addEventListener('pointerup', onUp, { passive: false });
    this.joystick.addEventListener('pointercancel', onUp, { passive: false });
    this._destroyers.push(() => {
      this.joystick.removeEventListener('pointerdown', onDown);
      this.joystick.removeEventListener('pointermove', onMove);
      this.joystick.removeEventListener('pointerup', onUp);
      this.joystick.removeEventListener('pointercancel', onUp);
    });
  }

  _moveJoystick(clientX, clientY) {
    let dx = clientX - this.joyCenter.x;
    let dy = clientY - this.joyCenter.y;
    const dist = Math.hypot(dx, dy);
    const max = this.joyRadius;
    if (dist > max && dist > 0) {
      // Clamp the knob to the base edge; keep the same direction.
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    // Map to the player's analog axis. Screen-up (negative dy) is forward.
    this.player.moveAxis.x = dx / max;
    this.player.moveAxis.z = -dy / max;
  }

  _resetJoystick() {
    this.knob.style.transform = 'translate(0px, 0px)';
    this.player.moveAxis.x = 0;
    this.player.moveAxis.z = 0;
  }

  // ---- action buttons -------------------------------------------------------

  _initButton(btn) {
    const action = ACTIONS[btn.dataset.action];
    if (!action) return;
    let pointerId = null;

    const press = (e) => {
      if (pointerId !== null) return; // already held by another finger
      pointerId = e.pointerId;
      btn.classList.add('pressed');
      try {
        btn.setPointerCapture(e.pointerId);
      } catch (err) {
        /* no-op */
      }
      dispatchKey('keydown', action.code, action.key);
      e.preventDefault();
    };
    const release = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      btn.classList.remove('pressed');
      try {
        btn.releasePointerCapture(e.pointerId);
      } catch (err) {
        /* no-op */
      }
      dispatchKey('keyup', action.code, action.key);
      e.preventDefault();
    };

    btn.addEventListener('pointerdown', press, { passive: false });
    btn.addEventListener('pointerup', release, { passive: false });
    btn.addEventListener('pointercancel', release, { passive: false });
    // Block the synthetic mouse/click events touch generates so a press never
    // leaks through as a second activation.
    btn.addEventListener('click', (e) => e.preventDefault());
    this._destroyers.push(() => {
      btn.removeEventListener('pointerdown', press);
      btn.removeEventListener('pointerup', release);
      btn.removeEventListener('pointercancel', release);
    });
  }

  // ---- page-level gesture guards -------------------------------------------

  _installGlobalGuards() {
    // Block iOS pinch-zoom gesture events outright during play.
    const onGesture = (e) => e.preventDefault();
    document.addEventListener('gesturestart', onGesture, { passive: false });
    document.addEventListener('gesturechange', onGesture, { passive: false });
    document.addEventListener('gestureend', onGesture, { passive: false });

    // Block multi-finger pan/zoom anywhere in the game surface.
    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    // Block double-tap-to-zoom.
    let lastEnd = 0;
    const onTouchEnd = (e) => {
      const now = Date.now();
      if (now - lastEnd < 300) e.preventDefault();
      lastEnd = now;
    };
    document.addEventListener('touchend', onTouchEnd, { passive: false });

    this._destroyers.push(() => {
      document.removeEventListener('gesturestart', onGesture);
      document.removeEventListener('gesturechange', onGesture);
      document.removeEventListener('gestureend', onGesture);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    });
  }

  destroy() {
    for (const d of this._destroyers) d();
    this._destroyers = [];
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    document.body.classList.remove('touch-device');
  }
}

// Dispatch a synthetic keyboard event on window so it reaches the same
// listeners (Player + main.js interaction handler) as a real key.
function dispatchKey(type, code, key) {
  window.dispatchEvent(new KeyboardEvent(type, { code, key, bubbles: true }));
}
