import { CUES } from './cueData.js';

const ACTIVE_STATES = new Set(['arming', 'running', 'finale']);
const APP_BASE = import.meta.env?.BASE_URL || '/';
const DEFAULT_MEDIA_PATH = `${APP_BASE}concert/sickomode.mp4`;

const DEFAULT_SHOW = Object.freeze({
  id: 'sicko',
  cues: CUES,
  audioSrc: DEFAULT_MEDIA_PATH,
  armingSeconds: 0,
  teardownSeconds: 0,
});

function positiveDuration(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
}

function normalizeShow(id, definition = {}) {
  const cues = Array.isArray(definition.cues) ? definition.cues : CUES;
  return Object.freeze({
    ...definition,
    id: String(definition.id || id || 'sicko'),
    cues,
    audioSrc: definition.audioSrc || definition.mediaPath || DEFAULT_MEDIA_PATH,
    armingSeconds: positiveDuration(definition.armingSeconds),
    teardownSeconds: positiveDuration(definition.teardownSeconds),
  });
}

function formatTime(seconds) {
  const safeTime = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safeTime / 60);
  const remainder = (safeTime % 60).toFixed(1).padStart(4, '0');
  return `${String(minutes).padStart(2, '0')}:${remainder}`;
}

/**
 * Data-driven concert clock and cue dispatcher.
 *
 * The director deliberately owns no Three.js objects yet. Later phases can
 * register per-type handlers without changing its timing or restart rules.
 */
export class Concert {
  constructor({
    cues = CUES,
    shows = null,
    showId = 'sicko',
    onCue = null,
    cueHandlers = {},
    showHud = true,
    audioManager = null,
    mediaPath = DEFAULT_MEDIA_PATH,
    mediaElement = null,
    timeScale = 1,
  } = {}) {
    const suppliedShows = shows && typeof shows === 'object'
      ? Object.entries(shows)
      : [['sicko', { ...DEFAULT_SHOW, cues, audioSrc: mediaPath }]];
    this.shows = new Map(suppliedShows.map(([id, definition]) => [
      String(id),
      normalizeShow(id, definition),
    ]));
    if (!this.shows.size) this.shows.set('sicko', normalizeShow('sicko', DEFAULT_SHOW));

    this.show = this.shows.get(showId) || this.shows.values().next().value;
    this.showId = this.show.id;
    this.cues = this.show.cues;
    this.onCue = onCue;
    this.cueHandlers = { ...cueHandlers };
    this.audioManager = audioManager;
    this.mediaPath = this.show.audioSrc;
    this.state = 'idle';
    this.time = 0;
    this.lastCue = null;
    this.firedCueIds = [];
    this.lastRunCueIds = [];
    this.playerPos = null;
    this._nextCueIndex = 0;
    this._armingElapsed = 0;
    this._teardownElapsed = 0;
    this._timeScale = Number.isFinite(timeScale) && timeScale > 0 ? timeScale : 1;
    this._clockSource = 'placeholder';
    this._playAttempt = 0;
    this._mediaChecks = new Map();
    this._installedMediaSrc = '';
    this._disposed = false;
    this._media = mediaElement || this._createMediaElement();
    this._ownsMedia = !mediaElement && Boolean(this._media);
    this._mediaStatus = mediaElement ? 'ready' : 'unavailable';
    this._onMediaError = () => {
      this._mediaStatus = 'unavailable';
      this._usePlaceholderClock();
    };
    if (this._media?.addEventListener) {
      this._media.addEventListener('error', this._onMediaError);
    }
    if (!mediaElement) {
      for (const definition of this.shows.values()) this._probeMedia(definition.audioSrc);
      this._prepareMedia(this.mediaPath);
    }
    this._ownsHud = false;
    this._hud = showHud ? this._createHud() : null;
    this._renderHud();
  }

