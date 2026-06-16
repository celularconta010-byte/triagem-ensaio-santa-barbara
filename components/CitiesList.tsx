import React from 'react';
import { Attendee } from '../types';
import { Button } from './Button';

interface CitiesListProps {
    attendees: Attendee[];
    onPrintCities: () => void;
    onBack: () => void;
}

export const CitiesList: React.FC<CitiesListProps> = ({
    attendees,
    onPrintCities,
    onBack
}) => {
    const cityCounts = attendees.reduce((acc, curr) => {
        acc[curr.city] = (acc[curr.city] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const uniqueCities = Object.keys(cityCounts).sort((a, b) => cityCounts[b] - cityCounts[a] || a.localeCompare(b));

    return (
        <div className="space-y-6 animate-in fade-in duration-500 no-print">
            <div className="flex items-center gap-4 mb-6">
                <Button onClick={onBack} variant="outline" className="px-2 py-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Button>
                <h2 className="text-2xl font-bold text-slate-800">Cidades Presentes</h2>
            </div>

            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-emerald-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <h3 className="font-bold uppercase text-sm tracking-wider">Cidades ({uniqueCities.length})</h3>
                </div>

                {uniqueCities.length > 0 ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {uniqueCities.map(city => (
                                <div key={city} className="bg-white px-3 py-2 rounded-lg border border-emerald-50 text-emerald-800 text-sm font-medium shadow-sm flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                        <span className="truncate">{city}</span>
                                    </div>
                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                        {cityCounts[city]}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-2">
                            <Button onClick={onPrintCities} variant="outline" className="w-full sm:w-auto border-emerald-200 text-emerald-700 hover:bg-emerald-100 py-2 text-xs">
                                🖨️ IMPRIMIR LISTA DE CIDADES
                            </Button>
                        </div>
                    </>
                ) : (
                    <p className="text-emerald-600/60 text-sm italic">Nenhuma cidade registrada ainda.</p>
                )}
            </div>
        </div>
    );
};
