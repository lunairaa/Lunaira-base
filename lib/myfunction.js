import * as baileys from "@whiskeysockets/baileys";
import chalk from 'chalk';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const proto = baileys?.proto ?? baileys?.default?.proto;
const { getContentType, areJidsSameUser, generateWAMessage } = baileys;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const M = proto.WebMessageInfo;

export function smsg(Acaw, m, store) {
    if (!m) return m;

    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id?.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = Acaw.decodeJid(m.fromMe ? Acaw.user.id : m.participant || m.key.participant || m.chat || '');
        if (m.isGroup) m.participant = Acaw.decodeJid(m.key.participant) || '';
    }

    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = (m.mtype === 'viewOnceMessage') ?
            m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] :
            m.message[m.mtype];

        m.body = m.message?.conversation || m.msg?.caption || m.msg?.text ||
            (m.mtype === 'listResponseMessage' && m.msg?.singleSelectReply?.selectedRowId) ||
            (m.mtype === 'buttonsResponseMessage' && m.msg?.selectedButtonId) ||
            (m.mtype === 'viewOnceMessage' && m.msg?.caption) || m.text;

        let quoted = m.quoted = m.msg?.contextInfo?.quotedMessage || null;
        m.mentionedJid = m.msg?.contextInfo?.mentionedJid || [];

        if (m.quoted) {
            let type = Object.keys(m.quoted)[0];
            m.quoted = m.quoted[type];

            if (type === 'productMessage') {
                type = Object.keys(m.quoted)[0];
                m.quoted = m.quoted[type];
            }

            if (typeof m.quoted === 'string') m.quoted = { text: m.quoted };

            m.quoted.mtype = type;
            m.quoted.id = m.msg.contextInfo?.stanzaId;
            m.quoted.chat = m.msg.contextInfo?.remoteJid || m.chat;
            m.quoted.isBaileys = m.quoted.id?.startsWith('BAE5') && m.quoted.id.length === 16;
            m.quoted.sender = Acaw.decodeJid(m.msg.contextInfo?.participant);
            m.quoted.fromMe = m.quoted.sender === Acaw.decodeJid(Acaw.user.id);
            m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation ||
                m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
            m.quoted.mentionedJid = m.msg.contextInfo?.mentionedJid || [];

            m.getQuotedObj = async () => {
                if (!m.quoted.id) return false;
                let q = await store.loadMessage(m.chat, m.quoted.id, Acaw);
                return smsg(Acaw, q, store);
            };

            let vM = m.quoted.fakeObj = proto.WebMessageInfo.fromObject({
                key: {
                    remoteJid: m.quoted.chat,
                    fromMe: m.quoted.fromMe,
                    id: m.quoted.id
                },
                message: quoted,
                ...(m.isGroup ? { participant: m.quoted.sender } : {})
            });

            m.quoted.delete = () => Acaw.sendMessage(m.quoted.chat, { delete: vM.key });
            m.quoted.copyNForward = (jid, forceForward = false, options = {}) => Acaw.copyNForward(jid, vM, forceForward, options);
            m.quoted.download = () => Acaw.downloadMediaMessage(m.quoted);
        }
    }

    if (m.msg?.url) m.download = () => Acaw.downloadMediaMessage(m.msg);
    m.text = m.body || m.msg?.text || m.msg?.caption || m.message?.conversation ||
        m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || '';

    m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ?
        Acaw.sendMedia(chatId, text, 'file', '', m, { ...options }) :
        Acaw.sendMessage(chatId, { text: text }, { quoted: m, ...options });
        
    m.copy = () => smsg(Acaw, proto.WebMessageInfo.fromObject(proto.WebMessageInfo.toObject(m)));
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => Acaw.copyNForward(jid, m, forceForward, options);

    Acaw.appendTextMessage = async (text, chatUpdate) => {
        let messages = await generateWAMessage(m.chat, { text, mentions: m.mentionedJid }, {
            userJid: Acaw.user.id,
            quoted: m.quoted?.fakeObj
        });
        messages.key.fromMe = areJidsSameUser(m.sender, Acaw.user.id);
        messages.key.id = m.key.id;
        messages.pushName = m.pushName;
        if (m.isGroup) messages.participant = m.sender;

        let msg = {
            ...chatUpdate,
            messages: [proto.WebMessageInfo.fromObject(messages)],
            type: 'append'
        };
        Acaw.ev.emit('messages.upsert', msg);
    };

    return m;
}

fs.watchFile(__filename, () => {
    fs.unwatchFile(__filename);
    console.log(chalk.redBright(`Update ${__filename}`));
    import(`${import.meta.url}?update=${Date.now()}`)
        .then(() => console.log('Kode diperbarui!'))
        .catch(err => console.error('Gagal memperbarui:', err));
});