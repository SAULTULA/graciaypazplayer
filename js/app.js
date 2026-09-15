/* ==================================================================
   RADIO GRACIA Y PAZ — Lógica del reproductor
   ================================================================== */

// -------- CONFIGURACIÓN --------
const STREAM_URL = 'https://stream.zeno.fm/mfer4shs398uv';
const ZENO_MOUNT = 'mfer4shs398uv';
const API_URL    = `https://api.zeno.fm/mounts/metadata/subscribe/${ZENO_MOUNT}`;
const ITUNES_API = 'https://itunes.apple.com/search';

// -------- ELEMENTOS DOM --------
const audio         = document.getElementById('audioPlayer');
const player        = document.querySelector('.player');
const btnPlay       = document.getElementById('btnPlay');
const playIcon      = document.getElementById('playIcon');
const btnMute       = document.getElementById('btnMute');
const muteIcon      = document.getElementById('muteIcon');
const btnVolume     = document.getElementById('btnVolume');
const volumePop     = document.getElementById('volumePop');
const volumeSlider  = document.getElementById('volumeSlider');
const songTitle     = document.getElementById('songTitle');
const songArtist    = document.getElementById('songArtist');
const vinylCover    = document.getElementById('vinylCover');
const liveDot       = document.getElementById('liveDot');
const tickerText    = document.getElementById('tickerText');
const waveform      = document.getElementById('waveform');
const yearEl        = document.getElementById('year');

// -------- ESTADO --------
let isPlaying      = false;
let isMuted        = false;
let audioCtx       = null;
let analyser       = null;
let sourceNode     = null;
let currentSongKey = '';
let vizRAF         = null;

// Año dinámico en el footer
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ================================================================
// 1. VERSÍCULOS (cambio diario)
// ================================================================
const