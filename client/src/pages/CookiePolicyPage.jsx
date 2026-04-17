import LegalPageShell from '../components/LegalPageShell';

export default function CookiePolicyPage() {
  return (
    <LegalPageShell title="Cookie policy">
      <p className="text-muted text-xs">Last updated: April 17, 2026</p>

      <p>
        This Cookie policy explains how Himbyte uses cookies and similar technologies when you visit our websites or use our web
        applications. It should be read together with our Privacy policy.
      </p>

      <h2>1. What are cookies?</h2>
      <p>
        Cookies are small text files stored on your device. Similar technologies include local storage and session storage. They
        help us remember preferences, keep you signed in, and understand how the product is used.
      </p>

      <h2>2. Types we use</h2>
      <ul>
        <li><strong className="text-ink">Strictly necessary:</strong> required for security, load balancing, or core functionality (e.g. session management for staff login).</li>
        <li><strong className="text-ink">Functional:</strong> remember choices such as language or UI preferences.</li>
        <li><strong className="text-ink">Analytics (if enabled):</strong> help us understand usage patterns in aggregate; we aim to minimize personal data in analytics.</li>
      </ul>

      <h2>3. Third parties</h2>
      <p>
        Some cookies may be set by our subprocessors (for example authentication or hosting providers) when they deliver parts of
        the service. Their use is governed by their respective policies.
      </p>

      <h2>4. Your choices</h2>
      <p>
        You can control cookies through your browser settings (block, delete, or alert). Blocking strictly necessary cookies may
        prevent parts of the Services from working. For Nepal-specific privacy rights, see our Privacy policy.
      </p>

      <h2>5. Updates</h2>
      <p>
        We may update this Cookie policy when our practices or the law change. Check this page for the latest version.
      </p>

      <h2>6. Contact</h2>
      <p>
        <a href="mailto:ptssherpa5@gmail.com" className="text-primary font-semibold hover:underline">ptssherpa5@gmail.com</a>
        {' · '}
        <a href="mailto:thapakashchitbikram@gmail.com" className="text-primary font-semibold hover:underline">thapakashchitbikram@gmail.com</a>
      </p>
    </LegalPageShell>
  );
}
