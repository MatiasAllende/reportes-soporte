import { NextResponse } from "next/server";
import { parseTechniciansCsv } from "@/lib/csv-technicians";
import {
  listTechnicians,
  upsertTechnicians,
} from "@/lib/repositories/technicians";

export const runtime = "nodejs";

export async function GET() {
  const technicians = await listTechnicians({ activeOnly: true });
  return NextResponse.json({ technicians });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Adjuntá un archivo CSV en el campo file" },
      { status: 400 },
    );
  }

  const text = await file.text();
  const parsed = parseTechniciansCsv(text);

  if (parsed.rejected.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "La importación se rechazó por filas inválidas",
        accepted: 0,
        rejected: parsed.rejected,
      },
      { status: 400 },
    );
  }

  if (parsed.accepted.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No hay filas para importar" },
      { status: 400 },
    );
  }

  const technicians = await upsertTechnicians(parsed.accepted);
  return NextResponse.json({
    ok: true,
    accepted: technicians.length,
    rejected: [],
    technicians,
  });
}
