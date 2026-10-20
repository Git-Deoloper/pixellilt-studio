/** Pure data/policy helpers: browser-independent and unit-tested. */
export const LIMITS = Object.freeze({
  maxFiles: 20,
  maxFileBytes: 30 * 1024 * 1024,
  maxTotalBytes: 150 * 1024 * 1024,
  maxSourcePixels: 50_000_000,
  maxOutputPixels: 36_000_000,
  maxEdge: 8192,
});
export const OUTPUT_TYPES = Object.freeze({
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
});
export const INPUT_TYPES = Object.freeze(['image/jpeg','image/png','image/webp','image/avif','image/gif','image/bmp']);

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const sizes = ['KB','MB','GB','TB'];
  let number = bytes / 1024;
  let index = 0;
  while (number >= 1024 && index < sizes.length - 1) { number /= 1024; index++; }
  return `${number >= 10 ? number.toFixed(1) : number.toFixed(2)} ${sizes[index]}`;
}
export function isSupportedFile(file) {
  return !!file && INPUT_TYPES.includes(file.type.toLowerCase()) && file.size > 0 && file.size <= LIMITS.maxFileBytes;
}
export function fileIssue(file) {
  if (!file || typeof file.size !== 'number') return 'This is not a readable file.';
  if (!INPUT_TYPES.includes(String(file.type).toLowerCase())) return 'Unsupported format. Try JPG, PNG, WebP, AVIF, GIF, or BMP.';
  if (!file.size) return 'Empty files cannot be processed.';
  if (file.size > LIMITS.maxFileBytes) return 'Each image must be 30 MB or smaller.';
  return null;
}
export function normalizedStem(name) {
  const base = String(name || 'image').split(/[\\/]/).pop().replace(/\.[^.]*$/, '');
  const clean = base.normalize('NFKC').replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '').replace(/\s+/g, '-').replace(/^\.+|\.+$/g, '').slice(0, 72);
  return clean || 'image';
}
export function planDimensions(width, height, maxEdge = 0) {
  if (![width,height,maxEdge].every(Number.isFinite) || width <= 0 || height <= 0 || maxEdge < 0) {
    throw new RangeError('Invalid image dimensions');
  }
  if (width * height > LIMITS.maxSourcePixels) throw new RangeError('Source image exceeds the 50 MP safety limit');
  const ceiling = maxEdge || LIMITS.maxEdge;
  const factor = Math.min(1, ceiling / Math.max(width,height), LIMITS.maxEdge / Math.max(width,height), Math.sqrt(LIMITS.maxOutputPixels / (width * height)));
  return {width: Math.max(1, Math.round(width * factor)), height: Math.max(1, Math.round(height * factor))};
}
export function validateSettings(settings) {
  const format = String(settings.format || 'webp');
  if (!Object.hasOwn(OUTPUT_TYPES, format)) throw new RangeError('Invalid output format');
  const quality = Number(settings.quality);
  if (!Number.isFinite(quality) || quality < 40 || quality > 100) throw new RangeError('Quality must be between 40 and 100');
  const edge = Number(settings.maxEdge);
  if (!Number.isInteger(edge) || ![0, 640, 1200, 1920, 2560, 4096].includes(edge)) throw new RangeError('Invalid size preset');
  return {format, quality, maxEdge: edge};
}
export function outputName(name, format, usedNames = new Set()) {
  const extension = format === 'jpeg' ? 'jpg' : format;
  const stem = normalizedStem(name);
  let candidate = `${stem}.${extension}`;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) candidate = `${stem}-${suffix++}.${extension}`;
  usedNames.add(candidate.toLowerCase());
  return candidate;
}
export function savingsPercentage(before, after) {
  if (!before || !Number.isFinite(before) || !Number.isFinite(after)) return 0;
  return Math.round((1 - after / before) * 100);
}
