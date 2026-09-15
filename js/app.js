/* ==================================================================
   RADIO GRACIA Y PAZ — Lógica del reproductor
   Diseño: Estudio Moderno (anillo circular + ecualizador + sidebar)
   ================================================================== */

// -------- CONFIGURACIÓN --------
const ZENO_MOUNT = 'mfer4shs398uv';
const API_URL    = `https://api.zeno.fm/mounts/metadata/subscribe/${ZENO_MOUNT}`;
const ITUNES_API = 'https://itunes.apple.com/search';

// -------- ELEMENTOS DOM --------
const audio        = document.getElementById('audioPlayer');
const btnPlay      = document.getElementById('btnPlay');
const playIcon     = document.getElementById('playIcon');
const btnMute      = document.getElementById('btnMute');
const muteIcon     = document.getElementById('muteIcon');
const btnVolume    = document.getElementById('btnVolume');
const volumePop    = document.getElementById('volumePop');
const volumeSlider = document.getElementById('volumeSlider');

const songTitle    = document.getElementById('songTitle');
const songArtist   = document.getElementById('songArtist');
const discCover    = document.getElementById('discCover');
const ringOuter    = document.getElementById('ringOuter');
const ringProgress = document.getElementById('ringProgress');
const eqRing       = document.getElementById('eqRing');

const liveChip     = document.getElementById('liveChip');
const clockEl      = document.getElementById('clock');
const listenersEl  = document.getElementById('listeners');

const verseText    = document.getElementById('verseText');
const verseRef     = document.getElementById('verseRef');

// -------- ESTADO --------
let isPlaying      = false;
let isMuted        = false;
let audioCtx       = null;
let analyser       = null;
let sourceNode     = null;
let currentSongKey = '';
let vizRAF         = null;
let eqBars         = [];

// ================================================================
// 0. RELOJ EN VIVO
// ================================================================
function actualizarReloj() {
  if (!clockEl) return;
  const ahora = new Date();
  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  clockEl.textContent = `${hh}:${mm}`;
}
actualizarReloj();
setInterval(actualizarReloj, 15000); // cada 15 s es suficiente

// ================================================================
// 1. VERSÍCULOS (cambio diario)
// ================================================================
const VERSICULOS = [
  { texto: "La gracia y la paz de parte de Dios nuestro Padre y del Señor Jesucristo sean con vosotros.", ref: "Filipenses 1:2" },
  { texto: "Jehová es mi pastor; nada me faltará.", ref: "Salmos 23:1" },
  { texto: "Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.", ref: "Mateo 11:28" },
  { texto: "La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da.", ref: "Juan 14:27" },
  { texto: "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito.", ref: "Juan 3:16" },
  { texto: "Mas él herido fue por nuestras rebeliones, molido por nuestros pecados.", ref: "Isaías 53:5" },
  { texto: "Estando persuadido de esto, que el que comenzó en vosotros la buena obra, la perfeccionará.", ref: "Filipenses 1:6" },
  { texto: "Todo lo puedo en Cristo que me fortalece.", ref: "Filipenses 4:13" },
  { texto: "Esfuérzate y sé valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo.", ref: "Josué 1:9" },
  { texto: "Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración.", ref: "Filipenses 4:6" },
  { texto: "Lámpara es a mis pies tu palabra, y lumbre a mi camino.", ref: "Salmos 119:105" },
  { texto: "Bendice, alma mía, a Jehová, y bendiga todo mi ser su santo nombre.", ref: "Salmos 103:1" },
  { texto: "El Señor es mi luz y mi salvación; ¿de quién temeré?", ref: "Salmos 27:1" },
  { texto: "Confía en Jehová, y haz el bien; y habitarás en la tierra, y te apacentarás de la verdad.", ref: "Salmos 37:3" },
  { texto: "Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones.", ref: "Filipenses 4:7" },
  { texto: "Gustad, y ved que es bueno Jehová; dichoso el hombre que confía en él.", ref: "Salmos 34:8" },
  { texto: "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios.", ref: "Isaías 41:10" },
  { texto: "Porque yo sé los pensamientos que tengo acerca de vosotros, pensamientos de paz.", ref: "Jeremías 29:11" },
  { texto: "El que habita al abrigo del Altísimo morará bajo la sombra del Omnipotente.", ref: "Salmos 91:1" },
  { texto: "Deléitate asimismo en Jehová, y él te concederá las peticiones de tu corazón.", ref: "Salmos 37:4" },
  { texto: "Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.", ref: "Salmos 46:1" },
  { texto: "Crea en mí, oh Dios, un corazón limpio, y renueva un espíritu recto dentro de mí.", ref: "Salmos 51:10" },
  { texto: "Tú guardarás en completa paz a aquel cuyo pensamiento en ti persevera.", ref: "Isaías 26:3" },
  { texto: "Bendito el varón que confía en Jehová, y cuya confianza es Jehová.", ref: "Jeremías 17:7" },
  { texto: "Cantad a Jehová un nuevo cántico, porque ha hecho maravillas.", ref: "Salmos 98:1" },
  { texto: "El nombre de Jehová es torre fuerte; a él correrá el justo, y será levantado.", ref: "Proverbios 18:10" },
  { texto: "Por la misericordia de Jehová no hemos sido consumidos, porque nunca decayeron sus misericordias.", ref: "Lamentaciones 3:22" },
  { texto: "Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas.", ref: "Isaías 40:31" },
  { texto: "He aquí, yo estoy con vosotros todos los días, hasta el fin del mundo.", ref: "Mateo 28:20" },
  { texto: "Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.", ref: "Romanos 8:28" },
  { texto: "Cercano está Jehová a todos los que le invocan, a todos los que le invocan de veras.", ref: "Salmos 145:18" }
];

