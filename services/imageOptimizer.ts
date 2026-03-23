const IMAGE_SIZES = [720, 960, 1280, 2560];

export const IMAGE_SIZE_OPTIONS: (number | null)[] = [...IMAGE_SIZES, null];

export function scaleImageToMaxSize(dataUrl: string, maxSize: number): Promise<{ dataUrl: string; base64: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const longSide = Math.max(img.width, img.height);
      if (longSide <= maxSize) {
        resolve({ dataUrl, base64: dataUrl.split(',')[1] });
        return;
      }
      const scale = maxSize / longSide;
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      const result = canvas.toDataURL('image/png');
      resolve({ dataUrl: result, base64: result.split(',')[1] });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
