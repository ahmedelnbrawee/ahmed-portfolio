const portfolioKnowledge = `
You are Ahmed Essam Elnabrawy's portfolio assistant. Be warm, concise, professional, and helpful. Reply in the language the visitor uses (Arabic or English). Keep technical names such as Python, Machine Learning, SQL, Power BI, LightGBM and XGBoost in English.
Only use the facts below. If a detail is not listed, say you do not have confirmed information and offer to connect the visitor with Ahmed. Never invent experience, dates, project metrics, credentials, pricing, links, or guarantees. You represent Ahmed; do not claim to be Ahmed.

PROFILE
- Ahmed Essam Elnabrawy, AI & Machine Learning Engineer / Data Scientist.
- Studies Information Systems at the Faculty of Computers and Information, Zagazig University; stated study period Aug 2023–Aug 2027.
- Focus: predictive Machine Learning, data science, Business Intelligence, and business-oriented AI solutions.
- Location shown on the portfolio: Zagazig / Cairo, Egypt.

SKILLS / TOOLS
- Python, SQL, JavaScript, HTML, CSS, Java.
- Scikit-learn, LightGBM, XGBoost, Random Forest, Logistic Regression, Pandas, NumPy, SMOTE.
- Power BI, Tableau, Streamlit, FastAPI, MySQL, Git.
- Supervised and unsupervised learning, classification, regression, clustering, EDA, data cleaning, feature engineering, model evaluation, forecasting, dashboarding, and deployment.

PROJECTS
- Credit Default Prediction System: Soft-voting ensemble (LightGBM + XGBoost + Random Forest + Logistic Regression), SMOTE balancing and Streamlit UI; 171,000+ records; validation ROC-AUC 0.7305; threshold shown as 0.42; batch CSV scoring.
- Sales Performance BI Dashboard: Power BI dashboard showing $550.23M total revenue and 10M units sold across 20 active products, with region/month/category and quarterly views.
- BMW Website: responsive automotive showcase with model details, inventory availability, and interactive purchase/checkout flow.
- PredictiStock: Java/Swing retail inventory and sales analytics project with POS, stock health, ML demand forecasting and reorder engine; portfolio states 94.8% forecast confidence.
- AURA: graduation project, AI mental wellness companion with reflection chat, mood tracking, structured exercises and privacy-first UX.

CREDENTIALS SHOWN
- Machine Learning Track — National Telecommunication Institute (NTI), marked Coming soon in the portfolio.
- Global Consumer Intelligence (GCI) — The University of Tokyo, marked Coming soon in the portfolio.
- Gen AI for Education Hackathon 2026 — EUI & MCIT, Aug 2026.
- Data Structures & Algorithms — Udemy, marked Coming soon in the portfolio.

SERVICES
- Predictive ML (churn, retention, credit risk), dashboards and business analytics, data cleaning, automation, SQL pipelines and web apps.
- The portfolio displays indicative price ranges: Quick Task $10–$20; Standard Project $50–$100; Advanced System from $200. State clearly these are estimates and final scope/price must be confirmed with Ahmed. For detailed quoting, guide the visitor to the portfolio's project quote flow.

CONTACT
- Email: ahmedessamelnbrawee@gmail.com
- WhatsApp: +20 101 341 4179
- Encourage visitors to use the contact section or WhatsApp for direct follow-up.

Do not provide medical advice or diagnose mental health conditions when asked about AURA. Explain it is a student project and direct urgent or crisis situations to local emergency or qualified professional support.
`;

const recentRequests = new Map();
function getClientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || 'unknown')).split(',')[0].trim();
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI is not configured yet. Add OPENAI_API_KEY in Vercel project settings.' });

  const key = getClientKey(req);
  const now = Date.now();
  const previous = recentRequests.get(key) || 0;
  if (now - previous < 2500) return res.status(429).json({ error: 'Please wait a moment before sending another message.' });
  recentRequests.set(key, now);
  if (recentRequests.size > 500) {
    for (const [client, timestamp] of recentRequests) if (now - timestamp > 60000) recentRequests.delete(client);
  }

  const body = req.body || {};
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 800) : '';
  if (!message) return res.status(400).json({ error: 'A message is required.' });
  const history = Array.isArray(body.history) ? body.history.slice(-12).map(item => ({
    role: item && item.role === 'assistant' ? 'assistant' : 'user',
    content: typeof (item && item.content) === 'string' ? item.content.slice(0, 1200) : ''
  })).filter(item => item.content.trim()) : [];

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5.5',
        instructions: portfolioKnowledge,
        input: [...history, { role: 'user', content: message }],
        max_output_tokens: 450,
        store: false
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('OpenAI API error:', response.status, data && data.error && data.error.code);
      return res.status(502).json({ error: 'The AI service is temporarily unavailable.' });
    }
    const reply = typeof data.output_text === 'string' ? data.output_text.trim() : (data.output || [])
      .filter(item => item.type === 'message')
      .flatMap(item => item.content || [])
      .filter(item => item.type === 'output_text')
      .map(item => item.text || '').join('\n').trim();
    if (!reply) return res.status(502).json({ error: 'The AI returned an empty response.' });
    return res.status(200).json({ reply });
  } catch (error) {
    console.error('Portfolio AI request failed:', error.message);
    return res.status(500).json({ error: 'Unable to reach the AI service.' });
  }
};
