import React from "react";

interface ImageData {
  id: string;
  url: string;
  label: string;
  nbiLabel?: string;
  brightness?: number;
  contrast?: number;
}

interface Section {
  title: string;
  content: string;
  highlight?: boolean;
  isHeading?: boolean;
}

interface Doctor {
  id: number;
  name: string;
  qualifications?: string;
  designation?: string;
}

interface ReportPreviewProps {
  patientName: string;
  patientAge: string;
  reportDate: string;
  reportType: string;
  sections: Section[];
  doctorName: string;
  images: ImageData[];
  prefix: string;
  // 🔥 NEW: doctors to render in the footer, in order
  selectedDoctors?: Doctor[];
  // Report number generated after saving to DB (e.g. "SH-2026-001")
  reportNumber?: string;
}

// Maps internal report type codes to the display title shown on the report
const REPORT_TITLE_MAP: Record<string, string> = {
  UGI: "UPPER GI ENDOSCOPY",
  VLS: "VLS Scopy",
  SIGMOIDOSCOPY: "SIGMOIDOSCOPY",
  COLONOSCOPY: "COLONOSCOPY",
};

// Fallback doctors used only if none are selected/passed — keeps old
// behaviour intact so existing reports never render an empty footer.
const FALLBACK_DOCTORS: Doctor[] = [
  {
    id: -1,
    name: "Dr Hrushikesh P. Chaudhari",
    qualifications: "DNB (Gen. Med.), DNB (Gastro.)",
    designation: "Consultant Gastroenterologist & Therapeutic Endoscopist",
  },
  {
    id: -2,
    name: "Dr Vaibhav Lamdhade",
    qualifications: "DNB (Gen. Med.), DNB (Gastro.)",
    designation: "Consultant Gastroenterologist & Therapeutic Endoscopist",
  },
];

