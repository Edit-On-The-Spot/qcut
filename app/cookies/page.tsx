import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cookie Policy - Qcut",
  description: "Cookie Policy for Qcut video editor",
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen pt-20 pb-16 px-6">
      <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
        <h1>Cookie Policy</h1>

        <p><strong>Last Updated:</strong> January 2026</p>

        <p>
          This Cookie Policy explains how <strong>Qcut</strong> ("we", "us", or "our"), owned and operated by{" "}
          <a href="https://www.editonthespot.com/">Edit on the Spot</a>, uses cookies and similar technologies
          when you visit or use <a href="https://qcut.app">qcut.app</a> (the "Website") and our browser-based
          video editing platform (the "Service").
        </p>
        <p>
          This Cookie Policy should be read together with our <a href="/privacy">Privacy Policy</a>.
        </p>

        <h2>1. What Are Cookies?</h2>
        <p>
          Cookies are small text files that are placed on your device (computer, tablet, or mobile phone) when
          you visit a website. Cookies allow websites to function properly, remember preferences, and collect
          information about how the site is used.
        </p>
        <p>
          We may also use similar technologies such as local storage, session storage, and browser memory. For
          simplicity, all such technologies are referred to as "cookies" in this policy.
        </p>

        <h2>2. Our Approach to Cookies</h2>
        <p>
          Qcut is designed with <strong>privacy by default</strong>.
        </p>
        <ul>
          <li>We do <strong>not</strong> use advertising cookies.</li>
          <li>We do <strong>not</strong> use cross-site tracking.</li>
          <li>We do <strong>not</strong> sell or share cookie data with advertisers.</li>
        </ul>
        <p>
          Our use of cookies is limited to what is necessary to operate, secure, and improve the Service.
        </p>

        <h2>3. Types of Cookies We Use</h2>

        <h3>3.1 Strictly Necessary Cookies</h3>
        <p>
          These cookies are essential for the Website and Service to function correctly. They enable core
          features such as:
        </p>
        <ul>
          <li>Maintaining your editing session while the browser is open</li>
          <li>Ensuring platform stability and security</li>
          <li>Remembering temporary preferences during a session</li>
        </ul>
        <p>Without these cookies, the Service may not function as intended.</p>

        <h3>3.2 Functional Storage (Session / Local Storage)</h3>
        <p>Qcut uses browser session storage or local storage to:</p>
        <ul>
          <li>Temporarily remember editing progress</li>
          <li>Support real-time video editing workflows</li>
          <li>Prevent data loss during an active session</li>
        </ul>
        <p>This data:</p>
        <ul>
          <li>Is stored locally in your browser</li>
          <li>Is automatically deleted when your session ends or the browser is closed</li>
          <li>Does not personally identify you</li>
        </ul>

        <h3>3.3 Optional Analytics Cookies</h3>
        <p>
          Qcut may use limited, privacy-friendly analytics tools to understand how the Service is used and to
          improve performance.
        </p>
        <p>Analytics data may include:</p>
        <ul>
          <li>Feature usage</li>
          <li>Session duration</li>
          <li>Error reports</li>
          <li>Load times</li>
        </ul>
        <p>All analytics data is:</p>
        <ul>
          <li>Aggregated</li>
          <li>Anonymised</li>
          <li>Non-identifiable</li>
        </ul>
        <p>
          You may disable analytics collection through your browser or device settings without affecting your
          ability to use Qcut.
        </p>

        <h2>4. Third-Party Cookies</h2>
        <p>Qcut does not place third-party advertising cookies.</p>
        <p>
          If third-party services are integrated in the future (such as analytics or cloud services), they will
          be selected based on strong privacy standards and documented in this policy.
        </p>
        <p>
          We encourage you to review the cookie policies of any third-party websites you access via links on
          our Website.
        </p>

        <h2>5. Cookie Duration</h2>
        <ul>
          <li>Session cookies and session storage are deleted when you close your browser.</li>
          <li>
            Any limited analytics cookies (if enabled) are retained only for as long as necessary to fulfil
            their purpose.
          </li>
        </ul>
        <p>We do not use long-term tracking cookies.</p>

        <h2>6. Managing Cookies</h2>
        <p>
          You can control or delete cookies at any time through your browser settings. Most browsers allow you
          to:
        </p>
        <ul>
          <li>View what cookies are stored</li>
          <li>Block cookies entirely</li>
          <li>Delete cookies on exit</li>
        </ul>
        <p>
          Please note that disabling strictly necessary cookies may affect the functionality of the Service.
        </p>

        <h2>7. International Users</h2>
        <p>
          Qcut is used globally. Our cookie practices are designed to comply with applicable privacy and data
          protection laws, including the GDPR, UK GDPR, and Australian Privacy Principles, where applicable.
        </p>

        <h2>8. Changes to This Cookie Policy</h2>
        <p>
          We may update this Cookie Policy from time to time to reflect changes in technology, legal
          requirements, or our practices.
        </p>
        <p>
          The "Last Updated" date at the top of this page indicates when the policy was most recently revised.
        </p>

        <h2>9. Contact Us</h2>
        <p>
          If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
        </p>
        <p>
          <strong>Email:</strong>{" "}
          <a href="mailto:support@editonthespot.com">support@editonthespot.com</a>
        </p>

        <p>
          By continuing to use Qcut, you acknowledge that you have read and understood this Cookie Policy.
        </p>
      </div>
    </div>
  )
}
