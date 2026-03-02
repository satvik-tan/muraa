import { Bot, Zap, BarChart3, Users } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Interviews",
    description: "Our AI asks tailored questions based on the role, adapting in real-time to candidate responses.",
    color: "bg-primary text-primary-foreground",
  },
  {
    icon: Zap,
    title: "10x Faster Screening",
    description: "Screen hundreds of candidates simultaneously. No more scheduling headaches or calendar Tetris.",
    color: "bg-secondary text-secondary-foreground",
  },
  {
    icon: BarChart3,
    title: "Smart Scoring",
    description: "Get objective, data-driven evaluations with detailed scorecards for every candidate.",
    color: "bg-accent text-accent-foreground",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Share interview results, leave comments, and make hiring decisions together — all in one place.",
    color: "bg-highlight text-highlight-foreground",
  },
];

const Features = () => {
  return (
    <section id="features" className="py-24 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-foreground mb-4">
            Everything you need
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-xl mx-auto">
            A complete AI interview toolkit that replaces your entire early-stage hiring pipeline.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-card rounded-3xl border border-border p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-6`}>
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-display font-bold text-card-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground font-body leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
