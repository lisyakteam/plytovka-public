import { send, edit } from '../utils/chat'
import { getUser, saveData } from '../data'
import { ask } from '../utils/heracles-client'
import { processSkin } from '../utils/mineskin'
import { renderSkinPreview } from '../utils/skin-render'
import bot from '../index.js'

import path from 'node:path';
import fs from 'node:fs';

const pendingSkins = new Map();

const backToSkins = { reply_markup: { inline_keyboard: [[{ text: "👈🏻 К скинам", callback_data: "skins" }]] } }

const deleteMsg = async (msg) => {
    if (!msg) return;
    try {
        await bot.deleteMessage(msg.chat.id, msg.message_id);
    } catch (e) {}
}

const getModelKeyboard = type => {
    return {
        inline_keyboard: [
            [
                { text: type === "slim" ? "👉🏻 Фембой" : "Фембой",
                    style: type === "slim" ? "danger" : "success",
                    callback_data: "skins skin_model slim" },
                { text: type === "classic" ? "👉🏻 Качок" : "Качок",
                    style: type === "classic" ? "success" : "danger",
                    callback_data: "skins skin_model classic" }
            ],
            [{ text: "🚀 Загрузить", callback_data: "skins skin_confirm_upload" }],
            [{ text: "❌ Отмена", callback_data: "skins" }]
        ]
    };
};

const skinUploadPrefix = `📤 <b>Добавление нового скина</b>\n`
const skinUpdatePrefix = `📤 <b>Обновление скина</b>\n`

async function handleFile(user, isUpdate) {
    const { name, msg } = user.selection;

    const photo = msg.document;
    if (!photo || photo.mime_type !== 'image/png') return send(msg, "<b>Только PNG файлы!</b>", backToSkins);

    const statusMsg = await send(msg, "🎨 <b>Генерация предпросмотра...</b>", {});

    try {
        const fileLink = await bot.getFileLink(photo.file_id);
        const res = await fetch(fileLink);
        const buffer = await res.arrayBuffer();

        const defaultModel = 'slim';
        const previewBuffer = await renderSkinPreview(buffer, true);

        pendingSkins.set(user.id, {
            buffer,
            name: name,
            model: defaultModel,
            isUpdate
        });

        await deleteMsg(statusMsg);

        await bot.sendPhoto(msg.chat.id, previewBuffer, {
            caption: `👤 <b>Настройка скина:</b> ${name}`,
            reply_markup: getModelKeyboard(defaultModel),
            parse_mode: 'HTML',
        }, {
            filename: 'preview.png',
            contentType: 'application/octet-stream'
        });

        user.state = null;

    } catch (e) {
        console.error(e);
        return edit(statusMsg, `❌ Ошибка: ${e.message}`, backToSkins);
    }
}

