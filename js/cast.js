export function wireCast(scenes, walker, motion) {
  const timers = new Map();
  const status = document.createElement('span');
  status.className = 'sr-only';
  status.setAttribute('role','status');
  document.body.append(status);
  let nod;

  function react(scene, active = true) {
    clearTimeout(timers.get(scene));
    scene.classList.toggle('cast-reacting', active);
    if (active) {
      timers.set(scene, setTimeout(() => {
        scene.classList.remove('cast-reacting');
        timers.delete(scene);
      }, 1900));
    } else {
      timers.delete(scene);
    }
  }

  function greet(scene, person) {
    const onTrail = document.documentElement.classList.contains('ready');
    const guide = onTrail ? walker : scene.querySelector('.guide-figure');
    const facing = person.getBoundingClientRect().left >= guide.getBoundingClientRect().left ? 1 : -1;
    if (onTrail) walker.style.setProperty('--facing', facing);
    nod?.cancel();
    if (!motion.matches) {
      nod = guide.animate([
        {translate:'0 0', rotate:'0deg'},
        {translate:'0 -5%', rotate:3 * facing + 'deg', offset:.45},
        {translate:'0 0', rotate:'0deg'}
      ], {duration:460, easing:'ease-in-out'});
    }
    react(scene);
    status.textContent = person.dataset.reply;
  }

  for (const scene of scenes) {
    for (const person of scene.querySelectorAll('.companion')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'greet';
      button.title = person.dataset.greet;
      button.setAttribute('aria-label', person.dataset.greet);
      button.append(person.querySelector('img'));
      person.append(button);
      button.addEventListener('click', () => greet(scene, person));
    }
  }
  return react;
}
