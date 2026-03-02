import bot from '../index'
import { ADMINS, addLog } from '../index.js'
import { getUser, saveData, getData } from '../data'

import { send, edit } from '../utils/chat'
import { sendStart } from '../panels/start'
import { sendAccess, sendCode, adminHandle } from '../panels/access'
import { sendMenu } from '../panels/menu'
import { sendProfile } from '../panels/profile'
import { handleSkins, uploadSkin } from '../panels/skins'
import { sendTickets, startCreation, adminTicketClick } from '../panels/tickets'

export const init = bot => {
    bot.on('callback_query', async ctx => {
        const args = ctx.data.split(' ')
        const msg = ctx.message

        console.log('click', ctx.from.id, ctx.from.first_name, ctx.from.username, ctx.callback_data)
        addLog(`👉🏻 ${msg.chat.id === msg.from.id ? "Личка" : msg.chat.title}: ${ctx.from.first_name} (${ctx.from.username || "без тега"}) ${ctx.data || Object.keys(ctx).filter(key => !/id|from|chat|date|message/.test(key))}`)

        const user = getUser(ctx);
        if (user.ban) return;

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
                else if (args[0] === 'account-reset') resetAccount(ctx);
                else if (args[0] === 'skins') handleSkins(ctx, args.slice(1));
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
}

/* TODO: перенести */
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
