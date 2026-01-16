import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { importDraftData, importFAData } from "@/lib/importers";
import type { ImportType } from "@/lib/importers";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check commissioner role
    if (!session.user.isCommissioner) {
      return NextResponse.json(
        { error: "Forbidden - Commissioner access required" },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const importType = formData.get("importType") as ImportType | null;
    const seasonYearStr = formData.get("seasonYear") as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!importType || !["draft", "fa"].includes(importType)) {
      return NextResponse.json(
        { error: "Invalid import type. Must be 'draft' or 'fa'" },
        { status: 400 }
      );
    }

    if (!seasonYearStr) {
      return NextResponse.json(
        { error: "Season year is required" },
        { status: 400 }
      );
    }

    const seasonYear = parseInt(seasonYearStr, 10);
    if (isNaN(seasonYear) || seasonYear < 2000 || seasonYear > 2100) {
      return NextResponse.json(
        { error: "Invalid season year" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx")) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel file (.xlsx)" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run appropriate import based on type
    let result;
    if (importType === "draft") {
      result = await importDraftData(buffer, seasonYear);
    } else {
      result = await importFAData(buffer, seasonYear);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Import error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Import failed: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!session.user.isCommissioner) {
    return NextResponse.json(
      { error: "Forbidden - Commissioner access required" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    endpoint: "/api/admin/import",
    method: "POST",
    contentType: "multipart/form-data",
    parameters: {
      file: "Excel file (.xlsx) - required",
      importType: "'draft' | 'fa' - required",
      seasonYear: "Season year (e.g., 2024) - required",
    },
    notes: {
      draft: "Import draft picks. Creates season, teams, players, and draft acquisitions.",
      fa: "Import FA signings. Requires season/teams to exist first (run draft import first).",
    },
  });
}
