import * as baileys from '@whiskeysockets/baileys';
import * as config from './setting.js';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import PhoneNumber from 'awesome-phonenumber';
import readline from 'readline';
import { smsg } from './lib/myfunction.js';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Boom } from '@hapi/boom';

const { proto, makeWASocket, useMultiFileAuthState, jidDecode, DisconnectReason, downloadContentFromMessage } = baileys;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const store = {
  contacts: {},
  logger: pino({ level: 'silent' }).child({ stream: 'store' })
};

const question = (text) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(text, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
};

let handlemsg = (await import('./Lunaira.js')).default;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./Session');

  const Acaw = makeWASocket({
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    syncFullHistory: true,
    getMessage: async (key) => {
      return { conversation: 'Pesan tidak tersedia' };
    }
  });

  Acaw.downloadMediaMessage = async (message) => {
    let mime = (message.msg || message).mimetype || ''
    let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
    const stream = await downloadContentFromMessage(message, messageType)
    let buffer = Buffer.from([])
    for await(const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
  }

  function loadingBar(duration = 3000) {
    return new Promise(resolve => {
      const frames = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
      let i = 0;
      const interval = setInterval(() => {
        const bar = frames[i % frames.length].repeat(10);
        process.stdout.write('\r' + chalk.blue(bar));
        i++;
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        process.stdout.write('\r' + chalk.green('██████████') + '   \n');
        resolve();
      }, duration);
    });
  }

  if (!Acaw.authState.creds.registered) {
    console.clear();
    const phoneNumber = await question(chalk.whiteBright('Masukkan nomor WhatsApp: '));
    
    await loadingBar(3000);
    
    const code = await Acaw.requestPairingCode(phoneNumber);
    
    console.log(chalk.green('\nKode Pairing kamu: ') + chalk.yellowBright(code));
    console.log(chalk.white('\nBuka WhatsApp > Perangkat Tertaut > Tautkan perangkat pakai kode di atas.\n'));
  }

  Acaw.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      switch (reason) {
        case DisconnectReason.badSession:
          console.log("⚠️ Bad session file. Hapus dan scan ulang.");
          process.exit();
        case DisconnectReason.connectionClosed:
          console.log("❌ Koneksi tertutup, mencoba ulang...");
          connectToWhatsApp();
          break;
        case DisconnectReason.connectionLost:
          console.log("🔌 Koneksi hilang dari server, mencoba ulang...");
          connectToWhatsApp();
          break;
        case DisconnectReason.connectionReplaced:
          console.log("⚠️ Koneksi digantikan. Silakan restart bot.");
          process.exit();
        case DisconnectReason.loggedOut:
          console.log("🚪 Akun logout. Hapus folder session dan scan ulang.");
          process.exit();
        case DisconnectReason.restartRequired:
          console.log("🔄 Restart diperlukan. Memulai ulang...");
          connectToWhatsApp();
          break;
        case DisconnectReason.timedOut:
          console.log("⏱️ Koneksi timeout. Mencoba ulang...");
          connectToWhatsApp();
          break;
        default:
          console.log(`❓ Alasan tidak dikenal: ${reason}|${connection}. Mencoba ulang...`);
          connectToWhatsApp();
      }
    } else if (connection === "open") {
      console.log(`✅ Berhasil terhubung`);
    }
  });

  Acaw.ev.on('creds.update', saveCreds);

  Acaw.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages?.[0];
      if (!mek?.message) return;
      mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message;
      if (mek.key?.remoteJid === 'status@broadcast') return;
      if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return;
      const m = smsg(Acaw, mek, store);
      await handlemsg(Acaw, m, chatUpdate, store);
    } catch (err) {
      console.log(chalk.redBright("Error on messages.upsert:"), err);
    }
  });

  Acaw.decodeJid = (jid) => {
    if (!jid) return jid;
    if (/:\d+@/gi.test(jid)) {
      const decode = jidDecode(jid) || {};
      return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
    } else return jid;
  };

  Acaw.getName = async (jid, withoutContact = false) => {
    const id = Acaw.decodeJid(jid);
    withoutContact = Acaw.withoutContact || withoutContact;
    let v;
    if (id.endsWith("@g.us")) {
      return new Promise(async (resolve) => {
        v = store.contacts[id] || {};
        if (!(v.name || v.subject)) v = await Acaw.groupMetadata(id) || {};
        resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'));
      });
    } else {
      v = (id === '0@s.whatsapp.net') ? { id, name: 'WhatsApp' } : (id === Acaw.decodeJid(Acaw.user.id)) ? Acaw.user : (store.contacts[id] || {});
      return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
    }
  };
}

connectToWhatsApp();

fs.watchFile(path.resolve('./Lunaira.js'), async () => {
  const updated = await import(`./Lunaira.js?update=${Date.now()}`);
  handlemsg = updated.default;
  console.log(chalk.greenBright(`[HOT-RELOAD] ./Lunaira.js diperbarui!`));
});

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(chalk.redBright(`Update ${__filename}`));
  import(`${import.meta.url}?update=${Date.now()}`)
    .then(() => console.log('✅ Kode diperbarui!'))
    .catch(err => console.error('❌ Gagal memperbarui:', err));
});