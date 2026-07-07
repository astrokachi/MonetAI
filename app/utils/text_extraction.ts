// npm i @llamaindex/liteparse
import { LiteParse } from "@llamaindex/liteparse";

export async function extractText(file: File, password?: string) {
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const parser = new LiteParse({
    ocrEnabled: true,
    password,
    outputFormat: "json",
  });
  const result = await parser.parse(uint8Array);
  console.log(result.pages[0].textItems[0]);

  //   const parser = new PDFParse({
  //     data: uint8Array,
  //     password
  //   })

  // const textResult = await parser.getText();
  return result.text;
}
