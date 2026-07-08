# carsimj — Multiplayer helyi szerver

Ez a mappa a **hoszt gépén futó** szervert tartalmazza. Ez teszi lehetővé, hogy
a te géped legyen a "szerver", és egy linkkel csatlakozhasson hozzád a másik
játékos — külső szolgáltatás, regisztráció, felhő, semmi ilyen nincs benne.

## Hogyan működik

- Amikor elindítod az `.exe`-t (vagy a `node server.js`-t), az elindul a
  gépeden egy pici szerver, ami:
  1. Kiszolgálja magát a játékot (a `car_sim_v3_2_fixed.html` fájlt)
  2. Megpróbálja automatikusan megnyitni a routeredet (UPnP), hogy kívülről
     is elérhető legyél
  3. Megnyitja a böngésződet a játékkal, mint **host**
- A Multiplayer fülön megjelenik egy link (`http://a-te-publikus-IP-d:47950/`)
  — ezt küldd el a barátodnak
- A barátod **csak rákattint a linkre**, nincs telepítés, nincs kód

## Fontos: az .exe-nek és a HTML-nek EGYÜTT kell lennie!

A szerver a **saját mappájában** keresi a `car_sim_v3_2_fixed.html` fájlt.
Mindig tedd egy mappába az `.exe`-t (vagy a `server.js`-t) és a
`car_sim_v3_2_fixed.html` fájlt.

## Ha az automatikus port-nyitás (UPnP) nem sikerül

Sok router támogatja, de nem mind (pl. néhány szolgáltatói router, vagy ha ki
van kapcsolva). Ha a program azt írja ki, hogy nem sikerült:

1. Nyisd meg a router admin felületét (általában `192.168.0.1` vagy
   `192.168.1.1` a böngészőben)
2. Keresd a "Port Forwarding" / "Port Forwarding" / "NAT" menüt
3. Nyiss egy szabályt: külső port `47950` → a géped helyi IP-je → belső port
   `47950` (TCP)
4. A publikus IP-det megnézheted pl. a router admin oldalán, vagy bármelyik
   "mi az IP-m" oldalon böngészőben, és ezt írd be a linkbe a program által
   mutatott helyett: `http://A-TE-PUBLIKUS-IP-D:47950/`

Ha ezt sem szeretnéd/tudod beállítani: a link **a saját helyi hálózatodon**
(pl. otthoni wifi) mindig működik automatikusan, csak az interneten kívülről
nem lesz elérhető port-továbbítás nélkül.

## Az .exe elkészítése — NEM kell hozzá Node.js a te gépeden!

Ebbe a mappába tettem egy `.github/workflows/build-exe.yml` fájlt. Ha ezt a
`mp-exe-server` mappát feltöltöd a GitHub repódba (ugyanoda, ahova az
`index.html`-t is teszed), a **GitHub automatikusan legyártja neked** az
`.exe`-t (és a mac/Linux verziókat is) — neked semmit nem kell telepítened.

Lépések:
1. Töltsd fel a `mp-exe-server` mappa teljes tartalmát (a `.github` mappával
   együtt!) a GitHub repódba
2. Menj a repo **"Actions"** fülére — ott fut/lefutott a "Build carsimj
   server exe" workflow (ha nem indult automatikusan, kattints rá és nyomd
   meg a "Run workflow" gombot)
3. Ha lefutott (zöld pipa), kattints bele a futásba, és az alján, a
   **"Artifacts"** részben találod a **`carsimj-server-binaries`** letöltést
   — ez egy zip, benne a Windows `.exe`, a macOS és a Linux verzióval
4. Csomagold ki, tedd a `car_sim_v3_2_fixed.html` mellé, és onnantól dupla
   kattintással indítható

## Alternatíva: saját gépen buildelés (ha mégis van Node.js-ed)

```
npm install
npm run build-win
```

Ez létrehozza a `dist/carsimj-server-win.exe` fájlt. Ehhez kell, hogy legyen
telepítve a [Node.js](https://nodejs.org) (LTS verzió, 18-as vagy újabb) a
gépeden — csak a buildeléshez, magának az `.exe`-nek futtatásához a
végfelhasználónak (neked, mikor lobbyt nyitsz) **már nem kell semmi mást
telepítenie**, az `.exe` önmagában fut.

macOS / Linux verzióhoz:
```
npm run build-mac
npm run build-linux
```

Vagy mindhárom egyszerre:
```
npm run build-all
```

## Futtatás Node.js-ből (build nélkül, tesztelésre)

```
npm install
npm start
```

## Offline mód

Ha valaki csak simán megnyitja a `car_sim_v3_2_fixed.html` fájlt a
böngészőjében (dupla katt, szerver nélkül), a játék **teljes egészében
működik** — időmérő, bot verseny, minden — csak a Multiplayer fülön egy
üzenet jelzi, hogy ahhoz az `.exe`-t kell elindítani.
