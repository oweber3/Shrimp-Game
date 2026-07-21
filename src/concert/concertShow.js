import { Concert } from './concertDirector.js';
import { CUES } from './cueData.js';
import { YE_BPM, YE_CUES } from './allOfTheLightsCues.js';
import { createFireworkAudio } from './fireworkAudio.js';
import { createFireworks } from './fireworks.js';
import { createPerformer } from './performers/index.js';
import { createConcertStaging, createEarthConcertStaging } from './staging.js';
import { createConcertCrowd } from './crowd.js';
import {
  EARTH_STAGE_CENTER,
  EARTH_STAGE_FOOTPRINT_RADIUS,
  EARTH_STAGE_TOP,
} from './earthStagePlacement.js';
import { BUILDING_BY_ID, translateLaitramMachineryPoint } from '../map/layoutData.js';

export { EARTH_STAGE_CENTER, EARTH_STAGE_TOP } from './earthStagePlacement.js';

const APP_BASE = import.meta.env?.BASE_URL || '/';
const MACHINERY = BUILDING_BY_ID['laitram-machinery'];
const MACHINERY_FRONT_CENTER = translateLaitramMachineryPoint(35, 19.5);

const RAPPER_PAIR_HALF_SPAN = 44;
const RAPPER_DEPTH_OFFSET = -6;
const RAPPER_SCALE = 1.2;
const BACKUP_PAIR_HALF_SPAN = 76;
const BACKUP_DEPTH_SPAN = 10;

const SICKO_ANCHORS = Object.freeze({
  drake: Object.freeze([
    MACHINERY_FRONT_CENTER.x - RAPPER_PAIR_HALF_SPAN,
    22,
    MACHINERY.cz + RAPPER_DEPTH_OFFSET,
  ]),
  travis: Object.freeze([
    MACHINERY_FRONT_CENTER.x + RAPPER_PAIR_HALF_SPAN,
    22,
    MACHINERY.cz + RAPPER_DEPTH_OFFSET,
  ]),
  swae: Object.freeze([
    MACHINERY_FRONT_CENTER.x - BACKUP_PAIR_HALF_SPAN,
    64,
    MACHINERY.cz + RAPPER_DEPTH_OFFSET - BACKUP_DEPTH_SPAN,
  ]),
  seahawk: Object.freeze([
    MACHINERY_FRONT_CENTER.x + BACKUP_PAIR_HALF_SPAN,
    78,
    MACHINERY.cz + RAPPER_DEPTH_OFFSET + BACKUP_DEPTH_SPAN,
  ]),
});

const SICKO_SCALES = Object.freeze({ drake: RAPPER_SCALE, travis: RAPPER_SCALE });
const SICKO_FLIGHT_RADII = Object.freeze({ drake: 23, travis: 35, swae: 14, seahawk: 28 });
const SICKO_BPM = Object.freeze({
  'movement-1': 155,
  'movement-2': 155,
  bridge: 78,
  'movement-3': 155,
  finale: 155,
  outro: 78,
});

const SICKO_FIREWORK_CUES = Object.freeze({
  'drake-intro-fireworks': Object.freeze([
    { type: 'ring', count: 2, site: 'stage-nw', palette: 'gold' },
    { type: 'peony', count: 2, site: 'stage-sw', palette: 'gold' },
  ]),
  'travis-fireworks-a': Object.freeze([
    { type: 'ring', count: 3, site: 'north', palette: 'violet' },
    { type: 'strobe', count: 2, site: 'stage-ne', palette: 'violet' },
  ]),
  'drake-fireworks-final': Object.freeze([
    { type: 'peony', count: 6, site: 'all', palette: 'ember' },
    { type: 'willow', count: 5, site: 'all', palette: 'gold' },
    { type: 'strobe', count: 5, site: 'all', palette: 'white' },
    { type: 'shrimp-pink', count: 3, site: 'levee', palette: 'pink' },
  ]),
});

