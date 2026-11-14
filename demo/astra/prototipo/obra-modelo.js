// ASTRA · «Obra Modelo — Edificio Los Aromos» (D-044). SIMULACIÓN — PROTOTIPO.
// Segundo escenario, aparte de «Constructora Demostración» (que tiene brechas a propósito y no se toca): la misma idea de obra
// (edificio de 5 pisos) pero con TODO en regla: 63 personas ficticias, procedimientos vigentes con contenido de PTS, fichas completas
// para las tareas críticas, MIPER con los campos del DS 44 y metodología P×C configurable, y el módulo de cumplimiento (cumplimiento.js)
// activo con todos sus registros al día. Nada de este archivo es documentación aprobada para una obra real.
// Se arma con los mismos motores de la demo (parte de `E.construir`) y reemplaza el mundo; el cumplimiento se carga con eventos K_*
// reales (con actor y firma por PIN), sin atajos, para que un simulador pueda partir de un mundo que pasa su propia auditoría.
(function (g) {
  'use strict';
  var req = function (n, glob) { return (typeof module !== 'undefined') ? require('./' + n) : g[glob]; };
  var A = req('motor.js', 'ASTRA'), C = req('cuadrilla.js', 'ASTRA_C'), E = req('escenario.js', 'ASTRA_E'), K = req('cumplimiento.js', 'ASTRA_K');
  var ETIQUETA = 'SIMULACIÓN — PROTOTIPO';
  var P = 'EMP-MOD-001', SM = 'EMP-MOD-002', SN = 'EMP-MOD-003', SC = 'EMP-MOD-004', M = 'EMP-MOD-005';
  var pid = function (n) { return 'mod-' + String(n).padStart(3, '0'); };
  var pin = function (id) { return '0' + String(id).slice(4); };   // PIN de prueba deducible: mod-013 → 0013

  // ---------- 1. Empresas y obra ----------
  var OBRA = {
    codigo: 'OBRA-MOD-001', nombre: 'Obra Modelo — Edificio Los Aromos', empresa: P,
    descripcion: 'Edificio habitacional de 5 pisos, 20 departamentos por piso, 100 departamentos en total. Obra ficticia que cumple la normativa preventiva, para probar la aplicación.',
    pisos: 5, deptosPorPiso: 20, deptos: 100, duracionDias: 540,
    supuestos: ['Estructura de hormigón armado (supuesto del escenario).', 'Sin subterráneos (supuesto del escenario).', 'Más de 50 trabajadores en total: sistema de gestión de SST de la faena y reglamento especial (DS 76).'],
    pendientesNormativos: ['Necesidad de ascensores y otras condiciones arquitectónicas: pendientes de revisión normativa.', 'Lo que sigue marcado «por verificar» (NotebookLM) está pendiente de revisión con el prevencionista asesor o un abogado; lo confirmado o corregido con fuente oficial (VERIFICACION_NORMATIVA_2026-11-11) ya no lleva la marca.'],
    noAfirma: 'No se afirma que la obra cumpla íntegramente la normativa vigente: es una simulación para probar los procesos preventivos de la plataforma.'
  };
  var EMPRESAS = [
    { id: P, nombre: 'Constructora Los Aromos SpA', tipo: 'principal' },
    { id: SM, nombre: 'Moldajes Sur Modelo Ltda. (subcontrato)', tipo: 'contratista' },
    { id: SN, nombre: 'Montajes y Mantención Modelo Ltda. (subcontrato)', tipo: 'contratista' },
    { id: SC, nombre: 'Terminaciones Menores Modelo Ltda. (subcontrato chico)', tipo: 'contratista' },
    { id: M, nombre: 'Inmobiliaria Mandante Modelo S.A.', tipo: 'mandante' }
  ];

  // ---------- 2. Personas ficticias MOD-001 a MOD-063 (sin RUT) ----------
  var NOMBRES = ['Aurora', 'Bruno', 'Celia', 'Darío', 'Eva', 'Fabián', 'Gloria', 'Héctor', 'Irene', 'Joaquín', 'Karen', 'Lucas', 'Mónica', 'Nicolás', 'Olga', 'Pablo', 'Quintín', 'Rocío', 'Samuel', 'Tamara',
    'Ulises', 'Valeria', 'Walter', 'Ximena', 'Yolanda', 'Zacarías', 'Alba', 'Benito', 'Carla', 'Demian', 'Elsa', 'Franco', 'Gisela', 'Hernán', 'Inés', 'Julián', 'Lidia', 'Marcos', 'Nora', 'Óscar',
    'Patricia', 'Ramiro', 'Sara', 'Tobías', 'Úrsula', 'Vicente', 'Wanda', 'Yamil', 'Zoe', 'Adolfo', 'Abel', 'Berta', 'Cecilio', 'Dora', 'Emilio', 'Flavia', 'Gaspar', 'Hilda', 'Ignacio', 'Jazmín', 'Kevin', 'Luz', 'Mateo'];
  var COMP_TXT = { carpinteria: 'Oficio carpintería', sierra_circular: 'Uso de sierra circular', trabajo_altura: 'Trabajo en altura', examen_altura: 'Examen de altura física', armado_andamios: 'Armado de andamios', electrico: 'Instalaciones eléctricas',
    loto: 'Bloqueo y etiquetado de energías (LOTO)', mecanico: 'Mecánico de maquinaria acreditado', operador_maquinaria: 'Operación de retroexcavadora', excavacion: 'Curso de excavaciones y zanjas', operador_grua: 'Operación de grúa', operador_manipulador: 'Operador de manipulador telescópico acreditado',
    rigger: 'Rigger y señalero', soldadura: 'Soldadura al arco', trabajos_caliente: 'Autorización de trabajos en caliente', hormigonado: 'Hormigonado y vibrado', enfierradura: 'Enfierradura y uso de dobladora', mmc: 'Manejo manual de cargas (Ley 20.949)' };
  var COMP_CARGO = { 'Carpintero': ['carpinteria', 'sierra_circular', 'mmc'], 'Carpintero moldajista': ['carpinteria', 'sierra_circular', 'trabajo_altura', 'examen_altura', 'mmc'], 'Jornal': ['mmc'], 'Enfierrador': ['enfierradura', 'mmc'],
    'Albañil hormigonero': ['hormigonado', 'mmc'], 'Instalador de barandas y andamios': ['trabajo_altura', 'examen_altura', 'armado_andamios'], 'Techador / instalador de cubierta': ['trabajo_altura', 'examen_altura'], 'Excavador / zanjero': ['excavacion', 'mmc'],
    'Maestro eléctrico': ['electrico', 'loto'], 'Mecánico de maquinaria': ['mecanico', 'loto'], 'Operador de retroexcavadora': ['operador_maquinaria', 'excavacion'], 'Operador de grúa': ['operador_grua'], 'Operador de manipulador telescópico': ['operador_manipulador'],
    'Rigger / señalero': ['rigger'], 'Soldador': ['soldadura', 'trabajos_caliente'] };
  // [código, cargo, rol, empresa, funciones extra]
  var PLANTA = [
    ['001', 'Representante legal y administrador de obra', 'jefatura', P, ['aprobador_documentos']],
    ['002', 'Jefe de terreno', 'jefe_terreno', P, ['encargado_area', 'aprobador_documentos']],
    ['003', 'Experto en prevención de riesgos', 'prevencion', P, ['revisor_capsulas', 'emergencias', 'aprobador_documentos']],
    ['004', 'Responsable de medio ambiente', 'medio_ambiente', P, []],
    ['005', 'Responsable de calidad', 'calidad', P, []],
    ['006', 'Topógrafo', 'trabajador', P, []],
    ['007', 'Representante del mandante', 'mandante', M, ['autoriza_subcontratos']],
    ['008', 'Capataz de obra gruesa (cuadrilla 1)', 'capataz', P, ['encargado_area']],
    ['009', 'Capataz de obra gruesa y altura (cuadrilla 2)', 'capataz', P, ['encargado_area']],
    ['010', 'Supervisor del subcontrato de moldajes (cuadrilla 3)', 'supervisor', SM, []],
    ['011', 'Supervisor del subcontrato de montajes y mantención (cuadrilla 4)', 'supervisor', SN, []],
    ['012', 'Supervisor del subcontrato de terminaciones (cuadrilla 5)', 'supervisor', SC, []]
  ];
  var CU = [
    { id: 'CU-M1', empresa: P, resp: '008', reemp: '009', cargos: ['Carpintero', 'Carpintero', 'Carpintero', 'Enfierrador', 'Enfierrador', 'Enfierrador', 'Albañil hormigonero', 'Albañil hormigonero', 'Jornal', 'Jornal', 'Soldador', 'Soldador'] },
    { id: 'CU-M2', empresa: P, resp: '009', reemp: '008', cargos: ['Instalador de barandas y andamios', 'Instalador de barandas y andamios', 'Instalador de barandas y andamios', 'Instalador de barandas y andamios', 'Techador / instalador de cubierta', 'Techador / instalador de cubierta', 'Excavador / zanjero', 'Excavador / zanjero', 'Jornal', 'Jornal', 'Maestro eléctrico', 'Rigger / señalero'] },
    { id: 'CU-M3', empresa: SM, resp: '010', reemp: null, cargos: ['Carpintero moldajista', 'Carpintero moldajista', 'Carpintero moldajista', 'Carpintero moldajista', 'Carpintero moldajista', 'Carpintero moldajista', 'Jornal', 'Jornal', 'Jornal', 'Rigger / señalero', 'Instalador de barandas y andamios'] },
    { id: 'CU-M4', empresa: SN, resp: '011', reemp: null, cargos: ['Mecánico de maquinaria', 'Mecánico de maquinaria', 'Operador de retroexcavadora', 'Operador de retroexcavadora', 'Operador de grúa', 'Operador de manipulador telescópico', 'Rigger / señalero', 'Maestro eléctrico', 'Soldador', 'Jornal', 'Jornal'] },
    { id: 'CU-M5', empresa: SC, resp: '012', reemp: null, cargos: ['Jornal', 'Jornal', 'Jornal', 'Carpintero', 'Carpintero'] }
  ];
  var nCu = 13;
  CU.forEach(function (c) { c.primero = nCu; c.cargos.forEach(function (cargo) { PLANTA.push([String(nCu++).padStart(3, '0'), cargo, /^Operador/.test(cargo) ? 'operador' : 'trabajador', c.empresa, []]); }); });

  // ---------- 3. Procedimientos (31, todos VIGENTES, con contenido de PTS) ----------
  // [id, tipo, título, EPP, pasos «texto ~ riesgo ~ control»]
  var HER = 'Casco, gafas de seguridad, guantes de cabritilla, calzado de seguridad';
  var PROCS = [
    ['PT-TOP-01', 'actividad', 'Reconocimiento, levantamiento topográfico y estacado', HER + ', chaleco reflectante', [
      'Recorrer el terreno e identificar zanjas, redes y obstáculos ~ caídas al mismo nivel ~ calzado de seguridad y recorrido en parejas', 'Instalar estacas y balizas ~ golpes y cortes ~ guantes y herramientas en buen estado', 'Medir cerca de circulación de maquinaria ~ atropello ~ chaleco reflectante y señalero']],
    ['PT-INS-01', 'actividad', 'Instalación de faena, cierres y servicios provisorios', HER, [
      'Armar el cierre perimetral y señalética ~ golpes y cortes ~ herramientas y guantes', 'Ubicar contenedores de oficina, bodega y servicios higiénicos ~ aplastamiento ~ maniobra con grúa y señalero', 'Habilitar vías de evacuación y zona de seguridad ~ falta de evacuación ~ plano de evacuación visible']],
    ['PT-DES-01', 'actividad', 'Despeje, limpieza y preparación del terreno', HER, [
      'Retirar vegetación y escombros ~ cortes y sobreesfuerzo ~ guantes y ayuda mecánica', 'Escarpe y nivelación con maquinaria ~ atropello ~ señalero y área segregada', 'Disponer residuos en el patio ~ residuos cortantes ~ contenedor rotulado']],
    ['PT-FUN-01', 'actividad', 'Fundaciones y redes enterradas', HER + ', botas de goma', [
      'Replantear fundaciones y redes ~ caída a la excavación ~ baranda perimetral', 'Colocar emplantillado y moldaje de fundaciones ~ aplastamiento ~ apuntalado', 'Instalar tuberías enterradas ~ derrumbe de zanja ~ entibación según PT-EXC-01']],
    ['PT-MOL-01', 'actividad', 'Armado e instalación de moldajes de muros y losas', HER + ', pantalla facial y protector auditivo para el corte', [
      'Revisar el plano de moldaje y el acopio de placas ~ error de armado ~ plano vigente en el frente', 'Cortar las placas en el mesón con la sierra con protección de disco y cuchillo divisor ~ cortes y proyección ~ protección de disco, pantalla facial y protector auditivo', 'Armar y aplomar paneles; instalar alzaprimas según el plano ~ caída de paneles ~ apuntalado según plano', 'Mover placas pesadas entre dos personas o con carro ~ lesiones musculoesqueléticas ~ carro y levante entre dos sobre 25 kg', 'Acopiar lo sobrante sin obstruir pasillos ~ tropiezos ~ acopio definido']],
    ['PT-ENF-01', 'actividad', 'Enfierradura: corte, doblado y amarre', HER + ', guantes de amarre', [
      'Preparar barras y revisar los planos de armadura ~ cortes por barras ~ guantes y orden del acopio', 'Cortar y doblar con dobladora y cizalla con guardas ~ atrapamiento ~ guardas y botón de parada', 'Armar y amarrar mallas; poner protectores de punta en barras verticales ~ empalamiento y caída ~ hongos de protección y pasarelas']],
    ['PT-HOR-01', 'actividad', 'Hormigonado con bomba y vibrado', HER + ', guantes y botas de goma', [
      'Revisar el moldaje y delimitar la zona de la bomba y los camiones ~ derrame y atropello ~ zona delimitada y señalero', 'Fijar tubería y mangueras de la bomba; operar el capacho con grúa ~ latigazo de manguera y carga suspendida ~ asa del capacho sin fierro soldado y nadie bajo la carga', 'Vibrar y nivelar el hormigón ~ contacto eléctrico y dermatitis ~ extensiones aéreas con diferencial y guantes de goma']],
    ['PT-DSM-01', 'actividad', 'Desmolde y descimbre', HER, [
      'Verificar con el jefe de terreno la autorización de desmolde ~ desmolde prematuro ~ autorización escrita', 'Retirar alzaprimas y paneles de forma ordenada ~ caída de paneles ~ zona delimitada', 'Acopiar y trasladar placas y alzaprimas ~ sobreesfuerzo ~ carro y manipulador telescópico']],
    ['PT-CUB-01', 'actividad', 'Cubierta e impermeabilización', HER + ', arnés de cuerpo completo, guantes anticorte', [
      'Revisar el viento y la línea de vida antes de subir ~ caída por viento ~ medición del viento y línea de vida revisada', 'Subir las planchas amarradas y recibirlas entre dos personas ~ caída y cortes ~ guantes anticorte y amarre', 'Fijar cada plancha antes de soltarla; nada suelto sobre la cubierta ~ caída de planchas ~ fijación inmediata', 'Instalar membrana asfáltica con soplete ~ incendio ~ permiso de trabajo en caliente']],
    ['PT-FAC-01', 'actividad', 'Fachadas, ventanas y barandas', HER + ', arnés de cuerpo completo', [
      'Armar el andamio según PT-AND-01 ~ caída ~ andamio con recepción técnica', 'Izar y presentar ventanas ~ golpes y caída de vidrio ~ ventosas y zona inferior delimitada', 'Instalar barandas definitivas de balcones ~ caída a distinto nivel ~ arnés conectado']],
    ['PT-INST-01', 'actividad', 'Instalaciones sanitarias y eléctricas interiores', HER, [
      'Replantear canalizaciones ~ cortes ~ guantes', 'Instalar tuberías y cableado sin tensión ~ contacto eléctrico ~ bloqueo según PT-LOT-01', 'Probar y rotular circuitos ~ error de conexión ~ lista de verificación']],
    ['PT-TER-01', 'actividad', 'Tabiques, revestimientos, cielos, pintura y terminaciones', HER + ', mascarilla para pintura', [
      'Armar tabiques y cielos desde escalas o caballetes ~ caída ~ escala en buen estado', 'Aplicar pinturas y pegamentos con ventilación ~ inhalación de solventes ~ mascarilla y ventilación', 'Retirar escombros ~ cortes ~ guantes']],
    ['PT-EXT-01', 'actividad', 'Obras exteriores, urbanización y áreas comunes', HER + ', chaleco reflectante', [
      'Señalizar y segregar el frente exterior ~ atropello ~ conos y señalero', 'Colocar soleras y pavimentos ~ sobreesfuerzo ~ ayuda mecánica', 'Abrir zanjas de servicios según PT-EXC-01 ~ derrumbe ~ entibación']],
    ['PT-PRU-01', 'actividad', 'Pruebas y puesta en servicio', HER, [
      'Revisar el sistema y cerrar el área de prueba ~ proyección de agua o aire a presión ~ área delimitada', 'Presurizar y verificar fugas ~ reventón ~ presión máxima del manual', 'Energizar con autorización ~ contacto eléctrico ~ retiro de bloqueos solo por quien los puso']],
    ['PT-ENT-01', 'actividad', 'Limpieza final, retiro de instalaciones provisorias y entrega', HER, [
      'Limpiar y retirar residuos ~ cortes ~ guantes', 'Desmontar instalaciones provisorias ~ electrocución ~ bloqueo de energías', 'Recorrer con el mandante ~ caídas ~ zonas seguras señalizadas']],
    ['PT-AUX-01', 'actividad', 'Recepción, almacenamiento y acopio de materiales', HER + ', chaleco reflectante', [
      'Recibir el camión con señalero ~ atropello ~ zona de descarga delimitada', 'Acopiar con altura máxima definida ~ caída del acopio ~ acopio ordenado y estable', 'Registrar y rotular lo recibido ~ confusión de materiales ~ registro de recepción']],
    ['PT-MAN-01', 'actividad', 'Mantención de maquinaria en terreno', HER + ', guantes de nitrilo', [
      'Detener la máquina, bajar implementos y bloquear el arranque con candado personal ~ arranque inesperado ~ bloqueo según PT-LOT-01', 'Segregar el área con conos e instalar bandeja antiderrame ~ atropello y derrames ~ conos y kit antiderrame', 'Mantener según el manual del fabricante; residuos al contenedor rotulado ~ fluidos calientes ~ esperar enfriamiento']],
    ['PT-MTL-01', 'actividad', 'Operación de manipulador telescópico para traslado de materiales', HER + ', chaleco reflectante, cinturón de la cabina', [
      'Inspección pre-uso del equipo al inicio del día ~ falla del equipo ~ lista de inspección diaria', 'Delimitar la zona de maniobra y asignar señalero ~ atropello ~ zona delimitada y señalero', 'Trasladar la carga amarrada sobre horquillas según la tabla de carga ~ volcamiento y caída de la carga ~ tabla de carga y terreno nivelado']],
    ['PT-HER-01', 'transversal', 'Herramientas manuales y eléctricas', HER, [
      'Revisar la herramienta antes de usar ~ falla de la herramienta ~ lista de revisión', 'Usar solo con guardas y conexiones sin uniones expuestas ~ contacto eléctrico y cortes ~ diferencial y guardas', 'Guardar y reportar daños ~ uso de herramienta dañada ~ rótulo de fuera de servicio']],
    ['PT-ALT-01', 'transversal', 'Trabajos en altura y medios de acceso', HER + ', arnés de cuerpo completo con doble cola, legionario', [
      'Revisar las barandas, la línea de vida y la zona inferior ~ caída a distinto nivel ~ línea de vida revisada por Prevención', 'Conectar el arnés antes de acercarse al borde, siempre una cola conectada ~ caída ~ arnés de cuerpo completo', 'Delimitar y señalizar la zona inferior ~ caída de objetos ~ herramientas amarradas', 'Conocer el plan de rescate ~ trauma por suspensión ~ plan de rescate y simulacro']],
    ['PT-EXC-01', 'transversal', 'Excavaciones y zanjas', HER + ', botas de goma, chaleco reflectante', [
      'Ubicar y señalizar redes enterradas antes de excavar ~ electrocución y explosión ~ catastro de redes y excavación manual cerca de ellas', 'Excavar con talud o entibación según el estudio de suelos y acopiar a más de 1 m del borde ~ derrumbe y sepultamiento ~ entibación aprobada', 'Colocar baranda perimetral y escalas de acceso; señalero para la maquinaria ~ caída y atropello ~ baranda y señalero', 'Suspender ante lluvia, grietas o derrumbe ~ sepultamiento ~ detención inmediata y aviso a Prevención']],
    ['PT-IZA-01', 'transversal', 'Izaje y movimiento de cargas', HER + ', chaleco reflectante, guantes', [
      'Revisar el plan de izaje, el radio de giro y las condiciones del viento ~ basculamiento ~ medición del viento (límite 64 km/h)', 'Verificar la inspección pre-operacional de la grúa y los estrobos y eslingas certificados ~ falla de equipo ~ lista de inspección y certificación', 'Segregar la zona de izaje y asignar rigger y señalero con código de señales ~ caída de la carga ~ nadie bajo la carga', 'Mantener la distancia mínima a tendidos eléctricos ~ electrocución ~ distancia mínima 3 m (hasta 380 V)']],
    ['PT-MAQ-01', 'transversal', 'Interacción entre personas y maquinaria', HER + ', chaleco reflectante', [
      'Segregar las vías de personas y de maquinaria ~ atropello ~ conos y barreras', 'Usar señalero y alarma de retroceso ~ atropello ~ señalero asignado', 'Respetar la velocidad máxima de la faena ~ colisión ~ señalética']],
    ['PT-CAL-01', 'transversal', 'Trabajos en caliente', 'Casco, careta con filtro, guantes de descarne, coleto, polainas, calzado de seguridad', [
      'Retirar combustibles del radio de trabajo o cubrirlos con mantas ignífugas y obtener el permiso de trabajo en caliente ~ incendio ~ permiso autorizado', 'Instalar extintor vigente y designar un vigía de incendios ~ incendio ~ extintor y vigía', 'Revisar válvulas antirretorno de llama, mangueras, cables y puesta a tierra ~ fuga de gas y contacto eléctrico ~ revisión previa', 'Mantener el vigía y observar la zona después de terminar ~ fuego latente ~ observación posterior']],
    ['PT-ELE-01', 'transversal', 'Intervenciones eléctricas y control de energías', 'Casco, guantes dieléctricos, herramientas aisladas a 1.000 V, calzado dieléctrico', [
      'Identificar el circuito en el diagrama unifilar ~ intervenir el circuito equivocado ~ punto de corte identificado', 'Desconectar y bloquear según PT-LOT-01 ~ energización inesperada ~ candado y tarjeta personal', 'Verificar tensión cero con instrumento aprobado ~ electrocución ~ verificación de energía cero', 'Restituir con tableros cerrados, tierra y protectores diferenciales ~ contacto indirecto ~ revisión final']],
    ['PT-SUS-01', 'transversal', 'Manipulación de materiales y sustancias', HER + ', guantes de nitrilo, mascarilla', [
      'Revisar la hoja de seguridad y el rotulado ~ intoxicación ~ hoja de seguridad en el puesto', 'Manipular con EPP y ventilación; corte húmedo en hormigón y albañilería ~ polvo de sílice ~ corte húmedo y casilleros dobles', 'Almacenar en la bodega de sustancias ~ incendio y derrame ~ bandeja y extintor']],
    ['PT-DER-01', 'transversal', 'Mantención de equipos y prevención de derrames', HER + ', guantes de nitrilo', [
      'Instalar bandeja y kit antiderrame bajo el punto de trabajo ~ contaminación del suelo ~ bandeja y kit', 'Contener y limpiar cualquier derrame de inmediato ~ contaminación ~ material absorbente', 'Disponer los residuos peligrosos en contenedor rotulado ~ mala disposición ~ retiro por gestor autorizado']],
    ['PT-EME-01', 'transversal', 'Emergencias, orden, limpieza y residuos', HER, [
      'Conocer la alarma, las vías de evacuación y la zona de seguridad ~ evacuación desordenada ~ plano y señalética', 'Mantener el orden y la limpieza del puesto ~ tropiezos e incendio ~ limpieza al terminar el turno', 'Separar y disponer residuos ~ contaminación ~ patio de residuos']],
    ['PT-AND-01', 'transversal', 'Armado, uso y desarme de andamios', HER + ', arnés de cuerpo completo conectado a línea de vida independiente, guantes', [
      'Nivelar la base con placa husillo y armar con amarras mecánicas rígidas a la fachada ~ colapso del andamio ~ base nivelada y amarras', 'Instalar plataformas trabadas sin aberturas mayores a 25 mm, barandas (superior sobre 1 m, intermedia y rodapié de 150 mm) y redes ~ caída ~ barandas completas y redes', 'Solicitar la recepción técnica y poner la tarjeta visible ~ uso de andamio sin revisar ~ tarjeta verde de recepción', 'Suspender con viento sobre 65 km/h, deformación de pies derechos o cercanía a líneas eléctricas ~ caída ~ detención inmediata']],
    ['PT-MMC-01', 'transversal', 'Manejo manual de cargas', HER, [
      'Evaluar el peso y usar ayuda mecánica sobre 25 kg (20 kg mujeres y menores de 18; prohibido a embarazadas) ~ lesiones lumbares ~ carro y levante entre dos', 'Mantener vías de circulación despejadas ~ caídas al mismo nivel ~ orden del frente', 'Acopiar con altura máxima definida ~ caída del acopio ~ acopio estable']],
    ['PT-LOT-01', 'transversal', 'Bloqueo y etiquetado de energías (LOTO) eléctrico y mecánico', 'Casco, candado personal con tarjeta, guantes, gafas, calzado de seguridad', [
      'Apagar el equipo y aislar todas las fuentes de energía según el diagrama ~ energización inesperada ~ identificación del punto de corte', 'Instalar candado personal y tarjeta «No operar» con los datos del trabajador ~ reenergización ~ un candado por persona', 'Disipar y purgar la energía residual y calzar partes móviles ~ proyección y aplastamiento ~ purga y calzas', 'Comprobar energía cero intentando el arranque local o midiendo tensión ~ arranque inesperado ~ verificación de energía cero', 'Retirar los candados solo quien los puso, tras confirmar que el área está despejada ~ reenergización con personas expuestas ~ procedimiento de retiro']]
  ];
  var OTROS_DOCS = [
    { id: 'EST-EPP-MOD', tipo: 'estandar', titulo: 'Estándar de elementos de protección personal', version: '1' },
    { id: 'MR-MOD-01', tipo: 'matriz', titulo: 'Matriz de identificación de peligros y evaluación de riesgos (MIPER)', version: '1' },
    { id: 'RA-MOD-01', tipo: 'matriz', titulo: 'Registro de aspectos e impactos ambientales', version: '1' },
    { id: 'FOR-PTA-MOD', tipo: 'formato_permiso', titulo: 'Permiso de trabajo en altura', version: '1' },
    { id: 'FOR-PTC-MOD', tipo: 'formato_permiso', titulo: 'Permiso de trabajo en caliente', version: '1' },
    { id: 'FOR-PTE-MOD', tipo: 'formato_permiso', titulo: 'Permiso de trabajo en excavación', version: '1' },
    { id: 'FOR-PTI-MOD', tipo: 'formato_permiso', titulo: 'Permiso de izaje crítico', version: '1' },
    { id: 'FOR-PTL-MOD', tipo: 'formato_permiso', titulo: 'Permiso de bloqueo de energías (LOTO)', version: '1' },
    { id: 'FOR-INS-MTL', tipo: 'lista', titulo: 'Inspección pre-uso del manipulador telescópico', version: '1' },
    { id: 'FOR-INS-GRU', tipo: 'lista', titulo: 'Inspección pre-operacional de la grúa', version: '1' },
    { id: 'FOR-INS-RET', tipo: 'lista', titulo: 'Inspección pre-uso de la retroexcavadora', version: '1' }
  ];
  var SECCIONES = 9; // §1 objetivo, §2 alcance, §3 definiciones, §4 responsables y competencias, §5 EPP y equipos, §6 procedimiento (§6.n pasos), §7 emergencias, §8 registros, §9 difusión y aprobaciones
  var JER = ['1_ELIMINACION', '2_CONTROL_FUENTE_INGENIERIA', '3_ADMINISTRATIVO_PTS', '4_EPP_RESIDUAL'];

  // ---------- 4. MIPER (campos de 02-miper-especificacion.md; metodología P×C configurable) ----------
  // Metodología por defecto: la del ISP (Guía para la identificación y evaluación de riesgos en los lugares de trabajo, v3, Res. Ex. E 668/25; DS 44 art. 7).
  // Riesgos de seguridad, desastre y emergencias: VEP = Probabilidad × Consecuencia con P y C en {1, 2, 4} (VERIFICACION_NORMATIVA_2026-11-11, §1: CORREGIDA).
  // Niveles: ≤ 2 Tolerable · 4 Moderado · 8 Importante · 16 Intolerable. Importante e Intolerable: no empezar ni seguir el trabajo hasta bajar el riesgo.
  // Higiene (DS 594, protocolos MINSAL) y TMERT no se calculan con este VEP.
  var CORTES_ISP = [[2, 'TOLERABLE'], [4, 'MODERADO'], [8, 'IMPORTANTE'], [16, 'INTOLERABLE']];
  var NIVELES_ALTOS = ['IMPORTANTE', 'INTOLERABLE', 'NO_ACEPTABLE']; // bloquean empezar o seguir el trabajo (NO_ACEPTABLE = escala personalizada de tres niveles)
  var METODOS = {
    ISP: { id: 'ISP', nombre: 'Valor esperado de la pérdida VEP = Probabilidad × Consecuencia, escala 1-2-4 (Guía ISP v3, Res. Ex. E 668/25; DS 44 art. 7)', valoresP: [1, 2, 4], valoresC: [1, 2, 4], etiquetasP: ['Baja', 'Media', 'Alta'], etiquetasC: ['Ligeramente dañino', 'Dañino', 'Extremadamente dañino'], cortes: CORTES_ISP, aceptableHasta: 2, moderadoHasta: 4, bloquea: ['IMPORTANTE', 'INTOLERABLE'] },
    PONDERADA: { id: 'PONDERADA', nombre: 'Escala del organismo administrador (misma 1-2-4 y mismos niveles; configurable)', valoresP: [1, 2, 4], valoresC: [1, 2, 4], etiquetasP: ['Baja', 'Media', 'Alta'], etiquetasC: ['Ligeramente dañino', 'Dañino', 'Extremadamente dañino'], cortes: CORTES_ISP, aceptableHasta: 2, moderadoHasta: 4, bloquea: ['IMPORTANTE', 'INTOLERABLE'], verificar: true }
  };
  function evaluar(met, p, c) {
    var vp = met.valoresP[p - 1], vc = met.valoresC[c - 1];
    if (!vp || !vc) throw new Error('P o C fuera de la escala de la metodología ' + met.id);
    var v = vp * vc;
    if (met.cortes) { var k = met.cortes.filter(function (x) { return v <= x[0]; })[0]; return { valor: v, nivel: k ? k[1] : met.cortes[met.cortes.length - 1][1] }; }
    return { valor: v, nivel: v <= met.aceptableHasta ? 'ACEPTABLE' : v <= met.moderadoHasta ? 'MODERADO' : 'NO_ACEPTABLE' };
  }
  var EXPUESTOS = { 'FT-MOL-01': ['Carpintero', 'Carpintero moldajista'], 'FT-ALT-01': ['Instalador de barandas y andamios', 'Carpintero moldajista'], 'FT-CUB-01': ['Techador / instalador de cubierta', 'Instalador de barandas y andamios'], 'FT-AND-01': ['Instalador de barandas y andamios'],
    'FT-EXC-01': ['Excavador / zanjero', 'Operador de retroexcavadora'], 'FT-IZA-01': ['Operador de grúa', 'Rigger / señalero'], 'FT-MTL-01': ['Operador de manipulador telescópico', 'Jornal'], 'FT-CAL-01': ['Soldador'], 'FT-LOT-01': ['Maestro eléctrico', 'Mecánico de maquinaria'],
    'FT-HOR-01': ['Albañil hormigonero'], 'FT-ENF-01': ['Enfierrador'], 'FT-MMC-01': ['Jornal'] };
  var PROCESO = { 'FT-MOL-01': 'Obra gruesa', 'FT-ALT-01': 'Obra gruesa', 'FT-CUB-01': 'Cubierta', 'FT-AND-01': 'Fachadas', 'FT-EXC-01': 'Movimiento de tierras', 'FT-IZA-01': 'Obra gruesa', 'FT-MTL-01': 'Manejo de materiales', 'FT-CAL-01': 'Obra gruesa', 'FT-LOT-01': 'Mantención e instalaciones', 'FT-HOR-01': 'Obra gruesa', 'FT-ENF-01': 'Obra gruesa', 'FT-MMC-01': 'Manejo de materiales' };
  var EMERG = {
    caida: 'Plan de rescate en altura conocido por la cuadrilla, rescatista designado y botiquín; ante una caída se activa el rescate y se suspende el trabajo (Ley 16.744 art. 76).',
    sepultamiento: 'Rescate con personal capacitado y equipo de excavación de emergencia; ante grietas o derrumbe se evacúa la zanja y se detiene el trabajo (Código del Trabajo art. 184 bis).',
    carga: 'Zona de izaje o traslado segregada, detención de la maniobra ante cualquier falla y aviso inmediato a Prevención; atención de emergencia por el organismo administrador.',
    incendio: 'Extintor vigente junto al puesto, vigía de incendios y plan de emergencia con brigada; llamar a Bomberos.',
    electrico: 'Corte general de energía, rescate sin tocar al accidentado, RCP por personal capacitado y llamado al organismo administrador.',
    amputacion: 'Botiquín con torniquete, detención del equipo y traslado inmediato al centro del organismo administrador.',
    ergonomia: 'Evaluación ergonómica por el organismo administrador y rotación inmediata del puesto ante molestias.',
    ruido: 'Evaluación de ruido por el organismo administrador, audiometría de expuestos y protectores auditivos.',
    silice: 'Evaluación higiénica y vigilancia de salud del organismo administrador (protocolo PLANESI).'
  };
  // [id, ficha, puesto, tarea, tipoTarea, factor, peligro, riesgo, P, C, jerarquía(1-4), medida, emergencia, Pres, Cres, responsable, estado, procedimientos, capacitación, permisos, metodología especial, sensibilidad]
  var F = 'SEGURIDAD', ERG = 'ERGONOMICO', HQ = 'HIGIENE_QUIMICO', HF = 'HIGIENE_FISICO';
  var FILAS = [
    ['R-MOL-01', 'FT-MOL-01', 'Carpintero / Carpintero moldajista', 'Cortar placas con sierra circular', 'RUTINARIA', F, 'Sierra circular en funcionamiento', 'Cortes y amputaciones', 2, 3, 2, 'Sierra con protección de disco y cuchillo divisor, mesón estable y verificación diaria de la guarda por el encargado del área', EMERG.amputacion, 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-MOL-01', 'PT-HER-01'], ['sierra_circular'], []],
    ['R-MOL-02', 'FT-MOL-01', 'Carpintero / Carpintero moldajista', 'Cortar placas con sierra circular', 'RUTINARIA', F, 'Proyección de partículas al cortar', 'Lesiones oculares y faciales', 2, 2, 4, 'Pantalla facial y gafas durante todo corte. No es posible eliminar la proyección: el EPP es el control residual', null, 1, 2, 'Capataz del área', 'VERIFICADA', ['PT-MOL-01', 'PT-HER-01'], [], []],
    ['R-MOL-03', 'FT-MOL-01', 'Carpintero / Carpintero moldajista', 'Cortar placas con sierra circular', 'RUTINARIA', HF, 'Ruido de la sierra circular', 'Hipoacusia', 3, 2, 3, 'Rotación de puestos, protectores auditivos y evaluación según el protocolo PREXOR', EMERG.ruido, 2, 2, 'Prevención', 'IMPLEMENTADA', ['PT-HER-01'], [], [], 'PREXOR'],
    ['R-MOL-04', 'FT-MOL-01', 'Carpintero / Carpintero moldajista', 'Cortar placas con sierra circular', 'RUTINARIA', HQ, 'Polvo de madera al cortar', 'Afecciones respiratorias', 2, 2, 2, 'Corte en lugar ventilado con extracción de polvo y orden del puesto', null, 1, 2, 'Prevención', 'VERIFICADA', ['PT-MOL-01'], [], []],
    ['R-MOL-05', 'FT-MOL-01', 'Carpintero / Jornal', 'Mover placas y tableros', 'RUTINARIA', ERG, 'Manejo manual de placas y tableros', 'Lesiones musculoesqueléticas', 3, 2, 2, 'Carro para traslado de placas y levante entre dos personas sobre 25 kg', EMERG.ergonomia, 2, 2, 'Jefe de terreno', 'IMPLEMENTADA', ['PT-MOL-01', 'PT-MMC-01'], [], [], null, true],
    ['R-MOL-06', 'FT-MOL-01', 'Carpintero', 'Usar herramientas eléctricas en el taller', 'RUTINARIA', F, 'Extensiones eléctricas en el piso', 'Contacto eléctrico y caídas', 2, 3, 2, 'Extensiones aéreas sin uniones expuestas y tablero con protector diferencial revisado', EMERG.electrico, 1, 3, 'Maestro eléctrico', 'VERIFICADA', ['PT-HER-01'], [], []],
    ['R-MOL-07', 'FT-MOL-01', 'Carpintero / Carpintero moldajista', 'Armar paneles y alzaprimas', 'RUTINARIA', F, 'Caída de paneles y alzaprimas', 'Golpes y aplastamiento', 2, 3, 3, 'Apuntalado según el plano de moldaje y desmolde solo con autorización del jefe de terreno', 'Zona delimitada, detención del trabajo y aviso a Prevención.', 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-MOL-01', 'PT-DSM-01'], [], []],
    ['R-ALT-01', 'FT-ALT-01', 'Instalador de barandas y andamios', 'Instalar barandas en borde de losa', 'RUTINARIA', F, 'Trabajo en borde de losa sin baranda', 'Caída a distinto nivel (fatal)', 2, 3, 2, 'Barandas perimetrales completas (superior sobre 1 m, intermedia, rodapié de 150 mm), arnés conectado a línea de vida revisada por Prevención y permiso de trabajo en altura', EMERG.caida, 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-ALT-01'], ['trabajo_altura', 'examen_altura'], ['PTA']],
    ['R-ALT-02', 'FT-ALT-01', 'Instalador de barandas y andamios', 'Instalar barandas en borde de losa', 'RUTINARIA', F, 'Caída de herramientas o materiales', 'Golpes a personas abajo', 2, 3, 2, 'Zona inferior delimitada y señalizada, herramientas amarradas y redes o pantallas', 'Detención del trabajo y atención de emergencia de la persona golpeada.', 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-ALT-01'], [], []],
    ['R-ALT-03', 'FT-ALT-01', 'Instalador de barandas y andamios', 'Trabajar a la intemperie', 'RUTINARIA', HF, 'Radiación UV de origen solar', 'Quemaduras y daño ocular', 3, 2, 3, 'Pausas a la sombra en horas de mayor índice UV, publicación diaria del índice y protector solar (protocolo UV)', 'Atención por golpe de calor o quemadura: sombra, hidratación y traslado.', 2, 2, 'Jefe de terreno', 'IMPLEMENTADA', ['PT-ALT-01'], [], [], 'UV'],
    ['R-ALT-04', 'FT-ALT-01', 'Instalador de barandas y andamios', 'Rescatar a una persona suspendida', 'EMERGENCIA', F, 'Persona suspendida del arnés tras una caída', 'Trauma por suspensión', 2, 3, 3, 'Plan de rescate conocido por la cuadrilla y simulacro de rescate trimestral', EMERG.caida, 1, 3, 'Prevención', 'VERIFICADA', ['PT-ALT-01', 'PT-EME-01'], ['trabajo_altura'], ['PTA']],
    ['R-CUB-01', 'FT-CUB-01', 'Techador / instalador de cubierta', 'Instalar planchas de zinc en la techumbre', 'RUTINARIA', F, 'Trabajo sobre techumbre y bordes de cubierta', 'Caída a distinto nivel (fatal)', 2, 3, 2, 'Línea de vida revisada por Prevención, tránsito sobre tablones, arnés conectado y permiso de trabajo en altura', EMERG.caida, 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-CUB-01', 'PT-ALT-01'], ['trabajo_altura', 'examen_altura'], ['PTA']],
    ['R-CUB-02', 'FT-CUB-01', 'Techador / instalador de cubierta', 'Manipular planchas de zinc', 'RUTINARIA', F, 'Bordes filosos de planchas de zinc', 'Cortes en manos y antebrazos', 3, 1, 4, 'Guantes anticorte y manipulación entre dos personas. El EPP es el control residual: no se pueden eliminar los bordes', null, 2, 1, 'Capataz del área', 'VERIFICADA', ['PT-CUB-01'], [], []],
    ['R-CUB-03', 'FT-CUB-01', 'Techador / instalador de cubierta', 'Subir planchas con viento', 'RUTINARIA', F, 'Viento que levanta planchas sueltas', 'Golpes y caída de planchas', 2, 3, 3, 'Medición del viento antes de subir, planchas amarradas y suspensión del trabajo con viento sobre el límite del procedimiento (65 km/h o menos)', 'Suspensión inmediata del trabajo y retiro de las personas de la cubierta.', 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-CUB-01'], [], []],
    ['R-CUB-04', 'FT-CUB-01', 'Techador / instalador de cubierta', 'Cortar planchas con esmeril', 'RUTINARIA', F, 'Corte de planchas con esmeril', 'Proyección de partículas', 2, 2, 2, 'Corte en el suelo siempre que sea posible; gafas y pantalla facial como control residual', null, 1, 2, 'Capataz del área', 'VERIFICADA', ['PT-CUB-01', 'PT-HER-01'], [], []],
    ['R-AND-01', 'FT-AND-01', 'Instalador de barandas y andamios', 'Armar andamios de fachada', 'RUTINARIA', F, 'Base sin nivelar o sin amarras', 'Colapso del andamio y caída', 2, 3, 2, 'Placa husillo, nivelación, amarras mecánicas rígidas a la fachada, memoria de cálculo sobre 12 m y recepción técnica con tarjeta visible', EMERG.caida, 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-AND-01', 'PT-ALT-01'], ['armado_andamios', 'trabajo_altura', 'examen_altura'], ['PTA']],
    ['R-AND-02', 'FT-AND-01', 'Instalador de barandas y andamios', 'Armar plataformas del andamio', 'RUTINARIA', F, 'Plataforma con aberturas o sin trabar', 'Caída a distinto nivel', 2, 3, 2, 'Plataformas trabadas sin aberturas mayores a 25 mm y barandas completas con rodapié', EMERG.caida, 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-AND-01'], [], ['PTA']],
    ['R-AND-03', 'FT-AND-01', 'Instalador de barandas y andamios', 'Armar andamios cerca de líneas eléctricas', 'NO_RUTINARIA', F, 'Andamio cercano a línea eléctrica', 'Contacto eléctrico', 1, 3, 1, 'Mantener la distancia mínima o coordinar el corte de energía antes de armar', EMERG.electrico, 1, 2, 'Jefe de terreno', 'VERIFICADA', ['PT-AND-01', 'PT-ELE-01'], [], []],
    ['R-AND-04', 'FT-AND-01', 'Instalador de barandas y andamios', 'Trabajar sobre la vía pública', 'RUTINARIA', F, 'Caída de objetos desde el andamio a la vía', 'Golpes a terceros', 2, 3, 2, 'Redes o pantallas, rodapié, cierre de la vía inferior y señalero', 'Detención del trabajo y atención del tercero afectado.', 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-AND-01', 'PT-FAC-01'], [], []],
    ['R-EXC-01', 'FT-EXC-01', 'Excavador / zanjero', 'Excavar zanjas y fundaciones', 'RUTINARIA', F, 'Derrumbe de las paredes de la excavación', 'Sepultamiento (fatal)', 2, 3, 2, 'Talud o entibación según el estudio de suelos, acopio a más de 1 m del borde y permiso de trabajo en excavación', EMERG.sepultamiento, 1, 3, 'Jefe de terreno', 'VERIFICADA', ['PT-EXC-01'], ['excavacion'], ['PTE']],
    ['R-EXC-02', 'FT-EXC-01', 'Excavador / zanjero', 'Excavar zanjas y fundaciones', 'RUTINARIA', F, 'Caída de personas o equipos al borde', 'Caída a distinto nivel', 2, 3, 2, 'Baranda perimetral y escalas de acceso', EMERG.caida, 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-EXC-01'], [], ['PTE']],
    ['R-EXC-03', 'FT-EXC-01', 'Operador de retroexcavadora', 'Excavar con retroexcavadora', 'RUTINARIA', F, 'Maquinaria en movimiento cerca de las personas', 'Atropello', 2, 3, 3, 'Señalero, zona de maniobra delimitada y velocidad limitada', 'Detención del equipo y aviso inmediato a Prevención.', 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-EXC-01', 'PT-MAQ-01'], ['operador_maquinaria'], []],
    ['R-EXC-04', 'FT-EXC-01', 'Excavador / zanjero', 'Excavar cerca de redes enterradas', 'NO_RUTINARIA', F, 'Redes enterradas no identificadas (agua, gas, electricidad)', 'Contacto eléctrico y explosión', 2, 3, 1, 'Catastro y señalización de las redes antes de excavar; excavación manual cerca de ellas (eliminación del contacto)', EMERG.electrico, 1, 3, 'Jefe de terreno', 'VERIFICADA', ['PT-EXC-01'], [], ['PTE']],
    ['R-IZA-01', 'FT-IZA-01', 'Operador de grúa / Rigger', 'Izar cargas con grúa', 'RUTINARIA', F, 'Caída de la carga izada', 'Golpes graves o muerte', 2, 3, 2, 'Estrobos y eslingas certificados, carga amarrada, zona de izaje segregada, nadie bajo la carga y permiso de izaje crítico', EMERG.carga, 1, 3, 'Jefe de terreno', 'VERIFICADA', ['PT-IZA-01'], ['operador_grua', 'rigger'], ['PTI']],
    ['R-IZA-02', 'FT-IZA-01', 'Operador de grúa / Rigger', 'Izar cargas con viento', 'RUTINARIA', F, 'Viento sobre el límite de operación', 'Basculamiento de la carga', 2, 3, 3, 'Medir el viento antes de izar y suspender sobre 64 km/h; pluma en veleta', 'Detención del izaje, carga a un lugar seguro y evacuación del radio de giro.', 1, 3, 'Jefe de terreno', 'VERIFICADA', ['PT-IZA-01'], [], ['PTI']],
    ['R-IZA-03', 'FT-IZA-01', 'Operador de grúa / Rigger', 'Izar cargas cerca de tendidos eléctricos', 'NO_RUTINARIA', F, 'Cercanía a tendidos eléctricos', 'Electrocución', 1, 3, 1, 'Mantener la distancia mínima (3 m hasta 380 V) o coordinar la desenergización (eliminación del contacto)', EMERG.electrico, 1, 2, 'Jefe de terreno', 'VERIFICADA', ['PT-IZA-01', 'PT-ELE-01'], [], []],
    ['R-IZA-04', 'FT-IZA-01', 'Operador de grúa', 'Operar la grúa', 'RUTINARIA', F, 'Falla de limitador, freno o cable', 'Caída de la carga y volcamiento', 2, 3, 2, 'Inspección pre-operacional diaria registrada y certificación del equipo vigente', EMERG.carga, 1, 3, 'Supervisor del subcontrato', 'VERIFICADA', ['PT-IZA-01'], ['operador_grua'], []],
    ['R-MTL-01', 'FT-MTL-01', 'Operador de manipulador telescópico', 'Trasladar materiales con manipulador', 'RUTINARIA', F, 'Volcamiento del manipulador', 'Lesiones graves o fatales del operador', 2, 3, 2, 'Tabla de carga, estabilizadores, terreno nivelado, operador acreditado e inspección pre-uso diaria', EMERG.carga, 1, 3, 'Supervisor del subcontrato', 'VERIFICADA', ['PT-MTL-01'], ['operador_manipulador'], []],
    ['R-MTL-02', 'FT-MTL-01', 'Operador / personas cerca', 'Trasladar materiales con manipulador', 'RUTINARIA', F, 'Caída de la carga durante el traslado', 'Golpes graves', 2, 3, 3, 'Carga amarrada sobre horquillas y nadie bajo la carga', EMERG.carga, 1, 3, 'Supervisor del subcontrato', 'VERIFICADA', ['PT-MTL-01'], [], []],
    ['R-MTL-03', 'FT-MTL-01', 'Todos en la zona', 'Trasladar materiales con manipulador', 'RUTINARIA', F, 'Equipo en movimiento cerca de personas', 'Atropello', 2, 3, 3, 'Señalero asignado, zona de maniobra delimitada y alarma de retroceso', 'Detención del equipo y atención de emergencia.', 1, 3, 'Supervisor del subcontrato', 'VERIFICADA', ['PT-MTL-01', 'PT-MAQ-01'], [], []],
    ['R-CAL-01', 'FT-CAL-01', 'Soldador', 'Soldar insertos metálicos', 'RUTINARIA', F, 'Chispas sobre materiales combustibles', 'Incendio', 2, 3, 3, 'Retiro de combustibles del radio de trabajo o mantas ignífugas, extintor vigente, vigía de incendios y permiso de trabajo en caliente', EMERG.incendio, 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-CAL-01'], ['soldadura', 'trabajos_caliente'], ['PTC']],
    ['R-CAL-02', 'FT-CAL-01', 'Soldador', 'Soldar insertos metálicos', 'RUTINARIA', F, 'Radiación del arco y proyecciones', 'Quemaduras y daño ocular', 3, 2, 4, 'Careta con filtro, guantes de descarne, coleto y polainas; biombos. El EPP es el control residual porque no se elimina el arco', 'Atención de quemaduras y derivación al organismo administrador.', 2, 2, 'Capataz del área', 'VERIFICADA', ['PT-CAL-01'], [], []],
    ['R-CAL-03', 'FT-CAL-01', 'Soldador', 'Soldar en recintos cerrados', 'NO_RUTINARIA', HQ, 'Humos metálicos', 'Afecciones respiratorias', 2, 2, 2, 'Extracción localizada o ventilación forzada', null, 1, 2, 'Prevención', 'VERIFICADA', ['PT-CAL-01', 'PT-SUS-01'], [], []],
    ['R-CAL-04', 'FT-CAL-01', 'Soldador', 'Revisar equipos de soldadura', 'RUTINARIA', F, 'Mangueras y cables en mal estado', 'Fuga de gas y contacto eléctrico', 2, 3, 2, 'Válvulas antirretorno de llama, inspección de cables y puesta a tierra de la máquina', EMERG.incendio, 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-CAL-01'], [], []],
    ['R-LOT-01', 'FT-LOT-01', 'Maestro eléctrico', 'Intervenir instalaciones eléctricas', 'RUTINARIA', F, 'Energización inesperada durante la intervención', 'Electrocución', 2, 3, 3, 'Bloqueo y etiquetado personal (candado y tarjeta), verificación de energía cero y permiso de bloqueo', EMERG.electrico, 1, 3, 'Jefe de terreno', 'VERIFICADA', ['PT-LOT-01', 'PT-ELE-01'], ['electrico', 'loto'], ['PTL']],
    ['R-LOT-02', 'FT-LOT-01', 'Mecánico de maquinaria', 'Mantener maquinaria en terreno', 'RUTINARIA', F, 'Arranque inesperado de la máquina', 'Atrapamiento', 2, 3, 3, 'Candado personal por mecánico y comprobación de energía cero intentando el arranque', EMERG.amputacion, 1, 3, 'Supervisor del subcontrato', 'VERIFICADA', ['PT-LOT-01', 'PT-MAN-01'], ['mecanico', 'loto'], ['PTL']],
    ['R-LOT-03', 'FT-LOT-01', 'Mecánico de maquinaria', 'Mantener maquinaria en terreno', 'RUTINARIA', F, 'Energía residual (hidráulica, neumática o gravitacional)', 'Proyección y aplastamiento', 2, 3, 2, 'Disipación y purga de la energía residual y calzas mecánicas', EMERG.amputacion, 1, 3, 'Supervisor del subcontrato', 'VERIFICADA', ['PT-LOT-01', 'PT-MAN-01'], [], ['PTL']],
    ['R-LOT-04', 'FT-LOT-01', 'Maestro eléctrico / Mecánico', 'Retirar el bloqueo', 'RUTINARIA', F, 'Retiro de un candado ajeno', 'Reenergización con una persona expuesta', 1, 3, 3, 'Solo retira el candado quien lo puso; procedimiento de retiro de emergencia con aprobación de Prevención', EMERG.electrico, 1, 2, 'Prevención', 'VERIFICADA', ['PT-LOT-01'], [], ['PTL']],
    ['R-HOR-01', 'FT-HOR-01', 'Albañil hormigonero', 'Vaciar hormigón', 'RUTINARIA', HQ, 'Contacto con cemento y hormigón fresco', 'Dermatitis y quemaduras', 3, 2, 4, 'Guantes y botas de goma, ropa que cubra y lavado al terminar. El EPP es el control residual: no se elimina el contacto', 'Lavado con abundante agua y atención del organismo administrador.', 2, 2, 'Capataz del área', 'VERIFICADA', ['PT-HOR-01'], [], []],
    ['R-HOR-02', 'FT-HOR-01', 'Albañil hormigonero', 'Vaciar con capacho y grúa', 'RUTINARIA', F, 'Capacho de hormigón en maniobra de grúa', 'Golpes por carga suspendida', 2, 3, 3, 'Asa del capacho sin fierro soldado, señalero y nadie bajo la carga', EMERG.carga, 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-HOR-01', 'PT-IZA-01'], ['hormigonado'], []],
    ['R-HOR-03', 'FT-HOR-01', 'Albañil hormigonero', 'Vaciar con bomba', 'RUTINARIA', F, 'Manguera de la bomba con presión', 'Latigazo y proyección', 2, 3, 2, 'Tubería y mangueras fijas, operador de bomba acreditado y zona delimitada', 'Detención de la bomba y atención de emergencia.', 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-HOR-01'], [], []],
    ['R-HOR-04', 'FT-HOR-01', 'Albañil hormigonero', 'Vibrar el hormigón', 'RUTINARIA', F, 'Vibrador eléctrico y extensiones', 'Contacto eléctrico', 2, 3, 2, 'Protector diferencial y extensiones aéreas sin uniones expuestas', EMERG.electrico, 1, 3, 'Maestro eléctrico', 'VERIFICADA', ['PT-HOR-01', 'PT-HER-01'], [], []],
    ['R-ENF-01', 'FT-ENF-01', 'Enfierrador', 'Armar enfierradura de muros y losas', 'RUTINARIA', F, 'Puntas de fierro expuestas', 'Empalamiento y cortes', 2, 3, 2, 'Protectores de punta (hongos) en toda barra vertical', 'Atención de emergencia y traslado al organismo administrador.', 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-ENF-01'], ['enfierradura'], []],
    ['R-ENF-02', 'FT-ENF-01', 'Enfierrador', 'Doblar y cortar fierro', 'RUTINARIA', F, 'Dobladora y cizalla', 'Atrapamiento', 2, 3, 2, 'Guardas de las máquinas y botón de parada', EMERG.amputacion, 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-ENF-01', 'PT-HER-01'], [], []],
    ['R-ENF-03', 'FT-ENF-01', 'Enfierrador', 'Armar sobre mallas y armaduras', 'RUTINARIA', F, 'Trabajo sobre armaduras a distinta altura', 'Caída a distinto nivel', 2, 3, 2, 'Pasarelas, barandas y arnés al armar sobre 1,8 m', EMERG.caida, 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-ENF-01', 'PT-ALT-01'], [], []],
    ['R-ENF-04', 'FT-ENF-01', 'Enfierrador', 'Amarrar fierro', 'RUTINARIA', ERG, 'Amarre repetitivo con alicate', 'Trastornos musculoesqueléticos de extremidades superiores', 3, 2, 3, 'Rotación, pausas y herramientas de amarre mecánicas (protocolo TMERT)', EMERG.ergonomia, 2, 2, 'Prevención', 'IMPLEMENTADA', ['PT-ENF-01'], [], [], 'TMERT'],
    ['R-MMC-01', 'FT-MMC-01', 'Jornal', 'Mover cargas a mano', 'RUTINARIA', ERG, 'Levantamiento de cargas sobre el límite', 'Lesiones lumbares', 3, 2, 2, 'Ayudas mecánicas. Tope general de 25 kg cuando no hay ayuda mecánica (Código del Trabajo art. 211-H); 20 kg para mujeres y menores de 18 años (art. 211-J); carga y descarga manual prohibida a embarazadas (art. 211-I). Los factores agravantes bajan el tope según el DS 63 y la guía técnica', EMERG.ergonomia, 2, 2, 'Jefe de terreno', 'VERIFICADA', ['PT-MMC-01'], ['mmc'], [], null, true],
    ['R-MMC-02', 'FT-MMC-01', 'Jornal', 'Trasladar materiales a mano', 'RUTINARIA', F, 'Traslado por superficies irregulares', 'Caídas al mismo nivel', 2, 2, 3, 'Vías de circulación despejadas y orden del frente', null, 1, 2, 'Capataz del área', 'VERIFICADA', ['PT-MMC-01'], [], []],
    ['R-MMC-03', 'FT-MMC-01', 'Jornal', 'Acopiar materiales', 'RUTINARIA', F, 'Acopio inestable', 'Aplastamiento por caída del material', 2, 3, 3, 'Acopio ordenado con altura máxima definida', 'Detención del trabajo y atención de emergencia.', 1, 3, 'Capataz del área', 'VERIFICADA', ['PT-MMC-01', 'PT-AUX-01'], [], []],
    ['R-SIL-01', null, 'Carpintero / Albañil / Jornal', 'Cortar hormigón y albañilería', 'RUTINARIA', HQ, 'Polvo de sílice por corte de hormigón y albañilería', 'Silicosis', 2, 3, 2, 'Corte húmedo, prohibido el chorro de arena en seco, casilleros dobles (ropa de calle y de trabajo) y vigilancia de salud (protocolo PLANESI)', EMERG.silice, 1, 3, 'Prevención', 'IMPLEMENTADA', ['PT-SUS-01'], [], [], 'PLANESI'],
    ['R-PSI-01', null, 'Todos los puestos', 'Trabajar bajo presión de plazos', 'RUTINARIA', 'PSICOSOCIAL', 'Sobrecarga de trabajo y presión de plazos', 'Estrés laboral', 2, 2, 3, 'Aplicación del cuestionario CEAL-SM/SUSESO, pausas y ajuste de turnos', null, 1, 2, 'Prevención', 'IMPLEMENTADA', ['PT-EME-01'], [], [], 'PSICOSOCIAL'],
    ['R-VIO-01', null, 'Todos los puestos', 'Convivir en la faena', 'RUTINARIA', 'VIOLENCIA_ACOSO', 'Acoso o violencia en el trabajo', 'Daño psicológico', 1, 3, 3, 'Protocolo de prevención de la Ley Karin difundido a todo el personal. ASTRA no recibe denuncias: se hacen por los canales del protocolo', null, 1, 2, 'Representante legal', 'VERIFICADA', ['PT-EME-01'], [], []],
    ['R-EME-01', null, 'Todos los puestos', 'Evacuar la faena', 'EMERGENCIA', F, 'Incendio o sismo en la faena', 'Lesiones por evacuación desordenada, quemaduras e inhalación', 2, 3, 3, 'Plan de emergencia vigente, brigadas, señalética y simulacro anual', EMERG.incendio, 1, 3, 'Prevención', 'VERIFICADA', ['PT-EME-01'], [], []]
  ];
  var AMBIENTAL = [
    ['AI-01', 'FT-LOT-01', 'Derrame de aceite o hidráulico', 'Contaminación del suelo', 'Suelo', 'Bandeja y kit antiderrame; contenedor rotulado', 'PT-DER-01'],
    ['AI-02', 'FT-LOT-01', 'Residuos peligrosos (filtros, paños, aceite usado)', 'Contaminación por mala disposición', 'Suelo y agua', 'Contenedor rotulado; retiro por gestor autorizado', 'PT-EME-01'],
    ['AI-03', 'FT-MOL-01', 'Residuos de madera y despuntes', 'Ocupación de vertedero', 'Residuos', 'Separación en el patio de residuos para reutilización', 'PT-EME-01'],
    ['AI-04', 'FT-MOL-01', 'Ruido de la sierra hacia los vecinos', 'Molestia a la comunidad', 'Comunidad', 'Horario de corte acotado y taller lejos del cierre', 'PT-HER-01'],
    ['AI-05', 'FT-HOR-01', 'Aguas de lavado de camiones de hormigón', 'Contaminación de suelo y alcantarillado', 'Agua', 'Piscina de decantación', 'PT-HOR-01'],
    ['AI-06', 'FT-EXC-01', 'Polvo por tránsito de maquinaria y excavación', 'Emisión de material particulado', 'Aire', 'Humectación de caminos', 'PT-MAQ-01']
  ];

  // ---------- 5. Fichas de tarea (procedimiento → riesgos/controles → preguntas → requisitos → verificaciones → aprobadores → permisos) ----------
  // Requisito: [id, tipo, nombre, icono, nivel, opciones]; opciones: fila (cita de la MIPER) o doc (cita de un procedimiento), si, critico, verifica, comp, rol, ambito, equipo, registro
  var PERM = {
    PTA: { id: 'PTA', nombre: 'Permiso de trabajo en altura', formato: 'FOR-PTA-MOD', doc: 'PT-ALT-01', condiciones: ['Línea de vida instalada y revisada por Prevención', 'Zona inferior delimitada y señalizada', 'Plan de rescate conocido por la cuadrilla', 'Viento bajo el límite del procedimiento'], autoriza: 'prevencion' },
    PTC: { id: 'PTC', nombre: 'Permiso de trabajo en caliente', formato: 'FOR-PTC-MOD', doc: 'PT-CAL-01', condiciones: ['Combustibles retirados del radio de trabajo o cubiertos con mantas ignífugas', 'Extintor cargado y vigente junto al puesto', 'Vigía de incendios designado'], autoriza: 'prevencion' },
    PTE: { id: 'PTE', nombre: 'Permiso de trabajo en excavación', formato: 'FOR-PTE-MOD', doc: 'PT-EXC-01', condiciones: ['Talud o entibación revisada por Prevención', 'Catastro de redes enterradas revisado', 'Material acopiado a más de 1 m del borde'], autoriza: 'prevencion' },
    PTI: { id: 'PTI', nombre: 'Permiso de izaje crítico', formato: 'FOR-PTI-MOD', doc: 'PT-IZA-01', condiciones: ['Plan de izaje y radio de giro revisados', 'Inspección pre-operacional de la grúa registrada', 'Zona segregada y señalero asignado'], autoriza: 'prevencion' },
    PTL: { id: 'PTL', nombre: 'Permiso de bloqueo de energías (LOTO)', formato: 'FOR-PTL-MOD', doc: 'PT-LOT-01', condiciones: ['Punto de corte identificado en el diagrama', 'Candado personal y tarjeta instalados', 'Energía residual disipada y energía cero verificada'], autoriza: 'prevencion' }
  };
  var COMP = function (k, doc, extra) { return ['comp_' + k, 'competencia', COMP_TXT[k] ? (k === 'examen_altura' ? 'Examen de altura física vigente' : 'Capacitación: ' + COMP_TXT[k]) : k, k === 'examen_altura' ? '🩺' : '🎓', 'sistema', Object.assign({ comp: k, doc: doc }, extra || {})]; };
  var FICHAS = [
    { id: 'FT-MOL-01', nombre: 'Armado e instalación de moldajes de muros y losas', doc: 'PT-MOL-01', refs: ['PT-HER-01'], claves: ['moldaje', 'tablero', 'placa', 'encofrado', 'carpint', 'losa', 'muro', 'sierra'], descripcion: 'Trazado, corte y armado de moldajes de madera y placas para muros y losas.', ambiental: ['AI-03', 'AI-04'],
      preguntas: [{ id: 'sierra', texto: '¿Utilizará una sierra circular?', herramienta: 'la sierra circular', detectar: ['sierra circular', 'sierra electrica', 'circular'], doc: 'PT-HER-01 v1 §6.2' }],
      reqs: [['guantes', 'epp', 'Guantes de cabritilla', '🧤', 'declarado', { doc: 'PT-MOL-01 v1 §5' }], ['pantalla', 'epp', 'Pantalla facial (protector facial)', '🛡️', 'declarado', { fila: 'R-MOL-02', si: 'sierra', critico: true, verifica: 'encargado' }],
        ['auditivo', 'epp', 'Protector auditivo', '🎧', 'declarado', { fila: 'R-MOL-03', si: 'sierra' }], ['guarda', 'condicion', 'Sierra con protección de disco y cuchillo divisor', '🪚', 'responsable', { fila: 'R-MOL-01', si: 'sierra', critico: true, verifica: 'encargado' }],
        ['extensiones', 'condicion', 'Extensiones aéreas y tablero con diferencial', '🔌', 'responsable', { fila: 'R-MOL-06', si: 'sierra' }], ['acopio', 'condicion', 'Acopio definido sin obstruir pasillos', '📦', 'responsable', { doc: 'PT-MOL-01 v1 §6.5' }],
        ['alzaprimas', 'condicion', 'Alzaprimas y paneles apuntalados según el plano', '📐', 'responsable', { fila: 'R-MOL-07', critico: true, verifica: 'encargado' }], ['carro', 'condicion', 'Carro o levante entre dos para placas pesadas', '🛒', 'responsable', { fila: 'R-MOL-05' }],
        COMP('sierra_circular', 'PT-HER-01 v1 §4', { si: 'sierra' })] },
    { id: 'FT-ALT-01', nombre: 'Instalación de barandas perimetrales en borde de losa', doc: 'PT-ALT-01', refs: ['FOR-PTA-MOD'], claves: ['baranda', 'borde de losa', 'altura', 'arnes', 'perimetral', 'linea de vida'], descripcion: 'Instalación de barandas provisorias en el borde de la losa del piso en ejecución, con riesgo de caída a distinto nivel.', ambiental: [], preguntas: [], permiso: 'PTA',
      reqs: [['arnes', 'epp', 'Arnés de cuerpo completo con doble cola', '🪢', 'declarado', { fila: 'R-ALT-01', critico: true, verifica: 'encargado' }], ['legionario', 'epp', 'Legionario y bloqueador solar', '🧢', 'declarado', { fila: 'R-ALT-03' }],
        ['linea_vida', 'condicion', 'Línea de vida instalada y revisada por Prevención', '🔗', 'responsable', { fila: 'R-ALT-01', critico: true, verifica: 'especializada' }], ['zona_inferior', 'condicion', 'Zona inferior delimitada', '🚧', 'responsable', { fila: 'R-ALT-02' }],
        ['plan_rescate', 'condicion', 'Plan de rescate conocido por la cuadrilla', '🆘', 'responsable', { fila: 'R-ALT-04' }], COMP('trabajo_altura', 'PT-ALT-01 v1 §4'), COMP('examen_altura', 'PT-ALT-01 v1 §4')] },
    { id: 'FT-CUB-01', nombre: 'Instalación de cubierta con planchas de zinc', doc: 'PT-CUB-01', refs: ['PT-ALT-01', 'FOR-PTA-MOD'], claves: ['zinc', 'plancha', 'techumbre', 'cubierta', 'techo', 'tejado'], descripcion: 'Instalación de planchas de zinc sobre la estructura de techumbre, con riesgo de caída a distinto nivel.', ambiental: [], permiso: 'PTA',
      preguntas: [{ id: 'corte_zinc', texto: '¿Cortarán planchas con esmeril sobre la techumbre?', herramienta: 'el esmeril', detectar: ['esmeril', 'cortar plancha', 'cortaremos'], fila: 'R-CUB-04' }],
      reqs: [['arnes', 'epp', 'Arnés de cuerpo completo con doble cola', '🪢', 'declarado', { fila: 'R-CUB-01', critico: true, verifica: 'encargado' }], ['guantes_corte', 'epp', 'Guantes anticorte', '🧤', 'declarado', { fila: 'R-CUB-02' }],
        ['pantalla', 'epp', 'Pantalla facial (protector facial)', '🛡️', 'declarado', { fila: 'R-CUB-04', si: 'corte_zinc', critico: true, verifica: 'encargado' }], ['linea_vida', 'condicion', 'Línea de vida instalada y revisada por Prevención', '🔗', 'responsable', { fila: 'R-CUB-01', critico: true, verifica: 'especializada' }],
        ['viento', 'condicion', 'Viento bajo el límite del procedimiento y planchas amarradas', '🌬️', 'responsable', { fila: 'R-CUB-03', critico: true, verifica: 'encargado' }], COMP('trabajo_altura', 'PT-ALT-01 v1 §4'), COMP('examen_altura', 'PT-ALT-01 v1 §4')] },
    { id: 'FT-AND-01', nombre: 'Armado, uso y desarme de andamios de fachada', doc: 'PT-AND-01', refs: ['PT-ALT-01', 'PT-FAC-01', 'FOR-PTA-MOD'], claves: ['andamio', 'andamios', 'fachada', 'plataforma'], descripcion: 'Armado, uso y desarme de andamios perimetrales de fachada con recepción técnica.', ambiental: [], permiso: 'PTA',
      preguntas: [{ id: 'altura_12', texto: '¿El andamio supera los 12 metros de altura?', herramienta: 'el andamio sobre 12 m', detectar: ['12 m', 'doce metros'], fila: 'R-AND-01' }],
      reqs: [['arnes', 'epp', 'Arnés de cuerpo completo conectado a línea de vida independiente', '🪢', 'declarado', { fila: 'R-AND-01', critico: true, verifica: 'encargado' }], ['recepcion', 'condicion', 'Andamio con recepción técnica y tarjeta visible', '🏷️', 'responsable', { fila: 'R-AND-01', critico: true, verifica: 'especializada' }],
        ['plataformas', 'condicion', 'Plataformas trabadas, barandas completas y rodapié', '🪜', 'responsable', { fila: 'R-AND-02', critico: true, verifica: 'encargado' }], ['memoria', 'condicion', 'Memoria de cálculo y planos del andamio sobre 12 m', '📐', 'responsable', { fila: 'R-AND-01', si: 'altura_12', critico: true, verifica: 'especializada' }],
        ['distancia', 'condicion', 'Distancia segura a líneas eléctricas', '⚡', 'responsable', { fila: 'R-AND-03' }], ['cierre_via', 'condicion', 'Redes o pantallas y vía inferior cerrada', '🚧', 'responsable', { fila: 'R-AND-04' }],
        COMP('armado_andamios', 'PT-AND-01 v1 §4'), COMP('trabajo_altura', 'PT-ALT-01 v1 §4'), COMP('examen_altura', 'PT-ALT-01 v1 §4')] },
    { id: 'FT-EXC-01', nombre: 'Excavación de zanjas y fundaciones', doc: 'PT-EXC-01', refs: ['PT-MAQ-01', 'FOR-PTE-MOD', 'FOR-INS-RET'], claves: ['excavar', 'excavacion', 'zanja', 'retro', 'fundacion'], descripcion: 'Excavación masiva y de zanjas con retroexcavadora y excavación manual.', ambiental: ['AI-06'], permiso: 'PTE', preguntas: [],
      roles: [{ id: 'op_retro', texto: '¿Operarás tú la retroexcavadora?', nombre: 'Operador de la retroexcavadora', equipo: 'retro', obligatorio: true, doc: 'PT-EXC-01 v1 §4' }],
      equipos: [{ id: 'retro', tipo: 'retroexcavadora', nombre: 'Retroexcavadora', doc: 'FOR-INS-RET v1', inspeccion: ['Frenos y dirección operativos', 'Sin fugas hidráulicas', 'Alarma de retroceso y luces funcionando', 'Estabilizadores y cuchara sin daño'] }],
      reqs: [['chaleco', 'epp', 'Chaleco reflectante', '🦺', 'declarado', { fila: 'R-EXC-03' }], ['talud', 'condicion', 'Talud o entibación aprobada por Prevención', '🧱', 'responsable', { fila: 'R-EXC-01', critico: true, verifica: 'especializada' }],
        ['borde', 'condicion', 'Material acopiado a más de 1 m del borde', '📏', 'responsable', { fila: 'R-EXC-01', critico: true, verifica: 'encargado' }], ['baranda', 'condicion', 'Baranda perimetral y escalas de acceso', '🪜', 'responsable', { fila: 'R-EXC-02' }],
        ['redes', 'condicion', 'Catastro de redes enterradas revisado', '🗺️', 'responsable', { fila: 'R-EXC-04', critico: true, verifica: 'especializada' }], ['senalero', 'condicion', 'Zona de maniobra delimitada y señalero asignado', '🚧', 'responsable', { fila: 'R-EXC-03', critico: true, verifica: 'encargado' }],
        COMP('excavacion', 'PT-EXC-01 v1 §4'), COMP('operador_maquinaria', 'PT-EXC-01 v1 §4', { rol: 'op_retro' }),
        ['insp_retro', 'condicion', 'Inspección pre-uso del día', '📋', 'responsable', { doc: 'FOR-INS-RET v1', ambito: 'equipo', equipo: 'retro', registro: 'inspeccion_preuso' }], ['cert_retro', 'condicion', 'Certificación del equipo vigente', '📄', 'responsable', { doc: 'PT-EXC-01 v1 §5', ambito: 'equipo', equipo: 'retro', registro: 'certificacion' }]] },
    { id: 'FT-IZA-01', nombre: 'Izaje de cargas con grúa', doc: 'PT-IZA-01', refs: ['FOR-PTI-MOD', 'FOR-INS-GRU'], claves: ['grua', 'izaje', 'izar', 'estrobo', 'capacho', 'rigger'], descripcion: 'Izaje y movimiento de cargas con grúa, con rigger y señalero.', ambiental: [], permiso: 'PTI', preguntas: [],
      roles: [{ id: 'op_grua', texto: '¿Operarás tú la grúa?', nombre: 'Operador de la grúa', equipo: 'grua', obligatorio: true, doc: 'PT-IZA-01 v1 §4' }, { id: 'rigger', texto: '¿Serás el rigger o señalero?', nombre: 'Rigger y señalero', obligatorio: true, doc: 'PT-IZA-01 v1 §4' }],
      equipos: [{ id: 'grua', tipo: 'grua_torre', nombre: 'Grúa torre', doc: 'FOR-INS-GRU v1', inspeccion: ['Frenos y cables de acero sin torones cortados', 'Limitadores de recorrido y seguro del gancho operativos', 'Comunicación radial con el señalero', 'Plomo de la torre y anclajes sin daño'] }],
      reqs: [['chaleco', 'epp', 'Chaleco reflectante', '🦺', 'declarado', { fila: 'R-IZA-01' }], ['zona_izaje', 'condicion', 'Zona de izaje segregada y nadie bajo la carga', '🚧', 'responsable', { fila: 'R-IZA-01', critico: true, verifica: 'encargado' }],
        ['eslingas', 'condicion', 'Estrobos, eslingas y bridas certificados', '⛓️', 'responsable', { fila: 'R-IZA-01', critico: true, verifica: 'especializada' }], ['viento', 'condicion', 'Viento bajo 64 km/h', '🌬️', 'responsable', { fila: 'R-IZA-02', critico: true, verifica: 'encargado' }],
        ['tendidos', 'condicion', 'Distancia mínima a tendidos eléctricos', '⚡', 'responsable', { fila: 'R-IZA-03' }], COMP('operador_grua', 'PT-IZA-01 v1 §4', { rol: 'op_grua' }), COMP('rigger', 'PT-IZA-01 v1 §4', { rol: 'rigger' }),
        ['insp_grua', 'condicion', 'Inspección pre-operacional del día', '📋', 'responsable', { fila: 'R-IZA-04', ambito: 'equipo', equipo: 'grua', registro: 'inspeccion_preuso' }], ['cert_grua', 'condicion', 'Certificación del equipo vigente', '📄', 'responsable', { doc: 'PT-IZA-01 v1 §5', ambito: 'equipo', equipo: 'grua', registro: 'certificacion' }]] },
    { id: 'FT-MTL-01', nombre: 'Traslado de materiales con manipulador telescópico', doc: 'PT-MTL-01', refs: ['FOR-INS-MTL'], claves: ['manipulador', 'telescopico', 'manitou', 'horquilla'], descripcion: 'Traslado y elevación de materiales sobre horquillas con manipulador telescópico (no carga suspendida ni personas).', ambiental: [],
      preguntas: [{ id: 'solo_traslado', texto: '¿El manipulador se utilizará únicamente para trasladar materiales?', detectar: ['solo para trasladar', 'unicamente para trasladar'], doc: 'PT-MTL-01 v1 §2', brechaSi: false,
        brechaTexto: 'El manipulador se usará para algo más que trasladar materiales (por ejemplo, carga suspendida o elevar personas). Esa operación no está cubierta por un procedimiento vigente: queda pendiente de revisión de Prevención.' }],
      roles: [{ id: 'op_manip', texto: '¿Operarás tú el manipulador telescópico?', nombre: 'Operador del manipulador telescópico', equipo: 'manipulador', obligatorio: true, doc: 'PT-MTL-01 v1 §4' }],
      equipos: [{ id: 'manipulador', tipo: 'manipulador_telescopico', nombre: 'Manipulador telescópico', doc: 'FOR-INS-MTL v1', inspeccion: ['Neumáticos y estabilizadores sin daño', 'Frenos y dirección operativos', 'Sin fugas hidráulicas', 'Alarma de retroceso y luces funcionando', 'Tabla de carga legible en la cabina'] }],
      reqs: [['chaleco', 'epp', 'Chaleco reflectante', '🦺', 'declarado', { fila: 'R-MTL-03' }], ['zona_maniobra', 'condicion', 'Zona de maniobra delimitada y señalero asignado', '🚧', 'responsable', { fila: 'R-MTL-03', critico: true, verifica: 'encargado' }],
        COMP('operador_manipulador', 'PT-MTL-01 v1 §4', { rol: 'op_manip' }), ['cinturon', 'epp', 'Cinturón de seguridad de la cabina abrochado', '🪑', 'declarado', { fila: 'R-MTL-01', rol: 'op_manip' }],
        ['insp_mtl', 'condicion', 'Inspección pre-uso del día', '📋', 'responsable', { doc: 'FOR-INS-MTL v1', ambito: 'equipo', equipo: 'manipulador', registro: 'inspeccion_preuso' }], ['cert_mtl', 'condicion', 'Certificación del equipo vigente', '📄', 'responsable', { doc: 'PT-MTL-01 v1 §5', ambito: 'equipo', equipo: 'manipulador', registro: 'certificacion' }]] },
    { id: 'FT-CAL-01', nombre: 'Trabajos en caliente: soldadura y oxicorte', doc: 'PT-CAL-01', refs: ['FOR-PTC-MOD', 'PT-SUS-01'], claves: ['soldar', 'soldadura', 'inserto', 'arco', 'oxicorte', 'caliente', 'membrana'], descripcion: 'Soldadura al arco y oxicorte de insertos y placas, con permiso de trabajo en caliente.', ambiental: [], permiso: 'PTC',
      preguntas: [{ id: 'recinto', texto: '¿Soldarán en un recinto cerrado?', herramienta: 'el recinto cerrado', detectar: ['recinto cerrado', 'espacio cerrado'], fila: 'R-CAL-03' }],
      reqs: [['careta', 'epp', 'Careta con filtro adecuado', '🥽', 'declarado', { fila: 'R-CAL-02', critico: true, verifica: 'encargado' }], ['guantes_descarne', 'epp', 'Guantes de descarne, coleto y polainas', '🧤', 'declarado', { fila: 'R-CAL-02' }],
        ['extintor', 'condicion', 'Extintor cargado y vigente junto al puesto', '🧯', 'responsable', { fila: 'R-CAL-01', critico: true, verifica: 'encargado' }], ['combustibles', 'condicion', 'Combustibles retirados del radio o cubiertos con mantas ignífugas', '🔥', 'responsable', { fila: 'R-CAL-01', critico: true, verifica: 'encargado' }],
        ['vigia', 'condicion', 'Vigía de incendios designado', '👁️', 'responsable', { fila: 'R-CAL-01', critico: true, verifica: 'encargado' }], ['valvulas', 'condicion', 'Válvulas antirretorno, mangueras, cables y tierra en buen estado', '🔧', 'responsable', { fila: 'R-CAL-04' }],
        ['extraccion', 'condicion', 'Ventilación o extracción localizada', '💨', 'responsable', { fila: 'R-CAL-03', si: 'recinto' }], COMP('soldadura', 'PT-CAL-01 v1 §4'), COMP('trabajos_caliente', 'PT-CAL-01 v1 §4')] },
    { id: 'FT-LOT-01', nombre: 'Bloqueo de energías (LOTO) eléctrico y mecánico', doc: 'PT-LOT-01', refs: ['PT-ELE-01', 'PT-MAN-01', 'PT-DER-01', 'FOR-PTL-MOD', 'RA-MOD-01'], claves: ['bloqueo', 'loto', 'candado', 'mantencion', 'electrico', 'tablero', 'mecanico', 'retroexcavadora', 'engrase'], descripcion: 'Bloqueo y etiquetado de energías para intervenciones eléctricas y mecánicas (incluida la mantención de maquinaria).', ambiental: ['AI-01', 'AI-02'], permiso: 'PTL',
      preguntas: [{ id: 'electrico', texto: '¿La intervención es en una instalación eléctrica?', herramienta: 'la intervención eléctrica', detectar: ['electric', 'tablero'], doc: 'PT-ELE-01 v1 §6.1' }, { id: 'mecanica', texto: '¿La intervención es mecánica (máquina o equipo)?', herramienta: 'la intervención mecánica', detectar: ['mecanic', 'mantencion', 'retroexcavadora'], doc: 'PT-MAN-01 v1 §6.1' }],
      reqs: [['candado', 'condicion', 'Candado personal y tarjeta «No operar» disponibles', '🔒', 'responsable', { fila: 'R-LOT-01', critico: true, verifica: 'encargado' }], ['punto_corte', 'condicion', 'Punto de corte identificado en el diagrama', '🗺️', 'responsable', { fila: 'R-LOT-01', critico: true, verifica: 'encargado' }],
        ['energia_cero', 'condicion', 'Energía cero verificada', '0️⃣', 'responsable', { fila: 'R-LOT-01', critico: true, verifica: 'especializada' }], ['purga', 'condicion', 'Energía residual disipada y partes móviles calzadas', '🧰', 'responsable', { fila: 'R-LOT-03', si: 'mecanica', critico: true, verifica: 'encargado' }],
        ['guantes_diel', 'epp', 'Guantes y calzado dieléctricos', '🧤', 'declarado', { fila: 'R-LOT-01', si: 'electrico', critico: true, verifica: 'encargado' }], ['aisladas', 'condicion', 'Herramientas aisladas a 1.000 V', '🔧', 'responsable', { fila: 'R-LOT-01', si: 'electrico' }],
        ['bandeja', 'condicion', 'Bandeja y kit antiderrame en el lugar', '🛢️', 'responsable', { doc: 'RA-MOD-01 AI-01', si: 'mecanica' }], COMP('loto', 'PT-LOT-01 v1 §4'), COMP('electrico', 'PT-ELE-01 v1 §4', { si: 'electrico' }), COMP('mecanico', 'PT-MAN-01 v1 §4', { si: 'mecanica' })] },
    { id: 'FT-HOR-01', nombre: 'Hormigonado con bomba y vibrado', doc: 'PT-HOR-01', refs: ['PT-IZA-01'], claves: ['hormigon', 'hormigonado', 'bomba', 'vibrado', 'capacho', 'vaciado'], descripcion: 'Vaciado de hormigón con bomba o capacho y vibrado.', ambiental: ['AI-05'],
      preguntas: [{ id: 'capacho', texto: '¿Vaciarán con capacho y grúa?', herramienta: 'el capacho y la grúa', detectar: ['capacho'], fila: 'R-HOR-02' }],
      reqs: [['guantes_goma', 'epp', 'Guantes y botas de goma', '🧤', 'declarado', { fila: 'R-HOR-01' }], ['asa', 'condicion', 'Asa del capacho sin fierro soldado y señalero asignado', '🪝', 'responsable', { fila: 'R-HOR-02', si: 'capacho', critico: true, verifica: 'encargado' }],
        ['mangueras', 'condicion', 'Tubería y mangueras de la bomba fijas y zona delimitada', '🚧', 'responsable', { fila: 'R-HOR-03', critico: true, verifica: 'encargado' }], ['diferencial', 'condicion', 'Vibrador con diferencial y extensiones aéreas', '🔌', 'responsable', { fila: 'R-HOR-04' }], COMP('hormigonado', 'PT-HOR-01 v1 §4')] },
    { id: 'FT-ENF-01', nombre: 'Enfierradura: corte, doblado y amarre', doc: 'PT-ENF-01', refs: ['PT-HER-01', 'PT-ALT-01'], claves: ['enfierradura', 'fierro', 'amarre', 'armadura', 'dobladora', 'malla'], descripcion: 'Corte, doblado y amarre de enfierradura de muros y losas.', ambiental: [],
      preguntas: [{ id: 'dobladora', texto: '¿Usarán dobladora o cizalla?', herramienta: 'la dobladora o cizalla', detectar: ['dobladora', 'cizalla'], fila: 'R-ENF-02' }],
      reqs: [['guantes_enf', 'epp', 'Guantes de amarre', '🧤', 'declarado', { fila: 'R-ENF-04' }], ['puntas', 'condicion', 'Protectores de punta en toda barra vertical', '📍', 'responsable', { fila: 'R-ENF-01', critico: true, verifica: 'encargado' }],
        ['guardas', 'condicion', 'Dobladora y cizalla con guardas y botón de parada', '🛑', 'responsable', { fila: 'R-ENF-02', si: 'dobladora', critico: true, verifica: 'encargado' }], ['pasarelas', 'condicion', 'Pasarelas y barandas sobre las armaduras', '🪜', 'responsable', { fila: 'R-ENF-03' }], COMP('enfierradura', 'PT-ENF-01 v1 §4')] },
    { id: 'FT-MMC-01', nombre: 'Manejo manual de cargas', doc: 'PT-MMC-01', refs: ['PT-AUX-01'], claves: ['manual', 'cargar', 'acopiar', 'trasladar', 'bodega', 'levantar'], descripcion: 'Traslado y acopio manual de materiales con límites de carga (Ley 20.949).', ambiental: [],
      preguntas: [{ id: 'sobre_25', texto: '¿Moverán cargas de más de 25 kg?', herramienta: 'las cargas de más de 25 kg', detectar: ['25 kg', 'pesad'], fila: 'R-MMC-01' }],
      reqs: [['guantes', 'epp', 'Guantes de cabritilla', '🧤', 'declarado', { doc: 'PT-MMC-01 v1 §5' }], ['ayuda', 'condicion', 'Carro o ayuda mecánica para cargas sobre 25 kg', '🛒', 'responsable', { fila: 'R-MMC-01', si: 'sobre_25', critico: true, verifica: 'encargado' }],
        ['vias', 'condicion', 'Vías de circulación despejadas', '🛤️', 'responsable', { fila: 'R-MMC-02' }], ['acopio', 'condicion', 'Acopio estable con altura máxima definida', '📦', 'responsable', { fila: 'R-MMC-03' }], COMP('mmc', 'PT-MMC-01 v1 §4')] }
  ];
  // Tareas críticas: dónde y quiénes las hacen (lo usan las pruebas y el simulador)
  var TAREAS = [
    { ficha: 'FT-MOL-01', area: 'AR-P2', etapa: 7, piso: 2, descripcion: 'Armado de moldaje de losa cortando placas con sierra circular', personas: ['013', '014'], respuestas: { sierra: true } },
    { ficha: 'FT-ALT-01', area: 'AR-P2', etapa: 7, piso: 2, descripcion: 'Instalación de barandas perimetrales en borde de losa', personas: ['025', '026'], respuestas: {} },
    { ficha: 'FT-CUB-01', area: 'AR-CUB', etapa: 9, piso: 5, descripcion: 'Instalación de planchas de zinc en la techumbre con esmeril', personas: ['029', '030'], respuestas: { corte_zinc: true } },
    { ficha: 'FT-AND-01', area: 'AR-FAC', etapa: 10, piso: 5, descripcion: 'Armado de andamio perimetral de fachada de más de 12 m', personas: ['027', '028'], respuestas: { altura_12: true } },
    { ficha: 'FT-EXC-01', area: 'AR-EXC-01', etapa: 4, piso: 1, descripcion: 'Excavación de zanjas de fundación con retroexcavadora', personas: ['050', '031', '032'], respuestas: {}, roles: { '050': ['op_retro'] } },
    { ficha: 'FT-IZA-01', area: 'AR-P2', etapa: 7, piso: 2, descripcion: 'Izaje de paneles de moldaje con grúa torre', personas: ['052', '036'], respuestas: {}, roles: { '052': ['op_grua'], '036': ['rigger'] } },
    { ficha: 'FT-MTL-01', area: 'AR-ACO-01', etapa: 7, piso: 2, descripcion: 'Traslado de materiales con manipulador telescópico', personas: ['053', '058'], respuestas: { solo_traslado: true }, roles: { '053': ['op_manip'] } },
    { ficha: 'FT-CAL-01', area: 'AR-TAL-02', etapa: 7, piso: 2, descripcion: 'Soldadura de insertos metálicos en el taller de enfierradura', personas: ['023', '024'], respuestas: { recinto: false } },
    { ficha: 'FT-LOT-01', area: 'AR-MAQ-01', etapa: 7, piso: 2, descripcion: 'Mantención mecánica de retroexcavadora con bloqueo de energías', personas: ['048', '049'], respuestas: { electrico: false, mecanica: true } },
    { ficha: 'FT-LOT-01', area: 'AR-P2', etapa: 7, piso: 2, descripcion: 'Intervención eléctrica de un tablero con bloqueo de energías', personas: ['035'], respuestas: { electrico: true, mecanica: false } },
    { ficha: 'FT-HOR-01', area: 'AR-P2', etapa: 7, piso: 2, descripcion: 'Hormigonado de losa con bomba y capacho', personas: ['019', '020'], respuestas: { capacho: true } },
    { ficha: 'FT-ENF-01', area: 'AR-P2', etapa: 7, piso: 2, descripcion: 'Enfierradura de losa con dobladora', personas: ['016', '017', '018'], respuestas: { dobladora: true } },
    { ficha: 'FT-MMC-01', area: 'AR-BOD-01', etapa: 7, piso: 2, descripcion: 'Traslado manual de materiales en la bodega general', personas: ['021', '022'], respuestas: { sobre_25: true } }
  ];
  // Mapa de tareas del inventario a fichas (la etapa y el auxiliar quedan enlazados a su ficha)
  var FICHA_DE_TAREA = { 'Excavación masiva con retroexcavadora': 'FT-EXC-01', 'Excavación manual de zanjas': 'FT-EXC-01', 'Hormigonado con bomba y vibrado': 'FT-HOR-01', 'Corte, doblado y amarre de enfierradura': 'FT-ENF-01', 'Andamios perimetrales de fachada': 'FT-AND-01',
    'Izaje con grúa': 'FT-IZA-01', 'Mantención de maquinaria en terreno': 'FT-LOT-01', 'Almacenamiento en bodega y acopio': 'FT-MMC-01', 'Soldadura de insertos metálicos': 'FT-CAL-01', 'Traslado de materiales con manipulador telescópico': 'FT-MTL-01' };

  // ---------- 6. Áreas ----------
  // [id, nombre, zona, tipo, etapas, piso, fichas permitidas, peligros, encargado]
  var PISO = ['FT-MOL-01', 'FT-ALT-01', 'FT-ENF-01', 'FT-HOR-01', 'FT-AND-01', 'FT-IZA-01', 'FT-LOT-01', 'FT-MMC-01', 'FT-CAL-01'];
  var AREAS = [
    ['AR-TER-01', 'Terreno del proyecto (reconocimiento)', 'Z-EXT', 'variable', [1, 3], null, [], ['Terreno irregular', 'Vegetación y escombros'], '002'],
    ['AR-TAL-01', 'Taller de moldajes', 'Z-FAE', 'fija', [2, 12], null, ['FT-MOL-01', 'FT-MMC-01'], ['Sierra circular en uso', 'Acopio de placas', 'Cables eléctricos'], '008'],
    ['AR-TAL-02', 'Taller de enfierradura y soldadura', 'Z-FAE', 'fija', [2, 8], null, ['FT-ENF-01', 'FT-CAL-01', 'FT-MMC-01'], ['Barras de acero con puntas', 'Dobladora en uso', 'Soldadura'], '008'],
    ['AR-BOD-01', 'Bodega general', 'Z-FAE', 'fija', [2, 15], null, ['FT-MMC-01'], ['Estanterías en altura', 'Manejo manual de cargas'], '002'],
    ['AR-BOD-02', 'Bodega de sustancias peligrosas', 'Z-FAE', 'fija', [2, 15], null, [], ['Sustancias inflamables y corrosivas'], '002'],
    ['AR-ACO-01', 'Acopio de materiales', 'Z-FAE', 'fija', [2, 15], null, ['FT-MTL-01', 'FT-IZA-01', 'FT-MMC-01'], ['Tránsito de grúa y camiones', 'Caída de material acopiado'], '002'],
    ['AR-RES-01', 'Patio de residuos', 'Z-FAE', 'fija', [2, 15], null, ['FT-MMC-01'], ['Residuos cortantes', 'Residuos peligrosos'], '002'],
    ['AR-MAQ-01', 'Patio de maquinaria', 'Z-FAE', 'fija', [2, 14], null, ['FT-LOT-01', 'FT-MTL-01'], ['Maquinaria en movimiento', 'Fluidos a presión', 'Derrames de aceite'], '002', [{ id: 'a_chaleco', nombre: 'Chaleco reflectante', icono: '🦺', cita: 'EST-EPP-MOD v1 §5.1' }]],
    ['AR-EXC-01', 'Excavación de fundaciones', 'Z-EDI', 'variable', [4, 5], null, ['FT-EXC-01', 'FT-ENF-01', 'FT-HOR-01', 'FT-MMC-01'], ['Bordes de excavación', 'Maquinaria en movimiento'], '002'],
    ['AR-P1', 'Frente de trabajo · piso 1', 'Z-EDI', 'variable', [6, 12], 1, PISO, ['Borde de losa', 'Moldajes y alzaprimas', 'Caída de objetos'], '009'],
    ['AR-P2', 'Frente de trabajo · piso 2', 'Z-EDI', 'variable', [6, 12], 2, PISO, ['Borde de losa', 'Moldajes y alzaprimas', 'Caída de objetos'], '009'],
    ['AR-P3', 'Frente de trabajo · piso 3', 'Z-EDI', 'variable', [6, 12], 3, PISO, ['Borde de losa', 'Moldajes y alzaprimas', 'Caída de objetos'], '009'],
    ['AR-P4', 'Frente de trabajo · piso 4', 'Z-EDI', 'variable', [6, 12], 4, PISO, ['Borde de losa', 'Moldajes y alzaprimas', 'Caída de objetos'], '009'],
    ['AR-P5', 'Frente de trabajo · piso 5', 'Z-EDI', 'variable', [6, 12], 5, PISO, ['Borde de losa', 'Moldajes y alzaprimas', 'Caída de objetos'], '009'],
    ['AR-CUB', 'Cubierta', 'Z-EDI', 'variable', [9, 10], null, ['FT-ALT-01', 'FT-CUB-01', 'FT-MTL-01', 'FT-CAL-01', 'FT-IZA-01'], ['Borde de cubierta', 'Trabajos en caliente (membrana)'], '009'],
    ['AR-FAC', 'Fachadas y andamios perimetrales', 'Z-EDI', 'variable', [10, 12], null, ['FT-AND-01', 'FT-ALT-01', 'FT-IZA-01'], ['Andamios', 'Caída de objetos a la vía'], '009'],
    ['AR-EXT', 'Obras exteriores y áreas comunes', 'Z-EXT', 'variable', [13, 15], null, ['FT-EXC-01', 'FT-MTL-01', 'FT-HOR-01', 'FT-MMC-01'], ['Tránsito de maquinaria', 'Zanjas abiertas'], '002']
  ];

  // ---------- Construcción de documentos y fichas ----------
  function docPts(x, hoy) {
    var id = x[0], titulo = x[2], pasos = x[4].map(function (t, i) { var q = t.split(' ~ '); return { n: i + 1, texto: q[0], riesgo: q[1], control: q[2], jerarquia: /bloqueo|eliminac|catastro|entibaci/i.test(q[2]) ? JER[1] : /arnés|guantes|pantalla|careta|mascarilla|protector auditivo/i.test(q[2]) && !/permiso|procedimiento/i.test(q[2]) ? JER[3] : JER[2] }; });
    return {
      objetivo: 'Establecer el método de trabajo seguro para ' + titulo.toLowerCase() + ', controlando los riesgos de la MIPER (MR-MOD-01).',
      alcance: 'Aplica al personal propio y al de las empresas contratistas y subcontratistas que ejecutan esta actividad en la faena Edificio Los Aromos.',
      definiciones: ['PTS: procedimiento de trabajo seguro.', 'Control crítico: condición que debe verificarse en terreno antes de iniciar.', 'EPP residual: protección personal que se usa cuando el riesgo no se puede eliminar ni controlar en la fuente.'],
      responsables: [{ cargo: 'Administrador de obra / representante legal', funcion: 'Aprobar el procedimiento y asignar los recursos.' }, { cargo: 'Jefe de terreno', funcion: 'Planificar la tarea y verificar los controles críticos en terreno.' }, { cargo: 'Experto en prevención de riesgos', funcion: 'Asesorar la elaboración, verificar los estándares y auditar el cumplimiento.' },
        { cargo: 'Capataz o supervisor', funcion: 'Instruir a su cuadrilla, verificar el área y detener el trabajo ante un riesgo no controlado.' }, { cargo: 'Trabajadores', funcion: 'Cumplir la secuencia, usar el EPP y ejercer el derecho a interrumpir ante riesgo grave e inminente (Código del Trabajo art. 184 bis).' }, { cargo: 'Comité paritario o delegado de SST', funcion: 'Conocer el procedimiento y verificar las condiciones en visitas de terreno.' }],
      epp: x[3], equipos: 'Herramientas, equipos y maquinaria con mantención e inspección al día, según los manuales del fabricante.', pasos: pasos,
      emergencias: 'Ante un accidente o una condición peligrosa: detener el trabajo, asegurar el área, avisar al capataz y a Prevención, y activar el plan de emergencia de la obra.',
      registros: ['Lista de verificación de la tarea', 'Registro de difusión del procedimiento', 'AST de cuadrilla firmada'], difusion: { fecha: hoy, version: '1', medio: 'Charla de cuadrilla con firma' },
      elaboro: 'Supervisor de la especialidad con asesoría del experto en prevención', reviso: 'Jefe de terreno y comité paritario', aprobo: 'Administrador de obra (aprobación ficticia, ' + ETIQUETA + ')', secciones: SECCIONES
    };
  }
  var FALTA_PTS = ['objetivo', 'alcance', 'definiciones', 'responsables', 'epp', 'equipos', 'pasos', 'emergencias', 'registros', 'difusion', 'elaboro', 'reviso', 'aprobo'];
  function ptsCompleto(doc) {
    var c = doc && doc.contenido, f = [];
    if (!c) return ['sin contenido'];
    FALTA_PTS.forEach(function (k) { var v = c[k]; if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) f.push(k); });
    if (c.pasos && c.pasos.some(function (p) { return !p.texto || !p.riesgo || !p.control; })) f.push('pasos sin riesgo o control');
    if (!doc.version) f.push('version');
    return f;
  }

  function fichasDe(hoy, filas) {
    var base = { estado: 'VALIDADA', validadaPor: pid('003'), validadaEn: hoy, simulacion: true };
    var fila = function (id) { return filas.filter(function (r) { return r.id === id; })[0]; };
    return FICHAS.map(function (s) {
      var proc = PROCS.filter(function (p) { return p[0] === s.doc; })[0], nPasos = proc[4].length;
      var cita = function (o) { return o.fila ? 'MR-MOD-01 ' + o.fila : o.doc; };
      var mat = filas.filter(function (r) { return r.ficha === s.id; }).map(function (r) { return r.id; });
      var f = Object.assign({}, base, {
        id: s.id, nombre: s.nombre, documento: s.doc, matriz: mat, ambiental: s.ambiental, claves: s.claves, descripcion: s.descripcion, referencias: [s.doc].concat(s.refs, ['MR-MOD-01', 'EST-EPP-MOD']).filter(function (x, i, l) { return l.indexOf(x) === i; }),
        pasos: proc[4].map(function (t, i) { return { texto: t.split(' ~ ')[0], cita: s.doc + ' v1 §6.' + (i + 1) }; }).slice(0, nPasos),
        peligros: mat.map(function (id) { var r = fila(id); return { peligro: r.peligro_fuente_condicion, riesgo: r.riesgo_evento_dano, control: r.medida_preventiva_detalle, cita: 'MR-MOD-01 ' + id, fila: id }; }),
        preguntas: s.preguntas.map(function (q) { var o = { id: q.id, texto: q.texto, detectar: q.detectar, cita: cita(q) }; if (q.herramienta) o.herramienta = q.herramienta; if (q.brechaSi !== undefined) { o.brechaSi = q.brechaSi; o.brechaTexto = q.brechaTexto; } return o; }),
        requisitos: s.reqs.map(function (r) {
          var o = r[5], x = { id: r[0], tipo: r[1], nombre: r[2], icono: r[3], nivel: r[4], cita: cita(o) };
          ['si', 'critico', 'verifica', 'rol', 'ambito', 'equipo', 'registro'].forEach(function (k) { if (o[k] !== undefined) x[k] = o[k]; });
          if (o.comp) x.competencia = o.comp;
          return x;
        }),
        permisos: s.permiso ? [{ id: s.permiso, nombre: PERM[s.permiso].nombre, formato: PERM[s.permiso].formato, revisa: 'encargado_area', autoriza: PERM[s.permiso].autoriza, cita: PERM[s.permiso].doc + ' v1 §8', condiciones: PERM[s.permiso].condiciones.slice() }] : [],
        aprobaciones: s.permiso ? [{ calidad: 'prevencion', modo: 'presencial', cita: s.doc + ' v1 §9' }] : []
      });
      if (s.roles) f.roles = s.roles.map(function (r) { return { id: r.id, texto: r.texto, nombre: r.nombre, equipo: r.equipo, obligatorio: r.obligatorio, cita: r.doc }; }).map(function (r) { if (!r.equipo) delete r.equipo; return r; });
      if (s.equipos) f.equipos = s.equipos.map(function (e) { return { id: e.id, tipo: e.tipo, nombre: e.nombre, cita: e.doc, inspeccion: e.inspeccion }; });
      return f;
    });
  }

  function filasMiper(met, hoy, personas) {
    var fd = function (n) { var d = new Date(hoy); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
    var sx = function (cargos) { var h = 0, m = 0; personas.forEach(function (p) { if (cargos.some(function (c) { return p.cargo.indexOf(c) >= 0; })) { if (p.sexo === 'M') m++; else h++; } }); return [h, m]; };
    var todos = [personas.filter(function (p) { return p.sexo !== 'M'; }).length, personas.filter(function (p) { return p.sexo === 'M'; }).length];
    return FILAS.map(function (r, n) {
      var ex = r[1] ? sx(EXPUESTOS[r[1]]) : todos;
      if (ex[0] + ex[1] === 0) ex = todos;
      var pc = evaluar(met, r[8], r[9]), res = evaluar(met, r[13], r[14]);
      var fila = { id: r[0], ficha: r[1], proceso: r[1] ? PROCESO[r[1]] : 'Transversal', puesto_trabajo: r[2], tarea_descripcion: r[3], tipo_tarea: r[4], tipo_factor_riesgo: r[5], peligro_fuente_condicion: r[6], riesgo_evento_dano: r[7],
        expuestos_hombres: ex[0], expuestos_mujeres: ex[1], sensibilidad_especial_genero: !!r[21], sensibilidad_detalle: r[21] ? 'Embarazo, lactancia o condición que limite el esfuerzo: sin manejo manual de cargas' : null,
        probabilidad_pura: r[8], consecuencia_pura: r[9], magnitud_valor: pc.valor, magnitud_nivel_riesgo: pc.nivel, jerarquia_control_tipo: JER[r[10] - 1], medida_preventiva_detalle: r[11], medidas_emergencia_adicionales: r[12],
        probabilidad_residual: r[13], consecuencia_residual: r[14], residual_valor: res.valor, nivel_riesgo_residual: res.nivel, responsable_implementacion: r[15], plazo_implementacion: r[16] === 'VERIFICADA' ? fd(-100 + n) : r[16] === 'IMPLEMENTADA' ? fd(-30) : fd(30), estado_control: r[16],
        procedimientos: r[17], capacitacion: r[18], permisos: r[19], metodologia_especial: r[20] || null, justificacion_epp: r[10] === 4 ? 'No es factible eliminar ni controlar en la fuente: el EPP queda como control residual (DS 44 art. 9 N° 4).' : null,
        // compatibilidad con los campos de la matriz del escenario viejo (vistas y filtros)
        etapa: 'Auxiliar', actividad: r[1] || 'General', tarea: r[1] || 'GENERAL', puesto: r[2], ubicacion: 'Faena Edificio Los Aromos', expuestos: ex[0] + ex[1] + ' personas (' + ex[0] + ' H, ' + ex[1] + ' M)', categoria: { SEGURIDAD: 'Seguridad', ERGONOMICO: 'Ergonomía', HIGIENE_QUIMICO: 'Salud ocupacional', HIGIENE_FISICO: 'Salud ocupacional', PSICOSOCIAL: 'Salud ocupacional', VIOLENCIA_ACOSO: 'Salud ocupacional' }[r[5]], peligro: r[6], consecuencia: r[7],
        controles: r[11], evaluacion: { p: r[8], c: r[9], valor: pc.valor, nivel: pc.nivel, supuesto: true }, medidas: r[11], implementa: r[15], verifica: 'Prevención' };
      if (r[4] === 'EMERGENCIA') fila.categoria = 'Emergencias';
      return fila;
    });
  }
  // Reglas de la especificación de la MIPER: devuelve la lista de errores (vacía = válida)
  function validarMiper(db) {
    var err = [], m = db.escenario.matriz;
    m.forEach(function (r) {
      var puntos = function (c) { err.push(r.id + ': ' + c); };
      ['proceso', 'puesto_trabajo', 'tarea_descripcion', 'peligro_fuente_condicion', 'riesgo_evento_dano', 'medida_preventiva_detalle', 'responsable_implementacion'].forEach(function (k) { if (!r[k]) puntos('falta ' + k); });
      if (['RUTINARIA', 'NO_RUTINARIA', 'EMERGENCIA'].indexOf(r.tipo_tarea) < 0) puntos('tipo_tarea no válido');
      if (['SEGURIDAD', 'ERGONOMICO', 'PSICOSOCIAL', 'VIOLENCIA_ACOSO', 'HIGIENE_QUIMICO', 'HIGIENE_FISICO', 'HIGIENE_BIOLOGICO'].indexOf(r.tipo_factor_riesgo) < 0) puntos('factor de riesgo no válido');
      if (!(r.expuestos_hombres >= 0 && r.expuestos_mujeres >= 0 && r.expuestos_hombres + r.expuestos_mujeres > 0)) puntos('expuestos desagregados por sexo (DS 44 art. 7)');
      if (typeof r.sensibilidad_especial_genero !== 'boolean') puntos('falta la sensibilidad especial');
      if (JER.indexOf(r.jerarquia_control_tipo) < 0) puntos('jerarquía de control no válida');
      if (NIVELES_ALTOS.indexOf(r.magnitud_nivel_riesgo) >= 0 && !r.medidas_emergencia_adicionales) puntos('riesgo importante, intolerable o no aceptable sin medidas de emergencia adicionales (DS 44 art. 7 inc. final)');
      if (r.jerarquia_control_tipo === JER[3] && !r.justificacion_epp) puntos('EPP como control sin justificar por qué no se elimina ni se controla en la fuente');
      if (NIVELES_ALTOS.indexOf(r.nivel_riesgo_residual) >= 0) puntos('riesgo residual importante o intolerable: no se empieza ni se sigue el trabajo hasta bajarlo (Guía ISP)');
      if (r.residual_valor > r.magnitud_valor) puntos('el riesgo residual no puede superar al inicial');
      if (['PLANIFICADA', 'EN_EJECUCION', 'IMPLEMENTADA', 'VERIFICADA'].indexOf(r.estado_control) < 0) puntos('estado del control no válido');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.plazo_implementacion || '')) puntos('plazo no válido');
      var met = db.escenario.metodologia;
      if (!r.metodologia_especial && (r.magnitud_nivel_riesgo !== evaluar(met, r.probabilidad_pura, r.consecuencia_pura).nivel)) puntos('nivel de riesgo no coincide con la metodología');
    });
    return err;
  }

  // ---------- Construcción del mundo ----------
  function construir(o) {
    o = o || {};
    if (o.hoy && !o.reloj) o = Object.assign({}, o, { reloj: o.hoy + 'T12:00:00.000Z' });
    var db = E.construir(o), hoy = db.creadoEn;
    var fd = function (n) { var d = new Date(hoy + 'T00:00:00.000Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
    var etapasBase = JSON.parse(JSON.stringify(db.escenario.etapas)), auxBase = JSON.parse(JSON.stringify(db.escenario.auxiliares));
    var hab = JSON.parse(JSON.stringify(db.personas.filter(function (p) { return p.codigo; })[0].hab));
    ['induccion', 'instruccion'].forEach(function (k) { if (hab[k] && hab[k].verificadoPor) hab[k].verificadoPor = pid('003'); });
    var cuentas = db.personas.filter(function (p) { return ['p-admin', 'p-redaccion', 'p-revisor'].indexOf(p.id) >= 0; });
    cuentas.forEach(function (p) { p.empresa = P; p.rut = null; });
    var FUNC = { trabajador: 'ejecutante', operador: 'ejecutante', capataz: 'supervisor', supervisor: 'supervisor', jefe_terreno: 'supervisor', jefatura: 'supervisor', prevencion: 'verificador', medio_ambiente: 'verificador', calidad: 'verificador', mandante: 'aprobador' };
    db.empresas = EMPRESAS.map(function (e) { return Object.assign({ firma: 'PIN', simulacion: true }, e); });
    db.faena = { id: OBRA.codigo, nombre: OBRA.nombre + ' · 5 pisos · 100 departamentos', empresas: EMPRESAS.map(function (e) { return e.id; }) };
    var ingresoDe = function (x) { var n = +x[0]; if (x[3] === SC) return fd(-40); if (x[3] === SM || x[3] === SN) return fd(-150); return fd(n <= 12 ? -180 : -170 + (n % 5) * 10); };
    db.personas = PLANTA.map(function (x, i) {
      var comps = {}, cargo = x[1], n = +x[0];
      (COMP_CARGO[cargo] || []).forEach(function (k) { comps[k] = { nombre: COMP_TXT[k], vence: fd(300), verificadoPor: pid('003'), verificadoEn: hoy }; });
      return { id: pid(x[0]), codigo: 'MOD-' + x[0], rut: null, ingreso: 'MOD-' + x[0], nombre: NOMBRES[i] + ' Modelo', empresa: x[3], rol: x[2], cargo: cargo, funciones: x[4].slice(), sexo: (n % 6 === 0 || x[0] === '003') ? 'M' : 'H', fechaIngreso: ingresoDe(x),
        hab: JSON.parse(JSON.stringify(hab)), comp: comps, pin: pin(pid(x[0])), ausente: false, simulacion: true, funcionTerreno: x[0] === '006' ? 'ocasional' : FUNC[x[2]] || null, enNominaTerreno: true };
    }).concat(cuentas);
    db.zonas = [{ id: 'Z-FAE', nombre: 'Instalación de faena' }, { id: 'Z-EDI', nombre: 'Edificio' }, { id: 'Z-EXT', nombre: 'Exteriores y urbanización' }];
    db.areas = AREAS.map(function (x) {
      return { id: x[0], codigo: x[0], nombre: x[0] + ' · ' + x[1], zona: x[2], tipoArea: x[3], etapas: x[4], piso: x[5], qr: A.sha256('qr-modelo-' + x[0]).slice(0, 32), qrVersion: 1, eppArea: x[9] || [],
        levantamiento: { verificadoPor: pid('003'), verificadoEn: hoy }, diagnostico: { trabajos: x[6], peligros: x[7], verificadoPor: pid('003'), verificadoEn: hoy } };
    });
    db.responsables = AREAS.map(function (x) { return { area: x[0], calidad: 'encargado_area', persona: pid(x[8]) }; }).concat(
      ['AR-P1', 'AR-P2', 'AR-P3', 'AR-P4', 'AR-P5', 'AR-CUB', 'AR-FAC'].map(function (a) { return { area: a, calidad: 'encargado_area', persona: pid('008'), reemplazaA: pid('009') }; }),
      ['AR-TAL-01', 'AR-TAL-02'].map(function (a) { return { area: a, calidad: 'encargado_area', persona: pid('009'), reemplazaA: pid('008') }; }),
      [{ area: 'AR-MAQ-01', calidad: 'encargado_area', persona: pid('008'), reemplazaA: pid('002') }],
      ['Z-FAE', 'Z-EDI', 'Z-EXT'].reduce(function (l, z) { return l.concat([{ zona: z, calidad: 'prevencion', persona: pid('003') }, { zona: z, calidad: 'medio_ambiente', persona: pid('004') }, { zona: z, calidad: 'mandante', persona: pid('007') }, { zona: z, calidad: 'informado', persona: pid('005') }]); }, []),
      [{ empresa: SM, calidad: 'responsable_subcontrato', persona: pid('010') }, { empresa: SN, calidad: 'responsable_subcontrato', persona: pid('011') }, { empresa: SC, calidad: 'responsable_subcontrato', persona: pid('012') }]);
    var todo = ['consultar', 'crear', 'registrar_trabajadores', 'revisar', 'observar', 'aprobar', 'gestionar_pendientes', 'verificar_terreno'];
    db.asignaciones = db.personas.filter(function (p) { return ['trabajador', 'operador'].indexOf(p.rol) >= 0; }).map(function (p) { return { persona: p.id, permisos: ['consultar', 'crear'], alcance: { empresa: p.empresa } }; }).concat([
      { persona: pid('001'), permisos: ['consultar', 'aprobar', 'ver_historial'], alcance: { empresa: P } },
      { persona: pid('002'), permisos: todo.concat('configurar_areas', 'ver_historial'), alcance: { empresa: P } },
      { persona: pid('003'), permisos: todo.concat('configurar_areas', 'configurar', 'ver_historial'), alcance: { empresa: P } },
      { persona: pid('004'), permisos: ['consultar', 'revisar', 'observar', 'aprobar'], alcance: { empresa: P } },
      { persona: pid('005'), permisos: ['consultar', 'observar'], alcance: { empresa: P } },
      { persona: pid('007'), permisos: ['consultar', 'revisar', 'observar', 'aprobar'], alcance: { zonas: ['Z-FAE', 'Z-EDI', 'Z-EXT'] } },
      { persona: pid('008'), permisos: todo.concat('ver_historial'), alcance: { zonas: ['Z-FAE', 'Z-EDI'] } },
      { persona: pid('009'), permisos: todo.concat('ver_historial'), alcance: { zonas: ['Z-FAE', 'Z-EDI'] } },
      { persona: pid('010'), permisos: todo, alcance: { contrato: SM } }, { persona: pid('011'), permisos: todo, alcance: { contrato: SN } }, { persona: pid('012'), permisos: todo, alcance: { contrato: SC } }
    ]);
    db.cuadrillas = CU.map(function (c, k) {
      return { id: c.id, nombre: 'Cuadrilla ' + (k + 1) + ' · ' + A.porId(db.personas, pid(c.resp)).nombre, empresa: c.empresa, responsable: pid(c.resp), reemplazo: c.reemp ? pid(c.reemp) : null, jefatura: pid('002'), turno: 'dia',
        integrantes: c.cargos.map(function (x, j) { return pid(String(c.primero + j).padStart(3, '0')); }) };
    });
    // Biblioteca documental: todo VIGENTE (v1) con contenido de PTS
    var aprob = function (v) { return { nombre: 'Aprobación ficticia (' + ETIQUETA + ')', cargo: 'Administrador de obra (simulación)', fecha: hoy, version: v }; };
    var doc = function (id, tipo, titulo, version, contenido) {
      var d = { id: id, empresa: P, tipo: tipo === 'transversal' || tipo === 'actividad' ? 'procedimiento' : tipo, titulo: titulo, version: version, fecha: hoy, estado: 'VIGENTE', origen: 'empresa', simulacion: true, nota: ETIQUETA + ': no constituye documentación aprobada para una obra real.',
        responsables: { elaboro: 'p-redaccion', revisionTecnica: null, aprobo: null }, revisionesAdicionales: [], noVerificados: [], historial: [{ estado: 'VIGENTE', por: pid('003'), en: hoy + 'T12:00:00.000Z', nota: ETIQUETA }], aprobacion: aprob(version), vigenteDesde: hoy };
      if (contenido) d.contenido = contenido;
      return d;
    };
    var docs = PROCS.map(function (x) { return doc(x[0], x[1], x[2], '1', docPts(x, hoy)); }).concat(OTROS_DOCS.map(function (x) { return doc(x.id, x.tipo, x.titulo, x.version, null); }));
    var personasNom = db.personas.filter(function (p) { return p.codigo; });
    var met = METODOS.ISP, filas = filasMiper(met, hoy, personasNom);
    db.biblioteca = { ficticia: true, simulacion: true, documentos: docs, documentoPendiente: null,
      eppBasicos: [['b_casco', 'Casco de seguridad', '⛑️', '§4.1'], ['b_barbiquejo', 'Barbiquejo', '🪖', '§4.1'], ['b_lentes', 'Gafas de seguridad o antiparras', '🥽', '§4.2'], ['b_calzado', 'Calzado de seguridad', '🥾', '§4.3'], ['b_ropa', 'Ropa de trabajo', '👷', '§4.4']]
        .map(function (x) { return { id: x[0], tipo: 'epp', nombre: x[1], icono: x[2], nivel: 'declarado', cita: 'EST-EPP-MOD v1 ' + x[3] }; }),
      fichas: fichasDe(hoy, filas) };
    // Aprendizaje: contratos, revisor y cápsulas ligadas a fichas que existen aquí
    var fichaIds = db.biblioteca.fichas.map(function (f) { return f.id; });
    db.aprendizaje.contratos = {}; db.aprendizaje.contratos[P] = { activo: true, minutos: 5, diasCiclo: 14 }; db.aprendizaje.contratos[SM] = { activo: true, minutos: 5, diasCiclo: 14 };
    db.aprendizaje.revisores = [pid('003')]; db.aprendizaje.progreso = {};
    db.aprendizaje.capsulas = db.aprendizaje.capsulas.filter(function (c) { return c.fichas.every(function (f) { return fichaIds.indexOf(f) >= 0; }); }).map(function (c) { c.empresa = null; if (c.revisadaPor) c.revisadaPor = pid('003'); return c; });
    db.servicios = {}; db.servicios[P] = { plataforma: true, capsulas: true, documental: true }; db.servicios[SM] = { plataforma: true, capsulas: true, documental: false }; db.servicios[SN] = { plataforma: true, capsulas: false, documental: false }; db.servicios[SC] = { plataforma: true, capsulas: false, documental: false }; db.servicios[M] = { plataforma: false, capsulas: false, documental: false };
    db.aprobadoresDoc = {}; db.aprobadoresDoc[P] = [{ persona: pid('003'), cargo: 'Experto en prevención de riesgos (aprobación ficticia)' }, { persona: pid('001'), cargo: 'Administrador de obra (aprobación ficticia)' }];
    Object.assign(db.config, { vigenciaAstHoras: 12, intentosPin: 3, mandanteAutorizaSubcontratos: true, prevencionSiempre: false });
    db.asts = []; db.avisos = []; db.charlas = []; db.hallazgos = []; db.obsArea = []; db.fotos = []; db.rotacion = {}; db.solicitudesDoc = []; db.comunicacionesDoc = [];
    db.nominaExcepciones = []; db.nominaGestiones = []; db.nominaControles = []; db.capsulas = []; db.cola = []; db.colaLocal = []; db.idsAplicados = {}; db.sincronizaciones = []; db.seq = 0; db.eventos = [];
    db.equipos = []; db.accesorios = []; db.discrepancias = []; db.tareas = [];
    // Equipos con registro en el sistema (SIMULACIÓN): inspección pre-uso de hoy y certificación vigente
    var hoyReloj = (o.reloj || hoy + 'T11:30:00.000Z').slice(0, 10);
    var unidad = function (id, tipo, nombre, emp, ins, venceCert) { return { id: id, tipo: tipo, nombre: nombre, empresa: emp, certificacion: { vence: fd(venceCert), entidad: 'Entidad certificadora (simulación)' }, inspecciones: [ins], simulacion: true }; };
    var insp = function (n, unidadId, por) { return { id: 'IN-' + String(n).padStart(4, '0'), unidad: unidadId, ast: null, por: pid(por), en: hoyReloj + 'T10:30:00.000Z', resultado: 'CONFORME', items: [], simulacion: true }; };
    db.inspecciones = [insp(0, 'EQ-MT-01', '053'), insp(1, 'EQ-GR-01', '052'), insp(2, 'EQ-RT-01', '050')];
    db.equiposObra = [unidad('EQ-MT-01', 'manipulador_telescopico', 'Manipulador telescópico EQ-MT-01', SN, db.inspecciones[0], 200), unidad('EQ-GR-01', 'grua_torre', 'Grúa torre EQ-GR-01', SN, db.inspecciones[1], 260), unidad('EQ-RT-01', 'retroexcavadora', 'Retroexcavadora EQ-RT-01', SN, db.inspecciones[2], 180)];
    // Escenario: reutiliza las etapas del escenario base y las enlaza con las fichas de la obra modelo
    var enlazar = function (t) { var f = FICHA_DE_TAREA[t.nombre]; if (f) t.ficha = f; if (t.nombre === 'Andamios perimetrales de fachada') t.procedimientos.push('PT-AND-01'); if (t.nombre === 'Almacenamiento en bodega y acopio') t.procedimientos.push('PT-MMC-01'); if (t.nombre === 'Mantención de maquinaria en terreno') t.procedimientos.push('PT-LOT-01'); return t; };
    etapasBase.forEach(function (e) { e.tareas.forEach(enlazar); }); auxBase.forEach(enlazar);
    db.escenario = {
      codigo: P, etiqueta: ETIQUETA, tipo: 'obra_modelo', obra: OBRA, estado: { etapa: o.etapa || 7, pisoActual: o.pisoActual || 2 }, metodologia: Object.assign({ nota: 'Valores de evaluación = supuestos de simulación. Las exposiciones a agentes (ruido, sílice, UV) se rigen por el protocolo MINSAL especial correspondiente (PREXOR, PLANESI, UV).', configurable: true }, met),
      etapas: etapasBase, auxiliares: auxBase, procedimientos: PROCS.map(function (x) { return { id: x[0], tipo: x[1], titulo: x[2], estado: 'VIGENTE' }; }), matriz: filas,
      ambiental: AMBIENTAL.map(function (r) { return { id: r[0], tarea: r[1], aspecto: r[2], impacto: r[3], componente: r[4], controles: r[5], documento: r[6], evaluacion: 'Sin evaluar: supuesto de simulación' }; })
    };
    E.activar(db);
    A.registrar(db, { tipo: 'ESCENARIO', actor: 'p-admin', datos: { escenario: P, etiqueta: ETIQUETA, tipo: 'obra_modelo', etapa: db.escenario.estado.etapa, pisoActual: db.escenario.estado.pisoActual } });
    cargarCumplimiento(db, hoy, fd);
    return db;
  }

  // ---------- Cumplimiento: todo el registro legal al día, cargado con eventos K_* reales ----------
  function cargarCumplimiento(db, hoy, fd) {
    K.activar(db, { representanteLegal: pid('001'), inicioObra: fd(-180) });
    var k = function (tipo, actor, datos) { var r = K.aplicar(db, { tipo: tipo, actor: pid(actor), datos: datos }); if (!r.ok) throw new Error('Obra modelo: ' + tipo + ' rechazado: ' + r.motivo); return r; };
    var nom = K.nomina(db), codigo = function (p) { return p.id.slice(4); };
    var principal = nom.filter(function (p) { return p.empresa === P; });
    // DS 76: registro de la faena, reglamento especial firmado ANTES de entrar, sistema de gestión
    k('K_FAENA_ANTECEDENTE', '002', { fecha: fd(-180), antecedente: 'CRONOGRAMA' });
    k('K_SGSST_FAENA', '001', { fecha: fd(-178), politica: 'Política de SST de la obra: protección de todas las personas de la faena, con perspectiva de género.', componentes: ['Política', 'Organización y funciones', 'Diagnóstico unificado de riesgos', 'Programa de trabajo de la faena'] });
    k('K_REGLAMENTO_EMITIR', '001', { fecha: fd(-176), version: '1', contenido: ['Encargado del sistema de gestión en la obra', 'Coordinación de actividades entre empresas', 'Obligación de informar incidentes y accidentes', 'Prohibiciones expresas en faena', 'Verificación y auditoría de las contratas', 'Sanciones contractuales'] });
    [[SM, '010', 'Moldajes Sur Modelo Ltda.', 'ACHS', 150], [SN, '011', 'Montajes y Mantención Modelo Ltda.', 'Mutual de Seguridad', 150], [SC, '012', 'Terminaciones Menores Modelo Ltda.', 'IST', 40]].forEach(function (c) {
      k('K_FAENA_REGISTRAR', '002', { empresa: c[0], razonSocial: c[2], oal: c[3], jefeFaena: pid(c[1]), dotacion: K.dotacion(db, c[0]), inicio: fd(-c[4]), termino: fd(360), contrato: true, fecha: fd(-c[4] - 6) });
      k('K_REGLAMENTO_ENTREGAR', '003', { fecha: fd(-c[4] - 5), empresa: c[0], firmadoPor: pid(c[1]), pin: pin(pid(c[1])) });
      k('K_FAENA_ANTECEDENTE', '002', { fecha: fd(-c[4]), antecedente: 'EVALUACION_RIESGOS', empresa: c[0] });
    });
    k('K_FAENA_ANTECEDENTE', '002', { fecha: fd(-60), antecedente: 'VISITA_OAL', referencia: 'Visita de asistencia técnica del organismo administrador' });
    // MIPER versionada (inicial y actualización) y programa preventivo en plazo, aprobado por el representante legal
    var ACTS = [['Verificar la guarda de las sierras circulares', '008'], ['Instalar barandas perimetrales antes del hormigonado de cada losa', '009'], ['Evaluación de ruido y audiometrías de expuestos (PREXOR)', '003'], ['Programa de prevención de alcohol y drogas', '003'], ['Promoción de alimentación saludable', '004'], ['Simulacro de rescate en altura', '003']];
    var actividades = function (plazo) { return ACTS.map(function (a, n) { return { descripcion: a[0], responsable: pid(a[1]), plazo: fd(plazo + n * 10), etiqueta: null }; }); };
    var inf = ['trabajadores', 'linea_mando', 'comite'];
    k('K_MIPER_VERSION', '003', { fecha: fd(-180), motivo: 'INICIAL', filas: db.escenario.matriz.length, informadaA: inf, metodologia: 'ISP' });
    k('K_PROGRAMA_ELABORAR', '003', { fecha: fd(-175), miperVersion: 1, actividades: actividades(-20) });
    k('K_PROGRAMA_APROBAR', '001', { fecha: fd(-170), programa: 'PROG-001', pin: pin(pid('001')), copiaComite: true });
    k('K_MIPER_VERSION', '003', { fecha: fd(-60), motivo: 'CAMBIO_CONDICIONES', filas: db.escenario.matriz.length, informadaA: inf, metodologia: 'ISP', consultaComite: true });
    k('K_PROGRAMA_ELABORAR', '003', { fecha: fd(-52), miperVersion: 2, actividades: actividades(20) });
    k('K_PROGRAMA_APROBAR', '001', { fecha: fd(-45), programa: 'PROG-002', pin: pin(pid('001')), copiaComite: true });
    ['002', '008', '009', '010', '011', '012'].forEach(function (c) { k('K_MIPER_CONOCER', '003', { fecha: fd(-58), persona: pid(c), pin: pin(pid(c)) }); });
    // RIOHS por empresa (10 o más trabajadores) e IRL + EPP + RIOHS de cada persona antes de iniciar labores
    [[P, 'p', '001'], [SM, 'sm', '010'], [SN, 'sn', '011']].forEach(function (c) { k('K_RIOHS_APROBAR', c[2], { fecha: fd(-176), empresa: c[0], version: '3', consultaComite: true, remitidoDT: true }); });
    var CONT = ['Peligros específicos de las labores y medidas preventivas', 'Procedimientos de trabajo seguro (PTS) de su tarea', 'Sustancias manipuladas y sus riesgos', 'Plan de emergencia y evacuación', 'Características del lugar de trabajo'];
    nom.forEach(function (p) {
      var c = codigo(p);
      k('K_IRL', '003', { fecha: p.fechaIngreso, persona: p.id, tipo: 'INGRESO', relator: 'Experto en prevención de riesgos', contenido: CONT, pin: p.pin });
      k('K_EPP_ENTREGAR', '003', { fecha: p.fechaIngreso, persona: p.id, items: K.EPP_BASICO.slice(), motivo: 'INGRESO', certificado: true, cobro: 0, pin: p.pin });
      if (K.dotacion(db, p.empresa) >= 10) k('K_RIOHS_ENTREGAR', '003', { fecha: p.fechaIngreso, persona: p.id, pin: p.pin });
    });
    // Capacitaciones: inducción por empresa, uso de EPP, altura, manejo manual de cargas
    [[P, fd(-170)], [SM, fd(-150)], [SN, fd(-150)], [SC, fd(-40)]].forEach(function (c) {
      k('K_CAPACITACION', '003', { fecha: c[1], tema: 'Inducción de ingreso: riesgos de la obra y plan de emergencia', tipo: 'TEORICA', horas: 2, relator: 'Experto en prevención de riesgos', temario: ['Factores de riesgo', 'Medidas preventivas', 'Prestaciones de la Ley 16.744', 'Centro asistencial del organismo administrador', 'Plan de emergencia y señalética'], asistentes: nom.filter(function (p) { return p.empresa === c[0]; }).map(function (p) { return p.id; }), empresa: c[0] });
    });
    k('K_CAPACITACION', '003', { fecha: fd(-100), tema: 'Uso, mantención y recambio de EPP', tipo: 'PRACTICA', horas: 1, relator: 'Experto en prevención de riesgos', temario: ['Uso correcto', 'Mantención', 'Recambio por desgaste'], asistentes: nom.filter(function (p) { return p.fechaIngreso <= fd(-100); }).map(function (p) { return p.id; }) });
    k('K_CAPACITACION', '003', { fecha: fd(-90), tema: 'Trabajo en altura y plan de rescate', tipo: 'PRACTICA', horas: 4, relator: 'Instructor del organismo administrador', temario: ['Línea de vida y arnés', 'Andamios', 'Rescate'], asistentes: nom.filter(function (p) { return p.comp.trabajo_altura; }).map(function (p) { return p.id; }) });
    // Comités: CPHS de la principal (> 25), delegados de SST de los subcontratos de 10 a 25 y CPHS de faena; actas de cada mes completo
    var meses = function (desde) { var l = [], m = K.hoy(db).slice(0, 7), x = desde.slice(0, 7); for (;;) { var y = +x.slice(0, 4), n = +x.slice(5, 7); x = n === 12 ? (y + 1) + '-01' : y + '-' + String(n + 1).padStart(2, '0'); if (x >= m) break; l.push(x); } return l; };
    var actasMensuales = function (id, actor, pres, secre, desde) { meses(desde).forEach(function (m) { k('K_COMITE_ACTA', actor, { fecha: m + '-15', comite: id, tipo: 'ORDINARIA', acuerdos: ['Revisión de la inspección de terreno', 'Seguimiento de las medidas del programa preventivo'], firmadaPor: secre ? [pres, secre] : [pres] }); }); };
    k('K_COMITE_CONSTITUIR', '003', { fecha: fd(-130), tipo: 'CPHS', empresa: P, patronales: [pid('002'), pid('003'), pid('005')], trabajadores: [pid('013'), pid('025'), pid('016')], presidente: pid('002'), secretario: pid('013') });
    k('K_COMITE_CURSO', '003', { fecha: fd(-100), comite: 'CPHS-001', organismo: 'Organismo administrador' });
    actasMensuales('CPHS-001', '002', pid('002'), pid('013'), fd(-130));
    k('K_COMITE_CONSTITUIR', '003', { fecha: fd(-140), tipo: 'DELEGADO', empresa: SM, delegado: pid('038') });
    k('K_COMITE_CONSTITUIR', '003', { fecha: fd(-140), tipo: 'DELEGADO', empresa: SN, delegado: pid('049') });
    k('K_COMITE_CONSTITUIR', '003', { fecha: fd(-120), tipo: 'CPHS_FAENA', empresa: P, duracionDias: OBRA.duracionDias, patronales: [pid('002'), pid('003'), pid('008')], trabajadores: [pid('025'), pid('037'), pid('048')], presidente: pid('002'), secretario: pid('037') });
    k('K_COMITE_CURSO', '003', { fecha: fd(-95), comite: 'CPHSF-004', organismo: 'Organismo administrador' });
    actasMensuales('CPHSF-004', '002', pid('002'), pid('037'), fd(-120));
    // Emergencias, DS 594 del día, protocolos MINSAL, Ley Karin (protocolo y difusión; sin denuncias), horas-hombre
    k('K_PLAN_EMERGENCIA', '001', { fecha: fd(-150), version: '1', componentes: ['Eventos probables (incendio, sismo, derrumbe en excavación, falla de grúa)', 'Planos y vías de evacuación', 'Brigadas y roles de mando', 'Alarma y corte de suministros', 'Coordinación con Bomberos, SAMU y organismo administrador'] });
    k('K_SIMULACRO', '003', { fecha: fd(-45), escenario: 'Evacuación por incendio en el taller y rescate en altura', participantes: nom.length, acta: 'Acta de simulacro con tiempos de evacuación y observaciones' });
    for (var d = 0; d < 3; d++) k('K_DS594_CONTROL', '003', { fecha: fd(-d), agua: { ok: true, detalle: 'Red de agua potable con cloro libre residual medido' }, serviciosHigienicos: { ok: true }, comedor: { ok: true }, uv: { publicado: true, indice: 7 }, calor: { monitoreo: true, alerta: false } });
    Object.keys(K.PROTOCOLOS).forEach(function (pr) { k('K_PROTOCOLO', '003', { fecha: fd(-120), protocolo: pr, estado: 'VIGENTE', responsable: pid('003') }); });
    k('K_KARIN_PROTOCOLO', '001', { fecha: fd(-170), version: '1', componentes: ['Identificación de peligros', 'Evaluación de riesgos psicosociales', 'Medidas con objetivos medibles', 'Capacitación', 'Investigación con plazos'] });
    k('K_KARIN_DIFUSION', '003', { fecha: fd(-160), medio: 'Charla de cuadrilla con firma', asistentes: nom.filter(function (p) { return p.fechaIngreso <= fd(-160); }).map(function (p) { return p.id; }) });
    k('K_KARIN_DIFUSION', '003', { fecha: fd(-150), medio: 'Charla de cuadrilla con firma', asistentes: nom.filter(function (p) { return p.fechaIngreso > fd(-160) && p.fechaIngreso <= fd(-150); }).map(function (p) { return p.id; }) });
    k('K_KARIN_DIFUSION', '003', { fecha: fd(-35), medio: 'Charla de cuadrilla con firma', asistentes: nom.filter(function (p) { return p.fechaIngreso > fd(-150); }).map(function (p) { return p.id; }) });
    var m0 = K.hoy(db).slice(0, 7); for (var i = 1; i <= 4; i++) { var y = +m0.slice(0, 4), n = +m0.slice(5, 7) - i; while (n < 1) { n += 12; y--; } k('K_HORAS_HOMBRE', '003', { mes: y + '-' + String(n).padStart(2, '0'), horas: nom.length * 180, trabajadores: nom.length }); }
    return db;
  }

  // ---------- Eventos de la obra modelo ----------
  // OM_METODOLOGIA: cambia la metodología P×C (ISP, PONDERADA o personalizada) y recalcula toda la MIPER. E_ETAPA se delega al escenario.
  function aplicar(db, ev) {
    var actor = A.porId(db.personas, ev.actor), d = ev.datos || {};
    var rech = function (m) { A.registrar(db, { tipo: 'TRANSICION_RECHAZADA', actor: ev.actor, datos: { intento: ev.tipo, motivo: m, faltantes: [] } }); return { ok: false, motivo: m }; };
    if (ev.tipo === 'E_ETAPA') return E.aplicar(db, ev);
    if (ev.tipo !== 'OM_METODOLOGIA') return rech('Evento desconocido: ' + ev.tipo);
    if (!actor || actor.rol !== 'prevencion') return rech('La metodología de evaluación la define Prevención');
    var met = d.personalizada ? Object.assign({ id: 'PERSONALIZADA', nombre: 'Metodología del organismo administrador o de la empresa' }, d.personalizada) : METODOS[d.metodologia];
    if (!met) return rech('Metodología desconocida');
    var mono = function (l) { return Array.isArray(l) && l.length >= 2 && l.every(function (x, i) { return x > 0 && (i === 0 || x > l[i - 1]); }); };
    if (!mono(met.valoresP) || !mono(met.valoresC) || !(met.aceptableHasta > 0 && met.moderadoHasta > met.aceptableHasta)) return rech('La escala debe ser creciente y los umbrales ordenados (aceptable < moderado)');
    if (met.valoresP.length !== 3 || met.valoresC.length !== 3) return rech('Las filas de la MIPER usan 3 niveles de probabilidad y de consecuencia');
    db.escenario.metodologia = Object.assign({}, db.escenario.metodologia, { cortes: null, bloquea: null, verificar: false }, met);
    var cambios = 0;
    db.escenario.matriz.forEach(function (r) {
      var pc = evaluar(met, r.probabilidad_pura, r.consecuencia_pura), res = evaluar(met, r.probabilidad_residual, r.consecuencia_residual);
      if (pc.nivel !== r.magnitud_nivel_riesgo) cambios++;
      r.magnitud_valor = pc.valor; r.magnitud_nivel_riesgo = pc.nivel; r.residual_valor = res.valor; r.nivel_riesgo_residual = res.nivel; r.evaluacion = { p: r.probabilidad_pura, c: r.consecuencia_pura, valor: pc.valor, nivel: pc.nivel, supuesto: true };
    });
    var e = A.registrar(db, { tipo: 'OM_METODOLOGIA', actor: actor.id, datos: { metodologia: met.id, filasConNivelDistinto: cambios, errores: validarMiper(db).length } });
    return { ok: true, evento: e, cambios: cambios, errores: validarMiper(db) };
  }

  // §6: cada elemento de la ficha cita una fuente que existe: documento VIGENTE en esa versión y con esa sección, o una fila de la MIPER / del registro ambiental
  function trazabilidad(db, fichaId) {
    var f = C.ficha(db, fichaId), sueltos = [];
    var seccionOk = function (d, s) {
      if (!s) return true;
      var m = /^§(\d)(?:\.(\d+))?$/.exec(s); if (!m) return false;
      if (+m[1] < 1 || +m[1] > SECCIONES) return false;
      if (m[2]) return +m[1] === 6 && d.contenido && +m[2] >= 1 && +m[2] <= d.contenido.pasos.length;
      return true;
    };
    var fuenteOk = function (cita) {
      if (!cita) return false;
      var t = cita.split(' '), docId = t[0];
      if (docId === 'MR-MOD-01') return db.escenario.matriz.some(function (r) { return r.id === t[1]; });
      if (docId === 'RA-MOD-01') return db.escenario.ambiental.some(function (r) { return r.id === t[1]; });
      var v = (t[1] || '').replace(/^v/, '');
      return db.biblioteca.documentos.some(function (d) { return d.id === docId && (!v || d.version === v) && d.estado === 'VIGENTE' && seccionOk(d, t[2]); });
    };
    var revisar = function (tipo, lista) { (lista || []).forEach(function (x) { if (!fuenteOk(x.cita)) sueltos.push(tipo + ' «' + (x.texto || x.nombre || x.peligro || x.calidad) + '» (' + (x.cita || 'sin cita') + ')'); }); };
    revisar('paso', f.pasos); revisar('peligro', f.peligros); revisar('rol', f.roles); revisar('equipo', f.equipos); revisar('pregunta', f.preguntas); revisar('requisito', f.requisitos); revisar('permiso', f.permisos); revisar('aprobación', f.aprobaciones);
    Object.keys(f.aprobacionesSi || {}).forEach(function (k2) { revisar('aprobación', f.aprobacionesSi[k2]); });
    if (!db.biblioteca.documentos.some(function (d) { return d.id === f.documento && d.estado === 'VIGENTE'; })) sueltos.push('documento ' + f.documento + ' sin vigencia');
    (f.referencias || []).forEach(function (r) { if (!db.biblioteca.documentos.some(function (d) { return d.id === r && d.estado === 'VIGENTE'; })) sueltos.push('referencia ' + r + ' sin documento vigente'); });
    (f.matriz || []).forEach(function (id) { var r = db.escenario.matriz.filter(function (x) { return x.id === id; })[0]; if (!r) sueltos.push('fila de matriz ' + id + ' inexistente'); else if (r.procedimientos.some(function (pp) { return !db.escenario.procedimientos.some(function (q) { return q.id === pp; }); })) sueltos.push('fila ' + id + ' cita un procedimiento fuera del inventario'); });
    (f.permisos || []).forEach(function (p) { if (!db.biblioteca.documentos.some(function (d) { return d.id === p.formato; })) sueltos.push('permiso ' + p.id + ' sin formato cargado'); });
    return sueltos;
  }
  function matrizFiltrada(db, filtro) {
    filtro = filtro || {};
    var area = filtro.area ? A.porId(db.areas, filtro.area) : null;
    return db.escenario.matriz.filter(function (r) {
      if (area && area.diagnostico.trabajos.indexOf(r.ficha) < 0) return false;
      if (filtro.ficha && r.ficha !== filtro.ficha) return false;
      if (filtro.puesto && r.puesto_trabajo.toLowerCase().indexOf(filtro.puesto.toLowerCase()) < 0) return false;
      if (filtro.factor && r.tipo_factor_riesgo !== filtro.factor) return false;
      if (filtro.nivel && r.magnitud_nivel_riesgo !== filtro.nivel) return false;
      return true;
    });
  }

  var OM = { construir: construir, aplicar: aplicar, trazabilidad: trazabilidad, matrizFiltrada: matrizFiltrada, evaluar: evaluar, validarMiper: validarMiper, ptsCompleto: ptsCompleto, METODOS: METODOS, TAREAS: TAREAS, ETIQUETA: ETIQUETA, EMPRESAS: { P: P, SM: SM, SN: SN, SC: SC, M: M }, pid: pid, pin: pin, JERARQUIA: JER };
  if (typeof module !== 'undefined') module.exports = OM; else g.ASTRA_OM = OM;
})(this);
