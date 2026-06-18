import React, { useState, useEffect, useRef } from 'react';
import { Attendee, Role, Level, ViewState, INSTRUMENTS, INSTRUMENT_GROUPS, Ministry, EventModel } from './types';
import { Button } from './components/Button';
import { BRAZILIAN_CITIES } from './services/cities';
import { EventDashboard } from './components/EventDashboard';
import { PrintReport } from './components/PrintReport';
import { CityPrint } from './components/CityPrint';
import { CitiesList } from './components/CitiesList';
import { AttendeesList } from './components/AttendeesList';
import { supabase, fetchAttendees, addAttendee, addMultipleAttendees, updateAttendee, deleteAttendee, clearAllAttendees, getEventByCode, createEvent, updateEvent, deleteEvent, checkSystemStatus, fetchAllEvents } from './services/supabase';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('event-selection');
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const generateId = () => {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const navigateTo = (newView: ViewState, replace: boolean = false) => {
    if (newView === view) return;
    
    if (replace) {
      window.history.replaceState({ view: newView }, '', '');
    } else {
      window.history.pushState({ view: newView }, '', '');
    }
    setView(newView);
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        setView('event-selection');
      }
    };

    window.history.replaceState({ view: 'event-selection' }, '', '');
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [selectedRole, setSelectedRole] = useState<Role | null>(() => {
    return localStorage.getItem('savedSelectedRole') as Role | null;
  });
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(() => {
    const saved = localStorage.getItem('savedEditingAttendee');
    return saved ? JSON.parse(saved) : null;
  });
  const [ministry, setMinistry] = useState<Ministry>(() => {
    const savedEdit = localStorage.getItem('savedEditingAttendee');
    if (savedEdit) return JSON.parse(savedEdit).ministry as Ministry;
    return Ministry.NONE;
  });
  const [instrument, setInstrument] = useState(() => {
    const savedEdit = localStorage.getItem('savedEditingAttendee');
    if (savedEdit) return JSON.parse(savedEdit).instrument;
    const role = localStorage.getItem('savedSelectedRole');
    return role === Role.ORGANIST ? 'Órgão' : '';
  });
  const [level, setLevel] = useState<Level>(() => {
    const savedEdit = localStorage.getItem('savedEditingAttendee');
    if (savedEdit) return JSON.parse(savedEdit).level as Level;
    return Level.MUSICIAN;
  });
  const [city, setCity] = useState(localStorage.getItem('savedCity') || '');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allEvents, setAllEvents] = useState<EventModel[]>([]);
  const [instrumentCounts, setInstrumentCounts] = useState<Record<string, number>>({});
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);

  const updateCount = (instrument: string, delta: number) => {
    setInstrumentCounts(prev => {
      const current = prev[instrument] || 0;
      const next = current + delta;
      if (next < 0) return prev;
      return { ...prev, [instrument]: next };
    });
  };

  useEffect(() => {
    if (selectedRole) {
      localStorage.setItem('savedSelectedRole', selectedRole);
    } else {
      localStorage.removeItem('savedSelectedRole');
    }
  }, [selectedRole]);

  useEffect(() => {
    if (editingAttendee) {
      localStorage.setItem('savedEditingAttendee', JSON.stringify(editingAttendee));
    } else {
      localStorage.removeItem('savedEditingAttendee');
    }
  }, [editingAttendee]);

  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  const initialMeta: EventModel = {
    code: '',
    eventTitle: 'ENSAIO REGIONAL',
    local: '',
    date: new Date().toLocaleDateString('pt-BR'),
    anciao: '',
    regionais: '',
    palavra: '',
    hinos: ''
  };

  const [eventMeta, setEventMeta] = useState<EventModel>(initialMeta);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  // States for Event Selection screen
  const [inputCode, setInputCode] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Omit<EventModel, 'id' | 'created_at'>>({ ...initialMeta, code: '' });
  const [eventError, setEventError] = useState('');

  useEffect(() => {
    if (view === 'print') {
      const originalTitle = document.title;
      const cleanLocal = eventMeta.local.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      document.title = `Relatorio_Triagem_${cleanLocal || 'Ensaio'}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`;
      return () => { document.title = originalTitle; };
    }
  }, [view, eventMeta.local]);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('savedView', view);
    }
  }, [view, isLoading]);

  useEffect(() => {
    if (city) localStorage.setItem('savedCity', city);
  }, [city]);

  useEffect(() => {
    const checkBgStatusAndRestore = async () => {
      try {
        const status = await checkSystemStatus();
        if (status.offline) setIsOffline(true);

        // Usa sessionStorage para o código do evento: ao fechar o navegador, a sessão é limpa automaticamente
        const savedCode = sessionStorage.getItem('savedEventCode');
        const savedView = localStorage.getItem('savedView') as ViewState | null;

        if (savedCode) {
          const event = await getEventByCode(savedCode);
          if (event) {
            setEventMeta(event);
            setActiveEventId(event.id!);
            const attendeesData = await fetchAttendees(event.id!);
            setAttendees(attendeesData);
            if (savedView && savedView !== 'event-selection') {
              navigateTo(savedView, true);
            } else {
              navigateTo('landing', true);
            }
          } else {
            sessionStorage.removeItem('savedEventCode');
            localStorage.removeItem('savedView');
          }
        }
      } catch (err) {
        console.error("Error restoring session:", err);
      } finally {
        setIsLoading(false);
      }
    };
    checkBgStatusAndRestore();
  }, []);

  // Realtime subscription for attendees
  useEffect(() => {
    if (!activeEventId) return;

    const channel = supabase
      .channel(`attendees_changes_${activeEventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendees',
          filter: `event_id=eq.${activeEventId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAttendee = payload.new as Attendee;
            setAttendees(prev => {
              if (prev.some(a => a.id === newAttendee.id)) return prev;
              return [newAttendee, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedAttendee = payload.new as Attendee;
            setAttendees(prev => prev.map(a => a.id === updatedAttendee.id ? updatedAttendee : a));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setAttendees(prev => prev.filter(a => a.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeEventId]);

  // Update Event Metadata in DB when it changes IF an event is active
  useEffect(() => {
    if (activeEventId && eventMeta.id) {
        updateEvent(eventMeta);
    }
  }, [eventMeta, activeEventId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Event Access Logic
  const handleJoinEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventError('');
    if (!inputCode.trim()) return;

    const event = await getEventByCode(inputCode);
    if (event) {
      setEventMeta(event);
      setActiveEventId(event.id!);
      sessionStorage.setItem('savedEventCode', event.code);
      
      const attendeesData = await fetchAttendees(event.id!);
      setAttendees(attendeesData);
      
      navigateTo('landing');
    } else {
      setEventError('Evento não encontrado. Verifique o código.');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setEventError('');
    if (!newEvent.code.trim() || !newEvent.eventTitle.trim()) {
      setEventError('Título e Código são obrigatórios.');
      return;
    }

    // Tentar criar - pode falhar se o código já existir
    const createdEvent = await createEvent(newEvent);
    
    if (createdEvent) {
      setEventMeta(createdEvent);
      setActiveEventId(createdEvent.id!);
      sessionStorage.setItem('savedEventCode', createdEvent.code);
      setAttendees([]);
      navigateTo('landing');
    } else {
      setEventError('Erro ao criar evento. Tente usar outro código (pode já existir).');
    }
  };


  const handleRegister = (role: Role) => {
    setSelectedRole(role);
    setInstrumentCounts({});
    setEditingAttendee(null);
    navigateTo('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId || isSubmitting) return;

    const totalCount = Object.values(instrumentCounts).reduce((a, b) => a + b, 0);
    if (totalCount === 0) {
      alert('Selecione pelo menos 1 instrumento.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newAttendees: Attendee[] = [];
      const timestamp = Date.now();

      Object.entries(instrumentCounts).forEach(([instName, count]) => {
        if (count > 0) {
          for (let i = 0; i < count; i++) {
            let role = selectedRole!;
            let ministry = Ministry.NONE;
            let level = Level.MUSICIAN;
            let instrument = instName;

            if (selectedRole === Role.ORGANIST) {
              instrument = 'Órgão';
              if (instName === 'Examinadora') ministry = Ministry.EXAMINADORA;
              else if (instName === 'Instrutora') ministry = Ministry.INSTRUTORA;
              else if (instName === 'Organista') ministry = Ministry.ORGANISTA;
            } else if (selectedRole === Role.MUSICIAN) {
              if (['Ancião', 'Diácono', 'Coop. Ofício', 'Coop. Jovens'].includes(instName)) {
                instrument = 'Não informado';
                if (instName === 'Ancião') ministry = Ministry.ANCIAO;
                else if (instName === 'Diácono') ministry = Ministry.DIACONO;
                else if (instName === 'Coop. Ofício') ministry = Ministry.COOPERADOR_OFICIO;
                else if (instName === 'Coop. Jovens') ministry = Ministry.COOPERADOR_JOVENS;
              } else if (['Enc. Regional', 'Enc. Local', 'Instrutor'].includes(instName)) {
                instrument = 'Não informado';
                if (instName === 'Enc. Regional') level = Level.REGIONAL;
                else if (instName === 'Enc. Local') level = Level.LOCAL;
                else if (instName === 'Instrutor') level = Level.INSTRUCTOR;
              }
            }

            newAttendees.push({
              id: generateId(),
              event_id: activeEventId,
              ministry,
              role,
              instrument,
              level,
              city: "Não Informada",
              timestamp: timestamp + i,
            });
          }
        }
      });

      const success = await addMultipleAttendees(newAttendees);

      if (success) {
        setAttendees(prev => [...newAttendees, ...prev]);
        setShowSuccess(true);
        setInstrumentCounts({});

        setTimeout(() => {
          setShowSuccess(false);
        }, 1500);
      } else {
        alert('Erro ao salvar participante(s). Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearAllData = async () => {
    if (!activeEventId) return;
    if (confirm('ATENÇÃO: Isso apagará TODOS os registros de lista de presença deste evento mas manterá o evento. Deseja continuar?')) {
      await clearAllAttendees(activeEventId);
      setAttendees([]);
    }
  };

  const handleDeleteEvent = async () => {
    if (!activeEventId) return;
    const pass = prompt('Por segurança, digite a senha de Administrador para excluir o evento:');
    if (pass !== 'senha') {
      alert('Senha incorreta. Ação cancelada.');
      return;
    }

    if (confirm('PERIGO: Você está prestes a excluir o EVENTO INTEIRO e todas as suas listas de presença. Esta ação não pode ser desfeita. Tem certeza?')) {
      const success = await deleteEvent(activeEventId);
      if (success) {
        sessionStorage.removeItem('savedEventCode');
        localStorage.removeItem('savedView');
        localStorage.removeItem('savedSelectedRole');
        localStorage.removeItem('savedEditingAttendee');
        setActiveEventId(null);
        setEventMeta(initialMeta);
        setAttendees([]);
        navigateTo('event-selection');
      } else {
        alert('Erro ao excluir evento. Verifique a conexão.');
      }
    }
  };

  const handleAdminDeleteEvent = async (id: string, title: string) => {
    const pass = prompt('Por segurança, digite a senha de Administrador para excluir o evento:');
    if (pass !== 'senha') {
      alert('Senha incorreta. Ação cancelada.');
      return;
    }

    if (confirm(`PERIGO: Você está prestes a excluir definitivamente o evento "${title}" e todas as SUAS LISTAS de presença. Esta ação não pode ser desfeita. Tem certeza?`)) {
      const success = await deleteEvent(id);
      if (success) {
        setAllEvents(allEvents.filter(e => e.id !== id));
        if (activeEventId === id) {
          sessionStorage.removeItem('savedEventCode');
          localStorage.removeItem('savedView');
          localStorage.removeItem('savedSelectedRole');
          localStorage.removeItem('savedEditingAttendee');
          setActiveEventId(null);
          setEventMeta(initialMeta);
          setAttendees([]);
        }
      } else {
        alert('Erro ao excluir evento. Verifique a conexão.');
      }
    }
  };

  const onLoadAllEvents = async () => {
    const events = await fetchAllEvents();
    setAllEvents(events);
    navigateTo('admin-events');
  };

  const handleAdminEnterEvent = async (ev: EventModel) => {
    const code = prompt(`Digite o código do evento "${ev.eventTitle}" para confirmar:`);
    if (!code) return;
    if (code.trim().toUpperCase() !== ev.code.toUpperCase()) {
      alert('Código incorreto. Acesso negado.');
      return;
    }
    setEventMeta(ev);
    setActiveEventId(ev.id!);
    sessionStorage.setItem('savedEventCode', ev.code);
    const attendeesData = await fetchAttendees(ev.id!);
    setAttendees(attendeesData);
    navigateTo('landing');
  };

  const refreshAttendees = async () => {
    if (activeEventId) {
      const attendeesData = await fetchAttendees(activeEventId);
      setAttendees(attendeesData);
    }
  };

  const handleEditAttendee = (attendee: Attendee) => {
    alert("Edição individual desativada neste modo. Para corrigir uma contagem errada, exclua o registro individual na lixeira e adicione um novo.");
  };

  const handleDeleteAttendee = async (id: string) => {
    if (confirm('Deseja realmente excluir este participante?')) {
      const success = await deleteAttendee(id);
      if (success) {
        setAttendees(prev => prev.filter(a => a.id !== id));
      } else {
        alert('Erro ao excluir participante.');
      }
    }
  };

  const filteredCities = BRAZILIAN_CITIES.filter(c =>
    c.toLowerCase().includes(citySearchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium text-lg">Carregando informações do evento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      <style>{`
        .bg-gray-light { background-color: #f7fafc !important; }
        .bg-header-gray { background-color: #edf2f7 !important; }
        .bg-summary-gray { background-color: #f7fafc !important; }
        .border-k { border: 1px solid black !important; }
        .border-k-2 { border: 2px solid black !important; }
        .border-k-double { border: 4px double black !important; }
        * { box-sizing: border-box !important; }
        .print-view { background: white; color: black; font-family: "Inter", sans-serif; margin: 0 auto; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; width: 29.7cm; height: 21cm; overflow: hidden; position: relative; }
        .print-columns-wrapper { display: flex !important; flex-direction: row !important; width: 100% !important; height: 100% !important; background: white; }
        .print-column { flex: 0 0 33.33% !important; height: 100% !important; padding: 0.4cm 0.4cm; display: flex; flex-direction: column; border-right: 0.5pt solid #cbd5e1 !important; position: relative; }
        .print-column:last-child { border-right: none !important; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        th, td { border: 0.5pt solid #1e293b; padding: 2px 4px; font-size: 7.5pt; color: black; line-height: 1.1; }
        th { font-weight: 900; text-align: left; background-color: #f1f5f9; text-transform: uppercase; font-size: 7.5pt; color: #1e293b; }
        .table-header-box { border: 1pt solid #1e293b; font-weight: 900; text-align: center; padding: 4px; margin-bottom: 15px; text-transform: uppercase; font-size: 9pt; tracking: 0.1em; color: #1e293b; }
        .row-even { background-color: #f8fafc; }
        .cell-qty { width: 30px; text-align: center; font-weight: 900; background-color: #f1f5f9; border-left: 1pt solid #1e293b; }
        .section-header { border: 1pt solid #1e293b; font-weight: 1000; text-align: center; padding: 5pt; margin-bottom: 15pt; text-transform: uppercase; font-size: 10pt; letter-spacing: 0.1em; background: white; width: 100%; }
        .qty-cell { width: 35pt; text-align: center; font-weight: 1000; background: #f8fafc; border-left: 1pt solid #1e293b; }
        .row-alt { background: #f8fafc; }
        .col-3-footer { border-top: 1pt solid #1e293b; margin-top: auto; padding-top: 5pt; display: flex; justify-content: space-between; font-size: 7.5pt; font-weight: 1000; text-transform: uppercase; }
        .brand-italic { font-style: italic; font-weight: 500; }
        @media print {
          @page { margin: 0; size: A4 landscape; }
          body { background: white !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-canvas { box-shadow: none !important; border: none !important; margin: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {isOffline && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-2xl text-center space-y-6">
            <div className="text-6xl mb-4 animate-pulse">⚠️</div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sistema Inativo</h2>
            <p className="text-slate-600 font-medium">O banco de dados está temporariamente offline ou pausado por inatividade.</p>
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-sm text-left">
              <strong>Atenção Administrador:</strong> Acesse o painel do Supabase e clique em <b>Restore</b> para reativar o sistema e restabelecer a conexão.
            </div>
            <Button onClick={() => window.location.reload()} variant="primary" className="w-full py-4 rounded-xl text-lg font-bold">
              Tentar Novamente
            </Button>
          </div>
        </div>
      )}

      {view !== 'print' && view !== 'event-selection' && (
        <header className="w-full max-w-4xl px-6 py-8 flex flex-col items-center no-print relative">
          <button 
             onClick={() => {
                sessionStorage.removeItem('savedEventCode');
                localStorage.removeItem('savedView');
                localStorage.removeItem('savedSelectedRole');
                localStorage.removeItem('savedEditingAttendee');
                setActiveEventId(null);
                setEventMeta(initialMeta);
                setAttendees([]);
                navigateTo('event-selection');
             }} 
             className="absolute top-8 left-6 text-slate-400 hover:text-slate-600 font-medium text-sm flex items-center gap-1"
          >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Trocar Evento
          </button>
          
          <div className="bg-white p-3 rounded-full shadow-sm mb-4">
            <span className="text-3xl">🎺</span>
          </div>
          <h1 className="title-font text-3xl font-bold text-slate-800">{eventMeta.eventTitle}</h1>
          <p className="text-slate-500 font-medium bg-slate-200 px-3 py-1 rounded-full text-xs mt-2">Código da Sessão: <strong className="text-indigo-700">{eventMeta.code.toUpperCase()}</strong></p>
        </header>
      )}

      <main className={`w-full ${view === 'print' ? 'max-w-none p-0' : 'max-w-5xl px-4'} mb-20`}>

        {/* EVENT SELECTION VIEW */}
        {view === 'event-selection' && (
           <div className="pt-6 animate-in fade-in zoom-in-95 duration-500 max-w-md mx-auto">
               <div className="flex flex-col items-center mb-6">
                   <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl shadow-xl shadow-indigo-200 mb-4 relative overflow-hidden group">
                       <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                       🎺
                   </div>
                   <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center">Triagem Musical</h1>
               </div>

               <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-400"></div>
                   
                   {!isCreatingEvent ? (
                       <form onSubmit={handleJoinEvent} className="space-y-4">
                           <div className="text-center mb-5">
                               <h2 className="text-xl font-bold text-slate-800">Entrar em um Evento</h2>
                               <p className="text-slate-500 text-xs mt-1">Informe o código fornecido pela equipe</p>
                           </div>
                           
                           {eventError && <div className="bg-red-50 text-red-600 p-2 text-center rounded-xl text-sm font-medium border border-red-100">{eventError}</div>}
                           
                           <div>
                               <input 
                                   type="text" 
                                   value={inputCode}
                                   onChange={e => setInputCode(e.target.value.toUpperCase())}
                                   placeholder="EX: ENSAIO2026"
                                   className="w-full text-center text-xl font-bold uppercase tracking-widest p-3 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                               />
                           </div>
                           <Button type="submit" variant="primary" className="w-full py-3 text-base rounded-xl shadow-lg shadow-indigo-200">
                               Acessar Evento
                           </Button>
                           <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                               <p className="text-xs text-slate-500 mb-2">Administrador?</p>
                               <div className="flex gap-2">
                                 <Button type="button" onClick={() => { setIsCreatingEvent(true); setEventError(''); }} variant="outline" className="flex-1 py-2 text-sm rounded-xl border-dashed">
                                     + Criar Novo
                                 </Button>
                                 <Button type="button" onClick={onLoadAllEvents} variant="outline" className="flex-1 py-2 text-sm rounded-xl border-dashed text-slate-600">
                                     Ver Todos
                                 </Button>
                               </div>
                           </div>
                       </form>
                   ) : (
                       <form onSubmit={handleCreateEvent} className="space-y-4">
                           <div className="flex items-center gap-3 mb-4">
                               <button type="button" onClick={() => { setIsCreatingEvent(false); setEventError(''); }} className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-50 rounded-full hover:bg-indigo-50 transition-colors">
                                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                               </button>
                               <h2 className="text-xl font-bold text-slate-800">Novo Evento</h2>
                           </div>

                           {eventError && <div className="bg-red-50 text-red-600 p-2 text-center rounded-xl text-sm font-medium border border-red-100">{eventError}</div>}
                           
                           <div>
                               <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Título Público</label>
                               <input 
                                   type="text" 
                                   required
                                   value={newEvent.eventTitle}
                                   onChange={e => setNewEvent({...newEvent, eventTitle: e.target.value})}
                                   placeholder="Ensaio Regional - Norte"
                                   className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                               />
                           </div>
                           <div>
                               <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Código de Acesso VIP</label>
                               <div className="relative">
                                  <input 
                                      type="text" 
                                      required
                                      value={newEvent.code}
                                      onChange={e => setNewEvent({...newEvent, code: e.target.value.toUpperCase()})}
                                      placeholder="EX: REGIONAL26"
                                      className="w-full font-bold text-sm tracking-wider uppercase p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none pr-10"
                                  />
                                  <span className="absolute right-3 top-3 text-lg">🔒</span>
                               </div>
                               <p className="text-xs text-slate-400 mt-2 leading-tight">passe este código para os membros de triagem</p>
                           </div>
                           
                           <Button type="submit" variant="secondary" className="w-full py-3 text-base rounded-xl mt-2 shadow-lg shadow-emerald-200">
                               Criar Evento e Entrar
                           </Button>
                       </form>
                   )}
               </div>
           </div>
        )}

        {/* ADMIN EVENTS LIST */}
        {view === 'admin-events' && (
           <div className="pt-6 animate-in fade-in zoom-in-95 duration-500 max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <Button onClick={() => navigateTo('event-selection')} variant="outline" className="px-3 border-slate-300">Voltar</Button>
                <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight text-center">Gerenciar Eventos</h1>
                <div className="w-[70px]"></div>
              </div>

              <div className="space-y-4">
                {allEvents.length === 0 ? (
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center text-slate-500">
                    Nenhum evento criado ainda.
                  </div>
                ) : (
                  allEvents.map(ev => (
                    <div key={ev.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between hover:border-indigo-200 transition-colors">
                      <div className="flex-1 w-full text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-slate-800">{ev.eventTitle}</h3>
                        </div>
                        <p className="text-sm text-slate-500">{ev.date} • {ev.local}</p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button 
                          onClick={() => handleAdminEnterEvent(ev)} 
                          variant="secondary" 
                          className="flex-1 sm:flex-none text-xs py-2 px-4 whitespace-nowrap shadow-sm"
                        >
                          ENTRAR
                        </Button>
                        <Button 
                          onClick={() => handleAdminDeleteEvent(ev.id!, ev.eventTitle)} 
                          variant="danger" 
                          className="flex-1 sm:flex-none text-xs py-2 px-4 whitespace-nowrap shadow-sm bg-rose-600 border-rose-600 text-white hover:bg-rose-700 focus:ring-rose-200"
                        >
                          EXCLUIR
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
           </div>
        )}

        {view === 'landing' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleRegister(Role.MUSICIAN)}
                className="h-36 bg-white border border-indigo-100 rounded-2xl flex flex-col items-center justify-center gap-2.5 hover:border-indigo-400 hover:shadow-lg transition-all group"
              >
                <div className="p-3 bg-indigo-50 rounded-2xl group-hover:bg-indigo-100 transition-colors shadow-sm group-hover:scale-110 duration-300">
                  <span className="text-4xl drop-shadow-sm">🎻</span>
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg text-slate-800">Irmãos</h3>
                  <p className="text-slate-500 text-xs">Músicos</p>
                </div>
              </button>

              <button
                onClick={() => handleRegister(Role.ORGANIST)}
                className="h-36 bg-white border border-emerald-100 rounded-2xl flex flex-col items-center justify-center gap-2.5 hover:border-emerald-400 hover:shadow-lg transition-all group"
              >
                <div className="p-3 bg-emerald-50 rounded-2xl group-hover:bg-emerald-100 transition-colors shadow-sm group-hover:scale-110 duration-300">
                  <span className="text-4xl drop-shadow-sm">🎹</span>
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg text-slate-800">Irmãs</h3>
                  <p className="text-slate-500 text-xs">Organistas</p>
                </div>
              </button>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Painel do Evento</h4>
                <p className="text-xs text-slate-500">{attendees.length} presentes registrados</p>
              </div>
              <Button onClick={() => navigateTo('dashboard')} variant="outline" className="py-1.5 px-3 text-xs">Configurar e Relatórios</Button>
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-lg border border-slate-100 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => navigateTo('landing')} className="text-slate-400 hover:text-indigo-600 bg-slate-50 p-1.5 rounded-lg transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                  {selectedRole === Role.ORGANIST ? 'Registro: Organistas' : 'Registro: Músicos'}
                </h2>
              </div>
            </div>

            {showSuccess && (
              <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg mb-5 text-center font-bold border border-emerald-100 flex items-center justify-center gap-2 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Contagem registrada com sucesso!
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {selectedRole === Role.ORGANIST && (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center gap-2.5">
                    <span className="text-xl drop-shadow-sm">🎹</span>
                    <h3 className="text-base font-extrabold text-slate-800 uppercase tracking-wider">Cargos</h3>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {['Examinadora', 'Instrutora', 'Organista'].map(cargo => (
                      <div key={cargo} className="flex justify-between items-center p-3 px-4 hover:bg-slate-50/50 transition-colors">
                        <span className="font-bold text-slate-700 text-base">{cargo}</span>
                        <div className="flex items-center gap-2 bg-white p-0.5 rounded-lg shadow-sm border border-slate-200">
                          <button type="button" onClick={() => updateCount(cargo, -1)} className="w-8 h-8 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 font-black text-lg flex items-center justify-center">-</button>
                          <span className="w-6 text-center text-base font-black text-slate-800">{instrumentCounts[cargo] || 0}</span>
                          <button type="button" onClick={() => updateCount(cargo, 1)} className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 font-black text-lg flex items-center justify-center">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRole === Role.MUSICIAN && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h3 className="text-base font-extrabold text-[#8BA4C0] uppercase tracking-wider mb-2.5 px-1">Famílias de Instrumentos</h3>
                    {Object.entries(INSTRUMENT_GROUPS).map(([family, instruments], index) => {
                      const familyCount = instruments.reduce((sum, inst) => sum + (instrumentCounts[inst] || 0), 0);
                      const isExpanded = expandedFamily === family;
                      const num = String(index + 1).padStart(2, '0');
                      
                      let svgIcon = null;
                      let subtitle = '';
                      if (family === 'Cordas') {
                        subtitle = 'Violino, Viola, Violoncelo';
                        svgIcon = (
                          <svg className="w-9 h-9 text-[#6482A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 20c-1.5-1-2-2.5-2-4 0-2 1.5-3 1.5-4s-1.5-2-1.5-4c0-1.5.5-3 2-4" />
                            <path d="M13 20c1.5-1 2-2.5 2-4 0-2-1.5-3-1.5-4s1.5-2 1.5-4c0-1.5-.5-3-2-4" />
                            <path d="M12 2v20" />
                            <path d="M9 8h6" />
                          </svg>
                        );
                      } else if (family === 'Madeiras') {
                        subtitle = 'Saxofone, Flauta, Oboé, Fagote';
                        svgIcon = (
                          <svg className="w-9 h-9 text-[#6482A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2l-1 5-2 12-2 3h6l2-3-1-12-2-5z" />
                            <path d="M13 7l2 1" />
                            <path d="M12 11l2 1" />
                            <path d="M11 15l2 1" />
                          </svg>
                        );
                      } else if (family === 'Metais') {
                        subtitle = 'Trompete, Trombone, Tuba';
                        svgIcon = (
                          <svg className="w-9 h-9 text-[#6482A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 10v8" />
                            <path d="M14 10v8" />
                            <path d="M18 10v8" />
                            <path d="M22 6c-1 0-2 2-2 4v4c0 2 1 4 2 4v-12z" />
                            <path d="M4 11v6c0 1 1 2 2 2h8c1 0 2-1 2-2v-6" />
                            <path d="M10 12c-2 0-4-1-6-1v4c2 0 4-1 6-1" />
                          </svg>
                        );
                      }

                      return (
                      <div key={family} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300">
                        <div 
                          onClick={() => setExpandedFamily(prev => prev === family ? null : family)}
                          className={`relative flex flex-col items-center justify-center p-4.5 cursor-pointer transition-colors duration-300 ${isExpanded ? 'bg-[#F4F7F9]/80 border-b border-slate-100' : 'bg-[#F4F7F9] hover:bg-[#EAF0F4]'}`}
                        >
                          <span className="absolute top-6 left-6 text-[#8BA4C0] font-black text-xl">{num}</span>

                          <div className="relative w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-2 shadow-sm border border-white/50 backdrop-blur-sm">
                            {svgIcon}
                            {familyCount > 0 && (
                              <span className="absolute top-0 right-0 bg-[#6482A0] text-white font-black text-[12px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                                {familyCount}
                              </span>
                            )}
                          </div>

                          <div className="w-8 h-0.5 bg-[#D2DEE8] mb-3 rounded-full"></div>

                          <h3 className="text-base font-extrabold text-[#6482A0] uppercase tracking-widest mb-0.5">{family}</h3>
                          <p className="text-[10.5px] font-medium text-[#8BA4C0] text-center max-w-[170px] leading-relaxed">{subtitle}</p>
                        </div>
                        {isExpanded && (
                          <div className="divide-y divide-slate-50 animate-in slide-in-from-top-2 duration-300">
                            {instruments.map(inst => (
                              <div key={inst} className="flex justify-between items-center p-2.5 px-4 hover:bg-slate-50/50 transition-colors">
                                <span className="font-bold text-slate-700 text-base">{inst}</span>
                                <div className="flex items-center gap-2 bg-white p-0.5 rounded-lg shadow-sm border border-slate-200">
                                  <button type="button" onClick={() => updateCount(inst, -1)} className="w-8 h-8 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 font-black text-lg flex items-center justify-center">-</button>
                                  <span className="w-6 text-center text-base font-black text-slate-800">{instrumentCounts[inst] || 0}</span>
                                  <button type="button" onClick={() => updateCount(inst, 1)} className="w-8 h-8 rounded-md bg-[#6482A0]/10 text-[#6482A0] hover:bg-[#6482A0]/20 font-black text-lg flex items-center justify-center">+</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )})}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-base font-extrabold text-[#8BA4C0] uppercase tracking-wider mb-2.5 px-1">Ministério e Cargo</h3>
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300">
                      <div 
                        onClick={() => setExpandedFamily(prev => prev === 'Ministério' ? null : 'Ministério')}
                        className={`relative flex flex-col items-center justify-center p-4.5 cursor-pointer transition-colors duration-300 ${expandedFamily === 'Ministério' ? 'bg-[#F4F7F9]/80 border-b border-slate-100' : 'bg-[#F4F7F9] hover:bg-[#EAF0F4]'}`}
                      >
                        <span className="absolute top-6 left-6 text-[#8BA4C0] font-black text-xl">04</span>

                        {(() => {
                          const count = ['Ancião', 'Diácono', 'Coop. Ofício', 'Coop. Jovens'].reduce((sum, item) => sum + (instrumentCounts[item] || 0), 0);
                          return (
                            <div className="relative w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-2 shadow-sm border border-white/50 backdrop-blur-sm">
                              <svg className="w-9 h-9 text-[#6482A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                              {count > 0 && (
                                <span className="absolute top-0 right-0 bg-[#6482A0] text-white font-black text-[12px] w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                                  {count}
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        <div className="w-8 h-0.5 bg-[#D2DEE8] mb-3 rounded-full"></div>

                        <h3 className="text-base font-extrabold text-[#6482A0] uppercase tracking-widest mb-0.5">Ministério</h3>
                        <p className="text-[10.5px] font-medium text-[#8BA4C0] text-center max-w-[170px] leading-relaxed">Ancião, Diácono, Cooperador</p>
                      </div>
                      {expandedFamily === 'Ministério' && (
                        <div className="divide-y divide-slate-50 animate-in slide-in-from-top-2 duration-300">
                          {['Ancião', 'Diácono', 'Coop. Ofício', 'Coop. Jovens'].map(min => (
                            <div key={min} className="flex justify-between items-center p-2.5 px-4 hover:bg-slate-50/50 transition-colors">
                              <span className="font-bold text-slate-700 text-base">{min}</span>
                              <div className="flex items-center gap-2 bg-white p-0.5 rounded-lg shadow-sm border border-slate-200">
                                <button type="button" onClick={() => updateCount(min, -1)} className="w-8 h-8 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 font-black text-lg flex items-center justify-center">-</button>
                                <span className="w-6 text-center text-base font-black text-slate-800">{instrumentCounts[min] || 0}</span>
                                <button type="button" onClick={() => updateCount(min, 1)} className="w-8 h-8 rounded-md bg-[#6482A0]/10 text-[#6482A0] hover:bg-[#6482A0]/20 font-black text-lg flex items-center justify-center">+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm transition-all duration-300">
                      <div 
                        onClick={() => setExpandedFamily(prev => prev === 'Cargo' ? null : 'Cargo')}
                        className={`relative flex flex-col items-center justify-center p-4.5 cursor-pointer transition-colors duration-300 ${expandedFamily === 'Cargo' ? 'bg-[#F4F7F9]/80 border-b border-slate-100' : 'bg-[#F4F7F9] hover:bg-[#EAF0F4]'}`}
                      >
                        <span className="absolute top-6 left-6 text-[#8BA4C0] font-black text-xl">05</span>

                        {(() => {
                          const count = ['Enc. Regional', 'Enc. Local', 'Instrutor'].reduce((sum, item) => sum + (instrumentCounts[item] || 0), 0);
                          return (
                            <div className="relative w-16 h-16 bg-white/40 rounded-full flex items-center justify-center mb-2 shadow-sm border border-white/50 backdrop-blur-sm">
                              <svg className="w-9 h-9 text-[#6482A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                              {count > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-[#6482A0] text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-white shadow-sm">
                                  {count}
                                </span>
                              )}
                            </div>
                          );
                        })()}

                        <div className="w-8 h-0.5 bg-[#D2DEE8] mb-3 rounded-full"></div>

                        <h3 className="text-base font-extrabold text-[#6482A0] uppercase tracking-widest mb-0.5">Cargo</h3>
                        <p className="text-[10.5px] font-medium text-[#8BA4C0] text-center max-w-[170px] leading-relaxed">Encarregado, Instrutor</p>
                      </div>
                      {expandedFamily === 'Cargo' && (
                        <div className="divide-y divide-slate-50 animate-in slide-in-from-top-2 duration-300">
                          {['Enc. Regional', 'Enc. Local', 'Instrutor'].map(cargo => (
                            <div key={cargo} className="flex justify-between items-center p-2.5 px-4 hover:bg-slate-50/50 transition-colors">
                              <span className="font-bold text-slate-700 text-base">{cargo}</span>
                              <div className="flex items-center gap-2 bg-white p-0.5 rounded-lg shadow-sm border border-slate-200">
                                <button type="button" onClick={() => updateCount(cargo, -1)} className="w-8 h-8 rounded-md bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 font-black text-lg flex items-center justify-center">-</button>
                                <span className="w-6 text-center text-base font-black text-slate-800">{instrumentCounts[cargo] || 0}</span>
                                <button type="button" onClick={() => updateCount(cargo, 1)} className="w-8 h-8 rounded-md bg-[#6482A0]/10 text-[#6482A0] hover:bg-[#6482A0]/20 font-black text-lg flex items-center justify-center">+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 sticky bottom-3 z-10">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || Object.values(instrumentCounts).reduce((a,b)=>a+b,0) === 0} 
                  className="w-full py-3.5 text-base font-extrabold rounded-xl shadow-xl hover:shadow-2xl transition-all" 
                  variant={selectedRole === Role.MUSICIAN ? 'primary' : 'secondary'}
                >
                  {isSubmitting ? 'SALVANDO...' : `SALVAR CONTAGEM (${Object.values(instrumentCounts).reduce((a,b)=>a+b,0)})`}
                </Button>
              </div>
            </form>
          </div>
        )}

        {view === 'dashboard' && (
          <EventDashboard
            attendees={attendees}
            eventMeta={eventMeta}
            onUpdateMeta={setEventMeta}
            onClearData={clearAllData}
            onGenerateReport={() => navigateTo('print')}
            onPrintCities={() => navigateTo('print-cities')}
            onViewCities={() => navigateTo('cities-list')}
            onViewAttendees={() => navigateTo('attendees-list')}
            onDeleteEvent={handleDeleteEvent}
            onBack={() => navigateTo('landing')}
          />
        )}
        
        {view === 'print' && (
          <PrintReport attendees={attendees} eventMeta={eventMeta} onBack={() => navigateTo('dashboard')} />
        )}

        {view === 'print-cities' && (
          <CityPrint attendees={attendees} eventMeta={eventMeta} onBack={() => navigateTo('dashboard')} />
        )}

        {view === 'cities-list' && (
          <CitiesList attendees={attendees} onPrintCities={() => navigateTo('print-cities')} onBack={() => navigateTo('dashboard')} />
        )}

        {view === 'attendees-list' && (
          <AttendeesList attendees={attendees} onEditAttendee={handleEditAttendee} onDeleteAttendee={handleDeleteAttendee} onBack={() => navigateTo('dashboard')} />
        )}
      </main>

      {view !== 'event-selection' && view !== 'landing' && view !== 'print' && (
        <div className="fixed bottom-6 right-6 no-print">
          <Button onClick={() => navigateTo('landing')} className="w-14 h-14 rounded-full flex items-center justify-center p-0 shadow-2xl bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-110 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </Button>
        </div>
      )}
    </div>
  );
};

export default App;
