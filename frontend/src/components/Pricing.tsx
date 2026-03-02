import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "Free",
    description: "For small teams getting started",
    features: ["5 interviews/month", "Basic AI scoring", "Email support", "1 team member"],
    cta: "Get started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/mo",
    description: "For growing teams that hire regularly",
    features: ["Unlimited interviews", "Advanced AI scoring", "Custom questions", "5 team members", "Priority support", "Analytics dashboard"],
    cta: "Start free trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations with complex needs",
    features: ["Everything in Pro", "Unlimited team members", "SSO & SAML", "Custom integrations", "Dedicated success manager", "SLA guarantee"],
    cta: "Contact sales",
    popular: false,
  },
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 px-4 bg-card">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-foreground mb-4">
            Simple pricing
          </h2>
          <p className="text-lg text-muted-foreground font-body max-w-xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-3xl border p-8 flex flex-col ${
                plan.popular
                  ? "border-primary bg-primary/5 shadow-xl scale-[1.02]"
                  : "border-border bg-background"
              }`}
            >
              {plan.popular && (
                <div className="inline-block self-start mb-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-body font-semibold">
                  Most popular
                </div>
              )}
              <h3 className="text-2xl font-display font-bold text-foreground mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-display font-black text-foreground">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground font-body">{plan.period}</span>}
              </div>
              <p className="text-muted-foreground font-body mb-6">{plan.description}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-foreground font-body text-sm">
                    <Check className="w-4 h-4 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full rounded-full font-body font-semibold ${
                  plan.popular ? "" : "bg-foreground text-background hover:bg-foreground/90"
                }`}
                variant={plan.popular ? "default" : "outline"}
                size="lg"
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
