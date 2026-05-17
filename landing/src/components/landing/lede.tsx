export function Lede() {
  return (
    <section className="border-t border-paper-edge/60">
      <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 md:py-28">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10">
          {/* Section label */}
          <div className="col-span-12 md:col-span-3">
            <div className="sticky top-8 flex items-start gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-brass-deep">
              <span aria-hidden className="mt-2 inline-block h-px w-6 bg-brass-deep" />
              <span>
                §&nbsp;I
                <br />
                <span className="text-ink-muted">The Preface</span>
              </span>
            </div>
          </div>

          {/* Body — magazine lede with drop cap */}
          <div className="col-span-12 md:col-span-9 md:max-w-[820px]">
            <p className="dropcap font-serif text-[22px] leading-[1.5] text-ink md:text-[26px] md:leading-[1.48]">
              Marine surveying is craft work. A surveyor walks a dock with a
              moisture meter, a flashlight, and three decades of pattern
              recognition — then returns to the office to type the whole
              inspection into a&nbsp;Word document by Friday. Sloopquest is the
              first workspace built with reverence for what they actually do:
              capture findings inline, photograph in context, and publish a
              polished report{" "}
              <em className="italic text-brass-deep">
                without ever leaving the document.
              </em>
            </p>

            <div className="mt-10 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-muted">
              <span className="inline-block h-px w-9 bg-ink-muted/60" />
              From the editor &middot; Spring 2026
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
