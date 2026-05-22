import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Search, 
  User as UserIcon,
  Calendar,
  ChevronRight,
  TrendingUp,
  Download,
  Plus,
  Eye,
  Edit,
  BarChart3,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { api } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export function ReportsManagement() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'trimestriel' | 'annual'>('trimestriel');
  const navigate = useNavigate();

  useEffect(() => {
    api.reports.listAll()
      .then(setReports)
      .finally(() => setLoading(false));
  }, []);

  const toNum = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

  const getAverage = (r: any) => {
    if (r.type === 'annual' || r.trimestre === 'Annuel') {
      return toNum(r.average);
    }
    if (r.grades && r.grades.length > 0) {
      const totalScore = r.grades.reduce((sum: number, g: any) => sum + (Number(g.score) || 0), 0);
      return totalScore / r.grades.length;
    }
    return toNum(r.average);
  };

  const getMention = (avg: number) => {
    if (avg >= 16) return 'Excellent';
    if (avg >= 14) return 'Très Bien';
    if (avg >= 12) return 'Bien';
    if (avg >= 10) return 'Passable';
    return 'Insuffisant';
  };

  const isAnnual = (r: any) => r.type === 'annual' || r.trimestre === 'Annuel';

  const totalTrimestriel = reports.filter(r => !isAnnual(r)).length;
  const totalAnnuel = reports.filter(r => isAnnual(r)).length;
  const avgGeneral = reports.length > 0
    ? reports.reduce((sum, r) => sum + getAverage(r), 0) / reports.length
    : 0;

  const filtered = reports
    .map(r => ({ ...r, _avg: getAverage(r) }))
    .filter(r => {
      if (activeTab === 'trimestriel' && isAnnual(r)) return false;
      if (activeTab === 'annual' && !isAnnual(r)) return false;
      return true;
    })
    .filter(r =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${r.catechumen?.first_name} ${r.catechumen?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getGradeSubjectName = (grade: any) => {
    return grade.subject?.name || grade.subject_name || 'Matière';
  };

  const getGradeScore = (grade: any) => {
    const score = Number(grade.score);
    return Number.isFinite(score) ? score : 0;
  };

  const handleDownloadPDF = async (report: any) => {
    const isAnnual = report.type === 'annual' || report.trimestre === 'Annuel';
    let calculatedAverage = toNum(report.average);
    if (isAnnual) {
      calculatedAverage = toNum(report.average);
    } else if (report.grades && report.grades.length > 0) {
      const totalScore = report.grades.reduce((sum: number, grade: any) => sum + (Number(grade.score) || 0), 0);
      calculatedAverage = totalScore / report.grades.length;
    }

    const c = report.catechumen || {};
    const photoBase64 = c.photo_url ? await imageToBase64(getFileUrl(c.photo_url)) : null;
    const mention = Number.isFinite(calculatedAverage) ? getMention(calculatedAverage) : 'N/A';

    const mentionText = Number.isFinite(calculatedAverage)
      ? `Mention: ${mention} — ${calculatedAverage.toFixed(2)} / 20`
      : 'Non évalué';

    const htmlContent = `
      <html>
        <head>
          <title>Bulletin Scolaire - ${report.title}</title>
          <style>
            @page { margin: 0; }
            body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; color: #1a1a1a; line-height: 1.5; }
            .page { width: 210mm; min-height: 297mm; padding: 10mm 12mm; box-sizing: border-box; position: relative; background: #ffffff; }
            
            .bg-decoration { position: absolute; top: 0; left: 0; right: 0; height: 6mm; background: linear-gradient(90deg, #5c3a1a, #b45309, #5c3a1a); }
            .bg-decoration-bottom { position: absolute; bottom: 0; left: 0; right: 0; height: 3mm; background: linear-gradient(90deg, #5c3a1a, #b45309, #5c3a1a); }
            
            .header { text-align: center; margin-bottom: 5mm; padding: 5mm 0 4mm; }
            .header .church-icon { font-size: 32pt; color: #b45309; margin-bottom: 1mm; display: block; }
            .header h1 { font-size: 22pt; color: #5c3a1a; margin: 0 0 1mm 0; text-transform: uppercase; letter-spacing: 2pt; font-weight: bold; }
            .header h2 { font-size: 12pt; color: #78716c; font-weight: normal; margin: 0 0 2mm 0; letter-spacing: 1pt; }
            .header .divider { width: 80mm; height: 2px; background: linear-gradient(90deg, transparent, #b45309, transparent); margin: 2mm auto; }
            .header .badge { display: inline-block; background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; padding: 2mm 10mm; border-radius: 4mm; font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5pt; box-shadow: 0 2px 6px rgba(0,0,0,0.12); }
            
            .session-info { text-align: center; margin-bottom: 5mm; font-size: 11pt; color: #57534e; font-style: italic; letter-spacing: 0.3pt; padding: 1mm 0; }
            
            .student-section { background: linear-gradient(135deg, #fefce8, #fffbeb); border: 1.5px solid #fde68a; border-radius: 3mm; padding: 5mm 7mm; margin-bottom: 5mm; position: relative; overflow: hidden; }
            .student-section::before { content: ''; position: absolute; top: 0; right: 0; width: 80mm; height: 100%; background: linear-gradient(90deg, transparent, rgba(251,191,36,0.05)); }
            .student-section .label { font-size: 8pt; text-transform: uppercase; letter-spacing: 2pt; color: #b45309; font-weight: bold; margin-bottom: 2mm; }
            .student-name { font-size: 20pt; font-weight: bold; color: #5c3a1a; letter-spacing: 0.5pt; }
            .student-details { display: flex; flex-wrap: wrap; gap: 2mm 12mm; margin-top: 3mm; font-size: 11pt; color: #57534e; }
            .student-details strong { color: #1a1a1a; font-weight: 600; }
            .student-details span { padding: 0.5mm 0; }
            
            .average-box { float: right; text-align: center; background: linear-gradient(135deg, #5c3a1a, #7c4a2a); color: white; padding: 3mm 6mm; border-radius: 3mm; margin-left: 5mm; box-shadow: 0 3px 10px rgba(92,58,26,0.35); }
            .average-box .num { font-size: 22pt; font-weight: bold; line-height: 1.1; letter-spacing: -0.5pt; }
            .average-box .lbl { font-size: 6pt; text-transform: uppercase; letter-spacing: 1.5pt; opacity: 0.85; margin-top: 1mm; }
            
            .section-title { display: flex; align-items: center; gap: 3mm; margin: 6mm 0 3mm; }
            .section-title .bar { width: 5px; height: 8mm; background: #b45309; border-radius: 2px; }
            .section-title h3 { font-size: 13pt; color: #5c3a1a; margin: 0; text-transform: uppercase; letter-spacing: 1pt; font-weight: bold; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 5mm; border-radius: 3mm; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
            thead th { background: #5c3a1a; color: white; padding: 4mm 5mm; text-align: left; font-size: 10pt; text-transform: uppercase; letter-spacing: 1pt; font-weight: 600; }
            thead th:nth-child(2) { text-align: center; width: 22%; }
            thead th:nth-child(3) { width: 33%; }
            tbody td { padding: 3.5mm 5mm; border-bottom: 1px solid #e7e5e4; font-size: 12pt; }
            tbody td:nth-child(2) { text-align: center; }
            tbody tr:last-child td { border-bottom: none; }
            tbody tr:nth-child(even) { background: #f8f7f4; }
            .score-pass { display: inline-block; background: #f0fdf4; color: #166534; font-weight: bold; padding: 1.5mm 5mm; border-radius: 2mm; font-size: 13pt; min-width: 14mm; border: 1.5px solid #bbf7d0; }
            .score-fail { display: inline-block; background: #fef2f2; color: #991b1b; font-weight: bold; padding: 1.5mm 5mm; border-radius: 2mm; font-size: 13pt; min-width: 14mm; border: 1.5px solid #fecaca; }
            .comment-text { font-style: italic; color: #78716c; font-size: 11pt; }
            
            .average-footer { display: flex; justify-content: flex-end; margin-bottom: 5mm; }
            .average-footer .box { display: flex; align-items: center; gap: 3mm; background: linear-gradient(135deg, #5c3a1a, #7c4a2a); color: white; padding: 2.5mm 6mm; border-radius: 3mm; box-shadow: 0 3px 10px rgba(92,58,26,0.35); }
            .average-footer .box .label { font-size: 8pt; text-transform: uppercase; letter-spacing: 1.5pt; opacity: 0.85; font-weight: 600; }
            .average-footer .box .value { font-size: 18pt; font-weight: bold; line-height: 1; }
            .average-footer .box .out-of { font-size: 9pt; opacity: 0.6; }
            
            .mention-box { text-align: center; padding: 2.5mm 8mm; margin-bottom: 5mm; border-radius: 3mm; font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1pt; box-shadow: 0 2px 6px rgba(0,0,0,0.08); background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; }
            
            .footer { margin-top: 6mm; display: flex; gap: 10mm; align-items: stretch; }
            .footer .observations { flex: 1.4; }
            .footer .observations .title { font-size: 8pt; text-transform: uppercase; letter-spacing: 2pt; color: #b45309; font-weight: bold; margin-bottom: 2mm; }
            .footer .observations .text { font-style: italic; font-size: 11pt; color: #57534e; background: #fafaf9; padding: 4mm 6mm; border-radius: 3mm; border: 1px solid #e7e5e4; min-height: 22mm; line-height: 1.6; border-left: 3px solid #b45309; }
            .footer .signature { flex: 1; text-align: center; display: flex; flex-direction: column; justify-content: flex-end; }
            .footer .signature .title { font-size: 8pt; text-transform: uppercase; letter-spacing: 2pt; color: #b45309; font-weight: bold; margin-bottom: 10mm; }
            .footer .signature .line { width: 55mm; border-top: 2.5px solid #a8a29e; padding-top: 2.5mm; margin: 0 auto; }
            .footer .signature .line span { font-size: 8pt; text-transform: uppercase; letter-spacing: 1.5pt; color: #a8a29e; }
            
            .bottom-bar { position: absolute; bottom: 5mm; left: 12mm; right: 12mm; border-top: 1px solid #e7e5e4; padding-top: 1.5mm; display: flex; justify-content: space-between; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.5pt; color: #a8a29e; }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="bg-decoration"></div>
            
            <div class="header">
              <span class="church-icon"></span>
              <h1>Paroisse Saint Antoine de Padoue de Zogbo</h1>
              <h2>Archidiocèse de Cotonou</h2>
              <div class="divider"></div>
              <div class="badge">${isAnnual ? 'Bulletin Annuel' : 'Bulletin Scolaire Catéchétique'}</div>
            </div>

            <div class="session-info">
              ${report.title} ${report.trimestre ? '— ' + report.trimestre : ''}${isAnnual ? ' — Bulletin Annuel' : ''} — Session du ${new Date(report.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>

            <div class="student-section">
              <div class="label">Élève Catéchumène</div>
              <div style="display:flex; align-items:center; gap:5mm;">
                ${photoBase64 ? '<div style="width:28mm; height:28mm; border-radius:3mm; overflow:hidden; border:2px solid #fde68a; flex-shrink:0; background:#fefce8; display:flex; align-items:center; justify-content:center;"><img src="' + photoBase64 + '" style="width:100%; height:100%; object-fit:cover;" crossorigin="anonymous" referrerpolicy="no-referrer" /></div>' : '<div style="width:28mm; height:28mm; border-radius:3mm; overflow:hidden; border:2px solid #fde68a; flex-shrink:0; background:#fefce8; display:flex; align-items:center; justify-content:center; font-size:16pt; font-weight:bold; color:#b45309;">' + (c.last_name ? c.last_name[0] + (c.first_name?.[0] || '') : '?') + '</div>'}
                <div>
                  <div class="student-name">${c.last_name || ''} ${c.first_name || ''}</div>
                  <div class="student-details">
                    ${c.year ? '<span>Année: <strong>' + c.year + '</strong></span>' : ''}
                    ${c.niveau_scolaire ? '<span>Niveau scolaire: <strong>' + c.niveau_scolaire + '</strong></span>' : ''}
                    ${c.quartier_ceb ? '<span>Quartier / CEB: <strong>' + c.quartier_ceb + '</strong></span>' : ''}
                    ${c.mouvement ? '<span>Mouvement: <strong>' + c.mouvement + '</strong></span>' : ''}
                    ${c.dob ? '<span>Né(e): <strong>' + new Date(c.dob).toLocaleDateString('fr-FR') + '</strong></span>' : ''}
                    ${c.parent_name ? '<span>Parent: <strong>' + c.parent_name + '</strong></span>' : ''}
                    ${c.baptise !== undefined ? '<span>Baptisé: <strong>' + (c.baptise ? 'Oui' : 'Non') + '</strong></span>' : ''}
                    ${c.anciennete !== undefined ? '<span>Ancienneté: <strong>' + (c.anciennete ? 'Oui' : 'Non') + '</strong></span>' : ''}
                  </div>
                </div>
              </div>
            </div>

            <div class="section-title">
              <div class="bar"></div>
              <h3>${isAnnual ? 'Moyennes Trimestrielles' : 'Notes par Matières'}</h3>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:${isAnnual ? '75' : '45'}%">${isAnnual ? 'Trimestre' : 'Matières'}</th>
                  <th style="width:${isAnnual ? '25' : '18'}%">Note / 20</th>
                  ${isAnnual ? '' : '<th style="width:37%">Appréciations</th>'}
                </tr>
              </thead>
              <tbody>
                ${isAnnual ? `
                  ${report.t1_average !== undefined ? '<tr><td><strong style="color:#292524;">1er Trimestre</strong></td><td style="text-align:center;"><span class="' + ((Number(report.t1_average) || 0) >= 10 ? 'score-pass' : 'score-fail') + '">' + (Number(report.t1_average) || 0).toFixed(1) + '</span></td></tr>' : ''}
                  ${report.t2_average !== undefined ? '<tr><td><strong style="color:#292524;">2ème Trimestre</strong></td><td style="text-align:center;"><span class="' + ((Number(report.t2_average) || 0) >= 10 ? 'score-pass' : 'score-fail') + '">' + (Number(report.t2_average) || 0).toFixed(1) + '</span></td></tr>' : ''}
                  ${report.t3_average !== undefined ? '<tr><td><strong style="color:#292524;">3ème Trimestre</strong></td><td style="text-align:center;"><span class="' + ((Number(report.t3_average) || 0) >= 10 ? 'score-pass' : 'score-fail') + '">' + (Number(report.t3_average) || 0).toFixed(1) + '</span></td></tr>' : ''}
                ` : (report.grades && report.grades.length > 0) ? report.grades.map((grade: any) => {
                  const score = getGradeScore(grade);
                  const pass = score >= 10;
                  return '<tr>' +
                    '<td><strong style="color:#292524;">' + getGradeSubjectName(grade) + '</strong></td>' +
                    '<td><span class="' + (pass ? 'score-pass' : 'score-fail') + '">' + score.toFixed(1) + '</span></td>' +
                    '<td class="comment-text">' + (grade.comment || '—') + '</td>' +
                    '</tr>';
                }).join('') : '<tr><td colspan="3" style="text-align:center;color:#a8a29e;padding:5mm;font-style:italic;">Aucune note enregistrée pour ce bulletin</td></tr>'}
              </tbody>
            </table>

            <div class="average-footer">
              <div class="box">
                <span class="label">Moyenne Générale</span>
                <span class="value">${Number.isFinite(calculatedAverage) ? calculatedAverage.toFixed(2) : '0.00'}</span>
                <span class="out-of">/ 20</span>
              </div>
            </div>

            <div class="mention-box">
              ${mentionText}
            </div>

            <div class="footer">
              <div class="observations">
                <div class="title">${isAnnual ? 'Appréciation Générale' : 'Observation Générale'}</div>
                <div class="text">"${report.comments || (isAnnual ? 'Aucune appréciation générale mentionnée.' : 'Aucune observation mentionnée par le catéchiste.')}"</div>
              </div>
              <div class="signature">
                <div class="title">Le Curé</div>
                <div class="line"><span>Signature &amp; Cachet</span></div>
              </div>
            </div>

            <div class="bottom-bar">
              <span>Paroisse Connect — Système de Gestion Paroissiale</span>
              <span>Bulletin généré le ${new Date().toLocaleDateString('fr-FR')}</span>
            </div>
            <div class="bg-decoration-bottom"></div>
          </div>
        </body>
      </html>
    `;

    // Create a temporary div to render HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    document.body.appendChild(tempDiv);
    const pageEl = tempDiv.querySelector('.page') as HTMLElement;

    try {
      // Convert HTML to canvas - capture only the .page element
      const canvas = await html2canvas(pageEl, {
        scale: 3,
        useCORS: true,
        logging: false,
      });

      // Convert canvas to PDF - fill entire A4 page
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Save PDF
      const pdfBlob = pdf.output('blob');
      const link = document.createElement('a');
      const url = URL.createObjectURL(pdfBlob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `bulletin_${report.title}_${new Date(report.date).toISOString().split('T')[0]}.pdf`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      // Clean up temporary div
      document.body.removeChild(tempDiv);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brown-900">Registre des Bulletins</h2>
        <p className="text-slate-500">Historique complet des évaluations de la catéchèse</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-amber-600 p-3 rounded-xl text-white">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Bulletins</p>
            <p className="text-2xl font-bold text-brown-900">{reports.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl text-white">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Trimestriels</p>
            <p className="text-2xl font-bold text-brown-900">{totalTrimestriel}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-emerald-600 p-3 rounded-xl text-white">
            <GraduationCap size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Annuels</p>
            <p className="text-2xl font-bold text-brown-900">{totalAnnuel}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-xl text-white">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Moyenne Générale</p>
            <p className="text-2xl font-bold text-brown-900">{avgGeneral.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('trimestriel')}
          className={cn(
            "px-5 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === 'trimestriel'
              ? "bg-brown-900 text-white shadow-lg shadow-brown-900/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <BookOpen size={16} className="inline mr-2" />
          Trimestriels
        </button>
        <button
          onClick={() => setActiveTab('annual')}
          className={cn(
            "px-5 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === 'annual'
              ? "bg-brown-900 text-white shadow-lg shadow-brown-900/20"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <GraduationCap size={16} className="inline mr-2" />
          Annuels
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher par titre de bulletin ou nom du catéchumène..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 h-11 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Chargement...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider font-bold text-slate-500">
                <th className="px-6 py-4">Titre du Bulletin</th>
                <th className="px-6 py-4">Catéchumène</th>
                <th className="px-6 py-4 text-center">Moyenne</th>
                <th className="px-6 py-4">Mention</th>
                <th className="px-6 py-4">Date Issue</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">Aucun bulletin émis</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-slate-400" />
                        <span className="font-bold text-brown-900">{r.title}</span>
                        {(r.type === 'annual' || r.trimestre === 'Annuel') && (
                          <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold uppercase rounded">Annuel</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold uppercase">
                          {r.catechumen?.first_name[0]}{r.catechumen?.last_name[0]}
                        </div>
                        <span className="text-slate-600 uppercase text-xs font-medium">{r.catechumen?.last_name} {r.catechumen?.first_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brown-900 text-white text-sm font-bold">
                        <TrendingUp size={14} className="text-amber-400" />
                        {Number.isFinite(r._avg) ? r._avg.toFixed(2) : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-2 py-1 rounded-md",
                        Number.isFinite(r._avg) && r._avg >= 12 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {Number.isFinite(r._avg) ? (
                          r._avg >= 16 ? 'Excellent' : r._avg >= 14 ? 'Très Bien' : r._avg >= 12 ? 'Bien' : 'Passable'
                        ) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(r.date).toLocaleDateString('fr-FR')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/reports/${r.id}`)}
                          className="p-2 text-amber-600 hover:text-amber-900 hover:bg-amber-50 rounded-lg transition-all"
                          title="Voir détails"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => navigate(`/reports/${r.id}/edit`)}
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(r)}
                          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                          title="Télécharger le bulletin (PDF)"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
const API_URL_STORAGE = '';



async function imageToBase64(url) {
  if (!url || url.startsWith('data:')) return url || '';
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch (e) {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}
function getFileUrl(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return API_URL_STORAGE + url;
}


