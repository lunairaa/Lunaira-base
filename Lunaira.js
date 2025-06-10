import * as config from './setting.js';
import chalk from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import util from 'util';
import os from 'os';
import axios from 'axios';
import { execSync } from 'child_process';
import lunairaApi from 'lunaira-api';
const { generateBrat, convertToWebp } = lunairaApi;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pluginsCache = [];
let watchers = {};

const loadPlugins = async () => {
  const pluginsDir = path.resolve(__dirname, './plugins');
  const pluginFiles = [];

  const readDirRecursive = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        readDirRecursive(filePath);
      } else if (file.endsWith('.js')) {
        pluginFiles.push(filePath);
      }
    }
  };

  readDirRecursive(pluginsDir);

  const plugins = [];
  for (const file of pluginFiles) {
    try {
      if (!watchers[file]) {
        fs.watch(file, async (eventType) => {
          if (eventType === 'change') {
            console.log(chalk.yellow(`🔄 Plugin updated: ${file}`));
            try {
              const newPlugins = await loadPlugins();
              pluginsCache = newPlugins;
              console.log(chalk.green(`✅ Successfully reloaded plugin: ${file}`));
            } catch (e) {
              console.log(chalk.red(`❌ Failed to reload plugin: ${file}`), e);
            }
          }
        });
        watchers[file] = true;
      }

      const module = await import('file://' + file + '?update=' + Date.now());
      const plugin = module.default || module;
      if (plugin && plugin.command && plugin.handler) {
        plugins.push(plugin);
      }
    } catch (e) {
      console.log(chalk.red(`❌ Plugin error: ${file}`), e);
    }
  }
  return plugins;
};

pluginsCache = await loadPlugins();

export default async function (Acaw, m) {
  try {
    let body = '';
    if (m.message) {
      body =
        m.message.conversation ||
        m.message.imageMessage?.caption ||
        m.message.videoMessage?.caption ||
        m.message.extendedTextMessage?.text ||
        m.message.buttonsResponseMessage?.selectedButtonId ||
        m.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        m.message.templateButtonReplyMessage?.selectedId ||
        m.text || '';
    }

    const prefixRegex = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#$%^&.©^]/;
    const prefix = prefixRegex.test(body) ? body.match(prefixRegex)[0] : '';
    const isCmd = prefix !== '' && body.startsWith(prefix);
    const command = isCmd ? body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase() : '';
    const args = isCmd ? body.slice(prefix.length).trim().split(/ +/).slice(1) : [];
    const pushname = m.pushName || 'No Name';
    const sender = m.key.remoteJid;
    const senderNumber = m.sender.split('@')[0];
    const isOwner = senderNumber === config.ownerNumber;

    const bgColors = [
      chalk.bgRed.black,
      chalk.bgGreen.black,
      chalk.bgBlue.black,
      chalk.bgMagenta.black,
      chalk.bgCyan.black,
      chalk.bgYellow.black,
      chalk.bgWhite.black
    ];
    const randomBg = bgColors[Math.floor(Math.random() * bgColors.length)];
    console.log(randomBg(`[ PESAN ]`) + ' ' + chalk.cyanBright(`Dari: ${sender}`) + ' - ' + chalk.greenBright(body));

    const reply = (teks) => {
      const message = {
        text: teks,
        contextInfo: { forwardingScore: 999, isForwarded: true }
      };
      return Acaw.sendMessage(sender, message, {
        quoted: {
          key: { participant: '0@s.whatsapp.net', remoteJid: m.chat || 'status@broadcast' },
          message: { locationMessage: { name: config.namabot, jpegThumbnail: null } }
        }
      });
    };

    if (isCmd) {
      for (const plugin of pluginsCache) {
        if (plugin.command.includes(command)) {
          try {
            await plugin.handler({
              m,
              config,
              conn: Acaw,
              args,
              isOwner,
              sender,
              pushname
            });
          } catch (e) {
            console.log(chalk.red(`❌ Error plugin: ${command}`), e);
            await reply('⚠️ Plugin error! Coba lagi.');
          }
          return;
        }
      }
    }

    switch (command) {
      case 'menu': {
        try {
          const menuPath = path.resolve(__dirname, './lib/menu.txt');
          const menu = fs.readFileSync(menuPath, 'utf-8');
          await reply(menu);
        } catch {
          await reply('Gagal memuat menu.txt!');
        }
      }
      break;

      case 's':
      case 'sticker': {
        try {
          const quoted = m.quoted ? m.quoted : m;
          const mime = (quoted.msg || quoted).mimetype || '';
          if (!/image|video/.test(mime)) return reply(`Balas gambar/video dengan caption .s`);

          const mediaBuffer = await quoted.download();
          if (!mediaBuffer) return reply('Gagal mengunduh media.');

          const stickerBuffer = await convertToWebp(mediaBuffer, /video/.test(mime));
          await Acaw.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
        } catch (e) {
          console.log('Error:', e);
          reply('Gagal, coba ulangi lagi!');
        }
      }
      break;

      default:
        break;
    }
  } catch (err) {
    const errId = `11@s.whatsapp.net`;
    await Acaw.sendMessage(errId, { text: util.format(err) }, { quoted: m });
    console.log(chalk.redBright('❌ Error:\n'), err);
  }
}

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(chalk.redBright(`Update ${__filename}`));
  import(`${import.meta.url}?update=${Date.now()}`);
});