export const YE_FIREWORK_SITES = Object.freeze({
  north: Object.freeze([EARTH_STAGE_CENTER.x, 5, EARTH_STAGE_CENTER.z - 34]),
  northWest: Object.freeze([EARTH_STAGE_CENTER.x - 25, 5, EARTH_STAGE_CENTER.z - 29]),
  northEast: Object.freeze([EARTH_STAGE_CENTER.x + 18, 5, EARTH_STAGE_CENTER.z - 32]),
  west: Object.freeze([EARTH_STAGE_CENTER.x - 37, 5, EARTH_STAGE_CENTER.z - 8]),
  east: Object.freeze([EARTH_STAGE_CENTER.x + 37, 5, EARTH_STAGE_CENTER.z - 8]),
});
const YE_SITES = YE_FIREWORK_SITES;
const YE_MULTICOLOR = Object.freeze([0xffffff, 0xffb52e, 0xf0442e, 0x4c78ff]);

const YE_FIREWORK_CUES = Object.freeze({
  'horn-break-1-fireworks': Object.freeze([
    { type: 'strobe', count: 4, site: YE_SITES.north, palette: 'gold' },
  ]),
  'chorus-1-fireworks': Object.freeze([
    { type: 'willow', count: 5, site: YE_SITES.west, palette: 'gold' },
    { type: 'peony', count: 5, site: YE_SITES.east, palette: 'white' },
  ]),
  'horn-break-2-fireworks': Object.freeze([
    { type: 'strobe', count: 5, site: YE_SITES.northWest, palette: 'gold' },
  ]),
  'horn-break-3-fireworks': Object.freeze([
    { type: 'strobe', count: 5, site: YE_SITES.northEast, palette: 'gold' },
  ]),
  'bridge-climax-fireworks': Object.freeze([
    { type: 'peony', count: 11, site: YE_SITES.west, palette: YE_MULTICOLOR },
    { type: 'ring', count: 10, site: YE_SITES.north, palette: YE_MULTICOLOR },
    { type: 'willow', count: 10, site: YE_SITES.east, palette: YE_MULTICOLOR },
    { type: 'strobe', count: 8, site: YE_SITES.northWest, palette: 'white' },
  ]),
  'horn-break-4-fireworks': Object.freeze([
    { type: 'strobe', count: 7, site: YE_SITES.north, palette: 'gold' },
  ]),
  'horn-break-5-fireworks': Object.freeze([
    { type: 'strobe', count: 6, site: YE_SITES.northWest, palette: 'gold' },
    { type: 'peony', count: 4, site: YE_SITES.northEast, palette: 'ember' },
  ]),
  'chorus-final-fireworks': Object.freeze([
    { type: 'peony', count: 10, site: YE_SITES.west, palette: 'ember' },
    { type: 'willow', count: 10, site: YE_SITES.east, palette: 'gold' },
    { type: 'ring', count: 9, site: YE_SITES.north, palette: 'white' },
    { type: 'strobe', count: 8, site: YE_SITES.northEast, palette: 'white' },
  ]),
  'outro-fireworks': Object.freeze([
    { type: 'peony', count: 9, site: YE_SITES.northWest, palette: 'ember' },
    { type: 'willow', count: 9, site: YE_SITES.northEast, palette: 'gold' },
    { type: 'strobe', count: 7, site: YE_SITES.north, palette: 'white' },
  ]),
});

