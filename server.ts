import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import { db } from './src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
try { await fs.mkdir(uploadDir, { recursive: true }); } catch (_) {}

const PORT = 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'paroisse-secure-secret-key-2026';

type RouteHandler = (req: IncomingMessage, res: ServerResponse, params: Record<string, string>, body?: any) => void | Promise<void>;

function parseCookies(req: IncomingMessage) {
  const cookie = req.headers.cookie;
  if (!cookie) return {};
  return Object.fromEntries(cookie.split(';').map(c => c.trim().split('=').map(decodeURIComponent)));
}

function parseQuery(url: string) {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  return Object.fromEntries(new URLSearchParams(url.slice(idx + 1)));
}

function parsePath(url: string) {
  const idx = url.indexOf('?');
  return idx === -1 ? url : url.slice(0, idx);
}

function matchRoute(pattern: string, pathname: string): Record<string, string> | null {
  const patternParts = pattern.split('/');
  const pathParts = pathname.split('/');
  if (patternParts.length !== pathParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

async function parseMultipart(req: IncomingMessage): Promise<{ fields: Record<string, string>, files: Record<string, { filename: string, data: Buffer, mimeType: string }[]> }> {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) return { fields: {}, files: {} };
  const boundary = boundaryMatch[1] || boundaryMatch[2];

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);

  const parts = splitMultipart(raw, boundary);
  const fields: Record<string, string> = {};
  const files: Record<string, { filename: string, data: Buffer, mimeType: string }[]> = {};

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headerRaw = part.subarray(0, headerEnd).toString();
    const body = part.subarray(headerEnd + 4, part.length - 2);

    const nameMatch = headerRaw.match(/name="([^"]*)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    const filenameMatch = headerRaw.match(/filename="([^"]*)"/);
    if (filenameMatch) {
      const mimeMatch = headerRaw.match(/Content-Type:\s*(\S+)/i);
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      if (!files[name]) files[name] = [];
      files[name].push({ filename: filenameMatch[1], data: Buffer.from(body), mimeType });
    } else {
      fields[name] = body.toString();
    }
  }
  return { fields, files };
}

function splitMultipart(raw: Buffer, boundary: string): Buffer[] {
  const delimiter = Buffer.from(`--${boundary}`);
  const parts: Buffer[] = [];
  let start = 0;
  while (start < raw.length) {
    const idx = raw.indexOf(delimiter, start);
    if (idx === -1) break;
    const end = raw.indexOf(Buffer.from(`\r\n`), idx + delimiter.length);
    const afterDelim = raw.subarray(idx + delimiter.length, end === -1 ? undefined : end);
    const isEnd = afterDelim.toString().includes('--');
    if (idx > start) {
      parts.push(raw.subarray(start, idx));
    }
    if (isEnd) break;
    start = (end === -1 ? idx + delimiter.length : end + 2);
  }
  return parts;
}

function sendJSON(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function setCORS(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
}

interface Route {
  method: string;
  pattern: string;
  handler: RouteHandler;
}

class Router {
  routes: Route[] = [];

  get(pattern: string, handler: RouteHandler) {
    this.routes.push({ method: 'GET', pattern, handler });
  }

  post(pattern: string, handler: RouteHandler) {
    this.routes.push({ method: 'POST', pattern, handler });
  }

  put(pattern: string, handler: RouteHandler) {
    this.routes.push({ method: 'PUT', pattern, handler });
  }

  delete(pattern: string, handler: RouteHandler) {
    this.routes.push({ method: 'DELETE', pattern, handler });
  }

  async handle(req: IncomingMessage, res: ServerResponse) {
    setCORS(req, res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const pathname = parsePath(req.url || '/');
    const query = parseQuery(req.url || '/');
    const method = req.method || 'GET';

    for (const route of this.routes) {
      if (route.method !== method) continue;
      const params = matchRoute(route.pattern, pathname);
      if (params) {
        const ct = req.headers['content-type'] || '';
        let body: any = undefined;
        if (ct.includes('multipart/form-data')) {
          const multipart = await parseMultipart(req);
          body = { ...multipart.fields };
          (body as any).__files = multipart.files;
        } else if (ct.includes('application/json')) {
          const raw = await readBody(req);
          try { body = JSON.parse(raw); } catch { body = {}; }
        } else if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
          const raw = await readBody(req);
          if (raw) {
            try { body = JSON.parse(raw); } catch { body = raw; }
          }
        }
        (body as any) ||= {};
        (body as any).__query = query;
        return route.handler(req, res, params, body);
      }
    }

    sendJSON(res, 404, { error: 'Not found' });
  }
}

const router = new Router();

const authenticateToken = (req: IncomingMessage, res: ServerResponse): any => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) { sendJSON(res, 401, { error: 'Token missing' }); return null; }
  try {
    const user = jwt.verify(token, JWT_SECRET);
    return user;
  } catch {
    sendJSON(res, 403, { error: 'Invalid token' });
    return null;
  }
};

