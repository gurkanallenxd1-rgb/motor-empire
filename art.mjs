import { drawBike, gradient, oval, polygon, stroke } from './bikes.mjs';

const WIDTH = 1040;
const HEIGHT = 610;
const bayPositions = [[3.3, 6.4], [8.3, 6.4]];
const project = (x, y, z = 0) => [525 + (x - y) * 43, 175 + (x + y) * 19 - z * 33];

function buildWorkshop(canvas) {
  const ctx = canvas.getContext('2d');
  const face = (coords, fill) => polygon(ctx, coords.map(point => project(...point)), fill);
  const line = (coords, color, width) => stroke(ctx, coords.map(point => project(...point)), color, width);
  function box(x, y, z, w, d, h, colors) {
    face([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]], colors[0]);
    face([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]], colors[1]);
    face([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]], colors[2]);
  }
  function shadow(x, y, width, height) {
    const [sx, sy] = project(x,y);
    const paint = ctx.createRadialGradient(sx,sy,0,sx,sy,width);
    paint.addColorStop(0,'#101010aa');
    paint.addColorStop(1,'#11111100');
    oval(ctx,sx,sy,width,height,0,paint);
  }
  function wallText(text, x, z, size, color) {
    const [px,py] = project(x,.28,z);
    ctx.save();
    ctx.transform(1,19/43,0,1,px,py);
    ctx.fillStyle = color;
    ctx.font = `850 ${size}px system-ui`;
    ctx.fillText(text,0,0);
    ctx.restore();
  }

  ctx.fillStyle = gradient(ctx,0,HEIGHT,'#181c1f','#26292b','#15191b');
  ctx.fillRect(0,0,WIDTH,HEIGHT);
  for (let i = -500; i < 1100; i += 38) stroke(ctx,[[i,610],[i+960,150]],'#dddddd08');
  for (let i = -500; i < 1500; i += 48) stroke(ctx,[[i,140],[i+970,610]],'#dddddd08');
  shadow(5.6,5.2,465,205);
  box(-.16,-.16,-.62,11.32,10.32,.62,['#3b4142','#232a2c','#666861']);
  for (let x = 0; x < 11; x += 1) {
    for (let y = 0; y < 10; y += 1) {
      const value = 80 + (x * 11 + y * 7) % 12;
      face([[x,y],[x+.988,y],[x+.988,y+.988],[x,y+.988]], `rgb(${value+3},${value+2},${value-2})`);
    }
  }
  let seed = 481;
  const random = () => {
    seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 1900; i += 1) {
    const [x,y] = project(random()*11,random()*10,.005);
    ctx.fillStyle = i % 2 ? '#e8d1a61d' : '#12141731';
    ctx.fillRect(x,y,1+random()*3,1);
  }
  box(0,0,0,11,.22,3.85,['#525355','#343a3c','#8b8980']);
  box(0,.22,0,.22,9.78,3.85,['#313638','#3e4547','#797c73']);
  for (let h = .18; h < 3.8; h += .33) {
    line([[.23,.3,h],[.23,9.97,h]],'#252b2d66');
    line([[.23,.225,h],[10.98,.225,h]],'#22272877');
    for (let x = .6 + (Math.round(h*3)%2)*.4; x < 10.8; x += .8) {
      line([[x,.227,h],[x,.227,h+.32]], '#272a2a65');
    }
  }
  box(.24,.24,.83,10.76,.035,.19,['#98472c','#743927','#b67a54']);
  box(.24,.24,.83,.035,9.75,.19,['#783823','#86412a','#ab704b']);

  box(5.6,.26,0,4.58,.15,3.2,['#13191c','#303537','#6f7069']);
  box(5.74,.42,.04,4.28,.07,2.94,['#3d4343','#25282a','#626866']);
  for (let z = .17; z <= 2.95; z += .14) {
    line([[5.76,.51,z],[10,.51,z]],'#171e20',2);
    line([[5.77,.51,z+.055],[10,.51,z+.055]],'#78817c55');
  }
  box(6.63,.53,3.09,2.35,.12,.12,['#ffdc9f','#8c6243','#eee0b1']);

  box(.68,.26,2.4,4.2,.1,.94,['#222627','#171c1f','#7a7868']);
  wallText('MOTOR EMPIRE',.9,2.72,19,'#ffbe87');
  box(1.3,.42,2.27,2.6,.15,.09,['#ffd5a1','#be793c','#fff0cf']);
  for (const [x,y,rx,ry] of [[3.05,2.3,176,79],[7.8,4.4,244,91]]) {
    const [px,py] = project(x,y);
    const glow = ctx.createRadialGradient(px,py,0,px,py,rx);
    glow.addColorStop(0,'#ffc78542');
    glow.addColorStop(1,'#ffcd8d00');
    oval(ctx,px,py,rx,ry,.35,glow);
  }

  const cabinet = ['#944c35','#63392f','#b37b5c'];
  const steel = ['#41494b','#293238','#777c76'];
  box(.76,1.03,0,3.76,.89,1.04,steel);
  box(.63,.98,1.04,4.02,1,.15,['#585044','#4e4436','#a18e73']);
  box(1.02,.38,1.25,3.85,.12,.89,['#2f3536','#444746','#767168']);
  for (let y = .56; y < 2; y += .18) {
    for (let x = 1.12; x < 4.8; x += .22) line([[x,.515,y],[x+.024,.515,y]],'#838278',1.35);
  }
  for (let x = 1.2; x < 4.7; x += .38) {
    line([[x,.53,1.91],[x+.07,.53,1.53]],'#a3a69b',2);
    line([[x-.04,.53,1.93],[x+.05,.53,1.95]],'#bdc1b8',3);
  }
  box(.5,3.03,0,.91,1.55,1.46,cabinet);
  for (let z = .18; z < 1.44; z += .23) {
    box(1.415,3.09,z,.045,1.4,.19,['#793e2d','#b06243','#a27054']);
    line([[1.48,3.39,z+.11],[1.48,4.24,z+.11]],'#d5bfaa',2.2);
  }
  for (const [x,y,color] of [[3.23,1.41,'#aa733b'],[3.55,1.45,'#6b8059'],[.76,3.41,'#c2a45d'],[.84,3.78,'#809b98']]) {
    const z = y > 3 ? 1.46 : 1.19;
    box(x,y,z,.23,.26,.43,[color,'#454940',color]);
    box(x+.07,y+.08,z+.43,.1,.1,.09,['#24282a','#24282a','#555958']);
  }
  shadow(1.4,7.1,77,30);
  const [cx,cy] = project(1.26,7.1,.43);
  oval(ctx,cx,cy,33,18,-.45,gradient(ctx,cy-20,cy+18,'#c67650','#8f4131','#502921'));
  oval(ctx,cx+16,cy-5,16,13,.5,'#af6346');
  box(.98,6.9,.63,.62,.55,.38,steel);
  stroke(ctx,[[cx-24,cy-2],[cx-43,cy+8],[cx-29,cy+24],[cx-11,cy+15]],'#252a2b',4);

  for (const [x,y,count] of [[10.35,2,4],[1.25,8.7,3]]) {
    shadow(x,y,46,22);
    for (let i=0;i<count;i+=1) {
      const [tx,ty] = project(x,y,.18+i*.26);
      oval(ctx,tx,ty+5,27,15,.2,'#14191a');
      oval(ctx,tx,ty,27,13,.2,'#383d3e');
      oval(ctx,tx,ty,14,6,.2,'#1b2021');
      stroke(ctx,[[tx-23,ty+4],[tx-13,ty+9],[tx+6,ty+10]],'#626662',1);
    }
  }
  for (const [x,y] of bayPositions) {
    shadow(x+.23,y+.34,115,51);
    box(x-.94,y-1.77,0,1.88,3.54,.19,['#434449','#272b2d','#976b4a']);
    box(x-.82,y-1.65,.19,1.64,3.3,.15,['#6f4233','#4e3329','#9e583c']);
    box(x-.75,y-1.61,.34,1.5,3.22,.035,['#373b3c','#373b3c','#3e4547']);
    for (let d = -1.5; d < 1.55; d += .17) {
      line([[x-.72,y+d,.39],[x-.58,y+d+.07,.39]],'#aeb0a778',1);
      line([[x+.58,y+d,.39],[x+.72,y+d+.07,.39]],'#aeb0a778',1);
    }
    for (let d = -1.51; d < 1.55; d += .24) {
      line([[x+.825,y+d,.21],[x+.825,y+d+.11,.32]],'#ddab66',3);
    }
    face([[x-.68,y+1.61,.34],[x-.68,y+2.18],[x+.68,y+2.18],[x+.68,y+1.61,.34]], '#43494a');
  }
  for (let x = 2; x < 10; x += .28) line([[x,9.69,.01],[x+.13,9.69,.01]],'#c7975966',2);
}

