import { getCurrentWeatherByCity, sendEmail } from './externalApis.js';

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'get_weather',
    description: 'Get current weather details for a city.',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'City name, e.g. Lahore'
        }
      },
      required: ['city'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'search_web',
    description: 'Create a Google search URL for a user query.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query text'
        }
      },
      required: ['query'],
      additionalProperties: false
    }
  },
  {
    type: 'function',
    name: 'send_email',
    description: 'Send an email using configured SMTP credentials.',
    parameters: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body text' }
      },
      required: ['to', 'subject', 'body'],
      additionalProperties: false
    }
  }
];

async function searchWeb({ query }) {
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return {
    query,
    url
  };
}

async function sendEmailTool({ to, subject, body }) {
  const result = await sendEmail({ to, subject, text: body });
  return {
    to,
    subject,
    ...result
  };
}

const TOOL_EXECUTORS = {
  get_weather: async ({ city }) => getCurrentWeatherByCity(city),
  search_web: searchWeb,
  send_email: sendEmailTool
};

export async function executeTool(name, args) {
  const executor = TOOL_EXECUTORS[name];
  if (!executor) {
    throw new Error(`Unsupported tool: ${name}`);
  }

  return executor(args || {});
}
