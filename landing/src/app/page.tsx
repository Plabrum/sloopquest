import { Anatomy } from "@/components/landing/anatomy";
import { Cta } from "@/components/landing/cta";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Lede } from "@/components/landing/lede";
import { Nav } from "@/components/landing/nav";
import { Pillars } from "@/components/landing/pillars";
import { Specifications } from "@/components/landing/specifications";

export default function HomePage() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <Lede />
      <Pillars />
      <Anatomy />
      <Specifications />
      <Cta />
      <Footer />
    </main>
  );
}
