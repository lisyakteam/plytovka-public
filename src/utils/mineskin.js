import path from 'path';
import { mkdir } from 'fs/promises';

const UPLOAD_PATH = process.env.SKINS_UPLOAD_PATH || '/var/www/html/skins';
const WEB_URL = process.env.SKINS_WEB_URL || 'https://lisyak.net/skins';
const API_KEY = process.env.MINESKIN_API_KEY || '';

const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'User-Agent': 'Plytovka/1.0'
}

async function waitForJob(jobId) {
    const maxRetries = 10;

    for (let i = 0; i < maxRetries; i++) {
        await Bun.sleep(1000 + (i * 250));

        console.log('Try:', (i + 1) + '/' + maxRetries)

        try {
            const res = await fetch(`https://api.mineskin.org/v2/queue/${jobId}`, {
                method: 'GET',
                headers
            });

            if (res.status === 404) continue;
            if (!res.ok) throw new Error(`Status check failed: ${res.status}`);

            const { status, skin, job } = await res.json();

            if (job.status === 'completed') {
                return skin;
            } else if (job.status === 'failed') {
                throw new Error('Mineskin generation failed');
            }
        } catch (e) {
            console.error(`Mineskin polling error (try ${i}):`, e.message);
        }
    }
    throw new Error('Mineskin queue timeout');
}

function translit(str) {
    const map = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
        ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
        н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
        ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
        ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya"
    };

    return str.replace(/[а-яё]/gi, char => {
        const lower = char.toLowerCase();
        const translated = map[lower] || char;
        return char === lower
        ? translated
        : translated.charAt(0).toUpperCase() + translated.slice(1);
    });
}

export async function processSkin(buffer, userSkinName, variant = 'classic') {
    const fileId = crypto.randomUUID().replace(/-/g, '');

    userSkinName = translit(userSkinName);

    const form = new FormData();
    form.append('file', new Blob([buffer]), 'skin.png');
    form.append('variant', variant);
    form.append('name', userSkinName);
    form.append('visibility', 'public');

    try {
        const queueRes = await fetch('https://api.mineskin.org/v2/queue', {
            method: 'POST',
            headers,
            body: form
        });

        if (!queueRes.ok) {
            const errText = await queueRes.text();
            throw new Error(`Queue error ${queueRes.status}: ${errText}`);
        }

        const queueData = await queueRes.json();
        const jobId = queueData.job.id;

        const skin = await waitForJob(jobId);

        console.log(skin)

        if (!skin?.texture?.data) throw new Error('No texture data in result');

        const { value, signature } = skin.texture.data;
        const url = skin.texture.url?.skin;

        const jsonContent = JSON.stringify({
            timestamp: Date.now(),
            profileId: skin.uuid,
            profileName: userSkinName,
            textures: {
                SKIN: {
                    url: url,
                    metadata: { model: variant }
                }
            },
            value,
            signature
        });

        await mkdir(UPLOAD_PATH, { recursive: true });
        await Bun.write(path.join(UPLOAD_PATH, `${fileId}.json`), jsonContent);

        return `${WEB_URL}/${fileId}.json`;

    } catch (error) {
        console.error('Mineskin process error:', error);
        throw error;
    }
}