  /**
   * Start a show, or cleanly restart the active show from zero. Selecting a
   * different show while one is active is deliberately a no-op.
   */
  start(showId = this.showId) {
    if (this._disposed) return this;
    const nextShow = this.shows.get(String(showId)) || null;
    if (!nextShow) return this;
    if (this.state !== 'idle' && nextShow.id !== this.showId) return this;
    if (this.state !== 'idle') this._endPlayback(true);
    if (nextShow.id !== this.showId) this._selectShow(nextShow);
    this.lastRunCueIds.length = 0;
    this._resetRun();
    this.state = 'arming';
    this.audioManager?.unlock();
    this.audioManager?.setConcertActive(true);
    if (this.show.armingSeconds <= 0) {
      // Preserve the original show's immediate clock contract when it has no
      // authored visual pre-roll.
      this.state = 'running';
      this._beginPlayback();
    } else {
      // Authored arming is a visual pre-roll. The song clock and media both
      // remain at zero until it completes, independent of HEAD-probe latency.
      this._playAttempt += 1;
      this._clockSource = 'arming';
      try { this._media?.pause?.(); } catch { /* the silent path remains valid */ }
    }
    this._renderHud();
    return this;
  }

  /**
   * Accelerate the silent clock for deterministic verification and authoring.
   * Media playback remains authoritative at normal speed; any other scale
   * deliberately selects the placeholder clock so a five-minute show can be
   * exercised without depending on decoder or wall-clock speed.
   */
  setTimeScale(scale = 1) {
    const next = Number(scale);
    this._timeScale = Number.isFinite(next) && next > 0 ? next : 1;
    if (this._timeScale !== 1 && this.state !== 'idle') this._usePlaceholderClock();
    return this;
  }

  /**
   * Stop the active show. Natural endings use the authored teardown clock;
   * callers handling an explicit user stop can request synchronous cleanup so
   * the other show is immediately available on the same frame.
   */
  stop({ immediate = false } = {}) {
    if (this.state === 'idle') return this;
    this._endPlayback(false);
    if (immediate) {
      this._resetRun();
      this.state = 'idle';
      this._renderHud();
      return this;
    }
    this.state = 'teardown';
    this._renderHud();
    return this;
  }

  /** Register or replace the callback for a cue event type. */
  setCueHandler(type, callback) {
    if (typeof callback === 'function') this.cueHandlers[type] = callback;
    else delete this.cueHandlers[type];
    return this;
  }

  /** Release the director-owned DOM nodes and media listeners. */
  dispose() {
    if (this._disposed) return;
    this.stop({ immediate: true });
    if (this._media?.removeEventListener) {
      this._media.removeEventListener('error', this._onMediaError);
    }
    this.audioManager?.disconnectConcertMedia?.(this._media);
    if (this._ownsMedia) {
      try {
        this._media.pause();
        this._media.removeAttribute?.('src');
        this._media.load?.();
      } catch { /* detached media is already clean */ }
      this._media.remove?.();
    }
    if (this._ownsHud) this._hud?.remove?.();
    else if (this._hud) this._hud.style.display = 'none';
    this._mediaChecks.clear();
    this._media = null;
    this._hud = null;
    this._disposed = true;
  }

