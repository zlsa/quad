
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
      
      this.body.updateMassProperties();

      prop.world.world.addBody(this.body);
      
      if(options) {
        if(options.position) this.body.position=options.position;
        if(options.target_offset) this.target_offset=options.target_offset;
        if(options.autopilot) this.autopilot=options.autopilot;
        this.data = options.data;
      }
      this.body.position[1]=Math.max(this.body.position[1], 0.08*this.size);

      this.autopilot.bind(this);

    },

    reset: function() {

    },

    updateAutopilot: function() {
      this.autopilot.tick(this);
    },

    updatePower: function() {

      var left=clamp(-1, this.power.left, 1);
      var right=clamp(-1, this.power.right, 1);

      var mix=0.5;

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
      this.updateAutopilot();
      this.updatePower();
      this.updateAudio();
    }
  };
});

function quad_init_pre() {
  prop.quad={};
  prop.quad.quads=[];
  prop.quad.target_speed=[0,0];
  prop.quad.target=[0,0];
  prop.quad.flip=false;
}

function quad_init() {
  quad_add(new Quad({
    position: [0, 0],
    target_offset: [0, 0],
    autopilot: new Autopilot()
  }));
}

function quad_add(quad) {
  if(!quad) quad = new Quad({});
  prop.quad.quads.push(quad);
}

function quad_update_pre() {
  prop.quad.target_speed[0] *= 0.8;
  prop.quad.target_speed[1] *= 0.8;
  prop.quad.target[0] += prop.quad.target_speed[0];
  prop.quad.target[1] += prop.quad.target_speed[1];
//  prop.quad.target[1]  = Math.max(0, prop.quad.target[1]);
  for(var i=0;i<prop.quad.quads.length;i++) {
    prop.quad.quads[i].update();
  }
}

function quad_reset() {
  for(var i=0;i<prop.quad.quads.length;i++) {
    prop.quad.quads[i].reset();
  }
}
