import { getDocument } from "pdfjs-dist";

export async function extractText(file: File, password?: string) {
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const text = getDocument({
    data: uint8Array,
    password
  })

  console.log(text);

  return;
}
