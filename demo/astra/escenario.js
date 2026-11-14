// ASTRA · escenario ficticio completo «Constructora Demostración SpA» (D-041). SIMULACIÓN — PROTOTIPO.
// Nada de este archivo es documentación aprobada para una obra real: personas, documentos, evaluaciones y aprobaciones
// son supuestos de simulación para probar los procesos preventivos de la plataforma.
// Se arma con la misma base que la demo (mismos motores) y luego se reemplaza el mundo: empresas, obra, personas, áreas,
// responsables, permisos, cuadrillas, biblioteca documental, matriz, registro ambiental y cápsulas.
(function (g) {
  'use strict';
  var req = function (n, glob) { return (typeof module !== 'undefined') ? require('./' + n) : g[glob]; };
  var A = req('motor.js', 'ASTRA'), C = req('cuadrilla.js', 'ASTRA_C'), T = req('terreno.js', 'ASTRA_T'), L = req('aprendizaje.js', 'ASTRA_L');
  var D = req('documentos.js', 'ASTRA_D'), N = req('nomina.js', 'ASTRA_N'), S = req('sincronizacion.js', 'ASTRA_S');
  var ETIQUETA = 'SIMULACIÓN — PROTOTIPO';
  var P = 'EMP-DEMO-001', SM = 'EMP-DEMO-002', SN = 'EMP-DEMO-003', M = 'EMP-DEMO-004';
  A.NIVEL.calidad = 'elevado';
  C.CALIDAD.calidad = 'Calidad';

  // ---------- 1. Empresa y obra ----------
  var OBRA = {
    codigo: 'OBRA-DEMO-001', nombre: 'Edificio Demostración', empresa: P,
    descripcion: 'Edificio habitacional de 5 pisos, 20 departamentos por piso, 100 departamentos en total.',
    pisos: 5, deptosPorPiso: 20, deptos: 100,
    supuestos: ['Estructura de hormigón armado (supuesto del escenario).', 'Sin subterráneos (supuesto del escenario).'],
    pendientesNormativos: ['Necesidad de ascensores: pendiente de revisión normativa.', 'Otras condiciones arquitectónicas (accesibilidad, evacuación, etc.): pendientes de revisión normativa.'],
    noAfirma: 'No se afirma que el proyecto cumpla íntegramente la normativa de edificación por tener cinco pisos.',
    finalidad: 'Probar los procesos preventivos desde el despeje del terreno hasta la terminación y entrega; no se desarrolla cálculo estructural ni expediente de permisos.'
  };
  var EMPRESAS = [
    { id: P, nombre: 'Constructora Demostración SpA', tipo: 'principal' },
    { id: SM, nombre: 'Moldajes Sur Demostración Ltda. (subcontrato)', tipo: 'contratista' },
    { id: SN, nombre: 'Mantención y Montajes Demostración Ltda. (subcontrato)', tipo: 'contratista' },
    { id: M, nombre: 'Inmobiliaria Mandante Demostración S.A.', tipo: 'mandante' }
  ];

  // ---------- 2. Cincuenta personas ficticias (DEMO-001 a DEMO-050, sin RUT) ----------
  var NOMBRES = ['Aurora', 'Bruno', 'Celia', 'Darío', 'Eva', 'Fabián', 'Gloria', 'Héctor', 'Irene', 'Joaquín', 'Karen', 'Lucas', 'Mónica', 'Nicolás', 'Olga', 'Pablo', 'Quintín', 'Rocío', 'Samuel', 'Tamara',
    'Ulises', 'Valeria', 'Walter', 'Ximena', 'Yolanda', 'Zacarías', 'Alba', 'Benito', 'Carla', 'Demian', 'Elsa', 'Franco', 'Gisela', 'Hernán', 'Inés', 'Julián', 'Lidia', 'Marcos', 'Nora', 'Óscar',
    'Patricia', 'Ramiro', 'Sara', 'Tobías', 'Úrsula', 'Vicente', 'Wanda', 'Yamil', 'Zoe', 'Adolfo'];
  var COMP_TXT = { carpinteria: 'Oficio carpintería', sierra_circular: 'Uso de sierra circular', trabajo_altura: 'Trabajo en altura', examen_altura: 'Examen de altura física', armado_andamios: 'Armado de andamios',
    electrico: 'Instalaciones eléctricas', mecanico: 'Mecánico de maquinaria acreditado', operador_maquinaria: 'Operación de retroexcavadora', operador_grua: 'Operación de grúa', operador_manipulador: 'Operador de manipulador telescópico acreditado', rigger: 'Rigger y señalero', soldadura: 'Soldadura al arco' };
  var COMP_CARGO = { 'Carpintero': ['carpinteria', 'sierra_circular'], 'Carpintero moldajista': ['carpinteria', 'sierra_circular', 'trabajo_altura', 'examen_altura'], 'Jornal': [], 'Enfierrador': [], 'Albañil': [],
    'Instalador de barandas y andamios': ['trabajo_altura', 'examen_altura', 'armado_andamios'], 'Maestro eléctrico': ['electrico'], 'Mecánico de maquinaria': ['mecanico'], 'Operador de retroexcavadora': ['operador_maquinaria'],
    'Operador de grúa': ['operador_grua'], 'Rigger / señalero': ['rigger'], 'Soldador': ['soldadura'] };
  // [código, cargo, rol, empresa, funciones extra]. Huecos de competencias a propósito (para los casos de prueba):
  // DEMO-014 sin capacitación de sierra; DEMO-024 con examen de altura vencido; DEMO-030 carpintero también habilitado en altura.
  var PLANTA = [
    ['001', 'Jefe de terreno', 'jefe_terreno', P, ['encargado_area', 'aprobador_documentos']],
    ['002', 'Experto en prevención de riesgos', 'prevencion', P, ['revisor_capsulas', 'emergencias', 'aprobador_documentos']],
    ['003', 'Responsable de medio ambiente', 'medio_ambiente', P, []],
    ['004', 'Responsable de calidad', 'calidad', P, []],
    ['005', 'Topógrafo', 'trabajador', P, []],
    ['006', 'Representante del mandante', 'mandante', M, ['autoriza_subcontratos']],
    ['007', 'Capataz de obra gruesa (cuadrilla 1)', 'capataz', P, ['encargado_area']],
    ['008', 'Capataz de obra gruesa y altura (cuadrilla 2)', 'capataz', P, ['encargado_area']],
    ['009', 'Supervisor del subcontrato de moldajes (cuadrilla 3)', 'supervisor', SM, []],
    ['010', 'Supervisor del subcontrato de mantención y montajes (cuadrilla 4)', 'supervisor', SN, []]
  ];
  var CU = [
    { id: 'CU-D1', empresa: P, resp: '007', reemp: '008', cargos: ['Carpintero', 'Carpintero', 'Carpintero', 'Carpintero', 'Jornal', 'Jornal', 'Jornal', 'Enfierrador', 'Enfierrador', 'Albañil'] },
    { id: 'CU-D2', empresa: P, resp: '008', reemp: '007', cargos: ['Instalador de barandas y andamios', 'Instalador de barandas y andamios', 'Instalador de barandas y andamios', 'Instalador de barandas y andamios', 'Albañil', 'Albañil', 'Jornal', 'Jornal', 'Maestro eléctrico', 'Carpintero'] },
    { id: 'CU-D3', empresa: SM, resp: '009', reemp: null, cargos: ['Carpintero moldajista', 'Carpintero moldajista', 'Carpintero moldajista', 'Carpintero moldajista', 'Carpintero moldajista', 'Carpintero moldajista', 'Jornal', 'Jornal', 'Jornal', 'Rigger / señalero'] },
    { id: 'CU-D4', empresa: SN, resp: '010', reemp: null, cargos: ['Mecánico de maquinaria', 'Mecánico de maquinaria', 'Operador de retroexcavadora', 'Operador de retroexcavadora', 'Operador de grúa', 'Rigger / señalero', 'Maestro eléctrico', 'Soldador', 'Jornal', 'Jornal'] }
  ];
  CU.forEach(function (c, k) { c.cargos.forEach(function (cargo, j) { var n = 11 + k * 10 + j; PLANTA.push([String(n).padStart(3, '0'), cargo, /^Operador/.test(cargo) ? 'operador' : 'trabajador', c.empresa, []]); }); });
  var pid = function (n) { return 'demo-' + n; };

  // ---------- 3. Etapas y tareas (inventario completo; 3 casos con ficha completa) ----------
  var ETAPAS = [
    [1, 'Reconocimiento del terreno, levantamiento y planificación inicial', [['Recorrido de reconocimiento y registro de condiciones', ['PT-TOP-01']], ['Levantamiento topográfico y estacado', ['PT-TOP-01', 'PT-MAQ-01']], ['Planificación inicial de faena y accesos', ['PT-INS-01']]]],
    [2, 'Instalación de faena, cierres, accesos y servicios provisorios', [['Cierre perimetral provisorio', ['PT-INS-01', 'PT-HER-01']], ['Instalación de contenedores de oficina, bodega y servicios higiénicos', ['PT-INS-01', 'PT-IZA-01']], ['Empalme eléctrico provisorio y tableros', ['PT-ELE-01']], ['Habilitación de accesos y circulación vehicular', ['PT-MAQ-01']]]],
    [3, 'Despeje, limpieza y preparación del terreno', [['Retiro de vegetación y escombros', ['PT-DES-01', 'PT-MAQ-01']], ['Escarpe y nivelación', ['PT-DES-01', 'PT-MAQ-01']]]],
    [4, 'Movimiento de tierras, excavaciones, transporte y rellenos', [['Excavación masiva con retroexcavadora', ['PT-EXC-01', 'PT-MAQ-01']], ['Excavación manual de zanjas', ['PT-EXC-01', 'PT-HER-01']], ['Carguío y transporte de excedentes', ['PT-MAQ-01']], ['Rellenos compactados', ['PT-EXC-01', 'PT-MAQ-01']]]],
    [5, 'Fundaciones y redes enterradas', [['Emplantillado y fundaciones', ['PT-FUN-01', 'PT-HOR-01']], ['Redes enterradas de alcantarillado y agua potable', ['PT-FUN-01', 'PT-EXC-01']]]],
    [6, 'Enfierradura, moldajes y hormigonado de elementos estructurales', [['Armado de moldajes de muros y losas', ['PT-MOL-01', 'PT-HER-01'], 'FT-MOL-01'], ['Corte, doblado y amarre de enfierradura', ['PT-ENF-01', 'PT-HER-01']], ['Hormigonado con bomba y vibrado', ['PT-HOR-01']], ['Soldadura de insertos metálicos', ['PT-CAL-01'], 'FT-SOL-01']]],
    [7, 'Ejecución repetitiva de los cinco pisos, escaleras y losas', [['Moldajes de losa del piso en ejecución', ['PT-MOL-01', 'PT-ALT-01'], 'FT-MOL-01'], ['Instalación de barandas perimetrales en borde de losa', ['PT-ALT-01'], 'FT-ALT-01'], ['Escaleras: moldaje, enfierradura y hormigonado', ['PT-MOL-01', 'PT-ENF-01', 'PT-HOR-01']]]],
    [8, 'Desmolde, descimbre y manejo de materiales', [['Desmolde de muros y losas', ['PT-DSM-01', 'PT-ALT-01']], ['Descimbre y retiro de alzaprimas', ['PT-DSM-01']], ['Traslado de placas y alzaprimas entre pisos', ['PT-IZA-01']]]],
    [9, 'Cubierta e impermeabilización', [['Estructura de cubierta', ['PT-CUB-01', 'PT-ALT-01']], ['Instalación de planchas de zinc en la techumbre', ['PT-CUB-01', 'PT-ALT-01'], 'FT-CUB-01'], ['Impermeabilización con membrana asfáltica', ['PT-CUB-01', 'PT-CAL-01', 'PT-SUS-01']]]],
    [10, 'Fachadas, cerramientos, ventanas y barandas', [['Andamios perimetrales de fachada', ['PT-FAC-01', 'PT-ALT-01']], ['Instalación de ventanas', ['PT-FAC-01', 'PT-ALT-01']], ['Barandas definitivas de balcones', ['PT-FAC-01', 'PT-ALT-01'], 'FT-ALT-01']]],
    [11, 'Instalaciones sanitarias, eléctricas y otras especialidades', [['Instalaciones sanitarias', ['PT-INST-01', 'PT-HER-01']], ['Instalaciones eléctricas interiores', ['PT-INST-01', 'PT-ELE-01']], ['Pruebas de presión de redes', ['PT-PRU-01']]]],
    [12, 'Tabiques, revestimientos, pavimentos, cielos, pintura y terminaciones', [['Tabiquería', ['PT-TER-01', 'PT-HER-01']], ['Revestimientos y pavimentos', ['PT-TER-01', 'PT-SUS-01']], ['Cielos', ['PT-TER-01', 'PT-ALT-01']], ['Pintura', ['PT-TER-01', 'PT-SUS-01']]]],
    [13, 'Obras exteriores, urbanización y áreas comunes', [['Pavimentos exteriores y soleras', ['PT-EXT-01', 'PT-MAQ-01']], ['Áreas verdes y equipamiento común', ['PT-EXT-01']]]],
    [14, 'Pruebas, puesta en servicio y correcciones', [['Pruebas de instalaciones y puesta en servicio', ['PT-PRU-01', 'PT-ELE-01']], ['Correcciones de observaciones de calidad', ['PT-TER-01']]]],
    [15, 'Limpieza final, retiro de instalaciones provisorias y entrega', [['Limpieza final', ['PT-ENT-01', 'PT-EME-01']], ['Retiro de instalaciones provisorias', ['PT-ENT-01', 'PT-IZA-01']], ['Entrega de departamentos', ['PT-ENT-01']]]]
  ];
  var AUXILIARES = [['Recepción de materiales', ['PT-AUX-01', 'PT-MAQ-01']], ['Izaje con grúa', ['PT-IZA-01']], ['Almacenamiento en bodega y acopio', ['PT-AUX-01', 'PT-SUS-01']], ['Circulación de maquinaria y vehículos', ['PT-MAQ-01']],
    ['Mantención de maquinaria en terreno', ['PT-MAN-01', 'PT-DER-01'], 'FT-MAN-01'], ['Gestión de residuos', ['PT-EME-01', 'PT-SUS-01']], ['Traslado de materiales con manipulador telescópico', ['PT-MTL-01'], 'FT-MTL-01']];

  // ---------- 5. Procedimientos: inventario (de actividad y transversales) ----------
  // estado: VIGENTE (aprobado para simulación), REEMPLAZADO, REVISION_TECNICA / REVISION_EMPRESA (en revisión), BORRADOR,
  // POR_ELABORAR (solo en el inventario) y FALTANTE (citado pero no cargado)
  var PROCS = [
    ['PT-TOP-01', 'actividad', 'Reconocimiento, levantamiento topográfico y estacado', 'POR_ELABORAR'],
    ['PT-INS-01', 'actividad', 'Instalación de faena, cierres y servicios provisorios', 'POR_ELABORAR'],
    ['PT-DES-01', 'actividad', 'Despeje, limpieza y preparación del terreno', 'POR_ELABORAR'],
    ['PT-FUN-01', 'actividad', 'Fundaciones y redes enterradas', 'POR_ELABORAR'],
    ['PT-MOL-01', 'actividad', 'Armado e instalación de moldajes de muros y losas', 'VIGENTE'],
    ['PT-ENF-01', 'actividad', 'Enfierradura: corte, doblado y amarre', 'POR_ELABORAR'],
    ['PT-HOR-01', 'actividad', 'Hormigonado con bomba y vibrado', 'POR_ELABORAR'],
    ['PT-DSM-01', 'actividad', 'Desmolde y descimbre', 'POR_ELABORAR'],
    ['PT-CUB-01', 'actividad', 'Cubierta e impermeabilización', 'VIGENTE'],
    ['PT-FAC-01', 'actividad', 'Fachadas, ventanas y barandas', 'POR_ELABORAR'],
    ['PT-INST-01', 'actividad', 'Instalaciones sanitarias y eléctricas interiores', 'POR_ELABORAR'],
    ['PT-TER-01', 'actividad', 'Tabiques, revestimientos, cielos, pintura y terminaciones', 'POR_ELABORAR'],
    ['PT-EXT-01', 'actividad', 'Obras exteriores, urbanización y áreas comunes', 'POR_ELABORAR'],
    ['PT-PRU-01', 'actividad', 'Pruebas y puesta en servicio', 'POR_ELABORAR'],
    ['PT-ENT-01', 'actividad', 'Limpieza final, retiro de instalaciones provisorias y entrega', 'POR_ELABORAR'],
    ['PT-AUX-01', 'actividad', 'Recepción, almacenamiento y acopio de materiales', 'POR_ELABORAR'],
    ['PT-MAN-01', 'actividad', 'Mantención de maquinaria en terreno', 'VIGENTE'],
    ['PT-MTL-01', 'actividad', 'Operación de manipulador telescópico para traslado de materiales', 'VIGENTE'],
    ['PT-HER-01', 'transversal', 'Herramientas manuales y eléctricas', 'VIGENTE'],
    ['PT-ALT-01', 'transversal', 'Trabajos en altura y medios de acceso', 'VIGENTE'],
    ['PT-EXC-01', 'transversal', 'Excavaciones', 'BORRADOR'],
    ['PT-IZA-01', 'transversal', 'Izaje y movimiento de cargas', 'REVISION_TECNICA'],
    ['PT-MAQ-01', 'transversal', 'Interacción entre personas y maquinaria', 'REVISION_EMPRESA'],
    ['PT-CAL-01', 'transversal', 'Trabajos en caliente', 'FALTANTE'],
    ['PT-ELE-01', 'transversal', 'Intervenciones eléctricas y control de energías', 'BORRADOR'],
    ['PT-SUS-01', 'transversal', 'Manipulación de materiales y sustancias', 'BORRADOR'],
    ['PT-DER-01', 'transversal', 'Mantención de equipos y prevención de derrames', 'VIGENTE'],
    ['PT-EME-01', 'transversal', 'Emergencias, orden, limpieza y residuos', 'VIGENTE']
  ];
  var VERSION_DOC = { 'PT-MOL-01': '2', 'PT-ALT-01': '2' };
  var OTROS_DOCS = [
    { id: 'EST-EPP-DEMO', tipo: 'estandar', titulo: 'Estándar de elementos de protección personal', version: '1' },
    { id: 'MR-DEMO-01', tipo: 'matriz', titulo: 'Matriz maestra de peligros y evaluación de riesgos', version: '1' },
    { id: 'RA-DEMO-01', tipo: 'matriz', titulo: 'Registro de aspectos e impactos ambientales', version: '1' },
    { id: 'FOR-PTA-DEMO', tipo: 'formato_permiso', titulo: 'Permiso de trabajo en altura', version: '1' },
    { id: 'FOR-INS-MTL', tipo: 'lista', titulo: 'Inspección pre-uso del manipulador telescópico', version: '1' }
  ];

  // ---------- 4. Matriz maestra (supuestos de simulación) ----------
  // Metodología seleccionada para la simulación: Probabilidad (1–4) × Consecuencia (1–4). La empresa real usa la suya.
  var METODO = { nombre: 'Probabilidad × Consecuencia (1 a 4)', niveles: [[1, 3, 'Bajo'], [4, 6, 'Medio'], [8, 9, 'Alto'], [12, 16, 'Crítico']],
    nota: 'Valores de evaluación = supuestos de simulación. No hay mediciones ambientales: las exposiciones a agentes (ruido, polvo, sílice, humos, radiación UV) quedan «no evaluadas profesionalmente» y requieren evaluación del organismo administrador o de un profesional competente.' };
  function nivel(pc) { var n = METODO.niveles.filter(function (x) { return pc >= x[0] && pc <= x[1]; })[0]; return n ? n[2] : (pc <= 3 ? 'Bajo' : pc <= 6 ? 'Medio' : pc <= 9 ? 'Alto' : 'Crítico'); }
  // [id, etapa, actividad, tarea(ficha), puesto, ubicación, expuestos, categoría, peligro, consecuencia, controles existentes, P, C, medidas adicionales, implementa, verifica, procedimientos, capacitación, permisos, exposición evaluada]
  var MATRIZ = [
    ['R-MOL-01', 7, 'Moldajes', 'FT-MOL-01', 'Carpintero / Carpintero moldajista', 'Taller de moldajes · frentes de piso', 'Cuadrillas 1 y 3', 'Seguridad', 'Sierra circular en funcionamiento', 'Cortes y amputaciones', 'Protección de disco y cuchillo divisor; corte sobre mesón estable', 2, 4, 'Verificación diaria de la guarda por el encargado del área', 'Capataz del área', 'Encargado del área', ['PT-MOL-01', 'PT-HER-01'], ['sierra_circular'], [], null],
    ['R-MOL-02', 7, 'Moldajes', 'FT-MOL-01', 'Carpintero / Carpintero moldajista', 'Taller de moldajes · frentes de piso', 'Cuadrillas 1 y 3', 'Seguridad', 'Proyección de partículas al cortar', 'Lesiones oculares y faciales', 'Gafas de seguridad', 2, 3, 'Pantalla facial durante todo corte con sierra', 'Capataz del área', 'Encargado del área', ['PT-MOL-01', 'PT-HER-01'], [], [], null],
    ['R-MOL-03', 7, 'Moldajes', 'FT-MOL-01', 'Carpintero / Carpintero moldajista', 'Taller de moldajes', 'Cuadrillas 1 y 3', 'Salud ocupacional', 'Ruido de la sierra circular', 'Pérdida auditiva (hipoacusia)', 'Protector auditivo', 3, 3, 'Solicitar evaluación de ruido: exposición NO evaluada profesionalmente', 'Prevención', 'Prevención', ['PT-HER-01'], [], [], 'NO_EVALUADA'],
    ['R-MOL-04', 7, 'Moldajes', 'FT-MOL-01', 'Carpintero / Carpintero moldajista', 'Taller de moldajes', 'Cuadrillas 1 y 3', 'Salud ocupacional', 'Polvo de madera al cortar', 'Afecciones respiratorias', 'Corte en lugar ventilado', 2, 2, 'Evaluar necesidad de protección respiratoria: exposición NO evaluada', 'Prevención', 'Prevención', ['PT-MOL-01'], [], [], 'NO_EVALUADA'],
    ['R-MOL-05', 7, 'Moldajes', 'FT-MOL-01', 'Carpintero / Jornal', 'Taller de moldajes · acopio', 'Cuadrillas 1 y 3', 'Ergonomía', 'Manejo manual de placas y tableros', 'Lesiones musculoesqueléticas', 'Levante entre dos personas sobre 25 kg', 3, 2, 'Carro para traslado de placas', 'Jefe de terreno', 'Prevención', ['PT-MOL-01'], [], [], null],
    ['R-MOL-06', 7, 'Moldajes', 'FT-MOL-01', 'Carpintero', 'Taller de moldajes', 'Cuadrillas 1 y 3', 'Seguridad', 'Extensiones eléctricas en el piso', 'Contacto eléctrico y caídas', 'Extensiones aéreas sin uniones expuestas', 2, 3, 'Tablero con protector diferencial revisado', 'Maestro eléctrico', 'Encargado del área', ['PT-HER-01'], [], [], null],
    ['R-ALT-01', 7, 'Altura', 'FT-ALT-01', 'Instalador de barandas y andamios', 'Borde de losa del piso en ejecución', 'Cuadrilla 2', 'Seguridad', 'Trabajo en borde de losa sin baranda', 'Caída a distinto nivel (fatal)', 'Arnés de cuerpo completo conectado a línea de vida', 2, 4, 'Línea de vida revisada por Prevención antes de cada turno; permiso de trabajo en altura', 'Capataz del área', 'Prevención', ['PT-ALT-01'], ['trabajo_altura', 'examen_altura'], ['PTA'], null],
    ['R-ALT-02', 7, 'Altura', 'FT-ALT-01', 'Instalador de barandas y andamios', 'Borde de losa · zona inferior', 'Cuadrilla 2 y personas bajo el frente', 'Seguridad', 'Caída de herramientas o materiales', 'Golpes a personas abajo', 'Herramientas amarradas', 2, 3, 'Zona inferior delimitada y señalizada', 'Capataz del área', 'Encargado del área', ['PT-ALT-01'], [], [], null],
    ['R-ALT-03', 7, 'Altura', 'FT-ALT-01', 'Instalador de barandas y andamios', 'Losa del piso en ejecución', 'Cuadrilla 2', 'Salud ocupacional', 'Radiación UV de origen solar', 'Quemaduras y daño ocular', 'Bloqueador y legionario', 3, 2, 'Pausas a la sombra en horas de mayor índice UV; exposición NO evaluada', 'Jefe de terreno', 'Prevención', ['PT-ALT-01'], [], [], 'NO_EVALUADA'],
    ['R-CUB-01', 9, 'Cubierta', 'FT-CUB-01', 'Instalador de barandas y andamios / Jornal', 'Techumbre', 'Cuadrilla 2', 'Seguridad', 'Trabajo sobre techumbre y bordes de cubierta', 'Caída a distinto nivel (fatal)', 'Arnés conectado a línea de vida; tránsito sobre tablones', 2, 4, 'Línea de vida revisada por Prevención; permiso de trabajo en altura', 'Capataz del área', 'Prevención', ['PT-CUB-01', 'PT-ALT-01'], ['trabajo_altura', 'examen_altura'], ['PTA'], null],
    ['R-CUB-02', 9, 'Cubierta', 'FT-CUB-01', 'Instalador / Jornal', 'Techumbre', 'Cuadrilla 2', 'Seguridad', 'Bordes filosos de planchas de zinc', 'Cortes en manos y antebrazos', 'Guantes anticorte', 3, 2, 'Manipular planchas entre dos personas', 'Capataz del área', 'Encargado del área', ['PT-CUB-01'], [], [], null],
    ['R-CUB-03', 9, 'Cubierta', 'FT-CUB-01', 'Instalador / Jornal', 'Techumbre', 'Cuadrilla 2 y personas abajo', 'Seguridad', 'Viento que levanta planchas sueltas', 'Golpes y caída de planchas', 'Planchas amarradas; trabajo suspendido con viento sobre el límite del procedimiento', 2, 3, 'Revisión del viento antes de subir', 'Capataz del área', 'Encargado del área', ['PT-CUB-01'], [], [], null],
    ['R-CUB-04', 9, 'Cubierta', 'FT-CUB-01', 'Instalador / Jornal', 'Techumbre', 'Cuadrilla 2', 'Seguridad', 'Corte de planchas con esmeril', 'Proyección de partículas', 'Gafas y pantalla facial', 2, 3, 'Corte en el suelo cuando sea posible', 'Capataz del área', 'Encargado del área', ['PT-CUB-01', 'PT-HER-01'], [], [], null],
    ['R-MTL-01', 0, 'Manipulador telescópico', 'FT-MTL-01', 'Operador de manipulador', 'Frente donde opera el equipo', 'Operador', 'Seguridad', 'Volcamiento del manipulador', 'Lesiones graves o fatales del operador', 'Tabla de carga, estabilizadores y terreno nivelado', 2, 4, 'Operador acreditado y equipo con inspección pre-uso diaria', 'Supervisor del subcontrato', 'Encargado del área', ['PT-MTL-01'], ['operador_manipulador'], [], null],
    ['R-MTL-02', 0, 'Manipulador telescópico', 'FT-MTL-01', 'Operador / personas cerca', 'Zona de maniobra', 'Cuadrillas cercanas', 'Seguridad', 'Caída de la carga durante el traslado', 'Golpes graves', 'Carga amarrada sobre horquillas; nadie bajo la carga', 2, 4, 'Zona de maniobra delimitada', 'Supervisor del subcontrato', 'Encargado del área', ['PT-MTL-01'], [], [], null],
    ['R-MTL-03', 0, 'Manipulador telescópico', 'FT-MTL-01', 'Todos en la zona', 'Zona de maniobra', 'Cuadrillas cercanas', 'Tránsito y maquinaria', 'Equipo en movimiento cerca de personas', 'Atropello', 'Señalero asignado y chaleco reflectante', 2, 4, 'Zona de maniobra delimitada antes de mover el equipo', 'Supervisor del subcontrato', 'Encargado del área', ['PT-MTL-01', 'PT-MAQ-01'], [], [], null],
    ['R-ALT-04', 7, 'Altura', 'FT-ALT-01', 'Instalador de barandas y andamios', 'Borde de losa', 'Cuadrilla 2', 'Emergencias', 'Persona suspendida del arnés tras una caída', 'Trauma por suspensión', 'Plan de rescate', 2, 4, 'Simulacro de rescate trimestral', 'Prevención', 'Prevención', ['PT-ALT-01', 'PT-EME-01'], ['trabajo_altura'], ['PTA'], null],
    ['R-MAN-01', 0, 'Mantención', 'FT-MAN-01', 'Mecánico de maquinaria', 'Patio de maquinaria · frente donde opera la máquina', 'Cuadrilla 4', 'Seguridad', 'Arranque inesperado de la máquina', 'Atrapamiento', 'Bloqueo de arranque con tarjeta personal', 2, 4, 'Candado personal por mecánico', 'Supervisor del subcontrato', 'Encargado del área', ['PT-MAN-01'], ['mecanico'], [], null],
    ['R-MAN-02', 0, 'Mantención', 'FT-MAN-01', 'Mecánico de maquinaria', 'Patio de maquinaria', 'Cuadrilla 4', 'Seguridad', 'Fluidos calientes o a presión', 'Quemaduras y proyección', 'Esperar enfriamiento; gafas y guantes de nitrilo', 2, 3, 'Despresurizar según manual del fabricante', 'Supervisor del subcontrato', 'Encargado del área', ['PT-MAN-01'], [], [], null],
    ['R-MAN-03', 0, 'Mantención', 'FT-MAN-01', 'Mecánico de maquinaria', 'Patio de maquinaria', 'Cuadrilla 4', 'Salud ocupacional', 'Contacto con aceites y combustibles', 'Dermatitis', 'Guantes de nitrilo', 3, 1, 'Lavado de manos disponible en el patio', 'Jefe de terreno', 'Prevención', ['PT-MAN-01', 'PT-SUS-01'], [], [], null],
    ['R-MAN-04', 0, 'Mantención', 'FT-MAN-01', 'Mecánico / Rigger', 'Patio de maquinaria', 'Cuadrilla 4 y peatones', 'Tránsito y maquinaria', 'Maquinaria en movimiento cerca del punto de mantención', 'Atropello', 'Segregación del área con conos', 2, 4, 'Señalero durante el movimiento de la máquina', 'Supervisor del subcontrato', 'Encargado del área', ['PT-MAN-01', 'PT-MAQ-01'], [], [], null]
  ];
  // Registro de aspectos e impactos ambientales (separado de los riesgos laborales)
  var AMBIENTAL = [
    ['AI-01', 'FT-MAN-01', 'Derrame de aceite o hidráulico', 'Contaminación del suelo', 'Suelo', 'Bandeja y kit antiderrame; contenedor rotulado', 'PT-DER-01'],
    ['AI-02', 'FT-MAN-01', 'Generación de residuos peligrosos (filtros, paños, aceite usado)', 'Contaminación por mala disposición', 'Suelo y agua', 'Contenedor rotulado; retiro por gestor autorizado (por confirmar)', 'PT-EME-01'],
    ['AI-03', 'FT-MOL-01', 'Residuos de madera y despuntes', 'Ocupación de vertedero', 'Residuos', 'Separación en patio de residuos para reutilización', 'PT-EME-01'],
    ['AI-04', 'FT-MOL-01', 'Ruido de sierra hacia vecinos', 'Molestia a la comunidad', 'Comunidad', 'Horario de corte acotado; taller lejos del cierre (nivel no medido)', 'PT-HER-01'],
    ['AI-05', null, 'Aguas de lavado de camiones de hormigón', 'Contaminación de suelo y alcantarillado', 'Agua', 'Piscina de decantación (por definir)', 'PT-HOR-01'],
    ['AI-06', null, 'Polvo por tránsito de maquinaria', 'Emisión de material particulado', 'Aire', 'Humectación de caminos (frecuencia por definir)', 'PT-MAQ-01']
  ];

  // ---------- 7. Áreas fijas y variables ----------
  // [id, nombre, zona, tipo, etapas (desde, hasta), piso, trabajos, peligros, encargado, eppArea]
  var AREAS = [
    ['AR-TER-01', 'Terreno del proyecto (reconocimiento)', 'Z-EXT', 'variable', [1, 3], null, [], ['Terreno irregular', 'Vegetación y escombros'], '001'],
    ['AR-TAL-01', 'Taller de moldajes', 'Z-FAE', 'fija', [2, 12], null, ['FT-MOL-01'], ['Sierra circular en uso', 'Acopio de placas', 'Cables eléctricos'], '007'],
    ['AR-TAL-02', 'Taller de enfierradura', 'Z-FAE', 'fija', [2, 8], null, ['FT-SOL-01'], ['Barras de acero con puntas', 'Dobladora en uso'], '007'],
    ['AR-BOD-01', 'Bodega general', 'Z-FAE', 'fija', [2, 15], null, [], ['Estanterías en altura', 'Manejo manual de cargas'], '001'],
    ['AR-BOD-02', 'Bodega de sustancias peligrosas', 'Z-FAE', 'fija', [2, 15], null, [], ['Sustancias inflamables y corrosivas'], '001'],
    ['AR-ACO-01', 'Acopio de materiales', 'Z-FAE', 'fija', [2, 15], null, ['FT-MTL-01'], ['Tránsito de grúa y camiones', 'Caída de material acopiado'], '001'],
    ['AR-RES-01', 'Patio de residuos', 'Z-FAE', 'fija', [2, 15], null, [], ['Residuos cortantes', 'Residuos peligrosos'], '001'],
    ['AR-MAQ-01', 'Patio de maquinaria', 'Z-FAE', 'fija', [2, 14], null, ['FT-MAN-01'], ['Maquinaria en movimiento', 'Fluidos a presión', 'Derrames de aceite'], '001', [{ id: 'a_chaleco', nombre: 'Chaleco reflectante', icono: '🦺', cita: 'EST-EPP-DEMO v1 §5.1' }]],
    ['AR-EXC-01', 'Excavación de fundaciones', 'Z-EDI', 'variable', [4, 5], null, ['FT-MAN-01'], ['Bordes de excavación', 'Maquinaria en movimiento'], '001'],
    ['AR-P1', 'Frente de trabajo · piso 1', 'Z-EDI', 'variable', [6, 12], 1, ['FT-MOL-01', 'FT-ALT-01'], ['Borde de losa', 'Moldajes y alzaprimas', 'Caída de objetos'], '008'],
    ['AR-P2', 'Frente de trabajo · piso 2', 'Z-EDI', 'variable', [6, 12], 2, ['FT-MOL-01', 'FT-ALT-01'], ['Borde de losa', 'Moldajes y alzaprimas', 'Caída de objetos'], '008'],
    ['AR-P3', 'Frente de trabajo · piso 3', 'Z-EDI', 'variable', [6, 12], 3, ['FT-MOL-01', 'FT-ALT-01'], ['Borde de losa', 'Moldajes y alzaprimas', 'Caída de objetos'], '008'],
    ['AR-P4', 'Frente de trabajo · piso 4', 'Z-EDI', 'variable', [6, 12], 4, ['FT-MOL-01', 'FT-ALT-01'], ['Borde de losa', 'Moldajes y alzaprimas', 'Caída de objetos'], '008'],
    ['AR-P5', 'Frente de trabajo · piso 5', 'Z-EDI', 'variable', [6, 12], 5, ['FT-MOL-01', 'FT-ALT-01'], ['Borde de losa', 'Moldajes y alzaprimas', 'Caída de objetos'], '008'],
    ['AR-CUB', 'Cubierta', 'Z-EDI', 'variable', [9, 10], null, ['FT-ALT-01', 'FT-CUB-01', 'FT-MTL-01'], ['Borde de cubierta', 'Trabajos en caliente (membrana)'], '008'],
    ['AR-FAC', 'Fachadas y andamios perimetrales', 'Z-EDI', 'variable', [10, 12], null, ['FT-ALT-01'], ['Andamios', 'Caída de objetos a la vía'], '008'],
    ['AR-EXT', 'Obras exteriores y áreas comunes', 'Z-EXT', 'variable', [13, 15], null, ['FT-MAN-01'], ['Tránsito de maquinaria', 'Zanjas abiertas'], '001']
  ];

  // ---------- 6. Fichas de tarea: Procedimiento → Riesgos y controles → Preguntas → Requisitos → Verificaciones → Aprobadores → Permisos ----------
  function fichas(hoy) {
    var base = { estado: 'VALIDADA', validadaPor: pid('002'), validadaEn: hoy, simulacion: true };
    var pel = function (id) { var r = MATRIZ.filter(function (x) { return x[0] === id; })[0]; return { peligro: r[8], riesgo: r[9], control: r[10] + (r[13] ? '. ' + r[13] : ''), cita: 'MR-DEMO-01 ' + id, fila: id }; };
    return [
      Object.assign({}, base, {
        id: 'FT-MOL-01', nombre: 'Armado e instalación de moldajes de muros y losas', documento: 'PT-MOL-01', matriz: ['R-MOL-01', 'R-MOL-02', 'R-MOL-03', 'R-MOL-04', 'R-MOL-05', 'R-MOL-06'], ambiental: ['AI-03', 'AI-04'],
        claves: ['moldaje', 'tablero', 'placa', 'encofrado', 'carpint', 'losa', 'muro', 'sierra'], descripcion: 'Trazado, corte y armado de moldajes de madera y placas para muros y losas.',
        referencias: ['PT-MOL-01', 'PT-HER-01', 'MR-DEMO-01', 'EST-EPP-DEMO'],
        pasos: [{ texto: 'Revisar el plano de moldaje y el acopio de placas.', cita: 'PT-MOL-01 v2 §6.1' }, { texto: 'Cortar las placas en el mesón, con la sierra con su protección de disco.', cita: 'PT-HER-01 v1 §5.3' }, { texto: 'Armar y aplomar paneles; instalar alzaprimas según el plano.', cita: 'PT-MOL-01 v2 §6.3' }, { texto: 'Acopiar lo sobrante sin obstruir pasillos.', cita: 'PT-MOL-01 v2 §6.5' }],
        peligros: ['R-MOL-01', 'R-MOL-02', 'R-MOL-03', 'R-MOL-04', 'R-MOL-05', 'R-MOL-06'].map(pel),
        preguntas: [{ id: 'sierra', texto: '¿Utilizará una sierra circular?', herramienta: 'la sierra circular', detectar: ['sierra circular', 'sierra electrica', 'circular'], cita: 'PT-HER-01 v1 §5' }],
        requisitos: [
          { id: 'guantes', tipo: 'epp', nombre: 'Guantes de cabritilla', icono: '🧤', nivel: 'declarado', cita: 'PT-MOL-01 v2 §7.1' },
          { id: 'pantalla', tipo: 'epp', nombre: 'Pantalla facial (protector facial)', icono: '🛡️', nivel: 'declarado', si: 'sierra', critico: true, verifica: 'encargado', cita: 'MR-DEMO-01 R-MOL-02' },
          { id: 'auditivo', tipo: 'epp', nombre: 'Protector auditivo', icono: '🎧', nivel: 'declarado', si: 'sierra', cita: 'MR-DEMO-01 R-MOL-03' },
          { id: 'guarda', tipo: 'condicion', nombre: 'Sierra con protección de disco y cuchillo divisor', icono: '🪚', nivel: 'responsable', si: 'sierra', critico: true, verifica: 'encargado', cita: 'MR-DEMO-01 R-MOL-01' },
          { id: 'extensiones', tipo: 'condicion', nombre: 'Extensiones aéreas y tablero con diferencial', icono: '🔌', nivel: 'responsable', si: 'sierra', cita: 'MR-DEMO-01 R-MOL-06' },
          { id: 'acopio', tipo: 'condicion', nombre: 'Acopio definido sin obstruir pasillos', icono: '📦', nivel: 'responsable', cita: 'PT-MOL-01 v2 §6.5' },
          { id: 'comp_sierra', tipo: 'competencia', competencia: 'sierra_circular', nombre: 'Capacitación en uso de sierra circular', icono: '🎓', nivel: 'sistema', si: 'sierra', cita: 'PT-HER-01 v1 §4' }
        ],
        permisos: [], aprobaciones: []
      }),
      Object.assign({}, base, {
        id: 'FT-ALT-01', nombre: 'Instalación de barandas perimetrales en borde de losa', documento: 'PT-ALT-01', matriz: ['R-ALT-01', 'R-ALT-02', 'R-ALT-03', 'R-ALT-04'], ambiental: [],
        claves: ['baranda', 'borde de losa', 'altura', 'arnes', 'perimetral', 'linea de vida'], descripcion: 'Instalación de barandas provisorias en el borde de la losa del piso en ejecución, con riesgo de caída a distinto nivel.',
        referencias: ['PT-ALT-01', 'MR-DEMO-01', 'FOR-PTA-DEMO', 'EST-EPP-DEMO'],
        pasos: [{ texto: 'Verificar la línea de vida y el permiso de trabajo en altura antes de acercarse al borde.', cita: 'PT-ALT-01 v2 §6.1' }, { texto: 'Delimitar la zona inferior.', cita: 'PT-ALT-01 v2 §6.2' }, { texto: 'Conectarse a la línea de vida antes de llegar al borde y mantener siempre una cola conectada.', cita: 'PT-ALT-01 v2 §6.3' }, { texto: 'Instalar postes y barandas; herramientas amarradas.', cita: 'PT-ALT-01 v2 §6.4' }],
        peligros: ['R-ALT-01', 'R-ALT-02', 'R-ALT-03', 'R-ALT-04'].map(pel),
        preguntas: [],
        requisitos: [
          { id: 'arnes', tipo: 'epp', nombre: 'Arnés de cuerpo completo con doble cola', icono: '🪢', nivel: 'declarado', critico: true, verifica: 'encargado', cita: 'MR-DEMO-01 R-ALT-01' },
          { id: 'legionario', tipo: 'epp', nombre: 'Legionario y bloqueador solar', icono: '🧢', nivel: 'declarado', cita: 'MR-DEMO-01 R-ALT-03' },
          { id: 'linea_vida', tipo: 'condicion', nombre: 'Línea de vida instalada y revisada por Prevención', icono: '🔗', nivel: 'responsable', critico: true, verifica: 'especializada', cita: 'MR-DEMO-01 R-ALT-01' },
          { id: 'zona_inferior', tipo: 'condicion', nombre: 'Zona inferior delimitada', icono: '🚧', nivel: 'responsable', cita: 'MR-DEMO-01 R-ALT-02' },
          { id: 'comp_altura', tipo: 'competencia', competencia: 'trabajo_altura', nombre: 'Capacitación en trabajo en altura', icono: '🎓', nivel: 'sistema', cita: 'PT-ALT-01 v2 §4' },
          { id: 'examen_altura', tipo: 'competencia', competencia: 'examen_altura', nombre: 'Examen de altura física vigente', icono: '🩺', nivel: 'sistema', cita: 'PT-ALT-01 v2 §3' }
        ],
        permisos: [{ id: 'PTA', nombre: 'Permiso de trabajo en altura', formato: 'FOR-PTA-DEMO', revisa: 'encargado_area', autoriza: 'prevencion', cita: 'PT-ALT-01 v2 §8',
          condiciones: ['Línea de vida instalada y revisada', 'Zona inferior delimitada', 'Plan de rescate conocido por la cuadrilla'] }],
        aprobaciones: [{ calidad: 'prevencion', modo: 'presencial', cita: 'PT-ALT-01 v2 §9' }]
      }),
      Object.assign({}, base, {
        id: 'FT-MAN-01', nombre: 'Mantención de maquinaria en terreno', documento: 'PT-MAN-01', matriz: ['R-MAN-01', 'R-MAN-02', 'R-MAN-03', 'R-MAN-04'], ambiental: ['AI-01', 'AI-02'],
        claves: ['mantencion', 'retroexcavadora', 'excavadora', 'aceite', 'filtro', 'maquina', 'maquinaria', 'engrase', 'hidraulic'], descripcion: 'Mantención o reparación de maquinaria en el lugar donde trabaja, con revisión ambiental si hay manejo de fluidos.',
        referencias: ['PT-MAN-01', 'PT-DER-01', 'RA-DEMO-01', 'MR-DEMO-01', 'EST-EPP-DEMO'],
        pasos: [{ texto: 'Detener la máquina, bajar implementos y bloquear el arranque con candado personal.', cita: 'PT-MAN-01 v1 §6.1' }, { texto: 'Segregar el área con conos.', cita: 'MR-DEMO-01 R-MAN-04' }, { texto: 'Instalar bandeja antiderrame bajo el punto de trabajo.', cita: 'PT-DER-01 v1 §4' }, { texto: 'Mantener según el manual del fabricante; residuos al contenedor rotulado.', cita: 'PT-DER-01 v1 §6' }],
        peligros: ['R-MAN-01', 'R-MAN-02', 'R-MAN-03', 'R-MAN-04'].map(pel),
        preguntas: [{ id: 'fluidos', texto: '¿Habrá cambio de aceite o manejo de fluidos?', herramienta: 'el manejo de fluidos', detectar: ['cambio de aceite', 'aceite', 'fluido', 'hidraulic'], cita: 'RA-DEMO-01 AI-01' }],
        requisitos: [
          { id: 'nitrilo', tipo: 'epp', nombre: 'Guantes de nitrilo', icono: '🧤', nivel: 'declarado', cita: 'MR-DEMO-01 R-MAN-03' },
          { id: 'bloqueo', tipo: 'condicion', nombre: 'Máquina detenida y con bloqueo de arranque', icono: '🔒', nivel: 'responsable', critico: true, verifica: 'encargado', cita: 'MR-DEMO-01 R-MAN-01' },
          { id: 'conos', tipo: 'condicion', nombre: 'Área segregada con conos', icono: '🚧', nivel: 'responsable', cita: 'MR-DEMO-01 R-MAN-04' },
          { id: 'bandeja', tipo: 'condicion', nombre: 'Bandeja y kit antiderrame en el lugar', icono: '🛢️', nivel: 'responsable', si: 'fluidos', cita: 'RA-DEMO-01 AI-01' },
          { id: 'comp_mec', tipo: 'competencia', competencia: 'mecanico', nombre: 'Mecánico de maquinaria acreditado', icono: '🎓', nivel: 'sistema', cita: 'PT-MAN-01 v1 §4' }
        ],
        permisos: [], aprobaciones: [],
        aprobacionesSi: { fluidos: [{ calidad: 'medio_ambiente', modo: 'documental', cita: 'PT-DER-01 v1 §3' }] }
      }),
      Object.assign({}, base, {
        id: 'FT-CUB-01', nombre: 'Instalación de cubierta con planchas de zinc', documento: 'PT-CUB-01', matriz: ['R-CUB-01', 'R-CUB-02', 'R-CUB-03', 'R-CUB-04'], ambiental: [],
        claves: ['zinc', 'plancha', 'techumbre', 'cubierta', 'techo', 'tejado'], descripcion: 'Instalación de planchas de zinc sobre la estructura de techumbre, con riesgo de caída a distinto nivel.',
        referencias: ['PT-CUB-01', 'PT-ALT-01', 'MR-DEMO-01', 'FOR-PTA-DEMO', 'EST-EPP-DEMO'],
        pasos: [{ texto: 'Revisar el viento y la línea de vida antes de subir.', cita: 'PT-CUB-01 v1 §6.1' }, { texto: 'Subir las planchas amarradas; recibirlas entre dos personas.', cita: 'PT-CUB-01 v1 §6.2' }, { texto: 'Fijar cada plancha antes de soltarla; nada suelto sobre la cubierta.', cita: 'PT-CUB-01 v1 §6.3' }],
        peligros: ['R-CUB-01', 'R-CUB-02', 'R-CUB-03', 'R-CUB-04'].map(pel),
        preguntas: [{ id: 'corte_zinc', texto: '¿Cortarán planchas con esmeril sobre la techumbre?', herramienta: 'el esmeril', detectar: ['esmeril', 'cortar plancha', 'cortaremos'], cita: 'MR-DEMO-01 R-CUB-04' }],
        requisitos: [
          { id: 'arnes', tipo: 'epp', nombre: 'Arnés de cuerpo completo con doble cola', icono: '🪢', nivel: 'declarado', critico: true, verifica: 'encargado', cita: 'MR-DEMO-01 R-CUB-01' },
          { id: 'guantes_corte', tipo: 'epp', nombre: 'Guantes anticorte', icono: '🧤', nivel: 'declarado', cita: 'MR-DEMO-01 R-CUB-02' },
          { id: 'pantalla', tipo: 'epp', nombre: 'Pantalla facial (protector facial)', icono: '🛡️', nivel: 'declarado', si: 'corte_zinc', critico: true, verifica: 'encargado', cita: 'MR-DEMO-01 R-CUB-04' },
          { id: 'linea_vida', tipo: 'condicion', nombre: 'Línea de vida instalada y revisada por Prevención', icono: '🔗', nivel: 'responsable', critico: true, verifica: 'especializada', cita: 'MR-DEMO-01 R-CUB-01' },
          { id: 'viento', tipo: 'condicion', nombre: 'Viento bajo el límite del procedimiento y planchas amarradas', icono: '🌬️', nivel: 'responsable', cita: 'MR-DEMO-01 R-CUB-03' },
          { id: 'comp_altura', tipo: 'competencia', competencia: 'trabajo_altura', nombre: 'Capacitación en trabajo en altura', icono: '🎓', nivel: 'sistema', cita: 'PT-ALT-01 v2 §4' },
          { id: 'examen_altura', tipo: 'competencia', competencia: 'examen_altura', nombre: 'Examen de altura física vigente', icono: '🩺', nivel: 'sistema', cita: 'PT-ALT-01 v2 §3' }
        ],
        permisos: [{ id: 'PTA', nombre: 'Permiso de trabajo en altura', formato: 'FOR-PTA-DEMO', revisa: 'encargado_area', autoriza: 'prevencion', cita: 'PT-ALT-01 v2 §8',
          condiciones: ['Línea de vida instalada y revisada', 'Zona inferior delimitada', 'Plan de rescate conocido por la cuadrilla'] }],
        aprobaciones: [{ calidad: 'prevencion', modo: 'presencial', cita: 'PT-ALT-01 v2 §9' }]
      }),
      Object.assign({}, base, {
        id: 'FT-MTL-01', nombre: 'Traslado de materiales con manipulador telescópico', documento: 'PT-MTL-01', matriz: ['R-MTL-01', 'R-MTL-02', 'R-MTL-03'], ambiental: [],
        claves: ['manipulador', 'telescopico', 'manitou', 'horquilla'], descripcion: 'Traslado y elevación de materiales sobre horquillas con manipulador telescópico (no carga suspendida ni personas).',
        referencias: ['PT-MTL-01', 'MR-DEMO-01', 'FOR-INS-MTL', 'EST-EPP-DEMO'],
        pasos: [{ texto: 'Inspección pre-uso del equipo al inicio del día.', cita: 'FOR-INS-MTL v1' }, { texto: 'Delimitar la zona de maniobra y asignar señalero.', cita: 'MR-DEMO-01 R-MTL-03' }, { texto: 'Trasladar la carga amarrada sobre horquillas, según la tabla de carga.', cita: 'PT-MTL-01 v1 §6.2' }],
        peligros: ['R-MTL-01', 'R-MTL-02', 'R-MTL-03'].map(pel),
        // D-043 §3: se pregunta la operación concreta; si es otra cosa (carga suspendida, elevar personas) no hay procedimiento vigente
        preguntas: [{ id: 'solo_traslado', texto: '¿El manipulador se utilizará únicamente para trasladar materiales?', detectar: ['solo para trasladar', 'unicamente para trasladar'], cita: 'PT-MTL-01 v1 §2',
          brechaSi: false, brechaTexto: 'El manipulador se usará para algo más que trasladar materiales (por ejemplo, carga suspendida o elevar personas). Esa operación no está cubierta por un procedimiento vigente: queda pendiente de revisión de Prevención.' }],
        roles: [{ id: 'op_manip', texto: '¿Operarás tú el manipulador telescópico?', nombre: 'Operador del manipulador telescópico', equipo: 'manipulador', obligatorio: true, cita: 'PT-MTL-01 v1 §4' }],
        equipos: [{ id: 'manipulador', tipo: 'manipulador_telescopico', nombre: 'Manipulador telescópico', cita: 'FOR-INS-MTL v1',
          inspeccion: ['Neumáticos y estabilizadores sin daño', 'Frenos y dirección operativos', 'Sin fugas hidráulicas', 'Alarma de retroceso y luces funcionando', 'Tabla de carga legible en la cabina'] }],
        requisitos: [
          { id: 'chaleco', tipo: 'epp', nombre: 'Chaleco reflectante', icono: '🦺', nivel: 'declarado', cita: 'MR-DEMO-01 R-MTL-03' },
          { id: 'zona_maniobra', tipo: 'condicion', nombre: 'Zona de maniobra delimitada y señalero asignado', icono: '🚧', nivel: 'responsable', critico: true, verifica: 'encargado', cita: 'MR-DEMO-01 R-MTL-03' },
          { id: 'comp_op_manip', tipo: 'competencia', competencia: 'operador_manipulador', rol: 'op_manip', nombre: 'Acreditación de operador de manipulador telescópico', icono: '🎓', nivel: 'sistema', cita: 'PT-MTL-01 v1 §4' },
          { id: 'cinturon', tipo: 'epp', rol: 'op_manip', nombre: 'Cinturón de seguridad de la cabina abrochado', icono: '🪑', nivel: 'declarado', cita: 'MR-DEMO-01 R-MTL-01' },
          { id: 'insp_mtl', ambito: 'equipo', equipo: 'manipulador', registro: 'inspeccion_preuso', tipo: 'condicion', nombre: 'Inspección pre-uso del día', icono: '📋', nivel: 'responsable', cita: 'FOR-INS-MTL v1' },
          { id: 'cert_mtl', ambito: 'equipo', equipo: 'manipulador', registro: 'certificacion', tipo: 'condicion', nombre: 'Certificación del equipo vigente', icono: '📄', nivel: 'responsable', cita: 'PT-MTL-01 v1 §5' }
        ],
        permisos: [], aprobaciones: []
      }),
      // Casos de brecha: cita un procedimiento faltante (PT-CAL-01) o uno que solo existe como borrador (PT-EXC-01)
      Object.assign({}, base, { id: 'FT-SOL-01', nombre: 'Soldadura de insertos metálicos', documento: 'PT-CAL-01', claves: ['soldar', 'soldadura', 'inserto', 'arco'], descripcion: 'Soldadura al arco de insertos y placas.', referencias: ['PT-CAL-01', 'MR-DEMO-01'], pasos: [], peligros: [], preguntas: [], requisitos: [], permisos: [], aprobaciones: [] }),
      Object.assign({}, base, { id: 'FT-EXC-01', nombre: 'Excavación con retroexcavadora', documento: 'PT-EXC-01', claves: ['excavar', 'excavacion', 'zanja', 'retro'], descripcion: 'Excavación masiva y de zanjas.', referencias: ['PT-EXC-01', 'PT-MAQ-01', 'MR-DEMO-01'], pasos: [], peligros: [], preguntas: [], requisitos: [], permisos: [], aprobaciones: [] })
    ];
  }

  // ---------- Activación de áreas según la etapa simulada ----------
  function activa(area, est) {
    if (!area.etapas) return true;
    if (est.etapa < area.etapas[0] || est.etapa > area.etapas[1]) return false;
    if (area.piso) { if (est.etapa === 6) return area.piso === 1; if (est.etapa === 7) return area.piso <= est.pisoActual; }
    return true;
  }
  function activar(db) { db.areas.forEach(function (a) { a.activa = activa(a, db.escenario.estado); }); return db; }

  // ---------- Construcción ----------
  function construir(o) {
    o = o || {};
    var db = N.preparar(D.preparar(L.preparar(T.preparar(C.preparar(A.semilla(o))))));
    S.preparar(db);
    var hoy = db.creadoEn, vence = function (dias) { var d = new Date(hoy); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
    var hab = JSON.parse(JSON.stringify(A.porId(db.personas, 'p-carlos').hab));
    ['induccion', 'instruccion'].forEach(function (k) { if (hab[k] && hab[k].verificadoPor) hab[k].verificadoPor = pid('002'); });
    var cuentas = db.personas.filter(function (p) { return ['p-admin', 'p-redaccion', 'p-revisor'].indexOf(p.id) >= 0; });
    cuentas.forEach(function (p) { p.empresa = P; p.rut = null; });
    var FUNC = { trabajador: 'ejecutante', operador: 'ejecutante', capataz: 'supervisor', supervisor: 'supervisor', jefe_terreno: 'supervisor', prevencion: 'verificador', medio_ambiente: 'verificador', calidad: 'verificador', mandante: 'aprobador' };
    db.empresas = EMPRESAS.map(function (e) { return Object.assign({ firma: 'PIN', simulacion: true }, e); });
    db.faena = { id: OBRA.codigo, nombre: OBRA.nombre + ' · 5 pisos · 100 departamentos', empresas: EMPRESAS.map(function (e) { return e.id; }) };
    db.personas = PLANTA.map(function (x, i) {
      var comps = {}, cargo = x[1];
      (COMP_CARGO[cargo] || []).forEach(function (k) { comps[k] = { nombre: COMP_TXT[k], vence: vence(300), verificadoPor: pid('002'), verificadoEn: hoy }; });
      if (x[0] === '014') delete comps.sierra_circular;
      if (x[0] === '024') comps.examen_altura.vence = vence(-5);
      if (x[0] === '045') comps.operador_manipulador = { nombre: COMP_TXT.operador_manipulador, vence: vence(300), verificadoPor: pid('002'), verificadoEn: hoy };
      if (x[0] === '030') { comps.trabajo_altura = { nombre: COMP_TXT.trabajo_altura, vence: vence(300), verificadoPor: pid('002'), verificadoEn: hoy }; comps.examen_altura = { nombre: COMP_TXT.examen_altura, vence: vence(300), verificadoPor: pid('002'), verificadoEn: hoy }; }
      return { id: pid(x[0]), codigo: 'DEMO-' + x[0], rut: null, ingreso: 'DEMO-' + x[0], nombre: NOMBRES[i] + ' Demo', empresa: x[3], rol: x[2], cargo: cargo, funciones: x[4].slice(),
        hab: JSON.parse(JSON.stringify(hab)), comp: comps, pin: '0' + x[0], ausente: false, simulacion: true, funcionTerreno: x[0] === '005' ? 'ocasional' : FUNC[x[2]] || null, enNominaTerreno: true };
    }).concat(cuentas);
    db.zonas = [{ id: 'Z-FAE', nombre: 'Instalación de faena' }, { id: 'Z-EDI', nombre: 'Edificio' }, { id: 'Z-EXT', nombre: 'Exteriores y urbanización' }];
    db.areas = AREAS.map(function (x) {
      return { id: x[0], codigo: x[0], nombre: x[0] + ' · ' + x[1], zona: x[2], tipoArea: x[3], etapas: x[4], piso: x[5], qr: A.sha256('qr-demo-' + x[0]).slice(0, 32), qrVersion: 1, eppArea: x[9] || [],
        levantamiento: { verificadoPor: pid('002'), verificadoEn: hoy }, diagnostico: { trabajos: x[6], peligros: x[7], verificadoPor: pid('002'), verificadoEn: hoy } };
    });
    db.responsables = AREAS.map(function (x) { return { area: x[0], calidad: 'encargado_area', persona: pid(x[8]) }; }).concat(
      // Sustitución: si el capataz 008 se ausenta, lo reemplaza el 007 en los frentes de piso; si el jefe de terreno se ausenta, el 008 en el patio de maquinaria
      ['AR-P1', 'AR-P2', 'AR-P3', 'AR-P4', 'AR-P5'].map(function (a) { return { area: a, calidad: 'encargado_area', persona: pid('007'), reemplazaA: pid('008') }; }),
      [{ area: 'AR-MAQ-01', calidad: 'encargado_area', persona: pid('008'), reemplazaA: pid('001') }],
      ['Z-FAE', 'Z-EDI', 'Z-EXT'].reduce(function (l, z) { return l.concat([{ zona: z, calidad: 'prevencion', persona: pid('002') }, { zona: z, calidad: 'medio_ambiente', persona: pid('003') }, { zona: z, calidad: 'mandante', persona: pid('006') }, { zona: z, calidad: 'informado', persona: pid('004') }]); }, []),
      [{ empresa: SM, calidad: 'responsable_subcontrato', persona: pid('009') }, { empresa: SN, calidad: 'responsable_subcontrato', persona: pid('010') }]
    );
    var todo = ['consultar', 'crear', 'registrar_trabajadores', 'revisar', 'observar', 'aprobar', 'gestionar_pendientes', 'verificar_terreno'];
    db.asignaciones = db.personas.filter(function (p) { return ['trabajador', 'operador'].indexOf(p.rol) >= 0; }).map(function (p) { return { persona: p.id, permisos: ['consultar', 'crear'], alcance: { empresa: p.empresa } }; }).concat([
      { persona: pid('001'), permisos: todo.concat('configurar_areas', 'ver_historial'), alcance: { empresa: P } },
      { persona: pid('002'), permisos: todo.concat('configurar_areas', 'configurar', 'ver_historial'), alcance: { empresa: P } },
      { persona: pid('003'), permisos: ['consultar', 'revisar', 'observar', 'aprobar'], alcance: { empresa: P } },
      { persona: pid('004'), permisos: ['consultar', 'observar'], alcance: { empresa: P } },
      { persona: pid('006'), permisos: ['consultar', 'revisar', 'observar', 'aprobar'], alcance: { zonas: ['Z-FAE', 'Z-EDI', 'Z-EXT'] } },
      { persona: pid('007'), permisos: todo.concat('ver_historial'), alcance: { zonas: ['Z-FAE', 'Z-EDI'] } },
      { persona: pid('008'), permisos: todo.concat('ver_historial'), alcance: { zonas: ['Z-FAE', 'Z-EDI'] } },
      { persona: pid('009'), permisos: todo, alcance: { contrato: SM } },
      { persona: pid('010'), permisos: todo, alcance: { contrato: SN } }
    ]);
    db.cuadrillas = CU.map(function (c, k) {
      return { id: c.id, nombre: 'Cuadrilla ' + (k + 1) + ' · ' + A.porId(db.personas, pid(c.resp)).nombre, empresa: c.empresa, responsable: pid(c.resp), reemplazo: c.reemp ? pid(c.reemp) : null, jefatura: pid('001'), turno: 'dia',
        integrantes: c.cargos.map(function (x, j) { return pid(String(11 + k * 10 + j).padStart(3, '0')); }) };
    });
    // Biblioteca documental: lo que existe como documento (vigente, reemplazado, en revisión o borrador). Lo «por elaborar» y lo faltante solo está en el inventario.
    var aprob = function (v) { return { nombre: 'Aprobación ficticia (' + ETIQUETA + ')', cargo: 'Experto en prevención de riesgos (simulación)', fecha: hoy, version: v }; };
    var doc = function (id, tipo, titulo, version, estado) {
      var d = { id: id, empresa: P, tipo: tipo === 'transversal' || tipo === 'actividad' ? 'procedimiento' : tipo, titulo: titulo, version: version, fecha: hoy, estado: estado, origen: 'empresa', simulacion: true, nota: ETIQUETA + ': no constituye documentación aprobada para una obra real.',
        responsables: { elaboro: 'p-redaccion', revisionTecnica: null, aprobo: null }, revisionesAdicionales: [], noVerificados: [], historial: [{ estado: estado, por: pid('002'), en: hoy + 'T12:00:00.000Z', nota: ETIQUETA }] };
      if (estado === 'VIGENTE' || estado === 'REEMPLAZADO') { d.aprobacion = aprob(version); d.vigenteDesde = hoy; }
      return d;
    };
    var docs = [doc('PT-MOL-01', 'actividad', 'Armado e instalación de moldajes de muros y losas', '1', 'REEMPLAZADO')];
    docs[0].reemplazadoPor = '2';
    PROCS.forEach(function (x) { if (['POR_ELABORAR', 'FALTANTE'].indexOf(x[3]) < 0) docs.push(doc(x[0], x[1], x[2], VERSION_DOC[x[0]] || '1', x[3])); });
    OTROS_DOCS.forEach(function (x) { docs.push(doc(x.id, x.tipo, x.titulo, x.version, 'VIGENTE')); });
    db.biblioteca = { ficticia: true, simulacion: true, documentos: docs, documentoPendiente: null,
      eppBasicos: [['b_casco', 'Casco de seguridad', '⛑️', '§4.1'], ['b_barbiquejo', 'Barbiquejo', '🪖', '§4.1'], ['b_lentes', 'Gafas de seguridad o antiparras', '🥽', '§4.2'], ['b_calzado', 'Calzado de seguridad', '🥾', '§4.3'], ['b_ropa', 'Ropa de trabajo', '👷', '§4.4']]
        .map(function (x) { return { id: x[0], tipo: 'epp', nombre: x[1], icono: x[2], nivel: 'declarado', cita: 'EST-EPP-DEMO v1 ' + x[3] }; }),
      fichas: fichas(hoy) };
    // Aprendizaje: contratos, revisor competente y cápsulas ligadas a las fichas del escenario
    var MAPA = { 'TA-03': 'FT-MOL-01', 'TA-09': 'FT-ALT-01', 'TA-12': 'FT-MAN-01', 'e-principal': P, 'e-contratista': SM };
    db.aprendizaje.contratos = {}; db.aprendizaje.contratos[P] = { activo: true, minutos: 5, diasCiclo: 14 }; db.aprendizaje.contratos[SM] = { activo: true, minutos: 5, diasCiclo: 14 };
    db.aprendizaje.revisores = [pid('002')]; db.aprendizaje.progreso = {};
    db.aprendizaje.capsulas = db.aprendizaje.capsulas.filter(function (c) { return !c.areas.length; }).map(function (c) {
      c.fichas = c.fichas.map(function (f) { return MAPA[f] || f; }); if (c.empresa) c.empresa = MAPA[c.empresa] || c.empresa;
      if (c.revisadaPor) c.revisadaPor = pid('002'); return c;
    });
    db.aprendizaje.capsulas.forEach(function (c) { if (/^Carpintero$/.test(c.cargos[0] || '') && c.cargos.indexOf('Carpintero moldajista') < 0) c.cargos.push('Carpintero moldajista'); });
    [['CAP-ALT-D1', 'Borde de losa: conectado antes de acercarte', 'FT-ALT-01', ['Instalador de barandas y andamios'], 'R-ALT-01', ['Antes de llegar al borde, conéctate a la línea de vida.', 'Siempre una cola conectada.', 'Si la línea de vida no tiene su revisión del día, no se sube.'], '¿Cuándo te conectas a la línea de vida?', ['Al llegar al borde', 'Antes de acercarte al borde', 'Si el capataz lo pide'], 1],
     ['CAP-MAN-D1', 'Mantención: bloqueo y bandeja antes de abrir', 'FT-MAN-01', ['Mecánico de maquinaria'], 'R-MAN-01', ['Máquina detenida, implementos abajo y tu candado puesto.', 'Bandeja antiderrame antes de soltar un tapón.', 'Los residuos van al contenedor rotulado.'], '¿Qué va antes de abrir un tapón de aceite?', ['La bandeja antiderrame', 'El balde', 'Nada'], 0],
     ['CAP-MOL-D1', 'Moldajes: alzaprimas según plano', 'FT-MOL-01', ['Carpintero', 'Carpintero moldajista'], 'R-MOL-05', ['Las alzaprimas se ponen donde dice el plano, no donde sobra espacio.', 'Placas pesadas: entre dos o con carro.', 'Avísale al capataz si falta una alzaprima.'], '¿Dónde van las alzaprimas?', ['Donde quepan', 'Según el plano de moldaje', 'Cada dos metros siempre'], 1]
    ].forEach(function (x) {
      db.aprendizaje.capsulas.push({ id: x[0], tipo: 'refuerzo', titulo: x[1], tema: 'Escenario de simulación', cargos: x[3], areas: [], fichas: [x[2]], herramientas: [], riesgo: x[4], medida: x[1], duracion: 30, procedimiento: 'MR-DEMO-01 ' + x[4], version: '1', vigencia: '2027-12-31', empresa: null,
        fuentes: [{ tipo: 'matriz', ref: 'MR-DEMO-01', titulo: 'Matriz maestra (' + ETIQUETA + ')', version: '1' }], estado: 'PUBLICADA', revisadaPor: pid('002'), fechaRevision: hoy, historial: [{ estado: 'PUBLICADA', en: hoy }], simulacion: true,
        partes: x[5], pregunta: { texto: x[6], opciones: x[7], correcta: x[8] } });
    });
    db.servicios = {}; db.servicios[P] = { plataforma: true, capsulas: true, documental: true }; db.servicios[SM] = { plataforma: true, capsulas: true, documental: false }; db.servicios[SN] = { plataforma: true, capsulas: false, documental: false }; db.servicios[M] = { plataforma: false, capsulas: false, documental: false };
    db.aprobadoresDoc = {}; db.aprobadoresDoc[P] = [{ persona: pid('002'), cargo: 'Experto en prevención de riesgos (aprobación ficticia)' }, { persona: pid('001'), cargo: 'Jefe de terreno (aprobación ficticia)' }];
    // Reglas de la empresa del escenario (D-042)
    Object.assign(db.config, { vigenciaAstHoras: 12, intentosPin: 3, mandanteAutorizaSubcontratos: true, prevencionSiempre: false });
    // Base limpia: sin AST, avisos ni registros de la demo anterior. Lo del modo «tarea crítica» (T01) no forma parte del escenario.
    db.asts = []; db.avisos = []; db.charlas = []; db.hallazgos = []; db.obsArea = []; db.fotos = []; db.rotacion = {}; db.solicitudesDoc = []; db.comunicacionesDoc = [];
    db.nominaExcepciones = []; db.nominaGestiones = []; db.nominaControles = []; db.capsulas = []; db.cola = []; db.colaLocal = []; db.idsAplicados = {}; db.sincronizaciones = []; db.seq = 0; db.eventos = [];
    db.equipos = []; db.accesorios = []; db.discrepancias = []; db.tareas = [];
    // D-043 §4: equipos con registro en el sistema (SIMULACIÓN). EQ-MT-01 ya tiene la inspección pre-uso de hoy; EQ-MT-02 no.
    db.inspecciones = [{ id: 'IN-0000', unidad: 'EQ-MT-01', ast: null, por: pid('045'), en: (o.reloj || hoy + 'T11:30:00.000Z').slice(0, 10) + 'T10:30:00.000Z', resultado: 'CONFORME', items: [], simulacion: true, cita: 'FOR-INS-MTL v1' }];
    db.equiposObra = [
      { id: 'EQ-MT-01', tipo: 'manipulador_telescopico', nombre: 'Manipulador telescópico EQ-MT-01', empresa: SN, certificacion: { vence: vence(200), entidad: 'Entidad certificadora (simulación)' }, inspecciones: [db.inspecciones[0]], simulacion: true },
      { id: 'EQ-MT-02', tipo: 'manipulador_telescopico', nombre: 'Manipulador telescópico EQ-MT-02', empresa: SN, certificacion: { vence: vence(120), entidad: 'Entidad certificadora (simulación)' }, inspecciones: [], simulacion: true }
    ];
    db.escenario = {
      codigo: P, etiqueta: ETIQUETA, obra: OBRA, estado: { etapa: o.etapa || 7, pisoActual: o.pisoActual || 2 }, metodologia: METODO,
      etapas: ETAPAS.map(function (e) { return { n: e[0], nombre: e[1], tareas: e[2].map(function (t, j) { return { id: 'E' + String(e[0]).padStart(2, '0') + '-T' + (j + 1), nombre: t[0], procedimientos: t[1], ficha: t[2] || null }; }) }; }),
      auxiliares: AUXILIARES.map(function (t, j) { return { id: 'AUX-' + (j + 1), nombre: t[0], procedimientos: t[1], ficha: t[2] || null }; }),
      procedimientos: PROCS.map(function (x) { return { id: x[0], tipo: x[1], titulo: x[2], estado: x[3] }; }),
      matriz: MATRIZ.map(function (r) { return { id: r[0], etapa: r[1] || 'Auxiliar', actividad: r[2], tarea: r[3], puesto: r[4], ubicacion: r[5], expuestos: r[6], categoria: r[7], peligro: r[8], consecuencia: r[9], controles: r[10],
        evaluacion: { p: r[11], c: r[12], valor: r[11] * r[12], nivel: nivel(r[11] * r[12]), supuesto: true }, medidas: r[13], implementa: r[14], verifica: r[15], procedimientos: r[16], capacitacion: r[17], permisos: r[18], exposicion: r[19] || 'NO_APLICA' }; }),
      ambiental: AMBIENTAL.map(function (r) { return { id: r[0], tarea: r[1], aspecto: r[2], impacto: r[3], componente: r[4], controles: r[5], documento: r[6], evaluacion: 'Sin evaluar: supuesto de simulación' }; })
    };
    activar(db);
    A.registrar(db, { tipo: 'ESCENARIO', actor: 'p-admin', datos: { escenario: P, etiqueta: ETIQUETA, etapa: db.escenario.estado.etapa, pisoActual: db.escenario.estado.pisoActual } });
    return db;
  }

  // Cambiar la etapa simulada: activa y desactiva áreas. No cierra AST abiertas (eso lo deciden los responsables).
  function aplicar(db, ev) {
    var actor = A.porId(db.personas, ev.actor), d = ev.datos || {};
    var rech = function (m) { A.registrar(db, { tipo: 'TRANSICION_RECHAZADA', actor: ev.actor, datos: { intento: ev.tipo, motivo: m, faltantes: [] } }); return { ok: false, motivo: m }; };
    if (!db.escenario) return rech('No hay escenario cargado');
    if (ev.tipo !== 'E_ETAPA') return rech('Evento desconocido: ' + ev.tipo);
    if (!actor || ['prevencion', 'jefe_terreno'].indexOf(actor.rol) < 0) return rech('Cambia la etapa el jefe de terreno o Prevención');
    if (!(d.etapa >= 1 && d.etapa <= 15)) return rech('Etapa entre 1 y 15');
    var antes = db.areas.filter(function (a) { return a.activa; }).map(function (a) { return a.id; });
    db.escenario.estado = { etapa: +d.etapa, pisoActual: Math.min(5, Math.max(1, +d.pisoActual || db.escenario.estado.pisoActual)) };
    activar(db);
    var ahora = db.areas.filter(function (a) { return a.activa; }).map(function (a) { return a.id; });
    var e = A.registrar(db, { tipo: 'E_ETAPA', actor: actor.id, datos: { etapa: db.escenario.estado.etapa, pisoActual: db.escenario.estado.pisoActual, activadas: ahora.filter(function (x) { return antes.indexOf(x) < 0; }), desactivadas: antes.filter(function (x) { return ahora.indexOf(x) < 0; }) } });
    return { ok: true, evento: e, activas: ahora };
  }

  // §6: cada elemento de la ficha debe citar una fuente existente (documento cargado o fila de la matriz / registro ambiental)
  function trazabilidad(db, fichaId) {
    var f = C.ficha(db, fichaId), sueltos = [];
    var fuenteOk = function (cita) {
      if (!cita) return false;
      var t = cita.split(' '), docId = t[0];
      if (docId === 'MR-DEMO-01') return db.escenario.matriz.some(function (r) { return r.id === t[1]; });
      if (docId === 'RA-DEMO-01') return db.escenario.ambiental.some(function (r) { return r.id === t[1]; });
      var v = (t[1] || '').replace(/^v/, '');
      return db.biblioteca.documentos.some(function (d) { return d.id === docId && (!v || d.version === v) && d.estado === 'VIGENTE'; });
    };
    var revisar = function (tipo, lista) { (lista || []).forEach(function (x) { if (!fuenteOk(x.cita)) sueltos.push(tipo + ' «' + (x.texto || x.nombre || x.peligro || x.calidad) + '» (' + (x.cita || 'sin cita') + ')'); }); };
    revisar('paso', f.pasos); revisar('peligro', f.peligros); revisar('rol', f.roles); revisar('equipo', f.equipos); revisar('pregunta', f.preguntas); revisar('requisito', f.requisitos); revisar('permiso', f.permisos); revisar('aprobación', f.aprobaciones);
    Object.keys(f.aprobacionesSi || {}).forEach(function (k) { revisar('aprobación', f.aprobacionesSi[k]); });
    (f.matriz || []).forEach(function (id) { var r = db.escenario.matriz.filter(function (x) { return x.id === id; })[0]; if (!r) sueltos.push('fila de matriz ' + id + ' inexistente'); else if (r.procedimientos.some(function (pp) { return !db.escenario.procedimientos.some(function (q) { return q.id === pp; }); })) sueltos.push('fila ' + id + ' cita un procedimiento fuera del inventario'); });
    return sueltos;
  }
  // Vista filtrada de la matriz por área (según los trabajos permitidos) o por puesto/especialidad
  function matrizFiltrada(db, filtro) {
    filtro = filtro || {};
    var area = filtro.area ? A.porId(db.areas, filtro.area) : null;
    return db.escenario.matriz.filter(function (r) {
      if (area && area.diagnostico.trabajos.indexOf(r.tarea) < 0) return false;
      if (filtro.puesto && r.puesto.toLowerCase().indexOf(filtro.puesto.toLowerCase()) < 0) return false;
      if (filtro.categoria && r.categoria !== filtro.categoria) return false;
      if (filtro.etapa && r.etapa !== filtro.etapa) return false;
      return true;
    });
  }

  var E = { construir: construir, aplicar: aplicar, activar: activar, trazabilidad: trazabilidad, matrizFiltrada: matrizFiltrada, nivel: nivel, ETIQUETA: ETIQUETA, EMPRESAS: { P: P, SM: SM, SN: SN, M: M }, pid: pid };
  if (typeof module !== 'undefined') module.exports = E; else g.ASTRA_E = E;
})(this);
