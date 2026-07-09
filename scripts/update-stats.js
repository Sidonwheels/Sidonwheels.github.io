const fs = require('fs');

const HANDLE = "SiDOnWheelsArmy"; // no @
const API_KEY = process.env.YT_API_KEY;

async function main() {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&forHandle=${HANDLE}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.items || !data.items.length) {
    console.error('No channel found:', JSON.stringify(data));
    process.exit(1);
  }

  const stats = data.items[0].statistics;
  const output = {
    subscribers: Number(stats.subscriberCount),
    views: Number(stats.viewCount),
    videos: Number(stats.videoCount),
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync('stats.json', JSON.stringify(output, null, 2));
  console.log('stats.json updated:', output);
}

main();
