import { inbox, NOTICE_TYPES, noticeTime, SALE_TOAST_MS } from './notifications.mjs?v=0.18';
import { renderSprite } from './sprite.mjs?v=0.16.1';

export function createNotifications({byId,element,money,signed,dispatch}) {
  const dialog = byId('notification-dialog');
  const stack = byId('sale-toasts');
  const filter = byId('notification-filter');
  const history = byId('notification-history');
  const detail = byId('notification-detail');
  const soundInput = byId('notification-sound');
  const toggles = new Map();
  const tray=byId('sale-toast-list');
  const liveCards=new Map();
  let box = inbox({});
  let cursor;
  let sound;
  let detailId;
  let confirmClear = false;
  const modalOrder = [];

  function mountToasts() {
    const top = modalOrder.filter(modal=>modal.open).at(-1) ?? document.body;
    if (stack.parentElement!==top) top.append(stack);
  }
  const modals = new MutationObserver(changes=>{
    for (const {target} of changes) {
      const previous = modalOrder.indexOf(target);
      if (previous!==-1) modalOrder.splice(previous,1);
      if (target.open) modalOrder.push(target);
    }
    mountToasts();
  });
  for (const modal of document.querySelectorAll('dialog')) modals.observe(modal,{attributeFilter:['open']});

  function activateAudio() {
    if (!soundInput.checked && !box.sound) return;
    const Audio = window.AudioContext ?? window.webkitAudioContext;
    if (!Audio) return;
    try {
      sound ??= new Audio();
      if (sound.state==='suspended') sound.resume().catch(()=>{});
    } catch {}
  }

  function playSound() {
    if (!box.sound || sound?.state!=='running') return;
    const wave = sound.createOscillator();
    const gain = sound.createGain();
    const now = sound.currentTime;
    wave.type = 'sine';
    wave.frequency.setValueAtTime(610,now);
    wave.frequency.setValueAtTime(810,now+.12);
    gain.gain.setValueAtTime(.08,now);
    gain.gain.exponentialRampToValueAtTime(.001,now+.32);
    wave.connect(gain);
    gain.connect(sound.destination);
    wave.start(now);
    wave.stop(now+.33);
  }

  const tone = profit=>profit>0 ? 'gain' : profit<0 ? 'loss' : 'even';
  const percent = new Intl.NumberFormat('tr-TR',{style:'percent',maximumFractionDigits:2,signDisplay:'exceptZero'});
  const moneyOrDash = value=>value==null ? '—' : money(value);

  function picture(bike) {
    const media = element('span','','notice-bike');
    const canvas = element('canvas','');
    const missing = element('span','Görsel bulunamadı','muted');
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label',bike.name);
    media.append(canvas,missing);
    renderSprite(canvas,missing,bike);
    return media;
  }

  function saleDetails(item,holder) {
    const {sale} = item;
    holder.dataset.tone = tone(sale.profit);
    holder.append(picture(sale.bike),element('p',`Model yılı ${sale.bike.year}`,'spec'),
      element('p',`${item.branch} · ${sale.worker}`,'spec'));
    const data = element('dl','','notification-costs');
    const other = sale.costs ? Math.round((sale.total-Object.values(sale.costs).reduce((sum,cost)=>sum+cost,0))*100)/100 : 0;
    for (const [label,value] of [
      ['Alış fiyatı',moneyOrDash(sale.costs?.purchase)],['Nakliye gideri',moneyOrDash(sale.costs?.shipping)],
      ['Ekspertiz gideri',moneyOrDash(sale.costs?.inspection)],['Net tamir gideri',moneyOrDash(sale.costs?.repair)],
      ...(other ? [['Diğer giderler',money(other)]] : []),
      ['Toplam maliyet',money(sale.total)],['Satış fiyatı',money(sale.price)],
      [sale.profit<0 ? 'Gerçekleşen zarar' : 'Gerçekleşen net kâr',signed(sale.profit)],
      ['Yatırım getirisi',sale.roi===null ? '—' : percent.format(sale.roi)],
    ]) data.append(element('dt',label),element('dd',value));
    holder.append(data);
    if (!sale.costs) holder.append(element('p','Bu motosikletin eski kaydında gider dökümü bulunmuyor.','spec'));
  }

  function showDetail(item) {
    detailId = item.id;
    history.hidden = true;
    detail.hidden = false;
    const holder = byId('notification-detail-content');
    holder.replaceChildren(element('h3',item.title),element('p',`${NOTICE_TYPES[item.type]} · ${noticeTime(item.time)}`,'spec'));
    delete holder.dataset.tone;
    if (item.sale) saleDetails(item,holder);
    else if (item.branch) holder.append(element('p',item.branch,'spec'));
    if (item.detail) holder.append(element('p',item.detail));
    if (item.amount!==undefined) holder.append(element('p',money(item.amount)));
    if (!dialog.open) dialog.showModal();
    detail.querySelector('button').focus();
    if (!item.read) void dispatch('notice-read',item.id);
  }

  function updateList() {
    const rows = box.items.filter(item=>!filter.value || item.type===filter.value);
    byId('notification-list').replaceChildren(...rows.map(item=>{
      const row = element('button','','notification-row');
      row.type = 'button';
      row.dataset.unread = String(!item.read);
      if (item.sale) row.dataset.tone = tone(item.sale.profit);
      row.append(element('strong',item.title),
        element('span',`${NOTICE_TYPES[item.type]} · ${noticeTime(item.time)}`,'spec'),
        element('span',item.branch ?? '','spec'));
      if (!item.read) row.append(element('span','Okunmadı','notification-unread'));
      row.addEventListener('click',()=>showDetail(item));
      return row;
    }));
    if (!rows.length) byId('notification-list').append(element('p','Bu kategoride bildirim yok.','spec'));
    byId('notification-read-all').disabled = !rows.some(item=>!item.read);
    byId('notification-clear').disabled = !rows.length;
  }

  function showHistory() {
    confirmClear = false;
    byId('notification-clear').textContent = 'Geçmişi temizle';
    detailId = undefined;
    history.hidden = false;
    detail.hidden = true;
    updateList();
  }

  function toast(item) {
    const {sale} = item;
    const card = element('button','','sale-toast');
    card.type = 'button';
    card.dataset.tone = tone(sale.profit);
    card.append(picture(sale.bike));
    const copy = element('span','','sale-toast-copy');
    copy.append(element('strong',`${item.title} · ${sale.bike.year}`),
      element('span',item.branch,'spec'),
      element('span',`${money(sale.price)} · Net ${signed(sale.profit)}`,'sale-toast-result'));
    card.title=noticeTime(item.time);
    card.append(copy);
    const timer=setTimeout(()=>dismiss(item.id),SALE_TOAST_MS);
    liveCards.set(item.id,{item,card,timer});
    card.addEventListener('click',()=>{dismiss(item.id);showDetail(item);});
  }

  function renderToasts() {
    const rows=[...liveCards.values()].sort((a,b)=>a.item.time-b.item.time||a.item.id-b.item.id);
    // Keep the same nodes when reordering so thumbnails are not decoded again.
    tray.append(...rows.map(row=>row.card));
    stack.hidden=!rows.length;
  }

  function dismiss(id) {
    const current=liveCards.get(id);
    if(!current)return;
    clearTimeout(current.timer);
    current.card.remove();
    liveCards.delete(id);
    stack.hidden=!liveCards.size;
  }

  byId('sale-dismiss-all').addEventListener('click',()=>{
    for(const id of liveCards.keys())dismiss(id);
  });

  byId('notification-bell').addEventListener('click',()=>{
    showHistory();
    if (!dialog.open) dialog.showModal();
  });
  byId('notification-back').addEventListener('click',()=>{showHistory(); filter.focus();});
  filter.addEventListener('change',showHistory);
  byId('notification-read-all').addEventListener('click',()=>dispatch('notices-read-all',filter.value || undefined));
  byId('notification-clear').addEventListener('click',()=>{
    if (!confirmClear) {
      confirmClear = true;
      byId('notification-clear').textContent = 'Temizlemeyi onayla';
      return;
    }
    showHistory();
    void dispatch('notices-clear',filter.value || undefined);
  });
  for (const [type,label] of Object.entries(NOTICE_TYPES)) {
    filter.append(new Option(label,type));
    const input = element('input','');
    input.type = 'checkbox';
    const option = element('label','','notification-option');
    option.append(input,document.createTextNode(label));
    byId('notification-types').append(option);
    toggles.set(type,input);
    input.addEventListener('change',()=>dispatch('notice-type',type,input.checked));
  }
  soundInput.addEventListener('change',()=>{ activateAudio(); void dispatch('notice-sound',undefined,soundInput.checked); });
  document.addEventListener('pointerdown',activateAudio,{passive:true});
  document.addEventListener('keydown',activateAudio);

  return function update(state,{live=true} = {}) {
    const next = inbox(state);
    const newSales = cursor===undefined || !live || document.hidden ? []
      : next.items.filter(item=>item.id>cursor && item.sale).reverse();
    cursor = Math.max(cursor ?? 0,next.sequence);
    if (box===next) return;
    box = next;
    const unread = box.items.filter(item=>!item.read).length;
    const badge = byId('notification-count');
    badge.hidden = !unread;
    badge.textContent = unread;
    byId('notification-bell').setAttribute('aria-label',unread ? `Bildirim merkezi · ${unread} okunmamış` : 'Bildirim merkezi');
    soundInput.checked = box.sound;
    for (const [type,input] of toggles) input.checked = !box.muted[type];
    if (dialog.open && detailId===undefined) updateList();
    if (newSales.length) {
      for(const sale of newSales)toast(sale);
      while(liveCards.size>25)dismiss(liveCards.keys().next().value);
      mountToasts();
      renderToasts();
      playSound();
    }
  };
}
