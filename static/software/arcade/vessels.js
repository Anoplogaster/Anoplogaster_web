/* Historical artwork candidates: purely decorative background presentation.
 * No engine reference, hitboxes, input, scoring, or shared gameplay randomness. */
(() => {
  'use strict';
  const KINDS = Object.freeze(['bathysphere', 'trieste', 'challenger']);
  const DURATION = 8;
  const SCHEDULE = Object.freeze([10,30,60]);
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const t=clamp(value);return t*t*(3-2*t); };
  class ArcadeVessels {
    static KINDS = KINDS;
    static DURATION = DURATION;
    static SCHEDULE = SCHEDULE;
    constructor(options = {}) {
      this.reducedMotion = Boolean(options.reducedMotion);
      let seed = (Number.isFinite(options.seed) ? options.seed : Date.now() ^ 0xa72e1859) >>> 0;
      this.random = options.random || (() => {
        seed += 0x6d2b79f5;
        let v=seed;v=Math.imul(v^v>>>15,v|1);
        v^=v+Math.imul(v^v>>>7,v|61);
        return ((v^v>>>14)>>>0)/4294967296;
      });
      this.reset();
    }
    reset() {
      this.order=KINDS.slice();
      // Shuffle only the private decorative random stream. Each vessel appears
      // once at its scheduled time without changing any encounter randomness.
      for(let i=this.order.length-1;i>0;i--) {
        const j=Math.max(0,Math.min(i,Math.floor(this.random()*(i+1))));
        [this.order[i],this.order[j]]=[this.order[j],this.order[i]];
      }
      this.nextIndex=0;this.active=null;this.appearances=0;this.selected=null;this.history=[];
    }
    clear() { this.nextIndex=SCHEDULE.length;this.active=null; }
    preview(kind, age = 0) {
      if (!KINDS.includes(kind)) throw new Error('Unknown historical vessel');
      this.nextIndex=SCHEDULE.length;this.selected=kind;this.appearances=1;
      this.active={kind,age:Math.max(0,Math.min(DURATION,Number(age)||0))};
      return this;
    }
    update(dt, totalGameTime) {
      if (!Number.isFinite(dt) || dt<=0) return;
      if (this.active) {
        this.active.age=Math.min(DURATION,this.active.age+dt);
        if(this.active.age>=DURATION)this.active=null;
        if(this.active)return;
      }
      if(this.nextIndex>=SCHEDULE.length || !Number.isFinite(totalGameTime) || totalGameTime<SCHEDULE[this.nextIndex])return;
      const kind=this.order[this.nextIndex++];
      this.active={kind,age:0};this.selected=kind;this.appearances++;
      this.history.push({kind,at:totalGameTime});
    }
    draw(ctx, images) {
      if(!this.active)return;
      const {kind,age}=this.active,image=images[kind];
      if(!image?.complete || !image.naturalWidth || age>=DURATION)return;
      // Reduced motion keeps a still midpoint tableau; only opacity fades in
      // and out. No translating/zooming vessel or sweeping searchlight.
      // Keep the established approach/observe/retreat paths, presented over
      // eight seconds. A still midpoint is retained for reduced motion.
      const t=this.reducedMotion?9:age/DURATION*18;
      const arrival=ease(t/5),departure=ease((t-12)/6);
      const fadeTime=age/DURATION*18;
      const visible=ease(fadeTime/2)*(1-ease((fadeTime-15)/3));
      let x=810,y=245,w=150,h=150;
      if(kind==='bathysphere') {
        h=118+arrival*38-departure*53;
        w=h*image.naturalWidth/image.naturalHeight;
        x=840-arrival*40+departure*125;
        y=205+arrival*22-departure*95;
      } else if(kind==='trieste') {
        w=278;h=w*image.naturalHeight/image.naturalWidth;
        x=800+departure*105;
        y=-h/2+arrival*(320+h/2)+departure*(310+h/2);
      } else {
        h=168;w=h*image.naturalWidth/image.naturalHeight;
        x=865-arrival*38+departure*155;
        y=225-arrival*10-departure*45;
      }
      ctx.save();ctx.globalAlpha=visible;
      if(kind==='trieste'||kind==='challenger') {
        const swing=this.reducedMotion?0:Math.sin(t*.32)*.22;
        const beamX=kind==='trieste'?x-12:x-w*.15;
        const beamY=kind==='trieste'?y+h*.37:y+h*.27;
        const direction=kind==='trieste'?Math.PI/2+swing:Math.PI*.78+swing;
        const length=kind==='trieste'?240:225,spread=.15;
        const tipX=beamX+Math.cos(direction)*length,tipY=beamY+Math.sin(direction)*length;
        const gradient=ctx.createLinearGradient(beamX,beamY,tipX,tipY);
        gradient.addColorStop(0,'rgba(144,197,178,.065)');gradient.addColorStop(1,'rgba(144,197,178,0)');
        ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(beamX,beamY);
        ctx.lineTo(beamX+Math.cos(direction-spread)*length,beamY+Math.sin(direction-spread)*length);
        ctx.lineTo(beamX+Math.cos(direction+spread)*length,beamY+Math.sin(direction+spread)*length);
        ctx.closePath();ctx.fill();
      }
      // The full original transparent PNG is drawn, with modest distance fog.
      // Foreground prey/player/hazards are painted later and always take priority.
      ctx.globalAlpha=visible*.55;
      ctx.drawImage(image,Math.round(x-w/2),Math.round(y-h/2),w,h);
      ctx.restore();
    }
  }
  window.ArcadeVessels=ArcadeVessels;
})();
