import express from 'express';
import { createServer as createViteServer } from 'vite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import multer from 'multer';
import { db } from './src/lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multer config for file uploads
const uploadDir = path.join(process.cwd(), 'storage', 'uploads');
try { await fs.mkdir(uploadDir, { recursive: true }); } catch (_) {}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${nanoid(8)}${ext}`);
  }
});
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

const PORT = 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'paroisse-secure-secret-key-2026';

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cors());
app.use('/storage', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(process.cwd(), 'storage')));

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token missing' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });
      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Access denied: Admins only' });
    }
  };

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
      const existing = await db.findOne('users', { email });
      if (existing) return res.status(400).json({ error: 'Email already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await db.insert('users', {
        name,
        email,
        password: hashedPassword,
        role: role || 'catechist'
      });
      res.status(201).json({ id: user.id, name, email, role: user.role });
    } catch (err: any) {
      res.status(400).json({ error: 'Error creating user' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await db.findOne('users', { email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  });

  // Profile Routes
  app.get('/api/auth/me', authenticateToken, async (req, res) => {
    const user = await db.findOne('users', { id: (req as any).user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  });

  app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    const { name, email, current_password, new_password } = req.body;
    const user = await db.findOne('users', { id: (req as any).user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (new_password) {
      if (!current_password) return res.status(400).json({ error: 'Current password is required' });
      const isValid = await bcrypt.compare(current_password, user.password);
      if (!isValid) return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (new_password) updates.password = await bcrypt.hash(new_password, 10);

    const updated = await db.update('users', user.id, updates);
    res.json({ id: updated.id, name: updated.name, email: updated.email, role: updated.role });
  });

  // Catechumens Routes
  app.get('/api/catechumens', authenticateToken, async (req, res) => {
    const list = await db.findMany('catechumens');
    res.json(list);
  });

  app.post('/api/catechumens', authenticateToken, upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'birth_certificate', maxCount: 1 }
  ]), async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let photo_url = req.body.photo_url;
    let birth_certificate_url = req.body.birth_certificate_url;
    if (files?.photo?.[0]) {
      photo_url = `/storage/uploads/${files.photo[0].filename}`;
    }
    if (files?.birth_certificate?.[0]) {
      birth_certificate_url = `/storage/uploads/${files.birth_certificate[0].filename}`;
    }
    const result = await db.insert('catechumens', {
      first_name: req.body.first_name, last_name: req.body.last_name,
      dob: req.body.dob, gender: req.body.gender,
      address: req.body.address, phone: req.body.phone, email: req.body.email,
      photo_url, birth_certificate_url,
      parent_name: req.body.parent_name, parent_phone: req.body.parent_phone,
      year: req.body.year, niveau_scolaire: req.body.niveau_scolaire,
      baptise: req.body.baptise === 'true', quartier_ceb: req.body.quartier_ceb,
      mouvement: req.body.mouvement, anciennete: req.body.anciennete === 'true'
    });
    res.status(201).json(result);
  });

  app.get('/api/catechumens/:id', authenticateToken, async (req, res) => {
    const catechumen = await db.findOne('catechumens', { id: req.params.id });
    if (!catechumen) return res.status(404).json({ error: 'Not found' });
    
    const sacraments = await db.findMany('sacraments', { catechumen_id: req.params.id });
    const reportCards = await db.findMany('report_cards', { catechumen_id: req.params.id });
    const allGrades = await db.findMany('grades');
    
    const reportCardsWithGrades = reportCards.map((rc: any) => {
      const grades = allGrades.filter((g: any) => g.report_card_id === rc.id);
      let average = rc.average;
      if (grades.length > 0) {
        const totalScore = grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0);
        average = totalScore / grades.length;
      }
      return { ...rc, average, grades };
    });
    
    res.json({ ...catechumen, sacraments, report_cards: reportCardsWithGrades });
  });

  app.put('/api/catechumens/:id', authenticateToken, upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'birth_certificate', maxCount: 1 }
  ]), async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const existing = await db.findOne('catechumens', { id: req.params.id });
    let photo_url = req.body.photo_url || existing?.photo_url;
    let birth_certificate_url = req.body.birth_certificate_url || existing?.birth_certificate_url;
    if (files?.photo?.[0]) {
      photo_url = `/storage/uploads/${files.photo[0].filename}`;
    }
    if (files?.birth_certificate?.[0]) {
      birth_certificate_url = `/storage/uploads/${files.birth_certificate[0].filename}`;
    }
    const updated = await db.update('catechumens', req.params.id, {
      first_name: req.body.first_name, last_name: req.body.last_name,
      dob: req.body.dob, gender: req.body.gender,
      address: req.body.address, phone: req.body.phone, email: req.body.email,
      photo_url, birth_certificate_url,
      parent_name: req.body.parent_name, parent_phone: req.body.parent_phone,
      year: req.body.year, niveau_scolaire: req.body.niveau_scolaire,
      baptise: req.body.baptise === 'true', quartier_ceb: req.body.quartier_ceb,
      mouvement: req.body.mouvement, anciennete: req.body.anciennete === 'true'
    });
    res.json(updated);
  });

  app.delete('/api/catechumens/:id', authenticateToken, isAdmin, async (req, res) => {
    await db.delete('catechumens', req.params.id);
    res.json({ success: true });
  });

  // Report Cards Routes
  app.post('/api/catechumens/:id/report-cards', authenticateToken, async (req, res) => {
    const { title, date, comments, grades, trimestre, type, t1_average, t2_average, t3_average } = req.body;
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
      catechumen_id: req.params.id,
      title,
      trimestre,
      type: isAnnual ? 'annual' : 'trimestre',
      t1_average: isAnnual ? Number(t1_average) || 0 : undefined,
      t2_average: isAnnual ? Number(t2_average) || 0 : undefined,
      t3_average: isAnnual ? Number(t3_average) || 0 : undefined,
      average,
      comments,
      date
    });

    if (!isAnnual && grades) {
      for (const g of grades) {
        await db.insert('grades', {
          report_card_id: reportCard.id,
          subject_id: g.subject_id,
          score: g.score,
          comment: g.comment
        });
      }
    }

    res.status(201).json(reportCard);
  });

  app.get('/api/report-cards/:id', authenticateToken, async (req, res) => {
    const card = await db.findOne('report_cards', { id: req.params.id });
    if (!card) return res.status(404).json({ error: 'Not found' });
    
    const catechumen = await db.findOne('catechumens', { id: card.catechumen_id });
    const gradesRaw = await db.findMany('grades', { report_card_id: req.params.id });
    const subjects = await db.findMany('subjects');

    const grades = gradesRaw.map((g: any) => ({
      ...g,
      subject_name: subjects.find((s: any) => s.id == g.subject_id)?.name
    }));

    let average = card.average;
    if (grades.length > 0) {
      const totalScore = grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0);
      average = totalScore / grades.length;
    }

    res.json({ 
      ...card,
      average,
      catechumen: catechumen || null,
      grades 
    });
  });

  app.put('/api/report-cards/:id', authenticateToken, async (req, res) => {
    const { title, date, comments, grades, trimestre, type, t1_average, t2_average, t3_average } = req.body;

    const raw = await db.raw();
    const reportIdx = raw.report_cards.findIndex((r: any) => r.id === req.params.id);
    if (reportIdx === -1) return res.status(404).json({ error: 'Not found' });

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
    raw.grades = raw.grades.filter((g: any) => g.report_card_id !== req.params.id);

    if (!isAnnual && grades) {
      for (const g of grades) {
        raw.grades.push({
          id: nanoid(),
          report_card_id: req.params.id,
          subject_id: g.subject_id,
          score: Number(g.score) || 0,
          comment: g.comment || '',
          created_at: new Date().toISOString()
        });
      }
    }

    await fs.writeFile(path.resolve(process.cwd(), 'database.json'), JSON.stringify(raw, null, 2));
    await db.reload();

    res.json(raw.report_cards[reportIdx]);
  });

  // Sacraments Routes
  app.post('/api/catechumens/:id/sacraments', authenticateToken, async (req, res) => {
    const result = await db.insert('sacraments', {
      catechumen_id: req.params.id,
      ...req.body
    });
    res.status(201).json(result);
  });

  app.get('/api/subjects', authenticateToken, async (req, res) => {
    const subjects = await db.findMany('subjects');
    res.json(subjects);
  });

  app.post('/api/subjects', authenticateToken, isAdmin, async (req, res) => {
    const { name } = req.body;
    const existing = await db.findOne('subjects', { name });
    if (existing) return res.status(400).json({ error: 'Subject already exists' });
    const result = await db.insert('subjects', { name });
    res.status(201).json(result);
  });

  app.put('/api/subjects/:id', authenticateToken, isAdmin, async (req, res) => {
    const updated = await db.update('subjects', req.params.id, req.body);
    res.json(updated);
  });

  app.delete('/api/subjects/:id', authenticateToken, isAdmin, async (req, res) => {
    await db.delete('subjects', req.params.id);
    res.json({ success: true });
  });

  // Global Sacraments List
  app.get('/api/all-sacraments', authenticateToken, async (req, res) => {
    const sacraments = await db.findMany('sacraments');
    const catechumens = await db.findMany('catechumens');
    
    const enriched = sacraments.map((s: any) => ({
      ...s,
      catechumen: catechumens.find((c: any) => c.id === s.catechumen_id)
    }));
    
    res.json(enriched);
  });

  // Global Report Cards List
  app.get('/api/all-report-cards', authenticateToken, async (req, res) => {
    const reports = await db.findMany('report_cards');
    const catechumens = await db.findMany('catechumens');
    const allGrades = await db.findMany('grades');
    
    const enriched = reports.map((r: any) => {
      const grades = allGrades.filter((g: any) => g.report_card_id === r.id);
      let average = r.average;
      if (grades.length > 0) {
        const totalScore = grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0);
        average = totalScore / grades.length;
      }
      return { ...r, average, grades, catechumen: catechumens.find((c: any) => c.id === r.catechumen_id) };
    });
    
    res.json(enriched);
  });

  // Stats Dashboard
  app.get('/api/stats', authenticateToken, async (req, res) => {
    const data = await db.raw();
    const total = data.catechumens.length;
    const totalReportCards = data.report_cards.length;
    const totalSubjects = data.subjects.length;
    const totalSacraments = data.sacraments.length;

    const yearMap: any = {};
    data.catechumens.forEach((c: any) => {
      const y = c.year || 'Non défini';
      yearMap[y] = (yearMap[y] || 0) + 1;
    });
    const catechumensByYear = Object.entries(yearMap).map(([year, count]) => ({ year, count }));

    const sacramentsCountMap: any = {};
    data.sacraments.forEach((s: any) => {
      sacramentsCountMap[s.type] = (sacramentsCountMap[s.type] || 0) + 1;
    });
    const sacramentsCount = Object.entries(sacramentsCountMap).map(([type, count]) => ({ type, count }));

    const activities = [
      ...data.catechumens.map((c: any) => ({ type: 'catéchumène' as const, name: `${c.first_name} ${c.last_name}`, date: c.created_at, id: c.id })),
      ...data.report_cards.map((r: any) => ({ type: 'bulletin' as const, name: r.title, date: r.created_at, id: r.id }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    res.json({
      total,
      totalReportCards,
      totalSubjects,
      totalSacraments,
      catechumensByYear,
      sacraments: sacramentsCount,
      activities
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
