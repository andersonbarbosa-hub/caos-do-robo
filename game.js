'use strict';
/* =========================================================================
   CAOS DO ROBÔ — jogo de física/construção para tablet (100% offline)
   Sem dependências externas. Toque para arrastar peças, monte uma máquina
   maluca e solte a bola para ver a bagunça acontecer.
   As fases ficam em niveis.js, carregado antes deste arquivo.
   ========================================================================= */

/* ----------------------------- Constantes ------------------------------ */
const COLS = 6;
const ROWS = 8;
const CELL = 120;
const W = COLS * CELL;   // 720
const H = ROWS * CELL;   // 960
const GRAVIDADE = 1500;
const MAX_BOLAS = 34;
const PASSO = 1 / 240;          // física em passo fixo: mesma montagem, mesmo resultado
const TEMPO_MAX_RODADA = 15;
const TEMPO_PARADA = 1.2;       // numa missão, bola parada esse tempo some

const FAN_FORCA = 2000;
const FAN_MAX_SUBIDA = -420;
const IMA_ALCANCE = CELL * 2.35;
const IMA_FORCA = 950;
const BURACO_ALCANCE = CELL * 2.6;
const BURACO_CAPTURA = CELL * 0.42;
const BURACO_FORCA = 1600;
const ESTEIRA_VEL = 380;
const REBATEDOR_VEL = 820;

/* ------------------------------ Utilidades ------------------------------ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
const rnd = (a, b) => a + Math.random() * (b - a);
const escolha = (arr) => arr[Math.floor(Math.random() * arr.length)];

// gerador com semente: nas missões a física sorteia sempre os mesmos números
function criarRng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rndFisica = (a, b) => a + state.rngFisica() * (b - a);

/* ------------------------------ Definições ------------------------------ */
const GADGET_DEFS = {
  rampaD:        { emoji: '↘️', nome: 'Rampa',        cor: '#e8a33d' },
  rampaE:        { emoji: '↙️', nome: 'Rampa',        cor: '#e8a33d' },
  mola:          { emoji: '🔼', nome: 'Mola',         cor: '#ff5d6c' },
  ventilador:    { emoji: '🌬️', nome: 'Ventilador',   cor: '#3db6ff' },
  ima:           { emoji: '🧲', nome: 'Ímã',          cor: '#a78bfa' },
  portalA:       { emoji: '🔵', nome: 'Portal Azul',  cor: '#2b6fe0' },
  portalB:       { emoji: '🟠', nome: 'Portal Laranja', cor: '#e07a2b' },
  giro:          { emoji: '🌀', nome: 'Giro Maluco',  cor: '#2dd4bf' },
  confete:       { emoji: '🎉', nome: 'Bomba de Confete', cor: '#ff5da2' },
  buraconegro:   { emoji: '🕳️', nome: 'Buraco Negro', cor: '#4a2fc4' },
  multiplicador: { emoji: '➕', nome: 'Multiplicador', cor: '#9be03d' },
  bloco:         { emoji: '🧱', nome: 'Bloco',        cor: '#b5653a' },
  esteiraD:      { emoji: '⏩', nome: 'Esteira',      cor: '#8a94a6' },
  esteiraE:      { emoji: '⏪', nome: 'Esteira',      cor: '#8a94a6' },
  rebatedor:     { emoji: '💥', nome: 'Rebatedor',    cor: '#ff3da5' },
  lava:          { emoji: '🌋', nome: 'Lava',         cor: '#ff4b1f' },
  // só aparecem nos mapas das fases
  botao:         { emoji: '🔘', nome: 'Botão',        cor: '#ff5d6c' },
  porta:         { emoji: '🚪', nome: 'Porta',        cor: '#7a5cff' },
};
const ORDEM_BANDEJA = ['rampaD', 'rampaE', 'mola', 'ventilador', 'ima', 'portalA', 'portalB', 'giro', 'confete',
  'buraconegro', 'multiplicador', 'bloco', 'esteiraD', 'esteiraE', 'rebatedor', 'lava'];

const BASE_DESBLOQUEADO = ['rampaD', 'rampaE', 'mola', 'ventilador'];

// desbloqueios que liberam mais de uma peça de uma vez
const GRUPOS_DESBLOQUEIO = {
  portal: { pecas: ['portalA', 'portalB'], nome: 'Portais' },
  esteira: { pecas: ['esteiraD', 'esteiraE'], nome: 'Esteiras' },
};

// letras dos mapas em niveis.js
const MAPA_LEGENDA = {
  '#': 'bloco', 'D': 'rampaD', 'E': 'rampaE', '^': 'mola', '>': 'esteiraD', '<': 'esteiraE',
  'b': 'rebatedor', 'f': 'ventilador', 'm': 'ima', 'g': 'giro', 'n': 'buraconegro',
  '1': 'portalA', '2': 'portalB', '~': 'lava', 'o': 'botao', '=': 'porta', 'c': 'confete',
};

const SHOP_ITEMS = [
  { id: 'robo', emoji: '🤖', nome: 'Robô Clássico', preco: 0 },
  { id: 'alien', emoji: '👽', nome: 'Alienígena', preco: 20 },
  { id: 'dino', emoji: '🦖', nome: 'Dino-bot', preco: 35 },
  { id: 'fantasma', emoji: '👻', nome: 'Fantasminha', preco: 45 },
  { id: 'gato', emoji: '🐱', nome: 'Gato Ninja', preco: 55 },
  { id: 'unicornio', emoji: '🦄', nome: 'Unicórnio Turbo', preco: 70 },
  { id: 'foguete', emoji: '🚀', nome: 'Robô Foguete', preco: 90 },
  { id: 'abobora', emoji: '🎃', nome: 'Robô Abóbora', preco: 110 },
  { id: 'dragao', emoji: '🐉', nome: 'Dragão de Lava', preco: 150 },
  { id: 'ninja', emoji: '🥷', nome: 'Ninja Supremo', preco: 200 },
];
const SHOP_BOLAS = [
  { id: 'padrao', emoji: null, nome: 'Bolinha', preco: 0 },
  { id: 'futebol', emoji: '⚽', nome: 'Futebol', preco: 15 },
  { id: 'basquete', emoji: '🏀', nome: 'Basquete', preco: 25 },
  { id: 'melancia', emoji: '🍉', nome: 'Melancia', preco: 35 },
  { id: 'rosquinha', emoji: '🍩', nome: 'Rosquinha', preco: 45 },
  { id: 'planeta', emoji: '🌍', nome: 'Planeta', preco: 60 },
  { id: 'coco', emoji: '💩', nome: 'Cocô', preco: 80 },
  { id: 'caveira', emoji: '💀', nome: 'Caveira', preco: 100 },
];

/* -------------------------------- Save ---------------------------------- */
const SAVE_KEY = 'caosRoboSave_v1';
function padraoSave() {
  return {
    coins: 0, levelStars: {}, unlocked: BASE_DESBLOQUEADO.slice(),
    skinsOwned: ['robo'], skinEquipado: 'robo', bolasOwned: ['padrao'], bolaEquipada: 'padrao',
  };
}
function carregarSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return padraoSave();
    const parsed = JSON.parse(raw);
    return Object.assign(padraoSave(), parsed);
  } catch (e) { return padraoSave(); }
}
function salvarSave() {
  if (state.headless) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state.save)); } catch (e) { /* armazenamento indisponível */ }
}

/* -------------------------------- Estado --------------------------------- */
const state = {
  headless: false,      // true no verificador de fases (sem tela, sem som)
  save: carregarSave(),
  modo: null,           // 'missao' | 'livre'
  nivelIndex: 0,
  nivelAtual: null,
  telaOrigem: 'tela-inicio',
  tabuleiro: new Map(), // "row_col" -> gadget
  bloqueadas: new Set(),// casas onde não dá pra colocar peça
  estrelasMapa: [],     // estrelas para pegar no caminho
  portaAberta: false,
  orcamentoRestante: {},
  bolas: [],
  particulas: [],
  rodada: null,         // missão em andamento
  ultimoResultado: null,
  bloqueado: false,     // trava edição durante voo da bola (missão)
  dicas: [],
  dicasUsadas: 0,
  canhaoAtivo: false,
  canhaoTimer: 0,
  gravidadeInvertida: false,
  cestasLivre: 0,
  rngFisica: Math.random,
  acumulador: 0,
  shake: { tempo: 0, mag: 0 },
  arrastando: null,     // { tipo }
  cellHighlight: null,
  audioCtx: null,
  idBola: 1,
  animTempo: 0,
  timerMascote: null,
  timerAviso: null,
};

