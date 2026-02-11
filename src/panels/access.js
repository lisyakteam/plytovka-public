import { send, edit } from '../utils/chat'

import { getUser, saveData, getData } from '../data'
import bot from '../index.js'

import { ask } from '../utils/heracles-client'

/*
 * Страницы и ответы на кнопки
 */
export const sendAccess = (ctx, page, ...selection) => {
    const { message } = ctx;
    let text;
    let reply_markup;

    console.log('access', page, selection)

    page = +page;

    if (isNaN(page) || !page) {
        reply_markup = {
            inline_keyboard: [
                [{ text: "⚡️ Я уже в вайтлисте", callback_data: "access 1 0" }],
                [{ text: "⚡️ Еще нет / не знаю", callback_data: "access 1 1" }],
                [{ text: "Назад", callback_data: "menu" }],
            ]
        }
        text = '⚡️ <b>Отлично</b>, я помогу тебе!'
        + '\n<b>Для начала:</b> вы уже были в вайтлисте или получали проходку?';
    }
    else if (page === 1) {
        text = "⚡️ <b>Понял!</b> В таком случае, вы уже ознакомлены с правилами проекта?\n"
            + "Их можно прочесть по ссылке: лисяк.рф/LisyakRules.pdf\n"
            + "Если ссылка не рабочая, то пожалуйста, попросите актуальную у админов проекта!\n\n"
            + "Чтобы играть в <b>режим Кофе</b>, вы должны быть ознакомлены с правилами!";

        reply_markup = {
            inline_keyboard: [
                [{ text: "⚡️ Да, я ознакомлен", callback_data: `access 2 ${selection[0]} 0` }],
                [{ text: "⚡️ Нет, правила говно", callback_data: `access 2 ${selection[0]} 1` }],
                [{ text: "Назад", callback_data: "access 0" }],
            ]
        }
    }
    else if (page === 2) {
        if (selection[1] === '1') {
            text = "💥 Если вы хотите играть без правил, то для вас готовится режим <b>\"Анархия\"</b> (и похожие)\n"

            reply_markup = {
                inline_keyboard: [
                    [{ text: "⚡️ Я согласен с правилами", callback_data: `access 2 ${selection[0]} 0` }],
                    [{ text: "В главное меню", callback_data: "menu" }],
                ]
            }
        }
        else {
            text = "⚡️ <b>Вы почти у цели!</b>\nПожалуйста, напишите свой <a href=\"https://myslang.ru/slovo/nikneim\">игровой ник</a>, который будет виден другим."
            + "\nРазрешены <b>латинские символы, цифры и нижнее подчеркивание.</b>"
            + "\n\nЕсли вы владеете <b>лицензией Minecraft Java</b>, то можете указать его, в случае споров понадобится подтвердить владение!"
            + "\nЕсли вы владеете <b>лицензией Minecraft Bedrock</b>, напишите свой ник XBox.";

            reply_markup = {
                inline_keyboard: [
                    [{ text: "Не вводить никнейм", callback_data: "menu" }],
                ]
            }

            const user = getUser(ctx)
            user.state = "access"
            user.selection = selection
            saveData()
        }
    }
    const options = { reply_markup }
    edit(message, text, options);
}

/*
 * Ввод игрового имени
 */
export const enterAccess = async message => {
    const user = getUser(message)

    const reply_markup = {
        inline_keyboard: [
            [{ text: "⚡️ В главное меню", callback_data: "menu" }],
        ]
    }

    if (!user.selection) return send(message, "<b>Ошибка!</b> Свяжитесь с администрацией проекта.", { reply_markup })

    const text = message.text
    if (!text) return send(message, "Пожалуйста, отправьте свой никнейм <b>текстом!</b>", { reply_markup })
    if (!/^[A-Za-z0-9_]{3,16}$/.test(text)) return send(message, "<b>Недопустимый никнейм!</b>\nРазрешено от 3 до 16 символов, среди них - латинские буквы, цифры и нижнее подчеркивание.", { reply_markup })

    user.account = {
        username: text,
        verified: false
    }

    console.log('limited?', user.req_limit > Date.now())

    /*
     * Проверка, что запрос ранее был отправлен (таймаут 10 минут)
     */
    if (false && user.req_limit > Date.now()) {
        send(message, `✅ <b>Вы успешно указали ник!</b>\nРанее вы уже отправляли запрос.\nПожалуйста, подождите <b>как минимум 10 минут</b> для отправки нового.`, { reply_markup })
    }
    else {
        console.log('selection?', user.selection)

        /*
         * Проверка - пользователь указал, что он уже с проходкой, или нет
         */
        if (user.selection[0] === '0') {
            const answer = await ask(4, `tg:${message.from.id}:{"username":"${message.from.username}"}`)

            console.log('answer', answer)

            /*
             * Проверка - ответ от бэкенда успешный или нет (например, уже привязано)
             */
            if (!answer || answer[0] === '1') {
                if (answer.slice(2).match("Already linked")) {
                    const username = answer.slice(26).replace(/ /g, "");
                    console.log(username)
                    user.account = {
                        username,
                        verified: true
                    }
                    send(message, "✅ <b>Успешная привязка к " + username + "!</b>", { reply_markup });
                }
                else
                    send(message, "Ошибка! Пожалуйста, обратитесь к админам проекта.\nКод ошибки: " + answer.slice(2), { reply_markup })
            }
            else {
                user.req_limit = Date.now() + 1000 * 60 * 10;

                await send(message, `✅ <b>Вы успешно указали ник!</b>\nВы также указали, что <b>уже получили проходку.</b>`, { reply_markup })

                await send(message, `🪴 Чтобы привязать ваш аккаунт Telegram и получить возможность ставить скины, введите, пожалуйста, эту команду в чат на сервере:\n<code>/code ${answer.slice(2)}</code>`)
            }
        }
        else {
            await send(message, "✅ <b>Я отправил заявку админам проекта!</b>\nВремя ответа может составлять от <b>1 часа до суток.</b>", { reply_markup })

            user.req_limit = Date.now() + 1000 * 60 * 10;

            const messageIds = []

            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "✅ Принять", callback_data: "admin access allow " + message.from.id }],
                        [{ text: "💥 Отклонить", callback_data: "admin access deny " + message.from.id }],
                        [{ text: "💢 Заблокировать", callback_data: "admin access ban " + message.from.id }],
                    ]
                }
            }

            for (const ADMIN of ADMINS) {
                const response = await bot.sendMessage(ADMIN,
                    "🍄 <b>Заявка в вайтлист, ник — </b> " + text + "\n"
                    + (message.from.username ? `От @${message.from.username}` : `От ${message.from.first_name}`)
                    + ` (ID ${message.from.id})`, { parse_mode: 'HTML', ...keyboard })
                console.log(response)
                messageIds.push([ ADMIN, response.message_id ])
            }

            user.request = {
                messageIds,
                username: text,
                from: message.from
            }

            console.log('Set user request')
        }
    }

    user.selection = undefined
    user.state = null

    saveData()
}

