import { redirect } from "next/navigation";
import { estaAutenticado } from "@/lib/admin-auth";
import { FormularioAlertaOficial } from "@/components/FormularioAlertaOficial";

export const dynamic = "force-dynamic";

export default async function NovoAlertaOficialPagina() {
  if (!(await estaAutenticado())) {
    redirect("/admin/login");
  }

  return <FormularioAlertaOficial />;
}
