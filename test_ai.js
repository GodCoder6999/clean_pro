

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const TOOLS = [
  { name: 'get_services', desc: 'Get all available cleaning services with prices and duration', params: {}, roles: ['customer','worker','admin'] },
  { name: 'create_booking', desc: 'Create a new cleaning service booking. Requires service_id, date, time, address.', params: {
    service_id: { type: 'integer', description: 'Service ID to book' },
    worker_id: { type: 'integer', description: 'Optional worker ID to assign' },
    scheduled_date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
    scheduled_time: { type: 'string', description: 'Time in HH:MM 24h format' },
    address: { type: 'string', description: 'Service address' },
    notes: { type: 'string', description: 'Special instructions' }
  }, req: ['service_id','scheduled_date','scheduled_time','address'], roles: ['customer'] }
];

const tools = TOOLS.map(t => ({
  type: 'function',
  function: {
    name: t.name, description: t.desc,
    parameters: { type: 'object', properties: t.params || {}, required: t.req || [] }
  }
}));

async function test() {
  const msgs = [
    { role: 'system', content: 'You are CleanerPro AI...' },
    { role: 'assistant', content: 'Here are the available cleaning services:\n1. Standard House Cleaning\n2. Deep Cleaning\nWhich service would you like to book?' },
    { role: 'user', content: '1' }
  ];

  const body = { model: GROQ_MODEL, messages: msgs, temperature: 0.7, max_tokens: 1024, tools, tool_choice: 'auto' };

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
