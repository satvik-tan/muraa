import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import heroMockup from "../../public/hero-mockup.png";

const Hero = () => {
  return (
    <section className="pt-32 pb-20 px-4 overflow-hidden">
      <div className="container mx-auto text-center max-w-5xl">
        <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-body font-semibold animate-fade-up">
          🚀 Trusted by 2,000+ hiring teams
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black leading-[0.95] mb-6 animate-fade-up text-foreground" style={{ animationDelay: "0.1s" }}>
          Hire smarter<br />
          with <span className="text-gradient">AI interviews</span>
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground font-body max-w-2xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          Screen candidates 10x faster. Our AI conducts structured interviews, evaluates responses, and gives you actionable insights — so you can focus on the best talent.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Button asChild size="lg" className="text-lg px-8 py-6 rounded-full font-body font-semibold">
            <Link href="/handler/sign-up">Start for free →</Link>
          </Button>
          <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-full font-body font-semibold">
            Watch demo
          </Button>
        </div>
        <div className="relative animate-fade-up" style={{ animationDelay: "0.4s" }}>
          <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-3xl" />
          <Image
            src={heroMockup}
            alt="AI Interview Platform showing an AI avatar conducting a video interview with a candidate"
            className="relative rounded-2xl border border-border shadow-2xl w-full h-auto"
            priority
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
