import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="bg-primary rounded-[2rem] p-12 sm:p-16">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-primary-foreground mb-4">
            Ready to hire smarter?
          </h2>
          <p className="text-lg text-primary-foreground/80 font-body max-w-xl mx-auto mb-8">
            Join thousands of teams using AI to find the best talent faster. Start your free trial today — no credit card required.
          </p>
          <Button
            size="lg"
            className="bg-background text-foreground hover:bg-background/90 text-lg px-8 py-6 rounded-full font-body font-semibold"
          >
            Start for free →
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
