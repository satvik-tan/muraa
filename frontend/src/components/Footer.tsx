import { getBrandConfig } from "@/lib/branding";

const Footer = () => {
  const brand = getBrandConfig();

  return (
    <footer className="border-t border-border py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display text-sm font-bold">AI</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">{brand.appNameWithSuffix}</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground font-body">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>
          <div className="text-sm text-muted-foreground font-body">
            © 2026 {brand.appNameWithSuffix}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
