import OpenAI from 'openai';
import { TOOL_DEFINITIONS, executeTool } from './tools.js';

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('OPENAI_API_KEY is not set. /chat requests will fail until configured.');
}

const client = new OpenAI({ apiKey });
const MAX_TOOL_ROUNDS = 5;

function buildContextMessages(history = []) {
  return history
    .filter((item) => item?.role && item?.content)
    .map((item) => ({
      role: item.role,
      content: item.content
    }));
}

function extractFunctionCalls(response) {
  return (response.output || []).filter((item) => item.type === 'function_call');
}

export async function generateAssistantReply(message, history = []) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY environment variable.');
  }

  const contextMessages = buildContextMessages(history);

  let response = await client.responses.create({
    model: 'gpt-4.1-mini',
    tools: TOOL_DEFINITIONS,
    input: [
      {
        role: 'system',
        content:
          'You are a helpful personal assistant. Use tools when needed for weather, web search links, or sending emails. Ask follow-up questions if required tool arguments are missing.'
      },
      ...contextMessages,
      {
        role: 'user',
        content: message
      }
    ]
  });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const functionCalls = extractFunctionCalls(response);
    if (!functionCalls.length) {
      break;
    }

    const toolOutputs = await Promise.all(
      functionCalls.map(async (call) => {
        try {
          const args = call.arguments ? JSON.parse(call.arguments) : {};
          const result = await executeTool(call.name, args);

          return {
            type: 'function_call_output',
            call_id: call.call_id,
            output: JSON.stringify({ ok: true, result })
          };
        } catch (error) {
          return {
            type: 'function_call_output',
            call_id: call.call_id,
            output: JSON.stringify({ ok: false, error: error.message })
          };
        }
      })
    );

    response = await client.responses.create({
      model: 'gpt-4.1-mini',
      tools: TOOL_DEFINITIONS,
      previous_response_id: response.id,
      input: toolOutputs
    });
  }

  return response.output_text?.trim() || 'I was unable to generate a reply.';
}
