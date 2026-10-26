// Selective, lossless metadata cleanup for generated Photography JPEG copies.
// Never pass archival/source directories. No metadata values are logged.
import { createHash } from 'node:crypto';
import { readFile, readdir, realpath, lstat, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const EXIF = Buffer.from('Exif\0\0', 'binary');
const XMP = Buffer.from('http://ns.adobe.com/xap/1.0/\0', 'binary');
const TYPE_BYTES = new Map([[1, 1], [2, 1], [3, 2], [4, 4], [5, 8], [6, 1], [7, 1], [8, 2], [9, 4], [10, 8], [11, 4], [12, 8], [13, 4]]);
const SERIAL_TAGS = new Map([[0xa431, 'cameraBodySerial'], [0xa435, 'lensSerial'], [0xc62f, 'cameraBodySerial']]);
const POINTER_TAGS = new Map([[0x8769, 'Exif'], [0x8825, 'GPS'], [0xa005, 'Interop'], [0x014a, 'SubIFD']]);
const SERIAL_NAMESPACES = new Map([
  ['http://ns.adobe.com/exif/1.0/aux/', new Set(['SerialNumber', 'BodySerialNumber', 'CameraSerialNumber', 'LensSerialNumber'])],
  ['http://ns.adobe.com/exif/1.0/', new Set(['BodySerialNumber', 'LensSerialNumber'])],
  ['http://cipa.jp/exif/1.0/', new Set(['BodySerialNumber', 'CameraSerialNumber', 'LensSerialNumber'])],
]);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const overlaps = (a, b) => a.start < b.end && b.start < a.end;
const failure = category => { throw new Error(`Photography metadata review required: ${category}`); };
const inside = (directory, candidate) => candidate === directory || candidate.startsWith(directory + path.sep);

function jpegHeaders(bytes) {
  if (bytes.length > 20 * 1024 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8) failure('unsupported JPEG envelope');
  const segments = [];
  let offset = 2;
  while (offset < bytes.length) {
    const markerStart = offset;
    if (bytes[offset] !== 0xff) failure('malformed JPEG marker');
    while (bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) failure('truncated JPEG marker');
    const marker = bytes[offset++];
    if (marker === 0x01) continue;
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x00 || marker >= 0xd0 && marker <= 0xd7) failure('unsupported JPEG header marker');
    if (offset + 2 > bytes.length) failure('truncated JPEG segment');
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) failure('invalid JPEG segment length');
    const segment = { marker, markerStart, start: offset + 2, end: offset + length };
    if (marker === 0xda) return { segments, scanStart: markerStart };
    segments.push(segment);
    offset += length;
  }
  failure('missing JPEG scan');
}

