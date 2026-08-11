const MOCK_ARTICLES = [
  {
    title: "Federal Reserve Signals Potential Rate Cut Amid Mixed Inflation Data",
    source: "Business",
    date: "Aug 11, 2026",
    snippet: "Central bank officials hinted at a possible policy adjustment in the coming months as core CPI shows signs of stabilizing near the 2% target...",
    tagColor: "--accent"
  },
  {
    title: "Quantum Computing Breakthrough Achieved by International Research Team",
    source: "Science",
    date: "Aug 10, 2026",
    snippet: "Researchers have demonstrated stable qubit operations at room temperature, a milestone that could accelerate practical quantum advantage within five years...",
    tagColor: "--accent"
  },
  {
    title: "Global Climate Summit Reached Historic Agreement on Carbon Pricing",
    source: "World",
    date: "Aug 10, 2026",
    snippet: "Delegations from 195 nations agreed to a unified carbon pricing mechanism, potentially reshaping international trade and corporate emissions reporting...",
    tagColor: "--accent"
  },
  {
    title: "Next-Gen Electric Vehicle Battery Doubles Range in Real-World Tests",
    source: "Technology",
    date: "Aug 9, 2026",
    snippet: "A Silicon Valley startup's solid-state battery achieved 800 miles per charge under mixed driving conditions, marking a key step toward mass adoption...",
    tagColor: "--accent"
  },
  {
    title: "Champions League Draws Record Television Audience for Opening Matches",
    source: "Sports",
    date: "Aug 9, 2026",
    snippet: "The tournament's first Tuesday set a new viewership record with 420 million unique viewers across 200 markets, up 15% from last year...",
    tagColor: "--accent"
  }
];

const MOCK_PILLS = ["🌍 World", "💻 Tech", "🔬 Science", "⚽ Sports", "📈 Business"];

const mockHeadline = document.getElementById("mockHeadline");
const mockSnippet = document.getElementById("mockSnippet");
const mockTag = document.getElementById("mockTag");
const mockDate = document.getElementById("mockDate");
const mockCounter = document.getElementById("mockCounter");
const mockImage = document.getElementById("mockImage");
const mockClock = document.getElementById("mockClock");
const mockPills = document.querySelectorAll(".mock-pill");
const pillsContainer = document.querySelector(".mock-category-bar");

let currentIndex = 0;
let currentArticle = MOCK_ARTICLES[0];
let intervalId = null;
let clockId = null;
let pillIndex = 0;

function formatClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  mockClock.textContent = `${h}:${m}:${s}`;
}

function updatePillHighlight() {
  mockPills.forEach(p => p.classList.remove("active"));
  mockPills[pillIndex].classList.add("active");
  pillIndex = (pillIndex + 1) % mockPills.length;
}

function rotateArticle() {
  mockHeadline.classList.add("fade");
  mockImage.classList.remove("show");

  setTimeout(() => {
    currentArticle = MOCK_ARTICLES[currentIndex];
    mockHeadline.textContent = currentArticle.title;
    mockHeadline.classList.remove("fade");
    mockSnippet.textContent = currentArticle.snippet;
    mockTag.textContent = currentArticle.source;
    mockDate.textContent = currentArticle.date;
    mockCounter.textContent = `${currentIndex + 1} / ${MOCK_ARTICLES.length}`;
    mockImage.classList.add("show");
    updatePillHighlight();
    currentIndex = (currentIndex + 1) % MOCK_ARTICLES.length;
  }, 300);
}

function startMockSlideshow() {
  formatClock();
  clockId = setInterval(formatClock, 1000);
  rotateArticle();
  intervalId = setInterval(rotateArticle, 6000);
}

startMockSlideshow();
