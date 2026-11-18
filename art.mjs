function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}

export function drawBike(ctx, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  function line(points, stroke, width) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    points.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
    ctx.stroke();
  }
  function ellipse(cx, cy, rx, ry, angle, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, angle, 0, Math.PI * 2);
    ctx.fill();
  }

  ellipse(5, 8, 77, 15, -0.24, '#12171999');
  for (const [wx, wy] of [[-48, 0], [53, -21]]) {
    ellipse(wx + 4, wy + 2, 21, 25, 0.33, '#101214');
    ellipse(wx, wy, 19, 25, 0.33, '#25292a');
    ellipse(wx, wy, 13, 19, 0.33, '#a0a4a4');
    ellipse(wx, wy, 10, 15, 0.33, '#31383b');
    line([[wx - 7, wy + 11], [wx + 8, wy - 11]], '#81898a', 2);
    line([[wx - 8, wy - 6], [wx + 8, wy + 6]], '#81898a', 2);
  }
  line([[-49, 0], [-10, -13], [24, -45], [-26, -37], [-49, 0]], '#777f81', 7);
  line([[53, -21], [33, -62], [44, -69]], '#a1a8a9', 6);
  polygon(ctx, [[-20,-36],[7,-43],[25,-30],[11,-11],[-14,-10],[-26,-24]], '#343a3d');
  for (let row = 0; row < 3; row += 1) line([[-14,-30+row*5],[10,-33+row*5]], '#777e80', 2);
  polygon(ctx, [[-66,-40],[-42,-44],[-17,-48],[3,-42],[-24,-34],[-48,-30]], color);
  polygon(ctx, [[-50,-45],[-12,-52],[6,-45],[-16,-38],[-42,-39]], '#24282a');
  polygon(ctx, [[-13,-53],[10,-65],[31,-61],[41,-51],[24,-42],[-3,-43]], color);
  polygon(ctx, [[-10,-53],[10,-65],[31,-61],[22,-56],[4,-51]], '#ffffff40');
  polygon(ctx, [[29,-62],[44,-63],[51,-56],[43,-50],[34,-52]], '#303638');
  line([[45,-57],[50,-56]], '#f9edd4', 4);
  line([[32,-62],[26,-74],[17,-72]], '#bbc1c1', 3);
  line([[32,-66],[41,-78],[49,-77]], '#72797a', 3);
  line([[-52,-10],[-21,-15],[4,-23]], '#a4a7a4', 6);
  ctx.restore();
}

export function drawGarage(canvas, bikes) {
  const ctx = canvas.getContext('2d');
  const background = ctx.createRadialGradient(390, 206, 20, 390, 206, 390);
  background.addColorStop(0, '#3d4748');
  background.addColorStop(1, '#1a2022');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const project = (x, y, z = 0) => [381 + (x - y) * 32, 108 + (x + y) * 15 - z * 29];
  const face = (coords, color) => polygon(ctx, coords.map(point => project(...point)), color);
  function box(x, y, z, w, d, h, colors) {
    face([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]], colors[0]);
    face([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]], colors[1]);
    face([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]], colors[2]);
  }

  box(-.2,-.2,-.37,9.4,8.4,.37,['#3d4346','#262e31','#6b7371']);
  for (let x = 0; x < 9; x += 1) {
    for (let y = 0; y < 8; y += 1) {
      face([[x,y],[x+.98,y],[x+.98,y+.98],[x,y+.98]], (x+y)%2 ? '#595f5e' : '#606665');
    }
  }
  box(0,0,0,9,.22,3.25,['#586063','#343c3f','#909797']);
  box(0,.22,0,.22,7.78,3.25,['#3e494d','#4e5b5e','#899292']);
  box(.27,.25,.25,8.55,.06,.35,['#923f2c','#743727','#bc745e']);
  box(2.5,.26,.55,4.8,.09,2.05,['#303b3e','#273134','#536264']);
  for (let z = .65; z < 2.55; z += .18) {
    box(2.6,.36,z,4.6,.03,.045,['#596467','#475254','#6b767a']);
  }
  box(3.5,.36,2.72,2.8,.10,.12,['#ffb580','#b6744f','#ffe4b7']);

  for (const [x, y] of [[2.25,5.5],[5.3,5.5]]) {
    box(x,y,0,2.45,1.35,.045,['#22282a','#22282a','#c99a62']);
    box(x+.06,y+.06,.046,2.33,1.23,.012,['#252d30','#252d30','#353e40']);
    const [px,py] = project(x+1.25,y+.66,.08);
    ctx.fillStyle = '#94998f';
    ctx.font = '700 12px system-ui';
    const slot = x < 3 ? 0 : 1;
    const bike = bikes.find(item => item.slot === slot);
    if (bike) drawBike(ctx, px, py, .55, bike.color);
    else ctx.fillText(String(slot+1).padStart(2,'0'), px-7, py+4);
  }

  box(.33,1.0,0,.72,2.4,1.0,['#723e2e','#9f5038','#b0a48a']);
  box(.42,1.1,1,.44,.54,.38,['#2f3637','#42494a','#626a69']);
  box(.36,3.85,0,.65,.85,1.58,['#364346','#46565b','#6f7c7d']);
  for (let z = .2; z < 1.4; z += .25) {
    box(1.02,4.12,z,.025,.36,.045,['#969d99','#969d99','#a9b2ad']);
  }
  box(7.65,.45,0,.83,1.13,.9,['#713e2f','#994c33','#a85a40']);
  for (let z = .17; z < .85; z += .2) {
    box(7.75,1.59,z,.58,.025,.04,['#b4a698','#b4a698','#d3bbae']);
  }
  box(8.13,6.92,0,.44,.45,.38,['#624939','#734f3b','#91735a']);
  for (let i=0;i<3;i+=1) {
    box(8.1,6.91,.37+i*.15,.48,.48,.04,['#426754','#4b7560','#6b9174']);
  }
}