function versiculoDelDia() {
  const hoy = new Date();
  const inicioAno = new Date(hoy.getFullYear(), 0, 0);
  const diff = hoy - inicioAno;
  const dia = Math.floor(diff / 86400000);
  return VERSICULOS[dia % VERSICULOS.length];
}

function renderVersiculo() {
  if (!verseText || !verseRef) return;
  const v = versiculoDelDia();
  verseText.style.opacity = '0';
  setTimeout(() => {
    verseText.textContent = `“${v.texto}”`;
    verseRef.textContent  = `— ${v.ref}`;
    verseText.style.opacity = '1';
  }, 250);
}
renderVersiculo();

// Rota el versículo a medianoche (comprobación cada 60 s)
setInterval(() => {
  const ahora = new Date();
  if (ahora.getHours() === 0 && ahora.getMinutes() === 0) renderVersiculo();
}, 60000);

// ================================================================
// 2. ECUALIZADOR CIRCULAR (barras alrededor del anillo)
// ================================================================
function initEqRing() {
  if (!eqRing) return;
  eqRing.innerHTML = '';
  eqBars = [];
  const total = 48;
  const radius = 96; // radio en px del centro al inicio de cada barra

  for (let i = 0; i < total; i++) {
    const angle = (i / total) * 360;
    const bar = document.createElement('div');
    bar.className = 'eq-bar';

    // Posicionar cada barra alrededor del centro
    bar.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px)`;
    eqRing.appendChild(bar);
    eqBars.push(bar);
  }
}
initEqRing();

// ================================================================
// 3. VISUALIZADOR (analiza y actualiza barras + anillo progreso)
// ================================================================
function initAudioContext() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    sourceNode = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
  } catch (e) {
    console.warn('No se pudo crear AudioContext:', e);
  }
}

function animate() {
  if (!analyser) return;

  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  // Actualizar barras del ecualizador circular
  const step = Math.floor(data.length / eqBars.length);
  for (let i = 0; i < eqBars.length; i++) {
    let sum = 0;
    for (let j = 0; j < step; j++) sum += data[i * step + j];
    const avg = sum / step;
    const h = Math.max(4, (avg / 255) * 22);
    eqBars[i].style.height = h + 'px';
  }

  // Actualizar el anillo de progreso (simula progreso con la energía media)
  if (ringProgress) {
    let totalE = 0;
    for (let i = 0; i < data.length; i++) totalE += data[i];
    const avg = totalE / data.length;
    const progreso = Math.min(1, avg / 180);
    const offset = 578 - (578 * progreso);
    ringProgress.style.strokeDashoffset = offset;
  }

  vizRAF = requestAnimationFrame(animate);
}

function startViz() {
  initAudioContext();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  if (vizRAF) cancelAnimationFrame(vizRAF);
  animate();
}

function stopViz() {
  if (vizRAF) {
    cancelAnimationFrame(vizRAF);
    vizRAF = null;
  }
  eqBars.forEach(b => b.style.height = '4px');
  if (ringProgress) ringProgress.style.strokeDashoffset = 578;
}

// ================================================================
// 4. PLAY / PAUSA
// ================================================================
async function togglePlay() {
  if (isPlaying) {
    audio.pause();
    return;
  }
  btnPlay.classList.add('loading');
  audio.volume = parseFloat(volumeSlider.value);

  try {
    await audio.play();
  } catch (err) {
    console.warn('Error al reproducir, reintentando:', err);
    // Segundo intento tras breve espera (a veces falla por autoplay policy)
    setTimeout(() => {
      audio.play().catch(e => console.error('Reintento falló:', e));
    }, 800);
  }
}

btnPlay.addEventListener('click', togglePlay);

// -------- Sincronización con eventos del audio --------
audio.addEventListener('play', () => {
  isPlaying = true;
  btnPlay.classList.add('playing');
  btnPlay.classList.remove('loading');
  ringOuter?.classList.add('playing');
  playIcon.innerHTML = '<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
  liveChip?.classList.add('on');
  startViz();
  actualizarAhoraSuena();
});

audio.addEventListener('pause', () => {
  isPlaying = false;
  btnPlay.classList.remove('playing');
  btnPlay.classList.remove('loading');
  ringOuter?.classList.remove('playing');
  playIcon.innerHTML = '<path d="M8 5v14l11-7z"/>';
  liveChip?.classList.remove('on');
  stopViz();
});

audio.addEventListener('waiting', () => btnPlay.classList.add('loading'));
audio.addEventListener('playing', () => btnPlay.classList.remove('loading'));
audio.addEventListener('error', (e) => {
  console.warn('Error de audio:', e);
  btnPlay.classList.remove('loading');
  liveChip?.classList.remove('on');
});

// ================================================================
// 5. VOLUMEN + MUTE
// ================================================================
btnVolume?.addEventListener('click', (e) => {
  e.stopPropagation();
  volumePop.classList.toggle('open');
});

document.addEventListener('click', (e) => {
  if (!volumePop?.contains(e.target) && e.target !== btnVolume) {
    volumePop?.classList.remove('open');
  }
});

volumeSlider?.addEventListener('input', () => {
  audio.volume = parseFloat(volumeSlider.value);
  if (audio.volume > 0 && isMuted) {
    isMuted = false;
    btnMute?.classList.remove('muted');
    actualizarIconoMute();
  }
});

btnMute?.addEventListener('click', () => {
  isMuted = !isMuted;
  audio.muted = isMuted;
  btnMute.classList.toggle('muted', isMuted);
  actualizarIconoMute();
});

function actualizarIconoMute() {
  if (!muteIcon) return;
  muteIcon.innerHTML = isMuted
    ? '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>'
    : '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>';
}

// ================================================================
// 6. METADATOS "AHORA SUENA"
// ================================================================
function parseSong(raw) {
  if (!raw) return { artist: 'Radio Gracia y Paz', title: 'Transmisión en vivo' };
  // Formato típico: "Artista - Título"
  let partes = raw.split(' - ');
  if (partes.length >= 2) {
    return { artist: partes[0].trim(), title: partes.slice(1).join(' - ').trim() };
  }
  partes = raw.split('|');
  if (partes.length >= 2) {
    return { artist: partes[0].trim(), title: partes[1].trim() };
  }
  return { artist: 'Radio Gracia y Paz', title: raw.trim() };
}

function buscarCaratula(artist, title) {
  const q = encodeURIComponent(`${artist} ${title}`);
  return fetch(`${ITUNES_API}?term=${q}&entity=song&limit=1`)
    .then(r => r.json())
    .then(data => {
      if (data.results?.[0]?.artworkUrl100) {
        return data.results[0].artworkUrl100.replace('100x100', '600x600');
      }
      return null;
    })
    .catch(() => null);
}

function actualizarAhoraSuena() {
  fetch(API_URL)
    .then(r => r.json())
    .then(data => {
      const raw = data.currentSong || data.title || '';
      if (raw === currentSongKey) return;
      currentSongKey = raw;

      const { artist, title } = parseSong(raw);
      if (songTitle)  songTitle.textContent  = title  || '—';
      if (songArtist) songArtist.textContent = artist || 'Radio Gracia y Paz';

      buscarCaratula(artist, title).then(url => {
        if (url && discCover) discCover.src = url;
      });
    })
    .catch(() => { /* silencioso */ });
}

// Polling de metadatos cada 15 s mientras suena
setInterval(() => { if (isPlaying) actualizarAhoraSuena(); }, 15000);

// ================================================================
// 7. OYENTES (contador simple — puedes conectarlo a una API real)
// ================================================================
function actualizarOyentes() {
  if (!listenersEl) return;
  // Simulación suave: número aleatorio entre 40 y 120
  const n = 40 + Math.floor(Math.random() * 80);
  listenersEl.textContent = `${n}`;
}
actualizarOyentes();
setInterval(actualizarOyentes, 30000);

// ================================================================
// 8. MEDIA SESSION API (controles en pantalla de bloqueo / auriculares)
// ================================================================
if ('mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'Radio Gracia y Paz',
    artist: 'Esperanza · Fe · Música',
    album: 'Una Radio con Propósito',
    artwork: [
      { src: './image/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: './image/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  });
  navigator.mediaSession.setActionHandler('play',  () => togglePlay());
  navigator.mediaSession.setActionHandler('pause', () => togglePlay());
}

// ================================================================
// 9. ATAJOS DE TECLADO
// ================================================================
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space')     { e.preventDefault(); togglePlay(); }
  if (e.code === 'ArrowUp')   { e.preventDefault(); audio.volume = Math.min(1, audio.volume + 0.1); volumeSlider.value = audio.volume; }
  if (e.code === 'ArrowDown') { e.preventDefault(); audio.volume = Math.max(0, audio.volume - 0.1); volumeSlider.value = audio.volume; }
  if (e.code === 'KeyM')      { btnMute?.click(); }
});

// ================================================================
// 10. VOLUMEN INICIAL
// ================================================================
audio.volume = parseFloat(volumeSlider.value);

console.log('🎵 Radio Gracia y Paz — Reproductor iniciado');
