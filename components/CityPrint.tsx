import React from 'react';
import { Attendee, EventModel } from '../types';
import { Button } from './Button';

interface CityPrintProps {
    attendees: Attendee[];
    eventMeta: EventModel;
    onBack: () => void;
}

export const CityPrint: React.FC<CityPrintProps> = ({ attendees, eventMeta, onBack }) => {
    const cityCounts = attendees.reduce((acc, curr) => {
        acc[curr.city] = (acc[curr.city] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sortedCities = Object.keys(cityCounts).sort((a, b) => cityCounts[b] - cityCounts[a] || a.localeCompare(b));
    const totalCities = sortedCities.length;
    const totalAttendees = attendees.length;

    // Split cities into two balanced columns for compact printing
    const midPoint = Math.ceil(sortedCities.length / 2);
    const leftColumn = sortedCities.slice(0, midPoint);
    const rightColumn = sortedCities.slice(midPoint);

    const CityTable = ({ cities }: { cities: string[] }) => (
        <table className="w-full border-collapse">
            <thead>
                <tr className="bg-gray-100 border-k">
                    <th className="border-k px-2 py-1 text-left uppercase text-[9pt]">Localidade</th>
                    <th className="border-k px-2 py-1 text-center uppercase text-[9pt] w-12">Qtd.</th>
                </tr>
            </thead>
            <tbody>
                {cities.map(city => (
                    <tr key={city} className="border-k">
                        <td className="border-k px-2 py-0.5 text-[8.5pt] uppercase truncate max-w-[140px]">{city}</td>
                        <td className="border-k px-2 py-0.5 text-center font-bold text-[9pt] bg-gray-50">{cityCounts[city]}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <div className="bg-white min-h-screen text-black p-4 sm:p-8">
            <div className="no-print mb-6 p-6 bg-emerald-50 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm border border-emerald-100">
                <div className="flex-1">
                    <h3 className="font-bold text-emerald-900 leading-tight">Impressão de Localidades (Modo Compacto)</h3>
                    <p className="text-xs text-emerald-700 mt-1">
                        Layout otimizado em duas colunas para economizar papel.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={onBack} variant="outline">Voltar</Button>
                    <Button onClick={() => window.print()} className="shadow-lg px-8 bg-emerald-600 hover:bg-emerald-700 text-white border-none">
                        IMPRIMIR LISTA
                    </Button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto border-k p-6 print:p-0 print:border-none">
                <header className="text-center mb-4 border-b border-black pb-2">
                    <h1 className="text-lg font-bold uppercase leading-tight">{eventMeta.eventTitle || 'Ensaio Regional'}</h1>
                    <div className="flex justify-center gap-4 text-[9pt] font-bold uppercase mt-1">
                        <span>Local: {eventMeta.local}</span>
                        <span>{eventMeta.date}</span>
                    </div>
                </header>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <CityTable cities={leftColumn} />
                    </div>
                    <div>
                        <CityTable cities={rightColumn} />
                    </div>
                </div>

                <div className="mt-4 flex justify-between items-center bg-gray-100 border-k p-2 font-bold text-[10pt]">
                    <span className="uppercase">Total de Localidades: {totalCities}</span>
                    <span className="uppercase">Total Geral: {totalAttendees}</span>
                </div>

                <footer className="mt-8 pt-2 border-t border-black flex justify-between items-end italic text-[8pt]">
                    <div>Secretaria Musical</div>
                    <div>Gerado em: {new Date().toLocaleString('pt-BR')}</div>
                </footer>
            </div>

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; padding: 0 !important; margin: 1cm !important; }
                    .border-k { border: 1px solid black !important; }
                    @page { size: A4; margin: 0; }
                }
                .border-k { border: 1px solid black !important; }
            `}</style>
        </div>
    );
};
