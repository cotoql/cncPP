# CNC Pick and Place Controller

Controlador en Node.js para automatizar un ciclo de "recoger y colocar" en una CNC (ej. CNC 3018 Pro) con firmware Marlin, usando una pinza controlada por servo.

## Estructura del proyecto

```
cnc-pick-and-place/
├── src/
│   ├── config/
│   │   └── configuracion.js       ; puerto, pines, coordenadas, ángulos de servo
│   ├── services/
│   │   └── serialService.js       ; apertura de puerto, enviarComando(), bajo nivel
│   ├── controllers/
│   │   └── cncController.js       ; irAHome, cerrarPinza, ejecutarCiclo, etc.
│   ├── public/
│   │   └── simulador.html         ; interfaz visual del ciclo
│   └── index.js                   ; punto de entrada
├── tests/
├── .env                           ; puerto serial, baudrate
├── .gitignore
├── package.json
└── README.md
```

## Arquitectura del ciclo

```
Inicio
   │
   ▼
G28           ; Home
   │
   ▼
G1 X0 Y0 Z20  ; Posición de espera
   │
   ▼
Esperar sensor
   │
   ▼
G1 X100 Y50   ; Ir a recoger
   │
   ▼
G1 Z0         ; Bajar
   │
   ▼
M280 P0 S30   ; Cerrar pinza
   │
   ▼
G1 Z20        ; Subir
   │
   ▼
G1 X250 Y150  ; Ir al destino
   │
   ▼
G1 Z0         ; Bajar
   │
   ▼
M280 P0 S90   ; Abrir pinza
   │
   ▼
G1 Z20        ; Subir
   │
   ▼
G1 X0 Y0 Z20  ; Volver a espera
   │
   ▼
Repetir
```

## Requisitos

- Node.js 18+
- Arduino con firmware Marlin
- Sensor conectado a un pin digital
- Servo conectado como pinza (por defecto `SERVO0`)

## Instalación

```bash
npm install
```

## Configuración

Edita `src/config/configuracion.js` o las variables en `.env`:

- `CNC_PUERTO` / `puerto`: puerto serial de tu Arduino (ej. `COM3`, `/dev/ttyUSB0`)
- `pinSensor`: pin digital del sensor
- `posicionRecoger` / `posicionDestino`: coordenadas X/Y
- `anguloCerrado` / `anguloAbierto`: ángulos del servo de la pinza

## Uso

```bash
npm start
```

## Simulador visual

`src/public/simulador.html` se puede usar de dos formas:

1. **Modo demo** (sin Arduino): ábrelo directamente en el navegador (doble clic) y presiona "Modo demo" para ver una animación de referencia del ciclo.
2. **Modo en vivo** (con el controlador corriendo): al ejecutar `npm start`, se levanta un servidor WebSocket en `ws://localhost:8080` que transmite la posición X/Y/Z, el estado de la pinza y el sensor en tiempo real. Si el simulador detecta ese servidor activo, se conecta automáticamente y refleja el movimiento real de la máquina en vez de la secuencia simulada.

El puerto del WebSocket se puede cambiar con la variable `CNC_PUERTO_WS` en `.env`.

## Licencia

MIT
