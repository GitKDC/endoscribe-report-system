import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ── A4 constants ─────────────────────────────────────────────────────────────
const A4_PX_W  = 794;   // A4 width  at 96 dpi
const A4_PX_H  = 1123;  // A4 height at 96 dpi
const A4_MM_W  = 210;
const A4_MM_H  = 297;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Bake an <img>'s brightness/contrast (read from data-brightness /
 * data-contrast, set by ReportPreview.tsx) into its pixel data via canvas.
 * html2canvas does NOT reliably apply CSS `filter` during capture in every
 * environment (especially Electron/Chromium headless contexts), so we
 * re-render the image manually before capture to guarantee the filter
 * shows up in the exported PDF/PNG/print output.
 */
const applyFiltersToImage = async (img: HTMLImageElement): Promise<void> => {
  const brightness = Number(img.dataset.brightness ?? 100);
  const contrast = Number(img.dataset.contrast ?? 100);

  // skip if no adjustment was made — avoids unnecessary re-encoding
  if (brightness === 100 && contrast === 100) return;

  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = img.src;

    await new Promise((res) => {
      image.onload = res;
      image.onerror = res;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    ctx.filter = `brightness(${brightness / 100}) contrast(${contrast / 100})`;
    ctx.drawImage(image, 0, 0);

    img.src = canvas.toDataURL("image/jpeg", 0.95);
  } catch {
    // Never block the export over a single failed image
  }
};

const formatFileName = (
  patientName: string,
  category: string,
  reportDate: string,
  ageGender: string,
  reportNumber?: string
) => {
  const safe = (str: string) =>
    str
      .toLowerCase()
      .replace(/\s+/g, "-")       // spaces → dash
      .replace(/[^a-z0-9-]/g, ""); // remove special chars

  const safeDate = reportDate
    ? reportDate.replace(/[^0-9-]/g, "")
    : new Date().toISOString().split("T")[0];

  const base = `${safe(patientName)}-${safe(category)}-${safeDate}-${safe(ageGender)}`;
  return reportNumber ? `${base}-${safe(reportNumber)}` : base;
};

/** Wait for every <img> to finish loading. */
const waitForImages = (element: HTMLElement): Promise<void> =>
  Promise.all(
    Array.from(element.querySelectorAll<HTMLImageElement>("img")).map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((res) => {
        img.addEventListener("load",  () => res(), { once: true });
        img.addEventListener("error", () => res(), { once: true });
      });
    })
  ).then(() => undefined);

/**
 * Convert every blob:/http: src inside `element` to inline base64, then bake
 * in any brightness/contrast adjustment via applyFiltersToImage.
 *
 * IMPORTANT: this mutates the `<img>` elements it's given in place. Callers
 * MUST pass a cloned element (never the live on-screen DOM node), otherwise
 * the visible preview gets permanently overwritten with a re-encoded,
 * lower-fidelity JPEG every time a PDF/print/export runs.
 */
const inlineBlobImages = async (element: HTMLElement): Promise<void> => {
  const imgs = Array.from(element.querySelectorAll<HTMLImageElement>("img"));

  await Promise.all(
    imgs.map(async (img) => {
      let src = img.getAttribute("src") || "";

      // STEP 1: Convert blob/http/endo → base64 (ONLY ONCE)
      if (src.startsWith("blob:") || src.startsWith("http") || src.startsWith("endo:")) {
        try {
          const resp = await fetch(src);
          const blob = await resp.blob();

          const b64 = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(blob);
          });

          img.src = b64;
          src = b64; // update src
        } catch {
          // keep original src if fetch/convert fails
        }
      }

      // STEP 2: Bake brightness/contrast into the (now base64) image data
      await applyFiltersToImage(img);
    })
  );
};

/** Sanitise a date string for use in a filename. */
const safeDate = (d: string) =>
  (d || new Date().toISOString().split("T")[0]).replace(/[^0-9-]/g, "");

/**
 * Capture #report-content as a canvas.
 * Forces exactly A4_PX_W × A4_PX_H pixels so the PDF is always one page.
 * Retries at lower scale if the browser runs out of memory.
 *
 * Operates on a detached CLONE of #report-content so that baking filters /
 * inlining blob URLs never mutates the live, on-screen preview.
 */
