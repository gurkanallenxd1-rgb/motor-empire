const brands='Kıvraç Sedefkaya Voltara Mavikül Rotalis Demiriz Tanyeli Motifex Kayraç Ferrovia İzveren Caspira Eksenor Dorupark Virael Torkova Alevhan Arclume Gökkert Aksela Süratya Rocaterra Kuzgunel Vardon Yelpaze Pistora Alacadağ Aeromar Gümüşiz Straton Erguvan Flintway Dalgınay Ravello Zagora Çınaraltı Korven Momentum Vektora Zeytinova Velune Yörüngem Koralto Rüzgâryol Deltora Orbitan Sarpyaka Kestrel Andora Novarun Turmalin Rotaçizgi Prismora Kulehan Asterro Altınyel Nebulon Tanyaka Mossline Yalınkök Braxton Serinyol Kırağı Uzgur'.split(' ');
const labels=['Motor','Moto','Motors','Motosiklet','Garage','Motoworks','Motor Grubu','Two Wheels','Ride Lab','Motor Group','Sürüş Merkezi','Mobilite','Motorculuk','Speed Shop','Motor Atölyesi','Yol Teknolojileri','Moto Collective','Racing','Motor Studio','Bike House'];
const colors=['#f59949','#4db3d5','#b993ed','#69ba8c','#da7587','#91a4ed','#c3b75b','#53c5bb'];
const shapes=['shield','diamond','hex','circle','flag'];
const strategyLabels={volume:0,premium:9,scooter:11,sport:17,repair:14,rental:12,safe:3,growth:6,margin:18,regional:1};

export function nameKey(name) {
  return name.toLocaleLowerCase('tr').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i').replace(/[^a-z0-9]/g,'');
}

export function rivalIdentity(id,strategy) {
  const index=id-1;
  const core=brands[index%brands.length];
  const cycle=Math.floor(index/brands.length);
  const base=Object.values(strategyLabels)[index%brands.length%Object.keys(strategyLabels).length];
  const label=labels[(base+cycle*7)%labels.length];
  const name=[core,label,cycle>=labels.length?String(Math.floor(cycle/labels.length)+1):''].filter(Boolean).join(' ');
  return {name,identity:{initials:(core.slice(0,2)+label[0]).toLocaleUpperCase('tr'),
    primary:colors[(index+cycle)%colors.length],secondary:colors[(Math.floor(index/8)+3)%colors.length],
    shape:shapes[(index+(strategyLabels[strategy]??0))%shapes.length]}};
}

export function migrateRivalIdentities(world) {
  if(world.identityVersion===1)return world;
  const reserved=new Set([...(world.retired??[]),...(world.takeovers??[])].map(row=>nameKey(row.name)));
  const companies=world.companies.map(company=>{
    let identity=rivalIdentity(company.id,company.strategy);
    if(reserved.has(nameKey(identity.name)))identity={...identity,name:identity.name+' '+company.id};
    reserved.add(nameKey(identity.name));
    return {...company,...identity,formerName:company.name};
  });
  return {...world,companies,identityVersion:1};
}
