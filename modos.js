'use strict';
/* =========================================================================
   MODOS EXTRAS: Fase Infinita, Fase do Dia e Criar Fase (editor + desafio
   por link). Carregado depois de game.js e fases-geradas.js.
   ========================================================================= */

const MODOS_GERADOS = {
  facil:  { nome: 'Fácil',  emoji: '🟢', fundo: '#0e2218', moedas: 2 },
  medio:  { nome: 'Médio',  emoji: '🟡', fundo: '#231d0b', moedas: 4 },
  insano: { nome: 'Insano', emoji: '🔴', fundo: '#2a0c12', moedas: 6 },
  diario: { nome: 'Fase do Dia', emoji: '📅', fundo: '#15102f', moedas: 10 },
};
const MUNDO_EDITOR = { id: 'editor', nome: 'Minha Fase', emoji: '🛠️', fundo: '#101a2e' };
const MUNDO_DESAFIO = { id: 'desafio', nome: 'Desafio', emoji: '🎁', fundo: '#1f0f2e' };

/* --------------------------- banco de fases geradas -------------------------- */
function faseDoBanco(dif, n) {
  const d = BANCO_FASES[dif][n % BANCO_FASES[dif].length];
  const modo = MODOS_GERADOS[dif];
  const f = {
    nome: dif === 'diario' ? 'Fase do Dia' : `${modo.nome} #${n + 1}`, nota: 'cesta',
    budget: d.b, basketCol: d.c, basketLarg: d.l, mapa: d.m.match(/.{6}/g), sol: d.o, semente: 1,
    mundo: { id: dif, nome: modo.nome, emoji: modo.emoji, fundo: modo.fundo },
    tipo: dif === 'diario' ? 'diario' : 'infinito', dificuldade: dif, numero: n, melhor: 0,
  };
  if (Array.isArray(d.s)) f.bolas = d.s; else f.startCol = d.s;
  return f;
}

function hojeTexto(data = new Date()) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}
function ontemTexto() { const d = new Date(); d.setDate(d.getDate() - 1); return hojeTexto(d); }
// mesma fase pra todo mundo no mesmo dia
function numeroDoDia() {
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}
function estrelasDeHoje() { return state.save.diario.dia === hojeTexto() ? state.save.diario.estrelas : 0; }

function jogarFase(fase, origem) {
  carregarFase(fase);
  const titulo = fase.tipo === 'desafio' ? `🎁 ${fase.nome}` : `${fase.mundo.emoji} ${fase.nome}`;
  elInfoMissao.textContent = titulo;
  botaoTestarPronto();
  entrarTelaJogo(origem);
}

function jogarInfinito(dif) { jogarFase(faseDoBanco(dif, state.save.infinito[dif]), 'tela-infinito'); }
function jogarDiario() { jogarFase(faseDoBanco('diario', numeroDoDia()), 'tela-infinito'); }

function pularFase() {
  const f = state.nivelAtual;
  if (state.bloqueado || !f || f.tipo !== 'infinito') return;
  state.save.infinito[f.dificuldade]++;
  salvarSave();
  jogarInfinito(f.dificuldade);
  aviso('⏭ Fase pulada!');
}

function renderInfinito() {
  const dias = state.save.sequencia.dia === hojeTexto() || state.save.sequencia.dia === ontemTexto() ? state.save.sequencia.dias : 0;
  const e = estrelasDeHoje();
  document.getElementById('estrelasDia').textContent = '★'.repeat(e) + '☆'.repeat(3 - e);
  document.getElementById('sequenciaDia').textContent = dias > 0 ? `🔥 ${dias} ${dias === 1 ? 'dia' : 'dias'} seguidos` : 'Jogue hoje e comece uma sequência!';
  for (const dif of ['facil', 'medio', 'insano']) {
    document.getElementById('numInf_' + dif).textContent = `Fase ${state.save.infinito[dif] + 1}`;
  }
  document.getElementById('estrelasInf').textContent = state.save.estrelasInfinito;
}

