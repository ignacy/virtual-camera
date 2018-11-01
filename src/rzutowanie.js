"use strict";

const canvas = document.getElementById("kanvas");
const context = canvas.getContext("2d");
const defaultColor = "#3D9970";
const stepSize = 500;

/**
 * Opisuje wektory przesunięcia
 */
const MOVEMENT = {
  up: [0, stepSize, 0],
  down: [0, -stepSize, 0],
  left: [0, 0, -stepSize],
  right: [stepSize, 0, 0]
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
    context.fillStyle = defaultColor;
    context.fill();
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
  constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
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
const darwHandledKey = text => {
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

  draw(camera) {
    this.objects.map((object) => object.surfaces.map((surface) => surface.draw()));
  }
}

class Camera {
  constructor(position, target, zoom) {
    this.position = position;
    this.target = target;
    this.zoom = zoom;
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
    // TODO dodac alignAxes()
    return Matrixes.multipleMultiplication(
      this.perspective,
      Matrixes.leftToRightHanded(),
      this.translateCenter
    )
  }
}

const projectScene = (camera, scene) => {
  scene.objects.map((object) => {
    object.surfaces.map((surface) => {
      surface.points.map((point) => {
        var pointMatrix = point.asMatrix;
        var combined = camera.combinationMatrix;
        var multiplied = Matrixes.multiplication(combined, pointMatrix);

        new Point3d(
          multiplied[0][0],
          multiplied[1][0],
          0
        )
      });
    });
  });
}

const MAIN = 'starthere';

var cameraPosition = new Point3d(-100, 0, 0);

var camera = new Camera(cameraPosition, {}, 1);
const block = new Block(new Point3d(0, 0, 500), new Point3d(500, 100, 800));
const scene = new Scene(block);

scene.draw(projectScene(camera, scene));

/**
 * Obsługuje wciśnięcie klawisza
 * @param {event.key} key - Wciśnięty klawisz 
 */
const handleAction = key => {
  darwHandledKey(key);
  switch (key) {
    case "w":
      console.log("Before", cameraPosition);
      var translated = translate(cameraPosition.asMatrix, MOVEMENT.up);
      cameraPosition = new Point3d(translated[0][0], translated[1][0], translated[2][0]);
      console.log("After:");
      console.table(cameraPosition);
      camera = new Camera(cameraPosition, {}, 1);
      scene.draw(projectScene(camera, scene));

      break;
    case "s":
      console.log("Before", cameraPosition);
      var translated = translate(cameraPosition.asMatrix, MOVEMENT.down);
      cameraPosition = new Point3d(translated[0][0], translated[1][0], translated[2][0]);
      console.log("After:");
      console.table(cameraPosition);
      camera = new Camera(cameraPosition, {}, 1);
      scene.draw(projectScene(camera, scene));
      break;

    case "a":
      console.log("Before", cameraPosition);
      var translated = translate(cameraPosition.asMatrix, MOVEMENT.left);
      cameraPosition = new Point3d(translated[0][0], translated[1][0], translated[2][0]);
      console.log("After:");
      console.table(cameraPosition);
      camera = new Camera(cameraPosition, {}, 1);
      scene.draw(projectScene(camera, scene));
      break;

    case "d":
      console.log("Before", cameraPosition);
      var translated = translate(cameraPosition.asMatrix, MOVEMENT.right);
      cameraPosition = new Point3d(translated[0][0], translated[1][0], translated[2][0]);
      console.log("After:");
      console.table(cameraPosition);
      camera = new Camera(cameraPosition, {}, 1);
      scene.draw(projectScene(camera, scene));
      break;
  }
};

document.addEventListener("keydown", function (event) {
  console.log("EVENT", event);
  event.preventDefault();
  handleAction(event.key);
});
