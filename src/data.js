import fs from 'node:fs'

const data = loadData()

export const getData = () => { return data }

export const saveData = () => {
    fs.writeFileSync('./data.json', JSON.stringify(data, null, 1))
}

export const getUser = (m, strict = false) => {
    const id = m.from.id

    if (!data[id]) {
        if (strict) throw new Error("Ошибка: пользователь не найден!")
        data[id] = {
            name: m.from.first_name,
            tag: m.from.username,
            state: null,
        }
        console.log('New user:', data[id])
    }
    return data[id]
}

setInterval(() => {
    saveData()
}, 30 * 1000)

function loadData() {
    if (!fs.existsSync('./data.json')) return {}
    try {
        return JSON.parse(fs.readFileSync('./data.json'))
    }
    catch (err) {
        console.error(err)
        return {}
    }
}
