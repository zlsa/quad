
var Quad=Fiber.extend(function() {
  return {
    init: function(options) {
      
      this.size=1.0;

      if(options) {
        if(options.size) {
          this.size = options.size;
        }
      }
      this.power = {
        left: 0,
        right: 0,
        left_motor: 0,
        right_motor: 0,
        left_position: -0.4*this.size * 0.5,
        right_position: 0.4*this.size * 0.5,
        max: 4*(this.size*this.size)
      };

      this.audio={
        left: audio_load("motor"),
        right: audio_load("motor")
      };

      this.body = new p2.Body({
        mass: 0.2*(this.size*this.size),
        position: [0, 0.08*this.size]
      });

      this.body.inertia=100 * this.size;

      var blade_shape = new p2.Rectangle(0.8*this.size, 0.07*this.size*0.5);
      this.body.addShape(blade_shape, [0, 0.07*this.size/1.5]);

      var body_shape = new p2.Rectangle(0.6*this.size, 0.07*this.size);
      this.body.addShape(body_shape, [0, 0.07*this.size/2]);

      var base_shape = new p2.Rectangle(0.2*this.size, 0.05*this.size);
      this.body.addShape(base_shape, [0, -0.07*this.size/2]);
      
      this.target = [0, 0];
      this.target_offset = [0, 0];

      this.body.updateMassProperties();

      this.body.damping=0.5;
      this.body.angularDamping=0.5;

      prop.world.world.addBody(this.body);
      
      this.autopilot = {
        enabled: true,
        vspeed: new PID(0.5, 1.0, 0.3),
        hspeed: new PID(50, 70, 0.5),
        angular_velocity: new PID(0.3, 0.5, 0.001)
      };

      if(options) {
        if(options.position) this.body.position=options.position;
        if(options.target_offset) this.target_offset=options.target_offset;
        this.data = options.data;
      }
      this.body.position[1]=Math.max(this.body.position[1], 0.08*this.size);

    },

    reset: function() {

    },

    updateTarget: function(t) {
      if(this.data == "child") {
        var target = [0, 0];
        var quad=prop.quad.quads[0];
        var distance=distance2d(quad.body.position, this.body.position);
        var voffset=crange(0.1, distance, 0.6, 0.1, 0.4);
        var xoffset=3;
        if(quad.body.position[0] - this.body.position < 0) xoffset=-3;
        xoffset*=crange(0.5,quad.body.position[1]-this.body.position[1],0.2,1,0);
        var angle=quad.body.angle;
        target[0] = quad.body.position[0]-Math.sin(angle)*voffset+xoffset;
        target[1] = quad.body.position[1]+Math.cos(angle)*voffset;
        return target;
      }
      t*=0.2;
      var target=[0, 0];
//      t=crange(-1, Math.sin(t), 1, 0.5, 1.0);
      target[0] = prop.quad.target[0] + this.target_offset[0];
      target[1] = prop.quad.target[1] + this.target_offset[1];
      target[1] = Math.max(0, target[1]);
      return target;
      target[0] = prop.quad.target[0] + (-Math.sin(t)*this.target_offset[0]) + (Math.cos(t)*this.target_offset[1]);
      target[1] = prop.quad.target[1] + (Math.sin(t)*this.target_offset[1]) + (Math.cos(t)*this.target_offset[0]);
      target[1] = Math.max(0, target[1]);
      return target;
    },

    updateAutopilot: function() {
      var real_target=this.updateTarget(time());
      var target=this.updateTarget(time()+0.5);

      var target_position = target[0];
      var target_altitude = target[1];
      var target_hspeed = crange(-100, target_position - this.body.position[0], 100, -60, 60);

      var floor=1.5;

      if(target_altitude < floor) {
        target_altitude  = scrange(0.001, Math.abs(real_target[0] - this.body.position[0]), floor/2, Math.max(0.04*this.size, target_altitude), Math.max(target_altitude, floor));
      }
      target_hspeed   *= crange(floor, this.body.position[1], floor*2, 1.5, 1);
      target_hspeed   *= crange(0, this.body.position[1], floor, 1.2, 1);

      var target_vspeed = crange(-700, target_altitude - this.body.position[1], 700, -700, 700);
      target_vspeed    *= crange(0, Math.abs(target_altitude - this.body.position[1]), 60, 1.2, 1);
      target_vspeed    *= crange(0.1*this.size, this.body.position[1], floor, 3, 1);

      this.autopilot.vspeed.target = target_vspeed;
      this.autopilot.vspeed.input  = this.body.velocity[1];
      if(this.body.position[1] < 0.09*this.size && target_altitude < 0.09*this.size) {
        this.autopilot.vspeed.target = 0;
        this.autopilot.vspeed.input  = 0;
      }
      var e=10;
      this.autopilot.vspeed.error  = clamp(-e, this.autopilot.vspeed.error, e);
      this.autopilot.vspeed.tick();

      target_hspeed *= crange(1, this.size, 3, 1, 0.5);

      this.autopilot.hspeed.target = target_hspeed;
      this.autopilot.hspeed.input  = this.body.velocity[0];
      e=100;
      this.autopilot.hspeed.error  = clamp(-e, this.autopilot.hspeed.error, e);
      this.autopilot.hspeed.tick();

      var target_angle=crange(-60, this.autopilot.hspeed.get(), 60, Math.PI/3, -Math.PI/3);
      target_angle *= crange(0.1*this.size, this.body.position[1], floor/4, 0, 1);
      target_angle *= crange(1, this.size, 3, 1, 0.3);

      if(prop.quad.flip && this.body.position[1] > floor) target_angle+=Math.PI;

      var s=crange(1,this.size, 3, 1, 0.1)*2;
      var target_angular_velocity = crange(-Math.PI/2, angle_difference(this.body.angle, target_angle), Math.PI/2, Math.PI*4*s, -Math.PI*4*s);
      target_angular_velocity *= crange(1, this.size, 3, 1, 0.05);

      this.autopilot.angular_velocity.target = target_angular_velocity;
      this.autopilot.angular_velocity.input  = this.body.angularVelocity;
      this.autopilot.angular_velocity.tick();

      var mix=0.5;
      mix+=crange(1, this.size, 3, 0, 0.3);

      var angle=this.body.angle;
      this.power.left   = this.autopilot.vspeed.get() * Math.cos(angle);
      this.power.right  = this.autopilot.vspeed.get() * Math.cos(angle);

      this.power.left=clamp(-mix, this.power.left, mix);
      this.power.right=clamp(-mix, this.power.right, mix);

      mix*=1.2;

      this.power.left  -= this.autopilot.angular_velocity.get() * (1-mix);
      this.power.right += this.autopilot.angular_velocity.get() * (1-mix);

      if(this.data == "parent") {
        this.power.left  = Math.max(0.1, this.power.left);
        this.power.right = Math.max(0.1, this.power.right);
      }

      if(target_altitude < 0.12*this.size) {
        this.power.left *= crange(0.08*this.size, this.body.position[1], 0.1*this.size, 0, 1);
        this.power.right *= crange(0.08*this.size, this.body.position[1], 0.1*this.size, 0, 1);
      }

      var distance=distance2d(target, this.body.position);
      if(this.data == "child") {
        this.power.left  *= crange(0.3, distance, 0.32, 0, 1);
        this.power.right *= crange(0.3, distance, 0.32, 0, 1);
      }

    },

    updatePower: function() {

      var left=clamp(-1, this.power.left, 1);
      var right=clamp(-1, this.power.right, 1);

      var mix=0.999999999;

      this.power.left_motor  = (left *mix) + (this.power.left_motor*(1-mix));
      this.power.right_motor = (right*mix) + (this.power.right_motor*(1-mix));

      var v=this.body.angle;
      var thrust=this.power.max*this.power.left_motor;
      var force=[-Math.sin(v)*thrust, Math.cos(v)*thrust];
      var point=[0,0];
      this.body.toWorldFrame(point,[this.power.left_position,0]);
      this.body.applyForce(force,point);

      thrust=this.power.max*this.power.right_motor;
      force=[-Math.sin(v)*thrust, Math.cos(v)*thrust];
      point=[0,0];
      this.body.toWorldFrame(point,[this.power.right_position,0]);
      this.body.applyForce(force,point);
    },
    updateAudio: function() {
      var v=0.5;
      this.audio.left.setVolume(crange(0.05,Math.abs(this.power.left_motor), 0.1, 0, 0.7)*v);
      this.audio.right.setVolume(crange(0.05,Math.abs(this.power.right_motor), 0.1, 0, 0.7)*v);
      var s=crange(1, this.size, 5, 1, 0.5);
      this.audio.left.setRate(crange(0,Math.abs(this.power.left_motor), 1, 0.5, 3)*s);
      this.audio.right.setRate(crange(0,Math.abs(this.power.right_motor), 1, 0.5, 3)*s);
    },
    update: function() {
      this.target = this.updateTarget(time());
      if(this.autopilot.enabled) this.updateAutopilot();
      this.updatePower();
      this.updateAudio();
    }
  };
});

