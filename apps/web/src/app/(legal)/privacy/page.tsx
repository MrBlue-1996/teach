import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'TopShelf Teaching Privacy Policy - How we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: February 1, 2026</p>

      <section>
        <h2>Introduction</h2>
        <p>
          TopShelf Service LLC (&quot;TopShelf,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;) respects your privacy and is committed to protecting it through our
          compliance with this policy. This Privacy Policy describes how we collect, use, disclose,
          and safeguard your information when you use our TopShelf Teaching platform and related
          services.
        </p>
      </section>

      <section>
        <h2>Information We Collect</h2>
        <h3>Information You Provide</h3>
        <ul>
          <li>
            <strong>Account Information:</strong> Name, email address, and password when you create
            an account
          </li>
          <li>
            <strong>Profile Information:</strong> Additional information you choose to add to your
            profile
          </li>
          <li>
            <strong>Payment Information:</strong> Billing details processed securely through our
            payment processor
          </li>
          <li>
            <strong>Learning Data:</strong> Your responses, progress, and performance in educational
            activities
          </li>
          <li>
            <strong>Communications:</strong> Information from your correspondence with us
          </li>
        </ul>

        <h3>Information Collected Automatically</h3>
        <ul>
          <li>
            <strong>Usage Data:</strong> How you interact with our platform, including pages visited
            and features used
          </li>
          <li>
            <strong>Device Information:</strong> Browser type, operating system, and device
            identifiers
          </li>
          <li>
            <strong>Log Data:</strong> IP address, access times, and referring URLs
          </li>
        </ul>
      </section>

      <section>
        <h2>How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve our educational services</li>
          <li>Personalize your learning experience using our adaptive learning algorithms</li>
          <li>Process transactions and send related information</li>
          <li>Send you technical notices, updates, and support messages</li>
          <li>Respond to your comments, questions, and customer service requests</li>
          <li>Monitor and analyze trends, usage, and activities</li>
          <li>Detect, investigate, and prevent fraudulent or unauthorized activities</li>
          <li>Issue verifiable credentials and badges</li>
        </ul>
      </section>

      <section>
        <h2>Data Retention</h2>
        <p>
          We retain your personal information for as long as your account is active or as needed to
          provide you services. We will retain and use your information as necessary to comply with
          our legal obligations, resolve disputes, and enforce our agreements.
        </p>
      </section>

      <section>
        <h2>Your Rights and Choices</h2>
        <p>
          Depending on your location, you may have certain rights regarding your personal
          information:
        </p>
        <ul>
          <li>
            <strong>Access:</strong> Request a copy of your personal data
          </li>
          <li>
            <strong>Correction:</strong> Request correction of inaccurate data
          </li>
          <li>
            <strong>Deletion:</strong> Request deletion of your personal data
          </li>
          <li>
            <strong>Data Portability:</strong> Request transfer of your data
          </li>
          <li>
            <strong>Opt-Out:</strong> Opt out of certain data processing activities
          </li>
        </ul>
        <p>
          To exercise these rights, please contact us at{' '}
          <a href="mailto:privacy@topshelfservice.com">privacy@topshelfservice.com</a>.
        </p>
      </section>

      <section>
        <h2>FERPA Compliance</h2>
        <p>
          For educational institutions using our platform, we comply with the Family Educational
          Rights and Privacy Act (FERPA). We act as a &quot;school official&quot; under FERPA and
          only use educational records for the purposes for which they were disclosed.
        </p>
      </section>

      <section>
        <h2>Children&apos;s Privacy (COPPA)</h2>
        <p>
          Our services are not intended for children under 13 years of age. We do not knowingly
          collect personal information from children under 13. If we learn we have collected
          personal information from a child under 13, we will delete that information.
        </p>
      </section>

      <section>
        <h2>Data Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your personal
          information, including encryption in transit and at rest, access controls, and regular
          security assessments.
        </p>
      </section>

      <section>
        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or our privacy practices, please contact
          us at:
        </p>
        <address className="not-italic">
          <strong>TopShelf Service LLC</strong>
          <br />
          Email: <a href="mailto:privacy@topshelfservice.com">privacy@topshelfservice.com</a>
        </address>
      </section>
    </article>
  );
}
