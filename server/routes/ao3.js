const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Simulated AO3 metadata — realistic mock data keyed by work ID hash
const MOCK_FICS = [
  {
    title: "All the Young Dudes",
    author: "MsKingBean89",
    fandom: "Harry Potter - J. K. Rowling",
    ships: ["Remus Lupin/Sirius Black"],
    characters: ["Remus Lupin", "Sirius Black", "James Potter", "Peter Pettigrew", "Lily Evans Potter"],
    wordCount: 526969,
    chapterCount: 188,
    completionStatus: "complete",
    contentRating: "M",
    contentWarnings: ["Major Character Death", "Underage"],
    tags: ["Marauders Era", "Slow Burn", "Coming of Age", "Canon Compliant", "Emotional Hurt/Comfort", "Found Family", "Angst with a Happy Ending"],
    language: "English",
    seriesName: "All the Young Dudes",
    sourcePlatform: "ao3",
    lastUpdatedDate: "2019-11-15",
  },
  {
    title: "What You Don't Know",
    author: "hollimichele",
    fandom: "Marvel Cinematic Universe",
    ships: ["Steve Rogers/Bucky Barnes"],
    characters: ["Steve Rogers", "Bucky Barnes", "Sam Wilson", "Natasha Romanov"],
    wordCount: 75678,
    chapterCount: 15,
    completionStatus: "complete",
    contentRating: "M",
    contentWarnings: [],
    tags: ["Post-Captain America: The Winter Soldier", "Recovery", "Memory Loss", "Hurt/Comfort"],
    language: "English",
    seriesName: "",
    sourcePlatform: "ao3",
    lastUpdatedDate: "2015-06-20",
  },
  {
    title: "I Shall Believe",
    author: "omphalos",
    fandom: "Supernatural",
    ships: ["Dean Winchester/Castiel"],
    characters: ["Dean Winchester", "Castiel", "Sam Winchester"],
    wordCount: 54231,
    chapterCount: 20,
    completionStatus: "complete",
    contentRating: "M",
    contentWarnings: [],
    tags: ["Human!Castiel", "Hurt/Comfort", "Slow Burn", "Case Fic"],
    language: "English",
    seriesName: "",
    sourcePlatform: "ao3",
    lastUpdatedDate: "2013-08-05",
  },
  {
    title: "A Gentleman's Guide to Vice and Virtue",
    author: "Tangerinehamster",
    fandom: "Good Omens (TV)",
    ships: ["Aziraphale/Crowley"],
    characters: ["Aziraphale", "Crowley"],
    wordCount: 89432,
    chapterCount: 24,
    completionStatus: "complete",
    contentRating: "T",
    contentWarnings: [],
    tags: ["Historical AU", "Regency", "Slow Burn", "Pining", "Idiots in Love"],
    language: "English",
    seriesName: "",
    sourcePlatform: "ao3",
    lastUpdatedDate: "2020-12-01",
  },
  {
    title: "The Light More Beautiful",
    author: "firethesound",
    fandom: "Harry Potter - J. K. Rowling",
    ships: ["Harry Potter/Draco Malfoy"],
    characters: ["Harry Potter", "Draco Malfoy", "Hermione Granger", "Ron Weasley"],
    wordCount: 81000,
    chapterCount: 14,
    completionStatus: "complete",
    contentRating: "M",
    contentWarnings: [],
    tags: ["Auror Partners", "Slow Burn", "Enemies to Lovers", "Pining", "Post-War"],
    language: "English",
    seriesName: "",
    sourcePlatform: "ao3",
    lastUpdatedDate: "2014-05-14",
  },
  {
    title: "Tessellation",
    author: "neomeruru",
    fandom: "Haikyuu!!",
    ships: ["Kageyama Tobio/Hinata Shouyou"],
    characters: ["Hinata Shouyou", "Kageyama Tobio"],
    wordCount: 26000,
    chapterCount: 1,
    completionStatus: "complete",
    contentRating: "E",
    contentWarnings: [],
    tags: ["Timeskip", "Post-Canon", "Reunion", "Emotional"],
    language: "English",
    seriesName: "",
    sourcePlatform: "ao3",
    lastUpdatedDate: "2021-03-22",
  },
  {
    title: "A Long Winter",
    author: "dropdeaddream",
    fandom: "Marvel Cinematic Universe",
    ships: ["Steve Rogers/Bucky Barnes"],
    characters: ["Steve Rogers", "Bucky Barnes", "Natasha Romanov", "Sam Wilson"],
    wordCount: 63786,
    chapterCount: 12,
    completionStatus: "complete",
    contentRating: "M",
    contentWarnings: ["Graphic Depictions Of Violence"],
    tags: ["Post-Avengers", "Winter Soldier", "Recovery", "Found Family"],
    language: "English",
    seriesName: "",
    sourcePlatform: "ao3",
    lastUpdatedDate: "2014-09-15",
  },
  {
    title: "Twist and Shout",
    author: "gabriel | standbyme",
    fandom: "Supernatural",
    ships: ["Dean Winchester/Castiel"],
    characters: ["Dean Winchester", "Castiel", "Sam Winchester"],
    wordCount: 97556,
    chapterCount: 26,
    completionStatus: "complete",
    contentRating: "M",
    contentWarnings: ["Major Character Death"],
    tags: ["Historical AU", "1960s", "Vietnam War", "Angst", "Tragedy", "Emotional Damage"],
    language: "English",
    seriesName: "",
    sourcePlatform: "ao3",
    lastUpdatedDate: "2013-07-28",
  },
  {
    title: "Professional Advice",
    author: "Quarra",
    fandom: "The Untamed | MDZS",
    ships: ["Lan Wangji/Wei Wuxian"],
    characters: ["Wei Wuxian", "Lan Wangji", "Jiang Cheng"],
    wordCount: 42800,
    chapterCount: 10,
    completionStatus: "in-progress",
    contentRating: "T",
    contentWarnings: [],
    tags: ["Modern AU", "Slow Burn", "Coffee Shop", "Pining", "Oblivious Wei Wuxian"],
    language: "English",
    seriesName: "",
    sourcePlatform: "ao3",
    lastUpdatedDate: "2023-11-03",
  },
  {
    title: "The Dead of July",
    author: "whatarefears",
    fandom: "Marvel Cinematic Universe",
    ships: ["Steve Rogers/Bucky Barnes"],
    characters: ["Steve Rogers", "Bucky Barnes"],
    wordCount: 35293,
    chapterCount: 1,
    completionStatus: "complete",
    contentRating: "M",
    contentWarnings: [],
    tags: ["Alternate Universe", "Ghosts", "Horror", "Romance", "One Shot"],
    language: "English",
    seriesName: "",
    sourcePlatform: "ao3",
    lastUpdatedDate: "2013-11-10",
  },
];

router.post('/fetch', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const ao3Match = url.match(/archiveofourown\.org\/works\/(\d+)/);
  if (!ao3Match) {
    return res.status(422).json({ error: 'Not a recognized AO3 URL', canAutoFill: false });
  }

  const workId = parseInt(ao3Match[1]);
  // Use work ID to deterministically pick a mock fic
  const mockFic = MOCK_FICS[workId % MOCK_FICS.length];

  // Simulate a small delay for realism
  setTimeout(() => {
    res.json({
      canAutoFill: true,
      data: {
        ...mockFic,
        sourceUrl: url,
        coverColor: getFandomColor(mockFic.fandom),
        note: '⚡ Auto-filled from AO3 (simulated). Please verify and adjust any fields.',
      }
    });
  }, 600);
});

function getFandomColor(fandom) {
  const colors = [
    '#0d4f4f', '#3b0764', '#1e3a8a', '#831843', '#78350f',
    '#14532d', '#312e81', '#1e293b', '#4a1942', '#1a3a2a'
  ];
  let hash = 0;
  for (let i = 0; i < fandom.length; i++) hash = (hash * 31 + fandom.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

module.exports = router;
