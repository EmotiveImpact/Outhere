import { SITE } from '../content/site';

export default function Privacy() {
  return (
    <main>
      <section className="band" style={{ paddingTop: 'clamp(130px,14vw,180px)' }}>
        <div className="wrap">
          <div className="crumbs mono" style={{ marginBottom: 22 }}><a href="/">Outhere</a><span>/</span><span>Privacy</span></div>
          <h1 className="disp h2">Privacy<br /><span className="b">notice</span></h1>
          <div className="legal" style={{ marginTop: 34 }}>
            <div className="note"><b>Draft for the waitlist.</b> This needs checking by a solicitor before the site collects real emails. The company name, address and contact details below are placeholders.</div>
            <p style={{ marginTop: 28 }}>This notice explains what Outhere collects when you join the waitlist, claim a run club or request a Black invite, why we collect it and what you can ask us to do with it. It covers the website only. The app will have its own notice, because it handles step and location data.</p>

            <h2>Who we are</h2>
            <p>Outhere Ltd (placeholder) is the controller of your personal data. You can reach us at <a href={`mailto:${SITE.privacyEmail}`}>{SITE.privacyEmail}</a>.</p>

            <h2>What we collect</h2>
            <table>
              <tbody>
                <tr><th>When you</th><th>We collect</th></tr>
                <tr><td>Join the waitlist</td><td>Your email, your borough, whether you walk or run, and your run club if you give one</td></tr>
                <tr><td>Claim a run club</td><td>The club's name, borough and size, your role, the club email, and its social account if you give one</td></tr>
                <tr><td>Request a Black invite</td><td>Your name, email, borough, any invite code and what you write about yourself</td></tr>
                <tr><td>Share an invite link</td><td>Which link brought each new sign-up, so we can move you up the list</td></tr>
              </tbody>
            </table>
            <p>We do not collect your location, payment details or health data on this website. The site sets no cookies and runs no advertising or tracking scripts. It remembers your place on the list in your own browser's storage so it can show it back to you, and our fonts are served from our own site rather than a third party.</p>

            <h2>Why we use it</h2>
            <ul>
              <li>To hold your place on the waitlist and tell you when your borough opens. Our lawful basis is your consent, given when you sign up.</li>
              <li>To check that a run club claim comes from someone who runs the club. Our basis is our legitimate interest in keeping one official crew per club.</li>
              <li>To review Black invite requests. Our basis is your consent.</li>
            </ul>
            <p>We will never sell your data. We only email you about Outhere, and every email has a one-click unsubscribe.</p>

            <h2>How long we keep it</h2>
            <p>We keep waitlist details until the app launches in your borough and for 12 months after, then delete them unless you have created an account. Declined Black requests are deleted after 6 months.</p>

            <h2>Who we share it with</h2>
            <p>Only the services that help us run the waitlist: our database host and our website host, both bound by data processing agreements and storing data in the UK or EU.</p>

            <h2>Your rights</h2>
            <p>Under UK data protection law you can ask to see the data we hold about you, correct it, delete it, or withdraw your consent at any time. Email us and we will reply within one month. If you are unhappy with how we handle your data, you can complain to the Information Commissioner's Office at <a href="https://ico.org.uk" rel="noopener">ico.org.uk</a>.</p>

            <p className="small" style={{ marginTop: 40 }}>Last updated 15 October 2026 · Draft</p>
          </div>
        </div>
      </section>
    </main>
  );
}