export const handleLinkedBroadcast = async data => {
    const { username, externalId: id } = data;

    const user = getUser({ from: { id } })

    console.log('Linked user from broadcast', user)

    if (!user.account) {
        console.log('No account set, discarding')
        return;
    }

    user.account.username = username;
    user.account.verified = true;

    bot.sendMessage(id, "🎉 <b>Успех</b> — игровой профиль " + username + " успешно привязан!"
    + "\nВ скором времени вы сможете <b>загружать скины</b> и <b>менять пароль.</b>", {
        parse_mode: 'HTML'
    })
    saveData()
}

export const sendCode = async ctx => {
    const { message } = ctx
    const user = getUser(ctx)

    if (user.req_limit > Date.now()) {
        return edit(message, "⁉️ Пожалуйста, <b>подождите 10 минут</b>, прежде чем создавать новый код", {
            reply_markup: { inline_keyboard: [
                [{ text: "Сбросить никнейм", callback_data: "account-reset" }],
                [{ text: "В главное меню", callback_data: "menu" }]
            ]}
        })
    }

    user.req_limit = Date.now() + 1000 * 60 * 10;

    const answer = await ask(4, `tg:${ctx.from.id}:{"username":"${message.from.username}"}`)

    console.log(answer)

    /*
    * Проверка - ответ от бэкенда успешный или нет (например, уже привязано)
    */
    if (!answer || answer[0] === '1') {
        if (answer.slice(2).match("Already linked")) {
            const username = answer.slice(26).replace(/ /g, "");
            console.log(username)
            user.account = {
                username,
                verified: true
            }
            send(message, "✅ <b>Успешная привязка к " + username + "!</b>", { reply_markup });
        }
        else
            send(message, "Ошибка! Пожалуйста, обратитесь к админам проекта.\nКод ошибки: " + answer.slice(2), { reply_markup })
    }
    else {
        await send(message, `🪴 Чтобы привязать ваш аккаунт Telegram и получить возможность ставить скины, введите, пожалуйста, эту команду в чат на сервере:\n<code>/code ${answer.slice(2)}</code>`)
    }
}

/*
 * Ответ от администратора
 */
export const adminHandle = async (ctx, args) => {
    const { message } = ctx
    const action = args[0]
    const id = +args[1]

    console.log(args)

    if (!/^(allow|deny|ban)$/.test(action)) {
        return send(message, "Ошибка обработки. Неверный <code>ACTION</code>")
    }

    const user = getUser({from: { id } }, true)

    console.log(id, user)

    if (!user) {
        return send(message, "Ошибка обработки. <code>USER</code> не найден!")
    }

    if (!user.request) {
        return send(message, "Ошибка обработки. <code>USER</code> уже обработан!")
    }

    const keyboard = {
        reply_markup: {
            inline_keyboard: [[
                { text: "🦆 Решение принял " + ctx.from.first_name, callback_data: " " },
            ]]
        }
    }

    const from = user.request.from;

    for (const [ chat_id, message_id ] of user.request.messageIds) {
        const response = await bot.editMessageText(
            `🍄 <b>Заявка в вайтлист, ник — </b>${user.request.username}\n`
            + (from.username ? `От @${from.username}` : `От ${from.first_name}`)
            + ` (ID ${from.id})`
            + `\n\nРешение — <b>${{ allow: "ПРИНЯТЬ", deny: "ОТКЛОНИТЬ", ban: "ЗАБАНИТЬ НАХУ" }[action]}</b>`,
            { chat_id, message_id, parse_mode: 'HTML', ...keyboard })
    }

    if (action === "allow") {
        await bot.sendMessage(id, `💎 <b>Вы получили проходку! Алға играть!</b>`, { parse_mode: 'HTML' })
        if (!user.account) user.account = {
            username: user.request.username,
        };
        user.account.access = true;
        await ask(16, `whitelist-add:${user.request.username}`)
    }
    else if (action === "ban") {
        user.ban = Date.now() + 1000 * 60 * 60 * 24 * 365
    }

    user.request = undefined
    saveData()
}

const ADMINS = [ 1067953223, 7228575632 ]

