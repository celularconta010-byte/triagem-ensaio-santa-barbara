# Triagem Ensaio Santa Barbara

Aplicativo de registro e triagem para ensaios em Santa Barbara, organizando músicos (irmãos) e organistas (irmãs) de forma eficiente.

## Executar Localmente

**Pré-requisitos:** Node.js

1. Instale as dependências:
   ```
   npm install
   ```
2. Configure as variáveis de ambiente no arquivo `.env.local`:
   - `VITE_SUPABASE_URL` — URL do projeto Supabase
   - `VITE_SUPABASE_ANON_KEY` — Chave anon do projeto Supabase
3. Execute o app:
   ```
   npm run dev
   ```

## Deploy

O app é implantado automaticamente via **Vercel** conectado ao repositório GitHub.
