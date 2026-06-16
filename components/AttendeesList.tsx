import React from 'react';
import { Attendee } from '../types';
import { Button } from './Button';

interface AttendeesListProps {
    attendees: Attendee[];
    onEditAttendee: (attendee: Attendee) => void;
    onDeleteAttendee: (id: string) => void;
    onBack: () => void;
}

export const AttendeesList: React.FC<AttendeesListProps> = ({
    attendees,
    onEditAttendee,
    onDeleteAttendee,
    onBack
}) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 no-print">
            <div className="flex items-center gap-4 mb-6">
                <Button onClick={onBack} variant="outline" className="px-2 py-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Button>
                <h2 className="text-2xl font-bold text-slate-800">Participantes Registrados</h2>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold text-slate-700">Lista Geral ({attendees.length})</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b">Nome / Instrumento</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b">Cidade</th>
                                <th className="p-3 text-xs font-bold text-slate-500 uppercase border-b text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {attendees.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-3">
                                        <div className="font-bold text-slate-800">{a.role === 'Músico (Irmão)' ? a.instrument : 'Órgão'}</div>
                                        <div className="text-[10px] text-slate-500 uppercase">{a.ministry !== 'Selecione' ? a.ministry : (a.level !== 'Selecione' ? a.level : a.role)}</div>
                                    </td>
                                    <td className="p-3 text-sm text-slate-600">{a.city}</td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onEditAttendee(a)}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => onDeleteAttendee(a.id)}
                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {attendees.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-slate-400 italic text-sm">Nenhum participante registrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
