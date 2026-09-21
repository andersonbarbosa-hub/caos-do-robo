'use strict';
/* =========================================================================
   CAOS DO ROBÔ — jogo de física/construção para tablet (100% offline)
   Sem dependências externas. Toque para arrastar peças, monte uma máquina
   maluca e solte a bola para ver a bagunça acontecer.
   ========================================================================= */

/* ----------------------------- Constantes ------------------------------ */
const COLS = 6;
const ROWS = 8;
const CELL = 120;
const W = COLS * CELL;   // 720
const H = ROWS * CELL;   // 960
const GRAVIDADE = 1500;
const MAX_BOLAS = 34;

const FAN_FORCA = 2000;
const FAN_MAX_SUBIDA = -420;
const IMA_ALCANCE = CELL * 2.35;
const IMA_FORCA = 950;
const BURACO_ALCANCE = CELL * 2.6;
const BURACO_CAPTURA = CELL * 0.42;
const BURACO_FORCA = 1600;

/* ------------------------------ Utilidades ------------------------------ */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2);
const rnd = (a, b) => a + Math.random() * (b - a);
const escolha = (arr) => arr[Math.floor(Math.random() * arr.length)];

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
};
const ORDEM_BANDEJA = ['rampaD', 'rampaE', 'mola', 'ventilador', 'ima', 'portalA', 'portalB', 'giro', 'confete', 'buraconegro', 'multiplicador'];

const BASE_DESBLOQUEADO = ['rampaD', 'rampaE', 'mola', 'ventilador'];

const NIVEIS = [
  { nome: 'Primeiro Tombo', budget: { rampaD: 1, rampaE: 1 }, startCol: 2, basketCol: 1, desbloqueia: null },
  { nome: 'Salto Alto', budget: { rampaD: 1, rampaE: 1, mola: 1 }, startCol: 0, basketCol: 3, desbloqueia: null },
  { nome: 'Vento a Favor', budget: { rampaD: 1, rampaE: 1, ventilador: 1 }, startCol: 5, basketCol: 0, desbloqueia: 'ima' },
  { nome: 'Puxão Magnético', budget: { rampaE: 1, mola: 1, ima: 1 }, startCol: 1, basketCol: 3, desbloqueia: 'portal' },
  { nome: 'Teletransporte!', budget: { portalA: 1, portalB: 1, rampaD: 1 }, startCol: 0, basketCol: 3, desbloqueia: 'giro' },
  { nome: 'Roda Louca', budget: { rampaD: 1, rampaE: 1, giro: 1 }, startCol: 3, basketCol: 0, desbloqueia: 'confete' },
  { nome: 'Kaboom!', budget: { rampaE: 1, confete: 1, ima: 1 }, startCol: 2, basketCol: 3, desbloqueia: 'buraconegro' },
  { nome: 'Desafio Final', budget: { rampaD: 1, rampaE: 1, mola: 1, giro: 1, buraconegro: 1 }, startCol: 0, basketCol: 2, desbloqueia: 'multiplicador' },
];

const SHOP_ITEMS = [
  { id: 'robo', emoji: '🤖', nome: 'Robô Clássico', preco: 0 },
  { id: 'alien', emoji: '👽', nome: 'Alienígena', preco: 20 },
  { id: 'dino', emoji: '🦖', nome: 'Dino-bot', preco: 35 },
  { id: 'fantasma', emoji: '👻', nome: 'Fantasminha', preco: 45 },
  { id: 'gato', emoji: '🐱', nome: 'Gato Ninja', preco: 55 },
  { id: 'unicornio', emoji: '🦄', nome: 'Unicórnio Turbo', preco: 70 },
  { id: 'foguete', emoji: '🚀', nome: 'Robô Foguete', preco: 90 },
  { id: 'abobora', emoji: '🎃', nome: 'Robô Abóbora', preco: 110 },
];

