import { NextResponse } from "next/server";
import { NOME_COOKIE_ADMIN } from "@/lib/admin-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(NOME_COOKIE_ADMIN);
  return res;
}
