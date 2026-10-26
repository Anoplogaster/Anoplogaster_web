// Hash the final Hugo output, never templates or pre-minification source.
// This only adds monitored policies. Existing enforced headers stay byte-for-byte.
import {createHash, randomUUID} from 'node:crypto';
import {readFile, readdir, realpath, rename, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';

const BEGIN = '# BEGIN GENERATED CSP REPORT-ONLY (scripts/lib/csp-report-only.mjs)';
const END = '# END GENERATED CSP REPORT-ONLY';
const HEADER = 'Content-Security-Policy-Report-Only';
const normalize = text => text.replace(/\r\n?/g, '\n').replace(/\0/g, '\ufffd');
const hash = text => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
const sorted = values => [...new Set(values)].sort();
const NAMED = Object.freeze({
  amp: '&', AMP: '&', lt: '<', LT: '<', gt: '>', GT: '>',
  quot: '"', QUOT: '"', apos: "'", Tab: '\t', NewLine: '\n',
  colon: ':', semi: ';', sol: '/', bsol: '\\', equals: '=',
  lpar: '(', rpar: ')', ast: '*', comma: ',', period: '.',
  num: '#', percnt: '%', plus: '+', hyphen: '\u2010', nbsp: '\u00a0',
});
const LEGACY = new Set(['amp', 'AMP', 'lt', 'LT', 'gt', 'GT', 'quot', 'QUOT', 'nbsp']);
const WINDOWS_1252 = new Map([
  [128, 8364], [130, 8218], [131, 402], [132, 8222], [133, 8230],
  [134, 8224], [135, 8225], [136, 710], [137, 8240], [138, 352],
  [139, 8249], [140, 338], [142, 381], [145, 8216], [146, 8217],
  [147, 8220], [148, 8221], [149, 8226], [150, 8211], [151, 8212],
  [152, 732], [153, 8482], [154, 353], [155, 8250], [156, 339],
  [158, 382], [159, 376],
]);

// Attributes are hashed after HTML character-reference decoding. The small
// decoder deliberately refuses unfamiliar named references rather than emit
// an incorrect allow-hash; it does not evaluate markup or JavaScript.
function decodeAttribute(text, file) {
  return text.replace(/&(#(?:x[\da-f]+|\d+);?|[a-z][\da-z]*;?)/gi, (whole, entity, offset) => {
    if (entity[0] === '#') {
      const hex = /^#x/i.test(entity);
      let number = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      if (!number || number > 0x10ffff || (number >= 0xd800 && number <= 0xdfff)) number = 0xfffd;
      return String.fromCodePoint(WINDOWS_1252.get(number) ?? number);
    }
    const terminated = entity.endsWith(';');
    const name = terminated ? entity.slice(0, -1) : entity;
    if (!Object.hasOwn(NAMED, name)) throw new Error(`Unsupported HTML attribute character reference in ${file}; review before hashing`);
    if (!terminated) {
      if (!LEGACY.has(name)) throw new Error(`Ambiguous HTML attribute character reference in ${file}`);
      if (/[=\da-z]/i.test(text[offset + whole.length] ?? '')) return whole;
    }
    return NAMED[name];
  });
}

function attributes(source, file) {
  const result = new Map();
  let position = 0;
  while (position < source.length) {
    while (/\s/.test(source[position] ?? '') && position < source.length) position++;
    if (position >= source.length || /^\/\s*$/.test(source.slice(position))) break;
    const start = position;
    while (position < source.length && !/[\s=/>]/.test(source[position])) position++;
    if (position === start) throw new Error(`Malformed HTML attribute in ${file}`);
    const name = source.slice(start, position).toLowerCase();
    while (position < source.length && /\s/.test(source[position])) position++;
    let value = '';
    if (source[position] === '=') {
      position++;
      while (position < source.length && /\s/.test(source[position])) position++;
      const quote = source[position];
      if (quote === '"' || quote === "'") {
        const end = source.indexOf(quote, ++position);
        if (end < 0) throw new Error(`Unclosed HTML attribute in ${file}`);
        value = source.slice(position, end);
        position = end + 1;
      } else {
        const startValue = position;
        while (position < source.length && !/\s/.test(source[position])) position++;
        value = source.slice(startValue, position);
      }
    }
    if (/^on[a-z]/.test(name)) throw new Error(`Inline event attribute ${name} found in ${file}; externalize before publishing`);
    // As in HTML parsing, the first duplicate attribute takes precedence.
    if (!result.has(name)) result.set(name, value);
  }
  return result;
}

function inventory(html, file) {
  const scripts = [], styles = [], styleAttributes = [], scriptSources = [];
  let position = 0;
  while ((position = html.indexOf('<', position)) !== -1) {
    if (html.startsWith('<!--', position)) {
      const end = html.indexOf('-->', position + 4);
      if (end < 0) throw new Error(`Unclosed HTML comment in ${file}`);
      position = end + 3;
      continue;
    }
    const opening = /^<([a-z][\da-z:-]*)\b/i.exec(html.slice(position));
    if (!opening) { position++; continue; }
    const tag = opening[1].toLowerCase();
    let end = position + opening[0].length;
    let quote = null;
    for (; end < html.length; end++) {
      const char = html[end];
      if (quote) { if (char === quote) quote = null; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end === html.length) throw new Error(`Unclosed HTML tag in ${file}`);
    const attrs = attributes(html.slice(position + opening[0].length, end), file);
    if (attrs.has('style')) styleAttributes.push(decodeAttribute(attrs.get('style'), file));
    position = end + 1;
    // Raw-text/RCDATA content must not be mistaken for nested HTML attributes.
    if (['script', 'style', 'textarea', 'title', 'xmp', 'iframe', 'noembed', 'noframes'].includes(tag)) {
      const close = new RegExp(`</${tag}(?:\\s[^>]*|\\s*)>`, 'ig');
      close.lastIndex = position;
      const match = close.exec(html);
      if (!match) throw new Error(`Unclosed ${tag} element in ${file}`);
      const body = html.slice(position, match.index);
      if (tag === 'script') {
        if (attrs.has('src')) scriptSources.push(decodeAttribute(attrs.get('src'), file));
        else scripts.push(body);
      } else if (tag === 'style') styles.push(body);
      position = close.lastIndex;
    }
  }
  return {scripts, styles, styleAttributes, scriptSources};
}

async function htmlFiles(directory, relative = '') {
  const files = [];
  for (const entry of await readdir(path.join(directory, relative), {withFileTypes: true})) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(directory, name));
    else if (entry.isSymbolicLink() && /\.html?$/i.test(entry.name)) throw new Error(`Symlinked HTML output needs review: ${name}`);
    else if (entry.isFile() && /\.html$/i.test(entry.name)) files.push(name);
  }
  return files.sort();
}

