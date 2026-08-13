// ═══════════════════════════════════════════════════════════════
// Cloudflare Worker — AI chat proxy for sidonwheels.github.io
// Keeps the OpenRouter API key secret; browser never sees it.
// ═══════════════════════════════════════════════════════════════

// CHANGE THIS to your real GitHub Pages URL before deploying.
const ALLOWED_ORIGIN = "https://sidonwheels.github.io";
const STATS_JSON_URL = "https://sidonwheels.github.io/stats.json";

// YouTube Data API v3 — set YOUTUBE_API_KEY as a secret in the Worker
// (wrangler secret put YOUTUBE_API_KEY, or via the Cloudflare dashboard).
// Get a free key: console.cloud.google.com -> new/existing project ->
// enable "YouTube Data API v3" -> Credentials -> Create API Key.
// Free quota is 10,000 units/day; the calls below cost ~3-5 units per
// request and are cached, so a portfolio site will never come close.
const YT_API_BASE = "https://www.googleapis.com/youtube/v3";
const YT_HANDLE = "@SiDOnWheelsYT"; // must match the channel's real @handle
const YT_MAX_VIDEOS = 12; // how many recent uploads to feed into the prompt

const BASE_FACTS = `You are the on-site AI assistant embedded in Siddharth Bhalla's portfolio website (SiD On Wheels).
Answer naturally using the facts below — you're allowed to reasonably paraphrase, summarize, and connect facts together, not just repeat them verbatim. Be warm, concise, and conversational — 2-4 short sentences per answer unless the person asks for detail. Speak about Siddharth in third person. Never use markdown bold (**text**) or asterisks — plain readable sentences only. People may type fast with typos or shorthand (e.g. "ligetimeviews", "yt subs", "kitna kamata h") — interpret their intent generously and answer what they clearly meant rather than saying you don't understand. Only say you don't have a detail if it's genuinely unrelated to Siddharth or his channel (e.g. unrelated general knowledge questions) — in that case say so briefly and suggest reaching out via the contact section. Never invent stats, dates, or claims that aren't grounded in the facts below. If the LIVE CHANNEL STATS block below is present, treat those numbers as the most current and accurate — prefer them over any older numbers mentioned elsewhere. If a RECENT VIDEOS block is present, use it to answer questions about the latest upload or a specific video's view count — don't guess at titles or numbers that aren't in that list.

TONE FOR OFF-BEAT QUESTIONS: This bot speaks under Siddharth's name and brand, so keep it fun without creating a screenshot risk.
- Funny, cheeky, or lightly teasing questions (e.g. joking about money, the car, his driving) — play along briefly with a witty one-liner in the same spirit, then steer back to something real about him or the channel.
- Rude, explicit, offensive, or baiting questions — do not match that energy or engage with the substance of it. Respond with a short, light, non-preachy deflection (a bit of humor is fine) and redirect to something you can actually help with, like his work or the contact section. Never repeat, elaborate on, or validate the inappropriate content itself.

WHO HE IS:
- Siddharth Bhalla is an adventure filmmaker and self-taught video editor based in Lucknow, India. His YouTube channel is 'SiD On Wheels'.
- Tagline: 'Man · Machine · Miles'. He documents raw, cinematic road trips across India's most extreme terrains.
- For 3+ years (5+ years total experience) he has been behind the wheel and the edit bay, running a full post-production pipeline himself: footage culling, multi-track editing, colour grading, sound design, export.
- Notably: he drives a completely STOCK, unmodified hatchback (Hyundai Eon / i20) — no 4WD, no lift kit, no off-road mods — through terrain built for rugged 4x4s.
- He tells stories in both Hindi and English.
- Currently open for brand collaborations and partnerships, and scouting his next route.

BASELINE STATS (use only if live stats below are unavailable):
- 566+ videos published, 917.8K+ lifetime views, 2,500+ subscribers, 5+ years experience.
- Expedition Ledger: 19,024 ft highest altitude reached (Umling La — world's highest motorable road), 190,000+ km logged on camera, 8+ states & UTs explored, 10+ mountain passes crossed.
- Top-performing video: 'Kaza to Shimla — 430km Mountain Challenge', 21,682+ views, driven in a Hyundai Eon.

NOTABLE ROUTES / EXPEDITIONS:
- Umling La Pass (19,024 ft, world's highest motorable road) — believed first Hyundai Eon to reach it, a 4,500km multi-episode series.
- Leh–Manali Highway — high-altitude passes and broken roads.
- Spiti Valley — sub-zero winter mountain crossings.
- Northeast India — a 4,000km cross-border endurance run.
- Kaza to Shimla — 430km Himalayan mountain-pass route, his top video.
- Ganga Expressway, Lucknow drone/local content, Varanasi heritage stays, Lucknow-to-Jaipur and other weekend-getaway road trips.

CORE SKILLS:
1. Video Editing — end-to-end post-production, rhythm-based editing for retention (Premiere Pro, DaVinci Resolve, Final Cut).
2. Colour Grading — cinematic LUT-based grading, node-based correction (DaVinci Resolve).
3. Sound Design — music sync, dialogue cleanup, ambient layering (Adobe Audition).
4. Drone & Multi-Cam — integrating aerial footage into ground-level narratives (DJI workflow).
5. Episodic Storytelling — 5+ years of series editing, narrative arcs, audience retention.
6. Thumbnails & Graphics — thumbnails, lower thirds, motion graphics for YouTube & Shorts (Photoshop, Canva).

BRAND COLLABORATIONS (past clients / niches): Something's Brewing (Coffee & FMCG), Pink Baramda (Hospitality/Airbnb), Nomad Cave (Hospitality/Hostel), Malwa Dhaba (Food & Hospitality), Tata 1mg / Vitonnix (Health & Wellness), Vista Hostel Jeolikote (Hospitality, Nainital).

HOW HE WORKS (5-step pipeline): 1) Brief & Concept, 2) Location Scout (drawing on 500+ prior trips), 3) Shoot (solo-operated multi-cam/drone/action-cam), 4) Edit & Grade (full post pipeline), 5) Deliver & Report (final files + performance report).

COLLABORATION PACKAGES:
- Short-Form Drop: 1 vertical Short/Reel (15-60s), in-frame brand integration, delivered in 5-7 days.
- Episodic Feature: 1 long-form YouTube episode (10-20 min), drone & multi-cam footage, full grade & sound design, custom thumbnail, performance report.
- Sponsored Expedition: multi-episode series (3-5 videos) built around a full trip, Shorts cut from the same shoot, cross-posted to Instagram, full performance report.
- All quotes are custom based on trip length, terrain, and deliverables.

WHO HE WORKS WITH: travel brands, automobile companies, tourism boards, content creators & agencies. Open to short-form (Reels/Shorts) and long-form (YouTube/documentary/corporate) editing. He responds within 24 hours and is ready to start immediately.

CONTACT:
- Email: Siddharthbhalla07@gmail.com
- Phone: +91 80903 98717
- YouTube: @SiDOnWheelsYT
- Instagram: @SidOnWheels
- When someone wants to hire him or get a quote, point them to the contact section (#contact) or these details directly.`;

