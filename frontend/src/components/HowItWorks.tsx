const steps = [
  {
    number: "01",
    title: "Create your interview",
    description: "Set up questions, define evaluation criteria, and customize the experience for any role in minutes.",
  },
  {
    number: "02",
    title: "Invite candidates",
    description: "Send interview links to candidates. They can complete interviews anytime, from anywhere — on their schedule.",
  },
  {
    number: "03",
    title: "AI evaluates responses",
    description: "Our AI analyzes answers for competency, communication skills, and cultural fit using advanced NLP.",
  },
  {
    number: "04",
    title: "Hire the best",
    description: "Review ranked candidates with detailed scorecards. Make faster, more confident hiring decisions.",
  },
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 px-4 bg-card">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-foreground mb-4">
            How it works
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-xl mx-auto">
            From setup to hire in four simple steps.
          </p>
        </div>
        <div className="space-y-8">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="flex gap-6 sm:gap-8 items-start group"
            >
              <div className="shrink-0 w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-display text-2xl font-black group-hover:scale-110 transition-transform">
                {step.number}
              </div>
              <div className="pt-1">
                <h3 className="text-xl sm:text-2xl font-display font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground font-body leading-relaxed max-w-lg">
                  {step.description}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