/* -------------------------------- Save ---------------------------------- */
const SAVE_KEY = 'caosRoboSave_v1';
function padraoSave() {
  return { coins: 0, levelStars: {}, unlocked: BASE_DESBLOQUEADO.slice(), skinsOwned: ['robo'], skinEquipado: 'robo' };
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
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state.save)); } catch (e) { /* armazenamento indisponível */ }
}

/* -------------------------------- Estado --------------------------------- */
const state = {
  save: carregarSave(),
  modo: null,           // 'missao' | 'livre'
  nivelIndex: 0,
  nivelAtual: null,
  telaOrigem: 'tela-inicio',
  tabuleiro: new Map(), // "row_col" -> gadget
  orcamentoRestante: {},
  bolas: [],
  particulas: [],
  bloqueado: false,     // trava edição durante voo da bola (missão)
  aguardandoResultado: false,
  canhaoAtivo: false,
  canhaoTimer: 0,
  shake: { tempo: 0, mag: 0 },
  arrastando: null,     // { tipo }
  cellHighlight: null,
  audioCtx: null,
  idBola: 1,
  animTempo: 0,
  timerMascote: null,
};

/* -------------------------------- DOM ------------------------------------ */
let canvas, ctx;
let elMascoteJogo, elInfoMissao, elModal, elBandeja, elBarraCaos, elBtnTestar;

