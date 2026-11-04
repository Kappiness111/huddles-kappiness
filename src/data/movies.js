// Curated movie dataset. Same scoring shape as books.
// `wiki` is the English Wikipedia page used by scripts/fetch-media.mjs to download the poster
// into /public/media/movies/<id>.jpg.

export const MOVIES = [
  {
    id: 'inception',
    title: 'Inception',
    year: 2010,
    language: 'en',
    genreLabel: 'Sci-Fi · Thriller',
    description:
      'A thief who steals secrets from dreams is given one last job: plant an idea in someone’s mind.',
    genres: { psychological: 3, scifi: 2, thriller: 2, adventure: 1 },
    wiki: 'Inception',
  },
  {
    id: 'prestige',
    title: 'The Prestige',
    year: 2006,
    language: 'en',
    genreLabel: 'Mystery · Drama',
    description:
      'Two rival magicians in Victorian London go to dangerous lengths to create the ultimate illusion.',
    genres: { mystery: 3, psychological: 3, thriller: 1 },
    wiki: 'The_Prestige_(film)',
  },
  {
    id: 'knives-out',
    title: 'Knives Out',
    year: 2019,
    language: 'en',
    genreLabel: 'Mystery · Comedy',
    description:
      'A famous crime novelist dies the night of his 85th birthday, and everyone in his ridiculous family is a suspect.',
    genres: { mystery: 3, comedy: 2, thriller: 1 },
    wiki: 'Knives_Out',
  },
  {
    id: 'shutter-island',
    title: 'Shutter Island',
    year: 2010,
    language: 'en',
    genreLabel: 'Psychological Thriller',
    description:
      'A US Marshal investigates a disappearance at an asylum for the criminally insane, and starts losing his grip on reality.',
    genres: { psychological: 3, thriller: 3, mystery: 2 },
    wiki: 'Shutter_Island_(film)',
  },
  {
    id: 'spirited-away',
    title: 'Spirited Away',
    year: 2001,
    language: 'en',
    genreLabel: 'Animated Fantasy',
    description:
      'Ten-year-old Chihiro wanders into a world of spirits and must work in a bathhouse for gods to save her parents.',
    genres: { fantasy: 3, selfDiscovery: 2, adventure: 2 },
    wiki: 'Spirited_Away',
  },
  {
    id: 'pride-prejudice-2005',
    title: 'Pride & Prejudice',
    year: 2005,
    language: 'en',
    genreLabel: 'Period Romance',
    description:
      'Misty fields, sharp words and the famous hand flex. Elizabeth and Darcy, beautifully brought to the screen.',
    genres: { romance: 3, drama: 2, comedy: 1 },
    wiki: 'Pride_%26_Prejudice_(2005_film)',
    twinOf: 'pride-prejudice', // never pair with the book of the same story
  },
  {
    id: 'la-la-land',
    title: 'La La Land',
    year: 2016,
    language: 'en',
    genreLabel: 'Musical · Romance',
    description:
      'A jazz pianist and an aspiring actress fall in love in Los Angeles while chasing very big dreams.',
    genres: { romance: 3, drama: 2, selfDiscovery: 2 },
    wiki: 'La_La_Land',
  },
  {
    id: 'interstellar',
    title: 'Interstellar',
    year: 2014,
    language: 'en',
    genreLabel: 'Science Fiction · Drama',
    description:
      'With Earth dying, a team of astronauts travels through a wormhole to find humanity a new home.',
    genres: { scifi: 3, drama: 2, adventure: 2 },
    wiki: 'Interstellar_(film)',
  },
  {
    id: 'walter-mitty',
    title: 'The Secret Life of Walter Mitty',
    year: 2013,
    language: 'en',
    genreLabel: 'Adventure · Feel-Good',
    description:
      'A daydreaming photo editor finally leaves his desk on a real journey across Greenland, Iceland and the Himalayas.',
    genres: { selfDiscovery: 3, adventure: 3, comedy: 1 },
    wiki: 'The_Secret_Life_of_Walter_Mitty_(2013_film)',
  },
  {
    id: 'everything-everywhere',
    title: 'Everything Everywhere All at Once',
    year: 2022,
    language: 'en',
    genreLabel: 'Sci-Fi · Comedy · Drama',
    description:
      'A laundromat owner doing her taxes discovers she must connect with versions of herself across the multiverse.',
    genres: { scifi: 2, comedy: 2, drama: 2, psychological: 1 },
    wiki: 'Everything_Everywhere_All_at_Once',
  },
  {
    id: 'parasite',
    title: 'Parasite',
    year: 2019,
    language: 'en',
    genreLabel: 'Thriller · Dark Comedy',
    description:
      'A poor family schemes its way into working for a wealthy household, until a secret in the basement changes everything.',
    genres: { thriller: 3, psychological: 2, comedy: 1 },
    wiki: 'Parasite_(2019_film)',
  },
  {
    id: 'grand-budapest',
    title: 'The Grand Budapest Hotel',
    year: 2014,
    language: 'en',
    genreLabel: 'Comedy · Caper',
    description:
      'A legendary concierge and his lobby boy are caught up in a stolen painting and a family fortune.',
    genres: { comedy: 3, adventure: 2, mystery: 1 },
    wiki: 'The_Grand_Budapest_Hotel',
  },
  {
    id: 'up',
    title: 'Up',
    year: 2009,
    language: 'en',
    genreLabel: 'Animated Adventure',
    description:
      'A grumpy widower ties thousands of balloons to his house and floats away to South America, with an accidental stowaway.',
    genres: { drama: 3, adventure: 2, comedy: 2 },
    wiki: 'Up_(2009_film)',
  },
  {
    id: 'howls-moving-castle',
    title: "Howl's Moving Castle",
    year: 2004,
    language: 'en',
    genreLabel: 'Animated Fantasy · Romance',
    description:
      'Cursed into an old woman, young Sophie finds shelter in the walking castle of a vain, mysterious wizard.',
    genres: { fantasy: 3, romance: 2, adventure: 1 },
    wiki: "Howl's_Moving_Castle_(film)",
  },
  {
    id: 'the-martian',
    title: 'The Martian',
    year: 2015,
    language: 'en',
    genreLabel: 'Science Fiction · Survival',
    description:
      'Stranded alone on Mars, a botanist has to science his way to survival, with jokes.',
    genres: { scifi: 3, comedy: 2, adventure: 2 },
    wiki: 'The_Martian_(film)',
  },
  {
    id: 'before-sunrise',
    title: 'Before Sunrise',
    year: 1995,
    language: 'en',
    genreLabel: 'Romance · Drama',
    description:
      'Two strangers meet on a train and spend one night walking and talking their way through Vienna.',
    genres: { romance: 3, drama: 1, selfDiscovery: 1 },
    wiki: 'Before_Sunrise',
  },
  {
    id: 'dead-poets-society',
    title: 'Dead Poets Society',
    year: 1989,
    language: 'en',
    genreLabel: 'Drama · Coming of Age',
    description:
      'An unconventional English teacher inspires his students to seize the day and find their own voices.',
    genres: { drama: 3, selfDiscovery: 3 },
    wiki: 'Dead_Poets_Society',
  },
  {
    id: 'prisoners',
    title: 'Prisoners',
    year: 2013,
    language: 'en',
    genreLabel: 'Crime Thriller',
    description:
      'When two little girls go missing, a desperate father takes the investigation into his own hands.',
    genres: { thriller: 3, mystery: 3, psychological: 1 },
    wiki: 'Prisoners_(2013_film)',
  },
  {
    id: 'raiders',
    title: 'Raiders of the Lost Ark',
    year: 1981,
    language: 'en',
    genreLabel: 'Action Adventure',
    description:
      'Archaeologist Indiana Jones races across the globe to find the Ark of the Covenant before anyone else can.',
    genres: { adventure: 3, comedy: 1, thriller: 1 },
    wiki: 'Raiders_of_the_Lost_Ark',
  },
  {
    id: 'arrival',
    title: 'Arrival',
    year: 2016,
    language: 'en',
    genreLabel: 'Science Fiction · Drama',
    description:
      'When mysterious spacecraft land around the world, a linguist is asked to work out what the visitors are trying to say.',
    genres: { scifi: 3, drama: 2, psychological: 2 },
    wiki: 'Arrival_(film)',
  },
  {
    id: 'paddington-2',
    title: 'Paddington 2',
    year: 2017,
    language: 'en',
    genreLabel: 'Family Comedy',
    description:
      'Paddington is framed for stealing a rare pop-up book and lands in prison, where he wins everyone over with marmalade.',
    genres: { comedy: 3, drama: 1, adventure: 1, mystery: 1 },
    wiki: 'Paddington_2',
  },
  {
    id: 'coco',
    title: 'Coco',
    year: 2017,
    language: 'en',
    genreLabel: 'Animated Fantasy',
    description:
      'Twelve-year-old Miguel dreams of music and stumbles into the colourful Land of the Dead to find out where he comes from.',
    genres: { drama: 2, fantasy: 2, selfDiscovery: 1 },
    wiki: 'Coco_(2017_film)',
  },
  {
    id: 'zootopia',
    title: 'Zootopia',
    year: 2016,
    language: 'en',
    genreLabel: 'Animated Mystery · Comedy',
    description:
      "A rookie bunny cop and a con-artist fox team up to crack a missing-mammal case across the city.",
    genres: { mystery: 2, comedy: 2, adventure: 1 },
    wiki: 'Zootopia',
  },
  {
    id: 'wall-e',
    title: 'WALL-E',
    year: 2008,
    language: 'en',
    genreLabel: 'Animated Science Fiction',
    description:
      'A lonely trash-compacting robot left on Earth falls in love, and follows her all the way across the galaxy.',
    genres: { scifi: 3, drama: 2, romance: 1 },
    wiki: 'WALL-E',
  },
  {
    id: 'fellowship',
    title: 'The Lord of the Rings: The Fellowship of the Ring',
    year: 2001,
    language: 'en',
    genreLabel: 'Epic Fantasy',
    description:
      'A humble hobbit sets out with eight companions to destroy a ring that could doom the world.',
    genres: { fantasy: 3, adventure: 3, drama: 1 },
    wiki: 'The_Lord_of_the_Rings:_The_Fellowship_of_the_Ring',
  },
]
