'use strict';
/* =========================================================================
   FASES DO CAOS DO ROBÔ
   Cada mundo tem uma lista de fases. Os mapas têm 6 linhas × 6 colunas
   (as linhas do meio do tabuleiro; a de cima é o lançador e a de baixo a cesta).

   Legenda dos mapas:
     .  livre             x  proibido colocar peça
     *  estrela pra pegar #  bloco fixo
     D  rampa ↘ fixa      E  rampa ↙ fixa
     ^  mola fixa         b  rebatedor fixo
     >  esteira →         <  esteira ←
     f  ventilador fixo   m  ímã fixo
     g  giro fixo         n  buraco negro fixo
     1  portal azul fixo  2  portal laranja fixo
     ~  lava              c  bomba de confete fixa
     o  botão             =  porta (abre quando a bola aperta o botão)

   Nota 'aneis': estrelas pela distância do centro do alvo (Mundo 1).
   Nota 'cesta' (padrão): cair na cesta = 1★, cada ⭐ do mapa pega = +1★.
   sol: uma solução testada — usada pelo botão de dica 💡.
   semente: sorteio fixo da física (ex.: pra onde a bomba de confete joga a bola).
   Para conferir as fases depois de mexer: node tools/verificar-fases.js
   ========================================================================= */

const MUNDOS = [
  {
    id: 'oficina', nome: 'Oficina', emoji: '🔧', cor: '#ffcc33', fundo: '#120a26', precisa: 0,
    fases: [
      { nome: 'Primeiro Tombo', nota: 'aneis', budget: { rampaD: 1, rampaE: 1 }, startCol: 4, basketCol: 1, sol: [['rampaE', 4, 4]] },
      { nome: 'Salto Alto', nota: 'aneis', budget: { rampaD: 1, rampaE: 1, mola: 1 }, startCol: 0, basketCol: 3, sol: [['rampaD', 3, 0], ['mola', 4, 1]] },
      { nome: 'Vento a Favor', nota: 'aneis', budget: { rampaD: 1, rampaE: 1, ventilador: 1 }, startCol: 5, basketCol: 0, desbloqueia: 'ima', sol: [['rampaE', 1, 5], ['ventilador', 2, 4]] },
      { nome: 'Puxão Magnético', nota: 'aneis', budget: { rampaE: 1, mola: 1, ima: 1 }, startCol: 1, basketCol: 3, desbloqueia: 'portal', sol: [['mola', 2, 1], ['ima', 1, 3]] },
      { nome: 'Teletransporte!', nota: 'aneis', budget: { portalA: 1, portalB: 1, rampaD: 1 }, startCol: 0, basketCol: 3, desbloqueia: 'giro', sol: [['portalA', 1, 0], ['portalB', 1, 4]] },
      { nome: 'Roda Louca', nota: 'aneis', budget: { rampaD: 1, rampaE: 1, giro: 1 }, startCol: 3, basketCol: 0, desbloqueia: 'confete', sol: [['rampaE', 4, 3]] },
      { nome: 'Kaboom!', nota: 'aneis', semente: 7, budget: { rampaE: 1, confete: 1, ima: 1 }, startCol: 2, basketCol: 3, desbloqueia: 'buraconegro', sol: [['confete', 1, 2]] },
      { nome: 'Desafio Final', nota: 'aneis', budget: { rampaD: 1, rampaE: 1, mola: 1, giro: 1, buraconegro: 1 }, startCol: 0, basketCol: 2, desbloqueia: 'multiplicador', sol: [['giro', 1, 0]] },
    ],
  },
  {
    id: 'fabrica', nome: 'Fábrica', emoji: '🏭', cor: '#3db6ff', fundo: '#0d1a2b', precisa: 12,
    fases: [
      { nome: 'Muro de Tijolos', budget: { rampaD: 1, rampaE: 1 }, startCol: 2, basketCol: 0, basketLarg: 2, desbloqueia: 'bloco',
        mapa: ['......',
               '....*.',
               '.####.',
               '......',
               '......',
               '*.....'],
        sol: [['rampaD', 1, 2], ['rampaE', 2, 5]] },
      { nome: 'Esteira Rolante', budget: { esteiraD: 1, rampaE: 1 }, startCol: 2, basketCol: 4, desbloqueia: 'esteira',
        mapa: ['......',
               '.##..<',
               '.*....',
               '##*<#.',
               '......',
               '......'],
        sol: [['esteiraD', 5, 2], ['rampaE', 1, 2]] },
      { nome: 'Pinball', budget: { rebatedor: 1, rampaE: 1 }, startCol: 5, basketCol: 4, desbloqueia: 'rebatedor',
        mapa: ['......',
               '....*.',
               '.#b...',
               '.....*',
               '......',
               '...b.#'],
        sol: [['rebatedor', 5, 1], ['rampaE', 3, 5]] },
      { nome: 'Casas Proibidas', budget: { rampaE: 1, mola: 1 }, startCol: 2, basketCol: 1,
        mapa: ['*x..x.',
               '....xx',
               '.x..x.',
               '.*x...',
               'xx.x..',
               '....x.'],
        sol: [['rampaE', 1, 2], ['mola', 3, 0]] },
      { nome: 'Fábrica de Portais', budget: { rampaD: 1, rampaE: 1 }, startCol: 3, basketCol: 0,
        mapa: ['.2....',
               '.....#',
               '..##*.',
               '*...#.',
               '..#...',
               '.....1'],
        sol: [['rampaD', 1, 3], ['rampaE', 3, 1]] },
      { nome: 'Esteiras Malucas', budget: { rampaE: 1, rebatedor: 1 }, startCol: 1, basketCol: 2,
        mapa: ['..#..<',
               '......',
               '..#.#.',
               '*.....',
               '.>.##.',
               '..*...'],
        sol: [['rampaE', 1, 1], ['rebatedor', 5, 0]] },
      { nome: 'Ímã Teimoso', budget: { rampaD: 1, mola: 1 }, startCol: 1, basketCol: 0,
        mapa: ['.....#',
               '.....#',
               '..*.m.',
               '......',
               '......',
               '*.#...'],
        sol: [['rampaD', 2, 1], ['mola', 6, 4]] },
      { nome: 'Bolinhas Gêmeas', budget: { rampaD: 1, rampaE: 1 }, bolas: [1, 4], basketCol: 2, basketLarg: 2,
        mapa: ['......',
               '......',
               '...#..',
               '......',
               '.*..*.',
               '......'],
        sol: [['rampaD', 6, 1], ['rampaE', 6, 4]] },
      { nome: 'Corredor do Vento', budget: { ventilador: 1, rampaD: 1 }, startCol: 2, basketCol: 4,
        mapa: ['......',
               '......',
               '..#.#.',
               '...*..',
               '....*.',
               '......'],
        sol: [['ventilador', 6, 3], ['rampaD', 1, 2]] },
      { nome: 'Linha de Montagem', budget: { rampaD: 1, rampaE: 1, rebatedor: 1 }, startCol: 0, basketCol: 0,
        mapa: ['.>xx..',
               '*xx#xx',
               '.x#x<>',
               '.x<x..',
               '<.*#>x',
               'x<..##'],
        sol: [['rampaD', 3, 0], ['rampaE', 1, 4], ['rebatedor', 6, 2]] },
    ],
  },
  {
    id: 'vulcao', nome: 'Vulcão', emoji: '🌋', cor: '#ff6a1f', fundo: '#24090a', precisa: 30,
    fases: [
      { nome: 'Chão Quente', budget: { rampaD: 1, rampaE: 1 }, startCol: 2, basketCol: 3, desbloqueia: 'lava',
        mapa: ['......',
               '......',
               '......',
               '.~*...',
               '~~..~~',
               '...*..'],
        sol: [['rampaD', 3, 1], ['rampaE', 1, 2]] },
      { nome: 'Ponte de Esteira', budget: { esteiraD: 1, rampaE: 1 }, startCol: 0, basketCol: 3,
        mapa: ['.*....',
               '......',
               '~~*~~~',
               '......',
               '~.~.~~',
               '......'],
        sol: [['esteiraD', 1, 0]] },
      { nome: 'Rio de Lava', budget: { rebatedor: 1, rampaD: 1 }, startCol: 0, basketCol: 1,
        mapa: ['......',
               '..~~..',
               '..~...',
               '.*~...',
               '.*....',
               '......'],
        sol: [['rebatedor', 5, 2], ['rampaD', 3, 0]] },
      { nome: 'Mola Quente', budget: { mola: 1, rampaE: 1 }, startCol: 1, basketCol: 2,
        mapa: ['....~.',
               '...~..',
               '.#..#.',
               '...~~.',
               '*.*...',
               '#.....'],
        sol: [['mola', 5, 1], ['rampaE', 1, 1]] },
      { nome: 'Portais de Fogo', budget: { portalA: 1, portalB: 1 }, startCol: 3, basketCol: 1,
        mapa: ['.~~...',
               '.....~',
               '...*..',
               '.~~...',
               '...*~.',
               '....~.'],
        sol: [['portalA', 5, 1], ['portalB', 6, 3]] },
      { nome: 'Botão Secreto', budget: { rampaD: 1, rampaE: 1 }, startCol: 1, basketCol: 1,
        mapa: ['......',
               '*#....',
               '......',
               '.*....',
               '.o..#.',
               '======'],
        sol: [['rampaD', 3, 0], ['rampaE', 1, 1]] },
      { nome: 'Dupla no Vulcão', budget: { rampaD: 1, rampaE: 1 }, bolas: [0, 5], basketCol: 2, basketLarg: 2,
        mapa: ['...~..',
               '......',
               '......',
               '.~...~',
               '...*..',
               '.*..~.'],
        sol: [['rampaD', 5, 0], ['rampaE', 2, 5]] },
      { nome: 'Ímã Traiçoeiro', budget: { ventilador: 1, rampaD: 1 }, startCol: 2, basketCol: 5,
        mapa: ['.....m',
               '......',
               '~.....',
               '....~.',
               '..~*..',
               '.~..*.'],
        sol: [['ventilador', 6, 3], ['rampaD', 4, 2]] },
      { nome: 'Buraco Negro', budget: { buraconegro: 1, rampaE: 1 }, startCol: 5, basketCol: 3,
        mapa: ['.~....',
               '......',
               '...*..',
               '...*.~',
               '~.....',
               '~~....'],
        sol: [['buraconegro', 3, 5], ['rampaE', 1, 5]] },
      { nome: 'Erupção Final', budget: { rampaD: 1, rampaE: 1, rebatedor: 1 }, startCol: 4, basketCol: 3,
        mapa: ['.~....',
               '~...~.',
               '.~....',
               '#..**o',
               '......',
               '#~===='],
        sol: [['rampaD', 1, 2], ['rampaE', 1, 4], ['rebatedor', 4, 2]] },
    ],
  },
];

// lista única de fases; o índice global é a chave do progresso salvo
const NIVEIS = [];
for (const mundo of MUNDOS) {
  mundo.fases.forEach((fase, k) => {
    fase.mundo = mundo;
    fase.indiceNoMundo = k;
    fase.indice = NIVEIS.length;
    if (!fase.nota) fase.nota = 'cesta';
    if (fase.basketLarg === undefined) fase.basketLarg = fase.nota === 'aneis' ? 3 : 1;
    NIVEIS.push(fase);
  });
}
