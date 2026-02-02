# mackflow-bridge

API bridge Node.js + TypeScript (Express) com conectores Cabme e Z-API Z-Pro.

## Requisitos
- Node.js 18+

## Configuração
1. Copie o arquivo .env.example para .env e preencha os valores.
2. Instale dependências: npm install

## Executar em desenvolvimento (Cloudflare Workers)
1. Copie .dev.vars.example para .dev.vars e preencha os valores.
2. Execute: npm run dev

## Build e deploy (Cloudflare)
npm run build
npm run deploy

## Endpoints
- GET /health
- GET /admin/smoke
- POST /triage
- POST /zpro/incoming

## Observações (Cabme + deduplicação)
- Para abrir OS no Cabme, configure CABME_CREATE_OS_PATH com o endpoint correto de criação (ex: v1/ride-book/).
- Ajuste os defaults obrigatórios do Cabme (user_id e coordenadas) via variáveis CABME_DEFAULT_*. 
- Configure o KV EVENT_DEDUP no Cloudflare e atualize os IDs em wrangler.jsonc (usado para deduplicação e sessão do triage).
- POST /triage
- POST /zpro/incoming

## Segurança
- Para proteger /admin/smoke, configure ADMIN_KEY e envie o header x-admin-key.
