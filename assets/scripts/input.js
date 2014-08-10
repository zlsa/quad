
function input_init() {
  prop.input={};

  prop.input.button={
    none:0,
    left:1,
    middle:2,
    right:3
  };

  prop.input.keys={};

  prop.input.keysym={
    shift:16,
    control:17,
    r: 82,
    x:88,
    left:37,
    up:38,
    right:39,
    down:40,
  };
}

function input_done() {
  $(window).keydown(function(e) {
    prop.input.keys[e.which]=true;
    input_keydown(e.which);
  });

  $(window).keyup(function(e) {
    prop.input.keys[e.which]=false;
    console.log(e.which);
  });

  $(window).mousemove(function(e) {
    return;
    var width=prop.canvas.size.width;
    var height=prop.canvas.size.height;
    var size=400/2;
    prop.quad.target[0]=crange(width/2-size, e.pageX, width/2+size, -5, 5);
    prop.quad.target[1]=crange(height/2-size, e.pageY, height/2+size, 10, -10);
  });

}

function input_keydown(keycode) {
  if(keycode == prop.input.keysym.r) {
    quad_reset();
  }
}

function input_update_pre() {
  var d=delta();
  var s=3;
  if(prop.input.keys[prop.input.keysym.up]) {
    prop.quad.target_speed[1] += s*d;
  } else if(prop.input.keys[prop.input.keysym.down]) {
    prop.quad.target_speed[1] -= s*d;
  }
  if(prop.input.keys[prop.input.keysym.x]) {
    prop.quad.flip = true;
  } else {
    prop.quad.flip = false;
  }
  if(prop.input.keys[prop.input.keysym.right]) {
    prop.quad.target_speed[0] += s*d;
  } else if(prop.input.keys[prop.input.keysym.left]) {
    prop.quad.target_speed[0] -= s*d;
  }
}
