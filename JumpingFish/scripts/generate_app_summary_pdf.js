const fs = require("fs");
const path = require("path");

const outputDir = path.join(process.cwd(), "output", "pdf");
const tempDir = path.join(process.cwd(), "tmp", "pdfs");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const outputPath = path.join(outputDir, "app-summary-one-page.pdf");

const pageWidth = 612;
const pageHeight = 792;
const fontSize = 11;
const left = 54;
let y = 748;

const lines = [];

function escapePdfText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function addLine(text, opts = {}) {
  const size = opts.size || fontSize;
  const leading = opts.leading || (size + 4);
  const x = opts.x || left;
  const font = opts.bold ? "/F2" : "/F1";
  lines.push(`BT ${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`);
  y -= leading;
}

function addWrapped(text, opts = {}) {
  const maxChars = opts.maxChars || 86;
  const words = text.split(/\s+/);
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      addLine(current, opts);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) addLine(current, opts);
}

addLine("App Summary", { size: 20, bold: true, leading: 26 });
addLine("Repo evidence snapshot", { size: 9, leading: 18 });

addLine("What it is", { size: 13, bold: true, leading: 18 });
addWrapped(
  "Not found in repo. The repository contains no app source files, documentation, or committed history, so the app itself cannot be identified from repo evidence."
);

addLine("Who it is for", { size: 13, bold: true, leading: 18 });
addWrapped("Primary user/persona: Not found in repo.");

addLine("What it does", { size: 13, bold: true, leading: 18 });
[
  "No product features were found in tracked files.",
  "No UI, API, or service code was found in the working tree.",
  "No README or docs describing capabilities were found.",
  "No configuration files indicating integrations were found.",
  "No tests or examples demonstrating behavior were found.",
  "No git commits were present to infer prior functionality."
].forEach((item) => addWrapped(`- ${item}`));

addLine("How it works", { size: 13, bold: true, leading: 18 });
addWrapped(
  "Architecture overview: Not found in repo. Evidence available: only an empty git repository with a .git directory, no commits on branch main, and no application files to trace components, services, or data flow."
);

addLine("How to run", { size: 13, bold: true, leading: 18 });
[
  "1. App startup steps: Not found in repo.",
  "2. Required dependencies or services: Not found in repo.",
  "3. Entry command or script: Not found in repo."
].forEach((item) => addWrapped(item));

addLine("Evidence used", { size: 13, bold: true, leading: 18 });
[
  "- Working tree listing showed only .git.",
  "- git status reported: No commits yet on main.",
  "- git log had no history to inspect."
].forEach((item) => addWrapped(item, { size: 9, leading: 12, maxChars: 92 }));

const contentStream = lines.join("\n") + "\n";

const objects = [];
function addObject(body) {
  objects.push(body);
  return objects.length;
}

const catalogId = addObject("<< /Type /Catalog /Pages 2 0 R >>");
const pagesId = addObject("<< /Type /Pages /Count 1 /Kids [3 0 R] >>");
const pageId = addObject(
  `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`
);
const font1Id = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
const font2Id = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
const contentId = addObject(
  `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}endstream`
);

if (catalogId !== 1 || pageId !== 3 || font1Id !== 4 || font2Id !== 5 || contentId !== 6) {
  throw new Error("Unexpected PDF object numbering.");
}

let pdf = "%PDF-1.4\n";
const offsets = [0];
for (let i = 0; i < objects.length; i += 1) {
  offsets.push(Buffer.byteLength(pdf, "utf8"));
  pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}
const xrefStart = Buffer.byteLength(pdf, "utf8");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (let i = 1; i < offsets.length; i += 1) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

fs.writeFileSync(outputPath, pdf, "binary");
console.log(outputPath);