// Resolves the channel's uploads-playlist ID from its @handle. Cached for a full day
// via Cloudflare's edge cache since a channel ID essentially never changes — this keeps
// the per-request YouTube quota cost down to the two calls below it.
async function getUploadsPlaylistId(apiKey) {
  const url = `${YT_API_BASE}/channels?part=contentDetails&forHandle=${encodeURIComponent(YT_HANDLE)}&key=${apiKey}`;
  const res = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!res.ok) throw new Error(`channels.list failed: ${res.status}`);
  const data = await res.json();
  const uploads = data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("no uploads playlist found for handle");
  return uploads;
}

// Fetches the latest videos (title, publish date) plus their live view counts, and
// formats them into a block the model can quote from for "latest video" / "how many
// views does X have" style questions. Cached at the edge for 30 min, same as stats.json.
async function buildVideoContext(apiKey) {
  const uploadsPlaylistId = await getUploadsPlaylistId(apiKey);

  const itemsUrl = `${YT_API_BASE}/playlistItems?part=snippet&maxResults=${YT_MAX_VIDEOS}&playlistId=${uploadsPlaylistId}&key=${apiKey}`;
  const itemsRes = await fetch(itemsUrl, { cf: { cacheTtl: 1800, cacheEverything: true } });
  if (!itemsRes.ok) throw new Error(`playlistItems.list failed: ${itemsRes.status}`);
  const itemsData = await itemsRes.json();
  const videos = (itemsData.items || [])
    .map((item) => ({
      videoId: item.snippet?.resourceId?.videoId,
      title: item.snippet?.title,
      publishedAt: item.snippet?.publishedAt,
    }))
    .filter((v) => v.videoId && v.title);
  if (videos.length === 0) return null;

  // Pull live view/like counts for those same videos in one batched call.
  const ids = videos.map((v) => v.videoId).join(",");
  const statsUrl = `${YT_API_BASE}/videos?part=statistics&id=${ids}&key=${apiKey}`;
  const statsRes = await fetch(statsUrl, { cf: { cacheTtl: 1800, cacheEverything: true } });
  const statsById = {};
  if (statsRes.ok) {
    const statsData = await statsRes.json();
    for (const item of statsData.items || []) {
      statsById[item.id] = item.statistics;
    }
  }

  const lines = ["", "RECENT VIDEOS (fetched just now from the YouTube Data API — most recent first, use these for questions about specific/latest videos):"];
  videos.forEach((v, i) => {
    const stats = statsById[v.videoId];
    const views = stats?.viewCount ? `${Number(stats.viewCount).toLocaleString("en-IN")} views` : "views unavailable";
    const date = v.publishedAt ? new Date(v.publishedAt).toISOString().slice(0, 10) : "date unknown";
    const tag = i === 0 ? " [LATEST UPLOAD]" : "";
    lines.push(`- "${v.title}" — ${views}, published ${date}${tag}`);
  });

  return lines.join("\n");
}

