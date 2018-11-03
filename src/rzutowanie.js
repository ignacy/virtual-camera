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
  }

  update(key, camera) {
    this.keyHud.innerHTML = key;
    this.zoomHud.innerHTML = camera.zoom;
    this.vpr.innerHTML = camera.position.asVector;
    this.target.innerHTML = camera.target.asVector;
  }
}

const hud = new Hud();

/**
 * Opisuje wektory przesunięcia
 */
const MOVEMENT = {
  closer: [stepSize, 0, 0],
  further: [-stepSize, 0, 0],
  left: [0, 0, -stepSize],
  right: [0, 0, stepSize],
  up: [0, stepSize, 0],
  down: [0, -stepSize, 0]
};

/**
 * Opisuje punkt w 3 wymiarach
 */
class Point3d {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
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

/**
 * Powierzchnia jest definiowana przez co najmniej 3 punkty
 */
class Vertex {
  constructor(points) {
    this.points = points;
  }

  draw() {
    context.beginPath();
    context.moveTo(this.points[0].x, this.points[0].y);
    this.points.slice(1).map(point => context.lineTo(point.x, point.y));
    context.closePath();
    context.stroke();
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
/**
 * Reprezentuje blok - obiekt ktory rzutujemy
 */
class Block {
  /**
   * Draws a block object as vertices between two points in 3d
   * @param {Point3d} p1 - first point
   * @param {Point3d} p2 - second point
   */
  constructor(p1, p2, color) {
    this.p1 = p1;
    this.p2 = p2;
    this.color = color;
  }

  get vertices() {
    return [
      new Vertex([
        this.p1,
        new Point3d(this.p1.x, this.p1.y, this.p2.z),
        new Point3d(this.p2.x, this.p1.y, this.p2.z),
        new Point3d(this.p2.x, this.p1.y, this.p1.z)
      ]),

      new Vertex([
        new Point3d(this.p1.x, this.p2.y, this.p1.z),
        new Point3d(this.p1.x, this.p2.y, this.p2.z),
        this.p2,
        new Point3d(this.p2.x, this.p2.y, this.p1.z)
      ]),

      new Vertex([
        this.p1,
        new Point3d(this.p2.x, this.p1.y, this.p1.z),
        new Point3d(this.p2.x, this.p2.y, this.p1.z),
        new Point3d(this.p1.x, this.p2.y, this.p1.z)
      ]),

      new Vertex([
        new Point3d(this.p1.x, this.p2.y, this.p1.z),
        new Point3d(this.p2.x, this.p2.y, this.p1.z),
        this.p2,
        new Point3d(this.p1.x, this.p2.y, this.p2.z)
      ]),

      new Vertex([
        this.p1,
        new Point3d(this.p1.x, this.p1.y, this.p2.z),
        new Point3d(this.p1.x, this.p2.y, this.p2.z),
        new Point3d(this.p1.x, this.p2.y, this.p1.z)
      ]),

      new Vertex([
        new Point3d(this.p2.x, this.p1.y, this.p1.z),
        new Point3d(this.p2.x, this.p1.y, this.p2.z),
        this.p2,
        new Point3d(this.p2.x, this.p2.y, this.p1.z)
      ])
    ];
  }

  get coordinatesMatrix() {
    return this.vertices.map(s => s.asMatrix);
  }
}

/**
 * Operacje na macierzach
 */
class Matrixes {
  /**
   * @param {number} tx - x coordinate.
   * @param {number} ty - y coordinate.
   * @param {number} tz - z coordinate.
   * @return {matrix} Macierz realizująca przesuniecie o wektor T
   */
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

  static identityMatrix() {
    //prettier-ignore
    return [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
  }

  static homogeneus(m) {
    var mflat = m.flat();
    var lst = mflat[mflat.length - 1];
    return mflat.map(x => x / lst);
  }

  /**
   * Transponuje macierz [zamienia wiersze na kolumny i kolumny na wiersze]
   * @param {matrix} matrix - macierz do transponowania
   */
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
    return matrixes.reduce(
      (previous, matrix) => this.multiplication(previous, matrix),
      this.identityMatrix()
    );
  }
}

/**
 * Przesuwa kamere zgodnie z wektorem przesunięcia
 * @param {Point3d} cameraPosition - obecna pozycja kamery
 * @param {Array} translationVector - wektor opisujący przesunięcie
 * @returns {vector} - polozenie kamery po transformacji
 */
const translate = (cameraPosition, translationVector) => {
  const macierzPrzesuniecia = Matrixes.translationMatrix(...translationVector);
  const multiplied = Matrixes.multiplication(
    macierzPrzesuniecia,
    cameraPosition
  );
  return multiplied;
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

      object.map(surface => {
        var counter = 0;
        context.beginPath();
        context.moveTo(surface[0].x, surface[0].y);

        surface.slice(1).map(point => {
          context.lineTo(point.x, point.y);
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

  /**
   * Oblicza produkt z kropką (2 wektory => 1 punkt)
   * @param {vector} xs - iksy
   * @param {vector} ys - igreki
   */
  static dotProduct(xs, ys) {
    return Vector.zipWith((x, y) => x * y, xs, ys).reduce(
      (suma, x) => suma + x,
      0
    );
  }

  /**
   * Tworzy z 2 wektorów 1 posługując się wynikiem funkcji f
   * @param {Function} f - funkcja
   * @param {vector} xs - iksy
   * @param {vector} ys - igreki
   */
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

  move(movement) {
    var translated = translate(this.position.asMatrix, movement);
    var translatedTarget = translate(this.target.asMatrix, movement);
    this.position = new Point3d(
      translated[0][0],
      translated[1][0],
      translated[2][0]
    );
    this.target = new Point3d(
      translatedTarget[0][0],
      translatedTarget[1][0],
      translatedTarget[2][0]
    );
    return this;
  }

  get directionOfGaze() {
    return [
      this.target.x - this.position.x,
      this.target.y - this.position.y,
      this.target.z - this.position.z
    ];
  }

  get handednessAxe() {
    return Vector.crosProduct([0, 1, 0], this.directionOfGaze);
  }

  get upVector() {
    return Vector.crosProduct(this.directionOfGaze, this.handednessAxe);
  }

  get perspective() {
    var d = this.zoom;
    if (d <= 0) {
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
    const n = this.directionOfGaze;

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
  position: new Point3d(-2500, -1500, 4000),
  target: new Point3d(-1000, -1500, 4000),
  zoom: 150
});

const block1 = new Block(
  new Point3d(500, 0, 0),
  new Point3d(1000, 1000, 1000),
  defaultColor
);
const block2 = new Block(
  new Point3d(0, 0, 2500),
  new Point3d(1000, 1000, 3500),
  "#85144b"
);

const cube1 = new Cube(new Point3d(1000, 0, 7000), 1500, "#FFDC00");

const cube2 = new Cube(new Point3d(0, -3000, 0), 2000, "red");
const scene = new Scene([block1, block2, cube1, cube2]);
scene.draw(scene.project(camera));

const moveCamera = (key, movement) => {
  camera = camera.move(movement);
  scene.draw(scene.project(camera));
};

const changeZoom = (key, zoomIncrement) => {
  camera = camera.changeZoom(zoomIncrement);
  scene.draw(scene.project(camera));
};

/**
 * Obsługuje wciśnięcie klawisza
 * @param {event.key} key - Wciśnięty klawisz
 */
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
  }

  hud.update(key, camera);
};

document.addEventListener("keydown", function(event) {
  event.preventDefault();
  handleAction(event.key);
});
