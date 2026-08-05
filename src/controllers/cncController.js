/**
 * cncController.js
 * ---------------------------------------------------------
 * Lógica de negocio del ciclo "recoger y colocar". Usa
 * serialService para hablar con el Arduino, pero no sabe
 * nada sobre puertos ni bytes: solo arma la secuencia de
 * movimientos según configuracion.js.
 *
 *   G28 -> espera -> esperar sensor -> recoger -> bajar ->
 *   cerrar pinza -> subir -> destino -> bajar ->
 *   abrir pinza -> subir -> volver a espera -> repetir
 * ---------------------------------------------------------
 */

const configuracion = require('../config/configuracion');
const serialService = require('../services/serialService');

async function irAHome() {
  console.log('Homing (G28)...');
  await serialService.enviarComando('G28');
}

async function irAPosicionEspera() {
  console.log('Moviendo a posición de espera...');
  const { x, y } = configuracion.posicionEspera;
  await serialService.enviarComando(`G1 X${x} Y${y} Z${configuracion.alturaSegura}`);
}

async function irARecoger() {
  console.log('Moviendo a punto de recolección...');
  const { x, y } = configuracion.posicionRecoger;
  await serialService.enviarComando(`G1 X${x} Y${y}`);
}

async function irADestino() {
  console.log('Moviendo a punto de destino...');
  const { x, y } = configuracion.posicionDestino;
  await serialService.enviarComando(`G1 X${x} Y${y}`);
}

async function bajarHerramienta() {
  await serialService.enviarComando(`G1 Z${configuracion.alturaTrabajo}`);
}

async function subirHerramienta() {
  await serialService.enviarComando(`G1 Z${configuracion.alturaSegura}`);
}

async function cerrarPinza() {
  console.log('Cerrando pinza...');
  await serialService.enviarComando(
    `M280 P${configuracion.servoPinza} S${configuracion.anguloCerrado}`
  );
}

async function abrirPinza() {
  console.log('Abriendo pinza...');
  await serialService.enviarComando(
    `M280 P${configuracion.servoPinza} S${configuracion.anguloAbierto}`
  );
}

/**
 * Usa el comando nativo de Marlin M226 (wait for pin state) para
 * bloquear la ejecución hasta que el sensor cambie al estado esperado.
 */
async function esperarSensor() {
  console.log('Esperando señal del sensor...');
  await serialService.enviarComando(
    `M226 P${configuracion.pinSensor} S${configuracion.estadoSensorActivo}`
  );
  console.log('Pieza detectada.');
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
