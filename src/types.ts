export type Role = 'admin' | 'catechist';

export interface User {
  id: string | number;
  name: string;
  email: string;
  role: Role;
}

export interface Catechumen {
  id: string | number;
  first_name: string;
  last_name: string;
  dob: string;
  gender: 'M' | 'F';
  address: string;
  phone: string;
  email: string;
  photo_url?: string;
  birth_certificate_url?: string;
  parent_name?: string;
  parent_phone?: string;
  year: '1ere année' | '2eme année' | '3eme année' | '4eme année' | '5eme année' | '6eme année';
  niveau_scolaire?: string;
  baptise?: boolean;
  quartier_ceb?: string;
  mouvement?: string;
  anciennete?: boolean;
  created_at: string;
}

export interface Sacrament {
  id: string | number;
  catechumen_id: string | number;
  type: 'baptême' | 'communion' | 'confirmation';
  status: 'en_attente' | 'reçu';
  date: string;
}

export interface Subject {
  id: string | number;
  name: string;
  year: '1ere année' | '2eme année' | '3eme année' | '4eme année' | '5eme année' | '6eme année';
}

export interface Grade {
  id: string | number;
  report_card_id: string | number;
  subject_id: string | number;
  score: number;
  comment: string;
  subject_name?: string;
}

export interface ReportCard {
  id: string | number;
  catechumen_id: string | number;
  title: string;
  trimestre?: string;
  type?: 'trimestre' | 'annual';
  t1_average?: number;
  t2_average?: number;
  t3_average?: number;
  average: number;
  comments: string;
  date: string;
  created_at: string;
  year: '1ere année' | '2eme année' | '3eme année' | '4eme année' | '5eme année' | '6eme année';
  grades?: Grade[];
}

export interface DashboardStats {
  total: number;
  totalReportCards: number;
  totalSubjects: number;
  totalSacraments: number;
  catechumensByYear: { year: string; count: number }[];
  sacraments: { type: string; count: number }[];
  activities: { type: string; name: string; date: string; id: string }[];
}