const SHOWS = Object.freeze({
  sicko: Object.freeze({
    id: 'sicko',
    cues: CUES,
    audioSrc: `${APP_BASE}concert/sickomode.mp4`,
    armingSeconds: 0,
    teardownSeconds: 0,
    stagingId: 'sky',
    initialSection: 'movement-1',
    bpm: 155,
    bpmBySection: SICKO_BPM,
    anchors: SICKO_ANCHORS,
    scales: SICKO_SCALES,
    flightRadii: SICKO_FLIGHT_RADII,
    fireworkCues: SICKO_FIREWORK_CUES,
  }),
  ye: Object.freeze({
    id: 'ye',
    cues: YE_CUES,
    audioSrc: `${APP_BASE}concert/allofthelights.mp4`,
    armingSeconds: 4,
    teardownSeconds: 4,
    stagingId: 'earth',
    initialSection: 'intro',
    bpm: YE_BPM,
    bpmBySection: Object.freeze({}),
    anchors: Object.freeze({
      ye: Object.freeze([EARTH_STAGE_CENTER.x, EARTH_STAGE_TOP, EARTH_STAGE_CENTER.z]),
    }),
    scales: Object.freeze({ ye: 1 }),
    flightRadii: Object.freeze({ ye: 14 }),
    fireworkCues: YE_FIREWORK_CUES,
  }),
});

function canonicalPerformer(id) {
  const value = String(id || '').toLowerCase();
  return value.startsWith('drake') ? 'drake' : value;
}

function sceneMetrics(scene) {
  const result = { children: scene.children.length, objects: 0, lights: 0, performers: 0 };
  scene.traverse((object) => {
    result.objects += 1;
    if (object.isLight) result.lights += 1;
    if (object.name?.startsWith('performer:')) result.performers += 1;
  });
  return result;
}

function audioMetrics(audioManager) {
  return {
    connectedConcertNodes: [
      audioManager?.concertSource,
      audioManager?.concertLowpass,
      audioManager?.concertGain,
    ].filter(Boolean).length,
    active: Boolean(audioManager?._concertActive),
  };
}

function sameStructuralMetrics(before, after) {
  // The first playable show is allowed to install exactly one persistent
  // MediaElementSource -> lowpass -> gain branch. Later runs must preserve
  // that three-node graph verbatim; partial or duplicate graphs still fail.
  const audioNodesStable = before.audio.connectedConcertNodes === after.audio.connectedConcertNodes ||
    (before.audio.connectedConcertNodes === 0 && after.audio.connectedConcertNodes === 3);
  return before.scene.children === after.scene.children &&
    before.scene.objects === after.scene.objects &&
    before.scene.lights === after.scene.lights &&
    after.scene.performers === 0 &&
    audioNodesStable &&
    before.audio.active === after.audio.active;
}

/**
 * Compose one director/media element with two independent show definitions.
 * The public no-argument start remains the original show; startYe selects the
 * earth-stage show while both share timing, audio, fireworks, and cleanup.
 */
