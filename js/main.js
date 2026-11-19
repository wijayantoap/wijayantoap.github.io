import { wireScenery } from './paper-toys.js?v=cast1';
import { wireCast } from './cast.js?v=cast1';

const journey = document.querySelector('.journey');
const theatre = journey.querySelector('.theatre');
const scenes = [...theatre.querySelectorAll('.scene')];
const names = scenes.map(scene => scene.id);
const contents = theatre.querySelector('.contents');
const trailSign = theatre.querySelector('.trail-sign');
const skySetting = contents.querySelector('.sky-setting');
const skyToggle = skySetting.querySelector('input');
const menuLinks = [...contents.querySelectorAll('a')];
const header = theatre.querySelector('.stage-header');
const walker = theatre.querySelector('.walker');
const pages = theatre.querySelector('.pages');
const wardrobe = scenes.map(scene => scene.querySelector('.still-guide'));
const [outfitBefore, outfitAfter] = walker.querySelectorAll('.costume-layer');
const cards = [...theatre.querySelectorAll('.hero-cards button')];
function makeFold(scene, side) {
  const leaf = document.createElement('div');
  leaf.className = 'book-fold fold-' + side;
  leaf.setAttribute('aria-hidden','true');
  leaf.hidden = true;
  const ink = document.createElement('i');
  ink.className = 'fold-ink';
  leaf.append(ink);
  scene.append(leaf);
  return leaf;
}
const folds = scenes.slice(0,-1).map((scene, i) => [makeFold(scene,'out'), makeFold(scenes[i + 1],'in')]);
const back = theatre.querySelector('.back');
const next = theatre.querySelector('.pull');
const nextLabel = next.querySelector('.next-label');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const reactCast = wireCast(scenes, walker, motion);
const arriveAtScene = wireScenery(scenes, motion, reactCast);
const landscape = matchMedia('(min-aspect-ratio: 1/1)');
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
let enhanced = false;
let step = 1;
let last = 0;
let current = -1;
let scheduled = false;
let worldWidth = 1;
let guideWidth = 1;
let strideLength = 48;
let wardrobeIndex = -1;
let lastDressed = 0;
let restTimer = 0;
let lastFold = -1;
let lastPrevious = -2;
let lastNext = -2;
let phase = 0;
let lastPaintTime = 0;
let travelFrame = 0;
let wheelFrame = 0;
let wheelTarget = 0;
let heldArrow = null;
let markers = [];
let pendingChapter = -1;

function focusHeading(section) {
  const heading = section.querySelector('h1,h2');
  heading.tabIndex = -1;
  heading.focus({preventScroll:true});
}

function ease(start, end, value) {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
}

// A scored hinge opens past vertical and settles back against its stop.
// The pose depends only on distance, including when walking backwards.
function hinge(open) {
  const rise = 79 * (1 - ease(0, .83, open));
  const settle = 6 * Math.sin(Math.PI * ease(.7, 1, open));
  return rise - settle;
}

function poseScene(i, offset) {
  const scene = scenes[i];
  const arriving = offset <= 0;
  const opening = (start, end) => arriving
    ? ease(start, end, 1 + offset)
    : 1 - ease(.16, .88, offset);
  const landmark = opening(landscape.matches ? .59 : .46, .98);
  const post = opening(.22, .84);
  if (scene.classList.contains('history')) {
    scene.style.setProperty('--horizon-x', (i + offset) * worldWidth * .72 + 'px');
  }
  scene.style.setProperty('--hinge', hinge(landmark) + 'deg');
  if (scene.querySelector('.diorama')) scene.style.setProperty('--lift',1 - landmark);
  scene.style.setProperty('--post-hinge', hinge(post) + 'deg');
  scene.style.setProperty('--blade-turn', ((1 - post) * -57 + Math.sin(Math.PI * post) * 13) + 'deg');
  if (scene.classList.contains('arena')) {
    cards.forEach((card, index) => card.style.setProperty('--deal', 1 - opening(.52 + index * .07, .86 + index * .06)));
  }
  if (scene.classList.contains('printshop')) scene.style.setProperty('--gather', 1 - landmark);
}

