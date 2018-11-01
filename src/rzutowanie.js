"use strict";

const canvas = document.getElementById("kanvas");
const context = canvas.getContext("2d");
const defaultColor = "#3D9970";
const stepSize = 500;

/**
 * Opisuje wektory przesunięcia
 */
const MOVEMENT = {
  closer: [stepSize, 0, 0],
  further: [-stepSize, 0, 0],  
  left: [0, 0, -stepSize],
  right: [0, 0, stepSize]
}

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
class Surface {
  constructor(...points) {
    this.points = points;
  }

  draw() {
    context.beginPath();
    context.moveTo(this.points[0].x, this.points[0].y);
    this.points.slice(1).map((point) => context.lineTo(point.x, point.y));
    context.closePath();
    context.stroke();
  }

  get asMatrix() {
    return this.points.map(p => p.asVector);
  }
}

/**
 * Reprezentuje blok - obiekt ktory rzutujemy
 */
class Block {
  /**
   * Draws a block object as surfaces between two points in 3d
   * @param {Point3d} p1 - first point 
   * @param {Point3d} p2 - second point
   */
  constructor(p1, p2, color) {
    this.p1 = p1;
    this.p2 = p2;
    this.color = color;
  }

  get surfaces() {
    return [
      new Surface(
        this.p1,
        new Point3d(
          this.p1.x,
          this.p1.y,
          this.p2.z
        ),
        new Point3d(
          this.p2.x,
          this.p1.y,
          this.p2.z
        ),
        new Point3d(
          this.p2.x,
          this.p1.y,
          this.p1.z
        )
      ),

      new Surface(
        new Point3d(
          this.p1.x,
          this.p2.y,
          this.p1.z
        ),
        new Point3d(
          this.p1.x,
          this.p2.y,
          this.p2.z
        ),
        this.p2,
        new Point3d(
          this.p2.x,
          this.p2.y,
          this.p1.z
        )
      ),

      new Surface(
        this.p1,
        new Point3d(
          this.p2.x,
          this.p1.y,
          this.p1.z
        ),
        new Point3d(
          this.p2.x,
          this.p2.y,
          this.p1.z
        ),
        new Point3d(
          this.p1.x,
          this.p2.y,
          this.p1.z
        )
      ),

      new Surface(
        new Point3d(
          this.p1.x,
          this.p2.y,
          this.p1.z
        ),
        new Point3d(
          this.p2.x,
          this.p2.y,
          this.p1.z
        ),
        this.p2,
        new Point3d(
          this.p1.x,
          this.p2.y,
          this.p2.z
        )
      ),

      new Surface(
        this.p1,
        new Point3d(
          this.p1.x,
          this.p1.y,
          this.p2.z
        ),
        new Point3d(
          this.p1.x,
          this.p2.y,
          this.p2.z
        ),
        new Point3d(
          this.p1.x,
          this.p2.y,
          this.p1.z
        )
      ),

      new Surface(
        new Point3d(
          this.p2.x,
          this.p1.y,
          this.p1.z
        ),
        new Point3d(
          this.p2.x,
          this.p1.y,
          this.p2.z
        ),
        this.p2,
        new Point3d(
          this.p2.x,
          this.p2.y,
          this.p1.z
        )
      )
    ]
  }

  get coordinatesMatrix() {
    return this.surfaces.map(s => s.asMatrix);
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
  };

  static leftToRightHanded() {
    //prettier-ignore
    return [
      [-1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ]
  };


  static identityMatrix() {
    //prettier-ignore
    return [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ]
  };

  static homogeneus(m) {
    var mflat = m.flat();
    var lst = mflat[mflat.length-1];
    return mflat.map(x => x/lst);
  }

  /**
   * Transponuje macierz [zamienia wiersze na kolumny i kolumny na wiersze]
   * @param {matrix} matrix - macierz do transponowania
   */
  static transpose(matrix) {
    return matrix[0].map((_, iCol) => matrix.map(row => row[iCol]));
  };

  static multiplication(matrixA, matrixB) {
    const columnsOfMatrixB = Matrixes.transpose(matrixB);
    return matrixA.map(rowOfMatrixA => columnsOfMatrixB.map(bColumn => dotProduct(rowOfMatrixA, bColumn)));
  };

  static multipleMultiplication(...matrixes) {
    return matrixes.reduce((previous, matrix) => this.multiplication(previous, matrix), this.identityMatrix());
  }
}

/**
 * Tworzy z 2 wektorów 1 posługując się wynikiem funkcji f
 * @param {Function} f - funkcja
 * @param {vector} xs - iksy
 * @param {vector} ys - igreki
 */
const zipWith = (f, xs, ys) =>
  xs.length === ys.length ? xs.map((x, i) => f(x, ys[i])) : [0];

/**
 * Oblicza produkt z kropką (2 wektory => 1 punkt)
 * @param {vector} xs - iksy 
 * @param {vector} ys - igreki
 */
const dotProduct = (xs, ys) => {
  return zipWith((x, y) => x * y, xs, ys).reduce((suma, x) => suma + x, 0);
};

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

/**
 * Rysuje w narozniku obecnie obsługiwany znak wprowadzony z klawiatury
 * @param {String} text - znak na wciśniętym klawiszu
 */
const drawHandledKey = text => {
  context.clearRect(750, 750, 50, 50);
  context.fillStyle = "#DDDDDD";
  context.fillRect(750, 750, 50, 50);

  context.fillStyle = "#0074D9";
  context.font = "30px Arial";
  context.fillText(text, 765, 785);
  context.fillStyle = "#111111";
};


class Scene {
  constructor(...objects) {
    this.objects = objects;
  }

