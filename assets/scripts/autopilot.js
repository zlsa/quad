
var Target=Fiber.extend(function() {
  return {
    init: function() {
      this.position        = [0, 0]; // where to be
      this.velocity        = [0, 0]; // how fast to be traveling there
      this.angle           = 0;      // the angle when there
      this.angularVelocity = 0;      // the angular velocity when there
      this.time            = 0;
    },
  };
})

var Autopilot=Fiber.extend(function() {
  return {
    init: function() {
      this.target = new Target();
    },
    bind: function(quad) {
      this.quad=quad;
      this.quad.body.position[1]=10;
//      this.quad.body.angle=radians(180);

      this.pid={
        position:        new PID(1.4, 0.0,  0.0, 0.1),
        altitude:        new PID(1.4, 0.0,  0.0, 0.1),
        horizontalSpeed: new PID(0.1, 0.15, 0.0, 4.0),
        verticalSpeed:   new PID(0.5, 0.9,  0.0, 4.0),
        angularVelocity: new PID(12 ,1.5,  0.5, 1  ),
      };

    },
    level: function() {
//      var target_horizontal_speed = scrange(0.01, this.quad.body.position[1], 2.5, 0, 5);
//      var target_vertical_speed   = scrange(0.01, this.quad.body.position[1], 6, 0.1, -3.0);

      var target_position = prop.quad.target[0];
      var target_altitude = prop.quad.target[1];

      this.pid.position.target  = target_position;
      this.pid.position.input   = this.quad.body.position[0];
      this.pid.position.tick();

      this.pid.altitude.target  = target_altitude;
      this.pid.altitude.input   = this.quad.body.position[1];
      this.pid.altitude.tick();

      var target_horizontal_speed = this.pid.position.value;
      var target_vertical_speed   = this.pid.altitude.value;

      this.pid.horizontalSpeed.p = 0.09 + Math.abs(prop.world.world.gravity[0] * 0.05);
      this.pid.verticalSpeed.p   = 0.09 + Math.abs(prop.world.world.gravity[1] * 0.05);

      this.pid.horizontalSpeed.i = 0.1 + Math.abs(prop.world.world.gravity[0] * 0.07);
      this.pid.verticalSpeed.i   = 0.1 + Math.abs(prop.world.world.gravity[1] * 0.07);
      
      this.pid.horizontalSpeed.target = target_horizontal_speed;
      this.pid.horizontalSpeed.input  = this.quad.body.velocity[0];
      this.pid.horizontalSpeed.tick();

      this.pid.verticalSpeed.target   = target_vertical_speed;
      this.pid.verticalSpeed.input    = this.quad.body.velocity[1];
      this.pid.verticalSpeed.tick();

      var target_angle            = this.target.angle;
      target_angle  = clamp(-Math.PI/2, mod(Math.atan2(-this.pid.horizontalSpeed.value, this.pid.verticalSpeed.value) + Math.PI/2, Math.PI) - Math.PI/2, Math.PI/2);
      if(prop.quad.flip) target_angle += Math.PI;
      var offset_angle            = angle_difference(this.quad.body.angle, target_angle);
      var target_angular_velocity = crange(-Math.PI, offset_angle, Math.PI, Math.PI/8, -Math.PI/8);
      
      this.pid.angularVelocity.target = target_angular_velocity;
      this.pid.angularVelocity.input  = this.quad.body.angularVelocity * delta();

      this.pid.angularVelocity.tick();
      
      this.quad.power.left   = -this.pid.angularVelocity.value * 1;
      this.quad.power.right  =  this.pid.angularVelocity.value * 1;

      var angle = this.quad.body.angle;

      this.quad.power.left  +=  Math.cos(angle) * this.pid.verticalSpeed.value;
      this.quad.power.right +=  Math.cos(angle) * this.pid.verticalSpeed.value;
      this.quad.power.left  += -Math.sin(angle) * this.pid.horizontalSpeed.value;
      this.quad.power.right += -Math.sin(angle) * this.pid.horizontalSpeed.value;

      return;

      this.quad.power.left  = crange(-Math.PI/2, this.quad.body.angle, Math.PI/2, -1,  1);
      this.quad.power.right = crange(-Math.PI/2, this.quad.body.angle, Math.PI/2,  1, -1);
    },
    tick: function() {
      this.level();
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
