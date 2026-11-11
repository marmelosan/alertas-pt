import { NextRequest, NextResponse } from "next/server";
import { segredoValido, tokenDeSessao, NOME_COOKIE_ADMIN } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  let corpo: { password?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  if (typeof corpo.password !== "string" || !segredoValido(corpo.password)) {
    return NextResponse.json({ erro: "password incorreta" }, { status: 401 });
  }

  const token = tokenDeSessao();
  if (!token) {
    return NextResponse.json({ erro: "ADMIN_SECRET não está configurado" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(NOME_COOKIE_ADMIN, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h — suficiente para uma sessão de moderação, não guarda sessão para sempre
  });
  return res;
}
