import type { ReactNode } from "react";

export interface MetadataItem {
  label: string;
  value: string | ReactNode;
}

interface MetadataRowProps {
  items: MetadataItem[];
  title?: string;
}

export function MetadataRow({ items, title }: MetadataRowProps) {
  return (
    <div className="rounded-xl bg-primary/[0.07] px-5 py-3">
      {title && (
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6D6C6A]">
          {title}
        </p>
      )}
      <div className="flex">
        {items.map((item, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
            <span className="text-[11px] font-medium text-[#6D6C6A]">
              {item.label}
            </span>
            <span className="text-[13px] font-semibold text-[#1A1918]">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
