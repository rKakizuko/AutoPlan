import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.join(__dirname, 'docs', 'screenshots');
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

// Public pages
const publicPages = {
  '/login': 'Login.png',
  '/simulador': 'Simulador.png',
};

// Pages that need authentication
const protectedPages = {
  '/': 'Dashboard.png',
  '/usuarios': 'GerenciarUsuarios.png', 
  '/payment-rules': 'RegrasPagamento.png',
  '/audit-logs': 'LogsAuditoria.png',
  '/minha-conta': 'MinhaConta.png',
};

// Start Vite dev server
function startServer() {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const server = spawn(command, ['run', 'dev'], {
      cwd: path.join(__dirname, 'frontend'),
      stdio: 'pipe',
      shell: true
    });

    let resolved = false;
    server.stdout.on('data', (data) => {
      console.log(`[Server] ${data.toString().trim()}`);
      if (!resolved && (data.toString().includes('5173') || data.toString().includes('Local'))) {
        resolved = true;
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error(`[Server Error] ${data}`);
    });
  });
}

// Try to get real token from backend
async function getRealToken() {
  try {
    console.log('🔐 Tentando login no backend...');
    
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@autoplan.com',
        password: 'AdminPassword123'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Login com credenciais padrão bem-sucedido');
      return { token: data.token, user: data.user };
    }

    // Try alternative credentials
    const response2 = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'Admin123'
      })
    });

    if (response2.ok) {
      const data = await response2.json();
      console.log('✅ Login com credenciais alternativas bem-sucedido');
      return { token: data.token, user: data.user };
    }

    return null;
  } catch (error) {
    console.warn('⚠️  Erro ao conectar no backend:', error.message);
    return null;
  }
}

// Create fake auth data for demo purposes
function createFakeAuth() {
  return {
    token: 'fake_jwt_token_' + Math.random().toString(36).substr(2, 9),
    user: {
      id: '507f1f77bcf86cd799439011',
      email: 'admin@autoplan.com',
      name: 'Administrador',
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  };
}

async function captureScreenshot(page, url, filename) {
  try {
    console.log(`📸 Capturando ${filename}...`);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    }).catch(() => {
      console.warn(`⚠️  Página demorou, capturando mesmo assim...`);
    });

    // Wait for content to render
    await page.waitForTimeout(1500);
    
    // Take screenshot
    const filepath = path.join(DOCS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`✅ Salvo: ${filename}`);
    
  } catch (error) {
    console.error(`❌ Erro ao capturar ${filename}: ${error.message}`);
  }
}

async function captureScreenshots() {
  let browser;
  let server;

  try {
    // Create docs/screenshots directory
    await mkdir(DOCS_DIR, { recursive: true });
    console.log(`📁 Diretório criado: ${DOCS_DIR}`);

    // Start Vite server
    console.log('🚀 Iniciando servidor Vite...');
    server = await startServer();
    
    // Wait for server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Launch browser
    console.log('🌐 Abrindo navegador...');
    browser = await chromium.launch({ headless: true });

    // Capture public pages
    console.log('\n📋 Capturando páginas públicas...');
    let page = await browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });
    
    for (const [route, filename] of Object.entries(publicPages)) {
      const url = `${FRONTEND_URL}${route}`;
      await captureScreenshot(page, url, filename);
    }
    
    await page.close();

    // Try to get real auth or use fake
    console.log('\n🔓 Obtendo autenticação...');
    let auth = await getRealToken();
    
    if (!auth) {
      console.log('⚠️  Backend não disponível, usando autenticação simulada');
      auth = createFakeAuth();
    }

    // Capture protected pages with auth
    console.log('\n🔐 Capturando páginas protegidas...');
    page = await browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });
    
    // Inject auth into localStorage before navigation
    await page.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
    }, auth);

    for (const [route, filename] of Object.entries(protectedPages)) {
      const url = `${FRONTEND_URL}${route}`;
      await captureScreenshot(page, url, filename);
    }

    await page.close();

    console.log(`\n✨ Todos os screenshots salvos em: ${DOCS_DIR}`);
    console.log('📊 Resumo:');
    console.log(`   📋 Páginas públicas: ${Object.keys(publicPages).length}`);
    console.log(`   🔐 Páginas protegidas: ${Object.keys(protectedPages).length}`);
    console.log(`   Total: ${Object.keys(publicPages).length + Object.keys(protectedPages).length}`);

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore
      }
    }
    if (server) {
      try {
        server.kill();
      } catch (e) {
        // Ignore
      }
    }
  }
}

captureScreenshots();
