// Curated TV series for the offline / fallback shelf ("your next watch"), in the five focus languages.
// Same shape as movies.js plus `format: 'series'`. `year` is the first season. `wiki` is the English
// Wikipedia page scripts/fetch-media.mjs uses to download the poster into /public/media/movies/<id>.jpg.
// Picked to suit a public stall: no explicit or gratuitously violent shows. `noCover: true` = no
// verified poster, so the app shows its designed typographic cover rather than risk a wrong image.

const S = (x) => ({ ...x, format: 'series' })

export const SERIES = [
  // ── English ──
  S({ id: 'sherlock', title: 'Sherlock', year: 2010, language: 'en', genreLabel: 'Mystery · Crime',
    description: 'A modern-day Sherlock Holmes and Dr John Watson take on baffling cases across London.',
    genres: { mystery: 3, thriller: 2, psychological: 1 }, wiki: 'Sherlock_(TV_series)' }),
  S({ id: 'the-crown', title: 'The Crown', year: 2016, language: 'en', genreLabel: 'Historical Drama',
    description: 'The reign of Queen Elizabeth II, from her wedding to the turn of the century, and the people around her.',
    genres: { historical: 3, drama: 3, relationships: 1 }, wiki: 'The_Crown_(TV_series)' }),
  S({ id: 'stranger-things', title: 'Stranger Things', year: 2016, language: 'en', genreLabel: 'Sci-Fi · Mystery',
    description: 'In a small 1980s town, a group of friends search for a missing boy and uncover a secret world.',
    genres: { scifi: 2, mystery: 2, adventure: 2, relationships: 1 }, wiki: 'Stranger_Things' }),
  S({ id: 'ted-lasso', title: 'Ted Lasso', year: 2020, language: 'en', genreLabel: 'Comedy · Heart',
    description: 'A relentlessly kind American coach is hired to manage an English football club, knowing nothing about the game.',
    genres: { contemporary: 3, relationships: 2, selfDiscovery: 1 }, wiki: 'Ted_Lasso' }),
  S({ id: 'the-good-place', title: 'The Good Place', year: 2016, language: 'en', genreLabel: 'Comedy · Philosophy',
    description: "After she dies, Eleanor wakes up in a heaven-like neighbourhood she knows she doesn't deserve.",
    genres: { philosophy: 3, fantasy: 2, contemporary: 2 }, wiki: 'The_Good_Place', noCover: true }),
  S({ id: 'anne-with-an-e', title: 'Anne with an E', year: 2017, language: 'en', genreLabel: 'Period Drama · Coming of Age',
    description: 'Orphan Anne Shirley brings imagination and chaos to a quiet farm on Prince Edward Island.',
    genres: { historical: 2, selfDiscovery: 3, relationships: 2 }, wiki: 'Anne_with_an_E' }),
  S({ id: 'queens-gambit', title: "The Queen's Gambit", year: 2020, language: 'en', genreLabel: 'Drama · Miniseries',
    description: 'An orphaned girl discovers a rare gift for chess, and fights her own demons on the way to the top.',
    genres: { drama: 3, selfDiscovery: 2, psychological: 1, historical: 1 }, wiki: "The_Queen's_Gambit_(miniseries)" }),
  // ── Hindi ──
  S({ id: 'panchayat', title: 'Panchayat', nativeTitle: 'पंचायत', year: 2020, language: 'hi', genreLabel: 'Comedy · Village Life',
    description: 'An engineering graduate reluctantly takes a job as secretary of a remote village panchayat.',
    genres: { contemporary: 3, relationships: 2, selfDiscovery: 1 }, wiki: 'Panchayat_(TV_series)', noCover: true }),
  S({ id: 'kota-factory', title: 'Kota Factory', nativeTitle: 'कोटा फ़ैक्टरी', year: 2019, language: 'hi', genreLabel: 'Drama · Student Life',
    description: "Students in Kota, India's coaching-centre capital, chase their engineering dreams with a much-loved teacher.",
    genres: { contemporary: 2, selfDiscovery: 3, relationships: 1 }, wiki: 'Kota_Factory' }),
  S({ id: 'the-family-man', title: 'The Family Man', nativeTitle: 'द फैमिली मैन', year: 2019, language: 'hi', genreLabel: 'Spy Thriller · Comedy',
    description: 'A middle-class father secretly works for an intelligence agency, juggling missions and family life.',
    genres: { thriller: 3, contemporary: 2, adventure: 1 }, wiki: 'The_Family_Man_(Indian_TV_series)', noCover: true }),
  S({ id: 'gullak', title: 'Gullak', nativeTitle: 'गुल्लक', year: 2019, language: 'hi', genreLabel: 'Family · Slice of Life',
    description: 'Small, warm stories of the Mishra family in a north Indian town.',
    genres: { relationships: 3, contemporary: 2 }, wiki: 'Gullak' }),
  S({ id: 'rocket-boys', title: 'Rocket Boys', nativeTitle: 'रॉकेट बॉयज़', year: 2022, language: 'hi', genreLabel: 'Historical Drama',
    description: "The story of Homi Bhabha and Vikram Sarabhai, who built India's nuclear and space programmes.",
    genres: { historical: 3, drama: 2, scifi: 1 }, wiki: 'Rocket_Boys_(web_series)', noCover: true }),
  // ── Malayalam ──
  S({ id: 'kerala-crime-files', title: 'Kerala Crime Files', nativeTitle: 'കേരള ക്രൈം ഫയൽസ്', year: 2023, language: 'ml', genreLabel: 'Crime · Investigation',
    description: 'Police officers hunt a killer across Kerala with almost nothing to go on but a false address.',
    genres: { mystery: 3, thriller: 2 }, wiki: 'Kerala_Crime_Files' }),
  S({ id: 'poacher', title: 'Poacher', nativeTitle: 'പോച്ചർ', year: 2024, language: 'ml', genreLabel: 'Crime · Investigation',
    description: "Forest officers in Kerala chase India's biggest ivory-poaching ring. Inspired by real events.",
    genres: { thriller: 2, mystery: 2, drama: 2 }, wiki: 'Poacher_(TV_series)' }),
  // ── Tamil ──
  S({ id: 'suzhal', title: 'Suzhal: The Vortex', nativeTitle: 'சுழல்', year: 2022, language: 'ta', genreLabel: 'Mystery Thriller',
    description: "A girl's disappearance during a town festival pulls a small factory town's secrets to the surface.",
    genres: { mystery: 3, thriller: 2, drama: 1 }, wiki: 'Suzhal:_The_Vortex', noCover: true }),
  S({ id: 'vilangu', title: 'Vilangu', nativeTitle: 'விலங்கு', year: 2022, language: 'ta', genreLabel: 'Crime Thriller',
    description: 'A village police inspector investigates when a body is found in the forest.',
    genres: { mystery: 3, thriller: 2 }, wiki: 'Vilangu', noCover: true }),
  S({ id: 'sweet-kaaram-coffee', title: 'Sweet Kaaram Coffee', nativeTitle: 'ஸ்வீட் காரம் காபி', year: 2023, language: 'ta', genreLabel: 'Family · Road Trip',
    description: 'A grandmother, mother and daughter leave their routines behind for a road trip together.',
    genres: { relationships: 3, selfDiscovery: 2, contemporary: 1 }, wiki: 'Sweet_Kaaram_Coffee' }),
  // ── Telugu ──
  S({ id: 'modern-love-hyderabad', title: 'Modern Love Hyderabad', year: 2022, language: 'te', genreLabel: 'Romance · Anthology',
    description: 'Six love stories set in Hyderabad: romantic, funny and close to home.',
    genres: { romance: 3, relationships: 2, contemporary: 1 }, wiki: 'Modern_Love_Hyderabad' }),
  S({ id: 'save-the-tigers', title: 'Save the Tigers', year: 2023, language: 'te', genreLabel: 'Comedy · Family',
    description: 'Three husbands, worn down by marriage and work, bond over their everyday troubles.',
    genres: { contemporary: 3, relationships: 2 }, wiki: 'Save_the_Tigers_(TV_series)' }),
  S({ id: 'dhootha', title: 'Dhootha', year: 2023, language: 'te', genreLabel: 'Supernatural Mystery',
    description: 'A journalist finds that headlines from old newspapers are predicting deaths around him.',
    genres: { mystery: 3, thriller: 2, fantasy: 1 }, wiki: 'Dhootha' }),
]
