/* ==================================================================
   RADIO GRACIA Y PAZ — Lógica del reproductor
   ================================================================== */

// -------- CONFIGURACIÓN (ajusta aquí) --------
const STREAM_URL    = 'https://stream.zeno.fm/75fyk31hk48uv'; // ← REEMPLAZA
const ZENO_MOUNT    = '75fyk31hk48uv';                        // ← REEMPLAZA
const API_URL       = `https://api.zeno.fm/mounts/metadata/subscribe/${ZENO_MOUNT}`;
const ITUNES_API    = 'https://itunes.apple.com/search';

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

// -------- ESTADO --------
let isPlaying       = false;
let audioCtx        = null;
let analyser        = null;
let sourceNode      = null;
let currentSongKey  = '';
let vizRAF          = null;
let waveformData    = null;

// ================================================================
// 1. TICKER DE VERSÍCULOS (cambio diario)
// ================================================================
const VERSICULOS = [
  "«La gracia y la paz de parte de Dios nuestro Padre y del Señor Jesucristo sean con vosotros.» — Filipenses 1:2",
  "«Jehová es mi pastor; nada me faltará.» — Salmos 23:1",
  "«Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.» — Mateo 11:28",
  "«La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da.» — Juan 14:27",
  "«Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito.» — Juan 3:16",
  "«Mas él herido fue por nuestras rebeliones, molido por nuestros pecados.» — Isaías 53:5",
  "«Estando persuadido de esto, que el que comenzó en vosotros la buena obra, la perfeccionará.» — Filipenses 1:6",
  "«Todo lo puedo en Cristo que me fortalece.» — Filipenses 4:13",
  "«Esfuérzate y sé valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo.» — Josué 1:9",
  "«Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración.» — Filipenses 4:6",
  "«Lámpara es a mis pies tu palabra, y lumbre a mi camino.» — Salmos 119:105",
  "«Bendice, alma mía, a Jehová, y bendiga todo mi ser su santo nombre.» — Salmos 103:1",
  "«El Señor es mi luz y mi salvación; ¿de quién temeré?» — Salmos 27:1",
  "«Confía en Jehová, y haz el bien; y habitarás en la tierra, y te apacentarás de la verdad.» — Salmos 37:3",
  "«Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones.» — Filipenses 4:7",
  "«Gustad, y ved que es bueno Jehová; dichoso el hombre que confía en él.» — Salmos 34:8",
  "«No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios.» — Isaías 41:10",
  "«Porque yo sé los pensamientos que tengo acerca de vosotros, pensamientos de paz.» — Jeremías 29:11",
  "«El que habita al abrigo del Altísimo morará bajo la sombra del Omnipotente.» — Salmos 91:1",
  "«Deléitate asimismo en Jehová, y él te concederá las peticiones de tu corazón.» — Salmos 37:4",
  "«Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.» — Salmos 46:1",
  "«Crea en mí, oh Dios, un corazón limpio, y renueva un espíritu recto dentro de mí.» — Salmos 51:10",
  "«Tú guardarás en completa paz a aquel cuyo pensamiento en ti persevera.» — Isaías 26:3",
  "«Bendito el varón que confía en Jehová, y cuya confianza es Jehová.» — Jeremías 17:7",
  "«Cantad a Jehová un nuevo cántico, porque ha hecho maravillas.» — Salmos 98:1",
  "«El nombre de Jehová es torre fuerte; a él correrá el justo, y será levantado.» — Proverbios 18:10",
  "«Por la misericordia de Jehová no hemos sido consumidos, porque nunca decayeron sus misericordias.» — Lamentaciones 3:22",
  "«Pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas.» — Isaías 40:31",
  "«He aquí, yo estoy con vosotros todos los días, hasta el fin del mundo.» — Mateo 28:20",
  "«Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien.» — Romanos 8:28",
  "«Cercano está Jehová a todos los que le invocan, a todos los que le invocan de veras.» — Salmos 145:18"
];

function obtenerVersiculoDelDia() {
  const hoy = new Date();
  const inicio = new Date(hoy.getFullYear(), 0, 0);
  const diff = hoy - inicio;
  const dia = Math.floor(diff / 86400000);
  return VERSICULOS[dia % VERSICULOS.length];
}

(function iniciarTicker() {
  tickerText.textContent = '  ' + obtenerVersiculoDelDia() + '   •   ';
})();

// ================================================================
// 2. WAVEFORM (canvas)
// ================================================================
function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect