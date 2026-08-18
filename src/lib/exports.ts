import PptxGenJS from "pptxgenjs";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
} from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { stripMarkdown } from "./text";
import { convertLatex } from "./latex";

async function loadFontFiles(): Promise<{ regular: Uint8Array; bold: Uint8Array } | null> {
  const dir = path.join(process.cwd(), "src", "lib", "fonts");
  try {
    const [regular, bold] = await Promise.all([
      readFile(path.join(dir, "DejaVuSans.ttf")),
      readFile(path.join(dir, "DejaVuSans-Bold.ttf")),
    ]);
    return { regular: new Uint8Array(regular), bold: new Uint8Array(bold) };
  } catch {
    return null;
  }
}

/** Aplica conversión de LaTeX y limpieza de Markdown para texto plano. */
function cleanText(text: string): string {
  return stripMarkdown(convertLatex(text));
}

export interface Slide {
  title: string;
  bullets: string[];
}

/** Divide el contenido en diapositivas. Cada slide separada por una línea "---". */
export function parseSlides(content: string): Slide[] {
  const blocks = content
    .split(/^---+$/m)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    const t = content.trim();
    if (t) blocks.push(t);
  }
  if (blocks.length === 0) return [{ title: "Material", bullets: [] }];

  return blocks.map((block) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const first = lines[0] ?? "";
    let title = "Diapositiva";
    let body = lines;
    if (first.startsWith("#")) {
      title = first.replace(/^#+\s*/, "").trim();
      body = lines.slice(1);
    }
    const bullets = body.map((l) => l.replace(/^[-*•]\s+/, ""));
    return { title, bullets };
  });
}

const DEFAULT_TITLE = "Material didáctico";

export function sanitizeFilename(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
  return clean || "material";
}

export async function generatePptxBuffer(
  content: string,
  title = DEFAULT_TITLE
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
  pptx.layout = "WIDE";
  pptx.author = "Generador de Material Didáctico";
  pptx.title = title;

  const slides = parseSlides(content);
  if (slides.length === 1 && slides[0].bullets.length === 0) {
    slides[0] = { title: title || "Material", bullets: [content.trim()] };
  }

  for (const slide of slides) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addText(cleanText(slide.title) || "Material", {
      x: 0.6,
      y: 0.5,
      w: 12.1,
      h: 1.0,
      fontSize: 30,
      bold: true,
      color: "1F2937",
      fontFace: "Arial",
    });
    const bullets = slide.bullets.length
      ? slide.bullets
      : ["(sin contenido)"];
    s.addText(bullets.map((b) => ({ text: cleanText(b) })), {
      x: 0.7,
      y: 1.7,
      w: 11.9,
      h: 5.2,
      fontSize: 18,
      color: "374151",
      fontFace: "Arial",
      bullet: { code: "2022", indent: 12 },
      paraSpaceAfter: 8,
      valign: "top",
    });
  }

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Renderiza contenido markdown simple (encabezados, listas) a un PDF A4. */
export async function generatePdfBuffer(
  content: string,
  title = DEFAULT_TITLE
): Promise<Buffer> {
const doc = await PDFDocument.create();
  const fontFiles = await loadFontFiles();
  if (fontFiles) {
    doc.registerFontkit(fontkit);
  }
  const regular = fontFiles
    ? await doc.embedFont(fontFiles.regular)
    : await doc.embedFont(StandardFonts.Helvetica);
  const bold = fontFiles
    ? await doc.embedFont(fontFiles.bold)
    : await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN - 40;

  const color = rgb(0.1, 0.1, 0.1);

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  page.drawText(title, {
    x: MARGIN,
    y: PAGE_H - MARGIN,
    size: 24,
    font: bold,
    color,
  });
  page.drawLine({
    start: { x: MARGIN, y: PAGE_H - MARGIN - 12 },
    end: { x: PAGE_W - MARGIN, y: PAGE_H - MARGIN - 12 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  const lines = content.split("\n");

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      y -= 8;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      ensureSpace(24);
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_W - MARGIN, y },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });
      y -= 20;
      continue;
    }

    if (line.trim() === "===" || line.includes("\f")) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
      continue;
    }

if (/^#{1,3}\s+/.test(line)) {
      const text = cleanText(line.replace(/^#{1,3}\s+/, ""));
      const size = 18;
      ensureSpace(30);
      for (const wrapped of wrapText(text, bold, size, CONTENT_W)) {
        page.drawText(wrapped, { x: MARGIN, y, size, font: bold, color });
        y -= size + 8;
      }
      continue;
    }

if (/^[-*•]\s+/.test(line)) {
      const text = cleanText(line.replace(/^[-*•]\s+/, ""));
      const size = 12;
      ensureSpace(16);
      page.drawText("•", {
        x: MARGIN + 4,
        y,
        size,
        font: regular,
        color,
      });
      for (const wrapped of wrapText(text, regular, size, CONTENT_W - 24)) {
        page.drawText(wrapped, {
          x: MARGIN + 20,
          y,
          size,
          font: regular,
          color,
        });
        y -= size + 6;
      }
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
const [num] = line.match(/^\d+\./) ?? [""];
      const text = cleanText(line.replace(/^\d+\.\s+/, ""));
      const size = 12;
      ensureSpace(16);
      page.drawText(num, {
        x: MARGIN + 4,
        y,
        size,
        font: bold,
        color,
      });
      for (const wrapped of wrapText(text, regular, size, CONTENT_W - 24)) {
        page.drawText(wrapped, {
          x: MARGIN + 20,
          y,
          size,
          font: regular,
          color,
        });
        y -= size + 6;
      }
      continue;
    }

    const size = 12;
    ensureSpace(16);
    const clean = cleanText(line);
    if (!clean) {
      y -= 8;
      continue;
    }
    for (const wrapped of wrapText(clean, regular, size, CONTENT_W)) {
      page.drawText(wrapped, { x: MARGIN, y, size, font: regular, color });
      y -= size + 5;
    }
  }

  return Buffer.from(await doc.save());
}