export function createConcertShow({
  scene,
  camera,
  atmosphere,
  streetlights,
  postfx,
  audioManager,
  colliders = null,
  quality = 'high',
  showHud = true,
} = {}) {
  const performers = [];
  const currentById = new Map();
  const spawnedIds = new Set();
  const fireworkAudio = createFireworkAudio({ audioManager });
  let activeStaging = null;
  const fireworks = createFireworks({
    scene,
    quality,
    audio: fireworkAudio,
    onBurst: (burst) => activeStaging?.flash?.(burst.intensity, burst),
  });
  // A grounded field of dancing shrimp people serves both shows. Built once at
  // construction (like the stagings) so it is present in the scene when the
  // structural baseline is snapshotted, and only toggled visible per run.
  const crowd = createConcertCrowd({ scene, quality });
  const stagings = Object.freeze({
    sky: createConcertStaging({ scene, camera, atmosphere, streetlights, postfx, quality }),
    earth: createEarthConcertStaging({
      scene,
      camera,
      atmosphere,
      streetlights,
      postfx,
      quality,
      center: EARTH_STAGE_CENTER,
      stageTop: EARTH_STAGE_TOP,
    }),
  });

  let activeShow = SHOWS.sicko;
  activeStaging = stagings[activeShow.stagingId];
  let activePerformer = null;
  let section = activeShow.initialSection;
  let runActive = false;
  let ending = false;
  let disposed = false;
  let baseline = null;
  let lastAudit = null;
  let lastSongTime = 0;
  let finaleSparkleAt = 0;
  let runId = 0;
  const lifecycleListeners = new Set();
  // main.js retains this exact array object for flight collision queries.
  const flightExclusions = [];
  const earthStageCollision = Object.freeze({
    id: 'concert-earth-stage-collider',
    type: 'circle',
    x: EARTH_STAGE_CENTER.x,
    z: EARTH_STAGE_CENTER.z,
    radius: EARTH_STAGE_FOOTPRINT_RADIUS,
  });

  function installStageCollision() {
    if (activeShow.id !== 'ye') return;
    if (!flightExclusions.includes(earthStageCollision)) flightExclusions.push(earthStageCollision);
    if (Array.isArray(colliders) && !colliders.includes(earthStageCollision)) {
      colliders.push(earthStageCollision);
    }
  }

  function removeStageCollision() {
    const flightIndex = flightExclusions.indexOf(earthStageCollision);
    if (flightIndex >= 0) flightExclusions.splice(flightIndex, 1);
    if (Array.isArray(colliders)) {
      const colliderIndex = colliders.indexOf(earthStageCollision);
      if (colliderIndex >= 0) colliders.splice(colliderIndex, 1);
    }
  }

  function emitLifecycle(type) {
    const event = Object.freeze({
      type,
      state: director.state,
      time: director.time,
      runId,
      showId: activeShow.id,
    });
    for (const listener of lifecycleListeners) listener(event, director);
  }

  function metrics() {
    return { scene: sceneMetrics(scene), audio: audioMetrics(audioManager) };
  }

  function removePerformer(record) {
    record.performer.root.removeFromParent();
    record.performer.dispose();
    const index = performers.indexOf(record);
    if (index >= 0) performers.splice(index, 1);
    const zoneIndex = flightExclusions.indexOf(record.flightExclusion);
    if (zoneIndex >= 0) flightExclusions.splice(zoneIndex, 1);
    if (currentById.get(record.id) === record) currentById.delete(record.id);
    if (activePerformer === record.performer) {
      activePerformer = performers.findLast?.((item) => item.performer.state !== 'dissolving')?.performer ?? null;
    }
  }

  function clearVisuals() {
    activeStaging?.stop?.();
    crowd.stop();
    atmosphere?.setConcertDaylight?.(false);
    removeStageCollision();
    for (const record of [...performers]) removePerformer(record);
    currentById.clear();
    activePerformer = null;
    fireworks.clear();
    fireworkAudio.reset();
    runActive = false;
    ending = false;
  }

  function audit(reason) {
    if (!baseline) return null;
    const after = metrics();
    lastAudit = {
      reason,
      before: baseline,
      after,
      passed: sameStructuralMetrics(baseline, after),
    };
    return lastAudit;
  }

  function currentAnchor(id) {
    const anchor = activeShow.anchors[id];
    if (!anchor) return null;
    const y = activeShow.id === 'ye' && Number.isFinite(activeStaging?.performerY)
      ? activeStaging.performerY
      : anchor[1];
    return [anchor[0], y, anchor[2]];
  }

  function setSection(nextSection) {
    if (nextSection) section = nextSection;
    for (const record of performers) record.performer.parts.section = section;
  }

  function spawn(target) {
    const id = canonicalPerformer(target);
    const anchor = currentAnchor(id);
    if (!anchor) return null;
    const prior = currentById.get(id);
    if (prior) prior.performer.dissolveOut();
    const performer = createPerformer(target);
    // Guard registry typos: the old fallback-to-Travis behavior must not put
    // an aquatic act on the earth stage when a Ye cue is misspelled.
    if (performer.id !== id && !(id === 'drake' && performer.id === 'drake')) {
      performer.dispose();
      return null;
    }
    performer.parts.section = section;
    performer.root.position.set(anchor[0], anchor[1], anchor[2]);
    performer.root.scale.setScalar(activeShow.scales[id] || 1);
    scene.add(performer.root);
    performer.spawnIn();
    const record = { id, target, performer };
    record.flightExclusion = {
      x: anchor[0],
      z: anchor[2],
      radius: activeShow.flightRadii[id] || 18,
      performerId: id,
    };
    performers.push(record);
    flightExclusions.push(record.flightExclusion);
    currentById.set(id, record);
    activePerformer = performer;
    spawnedIds.add(id);
    return performer;
  }

  function dissolve(target) {
    const id = canonicalPerformer(target);
    const record = currentById.get(id);
    if (!record) return;
    record.performer.dissolveOut();
    currentById.delete(id);
    if (activePerformer === record.performer) {
      activePerformer = performers.findLast?.((item) => (
        item !== record && item.performer.state !== 'dissolving'
      ))?.performer ?? null;
    }
  }

  function launchCue(cue) {
    const profile = cue.section || section;
    for (const launch of activeShow.fireworkCues[cue.id] || []) {
      fireworks.launch({ ...launch, movement: launch.movement || profile });
    }
  }

  function handleSectionCue(cue) {
    setSection(cue.section);
    fireworks.setMovement(section);
  }

  const director = new Concert({
    shows: SHOWS,
    audioManager,
    showHud,
    cueHandlers: {
      performerIn: (cue) => {
        handleSectionCue(cue);
        spawn(cue.target);
      },
      performerOut: (cue) => {
        handleSectionCue(cue);
        dissolve(cue.target);
      },
      beatSwitch: (cue) => {
        handleSectionCue(cue);
        activeStaging?.shockwave?.();
      },
      shockwave: (cue) => {
        handleSectionCue(cue);
        activeStaging?.shockwave?.();
      },
      skyShift: (cue) => handleSectionCue(cue),
      lightCue: (cue) => {
        handleSectionCue(cue);
        const lightCue = activeStaging?.lightCue || activeStaging?.setLightCue;
        lightCue?.call(activeStaging, cue);
      },
      fireworks: (cue) => {
        handleSectionCue(cue);
        launchCue(cue);
      },
      showEnd: () => {
        ending = true;
        if (activeShow.teardownSeconds > 0) {
          activeStaging?.beginTeardown?.();
          for (const record of performers) record.performer.dissolveOut();
        } else {
          // Preserve the original show's synchronous visual retirement. The
          // wrapper audits after the director lowers the audio bus below.
          clearVisuals();
        }
        emitLifecycle('end');
      },
    },
  });

  const directorStart = director.start.bind(director);
  const directorStop = director.stop.bind(director);
  const directorUpdate = director.update.bind(director);
  const directorDispose = director.dispose.bind(director);

  director.start = function start(showId = 'sicko') {
    if (disposed) return director;
    const requested = SHOWS[String(showId)] || null;
    if (!requested) return director;
    if ((runActive || director.state !== 'idle') && requested.id !== activeShow.id) {
      return director;
    }
    if (runActive || director.state !== 'idle') {
      emitLifecycle('restart');
      directorStop({ immediate: true });
      clearVisuals();
      audit('restart');
    }

    activeShow = requested;
    activeStaging = stagings[activeShow.stagingId];
    const preStartScene = sceneMetrics(scene);
    directorStart(activeShow.id);
    // MediaElementSource nodes are persistent and reusable across both srcs.
    baseline = {
      scene: preStartScene,
      audio: { ...audioMetrics(audioManager), active: false },
    };
    lastAudit = null;
    spawnedIds.clear();
    section = activeShow.initialSection;
    fireworks.setMovement(section);
    lastSongTime = 0;
    finaleSparkleAt = 0;
    ending = false;
    runActive = true;
    atmosphere?.setConcertDaylight?.(true);
    installStageCollision();
    activeStaging?.start?.();
    crowd.start();
    runId += 1;
    emitLifecycle('start');
    return director;
  };

  director.startYe = () => director.start('ye');

  director.stop = function stop() {
    if (disposed) return director;
    if (director.state === 'idle' && !runActive) return director;
    directorStop({ immediate: true });
    clearVisuals();
    audit('stop');
    emitLifecycle('stop');
    return director;
  };

  director.update = function update(dt, playerPos) {
    if (disposed) return;
    directorUpdate(dt, playerPos);

    if (!runActive) {
      if (baseline && !lastAudit && director.lastCue?.type === 'showEnd') audit('showEnd');
      return;
    }
    if (director.state === 'idle') {
      clearVisuals();
      audit(ending ? 'showEnd' : 'idle');
      return;
    }

    const songDelta = Math.max(0, director.time - lastSongTime);
    lastSongTime = director.time;
    const bpm = activeShow.bpmBySection[section] || activeShow.bpm;
    const beatPhase = (director.time * bpm / 60) % 1;
    const visualDelta = Math.min(
      0.25,
      Math.max(0, Number.isFinite(dt) ? dt : 0) * director.timeScale,
    );

    activeStaging?.update?.({
      elapsed: director.time,
      section,
      movement: section,
      beatPhase,
      bpm,
      state: director.state,
      // Keep the completed arming sample visible on the first running frame;
      // otherwise a compressed verification step could make the earth mound
      // briefly fall back to song-time rise logic.
      armingProgress: director.armingProgress,
      teardownProgress: director.state === 'teardown' ? director.teardownProgress : null,
    });

    crowd.update({ elapsed: director.time, beatPhase });

    for (const record of [...performers]) {
      if (activeShow.id === 'ye' && Number.isFinite(activeStaging?.performerY)) {
        record.performer.root.position.y = activeStaging.performerY;
      }
      record.performer.update(visualDelta, director.time, beatPhase);
      if (record.performer.finished) removePerformer(record);
    }
    fireworks.update(Math.min(0.1, visualDelta));

    // The original show keeps its low-rate finale sparkle. Ye uses authored
    // finale and outro barrages instead of an aquatic glyph mix.
    if (activeShow.id === 'sicko' && director.state === 'finale' &&
        director.time >= finaleSparkleAt) {
      fireworks.launch({ type: 'strobe', count: 1, site: 'all', palette: 'white' });
      finaleSparkleAt = director.time + Math.max(0.8, songDelta > 4 ? songDelta : 1.35);
    }
  };

  director.debugSpawn = (id) => {
    if (disposed) return null;
    if (!runActive) {
      activeShow = id === 'ye' ? SHOWS.ye : SHOWS.sicko;
      activeStaging = stagings[activeShow.stagingId];
      baseline = metrics();
      runActive = true;
      section = activeShow.initialSection;
      atmosphere?.setConcertDaylight?.(true);
      installStageCollision();
      activeStaging?.start?.();
      crowd.start();
    }
    return spawn(id);
  };

  director.debugState = () => ({
    state: director.state,
    time: director.time,
    timeScale: director.timeScale,
    showId: activeShow.id,
    directorShowId: director.showId,
    section,
    runId,
    disposed,
    armingProgress: director.armingProgress,
    teardownProgress: director.teardownProgress,
    activePerformers: performers.map((record) => ({ id: record.id, state: record.performer.state })),
    spawnedIds: [...spawnedIds],
    firedCueIds: [...director.firedCueIds],
    lastRunCueIds: [...director.lastRunCueIds],
    expectedCueIds: director.cues.map((cue) => cue.id),
    quality,
    expectedCueCount: director.cues.length,
    audit: lastAudit,
    metrics: metrics(),
    staging: activeStaging?.debugState?.() ?? null,
  });

  director.flightExclusions = flightExclusions;
  director.onLifecycle = (listener) => {
    if (disposed || typeof listener !== 'function') return () => {};
    lifecycleListeners.add(listener);
    return () => lifecycleListeners.delete(listener);
  };
  director.dispose = () => {
    if (disposed) return;
    disposed = true;
    directorStop({ immediate: true });
    clearVisuals();
    emitLifecycle('dispose');
    lifecycleListeners.clear();
    for (const staging of Object.values(stagings)) staging.dispose();
    crowd.dispose();
    fireworks.dispose();
    fireworkAudio.dispose();
    directorDispose();
  };

  return director;
}
