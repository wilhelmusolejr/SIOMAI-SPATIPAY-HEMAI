import express from 'express';
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const app = express();
const port = process.env.PORT || 3001;

const userAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0';

let cookieHeader = process.env.SERVICE_TOKEN
  ? `serviceToken=${process.env.SERVICE_TOKEN}`
  : '';

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function updateCookies(response) {
  const setCookie = response.headers.get('set-cookie');
  if (!setCookie) {
    return;
  }

  const nextCookies = setCookie
    .split(/,(?=\s*[^;=]+=[^;]+)/)
    .map((cookie) => cookie.split(';')[0].trim())
    .filter(Boolean);

  if (nextCookies.length > 0) {
    cookieHeader = nextCookies.join('; ');
  }
}

async function callUpstream(url) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: '*/*',
      'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
      origin: 'https://www.mi.com',
      referer: 'https://www.mi.com/ph/imei-redemption/',
      'user-agent': userAgent,
      ...(cookieHeader ? { cookie: cookieHeader } : {})
    }
  });

  updateCookies(response);

  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    text
  };
}

app.post('/api/send-code', async (req, res) => {
  const email = String(req.body.email || '').trim();

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid Email' });
  }

  try {
    const url = new URL('https://hd.c.mi.com/ph/eventapi/api/imeiexchange/sendcode');
    url.searchParams.set('from', 'pc');
    url.searchParams.set('email', email);
    url.searchParams.set('tel', '');

    const result = await callUpstream(url);
    return res.status(result.ok ? 200 : result.status).send(result.text);
  } catch (error) {
    return res.status(502).json({ message: 'Unable to send code', detail: error.message });
  }
});

app.post('/api/verify-code', async (req, res) => {
  const email = String(req.body.email || '').trim();
  const imei = String(req.body.imei || '').trim();
  const code = String(req.body.code || '').trim();

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid Email' });
  }

  if (!/^[0-9]{15}$/.test(imei)) {
    return res.status(400).json({ message: 'Invalid IMEI' });
  }

  if (code.length < 4) {
    return res.status(400).json({ message: 'Please enter a valid verification code' });
  }

  try {
    const url = new URL('https://hd.c.mi.com/ph/eventapi/api/imeiexchange/getactinfo');
    url.searchParams.set('from', 'pc');
    url.searchParams.set('imei', imei);
    url.searchParams.set('email', email);
    url.searchParams.set('tel', '');
    url.searchParams.set('captchaCode', code);

    const result = await callUpstream(url);
    const body = result.text.includes('44000')
      ? 'No activity found, please make sure the IMEI number is correct!'
      : result.text;

    return res.status(result.ok ? 200 : result.status).send(body);
  } catch (error) {
    return res.status(502).json({ message: 'Unable to verify code', detail: error.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(rootDir, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(rootDir, 'dist', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