  update(dt, playerPos) {
    if (playerPos) {
      if (this.playerPos?.copy && typeof this.playerPos.copy === 'function') {
        this.playerPos.copy(playerPos);
      } else if (typeof playerPos.clone === 'function') {
        this.playerPos = playerPos.clone();
      } else {
        this.playerPos = { x: playerPos.x, y: playerPos.y, z: playerPos.z };
      }
    }

    if (this.state === 'idle') return;
    const delta = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    const scaledDelta = delta * this._timeScale;
    if (this.state === 'teardown') {
      this._teardownElapsed += scaledDelta;
      if (this._teardownElapsed + 1e-6 >= this.show.teardownSeconds) {
        this._endPlayback(false);
        this._resetRun();
        this.state = 'idle';
      }
      this._renderHud();
      return;
    }

    if (this.state === 'arming') {
      this._armingElapsed += scaledDelta;
      if (this._armingElapsed + 1e-6 < this.show.armingSeconds) {
        this._renderHud();
        return;
      }
      this._armingElapsed = this.show.armingSeconds;
      this.state = 'running';
      // Dispatch timestamp-zero setup only after the venue has armed, then
      // hand subsequent frames to either media time or the silent clock.
      this._fireCuesThrough(0);
      this._beginPlayback();
      this._renderHud();
      return;
    }

    if (this._clockSource === 'media' && Number.isFinite(this._media?.currentTime)) {
      // The element continues advancing while requestAnimationFrame is
      // throttled, so returning to the tab simply catches cues up to audio.
      this.time = Math.max(0, this._media.currentTime);
    } else {
      // `waiting` holds at the start until an asynchronous media probe
      // resolves. Placeholder mode advances deterministically as usual.
      if (this._clockSource !== 'waiting') this.time += scaledDelta;
    }
    this._fireCuesThrough(this.time);
    this._renderHud();
  }

  _fireCuesThrough(songTime) {
    while (this._nextCueIndex < this.cues.length) {
      const nextCue = this.cues[this._nextCueIndex];
      if (nextCue.time > songTime) break;

      this._nextCueIndex += 1;
      this.lastCue = nextCue;
      this.firedCueIds.push(nextCue.id);

      if ((nextCue.section === 'finale' || nextCue.section === 'chorus-final') &&
          (this.state === 'running' || this.state === 'arming')) {
        this.state = 'finale';
      }

      const handler = this.cueHandlers[nextCue.type];
      if (typeof handler === 'function') handler(nextCue, this);
      if (typeof this.onCue === 'function') this.onCue(nextCue, this);

      // A DOM event makes the placeholder cue log observable to browser
      // tooling without coupling future visual systems to the debug API.
      if (typeof window !== 'undefined' && typeof window.CustomEvent === 'function') {
        window.dispatchEvent(new window.CustomEvent('concertcue', { detail: nextCue }));
      }

      if (nextCue.type === 'showEnd') {
        this.lastRunCueIds = [...this.firedCueIds];
        this._endPlayback(false);
        this._teardownElapsed = 0;
        this.state = 'teardown';
        break;
      }
    }
  }

  _resetRun() {
    this.time = 0;
    this.lastCue = null;
    this.firedCueIds.length = 0;
    this._nextCueIndex = 0;
    this._armingElapsed = 0;
    this._teardownElapsed = 0;
  }

  _selectShow(show) {
    this.show = show;
    this.showId = show.id;
    this.cues = show.cues;
    this.mediaPath = show.audioSrc;
    this._prepareMedia(this.mediaPath);
  }

  _beginPlayback() {
    if (this._timeScale !== 1) {
      this._usePlaceholderClock();
      return;
    }
    const check = this._mediaChecks.get(this.mediaPath);
    if (check?.status === 'checking') {
      this._clockSource = 'waiting';
      return;
    }
    const media = this._media;
    const connected = this._mediaStatus === 'ready' && media &&
      this.audioManager?.connectConcertMedia(media);
    if (!connected) {
      this._usePlaceholderClock();
      return;
    }

    this._playPreparedMedia();
  }

  _playPreparedMedia() {
    const media = this._media;
    if (!media) {
      this._usePlaceholderClock();
      return;
    }
    const attempt = ++this._playAttempt;
    try {
      media.pause();
      media.currentTime = 0;
      this._clockSource = 'media';
      const playResult = media.play();
      if (playResult?.catch) {
        playResult.catch(() => {
          if (attempt === this._playAttempt) this._usePlaceholderClock();
        });
      }
    } catch {
      this._usePlaceholderClock();
    }
  }

  _endPlayback(resetMedia) {
    this._playAttempt += 1;
    this.audioManager?.setConcertActive(false);
    if (this._media) {
      try {
        this._media.pause();
        if (resetMedia) this._media.currentTime = 0;
      } catch {
        // A failed or detached media element is the supported silent path.
      }
    }
    this._clockSource = 'placeholder';
  }

