// ASTRA · servicio de cápsulas de aprendizaje (D-035). Contrato de minutos por trabajador y ciclo, plan personal
// repartido en los días efectivos de trabajo, biblioteca etiquetada, criterio de finalización y avance por separado
// de los incumplimientos. Una cápsula no habilita, no resuelve hallazgos y no prueba competencia práctica.
(function (g) {
  'use strict';
  var A = (typeof module !== 'undefined') ? require('./motor.js') : g.ASTRA;
  var C = (typeof module !== 'undefined') ? require('./cuadrilla.js') : g.ASTRA_C;
  var porId = A.porId;
  var L = { azar: Math.random };
  var TIPO_TXT = { refuerzo: 'Cápsula informativa o de refuerzo', induccion: 'Inducción obligatoria', capacitacion_practica: 'Capacitación requerida con evaluación práctica', acreditacion: 'Acreditación con vigencia (curso o certificación externa)' };
  var ESTADO_CAP = { PUBLICADA: 'Publicada', EN_REVISION: 'En revisión competente', REVISION_POR_CAMBIO: 'En revisión: cambió una fuente', CONTRADICCION: 'Contradicción entre fuentes: sin publicar', RETIRADA: 'Retirada' };
  var FUENTE_TXT = { empresa: 'Documento de la empresa', matriz: 'Matriz de riesgos', publica: 'Organismo público', administrador: 'Organismo administrador' };

  // Biblioteca de ejemplo (contenido FICTICIO: el real sale de documentos validados por la empresa, P-020)
  var BIBLIOTECA = [
    { id: 'CAP-G01', tipo: 'refuerzo', titulo: 'Orden y aseo en el frente de trabajo', tema: 'Orden y limpieza', cargos: [], areas: [], fichas: [], herramientas: [], riesgo: 'Caídas al mismo nivel', medida: 'Despejar pasillos y acopiar en su lugar', duracion: 30, procedimiento: 'EST-EPP-01 v2', version: '1', vigencia: '2027-12-31', empresa: null, general: true,
      partes: ['Un pasillo con material es una caída esperando ocurrir.', 'Lo que usas, lo devuelves a su lugar de acopio.', 'Si ves algo que estorba el paso y no puedes moverlo, avisa.'], pregunta: { texto: '¿Qué haces si un acopio bloquea el pasillo y no puedes moverlo?', opciones: ['Paso por el lado', 'Aviso al encargado', 'Espero al fin del turno'], correcta: 1 } },
    { id: 'CAP-G02', tipo: 'refuerzo', titulo: 'Casco y barbiquejo: siempre juntos', tema: 'Protección personal', cargos: [], areas: [], fichas: [], herramientas: [], riesgo: 'Golpes en la cabeza', medida: 'Casco con barbiquejo ajustado', duracion: 30, procedimiento: 'EST-EPP-01 v2 §4.1', version: '1', vigencia: '2027-12-31', empresa: null, general: true,
      partes: ['El casco protege si se queda en su lugar.', 'El barbiquejo evita que se caiga al agacharte o con viento.', 'Un casco golpeado o trizado se cambia: avisa en bodega.'], pregunta: { texto: '¿Para qué sirve el barbiquejo?', opciones: ['Para que el casco no se caiga', 'Para la lluvia', 'Es decorativo'], correcta: 0 } },
    { id: 'CAP-G03', tipo: 'refuerzo', titulo: 'Detener un trabajo es tu derecho', tema: 'Detención', cargos: [], areas: [], fichas: [], herramientas: [], riesgo: 'Condiciones que cambian', medida: 'Detener y avisar', duracion: 40, procedimiento: 'PROC-03 v2 §8', version: '1', vigencia: '2027-12-31', empresa: null, general: true,
      partes: ['Si algo cambia o ves peligro, detén de palabra.', 'Después, cuando sea seguro, registra la detención en la app.', 'Nadie te puede pedir seguir sin que se revise.'], pregunta: { texto: '¿Qué va primero?', opciones: ['Llenar la app', 'Detener de palabra y avisar', 'Sacar una foto'], correcta: 1 } },
    { id: 'CAP-G04', tipo: 'refuerzo', titulo: 'Cómo reportar una condición insegura', tema: 'Reporte', cargos: [], areas: [], fichas: [], herramientas: [], riesgo: 'Condiciones no informadas', medida: 'Reportar desde el QR del área', duracion: 30, procedimiento: 'EST-EPP-01 v2', version: '1', vigencia: '2027-12-31', empresa: null, general: true,
      partes: ['Escanea el QR del área.', 'Toca «Reportar condición insegura» y describe lo que ves.', 'No te acerques al peligro para sacar una foto.'], pregunta: null },
    { id: 'CAP-C01', tipo: 'refuerzo', titulo: 'Sierra circular: pantalla facial y protección de disco', tema: 'Uso seguro de herramientas', cargos: ['Carpintero'], areas: [], fichas: ['TA-03'], herramientas: ['sierra'], riesgo: 'Cortes y proyección de partículas', medida: 'Pantalla facial, gafas y guarda de disco', duracion: 40, procedimiento: 'PROC-03 v2 §6.2–7.2', version: '1', vigencia: '2027-06-30', empresa: 'e-principal',
      partes: ['Antes de cortar: la guarda del disco y el cuchillo divisor deben estar puestos.', 'Gafas de seguridad y, encima, la pantalla facial.', 'Corta sobre el mesón estable, nunca sobre la rodilla.'], pregunta: { texto: '¿Qué va encima de las gafas al cortar con sierra circular?', opciones: ['Protección respiratoria', 'Pantalla facial', 'Nada'], correcta: 1 } },
    { id: 'CAP-C02', tipo: 'refuerzo', titulo: 'Extensiones aéreas', tema: 'Riesgo eléctrico', cargos: ['Carpintero', 'Maestro eléctrico', 'Jornal'], areas: [], fichas: ['TA-03'], herramientas: ['sierra'], riesgo: 'Contacto eléctrico y tropiezos', medida: 'Extensiones colgadas, sin uniones expuestas', duracion: 30, procedimiento: 'MIPER-01 v3 fila 15', version: '1', vigencia: '2027-06-30', empresa: 'e-principal',
      partes: ['Las extensiones van colgadas, no por el piso.', 'Una unión con cinta no es una unión segura.', 'Si ves un cable dañado, desconéctalo y avisa.'], pregunta: { texto: '¿Dónde van las extensiones?', opciones: ['Por el piso', 'Colgadas (aéreas)', 'Bajo el agua'], correcta: 1 } },
    { id: 'CAP-C03', tipo: 'refuerzo', titulo: 'Protección ocular bien usada', tema: 'Protección personal', cargos: [], areas: [], fichas: ['TA-03', 'TA-12'], herramientas: [], riesgo: 'Lesiones oculares', medida: 'Gafas o antiparras puestas y limpias', duracion: 30, procedimiento: 'EST-EPP-01 v2 §4.2', version: '1', vigencia: '2027-12-31', empresa: null, refuerzoDe: ['b_lentes', 'pantalla'],
      partes: ['Las gafas sirven puestas, no en el casco.', 'Si se empañan o rayan, se cambian.', 'Con sierra o esmeril, además, pantalla facial.'], pregunta: { texto: '¿Dónde deben ir las gafas mientras cortas?', opciones: ['En el casco', 'Puestas sobre los ojos', 'En el bolsillo'], correcta: 1 } },
    { id: 'CAP-A01', tipo: 'refuerzo', titulo: 'Arnés: conectado antes de soltar las manos', tema: 'Trabajo en altura', cargos: [], areas: [], fichas: ['TA-09'], herramientas: [], riesgo: 'Caída a distinto nivel', medida: 'Conexión a línea de vida', duracion: 40, procedimiento: 'PROT-ALT v2 §5', version: '1', vigencia: '2027-06-30', empresa: 'e-principal',
      partes: ['Revisa costuras y mosquetones antes de ponerte el arnés.', 'Te conectas a la línea de vida antes de soltar las manos.', 'Con doble cola, siempre una conectada.'], pregunta: { texto: '¿Cuándo te conectas a la línea de vida?', opciones: ['Cuando ya estoy arriba trabajando', 'Antes de soltar las manos', 'Solo si hay viento'], correcta: 1 } },
    { id: 'CAP-M01', tipo: 'refuerzo', titulo: 'Bloqueo antes de meter las manos', tema: 'Mantención', cargos: ['Mecánico de maquinaria'], areas: [], fichas: ['TA-12'], herramientas: [], riesgo: 'Atrapamiento', medida: 'Bloqueo de arranque con tarjeta personal', duracion: 40, procedimiento: 'PROC-12 v1 §6.1', version: '1', vigencia: '2027-06-30', empresa: null,
      partes: ['Máquina detenida, implementos abajo.', 'Bloqueo con tu tarjeta personal: solo tú la retiras.', 'Sin bloqueo, no hay mantención.'], pregunta: { texto: '¿Quién retira tu tarjeta de bloqueo?', opciones: ['Cualquiera', 'El operador', 'Solo yo'], correcta: 2 } },
    { id: 'CAP-S01', tipo: 'refuerzo', titulo: 'Levantar carga sin dañar la espalda', tema: 'Ergonomía', cargos: [], areas: [], fichas: [], herramientas: [], riesgo: 'Lesiones musculoesqueléticas', medida: 'Técnica y ayuda mecánica', duracion: 40, procedimiento: 'Guía de manejo manual de cargas (demo)', version: '1', vigencia: '2027-12-31', empresa: null, general: true,
      revisionCompetente: true, revisadaPor: 'p-elena', partes: ['Acércate a la carga y dobla las rodillas.', 'Si pesa mucho, pide ayuda o usa un carro.', 'Esta cápsula no reemplaza una evaluación de tu puesto.'], pregunta: null },
    { id: 'CAP-E01', tipo: 'refuerzo', titulo: 'Qué hacer ante una emergencia', tema: 'Emergencias', cargos: [], areas: [], fichas: [], herramientas: [], riesgo: 'Emergencias', medida: 'Plan de emergencia del área', duracion: 60, procedimiento: 'Plan de emergencia (pendiente de cargar)', version: '0', vigencia: '2027-12-31', empresa: null, general: true,
      revisionCompetente: true, revisadaPor: null, partes: ['(Pendiente de revisión competente: no se asigna.)'], pregunta: null },
    { id: 'CAP-X01', tipo: 'refuerzo', titulo: 'Extintor: antes de usarlo', tema: 'Emergencias', cargos: [], areas: [], fichas: [], herramientas: [], riesgo: 'Amago de incendio', medida: 'Uso seguro del extintor y aviso', duracion: 40, procedimiento: 'Material del organismo administrador (demo)', version: '1', vigencia: '2027-12-31', empresa: null, comun: true,
      fuentes: [{ tipo: 'administrador', ref: 'OA-EXT-01', titulo: 'Prevención de incendios: uso de extintores (organismo administrador, demo)', condicionesUso: 'Uso interno con cita, sin modificar el contenido técnico' }],
      partes: ['Primero da la alarma y avisa.', 'Solo intenta apagar un fuego pequeño, con una salida a tu espalda.', 'Esta cápsula recuerda reglas: no reemplaza la capacitación práctica con extintores.'], pregunta: { texto: '¿Qué haces primero ante un amago de incendio?', opciones: ['Busco el extintor', 'Doy la alarma y aviso', 'Grabo un video'], correcta: 1 } },
    { id: 'CAP-R01', tipo: 'refuerzo', titulo: 'RCP: qué recordar', tema: 'Emergencias', cargos: [], areas: [], fichas: [], herramientas: [], funciones: ['emergencias'], riesgo: 'Paro cardiorrespiratorio', medida: 'Activar la emergencia y RCP por personal capacitado', duracion: 60, procedimiento: 'Material del organismo administrador (demo)', version: '1', vigencia: '2027-12-31', empresa: null,
      fuentes: [{ tipo: 'administrador', ref: 'OA-RCP-01', titulo: 'Primeros auxilios y RCP (organismo administrador, demo)', condicionesUso: 'Uso interno con cita' }],
      partes: ['Llama al número de emergencia de la faena.', 'Si estás capacitado, inicia compresiones hasta que llegue ayuda.', 'Ver esta cápsula no te acredita en RCP: eso exige un curso y una práctica vigentes.'], pregunta: { texto: '¿Esta cápsula te acredita en RCP?', opciones: ['Sí', 'No, se requiere curso y práctica vigentes'], correcta: 1 } },
    { id: 'ACR-RCP', tipo: 'acreditacion', titulo: 'Acreditación en RCP', tema: 'Emergencias', cargos: [], areas: [], fichas: [], herramientas: [], funciones: ['emergencias'], riesgo: 'Paro cardiorrespiratorio', medida: 'Curso presencial con práctica', duracion: 0, procedimiento: 'Curso del organismo administrador', version: '1', vigencia: '2027-12-31', empresa: null, vigenciaMeses: 24,
      fuentes: [{ tipo: 'administrador', ref: 'OA-RCP-01', titulo: 'Curso de RCP (organismo administrador)' }], partes: [], pregunta: null },
    { id: 'CAP-D01', tipo: 'refuerzo', titulo: 'Conducción defensiva dentro de la faena', tema: 'Conducción', cargos: [], areas: [], fichas: [], herramientas: [], funciones: ['conductor'], riesgo: 'Atropellos y colisiones', medida: 'Velocidad de faena y contacto visual', duracion: 40, procedimiento: 'Reglamento de tránsito interno (demo)', version: '1', vigencia: '2027-12-31', empresa: 'e-principal',
      fuentes: [{ tipo: 'empresa', ref: 'PROC-03', titulo: 'Procedimiento base (demo)' }, { tipo: 'publica', ref: 'MTT-CD-01', titulo: 'Conducción defensiva (organismo público, demo)', condicionesUso: 'Material público, citar la fuente' }],
      partes: ['Respeta la velocidad de la faena aunque el camino esté despejado.', 'Antes de avanzar, busca contacto visual con quien está a pie.', 'Si no ves, no avanzas: pide apoyo de un señalero.'], pregunta: { texto: 'Si no ves a quien está detrás, ¿qué haces?', opciones: ['Toco la bocina y avanzo', 'Pido apoyo de un señalero', 'Avanzo despacio'], correcta: 1 } },
    { id: 'CAP-SV1', tipo: 'refuerzo', titulo: 'Verificar controles y gestionar incumplimientos', tema: 'Supervisión', cargos: [], areas: [], fichas: [], herramientas: [], roles: ['capataz', 'supervisor', 'jefe_terreno'], riesgo: 'Controles que no se verifican', medida: 'Verificación presencial y gestión sin culpas', duracion: 40, procedimiento: 'Procedimiento base y D-032/D-033 (demo)', version: '1', vigencia: '2027-12-31', empresa: 'e-principal',
      fuentes: [{ tipo: 'empresa', ref: 'PROC-03', titulo: 'Procedimiento base (demo)' }],
      partes: ['La firma remota no reemplaza ir al lugar.', 'Si encuentras una diferencia, primero se detiene y se corrige; la causa se revisa después.', 'Nada de rankings: el foco es que la condición quede corregida y verificada.'], pregunta: { texto: '¿Qué va primero ante una diferencia en terreno?', opciones: ['Sancionar', 'Detener y corregir', 'Sacar fotos'], correcta: 1 } },
    { id: 'CAP-H01', tipo: 'refuerzo', titulo: 'Ruido del vibrador de hormigón', tema: 'Protección personal', cargos: [], areas: [], fichas: ['TA-07'], herramientas: [], riesgo: 'Pérdida auditiva', medida: 'Protector auditivo', duracion: 30, procedimiento: 'PROC-07 v1 / MIPER-01 v3', version: '0', vigencia: '2027-12-31', empresa: 'e-principal',
      fuentes: [{ tipo: 'empresa', ref: 'PROC-07', titulo: 'Hormigonado' }, { tipo: 'matriz', ref: 'MIPER-01', titulo: 'Matriz de riesgos' }], estadoInicial: 'CONTRADICCION', contradiccion: 'PROC-07 no exige protector auditivo; MIPER-01 sí. Pendiente de revisión.',
      partes: ['(Sin publicar: contradicción entre fuentes.)'], pregunta: null },
    { id: 'IND-A2', tipo: 'induccion', titulo: 'Inducción del área A2 · Camino interno', tema: 'Inducción del área', cargos: [], areas: ['a2'], fichas: [], herramientas: [], riesgo: 'Tránsito mixto, cunetas', medida: 'Circular por la vía peatonal', duracion: 60, procedimiento: 'Diagnóstico del área A2', version: '1', vigencia: '2027-12-31', empresa: 'e-principal',
      partes: ['A2 tiene tránsito de equipos y peatones.', 'Se circula por la vía peatonal señalizada.', 'Las cunetas no tienen protección: no te acerques al borde.'], pregunta: { texto: '¿Por dónde se circula a pie en A2?', opciones: ['Por el centro del camino', 'Por la vía peatonal señalizada', 'Por la cuneta'], correcta: 1 } },
    { id: 'CAP-P01', tipo: 'capacitacion_practica', titulo: 'Uso de sierra circular (teoría)', tema: 'Capacitación', cargos: ['Carpintero', 'Jornal'], areas: [], fichas: ['TA-03'], herramientas: ['sierra'], riesgo: 'Cortes', medida: 'Operación segura', duracion: 60, procedimiento: 'PROC-03 v2 §4', version: '1', vigencia: '2027-06-30', empresa: 'e-principal',
      partes: ['Partes de la sierra y sus protecciones.', 'Postura y posición de las manos.', 'La teoría no habilita: falta la evaluación práctica con un supervisor.'], pregunta: { texto: '¿Completar esta teoría te habilita a usar la sierra?', opciones: ['Sí', 'No, falta la evaluación práctica'], correcta: 1 } }
  ];

  function hoy(db) { return A.ahora(db).slice(0, 10); }
  function preparar(db) {
    if (db.aprendizaje) return db;
    db.aprendizaje = {
      contratos: { 'e-principal': { activo: true, minutos: 5, diasCiclo: 14 }, 'e-contratista': { activo: true, minutos: 10, diasCiclo: 14 } },
      capsulas: JSON.parse(JSON.stringify(BIBLIOTECA)), progreso: {}, revisores: ['p-elena']
    };
    // D-039: cada cápsula con sus fuentes, versión, fecha de revisión y estado. Solo se usa lo publicado.
    db.aprendizaje.capsulas.forEach(function (c) {
      if (!c.fuentes) c.fuentes = [{ tipo: /MIPER/.test(c.procedimiento) ? 'matriz' : 'empresa', ref: (c.procedimiento.match(/(PROC-\d+|PROT-[A-Z]+|EST-EPP-\d+|MIPER-\d+)/) || [null])[0], titulo: c.procedimiento }];
      c.estado = c.estadoInicial || (c.revisionCompetente && !c.revisadaPor ? 'EN_REVISION' : 'PUBLICADA');
      if (c.estado === 'PUBLICADA') { c.revisadaPor = c.revisadaPor || 'p-elena'; c.fechaRevision = '2026-10-20'; }
      c.historial = [{ estado: c.estado, en: '2026-10-20' }];
    });
    // Funciones que orientan la selección (conductor, brigada de emergencia)
    var fx = function (pid, f) { var p = porId(db.personas, pid); if (p && p.funciones.indexOf(f) < 0) p.funciones.push(f); };
    fx('p-jorge', 'conductor'); fx('p-carlos', 'emergencias');
    return db;
  }
  function contrato(db, persona) { var c = db.aprendizaje.contratos[persona.empresa]; return c && c.activo ? c : null; }
  function prog(db, personaId) {
    var p = db.aprendizaje.progreso[personaId];
    if (!p) p = db.aprendizaje.progreso[personaId] = { ciclos: [], inducciones: {}, practicas: {} };
    return p;
  }
  function cicloActual(db, personaId) { var p = prog(db, personaId); return p.ciclos[p.ciclos.length - 1] || null; }
  function capsula(db, id) { return porId(db.aprendizaje.capsulas, id); }
  function usable(db, c, persona) {
    if (c.estado !== 'PUBLICADA') return false; // D-039: sin revisión competente, en revisión o con contradicción, no se usa
    if (c.vigencia < hoy(db)) return false;
    if (c.empresa && c.empresa !== persona.empresa) return false;
    return true;
  }
  // Perfil para elegir: cargo, competencias, áreas, tareas (fichas) y herramientas de sus AST
  function perfil(db, persona) {
    var fichas = [], areas = [], herr = [];
    db.asts.filter(function (a) { return a.modo === 'cuadrilla' && (a.integrantes || []).some(function (i) { return i.persona === persona.id; }); }).forEach(function (a) {
      if (a.ficha && fichas.indexOf(a.ficha) < 0) fichas.push(a.ficha);
      if (areas.indexOf(a.area) < 0) areas.push(a.area);
      Object.keys(a.respuestas || {}).forEach(function (k) { if (a.respuestas[k] === true && herr.indexOf(k) < 0) herr.push(k); });
    });
    return { cargo: persona.cargo, rol: persona.rol, funciones: persona.funciones || [], fichas: fichas, areas: areas, herramientas: herr };
  }
  function puntaje(c, pf, yaVistas) {
    var s = c.general ? 1 : 0;
    if (c.cargos.indexOf(pf.cargo) >= 0) s += 3;
    if (c.fichas.some(function (f) { return pf.fichas.indexOf(f) >= 0; })) s += 3;
    if (c.areas.some(function (a) { return pf.areas.indexOf(a) >= 0; })) s += 2;
    if (c.herramientas.some(function (h) { return pf.herramientas.indexOf(h) >= 0; })) s += 2;
    if ((c.funciones || []).some(function (f) { return pf.funciones.indexOf(f) >= 0; })) s += 4;
    if ((c.roles || []).indexOf(pf.rol) >= 0) s += 4;
    // Contenido dirigido a una función o rol que la persona no tiene: no se le asigna
    if ((c.funciones || []).length && !(c.funciones || []).some(function (f) { return pf.funciones.indexOf(f) >= 0; })) s -= 100;
    if ((c.roles || []).length && (c.roles || []).indexOf(pf.rol) < 0) s -= 100;
    if (yaVistas.indexOf(c.id) >= 0) s -= 5; // variar entre ciclos; se repite solo si hace falta
    return s + L.azar() * 0.5;
  }
  // Plan del ciclo: cápsulas de refuerzo que suman hasta los minutos contratados, sin pasarse
  function armarPlan(db, persona) {
    var ct = contrato(db, persona), presupuesto = ct.minutos * 60, pf = perfil(db, persona), p = prog(db, persona.id);
    var yaVistas = []; p.ciclos.forEach(function (c) { c.asignaciones.forEach(function (x) { if (x.completada) yaVistas.push(x.capsula); }); });
    var cand = db.aprendizaje.capsulas.filter(function (c) { return c.tipo === 'refuerzo' && usable(db, c, persona); })
      .map(function (c) { return { c: c, s: puntaje(c, pf, yaVistas) }; }).filter(function (x) { return x.s > -50; }).sort(function (a, b) { return b.s - a.s; });
    var plan = [], suma = 0;
    // D-039 §3: lo común va a todas las personas de su alcance, primero
    cand.filter(function (x) { return x.c.comun; }).forEach(function (x) { if (suma + x.c.duracion <= presupuesto) { plan.push(x.c.id); suma += x.c.duracion; } });
    cand = cand.filter(function (x) { return !x.c.comun; });
    cand.forEach(function (x) { if (suma + x.c.duracion <= presupuesto) { plan.push(x.c.id); suma += x.c.duracion; } });
    // Si sobra presupuesto y no quedan cápsulas distintas, se repiten las de mayor puntaje
    var k = 0; while (cand.length && suma + cand[k % cand.length].c.duracion <= presupuesto && k < 50) { plan.push(cand[k % cand.length].c.id); suma += cand[k % cand.length].c.duracion; k++; }
    return { plan: plan, segundos: suma, presupuesto: presupuesto };
  }

  // Ingreso del día: registra el día efectivo de trabajo y libera las cápsulas que tocan (D-035 §2)
  function ingreso(db, personaId) {
    preparar(db);
    var persona = porId(db.personas, personaId), ct = persona && contrato(db, persona);
    if (!ct) return { ok: false, motivo: 'La empresa no tiene el servicio de cápsulas contratado' };
    var ciclo = cicloActual(db, personaId), dia = hoy(db);
    if (!ciclo || (ciclo.dias.length >= ciclo.diasCiclo && ciclo.dias.indexOf(dia) < 0)) {
      var pl = armarPlan(db, persona);
      ciclo = { n: prog(db, personaId).ciclos.length + 1, inicio: dia, diasCiclo: ct.diasCiclo, minutos: ct.minutos, presupuesto: pl.presupuesto, plan: pl.plan, dias: [], asignaciones: [] };
      prog(db, personaId).ciclos.push(ciclo);
    }
    if (ciclo.dias.indexOf(dia) < 0) ciclo.dias.push(dia);
    // Ritmo: al día k se liberan ceil(plan × k / días del ciclo) cápsulas
    var liberar = Math.min(ciclo.plan.length, Math.ceil(ciclo.plan.length * ciclo.dias.length / ciclo.diasCiclo));
    var delPlan = ciclo.asignaciones.filter(function (x) { return x.motivo === 'plan'; }).length, nuevas = [];
    for (var i = delPlan; i < liberar; i++) {
      var asig = { id: 'AS-' + ciclo.n + '-' + (ciclo.asignaciones.length + 1), capsula: ciclo.plan[i], motivo: 'plan', adicional: false, en: A.ahora(db), dia: dia, completada: null, intentos: 0 };
      ciclo.asignaciones.push(asig); nuevas.push(asig);
    }
    if (nuevas.length) C.avisar(db, [personaId], 'CAPSULA', 'Tienes ' + nuevas.length + ' cápsula(s) de aprendizaje. Míralas en un lugar seguro, nunca mientras operas.', null);
    return { ok: true, ciclo: ciclo, nuevas: nuevas };
  }

  function aplicar(db, ev) {
    preparar(db);
    var d = ev.datos = ev.datos || {}, actor = porId(db.personas, ev.actor);
    var rech = function (m) { A.registrar(db, { tipo: 'TRANSICION_RECHAZADA', actor: ev.actor, datos: { intento: ev.tipo, motivo: m, faltantes: [] } }); return { ok: false, motivo: m }; };
    var ok = function (datos, extra) { var e = A.registrar(db, { tipo: ev.tipo, actor: ev.actor, datos: datos }); return Object.assign({ ok: true, evento: e }, extra || {}); };
    if (!actor) return rech('Persona desconocida');
    switch (ev.tipo) {
      case 'L_INGRESO': { var r = ingreso(db, actor.id); return r.ok ? ok({ ciclo: r.ciclo.n, dia: hoy(db), nuevas: r.nuevas.map(function (x) { return x.capsula; }) }, r) : r; }
      case 'L_COMPLETAR': {
        // Criterio de finalización (D-035 §6): todas las partes, al menos su duración y, si hay pregunta, bien respondida
        var c = capsula(db, d.capsula);
        if (!c) return rech('Cápsula desconocida');
        var ciclo = cicloActual(db, actor.id), asig = null;
        if (c.tipo === 'refuerzo') {
          asig = ciclo && ciclo.asignaciones.filter(function (x) { return x.id === d.asignacion && x.capsula === c.id; })[0];
          if (!asig) return rech('Esta cápsula no está asignada en tu ciclo');
        }
        if ((d.partesVistas || 0) < c.partes.length) return rech('Faltan partes por ver');
        if ((d.segundos || 0) < c.duracion) return rech('Mírala completa: dura ' + c.duracion + ' segundos');
        if (c.pregunta && d.respuesta !== c.pregunta.correcta) { if (asig) asig.intentos++; return rech('Respuesta incorrecta. Vuelve a ver la cápsula y responde de nuevo.'); }
        if (c.tipo === 'induccion') { prog(db, actor.id).inducciones[c.id] = { en: A.ahora(db), version: c.version }; return ok({ capsula: c.id, tipo: c.tipo }); }
        if (c.tipo === 'capacitacion_practica') { var pr = prog(db, actor.id).practicas; pr[c.id] = Object.assign(pr[c.id] || {}, { teoria: A.ahora(db) }); return ok({ capsula: c.id, tipo: c.tipo, nota: 'Teoría completa; falta la evaluación práctica' }); }
        var repetida = !!asig.completada;
        if (!repetida) asig.completada = { en: A.ahora(db), segundos: c.duracion }; // cuenta la duración del contenido, no el tiempo con la página abierta
        return ok({ capsula: c.id, asignacion: asig.id, repetida: repetida, segundosContados: repetida ? 0 : c.duracion });
      }
      case 'L_ASIGNAR_REFUERZO': {
        // D-035 §9: a partir de una observación; no resuelve el hallazgo
        var per = porId(db.personas, d.persona), c2 = capsula(db, d.capsula);
        if (!per || !c2) return rech('Persona o cápsula desconocida');
        var hz = d.hallazgo ? porId(db.hallazgos || [], d.hallazgo) : null;
        var areaId = hz ? hz.area : d.area;
        if (actor.rol !== 'prevencion' && C.responsablesDe(db, areaId, 'encargado_area').indexOf(actor.id) < 0 && !C.puede(db, actor.id, 'gestionar_pendientes', areaId, per.empresa)) return rech('Asigna refuerzos un responsable del área o Prevención');
        if (!usable(db, c2, per)) return rech('Esa cápsula no está vigente o no tiene la revisión competente que exige su tema');
        if (!contrato(db, per)) return rech('La empresa no tiene el servicio de cápsulas contratado');
        var cic = cicloActual(db, per.id) || ingreso(db, per.id).ciclo;
        var usados = cic.plan.reduce(function (s, id) { return s + capsula(db, id).duracion; }, 0) + cic.asignaciones.filter(function (x) { return x.motivo === 'refuerzo'; }).reduce(function (s, x) { return s + capsula(db, x.capsula).duracion; }, 0);
        var adicional = usados + c2.duracion > cic.presupuesto;
        var a2 = { id: 'AS-' + cic.n + '-' + (cic.asignaciones.length + 1), capsula: c2.id, motivo: 'refuerzo', hallazgo: hz ? hz.id : null, adicional: adicional, por: actor.id, en: A.ahora(db), dia: hoy(db), completada: null, intentos: 0 };
        cic.asignaciones.push(a2);
        C.avisar(db, [per.id], 'CAPSULA', 'Se te asignó una cápsula de refuerzo: «' + c2.titulo + '»' + (adicional ? ' (contenido adicional)' : '') + '.', null);
        return ok({ persona: per.nombre, capsula: c2.id, hallazgo: a2.hallazgo, adicional: adicional }, { asignacion: a2 });
      }
      case 'L_VERIFICAR_PRACTICA': {
        var p3 = porId(db.personas, d.persona), pr3 = prog(db, d.persona).practicas[d.capsula];
        if (!pr3 || !pr3.teoria) return rech('Primero se completa la teoría');
        if (actor.rol !== 'prevencion' && !C.puede(db, actor.id, 'verificar_terreno', null, p3.empresa) && !(db.asignaciones || []).some(function (a) { return a.persona === actor.id && a.permisos.indexOf('verificar_terreno') >= 0; })) return rech('La evaluación práctica la hace un supervisor capacitado o Prevención');
        if (!d.presencial) return rech('La evaluación práctica es presencial');
        pr3.practica = { resultado: d.aprobada ? 'APROBADA' : 'REPROBADA', por: actor.id, en: A.ahora(db) };
        return ok({ persona: p3.nombre, capsula: d.capsula, resultado: pr3.practica.resultado });
      }
      case 'L_REVISAR': {
        // D-039 §5: el responsable competente publica, retira o deja pendiente por contradicción
        var cr = capsula(db, d.capsula); if (!cr) return rech('Cápsula desconocida');
        if (db.aprendizaje.revisores.indexOf(actor.id) < 0) return rech('Revisa y publica el responsable competente definido por la empresa');
        if (d.accion === 'PUBLICAR') {
          if (cr.estado === 'CONTRADICCION' && !d.resolucion) return rech('Hay una contradicción entre fuentes: indica cómo se resolvió (no se resuelve sola)');
          if (!cr.fuentes.length || cr.fuentes.some(function (f) { return !f.ref && !f.titulo; })) return rech('La cápsula debe citar sus fuentes');
          cr.estado = 'PUBLICADA'; cr.revisadaPor = actor.id; cr.fechaRevision = hoy(db); cr.version = String((+cr.version || 0) + (d.nuevaVersion ? 1 : 0)); cr.contradiccion = null;
        } else if (d.accion === 'RETIRAR') cr.estado = 'RETIRADA';
        else if (d.accion === 'CONTRADICCION') { if (!d.nota) return rech('Describe la contradicción'); cr.estado = 'CONTRADICCION'; cr.contradiccion = d.nota; }
        else return rech('Acción no válida');
        cr.historial.push({ estado: cr.estado, en: A.ahora(db), por: actor.id, nota: d.nota || d.resolucion || null });
        return ok({ capsula: cr.id, estado: cr.estado, nota: d.nota || d.resolucion || null });
      }
      case 'L_ACREDITAR': {
        // Acreditación externa con vigencia (p. ej. curso de RCP): la registra Prevención con su entidad y fecha
        if (actor.rol !== 'prevencion') return rech('Las acreditaciones las registra Prevención');
        var ca = capsula(db, d.capsula), pa = porId(db.personas, d.persona);
        if (!ca || ca.tipo !== 'acreditacion' || !pa) return rech('Acreditación o persona desconocida');
        if (!d.entidad || !d.fecha) return rech('Indica la entidad que acredita y la fecha');
        var vence = new Date(d.fecha); vence.setMonth(vence.getMonth() + (ca.vigenciaMeses || 12));
        var pr4 = prog(db, pa.id); pr4.acreditaciones = pr4.acreditaciones || {};
        pr4.acreditaciones[ca.id] = { entidad: d.entidad, fecha: d.fecha, vence: vence.toISOString().slice(0, 10), por: actor.id };
        return ok({ persona: pa.nombre, acreditacion: ca.id, vence: pr4.acreditaciones[ca.id].vence });
      }
      case 'L_CONTRATO': {
        if (actor.rol !== 'prevencion' && actor.rol !== 'administrador') return rech('El contrato del servicio lo configura la empresa');
        if (!porId(db.empresas, d.empresa) || !(d.minutos > 0) || !(d.diasCiclo > 0)) return rech('Contrato incompleto');
        db.aprendizaje.contratos[d.empresa] = { activo: d.activo !== false, minutos: +d.minutos, diasCiclo: +d.diasCiclo };
        return ok({ empresa: d.empresa, minutos: +d.minutos, diasCiclo: +d.diasCiclo });
      }
    }
    return rech('Evento desconocido: ' + ev.tipo);
  }

  // Avance del ciclo (D-035 §6): cápsulas y minutos, por separado
  function avance(db, personaId) {
    preparar(db);
    var c = cicloActual(db, personaId);
    if (!c) return null;
    var delPlan = c.asignaciones.filter(function (x) { return x.motivo === 'plan'; });
    var completadas = delPlan.filter(function (x) { return x.completada; });
    var seg = completadas.reduce(function (s, x) { return s + x.completada.segundos; }, 0);
    var refuerzos = c.asignaciones.filter(function (x) { return x.motivo === 'refuerzo'; });
    return { ciclo: c.n, dia: c.dias.length, diasCiclo: c.diasCiclo, total: c.plan.length, completadas: completadas.length, pendientes: c.plan.length - completadas.length,
      disponibles: delPlan.filter(function (x) { return !x.completada; }), segundos: seg, presupuesto: c.presupuesto,
      refuerzos: refuerzos, refuerzosPendientes: refuerzos.filter(function (x) { return !x.completada; }), adicionales: refuerzos.filter(function (x) { return x.adicional; }).length };
  }
  function textoAvance(av) {
    if (!av) return 'Sin ciclo de aprendizaje.';
    var min = function (s) { return (Math.round(s / 6) / 10).toString().replace('.', ','); };
    return 'Ciclo de trabajo actual (día ' + av.dia + ' de ' + av.diasCiclo + '): ' + av.completadas + ' de ' + av.total + ' cápsulas completadas. ' + min(av.segundos) + ' minutos de ' + min(av.presupuesto) + ' asignados completados. ' + av.pendientes + ' cápsulas pendientes.';
  }
  function siguiente(db, personaId) {
    var av = avance(db, personaId); if (!av) return null;
    return av.refuerzosPendientes[0] || av.disponibles[0] || null;
  }

  // D-039 §5: cuando cambia un documento o una fuente, sus cápsulas quedan en revisión (no se asignan)
  function porCambioDeFuente(db, ref) {
    preparar(db);
    var afectadas = db.aprendizaje.capsulas.filter(function (c) { return c.estado === 'PUBLICADA' && c.fuentes.some(function (f) { return f.ref === ref; }); });
    afectadas.forEach(function (c) { c.estado = 'REVISION_POR_CAMBIO'; c.historial.push({ estado: c.estado, en: A.ahora(db), nota: 'Cambió ' + ref }); });
    if (afectadas.length) C.avisar(db, db.aprendizaje.revisores, 'CAPSULA', 'Cambió ' + ref + ': ' + afectadas.length + ' cápsula(s) quedan en revisión (' + afectadas.map(function (c) { return c.id; }).join(', ') + ').', null);
    return afectadas;
  }
  L.porCambioDeFuente = porCambioDeFuente; L.ESTADO_CAP = ESTADO_CAP; L.FUENTE_TXT = FUENTE_TXT;
  L.preparar = preparar; L.aplicar = aplicar; L.avance = avance; L.textoAvance = textoAvance; L.siguiente = siguiente; L.capsula = capsula; L.prog = prog; L.TIPO_TXT = TIPO_TXT; L.usable = usable; L.perfil = perfil;
  if (typeof module !== 'undefined') module.exports = L; else g.ASTRA_L = L;
})(this);