function turnPaper(index, fraction) {
  poseScene(index, fraction);
  if (index + 1 < scenes.length) poseScene(index + 1, fraction - 1);
  const active = fraction > 0 && index < folds.length ? index : -1;
  if (lastFold !== active) {
    if (lastFold >= 0) folds[lastFold].forEach(leaf => { leaf.hidden = true; });
    if (active >= 0) folds[active].forEach(leaf => { leaf.hidden = false; });
    lastFold = active;
  }
  if (active >= 0) {
    const scale = 'scaleX(' + Math.sin(Math.PI * fraction) + ')';
    folds[active].forEach(leaf => { leaf.style.transform = scale; });
  }
}

function dress(layer, index) {
  if (layer.dataset.outfit !== names[index]) {
    layer.style.setProperty('--costume', 'url("' + wardrobe[index].src + '")');
    layer.dataset.outfit = names[index];
  }
}

// The seam travels across the actual width of the guide. Both costumes use
// the same stride frame and foot line, so reversing a half-finished change
// reveals the preceding outfit at exactly the same step.
function changeCostume(index, fraction, guideX) {
  const nextIndex = Math.min(index + 1, wardrobe.length - 1);
  if (wardrobeIndex !== index) {
    wardrobeIndex = index;
    wardrobe[index].loading = 'eager';
    wardrobe[nextIndex].loading = 'eager';
  }
  const ready = i => wardrobe[i].complete && wardrobe[i].naturalWidth > 0;
  const boundary = ((1 - fraction - guideX / 100) * worldWidth / guideWidth + .5) * 100;
  const changing = nextIndex !== index && boundary > -8 && boundary < 108 && ready(index) && ready(nextIndex);
  if (changing) {
    dress(outfitBefore,index);
    dress(outfitAfter,nextIndex);
    const top = (boundary - 8).toFixed(2) + '%';
    const bottom = (boundary + 8).toFixed(2) + '%';
    outfitBefore.style.clipPath = 'polygon(0 0,' + top + ' 0,' + bottom + ' 100%,0 100%)';
    outfitAfter.style.clipPath = 'polygon(' + top + ' 0,100% 0,100% 100%,' + bottom + ' 100%)';
    outfitAfter.hidden = false;
    lastDressed = boundary < 50 ? nextIndex : index;
  } else {
    const desired = boundary < 50 ? nextIndex : index;
    if (ready(desired)) lastDressed = desired;
    dress(outfitBefore,lastDressed);
    outfitBefore.style.clipPath = '';
    outfitAfter.hidden = true;
  }
}

wardrobe.forEach(image => image.addEventListener('load',scheduleRender));

// Dust stays on the scrolling ground after the heel lifts, including when
// the walker turns around before the previous puff has dispersed.
function kickUpDust(heelX, direction) {
  const puff = document.createElement('span');
  puff.className = 'step-dust';
  puff.setAttribute('aria-hidden', 'true');
  puff.style.left = heelX + 'px';
  puff.style.scale = direction + ' 1';
  pages.append(puff);
  const drift = puff.animate([
    { opacity: .4, transform: 'translate(0,0) scale(.38,.45)' },
    { opacity: .95, transform: 'translate(-12%,-9%) scale(.91,.95)', offset: .22 },
    { opacity: 0, transform: 'translate(-72%,-88%) scale(1.2,.82)' }
  ], { duration: 360, easing: 'ease-out', fill: 'forwards' });
  drift.onfinish = drift.oncancel = () => puff.remove();
}

