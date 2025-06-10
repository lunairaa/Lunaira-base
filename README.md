# Lunaira Base
![thumbnails](https://files.catbox.moe/84unf5.png)

## Structure Project
```bash
📁 Lunaira-base/
├── 📁 lib/
├── 📁 plugins/
│   ├── 📁 utils/
│   │   ├── 📄 information.js
├── 📁 tmp/
├── 📄 setting.js
├── 📄 index.js
├── 📄 Lunaira.js
├── 📄 package.json
├── 📄 README.md
```

## Example Plugins
```typescript
export default {
  command: ['hello', 'helo'],
  handler: async ({ m, conn }) => {
    await conn.sendMessage(m.chat, { text: 'Hello, world!' }, { quoted: m });
  }
};
```
**command:** `['hello']`  
Daftar perintah yang akan memicu plugin ini. Misalnya, ketik `.hello` di chat untuk menjalankan plugin.

**handler:** `async function({ m, conn })`  
Fungsi utama yang dijalankan saat command dipanggil. Pada contoh ini, fungsi akan mengirim pesan balasan **"Hello, world!"** ke chat.

## Instalasi

```bash
git clone https://github.com/lunairaa/Lunaira-base.git
cd Lunaira-base
npm install
npm start
```
[![Download ZIP](https://img.shields.io/badge/Download-Lunaira%20Base-blue?style=for-the-badge&logo=github)](https://github.com/lunairaa/Lunaira-base/archive/refs/heads/main.zip)


## Thanks to

<p align="left">
  <a href="https://github.com/lunairaa">
    <img src="https://github.com/lunairaa.png" width="40" style="border-radius:50%" alt="lunairaa" />
  </a>
  &nbsp;
  <a href="https://github.com/ojiwzrd10">
    <img src="https://github.com/ojiwzrd10.png" width="40" style="border-radius:50%" alt="ojiwzrd10" />
  </a>
  &nbsp;
  <a href="https://github.com/WhiskeySockets">
    <img src="https://github.com/WhiskeySockets.png" width="40" style="border-radius:50%" alt="WhiskeySockets" />
  </a>
</p>
