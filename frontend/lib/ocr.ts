// In production the FastAPI server serves both the web app and OCR endpoints.
// A configured URL remains available for external deployments.
const ocrApiUrl = import.meta.env.VITE_OCR_API_URL || ""

export async function extractCertificate(
  file: File,
  extractIelts = true,
): Promise<Record<string, unknown>> {
  const formData = new FormData()
  formData.append("file", file)

  let response: Response
  try {
    response = await fetch(`${ocrApiUrl}/ocr`, {
      method: "POST",
      body: formData,
    })
  } catch {
    throw new Error("Application service is offline. Run: pnpm start")
  }
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.detail || "OCR service could not process this file.")
  if (!extractIelts) return body.result

  const rawText = body?.result?.raw_text
  if (typeof rawText !== "string" || !rawText.trim()) {
    throw new Error("OCR returned no text to extract.")
  }
  const extractionResponse = await fetch(`${ocrApiUrl}/extract/ielts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ocr_text: rawText }),
  })
  const extraction = await extractionResponse.json().catch(() => null)
  if (!extractionResponse.ok) {
    throw new Error(extraction?.detail || "AI could not extract IELTS fields.")
  }
  return extraction.result
}
