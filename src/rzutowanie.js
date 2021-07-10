"use strict";

const canvas = document.getElementById("kanvas");
const context = canvas.getContext("2d");
const defaultColor = "#3D9970";
const stepSize = 500;
const zoomStepSize = 50;

/**
 * Hud - heads up display
 */
class Hud {
  constructor() {
    this.zoomHud = document.getElementById("zoom");
    this.keyHud = document.getElementById("key");
    this.vpr = document.getElementById("position");
    this.target = document.getElementById("target");
    this.direction = document.getElementById("direction");
  }

  update(key, camera) {
    this.keyHud.innerHTML = key;
    this.zoomHud.innerHTML = camera.zoom;
    this.vpr.innerHTML = camera.position.asVector;
    this.target.innerHTML = camera.target.asVector;
    this.direction.innerHTML = camera.directionOfGaze();
  }
}

const hud = new Hud();

/**
 * Movement vectors
 */
const MOVEMENT = {
  closer: [0, 0, -stepSize],
  further: [0, 0, stepSize],
  left: [stepSize, 0, 0],
  right: [-stepSize, 0, 0],
  up: [0, stepSize, 0],
  down: [0, -stepSize, 0]
};

/**
 * Point in 3D
 */
class Point3d {
  constructor(x, y, z) {
    this.x = Math.ceil(x);
    this.y = Math.ceil(y);
    this.z = Math.ceil(z);
  }

  inCanvas() {
    return this.x <= 600 && this.x >= 0 && this.y >= 0 && this.y <= 600;
  }

  get asVector() {
    return [this.x, this.y, this.z];
  }

  /**
   * Normalized matrix representation
   */
  get asMatrix() {
    return [[this.x], [this.y], [this.z], [1]];
  }
}

class Vertex {
  constructor(points) {
    this.points = points;
  }

  get asMatrix() {
    return this.points.map(p => p.asVector);
  }
}

class Cube {
  constructor(p, length, color) {
    this.p = p;
    this.length = length;
    this.color = color;
  }

  get vertices() {
    var length = this.length;
    return [
      new Vertex([
        this.p,
        new Point3d(this.p.x + length, this.p.y, this.p.z),
        new Point3d(this.p.x + length, this.p.y + length, this.p.z),
        new Point3d(this.p.x, this.p.y + length, this.p.z)
      ]),
      new Vertex([
        this.p,
        new Point3d(this.p.x + length, this.p.y, this.p.z),
        new Point3d(this.p.x + length, this.p.y, this.p.z + length),
        new Point3d(this.p.x, this.p.y, this.p.z + length)
      ]),
      new Vertex([
        this.p,
        new Point3d(this.p.x, this.p.y, this.p.z + length),
        new Point3d(this.p.x, this.p.y + length, this.p.z + length),
        new Point3d(this.p.x, this.p.y + length, this.p.z)
      ]),
      new Vertex([
        new Point3d(this.p.x, this.p.y + length, this.p.z),
        new Point3d(this.p.x, this.p.y + length, this.p.z + length),
        new Point3d(this.p.x + length, this.p.y + length, this.p.z + length),
        new Point3d(this.p.x + length, this.p.y + length, this.p.z)
      ]),
      new Vertex([
        new Point3d(this.p.x, this.p.y + length, this.p.z + length),
        new Point3d(this.p.x, this.p.y, this.p.z + length),
        new Point3d(this.p.x + length, this.p.y, this.p.z + length),
        new Point3d(this.p.x + length, this.p.y + length, this.p.z + length)
      ]),
      new Vertex([
        new Point3d(this.p.x + length, this.p.y + length, this.p.z + length),
        new Point3d(this.p.x + length, this.p.y, this.p.z + length),
        new Point3d(this.p.x + length, this.p.y, this.p.z),
        new Point3d(this.p.x + length, this.p.y + length, this.p.z)
      ])
    ];
  }

  get coordinatesMatrix() {
    return this.vertices.map(s => s.asMatrix);
  }
}

class Matrixes {
  static translationMatrix(tx, ty, tz) {
    // prettier-ignore
    return [
      [1, 0, 0, tx],
      [0, 1, 0, ty],
      [0, 0, 1, tz],
      [0, 0, 0, 1]
    ];
  }

