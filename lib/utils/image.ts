// utility functions for working with images and crops

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (err) => {
      console.error("createImage failed to load", url, err);
      reject(err);
    });
    // crossOrigin is only needed for remote images; setting it on blob URLs
    // can trigger failures in some browsers, so skip it when we're already
    // dealing with a local blob.
    if (!url.startsWith("blob:")) {
      img.setAttribute("crossOrigin", "anonymous");
    }
    img.src = url;
  });
}

// given an image source and a cropping area (in pixels coordinates returned
// by react-easy-crop), return a blob containing the cropped image (square).
// The result is downscaled to a maximum side length (256px by default) and
// encoded as JPEG with reduced quality to speed up upload.
export async function getCroppedImg(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  maxSize = 256,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  // draw the raw cropped area first
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not get canvas context");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  let outputCanvas = canvas;
  if (crop.width > maxSize || crop.height > maxSize) {
    const scale = maxSize / Math.max(crop.width, crop.height);
    outputCanvas = document.createElement("canvas");
    outputCanvas.width = Math.round(crop.width * scale);
    outputCanvas.height = Math.round(crop.height * scale);
    const ctx2 = outputCanvas.getContext("2d");
    if (!ctx2) throw new Error("Could not get canvas context");
    ctx2.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);
  }

  return new Promise((resolve) => {
    outputCanvas.toBlob(
      (blob) => {
        if (!blob) throw new Error("Canvas is empty");
        resolve(blob);
      },
      "image/jpeg",
      0.8, // quality
    );
  });
}
