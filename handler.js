
const fs = require("fs");
const path = require("path");

// =====================
// DATABASE
// =====================
const DB_PATH = path.join(__dirname, "./db.json");

function loadDB() {
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, "{}");
    return JSON.parse(fs.readFileSync(DB_PATH));
}

function saveDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

let db = loadDB();

// =====================
// CONFIG
// =====================
const ADMIN = "628xxxxxxxx@s.whatsapp.net";
const WIN_RATE = 0.15;
const JACKPOT_RATE = 0.02;
const MIN_BET = 10;
const MAX_BET = 10000;

// =====================
const getUser = (msg) => msg.key.participant || msg.key.remoteJid;
const getText = (msg) =>
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text || "";

const isWin = () => Math.random() < WIN_RATE;
const isJackpot = () => Math.random() < JACKPOT_RATE;

// =====================
// INIT USER
// =====================
function initUser(user) {
    if (!db[user]) {
        db[user] = {
            saldo: 0,
            pending: 0,
            name: "player"
        };
    }
}

// =====================
// VALID BET
// =====================
function validBet(p, bet) {
    bet = Number(bet);
    if (isNaN(bet)) return false;
    if (bet < MIN_BET || bet > MAX_BET) return false;
    if (bet > p.saldo) return false;
    return true;
}

// =====================
// MAIN
// =====================
module.exports = async (sock, msg) => {

    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const user = getUser(msg);
    const body = getText(msg).toLowerCase().trim();
    const args = body.split(" ");
    const cmd = args[0];

    initUser(user);
    let p = db[user];

    // =====================
    // MENU
    // =====================
    if (cmd === "menu") {
        return sock.sendMessage(from, {
            text:
`🎰 CASINO BOT

💰 Saldo: ${p.saldo}

🎮 GAME:
slot <bet>
dadu <bet>
coin <bet>
tebak <bet> <1-5>

💳 SYSTEM:
deposit <nominal>
saldo
tf <nomor> <jumlah>
leaderboard`
        });
    }

    // =====================
    // DEPOSIT QRIS
    // =====================
    if (cmd === "deposit") {

        let nominal = Number(args[1]);

        if (!nominal || nominal < 10 || nominal > 10000) {
            return sock.sendMessage(from, {
                text: "❌ minimal 10 max 10.000"
            });
        }

        p.pending = nominal;
        saveDB(db);

        return sock.sendMessage(from, {
            text:
`💳 DEPOSIT REQUEST

Nominal: ${nominal}

📲 scan QRIS admin (simulasi)
tunggu admin acc`
        });
    }

    // =====================
    // ADMIN APPROVE
    // =====================
    if (cmd === "acc") {

        if (user !== ADMIN) return;

        let target = args[1] + "@s.whatsapp.net";

        if (!db[target]) return;

        db[target].saldo += db[target].pending;
        db[target].pending = 0;

        saveDB(db);

        return sock.sendMessage(from, {
            text: "✅ deposit berhasil"
        });
    }

    // =====================
    // SALDO
    // =====================
    if (cmd === "saldo") {
        return sock.sendMessage(from, {
            text: `💰 ${p.saldo}`
        });
    }

    // =====================
    // SLOT 🎰
    // =====================
    if (cmd === "slot") {

        let bet = Number(args[1]);

        if (!validBet(p, bet)) return;

        if (isJackpot()) {
            let win = bet * 10;
            p.saldo += win;
            saveDB(db);

            return sock.sendMessage(from, {
                text: `💥 JACKPOT x10!!! +${win}`
            });
        }

        if (isWin()) {
            let win = bet * 2;
            p.saldo += win;
            saveDB(db);

            return sock.sendMessage(from, {
                text: `🎰 WIN +${win}`
            });
        } else {
            p.saldo -= bet;
            saveDB(db);

            return sock.sendMessage(from, {
                text: `💀 LOSE -${bet}`
            });
        }
    }

    // =====================
    // DADU 🎲
    // =====================
    if (cmd === "dadu") {

        let bet = Number(args[1]);
        if (!validBet(p, bet)) return;

        let u = Math.floor(Math.random() * 6) + 1;
        let b = Math.floor(Math.random() * 6) + 1;

        if (u > b && isWin()) {
            let win = bet * 2;
            p.saldo += win;
            saveDB(db);

            return sock.sendMessage(from, {
                text: `🎲 ${u} vs ${b}\nWIN +${win}`
            });
        } else {
            p.saldo -= bet;
            saveDB(db);

            return sock.sendMessage(from, {
                text: `🎲 ${u} vs ${b}\nLOSE -${bet}`
            });
        }
    }

    // =====================
    // COIN 🪙
    // =====================
    if (cmd === "coin") {

        let bet = Number(args[1]);
        if (!validBet(p, bet)) return;

        let result = Math.random() < 0.5 ? "HEAD" : "TAIL";
        let pick = Math.random() < 0.5 ? "HEAD" : "TAIL";

        if (result === pick && isWin()) {
            let win = bet * 2;
            p.saldo += win;
            saveDB(db);

            return sock.sendMessage(from, {
                text: `🪙 ${result}\nWIN +${win}`
            });
        } else {
            p.saldo -= bet;
            saveDB(db);

            return sock.sendMessage(from, {
                text: `🪙 ${result}\nLOSE -${bet}`
            });
        }
    }

    // =====================
    // TEBAK 🔢
    // =====================
    if (cmd === "tebak") {

        let bet = Number(args[1]);
        let guess = Number(args[2]);

        if (!validBet(p, bet)) return;

        let num = Math.floor(Math.random() * 5) + 1;

        if (guess === num && isWin()) {
            let win = bet * 3;
            p.saldo += win;
            saveDB(db);

            return sock.sendMessage(from, {
                text: `🎯 ${num}\nWIN +${win}`
            });
        } else {
            p.saldo -= bet;
            saveDB(db);

            return sock.sendMessage(from, {
                text: `❌ ${num}\nLOSE -${bet}`
            });
        }
    }

    // =====================
    // TRANSFER 💸
    // =====================
    if (cmd === "tf") {

        let target = args[1] + "@s.whatsapp.net";
        let amount = Number(args[2]);

        if (!db[target]) return;

        if (amount > p.saldo) return;

        p.saldo -= amount;
        db[target].saldo += amount;

        saveDB(db);

        return sock.sendMessage(from, {
            text: `💸 transfer ${amount}`
        });
    }

    // =====================
    // LEADERBOARD 🏆
    // =====================
    if (cmd === "leaderboard") {

        let list = Object.values(db)
            .sort((a, b) => b.saldo - a.saldo)
            .slice(0, 10);

        let text = "🏆 TOP SALDO\n\n";

        list.forEach((p, i) => {
            text += `${i + 1}. 💰 ${p.saldo}\n`;
        });

        return sock.sendMessage(from, { text });
    }

    // =====================
    // BANGKRUT
    // =====================
    if (p.saldo <= 0) {
        return sock.sendMessage(from, {
            text: "💀 kamu bangkrut, deposit lagi"
        });
    }
};