// Only distance covered advances the gait. A pause returns the paper figure
// to its standing pose without changing its place on the sidewalk.
function render(now = performance.now()) {
  scheduled = false;
  if (!enhanced) return;
  const position = clamp(-journey.getBoundingClientRect().top / step, 0, scenes.length - 1);
  const index = Math.floor(position);
  const fraction = position - index;
  const nearest = Math.round(position);
  const pixels = position * worldWidth;
  pages.style.transform = 'translate3d(' + (-pixels) + 'px,0,0)';
  turnPaper(index, fraction);

  if (current !== nearest) {
    current = nearest;
    const focusedScene = document.activeElement.closest('.scene');
    if (focusedScene && focusedScene !== scenes[current]) next.focus({preventScroll:true});
    scenes.forEach((scene,i) => { scene.inert = i !== current; });
    menuLinks.forEach(a => {
      if (a.hash === '#' + names[current]) a.setAttribute('aria-current','location');
      else a.removeAttribute('aria-current');
    });
    header.classList.toggle('on-dark',scenes[current].classList.contains('arena'));
  }
  if (pendingChapter >= 0 && Math.abs(position - pendingChapter) < .004) {
    focusHeading(scenes[pendingChapter]);
    pendingChapter = -1;
  }
  // Directional signposts always lead to the first stop ahead or behind.
  const previousIndex = Math.ceil(position - .004) - 1;
  const nextIndex = Math.floor(position + .004) + 1;
  if (previousIndex !== lastPrevious) {
    lastPrevious = previousIndex;
    back.hidden = previousIndex < 0;
    back.setAttribute('href', '#' + names[Math.max(0,previousIndex)]);
  }
  if (nextIndex !== lastNext) {
    lastNext = nextIndex;
    next.setAttribute('href', '#' + (names[nextIndex] || 'about'));
  }
  const atTrailhead = position < .16;
  if (atTrailhead && document.activeElement.closest('.travel')) trailSign.focus({preventScroll:true});
  theatre.classList.toggle('at-trailhead',atTrailhead);
  const label = scenes[nextIndex]?.dataset.name || 'About me';
  if (nextLabel.textContent !== label) nextLabel.textContent = label;

  const startsAt = landscape.matches ? 37 : 31;
  const walkingLine = landscape.matches ? 26 : 17;
  const guideX = startsAt + (walkingLine - startsAt) * clamp(position);
  walker.style.setProperty('--guide-x',guideX + '%');
  const delta = (position - last) * worldWidth;
  const dt = clamp(now - lastPaintTime, 0, 100);
  if (Math.abs(delta) > .01) {
    // Cap the cadence during a fast trackpad fling so individual steps read.
    const lastFoot = Math.floor(phase / 2);
    phase = (phase + Math.min(Math.abs(delta) / strideLength * 4, dt * .010)) % 4;
    const foot = Math.floor(phase / 2);
    const direction = Math.sign(delta);
    const footfall = foot !== lastFoot || walker.classList.contains('is-resting');
    if (footfall && Math.abs(delta) < worldWidth / 2 && walker.classList.contains('is-onscreen') &&
        document.documentElement.classList.contains('sky-running')) {
      const heelX = pixels + guideX / 100 * worldWidth - direction * guideWidth * (foot ? .19 : .24);
      kickUpDust(heelX, direction);
    }
    walker.style.setProperty('--gait-frame', (1 + Math.floor(phase)) * 25 + '%');
    walker.style.setProperty('--facing', direction);
    walker.classList.remove('is-resting');
    clearTimeout(restTimer);
    restTimer = setTimeout(() => {
      walker.style.setProperty('--gait-frame','0%');
      walker.classList.add('is-resting');
    }, 150);
  }
  changeCostume(index, fraction, guideX);
  if (Math.abs(position - nearest) < .13) arriveAtScene(scenes[nearest]);
  last = position;
  lastPaintTime = now;
}

function scheduleRender() {
  if (!scheduled) { scheduled=true; requestAnimationFrame(render); }
}

