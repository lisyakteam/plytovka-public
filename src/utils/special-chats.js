import { send, edit } from '../utils/chat'
import { saveData, getData } from '../data'

// logsChatId
// minecraftLinkChatId

const nameToKey = {
    "logs": "logsChatId",
    "link": "minecraftLinkChatId"
}

const body = msg => ({ message_thread_id: msg.message_thread_id })

export const setupSpecialChat = async msg => {
    const chatId = msg.chat.id;
    const text = msg.text.slice(msg.text.indexOf(' ') + 1);

    const key = nameToKey[text];

    if (!key) return send(msg, "❗️ <b>Такого типа чата нет!</b>\nРазрешенные значения: <b>" + Object.keys(nameToKey).join(', ') + "</b>", body(msg));

    if (!getData().settings) getData().settings = {};

    getData().settings[key] = chatId;
    saveData();
    return send(msg, "✅ <b>Успешно</b>!\nСервисный тип чата установлен: " + text, body(msg))
}

export const setupServerChatTopic = async msg => {
    const chatId = msg.chat.id;
    const topicId = msg.message_thread_id;
    const text = msg.text.slice(msg.text.indexOf(' ') + 1);

    if (!getData().settings) getData().settings = {};
    const settings = getData().settings;

    if (!text.length) return;
    if (!topicId) return send(msg, "❗️ Это можно сделать только в topic'е!", body(msg));
    if (settings.minecraftLinkChatId !== chatId) return send(chatId, "❗️ Это можно сделать только в чате, где настроен Minecraft Link", body(msg));

    if (!settings.serverChatTopics) settings.serverChatTopics = [];

    settings.serverChatTopics = settings.serverChatTopics.filter(x => x.id !== topicId);
    settings.serverChatTopics.push({
        id: topicId,
        name: text
    })

    saveData();
    return send(msg, "✅ <b>Успешно</b>!\nИгровой сервер для Telegram Link установлен: " + text, body(msg))
}
