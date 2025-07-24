import { NextRequest, NextResponse } from "next/server";
import { getFile } from "~/lib/s3Client";
import Papa from "papaparse";
import { AccessList } from "~/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const { body } = await getFile("access.csv");

  const csvString = new TextDecoder().decode(body);
  const { data: accessList } = Papa.parse(csvString, { header: true });
  // accessList is now an array of objects
  const hasAccess = (accessList as AccessList[]).find((v) => v.email === email);

  return NextResponse.json({
    hasAccess: !!hasAccess,
  });
}
