import { Plate } from "./plate";
import { SectionLabel } from "./section-label";
import { WorkspaceMock } from "./workspace-mock";

export function Anatomy() {
  return (
    <Plate id="workspace">
      {/* Header */}
      <div className="mb-12 grid grid-cols-12 gap-x-6 border-b border-paper-edge/70 pb-8">
        <div className="col-span-12 md:col-span-3">
          <SectionLabel numeral="IV" title="Plate 01" />
        </div>
        <div className="col-span-12 md:col-span-9">
          <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] font-light leading-[1] tracking-[-0.02em] text-ink">
            Anatomy of{" "}
            <span className="fv-display-italic italic text-brass-deep">
              the workspace.
            </span>
          </h2>
          <p className="mt-4 max-w-2xl font-serif text-[17px] leading-[1.55] text-ink-soft">
            Six regions, each doing one thing well. The document is the only
            thing that scrolls. The nav, photos, findings, and dictation
            panel all follow along with{" "}
            <em className="italic">whatever section you&rsquo;re on.</em>
          </p>
        </div>
      </div>

      <WorkspaceMock />

      {/* Caption + labels */}
      <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-3">
        <Caption
          label="A · Custom survey templates"
          text="Build the checklist once for pre-purchase, insurance, damage, or condition & value, then reuse it on every hull. Sections, fields, and required findings match the way you actually work."
        />
        <Caption
          label="B · Single document view"
          text="The whole survey in one scrollable column, system by system. No tabs, no modals, no hunting for the page you were on when the owner walked up."
        />
        <Caption
          label="C · Easy photo management"
          text="Shoot from your phone, drop straight onto the finding. Every photo stays attached to the finding it documents. No folder of 400 untitled JPEGs to sort later."
        />
      </div>
    </Plate>
  );
}

function Caption({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-l border-brass/60 pl-4">
      <div className="t-kicker mb-2">{label}</div>
      <p className="font-serif text-[15px] leading-[1.5] text-ink-soft">
        {text}
      </p>
    </div>
  );
}
