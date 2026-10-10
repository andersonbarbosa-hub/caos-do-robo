#!/usr/bin/env node
'use strict';
/* Gera o banco de fases da Fase Infinita e da Fase do Dia.

   Para cada candidata: sorteia um mapa, testa (simulando a física) todas as
   montagens possíveis com as peças da fase, e coloca 2 estrelas em casas por
   onde só um caminho raro passa. Só entra no banco a fase que:
     - não passa sem peças;
     - passa com um número de montagens dentro da faixa da dificuldade;
     - tem 3★ possível, mas rara.

   Uso:
     node tools/gerar-fases.js <dificuldade> <quantidade> <semente> <saida.json>
     node tools/gerar-fases.js --juntar <partes.json...>   # escreve fases-geradas.js

   O sorteio usa semente: a mesma linha de comando gera sempre as mesmas fases. */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
(0, eval)(['niveis.js', 'game.js'].map(f => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n') +
  '\nglobalThis.__jogo = { state, carregarFase, tentarColocar, comecarRodada, passoFisica, podeColocar, criarRng, PASSO };');
const J = globalThis.__jogo;
J.state.headless = true;

const BASICAS = [['rampaD', 'rampaE'], ['rampaE', 'mola'], ['rampaD', 'mola'], ['rampaD', 'ventilador'], ['rampaE', 'ventilador']];
const MEDIAS = BASICAS.concat([['esteiraD', 'rampaE'], ['esteiraE', 'rampaD'], ['rebatedor', 'rampaD'], ['rebatedor', 'rampaE'], ['mola', 'rebatedor']]);
const DIFICEIS = MEDIAS.concat([['portalA', 'portalB'], ['buraconegro', 'rampaE'], ['giro', 'rampaD'], ['ima', 'rampaE']]);

const DIFICULDADES = {
  facil:  { pecas: BASICAS,  fixos: { '#': [2, 4] }, extras: [0, 0], lava: [0, 0], proibidas: [0, 0], porta: 0, duasBolas: 0, larg: [1, 2], passa: [20, 250], tres: [2, 10], alvoTres: 4 },
  medio:  { pecas: MEDIAS,   fixos: { '#': [1, 3] }, extras: [0, 1], lava: [1, 4], proibidas: [0, 2], porta: 0.1, duasBolas: 0.12, larg: [1, 1], passa: [8, 60], tres: [1, 4], alvoTres: 2 },
  insano: { pecas: DIFICEIS, fixos: { '#': [1, 3] }, extras: [0, 2], lava: [3, 7], proibidas: [0, 4], porta: 0.3, duasBolas: 0.15, larg: [1, 1], passa: [2, 14], tres: [1, 2], alvoTres: 1 },
  diario: { pecas: MEDIAS,   fixos: { '#': [1, 3] }, extras: [0, 1], lava: [1, 5], proibidas: [0, 2], porta: 0.2, duasBolas: 0.15, larg: [1, 1], passa: [5, 40], tres: [1, 3], alvoTres: 2 },
};
const EXTRAS = ['>', '<', 'b', 'm', 'f', 'g'];
const MUNDO_TESTE = { id: 'gerador', emoji: '🎲', fundo: '#000' };

function simular(fase, pecas, visitadas) {
  J.carregarFase(fase);
  for (const [tipo, row, col] of pecas) if (!J.tentarColocar(tipo, row, col)) return -1;
  J.comecarRodada();
  let n = 0;
  while (J.state.rodada && J.state.rodada.ativa && n < 20 / J.PASSO) {
    J.passoFisica(J.PASSO); n++;
    if (visitadas) {
      for (const b of J.state.bolas) {
        const r = Math.floor(b.y / 120), c = Math.floor(b.x / 120);
        // só conta a casa se a bola passou perto o bastante do centro pra pegar uma estrela
        if (r >= 1 && r <= 6 && c >= 0 && c < 6 && Math.hypot(b.x - (c * 120 + 60), b.y - (r * 120 + 60)) < 50) visitadas.add(r * 6 + c);
      }
    }
  }
  return J.state.ultimoResultado.estrelas;
}

function montagens(fase) {
  J.carregarFase(fase);
  const celulas = [];
  for (let r = 1; r <= 6; r++) for (let c = 0; c < 6; c++) if (J.podeColocar(r, c)) celulas.push([r, c]);
  const pecas = [];
  for (const [tipo, q] of Object.entries(fase.budget)) for (let k = 0; k < q; k++) pecas.push(tipo);
  const lista = [];
  const escolha = new Array(pecas.length).fill(null);
  (function rec(k, ocupadas) {
    if (k === pecas.length) { lista.push(escolha.map((c, j) => c === null ? null : [pecas[j], celulas[c][0], celulas[c][1]]).filter(Boolean)); return; }
    const igual = k > 0 && pecas[k - 1] === pecas[k];
    escolha[k] = null; rec(k + 1, ocupadas);
    if (igual && escolha[k - 1] === null) return;
    for (let c = igual ? escolha[k - 1] + 1 : 0; c < celulas.length; c++) {
      if (ocupadas.has(c)) continue;
      escolha[k] = c; ocupadas.add(c); rec(k + 1, ocupadas); ocupadas.delete(c); escolha[k] = null;
    }
  })(0, new Set());
  return lista;
}

function faseDe(mapa, cfg) {
  const f = { nome: 'gerada', nota: 'cesta', budget: cfg.budget, basketCol: cfg.cesta, basketLarg: cfg.larg, mapa: mapa.map(l => l.join('')), semente: 1, mundo: MUNDO_TESTE };
  if (cfg.bolas) f.bolas = cfg.bolas; else f.startCol = cfg.start;
  return f;
}

function candidata(rng, d) {
  const int = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const esc = arr => arr[Math.floor(rng() * arr.length)];
  const mapa = Array.from({ length: 6 }, () => Array(6).fill('.'));
  const vazias = () => { const v = []; mapa.forEach((l, r) => l.forEach((x, c) => { if (x === '.') v.push([r, c]); })); return v; };
  const espalhar = (ch, q, linhas) => {
    for (let k = 0; k < q; k++) {
      const v = vazias().filter(([r]) => !linhas || linhas.includes(r));
      if (!v.length) return;
      const [r, c] = v[Math.floor(rng() * v.length)]; mapa[r][c] = ch;
    }
  };
  const cfg = { budget: {}, larg: int(d.larg[0], d.larg[1]) };
  for (const p of esc(d.pecas)) cfg.budget[p] = (cfg.budget[p] || 0) + 1;
  cfg.cesta = int(0, 6 - cfg.larg);
  if (rng() < d.duasBolas) {
    cfg.larg = 2; cfg.cesta = int(0, 4);
    const a = int(0, 5); let b = int(0, 5); if (b === a) b = (a + 3) % 6;
    cfg.bolas = [Math.min(a, b), Math.max(a, b)];
  } else cfg.start = int(0, 5);
  if (rng() < d.porta) {
    // porta trancando a cesta e um botão escondido no mapa
    for (let c = Math.max(0, cfg.cesta - 1); c <= Math.min(5, cfg.cesta + cfg.larg); c++) mapa[5][c] = '=';
    espalhar('o', 1, [1, 2, 3, 4]);
  }
  for (const [ch, [a, b]] of Object.entries(d.fixos)) espalhar(ch, int(a, b));
  espalhar('~', int(d.lava[0], d.lava[1]), [1, 2, 3, 4, 5]);
  espalhar('x', int(d.proibidas[0], d.proibidas[1]));
  for (let k = int(d.extras[0], d.extras[1]); k > 0; k--) espalhar(esc(EXTRAS), 1);
  return { mapa, cfg };
}

function avaliar(rng, d) {
  const { mapa, cfg } = candidata(rng, d);
  const base = faseDe(mapa, cfg);
  if (simular(base, []) !== 0) return null;
  const passam = [];
  for (const m of montagens(base)) {
    const vis = new Set();
    if (simular(base, m, vis) > 0) passam.push({ m, vis });
    if (passam.length > d.passa[1] * 1.5) return null; // fácil demais
  }
  if (passam.length < d.passa[0]) return null;

  // escolhe 2 casas pras estrelas: poucas montagens pegam as duas
  const livres = [];
  mapa.forEach((l, r) => l.forEach((x, c) => { if (x === '.') livres.push((r + 1) * 6 + c); }));
  let melhor = null;
  for (let i = 0; i < livres.length; i++) for (let j = i + 1; j < livres.length; j++) {
    const s1 = livres[i], s2 = livres[j];
    const ok = passam.filter(p => !p.m.some(([, r, c]) => r * 6 + c === s1 || r * 6 + c === s2));
    const ambas = ok.filter(p => p.vis.has(s1) && p.vis.has(s2));
    if (!ambas.length) continue;
    const uma = ok.filter(p => p.vis.has(s1) !== p.vis.has(s2)).length;
    const nota = Math.abs(ambas.length - d.alvoTres) * 10 + Math.abs(uma - ok.length * 0.3) * 0.2 + rng() * 0.01;
    if (!melhor || nota < melhor.nota) melhor = { nota, s1, s2, sol: ambas[0].m };
  }
  if (!melhor) return null;
  for (const s of [melhor.s1, melhor.s2]) mapa[Math.floor(s / 6) - 1][s % 6] = '*';
  const fase = faseDe(mapa, cfg);

  // confere de novo com as estrelas no mapa
  const cont = [0, 0, 0, 0];
  for (const m of montagens(fase)) { const e = simular(fase, m); if (e >= 0) cont[e]++; }
  const passa = cont[1] + cont[2] + cont[3];
  if (passa < d.passa[0] || passa > d.passa[1] || cont[3] < d.tres[0] || cont[3] > d.tres[1]) return null;
  if (simular(fase, melhor.sol) !== 3) return null;
  return {
    b: cfg.budget, c: cfg.cesta, l: cfg.larg, ...(cfg.bolas ? { s: cfg.bolas } : { s: cfg.start }),
    m: fase.mapa.join(''), o: melhor.sol,
  };
}

const args = process.argv.slice(2);
if (args[0] === '--juntar') {
  const banco = {};
  for (const arq of args.slice(1)) {
    const { dificuldade, fases } = JSON.parse(fs.readFileSync(arq, 'utf8'));
    banco[dificuldade] = (banco[dificuldade] || []).concat(fases);
  }
  const linhas = Object.entries(banco).map(([d, fases]) => `  ${d}: [\n${fases.map(f => '    ' + JSON.stringify(f)).join(',\n')},\n  ],`);
  const cab = '\'use strict\';\n/* Banco de fases geradas por tools/gerar-fases.js — não editar à mão.\n' +
    '   b: peças · s: coluna(s) da bola · c: coluna da cesta · l: largura da cesta\n' +
    '   m: mapa (6×6, mesma legenda de niveis.js) · o: solução 3★ (dica) */\n';
  fs.writeFileSync(path.join(raiz, 'fases-geradas.js'), cab + 'const BANCO_FASES = {\n' + linhas.join('\n') + '\n};\n');
  console.log(Object.entries(banco).map(([d, f]) => `${d}: ${f.length}`).join(' · '));
} else {
  const [dificuldade, qtd, semente, saida] = args;
  const d = DIFICULDADES[dificuldade];
  const rng = J.criarRng(Number(semente));
  const fases = [];
  let tentativas = 0;
  const t0 = Date.now();
  while (fases.length < Number(qtd)) {
    tentativas++;
    const f = avaliar(rng, d);
    if (f) {
      fases.push(f);
      fs.writeFileSync(saida, JSON.stringify({ dificuldade, fases }));
      console.log(`${dificuldade}: ${fases.length}/${qtd} (${tentativas} tentativas, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  }
}
