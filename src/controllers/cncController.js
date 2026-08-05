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

function actualizarYEmitirEstado(cambios) {
  Object.assign(estadoMaquina, cambios);
  websocketService.emitirEstado(estadoMaquina);
}

async function irAHome() {
  console.log('Homing (G28)...');
  await serialService.enviarComando('G28');
  actualizarYEmitirEstado({
    x: 0,
    y: 0,
    z: 0,
    gcode: 'G28',
    pasoTexto: 'Home',
    sensorActivo: false,
  });
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
  actualizarYEmitirEstado({
    z: configuracion.alturaTrabajo,
    gcode: `G1 Z${configuracion.alturaTrabajo}`,
    pasoTexto: 'Bajar',
  });
}

async function subirHerramienta() {
  await serialService.enviarComando(`G1 Z${configuracion.alturaSegura}`);
  actualizarYEmitirEstado({
    z: configuracion.alturaSegura,
    gcode: `G1 Z${configuracion.alturaSegura}`,
    pasoTexto: 'Subir',
  });
}

async function cerrarPinza() {
  console.log('Cerrando pinza...');
  await serialService.enviarComando(
    `M280 P${configuracion.servoPinza} S${configuracion.anguloCerrado}`
  );
  actualizarYEmitirEstado({
    pinza: 'cerrada',
    gcode: `M280 P${configuracion.servoPinza} S${configuracion.anguloCerrado}`,
    pasoTexto: 'Cerrar pinza',
  });
}

async function abrirPinza() {
  console.log('Abriendo pinza...');
  await serialService.enviarComando(
    `M280 P${configuracion.servoPinza} S${configuracion.anguloAbierto}`
  );
  actualizarYEmitirEstado({
    pinza: 'abierta',
    gcode: `M280 P${configuracion.servoPinza} S${configuracion.anguloAbierto}`,
    pasoTexto: 'Abrir pinza',
  });
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