const captureReport = async (scale = 3, targetReportNumber?: string): Promise<HTMLCanvasElement> => {
  const source = document.getElementById("report-content");
  if (!source) throw new Error("Element #report-content not found in DOM.");

  // Work on a clone — keeps the visible preview untouched and pristine.
  const clone = source.cloneNode(true) as HTMLElement;
  clone.style.position = "fixed";
  clone.style.top = "-99999px";
  clone.style.left = "-99999px";
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);

  if (targetReportNumber) {
    const refEl = clone.querySelector("#report-number-display");
    if (refEl) {
      refEl.textContent = `Ref: ${targetReportNumber}`;
    }
  }

  try {
    // 1. Inline blob / external URLs + bake brightness/contrast filters
    await inlineBlobImages(clone);
    // 2. Wait for all images (including the newly inlined ones) to render
    await waitForImages(clone);
    // 3. Short settle so the browser repaints after src changes
    await new Promise((r) => setTimeout(r, 350));

    try {
      return await html2canvas(clone, {
        useCORS: true,
        allowTaint: false,
        scale,
        backgroundColor: "#ffffff",
        logging: false,
        // Force exactly A4 dimensions — prevents the footer from ever being on page 2
        width:        A4_PX_W,
        height:       A4_PX_H,
        windowWidth:  A4_PX_W,
        windowHeight: A4_PX_H,
        imageTimeout: 15000,
      });
    } catch (err) {
      if (scale > 1) {
        console.warn(`html2canvas OOM at scale ${scale}, retrying at ${scale - 1}…`);
        // Retry with a fresh clone at lower scale
        document.body.removeChild(clone);
        return captureReport(scale - 1, targetReportNumber);
      }
      throw err;
    }
  } finally {
    if (clone.parentNode) document.body.removeChild(clone);
  }
};

// ── PDF ────────────────────────────────────────────────────────────────────────
export const generatePDF = async (reportDate: string, patientName: string, patientAge: string, reportType: string, reportNumber?: string, downloadToDownloads = false): Promise<any> => {
  const canvas = await captureReport(2, reportNumber); // Reduced scale from 3 to 2 for massive memory savings while staying sharp

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Convert to highly compressed JPEG instead of lossless PNG to reduce 25MB -> ~1MB
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.90), "JPEG", 0, 0, A4_MM_W, A4_MM_H);

  const filename = `${formatFileName(patientName, reportType, reportDate, patientAge, reportNumber)}.pdf`;
  
  // If downloadToDownloads is true, bypass backend storage and trigger a direct browser download
  if (downloadToDownloads) {
    pdf.save(filename);
    return { success: true, isBrowserDownload: true };
  }
  
  // If running inside electron, send to backend to save in configured reports directory
  if (typeof window !== "undefined" && (window as any).api && (window as any).api.saveReportPdf) {
    const pdfDataUri = pdf.output("datauristring");
    const base64Data = pdfDataUri.split(",")[1];
    
    return await (window as any).api.saveReportPdf({
      reportNumber,
      base64Data,
      filename
    });
  } else {
    // Fallback to browser download
    pdf.save(filename);
    return { success: true, isBrowserDownload: true };
  }
};

// ── Print ──────────────────────────────────────────────────────────────────────
export const printReport = async (): Promise<void> => {
  const element = document.getElementById("report-content");
  if (!element) throw new Error("Element #report-content not found.");

  const cloned = element.cloneNode(true) as HTMLElement;
  await inlineBlobImages(cloned);
  await waitForImages(cloned);
  await new Promise((r) => setTimeout(r, 200));

  const pw = window.open("", "", "width=900,height=700");
  if (!pw) throw new Error("Popup blocked — please allow popups for this page.");

  pw.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Endoscopy Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: white; }
    @page  { size: A4; margin: 0; }
    @media print { body { margin: 0; } img { max-width: 100%; } }
  </style>
</head>
<body>
${cloned.outerHTML}
<script>
  window.onload = function () {
    setTimeout(function () {
      window.print();
      setTimeout(function () { window.close(); }, 1000);
    }, 500);
  };
