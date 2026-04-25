import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, MessageCircle, Mail, FileQuestion, Clock, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with TopShelf Teaching - FAQs, documentation, and contact options.',
};

const supportOptions = [
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'Guides, tutorials, and how-to articles',
    link: '#',
    linkText: 'Browse Docs',
  },
  {
    icon: FileQuestion,
    title: 'FAQs',
    description: 'Answers to commonly asked questions',
    link: '#faqs',
    linkText: 'View FAQs',
  },
  {
    icon: MessageCircle,
    title: 'Community',
    description: 'Connect with other learners and get help',
    link: '#',
    linkText: 'Join Community',
  },
  {
    icon: Mail,
    title: 'Email Support',
    description: 'Get help from our support team',
    link: 'mailto:support@topshelfservice.com',
    linkText: 'Contact Us',
  },
];

const faqs = [
  {
    question: 'How do I reset my password?',
    answer:
      'Click "Forgot password" on the login page, enter your email address, and we\'ll send you a reset link.',
  },
  {
    question: 'Can I change my subscription plan?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time from your account settings. Changes take effect at the start of your next billing cycle.',
  },
  {
    question: 'How do I earn badges?',
    answer:
      'Badges are earned by completing modules, passing challenges, and demonstrating mastery of specific skills. Each badge has specific requirements listed on the achievements page.',
  },
  {
    question: 'Are my credentials verifiable?',
    answer:
      'Yes! Each badge you earn comes with a unique verification link that employers can use to confirm your achievements.',
  },
  {
    question: 'Can I use TopShelf offline?',
    answer:
      'Offline mode is on our roadmap. Currently, TopShelf requires an internet connection. We will announce offline support when it is available.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer:
      'You can cancel your subscription from Settings > Account > Subscription. Your access continues until the end of your current billing period.',
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold md:text-4xl">How can we help?</h1>
        <p className="text-lg text-muted-foreground">
          Find answers, get support, and connect with our community
        </p>
      </div>

      {/* Support Options */}
      <div className="grid gap-4 sm:grid-cols-2">
        {supportOptions.map((option) => (
          <Card key={option.title} className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <option.icon className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">{option.title}</CardTitle>
              <CardDescription>{option.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={option.link}>
                <Button variant="outline" size="sm">
                  {option.linkText}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQs */}
      <section id="faqs">
        <h2 className="mb-6 text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-base">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Response Time */}
      <Card className="bg-muted/50">
        <CardContent className="flex items-center gap-4 p-6">
          <Clock className="h-8 w-8 text-primary" />
          <div>
            <p className="font-medium">Email Support Response Time</p>
            <p className="text-sm text-muted-foreground">
              We typically respond within 24 hours during business days (Monday-Friday, 9am-5pm EST)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact CTA */}
      <div className="rounded-lg border bg-card p-8 text-center">
        <h3 className="mb-2 text-xl font-semibold">Still need help?</h3>
        <p className="mb-4 text-muted-foreground">
          Our support team is here to assist you with any questions or issues.
        </p>
        <Link href="mailto:support@topshelfservice.com">
          <Button>
            <Mail className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </Link>
      </div>
    </div>
  );
}
