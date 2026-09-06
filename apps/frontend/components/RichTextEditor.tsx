"use client";

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { FiBold, FiItalic, FiRotateCcw, FiRotateCw, FiType } from 'react-icons/fi';

// Helper to convert old markdown-style text into HTML seamlessly
export const parseLegacyMarkdownToHTML = (text: string) => {
  if (!text) return "";
  // If it already looks like HTML (like what Tiptap produces), leave it alone
  if (text.includes("<p>") || text.includes("<strong>") || text.includes("<span")) {
    return text;
  }
  return `<p>${text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/!!(.*?)!!/g, "<span style=\"color: #ef4444\">$1</span>")
    .replace(/&&(.*?)&&/g, "<span style=\"color: #22c55e\">$1</span>")
    .replace(/%%(.*?)%%/g, "<span style=\"color: #eab308\">$1</span>")
    .replace(/\n/g, "<br>")}</p>`;
};

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: string;
  highlight?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, minHeight = "100px", highlight = false }) => {
  const [isMounted, setIsMounted] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
    ],
    content: parseLegacyMarkdownToHTML(value),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: `min-height: ${minHeight}; padding: 12px 14px; outline: none; font-size: 14px; font-family: 'Inter', sans-serif; line-height: 1.5; color: #1e293b; cursor: text;`,
        class: 'tiptap-editor-content'
      },
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update content if value changes externally (e.g., loading a new template)
  useEffect(() => {
    if (editor && value) {
      const currentHtml = editor.getHTML();
      const parsedValue = parseLegacyMarkdownToHTML(value);
      // Only update if they differ (prevents cursor jumping while typing)
      if (parsedValue !== currentHtml && value !== currentHtml) {
        editor.commands.setContent(parsedValue);
      }
    } else if (editor && !value) {
       editor.commands.setContent("");
    }
  }, [value, editor]);

  if (!isMounted || !editor) {
    return (
      <div style={{ minHeight, border: "1.5px solid #e2e8f0", borderRadius: "10px", background: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
        Loading Editor...
      </div>
    );
  }

  const btnStyle = (isActive: boolean) => ({
    background: isActive ? "#e2e8f0" : "transparent",
    border: "none",
    borderRadius: "6px",
    width: "28px",
    height: "28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: isActive ? "#0f172a" : "#64748b",
    transition: "all 0.15s ease",
  });

  const colorBtnStyle = (colorHex: string, isActive: boolean) => ({
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: colorHex,
    border: isActive ? "2px solid #0f172a" : "2px solid transparent",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    boxSizing: "border-box" as const,
    transition: "transform 0.1s ease",
    transform: isActive ? "scale(1.1)" : "scale(1)",
  });

  return (
    <div style={{
      border: `1.5px solid ${highlight ? "#fca5a5" : "#e2e8f0"}`,
      borderRadius: "10px",
      overflow: "hidden",
      background: highlight ? "#fff" : "#fafafa",
      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Toolbar ── */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "6px",
        padding: "6px 10px",
        borderBottom: "1.5px solid #e2e8f0",
        background: "#f8f9fa"
      }}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={btnStyle(editor.isActive('bold'))}
          title="Bold"
        >
          <FiBold size={15} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={btnStyle(editor.isActive('italic'))}
          title="Italic"
        >
          <FiItalic size={15} />
        </button>

        <div style={{ width: "1px", height: "16px", background: "#cbd5e1", margin: "0 4px" }} />

        {/* Circular Color Buttons */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setColor('#ef4444').run()}
          style={colorBtnStyle('#ef4444', editor.isActive('textStyle', { color: '#ef4444' }))}
          title="Red"
        />
        <button
          type="button"
          onClick={() => editor.chain().focus().setColor('#b45309').run()}
          style={colorBtnStyle('#b45309', editor.isActive('textStyle', { color: '#b45309' }))}
          title="Yellow (Darker for Print)"
        />
        <button
          type="button"
          onClick={() => editor.chain().focus().setColor('#22c55e').run()}
          style={colorBtnStyle('#22c55e', editor.isActive('textStyle', { color: '#22c55e' }))}
          title="Green"
        />
        <label style={{ ...colorBtnStyle('transparent', false), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', border: '2px dashed #94a3b8' }} title="Custom Color">
          <input
            type="color"
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            style={{ opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
          />
        </label>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetColor().run()}
          style={{
            ...btnStyle(false),
            width: "auto",
            padding: "0 6px",
            fontSize: "12px",
            color: "#64748b",
            marginLeft: "4px"
          }}
          title="Clear Color"
        >
          <FiType size={14} style={{ marginRight: "4px" }} /> Reset Color
        </button>

        <div style={{ width: "1px", height: "16px", background: "#cbd5e1", margin: "0 4px" }} />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          style={{ ...btnStyle(false), opacity: editor.can().undo() ? 1 : 0.4 }}
          title="Undo"
        >
          <FiRotateCcw size={14} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          style={{ ...btnStyle(false), opacity: editor.can().redo() ? 1 : 0.4 }}
          title="Redo"
        >
          <FiRotateCw size={14} />
        </button>
      </div>

      {/* ── Editor Content ── */}
      <div style={{ flex: 1, overflowY: "auto", cursor: "text" }} onClick={() => editor.commands.focus()}>
        <style>{`
          .tiptap-editor-content p {
            margin-top: 0;
            margin-bottom: 0;
          }
        `}</style>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default RichTextEditor;
