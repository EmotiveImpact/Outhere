export default function Banner() {
  return (
    <section className="relative w-full h-[80vh] min-h-[700px] bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
      
      {/* Massive Full Background with Vignette */}
      <div className="absolute inset-0 z-0 bg-[#161618]">
        <img 
          src="/images/sporty_focus_prep_black_1772104208932.png" 
          alt="Urban Night Movement" 
          className="w-full h-full object-cover grayscale contrast-[1.4] brightness-[0.6] mix-blend-luminosity"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-[#00ff7f] mix-blend-overlay opacity-10" />
      </div>

      <div className="relative z-20 max-w-[1600px] mx-auto px-8 md:px-12 w-full flex flex-col justify-end h-full pb-24">
        
        {/* Centered Brutalist Action Focus */}
        <div className="flex flex-col items-center text-center w-full">
          <span className="text-[#00ff7f] font-mono text-[10px] tracking-widest uppercase mb-8 block px-4 py-1 border border-[#00ff7f]/30 backdrop-blur-sm">
            // METRICS ENGAGED
          </span>
          
          <h2 className="text-white text-[9vw] lg:text-[120px] font-[900] uppercase tracking-tighter leading-[0.8] mb-12">
            FEEL THE <span className="text-[#00ff7f]">PACE.</span><br/>
            THE LIGHTS MATCH<br/>
            YOUR STRIDE.
          </h2>

          <p className="text-white text-sm md:text-base font-light tracking-wide max-w-xl leading-relaxed mix-blend-difference">
            Every mover becomes part of one powerful crew. Where the tarmac meets meaning and the city responds to your vitals.
          </p>
        </div>

      </div>
    </section>
  );
}
