import type { VercelRequest, VercelResponse } from '@vercel/node';

async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'Gemini API Error');
  }
  return data.candidates[0].content.parts[0].text;
}

async function callOpenAIAPI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'OpenAI API Error');
  }
  return data.choices[0].message.content;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, text, context, apiKey: clientApiKey, provider } = req.body;
  const activeProvider = provider || 'openai';

  // Read backend secret variables if client key is not provided
  const apiKey = clientApiKey && clientApiKey.trim() !== ''
    ? clientApiKey
    : (activeProvider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY);

  if (!apiKey || apiKey.trim() === '') {
    return res.status(400).json({ error: 'API key is not configured on the server. Please enter your key in settings.' });
  }

  const isConversational = !context || !context.includes("highlighting");
  let systemPrompt = '';

  if (isConversational) {
    systemPrompt = `You are KnowledgeCapsule AI, an expert research assistant. You are helping a user read a research paper.
Please answer the user's question directly, accurately, and professionally. Focus on scientific/academic details to help them learn.

User Question: "${text}"`;
  } else {
    systemPrompt = `You are KnowledgeCapsule AI, an expert research assistant. You are helping a user read a research paper.
The user highlighted this text from the paper: "${text}".
${context ? `The context of this annotation is: "${context}"` : ''}

Provide your response in clear markdown format.
Depending on the requested action, do the following:
- Action "explain": Explain this concept in detail with relevant molecular/structural pathways.
- Action "simplify": Explain it using simple analogies for a non-expert.
- Action "summarize": Provide a 2-3 sentence summary.
- Action "flashcards": Output a JSON block containing an array of 2 flashcards. Format exactly: [{"question": "...", "answer": "..."}].
- Action "quiz": Output a JSON block for a multiple choice question. Format exactly: {"question": "...", "options": ["A", "B", "C", "D"], "answerIndex": 0, "explanation": "..."}.
- Action "mnemonic": Generate a creative mnemonic to memorize this concept.
- Action "beginner": Explain it at an introductory high-school level.
- Action "scientific": Provide an extremely rigorous graduate-level molecular mechanism explanation.`;
  }

  try {
    let rawResult = '';
    if (activeProvider === 'gemini') {
      rawResult = await callGeminiAPI(apiKey, systemPrompt);
    } else {
      rawResult = await callOpenAIAPI(apiKey, systemPrompt);
    }

    if (action === 'flashcards') {
      const jsonMatch = rawResult.match(/\[\s*\{[\s\S]*\}\s*\]/);
      const flashcards = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      return res.status(200).json({ text: 'Generated flashcards successfully.', flashcards });
    }

    if (action === 'quiz') {
      const jsonMatch = rawResult.match(/\{\s*"question"[\s\S]*\}/);
      const quiz = jsonMatch ? [JSON.parse(jsonMatch[0])] : [];
      return res.status(200).json({ text: 'Generated quiz question successfully.', quiz });
    }

    return res.status(200).json({ text: rawResult });
  } catch (error: any) {
    console.error('API execution failed:', error);
    return res.status(500).json({ error: error.message || 'API query failed' });
  }
}