/* -------------------------- resultado dos modos novos ------------------------- */
function registrarResultadoModo(estrelas) {
  const f = state.nivelAtual;
  const premio = { moedas: 0 };
  if (estrelas <= 0) return premio;

  if (f.tipo === 'infinito') {
    const melhora = Math.max(0, estrelas - f.melhor);
    premio.moedas = melhora * MODOS_GERADOS[f.dificuldade].moedas;
    state.save.estrelasInfinito += melhora;
    if (f.melhor === 0 && state.save.infinito[f.dificuldade] === f.numero) state.save.infinito[f.dificuldade]++;
    f.melhor = Math.max(f.melhor, estrelas);
  } else if (f.tipo === 'diario') {
    const hoje = hojeTexto();
    const anterior = estrelasDeHoje();
    if (anterior === 0) {
      // primeira vitória do dia: conta a sequência
      const seq = state.save.sequencia;
      seq.dias = seq.dia === ontemTexto() ? seq.dias + 1 : seq.dia === hoje ? seq.dias : 1;
      seq.dia = hoje;
      premio.moedas += 10;
      premio.texto = `🔥 Sequência: ${seq.dias} ${seq.dias === 1 ? 'dia' : 'dias'}! Volte amanhã pra outra fase.`;
    }
    if (estrelas > anterior) {
      premio.moedas += (estrelas - anterior) * MODOS_GERADOS.diario.moedas;
      state.save.diario = { dia: hoje, estrelas };
    }
    document.getElementById('seloDia').classList.add('escondida');
  } else if (f.tipo === 'teste') {
    // passou na própria fase: está aprovada e a montagem vira a dica de quem receber
    editor.aprovado = true;
    editor.sol = Array.from(state.tabuleiro.values()).filter(g => !g.fixo).map(g => [g.tipo, g.row, g.col]);
    salvarRascunho();
    premio.texto = '✅ Sua fase tem solução! Agora dá pra mandar o desafio.';
  } else if (f.tipo === 'desafio') {
    if (estrelas > f.melhor) premio.moedas = (estrelas - f.melhor) * 5;
    f.melhor = Math.max(f.melhor, estrelas);
    premio.texto = f.autor ? `Você venceu o desafio de ${f.autor}!` : 'Você venceu o desafio!';
  }
  state.save.coins += premio.moedas;
  salvarSave();
  return premio;
}

function textoProximaModo() {
  const tipo = state.nivelAtual.tipo;
  if (tipo === 'infinito') return 'Próxima ▶';
  if (tipo === 'teste') return '🔗 Mandar';
  if (tipo === 'diario') return '🎲 Mais fases';
  return '🏠 Início';
}
function acaoProximaModo() {
  const f = state.nivelAtual;
  if (f.tipo === 'infinito') jogarInfinito(f.dificuldade);
  else if (f.tipo === 'teste') { abrirEditor(); abrirCompartilhar(); }
  else if (f.tipo === 'diario') { renderInfinito(); trocarTela('tela-infinito'); }
  else { trocarTela('tela-inicio'); atualizarHudGeral(); }
}

/* ================================ EDITOR =================================== */
// o que dá pra colocar no mapa (mesmas letras de niveis.js)
const EDITOR_ITENS = {
  '#': { emoji: '🧱' }, '~': { emoji: '🌋' }, '*': { emoji: '⭐' }, 'x': { emoji: '🚫' },
  'o': { emoji: '🔘' }, '=': { emoji: '🚪' }, 'D': { emoji: '↘️' }, 'E': { emoji: '↙️' },
  '>': { emoji: '⏩' }, '<': { emoji: '⏪' }, 'b': { emoji: '💥' }, '^': { emoji: '🔼' },
  'f': { emoji: '🌬️' }, 'm': { emoji: '🧲' }, 'g': { emoji: '🌀' }, 'n': { emoji: '🕳️' },
  '1': { emoji: '🔵' }, '2': { emoji: '🟠' }, 'c': { emoji: '🎉' },
};
// peças que quem jogar vai poder colocar (portal conta como o par)
const EDITOR_PECAS = ['rampaD', 'rampaE', 'mola', 'ventilador', 'rebatedor', 'esteiraD', 'esteiraE', 'ima', 'giro', 'buraconegro', 'confete', 'portal'];

function rascunhoNovo() {
  return { mapa: ['......', '......', '......', '......', '......', '......'], bolas: [2], cesta: 2, larg: 1, budget: { rampaD: 1, rampaE: 1 }, aprovado: false, sol: null };
}
let editor = null;

function faseDoEditor(tipo = null) {
  const f = {
    nome: 'Minha Fase', nota: 'cesta', budget: {}, bolas: editor.bolas.slice(), basketCol: editor.cesta,
    basketLarg: editor.larg, mapa: editor.mapa.slice(), semente: 1, mundo: MUNDO_EDITOR, tipo, melhor: 0,
  };
  for (const [p, q] of Object.entries(editor.budget)) {
    if (!q) continue;
    if (p === 'portal') { f.budget.portalA = q; f.budget.portalB = q; } else f.budget[p] = q;
  }
  return f;
}

function salvarRascunho() { if (editor) { state.save.rascunho = editor; salvarSave(); } }

