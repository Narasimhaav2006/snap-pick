import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError } from './errors.js';

export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');
const MAX_BYTES = 3 * 1024 * 1024;
const FILE_RE = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

// check the real file signature, not just what the browser claims
const KINDS = {
    jpeg: { ext: 'jpg', ok: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
    png: { ext: 'png', ok: (b) => b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG' },
    webp: { ext: 'webp', ok: (b) => b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP' },
};

export async function savePhoto(dataUrl) {
    const fail = (msg) => new HttpError(400, 'Invalid photo', { photo: msg });

    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
    if (!m) throw fail('Photo must be a JPG, PNG or WebP image');

    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_BYTES) throw fail('Photo is too large');
    const kind = KINDS[m[1]];
    if (buf.length < 12 || !kind.ok(buf)) throw fail('This file is not a valid image');

    const name = `${randomBytes(16).toString('hex')}.${kind.ext}`;   // unguessable name
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, name), buf);
    return `/uploads/${name}`;
}

export async function removePhoto(url) {
    if (!url) return;
    const name = path.basename(url);
    if (FILE_RE.test(name)) await unlink(path.join(UPLOAD_DIR, name)).catch(() => { });
}

export async function clearUploads() {
    const files = await readdir(UPLOAD_DIR).catch(() => []);
    await Promise.all(
        files.filter((f) => FILE_RE.test(f)).map((f) => unlink(path.join(UPLOAD_DIR, f)).catch(() => { }))
    );
}