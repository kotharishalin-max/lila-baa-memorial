// Family tree constants.
// Sourced from the vault index note (children + spouses as introduced at the besnu)
// and from the granddaughter Jankiben's eulogy (great-grandchildren and grandchildren named).

export const children = [
  {
    name: 'Dr. Kiranbhai Kothari',
    relation: 'Son',
    spouse: 'Sandhyaben',
  },
  {
    name: 'Dr. Pannaben Barai',
    relation: 'Daughter',
    spouse: 'Dr. Bharatbhai Barai',
    note: 'Family settled in America since 1975',
  },
  {
    name: 'Niharikaben Parikh',
    relation: 'Daughter',
    spouse: 'Anilbhai Parikh',
  },
  {
    name: 'Binaben Shah',
    relation: 'Daughter',
    spouse: 'Rajitbhai Shah',
  },
]

// People named in the eulogies (non-exhaustive — just the ones identified in the audio)
export const namedInEulogies = {
  grandchildren: [
    { name: 'Jankiben', note: 'Delivered the granddaughter\'s eulogy at the besnu' },
    { name: 'Dr. Shalin Kothari', note: 'Sang "Bhulo Bhale Biju Badhu" as a tribute (track 24)' },
    { name: 'Sujata', note: 'Barai granddaughter; Harvard Law School graduate' },
  ],
  greatGrandchildren: [
    { name: 'Lila', note: 'Named after Ba' },
    { name: 'Kian', note: 'Sona\'s son — Ba instantly soothed him as a newborn' },
  ],
  extendedFamily: [
    'Bhaikaka',
    'Vimalakaki',
    'Jikaka',
    'Shakuntalakaki',
    'Sumanfoi',
    'Lalitaba',
    'Shantaba',
  ],
}
