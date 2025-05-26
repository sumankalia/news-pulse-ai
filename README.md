# 🧠 NewsPulse AI

**NewsPulse AI** is a real-time news analysis platform powered by OpenAI and Bright Data's Fast MCP server. It intelligently discovers, accesses, extracts, and interacts with live news data from across the web — no database, no caching, just raw real-time analysis.

> ⚡ Built for the [Bright Data AI Web Access Hackathon](https://dev.to/challenges/brightdata-2025-05-07)

> ⚡ My submission [My submission](https://dev.to/challenges/brightdata-2025-05-07)

## 🌐 Live Site:

Frontend: http://ec2-16-170-239-65.eu-north-1.compute.amazonaws.com:5173/
Backend: http://ec2-16-170-239-65.eu-north-1.compute.amazonaws.com:4002/api/articles/ping

## 🚀 What It Does

Users can enter any news-related query — from headlines to political topics — and NewsPulse AI will:

1. **Determine the best method to acquire relevant news articles** (via LangChain + LLM prompt)
2. **Scrape and extract data from real websites using Bright Data's Fast MCP tools**
3. **Run detailed analysis using OpenAI GPT-3.5 Turbo**, including:
   - Sentiment
   - Bias
   - Political leaning
   - Propaganda & misinformation likelihood
   - Emotional analysis
   - Factuality, subjectivity, tone, toxicity, and more
4. **Show results in real time** via WebSocket — no refresh, no delay

## 🛠️ Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **AI Models:** OpenAI GPT-3.5 Turbo (via LangChain)
- **Scraping:** Bright Data Fast MCP server (via STDIO integration)
- **Visualization:** WebSocket + Recharts (Pie charts, Logs, Live Cards)
- **Storage:** No database used — everything is scraped live

## 🚀 Getting Started (Development)

```
git clone https://github.com/sumankalia/NewsPulseAI
cd NewsPulseAI
npm run install:all
npm run dev

🧾 .env Configuration
Server .env
BROWSER_WS=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-3.5-turbo

BRIGHT_DATA_ZONE=
BRIGHT_DATA_API_TOKEN=
BRIGHT_DATA_PROXY_SERVER=

CLIENT_URL=http://localhost:5173/


Client .env
env
BACKEND_URI=
```

## 🌐 Real-Time Web Access with Bright Data MCP

### ✅ Discover

LangChain selects from 4 intelligent scraping methods:

- `scrape_as_article`
- `scrape_a_homepage`
- `search_via_google`
- `search_via_bing`

### ✅ Access

Using Fast MCP's browser tools like:

scraping_browser_navigate
scraping_browser_clear_input
scraping_browser_press
scraping_browser_wait_for

These simulate real browser behavior to access complex and JavaScript-heavy websites — just like a human.

### ✅ Extract

We use both RAWHTML and MARKDOWN modes provided by Bright Data to extract clean article content, title, author, image, publish date, and source. We also remove duplicates and clean links.

### ✅ Interact

The search_via_bing method performs full browser automation: 1. Navigates to Bing 2. Clears input 3. Types user query 4. Hits enter 5. Waits for dynamic content 6. Extracts article links 7. Analyzes each one live

### 📊 OpenAI-Powered Analysis

For each article, GPT-3.5 Turbo returns:
• Sentiment
• Bias score
• Political leaning
• Misinformation & Propaganda likelihood
• Toxicity
• Primary/Secondary emotion
• Factuality vs Subjectivity
• Tone & content analysis
• Reasoning summary
• List of misinformation keywords

### ⚡ WebSocket Live Logs

    •	Real-time scraping decisions (e.g. selected method)
    •	Pages being scraped
    •	Article links found
    •	Articles being analyzed
    •	Live UI updates (cards + pie charts)

### 📈 Performance Boost with Fast MCP

We initially used Puppeteer and manually rotated Bright Data proxies (residential, mobile, unlocker) — but performance was slow and code-heavy.

After switching to Fast MCP + STDIO communication, scraping time reduced by ~80%. This dramatically improved UX and lowered maintenance.

### ✅ We’re directly running the MCP server inside our Node.js backend (Express) and communicating through standard input/output (STDIO) — this was a key architectural shift and a major technical achievement.

🔗 Compare with our older Puppeteer-based project: https://inspiring-taffy-5808f5.netlify.app/

🙌 Acknowledgements
• Bright Data MCP
• OpenAI
• LangChain
• React
• Vite

⸻

⭐ If you liked this project or found it useful, consider giving a ⭐ on GitHub and supporting Bright Data’s MCP repo!

## 🤝 Team

Built by: Suman and Sarita Kumar
For the 2025 Dev Challenge Hackathon
# news-pulse-ai
# news-pulse-ai
