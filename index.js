const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode"); // buat convert QR string ke gambar
const pino = require("pino");
const handler = require("./handler");

// =====================
async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState("./session");

    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state,
        printQRInTerminal: false // ❗ MATIIN AUTO QR
    });

    // =====================
    // QR MANUAL
    // =====================
    sock.ev.on("connection.update", async (update) => {

        const { connection, lastDisconnect, qr } = update;

        // 🔥 QR DAPAT DI SINI
        if (qr) {
            console.log("📲 QR BARU TERDETEK!");

            // tampilkan di terminal (opsional)
            const qrImage = await qrcode.toString(qr, { type: "terminal" });
            console.log(qrImage);

            // kalau mau simpan jadi file PNG:
            await qrcode.toFile("./qrcode.png", qr);

            console.log("✅ QR disimpan ke qrcode.png");
        }

        if (connection === "open") {
            console.log("✅ Bot connected!");
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;

            if (reason !== DisconnectReason.loggedOut) {
                console.log("🔄 Reconnecting...");
                startBot();
            } else {
                console.log("❌ Session logout, scan ulang QR");
            }
        }
    });

    // =====================
    // SAVE SESSION
    // =====================
    sock.ev.on("creds.update", saveCreds);

    // =====================
    // MESSAGE HANDLER
    // =====================
    sock.ev.on("messages.upsert", async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            await handler(sock, msg);
        } catch (err) {
            console.log("Error:", err);
        }
    });
}

startBot();
