import Link from "next/link";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display text-sm font-bold">AI</span>
          </div>
          <span className="font-display text-xl font-bold text-foreground">Mura AI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-body text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/handler/sign-in">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/handler/sign-up">Start free</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
