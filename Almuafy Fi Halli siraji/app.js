/* Faraid calculator. Fractions are exact until currency display. See ENGINE_SCOPE below. */
(() => {
  'use strict';
  const HEIRS = [
    ['husband','স্বামী','Husband'],['wife','স্ত্রী','Wife (একাধিক হলে সংখ্যা দিন)'],['son','পুত্র','Son'],['daughter','কন্যা','Daughter'],
    ['father','পিতা','Father'],['mother','মাতা','Mother'],['grandfather','দাদা (পিতামহ)','Paternal grandfather'],
    ['paternalGrandmother','দাদি (পিতামহী)','Paternal grandmother'],['maternalGrandmother','নানি (মাতামহী)','Maternal grandmother'],
    ['fullBrother','সহোদর ভাই','Full brother'],['fullSister','সহোদর বোন','Full sister'],['paternalBrother','বৈমাত্রেয় ভাই','Paternal brother'],['paternalSister','বৈমাত্রেয় বোন','Paternal sister'],
    ['maternalBrother','বৈপিত্রেয় ভাই','Maternal brother'],['maternalSister','বৈপিত্রেয় বোন','Maternal sister'],
    ['sonsSon','পুত্রের পুত্র','Son’s son'],['sonsDaughter','পুত্রের কন্যা','Son’s daughter']
  ];
  const names = Object.fromEntries(HEIRS.map(([k,b,e]) => [k,{bn:b,en:e}]));
  const F = (n,d=1) => ({n:BigInt(n),d:BigInt(d)});
  const gcd=(a,b)=>b===0n?(a<0n?-a:a):gcd(b,a%b);
  const norm=x=>{if(x.d===0n)throw Error('শূন্য হর');let n=x.n,d=x.d;if(d<0n){n=-n;d=-d}const g=gcd(n,d)||1n;return {n:n/g,d:d/g}};
  const add=(a,b)=>norm(F(a.n*b.d+b.n*a.d,a.d*b.d));
  const sub=(a,b)=>norm(F(a.n*b.d-b.n*a.d,a.d*b.d));
  const mul=(a,b)=>norm(F(a.n*b.n,a.d*b.d));
  const div=(a,b)=>norm(F(a.n*b.d,a.d*b.n));
  const cmp=(a,b)=>a.n*b.d-b.n*a.d;
  const str=x=>{x=norm(x);return `${x.n}/${x.d}`};
  const val=x=>Number(x.n)/Number(x.d);
  const ZERO=F(0), ONE=F(1);
  const active=(h,k)=>h[k]||0;
  const totalCount=(h,keys)=>keys.reduce((n,k)=>n+active(h,k),0);
  const descKeys=['son','daughter','sonsSon','sonsDaughter'];

  function validate(input) {
    const h={}; for(const [k] of HEIRS){const raw=input[k]??0;const n=Number(raw);if(!Number.isInteger(n)||n<0)throw Error(`${names[k].bn}: সংখ্যা শূন্য বা ধনাত্মক পূর্ণসংখ্যা হতে হবে।`);h[k]=n;}
    for(const k of ['husband','father','mother','grandfather','paternalGrandmother','maternalGrandmother']) if(h[k]>1)throw Error(`${names[k].bn}: সর্বোচ্চ ১ জন নির্বাচন করা যাবে।`);
    if(h.wife>4)throw Error('স্ত্রীর সংখ্যা ৪ জনের বেশি হতে পারে না।');
    if(h.husband&&h.wife)throw Error('একই হিসাবে স্বামী ও স্ত্রী দুজনই নির্বাচন করা যাবে না।');
    if(totalCount(h,Object.keys(h))===0)throw Error('অন্তত একজন জীবিত ওয়ারিশ নির্বাচন করুন।');
    return h;
  }
  const ENGINE_SCOPE = 'Implements common Hanafi cases for the listed heir categories; does not model multiple ascendant generations, unborn/missing heirs, disputed grandfather-with-siblings settlement, special akdariyya/mushtaraka cases, or madhhab-specific edge cases. Verify uncommon cases with a qualified mufti.';

  function calculate(input) {
    const h=validate(input), blocked=new Set(), reason={}, shares={}, parts={}, alive=k=>h[k]>0;
    const hasDesc=descKeys.some(alive), hasMaleDesc=alive('son')||alive('sonsSon'), femaleDesc=alive('daughter')||alive('sonsDaughter');
    const siblingKeys=['fullBrother','fullSister','paternalBrother','paternalSister','maternalBrother','maternalSister'];
    const siblings=totalCount(h,siblingKeys);
    // Hijab: nearer descendants/ascendants exclude the listed remoter heirs.
    if(alive('father')) blocked.add('grandfather');
    if(alive('mother')) {blocked.add('paternalGrandmother');blocked.add('maternalGrandmother')}
    if(alive('father')) blocked.add('paternalGrandmother');
    if(hasDesc||alive('father')||alive('grandfather')){for(const k of ['maternalBrother','maternalSister'])blocked.add(k)}
    if(hasMaleDesc||alive('father')||alive('grandfather')){for(const k of ['fullBrother','fullSister','paternalBrother','paternalSister'])blocked.add(k)}
    if(alive('son')){blocked.add('sonsSon');blocked.add('sonsDaughter')}
    if(alive('fullBrother')){blocked.add('paternalBrother');blocked.add('paternalSister')}
    if(alive('paternalBrother')) blocked.add('paternalSister');
    if(h.fullSister>=2)blocked.add('paternalSister');
    if(femaleDesc&&alive('fullSister')){blocked.add('paternalBrother');blocked.add('paternalSister')}
    // Two or more daughters take the son's-daughter completion share away absent a lower male descendant.
    if(!hasMaleDesc&&h.daughter>=2) blocked.add('sonsDaughter');
    // A full sister alongside one daughter is residuary with her; daughters otherwise can block paternal sisters.
    if(!hasMaleDesc&&h.daughter>=2&&alive('fullSister')) blocked.add('paternalSister');
    for(const k of blocked) if(alive(k)) reason[k]='নিকটতর ওয়ারিশের কারণে মাহজুব (বঞ্চিত)।';
    const eligible=k=>alive(k)&&!blocked.has(k);
    const put=(k,x,why)=>{if(eligible(k)){shares[k]=add(shares[k]||ZERO,x);(parts[k]??=[]).push({fraction:x,reason:why})}};

    if(eligible('husband')) put('husband',hasDesc?F(1,4):F(1,2),hasDesc?'সন্তান/নিম্নগামী বংশধর থাকায় ১/৪':'সন্তান/নিম্নগামী বংশধর না থাকায় ১/২');
    if(eligible('wife')) put('wife',hasDesc?F(1,8):F(1,4),hasDesc?'সন্তান/নিম্নগামী বংশধর থাকায় ১/৮':'সন্তান/নিম্নগামী বংশধর না থাকায় ১/৪');
    if(eligible('mother')) { const umari=alive('father')&&!hasDesc&&siblings<2&&(alive('husband')||alive('wife'));const spouseShare=alive('husband')?F(1,2):F(1,4);const six=hasDesc||siblings>=2;const share=umari?div(sub(ONE,spouseShare),F(3)):six?F(1,6):F(1,3);put('mother',share,umari?'স্বামী/স্ত্রী ও পিতা-মাতার উমারিয়্যাহ: দাম্পত্য অংশ বাদে অবশিষ্টের ১/৩':six?'সন্তান বা দুই/ততোধিক ভাইবোন থাকায় ১/৬':'সন্তান ও দুই/ততোধিক ভাইবোন না থাকায় ১/৩'); }
    if(eligible('paternalGrandmother')) put('paternalGrandmother',F(1,6),'মাতা অনুপস্থিত থাকায় দাদি ১/৬');
    if(eligible('maternalGrandmother')) put('maternalGrandmother',F(1,6),'মাতা অনুপস্থিত থাকায় নানি ১/৬');
    // Grandmothers share one sixth together where both qualify.
    if(eligible('paternalGrandmother')&&eligible('maternalGrandmother')){shares.paternalGrandmother=F(1,12);shares.maternalGrandmother=F(1,12);parts.paternalGrandmother=[{fraction:F(1,12),reason:'দাদি ও নানি একত্রে ১/৬ ভাগ করেন'}];parts.maternalGrandmother=[{fraction:F(1,12),reason:'দাদি ও নানি একত্রে ১/৬ ভাগ করেন'}]}
    if(eligible('father')&&hasDesc) put('father',F(1,6),'পুত্র/পুত্রের পুত্র থাকায় পিতা ১/৬');
    if(eligible('grandfather')&&hasDesc) put('grandfather',F(1,6),'পুত্র/পুত্রের পুত্র থাকায় দাদা ১/৬');
    if(eligible('daughter')&&!alive('son')) put('daughter',h.daughter===1?F(1,2):F(2,3),h.daughter===1?'এক কন্যা ১/২':'দুই বা ততোধিক কন্যা সম্মিলিতভাবে ২/৩');
    if(eligible('sonsDaughter')&&!hasMaleDesc) {
      if(h.daughter===1)put('sonsDaughter',F(1,6),'এক কন্যার সাথে সম্পূরক হিসেবে পুত্রের কন্যা ১/৬');
      else if(h.daughter===0)put('sonsDaughter',F(1,2),'একজন পুত্রের কন্যা ১/২');
      // Multiple granddaughters receive 2/3 only with no daughters.
      if(h.daughter===0&&h.sonsDaughter>1){shares.sonsDaughter=F(2,3);parts.sonsDaughter=[{fraction:F(2,3),reason:'দুই বা ততোধিক পুত্রের কন্যা সম্মিলিতভাবে ২/৩'}]}
    }
    const maternalN=totalCount(h,['maternalBrother','maternalSister']);
    if(!hasDesc&&!alive('father')&&!alive('grandfather')&&maternalN){const pool=maternalN===1?F(1,6):F(1,3);for(const k of ['maternalBrother','maternalSister'])if(eligible(k))put(k,div(mul(pool,F(h[k])),F(maternalN)),maternalN===1?'এক বৈপিত্রেয় ভাই/বোন ১/৬':'বৈপিত্রেয় ভাইবোন ১/৩ সমানভাবে ভাগ করেন');}
    // Full and paternal sisters may inherit fixed shares when no male sibling makes them residuaries.
    if(!hasDesc&&!alive('father')&&!alive('grandfather')&&!alive('fullBrother')&&eligible('fullSister')){
      put('fullSister',h.fullSister===1?F(1,2):F(2,3),h.fullSister===1?'এক সহোদর বোন ১/２':'দুই বা ততোধিক সহোদর বোন সম্মিলিতভাবে ２/３');
    }
    const fullSisterN=eligible('fullSister')?h.fullSister:0;
    const paternalSistersCanInherit=!alive('fullBrother')&&!alive('fullSister')&&!alive('paternalBrother')&&!hasDesc&&!alive('father')&&!alive('grandfather')&&eligible('paternalSister');
    const paternalSistersComplete=!alive('fullBrother')&&fullSisterN===1&&!hasDesc&&!alive('father')&&!alive('grandfather')&&eligible('paternalSister');
    if(paternalSistersCanInherit)put('paternalSister',h.paternalSister===1?F(1,2):F(2,3),h.paternalSister===1?'এক বৈমাত্রেয় বোন ১/২':'দুই বা ততোধিক বৈমাত্রেয় বোন সম্মিলিতভাবে ২/৩');
    else if(paternalSistersComplete)put('paternalSister',F(1,6),'এক সহোদর বোনের সাথে সম্পূরক হিসেবে বৈমাত্রেয় বোন ১/৬');
    // Daughter with full sister: full sister becomes residuary; full/paternal siblings as residuaries.
    let fixedTotal=Object.values(shares).reduce(add,ZERO), awl=false, radd=false, raddPool=ZERO, residue=cmp(ONE,fixedTotal)>0?sub(ONE,fixedTotal):ZERO;
    const fardTotal=str(fixedTotal), startingResidue=str(residue);
    if(cmp(fixedTotal,ONE)>0){awl=true;for(const k of Object.keys(shares))shares[k]=div(shares[k],fixedTotal);residue=ZERO;}
    else {
      // Residue priority: descendants, father/grandfather, then full/paternal siblings.
      let group=[];
      if(eligible('son'))group=['son','daughter'];
      else if(eligible('sonsSon'))group=['sonsSon','sonsDaughter'];
      else if(eligible('father'))group=['father'];
      else if(eligible('grandfather'))group=['grandfather'];
      else if(eligible('fullBrother'))group=['fullBrother','fullSister'];
      else if(eligible('fullSister')&&femaleDesc)group=['fullSister'];
      else if(eligible('paternalBrother'))group=['paternalBrother','paternalSister'];
      else if(eligible('paternalSister')&&femaleDesc)group=['paternalSister'];
      const units=group.reduce((n,k)=>n+(eligible(k)?h[k]*(k.endsWith('Brother')||k==='son'||k==='sonsSon'?2:1):0),0);
      if(units&&cmp(residue,ZERO)>0){for(const k of group)if(eligible(k)){const isMale=k.endsWith('Brother')||k==='son'||k==='sonsSon';const unit=isMale?2:1;const x=mul(residue,F(h[k]*unit,units));put(k,x,`আসাবা হিসেবে অবশিষ্ট ${str(residue)} অংশ; পুরুষের অংশ নারীর দ্বিগুণ`)}residue=ZERO;}
      else if(cmp(residue,ZERO)>0){
        const spouseKeys=['husband','wife'];
        const eligibleFixed=Object.keys(shares).filter(k=>!spouseKeys.includes(k));
        if(eligibleFixed.length){const pool=eligibleFixed.reduce((s,k)=>add(s,shares[k]),ZERO),unassigned=residue;raddPool=pool;for(const k of eligibleFixed)shares[k]=add(shares[k],mul(unassigned,div(shares[k],pool)));radd=true;residue=ZERO;for(const k of eligibleFixed)parts[k].push({fraction:'radd',reason:'অবশিষ্ট অংশ স্বামী/স্ত্রী বাদে নির্ধারিত অংশীদারদের মধ্যে রদ্দ'});}
      }
    }
    // Map absent/excluded heirs to zero for transparent output.
    const rows=HEIRS.filter(([k])=>alive(k)).map(([k,bn,en])=>({key:k,name:bn,english:en,count:h[k],fraction:shares[k]||ZERO,fractionText:str(shares[k]||ZERO),percent:val(shares[k]||ZERO)*100,amount:val(shares[k]||ZERO)*Number(input.estate||0),blocked:blocked.has(k),reason:blocked.has(k)?reason[k]:(parts[k]||[]).map(p=>p.reason).join(' · ')||'এই নিয়মের অধীনে অংশ প্রাপ্য হয়নি।'}));
    return {heirs:h,rows,shares:Object.fromEntries(Object.entries(shares).map(([k,v])=>[k,str(v)])),awl,radd,fardTotal,startingResidue,raddPool:str(raddPool),residue:str(residue),residueValue:val(residue),total:rows.reduce((s,r)=>s+r.percent,0),engineScope:ENGINE_SCOPE};
  }

  const FIXTURES=[
    {name:'স্বামী + পুত্র',input:{husband:1,son:1},expected:{husband:'1/4',son:'3/4'}},
    {name:'স্ত্রী + পুত্র',input:{wife:1,son:1},expected:{wife:'1/8',son:'7/8'}},
    {name:'স্বামী + এক কন্যা',input:{husband:1,daughter:1},expected:{husband:'1/4',daughter:'3/4'}},
    {name:'স্ত্রী + দুই কন্যা',input:{wife:1,daughter:2},expected:{wife:'1/8',daughter:'7/8'}},
    {name:'পিতা + মাতা + পুত্র',input:{father:1,mother:1,son:1},expected:{father:'1/6',mother:'1/6',son:'2/3'}},
    {name:'স্বামী + মাতা + পিতা (উমারিয়্যাহ)',input:{husband:1,mother:1,father:1},expected:{husband:'1/2',mother:'1/6',father:'1/3'}},
    {name:'স্ত্রী + মাতা + পিতা (উমারিয়্যাহ)',input:{wife:1,mother:1,father:1},expected:{wife:'1/4',mother:'1/4',father:'1/2'}},
    {name:'এক কন্যা + এক পুত্র',input:{daughter:1,son:1},expected:{daughter:'1/3',son:'2/3'}},
    {name:'দুই কন্যা + পিতা',input:{daughter:2,father:1},expected:{daughter:'2/3',father:'1/3'}},
    {name:'স্বামী + মাতা + দুই সহোদর বোন (আওল)',input:{husband:1,mother:1,fullSister:2},expected:{husband:'3/8',mother:'1/8',fullSister:'1/2'}},
    {name:'মাতা + এক বৈপিত্রেয় ভাই',input:{mother:1,maternalBrother:1},expected:{mother:'2/3',maternalBrother:'1/3'}},
    {name:'এক কন্যা + পুত্রের কন্যা (রদ্দ)',input:{daughter:1,sonsDaughter:1},expected:{daughter:'3/4',sonsDaughter:'1/4'}},
    {name:'স্ত্রী + এক কন্যা + পিতা',input:{wife:1,daughter:1,father:1},expected:{wife:'1/8',daughter:'1/2',father:'3/8'}},
    {name:'পিতা দাদা ও সহোদর ভাইকে বঞ্চিত করেন',input:{father:1,grandfather:1,fullBrother:1},expected:{father:'1/1'}},
    {name:'এক সহোদর বোন + এক বৈমাত্রেয় বোন (রদ্দ)',input:{fullSister:1,paternalSister:1},expected:{fullSister:'3/4',paternalSister:'1/4'}},
    {name:'দাদি + নানি (যৌথ ১/৬, রদ্দ)',input:{paternalGrandmother:1,maternalGrandmother:1},expected:{paternalGrandmother:'1/2',maternalGrandmother:'1/2'}},
    {name:'কন্যা + পুত্রের পুত্র',input:{daughter:1,sonsSon:1},expected:{daughter:'1/2',sonsSon:'1/2'}},
    {name:'পুত্রের পুত্র + পুত্রের কন্যা',input:{sonsSon:1,sonsDaughter:1},expected:{sonsSon:'2/3',sonsDaughter:'1/3'}},
    {name:'দুই কন্যা + বৈমাত্রেয় বোন',input:{daughter:2,paternalSister:1},expected:{daughter:'2/3',paternalSister:'1/3'}},
    {name:'দুই কন্যা + সহোদর বোন',input:{daughter:2,fullSister:1},expected:{daughter:'2/3',fullSister:'1/3'}},
    {name:'কন্যা মাতৃ-ভাইকে বঞ্চিত করেন; রদ্দ',input:{daughter:1,maternalBrother:1},expected:{daughter:'1/1'},blocked:['maternalBrother']},
    {name:'কন্যা + মাতা + মাতৃ-ভাই',input:{daughter:1,mother:1,maternalBrother:1},expected:{daughter:'3/4',mother:'1/4'},blocked:['maternalBrother']},
    {name:'পিতা + এক কন্যা: নির্ধারিত ও অবশিষ্ট',input:{father:1,daughter:1},expected:{father:'1/2',daughter:'1/2'}},
    {name:'স্বামী + কন্যা + মাতৃ-ভাই',input:{husband:1,daughter:1,maternalBrother:1},expected:{husband:'1/4',daughter:'3/4'},blocked:['maternalBrother']},
    {name:'মাতা + দুই সহোদর বোন (রদ্দ)',input:{mother:1,fullSister:2},expected:{mother:'1/5',fullSister:'4/5'}}
  ];
  function runFixtures(){const out=FIXTURES.map(t=>{try{const r=calculate({...t.input,estate:120});const actual=Object.fromEntries(Object.entries(r.shares).filter(([,v])=>v!=='0/1'));const blocked=r.rows.filter(x=>x.blocked).map(x=>x.key).sort();const expectedBlocked=(t.blocked||[]).slice().sort();const ok=Object.keys(t.expected).length===Object.keys(actual).length&&Object.entries(t.expected).every(([k,v])=>actual[k]===v)&&(!t.blocked||JSON.stringify(blocked)===JSON.stringify(expectedBlocked));return {name:t.name,ok,expected:t.expected,actual,expectedBlocked,blocked}}catch(e){return{name:t.name,ok:false,error:e.message}}});return {passed:out.filter(x=>x.ok).length,total:out.length,results:out}}

  const $=s=>document.querySelector(s), inputs=$('#heirInputs');
  let lastCalculation=null;
  HEIRS.forEach(([key,bn,en])=>{const wrap=document.createElement('label');wrap.className='heir-card';wrap.innerHTML=`<span><strong>${bn}</strong><small>${en}</small></span><span class="stepper"><button type="button" data-step="-1" aria-label="${bn} কমান">−</button><input type="number" inputmode="numeric" min="0" step="1" value="0" name="${key}" aria-label="${bn} সংখ্যা"><button type="button" data-step="1" aria-label="${bn} বাড়ান">＋</button></span>`;inputs.append(wrap)});
  inputs.addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(!b)return;const i=b.parentElement.querySelector('input');i.value=Math.max(0,Number(i.value)+Number(b.dataset.step));i.dispatchEvent(new Event('input',{bubbles:true}));});
  function collect(){const o={estate:$('#estate').value};inputs.querySelectorAll('input').forEach(i=>o[i.name]=i.value);return o;}
  const bnMoney=n=>new Intl.NumberFormat('bn-BD',{maximumFractionDigits:2}).format(n);
  function renderResult(r,estate){
    lastCalculation={r,estate};const box=$('#results'),activeRows=r.rows,weighted=activeRows.filter(x=>!x.blocked&&x.percent>0),data=window.sirajiData;
    const dalil=weighted.length?weighted.map(row=>{const rules=applicableDalil(row,r,data);const quotes=rules.map(d=>`<blockquote><b>${escapeHtml(d.title||'')}</b><span class="arabic">${escapeHtml(d.arabic||'')}</span></blockquote>`).join('');return `<li><b>${row.name} — ${row.fractionText}</b><br>${escapeHtml(row.reason)}${quotes||'<blockquote>এই অবস্থার জন্য নথিতে দলিল পাওয়া যায়নি।</blockquote>'}</li>`}).join(''):'<li>এই ওয়ারিশ তালিকার জন্য প্রদর্শনযোগ্য অংশ নেই।</li>';
    const rows=activeRows.map((x,i)=>`<tr class="${x.blocked?'blocked':''}"><td>${i+1}</td><td>${x.name}<small>${x.english} · ${x.count} জন</small></td><td>${x.blocked?'—':`৳ ${bnMoney(x.amount)}`}</td><td>${x.blocked?'—':`${bnMoney(x.percent)}%`}<small>${x.blocked?'বঞ্চিত':x.fractionText}</small></td></tr>`).join('');
    const premium=localStorage.getItem('premium-demo')==='true';const premiumPanel=premium?`<section class="premium-panel"><h3>Premium Demo · বিস্তারিত হিসাব</h3><p><b>আওল:</b> ${r.awl?`নির্ধারিত অংশের যোগফল ${r.fardTotal}; প্রত্যেক অংশ একই অনুপাতে কমেছে।`:'এই হিসাবে প্রযোজ্য হয়নি।'}</p><p><b>রদ্দ:</b> ${r.radd?`বণ্টনের আগে অবশিষ্ট ${r.startingResidue}; যোগ্য অংশীদারদের প্রাথমিক অংশের যোগফল ${r.raddPool} অনুপাতে ফেরত গেছে।`:'এই হিসাবে প্রযোজ্য হয়নি।'}</p><p><b>অবণ্টিত অবশিষ্ট:</b> ${r.residueValue?`${bnMoney(r.residueValue*Number(estate))} ৳ (${r.residue})`:'নেই'}</p><p><b>মাযহাব তুলনা:</b> এই ইঞ্জিন শুধু হানাফি হিসাব দেয়; অন্য মাযহাবের অংশ এই ডেমোতে গণনা করা হয় না।</p><button class="secondary-button full-report-button" id="fullReportBtn">পূর্ণ দলিলসহ PDF / প্রিন্ট</button></section>`:'';
    box.innerHTML=`<div class="result-title"><div><p class="eyebrow">হিসাবের ফল</p><h2>সম্পদ বণ্টন</h2></div><button class="secondary-button print-button" id="printBtn">প্রিন্ট / PDF</button></div><p class="result-summary">মোট বণ্টনযোগ্য সম্পদ <strong>৳ ${bnMoney(Number(estate))}</strong></p><div class="table-scroll"><table class="result-table"><thead><tr><th>ক্রম</th><th>ওয়ারিশগণ</th><th>সম্পদ</th><th>শতাংশ</th></tr></thead><tbody>${rows}<tr class="total-row"><td colspan="2">মোট বণ্টিত</td><td>৳ ${bnMoney(activeRows.reduce((s,x)=>s+(x.blocked?0:x.amount),0))}</td><td>${bnMoney(weighted.reduce((s,x)=>s+x.percent,0))}%</td></tr></tbody></table></div>${r.residueValue>0?`<p class="residue-summary">অবশিষ্ট: ৳ ${bnMoney(r.residueValue*Number(estate))} <span>(${r.residue})</span></p>`:''}${premiumPanel}<details class="proof-details" open><summary>শরয়ী দলিলসমূহ</summary><ol>${dalil}</ol></details><div id="printReport" class="print-report">${printReport(r,estate)}</div>`;
    box.hidden=false;$('#printBtn').addEventListener('click',()=>window.print());if(premium)$('#fullReportBtn').addEventListener('click',()=>window.print());
  }  const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function applicableDalil(row,r,data){
    const h=r.heirs,desc=['son','daughter','sonsSon','sonsDaughter'].some(k=>h[k]>0),maleDesc=h.son>0||h.sonsSon>0,siblingCount=['fullBrother','fullSister','paternalBrother','paternalSister','maternalBrother','maternalSister'].reduce((a,k)=>a+h[k],0),maternalCount=h.maternalBrother+h.maternalSister, femaleDesc=h.daughter>0||h.sonsDaughter>0;
    let conditions=[];const k=row.key;
    if(row.blocked){
      if(k==='grandfather')conditions=['grandfather.blocked-by-father'];
      else if(k==='paternalGrandmother'||k==='maternalGrandmother')conditions=['grandmother.blocked'];
      else if(k==='sonsDaughter')conditions=[h.son>0?'sonsDaughter.blocked-by-son':'sonsDaughter.blocked-by-daughters'];
      else if(k==='maternalBrother'||k==='maternalSister')conditions=['maternal.blocked'];
      else if(k==='fullBrother'||k==='fullSister')conditions=['fullSibling.blocked'];
      else if(k==='paternalSister'&&h.fullSister>=2)conditions=['paternalSister.blocked-by-full-sisters'];
      else if(k==='paternalBrother'||k==='paternalSister')conditions=['paternalSibling.blocked'];
    }else if(k==='husband')conditions=[desc?'husband.with-descendant':'husband.no-descendant'];
    else if(k==='wife')conditions=[desc?'wife.with-descendant':'wife.no-descendant'];
    else if(k==='father')conditions=[maleDesc?'father.fixed-male-descendant':desc?'father.asabah-female-descendant':'father.asabah'];
    else if(k==='grandfather')conditions=[maleDesc?'grandfather.fixed-male-descendant':desc?'grandfather.asabah-female-descendant':'grandfather.asabah'];
    else if(k==='maternalBrother'||k==='maternalSister')conditions=[maternalCount===1?'maternal.one-sixth':'maternal.one-third'];
    else if(k==='daughter')conditions=[h.son?'daughter.with-son':h.daughter===1?'daughter.one':'daughter.multiple'];
    else if(k==='son')conditions=[h.daughter?'daughter.with-son':'father.asabah'];
    else if(k==='sonsDaughter')conditions=[h.sonsSon?'sonsDaughter.with-grandson':h.daughter===1?'sonsDaughter.with-daughter':h.sonsDaughter===1?'sonsDaughter.one':'sonsDaughter.multiple'];
    else if(k==='sonsSon')conditions=[h.sonsDaughter?'sonsDaughter.with-grandson':'father.asabah'];
    else if(k==='mother')conditions=[row.reason.includes('উমারিয়্যাহ')?'mother.third-of-remainder':desc||siblingCount>=2?'mother.one-sixth':'mother.one-third'];
    else if(k==='paternalGrandmother'||k==='maternalGrandmother')conditions=['grandmother.one-sixth'];
    else if(k==='fullBrother')conditions=[h.fullSister?'fullSibling.with-brother':'father.asabah'];
    else if(k==='fullSister')conditions=[h.fullBrother?'fullSibling.with-brother':femaleDesc?'fullSibling.asabah-with-female-descendant':h.fullSister===1?'fullSister.one':'fullSister.multiple'];
    else if(k==='paternalBrother')conditions=[h.paternalSister?'paternalSibling.with-brother':'father.asabah'];
    else if(k==='paternalSister')conditions=[h.paternalBrother?'paternalSibling.with-brother':femaleDesc?'paternalSister.asabah-with-female-descendant':h.fullSister===1?'paternalSister.with-full-sister':h.paternalSister===1?'paternalSister.one':'paternalSister.multiple'];
    const all=data?.heirs||[];return all.filter(d=>(d.keys||[d.key]).includes(k)&&conditions.includes(d.condition));
  }  function printReport(r,estate){const people=r.rows.filter(x=>!x.blocked&&x.percent>0);const tree=people.map(x=>`<div class="tree-person"><b>${x.name}</b><small>${x.english}</small><strong>${x.fractionText}</strong></div>`).join('');const table=r.rows.map((x,i)=>`<tr><td>${i+1}</td><td>${x.name}<small>${x.english} · ${x.count} জন</small></td><td>${x.blocked?'—':'৳ '+bnMoney(x.amount)}</td><td>${x.blocked?'—':bnMoney(x.percent)+'%'}</td></tr>`).join('');const ds=people.map(x=>applicableDalil(x,r,window.sirajiData).map(d=>`<li><span class="arabic">${escapeHtml(d.arabic||'')}</span></li>`).join('')).join('');return `<header class="print-head"><div class="arabic">بسم الله الرحمن الرحيم</div><div>আমাদের ওসিয়াত ও মাসআলা</div></header><p class="print-intro">মৃত ব্যক্তির রেখে যাওয়া নগদ টাকা, স্বর্ণালংকার, জমি, বাড়ি ও অন্যান্য সম্পত্তি থেকে প্রথমে কাফন-দাফনের খরচ বহন করতে হবে। এরপর তাঁর কোনো ঋণ থাকলে তা পরিশোধ করতে হবে। স্ত্রীর মোহরানা বাকি থাকলেও তা ঋণ হিসেবে পরিশোধ করতে হবে। এরপর মৃত ব্যক্তি কোনো বৈধ অসিয়ত করে গেলে, তা ওয়ারিশ নন এমন ব্যক্তির জন্য অবশিষ্ট সম্পত্তির এক-তৃতীয়াংশের মধ্যে কার্যকর করতে হবে। সবশেষে অবশিষ্ট সম্পত্তি শরিয়তের বিধান অনুযায়ী ওয়ারিশদের মধ্যে বণ্টন করতে হবে।</p><div class="family-tree"><div class="tree-deceased">মৃত ব্যক্তি<br><small>৳ ${bnMoney(Number(estate))}</small></div><div class="tree-children">${tree}</div></div><table class="print-table"><thead><tr><th>ক্রম</th><th>ওয়ারিশগণ</th><th>সম্পদ</th><th>১০০%</th></tr></thead><tbody>${table}<tr class="total-row"><td colspan="2">মোট</td><td>৳ ${bnMoney(r.rows.reduce((s,x)=>s+(x.blocked?0:x.amount),0))}</td><td>${bnMoney(people.reduce((s,x)=>s+x.percent,0))}%</td></tr></tbody></table><h3 class="dalil-heading">শরয়ী দলিলসমূহ</h3><ol class="print-dalil">${ds||'<li><span class="arabic">لم يُضَفْ نصُّ الدليل لهذه الحالة بعد.</span></li>'}</ol><footer class="print-footer"><span>সত্যায়নকারী<br>___________________</span><span>ফতোয়া লেখক:<br>মুফতি মঞ্জুরুল ইসলাম, মুহাদ্দিস,<br>জামেয়া ইসলামিয়া বরুয়া বীরামপুর</span></footer>`}

  $('#calcForm').addEventListener('submit',e=>{e.preventDefault();const err=$('#formError');try{const raw=collect();const estate=Number(raw.estate);if(!Number.isFinite(estate)||estate<=0)throw Error('বণ্টনযোগ্য সম্পদের পরিমাণ শূন্যের বেশি লিখুন।');const r=calculate(raw);err.hidden=true;renderResult(r,estate);localSave({inputs:raw,result:r});$('#results').scrollIntoView({behavior:'smooth',block:'start'});}catch(ex){err.textContent=ex.message;err.hidden=false;$('#results').hidden=true;}});
  $('#clearBtn').addEventListener('click',()=>{$('#calcForm').reset();inputs.querySelectorAll('input').forEach(i=>i.value=0);$('#results').hidden=true;$('#formError').hidden=true;});
  document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x===b));document.querySelectorAll('.page').forEach(p=>{const on=p.id===b.dataset.page;p.hidden=!on;p.classList.toggle('active',on)});if(b.dataset.page==='library')loadLibrary()}));
  async function loadLibrary(){const node=$('#libraryContent');if(window.sirajiData){renderLibrary(window.sirajiData);return}try{const response=await fetch('data/siraji.json');if(!response.ok)throw Error();window.sirajiData=await response.json();renderLibrary(window.sirajiData);if(lastCalculation&&!$('#results').hidden)renderResult(lastCalculation.r,lastCalculation.estate)}catch{node.innerHTML='<div class="empty-state">সিরাজী পাঠাগারের JSON ফাইলটি পাওয়া যায়নি।</div>'}}
  function renderLibrary(data){const chapters=data.chapters||[];$('#libraryContent').innerHTML=chapters.length?chapters.map(c=>`<details class="chapter"><summary>${escapeHtml(c.title||'অধ্যায়')}</summary>${(c.sections||[]).map(s=>`<article><h3>${escapeHtml(s.title||'')}</h3><p class="arabic">${escapeHtml(s.arabic||'')}</p><p>${escapeHtml(s.bengali||'')}</p></article>`).join('')}</details>`).join(''):'<div class="empty-state">পাঠাগারের জন্য <code>data/siraji.json</code>-এ অধ্যায় যোগ করুন।</div>'}
  const storage={db:null};
  function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('faraid-local',1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  async function localSave(value){try{const db=storage.db||await openDB();storage.db=db;db.transaction('state','readwrite').objectStore('state').put(value,'last');}catch{localStorage.setItem('faraid-last',JSON.stringify(value))}}
  async function restore(){try{storage.db=await openDB();const req=storage.db.transaction('state').objectStore('state').get('last');req.onsuccess=()=>{const d=req.result;if(d?.inputs){$('#estate').value=d.inputs.estate;inputs.querySelectorAll('input').forEach(i=>i.value=d.inputs[i.name]||0);try{renderResult(calculate(d.inputs),d.inputs.estate)}catch{}}};}catch{try{const d=JSON.parse(localStorage.getItem('faraid-last')||'null');if(d?.inputs){$('#estate').value=d.inputs.estate;inputs.querySelectorAll('input').forEach(i=>i.value=d.inputs[i.name]||0)}}catch{}}}
  $('#premiumToggle').checked=localStorage.getItem('premium-demo')==='true';$('#premiumToggle').addEventListener('change',e=>{localStorage.setItem('premium-demo',String(e.target.checked));$('.premium-setting').classList.toggle('is-on',e.target.checked);if(lastCalculation&&!$('#results').hidden)renderResult(lastCalculation.r,lastCalculation.estate)});$('.premium-setting').classList.toggle('is-on',$('#premiumToggle').checked);
  let deleteArmed=false,deleteTimer;$('#deleteDataBtn').addEventListener('click',async e=>{const button=e.currentTarget;if(!deleteArmed){deleteArmed=true;button.textContent='নিশ্চিত করতে আবার চাপুন';button.classList.add('delete-armed');clearTimeout(deleteTimer);deleteTimer=setTimeout(()=>{deleteArmed=false;button.textContent='এই ডিভাইসের সংরক্ষিত তথ্য মুছুন';button.classList.remove('delete-armed')},4000);return}clearTimeout(deleteTimer);deleteArmed=false;try{const db=storage.db||await openDB();db.transaction('state','readwrite').objectStore('state').clear()}catch{}localStorage.removeItem('faraid-last');button.textContent='সংরক্ষিত তথ্য মুছে ফেলা হয়েছে';button.classList.remove('delete-armed');setTimeout(()=>{button.textContent='এই ডিভাইসের সংরক্ষিত তথ্য মুছুন'},2200)});
  let installEvent;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#installPrompt').hidden=false;$('#installBtn').hidden=false});async function install(){if(!installEvent)return;installEvent.prompt();await installEvent.userChoice;installEvent=null;$('#installPrompt').hidden=true}$('#installBtn').addEventListener('click',install);$('#installAction').addEventListener('click',install);$('#installDismiss').addEventListener('click',()=>$('#installPrompt').hidden=true);
  if('serviceWorker'in navigator&&location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
  window.addEventListener('beforeprint',()=>{const report=$('#printReport');if(!report)return;report.classList.add('measuring');const h=report.scrollHeight;report.classList.remove('measuring');const available=Math.round(267*96/25.4);document.documentElement.style.setProperty('--print-zoom',String(Math.min(1,available/Math.max(available,h))))});
  window.addEventListener('afterprint',()=>document.documentElement.style.removeProperty('--print-zoom'));
  window.Faraid={calculate,validate,fixtures:FIXTURES,runFixtures,engineScope:ENGINE_SCOPE};
  restore();loadLibrary();
})();
