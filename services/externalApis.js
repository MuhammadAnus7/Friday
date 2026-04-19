import nodemailer from 'nodemailer';

const WEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const NEWS_BASE_URL = 'https://newsapi.org/v2/top-headlines';

export async function getCurrentWeatherByCity(city) {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing WEATHER_API_KEY environment variable.');
  }

  const url = `${WEATHER_BASE_URL}?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || 'Failed to fetch weather data.');
  }

  return {
    city: data.name,
    country: data.sys?.country,
    temperatureC: data.main?.temp,
    feelsLikeC: data.main?.feels_like,
    condition: data.weather?.[0]?.description,
    humidity: data.main?.humidity,
    windSpeed: data.wind?.speed
  };
}

export async function getTopHeadlines(country = 'us', category = '') {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing NEWS_API_KEY environment variable.');
  }

  const params = new URLSearchParams({
    apiKey,
    country,
    pageSize: '5'
  });

  if (category) {
    params.set('category', category);
  }

  const response = await fetch(`${NEWS_BASE_URL}?${params.toString()}`);
  const data = await response.json();

  if (!response.ok || data.status !== 'ok') {
    throw new Error(data?.message || 'Failed to fetch news headlines.');
  }

  return {
    country,
    category: category || 'general',
    headlines: (data.articles || []).slice(0, 5).map((article) => ({
      title: article.title,
      source: article.source?.name,
      url: article.url
    }))
  };
}

export async function sendEmail({ to, subject, text }) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    throw new Error('Missing SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM).');
  }

  if (!to || !subject || !text) {
    throw new Error('Email requires to, subject, and text fields.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    text
  });

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected
  };
}
