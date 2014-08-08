
var AudioSource=Fiber.extend(function() {
  return {
    init: function(options) {
      if(!options) options={};

      this.name = options.name || "";

      this.buffer = null;

      this.volume=1;

      this.master_volume=1;

      this.load();
    },
    setVolume: function(volume) {
      volume=clamp(0,volume,1);
      if(!this.gain) return;
      this.volume=volume;
      this.gain.gain.value=volume*this.master_volume*2;
    },
    setRate: function(rate) {
      rate=clamp(0.01,rate,5);
      if(!this.source) return;
      this.source.playbackRate.value=rate;
    },
    setDelay: function(delay) {
      delay=Math.max(0.01,delay);
      if(!this.delay) return;
      this.delay.delayTime.value=delay;
    },
    createSource: function() {
      if(!this.buffer || this.buffer == true) {
        console.log(this);
        log("no buffer on object",LOG_WARNING);
        return;
      }
      this.source=prop.audio.context.createBufferSource();
      this.source.buffer=this.buffer;

      this.delay=prop.audio.context.createDelay();
      this.source.connect(this.delay);

      this.gain=prop.audio.context.createGain();
      this.setVolume(0);
      this.delay.connect(this.gain);

      this.gain.connect(prop.audio.context.destination);

      this.source.loop=true;
      this.source.start(0);
    },
    load: function() {
      this.content=audio_load_buffer(this.name);
    },
    ready: function() {
      this.buffer=prop.audio.buffers[this.name];
      this.createSource();
    },
    update: function() {
//      if(game_paused()) this.master_volume=0;
//      else this.master_volume=1;
      this.master_volume=1;
      this.setVolume(this.volume);
    }
  };
});

function audio_init_pre() {
  prop.audio={};

  prop.audio.url_root="assets/sounds/";
  prop.audio.context=null;
  
  prop.audio.enabled=false;
  prop.audio.focused=true;

  prop.audio.sources=[];
  prop.audio.buffers={};

  try {
    prop.audio.context=new AudioContext();
  } catch(e) {
    console.log("Web Audio API is not supported in this browser; no audio available");
  }
}

function audio_load(name) {
  var source=new AudioSource({
    name: name
  });
  prop.audio.sources.push(source);
  return source;
}

function audio_load_buffer(name,format) {
  if(name in prop.audio.buffers) return;
  if(!format) format="wav";
  var url=prop.audio.url_root+name+"."+format;
  var content=new Content({
    type:"audio",
    url: url,
    payload: name,
    callback: function(status,data,payload) {
      prop.audio.buffers[payload]=data;
    }
  });
  prop.audio.buffers[name]=true; // reserved
  return content;
}


function audio_complete() {
  for(var i=0;i<prop.audio.sources.length;i++) {
    prop.audio.sources[i].ready();
  }
}

function audio_update_post() {
  for(var i=0;i<prop.audio.sources.length;i++) {
    prop.audio.sources[i].update();
  }
}
