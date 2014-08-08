
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
      this.body.addShape(blade_shape, [0, -0.07*this.size]);

      var body_shape = new p2.Rectangle(0.6*this.size, 0.07*this.size);
      this.body.addShape(body_shape, [0, -0.07*this.size/2]);

      var base_shape = new p2.Rectangle(0.2*this.size, 0.05*this.size);
      this.body.addShape(base_shape, [0, 0.07*this.size/2]);
      
      this.target = [0, 0];
      this.target_offset = [0, 0];

      this.body.updateMassProperties();

      this.body.damping=0.5;
      this.body.angularDamping=0.5;

      prop.world.world.addBody(this.body);
      
      this.autopilot = {
        enabled: true,
        vspeed: new PID(0.7, 0.5, 0.0),
        hspeed: new PID(40, 30, 0),
        angular_velocity: new PID(0.3, 0.01, 0)
      };

      if(options) {
        if(options.position) this.body.position=options.position;
        if(options.target_offset) this.target_offset=options.target_offset;
      }
      this.body.position[1]=Math.max(this.body.position[1], 0.08*this.size);

    },

    reset: function() {

    },

    updateTarget: function(t) {
      t*=0.2;
      var target=[0, 0];
//      t=crange(-1, Math.sin(t), 1, 0.5, 1.0);
      target[0] = prop.quad.target[0] + this.target_offset[0];
      target[1] = prop.quad.target[1] + this.target_offset[1];
      target[1] = Math.max(0, target[1]);
//      return target;
      target[0] = prop.quad.target[0] + (-Math.sin(t)*this.target_offset[0]) + (Math.cos(t)*this.target_offset[1]);
      target[1] = prop.quad.target[1] + (Math.sin(t)*this.target_offset[1]) + (Math.cos(t)*this.target_offset[0]);
      target[1] = Math.max(0, target[1]);
      return target;
    },

    updateAutopilot: function() {
      var real_target=this.updateTarget(time());
      var target=this.updateTarget(time()+1.2);

      var target_position = target[0];
      var target_altitude = target[1];
      var target_hspeed = crange(-50, target_position - this.body.position[0], 50, -70, 70);

      var floor=1.0;

      target_hspeed *= crange(0, this.body.position[1], floor, 5, 1);

      if(target_altitude < 0.1) {
        target_altitude  = scrange(0.02, Math.abs(real_target[0] - this.body.position[0]), 0.3*this.size, 0.08*this.size, Math.max(target_altitude, floor));
        target_hspeed   *= scrange(0.02, Math.abs(real_target[0] - this.body.position[0]), floor*2, 0.5, 1);
      }

      var target_vspeed = crange(-70, target_altitude - this.body.position[1], 70, -70, 70);
      target_vspeed    *= crange(0, Math.abs(target_altitude - this.body.position[1]), 60, 1.2, 1);

      this.autopilot.vspeed.target = target_vspeed;
      this.autopilot.vspeed.input  = this.body.velocity[1];
      this.autopilot.vspeed.tick();

      this.autopilot.hspeed.target = target_hspeed;
      this.autopilot.hspeed.input  = this.body.velocity[0];
      this.autopilot.hspeed.tick();

      var target_angle=crange(-40, this.autopilot.hspeed.get(), 40, Math.PI/4, -Math.PI/4);
      target_angle *= crange(0.1*this.size, this.body.position[1], floor, 0, 1);

      if(prop.quad.flip && this.body.position[1] > 0.9) target_angle+=Math.PI;

      var s=crange(1,this.size, 3, 1, 0.1)*2;
      var target_angular_velocity = crange(-Math.PI/2, angle_difference(this.body.angle, target_angle), Math.PI/2, Math.PI*4*s, -Math.PI*4*s);

      this.autopilot.angular_velocity.target = target_angular_velocity;
      this.autopilot.angular_velocity.input  = this.body.angularVelocity;
      this.autopilot.angular_velocity.tick();

      var mix=0.5;
      mix+=crange(1, this.size,5, 0, -0.3);

      var angle=this.body.angle;
      this.power.left   = this.autopilot.vspeed.get() * Math.cos(angle);
      this.power.right  = this.autopilot.vspeed.get() * Math.cos(angle);

      this.power.left=clamp(-mix, this.power.left, mix);
      this.power.right=clamp(-mix, this.power.right, mix);

      this.power.left  -= this.autopilot.angular_velocity.get() * (1-mix);
      this.power.right += this.autopilot.angular_velocity.get() * (1-mix);

      if(target_altitude < 0.1*this.size) {
        this.power.left *= crange(0.08*this.size, this.body.position[1], 0.12*this.size, 0, 1);
        this.power.right *= crange(0.08*this.size, this.body.position[1], 0.12*this.size, 0, 1);
      }

    },

    updatePower: function() {

      var left=clamp(-1, this.power.left, 1);
      var right=clamp(-1, this.power.right, 1);

      this.power.left_motor  = left;
      this.power.right_motor = right;

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
      this.audio.left.setVolume(crange(0.05,Math.abs(this.power.left_motor), 0.1, 0, 0.7));
      this.audio.right.setVolume(crange(0.05,Math.abs(this.power.right_motor), 0.1, 0, 0.7));
      var s=crange(1, this.size, 5, 1, 0.5);
      this.audio.left.setRate(crange(0,Math.abs(this.power.left_motor), 1, 0.2, 3)*s);
      this.audio.right.setRate(crange(0,Math.abs(this.power.right_motor), 1, 0.2, 3)*s);
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
  prop.quad.target=[0,3];
  prop.quad.flip=false;
}

function quad_init() {
  quad_add(new Quad({
    position: [0, 10],
    target_offset: [0, 0]
  }));
  return;
  var separation=4;
  var d = 3;
  var number=3;
  for(var i=0;i<number;i++) {
    var angle=i/number*Math.PI*2;
    quad_add(new Quad({
      position: [((i-number/2)*separation), 0],
      target_offset: [Math.sin(angle)*d, Math.cos(angle)*d]
    }));
  }
}

function quad_add(quad) {
  if(!quad) quad = new Quad({});
  prop.quad.quads.push(quad);
}

function quad_update_pre() {
  prop.quad.target[1] = Math.max(0, prop.quad.target[1]);
  for(var i=0;i<prop.quad.quads.length;i++) {
    prop.quad.quads[i].update();
  }
}

function quad_reset() {
  for(var i=0;i<prop.quad.quads.length;i++) {
    prop.quad.quads[i].reset();
  }
}
