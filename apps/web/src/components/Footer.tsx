export default function Footer() {
  return (
    <footer id="footer" className="bg-[#0a0a0a] pt-16 pb-8 overflow-hidden relative">
      <div className="max-w-[1600px] mx-auto px-8 md:px-12 relative z-10 flex flex-col justify-end min-h-[50vh]">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 mb-24 items-start">
          <div className="lg:col-span-7">
            <h4 className="text-white font-[900] uppercase tracking-tighter text-4xl lg:text-7xl leading-[0.9] mb-12">
              THE PLATFORM FOR<br/>
              <span className="text-[#00ff7f]">URBAN MOBILITY.</span>
            </h4>
            <div className="flex gap-8">
              <a href="#" className="text-white text-xs font-mono tracking-widest hover:-translate-y-1 hover:text-[#00ff7f] transition-all">INSTAGRAM //</a>
              <a href="#" className="text-white text-xs font-mono tracking-widest hover:-translate-y-1 hover:text-[#00ff7f] transition-all">X.COM //</a>
              <a href="#" className="text-[#00ff7f] text-xs font-mono tracking-widest hover:-translate-y-1 hover:text-white transition-all">DISCORD //</a>
            </div>
          </div>
          
          <div className="lg:col-span-5 grid grid-cols-2 gap-8 lg:justify-end">
            <div>
              <h5 className="text-[#00ff7f] font-mono font-bold mb-8 text-[10px] tracking-widest uppercase">// Hub</h5>
              <ul className="space-y-6">
                <li><a href="#" className="text-gray-400 text-sm md:text-base hover:text-white transition-colors tracking-wide">Manifesto</a></li>
                <li><a href="#" className="text-gray-400 text-sm md:text-base hover:text-white transition-colors tracking-wide">The App</a></li>
                <li><a href="#" className="text-gray-400 text-sm md:text-base hover:text-white transition-colors tracking-wide">Leaderboards</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-[#00ff7f] font-mono font-bold mb-8 text-[10px] tracking-widest uppercase">// Legal</h5>
              <ul className="space-y-6">
                <li><a href="#" className="text-gray-400 text-sm md:text-base hover:text-white transition-colors tracking-wide">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 text-sm md:text-base hover:text-white transition-colors tracking-wide">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* The massive edge-to-edge typography footprint */}
        <div className="relative pt-16 flex justify-center w-full mt-auto">
          <h1 className="text-[20vw] leading-[0.7] font-[900] tracking-tighter uppercase w-full text-center relative pointer-events-none text-white">
            OUT<span className="text-[#00ff7f]">HERE</span>
          </h1>
          
          {/* Subtle copyright */}
          <div className="absolute bottom-2 left-0 text-[#161618] text-[10px] font-mono tracking-widest">
            © {new Date().getFullYear()} OUT HERE MOVEMENT. ALL RIGHTS PRESERVED.
          </div>
        </div>

      </div>
    </footer>
  );
}