/* -------------------------------- DOM ------------------------------------ */
let canvas, ctx;
let elMascoteJogo, elInfoMissao, elModal, elBandeja, elBarraCaos, elBtnTestar, elAviso, elBtnDica;

/* ================================ ÁUDIO ================================== */
function ctxAudio() {
  if (state.headless) return null;
  if (!state.audioCtx) {
    try { state.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* sem suporte */ }
  }
  if (state.audioCtx && state.audioCtx.state === 'suspended') state.audioCtx.resume();
  return state.audioCtx;
}
function tom(freq, dur, tipo = 'sine', vol = 0.2, atraso = 0) {
  const ac = ctxAudio(); if (!ac) return;
  const t0 = ac.currentTime + atraso;
  const osc = ac.createOscillator(); const gain = ac.createGain();
  osc.type = tipo; osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}
function deslize(f0, f1, dur, tipo, vol) {
  const ac = ctxAudio(); if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator(); const gain = ac.createGain();
  osc.type = tipo; osc.frequency.setValueAtTime(f0, t0);
  osc.frequency.exponentialRampToValueAtTime(f1, t0 + dur * 0.8);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ac.destination); osc.start(t0); osc.stop(t0 + dur + 0.02);
}
function tocarClique() { tom(520, 0.06, 'square', 0.12); }
function tocarToc() { tom(140, 0.08, 'square', 0.15); }
function tocarBoing() { deslize(180, 680, 0.22, 'sine', 0.25); }
function tocarBump() { deslize(900, 300, 0.12, 'square', 0.16); }
function tocarPop() { tom(320, 0.08, 'square', 0.2); tom(640, 0.1, 'square', 0.16, 0.03); }
function tocarWhoosh() { deslize(900, 130, 0.26, 'sawtooth', 0.15); }
function tocarChiado() { deslize(600, 60, 0.4, 'sawtooth', 0.18); }
function tocarDing() { tom(1320, 0.12, 'triangle', 0.2); tom(1760, 0.2, 'triangle', 0.18, 0.07); }
function tocarPlim() { tom(880, 0.08, 'square', 0.15); tom(660, 0.12, 'square', 0.15, 0.08); }
function tocarLancamento() { tom(220, 0.05, 'square', 0.2); tom(440, 0.05, 'square', 0.2, 0.05); tom(880, 0.15, 'square', 0.2, 0.1); }
function tocarComemoracao() { [523, 659, 784, 1047].forEach((f, i) => tom(f, 0.18, 'triangle', 0.18, i * 0.08)); }
function tocarFesta() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tom(f, 0.16, 'square', 0.14, i * 0.07)); }
function tocarTriste() { tom(300, 0.12, 'sine', 0.15); tom(220, 0.22, 'sine', 0.15, 0.12); }

