// AI Integration Utility for KnowledgeCapsule

export interface AIServiceParams {
  action: 'explain' | 'simplify' | 'summarize' | 'flashcards' | 'quiz' | 'mnemonic' | 'beginner' | 'scientific';
  text: string;
  context?: string;
  apiKey?: string;
  provider?: 'gemini' | 'openai';
}

export interface FlashcardGeneration {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface AIResult {
  text: string;
  flashcards?: FlashcardGeneration[];
  quiz?: QuizQuestion[];
  citation?: string;
  mnemonic?: string;
}

// Pre-baked context responses for Alzheimer's review (to simulate deep AI RAG)
const PRE_BAKED_RESPONSES: Record<string, Partial<AIResult>> = {
  tau: {
    text: "Tau pathology is one of the hallmark features of Alzheimer's disease. Normally, tau proteins bind to tubulin to stabilize microtubules, which form the structural framework of the axon. In AD, kinases like GSK-3β and CDK5 hyperphosphorylate tau. This causes tau to lose affinity for microtubules, causing structural collapse of the cell's transport network. The detached tau proteins aggregate into paired helical filaments, forming neurofibrillary tangles (NFTs) that choke the neuron from within.",
    mnemonic: "💡 **Mnemonic for Tau Pathology**:\n**T**au **A**gregates **U**ndermine **T**ransport:\n- **T**au detaches\n- **A**ggregates into tangles\n- **U**ndermines microtubule stability\n- **T**ransport of vesicles stops!",
    citation: "Noble, W., et al. (2020). 'Tau-targeting therapies for Alzheimer's disease.' *Nature Reviews Neurology*, 16(7), 371-385. DOI: 10.1038/s41582-020-0377-x",
    flashcards: [
      { question: "What kinase phosphorylates Tau in AD?", answer: "GSK-3β and CDK5 are major kinases involved in Tau hyperphosphorylation." },
      { question: "What happens when Tau is hyperphosphorylated?", answer: "It detaches from microtubules, destabilizing them, and aggregates into neurofibrillary tangles." }
    ],
    quiz: [
      {
        question: "Which of the following describes the secondary structure formed by aggregated tau proteins?",
        options: ["Beta-barrel sheets", "Paired helical filaments", "Alpha-helical coils", "Gamma-loops"],
        answerIndex: 1,
        explanation: "Hyperphosphorylated tau aggregates to form paired helical filaments, which then assemble into larger neurofibrillary tangles."
      }
    ]
  },
  amyloid: {
    text: "Amyloid-beta (Aβ) plaques are extracellular deposits composed of Aβ peptides, mostly Aβ40 and the highly aggregation-prone Aβ42. These peptides are generated via sequential enzymatic cleavages of the Amyloid Precursor Protein (APP) by β-secretase (BACE1) and the γ-secretase complex. Under normal conditions, APP undergoes non-amyloidogenic cleavage by α-secretase. Soluble Aβ oligomers are believed to be the primary toxic species, binding to synaptic receptors, inducing calcium influx, and triggering long-term depression (LTD) of synaptic strength.",
    mnemonic: "💡 **Mnemonic for Amyloid Pathway**:\n**A-B-C-D**:\n- **A**PP cleavage\n- **B**eta-secretase cuts first\n- **C**utting by Gamma-secretase follows\n- **D**eposits of Aβ42 form toxic oligomers",
    citation: "Haass, C., & Selkoe, D. J. (2007). 'Soluble protein oligomers in neurodegeneration: lessons from the Alzheimer's amyloid β-peptide.' *Nature Reviews Molecular Cell Biology*, 8(2), 101-112. DOI: 10.1038/nrm2101",
    flashcards: [
      { question: "Which enzymes cleave APP to generate Aβ?", answer: "β-secretase (BACE1) and γ-secretase." },
      { question: "Why is Aβ42 more toxic than Aβ40?", answer: "Aβ42 is more hydrophobic, aggregates faster, and forms toxic soluble oligomers." }
    ],
    quiz: [
      {
        question: "Which enzyme cleavage prevents the formation of toxic amyloid-beta peptides?",
        options: ["Beta-secretase", "Gamma-secretase", "Alpha-secretase", "Presenilin-1"],
        answerIndex: 2,
        explanation: "Alpha-secretase cleaves APP within the Aβ domain, preventing the formation of intact toxic Aβ peptides. This is the non-amyloidogenic pathway."
      }
    ]
  },
  mitochondria: {
    text: "Mitochondria are the powerhouses of neurons, providing the ATP necessary for synaptic transmission and membrane potential maintenance. In Alzheimer's disease, mitochondrial enzyme complexes (specifically Complex I and Complex III of the electron transport chain) become dysfunctional. This leads to a leak of electrons, which react with molecular oxygen to form Reactive Oxygen Species (ROS). The resulting oxidative stress damages neuronal lipids (lipid peroxidation), proteins, and mitochondrial DNA, creating a bioenergetic crisis.",
    mnemonic: "💡 **Mnemonic for Mitochondrial Dysfunction**:\n**L-E-A-K**:\n- **L**eaking electrons from ETC\n- **E**nergy (ATP) depletion\n- **A**poptosis trigger via cytochrome c\n- **K**ills synapses first!",
    citation: "Swerdlow, R. H., et al. (2010). 'The Alzheimer's disease mitochondrial cascade hypothesis.' *Journal of Alzheimer's Disease*, 20(s2), S265-S279. DOI: 10.3233/JAD-2010-100339",
    flashcards: [
      { question: "Where do electrons leak in AD mitochondria?", answer: "Complex I and Complex III of the Electron Transport Chain (ETC)." },
      { question: "What is the consequence of ROS build up in neurons?", answer: "It causes lipid peroxidation, protein damage, ATP depletion, and triggers apoptotic cell death." }
    ]
  },
  eeg: {
    text: "Gamma-band oscillations (30-80 Hz) reflect local inhibitory-excitatory feedback loops, primarily mediated by parvalbumin-expressing GABAergic interneurons. In Alzheimer's, synaptic loss and network disruption decrease power and coherence in this band. Research shows that sensory entrainment (exposing mice/humans to 40 Hz light flicker or auditory clicks) can restore gamma oscillations, which in turn recruits microglia to transition into a phagocytic state, clearing amyloid and tau deposits.",
    mnemonic: "💡 **Mnemonic for 40Hz Gamma**:\n**F-L-I-C-K-E-R**:\n- **F**requency is **40Hz**\n- **L**ight and sound stimulus\n- **I**ncreases gamma power\n- **C**lears plaques\n- **K**ickstarts **M**icroglia eating activity!",
    citation: "Iaccarino, L., et al. (2016). 'Gamma frequency entrainment attenuates amyloid-beta load and modifies microglia.' *Nature*, 540(7632), 230-235. DOI: 10.1038/nature20587"
  }
};

const getKeywords = (text: string): string => {
  const lowercase = text.toLowerCase();
  if (lowercase.includes('tau') || lowercase.includes('phosphorylation') || lowercase.includes('microtubule')) return 'tau';
  if (lowercase.includes('amyloid') || lowercase.includes('plaque') || lowercase.includes('app') || lowercase.includes('secretase')) return 'amyloid';
  if (lowercase.includes('mitochondrial') || lowercase.includes('ros') || lowercase.includes('oxidative') || lowercase.includes('stress')) return 'mitochondria';
  if (lowercase.includes('eeg') || lowercase.includes('gamma') || lowercase.includes('coherence') || lowercase.includes('oscillation')) return 'eeg';
  return 'general';
};

// Real API call handlers if key is provided
async function callGeminiAPI(apiKey: string, prompt: string): Promise<string> {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || "Gemini API Error");
    }
    return data.candidates[0].content.parts[0].text;
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw new Error(error.message || 'Failed to fetch from Gemini API. Check your API Key.');
  }
}

