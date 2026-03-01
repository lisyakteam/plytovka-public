import bot from '../index.js'

export const send = (m, t, o = {}) => bot.sendMessage(m.chat.id, t, {
    parse_mode: 'HTML', ...o
})

export const edit = (m, t, o = {}) => bot.editMessageText(t, {
    chat_id: m.chat.id,
    message_id: m.message_id,
    parse_mode: 'HTML', ...o
})