/* ============================== PARTÍCULAS ================================ */
function efeitoParticulas(x, y, tipo, qtd = 14) {
  if (state.headless) return;
  const cores = {
    portal: ['#3db6ff', '#2b6fe0'], mola: ['#ff5d6c', '#ffb3b8'], lancamento: ['#a78bfa', '#e0d4ff'],
    mult: ['#9be03d', '#d9ffb0'], lava: ['#ff4b1f', '#ffcc33', '#555'], estrela: ['#ffe066', '#fff6b0'],
    rebate: ['#ff3da5', '#ffd0ec'], padrao: ['#ffcc33', '#ff8a3d'],
  };
  const paleta = cores[tipo] || cores.padrao;
  for (let i = 0; i < qtd; i++) {
    const ang = rnd(0, Math.PI * 2); const vel = rnd(80, 260);
    state.particulas.push({
      x, y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel - 40,
      vida: rnd(0.35, 0.7), vidaMax: 0.7, cor: escolha(paleta), tam: rnd(3, 7), rot: rnd(0, 7), velRot: rnd(-6, 6), tipo: 'circulo',
    });
  }
}
function efeitoConfete(x, y, qtd = 32) {
  if (state.headless) return;
  const cores = ['#ff5d6c', '#ffcc33', '#3ddc97', '#3db6ff', '#a78bfa', '#ff8a3d'];
  for (let i = 0; i < qtd; i++) {
    const ang = rnd(-Math.PI, 0); const vel = rnd(220, 620);
    state.particulas.push({
      x, y, vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel,
      vida: rnd(0.6, 1.2), vidaMax: 1.2, cor: escolha(cores), tam: rnd(5, 10), rot: rnd(0, 7), velRot: rnd(-9, 9), tipo: 'confete',
    });
  }
}
function atualizarParticulas(dt) {
  for (const p of state.particulas) {
    p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    p.vida -= dt; p.rot += p.velRot * dt;
  }
  state.particulas = state.particulas.filter(p => p.vida > 0);
}
function desenharParticulas() {
  for (const p of state.particulas) {
    const alpha = clamp(p.vida / p.vidaMax, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.cor;
    if (p.tipo === 'confete') ctx.fillRect(-p.tam / 2, -p.tam / 3, p.tam, p.tam * 0.6);
    else { ctx.beginPath(); ctx.arc(0, 0, p.tam / 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
}
function tremerTela(mag) { if (!state.headless) state.shake = { tempo: 0.25, mag }; }

/* ============================= FÍSICA: BOLA =============================== */
function novaBola(col) {
  const emBaixo = state.gravidadeInvertida;
  return {
    id: state.idBola++, x: col * CELL + CELL / 2, y: emBaixo ? H - CELL * 0.5 : CELL * 0.5,
    vx: state.modo === 'missao' ? 0 : rnd(-40, 40), vy: 0, r: 16, ang: 0,
    categoriaDefinida: false,
    portalCooldown: 0, capturadaPor: null, capturaAngulo: 0, capturaRaio: 0, capturaTempo: 0,
    tempoVida: 0, paradaTempo: 0, morta: false,
  };
}

function resolverLinha(ball, Ax, Ay, Bx, By, restituicao, minSlide) {
  const dx = Bx - Ax, dy = By - Ay; const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  const apx = ball.x - Ax, apy = ball.y - Ay;
  let t = apx * ux + apy * uy; t = clamp(t, 0, len);
  const cx = Ax + ux * t, cy = Ay + uy * t;
  const ddx = ball.x - cx, ddy = ball.y - cy; const d = Math.hypot(ddx, ddy);
  const limiar = ball.r + 5;
  if (d < limiar) {
    let nx, ny;
    if (d > 0.0001) { nx = ddx / d; ny = ddy / d; } else { nx = -uy; ny = ux; }
    const sobra = limiar - d;
    ball.x += nx * sobra; ball.y += ny * sobra;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) { ball.vx -= (1 + restituicao) * vn * nx; ball.vy -= (1 + restituicao) * vn * ny; }
    const vt = ball.vx * ux + ball.vy * uy;
    if (vt < minSlide) { const falta = minSlide - vt; ball.vx += ux * falta; ball.vy += uy * falta; }
    return true;
  }
  return false;
}

// bola contra um retângulo sólido (bloco, porta fechada)
function resolverCaixa(ball, x0, y0, x1, y1, restituicao) {
  const px = clamp(ball.x, x0, x1), py = clamp(ball.y, y0, y1);
  const dx = ball.x - px, dy = ball.y - py; const d = Math.hypot(dx, dy);
  if (d >= ball.r) return false;
  let nx, ny, sobra;
  if (d > 0.0001) { nx = dx / d; ny = dy / d; sobra = ball.r - d; }
  else {
    // centro da bola entrou na caixa: empurra pelo lado mais próximo
    const lados = [[ball.x - x0, -1, 0], [x1 - ball.x, 1, 0], [ball.y - y0, 0, -1], [y1 - ball.y, 0, 1]];
    lados.sort((a, b) => a[0] - b[0]);
    [sobra, nx, ny] = lados[0]; sobra += ball.r;
  }
  ball.x += nx * sobra; ball.y += ny * sobra;
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) { ball.vx -= (1 + restituicao) * vn * nx; ball.vy -= (1 + restituicao) * vn * ny; }
  return true;
}

function colidirRampa(ball, g, dir) {
  const x0 = g.col * CELL, y0 = g.row * CELL;
  if (dir === 'D') resolverLinha(ball, x0, y0, x0 + CELL, y0 + CELL, 0.15, 140);
  else resolverLinha(ball, x0 + CELL, y0, x0, y0 + CELL, 0.15, 140);
}
function colidirEsteira(ball, g, dir) {
  const x0 = g.col * CELL + 4, x1 = g.col * CELL + CELL - 4, y = g.row * CELL + CELL * 0.6;
  if (dir === 'D') resolverLinha(ball, x0, y, x1, y, 0.1, ESTEIRA_VEL);
  else resolverLinha(ball, x1, y, x0, y, 0.1, ESTEIRA_VEL);
}
function colidirBloco(ball, g) {
  resolverCaixa(ball, g.col * CELL, g.row * CELL, g.col * CELL + CELL, g.row * CELL + CELL, 0.3);
}
function colidirMola(ball, g) {
  const raio = CELL * 0.38;
  const d = dist(ball.x, ball.y, g.cx, g.cy);
  if (d < raio + ball.r && ball.vy > -60 && g.cooldown <= 0) {
    ball.vy = -900; ball.vx += (ball.x - g.cx) * 3;
    g.cooldown = 0.25; g.animMola = 1;
    tocarBoing(); efeitoParticulas(g.cx, g.cy, 'mola', 14);
  }
}
function colidirRebatedor(ball, g) {
  const raio = CELL * 0.3;
  const d = dist(ball.x, ball.y, g.cx, g.cy);
  if (d >= raio + ball.r) return;
  const nx = d > 0.001 ? (ball.x - g.cx) / d : 0, ny = d > 0.001 ? (ball.y - g.cy) / d : -1;
  ball.x = g.cx + nx * (raio + ball.r); ball.y = g.cy + ny * (raio + ball.r);
  const vel = Math.max(Math.hypot(ball.vx, ball.vy) * 1.05, REBATEDOR_VEL);
  ball.vx = nx * vel; ball.vy = ny * vel;
  if (g.cooldown <= 0) { g.cooldown = 0.12; g.animMola = 1; tocarBump(); efeitoParticulas(ball.x, ball.y, 'rebate', 10); }
}
function colidirGiro(ball, g) {
  const raio = CELL * 0.36;
  const d = dist(ball.x, ball.y, g.cx, g.cy);
  if (d < raio + ball.r) {
    const nx = d > 0.001 ? (ball.x - g.cx) / d : 1, ny = d > 0.001 ? (ball.y - g.cy) / d : 0;
    const sobra = raio + ball.r - d;
    ball.x += nx * sobra; ball.y += ny * sobra;
    const vn = ball.vx * nx + ball.vy * ny;
    ball.vx -= 1.7 * vn * nx; ball.vy -= 1.7 * vn * ny;
    const tx = -ny, ty = nx;
    ball.vx += tx * 260 * g.sentido; ball.vy += ty * 260 * g.sentido;
  }
}
function colidirConfete(ball, g) {
  const raio = CELL * 0.4;
  const d = dist(ball.x, ball.y, g.cx, g.cy);
  if (!g.usado && d < raio + ball.r) {
    g.usado = true;
    const ang = rndFisica(0, Math.PI * 2); const vel = rndFisica(560, 820);
    ball.vx = Math.cos(ang) * vel; ball.vy = Math.sin(ang) * vel - 180;
    efeitoConfete(g.cx, g.cy, 36); tocarPop(); tremerTela(8);
  }
}
function colidirPortal(ball, g, tipoAlvo) {
  if (ball.portalCooldown > 0) return;
  const raio = CELL * 0.32;
  const d = dist(ball.x, ball.y, g.cx, g.cy);
  if (d >= raio + ball.r) return;
  let alvo = null;
  for (const outro of state.tabuleiro.values()) {
    if (outro.tipo === 'portal' + tipoAlvo) { alvo = outro; break; }
  }
  if (!alvo) return;
  efeitoParticulas(g.cx, g.cy, 'portal', 10);
  ball.x = alvo.cx; ball.y = alvo.cy;
  ball.portalCooldown = 0.4;
  efeitoParticulas(alvo.cx, alvo.cy, 'portal', 10);
  tocarWhoosh();
}
function colidirMultiplicador(ball, g) {
  const raio = CELL * 0.3;
  const d = dist(ball.x, ball.y, g.cx, g.cy);
  if (d < raio + ball.r && g.cooldown <= 0 && state.bolas.length < MAX_BOLAS) {
    g.cooldown = 0.5;
    const clone = novaBola(0);
    clone.x = ball.x - 16; clone.y = ball.y; clone.vx = ball.vx - 90; clone.vy = ball.vy;
    state.bolas.push(clone);
    ball.vx += 90;
    efeitoParticulas(g.cx, g.cy, 'mult', 10); tocarClique();
  }
}
function colidirBotao(ball, g) {
  if (state.portaAberta) return;
  if (dist(ball.x, ball.y, g.cx, g.cy) < CELL * 0.3 + ball.r) {
    state.portaAberta = true;
    tocarPlim(); efeitoParticulas(g.cx, g.cy, 'mult', 12); tremerTela(4);
  }
}
function colidirLava(ball, g) {
  const m = 14; // a bola precisa entrar um pouco na lava pra queimar
  const x0 = g.col * CELL + m, y0 = g.row * CELL + m, x1 = g.col * CELL + CELL - m, y1 = g.row * CELL + CELL - m;
  if (ball.x > x0 - ball.r * 0.5 && ball.x < x1 + ball.r * 0.5 && ball.y > y0 - ball.r * 0.5 && ball.y < y1 + ball.r * 0.5) {
    ball.morta = true;
    if (state.rodada) state.rodada.queimou = true;
    tocarChiado(); efeitoParticulas(ball.x, ball.y, 'lava', 20);
  }
}

function aplicarCampos(ball, dt) {
  for (const g of state.tabuleiro.values()) {
    if (g.tipo === 'ventilador') {
      const x0 = g.col * CELL, x1 = x0 + CELL;
      const y1 = g.row * CELL + CELL, y0 = g.row * CELL - CELL * 3;
      if (ball.x > x0 && ball.x < x1 && ball.y > y0 && ball.y < y1) {
        ball.vy -= FAN_FORCA * dt;
        if (ball.vy < FAN_MAX_SUBIDA) ball.vy = FAN_MAX_SUBIDA;
      }
    } else if (g.tipo === 'ima') {
      const d = dist(ball.x, ball.y, g.cx, g.cy);
      if (d < IMA_ALCANCE && d > 4) {
        const f = IMA_FORCA * (1 - d / IMA_ALCANCE);
        ball.vx += (g.cx - ball.x) / d * f * dt;
        ball.vy += (g.cy - ball.y) / d * f * dt;
      }
    } else if (g.tipo === 'buraconegro' && !ball.capturadaPor) {
      const d = dist(ball.x, ball.y, g.cx, g.cy);
      if (d < BURACO_CAPTURA) {
        ball.capturadaPor = g; ball.capturaAngulo = Math.atan2(ball.y - g.cy, ball.x - g.cx);
        ball.capturaRaio = Math.max(d, 10); ball.capturaTempo = 0;
      } else if (d < BURACO_ALCANCE && d > 4) {
        const f = BURACO_FORCA * (1 - d / BURACO_ALCANCE);
        const nx = (g.cx - ball.x) / d, ny = (g.cy - ball.y) / d;
        ball.vx += nx * f * dt; ball.vy += ny * f * dt;
        ball.vx += -ny * f * 0.5 * dt; ball.vy += nx * f * 0.5 * dt;
      }
    }
  }
}

function integrarBola(ball, dt) {
  if (ball.capturadaPor) {
    const g = ball.capturadaPor;
    ball.capturaTempo += dt;
    const velAng = 7 + ball.capturaTempo * 16;
    ball.capturaAngulo += velAng * dt;
    ball.capturaRaio = Math.max(6, ball.capturaRaio - 95 * dt);
    ball.x = g.cx + Math.cos(ball.capturaAngulo) * ball.capturaRaio;
    ball.y = g.cy + Math.sin(ball.capturaAngulo) * ball.capturaRaio;
    if (ball.capturaTempo > 0.55) {
      const direcao = ball.capturaAngulo + Math.PI / 2;
      const vel = 760;
      ball.vx = Math.cos(direcao) * vel; ball.vy = Math.sin(direcao) * vel;
      ball.capturadaPor = null;
      efeitoParticulas(ball.x, ball.y, 'lancamento', 16); tocarLancamento();
    }
    return;
  }
  ball.vy += (state.gravidadeInvertida ? -GRAVIDADE : GRAVIDADE) * dt;
  ball.x += ball.vx * dt; ball.y += ball.vy * dt;
  ball.ang += ball.vx * dt / ball.r;
  if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.6; }
  if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.6; }
}

