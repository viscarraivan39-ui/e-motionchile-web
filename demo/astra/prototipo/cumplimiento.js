// ASTRA · módulo de cumplimiento preventivo y legal (D-045). SIMULACIÓN — PROTOTIPO.
// Registros y eventos K_* para las obligaciones de gestión preventiva de una obra (MIPER, programa, IRL, EPP, capacitaciones,
// RIOHS, comités, DS 76, emergencias, DS 594, protocolos, Ley Karin, accidentes, incidentes, estadísticas, bitácora) y un
// auditor `K.auditar(db, fecha)` que dice por obligación CUMPLE / NO_CUMPLE / NO_APLICA con la norma citada.
// Todo vive en `db.cumplimiento` (se activa con `K.activar(db)`); sin ese objeto el motor no cambia (el escenario viejo y la demo siguen igual).
// Reglas: cada evento exige un actor autorizado, queda en la misma bitácora con hash y nunca hay atajos: las firmas de trabajadores
// se validan con su credencial (PIN). ASTRA NO recibe denuncias de acoso (Ley Karin): solo guarda el protocolo y su difusión.
// Marcas `verificar: true` = viene solo de NotebookLM (11-nov-2026), por verificar con experto o abogado (ver D-045).
// Lo CONFIRMADO o CORREGIDO con fuente oficial (04_estrategia/VERIFICACION_NORMATIVA_2026-11-11.md, D-050) ya no lleva la marca: DS 76 (arts. 7, 11, 14), DS 44 (comités, delegado), accidente grave (Compendio SUSESO), agua DS 594 (arts. 14, 15 y 123), RIOHS.
(function (g) {
  'use strict';
  var req = function (n, glob) { return (typeof module !== 'undefined') ? require('./' + n) : g[glob]; };
  var A = req('motor.js', 'ASTRA'), C = req('cuadrilla.js', 'ASTRA_C');
  var porId = A.porId;

  // ---------- Vocabulario ----------
  var TIPOS = ['K_MIPER_VERSION', 'K_MIPER_CONOCER', 'K_MIPER_GATILLO', 'K_CAMBIO_PROCESO', 'K_PROGRAMA_ELABORAR', 'K_PROGRAMA_APROBAR', 'K_PROGRAMA_AVANCE', 'K_IRL', 'K_EPP_ENTREGAR', 'K_CAPACITACION',
    'K_RIOHS_APROBAR', 'K_RIOHS_ENTREGAR', 'K_COMITE_CONSTITUIR', 'K_COMITE_CURSO', 'K_COMITE_ACTA', 'K_FAENA_REGISTRAR', 'K_FAENA_ANTECEDENTE', 'K_REGLAMENTO_EMITIR', 'K_REGLAMENTO_ENTREGAR', 'K_SGSST_FAENA',
    'K_PLAN_EMERGENCIA', 'K_SIMULACRO', 'K_DS594_CONTROL', 'K_PROTOCOLO', 'K_KARIN_PROTOCOLO', 'K_KARIN_DIFUSION', 'K_HORAS_HOMBRE',
    'K_ACCIDENTE_REGISTRAR', 'K_ACCIDENTE_DIAT', 'K_ACCIDENTE_AVISO', 'K_ACCIDENTE_INVESTIGAR', 'K_ACCIDENTE_MEDIDA', 'K_ACCIDENTE_MEDIDA_CERRAR', 'K_ACCIDENTE_REANUDAR',
    'K_INCIDENTE_REGISTRAR', 'K_INCIDENTE_INVESTIGAR'];
  var GATILLOS = ['ACCIDENTE', 'ENFERMEDAD_PROFESIONAL', 'RIESGO_GRAVE_INMINENTE', 'CAMBIO_CONDICIONES'];
  var EPP_BASICO = ['b_casco', 'b_barbiquejo', 'b_lentes', 'b_calzado', 'b_ropa'];
  // DS 594 arts. 14, 15 y 123 (VERIFICACION_NORMATIVA §4): devuelve los incumplimientos de agua según la regla que aplica
  function reglasAgua(a) {
    var out = [];
    if (!a) return out;
    var n = function (x) { return typeof x === 'number' && isFinite(x); };
    if (n(a.distanciaFuenteM) && a.distanciaFuenteM > 75 && !(n(a.litrosBeberPorJornada) && a.litrosBeberPorJornada >= 10)) out.push('DS 594 art. 123: frente a más de 75 m de la fuente autorizada, 10 litros de agua fresca por trabajador y por jornada');
    if (a.fuente === 'sistema_propio' && !(n(a.litrosPorPersonaDia) && a.litrosPorPersonaDia >= 100)) out.push('DS 594 art. 14: con sistema propio de abastecimiento, 100 litros por persona y por día');
    if (a.fuente === 'campamento_sin_servicio') {
      var minimo = a.autoridadSanitariaAutorizaMenos ? 30 : 100;
      if (!(n(a.litrosPorPersonaDia) && a.litrosPorPersonaDia >= minimo)) out.push('DS 594 art. 15: campamento o faena transitoria sin agua potable, ' + minimo + ' litros diarios por trabajador y por cada miembro de su familia' + (minimo === 30 ? ' (piso autorizado por la autoridad sanitaria)' : ' (el piso de 30 litros solo si la autoridad sanitaria lo autoriza)'));
    }
    return out;
  }
  var CAUSALES_GRAVE = ['AMPUTACION', 'REANIMACION', 'RESCATE', 'CAIDA_ALTURA_MAS_1_8M', 'HIPERBARICA', 'AFECTACION_MASIVA'];
  var PROTOCOLOS = { PREXOR: 'Ruido (PREXOR)', PLANESI: 'Sílice (PLANESI)', UV: 'Radiación UV solar', TMERT: 'Ergonomía (TMERT)', PSICOSOCIAL: 'Riesgos psicosociales (CEAL-SM / SUSESO)', CALOR: 'Calor extremo' };
  var MANDO = ['capataz', 'supervisor', 'jefe_terreno', 'prevencion', 'jefatura'];
  var NORMAS = {
    MIPER: 'DS 44/2024 art. 7', PROGRAMA: 'DS 44/2024 arts. 8 y 14', IRL: 'DS 44/2024 art. 15 y Código del Trabajo art. 184', EPP: 'Código del Trabajo art. 184; DS 44/2024 arts. 12 y 13', CAPACITACION: 'DS 44/2024 arts. 13 y 16',
    RIOHS: 'Código del Trabajo arts. 153 a 157; DS 44/2024 arts. 56 a 61', COMITE: 'Ley 16.744 art. 66; DS 44/2024 arts. 23 (más de 25 personas), 25, 39 y 66 (delegado de 10 a 25); DS 76 art. 14 (comité de faena: más de 25 y más de 30 días corridos)', DS76: 'Ley 16.744 art. 66 bis; DS 76 de 2006 (publicado 18-ene-2007) art. 7 (sistema de gestión de SST de la faena: más de 50), art. 11 (reglamento especial: más de 50) y art. 14', EMERGENCIA: 'DS 44/2024 arts. 19 y 20; DS 594 art. 42',
    DS594: 'DS 594/1999: agua arts. 14 (100 L por persona y día con sistema propio), 15 (campamento transitorio sin servicio: 100 L, piso de 30 L solo si la autoridad sanitaria lo autoriza) y 123 (10 L por jornada si el frente está a más de 75 m de la fuente); calor art. 98 bis (DS 40/2025 MINSAL); servicios higiénicos y comedor: por verificar', PROTOCOLOS: 'DS 594; DS 44/2024 arts. 67 y 68; protocolos MINSAL', KARIN: 'Ley 21.643; Código del Trabajo art. 211-A; DS 44/2024 art. 58 letra j', ACCIDENTES: 'Ley 16.744 art. 76; DS 101 art. 71; Compendio SUSESO Libro IV, Título I, Letra D (modificado por la Circular 3705 de 2022; la Circular 3335 fue derogada por la Res. N° 156 de 2018)',
    INCIDENTES: 'DS 44/2024 art. 71 (investigación)', ESTADISTICAS: 'DS 44/2024 arts. 73 y 74', BITACORA: 'DS 44/2024 arts. 72 a 75'
  };

  // ---------- Fechas ----------
  function hoy(db) { return A.ahora(db).slice(0, 10); }
  function ms(x) { return new Date(String(x).length === 10 ? x + 'T00:00:00.000Z' : x).getTime(); }
  function dias(desde, hasta) { return Math.round((ms(String(hasta).slice(0, 10)) - ms(String(desde).slice(0, 10))) / 86400000); }
  function sumar(f, n) { return new Date(ms(String(f).slice(0, 10)) + n * 86400000).toISOString().slice(0, 10); }
  function horas(a, b) { return (ms(b) - ms(a)) / 3600000; }
  function mes(f) { return String(f).slice(0, 7); }
  function mesSig(m) { var y = +m.slice(0, 4), n = +m.slice(5, 7); return n === 12 ? (y + 1) + '-01' : y + '-' + String(n + 1).padStart(2, '0'); }
  function fechaValida(x) { return /^\d{4}-\d{2}-\d{2}$/.test(x || '') && !isNaN(ms(x)); }

  // ---------- Activación y datos ----------
  function configBase() {
    return { diasPrograma: 30, diasAlertaMiper: 335, diasMiper: 365, diasGraciaGatillo: 30, horasDiat: 24, minutosAvisoAutoridad: 120, diasInvestigacion: 30, diasInvestigarIncidente: 5, mesesCursoComite: 6, diasSimulacro: 365,
      umbralCphs: 25, umbralDelegadoDesde: 10, umbralSgsst: 50, diasMinFaenaComite: 30, diasPlan: 365, diasRiohs: 365, diasCargoFatal: 6000,
      nota: 'diasGraciaGatillo, minutosAvisoAutoridad, diasInvestigacion e diasInvestigarIncidente son parámetros de ASTRA: la norma no fija ese plazo (el Compendio dice «de inmediato» y no escribe un número de horas).' };
  }
  function activar(db, o) {
    o = o || {};
    db.cumplimiento = {
      activo: true, version: 1, representanteLegal: o.representanteLegal || null, inicioObra: o.inicioObra || null, config: Object.assign(configBase(), o.config || {}),
      miper: { versiones: [], revisionPendiente: null, acuses: [] }, cambiosProceso: [], programa: { versiones: [] }, irl: [], epp: [], capacitaciones: [], riohs: { vigentes: {}, entregas: [] },
      comites: [], faena: { registro: [], antecedentes: { cronograma: null, evaluacionesRiesgos: {}, visitasOAL: [], actasFiscalizacion: [] }, reglamento: null, entregas: [], sgsst: null },
      emergencia: { planes: [], simulacros: [] }, ds594: [], protocolos: {}, karin: { protocolos: [], difusiones: [] }, horasHombre: [], accidentes: [], incidentes: [], areasSuspendidas: {}, seq: { acc: 0, inc: 0, com: 0, cap: 0, act: 0, med: 0 }
    };
    return db;
  }
  function nomina(db) {
    return db.personas.filter(function (p) { var e = porId(db.empresas, p.empresa); return p.enNominaTerreno && p.codigo && e && e.tipo !== 'mandante'; });
  }
  function dotacion(db, empresaId) { return nomina(db).filter(function (p) { return p.empresa === empresaId; }).length; }
  function sgsstAplica(db) { return nomina(db).length > db.cumplimiento.config.umbralSgsst; }
  function contratistas(db) { return db.empresas.filter(function (e) { return e.tipo === 'contratista'; }); }
  function exigido(db, persona) { var e = persona && porId(db.empresas, persona.empresa); return !!(persona && persona.enNominaTerreno && persona.codigo && e && e.tipo !== 'mandante'); }

  // ---------- Estado de cada persona (lo usa la puerta del motor y el auditor) ----------
  function ultimoCambio(db, empresaId) {
    return db.cumplimiento.cambiosProceso.filter(function (c) { return !c.empresas || c.empresas.indexOf(empresaId) >= 0; }).map(function (c) { return c.fecha; }).sort().slice(-1)[0] || null;
  }
  function irlDe(db, personaId) { return db.cumplimiento.irl.filter(function (x) { return x.persona === personaId && x.firmada; }).sort(function (a, b) { return a.fecha < b.fecha ? -1 : 1; }); }
  function irlVigente(db, p) {
    var lista = irlDe(db, p.id); if (!lista.length) return { ok: false, motivo: 'no tiene IRL firmada' };
    var ult = lista[lista.length - 1], cambio = ultimoCambio(db, p.empresa);
    if (cambio && ult.fecha < cambio) return { ok: false, motivo: 'su IRL es anterior al cambio de proceso, tecnología o materiales del ' + cambio };
    return { ok: true };
  }
  // La IRL debe ser anterior al inicio de labores (DS 44 art. 15): si llegó tarde, el auditor lo deja como incumplimiento (la puerta ya no bloquea a quien la recibió)
  function irlTardia(db, p) { var l = irlDe(db, p.id); return !!(p.fechaIngreso && l.length && l[0].fecha > p.fechaIngreso) ? 'su IRL (' + l[0].fecha + ') se firmó después de iniciar labores (' + p.fechaIngreso + ')' : null; }
  function eppBasico(db, p) {
    var tiene = {}; db.cumplimiento.epp.filter(function (x) { return x.persona === p.id && x.firmada; }).forEach(function (x) { x.items.forEach(function (i) { tiene[i] = true; }); });
    var falta = EPP_BASICO.filter(function (i) { return !tiene[i]; });
    return { ok: !falta.length, falta: falta };
  }
  function reglamentoOk(db, p) {
    var e = porId(db.empresas, p.empresa), f = db.cumplimiento.faena;
    if (!e || e.tipo !== 'contratista' || !sgsstAplica(db)) return { ok: true };
    if (!f.reglamento) return { ok: false, motivo: 'la empresa principal aún no emite el reglamento especial para contratistas' };
    var ent = f.entregas.filter(function (x) { return x.empresa === e.id && x.version === f.reglamento.version && x.firmada; })[0];
    return ent ? { ok: true } : { ok: false, motivo: 'la empresa contratista ' + e.nombre + ' no ha firmado el reglamento especial (DS 76) en su versión vigente' };
  }
  function requisitosIngreso(db, persona) {
    var k = db.cumplimiento, faltan = [];
    if (!k || !k.activo || !exigido(db, persona)) return { ok: true, faltan: [] };
    var i = irlVigente(db, persona); if (!i.ok) faltan.push({ codigo: 'IRL', texto: 'IRL: ' + i.motivo, norma: NORMAS.IRL });
    var e = eppBasico(db, persona); if (!e.ok) faltan.push({ codigo: 'EPP', texto: 'EPP básico sin entregar o sin firma: ' + e.falta.join(', '), norma: NORMAS.EPP });
    var r = reglamentoOk(db, persona); if (!r.ok) faltan.push({ codigo: 'REGLAMENTO_ESPECIAL', texto: 'Reglamento especial: ' + r.motivo, norma: 'DS 76 art. 11' });
    return { ok: !faltan.length, faltan: faltan };
  }
  function areaSuspendida(db, areaId) {
    var k = db.cumplimiento; if (!k) return null;
    var l = (k.areasSuspendidas[areaId] || []); return l.length ? { area: areaId, accidentes: l.slice() } : null;
  }

  // ---------- Puerta del motor (cuadrilla.js la llama solo si el mundo tiene `db.cumplimiento`) ----------
  var EV_PERSONA = ['C_CREAR', 'C_UNIRSE', 'C_DECLARAR', 'C_FIRMAR', 'C_INICIAR_TRABAJO', 'C_REGISTRO_DIARIO'];
  var EV_AREA = ['C_CREAR', 'C_ELEGIR_TAREA', 'C_AMPLIAR', 'C_UNIRSE', 'C_INGRESAR_EQUIPO', 'C_INICIAR_TRABAJO', 'C_REGISTRO_DIARIO', 'C_REANUDAR'];
  function puerta(db, ev, actor, ast) {
    var k = db.cumplimiento; if (!k || !k.activo) return null;
    var d = ev.datos || {};
    if (EV_AREA.indexOf(ev.tipo) >= 0) {
      var areas = ev.tipo === 'C_CREAR' ? [d.areaPrincipal || d.area].concat(d.involucradas || []) : (ast ? (ast.ruta && ast.ruta.length ? ast.ruta : [ast.area]) : []);
      var sus = areas.filter(function (a) { return a && areaSuspendida(db, a); })[0];
      if (sus) return 'El área ' + sus + ' está suspendida por un accidente grave o fatal: no admite AST ni trabajo hasta la reanudación autorizada por la autoridad (Ley 16.744 art. 76; Compendio SUSESO Libro IV, Título I, Letra D)';
    }
    if (EV_PERSONA.indexOf(ev.tipo) >= 0) {
      var r = requisitosIngreso(db, actor);
      if (!r.ok) return 'No puedes incorporarte a una AST todavía: ' + r.faltan.map(function (x) { return x.texto; }).join('; ') + ' (' + r.faltan.map(function (x) { return x.norma; }).join('; ') + ')';
    }
    return null;
  }
  // Para C_INGRESAR_EQUIPO: se revisa a cada persona que el capataz agrega
  function puertaPersona(db, persona) {
    var k = db.cumplimiento; if (!k || !k.activo) return null;
    var r = requisitosIngreso(db, persona);
    return r.ok ? null : 'No puede incorporarse a una AST: ' + r.faltan.map(function (x) { return x.texto; }).join('; ');
  }
  C.puertaCumplimiento = puerta; C.puertaCumplimientoPersona = puertaPersona;

  // ---------- Eventos ----------
  function rechazar(db, ev, motivo) {
    A.registrar(db, { tipo: 'TRANSICION_RECHAZADA', actor: ev.actor, datos: { intento: ev.tipo, motivo: motivo, faltantes: [] } });
    return { ok: false, motivo: motivo };
  }
  function listo(db, ev, datos, extra, area) {
    var e = A.registrar(db, { tipo: ev.tipo, area: area || null, actor: ev.actor, datos: datos || {} });
    return Object.assign({ ok: true, evento: e }, extra || {});
  }
  function esRep(db, a) { return !!a && db.cumplimiento.representanteLegal === a.id; }
  function esPrev(a) { return a.rol === 'prevencion'; }
  function esMando(a) { return MANDO.indexOf(a.rol) >= 0; }
  function miembroComite(db, a) { return db.cumplimiento.comites.some(function (c) { return c.integrantes.indexOf(a.id) >= 0 && !c.disuelto; }); }
  function firmaOk(db, persona, pin) { return !!persona && C.credencialOk(db, persona, pin); }
  function lista(x) { return Array.isArray(x) ? x : []; }
  function texto(x, n) { return typeof x === 'string' && x.trim().length >= (n || 3); }

  function aplicar(db, ev) {
    var k = db.cumplimiento, d = ev.datos = ev.datos || {}, actor = porId(db.personas, ev.actor);
    if (ev.tipo === 'K_DENUNCIA' || /DENUNCIA/.test(ev.tipo || '')) return rechazar(db, ev, 'ASTRA no recibe denuncias de acoso ni de violencia (Ley Karin): se hacen por los canales del protocolo de la empresa o ante la Dirección del Trabajo');
    if (!k || !k.activo) return rechazar(db, ev, 'El módulo de cumplimiento no está activo en esta obra');
    if (TIPOS.indexOf(ev.tipo) < 0) return rechazar(db, ev, 'Evento desconocido: ' + ev.tipo);
    if (!actor || actor.rol === 'administrador') return rechazar(db, ev, 'Persona no habilitada para actuar en el cumplimiento');
    var f = d.fecha || hoy(db);
    if (!fechaValida(f)) return rechazar(db, ev, 'Fecha no válida (AAAA-MM-DD)');
    if (f > hoy(db)) return rechazar(db, ev, 'No se registra una fecha futura como hecha');
    var p, e, acc, i;
    switch (ev.tipo) {
      // ---- 1. MIPER ----
      case 'K_MIPER_VERSION': {
        if (!esPrev(actor)) return rechazar(db, ev, 'La MIPER la elabora y registra Prevención (DS 44 art. 7)');
        if (!GATILLOS.concat(['INICIAL', 'ANUAL']).includes(d.motivo)) return rechazar(db, ev, 'Indica el motivo: INICIAL, ANUAL o un gatillo (' + GATILLOS.join(', ') + ')');
        if (!(d.filas > 0)) return rechazar(db, ev, 'Una MIPER genérica o vacía no vale: debe tener filas por puesto y tarea (DS 44 art. 7)');
        var inf = lista(d.informadaA);
        if (['trabajadores', 'linea_mando'].some(function (x) { return inf.indexOf(x) < 0; })) return rechazar(db, ev, 'La MIPER se informa a los trabajadores y a la línea de mando (DS 44 art. 7)');
        var ant = k.miper.versiones.slice(-1)[0];
        if (ant && f < ant.fecha) return rechazar(db, ev, 'La nueva versión no puede ser anterior a la vigente');
        if (ant) ant.estado = 'REEMPLAZADA';
        var v = { version: k.miper.versiones.length + 1, fecha: f, motivo: d.motivo, filas: d.filas, metodologia: d.metodologia || null, informadaA: inf.slice(), elaboradaPor: actor.id, estado: 'VIGENTE', consultaComite: !!d.consultaComite };
        k.miper.versiones.push(v); k.miper.revisionPendiente = null;
        return listo(db, ev, { version: v.version, motivo: v.motivo, filas: v.filas, vencePrograma: sumar(f, k.config.diasPrograma) }, { version: v });
      }
      case 'K_MIPER_CONOCER': {
        var vm = k.miper.versiones.slice(-1)[0]; p = porId(db.personas, d.persona || actor.id);
        if (!vm) return rechazar(db, ev, 'No hay MIPER');
        if (!p || MANDO.indexOf(p.rol) < 0) return rechazar(db, ev, 'Firma el conocimiento de la MIPER la línea de mando');
        if (d.persona && d.persona !== actor.id && !esPrev(actor)) return rechazar(db, ev, 'Nadie firma por otro');
        if (!firmaOk(db, p, d.pin)) return rechazar(db, ev, 'PIN incorrecto: la firma del conocimiento es personal');
        k.miper.acuses.push({ persona: p.id, version: vm.version, fecha: f });
        return listo(db, ev, { persona: p.id, version: vm.version });
      }
      case 'K_MIPER_GATILLO': {
        if (!(esPrev(actor) || actor.rol === 'jefe_terreno' || esRep(db, actor) || miembroComite(db, actor))) return rechazar(db, ev, 'Lo informa Prevención, el jefe de terreno, el representante legal o el comité');
        if (GATILLOS.indexOf(d.gatillo) < 0) return rechazar(db, ev, 'Gatillo no válido (' + GATILLOS.join(', ') + ')');
        if (!k.miper.versiones.length) return rechazar(db, ev, 'No hay MIPER que revisar');
        if (!k.miper.revisionPendiente) k.miper.revisionPendiente = { gatillo: d.gatillo, desde: f, motivos: [] };
        k.miper.revisionPendiente.motivos.push({ gatillo: d.gatillo, fecha: f, referencia: d.referencia || null, por: actor.id });
        return listo(db, ev, { gatillo: d.gatillo, referencia: d.referencia || null });
      }
      case 'K_CAMBIO_PROCESO': {
        if (!(esPrev(actor) || actor.rol === 'jefe_terreno')) return rechazar(db, ev, 'Lo registra el jefe de terreno o Prevención');
        if (!texto(d.descripcion, 8)) return rechazar(db, ev, 'Describe el cambio de proceso, tecnología, materiales o sustancias');
        k.cambiosProceso.push({ fecha: f, descripcion: d.descripcion, empresas: d.empresas || null, por: actor.id });
        if (k.miper.versiones.length && !k.miper.revisionPendiente) k.miper.revisionPendiente = { gatillo: 'CAMBIO_CONDICIONES', desde: f, motivos: [{ gatillo: 'CAMBIO_CONDICIONES', fecha: f, referencia: d.descripcion, por: actor.id }] };
        return listo(db, ev, { descripcion: d.descripcion, requiereNuevaIrl: true });
      }
      // ---- 2. Programa preventivo ----
      case 'K_PROGRAMA_ELABORAR': {
        if (!esPrev(actor)) return rechazar(db, ev, 'El programa lo elabora Prevención (DS 44 art. 8)');
        var mv = k.miper.versiones.filter(function (x) { return x.version === d.miperVersion; })[0];
        if (!mv) return rechazar(db, ev, 'El programa se elabora a partir de una versión de la MIPER');
        var acts = lista(d.actividades);
        if (!acts.length || acts.some(function (a) { return !texto(a.descripcion) || !a.responsable || !fechaValida(a.plazo); })) return rechazar(db, ev, 'Cada actividad del programa lleva descripción, responsable y plazo');
        if (k.programa.versiones.some(function (x) { return x.miperVersion === mv.version && x.estado === 'BORRADOR'; })) return rechazar(db, ev, 'Ya hay un borrador de programa para esa MIPER');
        var pr = { id: 'PROG-' + String(k.programa.versiones.length + 1).padStart(3, '0'), miperVersion: mv.version, elaboradoEn: f, elaboradoPor: actor.id, estado: 'BORRADOR', aprobadoPor: null, aprobadoEn: null,
          actividades: acts.map(function (a, n) { return { id: 'A' + (n + 1), descripcion: a.descripcion, responsable: a.responsable, plazo: a.plazo, avance: 0, etiqueta: a.etiqueta || null }; }) };
        k.programa.versiones.push(pr);
        return listo(db, ev, { programa: pr.id, miperVersion: mv.version, actividades: pr.actividades.length }, { programa: pr });
      }
      case 'K_PROGRAMA_APROBAR': {
        if (!esRep(db, actor)) return rechazar(db, ev, 'El programa lo aprueba y firma el representante legal (DS 44 art. 8)');
        var pa = k.programa.versiones.filter(function (x) { return x.id === d.programa; })[0];
        if (!pa || pa.estado !== 'BORRADOR') return rechazar(db, ev, 'Elige un programa en borrador');
        if (!firmaOk(db, actor, d.pin)) return rechazar(db, ev, 'PIN incorrecto: la aprobación es personal');
        k.programa.versiones.forEach(function (x) { if (x.estado === 'VIGENTE') x.estado = 'REEMPLAZADO'; });
        pa.estado = 'VIGENTE'; pa.aprobadoPor = actor.id; pa.aprobadoEn = f; pa.copiaComite = !!d.copiaComite;
        var mp = k.miper.versiones.filter(function (x) { return x.version === pa.miperVersion; })[0];
        return listo(db, ev, { programa: pa.id, diasDesdeMiper: dias(mp.fecha, f), enPlazo: dias(mp.fecha, f) <= k.config.diasPrograma });
      }
      case 'K_PROGRAMA_AVANCE': {
        var pv = k.programa.versiones.filter(function (x) { return x.estado === 'VIGENTE'; })[0], act = pv && pv.actividades.filter(function (x) { return x.id === d.actividad; })[0];
        if (!act) return rechazar(db, ev, 'Actividad no encontrada en el programa vigente');
        if (!(esPrev(actor) || act.responsable === actor.id)) return rechazar(db, ev, 'Informa el avance el responsable de la actividad o Prevención');
        if (!(d.avance >= 0 && d.avance <= 100) || d.avance < act.avance) return rechazar(db, ev, 'El avance va de 0 a 100 y no retrocede');
        act.avance = d.avance;
        return listo(db, ev, { actividad: act.id, avance: act.avance });
      }
      // ---- 3, 4, 5, 6. IRL, EPP, capacitaciones, RIOHS ----
      case 'K_IRL': {
        p = porId(db.personas, d.persona);
        if (!exigido(db, p)) return rechazar(db, ev, 'Persona no registrada en la nómina de la obra');
        if (!(esPrev(actor) || actor.rol === 'jefe_terreno' || ((actor.rol === 'supervisor' || actor.rol === 'capataz') && actor.empresa === p.empresa))) return rechazar(db, ev, 'La IRL la entrega Prevención o la jefatura de su empresa');
        if (['INGRESO', 'CAMBIO'].indexOf(d.tipo) < 0) return rechazar(db, ev, 'Indica si es de INGRESO o por CAMBIO de proceso, tecnología o materiales');
        if (!texto(d.relator)) return rechazar(db, ev, 'Falta el relator');
        if (lista(d.contenido).length < 4) return rechazar(db, ev, 'La IRL informa peligros, medidas, PTS, sustancias y emergencias (DS 44 art. 15)');
        if (d.tipo === 'CAMBIO' && !texto(d.cambio, 8)) return rechazar(db, ev, 'Describe el cambio informado');
        if (!firmaOk(db, p, d.pin)) return rechazar(db, ev, 'PIN incorrecto: cada trabajador firma su propia IRL');
        var r = { persona: p.id, fecha: f, tipo: d.tipo, relator: d.relator, contenido: d.contenido.slice(), cambio: d.cambio || null, firmada: true, registradaPor: actor.id };
        k.irl.push(r);
        return listo(db, ev, { persona: p.id, tipo: d.tipo, fecha: f });
      }
      case 'K_EPP_ENTREGAR': {
        p = porId(db.personas, d.persona);
        if (!exigido(db, p)) return rechazar(db, ev, 'Persona no registrada en la nómina de la obra');
        if (!(esPrev(actor) || actor.rol === 'jefe_terreno')) return rechazar(db, ev, 'Entrega Prevención o el jefe de terreno');
        if (!lista(d.items).length) return rechazar(db, ev, 'Indica los elementos entregados');
        if (d.cobro > 0) return rechazar(db, ev, 'El EPP se entrega gratis: no se cobra al trabajador (Código del Trabajo art. 184; DS 44 art. 12)');
        if (d.certificado !== true) return rechazar(db, ev, 'El EPP debe estar certificado o registrado ante el ISP (DS 44 art. 13)');
        if (!firmaOk(db, p, d.pin)) return rechazar(db, ev, 'PIN incorrecto: el trabajador firma la recepción');
        k.epp.push({ persona: p.id, fecha: f, items: d.items.slice(), motivo: d.motivo || 'INGRESO', entregadoPor: actor.id, firmada: true });
        return listo(db, ev, { persona: p.id, items: d.items, motivo: d.motivo || 'INGRESO' });
      }
      case 'K_CAPACITACION': {
        if (!(esPrev(actor) || actor.rol === 'jefe_terreno')) return rechazar(db, ev, 'Registra la capacitación Prevención o el jefe de terreno');
        var asis = lista(d.asistentes);
        if (!texto(d.tema) || !texto(d.relator) || !(d.horas > 0) || !lista(d.temario).length || !asis.length) return rechazar(db, ev, 'La capacitación lleva tema, relator, horas, temario y asistentes (DS 44 art. 16)');
        if (asis.some(function (x) { return !exigido(db, porId(db.personas, x)); })) return rechazar(db, ev, 'Hay asistentes que no están en la nómina de la obra');
        var cp = { id: 'CAP-' + String(++k.seq.cap).padStart(3, '0'), tema: d.tema, tipo: d.tipo || 'TEORICA', fecha: f, horas: d.horas, relator: d.relator, temario: d.temario.slice(), asistentes: asis.slice(), empresa: d.empresa || null };
        k.capacitaciones.push(cp);
        return listo(db, ev, { capacitacion: cp.id, tema: cp.tema, asistentes: asis.length });
      }
      case 'K_RIOHS_APROBAR': {
        var em = porId(db.empresas, d.empresa);
        if (!(esRep(db, actor) || (em && actor.empresa === em.id && ['supervisor', 'jefatura'].indexOf(actor.rol) >= 0))) return rechazar(db, ev, 'El RIOHS lo firma el representante legal de la empresa (o el responsable de la contratista)');
        if (!em || em.tipo === 'mandante') return rechazar(db, ev, 'Empresa no válida');
        if (!texto(d.version, 1)) return rechazar(db, ev, 'Falta la versión');
        k.riohs.vigentes[em.id] = { version: d.version, fecha: f, aprobadoPor: actor.id, consultaComite: !!d.consultaComite, remitidoDT: !!d.remitidoDT };
        return listo(db, ev, { empresa: em.id, version: d.version });
      }
      case 'K_RIOHS_ENTREGAR': {
        p = porId(db.personas, d.persona);
        if (!exigido(db, p)) return rechazar(db, ev, 'Persona no registrada en la nómina de la obra');
        var rv = k.riohs.vigentes[p.empresa];
        if (!rv) return rechazar(db, ev, 'Su empresa no tiene RIOHS vigente');
        if (!(esPrev(actor) || actor.rol === 'jefe_terreno' || (actor.rol === 'supervisor' && actor.empresa === p.empresa))) return rechazar(db, ev, 'Entrega Prevención o la jefatura de su empresa');
        if (!firmaOk(db, p, d.pin)) return rechazar(db, ev, 'PIN incorrecto: el trabajador firma la recepción de su copia');
        k.riohs.entregas.push({ persona: p.id, empresa: p.empresa, version: rv.version, fecha: f, gratuita: true });
        return listo(db, ev, { persona: p.id, version: rv.version });
      }
      // ---- 7. Comités ----
      case 'K_COMITE_CONSTITUIR': {
        if (!(esPrev(actor) || esRep(db, actor))) return rechazar(db, ev, 'Lo constituye Prevención o el representante legal');
        var emp = porId(db.empresas, d.empresa);
        if (!emp || emp.tipo === 'mandante') return rechazar(db, ev, 'Empresa no válida');
        if (['CPHS', 'DELEGADO', 'CPHS_FAENA'].indexOf(d.tipo) < 0) return rechazar(db, ev, 'Tipo de comité: CPHS, DELEGADO o CPHS_FAENA');
        if (k.comites.some(function (c) { return c.tipo === d.tipo && c.empresa === emp.id && !c.disuelto; })) return rechazar(db, ev, 'Ya hay uno constituido');
        var dot = dotacion(db, emp.id), integr, pres, secre;
        if (d.tipo === 'CPHS') {
          if (!(dot > k.config.umbralCphs)) return rechazar(db, ev, 'El comité paritario es obligatorio con más de ' + k.config.umbralCphs + ' trabajadores (esta empresa tiene ' + dot + ')');
          if (lista(d.patronales).length !== 3 || lista(d.trabajadores).length !== 3) return rechazar(db, ev, 'El CPHS tiene 3 representantes patronales y 3 de los trabajadores (Ley 16.744 art. 66)');
          integr = d.patronales.concat(d.trabajadores); pres = d.presidente; secre = d.secretario;
        } else if (d.tipo === 'DELEGADO') {
          if (dot < k.config.umbralDelegadoDesde || dot > k.config.umbralCphs) return rechazar(db, ev, 'El delegado de SST corresponde a empresas de ' + k.config.umbralDelegadoDesde + ' a ' + k.config.umbralCphs + ' trabajadores (esta tiene ' + dot + ')');
          if (!d.delegado) return rechazar(db, ev, 'Falta el delegado elegido por los trabajadores');
          integr = [d.delegado]; pres = d.delegado; secre = null;
        } else {
          if (!(nomina(db).length > k.config.umbralCphs) || !(d.duracionDias > k.config.diasMinFaenaComite)) return rechazar(db, ev, 'El comité de faena exige más de ' + k.config.umbralCphs + ' trabajadores y una faena de más de ' + k.config.diasMinFaenaComite + ' días (DS 76 art. 14)');
          if (lista(d.patronales).length !== 3 || lista(d.trabajadores).length !== 3) return rechazar(db, ev, 'El comité de faena tiene 3 representantes de cada parte');
          integr = d.patronales.concat(d.trabajadores); pres = d.presidente; secre = d.secretario;
        }
        if (integr.some(function (x) { return !exigido(db, porId(db.personas, x)); }) || new Set(integr).size !== integr.length) return rechazar(db, ev, 'Integrantes no válidos o repetidos');
        if (d.tipo !== 'DELEGADO' && (integr.indexOf(pres) < 0 || integr.indexOf(secre) < 0 || pres === secre)) return rechazar(db, ev, 'Falta presidente y secretario entre los integrantes');
        var cm = { id: (d.tipo === 'DELEGADO' ? 'DEL-' : d.tipo === 'CPHS' ? 'CPHS-' : 'CPHSF-') + String(++k.seq.com).padStart(3, '0'), tipo: d.tipo, empresa: emp.id, constituidoEn: f, vigenciaHasta: sumar(f, 730), presidente: pres, secretario: secre, integrantes: integr.slice(), cursoOAL: null, actas: [] };
        cm.actas.push({ id: 'ACTA-' + String(++k.seq.act).padStart(4, '0'), fecha: f, tipo: 'CONSTITUCION', acuerdos: ['Constitución y elección según la norma'], firmadaPor: d.tipo === 'DELEGADO' ? [pres] : [pres, secre] });
        k.comites.push(cm);
        return listo(db, ev, { comite: cm.id, tipo: cm.tipo, empresa: emp.id, integrantes: integr.length });
      }
      case 'K_COMITE_CURSO': {
        if (!esPrev(actor)) return rechazar(db, ev, 'Lo registra Prevención');
        var cc = k.comites.filter(function (c) { return c.id === d.comite; })[0];
        if (!cc || cc.tipo === 'DELEGADO') return rechazar(db, ev, 'El curso del organismo administrador es del comité paritario');
        if (f < cc.constituidoEn) return rechazar(db, ev, 'El curso no puede ser anterior a la constitución');
        cc.cursoOAL = { fecha: f, organismo: d.organismo || null };
        return listo(db, ev, { comite: cc.id, fecha: f });
      }
      case 'K_COMITE_ACTA': {
        var ca = k.comites.filter(function (c) { return c.id === d.comite; })[0];
        if (!ca || ca.disuelto) return rechazar(db, ev, 'Comité no encontrado');
        if (ca.integrantes.indexOf(actor.id) < 0) return rechazar(db, ev, 'El acta la registra un integrante del comité');
        if (['ORDINARIA', 'EXTRAORDINARIA'].indexOf(d.tipo) < 0) return rechazar(db, ev, 'Tipo de acta: ORDINARIA o EXTRAORDINARIA');
        if (!lista(d.acuerdos).length) return rechazar(db, ev, 'El acta lleva acuerdos');
        var firm = lista(d.firmadaPor);
        if (ca.tipo !== 'DELEGADO' && (firm.indexOf(ca.presidente) < 0 || firm.indexOf(ca.secretario) < 0)) return rechazar(db, ev, 'El acta la firman el presidente y el secretario');
        if (ca.tipo === 'DELEGADO' && firm.indexOf(ca.presidente) < 0) return rechazar(db, ev, 'El acta la firma el delegado');
        ca.actas.push({ id: 'ACTA-' + String(++k.seq.act).padStart(4, '0'), fecha: f, tipo: d.tipo, acuerdos: d.acuerdos.slice(), firmadaPor: firm.slice() });
        return listo(db, ev, { comite: ca.id, tipo: d.tipo });
      }
      // ---- 8. DS 76 ----
      case 'K_FAENA_REGISTRAR': {
        if (!(esPrev(actor) || actor.rol === 'jefe_terreno' || esRep(db, actor))) return rechazar(db, ev, 'Lo registra la empresa principal (jefe de terreno, Prevención o representante legal)');
        var ec = porId(db.empresas, d.empresa);
        if (!ec || ec.tipo !== 'contratista') return rechazar(db, ev, 'El registro de la faena es de empresas contratistas y subcontratistas');
        if (!texto(d.razonSocial) || !texto(d.oal) || !d.jefeFaena || !(d.dotacion > 0) || !fechaValida(d.inicio) || !fechaValida(d.termino) || d.contrato !== true) return rechazar(db, ev, 'Faltan datos del registro: razón social, organismo administrador, jefe de faena, dotación, fechas y copia del contrato (DS 76 art. 5)');
        if (!d.rut && !ec.simulacion) return rechazar(db, ev, 'Falta el RUT de la empresa');
        k.faena.registro = k.faena.registro.filter(function (x) { return x.empresa !== ec.id; });
        k.faena.registro.push({ empresa: ec.id, razonSocial: d.razonSocial, rut: d.rut || null, oal: d.oal, jefeFaena: d.jefeFaena, dotacion: d.dotacion, inicio: d.inicio, termino: d.termino, contrato: true, registradoEn: f });
        return listo(db, ev, { empresa: ec.id, dotacion: d.dotacion });
      }
      case 'K_FAENA_ANTECEDENTE': {
        if (!(esPrev(actor) || actor.rol === 'jefe_terreno' || esRep(db, actor))) return rechazar(db, ev, 'Lo registra la empresa principal');
        var an = k.faena.antecedentes;
        if (d.antecedente === 'CRONOGRAMA') an.cronograma = f;
        else if (d.antecedente === 'EVALUACION_RIESGOS' && porId(db.empresas, d.empresa)) an.evaluacionesRiesgos[d.empresa] = f;
        else if (d.antecedente === 'VISITA_OAL') an.visitasOAL.push({ fecha: f, referencia: d.referencia || null });
        else if (d.antecedente === 'ACTA_FISCALIZACION') an.actasFiscalizacion.push({ fecha: f, referencia: d.referencia || null });
        else return rechazar(db, ev, 'Antecedente no válido');
        return listo(db, ev, { antecedente: d.antecedente, empresa: d.empresa || null });
      }
      case 'K_REGLAMENTO_EMITIR': {
        if (!esRep(db, actor)) return rechazar(db, ev, 'El reglamento especial lo emite la empresa principal (representante legal)');
        if (!texto(d.version, 1) || lista(d.contenido).length < 4) return rechazar(db, ev, 'El reglamento lleva versión y contenido mínimo (encargado, coordinación, información, prohibiciones, auditorías, sanciones)');
        k.faena.reglamento = { version: d.version, fecha: f, emitidoPor: actor.id, contenido: d.contenido.slice() };
        return listo(db, ev, { version: d.version });
      }
      case 'K_REGLAMENTO_ENTREGAR': {
        if (!(esPrev(actor) || actor.rol === 'jefe_terreno')) return rechazar(db, ev, 'Lo entrega la empresa principal');
        var ee = porId(db.empresas, d.empresa), fr = porId(db.personas, d.firmadoPor);
        if (!ee || ee.tipo !== 'contratista' || !k.faena.reglamento) return rechazar(db, ev, 'Falta el reglamento especial o la empresa contratista');
        if (!fr || fr.empresa !== ee.id || ['supervisor', 'capataz', 'jefatura', 'jefe_terreno'].indexOf(fr.rol) < 0) return rechazar(db, ev, 'Firma el acuse un responsable de la empresa contratista');
        if (!firmaOk(db, fr, d.pin)) return rechazar(db, ev, 'PIN incorrecto: firma el responsable de la contratista');
        k.faena.entregas = k.faena.entregas.filter(function (x) { return !(x.empresa === ee.id && x.version === k.faena.reglamento.version); });
        k.faena.entregas.push({ empresa: ee.id, version: k.faena.reglamento.version, fecha: f, firmadoPor: fr.id, firmada: true });
        return listo(db, ev, { empresa: ee.id, version: k.faena.reglamento.version });
      }
      case 'K_SGSST_FAENA': {
        if (!esRep(db, actor)) return rechazar(db, ev, 'La política del sistema de gestión de la faena la firma el representante legal del mandante/principal');
        if (!texto(d.politica, 8) || lista(d.componentes).length < 4) return rechazar(db, ev, 'El sistema de gestión lleva política, organización, diagnóstico unificado y programa (DS 76 arts. 7 a 10)');
        k.faena.sgsst = { fecha: f, politica: d.politica, componentes: d.componentes.slice(), aprobadoPor: actor.id };
        return listo(db, ev, { componentes: d.componentes.length });
      }
      // ---- 9. Emergencias ----
      case 'K_PLAN_EMERGENCIA': {
        if (!esRep(db, actor)) return rechazar(db, ev, 'El plan lo aprueba el representante legal (lo elabora Prevención)');
        if (!texto(d.version, 1) || lista(d.componentes).length < 4) return rechazar(db, ev, 'El plan lleva eventos probables, planos y vías de evacuación, brigadas, alarma y coordinación externa (DS 44 arts. 19 y 20)');
        k.emergencia.planes.push({ version: d.version, fecha: f, aprobadoPor: actor.id, componentes: d.componentes.slice() });
        return listo(db, ev, { version: d.version });
      }
      case 'K_SIMULACRO': {
        if (!esPrev(actor)) return rechazar(db, ev, 'Lo registra Prevención');
        if (!texto(d.escenario) || !(d.participantes > 0) || !texto(d.acta, 8)) return rechazar(db, ev, 'El simulacro lleva escenario, participantes y acta');
        k.emergencia.simulacros.push({ fecha: f, escenario: d.escenario, participantes: d.participantes, acta: d.acta, registradoPor: actor.id });
        return listo(db, ev, { escenario: d.escenario, participantes: d.participantes });
      }
      // ---- 10. DS 594 diario ----
      case 'K_DS594_CONTROL': {
        if (!(esPrev(actor) || actor.rol === 'medio_ambiente' || actor.rol === 'jefe_terreno' || actor.rol === 'capataz')) return rechazar(db, ev, 'Lo registra la jefatura de terreno, Prevención o medio ambiente');
        var cs = ['agua', 'serviciosHigienicos', 'comedor'], dd = d;
        if (cs.some(function (c) { return !dd[c] || typeof dd[c].ok !== 'boolean'; }) || !dd.uv || typeof dd.uv.publicado !== 'boolean' || !dd.calor || typeof dd.calor.monitoreo !== 'boolean') return rechazar(db, ev, 'El control diario revisa agua potable, servicios higiénicos, comedor, índice UV publicado y calor');
        if (k.ds594.some(function (x) { return x.fecha === f; })) return rechazar(db, ev, 'Ya hay un control registrado ese día');
        // Agua (DS 594): tres reglas distintas. Si se informan los datos de la regla, se calcula; si no, vale lo declarado en `ok`.
        var fallasAgua = reglasAgua(dd.agua);
        if (fallasAgua.length) dd.agua = Object.assign({}, dd.agua, { ok: false, reglasIncumplidas: fallasAgua });
        var okTodo = cs.every(function (c) { return dd[c].ok; }) && dd.uv.publicado && dd.calor.monitoreo;
        k.ds594.push({ fecha: f, agua: dd.agua, serviciosHigienicos: dd.serviciosHigienicos, comedor: dd.comedor, uv: dd.uv, calor: dd.calor, ok: okTodo, observaciones: d.observaciones || null, por: actor.id });
        return listo(db, ev, { fecha: f, ok: okTodo });
      }
      // ---- 11. Protocolos MINSAL ----
      case 'K_PROTOCOLO': {
        if (!esPrev(actor)) return rechazar(db, ev, 'Los protocolos los gestiona Prevención');
        if (!PROTOCOLOS[d.protocolo]) return rechazar(db, ev, 'Protocolo no válido (' + Object.keys(PROTOCOLOS).join(', ') + ')');
        if (['VIGENTE', 'PENDIENTE', 'NO_APLICA'].indexOf(d.estado) < 0) return rechazar(db, ev, 'Estado: VIGENTE, PENDIENTE o NO_APLICA');
        if (d.estado === 'NO_APLICA' && !texto(d.motivo, 8)) return rechazar(db, ev, 'Para decir que no aplica hay que explicar por qué');
        if (d.estado === 'VIGENTE' && !texto(d.responsable)) return rechazar(db, ev, 'Falta el responsable');
        k.protocolos[d.protocolo] = { protocolo: d.protocolo, nombre: PROTOCOLOS[d.protocolo], estado: d.estado, desde: f, responsable: d.responsable || null, motivo: d.motivo || null, verificar: true };
        return listo(db, ev, { protocolo: d.protocolo, estado: d.estado });
      }
      // ---- 12. Ley Karin (solo protocolo y difusión; nunca denuncias) ----
      case 'K_KARIN_PROTOCOLO': {
        if (!esRep(db, actor)) return rechazar(db, ev, 'El protocolo lo aprueba el representante legal');
        if (!texto(d.version, 1) || lista(d.componentes).length < 4) return rechazar(db, ev, 'El protocolo identifica peligros, riesgos psicosociales, medidas, capacitación e investigación (Código del Trabajo art. 211-A)');
        k.karin.protocolos.push({ version: d.version, fecha: f, aprobadoPor: actor.id, componentes: d.componentes.slice() });
        return listo(db, ev, { version: d.version });
      }
      case 'K_KARIN_DIFUSION': {
        if (!(esPrev(actor) || actor.rol === 'jefe_terreno')) return rechazar(db, ev, 'La difunde Prevención o el jefe de terreno');
        var kp = k.karin.protocolos.slice(-1)[0];
        if (!kp) return rechazar(db, ev, 'Primero se aprueba el protocolo');
        if (!texto(d.medio) || !lista(d.asistentes).length) return rechazar(db, ev, 'La difusión lleva medio y asistentes');
        if (d.asistentes.some(function (x) { return !exigido(db, porId(db.personas, x)); })) return rechazar(db, ev, 'Hay asistentes fuera de la nómina de la obra');
        k.karin.difusiones.push({ fecha: f, version: kp.version, medio: d.medio, asistentes: d.asistentes.slice() });
        return listo(db, ev, { version: kp.version, asistentes: d.asistentes.length });
      }
      case 'K_HORAS_HOMBRE': {
        if (!esPrev(actor)) return rechazar(db, ev, 'Las horas-hombre las registra Prevención');
        if (!/^\d{4}-\d{2}$/.test(d.mes || '') || !(d.horas > 0) || !(d.trabajadores > 0)) return rechazar(db, ev, 'Indica mes (AAAA-MM), horas-hombre y número de trabajadores');
        k.horasHombre = k.horasHombre.filter(function (x) { return x.mes !== d.mes; }); k.horasHombre.push({ mes: d.mes, horas: d.horas, trabajadores: d.trabajadores });
        return listo(db, ev, { mes: d.mes, horas: d.horas });
      }
      // ---- 13. Accidentes ----
      case 'K_ACCIDENTE_REGISTRAR': {
        if (!esMando(actor)) return rechazar(db, ev, 'Lo registra la línea de mando o Prevención');
        if (['LEVE', 'TRAYECTO', 'GRAVE', 'FATAL'].indexOf(d.tipo) < 0) return rechazar(db, ev, 'Tipo: LEVE, TRAYECTO, GRAVE o FATAL');
        p = porId(db.personas, d.persona);
        if (!exigido(db, p)) return rechazar(db, ev, 'La persona accidentada no está en la nómina de la obra');
        if (!texto(d.relato, 10)) return rechazar(db, ev, 'Falta el relato de los hechos');
        var ocu = d.ocurridoEn || A.ahora(db);
        if (isNaN(ms(ocu)) || ms(ocu) > ms(A.ahora(db))) return rechazar(db, ev, 'La fecha y hora del accidente no es válida');
        var enTrabajo = d.tipo !== 'TRAYECTO';
        if (enTrabajo && !porId(db.areas, d.area)) return rechazar(db, ev, 'Indica el área donde ocurrió');
        if (d.tipo === 'GRAVE' && CAUSALES_GRAVE.indexOf(d.causal) < 0) return rechazar(db, ev, 'Un accidente grave tiene una causal de la SUSESO (' + CAUSALES_GRAVE.join(', ') + ')');
        // Compendio SUSESO Libro IV, Título I, Letra D: la caída de más de 1,8 m, el rescate o la afectación masiva SIN lesiones evidentes igual se avisa y se suspende
        if (d.sinLesion && !(d.tipo === 'GRAVE' && ['CAIDA_ALTURA_MAS_1_8M', 'RESCATE', 'AFECTACION_MASIVA'].indexOf(d.causal) >= 0)) return rechazar(db, ev, 'Sin lesión solo se registra la caída de más de 1,8 m, el rescate o la afectación masiva: igual se avisa a la DT y a la Seremi y se suspende la faena');
        acc = { id: 'ACC-' + String(++k.seq.acc).padStart(4, '0'), tipo: d.tipo, persona: p.id, empresa: p.empresa, sexo: p.sexo || null, area: enTrabajo ? d.area : null, ocurridoEn: ocu, registradoEn: A.ahora(db), registradoPor: actor.id, relato: d.relato, causal: d.causal || null,
          conIncapacidad: !!d.conIncapacidad, diasPerdidos: d.diasPerdidos || 0, estado: d.tipo === 'LEVE' ? 'ATENCION_PRIMARIA_DERIVACION' : d.tipo === 'TRAYECTO' ? 'CONSTANCIA_TRAYECTO' : 'FAENA_SUSPENDIDA_CRITICA',
          sinLesion: !!d.sinLesion, diat: null, avisos: [], investigacion: null, medidas: [], suspension: null, reanudacion: null };
        var detenidas = [];
        if (d.tipo === 'GRAVE' || d.tipo === 'FATAL') {
          acc.suspension = { area: acc.area, desde: A.ahora(db), activa: true };
          (k.areasSuspendidas[acc.area] = k.areasSuspendidas[acc.area] || []).push(acc.id);
          db.asts.filter(function (a) { return a.area === acc.area && ['CERRADA', 'ANULADA', 'DETENIDA'].indexOf(a.estado) < 0; }).forEach(function (a) {
            C.aplicar(db, { tipo: 'C_DETENER', actor: actor.id, ast: a.id, datos: { motivo: 'Accidente ' + d.tipo.toLowerCase() + ' ' + acc.id + ': suspensión inmediata del área' } }); detenidas.push(a.id);
          });
        }
        k.accidentes.push(acc);
        // Gatillo de la MIPER: todo accidente del trabajo (no el de trayecto, que no es de la faena) obliga a revisarla
        if (enTrabajo && k.miper.versiones.length) {
          if (!k.miper.revisionPendiente) k.miper.revisionPendiente = { gatillo: 'ACCIDENTE', desde: hoy(db), motivos: [] };
          k.miper.revisionPendiente.motivos.push({ gatillo: 'ACCIDENTE', fecha: hoy(db), referencia: acc.id, por: actor.id });
        }
        return listo(db, ev, { accidente: acc.id, tipo: acc.tipo, area: acc.area, persona: p.id, suspendida: !!acc.suspension, astDetenidas: detenidas, vencenDiat: new Date(ms(ocu) + k.config.horasDiat * 3600000).toISOString() }, { accidente: acc }, acc.area);
      }
      case 'K_ACCIDENTE_DIAT': {
        acc = k.accidentes.filter(function (x) { return x.id === d.accidente; })[0];
        if (!acc) return rechazar(db, ev, 'Accidente no encontrado');
        if (acc.diat) return rechazar(db, ev, 'La DIAT ya fue emitida');
        var empleador = esPrev(actor) || esRep(db, actor) || actor.rol === 'jefe_terreno' || actor.rol === 'jefatura', subsidiaria = actor.id === acc.persona || miembroComite(db, actor);
        if (!empleador && !subsidiaria) return rechazar(db, ev, 'La DIAT la emite el empleador; si no lo hace, la puede emitir el trabajador, su familia, el comité paritario o el médico tratante (DS 101 art. 71)');
        var hrs = horas(acc.ocurridoEn, A.ahora(db));
        acc.diat = { emitidaEn: A.ahora(db), por: actor.id, subsidiaria: !empleador, horasDesdeAccidente: Math.round(hrs * 10) / 10, fueraDePlazo: hrs > k.config.horasDiat };
        return listo(db, ev, { accidente: acc.id, horas: acc.diat.horasDesdeAccidente, fueraDePlazo: acc.diat.fueraDePlazo, subsidiaria: acc.diat.subsidiaria });
      }
      case 'K_ACCIDENTE_AVISO': {
        acc = k.accidentes.filter(function (x) { return x.id === d.accidente; })[0];
        if (!acc) return rechazar(db, ev, 'Accidente no encontrado');
        if (!(esMando(actor) || esRep(db, actor))) return rechazar(db, ev, 'Avisa la línea de mando o Prevención');
        if (acc.tipo === 'TRAYECTO') return rechazar(db, ev, 'El accidente de trayecto no se avisa a la DT ni a la Seremi (Compendio SUSESO, Libro IV, Título I, Letra D)');
        if (acc.tipo === 'LEVE') return rechazar(db, ev, 'El aviso inmediato a la DT y a la Seremi es solo para accidentes graves y fatales');
        if (['DT', 'SEREMI'].indexOf(d.destino) < 0 || ['TELEFONO_600', 'WEB', 'CORREO', 'PRESENCIAL'].indexOf(d.medio) < 0 || !texto(d.folio)) return rechazar(db, ev, 'Indica destino (DT o SEREMI), medio y el folio o comprobante del aviso');
        if (acc.avisos.some(function (x) { return x.destino === d.destino; })) return rechazar(db, ev, 'Ese aviso ya fue registrado');
        var mins = Math.round((ms(A.ahora(db)) - ms(acc.registradoEn)) / 60000);
        acc.avisos.push({ destino: d.destino, medio: d.medio, folio: d.folio, en: A.ahora(db), minutosDesdeRegistro: mins, por: actor.id });
        if (acc.estado === 'FAENA_SUSPENDIDA_CRITICA' && ['DT', 'SEREMI'].every(function (x) { return acc.avisos.some(function (y) { return y.destino === x; }); })) acc.estado = 'EN_ESPERA_MEDIDAS_INMEDIATAS';
        return listo(db, ev, { accidente: acc.id, destino: d.destino, minutos: mins, tarde: mins > k.config.minutosAvisoAutoridad });
      }
      case 'K_ACCIDENTE_INVESTIGAR': {
        acc = k.accidentes.filter(function (x) { return x.id === d.accidente; })[0];
        if (!acc) return rechazar(db, ev, 'Accidente no encontrado');
        if (!esPrev(actor)) return rechazar(db, ev, 'La investigación la lidera Prevención junto al comité paritario (DS 44 art. 71)');
        if (acc.investigacion) return rechazar(db, ev, 'Ya hay una investigación registrada');
        if ((acc.tipo === 'GRAVE' || acc.tipo === 'FATAL') && d.metodo !== 'ARBOL_DE_CAUSAS') return rechazar(db, ev, 'En accidentes graves y fatales el método es el árbol de causas (Compendio SUSESO)');
        var part = lista(d.participantes), hayComite = k.comites.some(function (c) { return !c.disuelto && c.tipo !== 'DELEGADO'; }) || k.comites.some(function (c) { return c.tipo === 'DELEGADO' && c.empresa === acc.empresa; });
        if (!part.length || (hayComite && !part.some(function (x) { var q = porId(db.personas, x); return q && miembroComite(db, q); }))) return rechazar(db, ev, 'Participa el comité paritario o el delegado de SST');
        if (!lista(d.causas).length || !texto(d.informe, 10)) return rechazar(db, ev, 'La investigación lleva causas e informe');
        acc.investigacion = { registradaEn: A.ahora(db), metodo: d.metodo || 'OTRO', participantes: part.slice(), causas: d.causas.slice(), informe: d.informe, diasDesdeRegistro: dias(acc.registradoEn, A.ahora(db)) };
        return listo(db, ev, { accidente: acc.id, causas: d.causas.length });
      }
      case 'K_ACCIDENTE_MEDIDA': {
        acc = k.accidentes.filter(function (x) { return x.id === d.accidente; })[0];
        if (!acc) return rechazar(db, ev, 'Accidente no encontrado');
        if (!(esPrev(actor) || actor.rol === 'jefe_terreno')) return rechazar(db, ev, 'Las medidas las registra Prevención o el jefe de terreno');
        if (!texto(d.descripcion, 8) || !porId(db.personas, d.responsable) || !fechaValida(d.plazo)) return rechazar(db, ev, 'Cada medida lleva descripción, responsable y plazo');
        var md = { id: 'M' + String(++k.seq.med).padStart(3, '0'), descripcion: d.descripcion, responsable: d.responsable, plazo: d.plazo, inmediata: !!d.inmediata, estado: 'PENDIENTE', cerradaEn: null };
        acc.medidas.push(md);
        return listo(db, ev, { accidente: acc.id, medida: md.id, inmediata: md.inmediata });
      }
      case 'K_ACCIDENTE_MEDIDA_CERRAR': {
        acc = k.accidentes.filter(function (x) { return x.id === d.accidente; })[0];
        var med = acc && acc.medidas.filter(function (x) { return x.id === d.medida; })[0];
        if (!med || med.estado === 'CERRADA') return rechazar(db, ev, 'Medida no encontrada o ya cerrada');
        if (!(esPrev(actor) || med.responsable === actor.id)) return rechazar(db, ev, 'La cierra el responsable de la medida o Prevención');
        if (!texto(d.evidencia, 8)) return rechazar(db, ev, 'Falta la evidencia de que se implementó');
        med.estado = 'CERRADA'; med.cerradaEn = f; med.evidencia = d.evidencia;
        return listo(db, ev, { accidente: acc.id, medida: med.id });
      }
      case 'K_ACCIDENTE_REANUDAR': {
        acc = k.accidentes.filter(function (x) { return x.id === d.accidente; })[0];
        if (!acc || !acc.suspension || !acc.suspension.activa) return rechazar(db, ev, 'Ese accidente no tiene una suspensión activa');
        if (!(esRep(db, actor) || esPrev(actor) || actor.rol === 'jefe_terreno')) return rechazar(db, ev, 'Lo registra el jefe de terreno, Prevención o el representante legal');
        // Excepción del Compendio: sin lesión, si el organismo administrador lo confirma y los fiscalizadores aún no se constituyen, el empleador puede reanudar y debe comunicárselo
        var sinLesionOk = d.autoridad === 'SIN_LESION_CONFIRMADA' && acc.sinLesion && d.organismoConfirmaSinLesion === true && d.fiscalizadoresNoConstituidos === true && d.comunicadoAFiscalizadores === true && texto(d.folio);
        if (!sinLesionOk) {
          if (['DT', 'SEREMI'].indexOf(d.autoridad) < 0 || !texto(d.folio)) return rechazar(db, ev, 'La reanudación solo la autoriza la autoridad (DT o Seremi) que constató la suspensión: registra su folio o comprobante (Compendio SUSESO, Libro IV, Título I, Letra D). Sin lesión: el organismo administrador debe confirmarlo, los fiscalizadores no deben haberse constituido y hay que comunicarles la reanudación');
          if (!acc.avisos.some(function (x) { return x.destino === d.autoridad; })) return rechazar(db, ev, 'Esa autoridad no fue avisada del accidente');
        } else if (['DT', 'SEREMI'].some(function (dst) { return !acc.avisos.some(function (x) { return x.destino === dst; }); })) return rechazar(db, ev, 'Antes de reanudar sin lesión hay que haber avisado a la DT y a la Seremi');
        if (!acc.medidas.some(function (x) { return x.inmediata; }) || acc.medidas.some(function (x) { return x.inmediata && x.estado !== 'CERRADA'; })) return rechazar(db, ev, 'Faltan las medidas inmediatas cumplidas (al menos una registrada y todas cerradas)');
        acc.suspension.activa = false; acc.suspension.hasta = A.ahora(db);
        acc.reanudacion = { autoridad: d.autoridad, folio: d.folio, fecha: f, registradaPor: actor.id }; acc.estado = 'REANUDADA';
        k.areasSuspendidas[acc.area] = (k.areasSuspendidas[acc.area] || []).filter(function (x) { return x !== acc.id; });
        if (!k.areasSuspendidas[acc.area].length) delete k.areasSuspendidas[acc.area];
        return listo(db, ev, { accidente: acc.id, area: acc.area, autoridad: d.autoridad, folio: d.folio, areaLibre: !k.areasSuspendidas[acc.area] }, null, acc.area);
      }
      // ---- 14. Incidentes de alto potencial ----
      case 'K_INCIDENTE_REGISTRAR': {
        if (!exigido(db, actor) && !esMando(actor)) return rechazar(db, ev, 'Cualquier persona de la obra puede reportar un incidente');
        if (!porId(db.areas, d.area) || !texto(d.descripcion, 10)) return rechazar(db, ev, 'Indica el área y qué pasó');
        if (d.lesionados > 0) return rechazar(db, ev, 'Si hubo lesionados es un accidente: usa K_ACCIDENTE_REGISTRAR');
        var inc = { id: 'INC-' + String(++k.seq.inc).padStart(4, '0'), area: d.area, fecha: f, descripcion: d.descripcion, altoPotencial: !!d.altoPotencial, reportadoPor: actor.id, investigacion: null };
        k.incidentes.push(inc);
        if (inc.altoPotencial && k.miper.versiones.length && !k.miper.revisionPendiente) k.miper.revisionPendiente = { gatillo: 'RIESGO_GRAVE_INMINENTE', desde: f, motivos: [{ gatillo: 'RIESGO_GRAVE_INMINENTE', fecha: f, referencia: inc.id, por: actor.id }] };
        return listo(db, ev, { incidente: inc.id, altoPotencial: inc.altoPotencial }, { incidente: inc }, inc.area);
      }
      case 'K_INCIDENTE_INVESTIGAR': {
        var ic = k.incidentes.filter(function (x) { return x.id === d.incidente; })[0];
        if (!ic || ic.investigacion) return rechazar(db, ev, 'Incidente no encontrado o ya investigado');
        if (!esPrev(actor)) return rechazar(db, ev, 'Investiga Prevención');
        if (!lista(d.causas).length || !lista(d.medidas).length) return rechazar(db, ev, 'La investigación lleva causas y medidas');
        ic.investigacion = { fecha: f, por: actor.id, causas: d.causas.slice(), medidas: d.medidas.slice() };
        return listo(db, ev, { incidente: ic.id });
      }
    }
    return rechazar(db, ev, 'Evento sin manejar: ' + ev.tipo);
  }

  // ---------- Estadísticas (DS 44 art. 73 y 74; días cargo confirmados, fórmulas de frecuencia por verificar) ----------
  function estadisticas(db, o) {
    var k = db.cumplimiento; o = o || {};
    var desde = o.desde || '0000-00-00', hasta = o.hasta || hoy(db);
    var accs = k.accidentes.filter(function (a) { var f = a.ocurridoEn.slice(0, 10); return f >= desde && f <= hasta; });
    var del = accs.filter(function (a) { return a.tipo !== 'TRAYECTO'; });
    var hh = k.horasHombre.filter(function (x) { return x.mes >= mes(desde) && x.mes <= mes(hasta); });
    var horasTot = hh.reduce(function (s, x) { return s + x.horas; }, 0), prom = hh.length ? hh.reduce(function (s, x) { return s + x.trabajadores; }, 0) / hh.length : nomina(db).length;
    var con = del.filter(function (a) { return a.conIncapacidad; });
    var cargo = del.reduce(function (s, a) { return s + (a.diasPerdidos || 0) + (a.tipo === 'FATAL' ? k.config.diasCargoFatal : 0); }, 0);
    var por = function (sexo, lst) { return lst.filter(function (a) { return a.sexo === sexo; }).length; };
    return { periodo: { desde: desde, hasta: hasta }, accidentesTrabajo: del.length, accidentesTrayecto: accs.length - del.length, horasHombre: horasTot, trabajadoresPromedio: Math.round(prom * 10) / 10,
      accidentabilidad: prom ? Math.round(del.length / prom * 10000) / 100 : null, frecuencia: horasTot ? Math.round(con.length / horasTot * 1e6 * 100) / 100 : null, gravedad: horasTot ? Math.round(cargo / horasTot * 1e6 * 100) / 100 : null,
      porSexo: { H: { accidentes: por('H', del), trabajadores: nomina(db).filter(function (p) { return p.sexo === 'H'; }).length }, M: { accidentes: por('M', del), trabajadores: nomina(db).filter(function (p) { return p.sexo === 'M'; }).length } },
      verificar: true, nota: 'Días cargo por fallecimiento = 6.000: CONFIRMADO (Res. Ex. E 635/25 del ISP; el DS 44 art. 73 remite a esa tabla). Las fórmulas de frecuencia y accidentabilidad siguen por verificar.' };
  }

  // ---------- Auditor ----------
  function fila(id, obligacion, norma, estado, detalle, extra) { return Object.assign({ id: id, obligacion: obligacion, norma: norma, estado: estado, detalle: detalle, problemas: [], alertas: [] }, extra || {}); }
  function veredicto(r) { if (r.problemas.length) { r.estado = 'NO_CUMPLE'; r.detalle = r.problemas.join(' | '); } else if (r.alertas.length) r.detalle = (r.detalle ? r.detalle + ' · ' : '') + 'Alerta: ' + r.alertas.join('; '); return r; }
  function auditar(db, fecha) {
    var k = db.cumplimiento, f = fecha || hoy(db), cfg = k.config, out = [], N = nomina(db), cod = function (p) { return p.codigo || p.id; };
    // 1. MIPER
    var r = fila('K-MIPER', 'MIPER versionada, informada y revisada', NORMAS.MIPER, 'CUMPLE', 'Vigente');
    var mv = k.miper.versiones.slice(-1)[0];
    if (!mv) r.problemas.push('No hay MIPER');
    else {
      var edad = dias(mv.fecha, f); r.detalle = 'Versión ' + mv.version + ' del ' + mv.fecha + ' (' + edad + ' días)';
      if (edad > cfg.diasMiper) r.problemas.push('Revisión anual vencida: ' + edad + ' días desde la última (máximo ' + cfg.diasMiper + ')');
      else if (edad >= cfg.diasAlertaMiper) r.alertas.push('la revisión anual vence en ' + (cfg.diasMiper - edad) + ' días');
      if (k.miper.revisionPendiente) {
        var esp = dias(k.miper.revisionPendiente.desde, f);
        if (esp > cfg.diasGraciaGatillo) r.problemas.push('Revisión pendiente por ' + k.miper.revisionPendiente.gatillo + ' hace ' + esp + ' días (plazo de gracia de ASTRA ' + cfg.diasGraciaGatillo + ')');
        else r.alertas.push('revisión pendiente por ' + k.miper.revisionPendiente.gatillo + ' desde el ' + k.miper.revisionPendiente.desde);
      }
      if (['trabajadores', 'linea_mando'].some(function (x) { return mv.informadaA.indexOf(x) < 0; })) r.problemas.push('No consta que se informó a trabajadores y línea de mando');
    }
    out.push(veredicto(r));
    // 2. Programa
    r = fila('K-PROGRAMA', 'Programa de trabajo preventivo (≤ 30 días desde la MIPER)', NORMAS.PROGRAMA, 'CUMPLE', 'Aprobado en plazo');
    if (!mv) r.estado = 'NO_APLICA', r.detalle = 'Sin MIPER';
    else {
      var pg = k.programa.versiones.filter(function (x) { return x.miperVersion === mv.version && x.estado === 'VIGENTE'; })[0], lim = sumar(mv.fecha, cfg.diasPrograma);
      if (!pg) { if (f > lim) r.problemas.push('Venció el plazo del ' + lim + ' para el programa de la MIPER v' + mv.version); else r.alertas.push('falta el programa de la MIPER v' + mv.version + ': vence el ' + lim); }
      else {
        if (dias(mv.fecha, pg.aprobadoEn) > cfg.diasPrograma) r.problemas.push('Programa aprobado fuera de plazo: ' + dias(mv.fecha, pg.aprobadoEn) + ' días desde la MIPER');
        if (!pg.aprobadoPor || pg.aprobadoPor !== k.representanteLegal) r.problemas.push('No está aprobado por el representante legal');
        var atr = pg.actividades.filter(function (a) { return a.plazo < f && a.avance < 100; });
        if (atr.length) r.alertas.push(atr.length + ' actividad(es) con plazo vencido y sin completar');
        r.detalle = 'Programa ' + pg.id + ' aprobado el ' + pg.aprobadoEn + ' (' + dias(mv.fecha, pg.aprobadoEn) + ' días desde la MIPER)';
      }
    }
    out.push(veredicto(r));
    // 3. IRL
    r = fila('K-IRL', 'Información de riesgos laborales (IRL) antes de iniciar labores', NORMAS.IRL, 'CUMPLE', N.length + ' trabajadores con IRL firmada');
    N.forEach(function (p) { var x = irlVigente(db, p), t = irlTardia(db, p); if (!x.ok) r.problemas.push(cod(p) + ': ' + x.motivo); else if (t) r.problemas.push(cod(p) + ': ' + t); });
    out.push(veredicto(r));
    // 4. EPP
    r = fila('K-EPP', 'Entrega gratuita de EPP con firma', NORMAS.EPP, 'CUMPLE', N.length + ' trabajadores con EPP básico firmado');
    N.forEach(function (p) { var x = eppBasico(db, p); if (!x.ok) r.problemas.push(cod(p) + ': falta ' + x.falta.join(', ')); });
    out.push(veredicto(r));
    // 5. Capacitaciones
    r = fila('K-CAPACITACION', 'Capacitaciones registradas (relator, asistentes, temario, fecha)', NORMAS.CAPACITACION, 'CUMPLE', k.capacitaciones.length + ' capacitaciones registradas');
    if (!k.capacitaciones.length) r.problemas.push('No hay capacitaciones registradas');
    N.forEach(function (p) { if (!k.capacitaciones.some(function (c) { return c.asistentes.indexOf(p.id) >= 0; })) r.problemas.push(cod(p) + ': sin ninguna capacitación registrada'); });
    out.push(veredicto(r));
    // 6. RIOHS
    r = fila('K-RIOHS', 'RIOHS vigente y entregado a cada trabajador', NORMAS.RIOHS, 'CUMPLE', 'RIOHS al día en las empresas con 10 o más trabajadores');
    var hayRiohs = false;
    db.empresas.filter(function (e) { return e.tipo !== 'mandante'; }).forEach(function (e) {
      var dot = dotacion(db, e.id); if (dot < 10) return; hayRiohs = true;   // umbral de 10 trabajadores permanentes ocupados normalmente (Código del Trabajo art. 153): CONFIRMADO
      var rv = k.riohs.vigentes[e.id];
      if (!rv) { r.problemas.push(e.nombre + ': no tiene RIOHS'); return; }
      if (dias(rv.fecha, f) > cfg.diasRiohs) r.problemas.push(e.nombre + ': RIOHS sin revisión hace más de un año');
      N.filter(function (p) { return p.empresa === e.id; }).forEach(function (p) { if (!k.riohs.entregas.some(function (x) { return x.persona === p.id && x.version === rv.version; })) r.problemas.push(cod(p) + ': sin copia del RIOHS'); });
    });
    if (!hayRiohs) { r.estado = 'NO_APLICA'; r.detalle = 'Ninguna empresa llega a 10 trabajadores'; }
    out.push(veredicto(r));
    // 7. Comités
    r = fila('K-COMITE', 'CPHS, delegado de SST y comité de faena con actas', NORMAS.COMITE, 'CUMPLE', 'Comités al día');
    var actasAlDia = function (c) {
      var m = mesSig(mes(c.constituidoEn)), fin = mes(f), faltan = [];
      for (; m < fin; m = mesSig(m)) if (!c.actas.some(function (a) { return mes(a.fecha) === m && a.tipo !== 'CONSTITUCION'; })) faltan.push(m);
      return faltan;
    };
    db.empresas.filter(function (e) { return e.tipo !== 'mandante'; }).forEach(function (e) {
      var dot = dotacion(db, e.id), tipo = dot > cfg.umbralCphs ? 'CPHS' : dot >= cfg.umbralDelegadoDesde ? 'DELEGADO' : null; if (!tipo) return;
      var c = k.comites.filter(function (x) { return x.empresa === e.id && x.tipo === tipo && !x.disuelto; })[0];
      if (!c) { r.problemas.push(e.nombre + ': falta ' + (tipo === 'CPHS' ? 'el comité paritario' : 'el delegado de SST')); return; }
      if (f > c.vigenciaHasta) r.problemas.push(c.id + ': mandato vencido el ' + c.vigenciaHasta);
      if (tipo === 'CPHS') {
        actasAlDia(c).forEach(function (m) { r.problemas.push(c.id + ': sin acta de reunión mensual en ' + m); });
        if (!c.cursoOAL && dias(c.constituidoEn, f) > cfg.mesesCursoComite * 30) r.problemas.push(c.id + ': sin curso de orientación del organismo administrador en el primer semestre');
      }
    });
    var diasFaena = k.inicioObra ? dias(k.inicioObra, f) : null; // DS 76 art. 14: más de 25 trabajadores mantenidos por más de 30 días corridos
    if (N.length > cfg.umbralCphs && (diasFaena === null || diasFaena > cfg.diasMinFaenaComite)) {
      var cf = k.comites.filter(function (x) { return x.tipo === 'CPHS_FAENA' && !x.disuelto; })[0];
      if (contratistas(db).length && !cf) r.problemas.push('Falta el comité paritario de faena (DS 76 art. 14: más de ' + cfg.umbralCphs + ' trabajadores por más de ' + cfg.diasMinFaenaComite + ' días corridos)');
      else if (cf) { actasAlDia(cf).forEach(function (m) { r.problemas.push(cf.id + ': sin acta de reunión mensual en ' + m); }); if (!cf.cursoOAL && dias(cf.constituidoEn, f) > cfg.mesesCursoComite * 30) r.problemas.push(cf.id + ': sin curso del organismo administrador'); }
    }
    out.push(veredicto(r));
    // 8. DS 76
    r = fila('K-DS76', 'DS 76: registro de la faena, reglamento especial firmado y sistema de gestión', NORMAS.DS76, 'CUMPLE', 'Registro y reglamento al día');
    var cts = contratistas(db);
    if (!cts.length) { r.estado = 'NO_APLICA'; r.detalle = 'No hay empresas contratistas'; }
    else {
      var fa = k.faena;
      cts.forEach(function (e) {
        var reg = fa.registro.filter(function (x) { return x.empresa === e.id; })[0];
        if (!reg) r.problemas.push(e.nombre + ': falta en el registro de la faena');
        if (!fa.antecedentes.evaluacionesRiesgos[e.id]) r.problemas.push(e.nombre + ': falta su evaluación de riesgos (MIPER) en el registro');
        if (sgsstAplica(db)) {
          var ent = fa.reglamento && fa.entregas.filter(function (x) { return x.empresa === e.id && x.version === fa.reglamento.version && x.firmada; })[0];
          var primera = fa.entregas.filter(function (x) { return x.empresa === e.id; }).map(function (x) { return x.fecha; }).sort()[0];
          if (!ent) r.problemas.push(e.nombre + ': sin reglamento especial firmado en su versión vigente');
          else if (reg && primera > reg.inicio) r.problemas.push(e.nombre + ': firmó el reglamento (' + primera + ') después de entrar a la faena (' + reg.inicio + ')');
        }
        if (reg && reg.dotacion !== dotacion(db, e.id)) r.alertas.push(e.nombre + ': la dotación del registro (' + reg.dotacion + ') no coincide con la nómina (' + dotacion(db, e.id) + ')');
      });
      if (!fa.antecedentes.cronograma) r.problemas.push('Falta el cronograma de obras en el registro');
      if (sgsstAplica(db) && !fa.sgsst) r.problemas.push('Faena con más de ' + cfg.umbralSgsst + ' trabajadores sin sistema de gestión de SST');
    }
    out.push(veredicto(r));
    // 9. Emergencias
    r = fila('K-EMERGENCIA', 'Plan de emergencia vigente y al menos un simulacro al año', NORMAS.EMERGENCIA, 'CUMPLE', 'Plan y simulacro al día');
    var plan = k.emergencia.planes.slice(-1)[0], sim = k.emergencia.simulacros.slice(-1)[0];
    if (!plan) r.problemas.push('No hay plan de emergencia'); else if (dias(plan.fecha, f) > cfg.diasPlan) r.problemas.push('Plan sin revisión anual desde el ' + plan.fecha);
    if (!sim) { if (!plan || dias(plan.fecha, f) > cfg.diasSimulacro) r.problemas.push('No hay simulacro registrado'); else r.alertas.push('aún no hay simulacro del año'); } else if (dias(sim.fecha, f) > cfg.diasSimulacro) r.problemas.push('El último simulacro fue el ' + sim.fecha + ' (más de un año)');
    out.push(veredicto(r));
    // 10. DS 594
    r = fila('K-DS594', 'Control diario DS 594 (agua, servicios higiénicos, comedor, UV, calor)', NORMAS.DS594, 'CUMPLE', 'Control del día registrado', { verificar: true });
    var cd = k.ds594.filter(function (x) { return x.fecha === f; })[0];
    if (!cd) r.problemas.push('Falta el control del día ' + f);
    else if (!cd.ok) r.problemas.push('El control del ' + f + ' encontró condiciones fuera de norma' + (cd.observaciones ? ': ' + cd.observaciones : ''));
    out.push(veredicto(r));
    // 11. Protocolos
    r = fila('K-PROTOCOLOS', 'Protocolos MINSAL aplicables con estado', NORMAS.PROTOCOLOS, 'CUMPLE', 'Protocolos vigentes', { verificar: true });
    Object.keys(PROTOCOLOS).forEach(function (kk) {
      var pt = k.protocolos[kk];
      if (!pt) r.problemas.push(PROTOCOLOS[kk] + ': sin registro de aplicabilidad');
      else if (pt.estado === 'PENDIENTE') r.problemas.push(PROTOCOLOS[kk] + ': pendiente de implementar');
    });
    out.push(veredicto(r));
    // 12. Karin
    r = fila('K-KARIN', 'Protocolo de prevención de acoso y violencia (Ley Karin) vigente y difundido', NORMAS.KARIN, 'CUMPLE', 'Protocolo difundido a todo el personal');
    var kp2 = k.karin.protocolos.slice(-1)[0];
    if (!kp2) r.problemas.push('No hay protocolo');
    else {
      var cubiertos = {}; k.karin.difusiones.filter(function (x) { return x.version === kp2.version; }).forEach(function (x) { x.asistentes.forEach(function (a) { cubiertos[a] = true; }); });
      var sin = N.filter(function (p) { return !cubiertos[p.id]; }); if (sin.length) r.problemas.push('Protocolo sin difundir a ' + sin.length + ' persona(s)' + (sin.length <= 5 ? ': ' + sin.map(cod).join(', ') : ''));
    }
    out.push(veredicto(r));
    // 13. Accidentes
    r = fila('K-ACCIDENTES', 'Accidentes: DIAT ≤ 24 h, suspensión, avisos, investigación, medidas y reanudación autorizada', NORMAS.ACCIDENTES, 'CUMPLE', k.accidentes.length + ' accidente(s) con su flujo al día');
    if (!k.accidentes.length) { r.estado = 'NO_APLICA'; r.detalle = 'Sin accidentes registrados'; }
    k.accidentes.forEach(function (a) {
      var ahora = A.ahora(db), hrs = a.diat ? a.diat.horasDesdeAccidente : horas(a.ocurridoEn, ahora);
      if (!a.diat && hrs > cfg.horasDiat) r.problemas.push(a.id + ': DIAT sin emitir pasadas ' + cfg.horasDiat + ' h (' + Math.round(hrs) + ' h)');
      else if (!a.diat) r.alertas.push(a.id + ': DIAT pendiente, quedan ' + Math.max(0, Math.round(cfg.horasDiat - hrs)) + ' h');
      else if (a.diat.fueraDePlazo) r.problemas.push(a.id + ': DIAT emitida fuera de plazo (' + a.diat.horasDesdeAccidente + ' h)');
      if (a.tipo === 'GRAVE' || a.tipo === 'FATAL') {
        ['DT', 'SEREMI'].forEach(function (dst) {
          var av = a.avisos.filter(function (x) { return x.destino === dst; })[0];
          if (!av) { if (horas(a.registradoEn, ahora) * 60 > cfg.minutosAvisoAutoridad) r.problemas.push(a.id + ': sin aviso inmediato a ' + dst); else r.alertas.push(a.id + ': falta avisar a ' + dst); }
          else if (av.minutosDesdeRegistro > cfg.minutosAvisoAutoridad) r.problemas.push(a.id + ': aviso a ' + dst + ' tardío (' + av.minutosDesdeRegistro + ' min; plazo interno de ASTRA ' + cfg.minutosAvisoAutoridad + ' min: la norma pide aviso inmediato)');
        });
        if (a.suspension && a.suspension.activa) r.alertas.push(a.id + ': ' + a.area + ' sigue suspendida hasta la reanudación autorizada');
        if (a.suspension && !a.suspension.activa && !a.reanudacion) r.problemas.push(a.id + ': reanudó sin autorización registrada');
      }
      if (!a.investigacion) { var d2 = dias(a.registradoEn, f); if (d2 > cfg.diasInvestigacion) r.problemas.push(a.id + ': sin investigación a los ' + d2 + ' días (plazo ' + cfg.diasInvestigacion + ')'); else r.alertas.push(a.id + ': investigación pendiente'); }
      a.medidas.forEach(function (m) { if (m.estado !== 'CERRADA' && m.plazo < f) r.problemas.push(a.id + ': medida ' + m.id + ' vencida el ' + m.plazo); });
    });
    out.push(veredicto(r));
    // 14. Incidentes
    r = fila('K-INCIDENTES', 'Investigación de incidentes de alto potencial', NORMAS.INCIDENTES, 'CUMPLE', 'Incidentes investigados');
    var altos = k.incidentes.filter(function (x) { return x.altoPotencial; });
    if (!altos.length) { r.estado = 'NO_APLICA'; r.detalle = 'Sin incidentes de alto potencial'; }
    altos.forEach(function (x) { if (!x.investigacion) { var d3 = dias(x.fecha, f); if (d3 > cfg.diasInvestigarIncidente) r.problemas.push(x.id + ': sin investigar a los ' + d3 + ' días (plazo de ASTRA ' + cfg.diasInvestigarIncidente + ')'); else r.alertas.push(x.id + ': por investigar'); } });
    out.push(veredicto(r));
    // 15. Estadísticas
    r = fila('K-ESTADISTICAS', 'Estadísticas de accidentabilidad, frecuencia y gravedad (por sexo)', NORMAS.ESTADISTICAS, 'CUMPLE', 'Horas-hombre del mes anterior registradas', { verificar: true });
    var anterior = mes(sumar(f.slice(0, 7) + '-01', -1));
    if (k.inicioObra && mes(k.inicioObra) > anterior) { r.estado = 'NO_APLICA'; r.detalle = 'La obra empezó este mes'; }
    else if (!k.horasHombre.some(function (x) { return x.mes === anterior; })) r.problemas.push('Faltan las horas-hombre de ' + anterior);
    if (N.some(function (p) { return !p.sexo; })) r.problemas.push('Hay personas sin sexo registrado: no se puede desagregar (DS 44 art. 74)');
    out.push(veredicto(r));
    // 16. Bitácora
    r = fila('K-BITACORA', 'Bitácora inalterable (cadena con hash)', NORMAS.BITACORA, 'CUMPLE', '');
    var cad = A.verificarCadena(db);
    if (cad.ok) r.detalle = cad.eventos + ' eventos encadenados e íntegros'; else r.problemas.push('Cadena rota en el evento ' + cad.rotaEn);
    out.push(veredicto(r));
    return out.map(function (x) { return { id: x.id, obligacion: x.obligacion, norma: x.norma, estado: x.estado, detalle: x.detalle, problemas: x.problemas, alertas: x.alertas, verificar: !!x.verificar }; });
  }
  function alertas(db, fecha) {
    var l = []; auditar(db, fecha).forEach(function (x) { x.alertas.forEach(function (a) { l.push({ id: x.id, tipo: 'ALERTA', mensaje: a }); }); x.problemas.forEach(function (a) { l.push({ id: x.id, tipo: 'INCUMPLIMIENTO', mensaje: a }); }); });
    return l;
  }

  var K = { VERSION: 1, TIPOS: TIPOS, GATILLOS: GATILLOS, EPP_BASICO: EPP_BASICO, CAUSALES_GRAVE: CAUSALES_GRAVE, PROTOCOLOS: PROTOCOLOS, activar: activar, aplicar: aplicar, auditar: auditar, alertas: alertas, estadisticas: estadisticas, nomina: nomina,
    requisitosIngreso: requisitosIngreso, irlTardia: irlTardia, areaSuspendida: areaSuspendida, puerta: puerta, puertaPersona: puertaPersona, sgsstAplica: sgsstAplica, dotacion: dotacion, irlVigente: irlVigente, eppBasico: eppBasico, hoy: hoy, dias: dias, sumar: sumar };
  if (typeof module !== 'undefined') module.exports = K; else g.ASTRA_K = K;
})(this);
