const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({headless:true, args:['--allow-file-access-from-files']});
 const context = await browser.newContext({permissions:['clipboard-read','clipboard-write'], acceptDownloads:true});
 const page = await context.newPage();
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 const url='file://'+path.resolve(__dirname,'../app/src/main/assets/index.html');
 await page.goto(url);
 assert.match(await page.locator('#heroClientName').innerText(),/Importe/);
 const fixture={id:'synthetic-1',name:'Pessoa Exemplo',lastSession:'2026-10-01',status:'Ativo',
  driveFolderUrl:'https://drive.google.com/drive/folders/example',dossierUrl:'https://docs.google.com/document/d/example/edit',
  roadmapUrl:'https://docs.google.com/document/d/example2/edit',notebookUrl:'https://notebooklm.google.com',
  briefing:'Resumo fictício',postura:'Acolher',zonasAfeto:['Atenção'],reflexoes:['Conversa sintética'],
  dossier:{quadroReferencia:'x',incongruencia:'x',condicoesValor:'x',climaRelacional:'x',tendenciaAtualizante:'x'}};
 await page.locator('#btnOpenSettings').click();
 await page.locator('#importClients').setInputFiles({name:'clients_data.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([fixture]))});
 assert.equal(await page.locator('#heroClientName').innerText(),fixture.name);
 await page.locator('[data-tab="tab-notes"]').click();
 await page.locator('#clientNotesTextarea').fill('Nota sintética');
 await page.reload();
 assert.equal(await page.locator('#heroClientName').innerText(),fixture.name);
 await page.locator('[data-tab="tab-notes"]').click();
 assert.equal(await page.locator('#clientNotesTextarea').inputValue(),'Nota sintética');
 await page.locator('#btnCopyNotes').click();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),'Nota sintética');
 await page.locator('#btnOpenSettings').click();
 const [download] = await Promise.all([page.waitForEvent('download'),page.locator('#btnExportJson').click()]);
 assert.equal(download.suggestedFilename(),'clients_data.json');
 await page.locator('#btnCloseSettings').click();
 await page.locator('#btnOpenFocus').click();
 assert.equal(await page.locator('#focusClientName').innerText(),fixture.name);
 await page.locator('#btnCloseFocus').click();
 await context.setOffline(true);
 await page.reload();
 assert.equal(await page.locator('#heroClientName').innerText(),fixture.name);
 await page.locator('[data-tab="tab-history"]').click();
 assert.equal(await page.locator('#contentHistoryLinks a').count(),4);
 assert.equal(errors.length,0,errors.join('; '));
 console.log('Browser smoke passed: empty state, import, navigation, notes, clipboard, export, resume/reload, offline, links');
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