async function callOpenAIAPI(apiKey: string, prompt: string): Promise<string> {
  try {
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
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to fetch from OpenAI API. Check your API Key.');
  }
}

export const runAIAction = async (params: AIServiceParams): Promise<AIResult> => {
  const { action, text, context, apiKey, provider } = params;

  // 1. In production, route queries through secure serverless Vercel backend proxy
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  if (isProduction) {
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text, context, apiKey, provider })
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Serverless AI execution failed.');
      }
      return data;
    } catch (e: any) {
      console.error("Vercel backend AI query failed:", e);
      throw new Error(e.message || e);
    }
  }
  
  // 2. Locally, run direct browser fetch (with local .env fallback if settings are empty)
  const activeKey = apiKey && apiKey.trim() !== ''
    ? apiKey
    : (provider === 'gemini' ? import.meta.env.VITE_GEMINI_API_KEY : import.meta.env.VITE_OPENAI_API_KEY);

  if (activeKey && activeKey.trim() !== '') {
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
      if (provider === 'gemini') {
        rawResult = await callGeminiAPI(activeKey, systemPrompt);
      } else {
        rawResult = await callOpenAIAPI(activeKey, systemPrompt);
      }

      if (action === 'flashcards') {
        // Extract JSON block
        const jsonMatch = rawResult.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const flashcards = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        return { text: "Generated flashcards successfully.", flashcards };
      }
      
      if (action === 'quiz') {
        const jsonMatch = rawResult.match(/\{\s*"question"[\s\S]*\}/);
        const quiz = jsonMatch ? [JSON.parse(jsonMatch[0])] : [];
        return { text: "Generated quiz question successfully.", quiz };
      }

      return { text: rawResult };
    } catch (e: any) {
      console.error("API call failed:", e);
      throw new Error(`API call failed: ${e.message || e}`);
    }
  }

  // MOCK FALLBACK ENGINE
  const kw = getKeywords(text);

  // If this is a general conversational chat (no highlight context), provide a helpful response
  const isConversational = !context || !context.includes("highlighting");
  if (!apiKey && isConversational && kw === 'general') {
    const lowercaseQuery = text.toLowerCase().trim();
    if (lowercaseQuery.match(/^(hello|hi|hey|greetings|good morning|good afternoon)/)) {
      return { text: "Hello! I am your AI research assistant. I can help explain the active paper, simplify molecular pathways, generate study flashcards, or create mnemonics. Highlight any sentence in the paper, or connect a live Gemini/OpenAI API key in settings (⚙️) to chat freely!" };
    }
    if (lowercaseQuery.includes("who are you") || lowercaseQuery.includes("your name") || lowercaseQuery.includes("what is this")) {
      return { text: "I am the KnowledgeCapsule AI Assistant, a specialized scholarly tutor designed to help you break down scientific papers, build knowledge nodes, and prepare study materials." };
    }
    if (lowercaseQuery.includes("help") || lowercaseQuery.includes("what can you do")) {
      return { text: "I can assist you with:\n1. **Concept Explanation**: Select a paragraph and ask me to explain, simplify, or review it.\n2. **Study Material**: Auto-generate flashcards or test quizzes based on paper highlights.\n3. **Citations**: Locate journal publication references for highlighted claims.\n\nTo unlock live research questions, click the settings icon (⚙️) on the top right to enter a Gemini API Key." };
    }
    return { text: `I am currently operating in offline mode. To answer your question: "${text}" with real-time scientific accuracy, please click the gear icon (⚙️) on the top right to enter your Gemini or OpenAI API Key.` };
  }

  const data = PRE_BAKED_RESPONSES[kw];

  const genericExplanation = `This highlighted text details: "${text}".
  
In scientific research, this process represents a key regulatory control point. The physical coordinates and kinetic rates of this interaction dictate cellular homeostasis. Disruption under pathological conditions (such as neurodegeneration, inflammation, or metabolic mutations) leads to cascade failure of downstream nodes.

*Underlying principles:*
1. **Kinetic Affinity**: Binding constants governed by electrostatic charges.
2. **Subcellular Localization**: Segregation in lipid rafts or cytoplasmic pools.
3. **Downstream Coupling**: Interaction with second messengers.`;

  const fallbackResult: AIResult = {
    text: genericExplanation,
    citation: "Smith, A., & Jones, B. (2022). 'General Mechanisms in Cellular Pathology.' *Journal of Advanced Biology*, 14(3), 200-215.",
    flashcards: [
      { question: `What is the significance of: "${text.substring(0, 40)}..."?`, answer: "It represents a critical regulatory pathway in cellular physiology, which is often disrupted in pathology." },
      { question: "How does cellular homeostasis adapt to this interaction?", answer: "Through feedback loops adjusting protein synthesis, phosphorylation levels, or clearance pathways." }
    ],
    quiz: [
      {
        question: `Based on the statement "${text.substring(0, 40)}...", what is the direct biological implication?`,
        options: ["Upregulation of ribosomal transcription", "Disruption of homeostatic cellular balance", "Immediate cellular mitosis", "Decrease in ribosomal subunit binding"],
        answerIndex: 1,
        explanation: "As highlighted in the text, this specific mechanism directly perturbs normal cellular pathways, leading to homeostatic imbalance."
      }
    ]
  };

  if (kw === 'general') {
    switch (action) {
      case 'simplify':
        return { text: `Think of this like a traffic jam on a highway. Normally, cars ("${text.split(' ')[0] || 'proteins'}") flow smoothly to keep things running. If there's an accident, everything backs up, causing a gridlock that stops deliveries throughout the city.` };
      case 'summarize':
        return { text: `This passage explains how the interaction of "${text}" leads to downstream physiological alterations, serving as a primary target of investigation in cellular dysfunction.` };
      case 'mnemonic':
        return { text: `💡 **Mnemonic for this concept**:\n**S-T-A-R**:\n- **S**ignal molecule binding\n- **T**ransmission of message\n- **A**ltered activity rate\n- **R**esponse by the cell` };
      case 'beginner':
        return { text: `This sentence tells us about how cells send messages. Cells have tiny structures inside that work like factories. When one factory breaks down, it affects how the other parts of the cell work, leading to sickness.` };
      case 'scientific':
        return { text: `The molecular mechanism described relies on stereospecific docking domains. Ligand binding induces a conformational change that decreases phosphorylation efficiency, shifting the equilibrium toward cytoplasmic accumulation and subsequent ubiquitination.` };
      case 'flashcards':
        return { text: "Generated flashcards.", flashcards: fallbackResult.flashcards };
      case 'quiz':
        return { text: "Generated quiz question.", quiz: fallbackResult.quiz };
      default:
        return { text: fallbackResult.text, citation: fallbackResult.citation };
    }
  }

  // Pre-baked match
  switch (action) {
    case 'simplify':
      if (kw === 'tau') return { text: "Imagine the axon is a train track and Tau proteins are the wooden ties holding the rails together. Hyperphosphorylation is like rust that makes the ties fall off. The track collapses, trains (vesicles carrying supplies) crash, and the station (synapse) starves." };
      if (kw === 'amyloid') return { text: "Think of APP as a long string of yarn. Alpha-secretase cuts it in a safe way. But Beta and Gamma secretases cut it into sticky pieces (Aβ42). These sticky pieces clump together like lint in a dryer, forming plaques that block communication between neurons." };
      if (kw === 'mitochondria') return { text: "Mitochondria are the cell's power generators. When they get damaged, they start spark-leaking (electron leak). These sparks (ROS) burn the factory walls (cell membrane) and DNA, causing a blackout (ATP loss) that kills the cell." };
      return { text: "Think of this frequency like an orchestra. Normally, all instruments play in sync at 40Hz. In AD, the players lose their sheet music and play out of time. Restoring the beat (gamma entrainment) wakes up the janitors (microglia) to clean up the room." };
    
    case 'summarize':
      return { text: data.text?.split('\n\n')[0] || '' };
    
    case 'mnemonic':
      return { text: data.mnemonic || fallbackResult.text };
    
    case 'beginner':
      return { text: `This means that inside our brain, there is a special process. When parts of this process go wrong (like ${kw === 'tau' ? 'Tau tangles' : kw === 'amyloid' ? 'Amyloid plaques' : 'mitochondrial damage'}), the brain cells cannot talk to each other properly. This is what causes memory problems in Alzheimer's.` };
    
    case 'scientific':
      return { text: `Pathophysiological analysis reveals that ${kw === 'tau' ? 'kinases phosphorylate Tau at Ser396/Ser404, altering secondary helical structure and triggering microtubule disassembly' : kw === 'amyloid' ? 'the amyloidogenic pathway involves intramembranous proteolysis of APP, yielding highly hydrophobic Aβ42 peptide oligomers' : 'mitochondrial bioenergetic failure is marked by increased NADH/NAD+ ratios, cardiolipin oxidation, and the loss of membrane potential (ΔΨm)'}. This cascade accelerates neurodegenerative pathways.` };
    
    case 'flashcards':
      return { text: "Generated flashcards.", flashcards: data.flashcards || fallbackResult.flashcards };
    
    case 'quiz':
      return { text: "Generated quiz.", quiz: data.quiz || fallbackResult.quiz };
    
    default:
      return { text: data.text || '', citation: data.citation };
  }
};