const isAdmin = (user: any, res: ServerResponse): boolean => {
  if (user && user.role === 'admin') return true;
  sendJSON(res, 403, { error: 'Access denied: Admins only' });
  return false;
};

// Auth Routes
router.post('/api/auth/register', async (req, res, params, body) => {
  const { name, email, password, role } = body;
  try {
    const existing = await db.findOne('users', { email });
    if (existing) return sendJSON(res, 400, { error: 'Email already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db.insert('users', { name, email, password: hashedPassword, role: role || 'catechist' });
    sendJSON(res, 201, { id: user.id, name, email, role: user.role });
  } catch {
    sendJSON(res, 400, { error: 'Error creating user' });
  }
});

router.post('/api/auth/login', async (req, res, params, body) => {
  const { email, password } = body;
  const user = await db.findOne('users', { email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return sendJSON(res, 401, { error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
  sendJSON(res, 200, { token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
});

router.get('/api/auth/me', async (req, res) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const user = await db.findOne('users', { id: userData.id });
  if (!user) return sendJSON(res, 404, { error: 'User not found' });
  sendJSON(res, 200, { id: user.id, name: user.name, email: user.email, role: user.role });
});

router.put('/api/auth/profile', async (req, res, params, body) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const { name, email, current_password, new_password } = body;
  const user = await db.findOne('users', { id: userData.id });
  if (!user) return sendJSON(res, 404, { error: 'User not found' });
  if (new_password) {
    if (!current_password) return sendJSON(res, 400, { error: 'Current password is required' });
    const isValid = await bcrypt.compare(current_password, user.password);
    if (!isValid) return sendJSON(res, 400, { error: 'Current password is incorrect' });
  }
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (new_password) updates.password = await bcrypt.hash(new_password, 10);
  const updated = await db.update('users', user.id, updates);
  sendJSON(res, 200, { id: updated.id, name: updated.name, email: updated.email, role: updated.role });
});

// Catechumens Routes
router.get('/api/catechumens', async (req, res) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const list = await db.findMany('catechumens');
  sendJSON(res, 200, list);
});

router.post('/api/catechumens', async (req, res, params, body) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const files = body.__files || {};
  let photo_url = body.photo_url;
  let birth_certificate_url = body.birth_certificate_url;
  if (files.photo?.[0]) {
    const ext = path.extname(files.photo[0].filename) || '.jpg';
    const filename = `${Date.now()}-${nanoid(8)}${ext}`;
    await fs.writeFile(path.join(uploadDir, filename), files.photo[0].data);
    photo_url = `/storage/uploads/${filename}`;
  }
  if (files.birth_certificate?.[0]) {
    const ext = path.extname(files.birth_certificate[0].filename) || '.jpg';
    const filename = `${Date.now()}-${nanoid(8)}${ext}`;
    await fs.writeFile(path.join(uploadDir, filename), files.birth_certificate[0].data);
    birth_certificate_url = `/storage/uploads/${filename}`;
  }
  const result = await db.insert('catechumens', {
    first_name: body.first_name, last_name: body.last_name,
    dob: body.dob, gender: body.gender,
    address: body.address, phone: body.phone, email: body.email,
    photo_url, birth_certificate_url,
    parent_name: body.parent_name, parent_phone: body.parent_phone,
    year: body.year, niveau_scolaire: body.niveau_scolaire,
    baptise: body.baptise === 'true', quartier_ceb: body.quartier_ceb,
    mouvement: body.mouvement, anciennete: body.anciennete === 'true'
  });
  sendJSON(res, 201, result);
});

router.get('/api/catechumens/:id', async (req, res, params) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const catechumen = await db.findOne('catechumens', { id: params.id });
  if (!catechumen) return sendJSON(res, 404, { error: 'Not found' });
  const sacraments = await db.findMany('sacraments', { catechumen_id: params.id });
  const reportCards = await db.findMany('report_cards', { catechumen_id: params.id });
  const allGrades = await db.findMany('grades');
  const reportCardsWithGrades = reportCards.map((rc: any) => {
    const grades = allGrades.filter((g: any) => g.report_card_id === rc.id);
    let average = rc.average;
    if (grades.length > 0) {
      average = grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0) / grades.length;
    }
    return { ...rc, average, grades };
  });
  sendJSON(res, 200, { ...catechumen, sacraments, report_cards: reportCardsWithGrades });
});

router.put('/api/catechumens/:id', async (req, res, params, body) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const files = body.__files || {};
  const existing = await db.findOne('catechumens', { id: params.id });
  let photo_url = body.photo_url || existing?.photo_url;
  let birth_certificate_url = body.birth_certificate_url || existing?.birth_certificate_url;
  if (files.photo?.[0]) {
    const ext = path.extname(files.photo[0].filename) || '.jpg';
    const filename = `${Date.now()}-${nanoid(8)}${ext}`;
    await fs.writeFile(path.join(uploadDir, filename), files.photo[0].data);
    photo_url = `/storage/uploads/${filename}`;
  }
  if (files.birth_certificate?.[0]) {
    const ext = path.extname(files.birth_certificate[0].filename) || '.jpg';
    const filename = `${Date.now()}-${nanoid(8)}${ext}`;
    await fs.writeFile(path.join(uploadDir, filename), files.birth_certificate[0].data);
    birth_certificate_url = `/storage/uploads/${filename}`;
  }
  const updated = await db.update('catechumens', params.id, {
    first_name: body.first_name, last_name: body.last_name,
    dob: body.dob, gender: body.gender,
    address: body.address, phone: body.phone, email: body.email,
    photo_url, birth_certificate_url,
    parent_name: body.parent_name, parent_phone: body.parent_phone,
    year: body.year, niveau_scolaire: body.niveau_scolaire,
    baptise: body.baptise === 'true', quartier_ceb: body.quartier_ceb,
    mouvement: body.mouvement, anciennete: body.anciennete === 'true'
  });
  sendJSON(res, 200, updated);
});

router.delete('/api/catechumens/:id', async (req, res, params) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  if (!isAdmin(userData, res)) return;
  await db.delete('catechumens', params.id);
  sendJSON(res, 200, { success: true });
});