export function createGarageRenderer(canvas) {
  const context = canvas.getContext('2d', { alpha: false });
  const background = document.createElement('canvas');
  background.width = WIDTH;
  background.height = HEIGHT;
  buildWorkshop(background);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let bikes = [];
  let transitions = [];
  let frame = 0;
  let lastPaint = 0;

  function render(now) {
    frame = 0;
    transitions = transitions.filter(item => now - item.start < 720);
    context.drawImage(background,0,0);
    const moving = new Set(transitions.map(item => item.bike.id));
    const objects = [
      ...bikes.filter(bike => !moving.has(bike.id)).map(bike => ({bike})),
      ...transitions,
    ].sort((a,b) => a.bike.slot-b.bike.slot);

    for (const {bike,action,start} of objects) {
      const [px,py] = project(...bayPositions[bike.slot],.37);
      const progress = action ? Math.max(0,(now-start)/720) : 0;
      const distance = action === 'buy' ? (1-progress)**3 : progress**2;
      const travelling = action === 'buy' || action === 'sell';
      const x = px + (travelling ? distance*174 : 0);
      const y = py + (travelling ? distance*78 : 0);
      context.save();
      if (travelling) context.globalAlpha = 1-distance*.98;
      oval(context,x+10,y+1,96,15,-.28,'#11171982');
      drawBike(context,x,y-18,1.36,bike);
      if (bike.stage === 'repairing') drawMechanic(context,x,y,now,!reducedMotion.matches);
      context.restore();
    }
    if (!reducedMotion.matches && !document.hidden && (transitions.length || bikes.some(bike => bike.stage === 'repairing'))) {
      frame = requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    if (now-lastPaint >= 32) {
      lastPaint = now;
      render(now);
    } else {
      frame = requestAnimationFrame(tick);
    }
  }

  function refresh() {
    cancelAnimationFrame(frame);
    if (reducedMotion.matches) transitions = [];
    render(performance.now());
  }
  document.addEventListener('visibilitychange', refresh);
  reducedMotion.addEventListener('change', refresh);
  return (garage, action, animationBike) => {
    bikes = garage;
    transitions = transitions.filter(item => item.action === 'sell'
      || garage.some(bike => bike.id === item.bike.id && bike.stage === item.bike.stage));
    if (animationBike && !reducedMotion.matches) {
      transitions = [...transitions.filter(item => item.bike.id !== animationBike.id),
        {bike:animationBike,action,start:performance.now()}];
    }
    refresh();
  };
}

function drawMechanic(ctx, x, y, now, animate) {
  const phase = animate ? Math.sin(now/125) : 0;
  const mx = x+24;
  const my = y+14;
  oval(ctx,mx-2,my+14,22,7,-.2,'#11171980');
  stroke(ctx,[[mx-4,my-9],[mx-11,my+5],[mx-23,my+11]],'#233239',8);
  stroke(ctx,[[mx,my-7],[mx+7,my+3],[mx+17,my+8]],'#283b42',8);
  oval(ctx,mx,my-15,11,15,.39,gradient(ctx,my-34,my,'#6c8a83','#354948'));
  oval(ctx,mx-4,my-32,7,8,.25,'#c4956d');
  oval(ctx,mx-5,my-36,8,4,.25,'#4c5553');
  stroke(ctx,[[mx-5,my-22],[mx-18,my-13+phase*3],[mx-33,my-23+phase*5]],'#ab886a',5);
  stroke(ctx,[[mx-33,my-23+phase*5],[mx-42,my-29+phase*5]],'#d1d9d4',3);
  if (animate && phase > .67) {
    for (let i=0;i<4;i+=1) stroke(ctx,[[mx-41,my-25],[mx-50-i*4,my-35+i*4]],'#ffbf73',1.7);
  }
}
