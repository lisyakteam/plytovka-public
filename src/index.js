import 'dotenv/config'
import TelegramBot from 'node-telegram-bot-api'

import { send, edit } from './utils/chat'
import { sendStart } from './panels/start'
import { sendAccess, enterAccess, sendCode, handleLinkedBroadcast, handleGameUnlink, adminHandle } from './panels/access'
import { sendMenu } from './panels/menu'
import { sendProfile } from './panels/profile'
import { handleSkins, uploadSkin } from './panels/skins'
import { sendTickets, startCreation, inputText, adminTicketClick, adminTicketReply } from './panels/tickets'

import { getUser, saveData } from './data'

import { connect, disconnect, onNotification, ask } from './utils/heracles-client'
import { sendMessageToGame, whitelistAction } from './utils/game-bridge'

const bot = new TelegramBot(process.env.TOKEN, { polling: true })
export default bot

export const publicChatId = Number(process.env.PUBLIC_CHAT_ID)

await connect()

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


bot.on('message', async msg => {
    const text = msg.text

    console.log(msg.from.id, msg.from.first_name, msg.from.username, text)

    const user = getUser(msg)
    if (user.ban) return

    try {
        if (msg.chat.id > 0) {
            /* Обычные команды в личке */
            if (text === '/start') return sendStart(0, msg)
            else if (text === '⚡️ Открыть главное меню') return sendMenu(msg, true)
            else {
                const user = getUser(msg)
                /* Стейты */
                if (user?.state) {
                    if (user.state === 'access') return enterAccess(msg)
                    else if (user.state === 'ticket-creation') return inputText(msg)
                    else if (user.state?.startsWith('skin-')) return uploadSkin(msg)
                    /* Админские стейты */
                    else if (ADMINS.some(x => x === msg.from.id)) {
                        if (user.state === 'admin-ticket-reply') return adminTicketReply(msg)
                        else {
                            if (text?.startsWith('/add')) return whitelistAction(msg, true)
                            else if (text?.startsWith('/remove')) return whitelistAction(msg, false)
                        }
                    }
                }
            }
        }
        else {
            if (text) {
                if (text.match(/\/(me|link|top)@plytbot/)) return bot.sendMessage(msg.chat.id, "Я глупи")
                else if (text.match(/\/code/)) return bot.sendMessage(msg.chat.id, "Это на сервере команда глупик")
                else if (msg.chat.id === publicChatId) return sendMessageToGame(msg)
            }
        }
    } catch (err) {
        console.error(err)
    }
})

bot.on('callback_query', async ctx => {
    const args = ctx.data.split(' ')
    const msg = ctx.message

    console.log('click', ctx.from.id, ctx.from.first_name, ctx.from.username, ctx.data)

    const user = getUser(ctx)
    if (user.ban) return

    try {
        if (msg.chat.id > 0) {
            /* Обычные кнопки */
            if      (args[0] === 'start') sendStart(+args[1], msg, true);
            else if (args[0] === 'menu') sendMenu(ctx);
            else if (args[0] === 'menu-open') sendMenu(ctx, true);
            else if (args[0] === 'access') sendAccess(ctx, ...args.slice(1));
            else if (args[0] === 'tickets') sendTickets(ctx);
            else if (args[0] === 'create-ticket') startCreation(ctx);
            else if (args[0] === 'profile') sendProfile(ctx, args.slice(1));
            else if (args[0] === 'get-code') sendCode(ctx);
            else if (args[0] === 'account-reset') resetAccount(ctx)
            else if (args[0] === 'skins') handleSkins(ctx, args.slice(1))
            else if (args[0] === 'admin' && ADMINS.some(x => x === ctx.from.id)) {
                /* Админские кнопки */
                if      (args[1] === 'access') adminHandle(ctx, args.slice(2))
                else if (args[1] === 'ticket') adminTicketClick(ctx, args.slice(2))
            }

        }

        bot.answerCallbackQuery(ctx.id)
    } catch (err) {
        bot.answerCallbackQuery(ctx.id, { text: "💢 Ошибка, сообщите админам!" })
        console.error(err)
    }
})

const resetAccount = ctx => {
    const user = getUser(ctx)

    user.account = undefined
    saveData()

    edit(ctx.message, "⚡️ <b>Ник сброшен!</b>", { reply_markup: {
        inline_keyboard: [
            [{ text: "⚡️ В главное меню", callback_data: "menu" }],
        ]
    }})
}

bot.on('message', msg => {
    (msg.left_chat_member || msg.new_chat_member) && bot.deleteMessage(msg.chat.id, msg.message_id);
})

process.on('uncaughtException', (err, origin) => {
    console.error(`Caught exception: ${err}\nException origin: ${origin}`);
});

process.on('unhandledRejection', (err, origin) => {
    console.error(`Caught exception: ${err}\nException origin: ${origin}`);
});

async function shutdown() {
    console.log('Shutting down...')
    await bot.stopPolling()
    await disconnect()
    process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export const ADMINS = [ 1067953223, 7228575632 ]
