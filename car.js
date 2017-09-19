// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'attribute vec4 a_Normal;\n' +        // Normal
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'uniform vec3 u_LightColor;\n' +     // Light color
  'uniform vec3 u_LightDirection;\n' + // Light direction (in the world coordinate, normalized)
  'varying vec4 v_Color;\n' +
  'uniform bool u_isLighting;\n' +

  'uniform vec3 u_PointLightingLocation;\n' +
  'uniform vec3 u_PointLightingColor;\n' +
  'uniform vec3 u_AmbientLight;\n' +


  'void main() {\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
  '  if(u_isLighting)\n' +

  //Directional lighting
  '  {\n' +
  '     vec3 normal = normalize((u_NormalMatrix * a_Normal).xyz);\n' +
  '     float nDotL = max(dot(normal, u_LightDirection), 0.0);\n' +
        // Calculate the color due to diffuse reflection
  '     vec3 diffuse = u_LightColor * a_Color.rgb * nDotL;\n' +

  // point lighting

  // Recalculate the normal based on the model matrix and make its length 1.
    ' vec3 normal2 = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
    // Calculate world coordinate of vertex
    ' vec4 vertexPosition = u_ModelMatrix * a_Position;\n' +
    // Calculate the light direction and make it 1.0 in length
    ' vec3 lightDirection = normalize(u_PointLightingLocation - vec3(vertexPosition));\n' +
    // The dot product of the light direction and the normal
    ' float nDotL2 = max(dot(lightDirection, normal2), 0.0);\n' +
    // Calculate the color due to diffuse reflection
    ' vec3 diffuse2 = u_PointLightingColor * a_Color.rgb * nDotL2;\n' +
    // Calculate the color due to ambient reflection
    ' vec3 ambient = u_AmbientLight * a_Color.rgb;\n' +
    //  Add the surface colors due to diffuse reflection and ambient reflection
    ' v_Color = vec4(diffuse2 + ambient + diffuse, a_Color.a);\n' +   '  }\n' +


  // else no lighting

  '  else\n' +
  '  {\n' +
  '     v_Color = a_Color;\n' +
  '  }\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif\n' +

  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

var modelMatrix = new Matrix4(); // The model matrix
var viewMatrix = new Matrix4();  // The view matrix
var projMatrix = new Matrix4();  // The projection matrix
var g_normalMatrix = new Matrix4();  // Coordinate transformation matrix for normals

var ANGLE_STEP = 20.0;  // The increments of rotation angle (degrees)
var DOOR_ANGLE_STEP = 45.0;
var WHEEL_STEP = 15;
var g_xAngle = 0.0;    // The rotation x angle (degrees)
var g_yAngle = 0.0;
var carAngle = 0.0;
var carAngleRad = 0.0;

var TRANSLATION_STEP = 2.0; // translation movement
var doorAngle = 0.0;
var wheelAngle = 0.0;

var doorTranslation = 0;


var xMovement = 0.0;
var yMovement = 0.0;

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Set clear color and enable hidden surface removal
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Get the storage locations of uniform attributes
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  var u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  var u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  var u_LightDirection = gl.getUniformLocation(gl.program, 'u_LightDirection');

  //for the point lighting
  var u_PointLightingColor = gl.getUniformLocation(gl.program, 'u_PointLightingColor');
  var u_PointLightingLocation = gl.getUniformLocation(gl.program, 'u_PointLightingLocation');
  var u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');

  // Trigger using lighting or not
  var u_isLighting = gl.getUniformLocation(gl.program, 'u_isLighting');

  if (!u_ModelMatrix || !u_ViewMatrix || !u_NormalMatrix ||
      !u_ProjMatrix || !u_LightColor || !u_LightDirection ||
      !u_isLighting ) {
    console.log('Failed to Get the storage locations of u_ModelMatrix, u_ViewMatrix, and/or u_ProjMatrix');
    return;
  }

  // Data for directional lighting

  // Set the light color
  gl.uniform3f(u_LightColor, 0.1, 0.5, 0.5);
  // Set the light direction (in the world coordinate)
  var lightDirection = new Vector3([0.5, 3.0, 4.0]);
  lightDirection.normalize();     // Normalize
  gl.uniform3fv(u_LightDirection, lightDirection.elements);


  // Data for point lighting

  // Set the light color (white)
  gl.uniform3f(u_PointLightingColor, 1.0, 1.0, 1.0);
  // Set the light location (in the world coordinate)
  gl.uniform3f(u_PointLightingLocation, 0, 3.0, 10.0);
  // Set the ambient light
  gl.uniform3f(u_AmbientLight, 0.3, 0.3, 0.3);



  // Calculate the view matrix and the projection matrix
  viewMatrix.setLookAt(4, 60, 70, 0, -40, -50, 0, 1, 0);
  //Parameters: Eye Position, Look-at Position, Camera Orientation
  projMatrix.setPerspective(30, canvas.width/canvas.height, 1, 100);
  // Pass the model, view, and projection matrix to the uniform variable respectively
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);


  document.onkeydown = function(ev){
    keydown(ev, gl, u_ModelMatrix, u_NormalMatrix, u_isLighting);
  };

  draw(gl, u_ModelMatrix, u_NormalMatrix, u_isLighting);
}
function toRadians (angle) {
  return angle * (Math.PI / 180);
}

