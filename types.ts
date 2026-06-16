
export enum Role {
  MUSICIAN = 'Músico (Irmão)',
  ORGANIST = 'Organista (Irmã)'
}

export enum Level {
  NONE = 'Selecione',
  REGIONAL = 'Encarregado Regional',
  LOCAL = 'Encarregado Local',
  INSTRUCTOR = 'Instrutor',
  MUSICIAN = 'Músico'
}

export enum Ministry {
  NONE = 'Selecione',
  ANCIAO = 'Ancião',
  DIACONO = 'Diácono',
  COOPERADOR_OFICIO = 'Coop. do Ofício Ministerial',
  COOPERADOR_JOVENS = 'Coop. de Jovens e Menores',
  EXAMINADORA = 'Examinadora',
  INSTRUTORA = 'Instrutora',
  ORGANISTA = 'Organista'
}

export interface Attendee {
  id: string;
  event_id: string;
  ministry: Ministry;
  role: Role;
  instrument: string;
  level: Level;
  city: string;
  timestamp: number;
}

export interface EventModel {
  id?: string;
  code: string;
  eventTitle: string;
  local: string;
  date: string;
  anciao: string;
  regionais: string;
  palavra: string;
  hinos: string;
  created_at?: string;
}

export const INSTRUMENT_GROUPS = {
  Cordas: ['Violino', 'Viola', 'Violoncelo'],
  Madeiras: [
    'Flauta', 'Oboé', 'Corne inglês', 'Fagote',
    'Clarinete', 'Clarinete Alto', 'Clarinete Baixo',
    'Sax Sopranino', 'Sax Soprano', 'Sax Alto', 'Sax Tenor', 'Sax Barítono', 'Sax Baixo',
    'Acordeon'
  ],
  Metais: [
    'Cornet', 'Trompete', 'Flugelhorn', 'Trompa', 'Melofone',
    'Trombonito', 'Trombone', 'Eufônio', 'Barítono', 'Tuba'
  ]
};

export const INSTRUMENTS = [
  ...INSTRUMENT_GROUPS.Cordas,
  ...INSTRUMENT_GROUPS.Madeiras,
  ...INSTRUMENT_GROUPS.Metais
];

export type ViewState = 'event-selection' | 'admin-events' | 'landing' | 'form' | 'dashboard' | 'print' | 'print-cities' | 'cities-list' | 'attendees-list';