  _usePlaceholderClock() {
    this._playAttempt += 1;
    this._clockSource = 'placeholder';
    if (this._media) {
      try { this._media.pause(); } catch { /* no-op */ }
    }
  }

  _createMediaElement() {
    if (typeof document === 'undefined' || !document.body) return null;
    // An audio element can consume the AAC track from the MP4 without asking
    // the browser to decode hidden video frames throughout the show.
    const element = document.createElement('audio');
    element.id = 'concert-media';
    element.hidden = true;
    element.preload = 'metadata';
    element.setAttribute('aria-hidden', 'true');
    document.body.appendChild(element);
    return element;
  }

  _probeMedia(mediaPath) {
    if (this._disposed || !this._media || !mediaPath) return null;
    if (this._mediaChecks.has(mediaPath)) return this._mediaChecks.get(mediaPath);
    const record = { status: 'checking', promise: null };
    this._mediaChecks.set(mediaPath, record);
    if (typeof fetch !== 'function') {
      record.status = 'ready';
      return record;
    }

    // Probe first so a missing optional file never produces an uncaught media
    // error (or a noisy failed resource request) in development and CI.
    record.promise = fetch(mediaPath, { method: 'HEAD' })
      .then((response) => {
        record.status = response.ok ? 'ready' : 'unavailable';
      })
      .catch(() => {
        record.status = 'unavailable';
      })
      .finally(() => {
        if (this._disposed) return;
        if (this.mediaPath !== mediaPath) return;
        this._prepareMedia(mediaPath);
        if (this._clockSource !== 'waiting' || this.state === 'idle') return;
        if (record.status === 'ready') this._beginPlayback();
        else this._usePlaceholderClock();
      });
    return record;
  }

  _prepareMedia(mediaPath) {
    if (this._disposed || !this._media || !mediaPath) return;
    const check = this._probeMedia(mediaPath);
    this._mediaStatus = check?.status || 'unavailable';
    if (this._mediaStatus !== 'ready') {
      if (this._installedMediaSrc !== mediaPath) {
        try {
          this._media.pause();
          this._media.removeAttribute?.('src');
          this._media.load?.();
        } catch { /* the silent path remains valid */ }
        this._installedMediaSrc = '';
      }
      return;
    }
    if (this._installedMediaSrc === mediaPath) return;
    try {
      this._media.pause();
      this._media.src = mediaPath;
      this._media.load?.();
      this._installedMediaSrc = mediaPath;
    } catch {
      this._mediaStatus = 'unavailable';
    }
  }

  _createHud() {
    if (typeof document === 'undefined' || !document.body) return null;
    let element = document.getElementById('concert-debug');
    if (!element) {
      element = document.createElement('div');
      element.id = 'concert-debug';
      element.className = 'panel';
      element.setAttribute('aria-live', 'polite');
      document.body.appendChild(element);
      this._ownsHud = true;
    }
    return element;
  }

  _renderHud() {
    if (!this._hud) return;
    this._hud.style.display = this.state === 'idle' ? 'none' : 'block';
    const lastCueId = this.lastCue?.id ?? 'none';
    this._hud.textContent = `CONCERT ${formatTime(this.time)} · ${this.state} · ${this._clockSource} · last cue: ${lastCueId}`;
  }

  get isActive() {
    return ACTIVE_STATES.has(this.state) || this.state === 'teardown';
  }

  get t() {
    return this.time;
  }

  get clockSource() {
    return this._clockSource;
  }

  get mediaStatus() {
    return this._mediaStatus;
  }

  get timeScale() {
    return this._timeScale;
  }

  get armingProgress() {
    if (this.show.armingSeconds <= 0) return 1;
    return Math.min(1, this._armingElapsed / this.show.armingSeconds);
  }

  get teardownProgress() {
    if (this.show.teardownSeconds <= 0) return 1;
    return Math.min(1, this._teardownElapsed / this.show.teardownSeconds);
  }
}
