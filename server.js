// carsimj — helyi hoszt-szerver
// Ezt futtatja a lobbyt nyitó játékos gépe. Nincs benne semmilyen külső/internetes
// szolgáltatás: a portnyitás megkísérlése (UPnP) kizárólag a SAJÁT routerével beszél
// helyi hálózaton, semmilyen 3. féltől semmit nem kérdez le.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const WebSocket = require('ws');

const PORT = parseInt(process.env.CARSIM_PORT || '47950', 10);

// A böngészőben megnyitandó játékfájl elérési útja — mindig a szerver (.exe) mellett kell lennie.
const GAME_HTML_CANDIDATES = [
  path.join(__dirname, 'car_sim_v3_2_fixed.html'),
  path.join(path.dirname(process.execPath), 'car_sim_v3_2_fixed.html'),
];
function findGameHtml() {
  for (const p of GAME_HTML_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const gameHtmlPath = findGameHtml();
if (!gameHtmlPath) {
  console.error('HIBA: nem található a car_sim_v3_2_fixed.html fájl a szerver mellett!');
  console.error('Tedd az .exe-t ugyanabba a mappába, mint a car_sim_v3_2_fixed.html fájlt.');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/?')) {
    fs.readFile(gameHtmlPath, (err, data) => {
      if (err) { res.writeHead(500); res.end('Nem sikerült betölteni a játékfájlt.'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

const wss = new WebSocket.Server({ server, path: '/ws' });

let hostWs = null;
let joinerIdCounter = 1;
const joiners = new Map(); // id -> ws

function send(ws, obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}
function broadcastToJoiners(obj) {
  for (const ws of joiners.values()) send(ws, obj);
}

let netInfo = { ip: null, port: PORT, upnp: false };

wss.on('connection', (ws) => {
  ws.role = null;
  ws.id = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }

    if (msg.type === 'hello') {
      if (msg.role === 'host') {
        hostWs = ws;
        ws.role = 'host';
        send(ws, { type: 'net_info', ip: netInfo.ip, port: netInfo.port, upnp: netInfo.upnp });
      } else {
        ws.role = 'joiner';
        ws.id = 'j' + (joinerIdCounter++);
        joiners.set(ws.id, ws);
        send(ws, { type: 'joined', id: ws.id });
        send(hostWs, { type: 'joiner_joined', id: ws.id });
      }
      return;
    }

    if (ws.role === 'joiner' && msg.type === 'state') {
      send(hostWs, { ...msg, type: 'joiner_state', id: ws.id });
      return;
    }

    if (ws.role === 'host' && msg.type === 'world') {
      broadcastToJoiners({ ...msg, type: 'world' });
      return;
    }

    if (ws.role === 'host' && msg.type === 'start') {
      broadcastToJoiners({ ...msg, type: 'start' });
      return;
    }
  });

  ws.on('close', () => {
    if (ws.role === 'host' && hostWs === ws) {
      hostWs = null;
      broadcastToJoiners({ type: 'host_left' });
    } else if (ws.role === 'joiner') {
      joiners.delete(ws.id);
      send(hostWs, { type: 'joiner_left', id: ws.id });
    }
  });
});

function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  if (platform === 'win32') cmd = `start "" "${url}"`;
  else if (platform === 'darwin') cmd = `open "${url}"`;
  else cmd = `xdg-open "${url}"`;
  exec(cmd, () => {});
}

function tryUpnp(cb) {
  let client;
  try {
    client = require('nat-upnp').createClient();
  } catch (e) {
    cb(false, null);
    return;
  }
  let done = false;
  const timeout = setTimeout(() => { if (!done) { done = true; cb(false, null); } }, 6000);
  client.externalIp((err, ip) => {
    if (err || !ip) { if (!done) { done = true; clearTimeout(timeout); cb(false, null); } return; }
    client.portMapping({ public: PORT, private: PORT, ttl: 0 }, (mapErr) => {
      if (done) return;
      done = true; clearTimeout(timeout);
      cb(!mapErr, ip);
    });
  });
}

server.listen(PORT, () => {
  console.log('===============================================');
  console.log(' carsimj helyi szerver elindult!');
  console.log(' Port: ' + PORT);
  console.log(' A böngésző mindjárt megnyílik...');
  console.log('===============================================');
  openBrowser('http://localhost:' + PORT + '/?host=1');

  console.log('Automatikus port-megnyitás (UPnP) megkísérlése...');
  tryUpnp((ok, ip) => {
    netInfo.upnp = ok;
    netInfo.ip = ip;
    if (ok) {
      console.log('✓ UPnP sikeres! Publikus IP: ' + ip + '  Port: ' + PORT);
      console.log('A megosztható link: http://' + ip + ':' + PORT + '/');
    } else {
      console.log('⚠ Az UPnP nem sikerült. Ha azt szeretnéd, hogy az interneten bárki csatlakozhasson,');
      console.log('  állíts be port-továbbítást a routereden erre a portra: ' + PORT + ' (TCP)');
      console.log('  A publikus IP-det megnézheted a router admin felületén, vagy egy IP-kereső oldalon.');
    }
    if (hostWs) send(hostWs, { type: 'net_info', ip: netInfo.ip, port: netInfo.port, upnp: netInfo.upnp });
  });
});