/* ================================ ÁUDIO ================================== */
function ctxAudio() {
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
function tocarClique() { tom(520, 0.06, 'square', 0.12); }
function tocarBoing() {
  const ac = ctxAudio(); if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator(); const gain = ac.createGain();
  osc.type = 'sine'; osc.frequency.setValueAtTime(180, t0);
  osc.frequency.exponentialRampToValueAtTime(680, t0 + 0.18);
  gain.gain.setValueAtTime(0.25, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
  osc.connect(gain).connect(ac.destination); osc.start(t0); osc.stop(t0 + 0.24);
}
function tocarPop() { tom(320, 0.08, 'square', 0.2); tom(640, 0.1, 'square', 0.16, 0.03); }
function tocarWhoosh() {
  const ac = ctxAudio(); if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator(); const gain = ac.createGain();
  osc.type = 'sawtooth'; osc.frequency.setValueAtTime(900, t0);
  osc.frequency.exponentialRampToValueAtTime(130, t0 + 0.25);
  gain.gain.setValueAtTime(0.15, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.26);
  osc.connect(gain).connect(ac.destination); osc.start(t0); osc.stop(t0 + 0.28);
}
function tocarLancamento() { tom(220, 0.05, 'square', 0.2); tom(440, 0.05, 'square', 0.2, 0.05); tom(880, 0.15, 'square', 0.2, 0.1); }
function tocarComemoracao() { [523, 659, 784, 1047].forEach((f, i) => tom(f, 0.18, 'triangle', 0.18, i * 0.08)); }
function tocarTriste() { tom(300, 0.12, 'sine', 0.15); tom(220, 0.22, 'sine', 0.15, 0.12); }

/* ============================== PARTÍCULAS ================================ */
function efeitoParticulas(x, y, tipo, qtd = 14) {
  const cores = { portal: ['#3db6ff', '#2b6fe0'], mola: ['#ff5d6c', '#ffb3b8'], lancamento: ['#a78bfa', '#e0d4ff'], mult: ['#9be03d', '#d9ffb0'], padrao: ['#ffcc33', '#ff8a3d'] };
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
function tremerTela(mag) { state.shake = { tempo: 0.25, mag }; }

/* ============================= FÍSICA: BOLA =============================== */
function novaBola(col) {
  return {
    id: state.idBola++, x: col * CELL + CELL / 2, y: CELL * 0.5,
    vx: rnd(-40, 40), vy: 0, r: 16,
    categoriaDefinida: false, scoreCategoria: null,
    portalCooldown: 0, capturadaPor: null, capturaAngulo: 0, capturaRaio: 0, capturaTempo: 0,
    tempoVida: 0, morta: false,
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

function colidirRampa(ball, g, dir) {
  const x0 = g.col * CELL, y0 = g.row * CELL;
  if (dir === 'D') resolverLinha(ball, x0, y0, x0 + CELL, y0 + CELL, 0.15, 140);
  else resolverLinha(ball, x0 + CELL, y0, x0, y0 + CELL, 0.15, 140);
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
    const ang = rnd(0, Math.PI * 2); const vel = rnd(560, 820);
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
  ball.vy += GRAVIDADE * dt;
  ball.x += ball.vx * dt; ball.y += ball.vy * dt;
  if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.6; }
  if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.6; }
}

function colisoesBola(ball) {
  if (ball.capturadaPor) return;
  for (const g of state.tabuleiro.values()) {
    switch (g.tipo) {
      case 'rampaD': colidirRampa(ball, g, 'D'); break;
      case 'rampaE': colidirRampa(ball, g, 'E'); break;
      case 'mola': colidirMola(ball, g); break;
      case 'giro': colidirGiro(ball, g); break;
      case 'confete': colidirConfete(ball, g); break;
      case 'portalA': colidirPortal(ball, g, 'B'); break;
      case 'portalB': colidirPortal(ball, g, 'A'); break;
      case 'multiplicador': colidirMultiplicador(ball, g); break;
    }
  }
}

function avaliarBola(ball) {
  if (state.modo === 'missao' && !ball.categoriaDefinida && ball.y + ball.r >= (ROWS - 1) * CELL) {
    ball.categoriaDefinida = true;
    const centro = state.nivelAtual.basketCol * CELL + CELL * 1.5;
    const dx = Math.abs(ball.x - centro);
    let cat = 0;
    if (dx <= 58) cat = 3; else if (dx <= 128) cat = 2; else if (dx <= 178) cat = 1;
    ball.scoreCategoria = cat;
  }
  if (ball.y - ball.r > H || ball.tempoVida > 12) {
    ball.morta = true;
    if (state.modo === 'missao' && !state.aguardandoResultado) {
      state.aguardandoResultado = true;
      finalizarRodada(ball.scoreCategoria || 0);
    }
  }
}

function atualizarGadgets(dt) {
  for (const g of state.tabuleiro.values()) {
    if (g.cooldown > 0) g.cooldown -= dt;
    g.anim = (g.anim || 0) + dt;
    if (g.animMola > 0) g.animMola = Math.max(0, g.animMola - dt * 3);
  }
}

function passoFisica(dt) {
  const substeps = 2;
  const sdt = dt / substeps;
  for (let s = 0; s < substeps; s++) {
    atualizarGadgets(sdt);
    for (const ball of state.bolas) {
      if (ball.morta) continue;
      aplicarCampos(ball, sdt);
      integrarBola(ball, sdt);
      colisoesBola(ball);
      if (ball.portalCooldown > 0) ball.portalCooldown -= sdt;
      ball.tempoVida += sdt;
      avaliarBola(ball);
    }
  }
  state.bolas = state.bolas.filter(b => !b.morta);
}

/* =============================== TABULEIRO ================================ */
function chaveCel(row, col) { return row + '_' + col; }
function celulaValida(row, col) { return row >= 1 && row <= ROWS - 2 && col >= 0 && col < COLS; }

function tentarColocar(tipo, row, col) {
  if (!celulaValida(row, col)) return false;
  const key = chaveCel(row, col);
  if (state.tabuleiro.has(key)) return false;
  if (state.modo === 'missao') {
    const restante = state.orcamentoRestante[tipo] || 0;
    if (restante <= 0) return false;
    state.orcamentoRestante[tipo] = restante - 1;
  } else {
    if (!state.save.unlocked.includes(tipo)) return false;
  }
  const g = {
    tipo, row, col, cx: col * CELL + CELL / 2, cy: row * CELL + CELL / 2,
    cooldown: 0, usado: false, anim: 0, animMola: 0, sentido: Math.random() < 0.5 ? 1 : -1,
  };
  state.tabuleiro.set(key, g);
  atualizarBandeja();
  tocarClique();
  return true;
}
function removerGadget(row, col) {
  const key = chaveCel(row, col);
  const g = state.tabuleiro.get(key);
  if (!g) return;
  state.tabuleiro.delete(key);
  if (state.modo === 'missao') state.orcamentoRestante[g.tipo] = (state.orcamentoRestante[g.tipo] || 0) + 1;
  atualizarBandeja();
}
function prepararRodada() {
  for (const g of state.tabuleiro.values()) { g.cooldown = 0; g.usado = false; g.animMola = 0; }
  state.particulas = [];
  state.aguardandoResultado = false;
}

/* =============================== DESENHO =================================== */
function desenharFundo() {
  ctx.fillStyle = '#120a26';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, CELL); ctx.lineTo(c * CELL, H - CELL); ctx.stroke(); }
  for (let r = 1; r < ROWS - 1; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(W, r * CELL); ctx.stroke(); }
  // faixa do lançador
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, 0, W, CELL);
}