function keydown(ev, gl, u_ModelMatrix, u_NormalMatrix, u_isLighting) {
  switch (ev.keyCode) {
    case 40: // Up arrow key
      carAngleRad = toRadians(carAngle);
      xMovement = (xMovement - TRANSLATION_STEP*Math.cos(carAngleRad));
      yMovement = (yMovement + TRANSLATION_STEP*Math.sin(carAngleRad));
      if(xMovement>16)
      {
        xMovement = 16;
        wheelAngle = 0;
      }
      if(xMovement< -16)
      {
        xMovement = -16;
        wheelAngle = 0;
      }
      if(yMovement>11)
      {
        yMovement = 11;
        wheelAngle = 0;
      }
      if(yMovement< -11)
      {
        yMovement = -11;
        wheelAngle = 0;
      }
      else {
        wheelAngle = (wheelAngle + WHEEL_STEP);
      }
      break;

    case 38: // Down arrow key
      carAngleRad = toRadians(carAngle);
      xMovement = xMovement + TRANSLATION_STEP*Math.cos(carAngleRad);
      yMovement = yMovement - TRANSLATION_STEP*Math.sin(carAngleRad);
      if(xMovement>16)
      {
        xMovement = 16;
        wheelAngle = 0;
      }
      if(xMovement< -16)
      {
        xMovement = -16;
        wheelAngle = 0;
      }
      if(yMovement>11)
      {
        yMovement = 11;
        wheelAngle = 0;
      }
      if(yMovement< -11)
      {
        yMovement = -11;
        wheelAngle = 0;
      }
      else {
        wheelAngle = (wheelAngle - WHEEL_STEP);
      }
      break;
    case 39: // Right arrow key ->
      g_yAngle = (g_yAngle - ANGLE_STEP) % 360;
      carAngle = (carAngle - ANGLE_STEP) % 360;
      break;
    case 37: // Left arrow key ->
      g_yAngle = (g_yAngle + ANGLE_STEP) % 360;
      carAngle = (carAngle + ANGLE_STEP) % 360;
      break;

    case 90:    //z to open the door.
      if (doorAngle < 45.0)
        {
          (doorAngle += DOOR_ANGLE_STEP) % 360 ; // z button
          doorTranslation = (doorTranslation + 0.5);
        }
      break;
    case 88: //close door button x
      if (doorAngle > 0)
        {
          (doorAngle -= DOOR_ANGLE_STEP) % 360 ; // z button
          doorTranslation = (doorTranslation - 0.5);
        }
        break;
    default: return; // Skip drawing at no effective action
  }

  // Draw the scene
  draw(gl, u_ModelMatrix, u_NormalMatrix, u_isLighting);
}


