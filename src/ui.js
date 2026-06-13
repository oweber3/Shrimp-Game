// DOM-based HUD: objective tracker, compass, interaction prompt,
// dialogue box, toast messages, completion screen, start overlay.

export class UI {
  constructor() {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.innerHTML = `
      <div id="objective" class="panel">
        <h2>Objective</h2>
        <p id="objective-text">Report to the campus.</p>
      </div>
      <div id="compass" class="panel">
        <div class="dir" id="compass-dir">N</div>
        <div class="arrow" id="compass-arrow" style="display:none">
          <svg width="22" height="22" viewBox="0 0 22 22">
            <polygon points="11,1 19,21 11,15 3,21" fill="#ff9e5e"></polygon>
          </svg>
        </div>
        <div class="target" id="compass-target"></div>
      </div>
      <div id="toast" class="panel"></div>
      <div id="prompt" class="panel"><span class="key">E</span><span id="prompt-text"></span></div>
      <div id="dialogue" class="panel">
        <div class="speaker" id="dialogue-speaker"></div>
        <div class="text" id="dialogue-text"></div>
        <div class="hint">Press E to continue</div>
      </div>
      <div id="help" class="panel">
        <span class="key">WASD / Arrows</span> move &nbsp; <span class="key">Mouse</span> look &nbsp;
        <span class="key">Shift</span> jog &nbsp; <span class="key">E</span> interact / drive &nbsp;
        <span class="key">F</span> punch &nbsp; <span class="key">Tab</span> log &nbsp;
        <span class="key">R</span> reset position
      </div>
      <div id="completion" class="panel">
        <h1>Shift Complete</h1>
        <p id="completion-text"></p>
      </div>
    `;
    document.body.appendChild(hud);

    this.objectiveText = hud.querySelector('#objective-text');
    this.compassDir = hud.querySelector('#compass-dir');
    this.compassArrow = hud.querySelector('#compass-arrow');
    this.compassTarget = hud.querySelector('#compass-target');
    this.prompt = hud.querySelector('#prompt');
    this.promptText = hud.querySelector('#prompt-text');
    this.dialogue = hud.querySelector('#dialogue');
    this.dialogueSpeaker = hud.querySelector('#dialogue-speaker');
    this.dialogueText = hud.querySelector('#dialogue-text');
    this.toast = hud.querySelector('#toast');
    this.completion = hud.querySelector('#completion');
    this.completionText = hud.querySelector('#completion-text');

    this.dialogueLines = null;
    this.dialogueIndex = 0;
    this.onDialogueDone = null;
    this.toastTimer = null;

    // Start overlay with controls; click to lock the pointer and play.
    this.overlay = document.createElement('div');
    this.overlay.id = 'start-overlay';
    this.overlay.innerHTML = `
      <h1>SHRIMP SHIFT</h1>
      <h3>Laitram Town - Harahan, Louisiana</h3>
      <div class="controls">
        <span class="key">WASD / Arrows</span> move &nbsp;&nbsp; <span class="key">Mouse</span> look<br>
        <span class="key">Shift</span> jog &nbsp;&nbsp; <span class="key">E</span> interact / drive &nbsp;&nbsp;
        <span class="key">F</span> punch &nbsp;&nbsp; <span class="key">R</span> reset position
      </div>
      <div class="click">Click to clock in</div>
    `;
    document.body.appendChild(this.overlay);
  }

  onStart(callback) {
    this.overlay.addEventListener('click', () => {
      this.overlay.style.display = 'none';
      callback();
    });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && !this.completionShown) {
        this.overlay.style.display = 'flex';
        const click = this.overlay.querySelector('.click');
        click.textContent = 'Click to resume shift';
      }
    });
  }

  setObjective(text) {
    this.objectiveText.textContent = text;
  }

  showPrompt(text) {
    this.promptText.textContent = ' ' + text;
    this.prompt.style.display = 'block';
  }

  hidePrompt() {
    this.prompt.style.display = 'none';
  }

  isDialogueOpen() {
    return this.dialogue.style.display === 'block';
  }

  showDialogue(speaker, lines, onDone) {
    this.dialogueLines = Array.isArray(lines) ? lines : [lines];
    this.dialogueIndex = 0;
    this.onDialogueDone = onDone || null;
    this.dialogueSpeaker.textContent = speaker;
    this.dialogueText.textContent = this.dialogueLines[0];
    this.dialogue.style.display = 'block';
    this.hidePrompt();
  }

  advanceDialogue() {
    if (!this.isDialogueOpen()) return;
    this.dialogueIndex += 1;
    if (this.dialogueIndex < this.dialogueLines.length) {
      this.dialogueText.textContent = this.dialogueLines[this.dialogueIndex];
    } else {
      this.dialogue.style.display = 'none';
      const cb = this.onDialogueDone;
      this.onDialogueDone = null;
      if (cb) cb();
    }
  }

  showToast(text, ms = 3200) {
    this.toast.textContent = text;
    this.toast.style.display = 'block';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.style.display = 'none';
    }, ms);
  }

  showCompletion(text) {
    this.completionShown = true;
    this.completionText.textContent = text;
    this.completion.style.display = 'block';
    setTimeout(() => {
      this.completion.style.display = 'none';
    }, 9000);
  }

  // Compass: cardinal heading of the camera plus an arrow that points
  // toward the current objective relative to where the player is facing.
  updateCompass(cameraYaw, playerPos, target, targetLabel) {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    // cameraYaw of PI means facing -Z (north).
    let headingDeg = ((Math.PI - cameraYaw) * 180) / Math.PI;
    headingDeg = ((headingDeg % 360) + 360) % 360;
    this.compassDir.textContent = dirs[Math.round(headingDeg / 45) % 8];

    if (target) {
      const angToTarget = Math.atan2(target.x - playerPos.x, target.z - playerPos.z);
      let rel = angToTarget - cameraYaw;
      const deg = (-rel * 180) / Math.PI;
      this.compassArrow.style.display = 'inline-block';
      this.compassArrow.style.transform = `rotate(${deg}deg)`;
      const dist = Math.round(Math.hypot(target.x - playerPos.x, target.z - playerPos.z));
      this.compassTarget.textContent = `${targetLabel} - ${dist} m`;
    } else {
      this.compassArrow.style.display = 'none';
      this.compassTarget.textContent = targetLabel || '';
    }
  }
}
