// Mandatory post-Hugo step: sanitize public gallery copies, then hash final HTML.
// Source photographs and existing enforced headers are never changed.
import {sanitizePhotographyCopies} from './lib/photography-metadata.mjs';
import {addReportOnlyPolicies} from './lib/csp-report-only.mjs';

const publicRoot = process.argv[2] || 'public';
const metadata = await sanitizePhotographyCopies(publicRoot);
const csp = await addReportOnlyPolicies(publicRoot);
console.log(JSON.stringify({metadata, csp}, null, 2));