function tiffMetadata(bytes, segment) {
  const base = segment.start + EXIF.length;
  const limit = segment.end;
  if (base + 8 > limit) failure('truncated EXIF header');
  const order = bytes.toString('ascii', base, base + 2);
  if (order !== 'II' && order !== 'MM') failure('unknown EXIF byte order');
  const little = order === 'II';
  const check = (offset, length) => {
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < base || length < 0 || offset + length > limit) failure('EXIF offset bounds');
  };
  const u16 = offset => { check(offset, 2); return little ? bytes.readUInt16LE(offset) : bytes.readUInt16BE(offset); };
  const u32 = offset => { check(offset, 4); return little ? bytes.readUInt32LE(offset) : bytes.readUInt32BE(offset); };
  if (u16(base + 2) !== 42) failure('unsupported EXIF format');
  const ifds = [], entries = [], visited = new Set();
  function walk(relative, label, depth = 0) {
    if (!relative) return;
    if (depth > 12 || visited.has(relative)) failure('ambiguous EXIF directory graph');
    visited.add(relative);
    const start = base + relative;
    const count = u16(start);
    if (count > 4096) failure('oversized EXIF directory');
    const end = start + 2 + count * 12 + 4;
    check(start, end - start);
    const directory = { start, end, count, label, entries: [], next: u32(end - 4) };
    const tags = new Set();
    for (let index = 0; index < count; index++) {
      const position = start + 2 + index * 12;
      const tag = u16(position), type = u16(position + 2), values = u32(position + 4);
      if (tags.has(tag)) failure('duplicate EXIF field');
      tags.add(tag);
      if (tag === 0x927c) failure('opaque MakerNote requires explicit review');
      const unit = TYPE_BYTES.get(type);
      if (!unit) failure('unsupported EXIF value type');
      const size = values * unit;
      const valueStart = size <= 4 ? position + 8 : base + u32(position + 8);
      check(valueStart, size);
      const entry = { tag, type, values, size, position, start: valueStart, end: valueStart + size, label };
      directory.entries.push(entry);
      entries.push(entry);
    }
    ifds.push(directory);
    for (const entry of directory.entries) {
      const kind = POINTER_TAGS.get(entry.tag);
      if (!kind) continue;
      if (![4, 13].includes(entry.type) || entry.values > 64) failure('unsupported EXIF directory pointer');
      for (let index = 0; index < entry.values; index++) walk(u32(entry.start + index * 4), `${label}/${kind}${index}`, depth + 1);
    }
    if (directory.next) walk(directory.next, `${label}/next`, depth + 1);
  }
  walk(u32(base + 4), 'IFD0');
  for (const directory of ifds) {
    for (const other of ifds) if (directory !== other && overlaps(directory, other)) failure('overlapping EXIF directories');
  }
  return { base, little, ifds, entries };
}

