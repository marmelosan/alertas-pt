import { BotaoImprimir } from "@/components/BotaoImprimir";

export function ChecklistImprimivel({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-stone-200 p-4 print:border-black dark:border-stone-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-stone-900 dark:text-stone-50">{titulo}</h2>
        <BotaoImprimir />
      </div>
      <ul className="flex flex-col gap-1.5 text-sm text-stone-700 dark:text-stone-300">
        {itens.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 rounded border border-stone-400 print:border-black"
            />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
