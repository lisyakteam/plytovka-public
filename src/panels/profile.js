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
        if (response[0] === "1") return send(ctx.message, "Ошибка: " + response.slice(2));
        user.account = undefined
        saveData()
        return edit(ctx.message, `Игровой профиль отвязан!`, { reply_markup: { inline_keyboard: [[{ text: "В главное меню", callback_data: "menu" }]] } });
    }

    const options = { reply_markup: { inline_keyboard: getMenu(ctx) } }
    return edit(ctx.message, `⚡️ <b>Ваш игровой профиль</b>\n\nНик: <b>${user.account.username}</b>`, options);
}

const backToSkins = { reply_markup: { inline_keyboard: [[{ text: "👈🏻 К скинам", callback_data: "skins" }]] } }

async function handleFile(msg, user, skinName, isUpdate) {
    const photo = msg.document
    if (!photo || photo.mime_type !== 'image/png') return send(msg, "Отправьте изображение скина в виде <b>файла!</b>\nРазрешенные форматы: <b>ТОЛЬКО .png</b>", backToSkins);

    const statusMsg = await send(msg, "⏳ <b>Загрузка...</b>\nЭто может занять до 30 секунд.", backToSkins);

    try {
        const fileLink = await bot.getFileLink(photo.file_id);

        const res = await fetch(fileLink);
        const buffer = await res.arrayBuffer();

        const fileName = `${user.account.username}_${skinName}`;
        const publicUrl = await processSkin(buffer, fileName);

        const actionId = isUpdate ? 21 : 19;
        const response = await ask(actionId, `${user.account.username}:${skinName}:${publicUrl}`);

        if (response[0] === '1') {
            return edit(statusMsg, `❌ <b>Ошибка сервера:</b> ${response.slice(2)}`, backToSkins);
        }

        user.state = null;
        return edit(statusMsg, `✅ <b>Скин ${isUpdate ? 'обновлен' : 'установлен'}!</b>\nИмя: <code>${skinName}</code>\nВ игре: <code>/skin ${skinName}</code>`, backToSkins);

    } catch (e) {
        const errText = e.message === 'Too many requests' ? 'Очередь переполнена, попробуйте через минуту.' : 'Ошибка внешнего API.';
        console.error(e)
        return edit(statusMsg, `❌ <b>Не удалось загрузить:</b> ${errText}`, backToSkins);
    }
}

export const uploadSkin = async (msg) => {
    const user = getUser(msg)

    if (user.state === "skin-upload-img") {
        user.selection = { msg: msg }
        user.state = "skin-upload-name"

        const photo = msg.document
        if (!photo || photo.mime_type !== 'image/png') return send(msg, "Отправьте изображение скина в виде <b>файла!</b>\nРазрешенные форматы: <b>ТОЛЬКО .png</b>", backToSkins);

        return send(msg, "<b>Отлично!</b> Теперь введите название для скина (до 15 символов)", backToSkins);
    }

    if (user.state === "skin-upload-name") {
        const name = msg.text?.replace(/ /g,'-')
        if (!name || name.match(/[^a-zA-Z0-9-_]/)) return send(msg, "Только латиница, цифры, - и _", backToSkins);
        if (name.length > 15) return send(msg, "Слишком длинное название!", backToSkins);

        user.tempName = name;
        user.state = "skin-upload-process";

        const prevMsg = user.selection.msg;
        return handleFile(prevMsg, user, name, false);
    }

    if (user.state === "skin-update-img") {
        return handleFile(msg, user, user.tempName, true);
    }
}

export const handleSkins = async (ctx, args) => {
    const user = getUser(ctx)
    if (!user.account?.verified) return;

    if (args[0] === "upload") {
        user.state = "skin-upload-img"
        return edit(ctx.message, `📤 <b>Загрузка нового скина</b>\nОтправьте скин файлом, а не изображением.\nРазрешенные форматы: <b>ТОЛЬКО .png</b>`, backToSkins)
    }

    if (args[0] === "manage") {
        const name = args[1];
        if (!name) return;

        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🖼 Обновить файл", callback_data: `skins update_img ${name}` }],
                    [{ text: "🗑 Удалить", callback_data: `skins delete ${name}` }],
                    [{ text: "👈🏻 Назад", callback_data: "skins" }]
                ]
            }
        }
        return edit(ctx.message, `⚙️ <b>Управление скином: ${name}</b>\nВыберите действие:`, opts);
    }

    if (args[0] === "delete") {
        const name = args[1];
        const res = await ask(20, `${user.account.username}:${name}`);
        if (res[0] === '1') return send(ctx.message, `Ошибка удаления: ${res.slice(2)}`);
        return handleSkins(ctx, []);
    }

    if (args[0] === "update_img") {
        user.tempName = args[1];
        user.state = "skin-update-img";
        return edit(ctx.message, `🔄 <b>Обновление скина ${args[1]}</b>\nОтправьте новый файл (.png):`, backToSkins);
    }

    const skinsRaw = await ask(18, `${user.account.username}`);
    if (skinsRaw[0] === "1") return send(ctx.message, "Ошибка получения списка.");

    const skins = JSON.parse(skinsRaw.slice(2));

    const buttons = skins.map(s => [{ text: s.name, callback_data: `skins manage ${s.name}` }]);
    buttons.push([{ text: "➕ Загрузить новый", callback_data: "skins upload" }]);
    buttons.push([{ text: "В профиль", callback_data: "profile" }]);

    return edit(ctx.message, `📂 <b>Ваши скины (${skins.length})</b>\nНажмите на название для управления:`, { reply_markup: { inline_keyboard: buttons } });
}
