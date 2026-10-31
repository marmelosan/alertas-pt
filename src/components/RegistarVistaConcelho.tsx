"use client";

import { useEffect } from "react";
import { registarVistaConcelho } from "@/lib/analytics";

/** Dispara concelho_page_view uma vez por montagem — a página em si é um Server Component, por isso isto fica num filho cliente. */
export function RegistarVistaConcelho({ concelho }: { concelho: string }) {
  useEffect(() => {
    registarVistaConcelho(concelho);
  }, [concelho]);

  return null;
}
