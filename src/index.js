import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'

import { handleLinkedBroadcast, handleGameUnlink } from './panels/access'
import { getData } from './data'

import { connect, disconnect, onNotification, ask } from './utils/heracles-client'

import * as Callback from './flows/callback'
import * as Message from './flows/message'

const bot = new TelegramBot(process.env.TOKEN, { polling: true })
export default bot

await connect()
Callback.init(bot)
Message.init(bot)

/* Обработка уведомлений от TLS */ /* TODO: перенести куда-то */
onNotification((sender, data) => {
    console.log('Received broadcast from', sender, 'to', data)
    const type = data.slice(0, data.indexOf(':'))
    console.log(type)

    if (type === "linked") {
        handleLinkedBroadcast(JSON.parse(data.slice(7)))
    }
    else if (type === "unlinked") {
        handleGameUnlink(JSON.parse(data.slice(9)))
    }
})

/* Логирование */
const logs = [];
export const addLog = t => logs.length < 10 && logs.push(t.slice(0, 100));
const sendLogs = setInterval(() => {
    const chatId = getData().settings?.logsChatId;
    if (!chatId) throw new Error("Please, setup chat for logs!"); // TODO: create assert func

    const format = logs.join('\n')
    logs.length = 0

    if (!format.length) return;

    try {
        bot.sendMessage(chatId, format)
    } catch (e) {
        bot.sendMessage(chatId, "Не удалось отправить логи!")
    }
}, 10000)

bot.on('message', msg => {
    (msg.left_chat_member || msg.new_chat_member) && bot.deleteMessage(msg.chat.id, msg.message_id);
})

/* Обработка ошибок */
process.on('uncaughtException', (err, origin) => {
    console.error(`Caught exception: ${err}\nException origin: ${origin}`);
});

process.on('unhandledRejection', (err, origin) => {
    console.error(`Caught exception: ${err}\nException origin: ${origin}`);
});

async function shutdown() {
    console.log('Shutting down...')
    bot.stopPolling({ cancel: true });
    disconnect();
    clearInterval(sendLogs);
    process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

export const ADMINS = [ 1067953223, 7228575632 ] /* TODO: хранить в data.settings */
