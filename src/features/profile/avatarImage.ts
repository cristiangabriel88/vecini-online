import { avatarThumbDim, squareCropRect } from './profileLogic';

/**
 * Read a picked image file, center-crop it to a capped square, and return a JPEG
 * data URL. The crop maths lives (pure + tested) in `profileLogic`; the canvas
 * draw is kept here, out of that pure module, because it needs the DOM. Shared by
 * the profile editor and the first-login welcome flow.
 */
export function fileToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode'));
      img.onload = () => {
        const { sx, sy, size } = squareCropRect(img.naturalWidth, img.naturalHeight);
        const dim = avatarThumbDim(size);
        const canvas = document.createElement('canvas');
        canvas.width = dim;
        canvas.height = dim;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas'));
          return;
        }
        ctx.drawImage(img, sx, sy, size, size, 0, 0, dim, dim);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
