// Coordinates are in scene units. The artboard, camera and hit testing share this plan.
const plans = {
  2:{name:'Küçük atölye',area:80},
  4:{name:'Geniş atölye',area:150,rows:[2,2],serviceRows:1,material:'concrete'},
  5:{name:'Geniş atölye',area:180,rows:[3,2],serviceRows:1,material:'concrete'},
  6:{name:'Servis ve galeri',area:220,rows:[3,3],serviceRows:1,material:'hybrid'},
  10:{name:'Servis ve galeri',area:350,rows:[5,5],serviceRows:1,material:'hybrid'},
  20:{name:'Premium galeri',area:700,rows:[5,5,5,5],serviceRows:1,material:'stone'},
  40:{name:'Büyük satış merkezi',area:1400,rows:[8,8,8,8,8],serviceRows:2,material:'center'},
};

const cellX = 210;
const cellY = 202;
const wallHeight = 134;
const projection = (u,v,z=0)=>[(u-v)*.866,(u+v)*.5-z];
const layouts = new Map();

export function garageLayout(capacity) {
  if (layouts.has(capacity)) return layouts.get(capacity);
  const spec = plans[capacity];
  if (!spec) throw new RangeError('Bilinmeyen garaj kapasitesi');
  if (capacity===2) {
    const bays = [
      {index:0,x:588,y:618,zone:'service'}, {index:1,x:1016,y:740,zone:'gallery'},
    ];
    const plan = {...spec,bays,width:1536,height:1024,bikeWidth:374,original:true};
    layouts.set(capacity,plan);
    return plan;
  }
  const columns = Math.max(...spec.rows);
  const uSize = columns*cellX+194;
  const vSize = spec.rows.length*cellY+142+64;
  const pad = 30;
  const shiftX = vSize*.866+pad;
  const shiftY = wallHeight+pad;
  const project = (u,v,z=0)=>{
    const [x,y] = projection(u,v,z);
    return [x+shiftX,y+shiftY];
  };
  const bays = [];
  for (const [row,count] of spec.rows.entries()) {
    for (let col=0;col<count;col++) {
      const u = 170+col*cellX+(columns-count)*cellX/2;
      const v = 140+row*cellY+(row>=spec.serviceRows ? 64 : 0);
      const [x,y] = project(u,v,4);
      bays.push({index:bays.length,u,v,x,y,zone:row<spec.serviceRows?'service':'gallery'});
    }
  }
  const plan = {...spec,bays,uSize,vSize,project,wallHeight,
    width:Math.ceil((uSize+vSize)*.866+2*pad),
    height:Math.ceil((uSize+vSize)*.5+wallHeight+2*pad+12),bikeWidth:124};
  layouts.set(capacity,plan);
  return plan;
}

const service = new Set(['unchecked','inspected','repairing','claiming','internalInspection','internalRepair']);
const absent = new Set(['shipping','rented','riding']);
const bias = bike=>service.has(bike.stage) ? 'service' : bike.stage==='listed' ? 'gallery' : null;

export function garageParking(plan,inventory) {
  const garage = inventory.filter(bike=>!absent.has(bike.stage)).sort((a,b)=>a.slot-b.slot);
  const free = new Set(plan.bays);
  const reserved = new Set(inventory.filter(bike=>absent.has(bike.stage)).map(bike=>bike.slot));
  for (const bay of plan.bays) if (reserved.has(bay.index)) free.delete(bay);
  const parked = [];
  const waiting = [];
  function assign(bike,bay) {
    free.delete(bay);
    parked.push({bike,bay,zone:bias(bike) ?? bay.zone});
  }
  for (const bike of garage) {
    const own = plan.bays[bike.slot];
    if (free.has(own) && bias(bike)===own.zone) assign(bike,own);
    else waiting.push(bike);
  }
  const flexible = [];
  for (const bike of waiting) {
    const zone = bias(bike);
    const match = zone && [...free].find(bay=>bay.zone===zone);
    if (match) assign(bike,match);
    else flexible.push(bike);
  }
  for (const bike of flexible) {
    const own = plan.bays[bike.slot];
    const bay = free.has(own) ? own : free.values().next().value;
    if (bay) assign(bike,bay);
  }
  return parked.sort((a,b)=>a.bay.y-b.bay.y);
}

export function fitGarage(plan,width,height) {
  return Math.min(width/plan.width,height/plan.height)*.99;
}

export function bikeBounds(plan,bay) {
  return {left:bay.x-plan.bikeWidth*.55,right:bay.x+plan.bikeWidth*.55,
    top:bay.y-plan.bikeWidth*.86,bottom:bay.y+plan.bikeWidth*.12};
}

export function garageBikeAt(plan,parking,x,y) {
  for (let i=parking.length-1;i>=0;i--) {
    const {bike,bay} = parking[i];
    if (plan.original) {
      const dx = x-bay.x;
      const dy = y-bay.y;
      const localX = dx*Math.cos(.36)-dy*Math.sin(.36);
      const localY = dx*Math.sin(.36)+dy*Math.cos(.36);
      if (Math.abs(localX)<=plan.bikeWidth*.55 && localY>=-plan.bikeWidth*.82 && localY<=plan.bikeWidth*.12) return bike;
    } else {
      const box = bikeBounds(plan,bay);
      if (x>=box.left && x<=box.right && y>=box.top && y<=box.bottom) return bike;
    }
  }
  return null;
}