  draw(projection) {
    context.strokeStyle = defaultColor;
    context.clearRect(-999, -999, 99999, 99999);


    projection.map((object) => {
      object.map((surface) => {
        context.beginPath();
        context.moveTo(surface[0].x, surface[0].y);
        surface.slice(1).map((point) => {
          context.lineTo(point.x, point.y);
        });
        context.closePath();
        context.stroke(); 
      });
    }
    );
  }
}


const crosProduct = (u, v) => {
  return [
    (u[1]*v[2]) - (u[2]*v[1]),
    (u[2]*v[0]) - (u[0]*v[2]),
    (u[0]*v[1]) - (u[1]*v[0])
  ]
};

const vectorLength = v => {
    return Math.sqrt(v.map(w => w*w).reduce((sum, w) => sum + w, 0));
}

class Camera {
  constructor(position, target, zoom) {
    this.position = position;
    this.target = target;
    this.zoom = zoom;
  }

  get directionOfGaze() {
    return [
      this.target.x - this.position.x,
      this.target.y - this.position.y,
      this.target.z - this.position.z
    ]
  }

  get handednessAxe() {
    return crosProduct([0, 1, 0], this.directionOfGaze);
  }

  get upVector() {
    return crosProduct(this.directionOfGaze, this.handednessAxe);
  }

  get perspective() {
    //prettier-ignore
    return [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 1/this.zoom, 0]
    ]
  }

  get alignAxes() {
    const v = this.handednessAxe;
    const u = this.upVector;
    const n = this.directionOfGaze;
    
    const vLength = vectorLength(v);
    const uLength = vectorLength(u);
    const nLength = vectorLength(n);


    //prettier-ignore
    return [
      [v[0]/vLength, v[1] / vLength, v[2]/vLength, 0],
      [u[0]/uLength, u[1] / uLength, u[2]/uLength, 0],
      [n[0]/nLength, n[1] / nLength, n[2]/nLength, 0],
      [0, 0, 0, 1]
    ]
  }

  get translateCenter() {
    //prettier-ignore
    return [
      [1, 0, 0, (-this.position.x) ],
      [0, 1, 0, (-this.position.y) ],
      [0, 0, 1, (-this.position.z) ],
      [0, 0, 0, 1]
    ]

  }

  get combinationMatrix() {
    return Matrixes.multipleMultiplication(
      this.perspective,
      Matrixes.leftToRightHanded(),
      this.alignAxes,
      this.translateCenter
    )
  }
}

const projectScene = (camera, scene) => {
   var forScene = scene.objects.map((object) => {
    var forObject = object.surfaces.map((surface) => {
      var forSurface = surface.points.map((point) => {
        var pointMatrix = point.asMatrix;
        var combined = camera.combinationMatrix;
        var multiplied = Matrixes.multiplication(combined, pointMatrix);
        var homo = Matrixes.homogeneus(multiplied);
        return new Point3d(homo[0], homo[1], 0);
      });
      return forSurface;
    });
    return forObject;
  });
  return forScene;
}

const MAIN = 'starthere';

var cameraPosition = new Point3d(-1000, 0, 0);
var targetPoint = new Point3d(500, 0, 0);

var camera = new Camera(cameraPosition, targetPoint, 50);
const block1 = new Block(new Point3d(500, 0, 0), new Point3d(1000, 1000, 1000), defaultColor);
const block2 = new Block(new Point3d(0, 0, 2500), new Point3d(1000, 1000, 3500), "#85144b");
const scene = new Scene(block1, block2);

scene.draw(projectScene(camera, scene));

const transform = (key, movement) => {
  var translated = translate(cameraPosition.asMatrix, movement);
  var translatedTarget = translate(targetPoint.asMatrix, movement);
  cameraPosition = new Point3d(translated[0][0], translated[1][0], translated[2][0]);
  targetPoint = new Point3d(translatedTarget[0][0], translatedTarget[1][0], translatedTarget[2][0]);
  camera = new Camera(cameraPosition, targetPoint, 100);
  scene.draw(projectScene(camera, scene));
  drwaHandledKey(key);
}

/**
 * Obsługuje wciśnięcie klawisza
 * @param {event.key} key - Wciśnięty klawisz 
 */
const handleAction = key => {

  switch (key) {
    case "w":
      transform(key, MOVEMENT.closer);
      break;
    case "s":
      transform(key, MOVEMENT.further);
      break;
    case "a":
      transform(key, MOVEMENT.left);
      break;
    case "d":
      transform(key, MOVEMENT.right);
      break;
  }
};

document.addEventListener("keydown", function (event) {
  console.log("EVENT", event);
  event.preventDefault();
  handleAction(event.key);
});