function quad_init_pre() {
  prop.quad={};
  prop.quad.quads=[];
  prop.quad.target_speed=[0,0];
  prop.quad.target=[0,3];
  prop.quad.flip=false;
}

function quad_init() {
  quad_add(new Quad({
    position: [0, 0],
    target_offset: [0, 0],
    size: 1
  }));
  return;
  quad_add(new Quad({
    data: "child",
    position: [10, 5]
  }));
  return;
  var separation=2;
  var d = 2;
  var number=3;
  for(var i=0;i<number;i++) {
    var angle=i/number*Math.PI*2;
    var p=[-((i-number/2)*separation), 0];
    if(i == 0) p=[0, 1];
    quad_add(new Quad({
      data: i,
      position: p,
      target_offset: [Math.sin(angle)*d, Math.cos(angle)*d]
    }));
  }
}

function quad_add(quad) {
  if(!quad) quad = new Quad({});
  prop.quad.quads.push(quad);
}

function quad_update_pre() {
  prop.quad.target_speed[0] *= 0.9;
  prop.quad.target_speed[1] *= 0.9;
  prop.quad.target[0] += prop.quad.target_speed[0];
  prop.quad.target[1] += prop.quad.target_speed[1];
  prop.quad.target[1]  = Math.max(0, prop.quad.target[1]);
  for(var i=0;i<prop.quad.quads.length;i++) {
    prop.quad.quads[i].update();
  }
}

function quad_reset() {
  for(var i=0;i<prop.quad.quads.length;i++) {
    prop.quad.quads[i].reset();
  }
}
