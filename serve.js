'use strict';
/* Servidor estático minúsculo, sem dependências, só para rodar o jogo
 * "Caos do Robô" na rede Wi-Fi local e abrir no navegador do tablet. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 4000;
const RAIZ = __dirname;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

const servidor = http.createServer((req, res) => {
  let caminho = decodeURIComponent(req.url.split('?')[0]);
  if (caminho === '/') caminho = '/index.html';
  const arquivo = path.join(RAIZ, caminho);

  if (!arquivo.startsWith(RAIZ)) { res.writeHead(403); res.end('Proibido'); return; }

  fs.readFile(arquivo, (err, dados) => {
    if (err) { res.writeHead(404); res.end('Não encontrado'); return; }
    const ext = path.extname(arquivo);
    res.writeHead(200, { 'Content-Type': TIPOS[ext] || 'application/octet-stream' });
    res.end(dados);
  });
});

function enderecosLAN() {
  const interfaces = os.networkInterfaces();
  const enderecos = [];
  for (const nome of Object.keys(interfaces)) {
    for (const info of interfaces[nome]) {
      if (info.family === 'IPv4' && !info.internal) enderecos.push(info.address);
    }
  }
  return enderecos;
}

servidor.listen(PORT, () => {
  console.log('\n🤖 Caos do Robô no ar!\n');
  console.log(`   Neste computador: http://localhost:${PORT}`);
  enderecosLAN().forEach(ip => console.log(`   No tablet (mesma Wi-Fi): http://${ip}:${PORT}`));
  console.log('\n   Abra o endereço "No tablet" no navegador do Samsung. Ctrl+C para parar.\n');
});
