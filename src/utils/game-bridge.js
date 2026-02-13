import bot from '../index.js'
import { publicChatId, ADMINS } from '../index.js'
import { ask } from './heracles-client.js'

const topicNameToId = { economy: 508, chicory: 510 }
const topicIdToName = {}
Object.entries(topicNameToId).forEach(e => topicIdToName[e[1]] = e[0]) // idk...

export const handleGlobal = async (from, action, data) => {
    console.log('Game Chat message:', from, data.recipients, data.username, data.message)
    const icon = { economy: "☕️", chicory: "⚡️" }[from]
    const topicId = topicNameToId[from]

    if (action === "msg") await topicSend(topicId, `${icon} <b>${data.username}:</b> ${data.message.slice(1)}`)
    else if (action === "info") await topicSend(topicId, `${icon} <b>${data.text}</b>`)
}

const topicSend = (topicId, text) =>
    bot.sendMessage(
        publicChatId,
        text,
        {
            parse_mode: 'HTML',
            message_thread_id: topicId
        }
    );

export const sendMessageToGame = async (msg) => {
    const topicId = msg.message_thread_id
    const topic = topicIdToName[topicId]
    if (!topic) return bot.deleteMessage(msg.chat.id, msg.message_id) // General топик чистим

    if (msg.text.length > 70) return topicSend(topicId, "Сообщение превышает 70 символов (на " + (msg.text.length - 70) + " симв.)")

    const from = msg.from.username ? `@${msg.from.username}` : (msg.from.first_name?.length ? msg.from.first_name : null)
    if (!from?.length) return topicSend(topicId, "Не удалось отправить — у вас пустое имя!")
    if (from.length > 30) return topicSend(topicId, "Не удалось отправить — у вас слишком длинное имя!")

    const data = { username: from, message: msg.text }
    const str = JSON.stringify(data)
    const response = await ask(17, `${topic}:tg-msg:${str}`)
    console.log(response)
}

export const whitelistAction = async (ctx, add) => {
    const username = ctx.text.slice(ctx.text.indexOf(' ') + 1)
    const response = await ask(16, `whitelist-${add ? 'add' : 'remove'}:${username}`)
    send(ctx, "⚡️ <b>Запрос на сервер отправлен!</b>\n" +
    "Однако, стоит перепроверить, выполнился ли запрос.\nПромежуточный ответ: " + response)
}







