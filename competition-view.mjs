import { financeReport } from './finance.mjs?v=0.18';
import { BRANCH_TIERS,branchProvince } from './business.mjs?v=0.16.1';
import { provinceName,PROVINCES } from './provinces.mjs?v=0.16.1';
import { rivalOffer,SIZES,STRATEGIES } from './rivals.mjs?v=0.18';

const sum=(rows,index)=>rows.reduce((total,row)=>total+row[index],0);
const cityName=province=>provinceName(province)||'Türkiye';
const level=company=>Math.max(company.branches.length>=4?4:0,...company.branches.map(b=>b.tier));
const size=company=>SIZES[level(company)];
const labels={worth:'Şirket değeri',revenue:'30 günlük ciro',profit:'30 günlük net kâr',
  sold:'30 günlük satış',branches:'Şube sayısı',reputation:'İtibar',share:'30 günlük pazar payı'};
const segment={commuter:'Düşük hacim',premium:'Premium',scooter:'Scooter',sport:'Spor',naked:'Naked',adventure:'Adventure',touring:'Touring'};
const actions={sale:'Satış',purchase:'Alış',shipping:'Nakliye',inspection:'Ekspertiz',repair:'Tamir',rent:'Kiralama',
  loan:'Kredi',interest:'Faiz',principal:'Anapara',branch:'Şube açılışı',upgrade:'Garaj yatırımı',liquidation:'Tasfiye'};

