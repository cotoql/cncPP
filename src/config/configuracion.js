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

  alturaSegura: 80,       // Altura Z de desplazamiento seguro
  alturaTrabajo: 0,       // Altura Z para tomar/soltar pieza

  posicionEspera: { x: 225, y: 340 },
  posicionRecoger: { x: 0, y: 240 },
  posicionDestino: { x: 225, y: 0 },

  pausaEntreCiclos: 2000, // ms

  puertoWebSocket: Number(process.env.CNC_PUERTO_WS) || 8080, // servidor para el simulador

  pasosMovimientoServo: 12,   // en cuántos incrementos se divide el barrido angular
  tiempoEntrePasosServoMs: 25, // pausa entre cada incremento — más alto = más lento/suave
};
