#!/usr/bin/env node
'use strict';
/* Confere as fases simulando a física de verdade (sem tela):
     - sem nenhuma peça a fase NÃO pode passar;
     - a solução `sol` (usada pela dica 💡) tem que passar.
   Com --buscar, testa todas as montagens possíveis e conta quantas dão
   1, 2 e 3 estrelas — ajuda a calibrar a dificuldade.

   Uso:  node tools/verificar-fases.js [--buscar] [índices das fases...]   */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const codigo = ['niveis.js', 'game.js'].map(f => fs.readFileSync(path.join(raiz, f), 'utf8')).join('\n') +
  '\nglobalThis.__jogo = { state, NIVEIS, carregarNivel, tentarColocar, comecarRodada, passoFisica, podeColocar, PASSO, COLS, ROWS };';
(0, eval)(codigo); // roda no contexto principal: bem mais rápido que vm
const J = globalThis.__jogo;
J.state.headless = true;

function simular(i, pecas) {
  J.carregarNivel(i);
  for (const [tipo, row, col] of pecas) {
    if (!J.tentarColocar(tipo, row, col)) return { invalida: true, estrelas: -1 };
  }
  J.comecarRodada();
  let passos = 0;
  while (J.state.rodada && J.state.rodada.ativa && passos < 20 / J.PASSO) { J.passoFisica(J.PASSO); passos++; }
  return J.state.ultimoResultado;
}

function* montagens(pecas, celulas) {
  const n = pecas.length;
  const escolha = new Array(n).fill(null);
  function* rec(k, ocupadas) {
    if (k === n) { yield escolha.map((c, j) => c === null ? null : [pecas[j], celulas[c][0], celulas[c][1]]).filter(Boolean); return; }
    const igualAnterior = k > 0 && pecas[k - 1] === pecas[k];
    escolha[k] = null;
    yield* rec(k + 1, ocupadas);
    if (igualAnterior && escolha[k - 1] === null) return; // peças iguais: evita repetir a mesma montagem
    const inicio = igualAnterior ? escolha[k - 1] + 1 : 0;
    for (let c = inicio; c < celulas.length; c++) {
      if (ocupadas.has(c)) continue;
      escolha[k] = c; ocupadas.add(c);
      yield* rec(k + 1, ocupadas);
      ocupadas.delete(c); escolha[k] = null;
    }
  }
  yield* rec(0, new Set());
}

function* amostra(pecas, celulas, n) {
  for (let k = 0; k < n; k++) {
    const livres = celulas.slice();
    const m = [];
    for (const tipo of pecas) {
      if (Math.random() < 0.15) continue;
      const [c] = livres.splice(Math.floor(Math.random() * livres.length), 1);
      m.push([tipo, c[0], c[1]]);
    }
    yield m;
  }
}

function buscar(i) {
  J.carregarNivel(i);
  const celulas = [];
  for (let row = 1; row <= J.ROWS - 2; row++) for (let col = 0; col < J.COLS; col++) if (J.podeColocar(row, col)) celulas.push([row, col]);
  const pecas = [];
  for (const [tipo, qtd] of Object.entries(J.NIVEIS[i].budget)) for (let k = 0; k < qtd; k++) pecas.push(tipo);
  const contagem = [0, 0, 0, 0];
  let melhor = null;
  // espaço grande demais: testa uma amostra aleatória
  const estimativa = Math.pow(celulas.length + 1, pecas.length);
  const fonte = estimativa > 150000 ? amostra(pecas, celulas, 60000) : montagens(pecas, celulas);
  for (const m of fonte) {
    const r = simular(i, m);
    if (r.estrelas < 0) continue;
    contagem[r.estrelas]++;
    if (r.estrelas > 0 && (!melhor || r.estrelas > melhor.estrelas || (r.estrelas === melhor.estrelas && m.length < melhor.m.length))) melhor = { estrelas: r.estrelas, m };
  }
  return { contagem, melhor };
}

const args = process.argv.slice(2);
const comBusca = args.includes('--buscar');
const indices = args.filter(a => /^\d+$/.test(a)).map(Number);
const lista = indices.length ? indices : J.NIVEIS.map((_, i) => i);

let falhas = 0;
for (const i of lista) {
  const niv = J.NIVEIS[i];
  const rotulo = `${String(i).padStart(2)} ${niv.mundo.emoji} ${niv.indiceNoMundo + 1} ${niv.nome}`.padEnd(34);
  const vazio = simular(i, []).estrelas;
  let linha = `${rotulo} vazio:${vazio}★`;
  let ok = vazio === 0;
  if (niv.sol) {
    const r = simular(i, niv.sol);
    linha += `  sol:${r.estrelas}★`;
    if (!(r.estrelas > 0)) ok = false;
  } else if (niv.mundo.id !== 'oficina') { linha += '  sol:FALTA'; ok = false; }
  if (comBusca) {
    const t0 = Date.now();
    const { contagem, melhor } = buscar(i);
    const total = contagem.reduce((a, b) => a + b, 0);
    linha += `  busca[${total}] 1★:${contagem[1]} 2★:${contagem[2]} 3★:${contagem[3]}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`;
    if (melhor) linha += `\n      melhor ${melhor.estrelas}★: ${JSON.stringify(melhor.m)}`;
  }
  if (!ok) { falhas++; linha += '   ❌'; }
  console.log(linha);
}
if (falhas) { console.log(`\n${falhas} fase(s) com problema`); process.exit(1); }
console.log('\nTodas as fases OK');
