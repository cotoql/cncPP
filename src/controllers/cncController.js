/**
 * cncController.js
 * ---------------------------------------------------------
 * Lógica de negocio del ciclo "recoger y colocar". Usa
 * serialService para hablar con el Arduino, y websocketService
 * para transmitir el estado real de la máquina hacia el
 * simulador (simulador.html) después de cada paso.
 *
 *   G28 -> espera -> esperar sensor -> recoger -> bajar ->
 *   cerrar pinza -> subir -> destino -> bajar ->
 *   abrir pinza -> subir -> volver a espera -> repetir
 * ---------------------------------------------------------
 */

const configuracion = require('../config/configuracion');
const serialService = require('../services/serialService');
const websocketService = require('../services/websocketService');

// Estado actual de la máquina, se actualiza en cada paso y se transmite
// al simulador. No es más que un reflejo de lo que ya se envió por serial.
const estadoMaquina = {
  x: 0,
  y: 0,
  z: configuracion.alturaSegura,
  pinza: 'abierta',
  gcode: '',
  pasoTexto: 'Inicio',
  sensorActivo: false,
};
let anguloActualServo = configuracion.anguloAbierto;

function actualizarYEmitirEstado(cambios) {
  Object.assign(estadoMaquina, cambios);
  websocketService.emitirEstado(estadoMaquina);
}

async function irAHome() {
  console.log('Homing (G28)...');
  await serialService.enviarComando('G28');
  //await cerrarPinza(); // pinza cerrada al inicio
  //await abrirPinza(); // pinza abierta al inicio
  actualizarYEmitirEstado({
    x: 0,
    y: 0,
    z: 0,
    gcode: 'G28',
    pasoTexto: 'Home',
    sensorActivo: false,
  });
console.log('Forzando modo de posicionamiento absoluto (G90)...');
await serialService.enviarComando('G90');
actualizarYEmitirEstado({ gcode: 'G90', pasoTexto: 'Modo absoluto' });
}

async function irAPosicionEspera() {
  console.log('Moviendo a posición de espera...');
  const { x, y } = configuracion.posicionEspera;
  await serialService.enviarComando(`G1 X${x} Y${y} Z${configuracion.alturaSegura}`);
  actualizarYEmitirEstado({
    x,
    y,
    z: configuracion.alturaSegura,
    gcode: `G1 X${x} Y${y} Z${configuracion.alturaSegura}`,
    pasoTexto: 'Posición de espera',
    sensorActivo: false,
  });
}

async function irARecoger() {
  console.log('Moviendo a punto de recolección...');
  const { x, y } = configuracion.posicionRecoger;
  await serialService.enviarComando(`G1 X${x} Y${y}`);
  actualizarYEmitirEstado({
    x,
    y,
    gcode: `G1 X${x} Y${y}`,
    pasoTexto: 'Ir a recoger',
    sensorActivo: false,
  });
}

async function irADestino() {
  console.log('Moviendo a punto de destino...');
  const { x, y } = configuracion.posicionDestino;
  await serialService.enviarComando(`G1 X${x} Y${y}`);
  actualizarYEmitirEstado({
    x,
    y,
    gcode: `G1 X${x} Y${y}`,
    pasoTexto: 'Ir al destino',
  });
}

async function bajarHerramienta() {
  await serialService.enviarComando(`G1 Z${configuracion.alturaTrabajo}`);
  await serialService.enviarComando('M400'); // <-- nuevo
  actualizarYEmitirEstado({
    z: configuracion.alturaTrabajo,
    gcode: `G1 Z${configuracion.alturaTrabajo}`,
    pasoTexto: 'Bajar',
  });
}

async function subirHerramienta() {
  await serialService.enviarComando(`G1 Z${configuracion.alturaSegura}`);
  await serialService.enviarComando('M400'); // <-- nuevo
  actualizarYEmitirEstado({
    z: configuracion.alturaSegura,
    gcode: `G1 Z${configuracion.alturaSegura}`,
    pasoTexto: 'Subir',
  });
}

async function moverServoSuave(anguloDestino, gcodeReferencia, pasoTexto) {
  const pasos = configuracion.pasosMovimientoServo;
  const incremento = (anguloDestino - anguloActualServo) / pasos;

  for (let i = 1; i <= pasos; i++) {
    const anguloIntermedio = Math.round(anguloActualServo + incremento * i);
    await serialService.enviarComando(
      `M280 P${configuracion.servoPinza} S${anguloIntermedio}`
    );
    await serialService.enviarComando(`G4 P${configuracion.tiempoEntrePasosServoMs}`);
  }

  await serialService.enviarComando(`G4 P${configuracion.tiempoEsperaServoMs}`);

  anguloActualServo = anguloDestino;
  actualizarYEmitirEstado({
    pinza: anguloDestino === configuracion.anguloCerrado ? 'cerrada' : 'abierta',
    gcode: gcodeReferencia,
    pasoTexto,
  });
}

async function cerrarPinza() {
  console.log('Cerrando pinza (suave)...');
  await moverServoSuave(
    configuracion.anguloCerrado,
    `M280 P${configuracion.servoPinza} S${configuracion.anguloCerrado}`,
    'Cerrar pinza'
  );
}

async function abrirPinza() {
  console.log('Abriendo pinza (suave)...');
  await moverServoSuave(
    configuracion.anguloAbierto,
    `M280 P${configuracion.servoPinza} S${configuracion.anguloAbierto}`,
    'Abrir pinza'
  );
}

/**
 * Usa el comando nativo de Marlin M226 (wait for pin state) para
 * bloquear la ejecución hasta que el sensor cambie al estado esperado.
 */
async function esperarSensor() {
  console.log('Esperando señal del sensor...');
  actualizarYEmitirEstado({
    gcode: `M226 P${configuracion.pinSensor} S${configuracion.estadoSensorActivo}`,
    pasoTexto: 'Esperando sensor...',
    sensorActivo: true,
  });

  await serialService.enviarComando(
    `M226 P${configuracion.pinSensor} S${configuracion.estadoSensorActivo}`
  );

  console.log('Pieza detectada.');
  actualizarYEmitirEstado({ sensorActivo: false });
}

async function ejecutarCicloRecogerYColocar() {
  await irAPosicionEspera();
  await esperarSensor();

  await irARecoger();
  await bajarHerramienta();
  await cerrarPinza();
  await subirHerramienta();

  await irADestino();
  await bajarHerramienta();
  await abrirPinza();
  await subirHerramienta();

  await irAPosicionEspera();
}

module.exports = {
  irAHome,
  irAPosicionEspera,
  irARecoger,
  irADestino,
  bajarHerramienta,
  subirHerramienta,
  cerrarPinza,
  abrirPinza,
  esperarSensor,
  ejecutarCicloRecogerYColocar,
};
