import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Gaussians from "@/components/Gaussians";
import Pipeline from "@/components/Pipeline";
import Specs from "@/components/Specs";
import UseCases from "@/components/UseCases";
import KiriCompare from "@/components/KiriCompare";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <Gaussians />
      <div className="hairline mx-auto max-w-6xl border-t" />
      <Pipeline />
      <div className="hairline mx-auto max-w-6xl border-t" />
      <Specs />
      <div className="hairline mx-auto max-w-6xl border-t" />
      <UseCases />
      <div className="hairline mx-auto max-w-6xl border-t" />
      <KiriCompare />
      <Footer />
    </main>
  );
}
