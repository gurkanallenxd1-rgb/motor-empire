import { catalog, paintOptions } from './bikes.mjs?v=0.13.1';
import { atlasFor, legacySprite } from './model-atlas.mjs?v=0.13.1';
import { renderSprite, spriteFor } from './sprite.mjs?v=0.13.1';
import { generationFor } from './generations.mjs?v=0.13.1';

const observations = {
  'honda-cb125f': 'Köşeli ön far seçiliyor. Depo kaplaması, egzoz ve jantın kasa yılı doğrulanamıyor.',
  'bajaj-pulsar-ns200': 'Ayrık yan kapak izlenimi var. Far, egzoz ve şasi birleşimleri doğrulanamıyor.',
  'yamaha-ybr125': 'Uzun sele ve dar gövde seçiliyor. Far, ön siperlik ve jantın üretim yılı doğrulanamıyor.',
  'suzuki-gn125': 'Yuvarlak far ve klasik depo seçiliyor. Egzoz, jant ve arka süspansiyon ayrıntıları doğrulanamıyor.',
  'tvs-apache-rtr160': 'Kompakt ön maske seçiliyor. Yan grenaj, jant ve egzozun hangi RTR kasasına ait olduğu belirsiz.',
  'mondial-drift-l': 'Sele ve arka taşıyıcı seçiliyor. Far, depo, jant ve şasinin modelle eşleştiği kanıtlanamıyor.',
  'honda-cbr125r': 'Orta farlı grenaj görülüyor. Ön yüz, jant, egzoz ve kuyruk için kasa teyidi yok.',
  'yamaha-delight125': 'Yuvarlak scooter gövdesi görülüyor. Far, yan kapak ve jant Arome çizimine yakın.',
  'yamaha-mt25': 'Kısa ön maske ve depo seçiliyor. Radyatör kapakları, egzoz ve jant nesli belirsiz.',
  'yamaha-r25': 'Tam grenaj ve dar ön yüz görülüyor. Far, yan kapak, jant ve egzozun kasa yılı doğrulanamıyor.',
  'yamaha-mt07': 'Depo yanları ve çıplak motor seçiliyor. Far nesli, egzoz ve şasi doğrulanamıyor.',
  'yamaha-mt09': 'Açılı ön gövde seçiliyor. Üç silindir düzeni, far nesli ve jant için tarihli referans eşleşmesi yok.',
  'honda-cb250r': 'Yuvarlak far ve altın renkli maşa seçiliyor. Depo, motor, egzoz ve jant ayrıntıları doğrulanamıyor.',
  'honda-cbr250r': 'Orta farlı tam grenaj görülüyor. Tek silindirli CBR’nin far ve yan grenaj geometrisi teyit edilemiyor.',
  'honda-pcx125': 'V biçimli ön yüz izlenimi var. Far imzası, jant ve yan gövde nesli doğrulanamıyor.',
  'honda-forza250': 'Yüksek cam ve geniş gövde PCX’ten ayrılıyor. Far, jant ve gövde nesli teyit edilemiyor.',
  'ktm-duke250': 'Turuncu kafes şasi görülüyor. Duke 390’dan ayrılan far ve egzoz ayrıntıları doğrulanamıyor.',
  'ktm-duke390': 'Ayrık far ve turuncu kafes şasi seçiliyor. Şasi, jant ve egzozun dönem eşleşmesi belirsiz.',
  'bajaj-dominar400': 'Geniş egzoz ve ön maske görülüyor. Depo, egzoz ve şasinin model yılı doğrulanamıyor.',
  'kawasaki-ninja400': 'Çift farlı spor grenaj izlenimi var. Ön yüz, yan grenaj ve jantın kasa eşleşmesi belirsiz.',
  'kawasaki-z900': 'Çıplak dört silindirli tasarım izlenimi var. Far, depo ve şasinin üretim nesli doğrulanamıyor.',
  'rks-arome125': 'Yuvarlak far ve retro gövde görülüyor. Delight’tan ayrılan kaporta, jant ve egzoz ayrıntıları belirsiz.',
};

