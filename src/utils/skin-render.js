import { createCanvas, Image } from '@napi-rs/canvas';

const SCALE = 10;

export async function renderSkinPreview(buffer, isSlim = false) {
    const img = new Image();

    const loadPromise = new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (err) => reject(err);
    });

    img.src = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

    await loadPromise;

    const canvas = createCanvas(16 * SCALE, 32 * SCALE);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const drawPart = (sx, sy, w, h, dx, dy) => {
        ctx.drawImage(img, sx, sy, w, h, dx * SCALE, dy * SCALE, w * SCALE, h * SCALE);
    };

    // Тело
    drawPart(20, 20, 8, 12, 4, 8);
    drawPart(20, 36, 8, 12, 4, 8);

    // Голова
    drawPart(8, 8, 8, 8, 4, 0);
    drawPart(40, 8, 8, 8, 4, 0);

    // Ноги
    drawPart(4, 20, 4, 12, 4, 20);  // Правая (на холсте слева)
    drawPart(4, 36, 4, 12, 4, 20);
    drawPart(20, 52, 4, 12, 8, 20); // Левая (на холсте справа)
    drawPart(4, 52, 4, 12, 8, 20);

    const armWidth = isSlim ? 3 : 4;

    // Руки
    drawPart(44, 20, armWidth, 12, 4 - armWidth, 8); // Правая
    drawPart(44, 36, armWidth, 12, 4 - armWidth, 8);

    drawPart(36, 52, armWidth, 12, 12, 8); // Левая
    drawPart(52, 52, armWidth, 12, 12, 8);

    return canvas.toBuffer('image/png');
}
