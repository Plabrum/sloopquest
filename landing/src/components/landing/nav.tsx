import Link from "next/link";
import { appUrl } from "@/lib/app-url";
import { Wordmark } from "./marks";
import { PrimaryButton } from "./primary-button";

const links = [
  { href: "/#approach", label: "Approach" },
  { href: "/#workspace", label: "Workspace" },
  { href: "/#specs", label: "Specs" },
  { href: "/#pricing", label: "Pricing" },
  // TODO: re-enable when /almanac (blog / quarterly field-notes) is built out
  // beyond the stub page. Flesh out as an MDX index when we commit to publishing.
  // { href: "/almanac", label: "Almanac" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-paper-edge/70 bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 md:px-10 md:py-5">
        <Link href="/" className="group inline-flex items-center">
          <Wordmark className="transition-colors group-hover:text-brass-deep" />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="t-link link-grow hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={appUrl("/auth")}
            className="t-link link-grow hidden hover:text-ink sm:inline"
          >
            Sign in
          </Link>
          <PrimaryButton href={appUrl("/auth")} size="compact" showStar={false}>
            <span className="sm:hidden">Begin</span>
            <span className="hidden sm:inline">Begin a survey</span>
          </PrimaryButton>
        </div>
      </div>
    </header>
  );
}
