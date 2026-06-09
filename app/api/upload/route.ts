import { extractText } from "@/app/utils/text_extraction";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const password = req.headers.get("x-pdf-password") || undefined;

    extractText(file, password);
    const transactions = ""
    return Response.json(transactions);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Failed to parse PDF" }, { status: 500 });
  }
}

