export default async function handler(req, res) {
  const { path, bypass, ...queryParams } = req.query;
  
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }
  
  const searchParams = new URLSearchParams(queryParams).toString();
  const url = `https://151.145.89.228.sslip.io/webhook/${path}${searchParams ? `?${searchParams}` : ''}`;
  
  try {
    const options = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const response = await fetch(url, options);
    
    // Parse JSON safely
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      // Not JSON, return text
      return res.status(200).send(text);
    }
    
    // Configure Vercel Edge Cache for GET requests
    if (req.method === 'GET') {
      if (bypass === 'true') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        // Read cache duration from environment variable, default to 60 seconds (1 minute)
        const cacheSeconds = process.env.VITE_CACHE_TTL || process.env.CACHE_TTL || '60';
        res.setHeader('Cache-Control', `s-maxage=${cacheSeconds}, stale-while-revalidate=86400`);
      }
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error proxying to n8n:', error);
    return res.status(500).json({ error: 'Internal Server Error proxying to n8n' });
  }
}
