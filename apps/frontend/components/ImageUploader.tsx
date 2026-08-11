import React, { useRef, useState } from "react";
import { FiCamera, FiSearch } from "react-icons/fi";
import { MdDragIndicator } from "react-icons/md";
import { PreviousImagePicker } from "./PreviousImagePicker";

interface ImageData {
  id: string;
  url: string;
  label: string;
  nbiLabel?: string;
  isNbi?: boolean;
  brightness?: number;
  filePath?: string;
  contrast?: number;
}

interface ImageUploaderProps {
  images: ImageData[];
  onImagesAdded: (images: ImageData[]) => void;
  onImagesUpdated: (images: ImageData[]) => void;
  onImageRemoved: (id: string) => void;
  onImageLabelChanged: (id: string, label: string) => void;
  maxImages?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onImagesAdded,
  onImagesUpdated,
  onImageRemoved,
  onImageLabelChanged,
  maxImages = 6,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);
  const [dragOverImgIdx, setDragOverImgIdx] = useState<number | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  const remainingSlots = maxImages - images.length;
  const filesToAdd = files.slice(0, remainingSlots);

  const newImages: ImageData[] = [];

  for (let i = 0; i < filesToAdd.length; i++) {
    const file = filesToAdd[i];

    // convert to base64
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    newImages.push({
      id: crypto.randomUUID(),
      url: base64, 
      filePath: "", // Will be saved to disk upon Report Save
      label: `Image ${images.length + i + 1}`,
      brightness: 100,
      contrast: 100,
    });
  }

  onImagesAdded(newImages);

  if (fileInputRef.current) {
    fileInputRef.current.value = "";
  }
};

  const handleImportOldImages = (importedImages: any[]) => {
    const remainingSlots = maxImages - images.length;
    const imagesToAdd = importedImages.slice(0, remainingSlots);
    
    const newImages: ImageData[] = imagesToAdd.map((img, i) => ({
      id: crypto.randomUUID(),
      url: `endo:///${img.file_path.replace(/\\/g, "/")}`, // Display locally using custom protocol
      filePath: img.file_path, // Persist reference to existing file
      label: `Image ${images.length + i + 1}`,
      brightness: img.brightness || 100,
      contrast: img.contrast || 100,
      isNbi: !!img.nbi_label,
      nbiLabel: img.nbi_label
    }));

    onImagesAdded(newImages);
    setShowPicker(false);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ color: "#1a3a52", marginTop: 0, marginBottom: 12, fontSize: 14, fontFamily: "'Inter', sans-serif", fontWeight: 600, display: "flex", alignItems: "center" }}>
        <FiCamera style={{ marginRight: 8 }} /> Upload Endoscopy Images ({images.length}/{maxImages})
      </h3>

      {images.length < maxImages && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
          <div
            style={{
              border: "2px dashed #007bff",
              borderRadius: 6,
              padding: 20,
              textAlign: "center",
              backgroundColor: "#f0f8ff",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif"
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <p style={{ margin: "0 0 5px 0", fontWeight: "bold", color: "#007bff" }}>
              Click to upload up to {maxImages} image(s)
            </p>
            <p style={{ margin: 0, color: "#666", fontSize: 12 }}>
              or drag and drop PNG, JPG, JPEG images
            </p>
          </div>
          
          <button
            onClick={() => setShowPicker(true)}
            style={{
              padding: "12px",
              backgroundColor: "white",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "#333",
              fontWeight: "bold",
              fontSize: "13px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
            }}
          >
            <FiSearch color="#007bff" size={16} /> Browse Previous Reports
          </button>
        </div>
      )}

      {images.length > 0 && (
        <div>
          <div 
            style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedImgIdx !== null && dragOverImgIdx !== null && draggedImgIdx !== dragOverImgIdx) {
                const newImages = [...images];
                const draggedItem = newImages[draggedImgIdx];
                newImages.splice(draggedImgIdx, 1);
                newImages.splice(dragOverImgIdx, 0, draggedItem);
                onImagesUpdated(newImages);
              }
              setDraggedImgIdx(null);
              setDragOverImgIdx(null);
            }}
          >
            {images.map((img, index) => (
              <div
                key={img.id}
                draggable
                onDragStart={(e) => {
                  setDraggedImgIdx(index);
                  e.dataTransfer.effectAllowed = "move";
                  // transparent drag image so it doesn't look messy
                  const dragGhost = document.createElement("div");
                  e.dataTransfer.setDragImage(dragGhost, 0, 0);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverImgIdx(index);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => {
                  setDraggedImgIdx(null);
                  setDragOverImgIdx(null);
                }}
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  padding: 10,
                  backgroundColor: "#f9f9f9",
                  borderRadius: 4,
                  borderLeft: "4px solid #007bff",
                  borderTop: dragOverImgIdx === index ? "2px solid #007bff" : "none",
                  opacity: draggedImgIdx === index ? 0.4 : 1,
                  transition: "border 0.2s, opacity 0.2s",
                }}
              >
                <div style={{ cursor: "grab", color: "#adb5bd", padding: "0 4px", display: "flex", alignItems: "center" }}>
                  <MdDragIndicator size={20} />
                </div>
                <img
                  src={img.url}
                  alt={img.label}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 3,
                    objectFit: "cover",
                    border: "1px solid #ddd",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6, pointerEvents: draggedImgIdx !== null ? "none" : "auto" }}>
                  <input
                    type="text"
                    value={img.label}
                    onChange={(e) => onImageLabelChanged(img.id, e.target.value)}
                    style={{
                      padding: 6,
                      border: "1px solid #ddd",
                      borderRadius: 3,
                      fontSize: 11,
                    }}
                  />
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: "bold", cursor: "pointer", color: "#007bff" }}>
                      <input
                        type="checkbox"
                        checked={img.isNbi || false}
                        onChange={(e) => {
                          const updated = images.map((i) =>
                            i.id === img.id
                              ? {
                                  ...i,
                                  isNbi: e.target.checked,
                                  nbiLabel: e.target.checked ? "NBI" : undefined,
                                }
                              : i
                          );
                          onImagesUpdated(updated);
                        }}
                        style={{ accentColor: "#007bff", cursor: "pointer", margin: 0 }}
                      />
                      NBI Tag
                    </label>
                  </div>
                </div>

                <button
                  onClick={() => onImageRemoved(img.id)}
                  style={{
                    padding: "6px 10px",
                    backgroundColor: "#dc3545",
                    color: "white",
                    border: "none",
                    borderRadius: 3,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: "bold",
                    marginLeft: 4
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPicker && (
        <PreviousImagePicker 
          onClose={() => setShowPicker(false)}
          onImport={handleImportOldImages}
        />
      )}
    </div>
  );
};

export default ImageUploader;