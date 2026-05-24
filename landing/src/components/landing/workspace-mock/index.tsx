import { NextSectionHint, SectionHeader } from "./document";
import { WorkspaceFooter } from "./footer";
import { WorkspaceHeader } from "./header";
import { ChoicePill, FieldCard } from "./primitives";
import {
  AISurveyor,
  FindingsRail,
  PhotosRail,
  RightRail,
  VesselRail,
} from "./rail";

export function WorkspaceMock() {
  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-sm border border-ink/15 bg-paper-warm"
        style={{
          boxShadow:
            "0 1px 0 #00000010, 0 14px 30px -20px rgba(13,31,44,0.30), 0 30px 60px -40px rgba(13,31,44,0.20)",
        }}
      >
        <WorkspaceHeader
          crumbs={[
            { label: "Surveys" },
            { label: "S/V Aurora", italic: true },
            { label: "Hull & Bottom" },
          ]}
          status={{ label: "In progress · 62%", tone: "moss" }}
          cta="Generate report"
        />

        <div className="grid grid-cols-12">
          <div className="col-span-12 border-r border-ink/10 bg-paper/60 px-4 py-6 md:col-span-8 md:px-8 md:py-8">
            <SectionHeader
              kicker="Section 04 of 11"
              title="Hull & Bottom"
              progress="12 / 15"
              action="Add finding"
            />
            <FieldCard label="01" name="Topside condition">
              <div className="flex flex-wrap gap-2">
                {["Excellent", "Good", "Fair", "Poor"].map((opt) => (
                  <ChoicePill
                    key={opt}
                    label={opt}
                    selected={opt === "Good"}
                  />
                ))}
              </div>
            </FieldCard>

            <FieldCard label="02" name="Hull notes">
              <p className="font-serif text-[14px] leading-[1.55] text-ink-soft">
                Gelcoat is original, sound at the bow with light spider-cracking
                along the chine.{" "}
                <span className="bg-rust/15 text-ink">
                  Three small blisters
                </span>{" "}
                noted at port quarter, below waterline. No evidence of impact
                damage. Boot stripe legible, antifouling renewed within 12
                months.
              </p>
            </FieldCard>

            <FieldCard label="03" name="Photographs · waterline">
              <div className="grid grid-cols-4 gap-2">
                {[
                  ["#2c5a6b", "#14333f"],
                  ["#6b7a4a", "#3d4929"],
                  ["#a85a3a", "#6b3a23"],
                  ["#5b6976", "#2f3a44"],
                ].map(([a, b], i) => (
                  <div
                    key={i}
                    className="aspect-[4/3] overflow-hidden rounded-sm border border-ink/10"
                    style={{
                      background: `linear-gradient(135deg, ${a}, ${b})`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
                <span>4 attached</span>
                <span className="text-ink/30">·</span>
                <button className="link-rule">+ Camera</button>
                <button className="link-rule">+ From unassigned (3)</button>
              </div>
            </FieldCard>
            <NextSectionHint
              kicker="Section 05"
              title="Deck & Topsides"
              progress="0 / 18"
            />
          </div>

          <RightRail>
            <PhotosRail
              label="Photos · Hull & Bottom"
              meta="04 of 24"
              thumbs={[
                "linear-gradient(135deg,#2c5a6b,#1a3d4a)",
                "linear-gradient(135deg,#5b6976,#1e3344)",
                "linear-gradient(135deg,#a85a3a,#6b3a23)",
                "linear-gradient(135deg,#6b7a4a,#3d4929)",
                "linear-gradient(135deg,#b8845c,#8b5e3a)",
                "linear-gradient(135deg,#2c5a6b,#14333f)",
              ]}
              unassignedLabel="Unassigned (3)"
              unassignedCount={3}
            />
            <FindingsRail
              label="Findings"
              meta="(3)"
              items={[
                {
                  severity: "critical",
                  text: "Blistering below waterline, port quarter",
                },
                {
                  severity: "advisory",
                  text: "Boot stripe weathering, starboard",
                },
                { severity: "info", text: "Antifouling renewed Aug 2025" },
              ]}
            />
            <VesselRail
              label="Vessel"
              rows={[
                { k: "LOA", v: "38′ 4″" },
                { k: "Beam", v: "11′ 9″" },
                { k: "Draft", v: "6′ 6″" },
                { k: "HIN", v: "USHIN8421J122" },
                { k: "Client", v: "J. Sallenger", link: true },
              ]}
            />
            <AISurveyor
              label="AI Surveyor"
              shortcut="⌘K"
              placeholder="Ask about blistering severity, gelcoat repair specs, or anything else on this section…"
            />
          </RightRail>
        </div>

        <WorkspaceFooter
          left="Survey № 2026-0148 · S/V Aurora"
          right="Surveyed by P. Labrum · Newport, R.I. · 23 May 2026"
        />
      </div>

      <div className="pointer-events-none absolute -left-2 -top-2 hidden h-6 w-6 border-l border-t border-ink/40 md:block" />
      <div className="pointer-events-none absolute -right-2 -top-2 hidden h-6 w-6 border-r border-t border-ink/40 md:block" />
      <div className="pointer-events-none absolute -left-2 -bottom-2 hidden h-6 w-6 border-l border-b border-ink/40 md:block" />
      <div className="pointer-events-none absolute -right-2 -bottom-2 hidden h-6 w-6 border-r border-b border-ink/40 md:block" />
    </div>
  );
}
