import { createWorker } from 'tesseract.js'

/**
 * Runs OCR on an image (e.g. a Libby history screenshot) and returns the
 * raw recognized text. Loads English + German language data on first use.
 */
export async function recognizeImageText(
  image: File | Blob,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const worker = await createWorker('eng+deu', undefined, {
    logger: (message) => {
      if (message.status === 'recognizing text' && onProgress) {
        onProgress(message.progress)
      }
    },
  })
  try {
    const {
      data: { text },
    } = await worker.recognize(image)
    return text
  } finally {
    await worker.terminate()
  }
}
