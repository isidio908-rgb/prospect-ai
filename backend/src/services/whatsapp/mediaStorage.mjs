import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
import crypto from 'node:crypto';

// Segue o mesmo padrão de data/inputs e data/outputs já usado no projeto.
const MEDIA_DIR = resolve('data/whatsapp-media');

const EXTENSION_BY_MIMETYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'audio/ogg': '.ogg',
  'audio/ogg; codecs=opus': '.ogg',
  'audio/mpeg': '.mp3',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

/**
 * Salva um conteúdo base64 (com ou sem prefixo data-URI) em disco e retorna
 * o caminho relativo a ser guardado no banco (nunca o caminho absoluto).
 */
export async function saveBase64Media(base64Content, { mimetype, suggestedName } = {}) {
  if (!base64Content) return null;

  await mkdir(MEDIA_DIR, { recursive: true });

  // Remove prefixo data-URI se presente (ex: "data:image/png;base64,....")
  const cleanBase64 = base64Content.includes('base64,')
    ? base64Content.split('base64,')[1]
    : base64Content;

  const buffer = Buffer.from(cleanBase64, 'base64');

  const extension = suggestedName && extname(suggestedName)
    ? extname(suggestedName)
    : EXTENSION_BY_MIMETYPE[mimetype] || '.bin';

  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const absolutePath = join(MEDIA_DIR, fileName);

  await writeFile(absolutePath, buffer);

  // Caminho relativo, portável entre ambientes (dev/produção/Docker)
  return join('data/whatsapp-media', fileName).replace(/\\/g, '/');
}

/**
 * Lê um arquivo de mídia salvo e retorna como base64 (útil para reenviar ou
 * exibir no frontend sem expor o caminho de disco).
 */
export async function readMediaAsBase64(relativePath) {
  if (!relativePath) return null;
  const absolutePath = resolve(relativePath);
  const buffer = await readFile(absolutePath);
  return buffer.toString('base64');
}

export function getAbsolutePath(relativePath) {
  return resolve(relativePath);
}
