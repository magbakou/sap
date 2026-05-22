import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Download, Printer, FileText, User, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const API_URL_STORAGE = '';

function getFileUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('http')) return url;
  return API_URL_STORAGE + url;
}

function getMention(avg: number): string {
  if (avg >= 16) return 'Excellent';
  if (avg >= 14) return 'Très Bien';
  if (avg >= 12) return 'Bien';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
}

export function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const bulletinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      api.reports.get(id)
        .then(setReport)
        .catch(() => setReport(null))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleDownloadPDF = async () => {
    if (!bulletinRef.current || !report) return;
    try {
      const imgs = bulletinRef.current.querySelectorAll('img');
      const promises = Array.from(imgs).map(async (img) => {
        const src = img.getAttribute('src');
        if (src && !src.startsWith('data:')) {
          const dataUrl = await new Promise((resolve) => {
            const tempImg = new Image();
            tempImg.crossOrigin = 'anonymous';
            tempImg.onload = () => {
              try {
                const c = document.createElement('canvas');
                c.width = tempImg.naturalWidth;
                c.height = tempImg.naturalHeight;
                c.getContext('2d').drawImage(tempImg, 0, 0);
                resolve(c.toDataURL('image/jpeg', 0.9));
              } catch (e) {
                resolve(null);
              }
            };
            tempImg.onerror = () => resolve(null);
            tempImg.src = src;
          });
          if (dataUrl) img.setAttribute('src', dataUrl);
        }
      });
      await Promise.all(promises);

      const canvas = await html2canvas(bulletinRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      pdf.save('bulletin_' + (report.title || 'note') + '.pdf');
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (!report) return <div className="p-8 text-center text-red-500">Dossier introuvable</div>;

  const isAnnual = report.type === 'annual' || report.trimestre === 'Annuel';
  const avg = Number(report.average) || 0;
  const mention = getMention(avg);
  const c = report.catechumen || {};
  const studentName = c.first_name ? c.first_name + ' ' + c.last_name : (report.first_name ? report.first_name + ' ' + report.last_name : 'N/A');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors w-fit"
        >
          <ArrowLeft size={18} />
          Retour
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-medium text-sm"
          >
            <Download size={16} />
            Télécharger PDF
          </button>
          {report.id && (
            <Link
              to={'/reports/' + report.id + '/edit'}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Edit size={16} />
              Modifier
            </Link>
          )}
        </div>
      </div>

      <div ref={bulletinRef} className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 p-6 sm:p-8 text-white">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-wide uppercase">{report.title || 'Bulletin'}</h1>
            <p className="text-amber-100 mt-1 text-sm">
              {report.trimestre ? report.trimestre + ' - ' : ''}
              Session du {new Date(report.date).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Student Info */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <div className="w-16 h-16 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xl overflow-hidden flex-shrink-0">
              {c.photo_url ? (
                <img src={getFileUrl(c.photo_url)} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />
              ) : (
                <User size={28} />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Catéchumène</p>
              <h2 className="text-xl font-bold text-slate-900">
                {studentName}
              </h2>
              <p className="text-sm text-slate-500">{c.year || ''}</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-3xl font-bold text-amber-700">{avg.toFixed(1)}</p>
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Moyenne</p>
            </div>
          </div>

          {/* Grade Table */}
          {!isAnnual && report.grades && report.grades.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                Notes par matière
              </h3>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-xs">
                      <th className="px-4 py-3 text-left">Matière</th>
                      <th className="px-4 py-3 text-center w-20">Note</th>
                      <th className="px-4 py-3 text-left">Appréciation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.grades.map((g: any, idx: number) => (
                      <tr key={g.id || idx} className="hover:bg-amber-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{g.subject_name || 'N/A'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center w-10 h-7 rounded-lg font-bold text-xs",
                            (Number(g.score) || 0) >= 10 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                          )}>
                            {Number.isFinite(Number(g.score)) ? Number(g.score).toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 italic text-slate-500">{g.comment || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td className="px-4 py-3 text-slate-700">Moyenne générale</td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center w-10 h-7 rounded-lg font-bold text-xs",
                          avg >= 10 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                        )}>
                          {avg.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "font-bold text-xs px-2 py-1 rounded-full",
                          avg >= 12 ? "bg-emerald-100 text-emerald-800" : avg >= 10 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"
                        )}>
                          {mention}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Annual Report: show trimestre averages */}
          {isAnnual && (
            <div>
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                Moyennes trimestrielles
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {report.t1_average !== undefined && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">1er Trimestre</p>
                    <p className={cn("text-2xl font-bold mt-1", (Number(report.t1_average) || 0) >= 10 ? "text-emerald-600" : "text-red-500")}>
                      {(Number(report.t1_average) || 0).toFixed(1)}
                    </p>
                  </div>
                )}
                {report.t2_average !== undefined && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">2ème Trimestre</p>
                    <p className={cn("text-2xl font-bold mt-1", (Number(report.t2_average) || 0) >= 10 ? "text-emerald-600" : "text-red-500")}>
                      {(Number(report.t2_average) || 0).toFixed(1)}
                    </p>
                  </div>
                )}
                {report.t3_average !== undefined && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">3ème Trimestre</p>
                    <p className={cn("text-2xl font-bold mt-1", (Number(report.t3_average) || 0) >= 10 ? "text-emerald-600" : "text-red-500")}>
                      {(Number(report.t3_average) || 0).toFixed(1)}
                    </p>
                  </div>
                )}
              </div>
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-100 text-center">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Moyenne annuelle</p>
                <p className="text-3xl font-bold text-amber-700 mt-1">{avg.toFixed(1)}</p>
                <p className="text-sm font-bold text-amber-600 mt-1">{mention}</p>
              </div>
            </div>
          )}

          {/* Comments */}
          {report.comments && (
            <div>
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wider">
                <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                Appréciation
              </h3>
              <p className="text-slate-600 italic bg-slate-50 p-4 rounded-xl border border-slate-200">
                {report.comments}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
