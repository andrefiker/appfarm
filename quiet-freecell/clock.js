// Accumulate monotonic active time without discarding fractional seconds.
export class ActiveClock {
 constructor(now,remainder=0){this.last=now;this.remainder=remainder;this.active=false}
 advance(now,active){let ms=this.remainder+(this.active?Math.max(0,now-this.last):0);let seconds=Math.floor(ms/1000);this.remainder=ms-seconds*1000;this.last=now;this.active=active;return seconds}
 reset(now){this.last=now;this.remainder=0;this.active=false}
}
