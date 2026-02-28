import { motion } from 'motion/react';

const cities = [
  { name: 'London', scene: 'Tube walkers, park joggers, City commuters, South Bank runners', img: '/images/sporty_city_journey_black_1772104246978.png' },
  { name: 'New York', scene: 'Central Park, Brooklyn Bridge, subway sprinters', img: '/images/sporty_focus_prep_black_1772104208932.png' },
  { name: 'Accra', scene: 'Street movers, early morning walkers', img: '/images/sporty_flexibility_studio_black_1772104267756.png' },
  { name: 'Manchester', scene: 'Canal runners, Northern Quarter walkers', img: '/images/sporty_agility_jump_black_1772104165473.png' },
  { name: 'Lagos', scene: 'Urban movers who grind daily', img: '/images/sporty_shadow_weights_black_1772104227481.png' },
];

export default function Cities() {
  return (
    <section id="cities" className="py-32 bg-[#0a0a0a] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-20">
          <motion.span 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-[#00ff7f] font-bold tracking-widest text-sm uppercase mb-4 block"
          >
            The Urban Crowd
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-7xl font-[800] text-white tracking-tighter"
          >
            YOUR COMPETITION <br/>
            IS <span className="text-gray-600">YOUR CITY.</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.map((city, idx) => (
            <motion.div
              key={city.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.03 }}
              className={`relative rounded-3xl overflow-hidden group h-[400px] cursor-pointer ${idx === 0 || idx === 3 ? 'md:col-span-2' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 group-hover:via-black/20 transition-all duration-500" />
              <img 
                src={city.img} 
                alt={city.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 saturate-50 group-hover:saturate-100"
              />
              <div className="absolute inset-0 z-20 flex flex-col justify-end p-8">
                <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-4xl font-[800] text-white tracking-tight mb-2 uppercase">{city.name}</h3>
                  <p className="text-[#00ff7f] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                    {city.scene}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
