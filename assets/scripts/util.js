
window.AudioContext = window.AudioContext||window.webkitAudioContext;

(function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
				       timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

var sin_cache={};

function sin(v) {
    return(Math.sin(v));
    if(!v in sin_cache)
        sin_cache[v]=Math.sin(v);
    return(sin_cache[v]);
}

function cos(v) {
    return(sin(v+Math.PI/2));
}

function normalize(v,length) {
    var x=v[0];
    var y=v[1];
    var angle=Math.atan2(x,y);
    if(!length)
        length=1;
    return([
            sin(angle)*length,
            cos(angle)*length
    ]);
}

function fl(n) {
    return Math.floor(n);
}

function randint(l,h) {
    return(Math.floor(Math.random()*(h-l+1))+l);
}

function elements(obj) {
  var n=0;
  for(var i in obj)
    n+=1;
  return n;
}

function s(i) {
    if(i == 1)
	return "";
    else
	return "s";
}

function within(n,c,r) {
    if((n > c+r) || (n < c-r))
        return false;
    return true;
}

function trange(il,i,ih,ol,oh) {
    return(ol+(oh-ol)*(i-il)/(ih-il));
    i=(i/(ih-il))-il;
    return (i*(oh-ol))+ol;
}

function clamp(l,i,h) {
    if(h == null) {
        if(l > i)
            return l;
        return i;
    }
    var temp;
    if(l > h) {
        temp=h;
        h=l;
        l=temp;
    }
    if(l > i)
        return l;
    if(h < i)
        return h;
    return i;
}

function crange(il,i,ih,ol,oh) {
    return clamp(ol,trange(il,i,ih,ol,oh),oh);
}

function srange(il,i,ih,ol,oh) {
  return trange(-1,Math.sin(trange(il,i,ih,-Math.PI/2,Math.PI/2)),1,ol,oh);
}

function scrange(il,i,ih,ol,oh) {
  return srange(-1,Math.sin(crange(il,i,ih,-Math.PI/2,Math.PI/2)),1,ol,oh);
}

function distance2d(a,b) {
    var x=a[0]-b[0];
    var y=a[1]-b[1];
    return Math.sqrt((x*x)+(y*y));
}

function degrees(radians) {
    return (radians/(Math.PI*2))*360;
}

function radians(degrees) {
    return (degrees/360)*(Math.PI*2);
}

function choose(l) {
    return l[Math.floor(Math.random()*l.length)];
}

function mod(x,y) {
  var z=x+0;
  x=x%y;
  if(x < 0)
    x=(y-x)-2;
  return x;
}

function angle_difference(a, b) {
  a = degrees(a);
  b = degrees(b);
  var invert=false;
  if(b > a) {
    invert=true;
    var temp=a;
    a=b;
    b=temp;
  }
  var difference=mod(a-b, 360);
  if(difference > 180) difference -= 360;
  if(invert) difference *= -1;
  difference = radians(difference);
  return difference;
}

var Lowpass=function(mix) {
  this.target = 0;
  this.value = 0;

  this.mix = mix;

  this.tick=function() {
    var mix=this.mix;
    this.value = (this.target * (1-mix)) + (this.value * mix);
  };
};

var PID=function(p, i, d, ic, ek) {
  this.p = p;
  this.i = i;
  this.d = d;
  
  this.ic = ic || 0;
  this.ek = ek || 0;

  this.target = 0;
  this.input  = 0;

  this.speed_lowpass = new Lowpass(0.99);

  this.proportional = 0;
  this.integral = 0;
  this.deriviative = 0;

  this.error = 0;

  this.value = 0;

  this.get = function() {
    return this.value;
  },

  this.predict_error = function() {
    return this.target - (this.input + (this.speed_lowpass.value));
  },

  this.tick = function() {
    this.speed_lowpass.target = this.integral;
    this.speed_lowpass.tick();

    this.error = (this.target - this.input);

    this.proportional = this.error * this.p;
    this.integral += (this.error * this.i * delta());
    this.deriviative = this.predict_error() * this.d;

    if(this.ic) this.integral = clamp(-this.ic, this.integral, this.ic);

    this.value = this.proportional + this.integral + this.deriviative;
  }
};