function layout() {
  const wasEnhanced = enhanced;
  const before = enhanced ? clamp(-journey.getBoundingClientRect().top / step,0,scenes.length-1) : 0;
  const wasOnStage = enhanced && journey.getBoundingClientRect().top <= 0 && journey.getBoundingClientRect().bottom >= theatre.clientHeight;
  // On short screens or with reduced motion, every chapter is a normal document section.
  enhanced = !motion.matches && window.innerHeight >= 520;
  if (enhanced !== wasEnhanced) {
    if (enhanced) {
      markers = scenes.map((scene,index) => {
        scene.removeAttribute('id');
        const marker=document.createElement('div');
        marker.className='marker'; marker.id=names[index]; marker.setAttribute('aria-hidden','true');
        journey.prepend(marker);
        return marker;
      });
    } else {
      markers.forEach(marker=>marker.remove());
      scenes.forEach((scene,index)=>{
        scene.id=names[index]; scene.inert=false;
      });
      header.classList.remove('on-dark');
      pages.style.transform='';
      theatre.classList.remove('at-trailhead');
      cancelTravel();
      current=-1;
    }
    document.documentElement.classList.toggle('ready',enhanced);
  }
  if (!enhanced) return;
  const stageHeight = theatre.clientHeight || window.innerHeight;
  worldWidth = theatre.clientWidth;
  scenes.forEach((scene,i) => scene.style.setProperty('--floor-x', -i * worldWidth + 'px'));
  guideWidth = walker.clientWidth;
  strideLength = Math.max(48, walker.clientHeight * .72);
  step = Math.round(Math.max(stageHeight * .9, worldWidth * .72));
  journey.style.setProperty('--journey-height',(stageHeight+step*(scenes.length-1)+Math.round(stageHeight*.22))+'px');
  markers.forEach((marker,i)=>{marker.style.top=(i*step)+'px';});
  if (wasOnStage && wasEnhanced) window.scrollTo({top:journey.offsetTop+before*step,behavior:'instant'});
  render();
}

function cancelTravel() {
  cancelAnimationFrame(travelFrame);
  cancelAnimationFrame(wheelFrame);
  travelFrame = 0;
  wheelFrame = 0;
  heldArrow = null;
  pendingChapter = -1;
}

function go(id) {
  const target = document.getElementById(id);
  if (!target) return;
  cancelTravel();
  contents.open = false;
  if (location.hash !== '#' + id) history.pushState(null,'','#' + id);
  if (!enhanced || !names.includes(id) || journey.getBoundingClientRect().bottom < theatre.clientHeight) {
    target.scrollIntoView({behavior: motion.matches ? 'instant' : 'smooth', block:'start'});
    return;
  }
  const start = window.scrollY;
  const distance = target.getBoundingClientRect().top;
  if (Math.abs(distance) < 1) return;
  const duration = clamp(Math.abs(distance) / step * 1150, 320, 3300);
  const began = performance.now();
  function advance(now) {
    const t = clamp((now - began) / duration);
    const eased = t * t * (3 - 2 * t);
    window.scrollTo({top:start + distance * eased,behavior:'instant'});
    if (t < 1) travelFrame = requestAnimationFrame(advance);
    else travelFrame=0;
  }
  travelFrame = requestAnimationFrame(advance);
}

document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(link && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey){
    const id=link.hash.slice(1);
    if(document.getElementById(id)){
      event.preventDefault();go(id);
      if(id==='about'||id==='contact'){
        focusHeading(document.getElementById(id));
      } else if(link.closest('.about, .return-sign, .chapter-list')) {
        const chapter = names.indexOf(id);
        if (enhanced) { pendingChapter = chapter; scheduleRender(); }
        else if (chapter >= 0) focusHeading(scenes[chapter]);
      }
    }
  }
  if(!contents.contains(event.target)) contents.open=false;
});

