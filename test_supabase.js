
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manually parse .env.local
const envPath = 'c:/Users/Usuário/OneDrive/Documentos/Aplicativo/triagem/.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing env vars in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log('Testing connection to:', supabaseUrl);
    
    // Test fetch
    const { data, error } = await supabase
        .from('attendees')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching attendees:', error.message);
        console.error('Details:', error.details);
        console.error('Hint:', error.hint);
        console.error('Code:', error.code);
    } else {
        console.log('Successfully fetched attendees. Count:', data.length);
        if (data.length > 0) {
            console.log('Sample data keys:', Object.keys(data[0]));
        }
    }

    // Try a test insert
    const testAttendee = {
        id: '00000000-0000-0000-0000-000000000009', // Unique ID for test
        ministry: 'Ancião',
        role: 'Músico (Irmão)',
        instrument: 'Violino',
        level: 'Músico',
        city: 'Teste de Diagnóstico',
        timestamp: Date.now()
    };

    console.log('Testing insert with sample data:', testAttendee);
    const { error: insertError } = await supabase
        .from('attendees')
        .insert([testAttendee]);

    if (insertError) {
        console.error('Insert error:', insertError.message);
        console.error('Details:', insertError.details);
        console.error('Hint:', insertError.hint);
        console.error('Code:', insertError.code);
    } else {
        console.log('Insert successful!');
        // Clean up
        await supabase.from('attendees').delete().eq('id', testAttendee.id);
        console.log('Test record cleaned up.');
    }
}

test().catch(err => {
    console.error('Fatal error:', err);
});
