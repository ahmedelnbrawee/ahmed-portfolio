const recentRequests = new Map();
function clientKey(req) {
  return String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const key = clientKey(req);
  const now = Date.now();
  const previous = recentRequests.get(key) || 0;
  if (now - previous < 10000) return res.status(429).json({ error: 'Please wait before sending another inquiry.' });
  recentRequests.set(key, now);

  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
  const contact = typeof body.contact === 'string' ? body.contact.trim().slice(0, 120) : '';
  const message = typeof body.message === 'string' ? body.message.slice(0, 12000) : '';
  if (!name || !contact || !message) return res.status(400).json({ error: 'Name, contact and message are required.' });

  const lines = [
    `Name: ${name}`,
    `Contact: ${contact}`,
    `Service: ${String(body.service || 'General inquiry').slice(0, 300)}`,
    `Estimate: ${String(body.estimate || 'Not provided').slice(0, 200)}`,
    `Source: ${String(body.source || 'Portfolio website').slice(0, 100)}`,
    `Received: ${new Date().toISOString()}`,
    '',
    message
  ];
  const text = lines.join('\n');
  const channels = [];

  if (process.env.RESEND_API_KEY && process.env.LEADS_TO_EMAIL && process.env.LEADS_FROM_EMAIL) {
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.LEADS_FROM_EMAIL,
          to: [process.env.LEADS_TO_EMAIL],
          subject: String(body.subject || `Portfolio inquiry from ${name}`).slice(0, 180),
          text
        })
      });
      if (emailResponse.ok) channels.push('email');
      else console.error('Resend delivery failed:', emailResponse.status);
    } catch (error) { console.error('Resend request failed:', error.message); }
  }

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      const telegramResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: `New portfolio inquiry\n\n${text}`.slice(0, 3900) })
      });
      if (telegramResponse.ok) channels.push('telegram');
      else console.error('Telegram delivery failed:', telegramResponse.status);
    } catch (error) { console.error('Telegram request failed:', error.message); }
  }

  if (!channels.length) return res.status(503).json({ delivered: false, error: 'Lead delivery is not configured. Use the WhatsApp or email link instead.' });
  return res.status(200).json({ delivered: true, channels });
};