document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && contents.open){contents.open=false;contents.querySelector('summary').focus();return;}
  if (!['ArrowRight','ArrowLeft'].includes(event.key)) {
    if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)) cancelTravel();
    return;
  }
  if(!enhanced || contents.open || event.altKey || event.ctrlKey || event.metaKey ||
      event.target.closest('input, textarea, select, [contenteditable], .prop')) return;
  if(theatre.getBoundingClientRect().bottom < theatre.clientHeight*.85) return;
  event.preventDefault();
  if(heldArrow?.key === event.key) return;
  cancelTravel();
  const direction=event.key==='ArrowRight'?1:-1;
  if(direction < 0 && back.hidden) return;
  const link=direction>0 ? next : back;
  heldArrow={key:event.key, began:performance.now(), destination:link.hash.slice(1)};
  let previous=performance.now();
  function walking(now) {
    const amount=direction * Math.min(48,now-previous) * step / 1250;
    previous=now;
    window.scrollBy({top:amount,behavior:'instant'});
    if (journey.getBoundingClientRect().bottom <= theatre.clientHeight || (direction<0 && window.scrollY<=0)) {
      cancelTravel();
      return;
    }
    travelFrame=requestAnimationFrame(walking);
  }
  travelFrame=requestAnimationFrame(walking);
});
document.addEventListener('keyup',event=>{
  if(event.key!==heldArrow?.key) return;
  const {began,destination}=heldArrow;
  cancelTravel();
  if(performance.now()-began < 170) go(destination);
});
window.addEventListener('blur',cancelTravel);
window.addEventListener('popstate',cancelTravel);

let drag=null;
theatre.addEventListener('touchstart',event=>{
  cancelTravel();
  const control=event.target.closest('a,button,summary,.chapter-list');
  drag=enhanced && event.touches.length===1 && (!control || control.matches('.scene-handle,.greet,.swap,[data-hero]'))
    ? {x:event.touches[0].clientX,y:event.touches[0].clientY,scroll:window.scrollY,axis:null} : null;
},{passive:true});
theatre.addEventListener('touchmove',event=>{
  if(!drag || event.touches.length!==1) return;
  const dx=event.touches[0].clientX-drag.x, dy=event.touches[0].clientY-drag.y;
  if(!drag.axis && Math.max(Math.abs(dx),Math.abs(dy))>7) drag.axis=Math.abs(dx)>Math.abs(dy)*1.15?'x':'y';
  if(drag.axis!=='x') return;
  if(event.cancelable) event.preventDefault();
  const top=clamp(drag.scroll-dx*step/worldWidth,journey.offsetTop,journey.offsetTop+step*(scenes.length-1));
  window.scrollTo({top,behavior:'instant'});
},{passive:false});
for(const eventName of ['touchend','touchcancel']) theatre.addEventListener(eventName,()=>{drag=null;},{passive:true});
window.addEventListener('wheel',event=>{
  if (!theatre.contains(event.target)) cancelTravel();
},{passive:true,capture:true});

function startWheelGlide(y) {
  let previous = performance.now();
  function glide(now) {
    const remaining = wheelTarget - y;
    // Follow small trackpad movements closely and spread a wheel notch over several frames.
    const smoothingMs = clamp(Math.abs(remaining) * .5, 18, 72);
    const decay = Math.exp(-Math.max(0, now - previous) / smoothingMs);
    previous = now;
    y = Math.abs(remaining) < .5 ? wheelTarget : wheelTarget - remaining * decay;
    window.scrollTo({top:y,behavior:'instant'});
    wheelFrame = y === wheelTarget ? 0 : requestAnimationFrame(glide);
  }
  wheelFrame = requestAnimationFrame(glide);
}

