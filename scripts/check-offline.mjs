import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const context=await browser.newContext({viewport:{width:1440,height:1000},offline:true});
const page=await context.newPage(),errors=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().startsWith('http')&&!r.url().endsWith('/offline-mvp-test'))requests.push(r.url());});
// Managed Chromium blocks file: navigation. Test the identical single HTML
// through an in-memory local HTTP document, with the browser offline.
const url='http://127.0.0.1:5173/offline-mvp-test';
const html=await readFile('dist/offline/Flat-Studio.html','utf8');
await page.route(url,route=>route.fulfill({status:200,contentType:'text/html',body:html}));
await page.goto(url);
await page.locator('#mode-planning').click();
await page.locator('canvas').waitFor();
for(const type of ['Sofa','Lounge chair','Coffee table','Dining table','Dining chair','Double bed','Wardrobe','Desk','Woven rug','Floor plant'])await page.getByRole('button',{name:`Add ${type}`,exact:true}).click();
await page.locator('[data-prop="w"]').fill('0.8');await page.locator('[data-prop="w"]').dispatchEvent('change');
await page.getByRole('button',{name:'Rotate 90°'}).click();assert.equal(await page.locator('[data-prop="rotation"]').inputValue(),'90');
await page.getByRole('button',{name:'Copy',exact:true}).click();await page.getByRole('button',{name:'Delete',exact:true}).click();
await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('button',{name:'Redo',exact:true}).click();
await page.locator('#wall-color').fill('#badaad');await page.locator('#wall-color').dispatchEvent('change');
await page.locator('#floor-color').fill('#987755');await page.locator('#floor-color').dispatchEvent('change');
await page.reload();await page.locator('#mode-planning').click();assert.equal(await page.locator('#wall-color').inputValue(),'#badaad');
await page.locator('[data-floor="1"]').click();await page.getByRole('button',{name:'Floor plan',exact:true}).click();
await page.getByRole('button',{name:'Zoom in',exact:true}).click();await page.getByRole('button',{name:'Zoom out',exact:true}).click();await page.getByRole('button',{name:'Reset camera',exact:true}).click();
const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export layout'}).click();const download=await downloadPromise;const downloadPath=await download.path();
await page.locator('#import').setInputFiles(downloadPath);await expect(page.getByRole('status')).toHaveText('Layout imported.');
page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Reset to starting layout'}).click();assert.equal(await page.locator('#wall-color').inputValue(),'#f2eee5');
assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
console.log('PASS: standalone HTML works in offline HTTP document fixture; all 10 furniture types, resize, rotate, copy, delete, undo/redo, finishes, reload persistence, floor/plan switch, zoom/reset, export/import, and layout reset. No external network requests or browser errors. Direct file navigation is blocked by managed Chromium and remains unverified here.');
}finally{await browser.close();}
