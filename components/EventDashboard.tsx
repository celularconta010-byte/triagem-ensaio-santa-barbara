import React, { useState } from 'react';
import { Attendee, EventModel } from '../types';
import { Button } from './Button';
import { generateMusicalReflection } from '../services/geminiService';

interface EventDashboardProps {
  attendees: Attendee[];
  eventMeta: EventModel;
  onUpdateMeta: (meta: EventModel) => void;
  onClearData: () => void;
  onGenerateReport: () => void;
  onPrintCities: () => void;
  onBack: () => void;
  onViewCities: () => void;
  onViewAttendees: () => void;
  onDeleteEvent: () => void;
}

export const EventDashboard: React.FC<EventDashboardProps> = ({
  attendees,
  eventMeta,
  onUpdateMeta,
  onClearData,
  onGenerateReport,
  onPrintCities,
  onBack,
  onViewCities,
  onViewAttendees,
  onDeleteEvent
}) => {
  const cityCounts = attendees.reduce((acc, curr) => {
    acc[curr.city] = (acc[curr.city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueCities = Object.keys(cityCounts).sort((a, b) => cityCounts[b] - cityCounts[a] || a.localeCompare(b));

  const exportData = () => {
    const data = {
      metadata: eventMeta,
      attendees: attendees,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-ensaio-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 no-print">
      <div className="flex items-center justify-between">
        <Button onClick={onBack} variant="outline">Voltar</Button>
        <h2 className="text-2xl font-bold text-slate-800">Painel do Evento</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <h3 className="font-bold text-slate-700 border-b pb-2">Informações de Cabeçalho</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Título da Reunião (Ex: Ensaio Regional, Reunião de Encarregados...)</label>
            <input
              value={eventMeta.eventTitle}
              onChange={e => onUpdateMeta({ ...eventMeta, eventTitle: e.target.value })}
              className="w-full p-3 border rounded-xl font-bold text-indigo-700 bg-indigo-50/30 focus:bg-white transition-colors"
              placeholder="Digite o nome da reunião ou ensaio"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Data do Evento (Ex: sexta-feira, 8 de março de 2026)</label>
            <input
              value={eventMeta.date}
              onChange={e => onUpdateMeta({ ...eventMeta, date: e.target.value })}
              className="w-full p-3 border rounded-xl bg-slate-50 focus:bg-white transition-colors"
              placeholder="Digite a data do evento"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 mb-1 block uppercase">Local do Evento</label>
            <input
              value={eventMeta.local}
              onChange={e => onUpdateMeta({ ...eventMeta, local: e.target.value })}
              className="w-full p-3 border rounded-xl"
              placeholder="Ex: Treze de Maio (Bairro Alto) - Central de Piracicaba/SP"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">ANCIÃO ATENDENTE</label>
            <input
              value={eventMeta.anciao}
              onChange={e => onUpdateMeta({ ...eventMeta, anciao: e.target.value })}
              className="w-full p-3 border rounded-xl"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Encarregados Regionais</label>
              <div className="group relative">
                <div className="w-4 h-4 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center text-[10px] cursor-help font-bold">i</div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-center leading-tight">
                  Para um nome ficar abaixo do outro precisa separar com vírgulas. A vírgula não aparecerá na impressão final.
                </div>
              </div>
            </div>
            <input
              value={eventMeta.regionais}
              onChange={e => onUpdateMeta({ ...eventMeta, regionais: e.target.value })}
              className="w-full p-3 border rounded-xl"
              placeholder="Ex: João Silva, Maria Souza"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 mb-1 block">PALAVRA (EX: SALMOS 148)</label>
            <input
              value={eventMeta.palavra}
              onChange={e => onUpdateMeta({ ...eventMeta, palavra: e.target.value })}
              className="w-full p-3 border rounded-xl"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-slate-500 mb-1 block">HINOS ENSAIADOS (EX: 267, 194, 247...)</label>
            <textarea
              value={eventMeta.hinos}
              onChange={e => onUpdateMeta({ ...eventMeta, hinos: e.target.value })}
              className="w-full p-3 border rounded-xl h-24"
            />
          </div>
        </div>

        <div className="pt-4 border-t flex flex-col sm:flex-row gap-3">
          <Button onClick={onGenerateReport} className="flex-1">GERAR RELATÓRIO OFICIAL</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={onViewCities}
          className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center gap-3 text-emerald-700 mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <h3 className="font-bold uppercase text-sm tracking-wider">Cidades Presentes</h3>
          </div>
          <p className="text-emerald-800/70 text-sm">Visualizar contagem por cidade ({uniqueCities.length})</p>
          <div className="mt-4 text-emerald-600 font-bold text-xs group-hover:translate-x-1 transition-transform flex items-center gap-1">
            VER LISTA COMPLETA <span>→</span>
          </div>
        </button>

        <button
          onClick={onViewAttendees}
          className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center gap-3 text-indigo-700 mb-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <h3 className="font-bold uppercase text-sm tracking-wider">Gerenciar Participantes</h3>
          </div>
          <p className="text-indigo-800/70 text-sm">Editar ou excluir registros ({attendees.length})</p>
          <div className="mt-4 text-indigo-600 font-bold text-xs group-hover:translate-x-1 transition-transform flex items-center gap-1">
            ABRIR GERENCIADOR <span>→</span>
          </div>
        </button>
      </div>



      <div className="bg-white p-6 rounded-2xl border-2 border-rose-100 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-rose-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <h3 className="font-bold">Finalizar Ensaio</h3>
        </div>
        <p className="text-sm text-slate-600">
          Use esta opção apenas quando o ensaio terminar. Recomendamos baixar o backup antes de resetar.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button onClick={exportData} variant="outline" className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
            BAIXAR BACKUP (JSON)
          </Button>
          <Button onClick={onClearData} variant="danger" className="flex-1">
            EXCLUIR SÓ PARTICIPANTES
          </Button>
          <Button onClick={onDeleteEvent} variant="danger" className="flex-1 border-rose-600 bg-rose-600 text-white hover:bg-rose-700">
            APAGAR EVENTO INTEIRO
          </Button>
        </div>
      </div>
    </div>
  );
};
