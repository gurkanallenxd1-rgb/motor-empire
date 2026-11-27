import { ECONOMY_MODELS, economyQuote, marketMovers, marketSeries, regionalEstimates } from './economy.mjs?v=0.16';
import { ISTANBUL, PROVINCES, provinceName } from './provinces.mjs?v=0.16';

const pct = new Intl.NumberFormat('tr-TR',{style:'percent',maximumFractionDigits:1});
const total = values=>values.reduce((sum,n)=>sum+n,0);
const riskBand = number=>number<.34 ? 'Düşük' : number<.58 ? 'Orta' : 'Yüksek';
const xInset = 14;
const yInset = 19;

export function createMarketAnalysis({byId,element,metric,money,signed,getState,getDestination,estimate,openListing}) {
  const dialog = byId('market-analysis');
  const modelSelect = byId('analysis-model');
  const modelYear = byId('analysis-year');
  const provinceSelect = byId('analysis-province');
  const periodSelect = byId('analysis-period');
  const canvas = byId('analysis-chart');
  const slider = byId('analysis-point');
  const rangeLabel = byId('analysis-range-label');
  const status = byId('analysis-history-status');
  const detail = byId('analysis-point-value');
  let series = [];
  let startDay = 1;
  let endDay = 1;
  let marketState;
  let chosen;

  modelSelect.append(...[...ECONOMY_MODELS].sort((a,b)=>a.name.localeCompare(b.name,'tr'))
    .map(model=>new Option(model.name,model.id)));
  provinceSelect.append(...PROVINCES.map(province=>new Option(province.name,province.id)));
  modelSelect.value = 'yamaha-r25';
  provinceSelect.value = ISTANBUL;

  function chart() {
    if (series.length<2) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width,h = canvas.height;
    const low = Math.min(...series.map(row=>row.price))*.96;
    const high = Math.max(...series.map(row=>row.price))*1.04;
    const point = row=>[xInset+(row.day-startDay)/(endDay-startDay)*(w-xInset*2),
      h-yInset-(row.price-low)/(high-low)*(h-yInset*2)];
    ctx.clearRect(0,0,w,h);
    ctx.strokeStyle = '#454e48';
    ctx.lineWidth = 1;
    for (let i=1;i<4;i++) {
      ctx.beginPath();
      ctx.moveTo(xInset,h*i/4);
      ctx.lineTo(w-xInset,h*i/4);
      ctx.stroke();
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffad74';
    ctx.beginPath();
    series.forEach((row,i)=>{
      const [x,y] = point(row);
      if (!i || row.day-series[i-1].day>1) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.stroke();
    series.forEach((row,i)=>{
      const [x,y] = point(row);
      ctx.beginPath();
      ctx.arc(x,y,i===Number(slider.value)?7:3.5,0,2*Math.PI);
      ctx.fillStyle = i===Number(slider.value) ? '#fff0db' : '#ffad74';
      ctx.fill();
    });
    const row = series[Number(slider.value)];
    detail.textContent = `Gün ${row.day} · ${money(row.price)} · ${row.count} ilan`;
  }

  function opportunityList(state,model) {
    const destination = getDestination();
    const items = state.listings.filter(item=>item.name===model.name && !item.easterEgg);
    const offers = items.map(item=>({item,...estimate(item,item.price,destination,state.economy)}))
      .filter(item=>item.profit>0).sort((a,b)=>b.profit-a.profit).slice(0,5);
    const rows = offers.map(({item,profit,total:cost,saleDays,risk,lowAsk})=>{
      const node = element('div','','analysis-opportunity');
      const button = element('button',`${provinceName(item.province)} · ${money(item.price)}`);
      button.type = 'button';
      button.addEventListener('click',()=>{dialog.close();openListing(item.id);});
      node.append(button,element('p',`Maliyet ${money(cost)} · Beklenen net ${signed(profit)}`,'spec'),
        element('p',saleDays===undefined ? 'Bu kayıt için talep tahmini yok.' : `Yaklaşık ${saleDays} gün · ${riskBand(risk)} sermaye riski${lowAsk ? ' · Beyana göre çok düşük fiyat' : ''}`,'spec'));
      return node;
    });
    byId('analysis-opportunities').replaceChildren(
      element('p',`Satış bölgesi ${provinceName(destination)} · Tahmin nakliye ve servis giderlerini içerir.`,'spec'),
      ...(rows.length ? rows : [element('p','Bu modelde pozitif beklenen kâr gösteren ilan yok.','spec')]));
  }

  function render(force=false) {
    const state = getState();
    if (!dialog.open || !state?.economy || !force && marketState===state) return;
    marketState = state;
    const market = state.economy;
    const model = ECONOMY_MODELS.find(item=>item.id===modelSelect.value) ?? ECONOMY_MODELS[0];
    if (model.id!==chosen) {
      chosen = model.id;
      modelYear.replaceChildren(...Array.from({length:model.lastYear-model.firstYear+1},(_,i)=>{
        const year = model.lastYear-i;
        return new Option(year,year);
      }));
    }
    const province = Number(provinceSelect.value);
    const year = Number(modelYear.value);
    const period = Number(periodSelect.value);
    const quote = economyQuote(market,model,year,province);
    const active = state.listings.filter(item=>item.name===model.name);
    const prices = active.map(item=>item.price);
    const daysListed = state.sales.filter(row=>row.name===model.name && row.day>state.day-period &&
      Number.isFinite(row.daysListed) && row.returnedDay===undefined).map(row=>row.daysListed);
    byId('analysis-stats').replaceChildren(
      metric('Modelin ortalama ilanı',prices.length ? money(Math.round(total(prices)/prices.length)) : 'İlan yok'),
      metric('Arz · Açık ilan',String(active.length)),
      metric('Talep endeksi',pct.format(quote.demand)),
      metric('Tahmini satış süresi',`${quote.days} gün`),
      metric('Gerçekleşen ort. satış',daysListed.length ? `${(total(daysListed)/daysListed.length).toLocaleString('tr-TR',{maximumFractionDigits:1})} gün` : 'Henüz satış verisi yok'),
      metric('Sermaye riski',riskBand(quote.risk)));
    const macro = market.macro;
    byId('analysis-macro').replaceChildren(
      element('strong',`${macro.season} · ${macro.regime}`),
      element('p',`Yıllık enflasyon ${pct.format(macro.inflation)} · Büyüme ${pct.format(macro.growth)}`,'spec'),
      element('p',`Kur endeksi ${pct.format(macro.exchange)} · Sıfır motosiklet ${pct.format(macro.newPrice)} · Parça ${pct.format(macro.parts)}`,'spec'));
    series = marketSeries(market,model.id,period);
    startDay = Math.max(1,market.day-period+1);
    endDay = market.day;
    status.textContent = series.length<2 ? 'Grafik için yeterli geçmiş veri henüz oluşmadı.'
      : `${period} günlük aralıkta ${series.length} gözlem günü. Noktalar Türkiye genelindeki ilan ortalamalarıdır.`;
    canvas.hidden = rangeLabel.hidden = series.length<2;
    slider.max = Math.max(0,series.length-1);
    slider.value = slider.max;
    detail.textContent = series.length===1 ? `Gün ${series[0].day} · ${money(series[0].price)} · ${series[0].count} ilan` : '';
    chart();
    const movers = marketMovers(market,period);
    const top = movers.filter(row=>row.change>0).slice(0,3);
    const bottom = movers.filter(row=>row.change<0).slice(-3).reverse();
    byId('analysis-movers').replaceChildren(
      element('p','Aynı model yılı için piyasa endeksi değişimi','spec'),
      ...[...top,...bottom].map(row=>element('p',`${row.name} · ${row.change>0?'+':''}${pct.format(row.change)}`,row.change>0?'positive':'negative')),
      ...(!top.length && !bottom.length ? [element('p','Karşılaştırma için yeterli fiyat değişimi yok.','spec')] : []));
    const regionalStock = new Map();
    for (const row of active) if (row.year===year) {
      const location = row.province ?? ISTANBUL;
      regionalStock.set(location,(regionalStock.get(location) ?? 0)+1);
    }
    const regions = regionalEstimates(market,model,year);
    byId('analysis-regions').replaceChildren(
      element('p',`${model.name} · ${year} · Temiz motosiklet referans değeri, nakliye hariç.`,'spec'),
      ...regions.map(region=>element('p',`${region.name} · ${money(region.price)} · Talep ${pct.format(region.demand)} · ${regionalStock.get(region.id) ?? 0} ilan`,
        region.id===province ? 'analysis-selected' : 'spec')));
    opportunityList(state,model);
  }

  byId('market-analysis-open').addEventListener('click',()=>{
    if (!dialog.open) dialog.showModal();
    provinceSelect.value = getDestination();
    render(true);
  });
  for (const control of [modelSelect,modelYear,provinceSelect,periodSelect])
    control.addEventListener('change',()=>render(true));
  slider.addEventListener('input',chart);
  canvas.addEventListener('click',event=>{
    const x = (event.clientX-canvas.getBoundingClientRect().left)/canvas.clientWidth;
    const day = startDay+(endDay-startDay)*x;
    slider.value = series.reduce((best,row,i)=>Math.abs(row.day-day)<Math.abs(series[best].day-day) ? i : best,0);
    chart();
  });
  return {refresh:render};
}
