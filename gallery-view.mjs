import { reputationTier } from './characters.mjs?v=0.18.1';

const formatter=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1});

export function gallerySummary(state) {
  const reviews=state.trade.reviews??[];
  const counts=[0,0,0,0,0];
  let total=0,recentTotal=0,recentCount=0;
  for(const review of reviews){
    counts[review.stars-1]++;
    total+=review.stars;
    if(review.day>=state.day-29){recentTotal+=review.stars;recentCount++;}
  }
  const repeat=Object.values(state.trade.customers??{}).filter(c=>c.purchases>1).length;
  const complaints=state.sales.filter(s=>s.complaintResult || s.complaintDay!==undefined || s.openComplaint);
  const resolved=complaints.filter(s=>s.complaintResult?.outcome && s.complaintResult.outcome!=='dismiss'
    || s.complaintDay!==undefined && !s.openComplaint && !s.complaintResult).length;
  return {counts,count:reviews.length,average:reviews.length?total/reviews.length:null,
    recent:recentCount?recentTotal/recentCount:null,repeat,complaints:complaints.length,resolved,
    satisfaction:reviews.length?(counts[3]+counts[4])/reviews.length:null};
}

export function createGalleryView({byId,element,getState}) {
  const branch=byId('gallery-branch-filter');
  let limit=20;
  const rating=value=>value===null?'—':`${formatter.format(value)}/5`;
  function overview() {
    const state=getState(),summary=gallerySummary(state);
    byId('gallery-prestige').textContent=reputationTier(state.trade.reputation);
    byId('gallery-rating').textContent=`${state.trade.reputation}/100 · ${rating(summary.average)} · ${summary.count} yorum`;
  }
  function chart(state) {
    const node=byId('gallery-reputation-history');
    const history=state.trade.reputationHistory??[];
    if(history.length<2){node.replaceChildren(element('p','Grafik için en az iki itibar kaydı gerekiyor.','spec'));return;}
    const points=history.slice(-90);
    const first=points[0].day;
    const span=Math.max(1,points.at(-1).day-first);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 360 120');
    svg.setAttribute('role','img');
    svg.setAttribute('aria-label',`İtibar değişimi · Gün ${first}–${points.at(-1).day} · ${points[0].score} → ${points.at(-1).score}`);
    const line=document.createElementNS(svg.namespaceURI,'polyline');
    line.setAttribute('points',points.map(row=>`${10+(row.day-first)*340/span},${110-row.score}`).join(' '));
    line.setAttribute('stroke','#ff9d65');
    line.setAttribute('stroke-width','2');
    line.setAttribute('fill','none');
    svg.append(line);
    node.replaceChildren(svg,element('p',`Gün ${first}–${points.at(-1).day} · 0–100 itibar`,'spec'));
  }
  function detail() {
    const state=getState(),summary=gallerySummary(state);
    const {reputation}=state.trade;
    const selected=branch.value;
    if(branch.options.length!==state.branches.length+1) {
      branch.replaceChildren(new Option('Tüm şubeler',''),...state.branches.map(b=>new Option(b.name,b.id)));
      branch.value=selected;
    }
    const fields=[['Prestij',reputationTier(reputation)],['İtibar',`${reputation}/100`],['Ortalama',rating(summary.average)],
      ['Toplam yorum',summary.count],['Memnuniyet (4–5 ★)',summary.satisfaction===null?'—':
        new Intl.NumberFormat('tr-TR',{style:'percent',maximumFractionDigits:1}).format(summary.satisfaction)],
      ['Son 30 gün',rating(summary.recent)],['Tekrar alışveriş yapan',summary.repeat],
      ['Toplam şikâyet',summary.complaints],['Çözülen şikâyet',summary.resolved]];
    byId('gallery-profile-metrics').replaceChildren(...fields.flatMap(([label,value])=>
      [element('dt',label),element('dd',String(value))]));
    byId('gallery-distribution').replaceChildren(...summary.counts.map((count,index)=>{
      const row=element('li','','gallery-distribution-row');
      const bar=document.createElement('progress');
      bar.max=Math.max(1,summary.count);
      bar.value=count;
      bar.setAttribute('aria-label',`${index+1} yıldızlı yorumlar`);
      row.append(element('span',`${index+1} ★`),bar,element('span',String(count)));
      return row;
    }).reverse());
    chart(state);
    renderReviews();
  }
  function renderReviews(){
    const state=getState();
    const stars=Number(byId('gallery-stars-filter').value);
    const period=Number(byId('gallery-period-filter').value);
    const saleBranches=new Map(state.sales.map(sale=>[sale.id,sale.branchId]));
    const reviews=(state.trade.reviews??[]).filter(review=>
      (!stars||review.stars===stars)&&(!period||review.day>=state.day-period+1)
      &&(!branch.value||String(review.branchId??saleBranches.get(review.saleId))===branch.value));
    const rows=reviews.slice(0,limit).map(review=>element('li',
      `${review.stars}/5 ★ · Gün ${review.day} · ${review.person} · ${review.text}`,'competition-story'));
    byId('gallery-reviews').replaceChildren(...(rows.length?rows:[element('li','Bu filtrelerde yorum yok.','spec')]));
    byId('gallery-more').hidden=reviews.length<=limit;
  }
  for(const id of ['gallery-stars-filter','gallery-period-filter','gallery-branch-filter'])
    byId(id).addEventListener('change',()=>{limit=20;renderReviews();});
  byId('gallery-more').addEventListener('click',()=>{limit+=20;renderReviews();});
  return {overview,detail};
}
