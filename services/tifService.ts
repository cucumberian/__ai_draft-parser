import * as UTIF from 'utif2';

export function isTifFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === 'image/tiff' || name.endsWith('.tif') || name.endsWith('.tiff');
}

export async function tifToImageBase64(file: File): Promise<{ previewUrl: string; base64: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const ifds = UTIF.decode(arrayBuffer);

  if (ifds.length === 0) {
    throw new Error('No images found in TIFF file');
  }

  UTIF.decodeImage(arrayBuffer, ifds[0]);
  const rgba = UTIF.toRGBA8(ifds[0]);
  const { width, height } = ifds[0];

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const imageData = ctx.createImageData(width, height);
  const photometricInterpretation = ifds[0]['t262'] as number | undefined;
  for (let i = 0; i < rgba.length; i += 4) {
    if (photometricInterpretation === 0) {
      imageData.data[i] = 255 - rgba[i];
      imageData.data[i + 1] = 255 - rgba[i + 1];
      imageData.data[i + 2] = 255 - rgba[i + 2];
    } else {
      imageData.data[i] = rgba[i];
      imageData.data[i + 1] = rgba[i + 1];
      imageData.data[i + 2] = rgba[i + 2];
    }
    imageData.data[i + 3] = rgba[i + 3];
  }

  ctx.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL('image/png');
  return {
    previewUrl: dataUrl,
    base64: dataUrl.split(',')[1]
  };
}
