const categories = {
  'Honda CB 125F': 'commuter', 'Yamaha YBR 125': 'commuter', 'Suzuki GN 125': 'commuter',
  'Mondial Drift L': 'commuter', 'Bajaj Pulsar NS 200': 'naked', 'TVS Apache RTR 160': 'naked',
  'Honda CBR 125R': 'sport', 'Yamaha Delight 125': 'scooter',
};

export const categoryLabel = { commuter: 'Şehir motosikleti', naked: 'Naked', sport: 'Sport', scooter: 'Scooter' };
export const categoryOf = bike => categories[bike.name] ?? 'commuter';

export function polygon(ctx, points, fill) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function stroke(ctx, points, color, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function oval(ctx, x, y, rx, ry, angle, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function gradient(ctx, y1, y2, ...colors) {
  const paint = ctx.createLinearGradient(0, y1, 0, y2);
  colors.forEach((color, i) => paint.addColorStop(i / (colors.length - 1), color));
  return paint;
}

export function drawBike(ctx, x, y, scale, bike) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const type = categoryOf(bike);
  const scooter = type === 'scooter';
  const sport = type === 'sport';
  const commuter = type === 'commuter';
  const paint = gradient(ctx, -79, -24, '#e6d9ca', bike.color, bike.color, '#24292d');
  const metal = gradient(ctx, -60, 8, '#d9ddd9', '#8b9699', '#333a40');
  const rubber = gradient(ctx, -27, 26, '#363b42', '#171a1d', '#101214');
  const tire = scooter ? 19 : 25;
  const width = sport ? 22 : scooter ? 16 : 18;
  const poly = (points, color) => polygon(ctx, points, color);
  const line = (points, color, size) => stroke(ctx, points, color, size);

  for (const [wx, wy] of [[-49, 0], [52, -32]]) {
    oval(ctx, wx + 6, wy + 2, width, tire, -.27, '#0b0e10');
    oval(ctx, wx, wy, width, tire, -.27, rubber);
    oval(ctx, wx - 1, wy, width - 6, tire - 6, -.27, '#acb2af');
    oval(ctx, wx - 1, wy, width - 8, tire - 8, -.27, '#24292d');
    for (let i = 0; i < (commuter ? 8 : 5); i += 1) {
      const a = i * Math.PI * 2 / (commuter ? 8 : 5);
      line([[wx, wy], [wx + Math.cos(a) * (width - 9), wy + Math.sin(a) * (tire - 8)]], '#838f93', commuter ? 1 : 2);
    }
    oval(ctx, wx, wy, 4, 5, -.27, metal);
  }
  line([[-49,0],[-11,-16],[22,-52],[-26,-44],[-49,0]], '#454b4d', 7);
  line([[52,-32],[35,-70],[40,-80]], metal, 7);
  poly([[-23,-41],[6,-49],[21,-38],[12,-18],[-13,-11],[-25,-24]], '#272d30');
  for (let row = 0; row < 4; row += 1) line([[-16,-37+row*4],[8,-44+row*4]], metal, 1.6);
  oval(ctx,-3,-24,9,8,-.25,metal);
  oval(ctx,-3,-24,5,5,-.25,'#42494d');
  poly([[34,-47],[51,-59],[65,-50],[68,-43],[54,-48],[41,-43]], paint);
  if (scooter) {
    poly([[-64,-36],[-45,-49],[-24,-55],[-7,-46],[-10,-28],[-52,-16],[-64,-24]], paint);
    poly([[-18,-29],[14,-38],[24,-57],[34,-65],[43,-56],[25,-30],[-11,-18]], paint);
    poly([[-49,-51],[-22,-61],[-4,-55],[-11,-46],[-43,-43]], '#24282a');
    poly([[24,-64],[29,-83],[42,-91],[52,-84],[54,-69],[39,-62]], paint);
    poly([[36,-82],[46,-85],[51,-80],[47,-76],[38,-75]], '#fcead1');
  } else {
    poly([[-67,-37],[-50,-49],[-23,-54],[3,-48],[-17,-37],[-50,-28]], paint);
    poly([[-59,-42],[-44,-52],[-15,-57],[4,-52],[-16,-44],[-46,-39]], '#222a2d');
    poly([[-13,-55],[7,-69],[24,-74],[42,-67],[41,-56],[22,-47],[-3,-46]], paint);
    poly([[-8,-56],[9,-67],[24,-73],[37,-69],[21,-63],[6,-55]], '#ffffff45');
    poly([[40,-72],[52,-76],[57,-70],[50,-62],[40,-64]], '#232a2d');
    line([[48,-70],[55,-72]], '#fff1cb', 4);
    if (sport) {
      poly([[5,-54],[31,-66],[49,-77],[63,-72],[59,-60],[42,-55],[32,-37],[11,-25],[-4,-32]], paint);
      poly([[17,-45],[37,-56],[49,-58],[38,-52],[27,-40]], '#151e24');
      poly([[40,-75],[37,-86],[46,-94],[60,-84],[60,-74]], gradient(ctx,-94,-72,'#a8c3c7','#283941'));
      line([[54,-71],[61,-73]], '#fff2d4', 3);
    }
  }
  line([[34,-76],[24,-85],[13,-82]], metal, 3);
  line([[38,-82],[44,-93],[51,-95]], '#929c9c', 2);
  oval(ctx,51,-96,6,2,-.28,'#afb4af');
  line([[-53,-9],[-25,-14],[scooter ? -13 : 8,-23]], '#22282c', 9);
  line([[-52,-11],[-28,-16],[scooter ? -16 : 5,-24]], metal, scooter ? 4 : 5);
  line([[-65,-34],[-59,-35]], '#ff5c4f', 3);
  ctx.restore();
}

export function drawListing(canvas, bike) {
  const ctx = canvas.getContext('2d');
  const light = ctx.createRadialGradient(135,65,10,135,65,140);
  light.addColorStop(0,'#3d3630');
  light.addColorStop(1,'#181c1e');
  ctx.fillStyle = light;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  for (let i = -60; i < 240; i += 17) stroke(ctx, [[i,130],[i+154,53]], '#aeb3aa10');
  oval(ctx,138,101,75,13,-.27,'#0e1113aa');
  drawBike(ctx,135,101,1,bike);
}
