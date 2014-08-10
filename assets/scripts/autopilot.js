
var Target=Fiber.extend(function() {
  return {
    init: function(options) {
      if(!options) options={};
      this.position        = options.position        || [0, 0]; // where to be
      this.velocity        = options.velocity        || [0, 0]; // how fast to be traveling there
      this.angle           = options.angle           || 0;      // the angle when there
      this.angularVelocity = options.angularVelocity || 0;      // the angular velocity when there
      this.time            = options.time            || 0;
    },
  };
})

var Autopilot=Fiber.extend(function() {
  return {
    init: function() {
      this.targets = [];
      this.current_target = 0;

      this.addTarget(new Target({
        position:        [0, 10],
        velocity:        [-1, 4],
        angle:           radians(90),
        angularVelocity: 0,
        time:            time() + 1.2
      }));
      
      this.mode = "speed";
    },
    addTarget: function(target) {
      this.targets.push(target);
    },
    bind: function(quad) {
      this.quad=quad;
      this.quad.body.position[1]=10;
//      this.quad.body.angle=radians(180);

      this.pid={
        position:        new PID(0.5, 0.0,  0.0, 0.1),
        altitude:        new PID(0.5, 0.0,  0.0, 0.1),
        horizontalSpeed: new PID(0.1, 0.15, 0.0, 0.4),
        verticalSpeed:   new PID(0.5, 0.9,  0.0, 0.4),
        angularVelocity: new PID(12 , 1.5,  0.5, 1  ),
      };

    },
    getTarget: function() {
      return this.targets[this.current_target];
    },
    targetPosition: function() {
      var target = this.getTarget();
      return target.position;
    },
    targetSpeed: function() {
      var target    = this.getTarget();
      var overshoot = 0.8; // in seconds
      var compensation = [
        -prop.world.world.gravity[0] * overshoot,
        -prop.world.world.gravity[1] * overshoot
      ];
      return [target.velocity[0] + compensation[0], target.velocity[1] + compensation[1]];
    },
    targetAngle: function() {
      var target = this.getTarget();
      return target.angle;
    },
    position: function(position) {
      var target_position = position[0];
      var target_altitude = position[1];

      this.pid.position.target  = target_position;
      this.pid.position.input   = this.quad.body.position[0];
      this.pid.position.tick();

      this.pid.altitude.target  = target_altitude;
      this.pid.altitude.input   = this.quad.body.position[1];
      this.pid.altitude.tick();

      return [this.pid.position.value, this.pid.altitude.value];

    },
    switchMode: function() {
      var targetSpeed = this.targetSpeed();
      var speed_tolerance = 0.05;
      if(this.mode == "speed") {
        if((Math.abs(targetSpeed[0] - this.quad.body.velocity[0]) < speed_tolerance) &&
           (Math.abs(targetSpeed[1] - this.quad.body.velocity[1]) < speed_tolerance)) {
          this.mode="angle";
        }
      } else if(this.mode == "angle") {
        if(this.quad.body.position[1] + this.quad.body.velocity[1]*2 < 10) {
          this.mode="position";
        }
      }
    },
    speed: function(speed) {
      var target_horizontal_speed = speed[0];
      var target_vertical_speed   = speed[1];

      this.pid.horizontalSpeed.target = target_horizontal_speed;
      this.pid.horizontalSpeed.input  = this.quad.body.velocity[0];
      this.pid.horizontalSpeed.tick();

      this.pid.verticalSpeed.target   = target_vertical_speed;
      this.pid.verticalSpeed.input    = this.quad.body.velocity[1];
      this.pid.verticalSpeed.tick();
      
      var target_angle  = clamp(-Math.PI/2, mod(Math.atan2(-this.pid.horizontalSpeed.value, this.pid.verticalSpeed.value) + Math.PI/2, Math.PI) - Math.PI/2, Math.PI/2);
      if(prop.quad.flip) target_angle += Math.PI;

      this.angle(target_angle);

      var angle = this.quad.body.angle;

      this.quad.power.left  +=  Math.cos(angle) * this.pid.verticalSpeed.value;
      this.quad.power.right +=  Math.cos(angle) * this.pid.verticalSpeed.value;
      this.quad.power.left  += -Math.sin(angle) * this.pid.horizontalSpeed.value;
      this.quad.power.right += -Math.sin(angle) * this.pid.horizontalSpeed.value;

      this.quad.power.left   = clamp(-0.8, this.quad.power.left,  0.8);
      this.quad.power.right  = clamp(-0.8, this.quad.power.right, 0.8);

      return;
    },
    angle: function(target_angle) {
      var offset_angle            = angle_difference(this.quad.body.angle, target_angle);
      var target_angular_velocity = crange(-Math.PI, offset_angle, Math.PI, Math.PI/8, -Math.PI/8);
      
      this.pid.angularVelocity.target = target_angular_velocity;
      this.pid.angularVelocity.input  = this.quad.body.angularVelocity * delta();

      this.pid.angularVelocity.tick();
      
      this.quad.power.left  += -this.pid.angularVelocity.value * 1;
      this.quad.power.right +=  this.pid.angularVelocity.value * 1;
      
    },
    tick: function() {
      this.pid.horizontalSpeed.p = 0.12 + Math.abs(prop.world.world.gravity[0] * 0.05);
      this.pid.verticalSpeed.p   = 0.12 + Math.abs(prop.world.world.gravity[1] * 0.05);

      this.pid.horizontalSpeed.i = 0.15 + Math.abs(prop.world.world.gravity[0] * 0.07);
      this.pid.verticalSpeed.i   = 0.15 + Math.abs(prop.world.world.gravity[1] * 0.07);
      
      this.quad.power.left=0;
      this.quad.power.right=0;

      this.switchMode();
      if(this.mode == "position") this.speed(this.position(this.targetPosition()));
      else if(this.mode == "speed") this.speed(this.targetSpeed());
      else if(this.mode == "angle") this.angle(this.targetAngle());
      return;
      var sensitivity = [3, 1];
      prop.quad.target[0] = clamp(-10*sensitivity[0], prop.quad.target[0], 10*sensitivity[0]);
      prop.quad.target[1] = clamp(-10*sensitivity[1], prop.quad.target[1], 10*sensitivity[1]);
      this.quad.power.left   = crange(-10*sensitivity[0], prop.quad.target[0], 10*sensitivity[0], -1,  1);
      this.quad.power.right  = crange(-10*sensitivity[0], prop.quad.target[0], 10*sensitivity[0],  1, -1);
      this.quad.power.left  += crange(-10*sensitivity[1], prop.quad.target[1], 10*sensitivity[1], -1,  1);
      this.quad.power.right += crange(-10*sensitivity[1], prop.quad.target[1], 10*sensitivity[1], -1,  1);
    }
  };
});