if (new URLSearchParams(location.search).get('dev') === '1') startAudit();
else location.replace('./');

function startAudit() {
  const grid = document.getElementById('audit-grid');
  const color = document.getElementById('audit-color');
  const baseline = document.getElementById('audit-baseline');
  const summary = document.getElementById('audit-summary');
  color.append(...[1,2,3].map(number=>new Option('Fabrika seçeneği '+number,String(number-1))));

  function element(tag,text = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  const cards = catalog.map(model => {
    const card = element('article');
    card.className = 'card audit-card';
    const title = element('h2',model.name);
    const year = element('select');
    year.setAttribute('aria-label',model.name + ' kasa yılı');
    for (let value=model.lastYear;value>=model.firstYear;value-=1) year.add(new Option(value,value));
    const note = element('p',observations[model.id] ?? 'Yıl ve üretici ayrıntısı doğrulanmamış model çizimi.');
    note.className = 'muted';
    const reference = element('figure');
    const old = element('img');
    if (legacySprite(model.id)) old.src = `./assets/models/${model.id}.webp?v=0.13.1`;
    old.loading = 'lazy';
    old.alt = model.name + ' için v0.5 inceleme çizimi';
    reference.append(old,element('figcaption','v0.5 çizimi · Kasa doğrulaması yok'));

    const candidate = element('figure');
    const canvas = element('canvas');
    canvas.setAttribute('role','img');
    canvas.setAttribute('aria-label',model.name + ' kasa görseli');
    const placeholder = element('p','Görsel yüklenemedi');
    placeholder.className = 'missing-image';
    const caption = element('figcaption');
    const swatch = element('p');
    swatch.className = 'spec';
    const label = element('span','Temsili görsel');
    label.className = 'representative-label';
    candidate.append(canvas,placeholder,label,swatch,caption);
    card.append(title,year,note,reference,candidate);
    grid.append(card);
    year.addEventListener('change',refresh);
    return { card,model,year,reference,canvas,placeholder,caption,label,swatch };
  });

  const visible = new Set();
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      visible.add(entry.target);
      observer.unobserve(entry.target);
      renderCard(cards.find(item=>item.card === entry.target));
    }
  },{rootMargin:'150px'}) : null;

  function renderCard({model,year,canvas,placeholder,caption,label,swatch}) {
    const selectedYear = Number(year.value);
    const options = paintOptions(model,selectedYear);
    const paint = options[Number(color.value)] ?? options[0];
    swatch.textContent = paint?.name ?? 'Renk belirtilmedi';
    const bike = {name:model.name,year:selectedYear,color:paint?.hex,paintAccent:paint?.accent};
    const entry = spriteFor(bike);
    caption.replaceChildren();
    if (entry) {
      const source = element('a',entry.author + ' · Kaynak');
      source.href = entry.source;
      const license = element('a',entry.license);
      license.href = entry.licenseUrl;
      caption.append(source,' · ',license);
    } else {
      const variant = generationFor(model.id,selectedYear);
      if (variant) {
        const reference = element('a',variant.label + ' · Üretici referansı');
        reference.href = variant.source;
        caption.append(reference);
      }
    }
    renderSprite(canvas,placeholder,bike,label);
  }

  function refresh() {
    let covered = 0;
    let modelArt = 0;
    for (const item of cards) {
      const {card,model,year,reference} = item;
      reference.hidden = !baseline.checked || !legacySprite(model.id);
      if (spriteFor({name:model.name,year:Number(year.value)})) covered += 1;
      if (legacySprite(model.id) || atlasFor(model.id)) modelArt += 1;
      if (!observer || visible.has(card)) renderCard(item);
    }
    summary.textContent = `${cards.length} model · ${modelArt} modele özel çizim · ${covered} doğrulanmış kasa`;
  }

  for (const {card} of cards) observer?.observe(card);
  color.addEventListener('change',refresh);
  baseline.addEventListener('change',refresh);
  refresh();
}