const ReportPreview: React.FC<ReportPreviewProps> = ({
  patientName,
  patientAge,
  reportDate,
  reportType,
  sections,
  doctorName,
  images,
  prefix,
  selectedDoctors,
  reportNumber,
}) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return [
      String(d.getDate()).padStart(2, "0"),
      String(d.getMonth() + 1).padStart(2, "0"),
      d.getFullYear(),
    ].join("/");
  };

  // Only sections with actual content (or marked headings) are rendered
  const visibleSections = sections.filter(
    (s) => s.isHeading || (s.content && s.content.trim() !== "")
  );

  // Calculate approximate lines by counting explicit newlines + estimating wrapped lines
  const approxLines = visibleSections.reduce(
    (sum, s) => {
      const explicitNewlines = (s.content?.match(/\n/g) || []).length;
      const wrappedLines = Math.floor((s.content?.length || 0) / 75);
      return sum + explicitNewlines + wrappedLines + 1; // +1 for the title/base line
    },
    0
  );

  const totalLen = visibleSections.reduce(
    (sum, s) => sum + (s.content?.length || 0),
    0
  );

  // Images 1-4 → right column stacked
  // Images 5-6 → below text in left column
  const rightImages  = images.slice(0, 4);
  const bottomImages = images.slice(4, 6);

  // Bottom images take up ~190px of vertical space. 
  // We add an "effective line" penalty so the font shrinks earlier when bottom images are present.
  const effectiveLines = approxLines + (bottomImages.length > 0 ? 10 : 0);

  const bodyFont = effectiveLines > 40 || totalLen > 1800 ? "13px" : effectiveLines > 32 || totalLen > 1400 ? "14px" : effectiveLines > 26 || totalLen > 1100 ? "15px" : effectiveLines > 22 || totalLen > 900 ? "16px" : effectiveLines > 18 || totalLen > 700 ? "17px" : "18px";
  const lineH    = effectiveLines > 40 || totalLen > 1800 ? 1.35   : effectiveLines > 32 || totalLen > 1400 ? 1.4    : effectiveLines > 26 || totalLen > 1100 ? 1.4    : effectiveLines > 22 || totalLen > 900 ? 1.45   : effectiveLines > 18 || totalLen > 700 ? 1.5    : 1.5;
  const paraGap  = effectiveLines > 40 || totalLen > 1800 ? "4px"  : effectiveLines > 32 || totalLen > 1400 ? "6px"  : effectiveLines > 26 || totalLen > 1100 ? "8px"  : effectiveLines > 22 || totalLen > 900 ? "10px" : effectiveLines > 18 || totalLen > 700 ? "12px" : "14px";

  const displayTitle = REPORT_TITLE_MAP[reportType] || reportType || "UPPER GI ENDOSCOPY";

  // Builds the CSS filter string for a given image's brightness/contrast.
  const filterFor = (img: ImageData) =>
    `brightness(${(img.brightness ?? 100) / 100}) contrast(${(img.contrast ?? 100) / 100})`;

  const NbiLabel = ({ label }: { label?: string }) =>
    label ? (
      <span
        style={{
          position: "absolute",
          top: "6px",
          left: "6px",
          backgroundColor: "#FFD54F",     
          color: "#000",
          fontSize: "16px",              
          fontWeight: "700",              
          letterSpacing: "0.5px",
          padding: "4px 8px",             
          borderRadius: "3px",
          border: "1px solid #bfa000",   
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          zIndex: 2,
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {label}
      </span>
    ) : null;

  // 🔥 NEW: which doctors actually render in the footer — falls back to
  // the original hardcoded two doctors if nothing was selected, so this
  // change is fully backward compatible.
  const footerDoctors =
    selectedDoctors && selectedDoctors.length > 0 ? selectedDoctors : FALLBACK_DOCTORS;

  return (
    /*
     * height: "1123px" (not minHeight) forces the report to exactly one A4 page.
     * overflow: hidden ensures nothing bleeds beyond A4 bounds.
     * This is what guarantees the footer is ALWAYS on the same page in the PDF.
     */
    <div
      id="report-content"
      style={{
        backgroundColor: "white",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: "#111",
        width: "794px",
        height: "1123px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0 }}>
        <img
          src="/images/header.png"
          alt="Hospital Header"
          style={{ width: "100%", height: "auto", display: "block" }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.display = "none";
            const fb = img.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = "flex";
          }}
        />
        <div
          style={{
            display: "none",
            height: "100px",
            backgroundColor: "#1a3a52",
            color: "white",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            fontWeight: "bold",
          }}
        >
          Shobha Hospital &amp; Superspeciality Gastroenterology Centre
        </div>
      </div>

      {/* ── BODY — fills all space between header and footer ────────────── */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          padding: "12px 8px 0 60px", // Increased left padding for hole punching, decreased right for images
          overflow: "hidden",
        }}
      >
        {/* Patient row (Full Width) */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
            paddingBottom: "6px",
            paddingRight: "16px", // Prevent date border from being sliced by printer
            borderBottom: "1.5px solid #ddd",
          }}
        >
          <p style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>
            {patientName
              ? `${prefix} ${patientName} - ${patientAge}`
              : "Patient Name"}
          </p>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <p style={{
              margin: 0, fontSize: "12px", fontWeight: "800",
              color: "#333", border: "1px solid #999",
              padding: "2px 8px", borderRadius: "3px",
              whiteSpace: "nowrap",
            }}>
              {formatDate(reportDate)}
            </p>
          </div>
        </div>

        {/* Content split (Left / Right) */}
        <div style={{ display: "flex", gap: "12px", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* ── LEFT: title + text + bottom images ────────── */}
          <div
            style={{
              flex: "1 1 66%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: 0,
              fontSize: bodyFont,
              lineHeight: lineH,
            }}
          >
            {/* Report title */}
          <div style={{ flexShrink: 0, marginBottom: "10px" }}>
            <h2
              style={{
                margin: 0,
                fontSize: "19px",
                fontWeight: "800",
                textTransform: "uppercase",
                display: "inline-block",
                border: "1.5px solid #333",
                padding: "3px 12px",
                letterSpacing: "0.5px",
              }}
            >
              {displayTitle}
            </h2>
          </div>

          {/* Clinical text */}
          <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
            {visibleSections.map((section, index) =>
              section.isHeading ? (
                <div
                  key={index}
                  style={{
                    display: "block",
                    width: "fit-content",
                    border: "1.5px solid #f53a3a",
                    color: "#f53a3a",
                    fontWeight: "900",
                    textTransform: "uppercase",
                    fontSize: bodyFont,
                    letterSpacing: "0.5px",
                    padding: "3px 28px 3px 10px",
                    margin: "4px 0 8px 0",
                    position: "relative",
                  }}
                >
                  {section.title}
                  <span
                    style={{
                      position: "absolute",
                      right: "6px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: "11px",
                    }}
                  >
                    ▶
                  </span>
                </div>
              ) : (
                <p
                  key={index}
                  style={{
                    marginBottom: paraGap,
                    color: "#111", // Base color is always black
                    fontWeight: section.highlight ? "bold" : "normal",
                  }}
                >
                  {section.title && section.title.trim() !== "" && (
                    <strong
                      style={{
                        fontWeight: "bold",
                        color:
                          section.title.toLowerCase() === "impression"
                            ? "#111"
                            : section.highlight
                            ? "#f53a3a"
                            : "#111",
                      }}
                    >
                      {section.title}:-{" "}
                    </strong>
                  )}
                  <span
                    style={{ whiteSpace: "pre-line" }}
                    dangerouslySetInnerHTML={{
                      __html: (section.content || "")
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.*?)\*/g, "<em>$1</em>")
                        .replace(/!!(.*?)!!/g, '<span style="color: #f53a3a;">$1</span>'),
                    }}
                  />
                </p>
              )
            )}
          </div>

          {/* Images 5-6 */}
          {bottomImages.length > 0 && (
            <div
              style={{
                flexShrink: 0,
                display: "flex",
                gap: "8px",
                marginTop: "auto",
                marginBottom: "40px",
                height: "190px",
              }}
            >
              {[...bottomImages].reverse().map((img, idx, arr) => (
                <div
                  key={img.id}
                  style={{
                    flex: "0 0 calc(50% - 4px)",
                    maxWidth: "calc(50% - 4px)",
                    position: "relative",
                    overflow: "hidden",
                    marginLeft: arr.length === 1 && idx === 0 ? "auto" : undefined,
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    data-brightness={img.brightness ?? 100}
                    data-contrast={img.contrast ?? 100}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      filter: filterFor(img),
                    }}
                  />
                  <NbiLabel label={img.nbiLabel} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: images 1-4 ─────────────────────────────────────── */}
        {rightImages.length > 0 && (
          <div
            style={{
              flex: "0 0 32%",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            {rightImages.map((img) => (
              <div
                key={img.id}
                style={{
                  height: "calc((100% - 18px) / 4)",
                  minHeight: 0,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
                  <img
                    src={img.url}
                    alt={img.label}
                    data-brightness={img.brightness ?? 100}
                    data-contrast={img.contrast ?? 100}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      filter: filterFor(img),
                    }}
                  />
                  <NbiLabel label={img.nbiLabel} />
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      {/*
        Doctor columns are now generated from footerDoctors (driven by the
        multi-select in ReportForm). The exact same markup/styles as before
        are reused per-doctor, so visual output is unchanged whether there
        are 1, 2, or more doctors selected.
      */}
      <div
        style={{
          flexShrink: 0,
          padding: "8px 8px 24px 60px", // Increased bottom padding to prevent printer slicing
          borderTop: "1px solid #ccc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* LEFT: Doctors */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            fontSize: "11.5px",
            lineHeight: 1.3,
            flex: 1,
          }}
        >
          {footerDoctors.map((doc) => (
            <div key={doc.id}>
              <p style={{ margin: 0, fontWeight: "700" }}>{doc.name}</p>
              {doc.qualifications && (
                <p style={{ margin: 0 }}>{doc.qualifications}</p>
              )}
              {doc.designation && (
                <p style={{ margin: 0 }}>{doc.designation}</p>
              )}
            </div>
          ))}
        </div>

        {/* RIGHT: WEO */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", paddingRight: "16px", marginLeft: "auto", flexShrink: 0 }}>
          <img
            src="/images/weo.png"
            alt="WEO"
            style={{ height: "42px", display: "block" }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div style={{ textAlign: "right" }}>
            <p
              style={{
                fontSize: "11px",
                color: "#2a7a2a",
                margin: 0,
                fontWeight: "700",
              }}
            >
              विश्व एंडोस्कोपी संस्था द्वारा प्रमाणित
            </p>
            <p
              style={{
                fontSize: "11px",
                color: "#2a7a2a",
                margin: "1px 0 0 0",
                fontWeight: "700",
              }}
            >
              Recognized by World Endoscopy Organization
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;