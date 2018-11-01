"use strict";

const canvas = document.getElementById("kanvas");
const context = canvas.getContext("2d");
const defaultColor = "#111111";
const stepSize = 500;

/**
 * Opisuje wektory przesunięcia
 */
const MOVEMENT = {
  up: [0, stepSize, 0]
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

  get currentAsVector() {
    return [this.x, this.y, this.z];
  }

  /**
   * Macierzowa reprezentacja (znormalizowana) punktu
   */
  get currentAsMatrix() {
    return [[this.x], [this.y], [this.z], [1]];
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

var cameraPosition = new Point3d(-100, 0, 0);

/**
 * Obsługuje wciśnięcie klawisza
 * @param {event.key} key - Wciśnięty klawisz 
 */
const handleAction = key => {
  darwHandledKey(key);
  switch (key) {
    case "w":
      console.log("Before", cameraPosition);
      var translated = translate(cameraPosition.currentAsMatrix, MOVEMENT.up);
      cameraPosition = new Point3d(translated[0][0], translated[1][0], translated[2][0]);
      console.log("After:");
      console.table(cameraPosition);
      break;
  }
};

document.addEventListener("keydown", function (event) {
  console.log("EVENT", event);
  event.preventDefault();
  handleAction(event.key);
});
