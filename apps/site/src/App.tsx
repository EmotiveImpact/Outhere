import { useEffect } from 'react';
import { Footer, Grain, Nav, useLanding, useReveal } from './components/Chrome';
import { SiteProvider } from './components/Site';
import { local } from './lib/format';
import { slug } from './lib/boroughs';
import Black from './pages/Black';
import Borough from './pages/Borough';
import Crews from './pages/Crews';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import Privacy from './pages/Privacy';
import type { Route } from './routes';

function Page({ route }: { route: Route }) {
  useReveal();
  useLanding();
  useEffect(() => {
    // The bare /boroughs page jumps to your own borough once you have picked one.
    if (route.path === '/boroughs') {
      const me = local.get<{ borough: string }>('me');
      if (me?.borough && me.borough !== route.borough) location.replace(`/boroughs/${slug(me.borough)}`);
    }
  }, [route]);
  switch (route.page) {
    case 'home': return <Home />;
    case 'crews': return <Crews />;
    case 'black': return <Black />;
    case 'privacy': return <Privacy />;
    case 'borough': return <Borough borough={route.borough!} />;
    default: return <NotFound />;
  }
}

export default function App({ route }: { route: Route }) {
  return (
    <SiteProvider defaultBorough={route.borough}>
      <Nav page={route.page} />
      <Page route={route} />
      <Footer />
      <Grain />
    </SiteProvider>
  );
}