theatre.addEventListener('wheel',event=>{
  if (!enhanced || event.ctrlKey || contents.open || !event.cancelable) { cancelTravel(); return; }
  const mode = event.deltaMode;
  const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
  const raw = horizontal ? event.deltaX : event.deltaY;
  if (!raw) return;
  const pageSize = horizontal ? worldWidth : theatre.clientHeight;
  const unit = mode === WheelEvent.DOM_DELTA_LINE ? 16 : mode === WheelEvent.DOM_DELTA_PAGE ? pageSize : 1;
  const delta = raw * unit * (horizontal ? step / worldWidth : 1);
  const y = window.scrollY;
  const min = horizontal ? journey.offsetTop : 0;
  const max = horizontal ? min + step * (scenes.length - 1) : document.documentElement.scrollHeight - innerHeight;
  if ((y <= min + .5 && delta < 0) || (y >= max - .5 && delta > 0)) {
    cancelTravel();
    return;
  }
  event.preventDefault();
  // Keep subpixel input across rounded scroll positions. Discard queued travel on reversal.
  const pending = wheelTarget - y;
  const keepTarget = Math.abs(pending) < 1 || (wheelFrame !== 0 && pending * delta > 0);
  wheelTarget = clamp((keepTarget ? wheelTarget : y) + delta, min, max);
  if (!wheelFrame) {
    cancelTravel();
    startWheelGlide(y);
  }
},{passive:false});

const picks={Axe:'Your front line is ready.','Drow Ranger':'Your lineup has ranged damage.',Puck:'Your lineup can initiate a fight.'};
theatre.querySelectorAll('[data-hero]').forEach(button=>button.addEventListener('click',()=>{
  theatre.querySelectorAll('[data-hero]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  theatre.querySelector('.draft-status').textContent=button.dataset.hero+' picked. '+picks[button.dataset.hero];
  reactCast(button.closest('.scene'));
}));
const stack=theatre.querySelector('.poster-stack');
const posterStatus=document.createElement('span');
posterStatus.className='sr-only';posterStatus.setAttribute('aria-live','polite');stack.after(posterStatus);
function topPoster(){
  [...stack.children].forEach(p=>p.setAttribute('aria-hidden',String(p!==stack.lastElementChild)));
  return stack.lastElementChild;
}
topPoster();
const turnPoster=theatre.querySelector('.swap');
turnPoster.hidden=false;
turnPoster.addEventListener('click',()=>{
  stack.prepend(stack.lastElementChild);
  const front=topPoster();
  const caption = [...front.querySelector('figcaption').children].map(line => line.textContent);
  posterStatus.textContent = [...caption, front.querySelector('img').alt].join(' ');
  reactCast(turnPoster.closest('.scene'));
  if(!motion.matches) front.animate([{transform:'rotateY(-75deg) rotate(-6deg)'},{transform:'rotateY(0deg) rotate(1.5deg)'}],{duration:280,easing:'ease-out'});
});

const idleVisibility = new IntersectionObserver(entries => {
  for (const entry of entries) entry.target.classList.toggle('is-onscreen',entry.isIntersecting);
});
scenes.forEach(scene => idleVisibility.observe(scene));
idleVisibility.observe(document.getElementById('contact'));
idleVisibility.observe(walker);
wardrobe.forEach(image => idleVisibility.observe(image.parentElement));

function syncSkyMotion() {
  skySetting.hidden = motion.matches;
  document.documentElement.classList.toggle('sky-running',skyToggle.checked && !motion.matches && !document.hidden);
}
skyToggle.addEventListener('change',syncSkyMotion);
document.addEventListener('visibilitychange',syncSkyMotion);
motion.addEventListener('change',syncSkyMotion);
syncSkyMotion();

window.addEventListener('scroll',scheduleRender,{passive:true});
let resizeFrame=0;
window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(layout);});
motion.addEventListener('change',layout);
layout();
if(location.hash && names.includes(location.hash.slice(1))) {
  document.getElementById(location.hash.slice(1)).scrollIntoView({behavior:'instant'});
  render();
}
