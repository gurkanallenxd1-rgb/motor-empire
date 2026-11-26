import { catalog } from './bikes.mjs?v=0.5.1';
import { PAINT_COLORS } from './game.mjs?v=0.5.1';
import { renderSprite, spriteFor } from './sprite.mjs?v=0.5.1';

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

const grid = document.getElementById('audit-grid');
const color = document.getElementById('audit-color');
const baseline = document.getElementById('audit-baseline');
const summary = document.getElementById('audit-summary');
color.append(...PAINT_COLORS.map(paint => new Option(paint.name,paint.hex)));

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
  const note = element('p',observations[model.id]);
  note.className = 'muted';
  const reference = element('figure');
  const old = element('img');
  old.src = `./assets/models/${model.id}.webp?v=0.5.1`;
  old.loading = 'lazy';
  old.alt = model.name + ' için v0.5 inceleme çizimi';
  reference.append(old,element('figcaption','v0.5 çizimi · Kasa doğrulaması yok'));

  const candidate = element('figure');
  const canvas = element('canvas');
  canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label',model.name + ' onaylı kasa görseli');
  const placeholder = element('p','Bu kasa yılı için doğrulanmış görsel yok');
  placeholder.className = 'missing-image';
  const caption = element('figcaption');
  candidate.append(canvas,placeholder,caption);
  card.append(title,year,note,reference,candidate);
  grid.append(card);
  year.addEventListener('change',refresh);
  return { model, year, reference, canvas, placeholder, caption };
});

function refresh() {
  let covered = 0;
  for (const {model,year,reference,canvas,placeholder,caption} of cards) {
    reference.hidden = !baseline.checked;
    const bike = { name:model.name, year:Number(year.value), color:color.value };
    const entry = spriteFor(bike);
    if (entry) covered += 1;
    caption.replaceChildren();
    if (entry) {
      const source = element('a',entry.author + ' · Kaynak');
      source.href = entry.source;
      const license = element('a',entry.license);
      license.href = entry.licenseUrl;
      caption.append(source,' · ',license);
    }
    renderSprite(canvas,placeholder,bike);
  }
  summary.textContent = `${covered} / ${cards.length} model için seçilen kasa yılı onaylı`;
}

color.addEventListener('change',refresh);
baseline.addEventListener('change',refresh);
refresh();
