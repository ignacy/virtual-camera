"use strict";

const canvas = document.getElementById("kanvas");
const context = canvas.getContext("2d");
const defaultColor = "#111111";
const stepSize = 500;

const MOVEMENT = {
  up: [0, stepSize, 0]
}

const viewPoint = {
  x: -1000,
  y: 0,
  z: 0,
  current: () => [x, y, z],
  currentAsMatrix: () => [[x], [y], [z]]
}

// Macierz realizujaca przesuniecie o wektor T
const translationMatrix = (tx, ty, tz) => {
  // prettier-ignore
  return [
    [1, 0, 0, tx],
    [0, 1, 0, ty],
    [0, 0, 1, tz],
    [0, 0, 0, 1]
  ];
};

// Realizuje przesuniecie 
const translate = (cameraPosition, translationVector) => {
  const macierzPrzesuniecia = translationMatrix(translationVector);
  
  return matrixToPoint(
    matrixMultiplication(
      macierzPrzesuniecia,    
      cameraPosition
    )
  )
};


// Rysuje obslugiwany klawisz w narozniku
const darwHandledKey = text => {
  context.clearRect(750, 750, 50, 50);
  context.fillStyle = "#DDDDDD";
  context.fillRect(750, 750, 50, 50);

  context.fillStyle = "#0074D9";
  context.font = "30px Arial";
  context.fillText(text, 765, 785);
  context.fillStyle = "#111111";
};

const handleAction = key => {
  darwHandledKey(key);
  switch (key) {
    case "w":
      translate(viewPoint.currentAsMatrix, MOVEMENT.up);
      break;
  }
};

document.addEventListener("keydown", function(event) {
  console.log("EVENT", event);
  event.preventDefault();
  handleAction(event.key);
});
