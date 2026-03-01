import { send, edit } from '../utils/chat'
import { getUser, saveData } from '../data'
import { ask } from '../utils/heracles-client'
import { processSkin } from '../utils/mineskin'
import bot from '../index.js'

const getMenu = message => {
    return [
        [{ text: "⚡️ Мои скины", callback_data: "skins" }],
        [{ text: "🚫 Отвязать профиль", callback_data: "profile unlink" }],
        [{ text: "В главное меню", callback_data: "menu" }],
    ]
}

export const sendProfile = async (ctx, args) => {
    const user = getUser(ctx)
    user.state = null

    if (!user.account?.verified) return send(ctx.message, "У вас нет привязанного игрового профиля :(");

    if (args[0] === "unlink") {
        const response = await ask(7, `${user.account.username}:tg`)
        if (response[0] === "1") {
            if (response.includes("No tg account found")) {
                // ignore
            }
            else return send(ctx.message, "Ошибка: " + response.slice(2));
        }
        user.account = undefined
        saveData()
        return edit(ctx.message, `Игровой профиль отвязан!`, { reply_markup: { inline_keyboard: [[{ text: "В главное меню", callback_data: "menu" }]] } });
    }

    const options = { reply_markup: { inline_keyboard: getMenu(ctx) } }
    return edit(ctx.message, `⚡️ <b>Ваш игровой профиль</b>\n\nНик: <b>${user.account.username}</b>`, options);
}

const backToSkins = { reply_markup: { inline_keyboard: [[{ text: "👈🏻 К скинам", callback_data: "skins" }]] } }
