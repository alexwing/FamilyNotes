import jsQR from "jsqr";

/**
 * Decodes a QR code from a user-uploaded image file (PNG, JPG, WEBP, etc.)
 */
export async function decodeQrFromImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Error al leer el archivo de imagen."));
    };

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("No se pudo cargar la imagen. Formato no compatible."));
      };

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            reject(new Error("Dimensiones de imagen no válidas."));
            return;
          }

          // Scale down if image is huge (e.g. 48MP smartphone photo) for blazing fast decoding
          const MAX_DIM = 1600;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (!ctx) {
            reject(new Error("No se pudo inicializar el procesador de imágenes (Canvas 2D)."));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          // Try decoding
          const result = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (result && result.data) {
            resolve(result.data);
          } else {
            reject(
              new Error(
                "No se encontró ningún código QR en la imagen. Asegúrate de que el código esté bien enfocado e iluminado."
              )
            );
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          reject(new Error(`Error al decodificar la imagen: ${msg}`));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
