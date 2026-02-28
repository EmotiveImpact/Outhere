import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Marquee from '../components/Marquee';
import Features from '../components/Features';
import Story from '../components/Story';
import Banner from '../components/Banner';
import Journey from '../components/Journey';
import Pricing from '../components/Pricing';
import AppCTA from '../components/AppCTA';
import Footer from '../components/Footer';

export default function Page() {
  return (
    <main className="bg-[#0a0a0a] min-h-screen font-sans selection:bg-[#00ff7f] selection:text-[#0a0a0a]">
      <Navbar />
      <Hero />
      <Marquee />
      <Features />
      <Story />
      <Banner />
      <Journey />
      <Pricing />
      <AppCTA />
      <Footer />
    </main>
  );
}