export const handleSkins = async (ctx, args) => {
    const user = getUser(ctx);
    if (!user.account?.verified) return;

    if (args[0] && (args[0] === 'skin_model' || args[0] === 'skin_confirm_upload')) {
        const data = pendingSkins.get(user.id);

        if (!data) {
            if (ctx.message.photo) await deleteMsg(ctx.message);
            return send(ctx.message, "⏳ Сессия истекла. Загрузите файл заново.", backToSkins);
        }

        if (args[0] === 'skin_model') {
            const newMode = args[1];
            if (data.model === newMode) return;

            data.model = newMode;
            pendingSkins.set(user.id, data);

            const newPreview = await renderSkinPreview(data.buffer, newMode === 'slim');

            /* node-telegram-bot-api sucks ass */
            const filename = (Math.random() + '.png').slice(2);
            const intermediaryFile = path.join(process.cwd(), filename);
            fs.writeFileSync(intermediaryFile, newPreview);
            const media = 'attach://' + intermediaryFile;

            try {
                await bot.editMessageMedia({
                    type: 'photo',
                    media,
                    parse_mode: 'HTML',
                    caption: `👤 <b>Настройка скина:</b> ${data.name}`
                }, {
                    chat_id: ctx.message.chat.id,
                    message_id: ctx.message.message_id,
                    reply_markup: getModelKeyboard(newMode),
                });
            } catch (e) {
                console.error(e);
            } finally {
                fs.unlinkSync(intermediaryFile);
            }
            return;
        }

        if (args[0] === 'skin_confirm_upload') {
            await deleteMsg(ctx.message);
            const statusMsg = await send(ctx.message, "⏳ <b>Отправка в очередь MineSkin...</b>", {});

            try {
                const fileName = `${user.account.username}_${data.name}`;
                const publicUrl = await processSkin(data.buffer, fileName, data.model);

                const actionId = data.isUpdate ? 21 : 19;
                const backendRes = await ask(actionId, `${user.account.username}:${data.name}:${publicUrl}`);

                if (backendRes[0] === '1') {
                    return edit(statusMsg, `❌ <b>Ошибка базы данных:</b> ${backendRes.slice(2)}`, backToSkins);
                }

                pendingSkins.delete(user.id);
                await ask(16, `add-skin:${user.account.username}:${data.name}:${publicUrl}`);
                return edit(statusMsg, `✅ <b>Готово!</b>\nУстановить скин на сервере: <code>/skin ${data.name}</code> (модель ${data.model})`, backToSkins);

            } catch (e) {
                return edit(statusMsg, `❌ <b>Ошибка API:</b> ${e.message}`, backToSkins);
            }
        }
    }

    if (args[0] === "manage") {
        const name = args[1];

        let previewUrl = null;
        let isSlim = false;

        try {
            const skinsRaw = await ask(18, `${user.account.username}`);
            if (skinsRaw[0] !== '1') {
                const skins = JSON.parse(skinsRaw.slice(2));
                const skin = skins.find(s => s.name === name);
                if (skin && skin.url) {
                    previewUrl = skin.url;//'http://127.0.0.1/skins' + skin.url.slice(skin.url.lastIndexOf('/'));
                }
            }
        } catch(e) {
            console.log(e)
        }

        const opts = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "🖼 Обновить файл", callback_data: `skins update_img ${name}` }],
                    [{ text: "🗑 Удалить", callback_data: `skins delete ${name}` }],
                    [{ text: "👈🏻 Назад", callback_data: "skins" }]
                ]
            },
            parse_mode: 'HTML'
        };

        if (previewUrl) {
            try {
                const data = await fetch(previewUrl)
                const { textures } = await fetch(previewUrl).then(x => x.json());
                const buffer = await fetch(textures.SKIN.url).then(x => x.arrayBuffer())
                const render = await renderSkinPreview(buffer, textures.SKIN.metadata.model === "slim");

                await deleteMsg(ctx.message);

                return bot.sendPhoto(ctx.message.chat.id, render, {
                    caption: `⚙️ <b>Вы настраиваете скин:</b> ${name}`,
                    ...opts
                });
            } catch (e) {
                console.log(e)
            }
        }

        const text = `⚙️ <b>Вы настраиваете скин:</b> ${name}`;
        user.selection = { name }

        if (ctx.message.photo)
            bot.editMessageCaption({ chat_id: ctx.message.chat.id, message_id: ctx.message.message_id, caption: text, ...backToSkins });
        else edit(ctx.message, text, opts);
        return;
    }

    if (args[0] === "upload") {
        user.state = "skin-upload-name";
        const text = skinUploadPrefix + `Введите название скина (a-z, а-я, 0-9, -_)`;

        if (ctx.message.photo) {
            await deleteMsg(ctx.message);
            return send(ctx.message, text, backToSkins);
        }
        return edit(ctx.message, text, backToSkins);
    }

    if (args[0] === "delete") {
        const name = args[1];

        if (ctx.message.photo) {
            await deleteMsg(ctx.message);
            const waitMsg = await send(ctx.message, "⏳ Удаление...", {});

            const res = await ask(20, `${user.account.username}:${name}`);
            if (res[0] === '1') return edit(waitMsg, `Ошибка: ${res.slice(2)}`, backToSkins);

            await deleteMsg(waitMsg);
            return handleSkins(ctx, []);
        }

        const res = await ask(20, `${user.account.username}:${name}`);
        if (res[0] === '1') return send(ctx.message, `Ошибка: ${res.slice(2)}`);
        await ask(16, `del-skin:${user.account.username}:${data.name}`);
        return handleSkins(ctx, []);
    }

    if (args[0] === "update_img") {
        user.state = "skin-update-img";
        user.selection = { name: args[1] }

        const text = skinUpdatePrefix + `Хорошо, отправьте новый файл, содержащий обновленный скин!`

        if (ctx.message.photo)
            bot.editMessageCaption(text, { chat_id: ctx.message.chat.id, message_id: ctx.message.message_id, parse_mode: 'HTML', ...backToSkins });
        else edit(ctx.message, text, backToSkins);
        return;
    }

    const skinsRaw = await ask(18, `${user.account.username}`);
    if (skinsRaw[0] === "1") return send(ctx.message, "Ошибка получения списка.");

    const skins = JSON.parse(skinsRaw.slice(2));
    const buttons = skins.map(s => [{ text: s.name, callback_data: `skins manage ${s.name}` }]);
    buttons.push([{ text: "➕ Загрузить новый", callback_data: "skins upload" }]);
    buttons.push([{ text: "В профиль", callback_data: "profile" }]);

    if (ctx.message.photo) {
        await deleteMsg(ctx.message);
        return send(ctx.message, `📂 <b>Ваши скины (${skins.length})</b>`, { reply_markup: { inline_keyboard: buttons } });
    }

    user.selection = null;

    return edit(ctx.message, `📂 <b>Ваши скины (${skins.length})</b>`, { reply_markup: { inline_keyboard: buttons } });
}

export const uploadSkin = async (msg) => {
    const user = getUser(msg);

    if (user.state === "skin-upload-img") {
        if (!msg.document
          || msg.document.mime_type !== 'image/png') return send(msg, skinUploadPrefix + "Можно отправить только файлом (документом), тип файла <b>PNG!</b>", backToSkins);

        user.selection.msg = msg;
        user.state = "skin-upload-process";

        return handleFile(user, false);
    }

    if (user.state === "skin-upload-name") {
        const name = msg.text?.replace(/ /g,'-');
        if (!name || name.match(/[^a-z0-9-_а-я]/i)) return send(msg, skinUploadPrefix + "Некорректные символы!\nНе выдумывай ничего, блин.", backToSkins);
        if (name.length < 1 || name.length > 20) return send(msg, skinUploadPrefix + "Слишком длинное название!")

        user.selection = { name };
        user.state = "skin-upload-img";

        return send(msg, skinUploadPrefix + "Теперь, отправьте .png изображение (желательно — файл) со скином", backToSkins);
    }

    if (user.state === "skin-update-img") {
        user.selection.msg = msg;

        return handleFile(user, true);
    }
}