function initVertexBuffers(gl, colour) {
  // Create a cube
  //    v6----- v5
  //   /|      /|
  //  v1------v0|
  //  | |     | |
  //  | |v7---|-|v4
  //  |/      |/
  //  v2------v3
  var vertices = new Float32Array([   // Vertex coordinates
     1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,  // v0-v1-v2-v3 front
     1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,  // v0-v3-v4-v5 right
     1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0,  // v0-v5-v6-v1 up
    -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,  // v1-v6-v7-v2 left
    -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,  // v7-v4-v3-v2 down
     1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0   // v4-v7-v6-v5 back
  ]);


 switch(colour)
 {
   case "RED":

   var colors = new Float32Array([    // Red Colour
     1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v1-v2-v3 front
     1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v3-v4-v5 right
     1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v0-v5-v6-v1 up
     1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v1-v6-v7-v2 left
     1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0,     // v7-v4-v3-v2 down
     1, 0, 0,   1, 0, 0,   1, 0, 0,  1, 0, 0　    // v4-v7-v6-v5 back
  ]);
  break;

  case "GREEN":
  var colors = new Float32Array([    // green Colour
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v1-v2-v3 front
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v3-v4-v5 right
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v5-v6-v1 up
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v1-v6-v7-v2 left
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v7-v4-v3-v2 down
    0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,　    // v4-v7-v6-v5 back
 ]);
 break;

 case "BLUE":
 var colors = new Float32Array([    // blue Colour
   0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1,     // v0-v1-v2-v3 front
   0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1,     // v0-v3-v4-v5 right
   0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1,     // v0-v5-v6-v1 up
   0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1,     // v1-v6-v7-v2 left
   0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1,     // v7-v4-v3-v2 down
   0, 0, 1,   0, 0, 1,   0, 0, 1,  0, 0, 1,　    // v4-v7-v6-v5 back
]);
break;

case "WHITE":
var colors = new Float32Array([    // white Colour
  1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1,     // v0-v1-v2-v3 front
  1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1,     // v0-v3-v4-v5 right
  1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1,     // v0-v5-v6-v1 up
  1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1,     // v1-v6-v7-v2 left
  1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1,     // v7-v4-v3-v2 down
  1, 1, 1,   1, 1, 1,   1, 1, 1,  1, 1, 1,　    // v4-v7-v6-v5 back
]);
break;

   default: var colors = new Float32Array([    // green Colour
     0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v1-v2-v3 front
     0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v3-v4-v5 right
     0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v0-v5-v6-v1 up
     0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v1-v6-v7-v2 left
     0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,     // v7-v4-v3-v2 down
     0, 1, 0,   0, 1, 0,   0, 1, 0,  0, 1, 0,　    // v4-v7-v6-v5 back
  ]);
  break;
 }


  var normals = new Float32Array([    // Normal
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
  ]);


  // Indices of the vertices
  var indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23     // back
 ]);


  // Write the vertex property to buffers (coordinates, colors and normals)
  if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Color', colors, 3, gl.FLOAT)) return -1;
  if (!initArrayBuffer(gl, 'a_Normal', normals, 3, gl.FLOAT)) return -1;



  // Write the indices to the buffer object
  var indexBuffer = gl.createBuffer();
  if (!indexBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  return indices.length;
}

function initArrayBuffer (gl, attribute, data, num, type) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return false;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  // Assign the buffer object to the attribute variable
  var a_attribute = gl.getAttribLocation(gl.program, attribute);
  if (a_attribute < 0) {
    console.log('Failed to get the storage location of ' + attribute);
    return false;
  }
  gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
  // Enable the assignment of the buffer object to the attribute variable
  gl.enableVertexAttribArray(a_attribute);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return true;
}

function initAxesVertexBuffers(gl) {

  var verticesColors = new Float32Array([
    // Vertex coordinates and color (for axes)
    -20.0,  0.0,   0.0,  1.0,  1.0,  1.0,  // (x,y,z), (r,g,b)
     20.0,  0.0,   0.0,  1.0,  1.0,  1.0,
     0.0,  20.0,   0.0,  1.0,  1.0,  1.0,
     0.0, -20.0,   0.0,  1.0,  1.0,  1.0,
     0.0,   0.0, -20.0,  1.0,  1.0,  1.0,
     0.0,   0.0,  20.0,  1.0,  1.0,  1.0
  ]);
  var n = 6;

  // Create a buffer object
  var vertexColorBuffer = gl.createBuffer();
  if (!vertexColorBuffer) {
    console.log('Failed to create the buffer object');
    return false;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);

  var FSIZE = verticesColors.BYTES_PER_ELEMENT;
  //Get the storage location of a_Position, assign and enable buffer
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(a_Position);  // Enable the assignment of the buffer object

  // Get the storage location of a_Position, assign buffer and enable
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_Color < 0) {
    console.log('Failed to get the storage location of a_Color');
    return -1;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
  gl.enableVertexAttribArray(a_Color);  // Enable the assignment of the buffer object

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return n;
}

var g_matrixStack = []; // Array for storing a matrix
function pushMatrix(m) { // Store the specified matrix to the array
  var m2 = new Matrix4(m);
  g_matrixStack.push(m2);
}

function popMatrix() { // Retrieve the matrix from the array
  return g_matrixStack.pop();
}