function desenharLancador() {
  const col = state.modo === 'missao' ? state.nivelAtual.startCol : null;
  if (col === null) return;
  const cx = col * CELL + CELL / 2;
  ctx.save();
  ctx.translate(cx, CELL * 0.5);
  ctx.fillStyle = '#ffcc33';
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1b1032';
  ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('⬇️', 0, 1);
  ctx.restore();
}

function desenharCesta() {
  const basketCol = state.modo === 'missao' ? state.nivelAtual.basketCol : 1;
  const x0 = basketCol * CELL, y0 = (ROWS - 1) * CELL;
  const cx = x0 + CELL * 1.5, cy = y0 + CELL / 2;
  const largura = CELL * 3;
  ctx.save();
  ctx.globalAlpha = state.modo === 'missao' ? 1 : 0.55;
  ctx.fillStyle = '#5b3a1a';
  ctx.fillRect(x0, y0, largura, CELL);
  const aneis = [
    { r: 180, cor: '#c65b2e' },
    { r: 128, cor: '#e8d23d' },
    { r: 58, cor: '#ffe066' },
  ];
  for (const a of aneis) {
    ctx.beginPath();
    ctx.ellipse(cx, y0 + 8, a.r, 26, 0, 0, Math.PI * 2);
    ctx.fillStyle = a.cor;
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '26px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('🎯', cx, y0 + 60);
  ctx.restore();
}

function desenharGadget(g) {
  const x0 = g.col * CELL, y0 = g.row * CELL;
  const def = GADGET_DEFS[g.tipo];
  ctx.save();
  ctx.translate(x0, y0);

  if (g.tipo === 'rampaD' || g.tipo === 'rampaE') {
    ctx.strokeStyle = def.cor; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath();
    if (g.tipo === 'rampaD') { ctx.moveTo(14, 14); ctx.lineTo(CELL - 14, CELL - 14); }
    else { ctx.moveTo(CELL - 14, 14); ctx.lineTo(14, CELL - 14); }
    ctx.stroke();
  } else {
    const raio = CELL * 0.4;
    ctx.beginPath(); ctx.arc(CELL / 2, CELL / 2, raio, 0, Math.PI * 2);
    ctx.fillStyle = def.cor; ctx.globalAlpha = 0.9; ctx.fill();
    ctx.globalAlpha = 1;
    if (g.tipo === 'giro') { ctx.rotate((g.anim || 0) * 4 * g.sentido); ctx.translate(-x0 - CELL / 2, -y0 - CELL / 2); }
  }

  ctx.font = '46px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const escala = g.tipo === 'mola' ? 1 + (g.animMola || 0) * 0.4 : 1;
  ctx.save();
  if (g.tipo === 'giro') {
    ctx.translate(g.cx, g.cy); ctx.rotate((g.anim || 0) * 3.5 * g.sentido); ctx.translate(-g.cx, -g.cy);
  }
  ctx.translate(g.cx, g.cy); ctx.scale(escala, escala);
  ctx.fillText(def.emoji, 0, 2);
  ctx.restore();

  if (g.tipo === 'ventilador') {
    ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = '#3db6ff'; ctx.lineWidth = 3;
    const t = (g.anim || 0) * 6;
    for (let i = 0; i < 3; i++) {
      const yy = CELL / 2 - ((t + i * 40) % 130);
      ctx.beginPath(); ctx.moveTo(10, yy); ctx.lineTo(CELL - 10, yy); ctx.stroke();
    }
    ctx.restore();
  }
  if (g.tipo === 'ima' || g.tipo === 'buraconegro') {
    ctx.save(); ctx.globalAlpha = 0.25 + 0.15 * Math.sin((g.anim || 0) * 5);
    ctx.strokeStyle = def.cor; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(CELL / 2, CELL / 2, CELL * 0.55, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  if (g.tipo === 'confete' && g.usado) {
    ctx.save(); ctx.globalAlpha = 0.4;
    ctx.font = '20px sans-serif'; ctx.fillText('💤', CELL / 2, CELL - 18);
    ctx.restore();
  }
  ctx.restore();
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
  ctx.save();
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
  desenharCesta();
  desenharLancador();
  for (const g of state.tabuleiro.values()) desenharGadget(g);
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
  const estrelas = Object.values(state.save.levelStars).reduce((a, b) => a + b, 0);
  document.getElementById('estrelasTotais').textContent = estrelas;
  document.getElementById('moedasTotais').textContent = state.save.coins;
  document.getElementById('moedasFases').textContent = state.save.coins;
  document.getElementById('moedasLoja').textContent = state.save.coins;
  document.getElementById('moedasJogo').textContent = state.save.coins;
}

function nivelDesbloqueado(i) { return i === 0 || state.save.levelStars[i - 1] !== undefined; }

function renderFases() {
  const grade = document.getElementById('gradeFases');
  grade.innerHTML = '';
  NIVEIS.forEach((niv, i) => {
    const desbloqueado = nivelDesbloqueado(i);
    const estrelas = state.save.levelStars[i];
    const div = document.createElement('div');
    div.className = 'cartao-fase' + (desbloqueado ? '' : ' bloqueada');
    const estrelasTxt = estrelas === undefined ? '☆☆☆' : '★'.repeat(estrelas) + '☆'.repeat(3 - estrelas);
    div.innerHTML = `<div class="num">${i + 1}</div><div class="nome">${niv.nome}</div><div class="estrelas">${estrelasTxt}</div>`;
    if (desbloqueado) div.addEventListener('pointerup', () => iniciarMissao(i));
    grade.appendChild(div);
  });
}

function renderLoja() {
  const grade = document.getElementById('gradeLoja');
  grade.innerHTML = '';
  document.getElementById('mascotePreview').textContent = getEmojiEquipado();
  SHOP_ITEMS.forEach(item => {
    const dono = state.save.skinsOwned.includes(item.id);
    const equipado = state.save.skinEquipado === item.id;
    const div = document.createElement('div');
    div.className = 'item-loja' + (equipado ? ' equipado' : '');
    let botaoHtml;
    if (equipado) botaoHtml = `<span class="tag-equipado">EQUIPADO</span>`;
    else if (dono) botaoHtml = `<button data-acao="equipar">Usar</button>`;
    else botaoHtml = `<button data-acao="comprar" ${state.save.coins < item.preco ? 'disabled' : ''}>Comprar</button>`;
    div.innerHTML = `<div class="emoji">${item.emoji}</div><div class="preco">${item.nome}${dono ? '' : ' · 🪙 ' + item.preco}</div>${botaoHtml}`;
    const btn = div.querySelector('button');
    if (btn) btn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      if (btn.dataset.acao === 'equipar') { state.save.skinEquipado = item.id; }
      else if (btn.dataset.acao === 'comprar' && state.save.coins >= item.preco) {
        state.save.coins -= item.preco; state.save.skinsOwned.push(item.id); state.save.skinEquipado = item.id;
        tocarComemoracao();
      }
      salvarSave(); atualizarHudGeral(); renderLoja();
    });
    grade.appendChild(div);
  });
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
    if (restante > 0) {
      div.addEventListener('pointerdown', (ev) => iniciarArrasto(ev, tipo, div));
    }
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
    if (cel) tentarColocar(tipo, cel.row, cel.col);
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
  const row = Math.floor(y / CELL), col = Math.floor(x / CELL);
  return { row, col };
}
function atualizarDestaque(clientX, clientY) {
  const cel = coordParaCelula(clientX, clientY);
  if (!cel) { state.cellHighlight = null; return; }
  const valido = celulaValida(cel.row, cel.col) && !state.tabuleiro.has(chaveCel(cel.row, cel.col));
  state.cellHighlight = { row: cel.row, col: cel.col, valido };
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
  atualizarBandeja();
  atualizarHudGeral();
}

function iniciarMissao(i) {
  state.modo = 'missao';
  state.nivelIndex = i;
  state.nivelAtual = NIVEIS[i];
  state.tabuleiro.clear();
  state.bolas = [];
  state.orcamentoRestante = Object.assign({}, state.nivelAtual.budget);
  state.bloqueado = false;
  elInfoMissao.textContent = `Fase ${i + 1}: ${state.nivelAtual.nome}`;
  elBtnTestar.textContent = '▶ TESTAR';
  elBtnTestar.classList.remove('rodando');
  entrarTelaJogo('tela-fases');
}

function iniciarLivre() {
  state.modo = 'livre';
  state.nivelAtual = null;
  state.tabuleiro.clear();
  state.bolas = [];
  state.canhaoAtivo = false;
  document.getElementById('btnCanhao').classList.remove('destaque');
  elInfoMissao.textContent = '🎉 Modo Caos Livre';
  elBtnTestar.textContent = '▶ Soltar Bola';
  elBtnTestar.classList.remove('rodando');
  entrarTelaJogo('tela-inicio');
}

function aoClicarTestar() {
  if (state.modo === 'missao') {
    if (state.bloqueado) return;
    prepararRodada();
    state.bloqueado = true;
    state.bolas = [novaBola(state.nivelAtual.startCol)];
    elBtnTestar.textContent = '⏳ Caiu...';
    elBtnTestar.classList.add('rodando');
  } else {
    if (state.bolas.length < MAX_BOLAS) state.bolas.push(novaBola(clamp(state.nivelAtual ? 0 : Math.floor(COLS / 2), 0, COLS - 1)));
    tocarClique();
  }
}

function finalizarRodada(estrelas) {
  state.bloqueado = false;
  elBtnTestar.textContent = '▶ TESTAR';
  elBtnTestar.classList.remove('rodando');

  const i = state.nivelIndex;
  const anterior = state.save.levelStars[i];
  const melhorou = anterior === undefined || estrelas > anterior;
  if (melhorou) state.save.levelStars[i] = estrelas;
  const moedasGanhas = estrelas * 10 + 5;
  state.save.coins += moedasGanhas;

  let desbloqueio = null;
  const alvo = state.nivelAtual.desbloqueia;
  if (estrelas > 0 && alvo) {
    if (alvo === 'portal') {
      if (!state.save.unlocked.includes('portalA')) { state.save.unlocked.push('portalA', 'portalB'); desbloqueio = 'Portais'; }
    } else if (!state.save.unlocked.includes(alvo)) {
      state.save.unlocked.push(alvo); desbloqueio = GADGET_DEFS[alvo].nome;
    }
  }
  salvarSave();
  atualizarHudGeral();
  mostrarModalResultado(estrelas, moedasGanhas, desbloqueio);
}

function reagirMascote(tipo) {
  const mapa = { feliz: '🤩', triste: '😅', uau: '🥳' };
  const emoji = mapa[tipo] || getEmojiEquipado();
  if (elMascoteJogo) elMascoteJogo.textContent = emoji;
  clearTimeout(state.timerMascote);
  state.timerMascote = setTimeout(() => { if (elMascoteJogo) elMascoteJogo.textContent = getEmojiEquipado(); }, 1700);
}

function mostrarModalResultado(estrelas, moedas, desbloqueio) {
  const titulos = ['Quase lá! 🙂', 'Boa! 👍', 'Mandou bem! 🎉', 'PERFEITO! 🏆'];
  document.getElementById('modalTitulo').textContent = titulos[estrelas];
  document.getElementById('modalEstrelas').textContent = '★'.repeat(estrelas) + '☆'.repeat(3 - estrelas);
  document.getElementById('modalMoedas').textContent = `+${moedas} 🪙`;
  const elDesb = document.getElementById('modalDesbloqueio');
  if (desbloqueio) { elDesb.style.display = 'block'; elDesb.textContent = `🎁 Nova peça desbloqueada: ${desbloqueio}!`; }
  else elDesb.style.display = 'none';

  const temProxima = state.nivelIndex < NIVEIS.length - 1;
  const btnProxima = document.getElementById('btnProximaFase');
  btnProxima.textContent = temProxima ? 'Próxima ▶' : '🏁 Fim!';

  if (estrelas >= 2) { reagirMascote('feliz'); tocarComemoracao(); }
  else if (estrelas === 1) { reagirMascote('feliz'); }
  else { reagirMascote('triste'); tocarTriste(); }

  elModal.classList.add('ativa');
}

function fecharModal() { elModal.classList.remove('ativa'); }

/* ============================== CAOS LIVRE EXTRA =============================== */
function alternarCanhao() {
  state.canhaoAtivo = !state.canhaoAtivo;
  document.getElementById('btnCanhao').classList.toggle('destaque', state.canhaoAtivo);
  state.canhaoTimer = 0;
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
    passoFisica(dt);
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

  document.getElementById('mascoteInicio').textContent = getEmojiEquipado();
  elMascoteJogo.textContent = getEmojiEquipado();

  document.getElementById('btnMissoes').addEventListener('pointerup', () => { renderFases(); trocarTela('tela-fases'); });
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
      const destino = btn.dataset.voltar;
      trocarTela(destino === 'tela-anterior' ? state.telaOrigem : destino);
      if ((destino === 'tela-anterior' ? state.telaOrigem : destino) === 'tela-fases') renderFases();
    });
  });

  canvas.addEventListener('pointerdown', aoTocarCanvas);
  elBtnTestar.addEventListener('pointerup', aoClicarTestar);
  document.getElementById('btnLimpar').addEventListener('pointerup', () => {
    if (state.bloqueado) return;
    for (const key of Array.from(state.tabuleiro.keys())) {
      const [r, c] = key.split('_').map(Number);
      removerGadget(r, c);
    }
  });
  document.getElementById('btnCanhao').addEventListener('pointerup', alternarCanhao);
  document.getElementById('btnCaosTotal').addEventListener('pointerup', caosTotal);
  document.getElementById('btnTentarDeNovo').addEventListener('pointerup', () => { fecharModal(); });
  document.getElementById('btnProximaFase').addEventListener('pointerup', () => {
    fecharModal();
    if (state.nivelIndex < NIVEIS.length - 1) iniciarMissao(state.nivelIndex + 1);
    else { trocarTela('tela-fases'); renderFases(); }
  });

  document.addEventListener('pointerdown', () => ctxAudio(), { once: true });

  atualizarHudGeral();
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', init);
