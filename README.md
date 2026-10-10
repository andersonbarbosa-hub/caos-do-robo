# 🤖 Caos do Robô

Um jogo de construção e física para tablet — arraste peças malucas (rampas,
mola, ventilador, ímã, portais, um giro doidão, bomba de confete, buraco
negro, esteiras, rebatedor, blocos e lava), aperte **▶ TESTAR** e solte a bola. A física acontece na hora: sem
baixar app, sem cadastro, sem esperar nada carregar.

## ▶️ Jogar agora

**https://andersonbarbosa-hub.github.io/caos-do-robo/**

Abra esse endereço no navegador do tablet (Chrome ou Internet Samsung) e
toque em "Adicionar à tela inicial" pra ficar com ícone próprio, como um
app instalado.

## O que tem

- **🧩 Missões em 3 mundos** (28 fases):
  - **🔧 Oficina**: as 8 fases de aprender as peças. A nota é pela pontaria no alvo.
  - **🏭 Fábrica** (abre com 12 ⭐): blocos fixos, casas proibidas, esteiras,
    rebatedores, portais e fases com duas bolas.
  - **🌋 Vulcão** (abre com 30 ⭐): lava que queima a bola, botão que abre
    portas e a Erupção Final.
  - Nos mundos novos, cair na cesta vale 1 ⭐, e cada ⭐ pega no caminho vale mais uma.
  - Só passa pra próxima fase com pelo menos 1 ⭐. Moedas só quando bate o próprio recorde.
  - A física é sempre igual: a mesma montagem dá sempre o mesmo resultado.
  - **💡 Dica**: mostra onde vai uma peça. A primeira dica de cada fase é grátis, as outras custam 5 🪙.
  - Errou? Aparece um aviso rápido e já dá pra tentar de novo. ⏹ Parar interrompe a jogada.
  - **🏆 Troféus**: 3 ⭐ em todas as fases de um mundo dá um troféu, 50 🪙 e
    uma bola exclusiva na loja. Os três troféus liberam o robô 🤴 Rei do Caos.
- **🎲 Fase Infinita**: centenas de fases geradas e testadas por computador, em
  🟢 Fácil, 🟡 Médio e 🔴 Insano. Dá pra pular uma fase difícil.
- **📅 Fase do Dia**: uma fase nova por dia (a mesma pra todo mundo) e uma
  sequência 🔥 de dias seguidos.
- **🛠️ Criar Fase**: monte o mapa, escolha as peças de quem vai jogar, passe
  na sua própria fase pra provar que dá e mande o link de desafio. Quem abre
  o link cai direto na fase.
- **🎉 Modo Caos Livre**: sem regras, peças ilimitadas (as peças novas são liberadas
  nas missões), 🚀 Canhão de bolinhas, 🙃 Virar a gravidade, 💥 CAOS TOTAL e um
  placar de bolas na cesta.
- **🎩 Loja do Robô**: gasta as moedas em visuais do robô e da bola (cosmético,
  sem compras reais).

O progresso fica salvo no navegador de quem está jogando (`localStorage`) —
não é compartilhado entre aparelhos.

## Criar ou mudar fases

As fases ficam em `niveis.js`, desenhadas como texto (a legenda está no topo do
arquivo). Depois de mexer, confira:

```bash
node tools/verificar-fases.js            # nenhuma fase passa sem peças, toda dica funciona
node tools/verificar-fases.js --buscar 8 # testa todas as montagens e conta as soluções
```

O deploy roda essa verificação antes de publicar (inclui o banco da Fase Infinita).

As fases da Fase Infinita e da Fase do Dia ficam em `fases-geradas.js`, criado pelo
gerador (pode demorar alguns minutos por dificuldade):

```bash
node tools/gerar-fases.js medio 150 22 medio.json   # dificuldade, quantidade, semente, saída
node tools/gerar-fases.js --juntar facil.json medio.json insano.json diario.json
```

## Rodar localmente (opcional)

Não precisa de nada disso pra jogar — o link do GitHub Pages já funciona em
qualquer lugar. Isso aqui é só se você quiser rodar numa rede local sem
internet:

```bash
node serve.js
```

O terminal mostra o endereço da rede Wi-Fi pra abrir no tablet.

## Estrutura

```
index.html   # telas (início, fases, loja, jogo)
style.css    # visual grande e colorido, pensado pra dedo, não mouse
niveis.js    # mundos e fases
fases-geradas.js  # banco da Fase Infinita e da Fase do Dia (gerado)
game.js      # física, peças, missões, progressão — sem libs externas
modos.js     # Fase Infinita, Fase do Dia, Criar Fase e desafio por link
tools/verificar-fases.js  # simula as fases sem tela pra conferir se dá pra passar
tools/gerar-fases.js      # gera fases novas e testa cada uma antes de aceitar
serve.js     # servidor estático opcional, sem dependências, uso local
```
