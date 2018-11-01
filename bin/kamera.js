"use strict";

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
context.fillStyle = "#FF00FF";
context.fillRect(0, 0, 150, 75);

const drawEdge = line => {
  console.log(line);
  var x1,
    y1,
    x2,
    y2 = line;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
};

const drawObject = object => {
  object.map(edge => drawEdge(edge));
};

const drawScene = objects => {
  objects.map(o => drawObject(o));
};

const kamera = (viewReferencePoint, targetPoint) => {
  return {
    viewReferencePoint: viewReferencePoint,
    zoom: 2.0
  };
};

const newMatrix = rows => {
  return rows;
};

const transpose = xs => xs[0].map((_, iCol) => xs.map(row => row[iCol]));
const product = (a, b) => a * b;
const dotProduct = (xs, ys) => {
  var ziped = zipWith(product, xs, ys);
  if (ziped === undefined) {
    return 0;
  } else {
    ziped.reduce((suma, x) => suma + x, 0)
  }
};

const zipWith = (f, xs, ys) =>
  xs.length === ys.length ? xs.map((x, i) => f(x, ys[i])) : undefined;

const sum = xs => xs.reduce((a, x) => a + x, 0);

const matrixMultiplication = (a, b) => {
  console.log("b", b);
  const bCols = transpose(b);
  return a.map(aRow => bCols.map(bCol => dotProduct(aRow, bCol)));
};

const matrixMultiplicateMany = matrices =>
  matrices.reduce((a, b) => matrixMultiplication(a, b));

const perspectiveProjection = camera => {
  console.log("Camera ", camera);
  const zoom = camera.zoom;
  const d = 1 / zoom;
  return newMatrix([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, d, 0]]);
};

const leftToRightHanded = () => {
  return newMatrix([[-1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]);
};

const alignAxes = camera => {
  const v = camera.hadnednessAxe;
  const u = camera.upVector;
  const n = camera.directionOfGaze;

  // newMatrix(

  // )
  return leftToRightHanded();
};

const translateCenter = camera => {
  var xyz = camera.viewReferencePoint;
  console.log("XYZ", xyz);
  return newMatrix([
    [1, 0, 0, xyz[0]],
    [0, 1, 0, xyz[1]],
    [0, 0, 1, xyz[2]],
    [0, 0, 0, 1]
  ]);
};

const combinationMatrix = camera => {
  console.log(
    "persp",
    perspectiveProjection(camera),
    "left to right",
    leftToRightHanded(camera),
    "axes",
    alignAxes(camera),
    "translated",
    translateCenter(camera)
  );

  return matrixMultiplicateMany([
    perspectiveProjection(camera),
    leftToRightHanded(camera),
    alignAxes(camera),
    translateCenter(camera)
  ]);
};

const matrixPoint = matrix => {
  console.log("Matrix", matrix);
  return transpose(matrix)
    .flat()
    .slice(0, 2);
};

const projectPoint = (camera, point) => {
  const pointMatrix = matrixPoint([point]);
  console.log(
    "pointMatrix",
    pointMatrix,
    "combinationMatrix",
    combinationMatrix(camera)
  );
  const multiplied = matrixMultiplication(
    pointMatrix,
    combinationMatrix(camera)
  );
  return matrixPoint(multiplied);
};

const projectLine = (camera, line) =>
  line.map(point => projectPoint(camera, point));

const projectObject = (camera, object) =>
  object.map(line => projectLine(camera, line));

const camera = kamera([2, 2, 2], [5, 5, 5]);

const object = [
  [[-1000, -1000, 1000], [-1000, -1000, -1000]],
  [[-1000, -1000, 1000], [-1000, -1000, 1000]],
  [[-1000, -1000, 1000], [1000, -1000, -1000]],
  [[-1000, -1000, -1000], [1000, -1000, -1000]],
  [[-1000, -1000, 1000], [-1000, 1000, 1000]],
  [[-1000, 1000, 1000], [1000, 1000, -1000]],
  [[1000, 1000, 1000], [1000, 1000, -1000]],
  [[-1000, 1000, 1000], [-1000, 1000, -1000]],
  [[-1000, 1000, 1000], [-1000, 1000, -1000]]
];

const clearCanvas = () => {
  context.clearRect(0, 0, 800, 600);
};

const redrawFullScene = () => {
  drawObject(projectObject(camera, object));
};

redrawFullScene();