function preservedExif(bytes, metadata) {
  return metadata.entries.filter(entry => !SERIAL_TAGS.has(entry.tag)).map(entry => [entry.label, entry.tag, entry.type, entry.values, sha(bytes.subarray(entry.start, entry.end))]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function cleanExif(original, result, segment, privateValues, counts) {
  const metadata = tiffMetadata(original, segment);
  const before = preservedExif(original, metadata);
  for (const directory of metadata.ifds) {
    const removed = directory.entries.filter(entry => SERIAL_TAGS.has(entry.tag));
    if (!removed.length) continue;
    for (const entry of removed) {
      if (entry.type !== 2) failure('non-ASCII equipment serial');
      const value = original.subarray(entry.start, entry.end);
      const trimmed = Buffer.from(value.toString('latin1').replace(/\0+$/, ''), 'latin1');
      if (trimmed.length) {
        privateValues.push(trimmed);
        counts[SERIAL_TAGS.get(entry.tag)]++;
      }
      if (entry.size > 4) {
        if (metadata.entries.some(other => other !== entry && other.size > 4 && overlaps(entry, other)) || metadata.ifds.some(other => overlaps(entry, other))) failure('shared serial payload bounds');
        result.fill(0, entry.start, entry.end);
      }
    }
    const retained = directory.entries.filter(entry => !SERIAL_TAGS.has(entry.tag));
    if (metadata.little) result.writeUInt16LE(retained.length, directory.start);
    else result.writeUInt16BE(retained.length, directory.start);
    let target = directory.start + 2;
    for (const entry of retained) {
      original.copy(result, target, entry.position, entry.position + 12);
      target += 12;
    }
    if (metadata.little) result.writeUInt32LE(directory.next, target);
    else result.writeUInt32BE(directory.next, target);
    result.fill(0, target + 4, directory.end);
  }
  const after = tiffMetadata(result, segment);
  if (after.entries.some(entry => SERIAL_TAGS.has(entry.tag)) || JSON.stringify(before) !== JSON.stringify(preservedExif(result, after))) failure('non-target EXIF preservation check');
}

function cleanXmp(original, result, segment, privateValues, counts) {
  const start = segment.start + XMP.length;
  const text = original.toString('latin1', start, segment.end);
  const bindings = new Map();
  for (const match of text.matchAll(/xmlns:([A-Za-z_][\w.-]*)\s*=\s*(["'])([^"']+)\2/g)) {
    if (bindings.has(match[1]) && bindings.get(match[1]) !== match[3]) failure('ambiguous XMP namespace binding');
    bindings.set(match[1], match[3]);
  }
  const spans = [];
  const add = (match, prefix, localName, value) => {
    const allowed = SERIAL_NAMESPACES.get(bindings.get(prefix));
    if (!allowed?.has(localName)) failure('unsupported equipment-serial namespace');
    if (/[<>]/.test(value)) failure('structured equipment-serial value');
    if (value.trim()) privateValues.push(Buffer.from(value, 'latin1'));
    const kind = localName === 'LensSerialNumber' ? 'lensSerial' : 'cameraBodySerial';
    if (value.trim()) counts[kind]++;
    spans.push({ start: start + match.index, end: start + match.index + match[0].length });
  };
  // Only explicit equipment-serial field names are candidates. Ordinary
  // specimen identifiers, copyright, IPTC and editing provenance stay intact.
  const attribute = /\s+([A-Za-z_][\w.-]*):(SerialNumber|BodySerialNumber|CameraSerialNumber|LensSerialNumber)\s*=\s*(["'])([^"']*)\3/g;
  for (const match of text.matchAll(attribute)) add(match, match[1], match[2], match[4]);
  const element = /<([A-Za-z_][\w.-]*):(SerialNumber|BodySerialNumber|CameraSerialNumber|LensSerialNumber)\s*>([\s\S]*?)<\/\1:\2\s*>/g;
  for (const match of text.matchAll(element)) add(match, match[1], match[2], match[3]);
  const empty = /<([A-Za-z_][\w.-]*):(SerialNumber|BodySerialNumber|CameraSerialNumber|LensSerialNumber)\s*\/>/g;
  for (const match of text.matchAll(empty)) add(match, match[1], match[2], '');
  for (const span of spans) result.fill(0x20, span.start, span.end);
  if (/(?:<|\s)[A-Za-z_][\w.-]*:(?:SerialNumber|BodySerialNumber|CameraSerialNumber|LensSerialNumber)(?=[\s=/>])/i.test(result.toString('latin1', start, segment.end))) failure('unhandled equipment-serial XMP form');
  return spans;
}

export function sanitizeJpegMetadata(input) {
  const original = Buffer.from(input);
  const result = Buffer.from(input);
  const { segments, scanStart } = jpegHeaders(original);
  const privateValues = [];
  const exifRemoved = { cameraBodySerial: 0, lensSerial: 0 };
  const xmpRemoved = { cameraBodySerial: 0, lensSerial: 0 };
  const allowedSegments = new Set();
  for (const segment of segments) {
    const payload = original.subarray(segment.start, segment.end);
    if (segment.marker >= 0xe0 && segment.marker <= 0xef || segment.marker === 0xfe) {
      if (/\/Users\/|\/home\/|\/private\/|\/Volumes\/|file:\/\/\/|[A-Za-z]:\\(?:Users|Documents and Settings)\\/i.test(payload.toString('latin1'))) failure('private filesystem-path metadata');
    }
    if (segment.marker === 0xe1 && payload.subarray(0, EXIF.length).equals(EXIF)) {
      cleanExif(original, result, segment, privateValues, exifRemoved);
      allowedSegments.add(segment);
    } else if (segment.marker === 0xe1 && payload.subarray(0, XMP.length).equals(XMP)) {
      cleanXmp(original, result, segment, privateValues, xmpRemoved);
      allowedSegments.add(segment);
    } else if (segment.marker === 0xe1 && /(?:BodySerialNumber|CameraSerialNumber|LensSerialNumber|aux:SerialNumber)/.test(payload.toString('latin1'))) failure('unsupported metadata packet containing equipment serial');
  }
  for (const value of privateValues) if (value.length && result.includes(value)) failure('equipment identifier remains outside approved removal fields');
  for (const segment of segments) {
    if (!allowedSegments.has(segment) && !original.subarray(segment.markerStart, segment.end).equals(result.subarray(segment.markerStart, segment.end))) failure('unrelated JPEG segment changed');
  }
  if (result.length !== original.length || !original.subarray(scanStart).equals(result.subarray(scanStart))) failure('compressed JPEG scan preservation');
  const repeated = jpegHeaders(result);
  if (repeated.scanStart !== scanStart) failure('JPEG structure preservation');
  return {
    bytes: result,
    evidence: {
      changed: !result.equals(original), exifRemoved, xmpRemoved,
      inputSHA256: sha(original), outputSHA256: sha(result),
      bytes: result.length, compressedImageBytesUnchanged: true,
      nonTargetExifValuesUnchanged: true, unrelatedMetadataSegmentsUnchanged: true,
      privatePathCategoriesDetected: [], equipmentPayloadRemnantsDetected: false,
    },
  };
}

export async function sanitizePhotographyCopies(publicRoot) {
  const requestedRoot = path.resolve(publicRoot);
  const root = await realpath(requestedRoot);
  if (root !== requestedRoot || root === PROJECT || root === path.parse(root).root || ['assets', 'content', 'static', 'data', 'config', 'scripts', '.git', 'node_modules'].some(name => inside(path.join(PROJECT, name), root))) failure('not a generated public-output root');
  const gallery = path.join(root, 'media/photography');
  if (await realpath(gallery) !== gallery || !(await lstat(gallery)).isDirectory()) failure('non-local generated gallery');
  await readFile(path.join(root, 'index.html'));
  const html = await readFile(path.join(root, 'photography/index.html'), 'utf8');
  const figures = [...html.matchAll(/<figure\b[^>]*\bdata-photo-card\b[^>]*>/g)];
  const filenames = figures.map(([figure]) => {
    const match = /\bdata-file=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i.exec(figure);
    return match && (match[1] ?? match[2] ?? match[3]);
  });
  if (filenames.length !== 34 || new Set(filenames).size !== 34 || filenames.some(name => !name || !/^[A-Za-z0-9_. -]+\.jpe?g$/i.test(name) || path.basename(name) !== name)) failure('expected 34 unique generated gallery records');
  const actual = (await readdir(gallery)).filter(name => /\.jpe?g$/i.test(name)).sort();
  if (JSON.stringify([...filenames].sort()) !== JSON.stringify(actual)) failure('generated gallery file inventory');
  const planned = [];
  for (const file of filenames) {
    const target = path.join(gallery, file);
    const stat = await lstat(target);
    if (!stat.isFile() || stat.isSymbolicLink()) failure('non-regular generated JPEG');
    const cleaned = sanitizeJpegMetadata(await readFile(target));
    planned.push({ file, target, mode: stat.mode & 0o777, ...cleaned });
  }
  // Complete every safety/preservation check before writing any generated copy.
  for (const item of planned) {
    if (!item.evidence.changed) continue;
    const temporary = `${item.target}.metadata-clean-${process.pid}.tmp`;
    try {
      await writeFile(temporary, item.bytes, { flag: 'wx', mode: item.mode });
      await rename(temporary, item.target);
    } finally {
      await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
  }
  const sum = (group, key) => planned.reduce((total, item) => total + item.evidence[group][key], 0);
  return {
    status: 'PASS', scope: 'Generated Photography JPEG copies only; sources and gallery metadata not modified',
    imageCount: planned.length, changedImageCount: planned.filter(item => item.evidence.changed).length,
    exifRemoved: { cameraBodySerial: sum('exifRemoved', 'cameraBodySerial'), lensSerial: sum('exifRemoved', 'lensSerial') },
    xmpRemoved: { cameraBodySerial: sum('xmpRemoved', 'cameraBodySerial'), lensSerial: sum('xmpRemoved', 'lensSerial') },
    records: planned.map(item => ({ file: item.file, ...item.evidence })),
    limitations: ['Source JPEGs remain available through public GitHub source/history and any previous copies.', 'Raw Hugo builds that skip finalization do not perform this cleanup.', 'Unknown/private-path metadata fails closed for explicit review instead of being stripped indiscriminately.'],
  };
}
