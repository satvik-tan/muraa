import { getBrandConfig } from "@/lib/branding";

const Footer = () => {
  const brand = getBrandConfig();

  return (
    <footer className="border-t-2 border-black py-12 px-4 bg-card">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border-2 border-black bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display text-sm font-bold">CH</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">{brand.appNameWithSuffix}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-foreground font-body font-bold uppercase tracking-[0.08em]">
            <a href="#" className="border-2 border-black bg-background px-3 py-2 transition-all">Privacy</a>
            <a href="#" className="border-2 border-black bg-background px-3 py-2 transition-all">Terms</a>
            <a href="#" className="border-2 border-black bg-background px-3 py-2 transition-all">Contact</a>
          </div>
          <div className="text-xs text-muted-foreground font-body uppercase tracking-[0.06em]">
            © 2026 {brand.appNameWithSuffix}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
