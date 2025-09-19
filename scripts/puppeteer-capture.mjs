import fs from 'fs';
import puppeteer from 'puppeteer';

(async () => {
  const outLog = '/tmp/preview_console.log';
  const outShot = '/tmp/preview_screenshot.png';
  const url = 'http://localhost:4174/';
  const logStream = fs.createWriteStream(outLog,{flags:'w'});
  try{
    const browser = await puppeteer.launch({args:['--no-sandbox','--disable-setuid-sandbox']});
    const page = await browser.newPage();
    page.on('console', msg=> {
      const text = `[console:${msg.type()}] ${msg.text()}`;
      logStream.write(text + '\n');
      console.log(text);
    });
    page.on('pageerror', err=>{
      const text = `[pageerror] ${err.toString()}`;
      logStream.write(text + '\n');
      console.error(text);
    });
    page.on('requestfailed', req=>{
      const f = req.failure();
      const text = `[requestfailed] ${req.url()} ${f ? (f.errorText||f.errorCode) : ''}`;
      logStream.write(text + '\n');
      console.warn(text);
    });
    const resp = await page.goto(url,{waitUntil:'networkidle2',timeout:30000});
    logStream.write(`[goto] status ${resp ? resp.status() : 'no response'}\n`);
    await page.screenshot({path: outShot, fullPage:true});
    logStream.write(`[screenshot] saved ${outShot}\n`);
    await browser.close();
    logStream.end();
    process.exit(0);
  }catch(e){
    logStream.write('[error] '+e.stack+'\n');
    logStream.end();
    console.error(e);
    process.exit(1);
  }
})();
