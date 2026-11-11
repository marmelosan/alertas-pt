import { redirect } from "next/navigation";
import { estaAutenticado } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { PainelAdmin } from "@/components/PainelAdmin";
import type { Alerta } from "@/types/alerta";

export const dynamic = "force-dynamic"; // nunca cacheado — é um painel de moderação, tem de mostrar o estado real

export default async function PaginaAdmin() {
  if (!(await estaAutenticado())) {
    redirect("/admin/login");
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("alertas")
    .select("*")
    .eq("origem", "comunidade")
    .order("criado_em", { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(`não consegui carregar os reportes: ${error.message}`);
  }

  return <PainelAdmin reportesIniciais={(data ?? []) as Alerta[]} />;
}
