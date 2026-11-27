import { paintOptions } from './bikes.mjs?v=0.16.1';
import { ECONOMY_MODELS,economyQuote,marketMovers,marketSeries,regionalEstimates } from './economy.mjs?v=0.16.1';
import { inbox,noticeTime } from './notifications.mjs?v=0.16.1';
import { provinceName } from './provinces.mjs?v=0.16.1';
import { renderSprite } from './sprite.mjs?v=0.16.1';

const percent = new Intl.NumberFormat('tr-TR',{style:'percent',maximumFractionDigits:1});
const number = new Intl.NumberFormat('tr-TR',{maximumFractionDigits:1});
const signedPercent = value=>(value>0?'+':'')+percent.format(value);
const tone = value=>value>0?'positive':value<0?'negative':'';
const riskBand = value=>value<.34?'Düşük':value<.58?'Orta':'Yüksek';
const average = values=>values.reduce((sum,n)=>sum+n,0)/values.length;
const searchKey = value=>value.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i').trim();

export function createMarketAnalysis({byId,element,money,signed,getState,getDestination,estimate,openListing}) {
  const page = byId('market-analysis-page');
  const modelSelect = byId('analysis-model');
  const yearSelect = byId('analysis-year');
  const periodSelect = byId('analysis-period');
  const citySearch = byId('analysis-city-search');
  const citySort = byId('analysis-city-sort');
  const tabs = [...page.querySelectorAll('[role=tab]')];
  const canvas = byId('analysis-chart');
  const slider = byId('analysis-point');
  const detail = byId('analysis-point-value');
  let currentTab = 'summary';
  let selectedModel;
  let spriteKey;
  let marketState;
  let series = [];
  let startDay;
  let endDay;
  let regions = [];
  let renderingKey = '';

  modelSelect.append(...[...ECONOMY_MODELS].sort((a,b)=>a.name.localeCompare(b.name,'tr'))
    .map(model=>new Option(model.name,model.id)));
  modelSelect.value = 'yamaha-r25';

  function rows(data) {
    return data.flatMap(([label,value,style])=>[element('dt',label),element('dd',value,style)]);
  }

  function chart() {
    if (series.length<2) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width,h = canvas.height;
    const x0 = 174,x1 = w-16,y0 = 27,y1 = h-53;
    const low = Math.min(...series.map(row=>row.price))*.96;
    const high = Math.max(...series.map(row=>row.price))*1.04;
    const point = row=>[x0+(row.day-startDay)/(endDay-startDay)*(x1-x0),y1-(row.price-low)/(high-low)*(y1-y0)];
    ctx.clearRect(0,0,w,h);
    ctx.font = '23px system-ui';
    ctx.fillStyle = '#d3d7d1';
    ctx.strokeStyle = '#49504d';
    ctx.lineWidth = 1;
    ctx.textAlign = 'right';
    for (let i=0;i<4;i++) {
      const y = y1-(y1-y0)*i/3;
      ctx.fillText(money(Math.round((low+(high-low)*i/3)/100)*100),x0-10,y+7);
      ctx.beginPath();
      ctx.moveTo(x0,y);
      ctx.lineTo(x1,y);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
    ctx.fillText(`Gün ${startDay}`,x0,h-18);
    ctx.textAlign = 'right';
    ctx.fillText(`Gün ${endDay}`,x1,h-18);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffad74';
    ctx.beginPath();
    series.forEach((row,i)=>{
      const [x,y] = point(row);
      if (!i || row.day-series[i-1].day>1) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    });
    ctx.stroke();
    const selected = Number(slider.value);
    series.forEach((row,i)=>{
      const [x,y] = point(row);
      ctx.beginPath();
      ctx.arc(x,y,i===selected?8:4,0,2*Math.PI);
      ctx.fillStyle = i===selected?'#fff0db':'#ffad74';
      ctx.fill();
    });
    const row = series[selected];
    detail.textContent = `Gün ${row.day} · ${money(row.price)} · ${row.count} ilan`;
    slider.setAttribute('aria-valuetext',detail.textContent);
  }

  function summary(state,model,year,period) {
    const market = state.economy;
    const active = state.listings.filter(item=>item.name===model.name && item.year===year);
    const quote = economyQuote(market,model,year,getDestination());
    const history = marketSeries(market,model.id,90);
    const latest = history.at(-1);
    byId('analysis-brand').textContent = model.brand;
    byId('analysis-name').textContent = `${model.name.startsWith(model.brand+' ') ? model.name.slice(model.brand.length+1) : model.name} · ${year}`;
    byId('analysis-current-price').textContent = active.length ? money(Math.round(average(active.map(item=>item.price)))) : 'Güncel ilan yok';
    byId('analysis-latest-price').textContent = latest
      ? `Son model gözlemi · ${money(latest.price)} · Gün ${latest.day}`
      : 'Henüz model gözlemi yok.';
    const previous = `${model.id}:${year}`;
    if (spriteKey!==previous) {
      spriteKey = previous;
      const color = active[0]?.color ?? paintOptions(model,year)[0]?.hex;
      const image = byId('analysis-bike');
      image.setAttribute('aria-label',`${model.name} ${year}`);
      renderSprite(image,byId('analysis-bike-unavailable'),{name:model.name,year,color,paintAccent:active[0]?.paintAccent ?? paintOptions(model,year)[0]?.accent},byId('analysis-bike-label'));
    }
    const sold = state.sales.filter(row=>row.name===model.name && row.day>state.day-period &&
      Number.isFinite(row.daysListed) && row.returnedDay===undefined);
    byId('analysis-stats').replaceChildren(...rows([
      ['Tahmini satış süresi',`${quote.days} gün`],['Talep endeksi',percent.format(quote.demand)],
      ['Yatırım riski',riskBand(quote.risk),'analysis-risk'],['Aktif ilan',String(active.length)],
      ...(sold.length ? [['Gerçekleşen ortalama satış',`${number.format(average(sold.map(row=>row.daysListed)))} gün`]] : []),
    ]));
    series = marketSeries(market,model.id,period);
    startDay = Math.max(1,market.day-period+1);
    endDay = market.day;
    const status = byId('analysis-history-status');
    status.textContent = series.length<2 ? 'Grafik için yeterli geçmiş veri henüz oluşmadı.'
      : `${period} günlük aralıkta ${series.length} gözlem günü · Türkiye, tüm model yılları`;
    const change = series.length>1 ? series.at(-1).price/series[0].price-1 : null;
    byId('analysis-current-change').replaceChildren(element('p',change===null ? 'Dönem değişimi için veri yetersiz.'
      : `${signedPercent(change)} · ${period} günlük model değişimi`,change===null?'spec':tone(change)));
    canvas.hidden = byId('analysis-range-label').hidden = series.length<2;
    slider.max = Math.max(0,series.length-1);
    slider.value = slider.max;
    detail.textContent = '';
    chart();
  }

  function opportunities(state,period) {
    const destination = getDestination();
    const deals = state.listings.filter(item=>!item.easterEgg)
      .map(item=>({item,...estimate(item,item.price,destination,state.economy)}))
      .filter(deal=>deal.profit>0).sort((a,b)=>b.profit-a.profit).slice(0,8);
    byId('analysis-destination').textContent = `Türkiye geneli · Satış şubesi ${provinceName(destination)}`;
    byId('analysis-opportunities').replaceChildren(...deals.map(deal=>{
      const {item,profit,expectedPrice,afterValue,cost,delivery,total,saleDays,risk} = deal;
      const div = element('article','','analysis-deal');
      const data = element('dl','','analysis-measures');
      data.append(...rows([
        ['Alış',money(item.price)],['Tahmini satış',money(expectedPrice ?? afterValue)],
        ['Nakliye',money(delivery.fee)],['Tamir',money(cost)],
        ['Net kâr',signed(profit),'positive'],['ROI',signedPercent(profit/total),'positive'],
        ['Tahmini satış süresi',saleDays ? `${saleDays} gün` : '—'],
      ]));
      const button = element('button','İlanı aç');
      button.type = 'button';
      button.addEventListener('click',()=>openListing(item.id));
      div.append(element('h4',`${item.name} · ${item.year}`),element('p',provinceName(item.province),'spec'),data);
      if (risk!==undefined) div.append(element('p',`${riskBand(risk)} yatırım riski${deal.lowAsk?' · Beyana göre çok düşük fiyat':''}`,'analysis-risk'));
      div.append(button);
      return div;
    }));
    if (!deals.length) byId('analysis-opportunities').append(element('p','Şu anda beklenen net kârı pozitif olan ilan yok.','analysis-empty'));
    const movers = marketMovers(state.economy,period);
    const group = (label,items)=>{
      const node = element('div');
      node.append(element('strong',label));
      for (const row of items) node.append(element('p',`${row.name} · ${signedPercent(row.change)}`,tone(row.change)));
      if (!items.length) node.append(element('p','Henüz veri yok.','spec'));
      return node;
    };
    byId('analysis-movers').replaceChildren(
      group('Yükselenler',movers.filter(row=>row.change>0).slice(0,3)),
      group('Düşenler',movers.filter(row=>row.change<0).slice(-3).reverse()));
  }

  function showCities() {
    const query = searchKey(citySearch.value);
    const matches = regions.filter(row=>searchKey(row.name).includes(query)).sort((a,b)=>
      citySort.value==='profit' ? b.profit-a.profit || a.total-b.total : a.price-b.price || a.total-b.total);
    byId('analysis-city-count').textContent = matches.length ? `${matches.length} / 81 il` : 'Aramanıza uyan il bulunamadı.';
    byId('analysis-regions').replaceChildren(...matches.map(row=>{
      const data = element('dl','','analysis-measures');
      data.append(...rows([['Referans alış',money(row.price)],['Nakliye dahil maliyet',money(row.total)],
        ['Beklenen bölgesel kâr',signed(row.profit),tone(row.profit)]]));
      const article = element('article','','analysis-city');
      article.append(element('h4',row.name),data);
      return article;
    }));
  }

  function cities(state,model,year) {
    const destination = getDestination();
    const cleanBase = Math.round(model.value*(1+(year-model.lastYear)*.009));
    regions = regionalEstimates(state.economy,model,year).map(region=>{
      // Compare identical clean reference vehicles through the unchanged destination forecast.
      const reference = {name:model.name,year,province:region.id,cleanBase,km:0,condition:100,faults:[],price:region.price,
        marketTerms:economyQuote(state.economy,model,year,region.id)};
      const projected = estimate(reference,region.price,destination,state.economy);
      return {...region,total:projected.total,profit:projected.profit};
    });
    byId('analysis-city-context').textContent = `${model.name} · ${year} · Satış ${provinceName(destination)}. Temiz motosiklet referansı üzerinden tahmin.`;
    showCities();
  }

  function economy(state) {
    const macro = state.economy.macro;
    const readings = [
      ['Mevsim',macro.season,'Mevsim, motosiklet türlerine göre talebi ve satış süresini değiştirir.'],
      ['Ekonomik durum',macro.regime,'Durgunlukta müşteri bütçeleri ve talep zayıflayabilir.'],
      ['Yıllık enflasyon',percent.format(macro.inflation),'İkinci el fiyatlarını ve yeni parça maliyetlerini etkiler.'],
      ['Büyüme',signedPercent(macro.growth),'Talebi ve müşterinin ayırabileceği bütçeyi etkiler.'],
      ['Kur endeksi',percent.format(macro.exchange),'Kur yükseldiğinde ithalat etkisi ikinci el değere ve parçalara yansır.'],
      ['Sıfır motosiklet fiyat endeksi',percent.format(macro.newPrice),'Yeni araç fiyatı yükseldiğinde ikinci el referans değeri de etkilenir.'],
      ['Yedek parça maliyet endeksi',percent.format(macro.parts),'Yeni tamir tekliflerini etkiler. Ödenmiş masraflar kayıtta kalır.'],
    ];
    byId('analysis-macro').replaceChildren(...readings.map(([label,value,explain])=>{
      const row = element('section','','analysis-reading');
      row.append(element('h3',label),element('strong',value),element('p',explain,'spec'));
      return row;
    }));
    const news = inbox(state).items.filter(item=>item.type==='economy');
    byId('analysis-news').replaceChildren(...news.map(item=>{
      const entry = element('article','','analysis-reading');
      entry.append(element('h4',item.title),element('p',noticeTime(item.time),'spec'),element('p',item.detail,'spec'));
      return entry;
    }));
    if (!news.length) byId('analysis-news').append(element('p','Henüz ekonomi haberi yok.','analysis-empty'));
  }

  function refresh() {
    const state = getState();
    if (page.hidden || !state?.economy) return;
    const model = ECONOMY_MODELS.find(item=>item.id===modelSelect.value) ?? ECONOMY_MODELS[0];
    if (model.id!==selectedModel) {
      selectedModel = model.id;
      yearSelect.replaceChildren(...Array.from({length:model.lastYear-model.firstYear+1},(_,i)=>{
        const year = model.lastYear-i;
        return new Option(year,year);
      }));
    }
    const year = Number(yearSelect.value);
    const period = Number(periodSelect.value);
    const key = [currentTab,model.id,year,period,getDestination()].join(':');
    if (marketState===state && renderingKey===key) return;
    marketState = state;
    renderingKey = key;
    if (currentTab==='summary') summary(state,model,year,period);
    else if (currentTab==='opportunities') opportunities(state,period);
    else if (currentTab==='cities') cities(state,model,year);
    else economy(state);
  }

  function activate(tab) {
    currentTab = tab.dataset.analysisTab;
    for (const option of tabs) {
      const selected = option===tab;
      option.tabIndex = selected ? 0 : -1;
      option.setAttribute('aria-selected',String(selected));
      byId(option.getAttribute('aria-controls')).hidden = !selected;
    }
    byId('analysis-model-controls').hidden = !['summary','cities'].includes(currentTab);
    refresh();
  }

  for (const [i,tab] of tabs.entries()) {
    tab.addEventListener('click',()=>activate(tab));
    tab.addEventListener('keydown',event=>{
      const index = {ArrowLeft:(i+tabs.length-1)%tabs.length,ArrowRight:(i+1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
      if (index===undefined) return;
      event.preventDefault();
      activate(tabs[index]);
      tabs[index].focus();
    });
  }
  for (const control of [modelSelect,yearSelect,periodSelect]) control.addEventListener('change',refresh);
  citySearch.addEventListener('input',showCities);
  citySort.addEventListener('change',showCities);
  slider.addEventListener('input',chart);
  canvas.addEventListener('click',event=>{
    if (series.length<2) return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX-bounds.left)/bounds.width*canvas.width;
    const day = startDay+(endDay-startDay)*(x-174)/(canvas.width-190);
    slider.value = series.reduce((best,row,i)=>Math.abs(row.day-day)<Math.abs(series[best].day-day) ? i : best,0);
    chart();
  });
  return {refresh};
}