  static leftToRightHanded() {
    //prettier-ignore
    return [
      [-1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
  }

  static zRotation(kat) {
    //prettier-ignore
    return [
      [Math.cos(kat), -Math.sin(kat), 0, 0],
      [Math.sin(kat), Math.cos(kat), 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
  }

  static xRotation(kat) {
    //prettier-ignore
    return [
      [1, 0, 0, 0],
      [0, Math.cos(kat), -Math.sin(kat), 0],
      [0, Math.sin(kat), Math.cos(kat), 0],
      [0, 0, 0, 1]
    ];
  }

  static yRotation(kat) {
    //prettier-ignore
    return [
      [Math.cos(kat), 0, Math.sin(kat), 0],
      [0, 1, 0, 0],
      [-Math.sin(kat), 0, Math.cos(kat), 0],
      [0, 0, 0, 1]
    ];
  }

  static homogeneus(m) {
    var mflat = m.flat();
    var lst = mflat[mflat.length - 1];
    if (lst == 0) {
      lst = 1;
    }
    return mflat.map(x => x / lst);
  }

  static transpose(matrix) {
    return matrix[0].map((_, iCol) => matrix.map(row => row[iCol]));
  }

  static multiplication(matrixA, matrixB) {
    const columnsOfMatrixB = Matrixes.transpose(matrixB);
    return matrixA.map(rowOfMatrixA =>
      columnsOfMatrixB.map(bColumn => Vector.dotProduct(rowOfMatrixA, bColumn))
    );
  }

  static multipleMultiplication(matrixes) {
    return matrixes
      .slice(1)
      .reduce(
        (previous, matrix) => this.multiplication(previous, matrix),
        matrixes[0]
      );
  }
}

const translate = (cameraPosition, translationVector) => {
  const translationMatrix = Matrixes.translationMatrix(...translationVector);
  const multiplied = Matrixes.multiplication(
    translationMatrix,
    cameraPosition
  );
  return multiplied.map(array => Math.ceil(array[0]));
};

class Scene {
  constructor(objects) {
    this.objects = objects;
  }

  draw(projection) {
    context.strokeStyle = defaultColor;
    context.clearRect(-999, -999, 99999, 99999);

    projection.map(objectAndColor => {
      const object = objectAndColor[0];
      context.strokeStyle = objectAndColor[1];
      context.font = "14px Georgia";

      object.map(surface => {
        if (surface[0].inCanvas() && surface[surface.length - 1].inCanvas()) {
          context.beginPath();
          context.moveTo(surface[0].x, surface[0].y);

          context.fillText(
            `${surface[0].x}, ${surface[0].y}`,
            surface[0].x,
            surface[0].y
          );

          surface.slice(1).map(point => {
            var x = point.x;
            var y = point.y;

            context.fillText(`${x}, ${y}`, x, y);
            context.lineTo(x, y);
            console.log(x, y);
          });
          context.closePath();
          context.stroke();
        }
      });
    });
  }

  project(camera) {
    var forScene = this.objects.map(object => {
      var forObject = object.vertices.map(surface => {
        var forVertex = surface.points.map(point => {
          var pointMatrix = point.asMatrix;
          var combined = camera.combinationMatrix;
          var multiplied = Matrixes.multiplication(combined, pointMatrix);
          var homo = Matrixes.homogeneus(multiplied);
          return new Point3d(homo[0], homo[1], 0);
        });
        return forVertex;
      });
      return [forObject, object.color];
    });
    return forScene;
  }
}

class Vector {
  static crosProduct(u, v) {
    return [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]
    ];
  }

  static dotProduct(xs, ys) {
    return Vector.zipWith((x, y) => x * y, xs, ys).reduce(
      (suma, x) => suma + x,
      0
    );
  }

  static zipWith(f, xs, ys) {
    return xs.length === ys.length ? xs.map((x, i) => f(x, ys[i])) : [0];
  }

  static length(v) {
    return Math.sqrt(v.map(w => w * w).reduce((sum, w) => sum + w, 0));
  }
}

class Camera {
  constructor({ position, target, zoom }) {
    this.position = position;
    this.target = target;
    this.zoom = zoom;
  }

  changeZoom(increment) {
    this.zoom = this.zoom + increment;
    return this;
  }

  directionOfGaze() {
    return [
      this.target.x - this.position.x,
      this.target.y - this.position.y,
      this.target.z - this.position.z
    ];
  }

  rotate(rotationMatrix) {
    const [[x], [y], [z]] = Matrixes.multiplication(
      rotationMatrix,
      new Point3d(
        this.directionOfGaze()[0],
        this.directionOfGaze()[1],
        this.directionOfGaze()[2]
      ).asMatrix
    );

    this.target = new Point3d(x + this.position.x, y + this.position.y, z + this.position.y);
    console.log(this.position)
    console.log(this.target)
    return this;
  }

  rotateZ(degreeRadians) {
    return this.rotate(Matrixes.zRotation(degreeRadians));
  }

  rotateX(degreeRadians) {
    return this.rotate(Matrixes.xRotation(degreeRadians));
  }

  rotateY(degreeRadians) {
    return this.rotate(Matrixes.yRotation(degreeRadians));
  }

  move(movement) {
    var translated = translate(this.position.asMatrix, movement);
    var translatedTarget = translate(this.target.asMatrix, movement);

    this.position = new Point3d(translated[0], translated[1], translated[2]);
    this.target = new Point3d(
      translatedTarget[0],
      translatedTarget[1],
      translatedTarget[2]
    );

    return this;
  }

  get handednessAxe() {
    return Vector.crosProduct([0, 1, 0], this.directionOfGaze());
  }

  get upVector() {
    return Vector.crosProduct(this.directionOfGaze(), this.handednessAxe);
  }

  get perspective() {
    var d = this.zoom;
    if (d == 0) {
      d = zoomStepSize;
    }
    //prettier-ignore
    return [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 1/d, 0]
    ];
  }

  get alignAxes() {
    const v = this.handednessAxe;
    const u = this.upVector;
    const n = this.directionOfGaze();

    const vLength = Vector.length(v);
    const uLength = Vector.length(u);
    const nLength = Vector.length(n);

    //prettier-ignore
    return [
      [v[0]/vLength, v[1] / vLength, v[2]/vLength, 0],
      [u[0]/uLength, u[1] / uLength, u[2]/uLength, 0],
      [n[0]/nLength, n[1] / nLength, n[2]/nLength, 0],
      [0, 0, 0, 1]
    ];
  }

  get translateCenter() {
    //prettier-ignore
    return [
      [1, 0, 0, (-this.position.x) ],
      [0, 1, 0, (-this.position.y) ],
      [0, 0, 1, (-this.position.z) ],
      [0, 0, 0, 1]
    ];
  }

  get combinationMatrix() {
    return Matrixes.multipleMultiplication([
      this.perspective,
      Matrixes.leftToRightHanded(),
      this.alignAxes,
      this.translateCenter
    ]);
  }
}

var camera = new Camera({
  position: new Point3d(0, 0, -2000),
  target: new Point3d(0, 0, 0),
  zoom: 0
});

const cube1 = new Cube(new Point3d(-3000, 3000, -500), 1500, "#FFDC00");
const cube2 = new Cube(new Point3d(-7000, 3000, -1000), 500, "#85144b");
const scene = new Scene([cube1, cube2]);

scene.draw(scene.project(camera));

const renderAndDraw = (transformation, scene) => {
  transformation();
  var projection = scene.project(camera);
  scene.draw(projection);
};

const moveCamera = (key, movement) => {
  renderAndDraw(() => {
    camera = camera.move(movement);
  }, scene);
};

const changeZoom = (key, zoomIncrement) => {
  renderAndDraw(() => {
    camera = camera.changeZoom(zoomIncrement);
  }, scene);
};

const rotateCameraZ = (key, degreeRadians) => {
  renderAndDraw(() => {
    camera = camera.rotateZ(degreeRadians);
  }, scene);
};

const rotateCameraX = (key, degreeRadians) => {
  renderAndDraw(() => {
    camera = camera.rotateX(degreeRadians);
  }, scene);
};

const rotateCameraY = (key, degreeRadians) => {
  renderAndDraw(() => {
    camera = camera.rotateY(degreeRadians);
  }, scene);
};

const degreesToRadians = degrees => degrees * (Math.PI / 180);

const handleAction = key => {
  switch (key) {
    case "w":
      moveCamera("w", MOVEMENT.closer);
      break;
    case "s":
      moveCamera("s", MOVEMENT.further);
      break;
    case "ArrowDown":
      moveCamera("\\/", MOVEMENT.up);
      break;
    case "ArrowUp":
      moveCamera("^", MOVEMENT.down);
      break;
    case "ArrowLeft":
      moveCamera("->", MOVEMENT.left);
      break;
    case "ArrowRight":
      moveCamera("<-", MOVEMENT.right);
      break;
    case "q":
      changeZoom("q", zoomStepSize);
      break;
    case "e":
      changeZoom("e", -zoomStepSize);
      break;
    case "z":
      rotateCameraZ("z", degreesToRadians(30));
      break;
    case "x":
      rotateCameraZ("x", degreesToRadians(-30));
      break;
    case "c":
      rotateCameraX("c", degreesToRadians(30));
      break;
    case "v":
      rotateCameraX("v", degreesToRadians(-30));
      break;
    case "b":
      rotateCameraY("b", degreesToRadians(30));
      break;
    case "n":
      rotateCameraY("n", degreesToRadians(-30));
      break;
  }

  hud.update(key, camera);
};

document.addEventListener("keydown", function(event) {
  event.preventDefault();
  handleAction(event.key);
});
