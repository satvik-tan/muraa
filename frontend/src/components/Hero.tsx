import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getBrandConfig } from "@/lib/branding";
import heroMockup from "../../public/hero-mockup.png";

const Hero = () => {
  const brand = getBrandConfig();

  return (
    <section className="pt-32 pb-20 px-4 overflow-hidden">
      <div className="container mx-auto text-center max-w-5xl">
        <div className="inline-block mb-6 px-3 py-1.5 border-2 border-black bg-secondary text-secondary-foreground text-xs uppercase tracking-[0.08em] font-body font-bold animate-fade-up">
          🚀 Trusted by hiring teams using {brand.appName}
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-black leading-[1] mb-6 animate-fade-up text-foreground" style={{ animationDelay: "0.1s" }}>
          Hire smarter with<br />
          <span className="text-gradient">{brand.appNameWithSuffix}</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground font-body max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          Screen candidates faster with structured, role-aware interviews. CogniHire asks the right questions, evaluates responses, and gives you actionable insights — so you can focus on the best talent.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Button asChild size="lg" className="text-lg px-6 py-3 font-body font-semibold">
            <Link href="/handler/sign-up">Start for free →</Link>
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-6 py-3 font-body font-semibold bg-card">
            Watch demo
          </Button>
        </div>
        <div className="relative animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <Image
            src={heroMockup}
            alt="CogniHire interview platform showing an AI avatar conducting a video interview with a candidate"
            className="relative border-2 border-black w-full h-auto"
            priority
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
