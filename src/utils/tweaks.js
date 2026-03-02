import fs from 'node:fs'
import path from 'node:path'
import bot from '../index.js'

const getRandomFox = () => {
    const images = fs.readdirSync('./images/pat/')
    return path.resolve('./images/pat/' + images[Math.floor(Math.random() * images.length)]);
}

const emojiId = 5326007597365468460n;
const emoji = '<tg-emoji emoji-id="' + emojiId + '">👍</tg-emoji>'

console.log(emojiId, emoji)

export const pat = async (msg) => {
    if (!msg.reply_to_message) return;

    const targetUser = msg.reply_to_message.from
    const imagePath = getRandomFox()

    await bot.sendPhoto(
        msg.chat.id,
        imagePath,
        {
            caption: `${emoji} <b>Вас погладили!</b>`,
            reply_to_message_id: msg.reply_to_message.message_id,
            parse_mode: 'HTML',
        }
    )
}
