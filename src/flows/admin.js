import { send, edit } from '../utils/chat'
import { getUser, saveData, getData } from '../data'
import bot from '../index.js'
import { addLog } from '../index.js'

export const setRules = async (msg, text) => {
    if (!getData().settings) getData().settings = {}
    const settings = getData().settings

    const final = []
    const lines = text.split('\n')
    const buttons = []

    for (const line of lines) {
        if (line.startsWith("кнопка ")) {
            const parts = line.split(" ")
            let url
            let btnText = []
            for (const part of parts.slice(1)) {
                if (part.startsWith("http")) url = part;
                else btnText.push(part);
            }
            buttons.push([
                { text: btnText.join(' '), url }
            ]);
        }
        else final.push(line)
    }

    if (msg.photo) {
        const image = msg.photo.sort((x,y) => x.file_size > y.file_size)[0].file_id;

        getData().settings.rules = {
            text: final.join("\n"),
            image,
            buttons
        }
    }
    else getData().settings.rules = {
        text: final.join("\n"),
        buttons
    }

    saveData();

    send(msg, "⚡️ Правила обновлены!");
}

const sentChatRules = {}

export const sendRules = async msg => {
    const settings = getData().settings || {};
    const chatId = msg.chat.id;
    const { text, buttons, image } = settings.rules || {};

    if (!text) return send(msg, "Правила не были установлены!");

    const previous = sentChatRules[chatId];
    if (previous) {
        clearTimeout(previous.timeout)
        await bot.deleteMessage(chatId, previous.messageId)
    }

    const special = { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } }
    const final = text + "\n<tg-emoji emoji-id=\"5327851654458910192\">👍</tg-emoji> <i>Сообщение будет удалено через 40 сек...</i>"

    let message;
    if (image) message = await bot.sendPhoto(chatId, image, { caption: final, ...special });
    else message = await send(msg, final, special);

    const timeout = setTimeout(() => {
        bot.deleteMessage(chatId, message.message_id);
        sentChatRules[chatId] = null;
    }, 40 * 1000)

    sentChatRules[chatId] = {
        messageId: message.message_id, timeout
    }
}

const PERMS = [ "mute", "warn" ]

export const swapPerms = async (msg, perm) => {
    if (!PERMS.includes(perm)) return send(msg, "❗️ Доступные: " + PERMS.map(x => x.toUpperCase()).join(', '));

    const to = msg.reply_to_message;
    if (!to?.from) return send(msg, "❗️ Вы должны <b>ответить</b> на сообщение того, кому выдаете право");

    const user = getUser(to);
    if (!user.access) user.access = [];

    const idx = user.access.indexOf(perm.toUpperCase());

    if (idx !== -1) {
        user.access.splice(idx, 1);
        send(msg, "✨ Право снято!");
    } else {
        user.access.push(perm.toUpperCase());
        send(msg, "✨ Право выдано!");
    }

    saveData();
}

const parseTime = (str) => {
    const units = { 's': 1, 'm': 60, 'h': 3600, 'd': 86400, 'w': 604800 };
    const match = str.match(/(\d+)([smhdw])/);
    if (!match) return null;
    return parseInt(match[1]) * units[match[2]];
};

const applyMute = async (msg, targetId, firstName, durationSeconds, reason, moderId) => {
    const untilDate = Math.floor(Date.now() / 1000) + durationSeconds;
    const networkChats = getData().settings.networkChats || [];
    const durationText = durationSeconds === 43200 ? "12h" : `${durationSeconds}s`;

    const tasks = [];
    networkChats.forEach(chat_id => {
        tasks.push(() => bot.restrictChatMember(chat_id, targetId, {
            permissions: { can_send_messages: false },
            until_date: untilDate
        }));
        tasks.push(() => bot._request('setChatMemberTag', {
            form: { chat_id, user_id: targetId, tag: "Ограничен" }
        }));
    });

    send(msg,
         `✨ <b><a href="tg://user?id=${targetId}">${firstName}</a></b> ограничен\n` +
         `⏰ <b>Срок:</b> ${durationText}\n` +
         `📝 <b>Причина:</b> ${reason}\n` +
         `🌐 <b>Охват:</b> ${networkChats.length} чатов\n`
    );

    addLog(`❗️ Мут <a href="tg://user?id=${targetId}">${firstName}</a> от ${msg.from.first_name} по причине ${reason} на ${durationSeconds} сек.`)

    for (const task of tasks) {
        await task().catch(console.error);
        await new Promise(res => setTimeout(res, 100));
    }

    const targetUser = getUser({ from: { id: targetId } });
    targetUser.mute = { until: untilDate, reason, by: moderId };
    saveData();

    setTimeout(async () => {
        for (const chat_id of networkChats) {
            await bot._request('setChatMemberTag', { form: { chat_id, user_id: targetId } }).catch(console.error);
            await new Promise(res => setTimeout(res, 200));
        }
    }, durationSeconds * 1000);
};

export const mute = async (msg, moder) => {
    if (!moder.access?.includes('MUTE')) return send(msg, "❗️ Нет права: <b>MUTE</b>");

    const to = msg.reply_to_message;
    if (!to?.from) return send(msg, "❗️ Ответьте на сообщение пользователя");

    const args = msg.text.split(' ').slice(1);
    if (args.length < 1) return send(msg, "❗️ Формат: <code>/mute [время] [причина]</code>");

    const durationSeconds = parseTime(args[0]);
    if (!durationSeconds) return send(msg, "❗️ Неверный формат времени");

    bot.deleteMessage(msg.chat.id, msg.message_id);
    await applyMute(msg, to.from.id, to.from.first_name, durationSeconds, args.slice(1).join(' ') || "не указана", moder.id);
};

export const warn = async (msg, moder) => {
    if (!moder.access?.includes('WARN')) return send(msg, "❗️ Нет права: <b>WARN</b>");

    const to = msg.reply_to_message;
    if (!to?.from) return send(msg, "❗️ Ответьте на сообщение пользователя");

    bot.deleteMessage(msg.chat.id, msg.message_id);

    const targetUser = getUser(to);
    targetUser.warns = (targetUser.warns || 0) + 1;
    const reason = msg.text.split(' ').slice(1).join(' ') || "не указана";

    addLog(`❗️ Варн <a href="tg://user?id=${to.from.id}">${to.from.first_name}</a> от ${msg.from.first_name} по причине ${reason}`)

    if (targetUser.warns >= 3) {
        targetUser.warns = 0;
        saveData();
        await applyMute(msg, to.from.id, to.from.first_name, 43200, "3/3 варнов: " + reason, moder.id);
    } else {
        saveData();
        send(msg,
             `⚠️ <b><a href="tg://user?id=${to.from.id}">${to.from.first_name}</a></b> получил варн!\n` +
             `🔢 <b>Варны:</b> ${targetUser.warns}/3\n` +
             `📝 <b>Причина:</b> ${reason}`
        );
    }
};
