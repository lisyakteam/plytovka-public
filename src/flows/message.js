import bot from '../index'
import { ADMINS, addLog } from '../index.js'

import { send, edit } from '../utils/chat'
import { sendStart } from '../panels/start'
import { enterAccess } from '../panels/access'
import { sendMenu } from '../panels/menu'
import { uploadSkin } from '../panels/skins'
import { inputText, adminTicketReply } from '../panels/tickets'

import { getUser, saveData, getData } from '../data'

import { sendMessageToGame, whitelistAction } from '../utils/game-bridge'
import { setupSpecialChat, setupServerChatTopic, markNetworkChat } from '../utils/special-chats'
import { setRules, sendRules, mute, warn, swapPerms } from '../flows/admin'

export const init = bot => {
    bot.on('message', async msg => {
        const text = msg.text || msg.caption;

        console.log(msg.from.id, msg.from.first_name, msg.from.username, text)
        addLog(`💬 ${msg.chat.id === msg.from.id ? "Личка" : msg.chat.title}: ${msg.from.first_name} (${msg.from.username || "без тега"}) ${msg.text || Object.keys(msg).filter(key => !/id|from|chat|date/.test(key))}`)

        if (msg.entities) {
            msg.entities.forEach(e => {
                if (e.type === 'custom_emoji') console.log(e.custom_emoji_id)
            })
        }

        const user = getUser(msg);
        if (user.ban) return;

        try {
            if (msg.chat.id > 0) {
                /* Обычные команды в личке */
                if (text === '/start') return sendStart(0, msg);
                else if (text === '⚡️ Открыть главное меню') return sendMenu(msg, true);
                else {
                    if (ADMINS.some(x => x === msg.from.id)) {
                        if (/^\/(add|remove) (.*)/.test(text)) return whitelistAction(msg);
                    }

                    const user = getUser(msg)
                    /* Стейты */
                    if (user?.state) {
                        if (user.state === 'access') return enterAccess(msg);
                        if (user.state === 'ticket-creation') return inputText(msg);
                        if (user.state?.startsWith('skin-')) return uploadSkin(msg);
                        /* Админские стейты */
                        if (ADMINS.some(x => x === msg.from.id)) {
                            if (user.state === 'admin-ticket-reply') return adminTicketReply(msg);
                        }
                    }
                }
            }
            else {
                if (text) {
                    if (ADMINS.some(x => x === msg.from.id)) {
                        if (/^\/(add|remove) (.*)/.test(text)) return whitelistAction(msg);
                        if (/^\/setup (.*)/.test(text)) return setupSpecialChat(msg);
                        if (/^\/mc-link (.*)/.test(text)) return setupServerChatTopic(msg);
                        if (/^\/swap-network-mode/.test(text)) return markNetworkChat(msg);
                        if (/^\/rules (.*)/.test(text)) return setRules(msg, text.slice(7));
                        if (/^\/swap-permission (.*)/.test(text)) return swapPerms(msg, text.slice(17));
                    }

                    if (text.match(/\/(me|link|top)@plytbot/)) return send(msg, "Я глупи");
                    if (/(по|)гладить/i === "погладить") return Tweaks.pat(msg);

                    const settings = getData().settings || {};
                    const chatId = msg.chat.id;

                    if (settings.networkChats?.includes(chatId)) {
                        if (/^\/rules$/.test(text)) return sendRules(msg);
                        if (/^\/mute/.test(text)) return mute(msg, user);
                        if (/^\/warn/.test(text)) return warn(msg, user);

                        if (text.match(/\/code/)) return send(msg, "Это на сервере команда глупик");
                        if (msg.chat.id === getData().settings?.minecraftLinkChatId) return sendMessageToGame(msg);
                    }
                }
            }
        } catch (err) {
            console.error(err)
        }
    })
}