function draw(gl, u_ModelMatrix, u_NormalMatrix, u_isLighting) {

  // Clear color and depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniform1i(u_isLighting, false); // Will not apply lighting

  // Set the vertex coordinates and color (for the x, y axes)

  var n = initAxesVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Calculate the view matrix and the projection matrix
  modelMatrix.setTranslate(0, 0, 0);  // No Translation
  // Pass the model matrix to the uniform variable
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);



  gl.uniform1i(u_isLighting, true); // Will apply lighting

  // Set the vertex coordinates and color (for the cube)
  var n = initVertexBuffers(gl, "RED");
  if (n < 0) {
    console.log('Failed to set the vertex information');
    return;
  }


  // Model the ground
  initVertexBuffers(gl, "WHITE");
  pushMatrix(modelMatrix);
    modelMatrix.setTranslate(0, 0, 0);  // Translation
    modelMatrix.scale(20, 0.02, 20); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  carAngleRad = toRadians(carAngle);
  modelMatrix.translate(0,0,5)
  modelMatrix.translate(xMovement,0,yMovement)
  modelMatrix.rotate(g_yAngle, 0, 1, 0); // Rotate along y axis
  modelMatrix.rotate(g_xAngle, 1, 0, 0); // Rotate along x axis
//  console.log(xMovement);
//  console.log(yMovement);



  // Model the body extra
  initVertexBuffers(gl, "RED");
  pushMatrix(modelMatrix);
    modelMatrix.translate(2.5, 3, 0);  // Translation
    modelMatrix.scale(1.5, 1, 2); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the body main
  initVertexBuffers(gl, "RED");
  pushMatrix(modelMatrix);
    modelMatrix.scale(4.0, 1.0, 2); // Scale
    modelMatrix.translate(0, 1.0, 0); // Scale

    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the wheel 1
  initVertexBuffers(gl, "BLUE");
  pushMatrix(modelMatrix);
    modelMatrix.translate(2, 0.85, 2.00);  // Translation
    modelMatrix.scale(0.75, 0.75, 0.3); // Scale
    modelMatrix.rotate(wheelAngle,0.0,0.0,1.0);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the wheel 2
  initVertexBuffers(gl, "BLUE");
  pushMatrix(modelMatrix);
    modelMatrix.translate(2, 0.85, -2.00);  // Translation
    modelMatrix.scale(0.75, 0.75, 0.3); // Scale
    modelMatrix.rotate(wheelAngle,0.0,0.0,1.0);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the wheel 3
  initVertexBuffers(gl, "BLUE");
  pushMatrix(modelMatrix);
    modelMatrix.translate(-2.8, 0.85, 2.00);  // Translation
    modelMatrix.scale(0.75, 0.75, 0.3); // Scale
    modelMatrix.rotate(wheelAngle,0.0,0.0,1.0);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the wheel 4
  initVertexBuffers(gl, "BLUE");
  pushMatrix(modelMatrix);
    modelMatrix.translate(-2.8, 0.85, -2.00);  // Translation
    modelMatrix.scale(0.75, 0.75, 0.3); // Scale
    modelMatrix.rotate(wheelAngle,0.0,0.0,1.0);
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the door 1
  initVertexBuffers(gl, "GREEN");
  pushMatrix(modelMatrix);
    modelMatrix.translate(doorTranslation,0,0);  // Translation
    modelMatrix.translate(2.5, 3, 2.25);  // Translation
    modelMatrix.rotate(doorAngle,0.0,1.0,0.0);
    modelMatrix.scale(1, 0.75, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();

  // Model the door 2
  initVertexBuffers(gl, "GREEN");
  pushMatrix(modelMatrix);
    modelMatrix.translate(doorTranslation,0,0);  // Translation
    modelMatrix.translate(2.5, 3, -2.25);  // Translation
    modelMatrix.rotate(-doorAngle,0.0,1.0,0.0);
    modelMatrix.scale(1, 0.75, 0.1); // Scale
    drawbox(gl, u_ModelMatrix, u_NormalMatrix, n);
  modelMatrix = popMatrix();
}

function drawbox(gl, u_ModelMatrix, u_NormalMatrix, n) {
  pushMatrix(modelMatrix);

    // Pass the model matrix to the uniform variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

    // Calculate the normal transformation matrix and pass it to u_NormalMatrix
    g_normalMatrix.setInverseOf(modelMatrix);
    g_normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, g_normalMatrix.elements);

    // Draw the cube
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

  modelMatrix = popMatrix();
}
