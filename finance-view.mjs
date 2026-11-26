import { FINANCE_CATEGORIES, debtSummary, filterTransactions, financeReport, pendingCosts } from './finance.mjs?v=0.10';

const colors = {green:'#9dd7ae',red:'#ff9a85',orange:'#ffad74',blue:'#a7c3f1'};
const chartTypes = [
  {title:'Günlük net kâr',keys:[['profit','Gerçekleşen net kâr',colors.green]]},
  {title:'Gelir ve gider',keys:[['revenue','İşletme geliri',colors.green],['operatingCost','İşletme gideri',colors.red]],bars:true},
  {title:'Nakit değişimi',keys:[['cash','Kasa bakiyesi',colors.orange]]},
  {title:'Net servet gelişimi',keys:[['netWorth','Net servet',colors.blue]]},
  {title:'Satış ve kiralama',keys:[['salesCount','Satılan motosiklet',colors.green],['rentalDays','Ücretli kiralama günü',colors.orange]],
    bars:true,counts:true},
];

function drawChart(canvas,series,keys,selected,bars) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const dpi = Math.min(window.devicePixelRatio || 1,3);
  canvas.width = Math.ceil(width*dpi);
  canvas.height = Math.ceil(height*dpi);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpi,dpi);
  const inset = 9;
  const leftDay = series[0].day;
  const span = series.at(-1).day-leftDay;
  const x = index => span ? inset+(width-inset*2)*(series[index].day-leftDay)/span : width/2;
  let min = bars || keys[0][0] === 'profit' ? 0 : Infinity;
  let max = bars || keys[0][0] === 'profit' ? 0 : -Infinity;
  for (const row of series) for (const [key] of keys) if (row[key] !== null) {
    min = Math.min(min,row[key]);
    max = Math.max(max,row[key]);
  }
  const y = value => max === min ? height/2 : height-inset-(height-inset*2)*(value-min)/(max-min);
  ctx.strokeStyle = '#3c433f';
  ctx.lineWidth = 1;
  for (const gridY of [inset,height/2,height-inset]) {
    ctx.beginPath();
    ctx.moveTo(inset,gridY);
    ctx.lineTo(width-inset,gridY);
    ctx.stroke();
  }
  if (min < 0 && max > 0) {
    ctx.beginPath();
    ctx.moveTo(inset,y(0));
    ctx.lineTo(width-inset,y(0));
    ctx.stroke();
  }
  ctx.strokeStyle = '#929a91';
  ctx.beginPath();
  ctx.moveTo(x(selected),inset);
  ctx.lineTo(x(selected),height-inset);
  ctx.stroke();

  const barWidth = Math.max(1,Math.min(19,(width-2*inset)/Math.max(1,span+1)/2.4));
  keys.forEach(([key,,color],column)=>{
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (bars) {
      series.forEach((row,index)=>{
        if (!row[key]) return;
        const top = y(row[key]);
        ctx.fillRect(x(index)+(column-1)*barWidth,top,barWidth,Math.max(1,y(0)-top));
      });
      return;
    }
    ctx.beginPath();
    let connected = false;
    series.forEach((row,index)=>{
      if (row[key] === null) {
        connected = false;
        return;
      }
      if (connected) ctx.lineTo(x(index),y(row[key]));
      else ctx.moveTo(x(index),y(row[key]));
      connected = true;
    });
    ctx.stroke();
    series.forEach((row,index)=>{
      if (row[key] === null || (index !== selected && series.length > 45)) return;
      ctx.beginPath();
      ctx.arc(x(index),y(row[key]),index===selected ? 4 : 2,0,Math.PI*2);
      ctx.fill();
    });
  });
}

