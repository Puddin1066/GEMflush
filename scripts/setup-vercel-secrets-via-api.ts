#!/usr/bin/env tsx

/**
 * Setup GitHub Secrets for Vercel Deployment using Vercel API
 * This script uses Vercel API to automatically get project/org info
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

interface VercelProject {
  id: string;
  name: string;
  accountId: string;
}

interface VercelUser {
  id: string;
  username: string;
}

function log(message: string, color: string = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function readEnvFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return {};
  
  const env: Record<string, string> = {};
  const content = fs.readFileSync(envPath, 'utf-8');
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  });
  
  return env;
}

function readProjectJson(): { orgId?: string; projectId?: string; projectName?: string } | null {
  const projectPath = path.join(process.cwd(), '.vercel', 'project.json');
  if (!fs.existsSync(projectPath)) return null;
  
  try {
    return JSON.parse(fs.readFileSync(projectPath, 'utf-8'));
  } catch {
    return null;
  }
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function fetchVercelAPI<T>(endpoint: string, token: string): Promise<T> {
  const response = await fetch(`https://api.vercel.com${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Vercel API error: ${response.status} - ${error}`);
  }
  
  return response.json() as Promise<T>;
}

async function getVercelToken(): Promise<string> {
  const env = readEnvFile();
  let token = env.VERCEL_TOKEN;
  
  if (!token) {
    log('\n⚠️  VERCEL_TOKEN not found in .env', YELLOW);
    log('Get it from: https://vercel.com/account/tokens\n');
    token = await prompt('Enter VERCEL_TOKEN: ');
  }
  
  if (!token) {
    log('❌ VERCEL_TOKEN is required', RED);
    process.exit(1);
  }
  
  return token;
}

async function verifyToken(token: string): Promise<VercelUser> {
  log('📡 Verifying Vercel token...', BLUE);
  
  try {
    const user = await fetchVercelAPI<VercelUser>('/v2/user', token);
    log(`✅ Authenticated as: ${user.username || user.id}\n`, GREEN);
    return user;
  } catch (error) {
    log(`❌ Invalid VERCEL_TOKEN: ${error}`, RED);
    process.exit(1);
  }
}

async function getProjects(token: string): Promise<VercelProject[]> {
  log('📡 Fetching projects from Vercel API...', BLUE);
  
  try {
    const response = await fetchVercelAPI<{ projects: VercelProject[] }>('/v9/projects?limit=100', token);
    return response.projects || [];
  } catch (error) {
    log(`⚠️  Could not fetch projects: ${error}`, YELLOW);
    return [];
  }
}

async function getProjectDetails(token: string, projectId: string): Promise<VercelProject | null> {
  try {
    return await fetchVercelAPI<VercelProject>(`/v9/projects/${projectId}`, token);
  } catch {
    return null;
  }
}

function checkGitHubCLI(): void {
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch {
    log('❌ GitHub CLI not found', RED);
    log('Install it: https://cli.github.com/');
    process.exit(1);
  }
  
  try {
    execSync('gh auth status', { stdio: 'ignore' });
  } catch {
    log('⚠️  Not authenticated with GitHub CLI', YELLOW);
    log('Run: gh auth login');
    process.exit(1);
  }
  
  log('✅ GitHub CLI authenticated\n', GREEN);
}

function setGitHubSecret(name: string, value: string): void {
  try {
    execSync(`gh secret set ${name} --body "${value}"`, { stdio: 'pipe' });
    log(`✅ ${name} set`, GREEN);
  } catch (error) {
    log(`⚠️  Failed to set ${name}`, YELLOW);
    console.error(error);
  }
}

async function main() {
  log('🔐 GitHub Secrets Setup via Vercel API', BLUE);
  log('======================================\n');
  
  // Check GitHub CLI
  checkGitHubCLI();
  
  // Get Vercel token
  const token = await getVercelToken();
  
  // Verify token
  await verifyToken(token);
  
  // Check for local project.json
  const projectJson = readProjectJson();
  let orgId = projectJson?.orgId;
  let projectId = projectJson?.projectId;
  let projectName = projectJson?.projectName;
  
  if (projectId && orgId) {
    log('✅ Found .vercel/project.json', GREEN);
    log(`  Org ID: ${orgId}`);
    log(`  Project ID: ${projectId}`);
    log(`  Project Name: ${projectName || 'N/A'}\n`);
  } else {
    log('⚠️  Project not linked locally', YELLOW);
    log('Attempting to find project via API...\n');
    
    // Get projects from API
    const projects = await getProjects(token);
    
    if (projects.length === 0) {
      log('❌ No projects found', RED);
      log('Create a project in Vercel first: https://vercel.com/new');
      process.exit(1);
    }
    
    log(`Found ${projects.length} project(s):`);
    projects.slice(0, 10).forEach((p, i) => {
      log(`  ${i + 1}. ${p.name} (${p.id})`);
    });
    log('');
    
    // Try to auto-detect based on directory name
    const currentDir = path.basename(process.cwd());
    const detected = projects.find(p => 
      p.name.toLowerCase() === currentDir.toLowerCase() ||
      p.name.toLowerCase().includes(currentDir.toLowerCase())
    );
    
    if (detected) {
      log(`Auto-detected project: ${detected.name}`, BLUE);
      projectId = detected.id;
      orgId = detected.accountId;
      projectName = detected.name;
    } else {
      const answer = await prompt('Enter project name (or press Enter to use first project): ');
      
      if (answer) {
        const selected = projects.find(p => 
          p.name.toLowerCase() === answer.toLowerCase()
        );
        if (selected) {
          projectId = selected.id;
          orgId = selected.accountId;
          projectName = selected.name;
        } else {
          log('⚠️  Project not found, using first project', YELLOW);
          const first = projects[0];
          projectId = first.id;
          orgId = first.accountId;
          projectName = first.name;
        }
      } else {
        const first = projects[0];
        projectId = first.id;
        orgId = first.accountId;
        projectName = first.name;
      }
    }
  }
  
  // Verify project
  if (projectId) {
    log('Verifying project via API...', BLUE);
    const project = await getProjectDetails(token, projectId);
    
    if (!project) {
      log('❌ Project not found or access denied', RED);
      process.exit(1);
    }
    
    if (!orgId) {
      orgId = project.accountId;
    }
    projectName = project.name;
    
    log(`✅ Project verified: ${projectName}\n`, GREEN);
  }
  
  // Summary
  log('📋 Summary:', BLUE);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`  VERCEL_TOKEN: ${token.substring(0, 10)}...`);
  log(`  VERCEL_ORG_ID: ${orgId}`);
  log(`  VERCEL_PROJECT_ID: ${projectId}`);
  log(`  Project Name: ${projectName || 'N/A'}\n`);
  
  // Confirm
  const confirm = await prompt('Set these as GitHub secrets? (y/n) ');
  if (confirm.toLowerCase() !== 'y') {
    log('Cancelled.');
    process.exit(0);
  }
  
  log('\n📤 Setting GitHub Secrets...\n', BLUE);
  
  // Set secrets
  setGitHubSecret('VERCEL_TOKEN', token);
  if (orgId) setGitHubSecret('VERCEL_ORG_ID', orgId);
  if (projectId) setGitHubSecret('VERCEL_PROJECT_ID', projectId);
  
  log('\n✅ All secrets set successfully!\n', GREEN);
  log('📋 Next steps:');
  log('  1. Push to main branch to trigger deployment');
  log('  2. Check GitHub Actions: https://github.com/Puddin1066/GEMflush/actions');
  log('  3. Monitor deployment in Vercel dashboard\n');
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}`, RED);
  process.exit(1);
});