// Report Cards Routes
router.post('/api/catechumens/:id/report-cards', async (req, res, params, body) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const { title, date, comments, grades, trimestre, type, t1_average, t2_average, t3_average } = body;
  const isAnnual = type === 'annual' || trimestre === 'Annuel';
  let average = 0;
  if (isAnnual) {
    const t1 = Number(t1_average) || 0;
    const t2 = Number(t2_average) || 0;
    const t3 = Number(t3_average) || 0;
    average = (t1 + t2 + t3) / 3;
  } else if (grades && grades.length > 0) {
    average = grades.reduce((acc: number, g: any) => acc + (g.score || 0), 0) / grades.length;
  }
  const reportCard = await db.insert('report_cards', {
    catechumen_id: params.id,
    title, trimestre,
    type: isAnnual ? 'annual' : 'trimestre',
    t1_average: isAnnual ? Number(t1_average) || 0 : undefined,
    t2_average: isAnnual ? Number(t2_average) || 0 : undefined,
    t3_average: isAnnual ? Number(t3_average) || 0 : undefined,
    average, comments, date
  });
  if (!isAnnual && grades) {
    for (const g of grades) {
      await db.insert('grades', { report_card_id: reportCard.id, subject_id: g.subject_id, score: g.score, comment: g.comment });
    }
  }
  sendJSON(res, 201, reportCard);
});

