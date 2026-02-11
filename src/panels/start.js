import { send, edit } from '../utils/chat'

const getDate = () => {
    const date = new Date()
    return date.getDate() + ' '
    + ["января", "февраля", "марта", "апреля", "мая",
    "июня", "июля", "августа", "сентября", "октября",
    "ноября", "декабря"][date.getMonth()]
}

const startText = [
    `🌟 Приветики, <b>%USER%</b>!\n`
    + `<b>Я — Плутовка, твой проводник по серверу <a href="https://t.me/LisyakTeam">лисяк.рф</a>!</b>\n\n`
    + `Сегодня, <b>%DATE%</b>, вы можете найти Лисяка в <b>Minecraft Java</b> и <b>Bedrock</b>, а в ближайшее время мы появимся в <b>Roblox, Garry's Mod</b> и других играх!\n\n`
    + `Даже если ты ни разу не играл в Minecraft, то я обрадую — нам есть, что показать как новичкам, так и олдам "кубов"\n`
    + `<b>Первая настройка и установка игры должна занять не более 5 минут!</b>`,

    `🌟 Чтобы начать игру, установите любой <b><a href="https://ru.minecraft.wiki/w/%D0%9B%D0%B0%D1%83%D0%BD%D1%87%D0%B5%D1%80">лаунчер</a></b>\n`
    + `Если у вас ПК, то, например, <a href="https://www.minecraft.net/ru-ru">официальный от Mojang</a> или пиратский от TLauncher, или наш новый <a href="https://github.com/LisyakTeam/SkyLoader">SkyLoader Launcher</a>\n\n`
    + `Вам также нужно получить проходку — <b>она бесплатная</b>, но без нее нельзя начать игру! Таким образом мы защищаемся от <a href="https://minecraft.fandom.com/ru/wiki/%D0%93%D1%80%D0%B8%D1%84%D0%B5%D1%80%D1%81%D1%82%D0%B2%D0%BE">гриферов</a> и ботов.\n\n`
    + `Проходку можно получить, если нажмете в меню "Получить проходку".`,

    `✨ Чтобы зайти на сервер (не через SkyLoader) <b>запустите игру</b>, выберите <b>"Многопользовательский режим"</b> и <b>добавьте сервер</b> - его адрес лисяк.рф для Java или 45.144.65.145 для Bedrock`
    + `\n\nКогда вы подключитесь, вы должны будете задать пароль, я рекомендую пароль на 8 символов — такой легко запомнить.\n\n`
    + `⚡️ Если есть вопрос, вы можете создать обращение, почитать базу знаний или пойти в чат. Чтож, удачи!`,
]

export const sendStart = (index, message, isCallback) => {
    if (index < 0 || index > 2) index = 0;

    const inline_keyboard = [
        index === 2 ? [
            { text: "👍 В меню", callback_data: "menu" }
        ] : [],
        [
            ...(index > 0 ? [{ text: "✨ Назад", callback_data: "start " + (index - 1) }] : []),
            ...(index < 2 ? [{ text: "✨ Далее", callback_data: "start " + (index + 1) }] : []),
        ]
    ]

    const options = {
        reply_markup: { inline_keyboard },
        disable_web_page_preview: true
    };

    if (isCallback) edit(message, getStartText(index, message), options);
    else send(message, getStartText(index, message), options);
}

const getStartText = (index, msg) => {
    return startText[index]
        .replace('%USER%', msg.from.first_name)
        .replace('%DATE%', getDate())
        + `\n\n✉ <b>Страница вступления ${index + 1}/3</b>`
}
