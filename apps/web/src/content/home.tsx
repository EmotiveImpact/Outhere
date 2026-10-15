/** Words for the home page that are easier to edit here than in the markup. */
export const FAQ: [string, React.ReactNode][] = [
  ['Is Outhere free?', 'Yes. Free covers every step, one crew, your borough league and three battles a week. Pro and Black add more, and their prices are placeholders until launch.'],
  ['When does it open?', "London first. Each borough opens when 1,000 people are on its list, so sharing your link brings your borough's opening day closer."],
  ['Do I have to run?', 'No. Walking, running, the school run and the commute all count. A step is a step.'],
  ['How are steps counted?', 'From Apple Health or Google Fit on your phone, or a connected watch. We filter out shaking and car journeys, so only real steps count.'],
  ['What about my run club?', <>Your captain claims the club's official crew. Everyone who joins through the club plays for it, and founding clubs keep their crest for good. <a href="/crews">See how crews work</a>.</>],
  ['How do I get into Black?', <>By invitation. Members nominate people, the most consistent people on Outhere earn a place, and a few waitlist places open each month. <a href="/black">Read more about Black</a>.</>],
  ['What do you do with my location?', <>Your routes stay private unless you share them. Leagues only use the borough you play for. <a href="/privacy">Read the privacy notice</a>.</>],
  ['Can I leave?', 'Any time, from settings. Leaving deletes your account and your data.'],
];

/** [feature, tooltip, free, pro, black]; true is a tick, false a dash. */
type Cell = string | boolean;
export const COMPARE: [string, string, [string, string, Cell, Cell, Cell][]][] = [
  ['play', 'Play', [
    ['Steps counted every day', 'Walking, running and the commute all count, from your phone or a connected watch.', true, true, true],
    ['1v1 battles', 'Challenge anyone in London to a day or a week of steps.', '3 a week', 'Unlimited', 'Unlimited'],
    ['Borough league', 'Your steps count for your borough in a London-wide table.', true, true, true],
    ['City squad call-ups', 'When London plays another city, the most active people get called up.', true, true, 'First call'],
    ['Season rewards', 'OUT earned at the end of each six-week season.', '1x', '2x', '2x'],
  ]],
  ['crews', 'Crews', [
    ['Crews you can join', 'A crew is your run club, your mates or your office.', '1', 'Unlimited', 'Unlimited'],
    ['Run club crew badge', 'Members who join through their club wear its badge on their ring.', true, true, true],
    ['Club v club derbies', 'Your club takes on rival clubs in its area each season.', true, true, true],
    ['Captain tools', 'Captains run their club for free, whatever their own plan.', true, true, true],
  ]],
  ['stats', 'Stats', [
    ['Daily totals', 'Steps, distance and time out, every day.', true, true, true],
    ['Routes and maps', 'Every walk and run drawn on a map. Private unless you share it.', false, true, true],
    ['Streak history', 'How far back you can see your streaks.', '30 days', 'All time', 'All time'],
    ['Export your data', 'Download everything as a file whenever you like.', true, true, true],
  ]],
  ['perks', 'Perks', [
    ['Profile ring', 'The ring round your photo everywhere in the app.', 'Standard', 'Blue Pro', 'Gunmetal'],
    ["Members' nights", 'Rooftop runs, late track sessions and dinners across London.', false, false, true],
    ['First access to drops', 'Shop every Outhere drop before anyone else.', false, false, '48 hours early'],
    ['Guest passes', "Bring a friend to a members' night.", false, false, '1 a month'],
  ]],
];

/** The hero reel: [image, hold ms, camera move, object-position, effect into the next shot]. */
export type Shot = [string, number, Move, string, ('flash' | 'sweep')?];
export type Move = 'push' | 'punch' | 'rush' | 'rise' | 'driftL' | 'driftR' | 'whipL' | 'whipR';
export const REEL: Shot[] = [
  ['hero.jpg', 2800, 'push', 'center 35%'],
  ['cut/m7.jpg', 1500, 'push', '40% center'],
  ['cut/m6.jpg', 520, 'driftL', 'center 40%'],
  ['cut/m1.jpg', 420, 'punch', '42% center'],
  ['cut/m3.jpg', 760, 'driftR', '30% center'],
  ['cut/m4.jpg', 300, 'push', 'center'],
  ['cut/m2.jpg', 340, 'whipL', '45% center'],
  ['cut/m9.jpg', 380, 'whipR', '55% center'],
  ['cut/m8.jpg', 360, 'punch', '60% center', 'sweep'],
  ['cut/m10.jpg', 900, 'rush', '48% center'],
  ['cut/m5.jpg', 1500, 'rise', 'center 60%'],
  ['battle.jpg', 420, 'driftR', '30% center'],
  ['face.jpg', 340, 'punch', 'center 30%'],
  ['crew.jpg', 460, 'driftL', 'center'],
  ['club.jpg', 700, 'push', '60% center', 'flash'],
];
