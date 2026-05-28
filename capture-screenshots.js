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

const publicPages = {
  '/login': 'Login.png',
  '/simulador': 'Simulador.png',
};

const adminPages = {
  '/users': 'GerenciarUsuarios.png',
  '/payment-rules': 'RegrasPagamento.png',
  '/audit-logs': 'LogsAuditoria.png',
};

const userPages = {
  '/': 'Dashboard.png',
  '/minha-conta': 'MinhaConta.png',
};

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

async function getAdminToken() {
  try {
    console.log('🔐 Attempting admin login...');
    
    let response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@autoplan.com',
        password: 'AdminPassword123'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Admin login successful');
      return { token: data.token, user: data.user };
    }

    // Try alternative credentials
    console.log('🔄 Trying alternative credentials...');
    response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'Admin123'
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Alternative login successful');
      return { token: data.token, user: data.user };
    }

    console.warn('⚠️  Could not login with known credentials');
    return null;
  } catch (error) {
    console.warn('⚠️  Backend not responding or login failed:', error.message);
    return null;
  }
}

async function captureScreenshot(page, url, filename) {
  try {
    console.log(`📸 Capturing ${filename}...`);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: 10000 
    }).catch(() => {
      console.warn(`⚠️  Page took too long, capturing anyway...`);
    });

    await page.waitForTimeout(1500);
    
    const filepath = path.join(DOCS_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`✅ Saved: ${filename}`);
    
  } catch (error) {
    console.error(`❌ Error capturing ${filename}: ${error.message}`);
  }
}

async function captureScreenshots() {
  let browser;
  let server;

  try {
    // Create docs/screenshots directory
    await mkdir(DOCS_DIR, { recursive: true });
    console.log(`📁 Created directory: ${DOCS_DIR}`);

    // Start Vite server
    console.log('🚀 Starting Vite development server...');
    server = await startServer();
    
    // Wait for server to be fully ready
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({ headless: true });

    // Capture public pages
    console.log('\n📋 Capturing public pages...');
    let page = await browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });
    
    for (const [route, filename] of Object.entries(publicPages)) {
      const url = `${FRONTEND_URL}${route}`;
      await captureScreenshot(page, url, filename);
    }
    
    await page.close();

    // Get admin token for protected pages
    console.log('\n🔓 Attempting to get authentication token...');
    const adminAuth = await getAdminToken();

    if (adminAuth) {
      // Capture admin pages
      console.log('\n👨‍💼 Capturing admin pages...');
      page = await browser.newPage({
        viewport: { width: 1920, height: 1080 }
      });
      
      // Set auth in localStorage
      await page.context().addInitScript((auth) => {
        localStorage.setItem('token', auth.token);
        localStorage.setItem('user', JSON.stringify(auth.user));
      }, adminAuth);

      for (const [route, filename] of Object.entries(adminPages)) {
        const url = `${FRONTEND_URL}${route}`;
        await captureScreenshot(page, url, filename);
      }
      
      // Capture user pages with admin token
      console.log('\n👤 Capturing user pages (with admin token)...');
      for (const [route, filename] of Object.entries(userPages)) {
        const url = `${FRONTEND_URL}${route}`;
        await captureScreenshot(page, url, filename);
      }

      await page.close();
    } else {
      console.log('\n⚠️  Backend not available. Attempting to capture user pages without auth...');
      page = await browser.newPage({
        viewport: { width: 1920, height: 1080 }
      });

      for (const [route, filename] of Object.entries(userPages)) {
        const url = `${FRONTEND_URL}${route}`;
        await captureScreenshot(page, url, filename);
      }

      await page.close();
    }

    console.log(`\n✨ All screenshots saved to: ${DOCS_DIR}`);
    console.log('📸 Total screenshots captured:');
    console.log(`   - Public pages: ${Object.keys(publicPages).length}`);
    console.log(`   - User pages: ${Object.keys(userPages).length}`);
    console.log(`   - Admin pages: ${adminAuth ? Object.keys(adminPages).length : '0 (no auth)'}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    if (server) {
      try {
        server.kill();
      } catch (e) {
        // Ignore kill errors
      }
    }
  }
}

captureScreenshots();
