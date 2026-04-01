import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Zap,
  Target,
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  Shield,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation - Minimal, focused */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TopShelf</span>
          </Link>
          <nav className="hidden items-center space-x-6 md:flex">
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              How It Works
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">
                Start Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {/* Hero - One clear message */}
        <section className="relative overflow-hidden py-20 md:py-32">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
          <div className="container relative">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center rounded-full border bg-muted px-4 py-1.5 text-sm">
                <Clock className="mr-2 h-4 w-4 text-primary" />
                Learn 3x faster with AI-powered efficiency
              </div>
              <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
                Learn the{' '}
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  fastest way
                </span>
                <br />
                possible.
              </h1>
              <p className="mb-8 text-lg text-muted-foreground md:text-xl">
                Stop wasting time on ineffective learning. Our AI adapts to how you learn, cutting
                your study time in half while doubling retention.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/auth/signup">
                  <Button size="xl" className="w-full sm:w-auto">
                    Start Learning Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <p className="text-sm text-muted-foreground">
                  No credit card required. 14-day free trial.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof - Quick trust */}
        <section className="border-y bg-muted/30 py-8">
          <div className="container">
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground md:gap-16">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">50K+</span>
                <span>Learners</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">94%</span>
                <span>Pass Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">2.5x</span>
                <span>Faster Learning</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">4.9/5</span>
                <span>Rating</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works - 3 Simple Steps */}
        <section id="how-it-works" className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">Three steps to mastery</h2>
              <p className="mb-12 text-muted-foreground">
                No fluff. No filler. Just efficient learning that gets results.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {/* Step 1 */}
              <div className="relative rounded-xl border bg-card p-8 card-hover">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Target className="h-6 w-6" />
                </div>
                <div className="absolute right-4 top-4 text-6xl font-bold text-muted/20">1</div>
                <h3 className="mb-2 text-xl font-semibold">Pick your goal</h3>
                <p className="text-muted-foreground">
                  Choose a certification or skill. We&apos;ll create your personalized path.
                </p>
              </div>
              {/* Step 2 */}
              <div className="relative rounded-xl border bg-card p-8 card-hover">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="absolute right-4 top-4 text-6xl font-bold text-muted/20">2</div>
                <h3 className="mb-2 text-xl font-semibold">Learn by doing</h3>
                <p className="text-muted-foreground">
                  Solve real problems first. AI explains only what you need, when you need it.
                </p>
              </div>
              {/* Step 3 */}
              <div className="relative rounded-xl border bg-card p-8 card-hover">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Award className="h-6 w-6" />
                </div>
                <div className="absolute right-4 top-4 text-6xl font-bold text-muted/20">3</div>
                <h3 className="mb-2 text-xl font-semibold">Prove mastery</h3>
                <p className="text-muted-foreground">
                  Earn verifiable badges. Share achievements with employers instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features - Quick scan */}
        <section className="border-y bg-muted/30 py-20">
          <div className="container">
            <div className="grid gap-12 md:grid-cols-2">
              <div>
                <h2 className="mb-6 text-3xl font-bold">Built for efficiency</h2>
                <ul className="space-y-4">
                  {[
                    'AI adapts to your knowledge gaps in real-time',
                    'Skip what you already know automatically',
                    'Micro-lessons that fit your schedule (5-15 min)',
                    'Spaced repetition for maximum retention',
                    'Offline mode - learn anywhere',
                    'Progress syncs across all devices',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Today&apos;s Progress</span>
                    <span className="text-sm font-medium text-success">+12%</span>
                  </div>
                  <div className="mb-2 flex items-end justify-between">
                    <span className="text-4xl font-bold">73%</span>
                    <TrendingUp className="h-8 w-8 text-success" />
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[73%] rounded-full bg-primary transition-all" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Linux+ Certification</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing - Simple */}
        <section id="pricing" className="py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">Simple pricing</h2>
              <p className="mb-12 text-muted-foreground">
                Start free. Upgrade when you&apos;re ready.
              </p>
            </div>
            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
              {/* Free */}
              <div className="rounded-xl border bg-card p-8">
                <h3 className="mb-2 text-xl font-semibold">Free</h3>
                <p className="mb-4 text-muted-foreground">Try before you commit</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="mb-8 space-y-3 text-sm">
                  {['1 content pack', 'Basic progress tracking', 'Community support'].map(
                    (f, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        {f}
                      </li>
                    )
                  )}
                </ul>
                <Link href="/auth/signup">
                  <Button variant="outline" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
              {/* Pro */}
              <div className="relative rounded-xl border-2 border-primary bg-card p-8">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Most Popular
                </div>
                <h3 className="mb-2 text-xl font-semibold">Pro</h3>
                <p className="mb-4 text-muted-foreground">For serious learners</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="mb-8 space-y-3 text-sm">
                  {[
                    'All content packs',
                    'AI-powered tutoring',
                    'Verifiable badges',
                    'Priority support',
                    'Offline access',
                    'Progress analytics',
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup?plan=pro">
                  <Button className="w-full">Start 14-Day Free Trial</Button>
                </Link>
              </div>
            </div>
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Schools and teams?{' '}
              <Link href="/contact" className="text-primary hover:underline">
                Contact us for volume pricing
              </Link>
            </p>
          </div>
        </section>

        {/* Final CTA - Urgent but not pushy */}
        <section className="border-t bg-gradient-to-b from-primary/5 to-background py-20">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold">Ready to learn smarter?</h2>
              <p className="mb-8 text-muted-foreground">
                Join thousands of learners who&apos;ve cut their study time in half.
              </p>
              <Link href="/auth/signup">
                <Button size="xl">
                  Start Learning Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  No credit card required
                </span>
                <span>•</span>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - Minimal */}
      <footer className="border-t py-8">
        <div className="container">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">© 2026 TopShelf Service LLC</span>
            </div>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="/support" className="hover:text-foreground">
                Support
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