router.get('/api/report-cards/:id', async (req, res, params) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const card = await db.findOne('report_cards', { id: params.id });
  if (!card) return sendJSON(res, 404, { error: 'Not found' });
  const catechumen = await db.findOne('catechumens', { id: card.catechumen_id });
  const gradesRaw = await db.findMany('grades', { report_card_id: params.id });
  const subjects = await db.findMany('subjects');
  const grades = gradesRaw.map((g: any) => ({ ...g, subject_name: subjects.find((s: any) => s.id == g.subject_id)?.name }));
  let average = card.average;
  if (grades.length > 0) {
    average = grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0) / grades.length;
  }
  sendJSON(res, 200, { ...card, average, catechumen: catechumen || null, grades });
});

router.put('/api/report-cards/:id', async (req, res, params, body) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const { title, date, comments, grades, trimestre, type, t1_average, t2_average, t3_average } = body;
  const raw = await db.raw();
  const reportIdx = raw.report_cards.findIndex((r: any) => r.id === params.id);
  if (reportIdx === -1) return sendJSON(res, 404, { error: 'Not found' });
  const isAnnual = type === 'annual' || trimestre === 'Annuel';
  let average = 0;
  if (isAnnual) {
    const t1 = Number(t1_average) || 0;
    const t2 = Number(t2_average) || 0;
    const t3 = Number(t3_average) || 0;
    average = (t1 + t2 + t3) / 3;
  } else if (grades && grades.length > 0) {
    average = grades.reduce((acc: number, g: any) => acc + (Number(g.score) || 0), 0) / grades.length;
  }
  raw.report_cards[reportIdx] = {
    ...raw.report_cards[reportIdx],
    title, trimestre,
    type: isAnnual ? 'annual' : 'trimestre',
    t1_average: isAnnual ? Number(t1_average) || 0 : undefined,
    t2_average: isAnnual ? Number(t2_average) || 0 : undefined,
    t3_average: isAnnual ? Number(t3_average) || 0 : undefined,
    average, comments, date
  };
  raw.grades = raw.grades.filter((g: any) => g.report_card_id !== params.id);
  if (!isAnnual && grades) {
    for (const g of grades) {
      raw.grades.push({ id: nanoid(), report_card_id: params.id, subject_id: g.subject_id, score: Number(g.score) || 0, comment: g.comment || '', created_at: new Date().toISOString() });
    }
  }
  await fs.writeFile(path.resolve(process.cwd(), 'database.json'), JSON.stringify(raw, null, 2));
  await db.reload();
  sendJSON(res, 200, raw.report_cards[reportIdx]);
});

// Sacraments Routes
router.post('/api/catechumens/:id/sacraments', async (req, res, params, body) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const { __files, __query, ...rest } = body;
  const result = await db.insert('sacraments', { catechumen_id: params.id, ...rest });
  sendJSON(res, 201, result);
});

router.get('/api/subjects', async (req, res) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const subjects = await db.findMany('subjects');
  sendJSON(res, 200, subjects);
});

router.post('/api/subjects', async (req, res, params, body) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  if (!isAdmin(userData, res)) return;
  const { name } = body;
  const existing = await db.findOne('subjects', { name });
  if (existing) return sendJSON(res, 400, { error: 'Subject already exists' });
  const result = await db.insert('subjects', { name });
  sendJSON(res, 201, result);
});

router.put('/api/subjects/:id', async (req, res, params, body) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  if (!isAdmin(userData, res)) return;
  const updated = await db.update('subjects', params.id, body);
  sendJSON(res, 200, updated);
});

router.delete('/api/subjects/:id', async (req, res, params) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  if (!isAdmin(userData, res)) return;
  await db.delete('subjects', params.id);
  sendJSON(res, 200, { success: true });
});

router.get('/api/all-sacraments', async (req, res) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const sacraments = await db.findMany('sacraments');
  const catechumens = await db.findMany('catechumens');
  const enriched = sacraments.map((s: any) => ({ ...s, catechumen: catechumens.find((c: any) => c.id === s.catechumen_id) }));
  sendJSON(res, 200, enriched);
});

