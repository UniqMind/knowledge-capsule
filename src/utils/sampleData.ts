import { PDFDocumentInfo, KnowledgeCapsuleItem, KnowledgeGraphConnection, DailyActivity, storage } from './storage';

export const SAMPLE_PDF_ID = 'sample-alzheimers';

export const samplePDF: PDFDocumentInfo = {
  id: SAMPLE_PDF_ID,
  name: 'Alzheimers_Pathology_Review.pdf',
  size: 2516582, // 2.4 MB
  uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
  totalPages: 4,
  lastOpened: new Date().toISOString(),
  progress: 75,
  pagesRead: [1, 2, 3],
  bookmarks: [1, 3],
  toc: [
    { title: "1. Abstract & Introduction", page: 1 },
    { title: "2. The Role of Tau Hyperphosphorylation", page: 1 },
    { title: "3. Amyloid-Beta Accumulation & Synaptic Toxicity", page: 2 },
    { title: "4. Mitochondrial Dysfunction & Oxidative Stress", page: 3 },
    { title: "5. Clinical Diagnostic Biomarkers", page: 4 }
  ]
};

export const sampleCapsules: KnowledgeCapsuleItem[] = [
  {
    id: 'capsule-1',
    pdfId: SAMPLE_PDF_ID,
    pageNumber: 1,
    label: 'Tau',
    number: 1,
    highlightText: 'Tau hyperphosphorylation destabilizes microtubules, disrupting axonal transport.',
    highlightRects: [{ x: 50, y: 120, width: 450, height: 18 }],
    progressStatus: 'learning',
    colorCategory: 'yellow',
    notes: '### Tau Protein & Microtubule Stability\n\nTau is a microtubule-associated protein (MAP) primarily expressed in neurons. Its main function is to stabilize axon microtubules, which act as "tracks" for cellular transport.\n\nWhen Tau is **hyperphosphorylated**, it changes shape, detaches from microtubules, and self-assembles into **neurofibrillary tangles (NFTs)**.\n\n#### Key Kinases involved:\n1. **GSK-3β** (Glycogen Synthase Kinase 3 Beta)\n2. **CDK5** (Cyclin-Dependent Kinase 5)',
    personalUnderstanding: 'If Tau detaches, the microtubule tracks collapse. This is why transport of critical vesicles and mitochondria to the synapses fails, leading to synaptic starvation.',
    versionHistory: [
      {
        version: 1,
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'I know Tau aggregates in AD, but how does it lead to cell death? Need to research the connection to axonal transport.',
        status: 'not-started'
      },
      {
        version: 2,
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Discovered that phosphorylation causes detaching from microtubules, leading to cytoskeleton collapse.',
        status: 'learning'
      }
    ],
    flashcards: [
      {
        id: 'fc-1-1',
        question: 'What is the primary function of normal, healthy Tau protein?',
        answer: 'To bind and stabilize microtubules in neuronal axons, maintaining structural integrity.',
        mastered: false
      },
      {
        id: 'fc-1-2',
        question: 'Which main kinases are responsible for Tau hyperphosphorylation?',
        answer: 'GSK-3β (Glycogen Synthase Kinase 3 Beta) and CDK5.',
        mastered: true
      }
    ],
    references: [
      {
        doi: '10.1038/s41582-020-0377-x',
        citation: 'Noble et al., Nature Reviews Neurology (2020) - Tau targeting therapies.',
        url: 'https://doi.org/10.1038/s41582-020-0377-x'
      }
    ],
    latexEquations: [
      '\\text{Tau-P} + \\text{Microtubule} \\rightleftharpoons \\text{Disrupt-Axon}'
    ],
    codeSnippets: [],
    tags: ['Cytoskeleton', 'Tangles', 'Kinases']
  },
  {
    id: 'capsule-2',
    pdfId: SAMPLE_PDF_ID,
    pageNumber: 2,
    label: 'Amyloid',
    number: 2,
    highlightText: 'Amyloid-beta plaques accumulate extracellularly, inducing synaptic depression.',
    highlightRects: [{ x: 50, y: 160, width: 440, height: 18 }],
    progressStatus: 'understood',
    colorCategory: 'blue',
    notes: '### Amyloid Cascade Hypothesis\n\nAmyloid-beta (Aβ) peptides are created by the sequential cleavage of **Amyloid Precursor Protein (APP)**:\n- First by **β-secretase** (BACE1)\n- Then by **γ-secretase** (a multi-subunit complex containing Presenilin-1)\n\nThe Aβ42 isoform is highly hydrophobic and prone to oligomerization, forming diffuse and dense plaques in the extracellular space.',
    personalUnderstanding: 'Aβ oligomers are actually more toxic than the large plaques themselves. They bind to synaptic receptors (like NMDA receptors) and trigger Long-Term Depression (LTD), washing out memory pathways.',
    versionHistory: [
      {
        version: 1,
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Aβ plaques block synapses. Is it plaques or soluble oligomers that cause the main issues?',
        status: 'learning'
      },
      {
        version: 2,
        timestamp: new Date().toISOString(),
        notes: 'Confirmed: Soluble oligomers bind to NMDA receptors, causing synaptic depression.',
        status: 'understood'
      }
    ],
    flashcards: [
      {
        id: 'fc-2-1',
        question: 'Which specific Aβ peptide length is most prone to aggregation?',
        answer: 'Aβ42 (42 amino acids long) is highly aggregation-prone.',
        mastered: true
      }
    ],
    references: [
      {
        doi: '10.1126/science.1124639',
        citation: 'Haass & Selkoe, Nature Reviews Molecular Cell Biology (2007) - Soluble oligomers.',
        url: 'https://www.nature.com/articles/nrm2101'
      }
    ],
    latexEquations: [
      '\\text{APP} \\xrightarrow{\\beta,\\gamma} \\text{A}\\beta_{42} \\rightarrow \\text{Oligomers} \\rightarrow \\text{Plaques}'
    ],
    codeSnippets: [],
    tags: ['Plaques', 'APP', 'Secretase']
  },
  {
    id: 'capsule-3',
    pdfId: SAMPLE_PDF_ID,
    pageNumber: 3,
    label: 'Oxidative Stress',
    number: 3,
    highlightText: 'Mitochondrial dysfunction leads to the overproduction of reactive oxygen species (ROS), causing oxidative damage.',
    highlightRects: [{ x: 50, y: 200, width: 480, height: 18 }],
    progressStatus: 'partial',
    colorCategory: 'orange',
    notes: '### Mitochondrial Dysfunction in AD\n\nNeurons depend heavily on ATP generated by oxidative phosphorylation. In AD, mitochondria leak electrons from the **Electron Transport Chain (ETC)**, particularly at Complexes I and III, leading to:\n\n- Overproduction of superoxide anions ($O_2^{\\bullet-}$)\n- Lipid peroxidation of neuronal membranes\n- Decreased ATP synthesis\n- Opening of the mitochondrial permeability transition pore (mPTP), triggering apoptosis.',
    personalUnderstanding: 'ROS damages local DNA and proteins, which further weakens Tau and amyloid clearance mechanisms, creating a vicious positive feedback loop.',
    versionHistory: [
      {
        version: 1,
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Learning about ROS generation and lipid peroxidation.',
        status: 'partial'
      }
    ],
    flashcards: [
      {
        id: 'fc-3-1',
        question: 'Which complexes in the ETC are main sources of electron leaks forming ROS?',
        answer: 'Complex I (NADH dehydrogenase) and Complex III (Coenzyme Q - cytochrome c reductase).',
        mastered: false
      }
    ],
    references: [],
    latexEquations: [
      'O_2 + e^- \\rightarrow O_2^{\\bullet-}',
      '2O_2^{\\bullet-} + 2H^+ \\xrightarrow{\\text{SOD}} H_2O_2 + O_2'
    ],
    codeSnippets: [],
    tags: ['Mitochondria', 'ROS', 'Metabolism']
  },
  {
    id: 'capsule-4',
    pdfId: SAMPLE_PDF_ID,
    pageNumber: 4,
    label: 'EEG Coherence',
    number: 4,
    highlightText: 'Electroencephalography (EEG) shows decreased coherence in the gamma band.',
    highlightRects: [{ x: 50, y: 240, width: 430, height: 18 }],
    progressStatus: 'not-started',
    colorCategory: 'red',
    notes: '### Gamma Oscillations and Cognitive Function\n\nGamma frequency band (typically 30–80 Hz) oscillations are associated with cognitive tasks, sensory processing, and memory retrieval.\n\nIn Alzheimer\'s disease, network decoupling (due to synaptic loss) leads to a reduction in **gamma-band power and phase coherence** between distant cortical regions.\n\nStudies suggest restoring gamma oscillations (e.g., using 40Hz light/sound stimulation) might activate microglia to clear amyloid.',
    personalUnderstanding: 'I need to research the 40Hz sensory entrainment trials. Does it actually work in humans?',
    versionHistory: [
      {
        version: 1,
        timestamp: new Date().toISOString(),
        notes: 'Just added this capsule. Needs detailed literature review of gamma entrainment.',
        status: 'not-started'
      }
    ],
    flashcards: [],
    references: [
      {
        doi: '10.1038/nature20587',
        citation: 'Iaccarino et al., Nature (2016) - Gamma frequency entrainment clears amyloid.',
        url: 'https://doi.org/10.1038/nature20587'
      }
    ],
    latexEquations: [
      'f = 40\\text{ Hz}'
    ],
    codeSnippets: [],
    tags: ['EEG', 'Gamma-Oscillations', 'Diagnostics']
  }
];

