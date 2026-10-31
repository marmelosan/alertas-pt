import { Zap, Droplet } from "lucide-react";

export function Logo({ size = 18 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Zap size={size} className="shrink-0 fill-amber-500 text-amber-500" aria-hidden />
      <Droplet size={size} className="-ml-1.5 shrink-0 fill-sky-500 text-sky-500" aria-hidden />
      <span className="whitespace-nowrap">Foi Abaixo</span>
    </span>
  );
}
