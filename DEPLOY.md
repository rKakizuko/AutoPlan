# Deploy do AutoPlan

Este projeto tem duas partes separadas:

- Frontend React + Vite: pode ir para GitHub Pages.
- Backend Node.js + Express: precisa de um host próprio, como Render, Railway ou Fly.io.

## 1. Backend

Use MongoDB Atlas ou outro MongoDB acessível pela internet.

Variáveis necessárias:

- `MONGODB_URI`
- `JWT_SECRET`
- `PORT`  
  Se o host definir a porta automaticamente, mantenha o valor fornecido pela plataforma.
- `FRONTEND_URLS`  
  Exemplo: `https://rKakizuko.github.io`

Passos no Render:

1. Crie um novo Web Service.
2. Aponte para a pasta `backend`.
3. Build command: `npm install`
4. Start command: `npm start`
5. Configure as variáveis acima.

Depois de publicar, anote a URL pública do backend, por exemplo:

- `https://autoplan-backend.onrender.com`

## 2. Frontend

O frontend já está preparado para GitHub Pages com `HashRouter` e base relativa do Vite.

Antes de publicar, defina a variável:

- `VITE_API_URL`  
  Exemplo: `https://autoplan-backend.onrender.com`

### GitHub Pages com Actions

1. Abra o repositório no GitHub.
2. Vá em Settings > Pages.
3. Em Build and deployment, escolha GitHub Actions.
4. Faça push na branch `main`.
5. O workflow em `.github/workflows/deploy-frontend.yml` vai gerar e publicar o site.

## 3. URLs finais

Depois do deploy, você terá algo assim:

- Frontend: `https://rKakizuko.github.io/AutoPlan` ou URL equivalente do Pages.
- Backend: `https://autoplan-backend.onrender.com`

## 4. Validação local

Frontend:

```bash
cd frontend
npm install
npm run build
```

Backend:

```bash
cd backend
npm install
npm start
```

## 5. Observações importantes

- O frontend não funciona no GitHub Pages sem backend público, porque ele depende da API.
- O backend precisa permitir a origem do frontend via `FRONTEND_URL` ou `FRONTEND_URLS`.
- Se mudar a URL do backend, atualize o secret `VITE_API_URL` no GitHub.