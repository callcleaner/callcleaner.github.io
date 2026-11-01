// CallCleaner project page: abstract toggle, BibTeX copy, and the audio examples
// (spectrogram tiles that play on click; one clip plays at a time). Data: examples.json,
// written by scripts/make_project_page.py in the research repo.

document.getElementById('abstract-toggle').addEventListener('click', (e) => {
  const more = document.getElementById('abstract-more');
  const open = more.style.display !== 'none';
  more.style.display = open ? 'none' : 'inline';
  e.target.textContent = open ? 'Read more' : 'Show less';
});

document.getElementById('copy-bibtex').addEventListener('click', (e) => {
  navigator.clipboard.writeText(document.getElementById('bibtex-text').textContent).then(() => {
    e.target.textContent = 'Copied!';
    e.target.classList.add('copied');
    setTimeout(() => { e.target.textContent = 'Copy'; e.target.classList.remove('copied'); }, 1500);
  });
});

let current = null; // the tile whose audio is playing or paused

function stop(tile) {
  tile.audio.pause();
  tile.audio.currentTime = 0;
  tile.el.classList.remove('playing', 'paused');
  tile.icon.className = 'play-icon fa fa-play';
}

function animate(tile) {
  const a = tile.audio;
  if (a.duration) tile.head.style.left = (100 * a.currentTime / a.duration) + '%';
  if (!a.paused) requestAnimationFrame(() => animate(tile));
}

function makeTile(example, version) {
  const el = document.createElement('div');
  el.className = 'tile' + (version.key === 'callcleaner' ? ' ours' : '');
  const src = `media/${example.id}/${version.key}`;
  el.innerHTML = `
    <div class="tile-label">${version.label}</div>
    <div class="spec" tabindex="0" role="button" aria-label="Play ${version.label.replace(/<[^>]+>/g, '')}">
      <img src="${src}.png" alt="" loading="lazy" />
      <div class="playhead"></div>
      <i class="play-icon fa fa-play"></i>
    </div>`;
  const tile = {
    el, audio: new Audio(`${src}.mp3`),
    head: el.querySelector('.playhead'), icon: el.querySelector('.play-icon'),
  };
  tile.audio.preload = 'none';
  tile.audio.addEventListener('ended', () => { stop(tile); if (current === tile) current = null; });

  const spec = el.querySelector('.spec');
  const toggle = (frac) => {
    if (current && current !== tile) stop(current);
    current = tile;
    const a = tile.audio;
    if (frac !== null && a.duration) a.currentTime = frac * a.duration;
    if (a.paused || frac !== null) {
      a.play();
      el.classList.add('playing'); el.classList.remove('paused');
      tile.icon.className = 'play-icon fa fa-pause';
      animate(tile);
    } else {
      a.pause();
      el.classList.remove('playing'); el.classList.add('paused');
      tile.icon.className = 'play-icon fa fa-play';
    }
  };
  spec.addEventListener('click', (e) => {
    // clicking the playing tile pauses it; clicking elsewhere on a playing/paused tile jumps there
    const r = spec.getBoundingClientRect();
    const frac = (e.clientX - r.left) / r.width;
    const active = current === tile && (el.classList.contains('playing') || el.classList.contains('paused'));
    const nearHead = active && tile.audio.duration &&
      Math.abs(frac - tile.audio.currentTime / tile.audio.duration) < 0.04;
    toggle(active && !nearHead ? frac : null);
  });
  spec.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(null); }
  });
  return el;
}

function credit(c) {
  return `<a href="${c.url}">freesound #${c.id}</a> by ${c.user} (<a href="${c.license_url}">${c.license}</a>)`;
}

fetch('examples.json').then((r) => r.json()).then((data) => {
  const list = document.getElementById('example-list');
  list.innerHTML = '';
  const credits = document.getElementById('credits');
  for (const ex of data.examples) {
    const box = document.createElement('div');
    box.className = 'example';
    box.innerHTML = `<div class="example-head"><span class="example-title">${ex.title}</span>` +
      `<span class="example-note">${ex.note} &middot; ${ex.duration}&nbsp;s</span></div>`;
    const tiles = document.createElement('div');
    tiles.className = 'tiles';
    for (const v of data.versions) tiles.appendChild(makeTile(ex, v));
    box.appendChild(tiles);
    list.appendChild(box);
    const li = document.createElement('li');
    li.innerHTML = `${ex.title}: call ${credit(ex.clean)}; noise ${credit(ex.noise)}`;
    credits.appendChild(li);
  }
}).catch(() => {
  document.getElementById('example-list').textContent =
    'Could not load examples (open the page through a web server, not as a local file).';
});
