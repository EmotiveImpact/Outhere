import { motion } from 'motion/react';

const ITEMS = [
  "PROTOCOL 2.0.26", 
  "URBAN MOVEMENT", 
  "THE CITY IS THE ENGINE", 
  "NO EXCUSES"
];
const MARQUEE_ITEMS = [...ITEMS, ...ITEMS, ...ITEMS, ...ITEMS];

export default function Marquee() {
  return (
    <div className="w-full bg-[#00ff7f] overflow-hidden py-4 border-y border-[#00ff7f]">
      <motion.div 
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ repeat: Infinity, ease: "linear", duration: 25 }}
      >
        <div className="flex space-x-12 px-6 items-center">
          {MARQUEE_ITEMS.map((item, i) => (
            <div key={i} className="flex items-center space-x-12">
              <span className="text-[#0a0a0a] font-[900] tracking-widest text-sm md:text-xl uppercase">{item}</span>
              <span className="text-[#0a0a0a] font-black text-xl">/</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
