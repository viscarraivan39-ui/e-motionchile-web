// ASTRA · módulo Checkmaq: máquinas y equipos con QR propio, checklist pre-uso con horómetro, semáforo de 4 estados,
// fallas → incidencias, reparación, retorno validado y mantención por horas (ASTRA_CHECKMAQ_ESTRUCTURA_v0.1 §4–§6).
// Checkmaq pasa a ser la fuente de la inspección pre-uso que ASTRA exige a los equipos de la AST (D-043 §4).
// Reglas de unión (propuesta, no aprobadas por Prevención):
//   1. Sin checklist al día y en verde o amarillo, la máquina no entra a la AST (naranja y rojo bloquean).
//   2. El checklist lo hace un operador acreditado para esa máquina, un mecánico o Prevención.
//   3. Una falla roja detiene las AST activas que usan la máquina y avisa a Prevención y mantención.
//   4. (La mantención en terreno tiene su propia AST: ya está en la matriz del escenario, PT-MAN-01.)
//   5. La máquina vuelve a verde solo con la validación de un responsable distinto de quien reparó.
(function (g) {
  'use strict';
  var A = (typeof module !== 'undefined') ? require('./motor.js') : g.ASTRA;
  var C = (typeof module !== 'undefined') ? require('./cuadrilla.js') : g.ASTRA_C;
  var porId = A.porId;
  var SEMAFORO = {
    VERDE: { txt: 'Operativa', icono: '🟢', chip: 'ok', orden: 0 },
    AMARILLO: { txt: 'Operativa con observación', icono: '🟡', chip: 'aviso', orden: 1 },
    NARANJA: { txt: 'Intervención prioritaria', icono: '🟠', chip: 'mal', orden: 2 },
    ROJO: { txt: 'Fuera de servicio', icono: '🔴', chip: 'mal', orden: 3 }
  };
  var SEVERIDAD = { observacion: 'AMARILLO', prioritaria: 'NARANJA', fuera_servicio: 'ROJO' };
  var SEVERIDAD_TXT = { observacion: 'Observación (puede operar)', prioritaria: 'Intervención prioritaria', fuera_servicio: 'Fuera de servicio (no se usa)' };
  var EST_INC = { ABIERTA: 'Abierta', REPARADA: 'Reparada, falta validar', CERRADA: 'Cerrada y validada' };
  var BLOQUEAN = ['NARANJA', 'ROJO'];
  var M = {};

  // ---------- Plantillas de checklist por tipo (versionadas: cambiarlas no altera checklists pasados) ----------
  // Ítem crítico con falla → fuera de servicio. Ítem no crítico con falla → observación.
  var PLANTILLAS = {
    manipulador_telescopico: { version: '1', cita: 'FOR-INS-MTL v1', items: [
      ['neumaticos', 'Neumáticos y estabilizadores sin daño', true], ['frenos', 'Frenos y dirección operativos', true], ['fugas', 'Sin fugas hidráulicas', true],
      ['alarma', 'Alarma de retroceso y luces funcionando', true], ['tabla', 'Tabla de carga legible en la cabina', false], ['cinturon', 'Cinturón de seguridad operativo', true],
      ['extintor', 'Extintor de la cabina cargado y vigente', false], ['vidrios', 'Vidrios y espejos limpios y sin trizaduras', false]] },
    retroexcavadora: { version: '1', cita: 'FOR-INS-RET v1 (simulación)', items: [
      ['frenos', 'Frenos de servicio y estacionamiento operativos', true], ['fugas', 'Sin fugas hidráulicas ni de combustible', true], ['alarma', 'Alarma de retroceso y baliza funcionando', true],
      ['balde', 'Balde, dientes y pasadores sin daño', false], ['estabilizadores', 'Estabilizadores operativos', true], ['cinturon', 'Cinturón de seguridad operativo', true],
      ['niveles', 'Niveles de aceite, refrigerante y combustible', false], ['extintor', 'Extintor cargado y vigente', false]] },
    generador: { version: '1', cita: 'FOR-INS-GEN v1 (simulación)', items: [
      ['tierra', 'Conexión a tierra instalada', true], ['cables', 'Cables y enchufes sin daño', true], ['diferencial', 'Protección diferencial operativa', true], ['combustible', 'Sin derrame de combustible', false]] },
    esmeril_angular: { version: '1', cita: 'PT-HER-01 v1 (simulación)', items: [
      ['guarda', 'Protección de disco instalada', true], ['disco', 'Disco del tipo y diámetro correcto, sin trizaduras', true], ['cable', 'Cable y enchufe sin daño', true], ['mango', 'Mango lateral instalado', false]] }
  };

  // ---------- Ayudantes ----------
  function hoy(db) { return A.ahora(db).slice(0, 10); }
  function n(x) { return Number(x).toLocaleString('es-CL'); }
  function unidad(db, id) { return (db.equiposObra || []).filter(function (u) { return u.id === id || u.qr === id || u.codigo === id; })[0] || null; }
  function plantilla(u) { var p = PLANTILLAS[u.tipo]; return p ? { tipo: u.tipo, version: p.version, cita: p.cita, items: p.items.map(function (i) { return { id: i[0], texto: i[1], critico: i[2] }; }) } : null; }
  function checklistHoy(db, u) { var d = hoy(db); return (u.checklists || []).filter(function (c) { return c.en.slice(0, 10) === d; }).slice(-1)[0] || null; }
  function abiertas(u) { return (u.incidencias || []).filter(function (i) { return i.estado !== 'CERRADA'; }); }
  function tiene(p, comp) { return !!(p && p.comp && p.comp[comp]); }
  function esMecanico(p) { return tiene(p, 'mecanico'); }
  function puedeValidar(db, p, u) { return p.rol === 'prevencion' || p.rol === 'jefe_terreno' || (p.rol === 'supervisor' && p.empresa === u.empresa); }
  function mantencion(u) {
    if (!u.mantencion || u.horometro == null) return null;
    var prox = u.mantencion.ultima + u.mantencion.intervalo, faltan = prox - u.horometro;
    return { proxima: prox, faltan: faltan, vencida: faltan <= 0, alerta: faltan > 0 && faltan <= Math.max(10, u.mantencion.intervalo * 0.1) };
  }
  // El semáforo no se escribe a mano: sale de las incidencias abiertas y de la mantención
  function calcular(u) {
    var s = 'VERDE';
    abiertas(u).forEach(function (i) { var t = SEVERIDAD[i.severidad]; if (SEMAFORO[t].orden > SEMAFORO[s].orden) s = t; });
    var m = mantencion(u); if (m && m.vencida && SEMAFORO[s].orden < SEMAFORO.NARANJA.orden) s = 'NARANJA';
    return s;
  }
  function motivoSemaforo(u) {
    var ab = abiertas(u), m = mantencion(u), partes = ab.map(function (i) { return i.descripcion + (i.estado === 'REPARADA' ? ' (reparada, falta validar el retorno)' : ''); });
    if (m && m.vencida) partes.push('mantención vencida hace ' + n(-m.faltan) + ' h');
    return partes.join('; ');
  }
  // Lo que consulta ASTRA antes de dejar entrar la máquina a una AST (regla 1)
  function estadoMaquina(db, u) {
    if (!u || !u.checkmaq) return null;
    var s = calcular(u), c = checklistHoy(db, u), bloquea = BLOQUEAN.indexOf(s) >= 0;
    return { semaforo: s, texto: SEMAFORO[s].txt, checklistHoy: c ? c.id : null, bloquea: bloquea,
      motivo: bloquea ? u.nombre + ' está en ' + SEMAFORO[s].txt.toLowerCase() + ': ' + motivoSemaforo(u) : null };
  }
  function astsQueUsan(db, u) {
    return (db.asts || []).filter(function (a) { return Array.isArray(a.equipos) && a.equipos.some(function (e) { return e.unidad === u.id; }) && ['CERRADA', 'ANULADA'].indexOf(a.estado) < 0 && !C.vencida(db, a); }); // D-047: una AST vencida ya está cerrada (aunque aún no llegue el evento que lo registra)
  }
  function destinatarios(db, u) {
    return db.personas.filter(function (p) { return p.rol === 'prevencion' || esMecanico(p) || p.rol === 'jefe_terreno' || (p.rol === 'supervisor' && p.empresa === u.empresa); }).map(function (p) { return p.id; });
  }
  function rechazar(db, ev, motivo) {
    A.registrar(db, { tipo: 'TRANSICION_RECHAZADA', ast: null, actor: ev.actor, datos: { intento: ev.tipo, motivo: motivo, faltantes: [] } });
    return { ok: false, motivo: motivo };
  }
  function ok(db, ev, datos, extra) {
    var e = A.registrar(db, { tipo: ev.tipo, ast: null, area: null, actor: ev.actor, estadoPrevio: datos.semaforoPrevio || null, estadoNuevo: datos.semaforo || null, datos: datos });
    return Object.assign({ ok: true, evento: e }, extra || {});
  }
  function guardarFoto(db, foto, meta) {
    if (!foto) return null;
    if (!/^data:image\//.test(foto)) return false;
    db.fotos = db.fotos || [];
    var f = Object.assign({ id: 'FO-' + String(db.fotos.length + 1).padStart(4, '0'), dato: foto, en: A.ahora(db), hash: A.sha256(foto).slice(0, 16) }, meta);
    db.fotos.push(f); return f.id;
  }
  function nuevaIncidencia(db, u, actor, descripcion, severidad, origen, foto) {
    u.incidencias = u.incidencias || [];
    var inc = { id: 'INC-' + u.codigo + '-' + String(u.incidencias.length + 1).padStart(3, '0'), descripcion: descripcion, severidad: severidad, estado: 'ABIERTA',
      reportadaPor: actor.id, en: A.ahora(db), origen: origen, foto: foto || null, historial: [{ estado: 'ABIERTA', en: A.ahora(db), por: actor.id }] };
    u.incidencias.push(inc); return inc;
  }
  // Regla 3: falla roja → se detienen las AST activas que usan la máquina
  function detenerAsts(db, u, actor, motivo) {
    var det = [];
    astsQueUsan(db, u).forEach(function (a) {
      if (a.estado === 'DETENIDA') return;
      var r = C.aplicar(db, { tipo: 'C_DETENER', actor: actor.id, ast: a.id, datos: { motivo: motivo, origen: 'checkmaq', unidad: u.id } });
      if (r.ok) det.push(a.id);
    });
    return det;
  }
  // Tras cualquier cambio: recalcula, avisa si empeoró y aplica la regla 3
  function actualizar(db, u, actor, previo, contexto) {
    u.semaforo = calcular(u);
    var r = { semaforoPrevio: previo, semaforo: u.semaforo, detenidas: [] };
    if (u.semaforo === previo) return r;
    if (SEMAFORO[u.semaforo].orden > SEMAFORO[previo].orden) {
      if (u.semaforo === 'ROJO') r.detenidas = detenerAsts(db, u, actor, u.nombre + ' quedó fuera de servicio: ' + contexto);
      C.avisar(db, destinatarios(db, u), 'EQUIPO', SEMAFORO[u.semaforo].icono + ' ' + u.nombre + ' (' + u.codigo + ') pasó a ' + SEMAFORO[u.semaforo].txt.toLowerCase() + ': ' + contexto +
        (r.detenidas.length ? '. Se detuvieron ' + r.detenidas.length + ' AST que la usan.' : u.semaforo === 'ROJO' ? '. No se usa hasta repararla y validar el retorno.' : ''), null);
    }
    return r;
  }

  // ---------- Instalación: flota del escenario y campos Checkmaq en cada unidad ----------
  function preparar(db) {
    db.equiposObra = db.equiposObra || [];
    if (db.escenario && db.escenario.tipo !== 'obra_modelo' && !db.flotaCheckmaq) { // la flota extra es del escenario DEMO; la obra modelo ya trae sus equipos
      db.flotaCheckmaq = 1;
      var SN = 'EMP-DEMO-003', P = db.escenario.codigo;
      var extra = [
        { id: 'EQ-RE-03', codigo: 'RETRO-03', tipo: 'retroexcavadora', familia: 'maquinaria', nombre: 'Retroexcavadora RETRO-03', empresa: SN, competencia: 'operador_maquinaria', horometro: 3812, mantencion: { ultima: 3580, intervalo: 250 } },
        { id: 'EQ-RE-04', codigo: 'RETRO-04', tipo: 'retroexcavadora', familia: 'maquinaria', nombre: 'Retroexcavadora RETRO-04', empresa: SN, competencia: 'operador_maquinaria', horometro: 6120, mantencion: { ultima: 5980, intervalo: 250 } },
        { id: 'EQ-GE-01', codigo: 'GEN-01', tipo: 'generador', familia: 'equipo', nombre: 'Generador GEN-01', empresa: P, competencia: null, horometro: null },
        { id: 'EQ-ES-01', codigo: 'ESM-01', tipo: 'esmeril_angular', familia: 'equipo', nombre: 'Esmeril angular ESM-01', empresa: P, competencia: null, horometro: null }
      ];
      extra.forEach(function (x) { if (!unidad(db, x.id)) db.equiposObra.push(Object.assign({ inspecciones: [], simulacion: true }, x)); });
      // La retro-04 llega con una falla abierta para la demo de reparación y retorno
      var r4 = unidad(db, 'EQ-RE-04'), mec = 'demo-041';
      r4.incidencias = [{ id: 'INC-RETRO-04-001', descripcion: 'Fuga en manguera del cilindro del balde', severidad: 'fuera_servicio', estado: 'ABIERTA', reportadaPor: 'demo-044', en: hoy(db) + 'T09:10:00.000Z', origen: 'checklist', foto: null, historial: [{ estado: 'ABIERTA', en: hoy(db) + 'T09:10:00.000Z', por: 'demo-044' }], simulacion: true }];
      if (!porId(db.personas, mec)) r4.incidencias = [];
    }
    db.equiposObra.forEach(function (u) {
      if (u.checkmaq) return;
      u.checkmaq = true;
      if (!u.codigo) u.codigo = u.id.replace(/^EQ-/, '');
      if (!u.familia) u.familia = u.tipo === 'manipulador_telescopico' ? 'maquinaria' : 'equipo';
      if (u.competencia === undefined) u.competencia = u.tipo === 'manipulador_telescopico' ? 'operador_manipulador' : null;
      if (u.horometro === undefined) u.horometro = u.familia === 'maquinaria' ? ({ 'EQ-MT-01': 3410, 'EQ-MT-02': 1980 }[u.id] || 1000) : null;
      if (!u.mantencion && u.familia === 'maquinaria') u.mantencion = { ultima: u.horometro - 120, intervalo: 250 };
      u.qr = u.qr || A.sha256('qr-maq-' + u.id).slice(0, 32);
      u.checklists = u.checklists || []; u.incidencias = u.incidencias || []; u.horometros = u.horometros || (u.horometro != null ? [{ valor: u.horometro, en: null, por: null, origen: 'alta' }] : []);
      u.mantenciones = u.mantenciones || [];
      // Una inspección conforme de hoy que venía del sistema anterior cuenta como checklist (migración)
      (u.inspecciones || []).filter(function (x) { return x.resultado === 'CONFORME' && !x.checklist; }).forEach(function (x) {
        var c = { id: 'CK-' + u.codigo + '-' + String(u.checklists.length + 1).padStart(3, '0'), por: x.por, en: x.en, horometro: u.horometro, plantilla: plantilla(u) ? plantilla(u).tipo + ' v' + plantilla(u).version : null, respuestas: [], resultado: 'VERDE', migrado: true };
        u.checklists.push(c); x.checklist = c.id;
      });
      u.semaforo = calcular(u);
    });
    return db;
  }

  // ---------- Eventos ----------
  function aplicar(db, ev) {
    C.preparar(db); preparar(db);
    var d = ev.datos = ev.datos || {}, actor = porId(db.personas, ev.actor), u = d.unidad ? unidad(db, d.unidad) : null;
    if (!actor || actor.rol === 'administrador') return rechazar(db, ev, 'Persona no habilitada');
    if (d.unidad && !u) return rechazar(db, ev, 'Máquina o equipo no registrado');
    // Ningún evento que usa la máquina puede terminar en una excepción por venir sin `unidad` (invariante 10)
    if (!u && ['M_CHECKLIST', 'M_VALIDAR_RETORNO', 'M_MANTENCION', 'M_REPORTAR_FALLA'].indexOf(ev.tipo) >= 0) return rechazar(db, ev, 'Indica la máquina o equipo');
    var previo = u ? (u.semaforo || calcular(u)) : null;
    switch (ev.tipo) {
      case 'M_CHECKLIST': {
        // Pasos 2–4 del flujo Checkmaq: horómetro, plantilla OK/Falla/N/A con foto en la falla, declaración firmada
        var pl = plantilla(u);
        if (!pl) return rechazar(db, ev, 'Este tipo de equipo no tiene plantilla de checklist');
        var habil = (u.competencia && tiene(actor, u.competencia)) || esMecanico(actor) || actor.rol === 'prevencion' || (!u.competencia && ['trabajador', 'operador', 'capataz', 'supervisor', 'jefe_terreno'].indexOf(actor.rol) >= 0);
        if (!habil) return rechazar(db, ev, 'Para hacer el checklist de ' + u.nombre + ' necesitas la acreditación de operador de esa máquina vigente en tu ficha (o ser mecánico o Prevención)');
        if (u.competencia && tiene(actor, u.competencia) && actor.comp[u.competencia].vence < hoy(db)) return rechazar(db, ev, 'Tu acreditación para operar ' + u.nombre + ' está vencida');
        var h0 = null;
        if (u.familia === 'maquinaria') {
          h0 = Number(d.horometro);
          if (d.horometro === undefined || d.horometro === '' || !isFinite(h0) || h0 < 0) return rechazar(db, ev, 'Ingresa el horómetro que marca la máquina');
          if (u.horometro != null && h0 < u.horometro && !d.motivoHorometro) return rechazar(db, ev, 'El horómetro (' + n(h0) + ' h) es menor que el último registrado (' + n(u.horometro) + ' h). Revísalo o indica el motivo (cambio de tablero, error anterior)');
          if (u.horometro != null && h0 - u.horometro > 24 * 7 && !d.motivoHorometro) return rechazar(db, ev, 'El horómetro subió ' + n(h0 - u.horometro) + ' h desde el último registro. Confírmalo indicando el motivo');
        }
        var resp = d.respuestas || {}, fotos = d.fotos || {}, notas = d.notas || {};
        var sinResp = pl.items.filter(function (i) { return ['OK', 'FALLA', 'NA'].indexOf(resp[i.id]) < 0; });
        if (sinResp.length) return rechazar(db, ev, 'Falta responder: ' + sinResp.map(function (i) { return i.texto; }).join('; '));
        var naCrit = pl.items.filter(function (i) { return i.critico && resp[i.id] === 'NA'; });
        if (naCrit.length) return rechazar(db, ev, 'Un punto crítico no puede quedar «no aplica»: ' + naCrit.map(function (i) { return i.texto; }).join('; '));
        var fallas = pl.items.filter(function (i) { return resp[i.id] === 'FALLA'; });
        var sinFoto = fallas.filter(function (i) { return !fotos[i.id]; });
        if (sinFoto.length) return rechazar(db, ev, 'Cada falla lleva una foto: ' + sinFoto.map(function (i) { return i.texto; }).join('; '));
        if (!d.declaro) return rechazar(db, ev, 'Confirma tu declaración: revisaste la máquina en persona y lo marcado es verdad');
        var c = { id: 'CK-' + u.codigo + '-' + String(u.checklists.length + 1).padStart(3, '0'), por: actor.id, en: A.ahora(db), horometro: h0, plantilla: pl.tipo + ' v' + pl.version, cita: pl.cita,
          respuestas: pl.items.map(function (i) { return { id: i.id, texto: i.texto, critico: i.critico, valor: resp[i.id], nota: notas[i.id] || null }; }), observacion: d.observacion || null, incidencias: [] };
        for (var k = 0; k < fallas.length; k++) {
          var fid = guardarFoto(db, fotos[fallas[k].id], { unidad: u.id, tipo: 'falla', por: actor.id });
          if (fid === false) return rechazar(db, ev, 'La foto no es una imagen válida');
          c.incidencias.push(nuevaIncidencia(db, u, actor, fallas[k].texto + (notas[fallas[k].id] ? ': ' + notas[fallas[k].id] : ''), fallas[k].critico ? 'fuera_servicio' : 'observacion', 'checklist ' + c.id, fid).id);
        }
        if (h0 != null) { if (d.motivoHorometro) c.motivoHorometro = d.motivoHorometro; u.horometro = h0; u.horometros.push({ valor: h0, en: c.en, por: actor.id, origen: c.id, motivo: d.motivoHorometro || null }); }
        u.checklists.push(c);
        var r = actualizar(db, u, actor, previo, fallas.length ? 'falla en el checklist (' + fallas.map(function (i) { return i.texto; }).join(', ') + ')' : 'checklist');
        c.resultado = u.semaforo;
        // Vínculo con ASTRA: el checklist es la inspección pre-uso que la AST comprueba (D-043 §4)
        var insp = { id: 'IN-' + c.id, unidad: u.id, ast: null, por: actor.id, en: c.en, resultado: BLOQUEAN.indexOf(u.semaforo) < 0 ? 'CONFORME' : 'NO_CONFORME', items: c.respuestas.map(function (x) { return { texto: x.texto, ok: x.valor !== 'FALLA' }; }), checklist: c.id, origen: 'checkmaq', cita: pl.cita };
        db.inspecciones = db.inspecciones || []; db.inspecciones.push(insp); u.inspecciones = u.inspecciones || []; u.inspecciones.push(insp);
        var m = mantencion(u);
        if (m && m.alerta && !(u.alertaMant === m.proxima)) { u.alertaMant = m.proxima; C.avisar(db, destinatarios(db, u).filter(function (p) { return esMecanico(porId(db.personas, p)); }), 'EQUIPO', '🔧 ' + u.nombre + ': faltan ' + n(m.faltan) + ' h para la mantención de las ' + n(m.proxima) + ' h.', null); }
        return ok(db, ev, { unidad: u.id, checklist: c.id, horometro: h0, resultado: u.semaforo, fallas: fallas.map(function (i) { return i.id; }), semaforoPrevio: previo, semaforo: u.semaforo, detenidas: r.detenidas }, { checklist: c, semaforo: u.semaforo, detenidas: r.detenidas, mantencion: m });
      }
      case 'M_REPORTAR_FALLA': {
        // Falla en terreno a media jornada: cualquiera la reporta. La foto ayuda pero nunca retrasa la detención.
        if (!d.descripcion || String(d.descripcion).trim().length < 4) return rechazar(db, ev, 'Describe la falla');
        if (!SEVERIDAD[d.severidad]) return rechazar(db, ev, 'Indica si puede seguir operando, si requiere intervención prioritaria o si queda fuera de servicio');
        var fo = guardarFoto(db, d.foto, { unidad: u.id, tipo: 'falla', por: actor.id });
        if (fo === false) return rechazar(db, ev, 'La foto no es una imagen válida');
        var inc = nuevaIncidencia(db, u, actor, String(d.descripcion).trim(), d.severidad, 'reporte en terreno', fo);
        var r2 = actualizar(db, u, actor, previo, inc.descripcion);
        return ok(db, ev, { unidad: u.id, incidencia: inc.id, severidad: inc.severidad, semaforoPrevio: previo, semaforo: u.semaforo, detenidas: r2.detenidas }, { incidencia: inc, semaforo: u.semaforo, detenidas: r2.detenidas });
      }
      case 'M_REPARAR': {
        // Diagnóstico y reparación del mecánico (paso 5). La máquina NO vuelve sola a operación.
        var inc2 = null; (db.equiposObra || []).some(function (x) { inc2 = (x.incidencias || []).filter(function (i) { return i.id === d.incidencia; })[0] || null; if (inc2) u = x; return !!inc2; });
        if (!inc2) return rechazar(db, ev, 'Incidencia no encontrada');
        previo = u.semaforo;
        if (inc2.estado !== 'ABIERTA') return rechazar(db, ev, 'La incidencia no está abierta');
        if (!esMecanico(actor)) return rechazar(db, ev, 'La reparación la registra un mecánico acreditado');
        if (!d.diagnostico || !d.reparacion) return rechazar(db, ev, 'Registra el diagnóstico y lo que se reparó');
        var fr = guardarFoto(db, d.foto, { unidad: u.id, tipo: 'reparacion', por: actor.id });
        if (fr === false) return rechazar(db, ev, 'La foto no es una imagen válida');
        Object.assign(inc2, { estado: 'REPARADA', diagnostico: d.diagnostico, reparacion: d.reparacion, reparadaPor: actor.id, reparadaEn: A.ahora(db), fotoReparacion: fr || null });
        inc2.historial.push({ estado: 'REPARADA', en: A.ahora(db), por: actor.id });
        C.avisar(db, destinatarios(db, u).filter(function (p) { var q = porId(db.personas, p); return puedeValidar(db, q, u) && p !== actor.id; }), 'EQUIPO', '🔧 ' + u.nombre + ': «' + inc2.descripcion + '» reparada por ' + actor.nombre + '. Falta validar el retorno a operación.', null);
        return ok(db, ev, { unidad: u.id, incidencia: inc2.id, semaforoPrevio: previo, semaforo: u.semaforo }, { incidencia: inc2 });
      }
      case 'M_VALIDAR_RETORNO': {
        // Regla 5: vuelve a operar solo con la validación de un responsable que no hizo la reparación
        if (!puedeValidar(db, actor, u)) return rechazar(db, ev, 'Valida el retorno Prevención, el jefe de terreno o el encargado de maquinaria de la empresa dueña del equipo');
        var rep = (u.incidencias || []).filter(function (i) { return i.estado === 'REPARADA'; });
        if (!rep.length) return rechazar(db, ev, 'No hay reparaciones pendientes de validar');
        if (rep.some(function (i) { return i.reparadaPor === actor.id; })) return rechazar(db, ev, 'Quien reparó no valida su propio trabajo');
        if (!d.presencial) return rechazar(db, ev, 'La validación del retorno es presencial: revisa la máquina en terreno');
        rep.forEach(function (i) { i.estado = 'CERRADA'; i.validadaPor = actor.id; i.validadaEn = A.ahora(db); i.historial.push({ estado: 'CERRADA', en: A.ahora(db), por: actor.id, observacion: d.observacion || null }); });
        u.semaforo = calcular(u);
        var detenidas = astsQueUsan(db, u).filter(function (a) { return a.estado === 'DETENIDA'; });
        if (BLOQUEAN.indexOf(u.semaforo) < 0) C.avisar(db, destinatarios(db, u), 'EQUIPO', SEMAFORO[u.semaforo].icono + ' ' + u.nombre + ' volvió a operación (validó ' + actor.nombre + ').' + (detenidas.length ? ' ' + detenidas.length + ' AST detenida(s) pueden reanudarse con causa y control.' : ' Antes de usarla, checklist del día.'), null);
        return ok(db, ev, { unidad: u.id, cerradas: rep.map(function (i) { return i.id; }), semaforoPrevio: previo, semaforo: u.semaforo }, { semaforo: u.semaforo, reanudables: detenidas.map(function (a) { return a.id; }) });
      }
      case 'M_MANTENCION': {
        // Mantención por horómetro (paso 6)
        if (!esMecanico(actor)) return rechazar(db, ev, 'La mantención la registra un mecánico acreditado');
        if (!u.mantencion) return rechazar(db, ev, 'Este equipo no tiene plan de mantención por horas');
        var hm = Number(d.horometro);
        if (!isFinite(hm) || hm < (u.horometro || 0)) return rechazar(db, ev, 'Ingresa el horómetro actual (no menor que ' + n(u.horometro) + ' h)');
        if (!d.detalle) return rechazar(db, ev, 'Indica qué se hizo en la mantención');
        u.mantencion.ultima = hm; u.horometro = hm; u.horometros.push({ valor: hm, en: A.ahora(db), por: actor.id, origen: 'mantención' });
        u.mantenciones.push({ en: A.ahora(db), por: actor.id, horometro: hm, detalle: d.detalle });
        u.semaforo = calcular(u);
        return ok(db, ev, { unidad: u.id, horometro: hm, detalle: d.detalle, semaforoPrevio: previo, semaforo: u.semaforo }, { semaforo: u.semaforo });
      }
      case 'M_ALTA': {
        // Dar de alta una máquina o equipo: genera su QR y su etiqueta
        if (!(actor.rol === 'prevencion' || actor.rol === 'jefe_terreno')) return rechazar(db, ev, 'Da de alta equipos Prevención o el jefe de terreno');
        if (!PLANTILLAS[d.tipo]) return rechazar(db, ev, 'Tipo de equipo sin plantilla');
        var cod = String(d.codigo || '').trim().toUpperCase();
        if (!/^[A-Z0-9-]{3,12}$/.test(cod)) return rechazar(db, ev, 'Código legible de 3 a 12 caracteres (letras, números y guion), p. ej. RETRO-05');
        if (unidad(db, cod) || (db.equiposObra || []).some(function (x) { return x.codigo === cod; })) return rechazar(db, ev, 'Ese código ya existe');
        var fam = ['manipulador_telescopico', 'retroexcavadora'].indexOf(d.tipo) >= 0 ? 'maquinaria' : 'equipo';
        var nu = { id: 'EQ-' + cod, codigo: cod, tipo: d.tipo, familia: fam, nombre: (d.nombre || d.tipo.replace(/_/g, ' ')) + ' ' + cod, empresa: d.empresa || actor.empresa,
          competencia: { manipulador_telescopico: 'operador_manipulador', retroexcavadora: 'operador_maquinaria' }[d.tipo] || null, horometro: fam === 'maquinaria' ? Number(d.horometro) || 0 : null, inspecciones: [] };
        if (fam === 'maquinaria') nu.mantencion = { ultima: Number(d.ultimaMantencion) || nu.horometro, intervalo: Number(d.intervalo) || 250 };
        db.equiposObra.push(nu); preparar(db);
        return ok(db, ev, { unidad: nu.id, codigo: cod, tipo: d.tipo, semaforo: nu.semaforo }, { unidad: nu });
      }
    }
    return rechazar(db, ev, 'Evento desconocido');
  }

  // ---------- Consultas para las pantallas ----------
  function flota(db) {
    return (db.equiposObra || []).filter(function (u) { return u.checkmaq; }).map(function (u) {
      var c = checklistHoy(db, u), m = mantencion(u);
      return { u: u, semaforo: calcular(u), checklistHoy: c, mantencion: m, abiertas: abiertas(u), asts: astsQueUsan(db, u) };
    }).sort(function (a, b) { return SEMAFORO[b.semaforo].orden - SEMAFORO[a.semaforo].orden || a.u.codigo.localeCompare(b.u.codigo); });
  }
  function resumen(db) {
    var f = flota(db), o = { total: f.length, VERDE: 0, AMARILLO: 0, NARANJA: 0, ROJO: 0, sinChecklist: 0 };
    f.forEach(function (x) { o[x.semaforo]++; if (x.u.familia === 'maquinaria' && !x.checklistHoy) o.sinChecklist++; });
    return o;
  }

  Object.assign(M, { aplicar: aplicar, preparar: preparar, estadoMaquina: estadoMaquina, flota: flota, resumen: resumen, unidad: unidad, plantilla: plantilla, mantencion: mantencion,
    checklistHoy: checklistHoy, abiertas: abiertas, astsQueUsan: astsQueUsan, calcular: calcular, motivoSemaforo: motivoSemaforo, puedeValidar: puedeValidar, esMecanico: esMecanico,
    SEMAFORO: SEMAFORO, SEVERIDAD_TXT: SEVERIDAD_TXT, EST_INC: EST_INC, BLOQUEAN: BLOQUEAN, PLANTILLAS: PLANTILLAS });
  if (typeof module !== 'undefined') module.exports = M; else g.ASTRA_M = M;
})(typeof window !== 'undefined' ? window : this);
