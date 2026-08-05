/**
 * configuracion.js
 * ---------------------------------------------------------
 * Parámetros del sistema: puerto serial, pines, coordenadas
 * y ángulos de servo. Centralizar esto facilita cambiar la
 * máquina o recalibrar sin tocar la lógica del controlador.
 * ---------------------------------------------------------
 */

module.exports = {
  puerto: process.env.CNC_PUERTO || 'COM3', // ej. '/dev/ttyUSB0' en Linux
  baudRate: Number(process.env.CNC_BAUDRATE) || 115200,

  pinSensor: 5,          // Pin digital del Arduino conectado al sensor
  estadoSensorActivo: 1, // Valor lógico que indica "pieza detectada"

  servoPinza: 0,          // Índice del servo (P0) usado como pinza
  anguloCerrado: 70,      // Ángulo del servo para cerrar la pinza
  anguloAbierto: 20,      // Ángulo del servo para abrir la pinza

  alturaSegura: 0,       // Altura Z de desplazamiento seguro
  alturaTrabajo: -10,       // Altura Z para tomar/soltar pieza

  posicionEspera: { x: 0, y: 0 },
  posicionRecoger: { x: -100, y: -50 },
  posicionDestino: { x: -200, y: -200 },

  pausaEntreCiclos: 500, // ms

  puertoWebSocket: Number(process.env.CNC_PUERTO_WS) || 8080, // servidor para el simulador
};