function routesFor(file) {
  // Current Hugo routes use these unambiguous, literal Netlify path characters.
  if (!/^[\da-zA-Z_./-]+$/.test(file)) throw new Error(`HTML route requires explicit review: ${file}`);
  if (file === 'index.html') return ['/', '/index.html'];
  if (file.endsWith('/index.html')) {
    const directory = '/' + file.slice(0, -'/index.html'.length);
    return [directory, `${directory}/`, `/${file}`];
  }
  const clean = '/' + file.slice(0, -'.html'.length);
  return [clean, `${clean}/`, `/${file}`];
}

async function notifierStyles(root, sources, file, cache) {
  const hashes = [], warnings = [];
  for (const source of sorted(sources)) {
    const url = new URL(source, `https://csp-build.invalid/${file}`);
    if (url.origin !== 'https://csp-build.invalid') continue;
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const requested = path.resolve(root, relative);
    if (!requested.startsWith(root + path.sep)) throw new Error(`Script path escapes generated output in ${file}`);
    let data = cache.get(requested);
    if (!data) {
      const resolved = await realpath(requested);
      if (!resolved.startsWith(root + path.sep)) throw new Error(`Script symlink escapes generated output in ${file}`);
      const code = normalize(await readFile(resolved, 'utf8'));
      const found = [];
      // Read only this known literal. Never execute or dynamically import a bundle.
      const pattern = /\b([\w$]+)\.id\s*=\s*(["'])hb-notification-styles\2\s*[,;]\s*\1\.textContent\s*=\s*`([^`]*?)`/g;
      for (const match of code.matchAll(pattern)) {
        const literal = match[3];
        if (!literal.includes('${') && !literal.includes('\\') && literal.includes('@keyframes slide-in') && literal.includes('@keyframes slide-out')) found.push(hash(literal));
      }
      data = {hashes: sorted(found), cssText: /\.style\.cssText\s*=/.test(code), unknownNotifier: code.includes('hb-notification-styles') && found.length === 0};
      cache.set(requested, data);
    }
    hashes.push(...data.hashes);
    if (data.cssText) warnings.push(`Runtime cssText in ${relative}: not broadly allowed; notification path requires browser review before enforcement`);
    if (data.unknownNotifier) warnings.push(`Notifier style literal unrecognized in ${relative}: future path requires review before enforcement`);
  }
  return {hashes: sorted(hashes), warnings: sorted(warnings)};
}

function policyFor(arcade, scriptHashes, styleHashes, attributeHashes) {
  const analytics = [
    'https://www.googletagmanager.com', 'https://www.google-analytics.com',
    'https://region1.google-analytics.com', 'https://analytics.google.com',
  ];
  const directives = [
    ['default-src', "'self'"], ['base-uri', "'self'"], ['object-src', "'none'"],
    ['frame-ancestors', arcade ? "'self'" : "'none'"],
    ['frame-src', arcade ? "'none'" : "'self'"],
    ['script-src', "'self'", ...(!arcade ? [analytics[0]] : []), ...scriptHashes],
    ['script-src-attr', "'none'"], ['style-src', "'self'", ...styleHashes],
    ['style-src-attr', ...(attributeHashes.length ? ["'unsafe-hashes'", ...attributeHashes] : ["'none'"])],
    ['img-src', "'self'", 'data:', ...(!arcade ? analytics.slice(1, 3) : [])],
    ['font-src', "'self'"], ['media-src', "'self'"],
    ['connect-src', ...(arcade ? ["'none'"] : ["'self'", ...analytics])],
    ['worker-src', arcade ? "'none'" : "'self'"], ['form-action', "'none'"],
  ];
  return directives.map(parts => parts.join(' ')).join('; ') + ';';
}

function originalHeaders(headers) {
  if (!headers.includes(BEGIN) && !headers.includes(END)) return headers;
  const start = headers.indexOf(`\n${BEGIN}\n`);
  const endMarker = `\n${END}\n`;
  const end = headers.indexOf(endMarker, start);
  if (start < 0 || end < 0 || end + endMarker.length !== headers.length || headers.indexOf(BEGIN) !== start + 1 || headers.indexOf(BEGIN, start + 2) !== -1 || headers.indexOf(END) !== end + 1 || headers.indexOf(END, end + 2) !== -1) {
    throw new Error('Generated Report-Only header section is malformed; review without overwriting');
  }
  return headers.slice(0, start);
}

/** Add exact final-output Report-Only policies and return non-sensitive evidence.
 * Call only after Hugo minification and other HTML transformations are complete.
 * No report endpoint is configured; browser checks remain necessary.
 */
export async function addReportOnlyPolicies(publicRoot) {
  const root = await realpath(publicRoot);
  const headerFile = path.join(root, '_headers');
  const base = originalHeaders(await readFile(headerFile, 'utf8'));
  if (/^\s*Content-Security-Policy-Report-Only\s*:/im.test(base)) throw new Error('Existing Report-Only policy outside generated section requires explicit scope review');
  const files = await htmlFiles(root);
  if (!files.length) throw new Error('No generated HTML found; refusing incomplete CSP output');
  const routes = new Set(), cache = new Map(), pages = [], blocks = [];
  for (const file of files) {
    const found = inventory(normalize(await readFile(path.join(root, file), 'utf8')), file);
    const arcade = file.startsWith('software/arcade/');
    const runtime = await notifierStyles(root, found.scriptSources, file, cache);
    const scriptHashes = sorted(found.scripts.map(hash));
    const styleHashes = sorted([...found.styles.map(hash), ...runtime.hashes]);
    const attributeHashes = sorted(found.styleAttributes.map(hash));
    const aliases = routesFor(file);
    const policy = policyFor(arcade, scriptHashes, styleHashes, attributeHashes);
    for (const route of aliases) {
      if (routes.has(route)) throw new Error(`Overlapping generated HTML route needs review: ${route}`);
      routes.add(route);
      blocks.push(`${route}\n  ${HEADER}: ${policy}`);
    }
    pages.push({
      file, routes: aliases, scope: arcade ? 'arcade' : 'main', status: 'REPORT-ONLY',
      inlineScriptCount: found.scripts.length, scriptHashCount: scriptHashes.length,
      inlineStyleCount: found.styles.length, styleHashCount: styleHashes.length,
      styleAttributeCount: found.styleAttributes.length, styleAttributeHashCount: attributeHashes.length,
      knownRuntimeStyleHashCount: runtime.hashes.length, inlineEventAttributeCount: 0,
      warnings: runtime.warnings,
    });
  }
  const output = `${base}\n${BEGIN}\n# Derived from final generated HTML. Monitoring only; no remote report endpoint.\n${blocks.join('\n')}\n${END}\n`;
  const temporary = path.join(root, `._headers.csp-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, output, {encoding: 'utf8', flag: 'wx'});
    await rename(temporary, headerFile);
  } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
  return {
    status: 'REPORT-ONLY', htmlPageCount: pages.length, routeCount: routes.size,
    existingHeadersPreserved: true, enforcedHeadersChanged: false,
    globalReportOnlyRule: false, remoteReportingEndpoint: false,
    browserCompatibility: 'NOT VERIFIED: inspect local violations before considering enforcement',
    pages,
  };
}
