import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface CanvasEditorProps {
  imageSrc: string | null;
  topText: string;
  bottomText: string;
  caption: string;
}

export interface CanvasHandle {
  download: () => void;
}

const CanvasEditor = forwardRef<CanvasHandle, CanvasEditorProps>(({ imageSrc, topText, bottomText, caption }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    download: () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const link = document.createElement('a');
        link.download = 'meme-gen-ai.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      // Set canvas dimensions to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw Image
      ctx.drawImage(img, 0, 0);

      // Configure Text Styles
      const fontSize = Math.floor(canvas.width / 10);
      ctx.font = `900 ${fontSize}px Impact`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = Math.floor(fontSize / 8);
      ctx.lineJoin = 'round';

      // Helper to draw text with stroke
      const drawText = (text: string, x: number, y: number, baseline: CanvasTextBaseline) => {
        ctx.textBaseline = baseline;
        ctx.strokeText(text.toUpperCase(), x, y);
        ctx.fillText(text.toUpperCase(), x, y);
      };

      const padding = Math.floor(canvas.height / 20);

      // Classic Top/Bottom Meme Format
      if (topText) {
        drawText(topText, canvas.width / 2, padding, 'top');
      }
      if (bottomText) {
        drawText(bottomText, canvas.width / 2, canvas.height - padding, 'bottom');
      }

      // Modern "Caption" Format (White bar at top usually, but here we overlay at bottom third or center if others missing)
      if (caption && !topText && !bottomText) {
         // Auto-wrap text logic for long AI captions
         const maxWidth = canvas.width - (padding * 2);
         const words = caption.split(' ');
         let line = '';
         const lines = [];
         
         // Smaller font for longer captions
         const captionFontSize = Math.floor(canvas.width / 15);
         ctx.font = `900 ${captionFontSize}px Impact`;
         ctx.lineWidth = Math.floor(captionFontSize / 8);

         for(let n = 0; n < words.length; n++) {
           const testLine = line + words[n] + ' ';
           const metrics = ctx.measureText(testLine);
           const testWidth = metrics.width;
           if (testWidth > maxWidth && n > 0) {
             lines.push(line);
             line = words[n] + ' ';
           } else {
             line = testLine;
           }
         }
         lines.push(line);

         // Draw lines at the bottom area
         const lineHeight = captionFontSize * 1.2;
         const totalHeight = lines.length * lineHeight;
         let startY = canvas.height - totalHeight - padding;

         lines.forEach((l, i) => {
            drawText(l.trim(), canvas.width / 2, startY + (i * lineHeight), 'top');
         });
      }
    };
  }, [imageSrc, topText, bottomText, caption]);

  if (!imageSrc) {
    return (
      <div className="w-full h-96 bg-slate-800 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600 text-slate-400">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="mt-2 block text-sm font-medium">No Image Selected</span>
        </div>
      </div>
    );
  }

  return (
    <canvas 
      ref={canvasRef} 
      className="max-w-full h-auto rounded-lg shadow-2xl mx-auto border-4 border-slate-700"
    />
  );
});

CanvasEditor.displayName = 'CanvasEditor';

export default CanvasEditor;