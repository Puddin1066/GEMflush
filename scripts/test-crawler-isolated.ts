
import { webCrawler } from '@/lib/crawler';
import dotenv from 'dotenv';

// Load env vars from multiple potential sources
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function testCrawler() {
  const url = 'https://www.joespizzanyc.com/';
  console.log(`Testing crawler for ${url}...`);
  console.log(`FIRECRAWL_API_KEY present: ${!!process.env.FIRECRAWL_API_KEY}`);
  
  if (process.env.FIRECRAWL_API_KEY) {
    console.log('Key starts with:', process.env.FIRECRAWL_API_KEY.substring(0, 4) + '...');
  }
  
  try {
    const result = await webCrawler.crawl(url);
    console.log('Crawl Result:', {
      success: result.success,
      error: result.error,
      dataName: result.data?.name,
      dataType: result.data ? Object.keys(result.data) : null
    });
  } catch (error) {
    console.error('Unhandled script error:', error);
  }
}

testCrawler();
