
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const tools = [ { type: 'function', function: { name: 'get_services', description: 'desc', parameters: { type: 'object', properties: {} } } } ];

async function test() {
  const msgs = [
    { role: 'system', content: 'You are CleanerPro AI...' },
    { role: 'assistant', content: 'Here are the available cleaning services:\n1. Standard House Cleaning\n2. Deep Cleaning\nWhich service would you like to book?' },
    { role: 'user', content: '1' },
    { role: 'assistant', tool_calls: [{ id: 'call_123', type: 'function', function: { name: 'get_services', arguments: '{}' } }] },
    { role: 'tool', tool_call_id: 'call_123', content: '[{"id":1,"name":"Standard"}]' }
  ];

  const body = { model: GROQ_MODEL, messages: msgs, temperature: 0.7, max_tokens: 1024, tools, tool_choice: 'auto' };

  try {
    const fetch = require('node-fetch'); // we'll use global fetch via node 20
  } catch (e) {}

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      console.log('Error status:', res.status);
      console.log('Error body:', await res.text());
    } else {
      const data = await res.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Network err:', e);
  }
}
test();
