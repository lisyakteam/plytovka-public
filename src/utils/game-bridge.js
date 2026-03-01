import bot from '../index.js'
import { addLog } from '../index.js'
import { send, edit } from '../utils/chat'
import { ADMINS } from '../index.js'
import { ask } from './heracles-client.js'
import { saveData, getData } from '../data'

const icons = { economy: "☕️", chicory: "⚡️" };

export const handleGlobal = async (from, action, data) => {
    console.log('Game Chat message:', from, JSON.stringify(data))

    const icon = icons[from] || "⚠️";
    const topicId = getData().settings?.serverChatTopics?.find(x => x.name === from)?.id;

    if (!topicId) return addLog("⚠️ Игровое сообщение от незарегистрированного сервера: " + from);

    if (action === "msg") await topicSend(topicId, `${icon} <b>${data.username}:</b> ${data.message.slice(1)}`)
    else if (action === "info") await topicSend(topicId, `${icon} <b>${data.text}</b>`)
}

const topicSend = (topicId, text) => {
    const chatId = getData().settings?.minecraftLinkChatId

    if (!chatId) throw new Error("Please, setup chat for Minecraft Link!");

    bot.sendMessage(
        chatId,
        text,
        {
            parse_mode: 'HTML',
            message_thread_id: topicId
        }
    );
}

export const sendMessageToGame = async (msg) => {
    const topicId = msg.message_thread_id

    const topic = getData().settings?.serverChatTopics?.find(x => x.id === topicId);
    if (!topic) return bot.deleteMessage(msg.chat.id, msg.message_id) // General топик чистим

    if (msg.text.length > 70) return topicSend(topicId, "Сообщение превышает 70 символов (на " + (msg.text.length - 70) + " симв.)")

    const from = msg.from.username ? `@${msg.from.username}` : (msg.from.first_name?.length ? msg.from.first_name : null)
    if (!from?.length) return topicSend(topicId, "Не удалось отправить — у вас пустое имя!")
    if (from.length > 30) return topicSend(topicId, "Не удалось отправить — у вас слишком длинное имя!")
console.log(getData().settings)
    const data = { username: from, message: msg.text }
    const str = JSON.stringify(data)
    const response = await ask(17, `${topic.name}:tg-msg:${str}`)
    console.log(response)
}

export const whitelistAction = async (ctx) => {
    const spaceIdx = ctx.text.indexOf(' ')
    const username = ctx.text.slice(spaceIdx + 1)
    const action = ctx.text.slice(1, spaceIdx)
    const response = await ask(16, `whitelist-${action}:${username}`)
    send(ctx, "⚡️ <b>Запрос на сервер отправлен!</b>\n" +
    "Однако, стоит перепроверить, выполнился ли запрос.\nПромежуточный ответ: " + response)
}







