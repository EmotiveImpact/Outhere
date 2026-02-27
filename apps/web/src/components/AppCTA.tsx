const mobileFeatures = [
    {
      title: "LIVE TELEMETRY",
      tag: "SYS.01",
      desc: "Real-time kinematic data tracking your progression through the urban grid.",
      img: "/images/sporty_focus_prep_black_1772104208932.png" 
    },
    {
      title: "THE VAULT",
      tag: "SYS.02",
      desc: "Secure storage for your earned XP, multipliers, and digital assets.",
      img: "/images/sporty_portrait_paywall_1772103317723.png"
    },
    {
      title: "CLUB COMMS",
      tag: "SYS.03",
      desc: "Direct encrypted channels to your squad. Coordinate your next drop.",
      img: "/images/sporty_city_journey_black_1772104246978.png"
    }
  ];
  
  export default function AppCTA() {
    return (
      <section className="bg-[#161618] py-32 border-t border-white/5 relative overflow-hidden">
        
        {/* Massive Background Typography */}
        <div className="absolute top-1/4 w-full flex justify-center pointer-events-none opacity-[0.03]">
          <h1 className="text-[25vw] font-[900] text-white tracking-tighter uppercase whitespace-nowrap">
            PREPARE
          </h1>
        </div>
  
        <div className="max-w-[1600px] mx-auto px-8 md:px-12 relative z-10 flex flex-col items-center">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-20 w-full max-w-4xl">
            <span className="text-[#00ff7f] font-mono text-[10px] tracking-widest uppercase mb-8 block px-4 py-1 border border-[#00ff7f]/30 backdrop-blur-sm">
              // TERMINAL DEPLOYMENT
            </span>
            <h2 className="text-[10vw] md:text-[8vw] font-[900] text-white uppercase tracking-tighter leading-[0.8] mb-8">
              POCKET <br/>
              <span className="text-[#00ff7f]">COMMAND.</span>
            </h2>
            <p className="text-gray-400 font-light text-base md:text-xl max-w-2xl leading-relaxed">
              Take the protocol into the streets. Our native interface gives you tactical oversight of your entire urban movement profile.
            </p>
          </div>
  
          {/* Download Actions - Using Standard SVG Badges mimicking official store buttons */}
          <div className="flex flex-col sm:flex-row gap-6 w-full justify-center mb-32 z-20">
              <a href="#" className="hover:scale-105 transition-transform">
                {/* Simulated Apple App Store Badge (Replacing with standard visual approach) */}
                <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&amp;releaseDate=1276560000" alt="Download on the App Store" className="h-16 w-auto" />
              </a>
              <a href="#" className="hover:scale-105 transition-transform">
                {/* Simulated Google Play Badge */}
                <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" className="h-[4.5rem] w-auto -mt-1" />
              </a>
          </div>
  
          {/* 3-Part Mobile Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 w-full">
            {mobileFeatures.map((feature, idx) => (
              <div key={idx} className="flex flex-col group relative bg-[#0a0a0a] border border-white/5 p-8 hover:border-[#00ff7f]/50 transition-colors duration-500 rounded-3xl">
                  
                {/* Minimal Phone Wireframe */}
                <div className="w-full aspect-[9/19] bg-[#161618] rounded-[2rem] p-2 relative overflow-hidden mb-12 shadow-2xl">
                  {/* Dynamic Screen Image */}
                  <div className="w-full h-full rounded-[1.5rem] overflow-hidden relative">
                     <img src={feature.img} className="w-full h-full object-cover grayscale contrast-[1.2] opacity-50 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 mix-blend-screen" alt="App Screen" />
                     
                     {/* Interface Overlay */}
                     <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center opacity-50">
                       <span className="text-white font-mono text-[8px] tracking-widest">9:41</span>
                       <div className="flex gap-1">
                         <div className="w-1 h-3 bg-white" />
                         <div className="w-1 h-3 bg-white" />
                         <div className="w-1 h-3 block border border-white" />
                       </div>
                     </div>
  
                     {/* Tech Overlay details */}
                     <div className="absolute bottom-6 left-6 right-6 border-l-2 border-[#00ff7f] pl-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                       <span className="text-white font-mono text-[10px] tracking-widest mb-1 block">STATUS: ONLINE</span>
                       <div className="h-1 w-full bg-white/20 mt-2">
                         <div className="h-full bg-[#00ff7f] w-[75%]" />
                       </div>
                     </div>
  
                     {/* Gradients */}
                     <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none" />
                  </div>
                </div>
  
                {/* Data Stack */}
                <div className="flex flex-col text-center items-center">
                  <span className="text-[#00ff7f] font-mono text-[10px] tracking-widest uppercase mb-4">
                    // {feature.tag}
                  </span>
                  <h3 className="text-white text-2xl lg:text-3xl font-[900] tracking-tighter uppercase mb-4">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm md:text-base font-light leading-relaxed max-w-xs">
                    {feature.desc}
                  </p>
                </div>
  
              </div>
            ))}
          </div>
  
        </div>
      </section>
    );
  }