export function createFinanceView({byId,element,metric,money,signed,repairForecast,inspectionFee,loanLimit,tradeSummary}) {
  const periodSelect = byId('finance-period');
  const filters = byId('finance-filters');
  const branchFilter = byId('finance-branch');
  const number = new Intl.NumberFormat('tr-TR');
  const percentage = new Intl.NumberFormat('tr-TR',{style:'percent',maximumFractionDigits:1});
  const charts = byId('finance-charts');
  let state, worth, report;
  let limit = 30, archiveLimit = 30;
  let redraw = [];

  function row(title,description,amount,style) {
    const item = element('div','','sale');
    const detail = element('div','');
    detail.append(element('b',title),element('p',description,'spec'));
    item.append(detail,element('strong',amount,style));
    return item;
  }

  function chartCard(type,series) {
    const {title,keys,bars,counts} = type;
    const card = element('article','','card finance-chart');
    const legend = element('div','','finance-chart-legend');
    for (const [,label,color] of keys) {
      const key = element('span',label);
      key.style.setProperty('--series',color);
      legend.append(key);
    }
    const canvas = element('canvas','');
    canvas.setAttribute('aria-hidden','true');
    const axis = element('div','','finance-axis');
    axis.append(element('span',`Gün ${series[0].day}`),element('span',`Gün ${series.at(-1).day}`));
    const range = element('input','');
    range.type = 'range';
    range.min = '0';
    range.max = String(series.length-1);
    range.disabled = series.length===1;
    range.setAttribute('aria-label',`${title} · gün seç`);
    const output = element('output','','finance-chart-value');
    output.setAttribute('aria-live','polite');
    const select = index => {
      range.value = String(index);
      const item = series[index];
      range.setAttribute('aria-valuetext',`Gün ${item.day}`);
      const format = key => {
        const value = item[key];
        if (value === null) return 'kayıt yok';
        if (counts) return number.format(value);
        return key === 'profit' ? signed(value) : money(value);
      };
      output.textContent = `Gün ${item.day} · ${keys.map(([key,label])=>`${label} ${format(key)}`).join(' · ')}`;
      drawChart(canvas,series,keys,index,bars);
    };
    range.addEventListener('input',()=>select(range.valueAsNumber));
    canvas.addEventListener('click',event=>{
      const rect = canvas.getBoundingClientRect();
      const fraction = Math.max(0,Math.min(1,(event.clientX-rect.left-9)/(rect.width-18)));
      const target = series[0].day + fraction*(series.at(-1).day-series[0].day);
      const index = series.reduce((closest,item,i)=>Math.abs(item.day-target)<Math.abs(series[closest].day-target) ? i : closest,0);
      select(index);
    });
    card.append(element('h3',title),legend,canvas,axis,range,output);
    const draw = ()=>drawChart(canvas,series,keys,range.valueAsNumber,bars);
    redraw.push(draw);
    select(series.length-1);
    return card;
  }

  function allocationCard() {
    const card = element('article','','card finance-chart');
    const bar = element('div','','finance-allocation');
    const detail = element('div','','finance-allocation-values');
    const output = element('output',`Gün ${state.day} · Toplam ${money(worth.total)}`,'finance-chart-value');
    output.setAttribute('aria-live','polite');
    for (const [label,value,color] of [['Nakit',state.cash,colors.green],['Stok',worth.inventory,colors.orange],
      ['Yatırımlar',worth.equipment,colors.blue]]) {
      const select = ()=>{
        const share = worth.total ? value/worth.total : 0;
        output.textContent = `${label} · ${percentage.format(share)} · ${money(value)}`;
      };
      if (value>0) {
        const segment = element('button','');
        segment.type = 'button';
        segment.style.flexGrow = String(value);
        segment.style.backgroundColor = color;
        segment.setAttribute('aria-label',`${label} · ${money(value)}`);
        segment.addEventListener('click',select);
        bar.append(segment);
      }
      const button = element('button',`${label} · ${money(value)}`);
      button.type = 'button';
      button.style.setProperty('--series',color);
      button.addEventListener('click',select);
      detail.append(button);
    }
    card.append(element('h3','Varlık dağılımı'),bar,detail,output);
    return card;
  }

  function displayTransactions() {
    if (!report) return;
    const read = id => {
      const value = byId(id).valueAsNumber;
      return Number.isFinite(value) ? value : null;
    };
    const entries = filterTransactions(report.entries,{category:byId('finance-category').value,
      branch:branchFilter.value,from:read('finance-from-day'),to:read('finance-to-day')});
    byId('transactions').replaceChildren(...(entries.length ? entries.slice(0,limit).map(entry=>{
      const branch = state.branches.find(item=>item.id===entry.branchId)?.name
        ?? (['loan','principal','interest'].includes(entry.category) ? 'Genel kasa' : 'Şube kaydı yok');
      const tone = entry.category==='investment' ? 'investment' : ['loan','principal'].includes(entry.category)
        ? 'financing' : entry.change < 0 ? 'negative' : 'positive';
      return row(entry.model ?? entry.label,`Gün ${entry.day} · ${FINANCE_CATEGORIES[entry.category]} · ${branch}`,signed(entry.change),tone);
    }) : [element('p','Filtreye uyan işlem yok.','muted')]));
    byId('more-history').hidden = entries.length<=limit;
  }

  function displayArchives() {
    const summary = tradeSummary(state.trade);
    byId('finance-reputation').replaceChildren(metric('İtibar',`${state.trade.reputation} / 100`),
      metric('Satış başarı oranı',summary.success === null ? '—' : `%${summary.success}`),
      metric('Müşteri memnuniyeti',summary.average === null ? '—' : `%${summary.average}`));
    const outcomes = {sold:'Satıldı',bought:'Satın alındı',rejected:'Reddedildi',left:'Görüşme kesildi',expired:'Süresi doldu'};
    const trades = state.trade.history.slice(0,archiveLimit).map(item=>row(item.name,
      `Gün ${item.day} · ${item.person} · ${outcomes[item.outcome]} · ${item.rounds} tur`,money(item.price)));
    const sales = state.sales.slice(0,archiveLimit).map(sale=>{
      const profit = (Math.round(sale.price*100)-Math.round(sale.spent*100))/100;
      return row(sale.name,`Gün ${sale.day} · Satış ${money(sale.price)} · Maliyet ${money(sale.spent)}`,
        signed(profit),profit < 0 ? 'negative' : 'positive');
    });
    byId('trade-history').replaceChildren(...(trades.length ? trades : [element('p','Henüz görüşme tamamlanmadı.','muted')]));
    byId('sales').replaceChildren(...(sales.length ? sales : [element('p','Henüz satış yok.','muted')]));
    byId('more-finance-archives').hidden = Math.max(state.trade.history.length,state.sales.length)<=archiveLimit;
  }

  function display() {
    report = financeReport(state,worth,Number(periodSelect.value));
    const {today,totals,series,periodTotals} = report;
    const pending = pendingCosts(state,repairForecast,inspectionFee);
    const card = (label,value,{note,tone} = {})=>{
      const node = metric(label,value);
      if (tone) node.classList.add(tone);
      if (note) node.append(element('span',note,'spec finance-note'));
      return node;
    };
    const pnl = amount => amount < 0 ? 'negative' : 'positive';
    byId('finance-summary').replaceChildren(
      card('Kullanılabilir nakit',money(state.cash),{tone:'positive'}),
      card('Toplam varlık',money(worth.total)),
      card('Toplam borç',money(state.debt),{tone:state.debt ? 'negative' : ''}),
      card('Net servet',money(worth.net),{tone:pnl(worth.net)}),
      card('Günlük net kâr',signed(today.profit),{tone:pnl(today.profit)}),
      card('Toplam gerçekleşen net kâr',signed(totals.profit),{tone:pnl(totals.profit)}),
      card('Motosiklet stok değeri',money(worth.inventory)),
      card('Şube ve işletme yatırımları',money(worth.equipment),{tone:'investment'}),
      card('Bekleyen nakliye maliyetleri',money(pending.shipping),{note:'Yoldaki araçlar için ödendi'}),
      card('Bekleyen tamir maliyetleri',money(pending.repairPaid+pending.repairUnpaid),
        {note:`${money(pending.repairPaid)} ödendi · ${money(pending.repairUnpaid)} tahmini`}));
    byId('finance-period-summary').replaceChildren(
      card('Nakit girişi',money(periodTotals.cashIn),{tone:'positive'}),
      card('Nakit çıkışı',money(periodTotals.cashOut),{tone:'negative'}),
      card('Net nakit akışı',signed(periodTotals.cashIn-periodTotals.cashOut)),
      card('Tahmini stok satış kârı',signed(pending.estimatedStockProfit),{note:'Mevcut stok · Piyasa değerine göre'}));
    const values = [card('Satılan motosiklet',number.format(periodTotals.salesCount)),card('Satış hasılatı',money(periodTotals.salesRevenue)),
      card('Satıştan net kâr',signed(periodTotals.salesRevenue-periodTotals.salesCost)),
      card('Ücretli kiralama günü',number.format(periodTotals.rentalDays)),card('Kiralama geliri',money(periodTotals.rentalRevenue)),
      card('Faiz gideri',money(periodTotals.interest))];
    byId('finance-activity').replaceChildren(...values);
    redraw = [];
    charts.replaceChildren(...chartTypes.map(type=>chartCard(type,series)),allocationCard());
    redraw.forEach(draw=>draw());

    const debt = debtSummary(state,totals,loanLimit);
    byId('credit-summary').replaceChildren(metric('Kalan anapara',money(debt.principal)),
      metric('Faiz oranı',`%${debt.interestRate}`),metric('Toplam geri ödeme',money(debt.totalRepayment)),
      metric('Ödenen anapara',money(debt.paid)),metric('Ödenen faiz',money(debt.interestPaid)),
      metric('Kalan taksit',debt.installments ?? 'Plan yok'),metric('Sonraki ödeme günü',debt.nextDay ?? 'Belirlenmedi'));
    byId('credit-available').textContent = `Kullanılabilir borç limiti · ${money(debt.available)}`;
    byId('borrow').disabled = debt.available===0;
    byId('repay').disabled = !debt.principal || !state.cash;

    const selected = branchFilter.value;
    branchFilter.replaceChildren(new Option('Tümü',''),...state.branches.map(branch=>
      new Option(branch.name,String(branch.id))),new Option('Genel kasa / şubesiz','unassigned'));
    branchFilter.value = selected;
    displayTransactions();
    displayArchives();
  }
  byId('finance-category').append(...Object.entries(FINANCE_CATEGORIES).map(([key,label])=>new Option(label,key)));
  periodSelect.addEventListener('change',()=>display());
  filters.addEventListener('input',()=>{limit=30;displayTransactions();});
  filters.addEventListener('reset',()=>setTimeout(()=>{limit=30;displayTransactions();},0));
  filters.addEventListener('submit',event=>event.preventDefault());
  byId('more-history').addEventListener('click',()=>{limit+=30;displayTransactions();});
  byId('more-finance-archives').addEventListener('click',()=>{archiveLimit+=30;displayArchives();});
  if ('ResizeObserver' in window) new ResizeObserver(()=>redraw.forEach(draw=>draw())).observe(charts);
  else window.addEventListener('resize',()=>redraw.forEach(draw=>draw()));
  return (next,nextWorth)=>{
    if (next===state) return;
    state = next;
    worth = nextWorth;
    display();
  };
}
