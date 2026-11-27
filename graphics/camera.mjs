// Scene dimensions are in metres. Orbit limits keep the eye above the floor.
export const GARAGE_CAMERA=Object.freeze({near:10.5,far:40,minPolar:.25,maxPolar:1.12,
  targetX:6,targetZ:4.7,eyeY:4.5});
export const GARAGE_WALLS=Object.freeze({
  west:{axis:'x',edge:-7.95,inside:-1}, north:{axis:'z',edge:-6.62,inside:-1},
  east:{axis:'x',edge:7.72,inside:1}, south:{axis:'z',edge:5.94,inside:1},
});
export function cutaway(name,eye,target,glass=false) {
  const {axis,edge,inside}=GARAGE_WALLS[name];
  const outside=(eye[axis]-edge)*inside;
  if (outside<-.35 || (target[axis]-edge)*inside>=0) return false;
  return glass ? eye.y<8 : true;
}

export function tapGesture() {
  const pointers=new Set();
  let initial;
  return {
    down(event) {
      if (!pointers.size) initial={x:event.clientX,y:event.clientY,time:event.timeStamp,valid:event.button===0};
      else initial.valid=false;
      pointers.add(event.pointerId);
    },
    move(event) {
      if (initial && pointers.has(event.pointerId)
          && Math.hypot(event.clientX-initial.x,event.clientY-initial.y)>8) initial.valid=false;
    },
    up(event) {
      if (!pointers.has(event.pointerId)) return false;
      this.move(event);
      pointers.delete(event.pointerId);
      if (pointers.size) return false;
      const accepted=initial.valid && event.type==='pointerup' && event.button===0
        && event.timeStamp-initial.time<=420;
      initial=undefined;
      return accepted;
    },
    cancel() {pointers.clear();initial=undefined;},
  };
}