export const sampleConnections: KnowledgeGraphConnection[] = [
  {
    id: 'conn-1',
    sourceId: 'capsule-2', // Amyloid
    targetId: 'capsule-1', // Tau
    type: 'triggers'
  },
  {
    id: 'conn-2',
    sourceId: 'capsule-1', // Tau
    targetId: 'capsule-3', // Oxidative Stress
    type: 'worsens'
  },
  {
    id: 'conn-3',
    sourceId: 'capsule-3', // Oxidative Stress
    targetId: 'capsule-2', // Amyloid
    type: 'promotes'
  },
  {
    id: 'conn-4',
    sourceId: 'capsule-1', // Tau
    targetId: 'capsule-4', // EEG Coherence
    type: 'reduces'
  }
];

export const sampleActivity: DailyActivity[] = [
  { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], minutes: 25, capsulesCreated: 1 },
  { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], minutes: 40, capsulesCreated: 1 },
  { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], minutes: 15, capsulesCreated: 0 },
  { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], minutes: 55, capsulesCreated: 1 },
  { date: new Date().toISOString().split('T')[0], minutes: 12, capsulesCreated: 1 }
];

export const initSeedData = () => {
  if (storage.getPDFList().length === 0) {
    storage.savePDFList([samplePDF]);
    storage.saveCapsules(sampleCapsules);
    storage.saveConnections(sampleConnections);
    storage.saveActivity(sampleActivity);
  }
};
