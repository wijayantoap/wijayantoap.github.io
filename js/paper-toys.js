// Each hit area and its response share the coordinate system of the printed artwork.
const scenery = [
  {scene:'welcome', object:'paper-plane', label:'Fly the red paper plane', result:'The paper plane circles above Jakarta.', stillResult:'The red paper plane catches the light.', parts:['sky-patch','flying-fold']},
  {scene:'campus', object:'books', label:'Open the graduation books', result:'A graduation cap pops out of the books.', parts:['book-page','grad-cap']},
  {scene:'telkom', object:'kiosk', label:'Print an application at the office kiosk', result:'The kiosk prints a checked application.', parts:['kiosk-screen','application-slip']},
  {scene:'freelance', object:'desk-lamp', label:'Switch the desk lamp', toggle:true, parts:['lamplight','desk-glow']},
  {scene:'accelbyte', object:'arcade', label:'Power the game studio', toggle:true, parts:['game-sign','studio-screens']},
  {scene:'airasia', object:'pickup', label:'Signal the car at the pickup lane', result:'The pickup canopy lights up and the car flashes its headlights.', stillResult:'The pickup lights and the car headlights are on.', parts:['pickup-lights','headlamp','signal-marks']},
  {scene:'frontierra', object:'forge', label:'Strike the anvil to refine the blade', cue:'Strike', onArrival:false, result:'Sparks fly as the blade takes on a golden edge.', stillResult:'The refined blade has a golden edge.', parts:['blade-edge','smith-hammer','forge-sparks']}
];

// One revolution carries the bird to the opposite perch on the stage.
function wireTheatre(model, motion, reactCast) {
  const crank = model.querySelector('.crank-control');
  const status = model.querySelector('.flight-status');
  let turns = 0;
  let frame = 0;
  let drag = null;
  let skipClick = false;

  function pose(value) {
    const direction = Math.sign(value - turns);
    turns = value;
    const angle = value * Math.PI;
    const travel = (1 - Math.cos(angle)) / 2;
    const altitude = Math.sin(angle) ** 2;
    model.style.setProperty('--wheel-angle', value * 360 + 'deg');
    model.style.setProperty('--bird-x', travel * 67 + '%');
    model.style.setProperty('--bird-lift', altitude * 37 + '%');
    model.style.setProperty('--bird-pitch', -5 - 12 * Math.sin(angle * 2) + 'deg');
    model.style.setProperty('--sun-x', (1 - travel) * 13 + '%');
    const velocity = direction * Math.sin(angle);
    if (Math.abs(velocity) > .001) model.style.setProperty('--bird-facing', String(Math.sign(velocity)));
    else if (Number.isInteger(value)) model.style.setProperty('--bird-facing', value % 2 === 0 ? '1' : '-1');
  }

  function announcePosition() {
    status.textContent = Math.cos(turns * Math.PI) > 0 ? 'The bird is on the left of the stage.' : 'The bird is on the right of the stage.';
    reactCast(model.closest('.scene'));
  }

  function play() {
    cancelAnimationFrame(frame);
    const start = turns;
    const end = Math.floor(start + .001) + 1;
    if (motion.matches) { pose(end); announcePosition(); return; }
    const began = performance.now();
    const duration = Math.max(300, (end - start) * 1450);
    function wind(now) {
      const t = Math.min(1, (now - began) / duration);
      pose(start + (end - start) * t * t * (3 - 2 * t));
      if (t < 1) frame = requestAnimationFrame(wind);
      else announcePosition();
    }
    frame = requestAnimationFrame(wind);
  }

  crank.hidden = false;
  crank.addEventListener('click', event => {
    if (event.detail === 0 || !skipClick) play();
    skipClick = false;
  });
  crank.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    skipClick = false;
    if (motion.matches) return;
    cancelAnimationFrame(frame);
    const rect = crank.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    drag = {id:event.pointerId, cx, cy, x:event.clientX, y:event.clientY, angle:Math.atan2(event.clientY - cy, event.clientX - cx)};
    crank.setPointerCapture(event.pointerId);
  });
  crank.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (!skipClick && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 4) return;
    skipClick = true;
    const angle = Math.atan2(event.clientY - drag.cy, event.clientX - drag.cx);
    const delta = angle - drag.angle;
    pose(turns + Math.atan2(Math.sin(delta), Math.cos(delta)) / (2 * Math.PI));
    drag.angle = angle;
  });
  crank.addEventListener('lostpointercapture', () => {
    if (drag && skipClick) announcePosition();
    drag = null;
  });
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    cancelAnimationFrame(frame);
    if (drag) crank.releasePointerCapture(drag.id);
    pose(Math.round(turns));
  });
}

export function wireScenery(scenes, motion, reactCast) {
  const status = document.createElement('span');
  status.className = 'sr-only';
  status.setAttribute('role','status');
  document.body.append(status);
  const arrivals = new Map();
  wireTheatre(document.querySelector('.animation-theatre'), motion, reactCast);

  for (const item of scenery) {
    const scene = scenes.find(section => section.classList.contains(item.scene));
    const surface = scene.querySelector('.paper-model') || scene;
    const art = document.createElement('div');
    art.className = 'scene-effect ' + item.object;
    art.setAttribute('aria-hidden','true');
    for (const part of item.parts) {
      const piece = document.createElement('span');
      piece.className = part;
      art.append(piece);
    }
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'scene-handle handle-' + item.object;
    handle.title = item.label;
    handle.setAttribute('aria-label',item.label);
    if (item.cue) {
      const tag = document.createElement('span');
      tag.textContent = item.cue;
      handle.append(tag);
    }
    if (item.toggle) handle.setAttribute('aria-pressed','false');
    surface.append(art,handle);

    function react(manual) {
      if (!manual && (item.toggle || item.object === 'paper-plane')) {
        art.classList.add('arrival-glimpse');
        if (item.object === 'paper-plane') reactCast(scene);
        return;
      }
      arrivals.delete(scene);
      art.classList.remove('arrival-glimpse');
      const on = !item.toggle || !art.classList.contains('is-on');
      art.classList.toggle('is-on',on);
      reactCast(scene,on);
      if (item.toggle) handle.setAttribute('aria-pressed',String(on));
      if (!motion.matches) {
        art.classList.remove('reacting');
        // Rewind just this paper mechanism when it is tapped again.
        void art.offsetWidth;
        art.classList.add('reacting');
      }
      if (manual && item.result) {
        status.textContent = motion.matches && item.stillResult ? item.stillResult : item.result;
      }
    }
    handle.addEventListener('click',()=>react(true));
    if (item.onArrival !== false) arrivals.set(scene,()=>react(false));
  }

  return scene => {
    const arrive = arrivals.get(scene);
    if (!arrive || motion.matches) return;
    arrivals.delete(scene);
    arrive();
  };
}