<\/script>
</body>
</html>`);
  pw.document.close();
};

// ── PNG export ─────────────────────────────────────────────────────────────────
export const exportAsImage = async (reportDate: string, patientName: string, ageGender: string, reportType: string, reportNumber?: string) => {
  try {
    const canvas = await captureReport(3, reportNumber);
    const filename = `${formatFileName(patientName, reportType, reportDate, ageGender, reportNumber)}.png`;

    const link    = document.createElement("a");
    link.href     = canvas.toDataURL("image/png");
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error("Export failed:", err);
  }
};// ── Types mirrored here so reportGenerator.ts stays self-contained ─────────────
interface WordSection  { title: string; content: string; highlight?: boolean; isHeading?: boolean; isLine?: boolean; }
interface WordImageData { id: string; url: string; label: string; nbiLabel?: string; brightness?: number; contrast?: number; }
interface WordDoctor   { id: number; name: string; qualifications?: string; designation?: string; }

const REPORT_TITLE_MAP_WORD: Record<string, string> = {
  UGI: "UPPER GI ENDOSCOPY REPORT",
  VLS: "VLS SCOPY REPORT",
  SIGMOIDOSCOPY: "SIGMOIDOSCOPY REPORT",
  COLONOSCOPY: "COLONOSCOPY REPORT",
};

/** Convert a single image element (by its src) to a cropped, brightness/contrast-adjusted base64 JPEG */
const imageToBase64ForWord = async (
  src: string,
  cropW: number,
  cropH: number,
  brightness: number,
  contrast: number,
  nbiLabel?: string
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cw = cropW; // NO SCALE! Word renders base64 images at native pixel size!
        const ch = cropH;
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d")!;

        // object-fit: cover  – mimic what the preview does
        const imgRatio = img.width / img.height;
        const tgtRatio = cw / ch;
        let drawW, drawH, ox, oy;
        if (imgRatio > tgtRatio) {
          drawH = ch; drawW = img.width * (ch / img.height);
          ox = (cw - drawW) / 2; oy = 0;
        } else {
          drawW = cw; drawH = img.height * (cw / img.width);
          ox = 0; oy = (ch - drawH) / 2;
        }

        ctx.filter = `brightness(${brightness / 100}) contrast(${contrast / 100})`;
        ctx.drawImage(img, ox, oy, drawW, drawH);

        // Draw NBI label directly onto the image canvas
        if (nbiLabel) {
          ctx.filter = "none";
          ctx.fillStyle = "#FCD34D"; // yellow-400
          ctx.font = "bold 14px 'Segoe UI', Tahoma, sans-serif";
          const paddingX = 6;
          const paddingY = 4;
          const textMetrics = ctx.measureText(nbiLabel);
          const boxWidth = textMetrics.width + paddingX * 2;
          const boxHeight = 22;
          ctx.fillRect(0, 0, boxWidth, boxHeight);
          ctx.fillStyle = "#000000";
          ctx.textBaseline = "middle";
          ctx.fillText(nbiLabel, paddingX, boxHeight / 2 + 1);
        }

        resolve(canvas.toDataURL("image/jpeg", 0.93));
      } catch {
        resolve(src); // fallback – keep original
      }
    };
    img.onerror = () => resolve(src);

    // Convert blob / relative paths to something img.src can load
    if (src.startsWith("blob:") || src.startsWith("data:") || src.startsWith("http")) {
      img.src = src;
    } else if (src.startsWith("/")) {
      img.src = src; // Next.js serves these
    } else {
      img.src = src;
    }
  });
};

/** Fetch a local public image and resize it exactly to target dimensions for Word */
const resizeLocalImageToBase64 = async (path: string, tgtW: number, forceH?: number): Promise<string> => {
  try {
    const resp = await fetch(path);
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const drawH = forceH || Math.round(img.height * (tgtW / img.width));
        const canvas = document.createElement("canvas");
        canvas.width = tgtW;
        canvas.height = drawH;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, tgtW, drawH);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve("");
      };
      img.src = url;
    });
  } catch {
    return "";
  }
};

/**
 * Build a fully editable Word document from raw report data.
 * Uses only HTML attributes + inline styles that Microsoft Word actually supports.
 * Layout is driven by <table> elements instead of flexbox/grid.
 */
export const exportAsWord = async (
  reportDate: string,
  patientName: string,
  ageGender: string,
  reportType: string,
  sections: WordSection[],
  images: WordImageData[],
  doctors: WordDoctor[],
  prefix: string,
  reportNumber?: string
) => {
  try {
    const boundary = "----=_NextPart_000_ENDO_01D90000.00000000";
    const mhtParts: string[] = [];
    let partIndex = 0;

    // Helper: register a base64 image as an MHT part and return the Content-Location key
    const registerImage = (dataUrl: string, ext = "jpeg"): string => {
      if (!dataUrl || !dataUrl.startsWith("data:")) return "";
      const match = dataUrl.match(/^data:(image\/\w+);base64,([\s\S]+)$/);
      if (!match) return "";
      const [, mime, b64] = match;
      const loc = `img_${partIndex++}.${ext}`;
      const chunked = b64.match(/.{1,76}/g)?.join("\r\n") ?? b64;
      mhtParts.push(
        `--${boundary}\r\n` +
        `Content-Type: ${mime}\r\n` +
        `Content-Transfer-Encoding: base64\r\n` +
        `Content-Location: ${loc}\r\n\r\n` +
        `${chunked}\r\n`
      );
      return loc;
    };

    // ── 1. Header image ────────────────────────────────────────────────────────
    // Calculate height dynamically based on exact aspect ratio
    const headerB64 = await resizeLocalImageToBase64("/images/header.png", 730);
    const headerLoc = registerImage(headerB64, "jpeg");

    // ── 2. WEO logo ───────────────────────────────────────────────────────────
    // Calculate height dynamically to prevent compression
    const weoB64 = await resizeLocalImageToBase64("/images/weo.png", 150);
    const weoLoc = registerImage(weoB64, "jpeg");

    // ── 3. Medical images ──────────────────────────────────────────────────────
    // right column: images 0-3
    // bottom row  : images 4-5 (reversed to match web preview layout)
    const rightImages  = images.slice(0, 4);
    const bottomImages = images.slice(4, 6).reverse();

    // ── Layout constants ─────────────────────────────────────────────────────
    // Total width = 730px (Slightly narrower to ensure height fits on one page)
    // Left column = 475px, Spacer = 10px, Right column = 245px
    const RIGHT_W = 245, RIGHT_H = 184;
    const BOT_W   = 232, BOT_H   = 174;

    const rightLocs: string[] = [];
    for (const img of rightImages) {
      const b64 = await imageToBase64ForWord(img.url, RIGHT_W, RIGHT_H, img.brightness ?? 100, img.contrast ?? 100, img.nbiLabel);
      rightLocs.push(registerImage(b64));
    }

    const bottomLocs: string[] = [];
    for (const img of bottomImages) {
      const b64 = await imageToBase64ForWord(img.url, BOT_W, BOT_H, img.brightness ?? 100, img.contrast ?? 100, img.nbiLabel);
      bottomLocs.push(registerImage(b64));
    }

    // ── 4. Format helpers ──────────────────────────────────────────────────────
    const fmtDate = (d: string) => {
      if (!d) return "";
      const dt = new Date(d);
      return [String(dt.getDate()).padStart(2,"0"), String(dt.getMonth()+1).padStart(2,"0"), dt.getFullYear()].join("/");
    };

    const title = REPORT_TITLE_MAP_WORD[reportType] || `${reportType} REPORT`;

    // Render one section row
    const renderSection = (s: WordSection): string => {
      if (s.isLine && !s.content && !s.title) {
        return `<tr><td style="border-bottom:1pt solid #bbb;padding:1pt 0;font-size:1pt;">&nbsp;</td></tr>`;
      }
      if (s.isHeading) return `<tr><td style="padding:2pt 0 0;font-weight:700;font-size:11.5pt;border-bottom:1.5pt solid #222;">${s.title}</td></tr>`;
      let safeContent = s.content || "";
      if (!safeContent.includes("<p>") && !safeContent.includes("<strong>") && !safeContent.includes("<span")) {
        safeContent = safeContent
          .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
          .replace(/\*\*(.*?)\*\*/g,"<b>$1</b>")
          .replace(/\*(.*?)\*/g,"<i>$1</i>")
          .replace(/!!(.*?)!!/g,"<span style='color:#cc0000;'>$1</span>")
          .replace(/&&(.*?)&&/g,"<span style='color:#16a34a;'>$1</span>")
          .replace(/%%(.*?)%%/g,"<span style='color:#d97706;'>$1</span>")
          .replace(/\n/g,"<br>");
      } else {
        safeContent = safeContent.replace(/^<p[^>]*>/, "").replace(/<\/p>$/, "").replace(/<\/p>\s*<p[^>]*>/g, "<br>");
      }

      if (s.highlight) {
        return `<tr><td style="padding:1pt 0;">
          <table border="0" cellpadding="2" cellspacing="0" style="border:1.5pt solid #222;border-collapse:collapse;margin-bottom:1pt;">
            <tr><td style="font-weight:700;font-size:10.5pt;">${s.title}</td></tr>
          </table>
          <p style="margin:0 0 1pt;font-size:10pt;">${safeContent}</p>
        </td></tr>`;
      }

      if (s.isLine) {
        return `<tr><td style="padding:0;"><p style="margin:0 0 1pt;font-size:10pt;">${safeContent || s.title}</p></td></tr>`;
      }

      return `<tr><td style="padding:0;"><p style="margin:0 0 1pt;font-size:10pt;"><b>${s.title}:-</b>&nbsp;${safeContent}</p></td></tr>`;
    };

    // Right column: stacked images
    const rightImgHtml = rightImages.map((img, i) => {
      const loc = rightLocs[i]; if (!loc) return "";
      return `<tr><td align="right" style="padding-bottom:2pt;padding-left:0;padding-right:0;vertical-align:top;"><img src="${loc}" width="${RIGHT_W}" height="${RIGHT_H}" style="display:block;width:${RIGHT_W}px;height:${RIGHT_H}px;" alt="${img.label}"/></td></tr>`;
    }).join("\n");

    // Bottom row: 2 images side by side
    const bottomImgHtml = bottomImages.length > 0 ? `<tr><td style="padding-top:6pt;padding-left:0;padding-right:0;">
          <table border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr valign="top">
              ${bottomImages.map((img, i) => {
                const loc = bottomLocs[i]; if (!loc) return "";
                return `<td style="padding-right:${i===0?"10px":"0"};padding-left:0;">
                  <img src="${loc}" width="${BOT_W}" height="${BOT_H}" style="display:block;" alt="${img.label}"/>
                </td>`;
              }).join("")}
            </tr>
          </table>
        </td></tr>` : "";

    // Doctors footer cells
    const doctorCells = doctors.map(doc => {
      // Break designation explicitly as requested by user
      const designation = (doc.designation || "").replace(" &", "<br/>&");
      return `
        <td style="padding:0;padding-right:10pt;">
          <div style="font-weight:700;font-size:9pt;margin-bottom:1pt;">${doc.name}</div>
          <div style="font-size:8pt;color:#333;margin-bottom:0;">${doc.qualifications}</div>
          <div style="font-size:8pt;color:#333;margin-bottom:0;">${designation}</div>
        </td>
      `;
    }).join("");

    // ── 5. Build HTML ──────────────────────────────────────────────────────────
    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
 xmlns:w='urn:schemas-microsoft-com:office:word'
 xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${patientName} – ${title}</title>
<style>
<!--
  /* ── Word-specific page section ── */
  @page WordSection1 {
    size: 595.3pt 841.9pt;
    margin: 14.2pt 14.2pt 14.2pt 14.2pt; /* 0.5cm margins so 750px fits perfectly */
    mso-header-margin: 14.2pt;
    mso-footer-margin: 14.2pt;
    mso-paper-source: 0;
  }
  div.WordSection1 { page:WordSection1; }
  body { margin:0; padding:0; font-family:'Segoe UI',Tahoma,sans-serif; color:#111; }
  p    { margin:0; padding:0; }
  td   { font-family:'Segoe UI',Tahoma,sans-serif; }
-->
</style>
<!--[if gte mso 9]><xml>
<w:WordDocument>
  <w:View>Print</w:View>
  <w:Zoom>100</w:Zoom>
  <w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml><![endif]-->
</head>
<body>
<div class="WordSection1">
<table border="0" cellpadding="0" cellspacing="0" width="730"
       style="width:730px;border-collapse:collapse;table-layout:fixed;margin:0;">
  
  <!-- Strict column sizing for Word -->
  <tr style="height:0;">
    <td width="475" style="width:475px;padding:0;border:none;"></td>
    <td width="10" style="width:10px;padding:0;border:none;"></td>
    <td width="245" style="width:245px;padding:0;border:none;"></td>
  </tr>

  <!-- ══ HEADER ═══════════════════════════════════════════════════ -->
  <tr>
    <td colspan="3" width="730" style="padding:0;font-size:0;line-height:0;padding-bottom:2pt;">
      ${headerLoc ? `<img src="${headerLoc}" style="display:block;" alt="Header"/>` : ""}
    </td>
  </tr>

  <!-- ══ PATIENT / DATE ROW ════════════════════════════════════════ -->
  <tr>
    <td width="475" style="padding:2pt 0;font-weight:700;font-size:11pt;vertical-align:middle;">
      ${prefix}&nbsp;${patientName}&nbsp;&ndash;&nbsp;${ageGender}
    </td>
    <td width="10" style="padding:0;"></td>
    <td width="245" align="right"
        style="padding:2pt 0;font-size:10pt;font-weight:700;white-space:nowrap;vertical-align:middle;">
      <span style="border:1pt solid #aaa;padding:2pt 6pt;">${fmtDate(reportDate)}${reportNumber ? `&nbsp;&nbsp;Ref:&nbsp;${reportNumber}` : ""}</span>
    </td>
  </tr>

  <!-- ══ DIVIDER ════════════════════════════════════════════════════ -->
  <tr>
    <td colspan="3" width="730" style="border-top:1pt solid #bbb;padding:0;line-height:1px;font-size:1px;">&nbsp;</td>
  </tr>

  <!-- ══ BODY: LEFT (text + bottom images) + RIGHT (4 stacked images) ═ -->
  <tr valign="top">
    
    <!-- LEFT COLUMN -->
    <td width="475" style="padding:2pt 0 0 0;vertical-align:top;">
      <table border="0" cellpadding="0" cellspacing="0" width="475"
             style="table-layout:fixed;">
        <!-- Report title box -->
        <tr>
          <td style="padding-bottom:2pt;padding-left:0;padding-right:0;">
            <table border="0" cellpadding="2" cellspacing="0"
                   style="border:2pt solid #222;border-collapse:collapse;">
              <tr>
                <td style="font-size:12pt;font-weight:700;letter-spacing:0.4pt;">
                  ${title}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Sections -->
        ${sections
          .filter(s => s.isHeading || s.isLine || (s.content && s.content.trim()))
          .map(renderSection)
          .join("\n")}
        <!-- Bottom images (5th + 6th) -->
        ${bottomImgHtml}
      </table>
    </td>

    <!-- MIDDLE SPACER -->
    <td width="10" style="padding:0;"></td>

    <!-- RIGHT COLUMN -->
    <td width="245" align="right" style="padding:2pt 0 0 0;vertical-align:top;">
      <table border="0" cellpadding="0" cellspacing="0" width="245"
             style="table-layout:fixed;">
        ${rightImgHtml}
      </table>
    </td>
  </tr>

  <!-- ══ FOOTER ════════════════════════════════════════════════════ -->
  <tr>
    <td colspan="3" width="730"
        style="border-top:1pt solid #ccc;padding:0;">
      <table border="0" cellpadding="0" cellspacing="0" width="730" style="table-layout:fixed;">
        <tr valign="bottom">
          <td width="475" style="padding:2pt 0 0 0;">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr valign="top">${doctorCells}</tr>
            </table>
          </td>
          <td width="10" style="padding:0;"></td>
          <td width="245" align="right"
              style="padding:2pt 0 0 0;vertical-align:bottom;">
            ${weoLoc
              ? `<img src="${weoLoc}" style="display:inline;" alt="WEO"/>`
              : ""}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</div>
</body>
</html>`;

    // ── 6. Pack as MHT ────────────────────────────────────────────────────────
    let mhtContent = `MIME-Version: 1.0\r\n`;
    mhtContent += `Content-Type: multipart/related; boundary="${boundary}"; type="text/html"\r\n\r\n`;

    mhtContent += `--${boundary}\r\n`;
    mhtContent += `Content-Type: text/html; charset="utf-8"\r\n`;
    mhtContent += `Content-Transfer-Encoding: 8bit\r\n`;
    mhtContent += `Content-Location: document.html\r\n\r\n`;
    mhtContent += `${htmlContent}\r\n`;

    for (const part of mhtParts) {
      mhtContent += `\r\n${part}`;
    }
    mhtContent += `\r\n--${boundary}--\r\n`;

    const filename = `${formatFileName(patientName, reportType, reportDate, ageGender, reportNumber)}.doc`;

    if (typeof window !== "undefined" && (window as any).api && (window as any).api.saveReportWord) {
      return await (window as any).api.saveReportWord({ reportNumber, htmlContent: mhtContent, filename });
    } else {
      const blob = new Blob([mhtContent], { type: "application/msword" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (err) {
    console.error("Word export failed:", err);
    throw err;
  }
};

