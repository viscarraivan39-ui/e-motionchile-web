// ASTRA · nómina de terreno y control diario de incorporación a AST por cuadrilla (D-036, D-037).
// No usa reloj control: compara la nómina programada con las incorporaciones registradas en AST del turno, en todas las
// áreas de la empresa o contrato. No toma la falta de AST como prueba de ausencia ni como falta disciplinaria.
(function (g) {
  'use strict';
  var A = (typeof module !== 'undefined') ? require('./motor.js') : g.ASTRA;
  var C = (typeof module !== 'undefined') ? require('./cuadrilla.js') : g.ASTRA_C;
  var porId = A.porId;
  // Tipos de aviso del control de cuadrillas (prioridad y si piden acción)
  C.AVISOS.CUADRILLA_CONTROL = 'inmediato'; C.AVISOS.CUADRILLA_PERSONA = 'inmediato'; C.AVISOS.CUADRILLA_ESCALADA = 'inmediato'; C.AVISOS.CUADRILLA_COMPLETA = 'resumen';
  C.ACCION.CUADRILLA_CONTROL = 1; C.ACCION.CUADRILLA_PERSONA = 1; C.ACCION.CUADRILLA_ESCALADA = 1;
  var FUNCION_TXT = { ejecutante: 'Ejecutante de tareas', supervisor: 'Supervisor o encargado', verificador: 'Inspector o verificador', aprobador: 'Aprobador', ocasional: 'Participante ocasional en terreno' };
  var ESTADO_TXT = { SIN_REGISTRO: 'Sin incorporación registrada', SIN_VIGENTE: 'Tuvo AST en el turno, sin participación vigente ahora', INCOMPLETA: 'Incorporación iniciada, pero incompleta', REQUISITOS: 'Pendiente por requisitos incumplidos', APROBACION: 'Pendiente de verificación o aprobación', HABILITADO: 'Habilitado para la tarea', BLOQUEADO: 'Bloqueado por un hallazgo posterior' };
  var RANGO = { SIN_VIGENTE: -1, SIN_REGISTRO: 0, INCOMPLETA: 1, REQUISITOS: 2, BLOQUEADO: 3, APROBACION: 4, HABILITADO: 5 };
  var MOTIVOS = {
    NO_ASISTIO: { txt: 'No asistió', efecto: 'fuera' },
    REASIGNADO: { txt: 'Reasignado a otra cuadrilla o área', efecto: 'fuera' },
    CAPACITACION: { txt: 'En charla, inducción o capacitación', efecto: 'temporal' },
    PERMISO_DIFERIDO: { txt: 'Permiso o ingreso diferido', efecto: 'temporal' },
    PENDIENTE_ASIGNACION: { txt: 'Pendiente de asignación de tarea', efecto: 'pendiente' },
    ACCESO: { txt: 'Problema de acceso o conectividad', efecto: 'pendiente' },
    INCORPORACION_INCOMPLETA: { txt: 'Incorporación pendiente de completar', efecto: 'pendiente' },
    REQUISITO_PENDIENTE: { txt: 'Requisito o aprobación pendiente', efecto: 'pendiente' },
    OTRO: { txt: 'Otro motivo', efecto: 'pendiente' }
  };

  // ---------- Hora local de la faena ----------
  function local(iso) {
    var s = new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Santiago', hour12: false });
    return { fecha: s.slice(0, 10), hora: s.slice(11, 16) };
  }
  function aMin(hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1]); }
  function deMin(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

  function preparar(db) {
    if (db.cuadrillas) return db;
    var basica = function () { return JSON.parse(JSON.stringify(porId(db.personas, 'p-carlos').hab)); };
    [['p-andres', '49.000.001-1', 'Andrés Demo'], ['p-benjamin', '49.000.002-K', 'Benjamín Demo'], ['p-cristobal', '49.000.003-8', 'Cristóbal Demo'], ['p-daniel', '49.000.004-6', 'Daniel Demo']].forEach(function (x, i) {
      db.personas.push({ id: x[0], rut: x[1], ingreso: 'ING-02' + i, nombre: x[2], empresa: 'e-principal', rol: 'trabajador', funciones: [], cargo: 'Jornal', hab: basica(), comp: {}, pin: null, ausente: false });
      db.asignaciones.push({ persona: x[0], permisos: ['consultar', 'crear'], alcance: { empresa: 'e-principal' } });
    });
    db.personas.push({ id: 'p-camila', rut: '49.000.005-4', ingreso: 'ING-030', nombre: 'Camila Demo', empresa: 'e-principal', rol: 'trabajador', funciones: [], cargo: 'Inspectora de calidad', hab: basica(), comp: {}, pin: null, ausente: false });
    db.asignaciones.push({ persona: 'p-camila', permisos: ['consultar', 'crear'], alcance: { empresa: 'e-principal' } });
    // D-037: función en terreno y nómina activa (las cuentas solo administrativas o de consulta no entran)
    var funcion = { trabajador: 'ejecutante', operador: 'ejecutante', capataz: 'supervisor', supervisor: 'supervisor', jefe_terreno: 'supervisor', prevencion: 'verificador', medio_ambiente: 'verificador', mandante: 'aprobador' };
    db.personas.forEach(function (p) {
      p.funcionTerreno = p.id === 'p-camila' ? 'ocasional' : funcion[p.rol] || null;
      p.enNominaTerreno = !!p.funcionTerreno && p.rol !== 'administrador';
    });
    db.cuadrillas = [
      { id: 'CU-01', nombre: 'Cuadrilla de Pedro Demo', empresa: 'e-principal', responsable: 'p-pedro', reemplazo: 'p-carlos', jefatura: 'p-ana', turno: 'dia',
        integrantes: ['p-juan', 'p-tomas', 'p-felipe', 'p-mario', 'p-andres', 'p-benjamin', 'p-cristobal', 'p-daniel', 'p-jorge', 'p-luis'] },
      { id: 'CU-02', nombre: 'Cuadrilla de Raúl Demo', empresa: 'e-contratista', responsable: 'p-raul', reemplazo: null, jefatura: 'p-ana', turno: 'dia', integrantes: ['p-diego'] }
    ];
    // Configurable por la empresa (D-036 §2). No autoriza a trabajar: solo detecta pendientes.
    db.config.controlCuadrillas = { inicio: '07:00', primerControl: '07:10', cada: 10, hasta: '09:00', recordatorioCada: 30, escalarTras: 30, nombresHasta: 5 };
    db.nominaExcepciones = []; db.nominaGestiones = []; db.nominaControles = [];
    return db;
  }

  // ---------- Estado de cada persona en el turno (D-036 §4, todas las áreas: §B.1) ----------
  function astsDelTurno(db, empresa, fecha) {
    return db.asts.filter(function (a) { return a.modo === 'cuadrilla' && a.ficha && a.empresa === empresa && ['CERRADA', 'ANULADA', 'REVISION_DOCUMENTAL'].indexOf(a.estado) < 0 && local(a.creadaEn).fecha === fecha; });
  }
  // D-038: puede tener varias participaciones en el día (otras áreas u otras tareas). Cuenta una sola persona:
  // «registrado» = tuvo una incorporación firmada en el turno; el estado es el de su participación vigente actual.
  function estadoPersona(db, pid, fecha) {
    var p = porId(db.personas, pid), mejor = { estado: 'SIN_REGISTRO', ast: null, area: null }, participaciones = [], tuvo = false;
    astsDelTurno(db, p.empresa, fecha).concat(db.asts.filter(function (a) { return a.modo === 'cuadrilla' && a.ficha && a.empresa === p.empresa && a.estado === 'CERRADA' && local(a.creadaEn).fecha === fecha; })).forEach(function (a) {
      var i = C.integrante(a, pid); if (!i) return;
      var pa = C.participacion(i), e;
      if (i.bloqueoHallazgo) e = 'BLOQUEADO';
      else if (i.estado === 'PENDIENTE_REQUISITO') e = 'REQUISITOS';
      else if (i.estado !== 'FIRMADO') e = 'INCOMPLETA';
      else e = C.inicio(db, a, pid).ok ? 'HABILITADO' : 'APROBACION';
      if (i.firma) tuvo = true;
      participaciones.push({ ast: a.id, area: a.area, astNombre: a.nombre, estado: e, participacion: pa.estado, historial: pa.historial, firma: i.firma ? i.firma.en : null });
      // La AST cerrada solo sirve como antecedente («tuvo AST»), nunca como participación vigente
      if (a.estado !== 'CERRADA' && pa.estado === 'VIGENTE' && RANGO[e] > RANGO[mejor.estado]) mejor = { estado: e, ast: a.id, area: a.area, astNombre: a.nombre };
    });
    if (mejor.estado === 'SIN_REGISTRO' && participaciones.length) mejor.estado = 'SIN_VIGENTE';
    // Completa el control solo una participación vigente y firmada (D-036 §4); lo cerrado o pausado queda como «tuvo AST»
    mejor.registrado = ['APROBACION', 'HABILITADO', 'BLOQUEADO'].indexOf(mejor.estado) >= 0;
    mejor.tuvoAst = tuvo; mejor.participaciones = participaciones;
    return mejor;
  }
  function gestionVigente(db, cuId, pid, fecha) { return db.nominaGestiones.filter(function (x) { return x.cuadrilla === cuId && x.persona === pid && x.fecha === fecha; }).slice(-1)[0] || null; }
  function excepcion(db, pid, fecha) { return db.nominaExcepciones.filter(function (x) { return x.persona === pid && x.fecha === fecha; }).slice(-1)[0] || null; }
  // Quiénes se esperan en el turno: ejecutantes de la nómina activa, asignados a la cuadrilla, sin excepción registrada
  function esperados(db, cu, fecha) {
    var base = cu.integrantes.filter(function (pid) { var p = porId(db.personas, pid); return p && p.enNominaTerreno && p.funcionTerreno === 'ejecutante'; });
    var fuera = base.filter(function (pid) { var ex = excepcion(db, pid, fecha); return ex && (ex.tipo !== 'CAMBIO_CUADRILLA' || ex.cuadrillaDestino !== cu.id); });
    var entran = db.nominaExcepciones.filter(function (x) { return x.fecha === fecha && x.tipo === 'CAMBIO_CUADRILLA' && x.cuadrillaDestino === cu.id; }).map(function (x) { return x.persona; });
    return { lista: base.filter(function (pid) { return fuera.indexOf(pid) < 0; }).concat(entran.filter(function (pid) { return base.indexOf(pid) < 0; })), excluidos: fuera };
  }
  function situacion(db, cuId, ahora) {
    var cu = porId(db.cuadrillas, cuId), t = local(ahora || A.ahora(db)), esp = esperados(db, cu, t.fecha), filas = [];
    esp.lista.forEach(function (pid) {
      var e = estadoPersona(db, pid, t.fecha), gst = gestionVigente(db, cu.id, pid, t.fecha), clase;
      if (e.registrado) clase = 'registrado';
      else if (gst && MOTIVOS[gst.motivo].efecto === 'fuera') clase = 'fuera';
      else if (gst && MOTIVOS[gst.motivo].efecto === 'temporal' && gst.horaPrevista && aMin(t.hora) < aMin(gst.horaPrevista)) clase = 'justificado';
      else clase = gst ? 'pendiente_con_motivo' : 'pendiente';
      filas.push({ persona: pid, estado: e.estado, ast: e.ast, area: e.area, astNombre: e.astNombre, participaciones: e.participaciones, tuvoAst: e.tuvoAst, gestion: gst, clase: clase, vencido: !!(gst && MOTIVOS[gst.motivo].efecto === 'temporal' && gst.horaPrevista && aMin(t.hora) >= aMin(gst.horaPrevista) && !e.registrado) });
    });
    var cuenta = function (c) { return filas.filter(function (f) { return f.clase === c; }); };
    var reg = cuenta('registrado'), pend = filas.filter(function (f) { return f.clase === 'pendiente' || f.clase === 'pendiente_con_motivo'; });
    return { cuadrilla: cu, fecha: t.fecha, hora: t.hora, filas: filas, excluidos: esp.excluidos, total: cu.integrantes.length, esperados: filas.length - cuenta('fuera').length,
      registrados: reg, habilitados: reg.filter(function (f) { return f.estado === 'HABILITADO'; }), pendientesAprobacion: reg.filter(function (f) { return f.estado !== 'HABILITADO'; }),
      fuera: cuenta('fuera'), justificados: cuenta('justificado'), pendientes: pend, sinMotivo: cuenta('pendiente') };
  }
  function nombres(db, l) { var n = l.map(function (f) { return A.nombre(db, f.persona); }); return n.length > 1 ? n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1] : n.join(''); }
  // Resumen del responsable (D-036 §B.5)
  function resumen(db, cuId, ahora) {
    var s = situacion(db, cuId, ahora), areas = [];
    s.registrados.forEach(function (f) { if (areas.indexOf(f.area) < 0) areas.push(f.area); });
    var partes = [s.registrados.length + ' con incorporación registrada' + (areas.length > 1 ? ' en distintas áreas' : areas.length ? ' en ' + porId(db.areas, areas[0]).nombre.split(' ·')[0] : '')];
    var aus = s.fuera.filter(function (f) { return f.gestion.motivo === 'NO_ASISTIO'; }).length, reas = s.fuera.length - aus;
    if (aus) partes.push(aus + ' ausente' + (aus > 1 ? 's' : '') + ' informado' + (aus > 1 ? 's' : ''));
    if (reas) partes.push(reas + ' reasignado' + (reas > 1 ? 's' : ''));
    s.justificados.forEach(function (f) { partes.push('1 ' + (f.gestion.motivo === 'CAPACITACION' ? 'en capacitación' : 'con ingreso diferido') + ' hasta las ' + f.gestion.horaPrevista); });
    var conM = s.pendientes.length - s.sinMotivo.length;
    if (conM) partes.push(conM + ' pendiente' + (conM > 1 ? 's' : '') + ' con motivo informado');
    if (s.sinMotivo.length) partes.push(s.sinMotivo.length + ' sin registro ni motivo informado');
    if (s.excluidos.length) partes.push(s.excluidos.length + ' con excepción registrada (no esperados)');
    return s.cuadrilla.nombre + ' — ' + s.total + ' trabajadores: ' + partes.join('. ') + '.';
  }

  // ---------- Controles (D-036 §2, §3, §6, §7) ----------
  function textoAviso(db, s) {
    var cfg = db.config.controlCuadrillas, base = s.cuadrilla.nombre + ': ';
    if (!s.pendientes.length) {
      if (s.habilitados.length === s.registrados.length && s.registrados.length) return base + 'Todos habilitados (' + s.registrados.length + ' de ' + s.esperados + ').';
      return base + s.registrados.length + ' de ' + s.esperados + ' trabajadores incorporados a AST. ' + (s.pendientesAprobacion.length === 1 ? 'Una incorporación sigue' : s.pendientesAprobacion.length + ' incorporaciones siguen') + ' pendiente' + (s.pendientesAprobacion.length === 1 ? '' : 's') + ' de aprobación.';
    }
    if (s.pendientes.length <= cfg.nombresHasta) return base + s.registrados.length + ' de ' + s.esperados + ' trabajadores tienen registrada su incorporación. Pendientes: ' + nombres(db, s.pendientes) + '.';
    return base + s.registrados.length + ' de ' + s.esperados + ' trabajadores tienen registrada su incorporación a una AST. Quedan ' + s.pendientes.length + ' pendientes. Revisar listado.';
  }
  function controlar(db, cuId, origen) {
    preparar(db);
    var cfg = db.config.controlCuadrillas, s = situacion(db, cuId), cu = s.cuadrilla;
    var previos = db.nominaControles.filter(function (c) { return c.cuadrilla === cu.id && c.fecha === s.fecha; });
    var ultimo = previos.slice(-1)[0], ultimoAviso = previos.filter(function (c) { return c.aviso; }).slice(-1)[0];
    var ctl = { id: 'CT-' + String(db.nominaControles.length + 1).padStart(4, '0'), cuadrilla: cu.id, fecha: s.fecha, hora: s.hora, origen: origen || 'programado',
      esperados: s.esperados, registrados: s.registrados.length, habilitados: s.habilitados.length, pendientes: s.pendientes.map(function (f) { return f.persona; }), sinMotivo: s.sinMotivo.map(function (f) { return f.persona; }), aviso: null, avisosPersona: [], escalado: false };
    var texto = textoAviso(db, s), minDesde = function (h) { return aMin(s.hora) - aMin(h); };
    // Avisar solo si cambió el número de pendientes, o toca el recordatorio (no alertas idénticas en cada control)
    var cambio = !ultimo || ultimo.pendientes.length !== ctl.pendientes.length || (ultimoAviso && ultimoAviso.aviso.texto !== texto && !s.pendientes.length);
    var recordatorio = s.pendientes.length && ultimoAviso && minDesde(ultimoAviso.hora) >= cfg.recordatorioCada;
    if (cambio || recordatorio) {
      var tipo = s.pendientes.length ? 'CUADRILLA_CONTROL' : 'CUADRILLA_COMPLETA';
      ctl.aviso = { tipo: tipo, texto: (recordatorio && !cambio ? 'Recordatorio. ' : '') + texto, para: [cu.responsable] };
      C.avisar(db, [cu.responsable], tipo, ctl.aviso.texto, null, { cuadrilla: cu.id });
    }
    // Aviso por persona sin registro ni motivo: una vez por turno y solo cuando son pocos (si son muchos, basta la lista)
    // Los plazos informados que vencieron se avisan siempre: hay que volver a comprobar a esa persona
    var porAvisar = (s.sinMotivo.length <= cfg.nombresHasta ? s.sinMotivo : []).concat(s.pendientes.filter(function (f) { return f.vencido; }));
    if (porAvisar.length) {
      porAvisar.forEach(function (f) {
        var ya = db.avisos.some(function (a) { return a.tipo === 'CUADRILLA_PERSONA' && a.persona === f.persona && a.cuadrilla === cu.id && local(a.en).fecha === s.fecha && a.vencido === f.vencido; });
        if (ya) return;
        var txt = f.vencido ? A.nombre(db, f.persona) + ': terminó el plazo informado (' + f.gestion.horaPrevista + ') y sigue sin incorporación registrada a una AST.' : A.nombre(db, f.persona) + ' no tiene incorporación registrada a una AST en ninguna de las áreas consultadas.';
        C.avisar(db, [cu.responsable], 'CUADRILLA_PERSONA', txt, null, { cuadrilla: cu.id, persona: f.persona, vencido: f.vencido });
        ctl.avisosPersona.push(f.persona);
      });
    }
    // Si los pendientes persisten, al reemplazo o a la jefatura (una vez por turno)
    var primero = previos[0] || ctl;
    if (s.pendientes.length && minDesde(primero.hora) >= cfg.escalarTras && !previos.some(function (c) { return c.escalado; })) {
      var a = [cu.reemplazo, cu.jefatura].filter(Boolean);
      C.avisar(db, a, 'CUADRILLA_ESCALADA', cu.nombre + ': siguen ' + s.pendientes.length + ' pendiente(s) de incorporación desde las ' + primero.hora + ' (' + nombres(db, s.pendientes) + '). Avisado a ' + A.nombre(db, cu.responsable) + '.', null, { cuadrilla: cu.id });
      ctl.escalado = true; ctl.escaladoA = a;
    }
    // Historial: cuándo se resolvió cada situación gestionada
    db.nominaGestiones.forEach(function (x) { if (x.cuadrilla === cu.id && x.fecha === s.fecha && !x.resueltaEn && s.registrados.some(function (f) { return f.persona === x.persona; })) x.resueltaEn = A.ahora(db); });
    db.nominaControles.push(ctl);
    A.registrar(db, { tipo: 'N_CONTROL', actor: null, datos: { cuadrilla: cu.id, hora: s.hora, esperados: s.esperados, registrados: ctl.registrados, pendientes: ctl.pendientes.length, aviso: ctl.aviso ? ctl.aviso.texto : null } });
    return { ok: true, control: ctl, situacion: s };
  }
  // Reloj de controles: corre el control que toque según la configuración (en producción, una tarea del servidor)
  function tick(db) {
    preparar(db);
    var cfg = db.config.controlCuadrillas, t = local(A.ahora(db)), ahoraMin = aMin(t.hora), hechos = [];
    if (ahoraMin < aMin(cfg.primerControl) || ahoraMin > aMin(cfg.hasta)) return hechos;
    var slot = aMin(cfg.primerControl) + Math.floor((ahoraMin - aMin(cfg.primerControl)) / cfg.cada) * cfg.cada;
    db.cuadrillas.forEach(function (cu) {
      if (db.nominaControles.some(function (c) { return c.cuadrilla === cu.id && c.fecha === t.fecha && c.origen === 'programado' && aMin(c.hora) >= slot; })) return;
      hechos.push(controlar(db, cu.id, 'programado'));
    });
    return hechos;
  }

  function aplicar(db, ev) {
    preparar(db);
    var d = ev.datos = ev.datos || {}, actor = porId(db.personas, ev.actor), cu = d.cuadrilla ? porId(db.cuadrillas, d.cuadrilla) : null;
    var rech = function (m) { A.registrar(db, { tipo: 'TRANSICION_RECHAZADA', actor: ev.actor, datos: { intento: ev.tipo, motivo: m, faltantes: [] } }); return { ok: false, motivo: m }; };
    var ok = function (datos, extra) { var e = A.registrar(db, { tipo: ev.tipo, actor: ev.actor, datos: datos }); return Object.assign({ ok: true, evento: e }, extra || {}); };
    if (!actor) return rech('Persona desconocida');
    var gestiona = function (c) { return c && ([c.responsable, c.reemplazo, c.jefatura].indexOf(actor.id) >= 0 || actor.rol === 'prevencion'); };
    var config = actor.rol === 'prevencion' || actor.rol === 'administrador';
    switch (ev.tipo) {
      case 'N_CONTROL':
        if (!gestiona(cu)) return rech('El control lo ejecuta el responsable, su reemplazo, la jefatura o Prevención');
        return controlar(db, cu.id, 'manual');
      case 'N_MOTIVO': {
        // D-036 §B.3: informa una explicación operativa; no incorpora ni firma por nadie
        if (!gestiona(cu)) return rech('El motivo lo informa el responsable de la cuadrilla, su reemplazo o la jefatura');
        if (cu.integrantes.indexOf(d.persona) < 0) return rech('La persona no es de esta cuadrilla');
        if (!MOTIVOS[d.motivo]) return rech('Motivo no válido');
        if (d.motivo === 'OTRO' && !d.texto) return rech('Describe el motivo');
        if (MOTIVOS[d.motivo].efecto === 'temporal' && !/^\d{2}:\d{2}$/.test(d.horaPrevista || '')) return rech('Indica la hora prevista de incorporación');
        var t = local(A.ahora(db));
        if (d.horaPrevista && aMin(d.horaPrevista) <= aMin(t.hora)) return rech('La hora prevista (' + d.horaPrevista + ') ya pasó: indica una hora posterior a las ' + t.hora);
        var gst = { id: 'GN-' + String(db.nominaGestiones.length + 1).padStart(4, '0'), cuadrilla: cu.id, persona: d.persona, fecha: t.fecha, motivo: d.motivo, texto: d.texto || null, observacion: d.observacion || null, horaPrevista: d.horaPrevista || null, por: actor.id, en: A.ahora(db), resueltaEn: null };
        db.nominaGestiones.push(gst);
        return ok({ cuadrilla: cu.id, persona: A.nombre(db, d.persona), motivo: MOTIVOS[d.motivo].txt, horaPrevista: gst.horaPrevista, nota: 'No incorpora ni firma' }, { gestion: gst });
      }
      case 'N_EXCEPCION': {
        // Ausencias, permisos y cambios de cuadrilla registrados antes del turno: evitan avisos incorrectos
        var cuOrigen = db.cuadrillas.filter(function (c) { return c.integrantes.indexOf(d.persona) >= 0; })[0];
        if (!gestiona(cuOrigen) && !config) return rech('La excepción la registra el responsable, la jefatura o Prevención');
        if (['AUSENCIA', 'PERMISO', 'CAMBIO_CUADRILLA'].indexOf(d.tipo) < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '')) return rech('Excepción incompleta');
        if (d.tipo === 'CAMBIO_CUADRILLA' && !porId(db.cuadrillas, d.cuadrillaDestino)) return rech('Indica la cuadrilla de destino');
        db.nominaExcepciones.push({ persona: d.persona, fecha: d.fecha, tipo: d.tipo, cuadrillaDestino: d.cuadrillaDestino || null, observacion: d.observacion || null, por: actor.id, en: A.ahora(db) });
        return ok({ persona: A.nombre(db, d.persona), fecha: d.fecha, tipo: d.tipo });
      }
      case 'N_CONFIG': {
        if (!config) return rech('El horario de control lo configura la empresa');
        var cfg = db.config.controlCuadrillas;
        ['inicio', 'primerControl', 'hasta'].forEach(function (k) { if (d[k]) cfg[k] = d[k]; });
        ['cada', 'recordatorioCada', 'escalarTras', 'nombresHasta'].forEach(function (k) { if (d[k] > 0) cfg[k] = +d[k]; });
        return ok(JSON.parse(JSON.stringify(cfg)));
      }
      case 'N_NOMINA': {
        // D-037: nómina activa de terreno, función de cada persona y asignación a cuadrillas
        if (!config) return rech('La nómina la mantiene la empresa');
        var p = porId(db.personas, d.persona); if (!p) return rech('Persona desconocida');
        if (d.funcion !== undefined) { if (d.funcion && !FUNCION_TXT[d.funcion]) return rech('Función no válida'); p.funcionTerreno = d.funcion || null; }
        if (d.enNomina !== undefined) p.enNominaTerreno = !!d.enNomina;
        if (d.cuadrilla) { db.cuadrillas.forEach(function (c) { c.integrantes = c.integrantes.filter(function (x) { return x !== p.id; }); }); if (d.cuadrilla !== 'ninguna') porId(db.cuadrillas, d.cuadrilla).integrantes.push(p.id); }
        return ok({ persona: p.nombre, funcion: p.funcionTerreno, enNomina: p.enNominaTerreno, cuadrilla: d.cuadrilla || null });
      }
    }
    return rech('Evento desconocido: ' + ev.tipo);
  }

  var N = { preparar: preparar, aplicar: aplicar, situacion: situacion, resumen: resumen, controlar: controlar, tick: tick, estadoPersona: estadoPersona, local: local,
    MOTIVOS: MOTIVOS, ESTADO_TXT: ESTADO_TXT, FUNCION_TXT: FUNCION_TXT, deMin: deMin, aMin: aMin };
  if (typeof module !== 'undefined') module.exports = N; else g.ASTRA_N = N;
})(this);
