import { ArrowUpRight } from 'lucide-react';

const featuresList = [
  {
    title: "MOVE PROTOCOL",
    tag: "SYS.01",
    desc: "A high-fidelity live tracking session engineered for the urban perimeter.",
    img: "/images/feature_move_protocol.png"
  },
  {
    title: "CLUB LEADERBOARD",
    tag: "NET.02",
    desc: "Decentralized ranking and social telemetry for collective endurance.",
    img: "/images/feature_club_leaderboard.png"
  },
  {
    title: "1V1 CHALLENGES",
    tag: "CMB.03",
    desc: "Real-time kinetic battles. Settle the score on the concrete.",
    img: "/images/feature_1v1_challenges.png"
  },
  {
    title: "GLOBAL EVENTS",
    tag: "EVT.04",
    desc: "Synchronized mobility drops. Earn massive XP multipliers across zones.",
    img: "/images/feature_global_events.png"
  }
];

export default function Features() {
  return (
    <section id="features" className="bg-[#161618] w-full pt-12 pb-32">
      <div className="max-w-[1600px] mx-auto px-8 md:px-12 flex flex-col">
        
        <div className="mb-24 mt-12">
           <span className="text-gray-500 font-mono text-xs uppercase tracking-widest block mb-4">
             // System Components
           </span>
        </div>

        <div className="flex flex-col w-full">
          {featuresList.map((feature, idx) => (
            <div 
              key={feature.title} 
              className="group flex flex-col lg:flex-row items-center justify-between border-b border-[#0a0a0a] hover:bg-[#0a0a0a] transition-all duration-300 relative overflow-hidden h-[350px] lg:h-[400px]"
            >
              {/* Full Width Background Reveal Graphic - Fixed Size Context */}
              <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
                 <img src={feature.img} className="w-full h-full object-cover grayscale mix-blend-screen brightness-50 contrast-125" alt="" />
                 <div className="absolute inset-0 bg-[#00ff7f]/10 mix-blend-overlay"></div>
                 {/* Vignette Gradients */}
                 <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]/50" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 via-transparent to-[#0a0a0a]" />
              </div>

              {/* Data Area - Strict Typography Hierarchy */}
              <div className="flex-1 max-w-3xl relative z-10 w-full pl-0 group-hover:pl-6 transition-all duration-300">
                <span className="text-[#00ff7f] font-mono text-xs tracking-widest mb-6 block">
                  {feature.tag}
                </span>
                
                <h3 className="text-5xl md:text-7xl lg:text-[90px] leading-[0.9] font-[900] tracking-tighter uppercase text-white mb-6 group-hover:text-white transition-colors mix-blend-difference">
                  {feature.title}
                </h3>
                
                <p className="text-gray-400 font-light text-sm md:text-lg leading-relaxed max-w-md mix-blend-difference group-hover:text-white transition-colors">
                  {feature.desc}
                </p>
              </div>

              {/* Interaction Element */}
              <div className="relative z-10 lg:pr-12 flex items-center pr-0 transform transition-transform duration-500 group-hover:-translate-x-6">
                <div className="w-20 h-20 flex items-center justify-center border border-white/20 rounded-full transition-all duration-500 group-hover:bg-[#00ff7f] group-hover:border-[#00ff7f] backdrop-blur-sm">
                  <ArrowUpRight className="text-white group-hover:text-[#0a0a0a] w-8 h-8 stroke-[1.5] group-hover:rotate-45 transition-transform duration-500" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