function abrirEditor() {
  editor = state.save.rascunho || rascunhoNovo();
  state.modo = 'editor';
  state.nivelAtual = faseDoEditor();
  state.nivelIndex = -1;
  state.bolas = [];
  state.rodada = null;
  state.bloqueado = false;
  state.portaAberta = false;
  state.dicas = [];
  montarMapa(state.nivelAtual);
  elInfoMissao.textContent = '🛠️ Criar Fase';
  botaoTestarPronto();
  entrarTelaJogo('tela-inicio');
}

function editorMudou() {
  editor.aprovado = false;
  editor.sol = null;
  state.nivelAtual = faseDoEditor();
  montarMapa(state.nivelAtual);
  salvarRascunho();
}

function editorColocar(ch, row, col) {
  if (!celulaValida(row, col)) return;
  const linha = editor.mapa[row - 1].split('');
  linha[col] = ch;
  editor.mapa[row - 1] = linha.join('');
  tocarClique();
  editorMudou();
}

function editorTocar(row, col) {
  if (row === 0) {
    // lançador: liga/desliga a bola nessa coluna (1 ou 2 bolas)
    const i = editor.bolas.indexOf(col);
    if (i >= 0 && editor.bolas.length > 1) editor.bolas.splice(i, 1);
    else if (i < 0) { editor.bolas.push(col); editor.bolas.sort((a, b) => a - b); if (editor.bolas.length > 2) editor.bolas.shift(); }
    if (editor.bolas.length > 1) editor.larg = Math.max(editor.larg, 2);
  } else if (row === ROWS - 1) {
    // cesta: tocar dentro aumenta (1→2→3→1), tocar fora muda de lugar
    if (col >= editor.cesta && col < editor.cesta + editor.larg) editor.larg = editor.larg % 3 + 1;
    else editor.cesta = col;
    editor.cesta = Math.min(editor.cesta, COLS - editor.larg);
  } else if (celulaValida(row, col)) {
    if (editor.mapa[row - 1][col] === '.') return;
    const linha = editor.mapa[row - 1].split('');
    linha[col] = '.';
    editor.mapa[row - 1] = linha.join('');
  }
  tocarClique();
  editorMudou();
}

// ordem da bandeja (as chaves '1' e '2' iriam pro começo num for...in)
const EDITOR_ORDEM = ['#', '~', '*', 'x', 'o', '=', 'D', 'E', '>', '<', 'b', '^', 'f', 'm', 'g', 'n', '1', '2', 'c'];

function bandejaEditor() {
  for (const ch of EDITOR_ORDEM) {
    const item = EDITOR_ITENS[ch];
    const div = document.createElement('div');
    div.className = 'peca-bandeja';
    div.innerHTML = `<span>${item.emoji}</span>`;
    div.addEventListener('pointerdown', (ev) => iniciarArrasto(ev, ch, div));
    elBandeja.appendChild(div);
  }
}

function renderPainelEditor() {
  const el = document.getElementById('pecasEditor');
  el.innerHTML = '';
  for (const p of EDITOR_PECAS) {
    const q = editor.budget[p] || 0;
    const emoji = p === 'portal' ? '🔵🟠' : GADGET_DEFS[p].emoji;
    const b = document.createElement('button');
    b.className = 'chip-peca' + (q ? ' ativa' : '');
    b.innerHTML = `<span>${emoji}</span><b>${q || ''}</b>`;
    b.addEventListener('pointerup', () => {
      const max = p === 'portal' ? 1 : 2;
      editor.budget[p] = q >= max ? 0 : q + 1;
      tocarClique();
      editorMudou();
      renderPainelEditor();
    });
    el.appendChild(b);
  }
}

function testarFaseEditor() {
  const f = faseDoEditor('teste');
  if (!Object.keys(f.budget).length) { aviso('🧩 Escolha as peças de quem vai jogar (lá embaixo)'); return; }
  salvarRascunho();
  carregarFase(f);
  elInfoMissao.textContent = '🧪 Testando sua fase';
  botaoTestarPronto();
  entrarTelaJogo('tela-inicio');
  aviso('Passe na sua fase pra poder mandar! 💪');
}

function limparEditor() {
  if (!confirm('Apagar a fase e começar outra?')) return;
  editor = rascunhoNovo();
  editorMudou();
  renderPainelEditor();
}

