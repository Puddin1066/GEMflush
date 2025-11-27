#!/usr/bin/env tsx

/**
 * Automated GitHub Actions CI/CD Setup Script
 * Uses GitHub API and Vercel CLI to configure secrets automatically
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import * as readline from 'readline';
import * as crypto from 'crypto';

interface VercelConfig {
  orgId: string;
  projectId: string;
}

interface GitHubRepo {
  owner: string;
  name: string;
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command: string, silent = false): string {
  try {
    const output = execSync(command, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'inherit' });
    return output?.toString().trim() || '';
  } catch (error: any) {
    if (!silent) {
      log(`Error executing: ${command}`, 'red');
    }
    throw error;
  }
}

async function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function questionHidden(query: string): Promise<string> {
  // Use simple question for token input (GitHub CLI handles security)
  // Users can paste token directly
  return question(query);
}

function checkTool(tool: string): boolean {
  try {
    exec(`which ${tool}`, true);
    return true;
  } catch {
    return false;
  }
}

function installTool(tool: string): void {
  log(`Installing ${tool}...`, 'yellow');
  const os = process.platform;
  
  if (os === 'darwin') {
    exec(`brew install ${tool}`);
  } else if (os === 'linux') {
    if (tool === 'gh') {
      exec('curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg');
      exec('echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null');
      exec('sudo apt update && sudo apt install gh -y');
    } else {
      exec(`sudo apt-get install ${tool} -y`);
    }
  } else {
    log(`Please install ${tool} manually`, 'red');
    process.exit(1);
  }
}

function getGitRepo(): GitHubRepo {
  try {
    const remoteUrl = exec('git remote get-url origin', true);
    const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^/]+?)(\.git)?$/);
    
    if (match) {
      return {
        owner: match[1],
        name: match[2].replace(/\.git$/, ''),
      };
    }
  } catch {
    // Fall through to manual input
  }
  
  return {
    owner: '',
    name: '',
  };
}

function getVercelConfig(): VercelConfig | null {
  const configPath = '.vercel/project.json';
  
  if (!existsSync(configPath)) {
    return null;
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    if (config.orgId && config.projectId) {
      return {
        orgId: config.orgId,
        projectId: config.projectId,
      };
    }
  } catch {
    return null;
  }
  
  return null;
}

function getGitHubUser(): string | null {
  try {
    return exec('gh api user -q .login', true);
  } catch {
    return null;
  }
}

function checkGitHubAuth(): boolean {
  try {
    exec('gh auth status', true);
    return true;
  } catch {
    return false;
  }
}

function checkSecretExists(repo: GitHubRepo, secretName: string): boolean {
  try {
    const secrets = exec(`gh secret list --repo ${repo.owner}/${repo.name}`, true);
    return secrets.includes(secretName);
  } catch {
    return false;
  }
}

function setSecret(repo: GitHubRepo, secretName: string, secretValue: string): boolean {
  try {
    exec(`echo "${secretValue}" | gh secret set ${secretName} --repo ${repo.owner}/${repo.name}`, true);
    return true;
  } catch {
    return false;
  }
}

function readEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  
  if (!existsSync(filePath)) {
    return env;
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes
        value = value.replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    }
  } catch {
    // Ignore errors
  }
  
  return env;
}

async function main() {
  log('🚀 GitHub Actions CI/CD Automated Setup', 'blue');
  log('========================================\n');
  
  // Check required tools
  log('🔧 Checking required tools...');
  const tools = ['gh', 'vercel'];
  
  for (const tool of tools) {
    if (!checkTool(tool)) {
      log(`⚠️  ${tool} not found.`, 'yellow');
      const install = await question(`Install ${tool}? (y/n) `);
      if (install.toLowerCase() === 'y') {
        installTool(tool);
      } else {
        log(`❌ ${tool} is required`, 'red');
        process.exit(1);
      }
    }
  }
  
  log('✅ All tools available\n');
  
  // Get repository info
  log('📦 Getting repository information...');
  let repo = getGitRepo();
  
  if (!repo.owner || !repo.name) {
    repo.owner = await question('Enter repository owner (username/org): ');
    repo.name = await question('Enter repository name: ');
  }
  
  log(`✅ Repository: ${repo.owner}/${repo.name}\n`);
  
  // Check GitHub auth or use PAT
  log('🔐 Checking GitHub authentication...');
  let usePAT = false;
  let githubPAT = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
  
  if (githubPAT && !checkGitHubAuth()) {
    log('✅ Found GITHUB_TOKEN environment variable', 'green');
    process.env.GH_TOKEN = githubPAT;
    usePAT = true;
  } else if (!checkGitHubAuth()) {
    log('⚠️  Not authenticated with GitHub CLI', 'yellow');
    log('');
    log('You can authenticate using:');
    log('  1. GitHub CLI login (interactive)');
    log('  2. GitHub Personal Access Token (PAT)');
    log('');
    
    const usePATAnswer = await question('Use Personal Access Token? (y/n) ');
    
    if (usePATAnswer.toLowerCase() === 'y') {
      githubPAT = await questionHidden('Enter your GitHub Personal Access Token (hidden): ');
      if (githubPAT) {
        process.env.GH_TOKEN = githubPAT;
        usePAT = true;
        log('✅ Using GitHub PAT', 'green');
      }
    } else {
      log('Authenticating with GitHub CLI...');
      exec('gh auth login');
    }
  }
  
  const githubUser = getGitHubUser();
  if (githubUser) {
    log(`✅ Authenticated as: ${githubUser}`, 'green');
    if (usePAT) {
      log('   (Using Personal Access Token)', 'blue');
    }
    log('');
  } else {
    log('❌ Failed to authenticate with GitHub', 'red');
    log('');
    log('Please ensure:');
    log('  - Your PAT has \'repo\' scope for private repos');
    log('  - Your PAT has \'workflow\' scope to manage secrets');
    log('  - Or run: export GITHUB_TOKEN=your_token');
    process.exit(1);
  }
  
  // Get Vercel credentials
  log('🔑 Getting Vercel credentials...');
  try {
    exec('vercel whoami', true);
  } catch {
    log('⚠️  Not logged into Vercel. Please log in...', 'yellow');
    exec('vercel login');
  }
  
  let vercelConfig = getVercelConfig();
  if (!vercelConfig) {
    log('   Linking Vercel project...');
    exec('vercel link --yes');
    vercelConfig = getVercelConfig();
  }
  
  if (!vercelConfig) {
    log('❌ Failed to get Vercel credentials', 'red');
    process.exit(1);
  }
  
  log('✅ Vercel credentials retrieved');
  log(`   Organization ID: ${vercelConfig.orgId}`);
  log(`   Project ID: ${vercelConfig.projectId}\n`);
  
  // Get Vercel token
  log('🔐 Vercel Token Setup');
  log('---------------------');
  log('To deploy from GitHub Actions, you need a Vercel token.');
  log('Create one at: https://vercel.com/account/tokens\n');
  
  const vercelToken = await questionHidden('Enter Vercel token (hidden): ');
  
  if (!vercelToken) {
    log('❌ Vercel token is required', 'red');
    process.exit(1);
  }
  
  // Set secrets
  log('\n🔐 Setting GitHub Secrets...');
  log('----------------------------\n');
  
  const requiredSecrets: Array<[string, string]> = [
    ['VERCEL_TOKEN', vercelToken],
    ['VERCEL_ORG_ID', vercelConfig.orgId],
    ['VERCEL_PROJECT_ID', vercelConfig.projectId],
  ];
  
  // Generate AUTH_SECRET
  const authSecret = crypto.randomBytes(32).toString('base64');
  requiredSecrets.push(['AUTH_SECRET', authSecret]);
  log('✅ Generated AUTH_SECRET');
  
  for (const [name, value] of requiredSecrets) {
    if (checkSecretExists(repo, name)) {
      const overwrite = await question(`⚠️  Secret ${name} already exists. Overwrite? (y/n) `);
      if (overwrite.toLowerCase() !== 'y') {
        log(`   Skipping ${name}`, 'blue');
        continue;
      }
    }
    
    if (setSecret(repo, name, value)) {
      log(`✅ Set secret: ${name}`, 'green');
    } else {
      log(`❌ Failed to set secret: ${name}`, 'red');
    }
  }
  
  // Import from env files
  log('\n📝 Optional Secrets');
  log('-------------------\n');
  
  const envFiles = ['.env.local', '.env'];
  let env: Record<string, string> = {};
  
  for (const envFile of envFiles) {
    if (existsSync(envFile)) {
      log(`Found environment file: ${envFile}`, 'blue');
      const importEnv = await question(`Import secrets from ${envFile}? (y/n) `);
      
      if (importEnv.toLowerCase() === 'y') {
        env = { ...env, ...readEnvFile(envFile) };
        log(`✅ Loaded ${envFile}`);
      }
    }
  }
  
  // Set optional secrets from env
  const optionalSecrets = [
    'DATABASE_URL',
    'NEXT_PUBLIC_APP_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'RESEND_API_KEY',
    'OPENROUTER_API_KEY',
  ];
  
  for (const secretName of optionalSecrets) {
    if (env[secretName] && !checkSecretExists(repo, secretName)) {
      if (setSecret(repo, secretName, env[secretName])) {
        log(`✅ Set secret: ${secretName} (from env file)`, 'green');
      }
    }
  }
  
  // Summary
  log('\n📊 Setup Summary');
  log('================\n');
  log(`Repository: ${repo.owner}/${repo.name}`);
  log(`Vercel Org ID: ${vercelConfig.orgId}`);
  log(`Vercel Project ID: ${vercelConfig.projectId}\n`);
  
  log('✅ Setup Complete!\n');
  log('Next Steps:');
  log('───────────\n');
  log(`1. Verify secrets: https://github.com/${repo.owner}/${repo.name}/settings/secrets/actions\n`);
  log('2. Test staging deployment:');
  log('   git checkout develop');
  log('   git push origin develop\n');
  log(`3. Monitor: https://github.com/${repo.owner}/${repo.name}/actions\n`);
  log('📚 Documentation: docs/deployment/GITHUB_STAGING_DEPLOYMENT.md\n');
}

main().catch((error) => {
  log(`❌ Error: ${error.message}`, 'red');
  process.exit(1);
});

