import os from 'os';
import { execSync } from 'child_process';
import { getLinkPreview } from 'link-preview-js';

export default {
  command: ['info'],
  handler: async ({ m, config, conn }) => {
    try {
      const uptime = process.uptime();
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);
      const runtime = `${hours}h ${minutes}m ${seconds}s`;
      const dfOutput = execSync('df -h /').toString();
      const diskInfo = dfOutput.trim().split('\n')[1].split(/\s+/);
      const memoryUsage = process.memoryUsage();
      const formatMB = (bytes) => (bytes / 1024 / 1024).toFixed(2);
      const totalMem = formatMB(os.totalmem());

      const readMore = String.fromCharCode(8206).repeat(4001);
      const url = 'https://github.com/lunairaa/Lunaira-base';
      const preview = await getLinkPreview(url);

      const messageText = `👋 Selamat datang di *${config.namabot}*

┏━ Information ━━━━━━━━━━┓
🎨 Author : Lunaira
🔋 Status : Aktif
⏲️ Uptime : ${runtime}
┗━━━━━━━━━━━━━━━━━━━┛
${readMore}

📡 *SYSTEM INFORMATION*
\`\`\`
# HARDWARE SPECS
• CPU: ${os.cpus()[0]?.model || 'Unknown'} 
• CORES: ${os.cpus().length} Threads
• ARCH: ${os.arch()}
• MEMORY: ${totalMem} MB Total

# STORAGE USAGE
• TOTAL: ${diskInfo[1]}
• USED: ${diskInfo[2]} (${diskInfo[4]})
• FREE: ${diskInfo[3]}

# PROCESS INFO
• PID: ${process.pid}
• NODE: ${process.version}
• HOST: ${os.hostname()}
\`\`\`

💾 *MEMORY USAGE*
\`\`\`
RSS    : ${formatMB(memoryUsage.rss)} MB
Heap   : ${formatMB(memoryUsage.heapUsed)}/${formatMB(memoryUsage.heapTotal)} MB
Ext    : ${formatMB(memoryUsage.external)} MB
\`\`\`

💡 Terima kasih sudah menggunakan Base Script WhatsApp Bot Lunaira! Mau lihat kode sumbernya? Klik: ${url}

Terus berkarya dan semangat! ✨`;

      await conn.sendMessage(
        m.chat,
        {
          text: messageText,
          contextInfo: {
            externalAdReply: {
              mediaUrl: url,
              mediaType: 2,
              description: preview.description || '',
              title: preview.title || 'Lunaira WhatsApp Bot Base',
              body: '',
              thumbnailUrl: preview.images?.[0] || '',
              sourceUrl: url
            }
          }
        },
        { quoted: m }
      );
    } catch (e) {
      console.error(e);
      await conn.sendMessage(
        m.chat,
        { text: '⚠️ Error fetching system information' },
        { quoted: m }
      );
    }
  }
};