export function createCompetitionView({byId,element,money,signed,assets,getState,dispatch}) {
  const tabs=[...document.querySelectorAll('[data-competition-tab]')];
  const dialog=byId('rival-detail');
  const price=byId('rival-price');
  let active=tabs[0];
  let selected;
  let confirmation;
  let limit=20;
  const number=new Intl.NumberFormat('tr-TR');
  const percent=new Intl.NumberFormat('tr-TR',{style:'percent',maximumFractionDigits:2});
  function selectOptions(id,items) {
    byId(id).replaceChildren(...items.map(([value,label])=>new Option(label,value)));
  }
  const cities=PROVINCES.map(city=>[city.id,city.name]).sort((a,b)=>a[1].localeCompare(b[1],'tr'));
  selectOptions('rival-city',[['','Tüm iller'],...cities]);
  selectOptions('rival-rank-city',[['','Türkiye geneli'],...cities]);
  selectOptions('rival-size',[['','Tüm büyüklükler'],...SIZES.map((value,index)=>[index,value])]);
  selectOptions('rival-strategy',[['','Tüm stratejiler'],...Object.entries(STRATEGIES)]);
  selectOptions('rival-rank-metric',Object.entries(labels));
  function list(id,children,fallback) {
    byId(id).replaceChildren(...(children.length?children:[element('p',fallback,'spec')]));
  }
  function measures(fields,container=element('dl','','analysis-measures')) {
    container.replaceChildren(...fields.flatMap(([label,value])=>[element('dt',label),element('dd',String(value))]));
    return container;
  }
  function metrics(row,key) {
    if(key==='share')return percent.format(row[key]);
    if(key==='worth'||key==='revenue')return money(row[key]);
    if(key==='profit')return signed(row[key]);
    return number.format(row[key]);
  }
  function ranking(state,province) {
    const scope=province ? state.branches.filter(b=>branchProvince(b)===province):state.branches;
    const cutoff=state.day-29;
    const sales=state.sales.filter(s=>s.day>=cutoff&&!s.returnedDay&&(!province||scope.some(b=>b.id===s.branchId)));
    const worth=assets(state);
    const portfolio=province ? scope.reduce((value,branch)=>value+
      (branch.tier===undefined?0:BRANCH_TIERS[branch.tier].cost)+branch.garage.reduce((sum,bike)=>sum+bike.value,0),
      (state.cash-state.debt)*scope.length/state.branches.length):worth.net;
    const finance=province?{...state,ledger:state.ledger.filter(row=>row.day>=cutoff&&scope.some(b=>b.id===row.branchId)),
      sales:state.sales.filter(row=>row.day>=cutoff&&scope.some(b=>b.id===row.branchId))}:state;
    const result=financeReport(finance,worth,30).periodTotals;
    const player={name:'MOTOR EMPIRE · Siz',player:true,worth:Math.round(portfolio),branches:scope.length,
      revenue:result.revenue,profit:result.profit,sold:sales.length,reputation:state.trade.reputation};
    const rows=state.competition.companies.filter(c=>!province||c.branches.some(b=>b.province===province)).map(c=>{
      const window=c.history.slice(-30);
      const scope=province?c.branches.filter(b=>b.province===province):c.branches;
      if(!province)return {id:c.id,name:c.name,worth:c.bookValue,revenue:sum(window,1),profit:sum(window,2),
        sold:sum(window,3),branches:scope.length,reputation:c.reputation};
      const local=(c.regional??[]).filter(row=>row[1]===province);
      const property=scope.reduce((value,b)=>value+BRANCH_TIERS[b.tier].cost,0);
      const inventory=c.stock.filter(bike=>scope.some(branch=>branch.id===bike.branch)).reduce((value,bike)=>value+bike.value,0);
      return {id:c.id,name:c.name,worth:Math.round(property+inventory+(c.cash-c.debt)*scope.length/c.branches.length),
        revenue:sum(local,2),profit:sum(local,3),sold:sum(local,4),branches:scope.length,reputation:c.reputation};
    });
    if(scope.length)rows.push(player);
    const count=rows.reduce((total,row)=>total+row.sold,0);
    for(const row of rows) row.share=count?row.sold/count:0;
    return rows;
  }
  function textNews(world,count) {
    return [...world.news].reverse().slice(0,count).map(item=>element('p',`Gün ${item.day} · ${item.text}`,'competition-story'));
  }
  function detailButton(id,label) {
    const button=element('button',label,'competition-link');
    button.type='button';
    button.dataset.rivalDetail=id;
    return button;
  }
  function cards(companies) {
    return companies.map(company=>{
      const card=element('article','','competition-row');
      const data=element('div');
      data.append(detailButton(company.id,company.name),element('p',`${cityName(company.province)} · ${size(company)} · ${STRATEGIES[company.strategy]}`,'spec'));
      card.append(data,element('strong',money(company.bookValue),'competition-value'));
      return card;
    });
  }
  function renderSummary(state) {
    const world=state.competition;
    const ranked=ranking(state,0).sort((a,b)=>b.worth-a.worth);
    const position=ranked.findIndex(row=>row.player);
    const player=ranked[position];
    const closest=[ranked[position-1],ranked[position+1]].filter(Boolean)
      .sort((a,b)=>Math.abs(a.worth-player.worth)-Math.abs(b.worth-player.worth))[0];
    const city=branchProvince(state.branches[0]);
    const local=ranking(state,city);
    const regional=local.filter(row=>!row.player).length;
    const hero=element('article','','analysis-hero competition-hero');
    const headline=element('div');
    headline.append(element('p','TÜRKİYE SIRALAMAM','eyebrow'),element('strong',`#${position+1}`,'analysis-price'));
    const worth=element('div');
    worth.append(element('p','Şirket değerim','spec'),element('strong',money(player.worth),'competition-total'));
    hero.append(headline,worth);
    const stats=measures([['Pazar payım',metrics(player,'share')],['Aylık satış',`${player.sold} motosiklet`],
      ['Aylık satış cirosu',money(player.revenue)],['En yakın rakip',closest?.name??'—'],
      [`${cityName(city)} rekabeti`,`${regional>=6?'Yüksek':regional>=3?'Orta':'Düşük'} · ${regional} rakip`],
      ['Yeni galeri koruması',state.sales.length<6&&state.branches.length===1?'Etkin':'Tam rekabet']]);
    const notes=[...world.customerNotes].reverse().slice(0,3).map(note=>
      element('p',`Gün ${note.day} · ${note.model} · ${note.lost?note.company+' seçildi':'Müşteri sizi seçti'} · ${note.reason}`,'competition-story'));
    list('competition-summary',[hero,stats,element('h3','Son rekabet haberleri'),...(textNews(world,4).length?textNews(world,4):
      [element('p','Henüz kaydedilmiş rekabet haberi yok.','spec')]),
      ...(notes.length?[element('h3','Müşteri tercihleri'),...notes]:[])]);
  }
  function renderRivals(state) {
    const search=byId('rival-search').value.trim().toLocaleLowerCase('tr');
    const city=Number(byId('rival-city').value);
    const tier=byId('rival-size').value;
    const strategy=byId('rival-strategy').value;
    const matches=state.competition.companies.filter(c=>
      (!search||c.name.toLocaleLowerCase('tr').includes(search))&&(!city||c.branches.some(b=>b.province===city))
      &&(!tier||level(c)===Number(tier))&&(!strategy||c.strategy===strategy));
    byId('rival-count').textContent=`${matches.length} şirket`;
    const children=cards(matches.slice(0,limit));
    if(matches.length>limit){
      const more=element('button','Daha fazla şirket');more.type='button';more.dataset.rivalMore='';children.push(more);
    }
    list('rival-list',children,'Bu filtrelerde şirket bulunamadı.');
  }
  function renderRanks(state) {
    const city=Number(byId('rival-rank-city').value);
    const metric=byId('rival-rank-metric').value;
    const rows=ranking(state,city).sort((a,b)=>b[metric]-a[metric]||Number(b.player??false)-Number(a.player??false));
    const cards=rows.map((row,index)=>{
      const card=element('article','','competition-row');
      if(row.player)card.dataset.player='true';
      const content=element('div');
      content.append(element('span',`#${index+1} `,'eyebrow'),row.player?element('strong',row.name):detailButton(row.id,row.name));
      card.append(content,element('strong',metrics(row,metric),'competition-value'));
      return card;
    });
    if(city)cards.unshift(element('p','İlin cirosu, faaliyet kârı ve satışları yereldir. Şirket değerinde kasa ve borç şube sayısına göre paylaştırılır. İtibar şirket genelidir.','spec'));
    list('rival-rank-list',cards,'Bu ilde kayıtlı şirket yok.');
  }
  function renderAcquisitions(state) {
    const available=state.competition.companies.filter(company=>rivalOffer(company).eligible);
    list('competition-acquisitions',available.length?[element('p','Yönetim teklifi değerlendirir. Onaydan önce kasa, borç ve personel aktarımını inceleyin.','spec'),...cards(available)]:[],
      'Şu anda devralmaya açık rakip şirket yok.');
  }
  function render() {
    const state=getState();
    if(!state?.competition)return;
    if(dialog.open && !state.competition.companies.some(c=>c.id===selected))dialog.close();
    switch(active.dataset.competitionTab) {
      case 'summary':renderSummary(state);break;
      case 'rivals':renderRivals(state);break;
      case 'ranks':renderRanks(state);break;
      case 'acquisitions':renderAcquisitions(state);break;
      case 'news':list('competition-news',textNews(state.competition,45),'Henüz rekabet haberi yok.');break;
    }
  }
  function changeTab(tab,focus=false) {
    active=tab;
    for(const item of tabs) {
      const on=item===tab;
      item.setAttribute('aria-selected',String(on));
      item.tabIndex=on?0:-1;
      byId(item.getAttribute('aria-controls')).hidden=!on;
    }
    if(focus)tab.focus();
    render();
  }
  function chart(state,company) {
    const first=state.day-Number(byId('rival-period').value)+1;
    const rivals=company.history.filter(row=>row[0]>=first);
    const player=state.financeSnapshots.filter(row=>row.day>=first);
    byId('rival-history').replaceChildren();
    if(rivals.length<2) {
      byId('rival-history').append(element('p','Bu dönem için yeterli geçmiş yok.','spec'));
      return;
    }
    const lines=[rivals.map(row=>[row[0],row[4]]),player.map(row=>[row.day,row.netWorth])];
    const values=lines.flatMap(rows=>rows.map(row=>row[1]));
    const lo=Math.min(...values),span=Math.max(1,Math.max(...values)-lo);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 360 121');
    svg.setAttribute('role','img');
    svg.setAttribute('aria-label',`Gün ${first<1?1:first}–${state.day} şirket değeri, turuncu rakip ve yeşil oyuncu`);
    for(const [index,rows] of lines.entries()) {
      if(rows.length<2)continue;
      const line=document.createElementNS(svg.namespaceURI,'polyline');
      line.setAttribute('points',rows.map(([day,value])=>`${12+(day-first)*336/Math.max(1,state.day-first)},${110-(value-lo)*98/span}`).join(' '));
      line.setAttribute('stroke',index?'#89d3ab':'#ff9d65');
      line.setAttribute('stroke-width','2');
      line.setAttribute('fill','none');
      svg.append(line);
    }
    byId('rival-history').append(svg,element('p',`Gün ${rivals[0][0]}–${state.day} · ${money(lo)} – ${money(lo+span)}`,'spec'),
      element('p',`Turuncu rakip · Yeşil siz · Son rakip değeri ${money(rivals.at(-1)[4])}`,'spec'));
  }
  function showDetail(id) {
    const state=getState();
    const company=state.competition.companies.find(row=>row.id===Number(id));
    if(!company)return;
    selected=company.id;
    byId('rival-detail-name').textContent=company.name;
    const quote=rivalOffer(company);
    const details=measures([['Kuruluş',`Oyun günü ${company.founded}`],['Merkez',cityName(company.province)],
      ['Sınıf',size(company)],['Strateji',STRATEGIES[company.strategy]],['Segment',segment[company.segment]],
      ['Risk / büyüme puanı',`${company.risk} / ${company.growth}`],['Şube / personel',`${company.branches.length} / ${company.branches.reduce((total,branch)=>total+branch.staff,0)}`],
      ['İtibar / memnuniyet',`${company.reputation} / ${company.satisfaction}`],['Pazar payı (30 gün)',percent.format(company.marketShare)],
      ['Şirket değeri · tahmin',money(quote.net)],['Kasa · tahmin',money(company.cash)],['Borç · tahmin',money(company.debt)],
      ['Günlük ciro',money(company.daily?.revenue??0)],['30 günlük ciro',money(sum(company.history.slice(-30),1))],
      ['365 günlük ciro',money(sum(company.history,1))],['30 günlük net kâr',signed(quote.profit)]]);
    const branchRows=company.branches.map(b=>element('p',`${cityName(b.province)} · ${company.stock.filter(item=>item.branch===b.id).length}/${BRANCH_TIERS[b.tier].capacity} stok · ${b.staff} çalışan`,'competition-story'));
    const statusNames={ready:'satışa hazır',transit:'nakliyede',inspected:'hazırlıkta'};
    const counts=Object.keys(statusNames).map(key=>`${company.stock.filter(b=>b.state===key).length} ${statusNames[key]}`);
    const events=[...company.events].reverse().slice(0,5).map(([day,action,,amount])=>element('p',`Gün ${day} · ${actions[action]} · ${money(amount)}`,'competition-story'));
    byId('rival-detail-data').replaceChildren(details,element('h3','Şubeler ve stok'),...branchRows,element('p',counts.join(' · '),'spec'),
      element('h3','Son işlemler'),...(events.length?events:[element('p','İşlem kaydı yok.','spec')]));
    byId('rival-offer-area').hidden=!quote.eligible;
    price.value=quote.threshold;
    confirmation=null;
    byId('rival-confirm-area').hidden=true;
    chart(state,company);
    offer();
    if(!dialog.open)dialog.showModal();
  }
  function offer() {
    const state=getState();
    const company=state.competition.companies.find(row=>row.id===selected);
    if(!company)return null;
    const amount=price.valueAsNumber;
    if(!Number.isSafeInteger(amount)||amount<=0||amount>1e9){
      byId('rival-review-offer').disabled=true;
      byId('rival-offer-status').textContent='Pozitif, tam TL tutarı girin.';
      byId('rival-offer-data').replaceChildren();
      return null;
    }
    const quote=rivalOffer(company,amount);
    measures([['Teklif',money(quote.price)],['İşlem gideri',money(quote.fees)],['Toplam bedel',money(quote.total)],
      ['Şube / stok / personel',`${company.branches.length} / ${company.stock.length} / ${company.branches.reduce((n,b)=>n+b.staff,0)}`],
      ['Devralınacak kasa',money(company.cash)],['Devralınacak borç',money(company.debt)],
      ['Tahmini 30 günlük ROI',quote.roi===null?'—':percent.format(quote.roi)]],byId('rival-offer-data'));
    byId('rival-review-offer').disabled=quote.total>state.cash;
    byId('rival-offer-status').textContent=quote.total>state.cash?'Toplam bedel için yeterli nakit yok.':'Teklif şirket yönetimi tarafından değerlendirilir.';
    return quote;
  }

  byId('competition-page').addEventListener('click',event=>{
    const target=event.target.closest('button');
    if(!target)return;
    if(target.dataset.competitionTab)changeTab(target);
    if(target.dataset.rivalDetail)showDetail(target.dataset.rivalDetail);
    if(Object.hasOwn(target.dataset,'rivalMore')){limit+=20;render();}
  });
  byId('competition-page').addEventListener('keydown',event=>{
    if(!tabs.includes(event.target)||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const index=tabs.indexOf(active);
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
      (index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    changeTab(tabs[next],true);
  });
  for(const id of ['rival-search','rival-city','rival-size','rival-strategy','rival-rank-city','rival-rank-metric']) {
    byId(id).addEventListener(id==='rival-search'?'input':'change',()=>{limit=20;render();});
  }
  byId('rival-period').addEventListener('change',()=>{
    const state=getState(),company=state.competition.companies.find(row=>row.id===selected);
    if(company)chart(state,company);
  });
  price.addEventListener('input',()=>{confirmation=null;byId('rival-confirm-area').hidden=true;offer();});
  byId('rival-review-offer').addEventListener('click',()=>{
    const quote=offer();
    if(!quote)return;
    if(!quote.accepted) {
      byId('rival-offer-status').textContent='Şirket yönetimi bu teklifi reddetti.';
      return;
    }
    confirmation={price:quote.price,stamp:getState().competition.day,confirmed:true};
    byId('rival-confirm-text').textContent=`${money(quote.total)} kasadan düşecek. Kasa, borç, stok, şube ve personeli devralmayı onaylayın.`;
    byId('rival-confirm-area').hidden=false;
  });
  byId('rival-confirm').addEventListener('click',async()=>{
    if(!confirmation)return;
    const approved=confirmation;confirmation=null;
    byId('rival-confirm-area').hidden=true;
    const done=await dispatch('acquire-rival',selected,approved);
    if(done && dialog.open)dialog.close();
    else byId('rival-offer-status').textContent='İşlem onaylanmadı. Güncel teklifi yeniden açın.';
  });
  return {render};
}
