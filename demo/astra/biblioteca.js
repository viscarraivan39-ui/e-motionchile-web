// ASTRA · biblioteca documental FICTICIA del prototipo (ESPECIFICACION_PROTOTIPO_v0.1 §3, D-025, D-030).
// Misma estructura que tendrán los documentos reales de la empresa (D-027): cuando lleguen, se reemplaza este
// archivo por las fichas validadas de esos documentos. Ningún texto de aquí viene de un documento real.
// Cada requisito usa el término exacto del documento (D-030): «pantalla facial» no es «protección respiratoria».
// `critico` + `verifica` (D-032): qué se verifica en terreno antes de iniciar y quién puede hacerlo (encargado o supervisor
// capacitado, o intervención especializada de Prevención).
(function (g) {
  'use strict';
  var B = {
    ficticia: true,
    documentos: [
      { id: 'EST-EPP-01', tipo: 'estandar', titulo: 'Estándar de elementos de protección personal', version: '2', fecha: '2026-02-01' },
      { id: 'PROC-03', tipo: 'procedimiento', titulo: 'Armado de moldajes y tableros de madera', version: '2', fecha: '2026-03-10' },
      { id: 'PROC-07', tipo: 'procedimiento', titulo: 'Hormigonado de elementos estructurales', version: '1', fecha: '2026-01-20' },
      { id: 'PROC-09', tipo: 'procedimiento', titulo: 'Trabajo en altura física', version: '4', fecha: '2026-05-02' },
      { id: 'PROC-12', tipo: 'procedimiento', titulo: 'Mantención de maquinaria en terreno', version: '1', fecha: '2026-06-15' },
      { id: 'PROC-14', tipo: 'procedimiento', titulo: 'Corte con esmeril angular', version: '1', fecha: '2026-04-08' },
      { id: 'PROC-05', tipo: 'procedimiento', titulo: 'Enfierradura', version: '3', fecha: '2026-02-11' },
      { id: 'MIPER-01', tipo: 'matriz', titulo: 'Matriz de identificación de peligros y evaluación de riesgos · obras civiles', version: '3', fecha: '2026-05-30' },
      { id: 'PROT-ALT', tipo: 'protocolo', titulo: 'Protocolo de trabajo en altura', version: '2', fecha: '2026-05-02' },
      { id: 'PROT-AMB-02', tipo: 'protocolo', titulo: 'Protocolo de prevención y control de derrames', version: '1', fecha: '2026-06-15' },
      { id: 'FOR-PTA', tipo: 'formato_permiso', titulo: 'Permiso de trabajo en altura', version: '1', fecha: '2026-05-02' }
      // PROT-CAL-01 «Trabajos en caliente» lo cita PROC-14 pero NO está cargado: sirve para probar «falta documento» (CP-08)
    ],
    documentoPendiente: { id: 'PROT-CAL-01', tipo: 'protocolo', titulo: 'Protocolo de trabajos en caliente', version: '1', fecha: '2026-04-08' },
    // EPP básicos que exige la empresa en toda tarea (D-030 §2). Los guantes van en cada tarea: «adecuados para la tarea».
    eppBasicos: [
      { id: 'b_casco', tipo: 'epp', nombre: 'Casco de seguridad', icono: '⛑️', nivel: 'declarado', cita: 'EST-EPP-01 v2 §4.1' },
      { id: 'b_barbiquejo', tipo: 'epp', nombre: 'Barbiquejo', icono: '🪖', nivel: 'declarado', cita: 'EST-EPP-01 v2 §4.1' },
      { id: 'b_lentes', tipo: 'epp', nombre: 'Gafas de seguridad o antiparras', icono: '🥽', nivel: 'declarado', cita: 'EST-EPP-01 v2 §4.2' },
      { id: 'b_calzado', tipo: 'epp', nombre: 'Calzado de seguridad', icono: '🥾', nivel: 'declarado', cita: 'EST-EPP-01 v2 §4.3' },
      { id: 'b_ropa', tipo: 'epp', nombre: 'Overol o ropa de trabajo', icono: '👷', nivel: 'declarado', cita: 'EST-EPP-01 v2 §4.4' }
    ],
    fichas: [
      {
        id: 'TA-03', nombre: 'Armado de moldajes y tableros de madera', documento: 'PROC-03', estado: 'VALIDADA', validadaPor: 'p-elena', validadaEn: '2026-10-20',
        claves: ['moldaje', 'tablero', 'placa', 'clavo', 'madera', 'encofrado', 'carpint', 'cortar', 'corte', 'sierra', 'serrucho'],
        descripcion: 'Trazado, corte y armado de tableros y moldajes de madera para elementos de hormigón.',
        referencias: ['PROC-03', 'MIPER-01', 'EST-EPP-01'],
        pasos: [
          { texto: 'Trazar las piezas sobre las placas según el plano del moldaje.', cita: 'PROC-03 v2 §6.1' },
          { texto: 'Cortar las placas sobre el mesón de corte, con la sierra circular con su protección de disco.', cita: 'PROC-03 v2 §6.2' },
          { texto: 'Armar los tableros con clavos y reforzar con listones.', cita: 'PROC-03 v2 §6.3' },
          { texto: 'Acopiar los tableros en el lugar señalado, sin obstruir pasillos.', cita: 'PROC-03 v2 §6.4' }
        ],
        peligros: [
          { peligro: 'Sierra circular en funcionamiento', riesgo: 'Cortes y amputaciones', control: 'Protección de disco y cuchillo divisor; corte solo sobre mesón estable', cita: 'MIPER-01 v3 fila 12' },
          { peligro: 'Proyección de partículas al cortar', riesgo: 'Lesiones oculares y faciales', control: 'Gafas de seguridad y pantalla facial durante el corte', cita: 'MIPER-01 v3 fila 13' },
          { peligro: 'Cables eléctricos en el piso', riesgo: 'Contacto eléctrico y caídas', control: 'Extensiones aéreas, sin uniones expuestas', cita: 'MIPER-01 v3 fila 15' },
          { peligro: 'Uso de martillo y clavos', riesgo: 'Golpes y punzaduras', control: 'Guantes de cabritilla y calzado de seguridad', cita: 'MIPER-01 v3 fila 16' },
          { peligro: 'Ruido de la sierra', riesgo: 'Pérdida auditiva', control: 'Protector auditivo durante el corte', cita: 'MIPER-01 v3 fila 14' }
        ],
        // D-030 §3: se pregunta solo si la descripción no lo deja claro
        preguntas: [{ id: 'sierra', texto: '¿Utilizará una sierra circular?', herramienta: 'la sierra circular', detectar: ['sierra circular', 'sierra electrica', 'circular'], cita: 'PROC-03 v2 §5' }],
        requisitos: [
          { id: 'guantes', tipo: 'epp', nombre: 'Guantes de cabritilla', icono: '🧤', nivel: 'declarado', cita: 'PROC-03 v2 §7.1' },
          { id: 'pantalla', tipo: 'epp', nombre: 'Pantalla facial (protector facial)', icono: '🛡️', nivel: 'declarado', si: 'sierra', critico: true, verifica: 'encargado', cita: 'PROC-03 v2 §7.2' },
          { id: 'pechera', tipo: 'epp', nombre: 'Pechera de cuero', icono: '🦺', nivel: 'declarado', si: 'sierra', cita: 'PROC-03 v2 §7.2' },
          { id: 'auditivo', tipo: 'epp', nombre: 'Protector auditivo', icono: '🎧', nivel: 'declarado', si: 'sierra', cita: 'MIPER-01 v3 fila 14',
            noAplica: { cuando: 'El corte con sierra suma menos de 15 minutos en el turno', cita: 'MIPER-01 v3 fila 14, nota 2' } },
          { id: 'guarda', tipo: 'condicion', nombre: 'Sierra circular con protección de disco y cuchillo divisor en buen estado', icono: '🪚', nivel: 'responsable', si: 'sierra', critico: true, verifica: 'encargado', cita: 'PROC-03 v2 §6.2' },
          { id: 'meson', tipo: 'condicion', nombre: 'Mesón de corte estable y nivelado', icono: '🛠️', nivel: 'responsable', si: 'sierra', cita: 'PROC-03 v2 §6.2' },
          { id: 'extensiones', tipo: 'condicion', nombre: 'Extensiones eléctricas aéreas, sin uniones expuestas', icono: '🔌', nivel: 'responsable', si: 'sierra', cita: 'MIPER-01 v3 fila 15' },
          { id: 'acopio', tipo: 'condicion', nombre: 'Lugar de acopio definido, sin obstruir pasillos', icono: '📦', nivel: 'responsable', cita: 'PROC-03 v2 §6.4' },
          { id: 'comp_sierra', tipo: 'competencia', competencia: 'sierra_circular', nombre: 'Capacitación en uso de sierra circular', icono: '🎓', nivel: 'sistema', si: 'sierra', cita: 'PROC-03 v2 §4' }
        ],
        permisos: [],
        // D-033: el encargado del área verifica siempre en persona; aquí solo lo adicional que exige el procedimiento
        aprobaciones: []
      },
      {
        id: 'TA-09', nombre: 'Trabajo en altura sobre andamio o losa', documento: 'PROC-09', estado: 'VALIDADA', validadaPor: 'p-elena', validadaEn: '2026-10-20',
        claves: ['altura', 'andamio', 'escalera', 'techumbre', 'techo', 'arnes', 'borde', 'alto', 'segundo piso', 'losa'],
        descripcion: 'Trabajos a más de 1,8 m sobre andamio, losa o estructura, con riesgo de caída a distinto nivel.',
        referencias: ['PROC-09', 'PROT-ALT', 'MIPER-01', 'FOR-PTA', 'EST-EPP-01'],
        pasos: [
          { texto: 'Verificar el andamio (tarjeta verde) y la línea de vida antes de subir.', cita: 'PROC-09 v4 §6.1' },
          { texto: 'Delimitar la zona inferior para que nadie pase bajo el trabajo.', cita: 'PROC-09 v4 §6.2' },
          { texto: 'Subir con el arnés puesto y conectarse a la línea de vida antes de soltar las manos.', cita: 'PROT-ALT v2 §5' },
          { texto: 'Mantener herramientas amarradas; nada se lanza hacia abajo.', cita: 'PROC-09 v4 §6.4' }
        ],
        peligros: [
          { peligro: 'Trabajo a más de 1,8 m', riesgo: 'Caída a distinto nivel', control: 'Arnés de cuerpo completo conectado a línea de vida certificada', cita: 'MIPER-01 v3 fila 31' },
          { peligro: 'Caída de herramientas o materiales', riesgo: 'Golpes a personas abajo', control: 'Zona inferior delimitada; herramientas amarradas', cita: 'MIPER-01 v3 fila 32' },
          { peligro: 'Andamio mal armado', riesgo: 'Colapso de la estructura', control: 'Solo andamio con tarjeta verde vigente', cita: 'PROT-ALT v2 §4' }
        ],
        preguntas: [],
        requisitos: [
          { id: 'arnes', tipo: 'epp', nombre: 'Arnés de cuerpo completo con doble cola', icono: '🪢', nivel: 'declarado', critico: true, verifica: 'encargado', cita: 'PROT-ALT v2 §6' },
          { id: 'guantes', tipo: 'epp', nombre: 'Guantes de trabajo', icono: '🧤', nivel: 'declarado', cita: 'PROC-09 v4 §7' },
          { id: 'linea_vida', tipo: 'condicion', nombre: 'Línea de vida instalada y revisada', icono: '🔗', nivel: 'responsable', critico: true, verifica: 'especializada', cita: 'PROT-ALT v2 §5' },
          { id: 'tarjeta_verde', tipo: 'condicion', nombre: 'Andamio con tarjeta verde vigente', icono: '🟩', nivel: 'responsable', cita: 'PROT-ALT v2 §4' },
          { id: 'zona_inferior', tipo: 'condicion', nombre: 'Zona inferior delimitada', icono: '🚧', nivel: 'responsable', cita: 'PROC-09 v4 §6.2' },
          { id: 'comp_altura', tipo: 'competencia', competencia: 'trabajo_altura', nombre: 'Capacitación en trabajo en altura', icono: '🎓', nivel: 'sistema', cita: 'PROC-09 v4 §4' },
          { id: 'examen_altura', tipo: 'competencia', competencia: 'examen_altura', nombre: 'Examen de altura física vigente', icono: '🩺', nivel: 'sistema', cita: 'PROT-ALT v2 §3' }
        ],
        permisos: [{ id: 'PTA', nombre: 'Permiso de trabajo en altura', formato: 'FOR-PTA', revisa: 'encargado_area', autoriza: 'prevencion', cita: 'PROC-09 v4 §8',
          condiciones: ['Línea de vida instalada y revisada', 'Andamio con tarjeta verde vigente', 'Zona inferior delimitada', 'Plan de rescate conocido por la cuadrilla'] }],
        aprobaciones: [{ calidad: 'prevencion', modo: 'presencial' }, { calidad: 'mandante', modo: 'documental' }]
      },
      {
        id: 'TA-12', nombre: 'Mantención de maquinaria en terreno', documento: 'PROC-12', estado: 'VALIDADA', validadaPor: 'p-elena', validadaEn: '2026-10-20',
        claves: ['mantencion', 'excavadora', 'aceite', 'filtro', 'reparacion', 'maquina', 'maquinaria', 'engrase', 'hidraulic'],
        descripcion: 'Mantención o reparación de maquinaria pesada en el lugar donde trabaja (excavadora, retro, cargador).',
        referencias: ['PROC-12', 'MIPER-01', 'PROT-AMB-02', 'EST-EPP-01'],
        pasos: [
          { texto: 'Detener la máquina, bajar implementos al piso y bloquear el arranque.', cita: 'PROC-12 v1 §6.1' },
          { texto: 'Instalar bandeja antiderrame bajo el punto de trabajo.', cita: 'PROT-AMB-02 v1 §4' },
          { texto: 'Realizar la mantención según el manual del fabricante.', cita: 'PROC-12 v1 §6.3' },
          { texto: 'Retirar residuos (filtros, paños, aceite) al contenedor rotulado.', cita: 'PROT-AMB-02 v1 §6' }
        ],
        peligros: [
          { peligro: 'Arranque inesperado de la máquina', riesgo: 'Atrapamiento', control: 'Bloqueo de arranque con tarjeta personal', cita: 'MIPER-01 v3 fila 44' },
          { peligro: 'Fluidos calientes o a presión', riesgo: 'Quemaduras y proyección', control: 'Esperar enfriamiento; gafas y guantes de nitrilo', cita: 'MIPER-01 v3 fila 45' },
          { peligro: 'Derrame de aceite al suelo', riesgo: 'Contaminación del suelo (aspecto ambiental)', control: 'Bandeja y kit antiderrame; residuos a contenedor rotulado', cita: 'PROT-AMB-02 v1 §4' }
        ],
        preguntas: [{ id: 'fluidos', texto: '¿Habrá cambio de aceite o manejo de fluidos?', herramienta: 'el manejo de fluidos', detectar: ['cambio de aceite', 'aceite', 'fluido', 'hidraulic'], cita: 'PROC-12 v1 §5' }],
        requisitos: [
          { id: 'nitrilo', tipo: 'epp', nombre: 'Guantes de nitrilo', icono: '🧤', nivel: 'declarado', cita: 'PROC-12 v1 §7' },
          { id: 'bloqueo', tipo: 'condicion', nombre: 'Máquina detenida y con bloqueo de arranque', icono: '🔒', nivel: 'responsable', critico: true, verifica: 'encargado', cita: 'PROC-12 v1 §6.1' },
          { id: 'bandeja', tipo: 'condicion', nombre: 'Bandeja y kit antiderrame en el lugar', icono: '🛢️', nivel: 'responsable', si: 'fluidos', cita: 'PROT-AMB-02 v1 §4' },
          { id: 'comp_mec', tipo: 'competencia', competencia: 'mecanico', nombre: 'Mecánico de maquinaria acreditado', icono: '🎓', nivel: 'sistema', cita: 'PROC-12 v1 §4' }
        ],
        permisos: [],
        aprobaciones: [],
        aprobacionesSi: { fluidos: [{ calidad: 'medio_ambiente', modo: 'documental' }] }
      },
      {
        id: 'TA-14', nombre: 'Corte con esmeril angular', documento: 'PROC-14', estado: 'VALIDADA', validadaPor: 'p-elena', validadaEn: '2026-10-20',
        claves: ['esmeril', 'galletero', 'corte de fierro', 'desbaste', 'chispa', 'soldar', 'soldadura'],
        descripcion: 'Corte y desbaste de metales con esmeril angular.',
        referencias: ['PROC-14', 'MIPER-01', 'PROT-CAL-01'],
        pasos: [], peligros: [], preguntas: [], requisitos: [], permisos: [], aprobaciones: []
      },
      {
        id: 'TA-07', nombre: 'Hormigonado con vibrador', documento: 'PROC-07', estado: 'VALIDADA', validadaPor: 'p-elena', validadaEn: '2026-10-20',
        claves: ['hormigonar', 'hormigonado', 'vaciado', 'vibrador', 'betonera', 'bomba', 'concreto'],
        descripcion: 'Vaciado y vibrado de hormigón en elementos estructurales.',
        referencias: ['PROC-07', 'MIPER-01'],
        contradicciones: [{ descripcion: 'PROC-07 v1 §7 no exige protector auditivo para el vibrador; MIPER-01 v3 fila 22 lo exige por ruido sobre 85 dB. Prevención debe resolver cuál rige.', documentos: ['PROC-07 v1 §7', 'MIPER-01 v3 fila 22'] }],
        pasos: [], peligros: [], preguntas: [], requisitos: [], permisos: [], aprobaciones: []
      },
      {
        id: 'TA-05', nombre: 'Enfierradura', documento: 'PROC-05', estado: 'EN_VALIDACION',
        claves: ['fierro', 'enfierr', 'amarra', 'barra', 'doblar fierro'],
        descripcion: 'Corte, doblado y amarre de armaduras.', referencias: ['PROC-05', 'MIPER-01'],
        pasos: [], peligros: [], preguntas: [], requisitos: [], permisos: [], aprobaciones: []
      }
    ]
  };
  if (typeof module !== 'undefined') module.exports = B; else g.ASTRA_BIBLIOTECA = B;
})(this);