function colisoesBola(ball) {
  if (ball.capturadaPor) return;
  for (const g of state.tabuleiro.values()) {
    switch (g.tipo) {
      case 'rampaD': colidirRampa(ball, g, 'D'); break;
      case 'rampaE': colidirRampa(ball, g, 'E'); break;
      case 'esteiraD': colidirEsteira(ball, g, 'D'); break;
      case 'esteiraE': colidirEsteira(ball, g, 'E'); break;
      case 'bloco': colidirBloco(ball, g); break;
      case 'porta': if (!state.portaAberta) colidirBloco(ball, g); break;
      case 'mola': colidirMola(ball, g); break;
      case 'rebatedor': colidirRebatedor(ball, g); break;
      case 'giro': colidirGiro(ball, g); break;
      case 'confete': colidirConfete(ball, g); break;
      case 'portalA': colidirPortal(ball, g, 'B'); break;
      case 'portalB': colidirPortal(ball, g, 'A'); break;
      case 'multiplicador': colidirMultiplicador(ball, g); break;
      case 'botao': colidirBotao(ball, g); break;
      case 'lava': colidirLava(ball, g); break;
    }
    if (ball.morta) return;
  }
  for (const e of state.estrelasMapa) {
    if (!e.pega && dist(ball.x, ball.y, e.cx, e.cy) < CELL * 0.3 + ball.r) {
      e.pega = true;
      if (state.rodada) state.rodada.estrelasPegas++;
      tocarDing(); efeitoParticulas(e.cx, e.cy, 'estrela', 18); reagirMascote('uau');
    }
  }
}

function avaliarBola(ball, dt) {
  if (!ball.categoriaDefinida && ball.y + ball.r >= (ROWS - 1) * CELL) {
    ball.categoriaDefinida = true;
    if (state.modo === 'missao' && state.rodada) {
      const niv = state.nivelAtual;
      const x0 = niv.basketCol * CELL;
      if (niv.nota === 'aneis') {
        const dx = Math.abs(ball.x - (x0 + CELL * 1.5));
        let cat = 0;
        if (dx <= 58) cat = 3; else if (dx <= 128) cat = 2; else if (dx <= 178) cat = 1;
        state.rodada.melhorAnel = Math.max(state.rodada.melhorAnel, cat);
      } else if (ball.x >= x0 && ball.x <= x0 + niv.basketLarg * CELL) {
        state.rodada.naCesta++;
        efeitoParticulas(ball.x, ball.y, 'mult', 16); tocarDing();
      }
    } else if (state.modo === 'livre' && ball.x >= CELL && ball.x <= CELL * 4) {
      state.cestasLivre++;
      atualizarInfoLivre();
      efeitoParticulas(ball.x, ball.y, 'mult', 8);
    }
  }
  if (state.modo === 'missao') {
    if (Math.hypot(ball.vx, ball.vy) < 25) ball.paradaTempo += dt; else ball.paradaTempo = 0;
    if (ball.paradaTempo > TEMPO_PARADA) { ball.morta = true; efeitoParticulas(ball.x, ball.y, 'padrao', 10); }
  }
  const limiteVida = state.modo === 'missao' ? 12 : 20;
  if (ball.y - ball.r > H || ball.y + ball.r < -CELL || ball.tempoVida > limiteVida) ball.morta = true;
}

function atualizarGadgets(dt) {
  for (const g of state.tabuleiro.values()) {
    if (g.cooldown > 0) g.cooldown -= dt;
    g.anim = (g.anim || 0) + dt;
    if (g.animMola > 0) g.animMola = Math.max(0, g.animMola - dt * 3);
  }
}

function passoFisica(dt) {
  atualizarGadgets(dt);
  for (const ball of state.bolas) {
    if (ball.morta) continue;
    aplicarCampos(ball, dt);
    integrarBola(ball, dt);
    colisoesBola(ball);
    if (ball.portalCooldown > 0) ball.portalCooldown -= dt;
    ball.tempoVida += dt;
    if (!ball.morta) avaliarBola(ball, dt);
  }
  state.bolas = state.bolas.filter(b => !b.morta);
  const r = state.rodada;
  if (r && r.ativa) {
    r.tempo += dt;
    if (r.tempo > TEMPO_MAX_RODADA) state.bolas = [];
    if (state.bolas.length === 0) encerrarRodada();
  }
}

function avancarFisica(dt) {
  state.acumulador = Math.min(state.acumulador + dt, 0.1);
  while (state.acumulador >= PASSO) { passoFisica(PASSO); state.acumulador -= PASSO; }
}

/* =============================== TABULEIRO ================================ */
function chaveCel(row, col) { return row + '_' + col; }
function celulaValida(row, col) { return row >= 1 && row <= ROWS - 2 && col >= 0 && col < COLS; }
function podeColocar(row, col) {
  const key = chaveCel(row, col);
  return celulaValida(row, col) && !state.tabuleiro.has(key) && !state.bloqueadas.has(key);
}

function criarGadget(tipo, row, col, fixo) {
  return {
    tipo, row, col, fixo, cx: col * CELL + CELL / 2, cy: row * CELL + CELL / 2,
    cooldown: 0, usado: false, anim: 0, animMola: 0,
    // nas missões o giro roda sempre pro mesmo lado (coluna par: horário)
    sentido: state.modo === 'missao' ? (col % 2 === 0 ? 1 : -1) : (Math.random() < 0.5 ? 1 : -1),
  };
}

function tentarColocar(tipo, row, col) {
  if (!podeColocar(row, col)) return false;
  if (state.modo === 'missao') {
    const restante = state.orcamentoRestante[tipo] || 0;
    if (restante <= 0) return false;
    state.orcamentoRestante[tipo] = restante - 1;
  } else if (!state.save.unlocked.includes(tipo)) return false;
  state.tabuleiro.set(chaveCel(row, col), criarGadget(tipo, row, col, false));
  if (elBandeja) atualizarBandeja();
  tocarClique();
  return true;
}
function removerGadget(row, col) {
  const key = chaveCel(row, col);
  const g = state.tabuleiro.get(key);
  if (!g) return;
  if (g.fixo) { tocarToc(); g.animMola = 1; return; }
  state.tabuleiro.delete(key);
  if (state.modo === 'missao') state.orcamentoRestante[g.tipo] = (state.orcamentoRestante[g.tipo] || 0) + 1;
  if (elBandeja) atualizarBandeja();
}

function montarMapa(niv) {
  state.tabuleiro.clear(); state.bloqueadas.clear(); state.estrelasMapa = [];
  (niv.mapa || []).forEach((linha, i) => {
    const row = i + 1;
    for (let col = 0; col < COLS; col++) {
      const ch = linha[col] || '.';
      if (ch === '.') continue;
      state.bloqueadas.add(chaveCel(row, col));
      if (ch === '*') { state.estrelasMapa.push({ row, col, cx: col * CELL + CELL / 2, cy: row * CELL + CELL / 2, pega: false }); continue; }
      const tipo = MAPA_LEGENDA[ch];
      if (tipo) state.tabuleiro.set(chaveCel(row, col), criarGadget(tipo, row, col, true));
    }
  });
}

// prepara uma fase sem mexer na tela (usado também pelo verificador de fases)
function carregarNivel(i) {
  state.modo = 'missao';
  state.nivelIndex = i;
  state.nivelAtual = NIVEIS[i];
  state.gravidadeInvertida = false;
  montarMapa(state.nivelAtual);
  state.orcamentoRestante = Object.assign({}, state.nivelAtual.budget);
  state.bolas = [];
  state.rodada = null;
  state.bloqueado = false;
  state.portaAberta = false;
  state.dicas = [];
  state.dicasUsadas = 0;
}

function bolasDaFase(niv) { return niv.bolas || [niv.startCol]; }

function comecarRodada() {
  for (const g of state.tabuleiro.values()) { g.cooldown = 0; g.usado = false; g.animMola = 0; }
  for (const e of state.estrelasMapa) e.pega = false;
  state.portaAberta = false;
  state.particulas = [];
  state.acumulador = 0;
  state.rngFisica = criarRng(state.nivelAtual.semente ?? 1000 + state.nivelIndex);
  const cols = bolasDaFase(state.nivelAtual);
  state.bolas = cols.map(c => novaBola(c));
  state.rodada = { ativa: true, tempo: 0, necessarias: cols.length, naCesta: 0, melhorAnel: 0, estrelasPegas: 0, queimou: false };
  state.bloqueado = true;
}

function limparRodada() {
  state.rodada = null;
  state.bolas = [];
  state.bloqueado = false;
  state.portaAberta = false;
  for (const e of state.estrelasMapa) e.pega = false;
  for (const g of state.tabuleiro.values()) g.usado = false;
}

function calcularEstrelas(r) {
  if (state.nivelAtual.nota === 'aneis') return r.melhorAnel;
  if (r.naCesta < r.necessarias) return 0;
  return Math.min(3, 1 + r.estrelasPegas);
}

