// ASTRA · motor del modo principal «AST de cuadrilla» (ESPECIFICACION_PROTOTIPO_v0.1, D-019 a D-031).
// Usa la misma base `db`, la misma bitácora con hash y el mismo RUT que motor.js. El modo «tarea crítica» (T01) sigue en motor.js.
(function (g) {
  'use strict';
  var A = (typeof module !== 'undefined') ? require('./motor.js') : g.ASTRA;
  var BIB = (typeof module !== 'undefined') ? require('./biblioteca.js') : g.ASTRA_BIBLIOTECA;
  var VERSION = 7; // sube cuando cambia la forma de los datos; la app reinicia la demo si no coincide
  var MANDO = A.MANDO, porId = A.porId;
  var CALIDAD = { encargado_area: 'Encargado del área', prevencion: 'Prevención', medio_ambiente: 'Medio ambiente', responsable_subcontrato: 'Responsable del subcontrato', mandante: 'Representante del mandante', informado: 'Recibe información (no aprueba)' };
  var NIVEL_TXT = { declarado: 'Declarado por el trabajador', sistema: 'Verificado en la ficha', responsable: 'Revisado por un responsable' };
  var PERMISOS = ['consultar', 'crear', 'registrar_trabajadores', 'revisar', 'observar', 'aprobar', 'gestionar_pendientes', 'verificar_terreno', 'ver_historial', 'configurar_areas', 'configurar'];
  var PERMISO_TXT = { consultar: 'consultar', crear: 'crear', registrar_trabajadores: 'registrar trabajadores', revisar: 'revisar', observar: 'observar', aprobar: 'aprobar', gestionar_pendientes: 'gestionar pendientes', verificar_terreno: 'verificar en terreno', ver_historial: 'ver historial de incumplimientos', configurar_areas: 'configurar áreas', configurar: 'configurar' };
  // Política de avisos (ESPECIFICACION §8): inmediato = notificación al teléfono; resumen = solo panel y resumen del turno
  var AVISOS = {
    FALTANTE: 'inmediato', ENVIADA_REVISION: 'inmediato', VERIFICACION_ENCARGADO: 'inmediato', CAPSULA: 'resumen', OBSERVACION: 'inmediato', OBS_RESPONDIDA: 'inmediato', APROBADA: 'inmediato',
    PERMISO: 'inmediato', DETENCION: 'inmediato', BRECHA: 'inmediato', CONFIG_PENDIENTE: 'inmediato', FALTANTE_RESUELTO: 'inmediato', PRUEBA: 'inmediato',
    HALLAZGO: 'inmediato', HALLAZGO_CORREGIDO: 'inmediato', OBSERVACION_AREA: 'inmediato', REVISION_HUMANA: 'inmediato',
    ESCALAMIENTO: 'inmediato', CAMBIO_AST: 'inmediato', EQUIPO: 'inmediato', PIN_BLOQUEADO: 'inmediato', AST_CREADA: 'resumen', INCORPORADO: 'resumen', INTENTO_PIN_AJENO: 'inmediato', FIRMA: 'resumen', CHARLA: 'resumen', INFORMACION: 'resumen', OBSERVACION_RESPONDIDA: 'resumen'
  };
  // D-033 §6: un aviso informativo no es una acción pendiente
  var ACCION = { FALTANTE: 1, ENVIADA_REVISION: 1, VERIFICACION_ENCARGADO: 1, OBSERVACION: 1, OBS_RESPONDIDA: 1, PERMISO: 1, CONFIG_PENDIENTE: 1, BRECHA: 1, HALLAZGO: 1, OBSERVACION_AREA: 1, PRUEBA: 1, REVISION_HUMANA: 1, FALTANTE_RESUELTO: 1, DETENCION: 1, CAPSULA: 1, ESCALAMIENTO: 1, CAMBIO_AST: 1, EQUIPO: 1, PIN_BLOQUEADO: 1 };
  var EVENTOS_CONFIG = ['C_REGLA', 'C_RESPONSABLE', 'C_AUSENCIA', 'C_ASIGNAR', 'C_CREAR_AREA_TEMPORAL', 'C_AVISO_PRUEBA', 'C_CONFIGURAR_FIRMA', 'C_CARGAR_DOCUMENTO'];

  // ---------- Instalación de los datos del modo principal en una db existente ----------
  function preparar(db) {
    if (db.biblioteca) return db;
    db.versionC = VERSION;
    var hoy = (db.creadoEn || new Date().toISOString().slice(0, 10));
    var vence = function (dias) { var d = new Date(hoy); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
    var comp = function (lista) { var o = {}; lista.forEach(function (c) { o[c[0]] = { nombre: c[1], vence: vence(300), verificadoPor: 'p-elena', verificadoEn: hoy }; }); return o; };
    db.biblioteca = JSON.parse(JSON.stringify(BIB));
    db.canales = { app: true, whatsapp: false, sms: false }; // D-021: WhatsApp y SMS preparados pero apagados
    db.avisos = []; db.charlas = [];
    db.config = { multiArea: ['encargado_area'], prevencionSiempre: false, turnos: [{ id: 'dia', nombre: 'Turno de día', desde: 8, hasta: 20 }, { id: 'noche', nombre: 'Turno de noche', desde: 20, hasta: 8 }] }; // D-031 §7 y D-033 §6 (Prevención según procedimiento, salvo regla de la empresa)
    var basica = function () { return JSON.parse(JSON.stringify(porId(db.personas, 'p-carlos').hab)); };
    [
      { id: 'p-juan', rut: '40.000.000-K', ingreso: 'ING-010', nombre: 'Juan Demo', rol: 'trabajador', cargo: 'Carpintero', comp: comp([['carpinteria', 'Oficio carpintería'], ['sierra_circular', 'Uso de sierra circular'], ['trabajo_altura', 'Trabajo en altura'], ['examen_altura', 'Examen de altura física']]) },
      { id: 'p-tomas', rut: '41.111.111-3', ingreso: 'ING-011', nombre: 'Tomás Demo', rol: 'trabajador', cargo: 'Jornal', comp: comp([['sierra_circular', 'Uso de sierra circular']]) },
      { id: 'p-felipe', rut: '42.222.222-7', ingreso: 'ING-012', nombre: 'Felipe Demo', rol: 'trabajador', cargo: 'Carpintero', comp: comp([['carpinteria', 'Oficio carpintería'], ['sierra_circular', 'Uso de sierra circular']]) },
      { id: 'p-sofia', rut: '43.333.333-0', ingreso: 'ING-013', nombre: 'Sofía Demo', rol: 'medio_ambiente', cargo: 'Encargada de medio ambiente', comp: {} },
      { id: 'p-raul', rut: '44.444.440-1', ingreso: 'CON-002', nombre: 'Raúl Demo', rol: 'supervisor', empresa: 'e-contratista', cargo: 'Responsable del subcontrato', comp: {} },
      { id: 'p-diego', rut: '45.555.555-8', ingreso: 'CON-003', nombre: 'Diego Demo', rol: 'trabajador', empresa: 'e-contratista', cargo: 'Mecánico de maquinaria', comp: comp([['mecanico', 'Mecánico de maquinaria acreditado']]) },
      { id: 'p-hugo', rut: '46.666.666-1', ingreso: 'ING-014', nombre: 'Hugo Demo', rol: 'supervisor', cargo: 'Supervisor de talleres de soldadura, mecánico y cobre', comp: {} },
      { id: 'p-marcela', rut: '47.777.777-5', ingreso: 'MAN-001', nombre: 'Marcela Demo', rol: 'mandante', empresa: 'e-mandante', cargo: 'Representante del mandante', comp: {} },
      { id: 'p-gerardo', rut: '48.888.888-9', ingreso: 'ING-015', nombre: 'Gerardo Demo', rol: 'jefatura', cargo: 'Gerente de proyecto', comp: {} }
    ].forEach(function (p) { db.personas.push(Object.assign({ empresa: 'e-principal', funciones: [], hab: basica() }, p)); });
    db.personas.forEach(function (p) {
      if (!p.comp) p.comp = {};
      if (p.id === 'p-pedro' || p.id === 'p-carlos') p.comp.carpinteria = { nombre: 'Oficio carpintería', vence: vence(300), verificadoPor: 'p-elena', verificadoEn: hoy };
      // D-029: la empresa elige cómo se firma. Demo: la principal firma con RUT; la contratista con PIN (1234 ya creado)
      p.pin = porId(db.empresas, p.empresa).tipo === 'contratista' && p.rut ? '1234' : null;
      p.ausente = false;
    });
    db.empresas.forEach(function (e) { e.firma = e.tipo === 'contratista' ? 'PIN' : 'RUT'; });
    // D-031 §4: Empresa → Faena → Zona → Área. Cada taller es un área con su QR.
    db.zonas = [{ id: 'z-obras', nombre: 'Zona de obras civiles' }, { id: 'z-talleres', nombre: 'Zona de talleres' }];
    var extra = { a1: ['TA-03', 'TA-05', 'TA-07', 'TA-09', 'TA-12', 'TA-14'], a2: ['TA-03', 'TA-07', 'TA-12'] };
    db.areas.forEach(function (a) { a.zona = 'z-obras'; if (a.diagnostico && extra[a.id]) a.diagnostico.trabajos = a.diagnostico.trabajos.concat(extra[a.id]); });
    var diag = function (trabajos, peligros) { return { trabajos: trabajos, peligros: peligros, verificadoPor: 'p-elena', verificadoEn: hoy }; };
    [
      { id: 'a4', nombre: 'A4 · Taller de soldadura', diagnostico: diag(['TA-14'], ['Radiación del arco y chispas', 'Humos metálicos', 'Proyección de partículas']), eppArea: [{ id: 'a_ignifuga', nombre: 'Ropa ignífuga', icono: '🔥', cita: 'EST-EPP-01 v2 §5.2' }] },
      { id: 'a5', nombre: 'A5 · Taller mecánico', diagnostico: diag(['TA-12'], ['Piezas en movimiento', 'Fluidos a presión', 'Derrames de aceite']) },
      { id: 'a6', nombre: 'A6 · Taller de cobre', diagnostico: diag(['TA-14'], ['Bordes cortantes', 'Proyección de partículas']) },
      { id: 'a7', nombre: 'A7 · Taller de armado', diagnostico: diag(['TA-03', 'TA-05'], ['Sierra circular en uso', 'Acopio de placas', 'Cables eléctricos']) }
    ].forEach(function (a) { db.areas.push(Object.assign({ zona: 'z-talleres', qr: A.sha256('qr-' + a.id).slice(0, 32), qrVersion: 1, levantamiento: { verificadoPor: 'p-elena', verificadoEn: hoy }, eppArea: [] }, a)); });
    // D-031 §2 y §6: responsables con nombre, por área o por zona; varios por área (turnos); reemplazos; informados.
    // A2 no tiene medio ambiente asignado: sirve para probar «configuración pendiente» (CP-10).
    db.responsables = [
      { area: 'a1', calidad: 'encargado_area', persona: 'p-carlos' }, { area: 'a1', calidad: 'medio_ambiente', persona: 'p-sofia' },
      { area: 'a2', calidad: 'encargado_area', persona: 'p-ana' }, { area: 'a2', calidad: 'encargado_area', persona: 'p-pedro', reemplazaA: 'p-ana' },
      { area: 'a3', calidad: 'encargado_area', persona: 'p-ana' },
      { area: 'a4', calidad: 'encargado_area', persona: 'p-hugo' }, { area: 'a5', calidad: 'encargado_area', persona: 'p-hugo' }, { area: 'a6', calidad: 'encargado_area', persona: 'p-hugo' },
      { area: 'a7', calidad: 'encargado_area', persona: 'p-carlos', turno: 'día' }, { area: 'a7', calidad: 'encargado_area', persona: 'p-pedro', turno: 'noche' },
      { zona: 'z-obras', calidad: 'prevencion', persona: 'p-elena' }, { zona: 'z-talleres', calidad: 'prevencion', persona: 'p-elena' },
      { zona: 'z-obras', calidad: 'mandante', persona: 'p-marcela' }, { zona: 'z-talleres', calidad: 'medio_ambiente', persona: 'p-sofia' },
      { zona: 'z-obras', calidad: 'informado', persona: 'p-gerardo' }, { zona: 'z-talleres', calidad: 'informado', persona: 'p-gerardo' },
      { empresa: 'e-contratista', calidad: 'responsable_subcontrato', persona: 'p-raul' }
    ];
    // D-031 §2: cargo (rol), permisos y alcance. Tener un cargo no da permisos por sí solo.
    var todo = ['consultar', 'crear', 'registrar_trabajadores', 'revisar', 'observar', 'aprobar', 'gestionar_pendientes', 'verificar_terreno'];
    db.asignaciones = [];
    db.personas.forEach(function (p) {
      if (['trabajador', 'operador'].indexOf(p.rol) >= 0) db.asignaciones.push({ persona: p.id, permisos: ['consultar', 'crear'], alcance: { empresa: p.empresa } });
    });
    db.asignaciones.push(
      { persona: 'p-pedro', permisos: ['consultar', 'crear', 'registrar_trabajadores', 'gestionar_pendientes', 'verificar_terreno'], alcance: { zonas: ['z-obras'] } },
      { persona: 'p-pedro', permisos: todo, alcance: { areas: ['a7'] } },
      { persona: 'p-carlos', permisos: todo.concat('ver_historial'), alcance: { areas: ['a1', 'a7'] } },
      { persona: 'p-ana', permisos: todo.concat('configurar_areas', 'ver_historial'), alcance: { zonas: ['z-obras'] } },
      { persona: 'p-hugo', permisos: todo.concat('ver_historial'), alcance: { areas: ['a4', 'a5', 'a6'] } },
      { persona: 'p-elena', permisos: todo.concat('configurar_areas', 'configurar', 'ver_historial'), alcance: { empresa: 'e-principal' } },
      { persona: 'p-sofia', permisos: ['consultar', 'revisar', 'observar', 'aprobar'], alcance: { empresa: 'e-principal' } },
      { persona: 'p-marcela', permisos: ['consultar', 'revisar', 'observar', 'aprobar'], alcance: { zonas: ['z-obras'] } },
      { persona: 'p-raul', permisos: todo, alcance: { contrato: 'e-contratista' } },
      { persona: 'p-contratista', permisos: ['consultar', 'crear'], alcance: { contrato: 'e-contratista' } },
      { persona: 'p-gerardo', permisos: ['consultar'], alcance: { empresa: 'e-principal' } }
    );
    return db;
  }

  // ---------- Configuración: permisos por alcance y responsables (D-031) ----------
  function dentro(alc, area, empresaAst) {
    if (!alc) return false;
    if (alc.empresa) return true;
    if (alc.contrato) return empresaAst === alc.contrato;
    if (alc.zonas) return !!area && alc.zonas.indexOf(area.zona) >= 0;
    if (alc.areas) return !!area && alc.areas.indexOf(area.id) >= 0;
    return false;
  }
  function puede(db, personaId, permiso, areaId, empresaAst) {
    var area = porId(db.areas, areaId);
    return (db.asignaciones || []).some(function (a) { return a.persona === personaId && a.permisos.indexOf(permiso) >= 0 && dentro(a.alcance, area, empresaAst); });
  }
  function textoAlcance(db, alc) {
    if (alc.empresa) return 'empresa';
    if (alc.contrato) return 'contrato ' + porId(db.empresas, alc.contrato).nombre;
    if (alc.zonas) return alc.zonas.map(function (z) { return porId(db.zonas, z).nombre; }).join(', ');
    return alc.areas.map(function (a) { return porId(db.areas, a).nombre.split(' ·')[0]; }).join(', ');
  }
  // Personas activas para una responsabilidad en un área: primero las del área, si no las de su zona.
  // Un reemplazo solo cuenta mientras el titular está ausente.
  function responsablesDe(db, areaId, calidad, empresaAst) {
    var area = porId(db.areas, areaId), ent;
    if (calidad === 'responsable_subcontrato') ent = db.responsables.filter(function (r) { return r.calidad === calidad && r.empresa === empresaAst; });
    else {
      ent = db.responsables.filter(function (r) { return r.calidad === calidad && r.area === areaId; });
      if (!ent.length && area) ent = db.responsables.filter(function (r) { return r.calidad === calidad && r.zona === area.zona; });
    }
    var ausente = function (pid) { var p = porId(db.personas, pid); return !p || p.ausente; };
    var activos = ent.filter(function (r) { return r.reemplazaA ? ausente(r.reemplazaA) : !ausente(r.persona); }).map(function (r) { return r.persona; });
    return activos.filter(function (p, i) { return activos.indexOf(p) === i; });
  }
  function responsable(db, ast, calidad) { return responsablesDe(db, ast.area, calidad, ast.empresa)[0] || null; }
  function esResponsable(db, ast, calidad, personaId, areaId) { return responsablesDe(db, areaId || ast.area, calidad, ast.empresa).indexOf(personaId) >= 0; }

  // ---------- Consultas ----------
  function ficha(db, id) { return porId(db.biblioteca.fichas, id); }
  // D-043 §1: «Área 4 — Taller de soldadura» (demo) o «Área AR-CUB — Cubierta» (escenario)
  function tituloArea(a) {
    var m = String(a.nombre).match(/^([A-Z]+-?[A-Z0-9-]*)\s·\s(.*)$/);
    if (!m) return 'Área — ' + a.nombre;
    var cod = /^A\d+$/.test(m[1]) ? m[1].slice(1) : m[1];
    return 'Área ' + cod + ' — ' + m[2];
  }
  // D-040: solo un documento vigente sirve de referencia; un borrador nunca cubre una brecha
  function documento(db, id) { return db.biblioteca.documentos.filter(function (x) { return x.id === id && (!x.estado || x.estado === 'VIGENTE'); })[0] || null; }
  function normal(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  // Sugerencia por palabras clave, limitada al catálogo (D-022). Más adelante la puede hacer una IA, con el mismo límite.
  function sugerir(db, texto, areaId) {
    var t = normal(texto), area = areaId ? porId(db.areas, areaId) : null;
    return db.biblioteca.fichas.map(function (f) {
      var claves = f.claves.map(normal).filter(function (c, i, l) { return l.indexOf(c) === i; });
      var hits = claves.filter(function (c) { return t.indexOf(c) >= 0; });
      return { ficha: f, puntaje: hits.length, coincide: hits, enArea: !area || !area.diagnostico || area.diagnostico.trabajos.indexOf(f.id) >= 0 };
    }).filter(function (x) { return x.puntaje > 0; }).sort(function (a, b) { return b.puntaje - a.puntaje; }).slice(0, 4);
  }
  // D-030 §3: herramientas u operaciones que la descripción ya deja claras; las demás se preguntan
  function detectar(f, texto) {
    var t = normal(texto), out = {};
    (f.preguntas || []).forEach(function (q) { if ((q.detectar || []).some(function (k) { return t.indexOf(normal(k)) >= 0; })) out[q.id] = true; });
    return out;
  }
  function brechaDe(db, f) {
    if (!f) return { tipo: 'SIN_TAREA', detalle: 'El trabajo descrito no está cubierto por los procedimientos cargados.' };
    var falt = f.referencias.filter(function (r) { return !documento(db, r); });
    if (falt.length) return { tipo: 'DOCUMENTO_FALTANTE', detalle: 'La ficha ' + f.id + ' cita documentos que no están cargados: ' + falt.join(', ') + '.' };
    if (f.contradicciones && f.contradicciones.length) return { tipo: 'CONTRADICCION', detalle: f.contradicciones.map(function (c) { return c.descripcion; }).join(' ') };
    return null;
  }
  function requisitosDe(f, respuestas) {
    return f.requisitos.filter(function (r) { return !r.si || (respuestas && respuestas[r.si] === true); });
  }
  // D-043 §3: una AST puede reunir varios procedimientos (p. ej. cubierta + manipulador telescópico)
  function fichasDe(db, ast) {
    var ids = ast.fichas && ast.fichas.length ? ast.fichas : (ast.ficha ? [ast.ficha] : []);
    return ids.map(function (id) { return ficha(db, id); }).filter(Boolean);
  }
  // Une listas por id: sin duplicados y conservando TODAS las referencias (citas) de cada exigencia (D-043 §4)
  var FUERZA_NIVEL = { declarado: 1, responsable: 2, sistema: 3 }, FUERZA_VERIF = { encargado: 1, especializada: 2 };
  function unirPorId(listas, deFicha) {
    var out = [], por = {};
    listas.forEach(function (l, k) {
      (l || []).forEach(function (r) {
        var x = por[r.id];
        if (!x) { x = por[r.id] = Object.assign({}, r, { citas: r.cita ? [r.cita] : [], fichas: deFicha ? [deFicha[k]] : [] }); out.push(x); return; }
        if (r.cita && x.citas.indexOf(r.cita) < 0) x.citas.push(r.cita);
        if (deFicha && x.fichas.indexOf(deFicha[k]) < 0) x.fichas.push(deFicha[k]);
        if (r.critico) x.critico = true;
        if ((FUERZA_NIVEL[r.nivel] || 0) > (FUERZA_NIVEL[x.nivel] || 0)) x.nivel = r.nivel;
        if ((FUERZA_VERIF[r.verifica] || 0) > (FUERZA_VERIF[x.verifica] || 0)) x.verifica = r.verifica;
        if (!r.si) delete x.si;   // si en una ficha se exige siempre, se exige siempre
        if (!r.noAplica) delete x.noAplica;   // «No aplica» solo si todas las fuentes lo permiten
      });
    });
    return out;
  }
  function preguntasDe(fs) { return unirPorId(fs.map(function (f) { return f.preguntas || []; }), fs.map(function (f) { return f.id; })); }
  function rolesDe(fs) { return unirPorId(fs.map(function (f) { return f.roles || []; }), fs.map(function (f) { return f.id; })); }
  function equiposDe(fs) { return unirPorId(fs.map(function (f) { return f.equipos || []; }), fs.map(function (f) { return f.id; })); }
  function requisitosAst(db, ast) {
    var fs = fichasDe(db, ast);
    return unirPorId(fs.map(function (f) { return requisitosDe(f, ast.respuestas); }), fs.map(function (f) { return f.id; }));
  }
  // Lista completa que responde cada trabajador (D-030): EPP básicos de la empresa, EPP del área, requisitos de la tarea
  // y de cada herramienta, condiciones del lugar, y lo que la app verifica en la ficha.
  // D-043 §4: con varias fichas, una sola lista sin duplicados. Lo de un rol (p. ej. operador del manipulador) solo le
  // corresponde a quien declara ese rol; lo del equipo (inspección, certificación) es de la AST, no de cada persona.
  // Sin personaId devuelve todo lo personal (para buscar un requisito por id).
  function requisitosPersona(db, ast, personaId) {
    var fs = fichasDe(db, ast), area = porId(db.areas, ast.area), pregs = preguntasDe(fs);
    var i = personaId && ast.integrantes ? integrante(ast, personaId) : null, roles = i ? (i.roles || []) : null;
    // Con varias labores (fichas), cada persona responde solo lo de las labores en que participa (p. ej. el operador
    // del manipulador no sube a la techumbre). Sin declararlas, se le pide todo.
    if (i && i.labores && i.labores.length) fs = fs.filter(function (f) { return i.labores.indexOf(f.id) >= 0; });
    var grupo = function (r) {
      if (r.rol) return 'rol:' + r.rol;
      if (r.tipo === 'competencia') return 'sistema';
      if (r.si) { var q = pregs.filter(function (x) { return x.id === r.si; })[0]; return 'herramienta:' + (q ? q.herramienta : r.si); }
      return r.tipo === 'condicion' ? 'condicion' : 'tarea';
    };
    var propios = unirPorId(fs.map(function (f) { return requisitosDe(f, ast.respuestas); }), fs.map(function (f) { return f.id; })).filter(function (r) { return r.ambito !== 'equipo' && (!r.rol || !roles || roles.indexOf(r.rol) >= 0); });
    var base = db.biblioteca.eppBasicos.map(function (r) { return Object.assign({ grupo: 'basico', citas: [r.cita] }, r); })
      .concat((area.eppArea || []).map(function (r) { return Object.assign({ tipo: 'epp', nivel: 'declarado', grupo: 'area', citas: [r.cita] }, r); }));
    // un requisito de la tarea que repite un EPP básico o del área suma su referencia, no una pregunta más
    var ids = base.map(function (r) { return r.id; });
    propios.forEach(function (r) { var b = base[ids.indexOf(r.id)]; if (b) r.citas.forEach(function (c) { if (b.citas.indexOf(c) < 0) b.citas.push(c); }); });
    return base.concat(propios.filter(function (r) { return ids.indexOf(r.id) < 0; }).map(function (r) { return Object.assign({ grupo: grupo(r) }, r); }));
  }
  // ---------- Equipos de la AST (D-043 §4): se comprueba el registro vigente; si no hay, se pide una inspección ----------
  function unidadesDe(db, tipo) { return (db.equiposObra || []).filter(function (u) { return u.tipo === tipo && u.activo !== false; }); }
  function inspeccionVigente(db, u) {
    var hoy = A.ahora(db).slice(0, 10);
    return (u.inspecciones || []).filter(function (x) { return x.resultado === 'CONFORME' && x.en.slice(0, 10) === hoy; }).slice(-1)[0] || null;
  }
  function estadoEquipos(db, ast) {
    var hoy = A.ahora(db).slice(0, 10), out = [];
    requisitosAst(db, ast).filter(function (r) { return r.ambito === 'equipo'; }).forEach(function (r) {
      var eq = (ast.equipos || []).filter(function (e) { return e.id === r.equipo; })[0], u = eq && eq.unidad ? (db.equiposObra || []).filter(function (x) { return x.id === eq.unidad; })[0] : null;
      var x = { req: r.id, nombre: r.nombre, citas: r.citas, equipo: eq ? eq.nombre : r.equipo, unidad: u ? u.id : null, registro: r.registro, estado: 'SIN_REGISTRO', detalle: 'El equipo no está registrado en el sistema' };
      if (u && r.registro === 'certificacion') {
        var c = u.certificacion;
        x.estado = c && c.vence >= hoy ? 'VIGENTE' : 'VENCIDO'; x.detalle = c ? (x.estado === 'VIGENTE' ? 'Vigente hasta ' + c.vence : 'Venció el ' + c.vence) : 'Sin certificación registrada';
      } else if (u && r.registro === 'inspeccion_preuso') {
        var ins = inspeccionVigente(db, u), mala = (u.inspecciones || []).filter(function (y) { return y.en.slice(0, 10) === hoy; }).slice(-1)[0];
        if (ins) { x.estado = 'VIGENTE'; x.detalle = 'Inspección de hoy registrada por ' + A.nombre(db, ins.por); x.inspeccion = ins.id; }
        else if (mala && mala.resultado === 'NO_CONFORME') { x.estado = 'NO_CONFORME'; x.detalle = 'La inspección de hoy encontró fallas: el equipo no se usa hasta repararlo'; x.inspeccion = mala.id; }
        else { x.estado = 'REQUIERE_INSPECCION'; x.detalle = 'Falta el checklist pre-uso de hoy (Checkmaq: escanea el QR de la máquina)'; }
      }
      // Checkmaq (regla 1): una máquina en naranja o rojo no entra a la AST aunque tenga papeles al día
      if (u && (u.semaforo === 'NARANJA' || u.semaforo === 'ROJO')) { x.estado = 'FUERA_SERVICIO'; x.detalle = (u.semaforo === 'ROJO' ? 'Fuera de servicio' : 'Intervención prioritaria') + ' en Checkmaq: no se usa hasta repararla y validar su retorno'; x.semaforo = u.semaforo; }
      if (u && u.qr && u.checkmaq) x.qrMaquina = u.qr;
      out.push(x);
    });
    return out;
  }
  // ---------- Identificación automática de los procedimientos aplicables (D-043 §3) ----------
  // Por palabras clave y limitada al catálogo vigente (D-022). Una IA puede reemplazar `API.identificador` con el mismo
  // contrato: devolver fichas del catálogo con su puntaje; nunca inventar procedimientos.
  function porPalabras(db, texto, areaId) {
    var t = normal(texto), area = areaId ? porId(db.areas, areaId) : null;
    return db.biblioteca.fichas.map(function (f) {
      var claves = f.claves.map(normal).filter(function (c, i, l) { return l.indexOf(c) === i; });
      var hits = claves.filter(function (c) { return t.indexOf(c) >= 0; });
      return { ficha: f, puntaje: hits.length, coincide: hits, enArea: !area || !area.diagnostico || area.diagnostico.trabajos.indexOf(f.id) >= 0 };
    }).filter(function (x) { return x.puntaje > 0; }).sort(function (a, b) { return b.puntaje - a.puntaje; });
  }
  function identificar(db, texto, areaId) {
    var cand = (API.identificador || porPalabras)(db, texto, areaId), ok = [], pendientes = [];
    cand.forEach(function (c) {
      var f = c.ficha, br = brechaDe(db, f);
      if (f.estado !== 'VALIDADA') pendientes.push({ ficha: f.id, nombre: f.nombre, motivo: f.estado === 'REVISION_POR_CAMBIO' ? 'su procedimiento cambió y está en revisión' : 'está en validación por Prevención' });
      else if (br) pendientes.push({ ficha: f.id, nombre: f.nombre, motivo: br.detalle, contradiccion: br.tipo === 'CONTRADICCION' });
      else if (!c.enArea) pendientes.push({ ficha: f.id, nombre: f.nombre, motivo: 'el diagnóstico de esta área no contempla este trabajo' });
      else ok.push(f);
    });
    var det = {};
    ok.forEach(function (f) { Object.assign(det, detectar(f, texto)); });
    var preguntas = preguntasDe(ok).filter(function (q) { return typeof det[q.id] !== 'boolean'; });
    // ¿qué unidad del equipo? solo se pregunta si hay más de una registrada
    var unidades = equiposDe(ok).map(function (e) { var us = unidadesDe(db, e.tipo); return { id: e.id, nombre: e.nombre, opciones: us.map(function (u) { return { id: u.id, nombre: u.nombre }; }), elegida: us.length === 1 ? us[0].id : null }; });
    var docs = [];
    ok.forEach(function (f) { f.referencias.forEach(function (r) { var d = documento(db, r); if (d && ['procedimiento', 'protocolo'].indexOf(d.tipo) >= 0 && !docs.some(function (x) { return x.id === d.id; })) docs.push({ id: d.id, titulo: d.titulo, version: d.version }); }); });
    return { fichas: ok.map(function (f) { return f.id; }), nombres: ok.map(function (f) { return f.nombre; }), procedimientos: docs, preguntas: preguntas, detectadas: det, unidades: unidades,
      pendientes: pendientes, sinCobertura: !ok.length && !pendientes.length };
  }
  function mensajeBloqueo(lista) {
    var porHerr = {};
    lista.forEach(function (x) { var k = x.herramienta || ''; (porHerr[k] = porHerr[k] || []).push(x.nombre); });
    return Object.keys(porHerr).map(function (k) {
      return 'No cumple con un requisito obligatorio ' + (k ? 'para utilizar ' + k : 'de esta tarea') + ': ' + porHerr[k].join(', ') + '.';
    }).join(' ') + ' No está autorizado para iniciar esta tarea. Gestione la condición pendiente con el encargado del área.';
  }
  function etiquetaEmpresa(db, ast) { var e = porId(db.empresas, ast.empresa); return e.tipo === 'contratista' ? 'Subcontrato · ' + e.nombre : e.nombre; }
  function esSubcontrato(db, ast) { return porId(db.empresas, ast.empresa).tipo === 'contratista'; }
  // ---------- Participación de cada persona (D-038): vigente, pausada o finalizada; nunca se borra ----------
  function nuevaParticipacion(db) { return { estado: 'VIGENTE', desde: A.ahora(db), historial: [{ evento: 'INCORPORACION', en: A.ahora(db) }] }; }
  function participacion(i) { return i.participacion || (i.participacion = { estado: 'VIGENTE', desde: i.incluidoEn, historial: [{ evento: 'INCORPORACION', en: i.incluidoEn }] }); }
  // Otras participaciones vigentes de la persona (en otras AST abiertas)
  function vigentesOtras(db, personaId, astId) {
    var out = [];
    db.asts.forEach(function (a) {
      if (a.modo !== 'cuadrilla' || a.id === astId || ['CERRADA', 'ANULADA'].indexOf(a.estado) >= 0) return;
      var i = (a.integrantes || []).filter(function (x) { return x.persona === personaId; })[0];
      if (i && participacion(i).estado === 'VIGENTE') out.push({ ast: a.id, nombre: a.nombre, area: a.area });
    });
    return out;
  }
  function cerrarAnterior(db, personaId, anterior) {
    var a = porId(db.asts, anterior.ast), i = a && (a.integrantes || []).filter(function (x) { return x.persona === personaId; })[0];
    if (!i || ['FINALIZAR', 'PAUSAR'].indexOf(anterior.accion) < 0) return false;
    var pa = participacion(i); pa.estado = anterior.accion === 'FINALIZAR' ? 'FINALIZADA' : 'PAUSADA';
    pa.historial.push({ evento: anterior.accion === 'FINALIZAR' ? 'FINALIZACION' : 'PAUSA', en: A.ahora(db), motivo: 'cambio de tarea' });
    return true;
  }
  // Al pasar a otra tarea, la persona declara si finalizó o pausó la anterior (solo su participación)
  function exigirAnterior(db, ev, personaId, astId, d) {
    var otras = vigentesOtras(db, personaId, astId);
    if (!otras.length) return null;
    var dec = d.anteriores || (d.anterior ? [d.anterior] : []);
    if (!Array.isArray(dec)) dec = [];
    dec = dec.filter(function (x) { return x && typeof x === 'object'; }); // datos mal formados no lanzan: se tratan como «sin declaración»
    var faltan = otras.filter(function (o) { return !dec.some(function (x) { return x.ast === o.ast && ['FINALIZAR', 'PAUSAR'].indexOf(x.accion) >= 0; }); });
    if (faltan.length) { var r = rechazar(db, ev, 'Antes indica si finalizaste o pausaste tu participación en ' + faltan.map(function (o) { return o.ast + ' «' + o.nombre + '»'; }).join(', ')); r.anteriores = faltan; return r; }
    dec.forEach(function (x) { cerrarAnterior(db, personaId, x); });
    return null;
  }
  function integrante(ast, personaId) { return ast.integrantes.filter(function (i) { return i.persona === personaId; })[0] || null; }
  function compVigente(db, p, c) { var x = p.comp && p.comp[c]; return !!(x && x.verificadoPor && x.vence && x.vence >= A.ahora(db).slice(0, 10)); }
  function faltantesAbiertos(ast, personaId) { return ast.faltantes.filter(function (f) { return f.persona === personaId && f.estado !== 'CONFIRMADO'; }); }
  function etiquetaAprob(db, ast, a) { return CALIDAD[a.calidad] + (a.area && a.area !== ast.area ? ' · ' + porId(db.areas, a.area).nombre.split(' ·')[0] : '') + (a.modo === 'presencial' ? ' (verificación presencial)' : ' (revisión documental)'); }
  // D-033 §5: el estado se dice con palabras, según qué falta
  function estadoTexto(db, ast) {
    var pend = ast.aprobaciones.filter(function (a) { return a.estado !== 'APROBADA'; });
    var lista = function (l) { return l.map(function (a) { return CALIDAD[a.calidad].toLowerCase() + (a.area !== ast.area ? ' (' + porId(db.areas, a.area).nombre.split(' ·')[0] + ')' : ''); }).join(', '); };
    if (ast.estado === 'REGISTRADA') {
      var sub = pend.filter(function (a) { return a.orden === 0; });
      return 'AST registrada. Pendiente de verificación del encargado del área' + (sub.length ? ' (antes, revisión del responsable del subcontrato)' : '') + (pend.some(function (a) { return a.estado === 'INCUMPLIMIENTO'; }) ? '. Bloqueada por incumplimiento hasta corregir y verificar de nuevo' : '');
    }
    if (ast.estado === 'EN_REVISION') return 'Verificada por el encargado del área. Pendiente de validación de ' + lista(pend);
    if (ast.estado === 'OBSERVADA') return 'Con observaciones: pendiente de corrección';
    if (ast.estado === 'APROBADA') {
      var perm = ast.permisos.filter(function (x) { return x.estado !== 'AUTORIZADO'; });
      return perm.length ? 'Verificada y aprobada. Pendiente de ' + perm.map(function (x) { return x.nombre; }).join(', ') : 'AST verificada y autorizada para iniciar el trabajo';
    }
    return null;
  }
  function normAprob(x) { return typeof x === 'string' ? { calidad: x, modo: 'documental' } : x; }
  // D-033 §3: chequeo presencial breve y específico, desde la tarea, el procedimiento y sus controles
  function chequeoEncargado(db, ast, soloReq) {
    var f = ficha(db, ast.ficha), reqs = requisitosAst(db, ast).filter(function (r) { return r.ambito !== 'equipo' && (!soloReq || soloReq.indexOf(r.id) >= 0); }), items = [];
    reqs.filter(function (r) { return r.tipo === 'condicion' && r.verifica !== 'especializada'; }).forEach(function (r) { items.push({ id: 'c:' + r.id, req: r.id, texto: r.nombre, detalle: 'Está como exige el procedimiento', cita: r.cita, critico: !!r.critico }); });
    reqs.filter(function (r) { return r.tipo === 'epp' && r.critico && r.verifica !== 'especializada'; }).forEach(function (r) { items.push({ id: 'e:' + r.id, req: r.id, texto: r.nombre, detalle: 'Cada persona firmada lo tiene, en buen estado, y sabe usarlo', cita: r.cita, critico: true, epp: true }); });
    if (!items.length) items.push({ id: 'g:frente', req: null, texto: 'El frente de trabajo está como describe la AST', detalle: 'Lugar, accesos y entorno coinciden con lo declarado', cita: f.documento, critico: true });
    return items;
  }
  // Avanza la AST según las aprobaciones que quedan (lo usan C_APROBAR y la verificación del encargado)
  function avanzar(db, ast) {
    var enc = ast.aprobaciones.filter(function (a) { return a.calidad === 'encargado_area' && a.area === ast.area; })[0];
    if (ast.aprobaciones.every(function (a) { return a.estado === 'APROBADA'; })) {
      ast.estado = 'APROBADA';
      avisar(db, [ast.creadaPor].concat(responsablesDe(db, ast.area, 'encargado_area', ast.empresa), ast.integrantes.map(function (i) { return i.persona; })), 'APROBADA', '«' + ast.nombre + '»: ' + estadoTexto(db, ast), ast);
      informar(db, ast, '«' + ast.nombre + '» (' + porId(db.areas, ast.area).nombre + '): ' + estadoTexto(db, ast));
    } else {
      if (enc && enc.estado === 'APROBADA' && ast.estado === 'REGISTRADA') ast.estado = 'EN_REVISION';
      avisarAprobadores(db, ast);
    }
  }
  // Inicio autorizado (P8): se calcula, no es un botón
  // D-042 §7: la AST vale para el turno en que se armó (horas configurables); vencida, se arma una nueva
  function vencida(db, ast) { return !!(ast.venceEn && A.ahora(db) > ast.venceEn); }
  // D-047: fin de la jornada N (hora de Chile, `finJornadaHora`, por defecto 20:00) contando el día en que se arma como la 1.ª.
  // Si se arma después del fin de jornada (turno de noche), la 1.ª jornada dura `vigenciaAstHoras` (o 12 h) desde ahora.
  function finJornada(db, desde, n) {
    var hFin = db.config.finJornadaHora || 20, t0 = new Date(desde).getTime();
    var dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t0));
    var enChile = function (ms) { var p = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'America/Santiago', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; }); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute); };
    var fin = function (k) { var b = new Date(dia + 'T00:00:00Z'); b.setUTCDate(b.getUTCDate() + k); var g = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate(), hFin, 0); return g - (enChile(g) - g); };
    if (fin(0) <= t0) return new Date(t0 + (db.config.vigenciaAstHoras || 12) * 3600000 + (n - 1) * 86400000).toISOString();
    return new Date(fin(n - 1)).toISOString();
  }
  // D-049: día calendario en hora de Chile; una AST de varias jornadas se usa por días y cada día exige evaluación rápida + registro de cada persona
  function diaChile(iso) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)); }
  function variasJornadas(ast) { return (ast.jornadas || 0) > 1; }
  // El día en que se arma la AST la incorporación firmada es el registro; desde el día siguiente cada persona se registra de nuevo
  function exigeRegistro(db, ast) { return variasJornadas(ast) && !!ast.diaInicio && diaChile(A.ahora(db)) !== ast.diaInicio; }
  function diaRegistros(db, ast, dia) { return ((ast.registrosDiarios || {})[dia || diaChile(A.ahora(db))]) || null; }
  function registroHoy(db, ast, personaId) { var r = diaRegistros(db, ast); return !!(r && r.registros && r.registros[personaId]); }
  // Nadie figura «trabajando» con una aprobación anulada (E4): el inicio se anula y queda en el historial de la persona
  function anularInicio(db, i, motivo) {
    if (!i.inicioTrabajo) return;
    (i.iniciosAnulados = i.iniciosAnulados || []).push(Object.assign({}, i.inicioTrabajo, { anuladoEn: A.ahora(db), motivo: motivo }));
    delete i.inicioTrabajo;
  }
  // D-049: lo que cambió y se declaró en la evaluación del día queda resuelto cuando se agrega por etapa o por cambio
  function resolverEvaluacion(db, ast, tipo, por) {
    var dr = diaRegistros(db, ast);
    if (!dr || !dr.evaluacion) return;
    if (dr.evaluacion.requiereAccion && !dr.evaluacion.resuelta) dr.evaluacion.resuelta = { tipo: tipo, por: por, en: A.ahora(db) };
    else if (!dr.evaluacion.requiereAccion) dr.cambiosPosteriores = (dr.cambiosPosteriores || []).concat([{ tipo: tipo, por: por, en: A.ahora(db) }]);
  }
  // D-047: al vencer, la AST se cierra sola y queda inalterable (solo admite observaciones aparte y la detención como condición de área)
  function cerrarVencidas(db) {
    (db.asts || []).forEach(function (a) {
      if (a.modo !== 'cuadrilla' || ['CERRADA', 'ANULADA'].indexOf(a.estado) >= 0 || !vencida(db, a)) return;
      var previo = a.estado; a.estado = 'CERRADA';
      a.cierre = { por: null, automatico: true, en: a.venceEn, texto: 'Cierre automático al terminar ' + (a.jornadas ? a.jornadas + (a.jornadas === 1 ? ' jornada' : ' jornadas') : 'su vigencia'), pendientes: (a.faltantes || []).filter(function (x) { return x.estado !== 'CONFIRMADO'; }).map(function (x) { return (x.persona ? A.nombre(db, x.persona) : 'AST') + ': ' + x.nombre; }) };
      A.registrar(db, { tipo: 'C_CIERRE_AUTOMATICO', ast: a.id, area: a.area, actor: null, estadoPrevio: previo, estadoNuevo: 'CERRADA', datos: { venceEn: a.venceEn, jornadas: a.jornadas || null } });
    });
  }
  function inicio(db, ast, personaId) {
    var falta = [], i = integrante(ast, personaId);
    if (vencida(db, ast)) falta.push('una AST vigente: esta venció ' + ast.venceEn.slice(0, 16).replace('T', ' ') + ' UTC (se arma una nueva)');
    if (exigeRegistro(db, ast)) {
      var dr = diaRegistros(db, ast);
      if (!dr || !dr.evaluacion) falta.push('la evaluación rápida del día (¿cambió el área, la tarea o las condiciones?)');
      else if (dr.evaluacion.requiereAccion && !dr.evaluacion.resuelta) falta.push('agregar lo que cambió hoy (etapa o cambio con nueva firma y verificación del encargado)');
      if (!registroHoy(db, ast, personaId)) falta.push('tu registro del día en la AST (cada día cada persona se registra)');
    }
    if (i && participacion(i).estado !== 'VIGENTE') falta.push('tu participación está ' + participacion(i).estado.toLowerCase() + (participacion(i).estado === 'PAUSADA' ? ': reanúdala' : ''));
    if (!i || i.estado !== 'FIRMADO') falta.push('tu incorporación firmada');
    else {
      requisitosPersona(db, ast, personaId).filter(function (r) { return r.critico && r.nivel !== 'sistema'; }).forEach(function (r) {
        var v = (i.verif || {})[r.id];
        if (!v || ['VERIFICADO', 'CORREGIDO_VERIFICADO', 'NO_APLICA'].indexOf(v.estado) < 0) falta.push('verificación en terreno de «' + r.nombre + '»' + (v && v.estado === 'INCUMPLIMIENTO' ? ' (incumplimiento detectado)' : ' (la hace ' + (r.verifica === 'especializada' ? 'Prevención' : 'el encargado o un supervisor capacitado') + ')'));
      });
      if (i.bloqueoHallazgo) falta.push('resolver el hallazgo ' + i.bloqueoHallazgo + ' (corrección verificada en terreno)');
    }
    // D-043 §4: un rol obligatorio (p. ej. operador del manipulador) lo tiene que asumir alguien firmado de la AST
    rolesDe(fichasDe(db, ast)).filter(function (r) { return r.obligatorio; }).forEach(function (r) {
      if (!ast.integrantes.some(function (x) { return x.estado === 'FIRMADO' && (x.roles || []).indexOf(r.id) >= 0; })) falta.push('que alguien de la AST asuma el rol de ' + r.nombre.toLowerCase());
    });
    estadoEquipos(db, ast).filter(function (x) { return x.estado !== 'VIGENTE'; }).forEach(function (x) { falta.push(x.nombre + ' de ' + (x.unidad || x.equipo) + ': ' + x.detalle.toLowerCase()); });
    if (ast.estado === 'DETENIDA') falta.push('levantar la detención');
    else if (ast.estado !== 'APROBADA') {
      ast.aprobaciones.filter(function (a) { return a.estado !== 'APROBADA'; }).forEach(function (a) {
        var per = responsablesDe(db, a.area, a.calidad, ast.empresa);
        falta.push((a.calidad === 'encargado_area' && a.modo === 'presencial' ? 'la verificación presencial del encargado del área' : 'la firma de ' + etiquetaAprob(db, ast, a)) + (per.length ? ' (' + per.map(function (x) { return A.nombre(db, x); }).join(' o ') + ')' : ' — sin responsable asignado'));
      });
      if (!ast.aprobaciones.length) falta.push('que quien creó la AST complete sus requisitos y firme');
    }
    ast.permisos.filter(function (p) { return p.estado !== 'AUTORIZADO'; }).forEach(function (p) { falta.push(p.nombre + ' (' + p.estado.toLowerCase().replace(/_/g, ' ') + ')'); });
    return { ok: !falta.length, falta: falta };
  }

  // ---------- Firma según la empresa (D-029): solo RUT o PIN personal ----------
  function modoFirma(db, persona) { return porId(db.empresas, persona.empresa).firma || 'RUT'; }
  function limpiar(x) { return String(x || '').replace(/[^0-9kK]/g, '').toUpperCase(); }
  // Un intento fallido hecho en el teléfono de otra persona NO suma al contador de quien actúa (así un tercero no le bloquea el PIN):
  // queda registrado y se avisa al dueño y a Prevención cada vez que se junten "intentosPin" fallos desde ese teléfono.
  function intentoAjeno(db, persona, dispositivoDe) {
    var lim = (db.config && db.config.intentosPin) || 3;
    db.intentosAjenos = db.intentosAjenos || [];
    db.intentosAjenos.push({ persona: persona.id, dispositivoDe: dispositivoDe, en: A.ahora(db) });
    var n = db.intentosAjenos.filter(function (x) { return x.persona === persona.id && x.dispositivoDe === dispositivoDe; }).length;
    if (n % lim === 0) {
      var prev = responsablesDe(db, null, 'prevencion', persona.empresa); if (!prev.length) prev = db.personas.filter(function (x) { return x.rol === 'prevencion' && x.empresa === persona.empresa; }).map(function (x) { return x.id; });
      if (!prev.length) prev = db.personas.filter(function (x) { return x.rol === 'prevencion'; }).map(function (x) { return x.id; }); // subcontrato sin Prevención propia: la de la faena
      avisar(db, prev.concat([persona.id]), 'INTENTO_PIN_AJENO', n + ' intentos fallidos de firmar como ' + persona.nombre + ' desde el teléfono de ' + A.nombre(db, dispositivoDe) + '. Su PIN no se bloquea por esto; Prevención revisa si hay un uso indebido.', null);
    }
  }
  function credencialOk(db, persona, credencial, dispositivoDe) {
    var lim = db.config && db.config.intentosPin, ajeno = !!dispositivoDe && dispositivoDe !== persona.id;
    if (lim && persona.pinBloqueado) return false;
    if (modoFirma(db, persona) === 'PIN') {
      var bien = !!persona.pin && String(credencial || '') === persona.pin;
      if (!bien && ajeno) { intentoAjeno(db, persona, dispositivoDe); return false; }
      if (lim) {
        persona.intentosFallidos = bien ? 0 : (persona.intentosFallidos || 0) + 1;
        if (persona.intentosFallidos >= lim) { persona.pinBloqueado = true; avisar(db, responsablesDe(db, null, 'prevencion', persona.empresa).length ? responsablesDe(db, null, 'prevencion', persona.empresa) : db.personas.filter(function (x) { return x.rol === 'prevencion' && x.empresa === persona.empresa; }).map(function (x) { return x.id; }), 'PIN_BLOQUEADO', 'PIN de ' + persona.nombre + ' bloqueado tras ' + lim + ' intentos fallidos. Se desbloquea verificando su identidad en persona.', null); }
      }
      return bien;
    }
    var c = String(credencial || '').trim().toUpperCase();
    return (!!persona.rut && limpiar(c).length > 1 && limpiar(c) === limpiar(persona.rut)) || (!!persona.ingreso && c === persona.ingreso.toUpperCase());
  }
  function textoMecanismo(db, persona, dispositivoDe) {
    return (modoFirma(db, persona) === 'PIN' ? 'PIN personal' : 'su RUT') + (dispositivoDe ? ' en el teléfono de ' + A.nombre(db, dispositivoDe) : ' en su propio teléfono');
  }

  // ---------- Avisos dirigidos por evento, área y función (D-031 §6) ----------
  function avisar(db, para, tipo, texto, ast, extra) {
    var unicos = para.filter(function (p, i) { return p && para.indexOf(p) === i; });
    unicos.forEach(function (p) {
      db.avisos.push(Object.assign({ id: 'AV-' + String(db.avisos.length + 1).padStart(4, '0'), para: p, tipo: tipo, prioridad: AVISOS[tipo] || 'resumen', accion: !!ACCION[tipo], texto: texto, ast: ast ? ast.id : null, en: A.ahora(db), leido: false, canales: ['app'] }, extra || {}));
    });
  }
  function informar(db, ast, texto) { avisar(db, responsablesDe(db, ast.area, 'informado', ast.empresa), 'INFORMACION', texto, ast); }
  function responsablesFaltante(db, ast, personaId) {
    var p = personaId ? porId(db.personas, personaId) : null;
    var r = responsablesDe(db, ast.area, 'encargado_area', ast.empresa).concat(responsablesDe(db, ast.area, 'prevencion', ast.empresa));
    if ((p && porId(db.empresas, p.empresa).tipo === 'contratista') || esSubcontrato(db, ast)) r = r.concat(responsablesDe(db, ast.area, 'responsable_subcontrato', ast.empresa));
    return r;
  }

  // ---------- Eventos ----------
  function rechazar(db, ev, motivo) {
    A.registrar(db, { tipo: 'TRANSICION_RECHAZADA', ast: ev.ast || null, actor: ev.actor, datos: { intento: ev.tipo, motivo: motivo, faltantes: [] } });
    return { ok: false, motivo: motivo, faltantes: [] };
  }
  function ok(db, ev, ast, previo, datos, extra) {
    var e = A.registrar(db, { tipo: ev.tipo, ast: ast ? ast.id : null, area: ast ? ast.area : ev.area || null, actor: ev.actor, ocurridoEn: ev.ocurridoEn || null, estadoPrevio: previo, estadoNuevo: ast ? ast.estado : null, datos: Object.assign({ dispositivoDe: ev.dispositivoDe || null }, datos || {}) });
    return Object.assign({ ok: true, evento: e, ast: ast }, extra || {});
  }
  function puedeConfigurar(db, actor) { return actor.rol === 'administrador' || puede(db, actor.id, 'configurar', null, null); }

  // Validación común de las fichas de una tarea (la usan C_ELEGIR_TAREA y C_AMPLIAR, D-048).
  // Devuelve { rechazo } | { brecha } | { det, resp, eqs }. No modifica la AST.
  function analizarFichas(db, ast, d, fis, texto) {
    if (fis.some(function (x) { return !x; })) return { rechazo: 'Ficha desconocida' };
    var fiMal = fis.filter(function (x) { return x.estado !== 'VALIDADA'; })[0];
    if (fiMal && !d.pendiente) return { rechazo: 'La ficha ' + fiMal.id + (fiMal.estado === 'REVISION_POR_CAMBIO' ? ' está en revisión porque cambió un documento que cita' : ' está en validación') + ': aún no se puede usar' };
    var ar = porId(db.areas, ast.area);
    var fuera = fis.filter(function (x) { return ar.diagnostico.trabajos.indexOf(x.id) < 0; })[0];
    if (fuera && !d.pendiente) return { rechazo: 'El diagnóstico de ' + ar.nombre + ' no permite ' + fuera.nombre };
    // Preguntas por la operación concreta cuya respuesta deja el trabajo sin cobertura documental (p. ej. el manipulador para algo más que trasladar)
    var respB = Object.assign({}, d.respuestas || {});
    fis.forEach(function (x) { Object.assign(respB, Object.assign(detectar(x, texto), d.respuestas || {})); });
    var sinCob = preguntasDe(fis).filter(function (q) { return q.brechaSi !== undefined && respB[q.id] === q.brechaSi; })[0];
    var br = d.pendiente ? { tipo: 'PENDIENTE_REVISION', detalle: d.pendiente } : sinCob ? { tipo: 'OPERACION_NO_CUBIERTA', detalle: sinCob.brechaTexto } : null;
    if (!br) fis.some(function (x) { br = brechaDe(db, x); return !!br; });
    if (!fis.length && !br) br = brechaDe(db, null);
    if (br) return { brecha: br };
    // Respuestas: lo detectado en la descripción + lo que respondió (que puede corregir lo detectado)
    var det = {}; fis.forEach(function (x) { Object.assign(det, detectar(x, texto)); });
    var resp = Object.assign({}, det, d.respuestas || {});
    var sinResponder = preguntasDe(fis).filter(function (q) { return typeof resp[q.id] !== 'boolean'; });
    if (sinResponder.length) return { rechazo: 'Falta responder: ' + sinResponder[0].texto };
    // Equipos: la unidad se elige solo si hay más de una registrada
    var eqs = equiposDe(fis).map(function (e) { var us = unidadesDe(db, e.tipo), u = (d.unidades || {})[e.id] || (us.length === 1 ? us[0].id : null); return { id: e.id, tipo: e.tipo, nombre: e.nombre, unidad: u, citas: e.citas }; });
    var sinUnidad = eqs.filter(function (e) { return !e.unidad && unidadesDe(db, e.tipo).length > 1; })[0];
    if (sinUnidad) return { rechazo: 'Falta responder: ¿Cuál ' + sinUnidad.nombre.toLowerCase() + ' usarán?' };
    if (eqs.some(function (e) { return e.unidad && !unidadesDe(db, e.tipo).some(function (u) { return u.id === e.unidad; }); })) return { rechazo: 'Esa unidad de equipo no está registrada' };
    return { det: det, resp: resp, eqs: eqs };
  }
  function referenciasDe(db, fis) {
    var refs = []; fis.forEach(function (x) { x.referencias.forEach(function (r) { if (refs.indexOf(r) < 0) refs.push(r); }); });
    return refs.map(function (r) { var doc = documento(db, r); return { id: doc.id, titulo: doc.titulo, version: doc.version }; });
  }
  function permisosDe(fis) {
    return unirPorId(fis.map(function (x) { return x.permisos || []; })).map(function (p) { return { id: p.id, nombre: p.nombre, formato: p.formato, cita: p.cita, estado: 'REQUERIDO', revisaCalidad: p.revisa, autorizaCalidad: p.autoriza, condiciones: p.condiciones.map(function (c) { return { texto: c, ok: false }; }), historial: [] }; });
  }

  function aplicar(db, ev) {
    preparar(db);
    var d = ev.datos = ev.datos || {}, actor = porId(db.personas, ev.actor), ast = ev.ast ? porId(db.asts, ev.ast) : null, previo = ast ? ast.estado : null;
    if (!actor || (actor.rol === 'administrador' && EVENTOS_CONFIG.indexOf(ev.tipo) < 0)) return rechazar(db, ev, 'Persona no habilitada para actuar en una AST');
    // Acción hecha en el teléfono de otra persona (cuadrilla): exige la credencial de quien actúa (D-024, D-029)
    if (ev.dispositivoDe && ev.tipo !== 'C_CREAR_PIN') {
      if (modoFirma(db, actor) === 'PIN' && !actor.pin) return rechazar(db, ev, 'Primero crea tu PIN personal');
      if (!credencialOk(db, actor, ev.credencial || ev.pin, ev.dispositivoDe)) return rechazar(db, ev, (modoFirma(db, actor) === 'PIN' ? 'PIN' : 'RUT') + ' incorrecto: cada trabajador actúa con su propia credencial');
    }
    var f = ast && ast.ficha ? ficha(db, ast.ficha) : null;
    var permite = function (permiso, areaId) { return puede(db, actor.id, permiso, areaId || (ast && ast.area), ast ? ast.empresa : actor.empresa); };
    // D-047: las AST vencidas se cierran solas; una AST cerrada o anulada no admite cambios (solo observaciones aparte o detener como condición de área)
    cerrarVencidas(db);
    if (ast && ['CERRADA', 'ANULADA'].indexOf(ast.estado) >= 0 && ['C_DETENER', 'C_OBSERVACION_POSTERIOR'].indexOf(ev.tipo) < 0)
      return rechazar(db, ev, 'La AST está ' + (ast.estado === 'CERRADA' ? 'cerrada' : 'anulada') + ' y ya no se cambia. Si hay algo que agregar, deja una observación aparte.');
    if (ev.tipo === 'C_OBSERVACION_POSTERIOR') {
      if (!ast) return rechazar(db, ev, 'AST desconocida');
      if (!d.texto || String(d.texto).trim().length < 5) return rechazar(db, ev, 'Escribe la observación');
      if (!(integrante(ast, actor.id) || esResponsable(db, ast, 'encargado_area', actor.id) || actor.rol === 'prevencion' || permite('aprobar') || A.NIVEL[actor.rol] === 'elevado'))
        return rechazar(db, ev, 'Pueden dejar observaciones quienes participaron o los responsables del área');
      db.observacionesAst = db.observacionesAst || [];
      var obs = { id: 'OBS-' + String(db.observacionesAst.length + 1).padStart(4, '0'), ast: ast.id, por: actor.id, en: A.ahora(db), tipo: d.tipo === 'informe' ? 'informe' : 'observacion', texto: String(d.texto).trim() };
      db.observacionesAst.push(obs);
      return ok(db, ev, ast, ast.estado, { observacion: obs.id, ast: ast.id });
    }
    // D-045: puerta del módulo de cumplimiento (cumplimiento.js). Solo actúa si el mundo tiene `db.cumplimiento` activo: el escenario viejo y la demo no cambian.
    if (db.cumplimiento && API.puertaCumplimiento) { var bloqueoK = API.puertaCumplimiento(db, ev, actor, ast); if (bloqueoK) return rechazar(db, ev, bloqueoK); }

    switch (ev.tipo) {
      case 'C_CREAR': {
        var qrArea = porId(db.areas, d.area);
        if (!qrArea || d.qr !== qrArea.qr) return rechazar(db, ev, 'QR de área no válido');
        if (!d.confirmaArea) return rechazar(db, ev, 'Falta confirmar «estoy en la zona de llenado de esta área»');
        // D-031 §7: el QR es el punto de partida; el lugar real puede ser otra área
        var area = porId(db.areas, d.areaPrincipal || qrArea.id);
        if (!area) return rechazar(db, ev, 'Área principal desconocida');
        if (!area.diagnostico) return rechazar(db, ev, 'Área no implementada: falta el levantamiento y diagnóstico de ' + area.nombre);
        if (area.activa === false) return rechazar(db, ev, area.nombre + ' no está activa en la etapa actual de la obra');
        if (!puede(db, actor.id, 'crear', area.id, actor.empresa)) return rechazar(db, ev, 'Tu configuración no te permite crear AST en ' + area.nombre);
        var invol = (d.involucradas || []).filter(function (x) { return x !== area.id; });
        if (invol.some(function (x) { return !porId(db.areas, x); })) return rechazar(db, ev, 'Área involucrada desconocida');
        if (!d.descripcion || d.descripcion.trim().length < 8) return rechazar(db, ev, 'Describe el trabajo con un poco más de detalle');
        db.seq++;
        var nueva = { modo: 'cuadrilla', id: 'AST-' + String(db.seq).padStart(4, '0'), empresa: actor.empresa, faena: db.faena.id, area: area.id, puntoIngreso: qrArea.id, involucradas: invol, ruta: [area.id].concat(invol),
          creadaPor: actor.id, creadaEn: A.ahora(db), descripcion: d.descripcion.trim(), nombre: null, ficha: null, respuestas: {}, respuestasDetectadas: {}, referencias: [], estado: 'BORRADOR', brecha: null,
          condiciones: {}, integrantes: [], faltantes: [], aprobaciones: [], observaciones: [], permisos: [], detenciones: [], participantes: [], cambios: [] };
        db.asts.push(nueva);
        return ok(db, ev, nueva, null, { descripcion: nueva.descripcion, areaPrincipal: area.nombre, puntoIngreso: qrArea.nombre, involucradas: invol, creadaPor: actor.nombre, identificador: actor.rut ? A.rutMascara(actor.rut) : actor.ingreso, empresa: etiquetaEmpresa(db, nueva) });
      }
      case 'C_ELEGIR_TAREA': {
        if (!ast || ast.estado !== 'BORRADOR' || ast.ficha) return rechazar(db, ev, 'La tarea se elige una sola vez, en borrador');
        if (ast.creadaPor !== actor.id) return rechazar(db, ev, 'La tarea la elige quien creó la AST');
        // D-043 §3: una o varias fichas (las identifica la app; el trabajador no elige procedimientos)
        var idsF = d.fichas && d.fichas.length ? d.fichas : (d.ficha ? [d.ficha] : []);
        var fis = idsF.map(function (x) { return ficha(db, x); });
        var ar = porId(db.areas, ast.area);
        var an = analizarFichas(db, ast, d, fis, ast.descripcion);
        if (an.rechazo) return rechazar(db, ev, an.rechazo);
        var fi = fis[0] || null, br = an.brecha;
        if (br) {
          // D-025: se dice y se deriva; nada se inventa
          ast.brecha = br; ast.ficha = fi ? fi.id : null; ast.fichas = idsF; ast.nombre = d.nombre || (fis.length ? fis.map(function (x) { return x.nombre; }).join(' + ') : 'Trabajo sin procedimiento'); ast.estado = 'REVISION_DOCUMENTAL';
          avisar(db, responsablesDe(db, ast.area, 'prevencion', ast.empresa), 'BRECHA', 'Revisión documental: «' + ast.descripcion + '» (' + ar.nombre + ', ' + etiquetaEmpresa(db, ast) + '). ' + br.detalle, ast);
          if (API.alBrecha) API.alBrecha(db, ast, br, actor); // D-040: registra la brecha y avisa al responsable de la empresa
          return ok(db, ev, ast, previo, { brecha: br });
        }
        var det = an.det, resp = an.resp, eqs = an.eqs;
        // D-047: duración declarada en jornadas (si no se indica, rige la vigencia en horas de D-042)
        var jor = d.jornadas == null ? null : Number(d.jornadas), maxJ = db.config.maxJornadasAst || 7;
        if (jor !== null && (!(jor >= 1) || jor % 1 || jor > maxJ)) return rechazar(db, ev, 'Indica cuántas jornadas dura el trabajo (de 1 a ' + maxJ + ')');
        ast.ficha = fi.id; ast.fichas = idsF; ast.respuestas = resp; ast.respuestasDetectadas = det; ast.equipos = eqs; ast.inspecciones = [];
        ast.nombre = (d.nombre || fis.map(function (x) { return x.nombre; }).join(' + ')).trim();
        if (jor) { ast.jornadas = jor; ast.venceEn = finJornada(db, A.ahora(db), jor); }
        else if (db.config.vigenciaAstHoras) ast.venceEn = new Date(new Date(A.ahora(db)).getTime() + db.config.vigenciaAstHoras * 3600000).toISOString();
        ast.referencias = referenciasDe(db, fis);
        ast.permisos = permisosDe(fis);
        ast.etapas = [{ n: 1, fichas: idsF.slice(), desde: A.ahora(db), por: actor.id, motivo: null }]; // D-048
        if (jor) ast.diaInicio = diaChile(A.ahora(db)); // D-049
        var antE = exigirAnterior(db, ev, actor.id, ast.id, d); if (antE) return antE;
        ast.integrantes.push({ persona: actor.id, estado: 'INCLUIDO', incluidoPor: actor.id, incluidoEn: A.ahora(db), rolEnAst: 'creador', informado: null, respuestas: {}, firma: null, participacion: nuevaParticipacion(db) });
        avisar(db, responsablesDe(db, ast.area, 'prevencion', ast.empresa).concat(responsablesDe(db, ast.area, 'encargado_area', ast.empresa)), 'AST_CREADA', actor.nombre + ' creó «' + ast.nombre + '» en ' + ar.nombre + ' (' + etiquetaEmpresa(db, ast) + ')', ast);
        informar(db, ast, 'Nueva AST «' + ast.nombre + '» en ' + ar.nombre + ' (' + etiquetaEmpresa(db, ast) + ')');
        return ok(db, ev, ast, previo, { ficha: fi.id, fichas: idsF, equipos: eqs.map(function (e) { return e.id + ':' + (e.unidad || '—'); }), respuestas: ast.respuestas, detectadas: det, nombre: ast.nombre, referencias: ast.referencias.map(function (r) { return r.id + ' v' + r.version; }) });
      }
      case 'C_UNIRSE': {
        if (!ast || !f || ['CERRADA', 'ANULADA', 'REVISION_DOCUMENTAL'].indexOf(ast.estado) >= 0) return rechazar(db, ev, 'No es posible unirse a esta AST');
        if (!d.confirmado) return rechazar(db, ev, 'Falta confirmar «¿seguro que te registras en esta AST?»');
        if (integrante(ast, actor.id)) return rechazar(db, ev, 'Ya estás en esta AST');
        if (vencida(db, ast)) return rechazar(db, ev, 'Esta AST venció: arma una nueva');
        var antU = exigirAnterior(db, ev, actor.id, ast.id, d); if (antU) return antU;
        ast.integrantes.push({ persona: actor.id, estado: 'INCLUIDO', incluidoPor: actor.id, incluidoEn: A.ahora(db), rolEnAst: 'integrante', informado: null, respuestas: {}, firma: null, participacion: nuevaParticipacion(db) });
        return ok(db, ev, ast, previo, { persona: actor.nombre, empresa: porId(db.empresas, actor.empresa).nombre });
      }
      case 'C_PAUSAR_PARTICIPACION': case 'C_FINALIZAR_PARTICIPACION': {
        var ip = ast && integrante(ast, actor.id);
        if (!ip) return rechazar(db, ev, 'No participas en esta AST');
        var pp = participacion(ip);
        if (pp.estado !== 'VIGENTE') return rechazar(db, ev, 'Tu participación ya está ' + pp.estado.toLowerCase());
        pp.estado = ev.tipo === 'C_PAUSAR_PARTICIPACION' ? 'PAUSADA' : 'FINALIZADA';
        pp.historial.push({ evento: ev.tipo === 'C_PAUSAR_PARTICIPACION' ? 'PAUSA' : 'FINALIZACION', en: A.ahora(db), motivo: d.motivo || null });
        return ok(db, ev, ast, previo, { persona: actor.nombre, participacion: pp.estado, nota: 'Solo afecta tu participación; la AST sigue para los demás' });
      }
      case 'C_REANUDAR_PARTICIPACION': {
        var ir = ast && integrante(ast, actor.id);
        if (!ir) return rechazar(db, ev, 'No participas en esta AST');
        var pr = participacion(ir);
        if (pr.estado !== 'PAUSADA') return rechazar(db, ev, pr.estado === 'FINALIZADA' ? 'Finalizaste esta participación: para volver, incorpórate de nuevo' : 'Tu participación no está pausada');
        if (['CERRADA', 'ANULADA'].indexOf(ast.estado) >= 0) return rechazar(db, ev, 'La AST ya no está vigente');
        if (ast.estado === 'DETENIDA') return rechazar(db, ev, 'La AST está detenida: espera la reanudación del responsable');
        if (!d.confirmado) return rechazar(db, ev, 'Confirma que vuelves a esta tarea y si cambiaron las condiciones');
        var antR = exigirAnterior(db, ev, actor.id, ast.id, d); if (antR) return antR;
        var pausa = pr.historial.filter(function (x) { return x.evento === 'PAUSA'; }).slice(-1)[0];
        // ¿Cambió algo desde la pausa? lo declara la persona; además cuentan detenciones y observaciones nuevas
        var cambios = !!d.condicionesCambiaron || ast.detenciones.some(function (x) { return pausa && x.en > pausa.en; }) || ast.observaciones.some(function (x) { return pausa && x.en > pausa.en; }) || (ast.etapas || []).some(function (x) { return x.n > 1 && pausa && x.desde > pausa.en; });
        pr.estado = 'VIGENTE'; pr.historial.push({ evento: 'REANUDACION', en: A.ahora(db), cambios: cambios });
        if (cambios) {
          // Si cambiaron las condiciones, vuelve a responder sus requisitos y firmar
          ir.estado = 'INFORMADO'; ir.firma = null; ir.verif = {};
          avisar(db, responsablesDe(db, ast.area, 'encargado_area', ast.empresa), 'INFORMACION', actor.nombre + ' reanudó su participación en «' + ast.nombre + '» con condiciones cambiadas: vuelve a responder y firmar.', ast);
        }
        return ok(db, ev, ast, previo, { persona: actor.nombre, cambios: cambios });
      }
      case 'C_INGRESAR_EQUIPO': {
        if (!ast || !f || ['CERRADA', 'ANULADA', 'REVISION_DOCUMENTAL'].indexOf(ast.estado) >= 0) return rechazar(db, ev, 'Elige una AST abierta y con procedimiento');
        if (!permite('registrar_trabajadores')) return rechazar(db, ev, 'Tu configuración no te permite registrar trabajadores en ' + porId(db.areas, ast.area).nombre);
        if (d.ruts !== undefined && !Array.isArray(d.ruts)) return rechazar(db, ev, 'Indica la lista de RUT o códigos a ingresar');
        var resultados = (d.ruts || []).map(function (rut) {
          var p = A.buscarPorIdentificador(db, rut);
          if (!p) return { rut: rut, ok: false, motivo: A.rutValido(rut) ? 'No está en la faena' : 'RUT inválido' };
          if (integrante(ast, p.id)) return { rut: rut, persona: p.id, ok: false, motivo: 'Ya está en la AST' };
          var bloqueoP = db.cumplimiento && API.puertaCumplimientoPersona ? API.puertaCumplimientoPersona(db, p) : null; // D-045
          if (bloqueoP) return { rut: rut, persona: p.id, ok: false, motivo: bloqueoP };
          ast.integrantes.push({ persona: p.id, estado: 'INCLUIDO', incluidoPor: actor.id, incluidoEn: A.ahora(db), rolEnAst: 'integrante', informado: null, respuestas: {}, firma: null, participacion: nuevaParticipacion(db) });
          // Lo verificable por sistema se revisa al tiro; lo demás lo responde cada uno después
          var faltSis = requisitosPersona(db, ast).filter(function (r) { return r.nivel === 'sistema' && !compVigente(db, p, r.competencia); });
          faltSis.forEach(function (r) { abrirFaltante(db, ast, p.id, r); });
          if (faltSis.length) integrante(ast, p.id).estado = 'PENDIENTE_REQUISITO';
          return { rut: rut, persona: p.id, ok: true, sistema: faltSis.length ? 'falta: ' + faltSis.map(function (r) { return r.nombre; }).join(', ') : 'cumple', pendiente: 'confirmar y firmar' };
        });
        return ok(db, ev, ast, previo, { incluidoPor: actor.nombre, resultados: resultados }, { resultados: resultados });
      }
      case 'C_INFORMADO': {
        var yo = ast && integrante(ast, actor.id);
        if (!yo) return rechazar(db, ev, 'Primero hay que estar incluido en la AST');
        if (participacion(yo).estado !== 'VIGENTE') return rechazar(db, ev, 'Tu participación en esta AST está ' + participacion(yo).estado.toLowerCase() + ': reanúdala primero');
        var antI = exigirAnterior(db, ev, actor.id, ast.id, d); if (antI) return antI;
        yo.informado = { en: A.ahora(db), medio: d.medio || 'lectura', dispositivoDe: ev.dispositivoDe || null };
        if (yo.estado === 'INCLUIDO') yo.estado = 'INFORMADO';
        return ok(db, ev, ast, previo, { persona: actor.nombre, medio: yo.informado.medio });
      }
      case 'C_DECLARAR': {
        // D-030 §4: cada requisito se responde Sí / No (y No aplica solo si el documento lo permite). Sin respuesta ≠ cumple.
        var mi = ast && integrante(ast, actor.id);
        if (!mi || !mi.informado) return rechazar(db, ev, 'Primero escucha o lee el resumen de la AST');
        if (mi.estado === 'FIRMADO') return rechazar(db, ev, 'Ya firmaste');
        // D-043 §4: primero los roles que asume (p. ej. «¿Operarás tú el manipulador?»): definen qué más le corresponde
        if (d.roles) {
          var validos = rolesDe(fichasDe(db, ast)).map(function (r) { return r.id; });
          if (d.roles.some(function (r) { return validos.indexOf(r) < 0; })) return rechazar(db, ev, 'Rol no válido para esta AST');
          mi.roles = d.roles.slice();
        }
        if (d.labores) {
          var deAst = fichasDe(db, ast).map(function (f) { return f.id; });
          if (!d.labores.length || d.labores.some(function (x) { return deAst.indexOf(x) < 0; })) return rechazar(db, ev, 'Indica al menos una labor de esta AST');
          mi.labores = d.labores.slice();
          var rolesLab = rolesDe(fichasDe(db, ast).filter(function (f) { return mi.labores.indexOf(f.id) >= 0; })).map(function (r) { return r.id; });
          mi.roles = (mi.roles || []).filter(function (r) { return rolesLab.indexOf(r) >= 0; });
        }
        var reqs = requisitosPersona(db, ast, actor.id), resp = d.respuestas || {};
        // D-043 §5: el avance se conserva; un bloque nuevo se suma a lo ya respondido
        if (d.parcial || mi.reDeclara) { var prev = {}; Object.keys(mi.respuestas || {}).forEach(function (k) { prev[k] = mi.respuestas[k].valor; }); resp = Object.assign(prev, resp); }
        var malNA = reqs.filter(function (r) { return resp[r.id] === 'NA' && !r.noAplica; });
        if (malNA.length) return rechazar(db, ev, '«No aplica» no está permitido para «' + malNA[0].nombre + '»: el documento no lo contempla');
        if (Object.keys(resp).some(function (k) { return ['SI', 'NO', 'NA'].indexOf(resp[k]) < 0; })) return rechazar(db, ev, 'Respuesta no válida');
        var antesResp = mi.respuestas || {}, antesVerif = mi.verif || {};
        mi.respuestas = {}; mi.verif = {};
        var nuevos = [], pendientes = [];
        reqs.forEach(function (r) {
          var valor = r.nivel === 'sistema' ? (compVigente(db, actor, r.competencia) ? 'SI' : 'NO') : resp[r.id];
          if (r.nivel !== 'sistema' && valor) mi.respuestas[r.id] = { valor: valor, en: A.ahora(db) };
          // Lo declarado nunca queda como verificado: los críticos quedan pendientes de verificación en terreno
          var est = r.nivel === 'sistema' ? (valor === 'SI' ? 'VERIFICADO_SISTEMA' : null) : valor === 'SI' ? (r.critico ? 'PENDIENTE_VERIFICACION' : 'DECLARADO') : valor === 'NA' ? 'NO_APLICA' : null;
          // D-048: tras ampliar la AST, lo ya verificado en terreno y no cambiado se conserva; solo lo nuevo queda pendiente
          var pv = antesVerif[r.id];
          if (mi.reDeclara && pv && ['VERIFICADO', 'CORREGIDO_VERIFICADO'].indexOf(pv.estado) >= 0 && antesResp[r.id] && antesResp[r.id].valor === valor) mi.verif[r.id] = pv;
          else if (est) mi.verif[r.id] = { estado: est, critico: !!r.critico, verifica: r.verifica || null, historial: [{ estado: est, en: A.ahora(db), por: actor.id }] };
          var abierto = ast.faltantes.filter(function (x) { return x.persona === actor.id && x.req === r.id && x.estado !== 'CONFIRMADO'; })[0];
          if (valor === 'NO' && !abierto) nuevos.push(abrirFaltante(db, ast, actor.id, r, true));
          if (!valor) pendientes.push(r);
        });
        var abiertos = faltantesAbiertos(ast, actor.id);
        mi.estado = abiertos.length ? 'PENDIENTE_REQUISITO' : pendientes.length ? 'RESPUESTAS_PENDIENTES' : 'LISTO_PARA_FIRMAR';
        mi.bloqueo = abiertos.length ? mensajeBloqueo(abiertos) : null;
        if (nuevos.length) avisarFaltantes(db, ast, actor, nuevos);
        return ok(db, ev, ast, previo, { persona: actor.nombre, respuestas: mi.respuestas, faltantes: abiertos.map(function (x) { return x.nombre; }), sinResponder: pendientes.map(function (x) { return x.nombre; }) },
          { faltantes: abiertos, pendientes: pendientes, bloqueo: mi.bloqueo });
      }
      case 'C_GESTIONAR': {
        var fa = ast && porId(ast.faltantes, d.faltante);
        if (!fa || fa.estado !== 'ABIERTO') return rechazar(db, ev, 'No hay un faltante abierto con ese número');
        if (!(permite('gestionar_pendientes') || esResponsable(db, ast, 'encargado_area', actor.id) || esResponsable(db, ast, 'responsable_subcontrato', actor.id))) return rechazar(db, ev, 'Tu configuración no te permite gestionar pendientes en esta área');
        if (!d.texto) return rechazar(db, ev, 'Escribe qué se hizo (p. ej. «se entregó pantalla facial de bodega»)');
        fa.estado = 'GESTIONADO'; fa.gestion = { por: actor.id, texto: d.texto, en: A.ahora(db) };
        return ok(db, ev, ast, previo, { faltante: fa.id, req: fa.nombre, persona: fa.persona ? A.nombre(db, fa.persona) : 'AST', texto: d.texto });
      }
      case 'C_CONFIRMAR': {
        var fc = ast && porId(ast.faltantes, d.faltante);
        if (!fc || fc.estado !== 'GESTIONADO') return rechazar(db, ev, 'Primero se registra la gestión; leer el aviso no resuelve nada (D-019)');
        // D-028: competencias → solo Prevención; EPP y condiciones → encargado del área o Prevención
        if (fc.nivel === 'sistema' && actor.rol !== 'prevencion') return rechazar(db, ev, 'Una competencia o capacitación solo la confirma Prevención');
        if (fc.nivel !== 'sistema' && !(esResponsable(db, ast, 'encargado_area', actor.id) || actor.rol === 'prevencion')) return rechazar(db, ev, 'Lo confirma en terreno el encargado del área o Prevención');
        fc.estado = 'CONFIRMADO'; fc.confirmacion = { por: actor.id, en: A.ahora(db), como: fc.nivel === 'sistema' ? 'registro en la ficha' : 'revisión en terreno' };
        if (fc.nivel === 'sistema' && fc.competencia) { var pw = porId(db.personas, fc.persona); pw.comp[fc.competencia] = { nombre: fc.nombre, vence: fecha(db, 365), verificadoPor: actor.id, verificadoEn: A.ahora(db).slice(0, 10) }; }
        if (fc.persona) {
          var it = integrante(ast, fc.persona);
          if (!faltantesAbiertos(ast, fc.persona).length && it.estado === 'PENDIENTE_REQUISITO') {
            // Se desbloquea, pero el trabajador vuelve a responder antes de firmar (D-019)
            it.estado = it.informado ? 'INFORMADO' : 'INCLUIDO'; it.bloqueo = null;
            fc.desbloqueadoEn = A.ahora(db);
            avisar(db, [fc.persona], 'FALTANTE_RESUELTO', 'Tu requisito «' + fc.nombre + '» de «' + ast.nombre + '» fue resuelto. Vuelve a responder tus requisitos y firma.', ast);
          }
        }
        return ok(db, ev, ast, previo, { faltante: fc.id, req: fc.nombre, persona: fc.persona ? A.nombre(db, fc.persona) : 'AST', gestiono: A.nombre(db, fc.gestion.por), confirmo: actor.nombre });
      }
      case 'C_FIRMAR': {
        var yo2 = ast && integrante(ast, actor.id);
        if (!yo2 || yo2.estado !== 'LISTO_PARA_FIRMAR') {
          var motivoF = !yo2 ? 'No estás en esta AST' : yo2.estado === 'PENDIENTE_REQUISITO' ? 'No puedes firmar: tienes requisitos que no cumples' : yo2.estado === 'RESPUESTAS_PENDIENTES' ? 'No puedes firmar: tienes requisitos sin responder' : 'Antes de firmar responde tus requisitos';
          return rechazar(db, ev, motivoF);
        }
        if (modoFirma(db, actor) === 'PIN' && !actor.pin) return rechazar(db, ev, 'Primero crea tu PIN personal');
        if (!ev.dispositivoDe && !credencialOk(db, actor, d.credencial || d.pin)) return rechazar(db, ev, (modoFirma(db, actor) === 'PIN' ? 'PIN' : 'RUT') + ' incorrecto');
        var mecanismo = textoMecanismo(db, actor, ev.dispositivoDe);
        yo2.confirmoTrabajo = !!d.confirmado;
        // P-024: el trazo de la firma (imagen) es opcional en el motor; la pantalla lo exige
        var trazo = typeof d.trazo === 'string' && /^data:image\/png;base64,/.test(d.trazo) && d.trazo.length < 300000 ? d.trazo : null;
        yo2.firma = { en: A.ahora(db), mecanismo: mecanismo + (trazo ? ' + firma en pantalla' : ''), dispositivoDe: ev.dispositivoDe || null, trazo: trazo, hash: A.sha256(JSON.stringify({ ast: ast.id, persona: actor.id, respuestas: yo2.respuestas, informado: yo2.informado, en: A.ahora(db), trazo: trazo ? A.sha256(trazo) : null })) };
        yo2.estado = 'FIRMADO'; delete yo2.reDeclara; delete yo2.etapaPendiente;
        avisar(db, responsablesDe(db, ast.area, 'prevencion', ast.empresa).concat(responsablesDe(db, ast.area, 'encargado_area', ast.empresa)), 'FIRMA', actor.nombre + ' firmó su incorporación a «' + ast.nombre + '» (' + mecanismo + ')', ast);
        var res = ok(db, ev, ast, previo, { persona: actor.nombre, mecanismo: mecanismo, hash: yo2.firma.hash });
        if (ast.estado === 'BORRADOR' && actor.id === ast.creadaPor) aplicar(db, { tipo: 'C_ENVIAR_REVISION', actor: actor.id, ast: ast.id, datos: { automatico: true } });
        return res;
      }
      case 'C_ENVIAR_REVISION': {
        if (!ast || !f || ast.estado !== 'BORRADOR') return rechazar(db, ev, 'Solo se envía a revisión una AST en borrador con procedimiento');
        if (ast.creadaPor !== actor.id && !permite('gestionar_pendientes')) return rechazar(db, ev, 'La envía quien la creó o un responsable del área');
        var creador = integrante(ast, ast.creadaPor);
        if (!creador || creador.estado !== 'FIRMADO') return rechazar(db, ev, 'Quien creó la AST debe responder todos sus requisitos y firmar antes de enviarla');
        // D-033: primero el encargado del área, en persona; después lo que pidan el procedimiento y la empresa
        var lista = (esSubcontrato(db, ast) ? [{ calidad: 'responsable_subcontrato', area: ast.area, orden: 0, modo: 'documental' }] : [])
          .concat([{ calidad: 'encargado_area', area: ast.area, orden: 1, modo: 'presencial', chequeo: chequeoEncargado(db, ast) }]);
        var extras = f.aprobaciones.map(normAprob).filter(function (x) { return x.calidad !== 'encargado_area'; });
        Object.keys(f.aprobacionesSi || {}).forEach(function (k) { if (ast.respuestas[k] === true) f.aprobacionesSi[k].map(normAprob).forEach(function (x) { extras.push(x); }); });
        if (db.config.prevencionSiempre && !extras.some(function (x) { return x.calidad === 'prevencion'; })) extras.push({ calidad: 'prevencion', modo: 'documental', porRegla: true });
        if (db.config.mandanteAutorizaSubcontratos && esSubcontrato(db, ast) && !extras.some(function (x) { return x.calidad === 'mandante'; })) extras.push({ calidad: 'mandante', modo: 'documental', porRegla: true });
        extras.forEach(function (x) { lista.push({ calidad: x.calidad, area: ast.area, orden: 2, modo: x.modo || 'documental', porRegla: !!x.porRegla }); });
        // D-031 §7: cada área involucrada suma los responsables que fija la configuración de la empresa
        (ast.involucradas || []).forEach(function (a) { db.config.multiArea.forEach(function (c) { lista.push({ calidad: c, area: a, orden: 2, modo: 'documental' }); }); });
        ast.aprobaciones = lista.map(function (x) {
          var per = responsablesDe(db, x.area, x.calidad, ast.empresa);
          return Object.assign(x, { personas: per, estado: per.length ? 'PENDIENTE' : 'CONFIGURACION_PENDIENTE', firma: null, avisado: false });
        });
        ast.estado = 'REGISTRADA'; ast.enviadaEn = A.ahora(db);
        avisarAprobadores(db, ast);
        var sinResp = ast.aprobaciones.filter(function (a) { return a.estado === 'CONFIGURACION_PENDIENTE'; });
        if (sinResp.length) avisar(db, responsablesDe(db, ast.area, 'prevencion', ast.empresa).concat(['p-admin']), 'CONFIG_PENDIENTE', 'Configuración pendiente: no hay ' + sinResp.map(function (a) { return etiquetaAprob(db, ast, a); }).join(', ') + ' asignado en ' + porId(db.areas, ast.area).nombre + '. «' + ast.nombre + '» no puede aprobarse.', ast);
        return ok(db, ev, ast, previo, { aprobaciones: ast.aprobaciones.map(function (a) { return a.calidad + '@' + a.area + ':' + (a.personas.join('|') || 'SIN_ASIGNAR'); }) });
      }
      case 'C_APROBAR': case 'C_OBSERVAR': {
        var ap = ast && ast.aprobaciones.filter(function (a) { return a.calidad === d.calidad && a.area === (d.area || ast.area); })[0];
        if (!ap) return rechazar(db, ev, 'Esa aprobación no corresponde a esta AST');
        var quienes = responsablesDe(db, ap.area, ap.calidad, ast.empresa);
        if (quienes.indexOf(actor.id) < 0) return rechazar(db, ev, 'Esta aprobación la da ' + (quienes.length ? quienes.map(function (x) { return A.nombre(db, x); }).join(' o ') : 'una persona aún no asignada') + ' (' + etiquetaAprob(db, ast, ap) + ')');
        if (!permite(ev.tipo === 'C_APROBAR' ? 'aprobar' : 'observar', ap.area)) return rechazar(db, ev, 'Tu configuración no te permite ' + (ev.tipo === 'C_APROBAR' ? 'aprobar' : 'observar') + ' en ' + porId(db.areas, ap.area).nombre);
        if (['REGISTRADA', 'EN_REVISION'].indexOf(ast.estado) < 0) return rechazar(db, ev, 'La AST no está en revisión' + (ast.estado === 'OBSERVADA' ? ': tiene observaciones abiertas' : ''));
        if (ast.aprobaciones.some(function (a) { return a.orden < ap.orden && a.estado !== 'APROBADA'; })) return rechazar(db, ev, ap.orden === 1 ? 'Primero aprueba el responsable del subcontrato (D-021 §5)' : 'Primero verifica en terreno el encargado del área (D-033)');
        if (ev.tipo === 'C_APROBAR' && ap.calidad === 'encargado_area' && ap.modo === 'presencial') return rechazar(db, ev, 'La verificación del encargado es presencial y se hace con su chequeo en terreno');
        if (ev.tipo === 'C_APROBAR' && ap.modo === 'presencial' && !d.presencial) return rechazar(db, ev, 'Esta aprobación exige presencia en terreno: una firma remota no la reemplaza');
        if (ev.tipo === 'C_OBSERVAR') {
          if (!d.texto) return rechazar(db, ev, 'La observación necesita un texto');
          var obs = { id: 'OB-' + (ast.observaciones.length + 1), por: actor.id, calidad: ap.calidad, area: ap.area, texto: d.texto, estado: 'ABIERTA', en: A.ahora(db), respuestas: [] };
          ast.observaciones.push(obs); ap.estado = 'OBSERVADA'; ast.estado = 'OBSERVADA';
          avisar(db, [ast.creadaPor].concat(responsablesDe(db, ast.area, 'encargado_area', ast.empresa)), 'OBSERVACION', etiquetaAprob(db, ast, ap) + ' (' + actor.nombre + ') observó «' + ast.nombre + '»: ' + d.texto, ast, { obs: obs.id });
          return ok(db, ev, ast, previo, { calidad: ap.calidad, area: ap.area, observacion: obs.id, texto: d.texto });
        }
        ast.observaciones.forEach(function (o) { if (o.por === actor.id && o.estado === 'RESPONDIDA') o.estado = 'CERRADA'; });
        ap.estado = 'APROBADA'; ap.firma = { por: actor.id, empresa: actor.empresa, en: A.ahora(db), modo: ap.modo, hash: A.sha256(ast.id + ap.calidad + ap.area + actor.id + A.ahora(db)) };
        avanzar(db, ast);
        return ok(db, ev, ast, previo, { calidad: ap.calidad, area: ap.area, empresa: porId(db.empresas, actor.empresa).nombre });
      }
      case 'C_RESPONDER_OBS': {
        var ob = ast && porId(ast.observaciones, d.obs);
        if (!ob || ob.estado !== 'ABIERTA') return rechazar(db, ev, 'No hay observación abierta con ese número');
        if (actor.id !== ast.creadaPor && !esResponsable(db, ast, 'encargado_area', actor.id)) return rechazar(db, ev, 'Responde quien creó la AST o el encargado del área');
        if (!d.texto) return rechazar(db, ev, 'Escribe la corrección hecha');
        ob.respuestas.push({ por: actor.id, texto: d.texto, en: A.ahora(db) }); ob.estado = 'RESPONDIDA';
        var apo = ast.aprobaciones.filter(function (a) { return a.calidad === ob.calidad && a.area === (ob.area || ast.area); })[0]; apo.estado = 'PENDIENTE';
        if (!ast.observaciones.some(function (o) { return o.estado === 'ABIERTA'; })) {
          var encOk = ast.aprobaciones.some(function (a) { return a.calidad === 'encargado_area' && a.area === ast.area && a.estado === 'APROBADA'; });
          ast.estado = encOk ? 'EN_REVISION' : 'REGISTRADA';
        }
        avisar(db, [ob.por], 'OBS_RESPONDIDA', 'Respondieron tu observación en «' + ast.nombre + '»: ' + d.texto + '. Requiere tu nueva revisión.', ast, { obs: ob.id });
        return ok(db, ev, ast, previo, { obs: ob.id, texto: d.texto });
      }
      case 'C_SOLICITAR_PERMISO': case 'C_REVISAR_PERMISO': case 'C_AUTORIZAR_PERMISO': case 'C_RECHAZAR_PERMISO': {
        var pe = ast && porId(ast.permisos, d.permiso);
        if (!pe) return rechazar(db, ev, 'Permiso desconocido');
        var revisores = responsablesDe(db, ast.area, pe.revisaCalidad, ast.empresa), autorizadores = responsablesDe(db, ast.area, pe.autorizaCalidad, ast.empresa);
        if (ev.tipo === 'C_SOLICITAR_PERMISO') {
          if (pe.estado !== 'REQUERIDO' && pe.estado !== 'RECHAZADO') return rechazar(db, ev, 'El permiso ya fue solicitado');
          if (actor.id !== ast.creadaPor && !permite('gestionar_pendientes')) return rechazar(db, ev, 'Lo solicita quien creó la AST o un responsable del área');
          pe.estado = 'SOLICITADO'; avisar(db, revisores, 'PERMISO', 'Permiso por revisar: ' + pe.nombre + ' para «' + ast.nombre + '»', ast);
        } else if (ev.tipo === 'C_REVISAR_PERMISO') {
          if (pe.estado !== 'SOLICITADO') return rechazar(db, ev, 'El permiso no está solicitado');
          if (revisores.indexOf(actor.id) < 0) return rechazar(db, ev, 'Lo revisa ' + (revisores.map(function (x) { return A.nombre(db, x); }).join(' o ') || 'el responsable asignado') + ' según ' + pe.cita);
          var oks = d.condiciones || [];
          pe.condiciones.forEach(function (c, i) { c.ok = oks.indexOf(i) >= 0; });
          if (!pe.condiciones.every(function (c) { return c.ok; })) return rechazar(db, ev, 'Faltan condiciones del permiso por verificar');
          pe.estado = 'EN_REVISION'; pe.revisadoPor = actor.id; avisar(db, autorizadores, 'PERMISO', 'Permiso por autorizar: ' + pe.nombre + ' para «' + ast.nombre + '» (condiciones verificadas por ' + actor.nombre + ')', ast);
        } else {
          if (pe.estado !== 'EN_REVISION') return rechazar(db, ev, 'El permiso aún no tiene sus condiciones revisadas');
          if (autorizadores.indexOf(actor.id) < 0) return rechazar(db, ev, 'Lo autoriza ' + (autorizadores.map(function (x) { return A.nombre(db, x); }).join(' o ') || 'el responsable asignado') + ' según ' + pe.cita);
          if (actor.id === ast.creadaPor) return rechazar(db, ev, 'Quien creó la AST no autoriza su propio permiso (V12)');
          pe.estado = ev.tipo === 'C_AUTORIZAR_PERMISO' ? 'AUTORIZADO' : 'RECHAZADO'; pe.autorizadoPor = actor.id;
          avisar(db, [ast.creadaPor].concat(responsablesDe(db, ast.area, 'encargado_area', ast.empresa), ast.integrantes.map(function (i) { return i.persona; })), 'PERMISO', pe.nombre + ' de «' + ast.nombre + '»: ' + pe.estado.toLowerCase() + (d.motivo ? ' (' + d.motivo + ')' : ''), ast);
        }
        pe.historial.push({ evento: ev.tipo, por: actor.id, en: A.ahora(db) });
        return ok(db, ev, ast, previo, { permiso: pe.nombre, estado: pe.estado });
      }
      case 'C_INICIAR_TRABAJO': {
        // D-043 §7: «Iniciar trabajo» solo cuando están completas las verificaciones, autorizaciones y permisos
        var iq = ast && integrante(ast, actor.id);
        if (!iq) return rechazar(db, ev, 'No participas en esta AST');
        var ini = inicio(db, ast, actor.id);
        if (!ini.ok) { var rj = rechazar(db, ev, 'Aún no puedes iniciar: falta ' + ini.falta.join('; ')); rj.falta = ini.falta; return rj; }
        // D-049: en una AST de varias jornadas el inicio de ayer no vale hoy: cada día se inicia de nuevo (el anterior queda en el historial)
        if (iq.inicioTrabajo && !(variasJornadas(ast) && diaChile(iq.inicioTrabajo.en) !== diaChile(A.ahora(db)))) return rechazar(db, ev, 'Ya registraste el inicio');
        if (iq.inicioTrabajo) (iq.iniciosAnteriores = iq.iniciosAnteriores || []).push(iq.inicioTrabajo);
        iq.inicioTrabajo = { en: A.ahora(db) };
        return ok(db, ev, ast, previo, { persona: actor.nombre });
      }
      case 'C_INSPECCION_EQUIPO': {
        // D-043 §4: inspección nueva cuando no hay registro vigente; queda vinculada a la unidad y a la AST
        var eqA = ast && (ast.equipos || []).filter(function (e) { return e.unidad === d.unidad; })[0];
        if (!eqA) return rechazar(db, ev, 'Ese equipo no es parte de esta AST');
        var un = (db.equiposObra || []).filter(function (u) { return u.id === d.unidad; })[0];
        var fEq = equiposDe(fichasDe(db, ast)).filter(function (e) { return e.id === eqA.id; })[0];
        var yoI = integrante(ast, actor.id), rolEq = rolesDe(fichasDe(db, ast)).filter(function (r) { return r.equipo === eqA.id; }).map(function (r) { return r.id; });
        if (!(yoI && (yoI.roles || []).some(function (r) { return rolEq.indexOf(r) >= 0; })) && !esResponsable(db, ast, 'encargado_area', actor.id) && actor.rol !== 'prevencion') return rechazar(db, ev, 'La inspección la hace quien opera el equipo, el encargado del área o Prevención');
        var items = (fEq.inspeccion || []).map(function (t, k) { return { texto: t, ok: (d.items || []).indexOf(k) >= 0 }; });
        if (!items.length) return rechazar(db, ev, 'El procedimiento no define la lista de inspección');
        db.inspecciones = db.inspecciones || [];
        var insp = { id: 'IN-' + String(db.inspecciones.length + 1).padStart(4, '0'), unidad: un.id, ast: ast.id, por: actor.id, en: A.ahora(db), items: items, observacion: d.observacion || null,
          resultado: items.every(function (x) { return x.ok; }) ? 'CONFORME' : 'NO_CONFORME', cita: fEq.cita || null };
        db.inspecciones.push(insp); un.inspecciones = un.inspecciones || []; un.inspecciones.push(insp); ast.inspecciones = ast.inspecciones || []; ast.inspecciones.push(insp.id);
        if (insp.resultado === 'NO_CONFORME') avisar(db, responsablesDe(db, ast.area, 'encargado_area', ast.empresa).concat(responsablesDe(db, ast.area, 'prevencion', ast.empresa)), 'EQUIPO', un.nombre + ': la inspección pre-uso encontró fallas (' + items.filter(function (x) { return !x.ok; }).map(function (x) { return x.texto; }).join(', ') + '). No se usa hasta repararlo.', ast);
        return ok(db, ev, ast, previo, { inspeccion: insp.id, unidad: un.id, resultado: insp.resultado });
      }
      case 'C_REGISTRAR_CAMBIO': {
        // Método, equipo, área o un peligro nuevo: todos vuelven a responder y firmar, y se revisa de nuevo.
        // Una persona nueva no es un cambio de la AST: solo hace su propia incorporación.
        var TIPOS_CAMBIO = { metodo: 'cambio de método', equipo: 'cambio de equipo o herramienta', area: 'cambio de lugar', peligro: 'peligro nuevo' };
        if (!ast || ['CERRADA', 'ANULADA', 'BORRADOR', 'REVISION_DOCUMENTAL'].indexOf(ast.estado) >= 0) return rechazar(db, ev, 'La AST no está en curso');
        if (!TIPOS_CAMBIO[d.tipo]) return rechazar(db, ev, 'Tipo de cambio no válido (método, equipo, lugar o peligro nuevo)');
        if (!d.texto) return rechazar(db, ev, 'Describe el cambio');
        if (!integrante(ast, actor.id) && !esResponsable(db, ast, 'encargado_area', actor.id) && actor.rol !== 'prevencion') return rechazar(db, ev, 'Registra el cambio alguien de la AST o un responsable');
        ast.cambios.push({ tipo: d.tipo, texto: d.texto, por: actor.id, en: A.ahora(db) });
        ast.integrantes.forEach(function (i) { if (i.estado === 'FIRMADO' || i.estado === 'LISTO_PARA_FIRMAR') { i.estado = 'INFORMADO'; i.firma = null; i.verif = {}; } anularInicio(db, i, 'cambio registrado en la AST'); });
        resolverEvaluacion(db, ast, 'cambio', actor.id);
        ast.aprobaciones.forEach(function (a) { a.estado = a.personas && a.personas.length ? 'PENDIENTE' : 'CONFIGURACION_PENDIENTE'; a.firma = null; if (a.chequeo) a.chequeo = chequeoEncargado(db, ast); });
        ast.estado = ast.aprobaciones.length ? 'REGISTRADA' : 'BORRADOR';
        avisar(db, responsablesDe(db, ast.area, 'encargado_area', ast.empresa).concat(responsablesDe(db, ast.area, 'prevencion', ast.empresa), ast.integrantes.map(function (i) { return i.persona; })), 'CAMBIO_AST', TIPOS_CAMBIO[d.tipo] + ' en «' + ast.nombre + '»: ' + d.texto + '. Todos vuelven a responder y firmar; el encargado verifica de nuevo.', ast);
        return ok(db, ev, ast, previo, { tipo: d.tipo, texto: d.texto });
      }
      case 'C_AMPLIAR': {
        // D-048: se agrega una etapa a la MISMA AST vigente. La etapa 1 queda como se firmó; lo nuevo se informa, declara, firma y verifica aparte.
        if (!ast || !ast.ficha) return rechazar(db, ev, 'Esa AST no tiene una tarea armada: no se puede ampliar');
        if (ast.estado === 'DETENIDA') return rechazar(db, ev, 'La AST está detenida: se reanuda antes de ampliarla');
        if (ast.estado === 'OBSERVADA') return rechazar(db, ev, 'La AST tiene observaciones abiertas: se responden antes de ampliarla');
        if (['BORRADOR', 'REVISION_DOCUMENTAL'].indexOf(ast.estado) >= 0) return rechazar(db, ev, 'La AST aún no está vigente: termina de armarla (o resuelve su revisión documental) antes de ampliarla');
        if (ast.ampliacionPendiente) return rechazar(db, ev, 'Ya hay una ampliación esperando revisión documental: primero se resuelve');
        if (!(ast.creadaPor === actor.id || permite('registrar_trabajadores') || permite('gestionar_pendientes') || esResponsable(db, ast, 'encargado_area', actor.id) || actor.rol === 'prevencion')) return rechazar(db, ev, 'Amplía la AST quien la creó, el capataz o un responsable del área');
        if (!d.motivo || String(d.motivo).trim().length < 5) return rechazar(db, ev, 'Indica por qué se amplía la AST');
        var yaIds = ast.fichas && ast.fichas.length ? ast.fichas.slice() : [ast.ficha];
        var textoA = String(d.descripcion || ''), idsN = [], brA = null;
        if ((d.fichas && d.fichas.length) || d.ficha) idsN = d.fichas && d.fichas.length ? d.fichas.slice() : [d.ficha];
        else {
          if (textoA.trim().length < 8) return rechazar(db, ev, 'Describe el trabajo que se agrega');
          var idn = identificar(db, textoA, ast.area);
          idsN = idn.fichas.concat(idn.pendientes.map(function (p) { return p.ficha; }));
          if (idn.pendientes.length) brA = { tipo: 'AMPLIACION_PENDIENTE', detalle: idn.pendientes.map(function (p) { return p.nombre + ': ' + p.motivo; }).join('; ') };
          else if (!idn.fichas.length) brA = { tipo: 'SIN_TAREA', detalle: brechaDe(db, null).detalle };
        }
        var nuevosIds = idsN.filter(function (x, k) { return yaIds.indexOf(x) < 0 && idsN.indexOf(x) === k; });
        if (!brA && !nuevosIds.length) return rechazar(db, ev, 'Esa tarea ya está en la AST');
        var fisN = nuevosIds.map(function (x) { return ficha(db, x); }), anA = null;
        if (!brA) {
          anA = analizarFichas(db, ast, d, fisN, textoA);
          if (anA.rechazo) return rechazar(db, ev, anA.rechazo);
          if (anA.brecha) brA = anA.brecha;
        }
        if (brA) {
          // Sin procedimiento vigente: la ampliación espera revisión documental y NO toca la etapa 1
          ast.ampliacionPendiente = { descripcion: textoA, motivo: String(d.motivo).trim(), fichas: nuevosIds, brecha: brA, por: actor.id, en: A.ahora(db) };
          avisar(db, responsablesDe(db, ast.area, 'prevencion', ast.empresa), 'BRECHA', 'Revisión documental de una ampliación de «' + ast.nombre + '»: «' + (textoA || nuevosIds.join(', ')) + '». ' + brA.detalle + ' La etapa en curso sigue como estaba.', ast);
          return ok(db, ev, ast, previo, { ampliacionPendiente: true, brecha: brA, motivo: ast.ampliacionPendiente.motivo }, { brecha: brA });
        }
        var antesIds = requisitosPersona(db, ast).map(function (r) { return r.id; });
        if (!ast.etapas || !ast.etapas.length) ast.etapas = [{ n: 1, fichas: yaIds.slice(), desde: ast.enviadaEn || ast.creadaEn, por: ast.creadaPor, motivo: null }];
        var nEt = ast.etapas.length + 1;
        ast.fichas = yaIds.concat(nuevosIds);
        // Se copian (no se mutan): los objetos de la etapa 1 ya están referenciados por la bitácora con hash
        var respN = Object.assign({}, ast.respuestas);
        Object.keys(anA.resp).forEach(function (k) { if (respN[k] !== true) respN[k] = anA.resp[k] === true ? true : (respN[k] === undefined ? anA.resp[k] : respN[k]); });
        ast.respuestas = respN; ast.respuestasDetectadas = Object.assign({}, ast.respuestasDetectadas, anA.det);
        anA.eqs.forEach(function (e) { if (!(ast.equipos || []).some(function (x) { return x.id === e.id; })) (ast.equipos = ast.equipos || []).push(e); });
        referenciasDe(db, fisN).forEach(function (r) { if (!ast.referencias.some(function (x) { return x.id === r.id; })) ast.referencias.push(r); });
        var permNuevos = permisosDe(fisN).filter(function (p) { return !ast.permisos.some(function (x) { return x.id === p.id; }); }).map(function (p) { return Object.assign(p, { etapa: nEt }); });
        permNuevos.forEach(function (p) { ast.permisos.push(p); });
        var reqNuevos = requisitosPersona(db, ast).filter(function (r) { return antesIds.indexOf(r.id) < 0; }).map(function (r) { return r.id; });
        // Aprobaciones: todas vuelven a pasar por la AST ampliada (la firma anterior queda en su historial); se suman las que pidan las fichas nuevas
        var extrasN = [];
        fisN.forEach(function (x) {
          (x.aprobaciones || []).map(normAprob).forEach(function (a) { extrasN.push(a); });
          Object.keys(x.aprobacionesSi || {}).forEach(function (k) { if (ast.respuestas[k] === true) x.aprobacionesSi[k].map(normAprob).forEach(function (a) { extrasN.push(a); }); });
        });
        ast.aprobaciones.forEach(function (a) {
          if (a.firma) (a.firmasPrevias = a.firmasPrevias || []).push({ etapa: nEt - 1, firma: a.firma });
          a.personas = responsablesDe(db, a.area, a.calidad, ast.empresa);
          a.estado = a.personas.length ? 'PENDIENTE' : 'CONFIGURACION_PENDIENTE'; a.firma = null; a.avisado = false;
          if (a.calidad === 'encargado_area' && a.modo === 'presencial') a.chequeo = chequeoEncargado(db, ast, reqNuevos);
        });
        extrasN.forEach(function (x) {
          if (ast.aprobaciones.some(function (a) { return a.calidad === x.calidad && a.area === ast.area; })) return;
          var per = responsablesDe(db, ast.area, x.calidad, ast.empresa);
          ast.aprobaciones.push({ calidad: x.calidad, area: ast.area, orden: 2, modo: x.modo || 'documental', porRegla: false, personas: per, estado: per.length ? 'PENDIENTE' : 'CONFIGURACION_PENDIENTE', firma: null, avisado: false, etapa: nEt });
        });
        // Cada integrante informa, declara y firma lo nuevo; no responde lo nuevo si no participa en esa labor (declara sus labores)
        ast.integrantes.forEach(function (i) {
          if (!i.labores || !i.labores.length) i.labores = yaIds.slice();
          if (participacion(i).estado !== 'VIGENTE') return;
          if (i.firma) (i.firmasPrevias = i.firmasPrevias || []).push({ etapa: nEt - 1, firma: i.firma });
          anularInicio(db, i, 'AST ampliada con la etapa ' + nEt);
          if (['FIRMADO', 'LISTO_PARA_FIRMAR', 'INFORMADO', 'RESPUESTAS_PENDIENTES', 'INCLUIDO'].indexOf(i.estado) >= 0) i.estado = 'INCLUIDO';
          i.informado = null; i.firma = null; i.reDeclara = true; i.etapaPendiente = nEt;
        });
        ast.etapas.push({ n: nEt, fichas: nuevosIds.slice(), desde: A.ahora(db), por: actor.id, motivo: String(d.motivo).trim(), descripcion: textoA || null, permisos: permNuevos.map(function (p) { return p.id; }) });
        ast.estado = 'REGISTRADA';
        resolverEvaluacion(db, ast, 'etapa', actor.id);
        avisar(db, responsablesDe(db, ast.area, 'encargado_area', ast.empresa).concat(responsablesDe(db, ast.area, 'prevencion', ast.empresa), ast.integrantes.map(function (i) { return i.persona; })), 'CAMBIO_AST', 'Se agregó la etapa ' + nEt + ' a «' + ast.nombre + '»: ' + fisN.map(function (x) { return x.nombre; }).join(' + ') + ' (' + String(d.motivo).trim() + '). Cada uno revisa y firma lo nuevo; el encargado verifica de nuevo en terreno lo crítico nuevo. El plazo no cambia.', ast);
        informar(db, ast, 'Etapa ' + nEt + ' agregada a «' + ast.nombre + '»: ' + fisN.map(function (x) { return x.nombre; }).join(' + '));
        avisarAprobadores(db, ast);
        return ok(db, ev, ast, previo, { etapa: nEt, fichas: nuevosIds, motivo: String(d.motivo).trim(), permisosNuevos: permNuevos.map(function (p) { return p.id; }), requisitosNuevos: reqNuevos.length, aprobaciones: ast.aprobaciones.map(function (a) { return a.calidad + '@' + a.area + ':' + a.estado; }) }, { etapa: nEt, requisitosNuevos: reqNuevos });
      }
      case 'C_EVALUACION_DIARIA': {
        // D-049: evaluación rápida del día (la hace el primero que entra o el encargado)
        if (!ast || !variasJornadas(ast)) return rechazar(db, ev, 'La evaluación diaria es de las AST de varias jornadas');
        if (['BORRADOR', 'REVISION_DOCUMENTAL'].indexOf(ast.estado) >= 0) return rechazar(db, ev, 'La AST aún no está vigente');
        if (!(integrante(ast, actor.id) || esResponsable(db, ast, 'encargado_area', actor.id) || actor.rol === 'prevencion')) return rechazar(db, ev, 'La evaluación del día la hace quien participa en la AST o el encargado del área');
        var diaE = diaChile(A.ahora(db));
        if (diaE === ast.diaInicio) return rechazar(db, ev, 'Hoy se armó la AST: la evaluación rápida corre desde la segunda jornada');
        var rd = (ast.registrosDiarios = ast.registrosDiarios || {}); rd[diaE] = rd[diaE] || { evaluacion: null, registros: {} };
        var esEnc = esResponsable(db, ast, 'encargado_area', actor.id) || actor.rol === 'prevencion';
        if (rd[diaE].evaluacion && !esEnc) return rechazar(db, ev, 'Hoy ya se hizo la evaluación: solo el encargado del área la corrige');
        if (typeof d.cambioArea !== 'boolean' || typeof d.cambioTarea !== 'boolean' || typeof d.condicionesIguales !== 'boolean') return rechazar(db, ev, 'Responde las tres preguntas: ¿cambió el área?, ¿cambió la tarea?, ¿las condiciones siguen iguales?');
        var hayCambio = d.cambioArea || d.cambioTarea || !d.condicionesIguales;
        if (hayCambio && (!d.diferencia || String(d.diferencia).trim().length < 5)) return rechazar(db, ev, '¿Qué cambia? Describe la diferencia con la AST original');
        var evl = { por: actor.id, en: A.ahora(db), cambioArea: d.cambioArea, cambioTarea: d.cambioTarea, condicionesIguales: d.condicionesIguales, diferencia: hayCambio ? String(d.diferencia).trim() : null, requiereAccion: hayCambio, resuelta: null };
        if (rd[diaE].evaluacion) { evl.historial = (rd[diaE].evaluacion.historial || []).concat([Object.assign({}, rd[diaE].evaluacion, { historial: undefined })]); rd[diaE].registros = {}; }
        rd[diaE].evaluacion = evl;
        if (hayCambio) avisar(db, responsablesDe(db, ast.area, 'encargado_area', ast.empresa).concat(responsablesDe(db, ast.area, 'prevencion', ast.empresa)), 'CAMBIO_AST', actor.nombre + ' declara cambios hoy en «' + ast.nombre + '»: ' + evl.diferencia + '. Hay que agregarlos como etapa o cambio antes de que la gente se registre.', ast);
        return ok(db, ev, ast, previo, { dia: diaE, hayCambio: hayCambio, cambioArea: d.cambioArea, cambioTarea: d.cambioTarea, condicionesIguales: d.condicionesIguales, diferencia: evl.diferencia });
      }
      case 'C_REGISTRO_DIARIO': {
        // D-049: cada día cada persona confirma y firma su presencia en la AST; el registro de ayer no habilita hoy
        var ir2 = ast && integrante(ast, actor.id);
        if (!ast || !variasJornadas(ast)) return rechazar(db, ev, 'El registro diario es de las AST de varias jornadas');
        if (!ir2) return rechazar(db, ev, 'No participas en esta AST');
        if (participacion(ir2).estado !== 'VIGENTE') return rechazar(db, ev, 'Tu participación en esta AST está ' + participacion(ir2).estado.toLowerCase() + ': reanúdala primero');
        var diaR = diaChile(A.ahora(db)), rr = (ast.registrosDiarios || {})[diaR];
        if (diaR === ast.diaInicio) return rechazar(db, ev, 'Hoy se armó la AST: tu firma de incorporación ya es tu registro de hoy');
        if (!rr || !rr.evaluacion) return rechazar(db, ev, 'Antes de registrarte falta la evaluación rápida del día (¿cambió el área, la tarea o las condiciones?)');
        if (rr.evaluacion.requiereAccion && !rr.evaluacion.resuelta) return rechazar(db, ev, 'Hoy se declararon cambios: se agregan como etapa o cambio antes de registrarse');
        if (rr.registros[actor.id]) return rechazar(db, ev, 'Ya te registraste hoy');
        if (!d.confirmado) return rechazar(db, ev, 'Confirma que las condiciones de hoy son las que dice la evaluación');
        if (!ev.dispositivoDe && !credencialOk(db, actor, d.credencial || d.pin)) return rechazar(db, ev, (modoFirma(db, actor) === 'PIN' ? 'PIN' : 'RUT') + ' incorrecto');
        rr.registros[actor.id] = { en: A.ahora(db), mecanismo: textoMecanismo(db, actor, ev.dispositivoDe), dispositivoDe: ev.dispositivoDe || null, hash: A.sha256(JSON.stringify({ ast: ast.id, persona: actor.id, dia: diaR, en: A.ahora(db) })) };
        return ok(db, ev, ast, previo, { persona: actor.nombre, dia: diaR, mecanismo: rr.registros[actor.id].mecanismo });
      }
      case 'C_DESBLOQUEAR_PIN': {
        var pb = porId(db.personas, d.persona);
        if (actor.rol !== 'prevencion') return rechazar(db, ev, 'Desbloquea Prevención, verificando la identidad en persona');
        if (!pb || !pb.pinBloqueado) return rechazar(db, ev, 'Ese PIN no está bloqueado');
        if (!d.identidadVerificada) return rechazar(db, ev, 'Confirma que verificaste la identidad en persona');
        pb.pinBloqueado = false; pb.intentosFallidos = 0;
        return ok(db, ev, null, null, { persona: pb.nombre });
      }
      case 'C_DETENER': {
        if (!ast) return rechazar(db, ev, 'AST desconocida');
        if (['CERRADA', 'ANULADA'].indexOf(ast.estado) >= 0) return ok(db, ev, null, null, { condicionDeArea: true, ast: ast.id, motivo: d.motivo || null });
        ast.detenciones.push({ por: actor.id, en: A.ahora(db), motivo: d.motivo || null, estadoPrevio: ast.estado });
        if (ast.estado !== 'DETENIDA') { ast.estadoAntesDetencion = ast.estado; ast.estado = 'DETENIDA'; }
        avisar(db, responsablesDe(db, ast.area, 'encargado_area', ast.empresa).concat(responsablesDe(db, ast.area, 'prevencion', ast.empresa)), 'DETENCION', actor.nombre + ' detuvo «' + ast.nombre + '»' + (d.motivo ? ': ' + d.motivo : ''), ast);
        informar(db, ast, 'Detención en «' + ast.nombre + '» (' + porId(db.areas, ast.area).nombre + ')');
        return ok(db, ev, ast, previo, { motivo: d.motivo || null });
      }
      case 'C_REANUDAR': {
        if (!ast || ast.estado !== 'DETENIDA') return rechazar(db, ev, 'La AST no está detenida');
        if (!(esResponsable(db, ast, 'encargado_area', actor.id) || actor.rol === 'prevencion')) return rechazar(db, ev, 'Reanuda el encargado del área o Prevención');
        if (!d.causa || !d.control) return rechazar(db, ev, 'Reanudar exige causa y control adoptado');
        var maqMal = (ast.equipos || []).map(function (e) { return e.unidad && (db.equiposObra || []).filter(function (x) { return x.id === e.unidad; })[0]; }).filter(function (x) { return x && (x.semaforo === 'ROJO' || x.semaforo === 'NARANJA'); })[0];
        if (maqMal) return rechazar(db, ev, maqMal.nombre + ' sigue ' + (maqMal.semaforo === 'ROJO' ? 'fuera de servicio' : 'con intervención prioritaria') + ' en Checkmaq: primero se repara y se valida su retorno');
        ast.estado = ast.estadoAntesDetencion || 'EN_REVISION';
        return ok(db, ev, ast, previo, { causa: d.causa, control: d.control });
      }
      case 'C_CERRAR': {
        if (!ast || ['CERRADA', 'ANULADA'].indexOf(ast.estado) >= 0) return rechazar(db, ev, 'La AST ya terminó');
        if (!(esResponsable(db, ast, 'encargado_area', actor.id) || actor.rol === 'prevencion' || permite('aprobar'))) return rechazar(db, ev, 'La cierra el encargado del área o un responsable con atribución');
        ast.estado = d.anular ? 'ANULADA' : 'CERRADA';
        ast.cierre = { por: actor.id, en: A.ahora(db), texto: d.texto || '', pendientes: ast.faltantes.filter(function (x) { return x.estado !== 'CONFIRMADO'; }).map(function (x) { return (x.persona ? A.nombre(db, x.persona) : 'AST') + ': ' + x.nombre; }) };
        return ok(db, ev, ast, previo, ast.cierre);
      }
      case 'C_CARGAR_DOCUMENTO': {
        if (actor.rol !== 'prevencion' && actor.rol !== 'administrador') return rechazar(db, ev, 'Los documentos los carga Prevención');
        var pend = db.biblioteca.documentoPendiente;
        if (!pend || pend.id !== d.documento) return rechazar(db, ev, 'Documento desconocido');
        db.biblioteca.documentos.push(pend); db.biblioteca.documentoPendiente = null;
        return ok(db, ev, null, null, { documento: pend.id + ' v' + pend.version });
      }
      case 'C_REEVALUAR_DOCUMENTOS': {
        if (actor.rol !== 'prevencion') return rechazar(db, ev, 'La revisión documental la resuelve Prevención');
        if (ast && ast.ampliacionPendiente && ast.estado !== 'REVISION_DOCUMENTAL') {
          // D-048: la ampliación esperaba un procedimiento; la etapa 1 nunca se tocó
          var ap0 = ast.ampliacionPendiente, b3 = null;
          (ap0.fichas || []).some(function (id) { var f3 = ficha(db, id); b3 = !f3 ? brechaDe(db, null) : f3.estado !== 'VALIDADA' ? { tipo: 'FICHA_NO_VALIDADA', detalle: 'La ficha ' + f3.id + ' sigue en validación' } : brechaDe(db, f3); return !!b3; });
          if (!(ap0.fichas || []).length && !b3) b3 = brechaDe(db, null);
          if (ap0.brecha && ['OPERACION_NO_CUBIERTA', 'PENDIENTE_REVISION'].indexOf(ap0.brecha.tipo) >= 0 && !d.resuelto) return rechazar(db, ev, 'Indica cómo se resolvió: ' + ap0.brecha.detalle);
          if (b3) return rechazar(db, ev, 'La brecha sigue: ' + b3.detalle);
          (ast.ampliacionesResueltas = ast.ampliacionesResueltas || []).push(Object.assign({}, ap0, { resueltaPor: actor.id, resueltaEn: A.ahora(db) }));
          ast.ampliacionPendiente = null;
          avisar(db, [ap0.por], 'BRECHA', 'La documentación de lo que querías agregar a «' + ast.nombre + '» ya está completa. Vuelve a pedir la ampliación.', ast);
          return ok(db, ev, ast, previo, { ampliacion: 'documentación completa' });
        }
        if (!ast || ast.estado !== 'REVISION_DOCUMENTAL') return rechazar(db, ev, 'La AST no está en revisión documental');
        var b2 = null; fichasDe(db, ast).some(function (x) { b2 = brechaDe(db, x); return !!b2; });
        if (!b2 && !fichasDe(db, ast).length) b2 = brechaDe(db, null);
        if (ast.brecha && ['OPERACION_NO_CUBIERTA', 'PENDIENTE_REVISION'].indexOf(ast.brecha.tipo) >= 0 && !d.resuelto) return rechazar(db, ev, 'Indica cómo se resolvió: ' + ast.brecha.detalle);
        if (b2) return rechazar(db, ev, 'La brecha sigue: ' + b2.detalle);
        ast.brecha = null; ast.estado = 'BORRADOR'; ast.ficha = null; ast.fichas = []; // vuelve a borrador: el creador elige la tarea de nuevo con la documentación completa
        avisar(db, [ast.creadaPor], 'BRECHA', 'La documentación de «' + ast.descripcion + '» ya está completa. Vuelve a armar la AST.', ast);
        return ok(db, ev, ast, previo, {});
      }
      case 'C_CHARLA_CREAR': {
        if (!puede(db, actor.id, 'registrar_trabajadores', d.area, actor.empresa) && actor.rol !== 'prevencion') return rechazar(db, ev, 'La charla la da un responsable con alcance en el área o Prevención');
        var asts = db.asts.filter(function (x) { return x.modo === 'cuadrilla' && x.area === d.area && x.ficha && ['CERRADA', 'ANULADA', 'REVISION_DOCUMENTAL'].indexOf(x.estado) < 0; });
        if (!asts.length) return rechazar(db, ev, 'No hay AST activas con procedimiento en el área: la charla se arma desde sus documentos');
        var puntos = [];
        asts.forEach(function (x) { fichasDe(db, x).reduce(function (l, f) { return l.concat(f.peligros); }, []).forEach(function (p) { if (puntos.length < 5 && !puntos.some(function (q) { return q.peligro === p.peligro; })) puntos.push({ peligro: p.peligro, riesgo: p.riesgo, control: p.control, cita: p.cita, ast: x.id }); }); });
        var ch = { id: 'CH-' + String(db.charlas.length + 1).padStart(3, '0'), area: d.area, por: actor.id, en: A.ahora(db), asts: asts.map(function (x) { return x.id; }), puntos: puntos, asistentes: [] };
        db.charlas.push(ch);
        return ok(db, ev, null, null, { charla: ch.id, asts: ch.asts, puntos: puntos.length }, { charla: ch });
      }
      case 'C_CHARLA_CONFIRMAR': {
        var cha = porId(db.charlas, d.charla);
        if (!cha) return rechazar(db, ev, 'Charla desconocida');
        if (cha.asistentes.some(function (x) { return x.persona === actor.id; })) return rechazar(db, ev, 'Ya confirmaste tu asistencia');
        if (!ev.dispositivoDe && !credencialOk(db, actor, d.credencial || d.pin)) return rechazar(db, ev, (modoFirma(db, actor) === 'PIN' ? 'PIN' : 'RUT') + ' incorrecto');
        cha.asistentes.push({ persona: actor.id, en: A.ahora(db), mecanismo: textoMecanismo(db, actor, ev.dispositivoDe) });
        return ok(db, ev, null, null, { charla: cha.id, persona: actor.nombre });
      }
      case 'C_CREAR_PIN': {
        if (modoFirma(db, actor) !== 'PIN') return rechazar(db, ev, 'Tu empresa firma con RUT: no necesitas PIN');
        if (!actor.rut || limpiar(d.rut) !== limpiar(actor.rut)) return rechazar(db, ev, 'Confirma tu RUT para crear el PIN');
        if (!/^\d{4}$/.test(d.pin || '')) return rechazar(db, ev, 'El PIN son 4 números');
        actor.pin = d.pin;
        return ok(db, ev, null, null, { persona: actor.nombre, nota: 'PIN creado (no se guarda en la bitácora)' });
      }
      // ----- Configuración de la empresa (D-031) -----
      case 'C_REGLA': {
        if (!puedeConfigurar(db, actor)) return rechazar(db, ev, 'Las reglas las configura la empresa (Prevención o administración)');
        if (d.regla !== 'prevencionSiempre') return rechazar(db, ev, 'Regla desconocida');
        db.config.prevencionSiempre = !!d.valor;
        return ok(db, ev, null, null, { regla: d.regla, valor: !!d.valor });
      }
      case 'C_CONFIGURAR_FIRMA': {
        if (!puedeConfigurar(db, actor)) return rechazar(db, ev, 'La forma de firma la configura la empresa (Prevención o administración en la demo)');
        var em = porId(db.empresas, d.empresa);
        if (!em || ['RUT', 'PIN'].indexOf(d.modo) < 0) return rechazar(db, ev, 'Empresa o modo no válido');
        em.firma = d.modo;
        return ok(db, ev, null, null, { empresa: em.nombre, modo: d.modo });
      }
      case 'C_RESPONSABLE': {
        if (!puedeConfigurar(db, actor)) return rechazar(db, ev, 'Los responsables los configura Prevención o administración');
        if (!CALIDAD[d.calidad] || !porId(db.personas, d.persona) || !(d.area || d.zona || d.empresa)) return rechazar(db, ev, 'Faltan datos del responsable');
        var clave = function (r) { return r.calidad === d.calidad && r.persona === d.persona && (r.area || null) === (d.area || null) && (r.zona || null) === (d.zona || null) && (r.empresa || null) === (d.empresa || null); };
        if (d.quitar) db.responsables = db.responsables.filter(function (r) { return !clave(r); });
        else if (!db.responsables.some(clave)) db.responsables.push({ area: d.area || undefined, zona: d.zona || undefined, empresa: d.empresa || undefined, calidad: d.calidad, persona: d.persona, turno: d.turno || undefined, reemplazaA: d.reemplazaA || undefined });
        refrescarConfigPendiente(db);
        return ok(db, ev, null, null, { calidad: d.calidad, persona: A.nombre(db, d.persona), area: d.area || null, zona: d.zona || null, quitar: !!d.quitar });
      }
      case 'C_AUSENCIA': {
        if (!puedeConfigurar(db, actor) && !puede(db, actor.id, 'configurar_areas', null, null) && !(actor.rol === 'jefe_terreno')) return rechazar(db, ev, 'Las ausencias las registra la jefatura o Prevención');
        var pa = porId(db.personas, d.persona); if (!pa) return rechazar(db, ev, 'Persona desconocida');
        pa.ausente = !!d.ausente;
        refrescarConfigPendiente(db);
        return ok(db, ev, null, null, { persona: pa.nombre, ausente: pa.ausente });
      }
      case 'C_ASIGNAR': {
        if (!puedeConfigurar(db, actor)) return rechazar(db, ev, 'Los permisos los asigna Prevención o administración');
        if (!porId(db.personas, d.persona) || !d.alcance || !(d.permisos || []).length || d.permisos.some(function (x) { return PERMISOS.indexOf(x) < 0; })) return rechazar(db, ev, 'Asignación incompleta: persona, permisos y alcance');
        db.asignaciones.push({ persona: d.persona, permisos: d.permisos, alcance: d.alcance });
        return ok(db, ev, null, null, { persona: A.nombre(db, d.persona), permisos: d.permisos, alcance: textoAlcance(db, d.alcance) });
      }
      case 'C_CREAR_AREA_TEMPORAL': {
        var zona = porId(db.zonas, d.zona);
        if (!zona) return rechazar(db, ev, 'Zona desconocida');
        if (!(puedeConfigurar(db, actor) || (db.asignaciones || []).some(function (a) { return a.persona === actor.id && a.permisos.indexOf('configurar_areas') >= 0 && (a.alcance.empresa || (a.alcance.zonas || []).indexOf(zona.id) >= 0); }))) return rechazar(db, ev, 'Tu configuración no te permite crear áreas en ' + zona.nombre);
        if (!d.nombre || !d.ubicacion) return rechazar(db, ev, 'Un área temporal necesita nombre y ubicación');
        if (!(d.trabajos || []).length || !(d.peligros || []).length) return rechazar(db, ev, 'Sin diagnóstico (trabajos permitidos y peligros) no se implementa el área (D-016)');
        if (!d.encargado || !porId(db.personas, d.encargado)) return rechazar(db, ev, 'Un área temporal necesita encargado');
        var nid = 't' + (db.areas.filter(function (x) { return x.temporal; }).length + 1);
        var nuevaArea = { id: nid, nombre: 'Temporal · ' + d.nombre, zona: zona.id, temporal: true, ubicacion: d.ubicacion, qr: A.sha256('qr-' + nid + A.ahora(db)).slice(0, 32), qrVersion: 1, eppArea: [],
          levantamiento: { verificadoPor: actor.id, verificadoEn: A.ahora(db).slice(0, 10) }, diagnostico: { trabajos: d.trabajos, peligros: d.peligros, verificadoPor: actor.id, verificadoEn: A.ahora(db).slice(0, 10) } };
        db.areas.push(nuevaArea);
        db.responsables.push({ area: nid, calidad: 'encargado_area', persona: d.encargado });
        return ok(db, ev, null, null, { area: nuevaArea.nombre, ubicacion: d.ubicacion, encargado: A.nombre(db, d.encargado) }, { area: nuevaArea });
      }
      case 'C_AVISO_PRUEBA': {
        if (!puedeConfigurar(db, actor)) return rechazar(db, ev, 'Los avisos de prueba los envía Prevención o administración');
        var pp = porId(db.personas, d.persona); if (!pp) return rechazar(db, ev, 'Persona desconocida');
        avisar(db, [pp.id], 'PRUEBA', 'Aviso de prueba de ASTRA: toca este aviso para confirmar que te llegan las notificaciones.', null);
        pp.avisoPrueba = { enviado: A.ahora(db), recibido: null };
        return ok(db, ev, null, null, { persona: pp.nombre });
      }
      case 'C_CONFIRMAR_PRUEBA': {
        if (!actor.avisoPrueba) return rechazar(db, ev, 'No hay aviso de prueba pendiente');
        actor.avisoPrueba.recibido = A.ahora(db);
        return ok(db, ev, null, null, { persona: actor.nombre });
      }
    }
    return rechazar(db, ev, 'Evento desconocido: ' + ev.tipo);
  }

  function fecha(db, dias) { var d = new Date(A.ahora(db)); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); }
  function abrirFaltante(db, ast, personaId, r, sinAviso) {
    var q = r.si ? preguntasDe(fichasDe(db, ast)).filter(function (x) { return x.id === r.si; })[0] : null;
    var fa = { id: 'F' + (ast.faltantes.length + 1), persona: personaId, req: r.id, nombre: r.nombre, tipo: r.tipo, nivel: r.nivel, competencia: r.competencia || null, critico: !!r.critico, cita: r.cita, herramienta: q ? q.herramienta : null, estado: 'ABIERTO', abiertoEn: A.ahora(db), gestion: null, confirmacion: null };
    ast.faltantes.push(fa);
    if (!sinAviso) avisarFaltantes(db, ast, personaId ? porId(db.personas, personaId) : null, [fa]);
    return fa;
  }
  function avisarFaltantes(db, ast, persona, lista) {
    var area = porId(db.areas, ast.area).nombre;
    var quien = persona ? 'El trabajador ' + persona.nombre + (porId(db.empresas, persona.empresa).tipo === 'contratista' ? ' (Subcontrato · ' + porId(db.empresas, persona.empresa).nombre + ')' : '') : 'La AST';
    avisar(db, responsablesFaltante(db, ast, persona ? persona.id : null), 'FALTANTE',
      quien + ' tiene pendiente un requisito mínimo de la AST «' + ast.nombre + '», de ' + area + ': ' + lista.map(function (x) { return x.nombre + (x.herramienta ? ' (para utilizar ' + x.herramienta + ')' : ''); }).join(', ') + '. ' + (persona ? 'Su incorporación está bloqueada.' : 'La AST queda en borrador.') + ' Por favor, gestionar el requisito.', ast);
  }
  function avisarAprobadores(db, ast) {
    var pend = ast.aprobaciones.filter(function (a) { return a.estado !== 'APROBADA'; });
    if (!pend.length) return;
    var minimo = Math.min.apply(null, pend.map(function (a) { return a.orden; }));
    pend.filter(function (a) { return a.estado === 'PENDIENTE' && a.orden === minimo && !a.avisado; }).forEach(function (a) {
      a.avisado = true;
      if (a.calidad === 'encargado_area' && a.modo === 'presencial') avisar(db, responsablesDe(db, a.area, a.calidad, ast.empresa), 'VERIFICACION_ENCARGADO', 'Nueva AST en ' + porId(db.areas, ast.area).nombre.replace(' · ', ' — ') + ': «' + ast.nombre + '» (' + etiquetaEmpresa(db, ast) + '). Se requiere verificación presencial.', ast);
      else avisar(db, responsablesDe(db, a.area, a.calidad, ast.empresa), 'ENVIADA_REVISION', '«' + ast.nombre + '» (' + porId(db.areas, ast.area).nombre + ', ' + etiquetaEmpresa(db, ast) + ') espera tu ' + (a.modo === 'presencial' ? 'verificación presencial' : 'revisión documental') + ' como ' + CALIDAD[a.calidad] + '.', ast);
    });
  }
  // Cuando se asigna un responsable que faltaba (o vuelve el titular), las aprobaciones en «configuración pendiente» se activan
  function refrescarConfigPendiente(db) {
    db.asts.forEach(function (ast) {
      if (ast.modo !== 'cuadrilla' || ['REGISTRADA', 'EN_REVISION', 'OBSERVADA'].indexOf(ast.estado) < 0) return;
      ast.aprobaciones.forEach(function (a) {
        var per = responsablesDe(db, a.area, a.calidad, ast.empresa); a.personas = per;
        if (a.estado === 'CONFIGURACION_PENDIENTE' && per.length) { a.estado = 'PENDIENTE'; a.avisado = false; }
      });
      avisarAprobadores(db, ast);
    });
  }

  // ---------- Panel de Prevención: los tres niveles por separado (D-023), filtrable por zona (D-031 §4) ----------
  function panel(db, zonaId) {
    var asts = db.asts.filter(function (a) { return a.modo === 'cuadrilla' && (!zonaId || porId(db.areas, a.area).zona === zonaId); }), out = { declarado: [], sistema: [], responsable: [] };
    asts.forEach(function (a) { a.faltantes.filter(function (f) { return f.estado !== 'CONFIRMADO'; }).forEach(function (f) { out[f.nivel].push({ ast: a, f: f }); }); });
    return {
      asts: asts, faltantes: out,
      incorporados: asts.reduce(function (n, a) { return n + a.integrantes.length; }, 0),
      firmados: asts.reduce(function (n, a) { return n + a.integrantes.filter(function (i) { return i.estado === 'FIRMADO'; }).length; }, 0),
      sinResponder: asts.reduce(function (n, a) { return n + a.integrantes.filter(function (i) { return i.estado === 'RESPUESTAS_PENDIENTES'; }).length; }, 0),
      observaciones: asts.reduce(function (l, a) { return l.concat(a.observaciones.map(function (o) { return { ast: a, o: o }; })); }, []),
      brechas: asts.filter(function (a) { return a.estado === 'REVISION_DOCUMENTAL'; }),
      permisos: asts.reduce(function (l, a) { return l.concat(a.permisos.filter(function (p) { return p.estado !== 'AUTORIZADO'; }).map(function (p) { return { ast: a, p: p }; })); }, []),
      config: asts.filter(function (a) { return a.aprobaciones.some(function (x) { return x.estado === 'CONFIGURACION_PENDIENTE'; }); })
    };
  }

  // D-042 §5: un aviso que exige acción y falló o no se atendió a tiempo escala al reemplazo y a Prevención.
  // Nada se aprueba por silencio: el escalamiento solo avisa; la acción sigue pendiente.
  function escalarAvisos(db, minutos) {
    var limite = new Date(new Date(A.ahora(db)).getTime() - minutos * 60000).toISOString(), out = [];
    db.avisos.filter(function (a) { return a.accion && !a.leido && !a.escalado && a.tipo !== 'ESCALAMIENTO' && (a.fallo || a.en <= limite); }).forEach(function (a) {
      var ast = a.ast ? porId(db.asts, a.ast) : null, per = porId(db.personas, a.para);
      var a2 = db.responsables.filter(function (r) { return r.reemplazaA === a.para; }).map(function (r) { return r.persona; })
        .concat(ast ? responsablesDe(db, ast.area, 'prevencion', ast.empresa) : db.personas.filter(function (x) { return x.rol === 'prevencion' && per && x.empresa === per.empresa; }).map(function (x) { return x.id; }))
        .filter(function (x) { return x !== a.para; });
      a.escalado = { en: A.ahora(db), a: a2, motivo: a.fallo ? 'falla de entrega' : 'sin atender en ' + minutos + ' min' };
      avisar(db, a2, 'ESCALAMIENTO', 'Aviso sin atender para ' + (per ? per.nombre : a.para) + ' (' + a.escalado.motivo + '): ' + a.texto, ast, { origen: a.id });
      out.push(a.id);
    });
    return out;
  }
  // D-049: informe de la AST día por día (quién se registró, continuidad, evaluaciones, cambios, etapas, hallazgos, detenciones y observaciones)
  function sigDia(dia) { var t = new Date(dia + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); }
  function informeAst(db, astId) {
    var ast = porId(db.asts, astId); if (!ast || ast.modo !== 'cuadrilla') return null;
    var ini = ast.diaInicio || diaChile(ast.creadaEn), hoy = diaChile(A.ahora(db)), fin = diaChile(ast.cierre && ast.cierre.en ? ast.cierre.en : A.ahora(db));
    if (fin > hoy) fin = hoy; if (fin < ini) fin = ini;
    var enDia = function (iso, dia) { return !!iso && diaChile(iso) === dia; };
    var hz = (db.hallazgos || []).filter(function (x) { return x.ast === ast.id; });
    var obsPost = (db.observacionesAst || []).filter(function (x) { return x.ast === ast.id; });
    var dias = [], regPorPersona = {}, inconsistencias = [];
    for (var dd = ini; dd <= fin; dd = sigDia(dd)) {
      var rd = (ast.registrosDiarios || {})[dd] || null, reg;
      if (dd === ini) reg = ast.integrantes.filter(function (i) { return enDia(i.incluidoEn, ini); }).map(function (i) { return i.persona; });
      else reg = rd ? Object.keys(rd.registros) : [];
      var dia = dd;
      var esperados = ast.integrantes.filter(function (i) { return diaChile(i.incluidoEn) <= dia; }).map(function (i) { return i.persona; });
      reg.forEach(function (p) { (regPorPersona[p] = regPorPersona[p] || []).push(dia); });
      var evl = rd && rd.evaluacion ? { por: rd.evaluacion.por, cambioArea: rd.evaluacion.cambioArea, cambioTarea: rd.evaluacion.cambioTarea, condicionesIguales: rd.evaluacion.condicionesIguales, diferencia: rd.evaluacion.diferencia, resuelta: rd.evaluacion.resuelta ? rd.evaluacion.resuelta.tipo : null, corregida: !!(rd.evaluacion.historial && rd.evaluacion.historial.length) } : null;
      if (rd && rd.cambiosPosteriores && rd.cambiosPosteriores.length && evl && !evl.diferencia) inconsistencias.push({ dia: dia, texto: 'La evaluación del día decía «sin cambios» y luego se registró ' + rd.cambiosPosteriores.map(function (c) { return c.tipo; }).join(', ') });
      dias.push({ fecha: dia, evaluacion: evl, registrados: reg, ausentes: esperados.filter(function (p) { return reg.indexOf(p) < 0; }),
        cambios: ast.cambios.filter(function (c) { return enDia(c.en, dia); }), etapas: (ast.etapas || []).filter(function (e) { return e.n > 1 && enDia(e.desde, dia); }),
        hallazgos: hz.filter(function (x) { return enDia(x.en, dia); }).map(function (x) { return x.id; }), detenciones: ast.detenciones.filter(function (x) { return enDia(x.en, dia); }),
        observaciones: ast.observaciones.filter(function (x) { return enDia(x.en, dia); }).map(function (x) { return x.id; }), observacionesPosteriores: obsPost.filter(function (x) { return enDia(x.en, dia); }).map(function (x) { return x.id; }) });
    }
    var todos = [], entraron = [], salieron = [];
    ast.integrantes.forEach(function (i) {
      var l = regPorPersona[i.persona] || [], n = l.length;
      if (n === dias.length) todos.push(i.persona);
      if (n && l[0] > ini) entraron.push({ persona: i.persona, desde: l[0] });
      if (n && l[n - 1] < fin && dias.length > 1) salieron.push({ persona: i.persona, hasta: l[n - 1] });
      if (!n && ast.integrantes.length) salieron.push({ persona: i.persona, hasta: null });
    });
    return { ast: ast.id, nombre: ast.nombre, jornadas: ast.jornadas || null, desde: ini, hasta: fin, estado: ast.estado, dias: dias, continuidad: { todosLosDias: todos, entraron: entraron, salieron: salieron },
      etapas: (ast.etapas || []).map(function (e) { return { n: e.n, fichas: e.fichas, desde: e.desde, por: e.por, motivo: e.motivo }; }), cambios: ast.cambios.slice(), hallazgos: hz.map(function (x) { return x.id; }),
      detenciones: ast.detenciones.slice(), observaciones: ast.observaciones.map(function (x) { return x.id; }), observacionesPosteriores: obsPost.map(function (x) { return x.id; }), inconsistencias: inconsistencias,
      cierre: ast.cierre || null, ampliacionPendiente: ast.ampliacionPendiente || null };
  }
  var API = { VERSION: VERSION, informeAst: informeAst, diaChile: diaChile, variasJornadas: variasJornadas, exigeRegistro: exigeRegistro, registroHoy: registroHoy, vencida: vencida, finJornada: finJornada, cerrarVencidas: cerrarVencidas, escalarAvisos: escalarAvisos, identificar: identificar, porPalabras: porPalabras, fichasDe: fichasDe, requisitosAst: requisitosAst, preguntasDe: preguntasDe, rolesDe: rolesDe, equiposDe: equiposDe, estadoEquipos: estadoEquipos, unidadesDe: unidadesDe, tituloArea: tituloArea, preparar: preparar, aplicar: aplicar, sugerir: sugerir, detectar: detectar, brechaDe: brechaDe, requisitosDe: requisitosDe, requisitosPersona: requisitosPersona, mensajeBloqueo: mensajeBloqueo,
    ficha: ficha, documento: documento, integrante: integrante, inicio: inicio, modoFirma: modoFirma, credencialOk: credencialOk, faltantesAbiertos: faltantesAbiertos,
    etiquetaEmpresa: etiquetaEmpresa, etiquetaAprob: etiquetaAprob, esSubcontrato: esSubcontrato, responsable: responsable, responsablesDe: responsablesDe, puede: puede, textoAlcance: textoAlcance,
    compVigente: compVigente, panel: panel, participacion: participacion, vigentesOtras: vigentesOtras, avisar: avisar, esResponsable: esResponsable, estadoTexto: estadoTexto, chequeoEncargado: chequeoEncargado, avanzar: avanzar, ACCION: ACCION, CALIDAD: CALIDAD, NIVEL_TXT: NIVEL_TXT, AVISOS: AVISOS, PERMISOS: PERMISOS, PERMISO_TXT: PERMISO_TXT };
  if (typeof module !== 'undefined') module.exports = API; else g.ASTRA_C = API;
})(this);
