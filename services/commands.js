import { getCurrentWeatherByCity, getTopHeadlines, sendEmail } from './externalApis.js';

export function openYouTube() {
  return {
    reply: 'Opening YouTube: https://www.youtube.com',
    action: { type: 'open_url', url: 'https://www.youtube.com' }
  };
}

export function searchGoogle(query) {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://www.google.com/search?q=${encodedQuery}`;

  return {
    reply: `Searching Google for "${query}": ${url}`,
    action: { type: 'open_url', url }
  };
}

export function getTime() {
  const now = new Date();
  return {
    reply: `Current UTC time is ${now.toISOString()}.`,
    action: { type: 'show_time', value: now.toISOString() }
  };
}

function extractGoogleQuery(message) {
  const match = message.match(/(?:search\s+google\s+for|google)\s+(.+)/i);
  return match?.[1]?.trim() || '';
}

function extractWeatherCity(message) {
  const match = message.match(/weather\s+in\s+(.+)/i);
  return match?.[1]?.trim() || '';
}

function extractEmailParts(message) {
  const match = message.match(/send email to\s+([^\s]+)\s+subject\s+"([^"]+)"\s+body\s+"([^"]+)"/i);

  if (!match) return null;
  return {
    to: match[1].trim(),
    subject: match[2].trim(),
    text: match[3].trim()
  };
}

export function detectCommand(message) {
  const normalized = message.trim().toLowerCase();

  if (/^open\s+youtube$/.test(normalized) || normalized.includes('open youtube')) {
    return { name: 'openYouTube', args: [] };
  }

  if (normalized.startsWith('search google for ') || /^google\s+/.test(normalized)) {
    const query = extractGoogleQuery(message);
    if (query) {
      return { name: 'searchGoogle', args: [query] };
    }
  }

  if (normalized === 'what time is it' || normalized === 'get time' || normalized.includes('current time')) {
    return { name: 'getTime', args: [] };
  }

  if (normalized.includes('weather in ')) {
    const city = extractWeatherCity(message);
    if (city) {
      return { name: 'getWeather', args: [city] };
    }
  }

  if (normalized.includes('top headlines') || normalized === 'news' || normalized.includes('latest news')) {
    return { name: 'getNews', args: [] };
  }

  if (normalized.startsWith('send email')) {
    const emailParts = extractEmailParts(message);
    return { name: 'sendEmailCommand', args: [emailParts] };
  }

  return null;
}

async function getWeather(city) {
  const weather = await getCurrentWeatherByCity(city);

  return {
    reply: `Current weather in ${weather.city}, ${weather.country}: ${weather.temperatureC}°C, ${weather.condition}.`,
    type: 'weather',
    data: weather
  };
}

async function getNews() {
  const news = await getTopHeadlines('us');
  const summary = news.headlines.map((item, index) => `${index + 1}. ${item.title}`).join(' ');

  return {
    reply: `Here are the top headlines: ${summary}`,
    type: 'news',
    data: news
  };
}

async function sendEmailCommand(emailParts) {
  if (!emailParts) {
    return {
      reply:
        'To send an email, use: send email to someone@example.com subject "Your subject" body "Your message"',
      type: 'email_help',
      data: null
    };
  }

  const result = await sendEmail(emailParts);

  return {
    reply: `Email sent successfully to ${emailParts.to}.`,
    type: 'email',
    data: result
  };
}

const commandHandlers = {
  openYouTube,
  searchGoogle,
  getTime,
  getWeather,
  getNews,
  sendEmailCommand
};

export async function executeCommand(command) {
  if (!command || !command.name || !(command.name in commandHandlers)) {
    return null;
  }

  const handler = commandHandlers[command.name];
  return handler(...(command.args || []));
}
