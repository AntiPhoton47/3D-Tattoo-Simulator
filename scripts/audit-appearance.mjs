import { chromium } from 'playwright';

const url=process.env.INK_ATLAS_URL||'http://127.0.0.1:8765/',browser=await chromium.launch({headless:true}),failures=[],summaries=[];
for(const modelType of ['male','female']){
  const page=await browser.newPage({viewport:{width:1280,height:900}}),runtimeErrors=[];
  page.on('pageerror',error=>runtimeErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')runtimeErrors.push(message.text());});
  await page.addInitScript(type=>{localStorage.clear();localStorage.setItem('inkAtlas_body_model',type);},modelType);
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>/vertices/.test(document.querySelector('#modelStatus')?.textContent||''),null,{timeout:30000});
  const catalog=await page.evaluate(()=>window.InkAtlasV7Bridge.appearanceCatalog.map(({id,name,category})=>({id,name,category})));
  const categoryCounts={};
  for(const item of catalog){
    const result=await page.evaluate(async id=>{const bridge=window.InkAtlasV7Bridge;await bridge.equipAppearanceAsset(id);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));const stats=bridge.appearanceAssetStats(id);bridge.removeAppearanceAsset(id);return stats;},item.id);
    categoryCounts[item.category]=(categoryCounts[item.category]||0)+1;
    const values=result?[...result.min,...result.max]:[],bounded=result&&result.min[0]>-6&&result.max[0]<6&&result.min[1]>-4.5&&result.max[1]<5.5&&result.min[2]>-3&&result.max[2]<3,headCategory=['Eyes','Eyebrows','Eyelashes','Eyewear','Facial hair','Hair','Hats'].includes(item.category),headPlaced=!headCategory||(result.max[1]>2.2&&result.min[1]>-1.25),toesPlaced=item.category!=='Toe nails'||result.max[1]<-2.65;
    if(!result||!result.finite||!values.every(Number.isFinite)||!bounded||!headPlaced||!toesPlaced)failures.push({modelType,...item,result,checks:{bounded,headPlaced,toesPlaced}});
  }
  summaries.push({modelType,assets:catalog.length,categoryCounts,runtimeErrors});
  await page.close();
}
await browser.close();
console.log(JSON.stringify({summaries,failures},null,2));
if(failures.length||summaries.some(summary=>summary.runtimeErrors.length))process.exitCode=1;
