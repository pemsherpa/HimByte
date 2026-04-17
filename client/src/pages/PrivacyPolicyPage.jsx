import LegalPageShell from '../components/LegalPageShell';

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy policy">
      <p className="text-muted text-xs">Last updated: April 17, 2026</p>

      <p>
        Himbyte (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the Himbyte restaurant operating system and related websites
        and services. This policy explains how we collect, use, disclose, and safeguard personal information when you use our
        services in Nepal and elsewhere, in line with the <strong className="text-ink">Privacy Act, 2075 (2018)</strong> and other
        applicable laws, including aspects of the <strong className="text-ink">Electronic Transactions Act, 2063 (2006)</strong> where
        relevant to electronic records and communications.
      </p>

      <h2>1. Who we are</h2>
      <p>
        The data controller for personal data processed through this platform is the Himbyte team. For privacy-related requests,
        contact us at{' '}
        <a href="mailto:ptssherpa5@gmail.com" className="text-primary font-semibold hover:underline">ptssherpa5@gmail.com</a>
        {' '}or{' '}
        <a href="mailto:thapakashchitbikram@gmail.com" className="text-primary font-semibold hover:underline">thapakashchitbikram@gmail.com</a>.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li><strong className="text-ink">Account and profile data:</strong> name, email, role, restaurant affiliation, and authentication identifiers when staff or administrators register or sign in.</li>
        <li><strong className="text-ink">Operational data:</strong> orders, table or room identifiers, timestamps, VAT/PAN-related fields where provided for compliance, and service requests for hotel features.</li>
        <li><strong className="text-ink">Technical data:</strong> IP address, device and browser type, cookies or similar technologies as described in our Cookie policy.</li>
        <li><strong className="text-ink">Payment-related data:</strong> where payment integrations are used, payment data may be processed by third-party providers; we do not store full card numbers on Himbyte servers.</li>
      </ul>

      <h2>3. Purposes and legal bases</h2>
      <p>We process personal data to:</p>
      <ul>
        <li>Provide and improve the Himbyte platform (contractual necessity and legitimate interest in operating a secure SaaS product).</li>
        <li>Meet tax, invoicing, and record-keeping obligations under Nepal law where applicable (legal obligation).</li>
        <li>Communicate about service updates, security, and support (legitimate interest; marketing only where permitted and with appropriate consent where required).</li>
      </ul>

      <h2>4. Multi-tenant isolation</h2>
      <p>
        Restaurant data is logically separated by tenant (<code className="text-xs bg-canvas-dark px-1.5 py-0.5 rounded">restaurant_id</code>).
        Access is restricted by role. We implement technical and organizational measures appropriate to the nature of the processing.
      </p>

      <h2>5. Sharing and subprocessors</h2>
      <p>
        We may use trusted infrastructure and service providers (for example cloud hosting, database, authentication, and analytics)
        that process data on our instructions. Where data is transferred outside Nepal, we take steps consistent with applicable law
        and contractual safeguards.
      </p>

      <h2>6. Retention</h2>
      <p>
        We retain personal and operational data only as long as needed for the purposes above, including legal, tax, and dispute
        resolution requirements. Retention periods may vary by data category and your relationship with us.
      </p>

      <h2>7. Your rights</h2>
      <p>Subject to applicable law, you may have the right to:</p>
      <ul>
        <li>Request access to or a copy of your personal data.</li>
        <li>Request correction of inaccurate data.</li>
        <li>Request deletion or restriction in certain circumstances.</li>
        <li>Object to processing where the legal basis is legitimate interest.</li>
        <li>Lodge a concern with the relevant authority in Nepal if you believe your rights have been infringed.</li>
      </ul>
      <p>To exercise these rights, email us at the addresses above. We may need to verify your identity.</p>

      <h2>8. Security</h2>
      <p>
        We use industry-standard measures including encryption in transit, access controls, and secure development practices. No
        method of transmission over the Internet is 100% secure; we strive to protect your information but cannot guarantee absolute
        security.
      </p>

      <h2>9. Children</h2>
      <p>
        Himbyte is a business-to-business product. We do not knowingly collect personal information from children. If you believe
        we have collected such information, contact us and we will take appropriate steps.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this policy from time to time. We will post the revised policy on this page and update the &quot;Last updated&quot;
        date. Continued use of the service after changes constitutes acceptance where permitted by law.
      </p>

      <h2>11. Disclaimer</h2>
      <p className="text-muted">
        This document is provided for transparency and general information. It is not legal advice. For compliance specific to
        your restaurant or hotel, consult a qualified lawyer in Nepal.
      </p>
    </LegalPageShell>
  );
}
