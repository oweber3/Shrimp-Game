// Stunt scoring: turns the cart's touchdown summaries into named tricks,
// points and a crash-resettable combo multiplier. Pure logic — the DOM lives
// in ui/stuntHud.js.

const BEST_KEY = 'shrimp-stunt-best';

// Rotation thresholds are forgiving (300° counts as a full turn) so a trick
// that lands doesn't get robbed by the few degrees the landing ate.
const FULL_TURN = 300;
const PREFIX = ['', 'Double ', 'Triple ', 'Quad '];

export class Stunts {
  constructor(hud) {
    this.hud = hud;
    this.score = 0;
    this.multiplier = 1;
    this.bestTrick = loadBest();
    hud.setScore(0, 1);
    if (this.bestTrick) hud.setBestTrick(this.bestTrick);
  }

  // Landing event from the cart: { quality, airTime, spinDeg, flipDeg, rollDeg }.
  onLanding(evt) {
    if (evt.quality === 'crash') {
      this.multiplier = 1;
      this.hud.setScore(this.score, this.multiplier);
      this.hud.popup('WRECKED!', 'crash');
      return;
    }

    const { name, points, isTrick } = describeTrick(evt);
    if (points <= 0) return;

    const total = Math.round(points * this.multiplier);
    this.score += total;

    let label = name;
    if (evt.quality === 'sketchy') label += ' (sketchy)';
    if (this.multiplier > 1) label += `  x${this.multiplier}`;
    this.hud.popup(`${label}  +${total}`, evt.quality === 'sketchy' ? 'sketchy' : 'clean');

    // Chaining: clean trick landings grow the multiplier; sketchy ones keep
    // it alive without growing it.
    if (isTrick && evt.quality === 'clean') {
      this.multiplier = Math.min(5, this.multiplier + 1);
    }
    this.hud.setScore(this.score, this.multiplier);

    if (!this.bestTrick || total > this.bestTrick.points) {
      this.bestTrick = { name, points: total };
      saveBest(this.bestTrick);
      this.hud.setBestTrick(this.bestTrick);
    }
  }
}

function describeTrick(evt) {
  const spins = Math.floor(evt.spinDeg / (FULL_TURN / 2)); // per 180°
  const flips = Math.floor(Math.abs(evt.flipDeg) / FULL_TURN);
  const rolls = Math.floor(evt.rollDeg / FULL_TURN);

  const names = [];
  if (flips > 0) {
    names.push(count(flips) + (evt.flipDeg > 0 ? 'Frontflip' : 'Backflip'));
  }
  if (rolls > 0) names.push(count(rolls) + 'Barrel Roll');
  if (spins > 0) names.push(`${Math.min(spins, 8) * 180} Spin`);

  let points =
    Math.round(evt.airTime * 60) +
    spins * 150 +
    flips * 400 +
    rolls * 300;
  if (evt.quality === 'sketchy') points = Math.round(points / 2);

  const isTrick = names.length > 0 || evt.airTime > 1.2;
  let name;
  if (names.length > 0) name = names.join(' + ');
  else if (evt.airTime > 1.2) name = 'Big Air';
  else name = 'Air';
  return { name, points, isTrick };
}

function count(n) {
  return PREFIX[Math.min(n, PREFIX.length) - 1];
}

function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw);
    return b && typeof b.points === 'number' && typeof b.name === 'string' ? b : null;
  } catch {
    return null;
  }
}

function saveBest(best) {
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
  } catch {
    // Private browsing / storage denied: best-trick just doesn't persist.
  }
}
