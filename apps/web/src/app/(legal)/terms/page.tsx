import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'TopShelf Teaching Terms of Service - Rules and guidelines for using our platform.',
};

export default function TermsPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <h1>Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: February 1, 2026</p>

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the TopShelf Teaching platform (&quot;Service&quot;), you agree to
          be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of
          the terms, you may not access the Service.
        </p>
      </section>

      <section>
        <h2>2. Description of Service</h2>
        <p>
          TopShelf Teaching is an AI-powered educational platform that provides adaptive learning
          experiences for IT certification training and professional development. The Service
          includes interactive lessons, assessments, progress tracking, and verifiable credentials.
        </p>
      </section>

      <section>
        <h2>3. User Accounts</h2>
        <p>
          To use certain features of the Service, you must register for an account. You agree to:
        </p>
        <ul>
          <li>Provide accurate, current, and complete information during registration</li>
          <li>Maintain and promptly update your account information</li>
          <li>Maintain the security of your password and account</li>
          <li>Accept responsibility for all activities that occur under your account</li>
          <li>Notify us immediately of any unauthorized use of your account</li>
        </ul>
      </section>

      <section>
        <h2>4. Subscription and Payment</h2>
        <h3>4.1 Subscription Plans</h3>
        <p>
          We offer various subscription plans with different features and pricing. Details are
          available on our pricing page. Subscription fees are billed in advance on a monthly or
          annual basis.
        </p>

        <h3>4.2 Free Trial</h3>
        <p>
          We may offer free trials. At the end of the trial period, your account will be charged
          unless you cancel before the trial ends.
        </p>

        <h3>4.3 Refund Policy</h3>
        <p>
          Annual subscriptions may be refunded within 14 days of purchase if you have not
          substantially used the Service. Monthly subscriptions are non-refundable.
        </p>
      </section>

      <section>
        <h2>5. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose</li>
          <li>Share your account credentials with others</li>
          <li>Attempt to gain unauthorized access to any part of the Service</li>
          <li>Use automated tools to access the Service without permission</li>
          <li>Copy, modify, or distribute content from the Service without authorization</li>
          <li>Interfere with or disrupt the Service or servers</li>
          <li>Misrepresent your identity or credentials earned through the Service</li>
          <li>Share or publish assessment questions or answers</li>
        </ul>
      </section>

      <section>
        <h2>6. Intellectual Property</h2>
        <p>
          The Service and its original content, features, and functionality are owned by TopShelf
          Service LLC and are protected by international copyright, trademark, patent, trade secret,
          and other intellectual property laws.
        </p>
        <p>
          You retain ownership of any content you submit, but grant us a license to use, modify, and
          display such content in connection with the Service.
        </p>
      </section>

      <section>
        <h2>7. Credentials and Badges</h2>
        <p>
          Badges and credentials earned through the Service are verifiable digital achievements. You
          agree that we may publish aggregate, anonymized statistics about credential earners.
          Credentials remain verifiable as long as our Service operates.
        </p>
      </section>

      <section>
        <h2>8. Disclaimer of Warranties</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
          OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED OR ERROR-FREE.
        </p>
      </section>

      <section>
        <h2>9. Limitation of Liability</h2>
        <p>
          IN NO EVENT SHALL TOPSHELF SERVICE LLC BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
        </p>
      </section>

      <section>
        <h2>10. Termination</h2>
        <p>
          We may terminate or suspend your account immediately, without prior notice, for any breach
          of these Terms. Upon termination, your right to use the Service will cease immediately.
        </p>
      </section>

      <section>
        <h2>11. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will provide notice of material
          changes by posting the new Terms on this page and updating the &quot;Last updated&quot;
          date.
        </p>
      </section>

      <section>
        <h2>12. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State of
          Delaware, without regard to its conflict of law provisions.
        </p>
      </section>

      <section>
        <h2>13. Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us at:</p>
        <address className="not-italic">
          <strong>TopShelf Service LLC</strong>
          <br />
          Email: <a href="mailto:legal@topshelfservice.com">legal@topshelfservice.com</a>
        </address>
      </section>
    </article>
  );
}
