# 🤖 Caos do Robô

Um jogo de construção e física para tablet — arraste peças malucas (rampas,
mola, ventilador, ímã, portais, um giro doidão, bomba de confete, buraco
negro), aperte **▶ TESTAR** e solte a bola. A física acontece na hora: sem
baixar app, sem cadastro, sem esperar nada carregar.

## ▶️ Jogar agora

**https://andersonbarbosa-hub.github.io/caos-do-robo/**

Abra esse endereço no navegador do tablet (Chrome ou Internet Samsung) e
toque em "Adicionar à tela inicial" pra ficar com ícone próprio, como um
app instalado.

## O que tem

- **🧩 Missões**: 8 fases curtas, cada uma com peças limitadas — um quebra-
  cabeça rápido. Completar uma fase desbloqueia uma peça nova e dá moedas 🪙.
- **🎉 Modo Caos Livre**: sem regras, peças ilimitadas, um Canhão de bolinhas
  automático e um botão **💥 CAOS TOTAL** pra explodir tudo em confete.
- **🎩 Loja do Robô**: gasta as moedas ganhas nas fases pra trocar o visual
  do robô mascote (cosmético, sem compras reais).

O progresso fica salvo no navegador de quem está jogando (`localStorage`) —
não é compartilhado entre aparelhos.

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
game.js      # física, peças, missões, progressão — sem libs externas
serve.js     # servidor estático opcional, sem dependências, uso local
```
