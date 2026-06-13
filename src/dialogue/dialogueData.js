// All NPC dialogue in one data file (Phase 5). missions.js reads mission
// beats from MISSION_LINES and ambient chatter from FLAVOR by NPC id.
// Keep lines short: the dialogue box shows one entry at a time.

export const FLAVOR = {
  gus: [
    'Line three hums like a happy fridge now. Beautiful.',
    'A place for every wrench and every wrench in a place nobody expects.'
  ],
  dot: [
    'Inventory says we have nine thousand belt modules. Inventory is an optimist.',
    'If it fits on a pallet, I have shipped it. If it does not fit, I have also shipped it.'
  ],
  sal: [
    'Parts delivery is backed up by the west dock.',
    'If a box says FRAGILE, that is a suggestion we take very seriously around here.'
  ],
  bea: [
    'Welcome to Laitram Town. Visitor badges are a formality. The handshake is mandatory.',
    'Corporate says we are one big family. A very crunchy family.'
  ],
  ray: [
    'Gate is open for the day shift. Try not to molt in the parking lot.',
    'I have watched this gate for nine years. The gate has never once tried anything.'
  ],
  lou: [
    'The break room coffee has industrial torque.',
    'I have been on break for ten minutes. Emotionally, I never left the line.'
  ],
  cleo: [
    'The bayou humidity is undefeated.',
    'My shell frizzes up every single afternoon. Every. Single. Afternoon.'
  ],
  mo: [
    'Walking the lane keeps the claws loose.',
    'Forklift right of way is not a debate. It is physics.'
  ],
  pearl: [
    'I park in the far lot for the steps. My watch says I am thriving.',
    'Quarterly numbers are up. Morale is shellfish-adjacent.'
  ],
  hank: [
    'Somebody misplaced the 10 mm wrench again.',
    'Every toolbox in Louisiana is missing the same 10 mm wrench. Statistically, that is a conspiracy.'
  ],
  juno: [
    'Conveyor line three is making that sound again.',
    'Not the bad sound. The other sound. The one that becomes the bad sound.'
  ],
  skip: [
    'That canal is for drainage, not for swimming. I checked. Once.',
    'The grass grows faster than I can mow it. This is Louisiana. The grass is winning.'
  ],
  // Indoor NPCs (Phase 5).
  rita: [
    'Welcome to Laitram Machinery. Sign in, take a visitor sticker, and mind your antennae in the door.',
    'The lobby plant is plastic. It is also two inches taller than last month. We do not discuss it.'
  ],
  nina: [
    'I labeled every cable in this cubicle. A new unlabeled one appeared this morning.',
    'My internship goal was conveyor science. Week one has mostly been coffee logistics.'
  ],
  theo: [
    'I built a spreadsheet that tracks my other spreadsheets. It needs its own spreadsheet now.',
    'The manager said to think outside the box. I work inside a cubicle. Mixed signals.'
  ],
  marge: [
    'My door is always open. Metaphorically. Keep it closed, the AC is fighting the bayou.',
    'Q3 looks strong. Q4 depends on the molt schedule.'
  ],
  benny: [
    'The microwave and I have an understanding: thirty seconds, and absolutely no fish.',
    'Somebody put decaf in the orange pot. We are investigating. There will be findings.'
  ],
  // Shrimply Gigantic: the angry giant inspector who roams the east truck
  // court. Lines cycle one at a time, same as every other flavor NPC.
  shrimply: [
    'WHO MOVED MY WRENCH?',
    'Careful, small fry. I inspect the BIG machinery.',
    'You call that a torque spec? My antennae could do better.',
    'Everything on this dock is undersized. Including you.'
  ]
};

export const MISSION_LINES = {
  m1Start: [
    'Hey, new hire. Welcome to the shift.',
    'Conveyor line three is making that sound again, and somebody misplaced the 10 mm wrench. Again.',
    'Word is it wandered off toward the WEST DOCK on the warehouse, with the backed-up pallets.',
    'Bring it back and line three lives another day.'
  ],
  m1Reminder: [
    'No wrench yet? Check the pallet stacks at the WEST DOCK, far side of the warehouse.'
  ],
  m1Complete: [
    'There it is. The prodigal 10 mm returns.',
    'Line three will sing the good hum tonight. Mission one complete.',
    'Next up: Sal at RECEIVING on the east side of Laitram Machinery has a parts box that needs legs. Yours, specifically.'
  ],
  m2Start: [
    'Gus sent you? Good. Parts delivery is backed up by the west dock and I am one shrimp with two arms.',
    'That blue box right there is a conveyor sprocket kit. Dot at the WAREHOUSE has a line waiting on it.',
    'Grab it and jog it over. Shift plus legs equals logistics.'
  ],
  m2ReminderSal: [
    'The blue box, right there on the pad. Dot is waiting at the warehouse front.'
  ],
  m2WrongWay: [
    'Other way, rookie. Dot. Warehouse. West side of campus.'
  ],
  m2ReminderDot: [
    'Sal has the box at RECEIVING, east side of Laitram Machinery. I will be right here.'
  ],
  m2Complete: [
    'The sprocket kit. You magnificent crustacean.',
    'Line is back up before lunch. That is warehouse poetry.',
    'One more thing: Marge, the office manager, called. Her coffee pot died mid-quarterly. Fresh pot is in the LAITRAM MACHINERY break room. Go in through the front LOBBY.'
  ],
  m3Start: [
    'You must be the new hire. Gus says nice things. Mostly.',
    'The quarterly review starts in ten minutes and my coffee pot just died a dramatic death.',
    'There is a fresh pot in the BREAK ROOM, across the office floor. Bring it back and you will have a friend in management.'
  ],
  m3Reminder: [
    'The BREAK ROOM is across the floor, past the cubicles. The pot. Please. The quarter depends on it.'
  ],
  m3Complete: [
    'Sweet industrial-strength salvation. Thank you.',
    'Consider your onboarding complete. You found a wrench, moved a box, and saved a quarterly review.',
    'Take the rest of the shift. Explore the campus. You earned it.'
  ]
};
