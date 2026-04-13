import heic2any from 'heic2any';
import { DEMO_MODE } from './supabase';
import { api } from './api';

const MAX_SIZE = 800;
const QUALITY = 0.82;

/** True for iPhone HEIC/HEIF uploads (type may be empty on some browsers). */
export function isHeicLike(file) {
  if (!file) return false;
  const t = (file.type || '').toLowerCase();
  const n = (file.name || '').toLowerCase();
  return t === 'image/heic' || t === 'image/heif' || n.endsWith('.heic') || n.endsWith('.heif');
}

/**
 * Converts HEIC/HEIF to JPEG so canvas, <img> preview, and Supabase accept the file.
 */
export async function normalizeImageFileForMenu(file) {
  if (!file || !isHeicLike(file)) return file;
  const result = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  const base = (file.name || 'photo').replace(/\.(heic|heif)$/i, '') || 'photo';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= MAX_SIZE && height <= MAX_SIZE) {
        resolve(file);
        return;
      }
      const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Resize failed'))),
        'image/webp',
        QUALITY,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Invalid image')); };
    img.src = url;
  });
}

const BUCKET_HINT =
  'If upload fails, create the "menu-images" bucket (see supabase/migrations/005_storage_menu_images.sql).';

function extFromFile(file) {
  const n = (file?.name || '').toLowerCase();
  if (n.endsWith('.png')) return 'png';
  if (n.endsWith('.webp')) return 'webp';
  if (n.endsWith('.gif')) return 'gif';
  return 'jpg';
}

function blobToBase64Payload(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const s = reader.result;
      if (typeof s !== 'string') return reject(new Error('Could not read image'));
      const i = s.indexOf(',');
      resolve(i >= 0 ? s.slice(i + 1) : s);
    };
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadMenuImage(file, restaurantId) {
  if (DEMO_MODE) throw new Error('Image upload is not available in demo mode.');
  if (!file) throw new Error('No file selected');

  let working = await normalizeImageFileForMenu(file);

  let uploadBody;
  let contentType;
  let ext;

  try {
    uploadBody = await resizeImage(working);
    contentType = uploadBody instanceof Blob && uploadBody.type ? uploadBody.type : 'image/webp';
    ext = contentType.includes('webp') ? 'webp' : extFromFile(working);
  } catch {
    uploadBody = working;
    contentType = working.type || 'image/jpeg';
    ext = extFromFile(working);
  }

  const bodyBlob = uploadBody instanceof Blob ? uploadBody : working;
  const content_base64 = await blobToBase64Payload(bodyBlob);

  try {
    const { publicUrl } = await api.uploadMenuImage({
      restaurant_id: restaurantId,
      content_base64,
      content_type: contentType,
      filename: working.name || `menu.${ext}`,
    });
    return publicUrl;
  } catch (e) {
    const msg = e?.message || 'Upload failed';
    throw new Error(
      /bucket|not found|invalid/i.test(msg) ? `${msg} ${BUCKET_HINT}` : msg,
    );
  }
}
