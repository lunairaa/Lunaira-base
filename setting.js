import chalk from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';

export const botNumber = '085725254154';
export const ownerNumber = '083170801193';
export const namabot = 'Lunaira';
export const ownername = '@ojiwzrd';

const __filename = fileURLToPath(import.meta.url);

fs.watchFile(__filename, () => {
  fs.unwatchFile(__filename);
  console.log(chalk.redBright(`Update ${__filename}`));
  import(`${import.meta.url}?update=${Date.now()}`)
    .then(() => console.log('Kode diperbarui!'))
    .catch(err => console.error('Gagal memperbarui:', err));
});