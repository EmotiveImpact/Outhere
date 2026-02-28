import { Check } from 'lucide-react';

export default function Pricing() {
  return (
    <section id="pricing" className="bg-[#0a0a0a] py-32 relative border-t border-white/5">
      <div className="max-w-[1600px] mx-auto px-8 md:px-12 flex flex-col pt-12">
        
        {/* Typographic Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-24 gap-8">
          <div>
            <span className="text-[#00ff7f] font-mono text-[10px] tracking-widest uppercase mb-6 block">// MODULE O4 : AUTHORIZATION</span>
            <h2 className="text-[12vw] md:text-[8vw] font-[900] text-white leading-[0.8] uppercase tracking-tighter w-fit">
              ACCESS <br/>
              <span className="text-[#00ff7f]">TIERS</span>
            </h2>
          </div>
          <p className="text-gray-400 font-light max-w-sm text-sm md:text-base leading-relaxed hidden md:block text-right">
            Select your protocol. Upgrade your telemetry. Become an apex mover.
          </p>
        </div>

        {/* 3-Part Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            
          {/* Tier 1: Monthly */}
          <div className="bg-[#161618] p-8 lg:p-12 flex flex-col h-full hover:bg-white/5 transition-colors group border border-white/5">
            <div className="mb-12">
              <span className="text-gray-500 font-mono text-[10px] tracking-widest uppercase mb-4 block">// FLEXIBLE</span>
              <h3 className="text-white text-3xl font-[900] tracking-tighter uppercase mb-4">Monthly</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-white text-5xl font-[300] tracking-tighter">$14</span>
                <span className="text-gray-500 text-sm font-mono tracking-widest uppercase">/ mo</span>
              </div>
            </div>
            
            <p className="text-gray-400 text-sm font-light mb-12 flex-grow">
              Full access to elite tracking, live battles, and global leaderboards. Billed monthly.
            </p>

            <ul className="space-y-6 mb-16 flex-grow">
              <li className="flex items-start gap-4">
                <Check className="text-gray-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-white text-sm font-light tracking-wide">Live Session Tracking</span>
              </li>
              <li className="flex items-start gap-4">
                <Check className="text-gray-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-white text-sm font-light tracking-wide">1v1 Realtime Battles</span>
              </li>
              <li className="flex items-start gap-4">
                <Check className="text-gray-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-white text-sm font-light tracking-wide">Global Leaderboards</span>
              </li>
            </ul>

            <button className="w-full py-5 border border-white/20 text-white font-bold uppercase tracking-widest text-xs hover:bg-white hover:text-[#0a0a0a] transition-all duration-300">
              Select Monthly
            </button>
          </div>

          {/* Tier 2: Annually (Recommended/Accent) */}
          <div className="bg-[#00ff7f] p-8 lg:p-12 flex flex-col h-full relative overflow-hidden group transform md:-translate-y-4 shadow-2xl">
            
            <div className="absolute top-0 right-0 bg-[#0a0a0a] text-[#00ff7f] px-4 py-2 text-[10px] font-mono font-bold tracking-widest uppercase">
              Recommended Protocol
            </div>

            <div className="mb-12 relative z-10 pt-2">
              <span className="text-[#0a0a0a]/60 font-mono text-[10px] tracking-widest uppercase mb-4 block">// COMMITTED</span>
              <h3 className="text-[#0a0a0a] text-3xl font-[900] tracking-tighter uppercase mb-4">Annually</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-[#0a0a0a] text-5xl font-[300] tracking-tighter">$120</span>
                <span className="text-[#0a0a0a]/60 text-sm font-mono tracking-widest uppercase">/ yr</span>
              </div>
              <span className="bg-[#0a0a0a] text-[#00ff7f] text-[10px] uppercase tracking-widest px-2 py-1 mt-4 inline-block font-bold">Save $48 / Year</span>
            </div>
            
            <p className="text-[#0a0a0a]/80 text-sm font-medium mb-12 flex-grow relative z-10">
              Unrestricted access to all modes, massive event multipliers, and VIP drops.
            </p>

            <ul className="space-y-6 mb-12 flex-grow relative z-10">
              <li className="flex items-start gap-4">
                <Check className="text-[#0a0a0a] w-5 h-5 flex-shrink-0 stroke-[3] mt-0.5" />
                <span className="text-[#0a0a0a] text-sm font-bold tracking-wide">Everything in Monthly</span>
              </li>
              <li className="flex items-start gap-4">
                <Check className="text-[#0a0a0a] w-5 h-5 flex-shrink-0 stroke-[3] mt-0.5" />
                <span className="text-[#0a0a0a] text-sm font-bold tracking-wide">2x Global Event Multipliers</span>
              </li>
              <li className="flex items-start gap-4">
                <Check className="text-[#0a0a0a] w-5 h-5 flex-shrink-0 stroke-[3] mt-0.5" />
                <span className="text-[#0a0a0a] text-sm font-bold tracking-wide">VIP Club Access</span>
              </li>
            </ul>

            <button className="w-full py-5 bg-[#0a0a0a] text-[#00ff7f] font-bold uppercase tracking-widest text-xs hover:bg-transparent hover:text-[#0a0a0a] hover:border hover:border-[#0a0a0a] transition-all duration-300 relative z-10">
              Initialize Annual
            </button>
          </div>

          {/* Tier 3: Lifetime */}
          <div className="bg-[#161618] p-8 lg:p-12 flex flex-col h-full hover:bg-white/5 transition-colors group border border-white/5 relative overflow-hidden">
            
            {/* Subtle premium gradient for Lifetime */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00ff7f]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            <div className="mb-12 relative z-10">
              <span className="text-gray-500 font-mono text-[10px] tracking-widest uppercase mb-4 block">// APEX PRO</span>
              <h3 className="text-white text-3xl font-[900] tracking-tighter uppercase mb-4">Lifetime</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-white text-5xl font-[300] tracking-tighter">$499</span>
                <span className="text-gray-500 text-sm font-mono tracking-widest uppercase">/ once</span>
              </div>
            </div>
            
            <p className="text-gray-400 text-sm font-light mb-12 flex-grow relative z-10">
              One-time payment for ultimate, perpetual control over the OUT HERE ecosystem.
            </p>

            <ul className="space-y-6 mb-16 flex-grow relative z-10">
              <li className="flex items-start gap-4">
                <Check className="text-gray-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-white text-sm font-light tracking-wide">Lifetime Unrestricted Access</span>
              </li>
              <li className="flex items-start gap-4">
                <Check className="text-gray-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-white text-sm font-light tracking-wide">Founding Member Digital Badge</span>
              </li>
              <li className="flex items-start gap-4">
                <Check className="text-gray-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-white text-sm font-light tracking-wide">Early Access to New Modules</span>
              </li>
            </ul>

            <button className="relative z-10 w-full py-5 border border-white/20 text-white font-bold uppercase tracking-widest text-xs hover:bg-[#00ff7f] hover:text-[#0a0a0a] hover:border-[#00ff7f] transition-all duration-300">
              Secure Lifetime
            </button>
          </div>

        </div>
      </div>
    </section>
  );
}
