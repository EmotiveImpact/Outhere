import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const links = ['Manifesto', 'Modes', 'The App'];

  return (
    <>
      <nav 
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? 'py-4 backdrop-blur-md bg-[#0a0a0a]/80' : 'py-8 bg-transparent'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-8 md:px-12 flex justify-between items-center">
          
          {/* Elite Scale Logo */}
          <div className="flex items-center">
            <h1 className="text-white font-[900] text-3xl md:text-5xl tracking-tighter uppercase leading-none">
              OUT<span className="text-[#00ff7f]">HERE</span>
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-12">
            <div className="flex gap-12">
              {links.map((link) => (
                <a 
                  key={link} 
                  href={`#${link.toLowerCase()}`}
                  className="text-white font-bold text-sm lg:text-base tracking-widest uppercase hover:text-[#00ff7f] transition-colors relative group"
                >
                  {link}
                  <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-[#00ff7f] transition-all duration-300 group-hover:w-full"></span>
                </a>
              ))}
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(true)}
          >
            <Menu className="w-8 h-8" />
          </button>
        </div>
      </nav>

      {/* Extreme Full Screen Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-[#0a0a0a] flex flex-col justify-center items-center"
          >
            <button 
              className="absolute top-8 right-8 text-white hover:text-[#00ff7f] transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <X className="w-10 h-10" />
            </button>
            <div className="flex flex-col gap-12 text-center">
              {links.map((link) => (
                <a 
                  key={link} 
                  href={`#${link.toLowerCase()}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-white font-[900] text-5xl tracking-tighter uppercase hover:text-[#00ff7f] transition-colors"
                >
                  {link}
                </a>
              ))}
            </div>
            {/* Meta Data */}
            <div className="absolute bottom-12 text-[#00ff7f] font-mono tracking-widest text-xs">
              // SYS.READY
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
