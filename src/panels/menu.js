import { send, edit } from '../utils/chat'
import { getUser } from '../data'

const getMenu = ctx => {
    const user = getUser(ctx)

    user.state = null

    const account_button = user.account ? (
        user.account.verified ?
            { text: "⚡️ Профиль " + user.account.username, callback_data: "profile" } :
            { text: "⚡️ Привязать аккаунт", callback_data: "get-code" }
    ) : { text: "⚡️ Получить проходку", callback_data: "access" }

    return [
        [ account_button ],
        [{ text: "⚡️ Мои обращения", callback_data: "tickets" }],
        [{ text: "Обновить", callback_data: "menu" }],
    ]
}

export const sendMenu = async (ctx, create_new_message) => {
    const reply_markup = {
        inline_keyboard: getMenu(ctx)
    }

    const options = { reply_markup }

    return (create_new_message ? send : edit)(ctx.message || ctx, '⚡️ Добро пожаловать в <b>меню!</b>'
    + '\n<a href="https://t.me/LisyakChat">Чат для вопросов</a> — доверяйте только админам (с метками)!'
    + '\n\n✨ <b>Как добавить свой скин?</b>'
    + '\n1. Укажите игровое имя в разделе "Получить проходку"'
    + '\n2. Вас попросят ввести шестизначный код на сервере'
    + '\n3. После успешной привязки, добавьте новый скин в разделе "Профиль"'
    + '\n\nПривязка необходима, чтобы подтвердить владение аккаунтом!',
    options);
}
