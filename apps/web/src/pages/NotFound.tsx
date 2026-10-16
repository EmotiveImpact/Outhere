import { JoinButton } from '../components/Chrome';
import { Mist } from '../components/controls';

export default function NotFound() {
  return (
    <main>
      <section className="final on-photo" style={{ minHeight: '100svh', display: 'grid', alignItems: 'center' }}>
        <div className="bgp" style={{ backgroundImage: 'url(/img/lone.jpg)', backgroundPosition: 'center 45%' }} aria-hidden="true" />
        <div className="wrap">
          <div className="kick" style={{ marginBottom: 22 }}>Page not found</div>
          <h1 className="disp" style={{ fontSize: 'clamp(64px,11vw,170px)' }}>Wrong<br /><span className="b">turn</span></h1>
          <p className="lede" style={{ margin: '20px auto 0', color: 'var(--ink)' }}>This page isn't out there. If someone sent you a run club link, the club's page opens when the club goes live on Outhere.</p>
          <div style={{ marginTop: 28, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a className="btn btn-q" href="/">Back to the start</a>
            <JoinButton />
          </div>
        </div>
        <Mist />
      </section>
    </main>
  );
}
