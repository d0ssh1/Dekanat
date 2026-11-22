import { chromium } from '@playwright/test';
import { login } from '../tests/e2e/helpers';
const S='C:/Users/F5E1~1/AppData/Local/Temp/claude/22bbf5bceba6a737/c8eef7ff-d42e-40d1-b02d-d47f16088ac9/scratchpad/qa/';
const NOW='now=2026-11-26T11:44:00%2B10:00';
(async()=>{
 const b=await chromium.launch();
 for (const [tag,w,h] of [['m',390,844],['d',1280,860],['s',360,800]] as const){
  const ctx=await b.newContext({baseURL:'http://localhost:3000',locale:'ru-RU',timezoneId:'Asia/Vladivostok',viewport:{width:w,height:h}});
  const p=await ctx.newPage();
  p.on('console',m=>{if(m.type()==='error')console.log(`[${tag}] CONSOLE`,p.url(),m.text().slice(0,200))});
  p.on('response',r=>{if(r.status()>=500)console.log(`[${tag}] 500`,r.url())});
  if(tag!=='s'){
   await p.goto('/login'); await p.screenshot({path:S+tag+'-login.png'});
   await p.getByLabel('Логин или почта').fill('alina.vorontsova');
   await p.getByLabel('Пароль',{exact:true}).fill('wrong-pass-x');
   await p.getByRole('button',{name:'Войти'}).click(); await p.waitForTimeout(1500);
   console.log(tag,'BADPW:',(await p.locator('[role=alert],form').first().innerText()).replace(/\s+/g,' ').slice(0,200));
   await p.screenshot({path:S+tag+'-badpw.png'});
  }
  await login(p,'student1');
  for (const path of ['/','/week','/study','/documents','/notifications','/profile','/assistant']){
   await p.goto(path+'?'+NOW); await p.waitForTimeout(1200);
   const sw=await p.evaluate(()=>document.documentElement.scrollWidth);
   console.log(tag,path,'scrollW',sw, sw>w?'OVERFLOW':'');
   if(tag!=='s'){ await p.screenshot({path:S+tag+path.replace(/\//g,'_')+'.png',fullPage:true});
    if(tag==='d') console.log(path,'BTNS:',(await p.getByRole('button').allInnerTexts()).map(s=>s.replace(/\s+/g,' ').slice(0,30)).join(' | ').slice(0,900));
    if(tag==='d') console.log(path,'LINKS:',(await p.locator('a').evaluateAll(a=>a.map(x=>(x as HTMLAnchorElement).getAttribute('href')))).join(' ').slice(0,600));
   }
  }
  await ctx.close();
 }
 await b.close();
})();
