const stats = [
  { value: "2,000+", label: "Companies using CogniHire" },
  { value: "500K+", label: "Interviews conducted" },
  { value: "10x", label: "Faster than manual screening" },
  { value: "94%", label: "Hiring manager satisfaction" },
];

const testimonials = [
  {
    quote: "CogniHire saved us 30+ hours per week on candidate screening. It's like having a tireless recruiting team that never sleeps.",
    author: "Sarah Chen",
    role: "VP of People, TechCorp",
  },
  {
    quote: "The quality of hires improved dramatically. The AI catches things we'd miss in a 30-minute phone screen.",
    author: "Marcus Johnson",
    role: "Head of Talent, ScaleUp",
  },
  {
    quote: "We went from 3 weeks to 3 days to fill roles. Game changer for our fast-growing team.",
    author: "Priya Patel",
    role: "CTO, BuildFast",
  },
];

const SocialProof = () => {
  return (
    <section className="py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center neo-card p-6 transition-all duration-150">
              <div className="text-4xl sm:text-5xl font-display font-black text-gradient mb-2">
                {stat.value}
              </div>
              <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground font-body font-bold">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="neo-card p-8 transition-all duration-150"
            >
              <p className="text-foreground font-body leading-relaxed mb-6 text-lg">
                "{t.quote}"
              </p>
              <div>
                <div className="font-body font-semibold text-foreground uppercase">{t.author}</div>
                <div className="text-sm text-muted-foreground font-body uppercase tracking-[0.05em]">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
