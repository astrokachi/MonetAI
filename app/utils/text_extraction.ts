import { PDFParse } from "pdf-parse";

export async function extractText(file: File, password?: string) {
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const parser = new PDFParse({
    data: uint8Array,
    password
  })

  const textResult = await parser.getText();
  return textResult.text;
}
