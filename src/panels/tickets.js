import { send, edit } from '../utils/chat'

import { getUser, saveData, getData } from '../data'
import bot from '../index.js'

const toTickets = {
    reply_markup: {
        inline_keyboard: [[{ text: "Назад", callback_data: "tickets" }]]
    }
};

export const sendTickets = ctx => {
    const user = getUser(ctx)

    if (!user.tickets) user.tickets = {
        list: []
    }

    const open = user.tickets.list.filter(x => !x.closed);

    const text = open.length ?
    (`✉️ <b>Ваши обращения</b>`) :
    (`✉️ <b>У вас нет открытых обращений!</b>`)

    const inline_keyboard = [
        ...open.slice(open.length - 2).map((ticket, i) => {
            return [{
                text: `${i + 1}. ${ticket.text.slice(0, 25) + (ticket.text.length >= 25 ? "..." : "")}`,
                callback_data: "tickets open " + ticket.id
            }]
        }),
        [{ text: "✉️ Создать новое", callback_data: "create-ticket" }],
        [{ text: "В главное меню", callback_data: "menu" }]
    ]

    const options = { reply_markup: { inline_keyboard } }

    edit(ctx.message, text, options)
}

export const startCreation = ctx => {
    const user = getUser(ctx)

    if (!user.tickets) user.tickets = {
        list: []
    }

    if (user.tickets.list.filter(x => !x.closed).length >= 2) {
        return edit(ctx.message, "✉️ Можно иметь <b>не более 2 открытых обращения</b> одновременно!", toTickets)
    }

    user.state = "ticket-creation"
    edit(ctx.message, "✉️ <b>Хорошо,</b> напишите, пожалуйста, ваш вопрос!\nФормулируйте <u>четко</u> и <u>по делу.</u>", toTickets)
}

export const inputText = async msg => {
    const user = getUser(msg)

    if (!user.tickets) user.tickets = {
        list: []
    }

    const text = msg.text;
    if (text.length < 20 || text.length > 300) return send(msg, "✉️ Обращение может составлять <b>от 20 до 300 символов.</b>")

    const id = user.tickets.list.length;

    user.state = null
    const messageIds = []

    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ Ответить", callback_data: "admin ticket " + msg.from.id + " " + id }],
            ]
        }
    }

    for (const ADMIN of ADMINS) {
        const response = await bot.sendMessage(ADMIN,
            "🍄 <b>Обращение от </b>"
            + (msg.from.username ? `@${msg.from.username}` : `${msg.from.first_name}`)
            + ` (ID ${msg.from.id})`
            + `\n${text}`, { parse_mode: 'HTML', ...keyboard })
        messageIds.push([ ADMIN, response.message_id ])
    }

    user.tickets.list.push({
        id,
        text,
        closed: false,
        messageIds
    })

    send(msg, "✉️ <b>Успешно!</b> Обращение создано.\nАдмины проекта отвечают <b>преимущественно днем.</b>")
}

export const adminTicketClick = (ctx, args) => {
    const user = getUser({ from: { id: +args[0] } })

    if (!user) return send(ctx.message, "Ошибка, пользователь не найден");

    const ticket = user.tickets?.list?.find(x => x.id === +args[1])

    if (!ticket) return send(ctx.message, "Ошибка, обращение не найдено!")

    const admin = getUser(ctx)
    admin.state = "admin-ticket-reply"
    admin.selection = [ +args[0], +args[1] ]

    send(ctx.message, "✉️ <b>Хорошо, сладуся.</b>\nВведи текст ответа на данное обращение.", {
        reply_markup: {
            inline_keyboard: [[{ text: "⬅️ Открыть меню", callback_data: "menu" }]]
        }
    })
    saveData()
}

export const adminTicketReply = async msg => {
    const admin = getUser(msg)

    const user = getUser({ from: { id: admin.selection[0]} })

    if (!user) return send(ctx.message, "Ошибка, пользователь не найден");

    const ticket = user.tickets?.list?.find(x => x.id === admin.selection[1])

    if (!ticket) return send(ctx.message, "Ошибка, обращение не найдено!")

    ticket.answer = msg.text;
    ticket.answered = msg.from.id;
    ticket.closed = true;

    const reply_markup = {
        inline_keyboard: [[
            { text: "🦆 Отвечено " + msg.from.first_name, callback_data: " " },
        ]]
    }

    for (const [ chat_id, message_id ] of ticket.messageIds || []) {
        const response = await bot.editMessageReplyMarkup(reply_markup, {
            chat_id, message_id
        })
    }

    ticket.messageIds = undefined;

    bot.sendMessage(admin.selection[0],
        "✉️ <b>Ответ по вашему обращению</b>\n" + msg.text,
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[
        { text: "В главное меню", callback_data: "menu-open" }
        ]] } }
    )

    admin.state = null
    admin.selection = undefined

    send(msg, "✉️ <b>Успешно!</b>\nСообщение отправлено, а обращение закрыто.")
    saveData()
}


const ADMINS = [ 1067953223, 7228575632 ]
