
/**
 * Processes an image file: resizes it if it exceeds max dimensions and compresses it to be under a max size.
 * @param file The original file
 * @param maxWidth Max width in pixels (default 1920)
 * @param maxHeight Max height in pixels (default 1920)
 * @param maxSizeBytes Max size in bytes (default 120KB = 120 * 1024)
 * @returns Promise<Blob>
 */
export const processImage = (
    file: File,
    maxWidth = 1920,
    maxHeight = 1920,
    maxSizeBytes = 122880 // 120KB
): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = width * ratio;
                height = height * ratio;
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                URL.revokeObjectURL(img.src);
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Iterative compression to reach target size
            let quality = 0.9;

            const attemptCompression = () => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            URL.revokeObjectURL(img.src);
                            reject(new Error('Compression failed'));
                            return;
                        }

                        if (blob.size <= maxSizeBytes || quality <= 0.1) {
                            URL.revokeObjectURL(img.src);
                            // Convert blob back to File
                            const processedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(processedFile);
                        } else {
                            quality -= 0.1;
                            attemptCompression();
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };

            attemptCompression();
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(img.src);
            reject(err);
        };
    });
};