router.get('/api/all-report-cards', async (req, res) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const reports = await db.findMany('report_cards');
  const catechumens = await db.findMany('catechumens');
  const allGrades = await db.findMany('grades');
  const enriched = reports.map((r: any) => {
    const grades = allGrades.filter((g: any) => g.report_card_id === r.id);
    let average = r.average;
    if (grades.length > 0) {
      average = grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0) / grades.length;
    }
    return { ...r, average, grades, catechumen: catechumens.find((c: any) => c.id === r.catechumen_id) };
  });
  sendJSON(res, 200, enriched);
});

router.get('/api/stats', async (req, res) => {
  const userData = authenticateToken(req, res);
  if (!userData) return;
  const data = await db.raw();
  const total = data.catechumens.length;
  const totalReportCards = data.report_cards.length;
  const totalSubjects = data.subjects.length;
  const totalSacraments = data.sacraments.length;
  const yearMap: any = {};
  data.catechumens.forEach((c: any) => { const y = c.year || 'Non défini'; yearMap[y] = (yearMap[y] || 0) + 1; });
  const catechumensByYear = Object.entries(yearMap).map(([year, count]) => ({ year, count }));
  const sacramentsCountMap: any = {};
  data.sacraments.forEach((s: any) => { sacramentsCountMap[s.type] = (sacramentsCountMap[s.type] || 0) + 1; });
  const sacramentsCount = Object.entries(sacramentsCountMap).map(([type, count]) => ({ type, count }));
  const activities = [
    ...data.catechumens.map((c: any) => ({ type: 'catéchumène' as const, name: `${c.first_name} ${c.last_name}`, date: c.created_at, id: c.id })),
    ...data.report_cards.map((r: any) => ({ type: 'bulletin' as const, name: r.title, date: r.created_at, id: r.id }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  sendJSON(res, 200, { total, totalReportCards, totalSubjects, totalSacraments, catechumensByYear, sacraments: sacramentsCount, activities });
});

function mimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.html': 'text/html', '.htm': 'text/html',
    '.js': 'text/javascript', '.mjs': 'text/javascript', '.cjs': 'text/javascript',
    '.ts': 'text/javascript', '.tsx': 'text/javascript', '.jsx': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject',
    '.pdf': 'application/pdf',
    '.map': 'application/json',
    '.txt': 'text/plain', '.xml': 'text/xml',
    '.mp4': 'video/mp4', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  };
  return map[ext] || 'application/octet-stream';
}

async function serveStatic(dir: string, req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const pathname = parsePath(req.url || '/');
  const filePath = path.join(dir, pathname);
  if (!filePath.startsWith(path.resolve(dir))) return false;
  try {
    const stat = await fs.stat(filePath);
    if (stat.isFile()) {
      const content = await fs.readFile(filePath);
      if (pathname.startsWith('/storage/uploads')) {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      }
      res.writeHead(200, { 'Content-Type': mimeType(filePath) });
      res.end(content);
      return true;
    }
  } catch {}
  return false;
}

async function startServer() {
  let viteMiddleware: any = null;
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    viteMiddleware = vite.middlewares;
  }

  const server = createServer(async (req, res) => {
    setCORS(req, res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const pathname = parsePath(req.url || '/');

    // API routes
    if (pathname.startsWith('/api/')) {
      await router.handle(req, res);
      return;
    }

    // Static files: storage
    if (pathname.startsWith('/storage/')) {
      const served = await serveStatic(path.join(process.cwd(), 'storage'), req, res);
      if (served) return;
    }

    if (viteMiddleware) {
      viteMiddleware(req, res, () => {
        sendJSON(res, 404, { error: 'Not found' });
      });
    } else {
      // Production: serve dist
      const distPath = path.join(process.cwd(), 'dist');
      const served = await serveStatic(distPath, req, res);
      if (!served) {
        const indexPath = path.join(distPath, 'index.html');
        try {
          const content = await fs.readFile(indexPath);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        } catch {
          sendJSON(res, 404, { error: 'Not found' });
        }
      }
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
