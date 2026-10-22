import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
let server,url;
test.beforeAll(async()=>{
 const root=resolve('dist');
 server=createServer(async(req,res)=>{try{
   const pathname=new URL(req.url,'http://localhost').pathname;
   if(!pathname.startsWith('/Interior-Design-Studio/')){res.writeHead(404).end();return;}
   const relative=pathname.slice('/Interior-Design-Studio/'.length)||'index.html';
   const file=resolve(root,relative);if(!file.startsWith(root+'/')){res.writeHead(403).end();return;}
   const content=await readFile(file);res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[extname(file)]||'application/octet-stream'}).end(content);
 }catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}/Interior-Design-Studio/`;
});
test.afterAll(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
test('production build loads from the GitHub Pages repository subpath',async({page})=>{
 const errors=[],failures=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
 await page.goto(url);await expect(page.locator('canvas')).toBeVisible();
 await page.getByRole('button',{name:'Add Sofa',exact:true}).click();await expect(page.locator('[data-prop="w"]')).toHaveValue('2.2');
 await page.getByRole('button',{name:'New from video'}).click();await expect(page.locator('dialog')).toBeVisible();
 expect(errors).toEqual([]);expect(failures).toEqual([]);
});
