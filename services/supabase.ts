import { createClient } from '@supabase/supabase-js';
import { Attendee, EventModel } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('ERRO: Variáveis VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas!');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export async function checkSystemStatus(): Promise<{ offline: boolean }> {
    try {
        const { error } = await supabase.from('events').select('id').limit(1);
        if (error) {
            console.error("Status check error:", error);
            const msg = error.message?.toLowerCase() || '';
            const code = error.code || '';
            if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout') || code.startsWith('5')) {
                return { offline: true };
            }
        }
        return { offline: false };
    } catch (err: any) {
        console.error("Status check exception:", err);
        return { offline: true };
    }
}

// Events functions
export async function getEventByCode(code: string): Promise<EventModel | null> {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .ilike('code', code.trim())
        .limit(1)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching event by code:', error);
        return null;
    }
    
    return data || null;
}

export async function fetchAllEvents(): Promise<EventModel[]> {
    const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching all events:', error);
        return [];
    }
    return data || [];
}

export async function createEvent(eventData: Omit<EventModel, 'id' | 'created_at'>): Promise<EventModel | null> {
    const { data, error } = await supabase
        .from('events')
        .insert([{
            ...eventData,
            code: eventData.code.trim().toUpperCase()
        }])
        .select()
        .single();

    if (error) {
        console.error('ERRO Supabase (createEvent):', error.message);
        return null;
    }

    return data;
}

export async function updateEvent(eventData: EventModel): Promise<boolean> {
    const { id, created_at, ...payload } = eventData;
    
    const { error } = await supabase
        .from('events')
        .update({
            ...payload,
            code: payload.code.trim().toUpperCase()
        })
        .eq('id', id);

    if (error) {
        console.error('ERRO Supabase (updateEvent):', error.message);
        return false;
    }

    return true;
}

export async function deleteEvent(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting event:', error);
        return false;
    }
    return true;
}

// Attendees functions
export async function fetchAttendees(eventId: string): Promise<Attendee[]> {
    const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('event_id', eventId)
        .order('timestamp', { ascending: false });

    if (error) {
        console.error('Error fetching attendees:', error);
        return [];
    }

    return data || [];
}

export async function addAttendee(attendee: Attendee): Promise<boolean> {
    const { error } = await supabase
        .from('attendees')
        .insert([attendee]);

    if (error) {
        console.error('ERRO Supabase (addAttendee):', error.message, error.details, error.hint);
        return false;
    }

    return true;
}

export async function updateAttendee(attendee: Attendee): Promise<boolean> {
    const { error } = await supabase
        .from('attendees')
        .update(attendee)
        .eq('id', attendee.id);

    if (error) {
        console.error('ERRO Supabase (updateAttendee):', error.message, error.details, error.hint);
        return false;
    }

    return true;
}

export async function deleteAttendee(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('attendees')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting attendee:', error);
        return false;
    }

    return true;
}

export async function clearAllAttendees(eventId: string): Promise<boolean> {
    const { error } = await supabase
        .from('attendees')
        .delete()
        .eq('event_id', eventId);

    if (error) {
        console.error('Error clearing attendees:', error);
        return false;
    }

    return true;
}
