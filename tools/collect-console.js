#!/usr/bin/env node
// Collect console logs and screenshot from the preview server
import puppeteer from 'puppeteer';
import fs from 'fs';

const url = process.argv[2] || 'http://localhost:4174/';
const outLog = '/tmp/preview_console.log';
const outScreenshot = '/tmp/preview_screenshot.png';

async function run(){
  const browser = await puppeteer.launch({args: ['--no-sandbox','--disable-setuid-sandbox']});
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => {
    try{ logs.push({type:msg.type(),text:msg.text()}); }catch(e){ logs.push({type:'console',text:String(e)}); }
  });
  page.on('pageerror', err => logs.push({type:'pageerror',text:err.stack||String(err)}));
  page.on('error', err => logs.push({type:'error',text:err.stack||String(err)}));

  try{
    await page.goto(url, {waitUntil:'networkidle2', timeout:30000});
    await page.waitForTimeout(1000);
    await page.screenshot({path: outScreenshot, fullPage: true});
  }catch(e){ logs.push({type:'navigation-error',text:String(e)}); }

  fs.writeFileSync(outLog, logs.map(l=>`[${l.type}] ${l.text}`).join('\n'));
  console.log('Wrote logs to', outLog);
  console.log('Wrote screenshot to', outScreenshot);
  await browser.close();
}

run().catch(e=>{ console.error(e); process.exit(1); });
