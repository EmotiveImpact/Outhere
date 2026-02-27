import { motion } from 'motion/react';

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] bg-[#0a0a0a] pt-32 lg:pt-40 overflow-hidden flex flex-col justify-end">
      
      <div className="max-w-[1600px] mx-auto w-full px-8 md:px-12 relative z-10 flex flex-col h-full -mb-8">
        
        {/* Typographic Core - Flush Left, Massive Contrast */}
        <div className="relative z-20 flex flex-col mt-auto pb-0 w-full lg:w-[80%]">
          
          {/* Removed mix-blend-difference and increased leading to prevent clipping/color mixing */}
          <h1 className="text-[19vw] lg:text-[280px] leading-[0.85] font-[900] tracking-tighter uppercase text-white mb-0 text-left pointer-events-none">
            WE
          </h1>
          <h1 className="text-[19vw] lg:text-[280px] leading-[0.85] font-[900] tracking-tighter uppercase text-[#00ff7f] text-left pointer-events-none">
            OUTSIDE
          </h1>
          
          <h2 className="text-[5vw] lg:text-[45px] leading-tight font-[800] tracking-widest uppercase text-white text-left mt-8 mb-4 pointer-events-none opacity-90 pl-2">
            URBAN MOVEMENT
          </h2>
          
          <div className="mt-8 flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-16 pl-2 mb-16 relative z-30">
            <p className="text-gray-400 font-light text-sm md:text-base max-w-sm leading-relaxed mix-blend-difference">
              The city is your gym. OUT HERE rewards you for using it. Not a running app. An app for people who <span className="text-white font-medium">move</span>.
            </p>
            
            <a href="#journey" className="group flex items-center gap-4 cursor-pointer bg-white text-[#0a0a0a] px-8 py-4 hover:bg-[#00ff7f] transition-colors">
              <span className="font-bold uppercase tracking-widest text-xs">
                Start Session
              </span>
            </a>
          </div>
        </div>

      </div>

      {/* Primary Image Fade integration - Made larger, shifted tight to the corner */}
      <div className="absolute bottom-0 right-0 w-full md:w-[80%] lg:w-[70%] h-[85vh] z-0 pointer-events-none origin-bottom-right">
        <motion.img 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.9, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src="/images/sporty_city_journey_black_1772104246978.png" 
          className="w-full h-full object-cover object-bottom grayscale contrast-[1.3] mix-blend-screen"
          alt="Runner"
        />
        {/* Gradients to fade image smoothly into the black void */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-[#0a0a0a] to-transparent" />
      </div>

    </section>
  );
}
