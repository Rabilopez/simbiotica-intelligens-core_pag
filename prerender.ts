import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toAbsolute = (p: string) => path.resolve(__dirname, p);

// Read the template built by the client build
const templatePath = toAbsolute('dist/index.html');
const template = fs.readFileSync(templatePath, 'utf-8');

// Load the server entry
// @ts-ignore
const { render } = await import('./dist-server/entry-server.js');

// Render the app to a string
const hoistedTagsRegex = /^(<[A-Za-z0-9\-_]+[^>]*>[\s\S]*?(?:<\/[A-Za-z0-9\-_]+>)?)+/i; // Maybe we match simply any elements outside the main element? Wait, React 19 always outputs them at the very beginning.

// Let's do a more robust string manipulation:
const rawAppHtml = render();

// React 19 injects tags like <link ... />, <style>...</style>, etc., at the beginning of the server-rendered string.
// They are supposed to go in the <head>. We extract anything before the first matching actual structural tag (e.g. <div).
// Since our root component usually renders a <main> or a <div class=... or etc, let's find the first tag that is NOT one of link, style, meta, title, script.
// A simpler robust way:
let appHtml = rawAppHtml;
let hoistedTags = '';

// Find all hoisted tags using a while loop over the start of the string
const tryExtractTag = () => {
    const match = appHtml.match(/^(<link[^>]*>|<meta[^>]*>)/i);
    if (match) {
        hoistedTags += match[0];
        appHtml = appHtml.substring(match[0].length);
        return true;
    }
    const match2 = appHtml.match(/^(<style[^>]*>[\s\S]*?<\/style>|<title[^>]*>[\s\S]*?<\/title>|<script[^>]*>[\s\S]*?<\/script>)/i);
    if (match2) {
        hoistedTags += match2[0];
        appHtml = appHtml.substring(match2[0].length);
        return true;
    }
    return false;
};

// Also strip out any whitespace that might be there
appHtml = appHtml.trimStart();
while (tryExtractTag()) {
    appHtml = appHtml.trimStart();
}

// Inject the rendered HTML into the template
let html = template.replace('<!--app-html-->', appHtml);

// Inject hoisted tags into the head if found
if (hoistedTags) {
  html = html.replace('</head>', `${hoistedTags}\n  </head>`);
}

// Write the fully rendered page back
fs.writeFileSync(templatePath, html);
console.log('Pre-rendering completed successfully.');
