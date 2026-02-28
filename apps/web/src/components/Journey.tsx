import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Journey() {
  return (
    <section id="journey" className="bg-[#161618] py-32 lg:py-48 overflow-hidden relative">
      <div className="max-w-[1600px] mx-auto px-8 md:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* Left Side Typographic Stack */}
        <div className="lg:col-span-6 flex flex-col relative z-20">
          <span className="text-[#00ff7f] font-mono text-[10px] tracking-widest mb-8 block uppercase">
            // MODULE O3 : INITIATION
          </span>
          <h2 className="text-[13vw] lg:text-[160px] font-[900] text-white leading-[0.8] uppercase tracking-tighter w-full text-left mix-blend-difference mb-12">
            START<br />
            <span className="text-[#00ff7f]">JOURNEY</span>
          </h2>

          <div className="flex items-center gap-6 mt-8">
            <div className="w-20 h-20 rounded-full border border-[#00ff7f] flex items-center justify-center hover:bg-[#00ff7f] transition-all cursor-pointer group backdrop-blur-sm">
              <ArrowRight className="text-white group-hover:text-[#0a0a0a] w-8 h-8 stroke-[2] group-hover:translate-x-2 transition-transform duration-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold uppercase tracking-widest text-sm mb-1">
                Join the Collective
              </span>
              <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">
                Access Beta Terminal
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Seamless Floating Image */}
        <div className="lg:col-span-6 relative h-[500px] lg:h-[700px] w-full flex justify-end items-center pointer-events-none">
          
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative w-full h-full lg:w-[120%] lg:-mr-[20%]"
          >
            <img 
              src="/images/marketing_move_concept_1772103208813.png" 
              alt="Movement" 
              className="w-full h-full object-cover grayscale contrast-[1.5] brightness-75 mix-blend-lighten" 
            />
            {/* Hard Vignette to blend into the background */}
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#161618]/50 to-[#161618]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#161618] via-transparent to-[#161618]" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#161618] via-transparent to-[#161618]" />
          </motion.div>
          
        </div>

      </div>
    </section>
  );
}
