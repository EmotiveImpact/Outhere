export default function Story() {
  return (
    <section id="story" className="bg-[#0a0a0a] py-32 lg:py-48 relative overflow-hidden border-t border-white/5">
      <div className="max-w-[1600px] mx-auto px-8 md:px-12 flex flex-col justify-center min-h-[60vh]">
        
        {/* Strict Editorial Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-end">
          
          <div className="lg:col-span-8 flex flex-col">
            <span className="text-[#00ff7f] font-mono text-[10px] tracking-widest uppercase mb-12 block">
              // BRAND MANIFESTO .01
            </span>
            <h2 className="text-[11vw] lg:text-[140px] leading-[0.8] font-[900] text-white uppercase tracking-tighter text-left mb-0">
              THE CITY <br/>
              <span className="text-[#00ff7f]">BECOMES</span><br/>
              YOUR GYM.
            </h2>
          </div>

          <div className="lg:col-span-4 flex flex-col justify-end pb-4">
            <div className="w-12 h-1 bg-[#00ff7f] mb-8" />
            <p className="text-gray-400 font-light text-base md:text-lg leading-relaxed max-w-sm">
              Every footprint tells a story. This isn't just a tracker. 
              The concrete drives your pace and the movement powers every XP you earn. 
              Built exclusively for those who thrive in the urban perimeter.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