/* ============================ DESAFIO POR LINK ============================== */
function b64url(texto) {
  return btoa(unescape(encodeURIComponent(texto))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function deB64url(cod) {
  return decodeURIComponent(escape(atob(cod.replace(/-/g, '+').replace(/_/g, '/'))));
}

function codigoDoEditor(nome, autor) {
  const f = faseDoEditor();
  return b64url(JSON.stringify({ v: 1, n: nome, a: autor, m: f.mapa.join(''), s: f.bolas, c: f.basketCol, l: f.basketLarg, b: f.budget, o: editor.sol }));
}

// link vem de fora: confere tudo antes de montar a fase
function faseDoCodigo(cod) {
  const d = JSON.parse(deB64url(cod));
  const letras = new Set(['.', 'x', '*'].concat(Object.keys(MAPA_LEGENDA)));
  const col = v => Number.isInteger(v) && v >= 0 && v < COLS;
  if (typeof d.m !== 'string' || d.m.length !== 36 || [...d.m].some(ch => !letras.has(ch))) throw new Error('mapa');
  if (!Array.isArray(d.s) || !d.s.length || d.s.length > 2 || !d.s.every(col)) throw new Error('bolas');
  if (!col(d.c) || ![1, 2, 3].includes(d.l) || d.c + d.l > COLS) throw new Error('cesta');
  const budget = {};
  for (const [p, q] of Object.entries(d.b || {})) {
    if (!GADGET_DEFS[p] || !ORDEM_BANDEJA.includes(p) || !Number.isInteger(q) || q < 1 || q > 3) throw new Error('peças');
    budget[p] = q;
  }
  let sol = null;
  if (Array.isArray(d.o) && d.o.every(x => Array.isArray(x) && budget[x[0]] && celulaValida(x[1], x[2]))) sol = d.o;
  const texto = v => (typeof v === 'string' ? v : '').slice(0, 30);
  return {
    nome: texto(d.n) || 'Desafio', autor: texto(d.a), nota: 'cesta', budget, bolas: d.s, basketCol: d.c, basketLarg: d.l,
    mapa: d.m.match(/.{6}/g), sol, semente: 1, mundo: MUNDO_DESAFIO, tipo: 'desafio', melhor: 0,
  };
}

function abrirCompartilhar() {
  if (!editor.aprovado) { aviso('▶ Primeiro passe na sua fase!'); return; }
  document.getElementById('nomeFase').value = editor.nome || '';
  document.getElementById('nomeAutor').value = state.save.autor || '';
  document.getElementById('linkFase').value = '';
  document.getElementById('modalCompartilhar').classList.add('ativa');
}

async function mandarDesafio() {
  const nome = document.getElementById('nomeFase').value.trim() || 'Minha Fase';
  const autor = document.getElementById('nomeAutor').value.trim();
  editor.nome = nome; state.save.autor = autor; salvarRascunho();
  const url = location.origin + location.pathname + '#f=' + codigoDoEditor(nome, autor);
  const campo = document.getElementById('linkFase');
  campo.value = url;
  const texto = `${autor ? autor + ' te desafiou' : 'Te desafio'}: passe na fase "${nome}" do Caos do Robô! 🤖`;
  try {
    if (navigator.share) { await navigator.share({ title: 'Caos do Robô', text: texto, url }); return; }
  } catch (e) { /* cancelou ou não deu: mostra o link pra copiar */ }
  const botao = document.getElementById('btnMandar');
  try { await navigator.clipboard.writeText(url); botao.textContent = '✅ Copiado! Cole numa mensagem'; }
  catch (e) { campo.select(); botao.textContent = '👆 Copie o link acima'; }
  setTimeout(() => { botao.textContent = '🔗 Mandar'; }, 2500);
}

function abrirDesafioDoLink() {
  const m = location.hash.match(/^#f=([A-Za-z0-9_-]+)$/);
  if (!m) return false;
  history.replaceState(null, '', location.pathname + location.search);
  try {
    const f = faseDoCodigo(m[1]);
    f.nome = f.autor ? `${f.autor}: ${f.nome}` : f.nome;
    jogarFase(f, 'tela-inicio');
    aviso(f.autor ? `🎁 Desafio de ${f.autor}!` : '🎁 Desafio!');
  } catch (e) {
    alert('Esse link de fase está quebrado 😕');
  }
  return true;
}

/* ================================== INIT ==================================== */
function initModos() {
  const ouvir = (id, fn) => document.getElementById(id).addEventListener('pointerup', fn);
  ouvir('btnInfinito', () => { renderInfinito(); trocarTela('tela-infinito'); });
  ouvir('btnCriar', abrirEditor);
  ouvir('btnDia', jogarDiario);
  for (const dif of ['facil', 'medio', 'insano']) ouvir('btnInf_' + dif, () => jogarInfinito(dif));
  ouvir('btnPular', pularFase);
  ouvir('btnCompartilhar', abrirCompartilhar);
  ouvir('btnMandar', mandarDesafio);
  ouvir('btnFecharCompartilhar', () => document.getElementById('modalCompartilhar').classList.remove('ativa'));
  ouvir('btnApagarEditor', limparEditor);
  // o selo do dia na tela inicial
  const e = estrelasDeHoje();
  document.getElementById('seloDia').classList.toggle('escondida', e > 0);
  abrirDesafioDoLink();
}