function encerrarRodada() {
  const r = state.rodada;
  r.ativa = false;
  const estrelas = calcularEstrelas(r);
  state.ultimoResultado = { estrelas, naCesta: r.naCesta, estrelasPegas: r.estrelasPegas, queimou: r.queimou };
  limparRodada();
  if (state.headless) return;
  const premio = registrarResultado(estrelas);
  mostrarResultado(estrelas, premio, r);
}

/* ================================ PROGRESSO ================================ */
function estrelasDaFase(i) { return state.save.levelStars[i] || 0; }
function estrelasTotais() { return Object.values(state.save.levelStars).reduce((a, b) => a + (b || 0), 0); }
function mundoDesbloqueado(m) { return estrelasTotais() >= m.precisa; }
function nivelDesbloqueado(i) {
  const niv = NIVEIS[i];
  if (!mundoDesbloqueado(niv.mundo)) return false;
  if (niv.indiceNoMundo === 0 || estrelasDaFase(i) > 0) return true;
  return estrelasDaFase(i - 1) > 0;
}

// grava estrelas e paga moedas só pelo que melhorou
function registrarResultado(estrelas) {
  const i = state.nivelIndex;
  const anterior = estrelasDaFase(i);
  const premio = { moedas: 0, desbloqueio: null, mundoNovo: null };
  if (estrelas <= anterior) return premio;
  const mundosAntes = MUNDOS.filter(mundoDesbloqueado);
  if (anterior === 0) premio.moedas += 5;
  premio.moedas += (estrelas - anterior) * 10;
  if (estrelas === 3) premio.moedas += 10;
  state.save.levelStars[i] = estrelas;
  state.save.coins += premio.moedas;

  const alvo = state.nivelAtual.desbloqueia;
  if (alvo) {
    const grupo = GRUPOS_DESBLOQUEIO[alvo];
    const pecas = grupo ? grupo.pecas : [alvo];
    if (!pecas.every(p => state.save.unlocked.includes(p))) {
      pecas.forEach(p => { if (!state.save.unlocked.includes(p)) state.save.unlocked.push(p); });
      premio.desbloqueio = grupo ? grupo.nome : GADGET_DEFS[alvo].nome;
    }
  }
  const novo = MUNDOS.find(m => mundoDesbloqueado(m) && !mundosAntes.includes(m));
  if (novo) premio.mundoNovo = novo;
  salvarSave();
  return premio;
}

/* =============================== DESENHO =================================== */
function desenharFundo() {
  const tema = state.modo === 'missao' ? state.nivelAtual.mundo.fundo : '#120a26';
  ctx.fillStyle = tema;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, CELL); ctx.lineTo(c * CELL, H - CELL); ctx.stroke(); }
  for (let r = 1; r < ROWS - 1; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, 0, W, CELL);
}

function desenharBloqueadas() {
  ctx.save();
  for (const key of state.bloqueadas) {
    if (state.tabuleiro.has(key)) continue;
    if (state.estrelasMapa.some(e => chaveCel(e.row, e.col) === key)) continue;
    const [row, col] = key.split('_').map(Number);
    const x0 = col * CELL, y0 = row * CELL;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x0 + 3, y0 + 3, CELL - 6, CELL - 6);
    ctx.strokeStyle = 'rgba(255,93,108,0.25)'; ctx.lineWidth = 4;
    ctx.beginPath();
    for (let k = -CELL; k < CELL; k += 24) { ctx.moveTo(x0 + Math.max(0, k), y0 + Math.max(0, -k)); ctx.lineTo(x0 + Math.min(CELL, k + CELL), y0 + Math.min(CELL, CELL - k)); }
    ctx.stroke();
  }
  ctx.restore();
}

function desenharLancador() {
  if (state.modo !== 'missao') return;
  for (const col of bolasDaFase(state.nivelAtual)) {
    ctx.save();
    ctx.translate(col * CELL + CELL / 2, CELL * 0.5);
    ctx.fillStyle = '#ffcc33';
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
    ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⬇️', 0, 1);
    ctx.restore();
  }
}

function desenharCesta() {
  const niv = state.modo === 'missao' ? state.nivelAtual : null;
  const basketCol = niv ? niv.basketCol : 1;
  const x0 = basketCol * CELL, y0 = (ROWS - 1) * CELL;
  ctx.save();
  if (niv && niv.nota !== 'aneis') {
    const largura = niv.basketLarg * CELL;
    // chão perigoso fora da cesta
    ctx.fillStyle = 'rgba(255,75,31,0.12)';
    ctx.fillRect(0, y0, W, CELL);
    ctx.fillStyle = '#1e6b45';
    ctx.fillRect(x0 + 4, y0, largura - 8, CELL);
    ctx.fillStyle = '#3ddc97';
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(state.animTempo * 5);
    ctx.fillRect(x0 + 4, y0, largura - 8, 10);
    ctx.globalAlpha = 1;
    ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(state.rodada && state.rodada.necessarias > 1 ? '🧺'.repeat(Math.min(3, state.rodada.necessarias)) : '🧺', x0 + largura / 2, y0 + 62);
    ctx.restore();
    return;
  }
  const cx = x0 + CELL * 1.5;
  ctx.globalAlpha = niv ? 1 : 0.55;
  ctx.fillStyle = '#5b3a1a';
  ctx.fillRect(x0, y0, CELL * 3, CELL);
  for (const a of [{ r: 180, cor: '#c65b2e' }, { r: 128, cor: '#e8d23d' }, { r: 58, cor: '#ffe066' }]) {
    ctx.beginPath();
    ctx.ellipse(cx, y0 + 8, a.r, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = a.cor;
    ctx.fill();
  }
  ctx.font = '26px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🎯', cx, y0 + 60);
  ctx.restore();
}

function desenharEstrelas() {
  ctx.save();
  ctx.font = '54px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const e of state.estrelasMapa) {
    if (e.pega) continue;
    const pulo = Math.sin(state.animTempo * 4 + e.col) * 6;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(e.cx, e.cy + pulo, 38, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillText('⭐', e.cx, e.cy + pulo + 2);
  }
  ctx.restore();
}

function emojiCentro(g, emoji, tam = 46, escala = 1) {
  ctx.save();
  ctx.font = tam + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.translate(g.cx, g.cy); ctx.scale(escala, escala);
  ctx.fillText(emoji, 0, 2);
  ctx.restore();
}

