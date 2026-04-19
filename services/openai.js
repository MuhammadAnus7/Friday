import OpenAI from 'openai';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';

const groqApiKey = process.env.GROQ_API_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY;

const isGroqMode = Boolean(groqApiKey);
const apiKey = groqApiKey || openAiApiKey;

if (!apiKey) {
  console.warn('No API key found. Set GROQ_API_KEY or OPENAI_API_KEY.');
}

const client = new OpenAI({
  apiKey,
  baseURL: isGroqMode ? 'https://api.groq.com/openai/v1' : undefined
});

const MODEL = isGroqMode
  ? process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  : process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const MAX_TOOL_ROUNDS = 5;

function toChatToolSchema(definition) {
  return {
    type: 'function',
    function: {
      name: definition.name,
      description: definition.description,
      parameters: definition.parameters
    }
  };
}

function buildContextMessages(history = []) {
  return history
    .filter((item) => item?.role && item?.content)
    .map((item) => ({
      role: item.role,
      content: item.content
    }));
}

export async function generateAssistantReply(message, history = []) {
  if (!apiKey) {
    throw new Error('Missing API key. Set GROQ_API_KEY or OPENAI_API_KEY environment variable.');
  }

  const tools = TOOL_DEFINITIONS.map(toChatToolSchema);
  const messages = [
    {
      role: 'system',
      content:
        'You are a helpful personal assistant. Use tools when needed for weather, web search links, or sending emails. Ask follow-up questions if required tool arguments are missing.'
    },
    ...buildContextMessages(history),
    { role: 'user', content: message }
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: 'auto'
    });

    const assistantMessage = completion.choices?.[0]?.message;
    if (!assistantMessage) {
      return 'I was unable to generate a reply.';
    }

    messages.push(assistantMessage);

    if (!assistantMessage.tool_calls?.length) {
      return assistantMessage.content?.trim() || 'I was unable to generate a reply.';
    }

    for (const toolCall of assistantMessage.tool_calls) {
      let output;
      try {
        const parsedArgs = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
        const result = await executeTool(toolCall.function.name, parsedArgs);
        output = JSON.stringify({ ok: true, result });
      } catch (error) {
        output = JSON.stringify({ ok: false, error: error.message });
      }

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: output
      });
    }
  }

  return 'I could not complete the request after multiple tool attempts.';
}
