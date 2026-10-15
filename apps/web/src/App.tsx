import { useEffect } from 'react';
import { Footer, Grain, Nav, useLanding, useReveal } from './components/Chrome';
import { SiteProvider } from './components/Site';
import { local } from './lib/format';
import { isBorough, slug } from './lib/boroughs';
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
      const me = local.get<{ borough?: string; place?: { city?: string; borough?: string } }>('me');
      const b = me?.place ? (me.place.city === 'london' ? me.place.borough : undefined) : me?.borough;
      if (isBorough(b) && b !== route.borough) location.replace(`/boroughs/${slug(b)}`);
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
    <SiteProvider defaultPlace={route.borough ? { city: 'london', borough: route.borough } : undefined}>
      <Nav page={route.page} />
      <Page route={route} />
      <Footer />
      <Grain />
    </SiteProvider>
  );
}
