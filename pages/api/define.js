export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word } = req.body;
  if (!word) return res.status(400).json({ error: 'No word provided' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'API key not configured' });

  const systemPrompt = `You are a super fun, friendly teacher explaining English words to a 10-year-old Telugu-speaking student.
Always explain in TWO languages:
1. English: Simple, short, fun — like talking to a 10-year-old. Use a relatable real-life example. 2-3 sentences max.
2. Telugu: Same explanation in Telugu — easy, friendly, with the real-life example too.

Reply ONLY with raw JSON (no markdown, no code fences):
{"word":"...","english":"...","telugu":"...","synonyms":["...","...","..."]}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Explain the word: "${word}"` }
        ],
        temperature: 0.5,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Groq error: ' + err });
    }

    const data = await response.json();
    const raw = data.choices[0].message.content.trim().replace(/```json|```/g, '').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Bad response from AI' });

    const result = JSON.parse(match[0]);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

