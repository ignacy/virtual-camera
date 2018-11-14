"use strict";

const canvas = document.getElementById("kanvas");
const context = canvas.getContext("2d");
context.translate(canvas.width / 2, canvas.height / 2);
const defaultColor = "#3D9970";
const stepSize = 500;
const zoomStepSize = 50;

/**
 * Wypisuje informacje na temat stanu rzutowania i kamery
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
 * Opisuje wektory przesunięcia
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
 * Opisuje punkt w 3 wymiarach
 */
class Point3d {
  constructor(x, y, z) {
    this.x = Math.ceil(x);
    this.y = Math.ceil(y);
    this.z = Math.ceil(z);
  }

  get asVector() {
    return [this.x, this.y, this.z];
  }

  /**
   * Macierzowa reprezentacja (znormalizowana) punktu
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
  const macierzPrzesuniecia = Matrixes.translationMatrix(...translationVector);
  const multiplied = Matrixes.multiplication(
    macierzPrzesuniecia,
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
        context.beginPath();
        context.moveTo(surface[0].x, surface[0].y);
        context.fillText(
          `${surface[0].x}, ${surface[0].y}`,
          surface[0].x,
          surface[0].y
        );

        surface.slice(1).map(point => {
          context.fillText(`${point.x}, ${point.y}`, point.x, point.y);
          context.lineTo(point.x, point.y);
          console.log(point.x, point.y);
        });
        context.closePath();
        context.stroke();
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

  rotateZ(degreeRadians) {
    var result = Matrixes.multiplication(
      Matrixes.zRotation(degreeRadians),
      new Point3d(
        this.directionOfGaze()[0],
        this.directionOfGaze()[1],
        this.directionOfGaze()[2]
      ).asMatrix
    );
    //this.directionOfGaze = result.slice(0, 3);

    var result2 = Matrixes.multiplication(
      Matrixes.zRotation(degreeRadians),
      this.position.asMatrix
    );

    var result3 = Matrixes.multiplication(
      Matrixes.zRotation(degreeRadians),
      this.target.asMatrix
    );

    this.position = new Point3d(result2[0][0], result2[1][0], result2[2][0]);
    this.target = new Point3d(result3[0][0], result3[1][0], result3[2][0]);

    return this;
  }

  rotateX(degreeRadians) {
    var result = Matrixes.multiplication(
      Matrixes.xRotation(degreeRadians),
      new Point3d(
        this.directionOfGaze()[0],
        this.directionOfGaze()[1],
        this.directionOfGaze()[2]
      ).asMatrix
    );
    //this.directionOfGaze = result.slice(0, 3);

    var result2 = Matrixes.multiplication(
      Matrixes.xRotation(degreeRadians),
      this.position.asMatrix
    );

    var result3 = Matrixes.multiplication(
      Matrixes.xRotation(degreeRadians),
      this.target.asMatrix
    );

    this.position = new Point3d(result2[0][0], result2[1][0], result2[2][0]);
    this.target = new Point3d(result3[0][0], result3[1][0], result3[2][0]);

    return this;
  }

  rotateY(degreeRadians) {
    var result = Matrixes.multiplication(
      Matrixes.yRotation(degreeRadians),
      new Point3d(
        this.directionOfGaze()[0],
        this.directionOfGaze()[1],
        this.directionOfGaze()[2]
      ).asMatrix
    );
    //this.directionOfGaze = result.slice(0, 3);

    var result2 = Matrixes.multiplication(
      Matrixes.yRotation(degreeRadians),
      this.position.asMatrix
    );

    var result3 = Matrixes.multiplication(
      Matrixes.yRotation(degreeRadians),
      this.target.asMatrix
    );

    this.position = new Point3d(result2[0][0], result2[1][0], result2[2][0]);
    this.target = new Point3d(result3[0][0], result3[1][0], result3[2][0]);

    return this;
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

const cube1 = new Cube(new Point3d(1000, 0, 7000), 1500, "#FFDC00");
const cube2 = new Cube(new Point3d(0, -3000, 0), 2000, "#85144b");
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