// Fetches live channel numbers from the same stats.json your GitHub Action already updates
// every 6 hours, and folds them into the system prompt so the bot always cites current numbers.
// Also folds in live per-video data from the YouTube Data API when a key is configured.
async function buildSystemPrompt(env) {
  let prompt = BASE_FACTS;

  try {
    const res = await fetch(STATS_JSON_URL, { cf: { cacheTtl: 1800, cacheEverything: true } });
    if (res.ok) {
      const stats = await res.json();
      const lines = ["", "LIVE CHANNEL STATS (fetched just now from stats.json — use these, they're current):"];
      if (stats.videos != null) lines.push(`- Videos published: ${stats.videos}`);
      if (stats.views != null) lines.push(`- Lifetime views: ${stats.views.toLocaleString("en-IN")}`);
      if (stats.subscribers != null) lines.push(`- Subscribers: ${stats.subscribers.toLocaleString("en-IN")}`);
      if (stats.updatedAt) lines.push(`- Stats last synced: ${stats.updatedAt}`);
      if (lines.length > 2) prompt += "\n" + lines.join("\n");
    }
  } catch {
    // stats.json unreachable — carry on with baseline facts only.
  }

  if (env.YOUTUBE_API_KEY) {
    try {
      const videoBlock = await buildVideoContext(env.YOUTUBE_API_KEY);
      if (videoBlock) prompt += "\n" + videoBlock;
    } catch (err) {
      // YouTube API unreachable, key missing/invalid, or quota exceeded — silently
      // fall back to whatever we already have (baseline facts + channel stats).
      console.error("YouTube API error:", err);
    }
  }

  return prompt;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env) {
    const origin = ALLOWED_ORIGIN;

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const history = Array.isArray(body.messages) ? body.messages.slice(-8) : [];
    if (history.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
      });
    }

    const messages = [{ role: "system", content: await buildSystemPrompt(env) }, ...history];

    // Tried in order — if one is rate-limited (429) or errors, the next one picks up automatically.
    const MODEL_CHAIN = [
      "google/gemma-4-26b-a4b-it:free",
      "nvidia/nemotron-3.5-lightning:free",
      "openai/gpt-oss-20b:free",
      "nvidia/nemotron-3-nano-30b-a3b:free",
    ];

    let lastError = null;

    for (const model of MODEL_CHAIN) {
      try {
        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
            "HTTP-Referer": ALLOWED_ORIGIN,
            "X-Title": "SiD On Wheels Portfolio",
          },
          body: JSON.stringify({ model, messages, max_tokens: 400, temperature: 0.5 }),
        });

        if (!upstream.ok) {
          lastError = { status: upstream.status, detail: await upstream.text() };
          // 429 (rate-limited) or 404 (model unavailable) — try the next model in the chain.
          if (upstream.status === 429 || upstream.status === 404) continue;
          // Any other error (bad key, etc.) — no point trying other models, fail fast.
          return new Response(JSON.stringify({ error: "Upstream error", detail: lastError.detail }), {
            status: upstream.status,
            headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
          });
        }

        const data = await upstream.json();
        const msg = data?.choices?.[0]?.message || {};
        const reply = (msg.content || msg.reasoning || "").trim();

        if (!reply) { lastError = { status: 200, detail: "empty_reply_from_" + model }; continue; }

        return new Response(JSON.stringify({ reply, model_used: model }), {
          headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
        });
      } catch (err) {
        lastError = { status: 500, detail: String(err) };
      }
    }

    // Every model in the chain failed or was rate-limited.
    return new Response(JSON.stringify({ error: "All models unavailable", detail: lastError }), {
      status: 503,
      headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
    });
  },
};
