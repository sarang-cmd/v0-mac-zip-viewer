import { NextRequest, NextResponse } from "next/server";
import { parseZipBuffer } from "@/lib/zip-parser";
import type { ParseResponse, ErrorResponse } from "@/lib/types";

// Rate limiting (simple in-memory, per-IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // 20 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ParseResponse | ErrorResponse>> {
  try {
    // Rate limit check
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again in a minute." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided." },
        { status: 400 }
      );
    }

    // Validate MIME type
    const validTypes = [
      "application/zip",
      "application/x-zip-compressed",
      "application/x-zip",
      "application/octet-stream",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".zip")) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Please upload a ZIP file.",
        },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const result = await parseZipBuffer(buffer, file.name);

    return NextResponse.json({
      success: true,
      tree: result.tree,
      metadata: {
        zipFileName: file.name,
        totalFiles: result.totalFiles,
        totalFolders: result.totalFolders,
        totalSize: result.totalSize,
        totalCompressedSize: result.totalCompressedSize,
        entryCount: result.entryCount,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unknown error occurred.";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