function desenharGadget(g) {
  const x0 = g.col * CELL, y0 = g.row * CELL;
  const def = GADGET_DEFS[g.tipo];
  const t = g.anim || 0;
  ctx.save();

  switch (g.tipo) {
    case 'rampaD': case 'rampaE':
      ctx.strokeStyle = def.cor; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath();
      if (g.tipo === 'rampaD') { ctx.moveTo(x0 + 14, y0 + 14); ctx.lineTo(x0 + CELL - 14, y0 + CELL - 14); }
      else { ctx.moveTo(x0 + CELL - 14, y0 + 14); ctx.lineTo(x0 + 14, y0 + CELL - 14); }
      ctx.stroke();
      emojiCentro(g, def.emoji);
      break;
    case 'bloco': {
      const tremor = (g.animMola || 0) * 4 * Math.sin(t * 60);
      ctx.translate(tremor, 0);
      ctx.fillStyle = '#9c4f2a';
      ctx.fillRect(x0 + 1, y0 + 1, CELL - 2, CELL - 2);
      ctx.beginPath(); ctx.rect(x0, y0, CELL, CELL); ctx.clip();
      ctx.strokeStyle = '#d68a5c'; ctx.lineWidth = 3;
      for (let k = 0; k < 4; k++) {
        const yy = y0 + k * 30;
        ctx.strokeRect(x0 + 2 + (k % 2 ? -30 : 0), yy + 2, 60, 28);
        ctx.strokeRect(x0 + 62 + (k % 2 ? -30 : 0), yy + 2, 60, 28);
      }
      ctx.restore(); ctx.save();
      ctx.strokeStyle = '#5c2a12'; ctx.lineWidth = 4; ctx.strokeRect(x0 + 2, y0 + 2, CELL - 4, CELL - 4);
      break;
    }
    case 'porta':
      if (state.portaAberta) {
        ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(167,139,250,0.5)'; ctx.lineWidth = 3;
        ctx.strokeRect(x0 + 6, y0 + 6, CELL - 12, CELL - 12);
      } else {
        ctx.fillStyle = '#4a2fc4'; ctx.fillRect(x0 + 2, y0 + 2, CELL - 4, CELL - 4);
        ctx.strokeStyle = '#a78bfa'; ctx.lineWidth = 6;
        for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x0 + k * 24, y0 + 6); ctx.lineTo(x0 + k * 24, y0 + CELL - 6); ctx.stroke(); }
        emojiCentro(g, '🔒', 36);
      }
      break;
    case 'botao': {
      const aberto = state.portaAberta;
      ctx.fillStyle = '#333'; ctx.fillRect(x0 + 20, y0 + CELL - 30, CELL - 40, 16);
      ctx.beginPath(); ctx.arc(g.cx, g.cy + (aberto ? 14 : 4), 30, 0, Math.PI * 2);
      ctx.fillStyle = aberto ? '#3ddc97' : '#ff5d6c'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 4; ctx.stroke();
      break;
    }
    case 'lava': {
      const grad = ctx.createLinearGradient(x0, y0, x0, y0 + CELL);
      grad.addColorStop(0, '#ffcc33'); grad.addColorStop(0.4, '#ff6a1f'); grad.addColorStop(1, '#b3200f');
      ctx.fillStyle = grad;
      ctx.fillRect(x0 + 2, y0 + 2, CELL - 4, CELL - 4);
      ctx.fillStyle = 'rgba(255,240,180,0.7)';
      for (let k = 0; k < 4; k++) {
        const fase = (state.animTempo * 0.8 + k * 0.27 + g.col * 0.13) % 1;
        ctx.beginPath(); ctx.arc(x0 + 18 + k * 28, y0 + CELL - 10 - fase * (CELL - 20), 4 + 5 * (1 - fase), 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'esteiraD': case 'esteiraE': {
      const y = y0 + CELL * 0.6;
      ctx.fillStyle = '#4b5263'; ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x0 + 2, y - 10, CELL - 4, 22, 11) : ctx.rect(x0 + 2, y - 10, CELL - 4, 22);
      ctx.fill();
      ctx.fillStyle = '#ffcc33';
      const dir = g.tipo === 'esteiraD' ? 1 : -1;
      ctx.beginPath(); ctx.rect(x0 + 4, y - 10, CELL - 8, 22); ctx.clip();
      for (let k = -1; k < 5; k++) {
        const xx = x0 + ((k * 30 + dir * state.animTempo * 90) % 150 + 150) % 150 - 15;
        ctx.beginPath(); ctx.moveTo(xx - dir * 6, y - 6); ctx.lineTo(xx + dir * 6, y + 1); ctx.lineTo(xx - dir * 6, y + 8); ctx.fill();
      }
      break;
    }
    case 'rebatedor': {
      const s = 1 + (g.animMola || 0) * 0.3;
      ctx.translate(g.cx, g.cy); ctx.scale(s, s);
      ctx.beginPath(); ctx.arc(0, 0, CELL * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = def.cor; ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = '#ffd0ec'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, CELL * 0.14, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      break;
    }
    default: {
      ctx.beginPath(); ctx.arc(g.cx, g.cy, CELL * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = def.cor; ctx.globalAlpha = 0.9; ctx.fill();
      ctx.globalAlpha = 1;
      ctx.save();
      if (g.tipo === 'giro') { ctx.translate(g.cx, g.cy); ctx.rotate(t * 3.5 * g.sentido); ctx.translate(-g.cx, -g.cy); }
      emojiCentro(g, def.emoji, 46, g.tipo === 'mola' ? 1 + (g.animMola || 0) * 0.4 : 1);
      ctx.restore();
    }
  }
  ctx.restore();

  if (g.tipo === 'ventilador') {
    ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#3db6ff'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const yy = y0 + CELL / 2 - ((t * 6 + i * 40) % 130);
      ctx.beginPath(); ctx.moveTo(x0 + 10, yy); ctx.lineTo(x0 + CELL - 10, yy); ctx.stroke();
    }
    ctx.restore();
  }
  if (g.tipo === 'ima' || g.tipo === 'buraconegro') {
    ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 5);
    ctx.strokeStyle = def.cor; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(g.cx, g.cy, CELL * 0.55, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (g.tipo === 'confete' && g.usado) {
    ctx.save(); ctx.globalAlpha = 0.4;
    ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('💤', g.cx, y0 + CELL - 18);
    ctx.restore();
  }
  // peça presa no mapa: parafusos nos cantos
  if (g.fixo && !['bloco', 'porta', 'lava', 'botao'].includes(g.tipo)) {
    ctx.save(); ctx.fillStyle = 'rgba(200,200,220,0.8)';
    for (const [px, py] of [[10, 10], [CELL - 10, 10], [10, CELL - 10], [CELL - 10, CELL - 10]]) {
      ctx.beginPath(); ctx.arc(x0 + px, y0 + py, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function desenharDicas() {
  if (state.modo !== 'missao') return;
  for (const d of state.dicas) {
    const g = state.tabuleiro.get(chaveCel(d.row, d.col));
    if (g && g.tipo === d.tipo) continue;
    const x0 = d.col * CELL, y0 = d.row * CELL;
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(state.animTempo * 6);
    ctx.setLineDash([10, 8]); ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 4;
    ctx.strokeRect(x0 + 6, y0 + 6, CELL - 12, CELL - 12);
    ctx.font = '50px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(GADGET_DEFS[d.tipo].emoji, x0 + CELL / 2, y0 + CELL / 2);
    ctx.restore();
  }
}

function desenharDestaqueCelula() {
  if (!state.cellHighlight) return;
  const { row, col, valido } = state.cellHighlight;
  ctx.save();
  ctx.fillStyle = valido ? 'rgba(61,220,151,0.35)' : 'rgba(255,93,108,0.35)';
  ctx.fillRect(col * CELL + 4, row * CELL + 4, CELL - 8, CELL - 8);
  ctx.restore();
}

function desenharBola(ball) {
  const skin = SHOP_BOLAS.find(b => b.id === state.save.bolaEquipada);
  ctx.save();
  if (skin && skin.emoji) {
    ctx.translate(ball.x, ball.y); ctx.rotate(ball.ang);
    ctx.font = '34px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(skin.emoji, 0, 2);
    ctx.restore();
    return;
  }
  const grad = ctx.createRadialGradient(ball.x - 5, ball.y - 6, 2, ball.x, ball.y, ball.r);
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.35, '#ffe066'); grad.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1b1032';
  ctx.beginPath(); ctx.arc(ball.x - 4, ball.y - 2, 2, 0, Math.PI * 2); ctx.arc(ball.x + 4, ball.y - 2, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function desenhar() {
  ctx.save();
  let shakeX = 0, shakeY = 0;
  if (state.shake.tempo > 0) { shakeX = rnd(-1, 1) * state.shake.mag; shakeY = rnd(-1, 1) * state.shake.mag; }
  ctx.translate(shakeX, shakeY);
  desenharFundo();
  desenharBloqueadas();
  desenharCesta();
  desenharLancador();
  for (const g of state.tabuleiro.values()) desenharGadget(g);
  desenharEstrelas();
  desenharDicas();
  desenharDestaqueCelula();
  for (const b of state.bolas) desenharBola(b);
  desenharParticulas();
  ctx.restore();
}

/* ============================== TELAS / NAV ================================ */
function trocarTela(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById(id).classList.add('ativa');
}

function atualizarHudGeral() {
  document.getElementById('estrelasTotais').textContent = estrelasTotais();
  for (const id of ['moedasTotais', 'moedasFases', 'moedasLoja', 'moedasJogo']) document.getElementById(id).textContent = state.save.coins;
  document.getElementById('estrelasFases').textContent = estrelasTotais();
}

function renderFases() {
  const grade = document.getElementById('gradeFases');
  grade.innerHTML = '';
  for (const mundo of MUNDOS) {
    const aberto = mundoDesbloqueado(mundo);
    const titulo = document.createElement('div');
    titulo.className = 'titulo-mundo' + (aberto ? '' : ' bloqueado');
    titulo.style.setProperty('--cor-mundo', mundo.cor);
    const feitas = mundo.fases.reduce((s, f) => s + estrelasDaFase(f.indice), 0);
    titulo.innerHTML = `<span class="emoji-mundo">${mundo.emoji}</span><span class="nome-mundo">${mundo.nome}</span>` +
      (aberto ? `<span class="pill">⭐ ${feitas}/${mundo.fases.length * 3}</span>`
              : `<span class="pill">🔒 ${estrelasTotais()}/${mundo.precisa} ⭐</span>`);
    grade.appendChild(titulo);
    mundo.fases.forEach((niv, k) => {
      const i = niv.indice;
      const desbloqueado = nivelDesbloqueado(i);
      const estrelas = estrelasDaFase(i);
      const div = document.createElement('div');
      div.className = 'cartao-fase' + (desbloqueado ? '' : ' bloqueada');
      div.style.setProperty('--cor-mundo', mundo.cor);
      div.innerHTML = `<div class="num">${k + 1}</div><div class="nome">${niv.nome}</div><div class="estrelas">${'★'.repeat(estrelas)}${'☆'.repeat(3 - estrelas)}</div>`;
      if (desbloqueado) div.addEventListener('pointerup', () => iniciarMissao(i));
      grade.appendChild(div);
    });
  }
}

function renderGradeLoja(idGrade, itens, donos, chaveEquipado, chaveDonos) {
  const grade = document.getElementById(idGrade);
  grade.innerHTML = '';
  itens.forEach(item => {
    const dono = donos.includes(item.id);
    const equipado = state.save[chaveEquipado] === item.id;
    const div = document.createElement('div');
    div.className = 'item-loja' + (equipado ? ' equipado' : '');
    let botaoHtml;
    if (equipado) botaoHtml = `<span class="tag-equipado">EQUIPADO</span>`;
    else if (dono) botaoHtml = `<button data-acao="equipar">Usar</button>`;
    else botaoHtml = `<button data-acao="comprar" ${state.save.coins < item.preco ? 'disabled' : ''}>🪙 ${item.preco}</button>`;
    const emoji = item.emoji || '🟡';
    div.innerHTML = `<div class="emoji">${emoji}</div><div class="preco">${item.nome}</div>${botaoHtml}`;
    const btn = div.querySelector('button');
    if (btn) btn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      if (btn.dataset.acao === 'equipar') { state.save[chaveEquipado] = item.id; tocarClique(); }
      else if (btn.dataset.acao === 'comprar' && state.save.coins >= item.preco) {
        state.save.coins -= item.preco; state.save[chaveDonos].push(item.id); state.save[chaveEquipado] = item.id;
        tocarComemoracao();
      }
      salvarSave(); atualizarHudGeral(); renderLoja();
    });
    grade.appendChild(div);
  });
}

function renderLoja() {
  document.getElementById('mascotePreview').textContent = getEmojiEquipado();
  renderGradeLoja('gradeLoja', SHOP_ITEMS, state.save.skinsOwned, 'skinEquipado', 'skinsOwned');
  renderGradeLoja('gradeBolas', SHOP_BOLAS, state.save.bolasOwned, 'bolaEquipada', 'bolasOwned');
}

function getEmojiEquipado() {
  const item = SHOP_ITEMS.find(s => s.id === state.save.skinEquipado) || SHOP_ITEMS[0];
  return item.emoji;
}

/* ============================== BANDEJA / DRAG =============================== */
function atualizarBandeja() {
  elBandeja.innerHTML = '';
  const tipos = state.modo === 'missao' ? Object.keys(state.nivelAtual.budget) : state.save.unlocked;
  ORDEM_BANDEJA.filter(t => tipos.includes(t)).forEach(tipo => {
    const def = GADGET_DEFS[tipo];
    const restante = state.modo === 'missao' ? (state.orcamentoRestante[tipo] || 0) : Infinity;
    const div = document.createElement('div');
    div.className = 'peca-bandeja' + (restante <= 0 ? ' esgotada' : '');
    div.innerHTML = `<span>${def.emoji}</span><span class="contagem">${restante === Infinity ? '∞' : restante}</span>`;
    if (restante > 0) div.addEventListener('pointerdown', (ev) => iniciarArrasto(ev, tipo, div));
    elBandeja.appendChild(div);
  });
}

let fantasmaEl = null;
function iniciarArrasto(ev, tipo, origemEl) {
  if (state.bloqueado) return;
  ev.preventDefault();
  state.arrastando = { tipo };
  origemEl.classList.add('arrastando');
  if (!fantasmaEl) {
    fantasmaEl = document.createElement('div');
    fantasmaEl.className = 'peca-fantasma';
    document.body.appendChild(fantasmaEl);
  }
  fantasmaEl.textContent = GADGET_DEFS[tipo].emoji;
  fantasmaEl.style.display = 'block';
  moverFantasma(ev.clientX, ev.clientY);

  const mover = (e) => {
    moverFantasma(e.clientX, e.clientY);
    atualizarDestaque(e.clientX, e.clientY);
  };
  const soltar = (e) => {
    document.removeEventListener('pointermove', mover);
    document.removeEventListener('pointerup', soltar);
    fantasmaEl.style.display = 'none';
    origemEl.classList.remove('arrastando');
    const cel = coordParaCelula(e.clientX, e.clientY);
    if (cel && !tentarColocar(tipo, cel.row, cel.col) && celulaValida(cel.row, cel.col)) tocarToc();
    state.arrastando = null;
    state.cellHighlight = null;
  };
  document.addEventListener('pointermove', mover);
  document.addEventListener('pointerup', soltar);
}
function moverFantasma(x, y) { fantasmaEl.style.left = x + 'px'; fantasmaEl.style.top = y + 'px'; }

function coordParaCelula(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
  const x = (clientX - rect.left) * (W / rect.width);
  const y = (clientY - rect.top) * (H / rect.height);
  return { row: Math.floor(y / CELL), col: Math.floor(x / CELL) };
}
function atualizarDestaque(clientX, clientY) {
  const cel = coordParaCelula(clientX, clientY);
  if (!cel) { state.cellHighlight = null; return; }
  state.cellHighlight = { row: cel.row, col: cel.col, valido: podeColocar(cel.row, cel.col) };
}

function aoTocarCanvas(ev) {
  if (state.arrastando || state.bloqueado) return;
  const cel = coordParaCelula(ev.clientX, ev.clientY);
  if (!cel) return;
  removerGadget(cel.row, cel.col);
}

/* ============================== FLUXO DE JOGO =============================== */
function entrarTelaJogo(origem) {
  state.telaOrigem = origem;
  trocarTela('tela-jogo');
  elBarraCaos.classList.toggle('escondida', state.modo !== 'livre');
  elBtnDica.classList.toggle('escondida', state.modo !== 'missao' || !state.nivelAtual.sol);
  elAviso.classList.remove('mostrar');
  atualizarBandeja();
  atualizarHudGeral();
}

function botaoTestarPronto() {
  elBtnTestar.textContent = state.modo === 'missao' ? '▶ TESTAR' : '▶ Soltar Bola';
  elBtnTestar.classList.remove('rodando');
}

function iniciarMissao(i) {
  carregarNivel(i);
  const niv = state.nivelAtual;
  elInfoMissao.textContent = `${niv.mundo.emoji} ${niv.indiceNoMundo + 1} · ${niv.nome}`;
  botaoTestarPronto();
  entrarTelaJogo('tela-fases');
}

function iniciarLivre() {
  state.modo = 'livre';
  state.nivelAtual = null;
  state.tabuleiro.clear();
  state.bloqueadas.clear();
  state.estrelasMapa = [];
  state.rodada = null;
  state.bolas = [];
  state.bloqueado = false;
  state.canhaoAtivo = false;
  state.gravidadeInvertida = false;
  state.cestasLivre = 0;
  state.rngFisica = Math.random;
  document.getElementById('btnCanhao').classList.remove('destaque');
  document.getElementById('btnVirar').classList.remove('destaque');
  atualizarInfoLivre();
  botaoTestarPronto();
  entrarTelaJogo('tela-inicio');
}

function atualizarInfoLivre() {
  if (elInfoMissao && state.modo === 'livre') elInfoMissao.textContent = `🎉 Caos Livre · 🎯 ${state.cestasLivre}`;
}

function aoClicarTestar() {
  if (state.modo === 'missao') {
    if (state.rodada) { // botão vira "Parar" durante a jogada
      limparRodada();
      botaoTestarPronto();
      return;
    }
    fecharAviso();
    comecarRodada();
    elBtnTestar.textContent = '⏹ Parar';
    elBtnTestar.classList.add('rodando');
  } else {
    if (state.bolas.length < MAX_BOLAS) state.bolas.push(novaBola(Math.floor(COLS / 2)));
    tocarClique();
  }
}

function mostrarResultado(estrelas, premio, r) {
  botaoTestarPronto();
  atualizarHudGeral();
  if (estrelas === 0) {
    // errar não abre janela: aviso rápido e já pode tentar de novo
    let msg = '💦 Quase! Muda uma peça e tenta de novo';
    if (r.queimou) msg = '🔥 Queimou na lava! Tenta outro caminho';
    else if (r.necessarias > 1 && r.naCesta > 0) msg = `🧺 ${r.naCesta} de ${r.necessarias} bolas na cesta!`;
    aviso(msg);
    reagirMascote('triste'); tocarTriste();
    return;
  }
  const titulos = ['', 'Passou! 👍', 'Mandou bem! 🎉', 'PERFEITO! 🏆'];
  document.getElementById('modalTitulo').textContent = titulos[estrelas];
  document.getElementById('modalEstrelas').textContent = '★'.repeat(estrelas) + '☆'.repeat(3 - estrelas);
  document.getElementById('modalMoedas').textContent = premio.moedas ? `+${premio.moedas} 🪙` : 'Tente pegar mais ⭐!';
  document.getElementById('modalMascote').textContent = estrelas === 3 ? '🥳' : getEmojiEquipado();
  const extras = [];
  if (premio.desbloqueio) extras.push(`🎁 Peça nova no Caos Livre: ${premio.desbloqueio}!`);
  if (premio.mundoNovo) extras.push(`🗺️ Mundo novo: ${premio.mundoNovo.emoji} ${premio.mundoNovo.nome}!`);
  const elDesb = document.getElementById('modalDesbloqueio');
  elDesb.style.display = extras.length ? 'block' : 'none';
  elDesb.innerHTML = extras.join('<br>');

  const proxima = state.nivelIndex + 1;
  const temProxima = proxima < NIVEIS.length && nivelDesbloqueado(proxima);
  document.getElementById('btnProximaFase').textContent = temProxima ? 'Próxima ▶' : '🗺️ Fases';

  if (estrelas === 3) {
    // 3 estrelas = festa de caos na tela
    reagirMascote('uau'); tocarFesta(); tremerTela(16);
    for (let k = 0; k < 6; k++) efeitoConfete(rnd(60, W - 60), rnd(H * 0.2, H * 0.7), 40);
  } else { reagirMascote('feliz'); tocarComemoracao(); }
  setTimeout(() => elModal.classList.add('ativa'), estrelas === 3 ? 700 : 250);
}

function fecharModal() { elModal.classList.remove('ativa'); }

function aviso(texto) {
  elAviso.textContent = texto;
  elAviso.classList.remove('mostrar');
  void elAviso.offsetWidth; // reinicia a animação
  elAviso.classList.add('mostrar');
  clearTimeout(state.timerAviso);
  state.timerAviso = setTimeout(fecharAviso, 2600);
}
function fecharAviso() { if (elAviso) elAviso.classList.remove('mostrar'); }

function reagirMascote(tipo) {
  if (state.headless) return;
  const mapa = { feliz: '🤩', triste: '😅', uau: '🥳' };
  const emoji = mapa[tipo] || getEmojiEquipado();
  if (elMascoteJogo) elMascoteJogo.textContent = emoji;
  clearTimeout(state.timerMascote);
  state.timerMascote = setTimeout(() => { if (elMascoteJogo) elMascoteJogo.textContent = getEmojiEquipado(); }, 1700);
}

function pedirDica() {
  if (state.modo !== 'missao' || state.bloqueado) return;
  const sol = state.nivelAtual.sol;
  if (!sol) return;
  const prox = sol.find(([tipo, row, col]) => {
    const g = state.tabuleiro.get(chaveCel(row, col));
    return !(g && g.tipo === tipo) && !state.dicas.some(d => d.row === row && d.col === col);
  });
  if (!prox) { aviso('💡 Já mostrei todas as dicas!'); return; }
  const custo = state.dicasUsadas === 0 ? 0 : 5;
  if (state.save.coins < custo) { aviso('💡 Precisa de 5 🪙 pra outra dica'); return; }
  state.save.coins -= custo;
  state.dicasUsadas++;
  state.dicas.push({ tipo: prox[0], row: prox[1], col: prox[2] });
  salvarSave(); atualizarHudGeral();
  tocarDing();
  aviso(custo ? '💡 Dica! (−5 🪙)' : '💡 Primeira dica é grátis!');
}

/* ============================== CAOS LIVRE EXTRA =============================== */
function alternarCanhao() {
  state.canhaoAtivo = !state.canhaoAtivo;
  document.getElementById('btnCanhao').classList.toggle('destaque', state.canhaoAtivo);
  state.canhaoTimer = 0;
}
function alternarGravidade() {
  state.gravidadeInvertida = !state.gravidadeInvertida;
  document.getElementById('btnVirar').classList.toggle('destaque', state.gravidadeInvertida);
  tocarWhoosh(); tremerTela(10);
  for (const b of state.bolas) b.vy *= -0.5;
}
function caosTotal() {
  for (let i = 0; i < 10; i++) {
    if (state.bolas.length < MAX_BOLAS) state.bolas.push(novaBola(Math.floor(rnd(0, COLS))));
  }
  for (const g of state.tabuleiro.values()) {
    if (g.tipo === 'confete') efeitoConfete(g.cx, g.cy, 30);
  }
  efeitoConfete(W / 2, H * 0.25, 60);
  tremerTela(14);
  tocarComemoracao();
}

/* =============================== LOOP PRINCIPAL =============================== */
let ultimoTS = null;
function loop(ts) {
  if (ultimoTS === null) ultimoTS = ts;
  const dt = Math.min((ts - ultimoTS) / 1000, 0.033);
  ultimoTS = ts;
  state.animTempo += dt;

  if (document.getElementById('tela-jogo').classList.contains('ativa')) {
    if (state.canhaoAtivo) {
      state.canhaoTimer -= dt;
      if (state.canhaoTimer <= 0) {
        state.canhaoTimer = 0.8;
        if (state.bolas.length < MAX_BOLAS) state.bolas.push(novaBola(Math.floor(rnd(0, COLS))));
      }
    }
    avancarFisica(dt);
    atualizarParticulas(dt);
    if (state.shake.tempo > 0) state.shake.tempo -= dt;
    desenhar();
  }
  requestAnimationFrame(loop);
}

/* ================================== INIT ==================================== */
function init() {
  canvas = document.getElementById('canvasJogo');
  ctx = canvas.getContext('2d');
  elMascoteJogo = document.getElementById('mascoteJogo');
  elInfoMissao = document.getElementById('infoMissao');
  elModal = document.getElementById('modalResultado');
  elBandeja = document.getElementById('bandeja');
  elBarraCaos = document.getElementById('barraCaos');
  elBtnTestar = document.getElementById('btnTestar');
  elAviso = document.getElementById('aviso');
  elBtnDica = document.getElementById('btnDica');

  document.getElementById('mascoteInicio').textContent = getEmojiEquipado();
  elMascoteJogo.textContent = getEmojiEquipado();

  document.getElementById('btnMissoes').addEventListener('pointerup', () => { renderFases(); atualizarHudGeral(); trocarTela('tela-fases'); });
  document.getElementById('btnLivre').addEventListener('pointerup', iniciarLivre);
  document.getElementById('btnLoja').addEventListener('pointerup', () => { renderLoja(); trocarTela('tela-loja'); });
  document.getElementById('btnReset').addEventListener('pointerup', () => {
    if (confirm('Apagar todo o progresso salvo?')) {
      state.save = padraoSave(); salvarSave(); atualizarHudGeral();
      document.getElementById('mascoteInicio').textContent = getEmojiEquipado();
    }
  });

  document.querySelectorAll('[data-voltar]').forEach(btn => {
    btn.addEventListener('pointerup', () => {
      const destino = btn.dataset.voltar === 'tela-anterior' ? state.telaOrigem : btn.dataset.voltar;
      limparRodada();
      state.canhaoAtivo = false;
      fecharAviso();
      trocarTela(destino);
      if (destino === 'tela-fases') renderFases();
      if (destino === 'tela-inicio') document.getElementById('mascoteInicio').textContent = getEmojiEquipado();
      atualizarHudGeral();
    });
  });

  canvas.addEventListener('pointerdown', aoTocarCanvas);
  elBtnTestar.addEventListener('pointerup', aoClicarTestar);
  elBtnDica.addEventListener('pointerup', pedirDica);
  document.getElementById('btnLimpar').addEventListener('pointerup', () => {
    if (state.bloqueado) return;
    for (const g of Array.from(state.tabuleiro.values())) if (!g.fixo) removerGadget(g.row, g.col);
    if (state.modo === 'livre') state.bolas = [];
  });
  document.getElementById('btnCanhao').addEventListener('pointerup', alternarCanhao);
  document.getElementById('btnVirar').addEventListener('pointerup', alternarGravidade);
  document.getElementById('btnCaosTotal').addEventListener('pointerup', caosTotal);
  document.getElementById('btnTentarDeNovo').addEventListener('pointerup', () => { fecharModal(); });
  document.getElementById('btnProximaFase').addEventListener('pointerup', () => {
    fecharModal();
    const proxima = state.nivelIndex + 1;
    if (proxima < NIVEIS.length && nivelDesbloqueado(proxima)) iniciarMissao(proxima);
    else { trocarTela('tela-fases'); renderFases(); }
  });

  document.addEventListener('pointerdown', () => ctxAudio(), { once: true });

  atualizarHudGeral();
  requestAnimationFrame(loop);
}

if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('DOMContentLoaded', init);
