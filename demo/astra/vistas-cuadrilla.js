// ASTRA · pantallas del modo principal (AST de cuadrilla). La lógica está en cuadrilla.js; aquí solo se muestra y se llama.
// Usa los ayudantes que expone app.js en window.ASTRA_APP.
(function () {
  'use strict';
  var A = window.ASTRA, C = window.ASTRA_C;
  var X = function () { return window.ASTRA_APP; };
  var db = function () { return X().db; }, yoId = function () { return X().persona; }, yo = function () { return A.porId(db().personas, yoId()); };
  var h = function (t) { return X().h(t); }, chip = function (e) { return X().chip(e); }, est = function (e) { return X().est(e); }, hora = function (i) { return X().hora(i); };
  var ui = { crear: null, turno: null, equipo: null, escuchado: {}, cambio: null };
  var ESTADO_P = { INCLUIDO: 'incluido', INFORMADO: 'informado', RESPUESTAS_PENDIENTES: 'respuestas pendientes', PENDIENTE_REQUISITO: 'no cumple un requisito', LISTO_PARA_FIRMAR: 'listo para firmar', FIRMADO: 'firmado', RETIRADO: 'retirado' };
  var GRUPO_TXT = { basico: 'EPP básicos de la empresa', area: 'EPP de esta área', tarea: 'EPP de esta tarea', condicion: 'Condiciones del lugar y medidas de control', sistema: 'Lo que la app revisa en tu ficha' };
  function aprobadores(ast, a) { return C.responsablesDe(db(), a.area, a.calidad, ast.empresa); }

  // ---------- Acciones ----------
  // `turno`: trabajador que usa el teléfono de un mando (cuadrilla). Actúa él, con su credencial; el dispositivo es del mando.
  function act(tipo, astId, datos, textoOk) {
    var ev = { tipo: tipo, actor: yoId(), ast: astId, datos: datos || {} };
    if (ui.turno) { ev.actor = ui.turno.persona; ev.dispositivoDe = yoId(); ev.credencial = ui.turno.credencial; }
    var r = C.aplicar(db(), ev);
    X().setMsg(r.ok ? { ok: true, texto: textoOk || 'Listo' } : { ok: false, texto: 'No se pudo: ' + r.motivo });
    X().guardar();
    return r;
  }
  // D-038: si la persona tiene otra participación vigente, antes de seguir declara si la finalizó o la pausó
  function actCambio(tipo, astId, datos, textoOk, destino) {
    var r = act(tipo, astId, datos, textoOk);
    if (!r.ok && r.anteriores) { X().setMsg(null); ui.cambio = { tipo: tipo, ast: astId, datos: datos, textoOk: textoOk, destino: destino, otras: r.anteriores }; ir('#/cambio'); return null; }
    return r;
  }
  function jornadasPosibles() { var max = (db().config && db().config.maxJornadasAst) || 7, l = []; for (var n = 2; n <= max; n++) l.push(n); return l; }
  // D-049: en una AST de varias jornadas, cada día se hace la evaluación rápida y cada persona se registra
  function bloqueDia(ast, p) {
    if (!C.variasJornadas(ast) || ['CERRADA', 'ANULADA'].indexOf(ast.estado) >= 0 || !C.exigeRegistro(db(), ast)) return '';
    var i = C.integrante(ast, p.id), esEnc = C.esResponsable(db(), ast, 'encargado_area', p.id) || p.rol === 'prevencion';
    if (!i && !esEnc) return '';
    var dr = (ast.registrosDiarios || {})[C.diaChile(A.ahora(db()))] || null, evl = dr && dr.evaluacion;
    if (!evl) {
      return '<form data-c-evaldia="' + ast.id + '" class="tarjeta"><b class="grande-t">Evaluación rápida de hoy</b><p class="suave">Es otro día de trabajo en esta AST. Antes de que alguien se registre, se revisa si algo cambió.</p>' +
        ['cambioArea|¿Cambió el área?', 'cambioTarea|¿Cambió la tarea?', 'condicionesIguales|¿Las condiciones siguen iguales?'].map(function (q) { var k = q.split('|'); return '<div class="sino"><b>' + k[1] + '</b><label class="op-si"><input type="radio" name="' + k[0] + '" value="si"><span>Sí</span></label><label class="op-no"><input type="radio" name="' + k[0] + '" value="no"><span>No</span></label></div>'; }).join('') +
        '<textarea name="diferencia" placeholder="Si algo cambió: ¿cuál es la diferencia con la AST original?" rows="2" style="width:100%"></textarea><button class="primario enorme">Guardar la evaluación del día</button></form>';
    }
    var html = '<div class="tarjeta"><b>Evaluación de hoy</b> <span class="suave">· ' + h(A.nombre(db(), evl.por)) + '</span><br>' + (evl.requiereAccion ? '<span class="chip aviso">Hay cambios</span> ' + h(evl.diferencia) + (evl.resuelta ? ' <span class="chip ok">agregado (' + h(evl.resuelta.tipo) + ')</span>' : '<br><b>Falta agregar lo que cambió (etapa o cambio) antes de registrarse.</b>') : '<span class="chip ok">Sin cambios: continúa como está</span>') + '</div>';
    if (i && C.participacion(i).estado === 'VIGENTE' && !(dr.registros || {})[p.id] && (!evl.requiereAccion || evl.resuelta))
      html += '<form data-c-regdia="' + ast.id + '" class="tarjeta"><b class="grande-t">Registrarme hoy en esta AST</b><label class="opcion"><input type="checkbox" name="conf"> Confirmo que hoy las condiciones son las que dice la evaluación</label>' + (ui.turno ? '' : '<input name="cred" placeholder="Tu ' + (C.modoFirma(db(), p) === 'PIN' ? 'PIN' : 'RUT') + '" class="grande">') + '<button class="primario enorme">Registrarme</button></form>';
    else if (i && (dr.registros || {})[p.id]) html += '<div class="mensaje ok">✔ Te registraste hoy.</div>';
    return html;
  }
  function vInforme(ast) {
    var r = C.informeAst(db(), ast.id), nom = function (id) { return h(A.nombre(db(), id)); };
    if (!r) return '<p>Sin informe.</p>';
    return '<h1>Informe de la AST</h1><p class="suave">' + h(ast.nombre) + ' · ' + r.desde + ' al ' + r.hasta + (r.jornadas ? ' · ' + r.jornadas + ' jornadas' : '') + '</p>' + X().mensaje() +
      '<div class="tarjeta"><b>Continuidad</b><p>Estuvieron todos los días: ' + (r.continuidad.todosLosDias.length ? r.continuidad.todosLosDias.map(nom).join(', ') : 'nadie') + '</p>' +
      (r.continuidad.entraron.length ? '<p>Entraron después: ' + r.continuidad.entraron.map(function (x) { return nom(x.persona) + ' (' + x.desde + ')'; }).join(', ') + '</p>' : '') +
      (r.continuidad.salieron.length ? '<p>Dejaron de registrarse: ' + r.continuidad.salieron.map(function (x) { return nom(x.persona) + (x.hasta ? ' (último: ' + x.hasta + ')' : ' (nunca)'); }).join(', ') + '</p>' : '') + '</div>' +
      '<div class="tarjeta tabla"><table><tr><th>Día</th><th>Evaluación</th><th>Registrados</th><th>Sin registro</th><th>Cambios y etapas</th><th>Hallazgos, detenciones, observaciones</th></tr>' + r.dias.map(function (d) {
        return '<tr><td>' + d.fecha + '</td><td>' + (d.evaluacion ? (d.evaluacion.diferencia ? 'Cambios: ' + h(d.evaluacion.diferencia) : 'Sin cambios') : '<span class="suave">—</span>') + '</td><td>' + d.registrados.map(nom).join(', ') + '</td><td>' + d.ausentes.map(nom).join(', ') + '</td><td>' + d.cambios.map(function (c) { return h(c.texto); }).concat(d.etapas.map(function (e) { return 'Etapa ' + e.n + ': ' + h(e.motivo || ''); })).join('; ') + '</td><td>' + d.hallazgos.length + ' · ' + d.detenciones.length + ' · ' + (d.observaciones.length + d.observacionesPosteriores.length) + '</td></tr>'; }).join('') + '</table></div>' +
      (r.inconsistencias.length ? '<div class="mensaje mal">' + r.inconsistencias.map(function (x) { return h(x.dia + ': ' + x.texto); }).join('<br>') + '</div>' : '') +
      '<div class="tarjeta"><b>Etapas</b><ul>' + r.etapas.map(function (e) { return '<li>Etapa ' + e.n + ': ' + h(e.fichas.join(', ')) + (e.motivo ? ' · ' + h(e.motivo) : '') + '</li>'; }).join('') + '</ul></div>' +
      '<a class="boton" href="#/c/' + ast.id + '">Volver a la AST</a>';
  }
  function vCambio() {
    var w = ui.cambio; if (!w) return '<p class="suave">No hay un cambio de tarea pendiente.</p><a class="boton enorme" href="#/">Inicio</a>';
    var nueva = A.porId(db().asts, w.ast);
    return '<h1>Antes de seguir</h1>' + X().mensaje() + '<p class="grande-t">Vas a ' + (w.tipo === 'C_REANUDAR_PARTICIPACION' ? 'volver a' : 'pasar a') + ' <b>' + h(nueva.nombre || nueva.descripcion) + '</b> (' + h(areaDe(nueva).nombre) + '). Tienes otra participación vigente:</p>' +
      '<form data-c-cambio class="tarjeta">' + w.otras.map(function (o) {
        return '<div class="preg"><div class="preg-t"><b>¿Finalizaste o pausaste tu participación en ' + h(o.nombre) + '?</b><br><span class="suave">' + o.ast + ' · ' + h(A.porId(db().areas, o.area).nombre) + '</span></div><div class="sino">' +
          '<label class="op-si"><input type="radio" name="' + o.ast + '" value="FINALIZAR"><span>La finalicé</span></label><label class="op-na"><input type="radio" name="' + o.ast + '" value="PAUSAR"><span>La pausé: voy a volver</span></label></div></div>';
      }).join('') + '<p class="suave">Solo cambia tu participación: esa AST sigue para los demás. Queda la hora en tu jornada.</p><button class="primario enorme">Continuar</button></form><button class="enorme" data-c-cambio-cancelar>Cancelar</button>';
  }
  // Participación pausada o finalizada (D-038): lo que ve la persona al abrir esa AST
  function bloqueParticipacion(ast, pa) {
    var ult = pa.historial.slice(-1)[0];
    if (pa.estado === 'FINALIZADA') return '<div class="mensaje aviso-zona grande-t">Finalizaste tu participación a las ' + hora(ult.en).slice(11, 16) + '. La AST sigue para los demás. Si vuelves a esta tarea, incorpórate de nuevo.</div>';
    if (['CERRADA', 'ANULADA', 'DETENIDA'].indexOf(ast.estado) >= 0) return '<div class="mensaje mal grande-t">Pausaste tu participación a las ' + hora(ult.en).slice(11, 16) + '. La AST está ' + ast.estado.toLowerCase() + ': no puedes volver por ahora.</div>';
    return '<div class="mensaje aviso-zona grande-t">Pausaste tu participación a las ' + hora(ult.en).slice(11, 16) + '. No estás habilitado aquí mientras esté pausada.</div>' +
      '<form data-c-volver="' + ast.id + '" class="tarjeta"><b>¿Vuelves a esta tarea?</b><p>Desde que saliste, ¿cambiaron las condiciones del lugar, el equipo, las personas o el método?</p><div class="sino"><label class="op-no"><input type="radio" name="cambio" value="si"><span>Sí, algo cambió</span></label><label class="op-si"><input type="radio" name="cambio" value="no"><span>No, todo igual</span></label></div>' +
      '<p class="suave">Si algo cambió, o hubo una detención u observación mientras no estabas, vuelves a responder y firmar.</p><button class="primario enorme">Vuelvo a esta tarea</button></form>';
  }
  function quienActua() { return ui.turno ? A.porId(db().personas, ui.turno.persona) : yo(); }
  function hablar(texto) {
    try {
      if (!window.speechSynthesis) return false;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(texto.replace(/ASTs?/g, 'A ese te')), v = speechSynthesis.getVoices().filter(function (x) { return /^es(-|_)CL/i.test(x.lang); })[0] || speechSynthesis.getVoices().filter(function (x) { return /^es/i.test(x.lang); })[0];
      if (v) u.voice = v; u.lang = v ? v.lang : 'es-CL'; u.rate = 0.95; speechSynthesis.speak(u); return true;
    } catch (e) { return false; }
  }
  function resumenTexto(ast) {
    var fs = C.fichasDe(db(), ast), pasos = [], pel = [];
    fs.forEach(function (f) { f.pasos.forEach(function (p) { pasos.push(p.texto); }); f.peligros.forEach(function (p) { if (!pel.some(function (x) { return x.riesgo === p.riesgo; })) pel.push(p); }); });
    return 'AST ' + ast.nombre + '. Procedimientos: ' + ast.referencias.filter(function (r) { return !/^(MR|MIPER|RA|EST|FOR)-/.test(r.id); }).map(function (r) { return r.titulo + ', versión ' + r.version; }).join('; ') + '. ' +
      'Cómo se hace: ' + pasos.map(function (p, i) { return (i + 1) + '. ' + p; }).join(' ') + ' ' +
      'Riesgos y controles: ' + pel.map(function (p) { return p.riesgo + ': ' + p.control + '.'; }).join(' ') + ' ' +
      'Si algo cambia o ves peligro, detén el trabajo y avisa.';
  }
  function citas(r) { return (r.citas && r.citas.length ? r.citas : [r.cita]).filter(Boolean).map(h).join(' · '); }
  // Equipos de la AST: registro vigente que la app comprueba, o inspección nueva (D-043 §4)
  function bloqueEquipos(ast, persona) {
    var est = C.estadoEquipos(db(), ast); if (!est.length) return '';
    var html = '<div class="tarjeta"><b>Equipos de esta AST</b>' + est.map(function (x) {
      return '<div class="req"><div><b>' + h(x.nombre) + '</b> · ' + h(x.unidad || x.equipo) + '<div class="det">' + h(x.detalle) + ' <span class="cita">' + citas(x) + '</span></div></div>' + chip(x.estado === 'VIGENTE' ? 'VIGENTE' : x.estado === 'REQUIERE_INSPECCION' ? 'PENDIENTE' : 'NO_CUMPLE') + (x.qrMaquina ? ' <a href="#/m/' + x.qrMaquina + '" title="Ficha de la máquina">ficha</a>' : '') + '</div>';
    }).join('');
    var i = C.integrante(ast, persona.id), rolesEq = C.rolesDe(C.fichasDe(db(), ast)).filter(function (r) { return r.equipo; }).map(function (r) { return r.id; });
    var puede = (i && (i.roles || []).some(function (r) { return rolesEq.indexOf(r) >= 0; })) || C.esResponsable(db(), ast, 'encargado_area', persona.id) || persona.rol === 'prevencion';
    est.filter(function (x) { return x.estado === 'REQUIERE_INSPECCION' && x.unidad; }).forEach(function (x) {
      var eq = C.equiposDe(C.fichasDe(db(), ast)).filter(function (e) { return (ast.equipos || []).some(function (a) { return a.id === e.id && a.unidad === x.unidad; }); })[0];
      if (x.qrMaquina) { html += '<a class="boton-grande destacado" href="#/m/' + x.qrMaquina + '/checklist/' + ast.id + '"><span>📋 Checklist de ' + h(x.unidad) + ' en Checkmaq</span><small>horómetro y revisión pre-uso; lo hace quien la opera</small></a>'; return; }
      html += puede && eq ? '<form data-c-inspeccion="' + ast.id + '" data-unidad="' + x.unidad + '" class="tarjeta"><b>Inspección pre-uso de ' + h(x.unidad) + '</b> <span class="cita">' + h(eq.cita || '') + '</span>' +
        eq.inspeccion.map(function (t, k) { return '<label class="opcion"><input type="checkbox" name="it" value="' + k + '"> ' + h(t) + '</label>'; }).join('') +
        '<input name="obs" placeholder="Observación (opcional)" style="margin-top:6px"><p class="suave">Marca solo lo que revisaste y está bien. Si algo falla, el equipo no se usa y se avisa.</p><button class="primario">Registrar inspección</button></form>'
        : '<p class="suave">La inspección la registra quien opera el equipo, el encargado del área o Prevención.</p>';
    });
    return html + '</div>';
  }
  function areaDe(ast) { return A.porId(db().areas, ast.area); }
  function subc(ast) { return C.esSubcontrato(db(), ast) ? ' <span class="chip aviso">' + h(C.etiquetaEmpresa(db(), ast)) + '</span>' : ''; }
  function nombreEmp(pid) { var p = A.porId(db().personas, pid); return p ? h(p.nombre) + ' <span class="suave">· ' + h(A.porId(db().empresas, p.empresa).nombre) + '</span>' : '—'; }
  function astsCuadrillaArea(areaId, abiertas) {
    return db().asts.filter(function (a) { return a.modo === 'cuadrilla' && a.area === areaId && (!abiertas || ['CERRADA', 'ANULADA'].indexOf(a.estado) < 0); });
  }

  // ---------- P1 · Centro del área: se abre directo al escanear su QR (D-043 §1) ----------
  function areaHub(a) {
    var p = yo(), comps = Object.keys(p.comp || {}).filter(function (k) { return C.compVigente(db(), p, k); }).map(function (k) { return p.comp[k].nombre; });
    var esMando = A.MANDO.indexOf(p.rol) >= 0;
    var html = '<h1 class="titulo-area">' + h(C.tituloArea(a)) + '</h1>' + X().mensaje() +
      '<div class="mensaje aviso-zona">📵 Estás en la zona de llenado de esta área: usa el teléfono solo aquí y guárdalo durante el trabajo.</div>' +
      '<div class="tarjeta ficha"><b>' + h(p.nombre) + '</b> · ' + h(p.cargo) + '<br><span class="suave">' + h(A.porId(db().empresas, p.empresa).nombre) + (A.porId(db().empresas, p.empresa).tipo === 'contratista' ? ' · Subcontrato' : '') + '</span>' +
      '<div style="margin-top:6px">' + (comps.length ? comps.map(function (c) { return '<span class="chip ok">🎓 ' + h(c) + '</span> '; }).join('') : '<span class="suave">Sin capacitaciones específicas registradas</span>') + '</div></div>' +
      (window.ASTRA_VL ? window.ASTRA_VL.tarjeta() : '') +
      '<a class="boton-grande" href="#/a/' + a.qr + '/unirme"><span>👥 Unirme a una AST de esta área</span><small>' + astsCuadrillaArea(a.id, true).filter(function (x) { return x.ficha; }).length + ' AST abiertas</small></a>' +
      '<a class="boton-grande" href="#/a/' + a.qr + '/crear"><span>＋ Crear una AST nueva</span><small>Cuenta qué harás y con qué equipos: la app identifica sus procedimientos</small></a>' +
      (esMando ? '<a class="boton-grande" href="#/a/' + a.qr + '/equipo"><span>🧑‍🤝‍🧑 Ingresar equipo de trabajo</span><small>Registra a tu cuadrilla por RUT</small></a>' : '') +
      (window.ASTRA_VT ? window.ASTRA_VT.botonesArea(a) : '') +
      '<div class="tarjeta"><b>Peligros del área</b><ul>' + a.diagnostico.peligros.map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul></div>';
    var activas = A.tableroArea(db(), yoId(), a.id);
    if (activas.length) html += '<h2>Trabajos activos del área</h2>' + activas.map(function (t) {
      return '<div class="tarjeta"><b>' + h(t.tarea) + '</b> ' + est(t.estado) + (t.propia ? ' · <a href="#/' + (t.ast.modo === 'cuadrilla' ? 'c' : 'ast') + '/' + t.id + '">' + t.id + '</a>' : '<br><span class="suave">' + h(t.empresa) + ' · ' + h(t.contacto) + '</span>') + '<div style="margin-top:8px">' + X().botonDetener(t.id, true) + '</div></div>';
    }).join('');
    if (['operador'].concat(A.MANDO).indexOf(p.rol) >= 0) html += '<p class="suave" style="margin-top:14px"><a href="#" data-crear-critica="' + a.id + '">Tarea crítica con manipulador telescópico (modo detallado T01)</a></p>';
    return html;
  }

  // ---------- P3 · Unirse ----------
  function vUnirme(a) {
    var lista = astsCuadrillaArea(a.id, true).filter(function (x) { return x.ficha && x.estado !== 'REVISION_DOCUMENTAL'; });
    return '<h1>Unirme a una AST</h1><p class="suave">' + h(C.tituloArea(a)) + '</p>' + (lista.length ? lista.map(function (x) {
      var mia = C.integrante(x, yoId());
      return '<a class="tarjeta enlace grande-t" href="#/c/' + x.id + (mia ? '/yo' : '/ver') + '"><div class="fila" style="justify-content:space-between"><b>' + h(x.nombre) + '</b>' + est(x.estado) + '</div>' +
        '<span class="suave">' + x.id + ' · a cargo: ' + h(A.nombre(db(), C.responsable(db(), x, 'encargado_area') || x.creadaPor)) + ' · ' + x.integrantes.length + ' persona(s)</span>' + subc(x) + (mia ? '<br><span class="chip info">ya estás: ' + ESTADO_P[mia.estado] + '</span>' : '') + '</a>';
    }).join('') : '<p class="grande-t suave">No hay AST abiertas en esta área. Puedes crear una.</p>') + '<a class="boton enorme" href="#/a/' + a.qr + '">Volver</a>';
  }
  function detalleTrabajo(ast) {
    var fs = C.fichasDe(db(), ast);
    return '<div class="tarjeta"><b>Qué se hace</b><p>' + h(ast.descripcion) + '</p><ol>' + fs.reduce(function (l, f) { return l.concat(f.pasos); }, []).map(function (p) { return '<li>' + h(p.texto) + ' <span class="cita">' + h(p.cita) + '</span></li>'; }).join('') + '</ol></div>' +
      '<div class="tarjeta"><b>Riesgos y cómo se controlan</b>' + fs.reduce(function (l, f) { return l.concat(f.peligros); }, []).map(function (p) { return '<div class="req"><div><b>' + h(p.riesgo) + '</b><div class="det">' + h(p.peligro) + ' → ' + h(p.control) + ' <span class="cita">' + h(p.cita) + '</span></div></div></div>'; }).join('') + '</div>' +
      '<div class="tarjeta"><b>Documentos de referencia</b><ul>' + ast.referencias.map(function (r) { return '<li>' + h(r.id) + ' · ' + h(r.titulo) + ' · <b>versión ' + h(r.version) + '</b></li>'; }).join('') + '</ul></div>';
  }
  function vVer(ast) {
    return '<h1>' + h(ast.nombre) + '</h1><p class="suave">' + h(C.tituloArea(areaDe(ast))) + ' · ' + ast.id + '</p>' + subc(ast) + X().mensaje() + detalleTrabajo(ast) +
      '<button class="primario enorme" data-c-unirse="' + ast.id + '">Registrarme en esta AST</button><a class="boton enorme" href="#/a/' + areaDe(ast).qr + '/unirme">Volver</a>';
  }

  // ---------- Incorporación de una persona (P3 pasos 4–6, también en el teléfono del capataz) ----------
  function vIncorporacion(ast) {
    var p = quienActua(), i = C.integrante(ast, p.id), fs = C.fichasDe(db(), ast), html = '';
    if (ui.turno) html += '<div class="mensaje aviso-zona">📱 Teléfono de ' + h(yo().nombre) + ' · ahora completa <b>' + h(p.nombre) + '</b> con su propia credencial. <button data-c-devolver>Devolver el teléfono</button></div>';
    html += '<h1>' + h(ast.nombre) + '</h1><p class="suave">' + h(C.tituloArea(areaDe(ast))) + ' · ' + h(p.nombre) + '</p>' + subc(ast) + X().mensaje();
    if (!i) return html + '<p class="grande-t">No estás en esta AST.</p><a class="boton enorme" href="#/c/' + ast.id + '/ver">Ver y registrarme</a>';
    if (!fs.length) return html + '<p>Esta AST aún no tiene procedimiento.</p>';
    var pa = C.participacion(i);
    if (pa.estado !== 'VIGENTE') return html + bloqueParticipacion(ast, pa);
    html += bloqueDia(ast, p);
    if (!i.informado) {
      return html + '<div class="tarjeta"><b>Antes de empezar, escucha o lee el resumen</b><p class="grande-t">' + h(resumenTexto(ast)) + '</p></div>' +
        '<button class="acento enorme" data-c-escuchar="' + ast.id + '">🔊 Escuchar el resumen</button>' +
        '<button class="primario enorme" data-c-informado="' + ast.id + '">Ya lo ' + (ui.escuchado[ast.id] ? 'escuché' : 'leí') + '</button>';
    }
    var abiertos = C.faltantesAbiertos(ast, p.id);
    if (i.estado === 'PENDIENTE_REQUISITO') {
      html += '<div class="mensaje mal grande-t"><b>' + h(i.bloqueo || C.mensajeBloqueo(abiertos)) + '</b><br>Lo que respondiste quedó guardado. Se avisó al encargado del área y a Prevención.</div>' +
        '<div class="tarjeta">' + abiertos.map(function (x) { return '<div class="req"><div><b>' + h(x.nombre) + '</b><div class="det">' + h(C.NIVEL_TXT[x.nivel]) + (x.gestion ? ' · gestionado por ' + h(A.nombre(db(), x.gestion.por)) + ': ' + h(x.gestion.texto) + ' (falta confirmar)' : ' · avisado al encargado del área y a Prevención') + '</div></div>' + chip(x.estado === 'GESTIONADO' ? 'EN_REVISION' : 'NO_CUMPLE') + '</div>'; }).join('') + '</div>';
      return html;
    }
    if (i.estado === 'INFORMADO' || i.estado === 'INCLUIDO' || i.estado === 'RESPUESTAS_PENDIENTES') return html + formRequisitos(ast, p, i);
    if (i.estado === 'LISTO_PARA_FIRMAR') {
      var modo = C.modoFirma(db(), p);
      if (modo === 'PIN' && !p.pin) return html + '<form data-c-crearpin class="tarjeta"><h2>Crea tu PIN personal</h2><p class="suave">Tu empresa firma con PIN. Se crea una sola vez.</p><label class="campo grande">Tu RUT</label><input name="rut" class="grande" type="text" autocomplete="off"><label class="campo grande">PIN de 4 números</label><input name="pin" class="grande" inputmode="numeric" maxlength="4" type="password"><button class="primario enorme">Crear PIN</button></form>';
      return html + resumenFinal(ast, p, i, modo);
    }
    // Firmado: estado claro; «Iniciar trabajo» solo cuando está todo (D-043 §7)
    var ini = C.inicio(db(), ast, p.id);
    html += window.ASTRA_VT ? window.ASTRA_VT.bloqueTrabajador(ast, p.id) : '';
    if (i.inicioTrabajo) html += '<div class="semaforo si">TRABAJO INICIADO ' + hora(i.inicioTrabajo.en).slice(11, 16) + '</div><p class="grande-t" style="text-align:center">📵 Guarda el teléfono. Si algo cambia o ves peligro, detén de palabra y avisa.</p>';
    else if (ini.ok) html += '<div class="mensaje ok grande-t">AST verificada y autorizada.</div><button class="primario enorme" data-c-iniciar="' + ast.id + '">Iniciar trabajo</button>';
    else html += '<div class="mensaje aviso-zona grande-t"><b>' + h(C.estadoTexto(db(), ast) || 'AST registrada. Pendiente de verificación del encargado del área') + '</b></div>' +
      '<div class="tarjeta"><b>Antes de iniciar falta:</b><ul class="grande-t">' + ini.falta.map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul><p class="suave">«Iniciar trabajo» aparece cuando estén completas las verificaciones, autorizaciones y permisos.</p></div>';
    html += bloqueEquipos(ast, p);
    html += '<p class="suave">Confirmaste ' + hora(i.firma.en) + ' con ' + h(i.firma.mecanismo) + (i.firma.trazo ? ' y tu firma' : '') + '.</p>';
    if (i.firma.trazo && /^data:image\/png;base64,/.test(i.firma.trazo)) html += '<img class="firma-img" src="' + i.firma.trazo + '" alt="Tu firma">';
    if (ui.turno) html += '<button class="primario enorme" data-c-devolver>Devolver el teléfono a ' + h(yo().nombre) + '</button>';
    if (!ui.turno && ['CERRADA', 'ANULADA'].indexOf(ast.estado) < 0) html += '<div class="tarjeta"><b>¿Dejas esta tarea?</b><p class="suave">Solo cambia tu participación; la AST sigue para los demás.</p><div class="fila"><button data-c-part="C_PAUSAR_PARTICIPACION" data-ast="' + ast.id + '">Pausar: voy a volver</button><button data-c-part="C_FINALIZAR_PARTICIPACION" data-ast="' + ast.id + '">Terminé mi parte</button></div></div>';
    return html + (['CERRADA', 'ANULADA'].indexOf(ast.estado) < 0 ? X().botonDetener(ast.id) : '');
  }

  // D-043 §4: primero en qué labores participa y qué rol asume; después los requisitos, en bloques breves
  var ESTADO_R = { SI: 'Cumple', NO: 'No cumple', NA: 'No aplica' };
  function bloques(reqs) {
    var orden = ['basico', 'area', 'tarea'];
    reqs.forEach(function (r) { if (orden.indexOf(r.grupo) < 0 && r.grupo !== 'condicion' && r.grupo !== 'sistema') orden.push(r.grupo); });
    orden.push('condicion');
    var out = [];
    orden.forEach(function (g) {
      var l = reqs.filter(function (r) { return r.grupo === g && r.nivel !== 'sistema'; });
      var titulo = GRUPO_TXT[g] || (/^rol:/.test(g) ? 'Como ' + (C.rolesDe(C.fichasDe(db(), ui.astBloques)).filter(function (x) { return 'rol:' + x.id === g; })[0] || { nombre: 'responsable' }).nombre.toLowerCase() : 'Para utilizar ' + g.split(':')[1]);
      for (var k = 0; k < l.length; k += 4) out.push({ titulo: titulo, items: l.slice(k, k + 4) });
    });
    return out;
  }
  function formRequisitos(ast, p, i) {
    var fs = C.fichasDe(db(), ast), roles = C.rolesDe(fs);
    if ((fs.length > 1 || roles.length) && !i.labores) {
      return '<form data-c-labores="' + ast.id + '" class="tarjeta"><h2>Tu parte en este trabajo</h2>' +
        (fs.length > 1 ? '<p class="grande-t">¿En qué partes del trabajo participarás?</p>' + fs.map(function (f) { return '<label class="opcion grande-t"><input type="checkbox" name="labor" value="' + f.id + '" checked> ' + h(f.nombre) + '</label>'; }).join('') : '<input type="hidden" name="labor" value="' + fs[0].id + '">') +
        roles.map(function (r) { return '<div class="preg"><div class="preg-t"><b>' + h(r.texto) + '</b> <span class="cita">' + citas(r) + '</span></div><div class="sino"><label class="op-si"><input type="radio" name="rol:' + r.id + '" value="si" data-ficha="' + r.fichas[0] + '"><span>Sí</span></label><label class="op-no"><input type="radio" name="rol:' + r.id + '" value="no"><span>No</span></label></div></div>'; }).join('') +
        '<p class="suave">Así la app te pregunta solo lo que te corresponde: lo del operador o del equipo no se le pide a todos.</p><button class="primario enorme">Seguir</button></form>';
    }
    ui.astBloques = ast;
    var reqs = C.requisitosPersona(db(), ast, p.id), resp = i.respuestas || {}, bs = bloques(reqs);
    var k = bs.findIndex(function (b) { return b.items.some(function (r) { return !resp[r.id]; }); });
    if (k < 0) k = bs.length - 1;
    var b = bs[k];
    var fila = function (r) {
      var v = (resp[r.id] || {}).valor;
      return '<div class="preg' + (v === 'NO' ? ' marcada-no' : '') + '"><div class="preg-t"><span class="ico">' + (r.icono || '🦺') + '</span><span><b>¿' + (r.tipo === 'condicion' ? h(r.nombre) + '?' : 'Dispones de ' + h(r.nombre.charAt(0).toLowerCase() + r.nombre.slice(1)) + '?') + '</b>' + (r.critico ? ' <span class="chip mal">crítico</span>' : '') + '<br><span class="cita">' + citas(r) + '</span>' + (r.critico ? ' <span class="chip nivel-responsable">pendiente de verificación en terreno</span>' : '') + '</span></div>' +
        '<div class="sino"><label class="op-si"><input type="radio" name="' + r.id + '" value="SI"' + (v === 'SI' ? ' checked' : '') + '><span>Cumple</span></label>' +
        '<label class="op-no"><input type="radio" name="' + r.id + '" value="NO"' + (v === 'NO' ? ' checked' : '') + '><span>No cumple</span></label>' +
        (r.noAplica ? '<label class="op-na"><input type="radio" name="' + r.id + '" value="NA"' + (v === 'NA' ? ' checked' : '') + '><span>No aplica: ' + h(r.noAplica.cuando) + ' <span class="cita">' + h(r.noAplica.cita) + '</span></span></label>' : '') + '</div></div>';
    };
    return '<form data-c-declarar="' + ast.id + '" data-parcial="1"><p class="suave">Paso ' + (k + 1) + ' de ' + bs.length + ' · marcar «Cumple» es tu declaración; lo crítico lo verifica después el encargado en terreno.</p>' +
      '<h2>' + h(b.titulo) + '</h2>' + b.items.map(fila).join('') + '<button class="primario enorme">' + (k + 1 < bs.length ? 'Siguiente' : 'Ver resumen') + '</button></form>';
  }
  // D-043 §6: resumen y confirmación final, con la identidad ya iniciada
  function resumenFinal(ast, p, i, modo) {
    var D = db(), reqs = C.requisitosPersona(D, ast, p.id), fs = C.fichasDe(D, ast);
    var herr = C.preguntasDe(fs).filter(function (q) { return q.herramienta && ast.respuestas[q.id] === true; }).map(function (q) { return q.herramienta; });
    var eqs = (ast.equipos || []).map(function (e) { return e.nombre + (e.unidad ? ' (' + e.unidad + ')' : ''); });
    var decl = reqs.filter(function (r) { return r.nivel !== 'sistema' && i.respuestas[r.id]; }), sis = reqs.filter(function (r) { return r.nivel === 'sistema'; });
    var pend = reqs.filter(function (r) { return r.critico && r.nivel !== 'sistema' && (i.verif[r.id] || {}).estado === 'PENDIENTE_VERIFICACION'; }).map(function (r) { return r.nombre + ' — la verifica ' + (r.verifica === 'especializada' ? 'Prevención' : 'el encargado del área'); });
    C.estadoEquipos(D, ast).filter(function (x) { return x.estado !== 'VIGENTE'; }).forEach(function (x) { pend.push(x.nombre + ' de ' + (x.unidad || x.equipo) + ': ' + x.detalle.toLowerCase()); });
    var aprob = ['Verificación presencial del encargado del área'];
    fs.forEach(function (f) { (f.aprobaciones || []).concat.apply(f.aprobaciones || [], Object.keys(f.aprobacionesSi || {}).filter(function (k) { return ast.respuestas[k]; }).map(function (k) { return f.aprobacionesSi[k]; })).forEach(function (a) { var t = (C.CALIDAD[a.calidad || a] || a.calidad) + (a.modo === 'presencial' ? ' (en terreno)' : ' (revisión)'); if (aprob.indexOf(t) < 0) aprob.push(t); }); });
    ast.permisos.forEach(function (x) { if (x.estado !== 'AUTORIZADO') pend.push(x.nombre + ': se tramita antes de iniciar'); });
    var crea = ast.creadaPor === p.id && ast.estado === 'BORRADOR';
    return '<h2>Resumen antes de registrar</h2><div class="tarjeta"><table>' +
      '<tr><td><b>Área</b></td><td>' + h(C.tituloArea(areaDe(ast))) + '</td></tr>' +
      '<tr><td><b>Trabajo descrito</b></td><td>' + h(ast.descripcion) + '</td></tr>' +
      '<tr><td><b>Procedimientos</b></td><td>' + ast.referencias.filter(function (r) { return !/^(MR|MIPER|RA|EST|FOR)-/.test(r.id); }).map(function (r) { return h(r.titulo) + ' v' + h(r.version); }).join('<br>') + '</td></tr>' +
      '<tr><td><b>Equipos y herramientas</b></td><td>' + (eqs.concat(herr).map(h).join(', ') || '—') + '</td></tr></table></div>' +
      '<div class="tarjeta"><b>Requisitos que declaraste</b>' + decl.map(function (r) { var v = i.respuestas[r.id].valor; return '<div class="mini-ast"><span>' + h(r.nombre) + '</span>' + (v === 'SI' ? (r.critico ? '<span class="chip aviso">cumple · pendiente de verificación</span>' : '<span class="chip ok">cumple · declarado</span>') : '<span class="chip">no aplica</span>') + '</div>'; }).join('') +
      (sis.length ? '<b>Lo que la app comprobó en tu ficha</b>' + sis.map(function (r) { return '<div class="mini-ast"><span>' + h(r.nombre) + '</span><span class="chip ok">vigente en el sistema</span></div>'; }).join('') : '') + '</div>' +
      '<div class="tarjeta"><b>Verificaciones pendientes</b><ul>' + pend.concat(aprob).map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul></div>' +
      '<form data-c-firmar="' + ast.id + '" class="tarjeta destacada"><p class="grande-t"><b>¿Confirma que realizará este trabajo y desea registrar esta AST?</b></p>' +
      '<label class="opcion grande-t"><input type="checkbox" name="soyyo"> Soy <b>' + h(p.nombre) + '</b> · ' + h(X().ident(p)) + ' · ' + h(A.porId(D.empresas, p.empresa).nombre) + '</label>' +
      // P-024 (13-nov): recuadro para firmar con el dedo, además del RUT o PIN
      '<div class="firma-pad"><div class="fila" style="justify-content:space-between;align-items:baseline"><span class="campo grande">Firma aquí con el dedo</span><button type="button" data-firma-borrar>Borrar firma</button></div>' +
      '<canvas data-firma-pad width="600" height="220" role="img" aria-label="Recuadro para firmar con el dedo"></canvas><input type="hidden" name="trazo" value="">' +
      '<p class="suave">Firma electrónica simple (Ley 19.799), aceptada en tu contrato y comunicada a la Inspección del Trabajo.</p></div>' +
      (ui.turno ? '<p class="suave">Ya ingresaste tu credencial al tomar el teléfono.</p>' : '<label class="campo grande">' + (modo === 'PIN' ? 'Confirma con tu PIN personal' : 'Confirma con tu RUT') + '</label><input name="cred" class="grande" type="' + (modo === 'PIN' ? 'password' : 'text') + '" ' + (modo === 'PIN' ? 'inputmode="numeric" maxlength="4"' : '') + ' autocomplete="off">') +
      '<p class="suave">Confirmas que recibiste la información y que lo que marcaste es verdad. No aprueba la AST: después verifica el encargado del área en terreno y, si corresponde, Prevención, medio ambiente u otros responsables.</p>' +
      '<button class="primario enorme">' + (crea ? 'Registrar AST' : 'Enviar a verificación') + '</button></form>';
  }

  // ---------- P2 · Crear ----------
  function vCrear(a) {
    var w = ui.crear && ui.crear.area === a.id ? ui.crear : (ui.crear = { area: a.id, paso: 1, desc: '', respuestas: {} });
    var html = '<h1>Crear una AST</h1><p class="suave">' + h(C.tituloArea(a)) + '</p>' + X().mensaje();
    if (w.paso === 1) return html + '<form data-c-describir><label class="campo grande">¿Qué trabajo vas a realizar y qué equipos o herramientas utilizarás?</label><textarea name="desc" class="grande" rows="4" placeholder="Ej.: Instalaremos planchas de zinc en la techumbre utilizando un manipulador telescópico para subir los materiales.">' + h(w.desc) + '</textarea>' +
      '<p class="suave">Puedes dictarlo o escribirlo con tus palabras. No necesitas saber el nombre ni el número de ningún procedimiento.</p>' +
      '<button type="button" class="enorme" data-c-dictar>🎤 Dictar</button><button class="primario enorme">Continuar</button></form><a class="boton enorme" href="#/a/' + a.qr + '">Volver</a>';
    var id = w.id;
    html += '<div class="tarjeta"><span class="suave">Tu descripción:</span><br>' + h(w.desc) + '</div>';
    if (id.sinCobertura || id.pendientes.length) {
      return html + '<div class="mensaje mal grande-t"><b>' + (id.sinCobertura ? 'No encontramos un procedimiento vigente para este trabajo.' : 'Parte de este trabajo no tiene documentación suficiente o tiene una diferencia entre documentos.') + '</b>' +
        (id.pendientes.length ? '<ul>' + id.pendientes.map(function (x) { return '<li>' + h(x.nombre) + ': ' + h(x.motivo) + '</li>'; }).join('') + '</ul>' : '') + 'No se arma una AST con requisitos inventados: queda pendiente de revisión de Prevención.</div>' +
        '<button class="primario enorme" data-c-pendiente>Registrar para revisión de Prevención</button><button class="enorme" data-c-paso="1">Cambiar la descripción</button>';
    }
    return html + '<div class="tarjeta"><b>Para esta tarea se aplican los siguientes procedimientos:</b><ul class="grande-t">' + id.procedimientos.map(function (d) { return '<li>' + h(d.titulo) + ' <span class="suave">· versión ' + h(d.version) + '</span></li>'; }).join('') + '</ul><span class="suave">La app los identificó desde tu descripción y los procedimientos vigentes de la empresa.</span></div>' +
      '<form data-c-operacion>' + (id.preguntas.length || id.unidades.some(function (u) { return !u.elegida && u.opciones.length > 1; }) ? '<h2>Para entender bien el trabajo</h2>' : '') +
      id.preguntas.map(function (q) {
        var val = w.respuestas[q.id];
        return '<div class="tarjeta"><b class="grande-t">' + h(q.texto) + '</b><br><span class="cita">' + citas(q) + '</span><div class="sino"><label class="op-si"><input type="radio" name="' + q.id + '" value="si"' + (val === true ? ' checked' : '') + '><span>Sí</span></label><label class="op-no"><input type="radio" name="' + q.id + '" value="no"' + (val === false ? ' checked' : '') + '><span>No</span></label></div></div>';
      }).join('') +
      id.unidades.filter(function (u) { return !u.elegida && u.opciones.length > 1; }).map(function (u) { return '<div class="tarjeta"><b class="grande-t">¿Cuál ' + h(u.nombre.toLowerCase()) + ' usarán?</b><select name="unidad:' + u.id + '" class="grande">' + u.opciones.map(function (o) { return '<option value="' + o.id + '">' + h(o.nombre) + '</option>'; }).join('') + '</select></div>'; }).join('') +
      // D-047: duración declarada en jornadas; al terminar la última, la AST se cierra y ya no cambia
      '<div class="tarjeta plazo-ast"><b class="grande-t">¿Esta AST tiene algún período o plazo para ejecutarla?</b><br><span class="suave">Si no tiene, vale para la jornada de hoy. Al terminar su plazo se cierra y ya no se cambia; después solo se agregan observaciones aparte.</span>' +
        '<div class="sino"><label class="op-si"><input type="radio" name="plazo" value="si"><span>Sí</span></label><label class="op-no"><input type="radio" name="plazo" value="no" checked><span>No</span></label></div>' +
        '<label class="plazo-cuanto"><b>¿Cuántas jornadas?</b><select name="jornadas" class="grande">' + jornadasPosibles().map(function (n) { return '<option value="' + n + '">' + n + ' jornadas</option>'; }).join('') + '</select></label></div>' +
      '<details class="tarjeta"><summary>¿El trabajo afecta también otras áreas?</summary>' + db().areas.filter(function (x) { return x.diagnostico && x.id !== a.id && x.activa !== false; }).map(function (x) { return '<label class="opcion"><input type="checkbox" name="invol" value="' + x.id + '"> ' + h(C.tituloArea(x)) + '</label>'; }).join('') + '</details>' +
      '<button class="primario enorme">Armar la AST</button></form><button class="enorme" data-c-paso="1">Cambiar la descripción</button>';
  }

  // ---------- P4 · Ingresar equipo ----------
  function vEquipo(a) {
    var lista = astsCuadrillaArea(a.id, true).filter(function (x) { return x.ficha && x.estado !== 'REVISION_DOCUMENTAL' && x.empresa === yo().empresa; });
    var w = ui.equipo && ui.equipo.area === a.id ? ui.equipo : (ui.equipo = { area: a.id, ast: lista[0] ? lista[0].id : null, resultados: null });
    var html = '<h1>Ingresar equipo de trabajo</h1><p class="suave">' + h(a.nombre) + ' · lo registras tú (' + h(yo().nombre) + '); cada trabajador confirma y firma por su cuenta.</p>' + X().mensaje();
    if (!lista.length) return html + '<p class="grande-t">No hay AST abiertas de tu empresa en el área. Crea una primero.</p>';
    html += '<form data-c-equipo><label class="campo grande">AST</label><select name="ast" class="grande">' + lista.map(function (x) { return '<option value="' + x.id + '"' + (x.id === w.ast ? ' selected' : '') + '>' + x.id + ' · ' + h(x.nombre) + '</option>'; }).join('') + '</select>' +
      '<label class="campo grande">RUT de los integrantes (uno por línea)</label><textarea name="ruts" class="grande" rows="5" placeholder="41.111.111-3&#10;42.222.222-7"></textarea><button class="primario enorme">Buscar fichas e ingresar</button></form>';
    if (w.resultados) html += '<div class="tarjeta"><b>Resultado por persona</b>' + w.resultados.map(function (r) {
      return '<div class="req"><div><b>' + (r.persona ? h(A.nombre(db(), r.persona)) : h(r.rut)) + '</b><div class="det">' + (r.ok ? 'Ficha: ' + h(r.sistema) + ' · Falta: ' + h(r.pendiente) : h(r.motivo)) + '</div></div>' + chip(r.ok ? (r.sistema === 'cumple' ? 'CUMPLIDO' : 'NO_CUMPLE') : 'NO_REGISTRADA') + '</div>';
    }).join('') + '</div>';
    var ast = A.porId(db().asts, w.ast);
    if (ast) {
      var mios = ast.integrantes.filter(function (i) { return i.incluidoPor === yoId() && i.persona !== yoId(); });
      if (mios.length) html += '<h2>Completar en mi teléfono</h2><p class="suave">Pasa el teléfono: cada uno escucha el resumen, marca sus EPP y firma con su ' + (C.modoFirma(db(), A.porId(db().personas, mios[0].persona)) === 'PIN' ? 'PIN' : 'RUT') + '.</p>' + mios.map(function (i) {
        return '<div class="tarjeta fila" style="justify-content:space-between"><span><b>' + h(A.nombre(db(), i.persona)) + '</b> ' + chip(i.estado === 'FIRMADO' ? 'CUMPLIDO' : i.estado === 'PENDIENTE_REQUISITO' ? 'NO_CUMPLE' : 'PENDIENTE') + ' <span class="suave">' + ESTADO_P[i.estado] + '</span></span>' +
          (i.estado !== 'FIRMADO' ? '<a class="boton primario" href="#/c/' + ast.id + '/turno/' + i.persona + '">Pasar el teléfono</a>' : '') + '</div>';
      }).join('');
    }
    return html;
  }
  function vTurno(ast, pid) {
    var p = A.porId(db().personas, pid);
    if (ui.turno && ui.turno.persona === pid && ui.turno.ast === ast.id) return vIncorporacion(ast);
    var modo = C.modoFirma(db(), p);
    return '<h1>' + h(p.nombre) + ', toma el teléfono</h1><p class="grande-t">Teléfono de ' + h(yo().nombre) + '. Para que todo quede a tu nombre, escribe tu ' + (modo === 'PIN' ? 'PIN personal' : 'RUT') + '.</p>' + X().mensaje() +
      (modo === 'PIN' && !p.pin ? '<form data-c-crearpin data-turno="' + pid + '" class="tarjeta"><h2>Crea tu PIN</h2><label class="campo grande">Tu RUT</label><input name="rut" class="grande" autocomplete="off"><label class="campo grande">PIN de 4 números</label><input name="pin" class="grande" inputmode="numeric" maxlength="4" type="password"><button class="primario enorme">Crear PIN</button></form>'
        : '<form data-c-tomar="' + pid + '" data-ast="' + ast.id + '"><input name="cred" class="grande" type="' + (modo === 'PIN' ? 'password' : 'text') + '" ' + (modo === 'PIN' ? 'inputmode="numeric" maxlength="4"' : '') + ' autocomplete="off"><button class="primario enorme">Soy ' + h(p.nombre) + '</button></form>') +
      '<a class="boton enorme" href="#/a/' + areaDe(ast).qr + '/equipo">Volver</a>';
  }

  // ---------- Detalle de la AST para mandos, Prevención y medio ambiente ----------
  function vAst(id, sub) {
    var ast = A.porId(db().asts, id);
    if (!ast) return '<p>AST no encontrada.</p>';
    var p = yo(), propia = p.empresa === ast.empresa || C.puede(db(), p.id, 'consultar', ast.area, ast.empresa) || ast.aprobaciones.some(function (a) { return aprobadores(ast, a).indexOf(p.id) >= 0; });
    if (sub === 'ver') return vVer(ast);
    if (sub === 'yo') return vIncorporacion(ast);
    if (sub === 'turno') return vTurno(ast, arguments[2]);
    if (sub === 'informe') return (p.rol === 'prevencion' || C.esResponsable(db(), ast, 'encargado_area', p.id) || C.puede(db(), p.id, 'aprobar', ast.area, ast.empresa) || C.puede(db(), p.id, 'ver_historial', ast.area, ast.empresa)) ? vInforme(ast) : '<div class="mensaje mal">El informe es para los responsables del área.</div>';
    if (!propia) return '<div class="mensaje mal">Esta AST es de otra empresa. Ves su resumen en el tablero del área.</div>';
    if (X().nivel() === 'base' && C.integrante(ast, p.id) && !(ast.creadaPor === p.id && ['BORRADOR', 'OBSERVADA', 'REVISION_DOCUMENTAL'].indexOf(ast.estado) >= 0)) return vIncorporacion(ast);
    var f = ast.ficha ? C.ficha(db(), ast.ficha) : null, html = '';
    html += '<div class="fila" style="justify-content:space-between"><h1 style="margin:0">' + h(ast.nombre || 'AST por armar') + '</h1>' + est(ast.estado) + '</div>' +
      '<p class="suave">' + ast.id + ' · ' + h(areaDe(ast).nombre) + (ast.puntoIngreso && ast.puntoIngreso !== ast.area ? ' (ingreso por QR de ' + h(A.porId(db().areas, ast.puntoIngreso).nombre) + ')' : '') + ((ast.involucradas || []).length ? ' · involucra: ' + ast.involucradas.map(function (x) { return h(A.porId(db().areas, x).nombre); }).join(', ') : '') + ' · creada por ' + h(A.nombre(db(), ast.creadaPor)) + ' (' + h(X().ident(A.porId(db().personas, ast.creadaPor))) + ') · ' + hora(ast.creadaEn) + (X().nivel() !== 'base' ? ' · <a href="#/traza/' + ast.id + '">trazabilidad</a>' : '') + '</p>' + subc(ast) + X().mensaje() +
      '<div class="tarjeta"><span class="suave">Descripción del trabajador:</span> ' + h(ast.descripcion) + '</div>';
    if (ast.estado === 'REVISION_DOCUMENTAL') {
      html += '<div class="mensaje mal"><b>Revisión documental (' + h(ast.brecha.tipo.replace(/_/g, ' ').toLowerCase()) + ').</b><br>' + h(ast.brecha.detalle) + '<br>No se arma con requisitos inventados. Avisado a Prevención.</div>';
      if (p.rol === 'prevencion') html += '<div class="fila"><a class="boton" href="#/biblioteca">Ir a la biblioteca documental</a><button class="primario" data-c-ev="C_REEVALUAR_DOCUMENTOS" data-ast="' + ast.id + '">Volver a revisar documentos</button><button data-c-cerrar="' + ast.id + '" data-anular="1">Anular con motivo</button></div>';
      return html;
    }
    if (!f) return html + '<p class="suave">La persona que la creó aún no elige el procedimiento.</p>';
    // Estado general: cada cosa por separado (D-020 §4)
    var conds = C.requisitosAst(db(), ast).filter(function (r) { return r.tipo === 'condicion' && r.ambito !== 'equipo'; });
    var firm = ast.integrantes.filter(function (i) { return i.estado === 'FIRMADO'; }).length, conFalt = ast.integrantes.filter(function (i) { return i.estado === 'PENDIENTE_REQUISITO'; }).length, sinResp = ast.integrantes.filter(function (i) { return ['INCLUIDO', 'INFORMADO', 'RESPUESTAS_PENDIENTES', 'LISTO_PARA_FIRMAR'].indexOf(i.estado) >= 0; }).length;
    html += bloqueEquipos(ast, p);
    html += bloqueDia(ast, p);
    if ((ast.etapas || []).length > 1) html += '<div class="tarjeta"><b>Etapas de esta AST</b><ul>' + ast.etapas.map(function (e) { return '<li>Etapa ' + e.n + ' · ' + h(e.fichas.map(function (id) { var fx = C.ficha(db(), id); return fx ? fx.nombre : id; }).join(' + ')) + (e.motivo ? ' <span class="suave">· ' + h(e.motivo) + ' (' + h(A.nombre(db(), e.por)) + ')</span>' : ' <span class="suave">· la AST original, sin cambios</span>') + '</li>'; }).join('') + '</ul></div>';
    if (ast.ampliacionPendiente) html += '<div class="mensaje aviso-zona"><b>Ampliación en revisión documental.</b> ' + h(ast.ampliacionPendiente.brecha.detalle) + ' La etapa en curso sigue como estaba.' + (p.rol === 'prevencion' ? ' <button class="primario" data-c-ev="C_REEVALUAR_DOCUMENTOS" data-ast="' + ast.id + '">Volver a revisar documentos</button>' : '') + '</div>';
    var txtEstado = C.estadoTexto(db(), ast);
    if (txtEstado) html += '<div class="mensaje ' + (ast.estado === 'APROBADA' && !ast.permisos.some(function (x) { return x.estado !== 'AUTORIZADO'; }) ? 'ok' : 'aviso-zona') + ' grande-t">' + h(txtEstado) + '</div>';
    html += '<div class="tarjeta"><b>Estado general</b><table>' +
      '<tr><td>Personas firmadas</td><td>' + firm + ' de ' + ast.integrantes.length + (conFalt ? ' · <span class="chip mal">' + conFalt + ' no cumple(n)</span>' : '') + (sinResp ? ' · <span class="chip aviso">' + sinResp + ' sin terminar</span>' : '') + '</td></tr>' +
      ast.aprobaciones.map(function (a) { var per = aprobadores(ast, a); return '<tr><td>' + h(C.etiquetaAprob(db(), ast, a)) + ': ' + (per.length ? per.map(nombreEmp).join(' o ') : '<b>sin responsable asignado</b>') + '</td><td>' + chip(a.estado === 'CONFIGURACION_PENDIENTE' ? 'NO_REGISTRADA' : a.estado === 'APROBADA' ? 'CUMPLIDO' : a.estado === 'OBSERVADA' ? 'NO_CUMPLE' : 'PENDIENTE') + ' <span class="suave">' + (a.estado === 'CONFIGURACION_PENDIENTE' ? 'configuración pendiente' : a.firma ? 'firmó ' + hora(a.firma.en) : a.estado.toLowerCase()) + '</span></td></tr>'; }).join('') +
      ast.permisos.map(function (pe) { return '<tr><td>📄 ' + h(pe.nombre) + '</td><td>' + chip(pe.estado === 'AUTORIZADO' ? 'CUMPLIDO' : 'PENDIENTE') + ' <span class="suave">' + pe.estado.toLowerCase().replace(/_/g, ' ') + '</span></td></tr>'; }).join('') +
      '<tr><td><b>Inicio del trabajo</b></td><td>' + (ast.estado === 'APROBADA' && ast.permisos.every(function (x) { return x.estado === 'AUTORIZADO'; }) ? '<b class="chip ok">autorizado para quien firmó</b>' : '<b class="chip mal">no autorizado</b>') + '</td></tr></table></div>';
    // Acciones del creador
    if (ast.creadaPor === p.id && ['BORRADOR', 'OBSERVADA'].indexOf(ast.estado) >= 0) {
      var mi = C.integrante(ast, p.id);
      html += '<a class="boton-grande" href="#/c/' + ast.id + '/yo"><span>1. Mis requisitos y firma</span><small>' + ESTADO_P[mi.estado] + '</small></a>';
      if (ast.estado === 'BORRADOR') html += '<p class="suave">Cuando completes tus requisitos y firmes, la AST queda registrada y se avisa al encargado del área para su verificación presencial.</p>';
    }
    // Aprobaciones donde soy responsable activo (titular, turno o reemplazo)
    ast.aprobaciones.filter(function (a) { return aprobadores(ast, a).indexOf(p.id) >= 0 && a.estado !== 'APROBADA'; }).forEach(function (a) {
      var area = a.area || ast.area;
      var espera = ast.aprobaciones.some(function (y) { return y.orden < a.orden && y.estado !== 'APROBADA'; });
      if (a.calidad === 'encargado_area' && a.modo === 'presencial') {
        html += '<div class="tarjeta destacada"><b>Te toca: verificación presencial del encargado del área</b>' + (espera ? '<p class="suave">Espera la revisión del responsable del subcontrato.</p>' : '<p>Acude al lugar del trabajo y haz el chequeo breve de esta tarea.</p><a class="boton primario enorme" href="#/ve/' + ast.id + '">Hacer la verificación en terreno</a>') + '</div>';
        return;
      }
      html += '<div class="tarjeta destacada"><b>Te toca: ' + h(C.etiquetaAprob(db(), ast, a)) + '</b>' + (a.porRegla ? ' <span class="suave">(regla de la empresa)</span>' : '') + (espera ? '<p class="suave">Espera la verificación del encargado del área.</p>' : '') +
        (a.modo === 'presencial' ? '<form class="fila" data-c-aprobarp="' + a.calidad + '" data-area="' + area + '" data-ast="' + ast.id + '"><label class="opcion destacada-op"><input type="checkbox" name="presencial"> Estoy en terreno: lo verifiqué en persona</label><button class="primario">Aprobar (verificación presencial)</button></form>'
          : '<div class="fila"><button class="primario" data-c-aprobar="' + a.calidad + '" data-area="' + area + '" data-ast="' + ast.id + '">Aprobar (revisión documental)</button></div>') +
        '<form data-c-observar="' + a.calidad + '" data-area="' + area + '" data-ast="' + ast.id + '" class="fila" style="margin-top:8px"><input name="texto" placeholder="Observación o corrección que pides" style="flex:1"><button>Observar</button></form></div>';
    });
    // Permisos
    ast.permisos.forEach(function (pe) {
      var acc = '';
      if ((pe.estado === 'REQUERIDO' || pe.estado === 'RECHAZADO') && (ast.creadaPor === p.id || A.MANDO.indexOf(p.rol) >= 0)) acc = '<button class="primario" data-c-permiso="C_SOLICITAR_PERMISO" data-p="' + pe.id + '" data-ast="' + ast.id + '">Solicitar permiso</button>';
      var revs = C.responsablesDe(db(), ast.area, pe.revisaCalidad, ast.empresa), auts = C.responsablesDe(db(), ast.area, pe.autorizaCalidad, ast.empresa);
      if (pe.estado === 'SOLICITADO' && revs.indexOf(p.id) >= 0) acc = '<form data-c-revisar="' + pe.id + '" data-ast="' + ast.id + '">' + pe.condiciones.map(function (c, i) { return '<label class="opcion"><input type="checkbox" name="k" value="' + i + '"> ' + h(c.texto) + '</label>'; }).join('') + '<button class="primario">Condiciones verificadas</button></form>';
      if (pe.estado === 'EN_REVISION' && auts.indexOf(p.id) >= 0) acc = '<div class="fila"><button class="primario" data-c-permiso="C_AUTORIZAR_PERMISO" data-p="' + pe.id + '" data-ast="' + ast.id + '">Autorizar</button><button data-c-permiso="C_RECHAZAR_PERMISO" data-p="' + pe.id + '" data-ast="' + ast.id + '">Rechazar</button></div>';
      html += '<div class="tarjeta"><b>📄 ' + h(pe.nombre) + '</b> ' + chip(pe.estado === 'AUTORIZADO' ? 'CUMPLIDO' : 'PENDIENTE') + ' <span class="suave">' + pe.estado.toLowerCase().replace(/_/g, ' ') + ' · formato ' + h(pe.formato) + ' · ' + h(pe.cita) + '</span><br><span class="suave">Revisa: ' + (revs.length ? revs.map(nombreEmp).join(' o ') : 'sin asignar') + ' · Autoriza: ' + (auts.length ? auts.map(nombreEmp).join(' o ') : 'sin asignar') + '</span>' +
        '<ul>' + pe.condiciones.map(function (c) { return '<li>' + (c.ok ? '✔' : '☐') + ' ' + h(c.texto) + '</li>'; }).join('') + '</ul>' + acc + '<p class="suave">Aprobar la AST no autoriza este permiso.</p></div>';
    });
    // Observaciones
    if (ast.observaciones.length) html += '<h2>Observaciones</h2>' + ast.observaciones.map(function (o) {
      return '<div class="tarjeta"><b>' + o.id + '</b> ' + chip(o.estado === 'CERRADA' ? 'CUMPLIDO' : o.estado === 'RESPONDIDA' ? 'EN_REVISION' : 'NO_CUMPLE') + ' <span class="suave">' + o.estado.toLowerCase() + ' · ' + h(C.CALIDAD[o.calidad]) + ' (' + h(A.nombre(db(), o.por)) + ')</span><p>' + h(o.texto) + '</p>' +
        o.respuestas.map(function (r) { return '<p class="suave">↳ ' + h(A.nombre(db(), r.por)) + ': ' + h(r.texto) + '</p>'; }).join('') +
        (o.estado === 'ABIERTA' && (ast.creadaPor === p.id || C.responsable(db(), ast, 'encargado_area') === p.id) ? '<form data-c-responder="' + o.id + '" data-ast="' + ast.id + '" class="fila"><input name="texto" placeholder="Corrección hecha" style="flex:1"><button class="primario">Responder</button></form>' : '') + '</div>';
    }).join('');
    // Integrantes y faltantes, por persona y por nivel (D-019, D-023, D-024)
    html += '<h2>Personas</h2><div class="tarjeta tabla"><table><tr><th>Persona</th><th>Incluido por</th><th>Recibió la información</th><th>Requisitos</th><th>Firma</th></tr>' + ast.integrantes.map(function (i) {
      var fa = ast.faltantes.filter(function (x) { return x.persona === i.persona; });
      return '<tr><td>' + nombreEmp(i.persona) + '</td><td>' + (i.incluidoPor === i.persona ? 'sí mismo' : h(A.nombre(db(), i.incluidoPor))) + '</td><td>' + (i.informado ? (i.informado.medio === 'voz' ? '🔊 ' : '📖 ') + hora(i.informado.en).slice(11, 16) : '<span class="chip aviso">pendiente</span>') + '</td><td>' +
        (fa.length ? fa.map(function (x) { return '<span class="chip ' + (x.estado === 'CONFIRMADO' ? 'ok' : 'mal') + '">' + h(x.nombre) + ' · ' + x.estado.toLowerCase() + '</span>'; }).join(' ') : '') + (i.estado === 'FIRMADO' || i.estado === 'LISTO_PARA_FIRMAR' ? ' ' + chip('CUMPLIDO') : i.estado === 'RESPUESTAS_PENDIENTES' ? ' <span class="chip aviso">respuestas pendientes</span>' : fa.length ? '' : '<span class="suave">' + ESTADO_P[i.estado] + '</span>') + '</td><td>' + (i.firma ? '✔ ' + h(i.firma.mecanismo) : '<span class="chip aviso">pendiente</span>') + '</td></tr>';
    }).join('') + '</table></div>';
    var abiertos = ast.faltantes.filter(function (x) { return x.estado !== 'CONFIRMADO'; });
    if (abiertos.length) html += '<h2>Faltantes por resolver</h2>' + abiertos.map(function (x) {
      var esEnc = C.responsablesDe(db(), ast.area, 'encargado_area', ast.empresa).indexOf(p.id) >= 0;
      var puedeConf = x.estado === 'GESTIONADO' && (x.nivel === 'sistema' ? p.rol === 'prevencion' : (p.rol === 'prevencion' || esEnc));
      return '<div class="tarjeta"><b>' + (x.persona ? h(A.nombre(db(), x.persona)) : 'AST') + ': ' + h(x.nombre) + '</b> <span class="chip nivel-' + x.nivel + '">' + h(C.NIVEL_TXT[x.nivel]) + '</span>' + (x.herramienta ? ' <span class="suave">para utilizar ' + h(x.herramienta) + '</span>' : '') + ' ' + chip(x.estado === 'GESTIONADO' ? 'EN_REVISION' : 'NO_CUMPLE') +
        '<br><span class="suave">' + h(x.cita) + ' · abierto ' + hora(x.abiertoEn).slice(11, 16) + (x.gestion ? ' · gestión de ' + h(A.nombre(db(), x.gestion.por)) + ': ' + h(x.gestion.texto) : '') + '</span>' +
        (x.estado === 'ABIERTO' && (C.puede(db(), p.id, 'gestionar_pendientes', ast.area, ast.empresa) || esEnc) ? '<form data-c-gestionar="' + x.id + '" data-ast="' + ast.id + '" class="fila" style="margin-top:6px"><input name="texto" placeholder="Qué se hizo (p. ej. se entregó careta)" style="flex:1"><button class="primario">Registrar gestión</button></form>' : '') +
        (puedeConf ? '<button class="primario" style="margin-top:6px" data-c-confirmar="' + x.id + '" data-ast="' + ast.id + '">' + (x.nivel === 'sistema' ? 'Confirmar y registrar en la ficha' : 'Confirmar en terreno') + '</button>' : '') + '</div>';
    }).join('');
    html += window.ASTRA_VT ? window.ASTRA_VT.seccionAst(ast) : '';
    html += detalleTrabajo(ast);
    if (['CERRADA', 'ANULADA'].indexOf(ast.estado) < 0) {
      var esEnc2 = C.responsablesDe(db(), ast.area, 'encargado_area', ast.empresa).indexOf(p.id) >= 0;
      if (ast.estado === 'DETENIDA' && (p.rol === 'prevencion' || esEnc2)) html += '<form class="tarjeta" data-c-reanudar="' + ast.id + '"><b>Reanudar</b><input name="causa" placeholder="Causa"><input name="control" placeholder="Control adoptado" style="margin-top:6px"><button class="primario" style="margin-top:6px">Reanudar</button></form>';
      if (esEnc2 || p.rol === 'prevencion' || C.puede(db(), p.id, 'aprobar', ast.area, ast.empresa)) html += '<form class="fila" data-c-cerrarf="' + ast.id + '" style="margin-top:10px"><input name="texto" placeholder="Cierre de la jornada (resultado, novedades)" style="flex:1"><button>Cerrar AST</button></form>';
      if (['REGISTRADA', 'EN_REVISION', 'APROBADA'].indexOf(ast.estado) >= 0 && !ast.ampliacionPendiente && (ast.creadaPor === p.id || esEnc2 || p.rol === 'prevencion' || C.puede(db(), p.id, 'registrar_trabajadores', ast.area, ast.empresa) || C.puede(db(), p.id, 'gestionar_pendientes', ast.area, ast.empresa)))
        html += '<details class="tarjeta"><summary><b>Agregar etapa a esta AST</b></summary><form data-c-ampliar="' + ast.id + '"><p class="suave">El trabajo nuevo se suma a esta misma AST como una etapa más: lo ya firmado queda como está, todos revisan y firman lo nuevo y el encargado verifica de nuevo en terreno. El plazo no se alarga.</p><textarea name="descripcion" rows="2" style="width:100%" placeholder="¿Qué trabajo se agrega? (p. ej. soldadura de piezas de fierro en el moldaje)"></textarea><input name="motivo" style="width:100%;margin-top:6px" placeholder="¿Por qué se agrega?"><button class="primario" style="margin-top:6px">Agregar la etapa</button></form></details>';
      if (C.variasJornadas(ast) && (esEnc2 || p.rol === 'prevencion' || C.puede(db(), p.id, 'ver_historial', ast.area, ast.empresa))) html += '<a class="boton" href="#/c/' + ast.id + '/informe">Informe de la AST (día por día)</a>';
      html += X().botonDetener(ast.id);
    } else if (ast.cierre) html += '<div class="tarjeta"><b>Cierre:</b> ' + h(ast.cierre.texto) + (ast.cierre.pendientes.length ? '<div class="mensaje mal">Pendientes: ' + h(ast.cierre.pendientes.join(' · ')) + '</div>' : '') + '</div>';
    return html;
  }

  // ---------- Avisos ----------
  function misAvisos() { return db().avisos.filter(function (a) { return a.para === yoId(); }); }
  function vAvisos() {
    var l = misAvisos().slice().reverse(), inm = l.filter(function (a) { return a.prioridad === 'inmediato'; }), res = l.filter(function (a) { return a.prioridad !== 'inmediato'; });
    var permiso = (typeof Notification !== 'undefined') ? Notification.permission : 'no-disponible';
    var fila = function (a) { return '<a class="tarjeta enlace aviso-fila' + (a.leido ? '' : ' nuevo') + '" href="' + (a.cuadrilla ? '#/cuadrilla/' + a.cuadrilla + (a.persona ? '/' + a.persona : '') : a.obsArea ? '#/obs/' + a.obsArea : a.ast ? '#/c/' + a.ast : '#/avisos') + '" data-c-leer="' + a.id + '"' + (a.tipo === 'PRUEBA' ? ' data-c-prueba="1"' : '') + '><span class="suave">' + hora(a.en).slice(5, 16) + ' · ' + a.tipo.replace(/_/g, ' ').toLowerCase() + '</span><br>' + h(a.texto) + '</a>'; };
    return '<h1>Avisos</h1>' + X().mensaje() +
      '<div class="tarjeta">' + (permiso === 'granted' ? '🔔 Avisos activos en este dispositivo.' : permiso === 'denied' ? 'Los avisos están bloqueados en el navegador.' : permiso === 'no-disponible' ? 'Este navegador no permite avisos.' : '<button class="primario" data-c-activar>🔔 Activar avisos en este teléfono</button>') +
      '<p class="suave">Leer un aviso no resuelve nada: cada aviso abre la AST para actuar. WhatsApp y SMS: preparados, apagados en el prototipo.</p></div>' +
      '<h2>Requieren tu acción (' + inm.filter(function (a) { return !a.leido && a.accion; }).length + ' sin leer)</h2>' + (inm.filter(function (a) { return a.accion; }).length ? inm.filter(function (a) { return a.accion; }).map(fila).join('') : '<p class="suave">Nada por ahora.</p>') +
      (inm.some(function (a) { return !a.accion; }) ? '<h2>Solo información</h2><p class="suave">No tienes nada pendiente por estos avisos.</p>' + inm.filter(function (a) { return !a.accion; }).map(fila).join('') : '') +
      '<h2>Resumen</h2>' + (res.length ? '<details class="tarjeta"><summary>' + res.length + ' movimientos (AST creadas, incorporaciones, firmas)</summary>' + res.map(fila).join('') + '</details>' : '<p class="suave">Sin movimientos.</p>');
  }
  function noLeidos() { return misAvisos().filter(function (a) { return !a.leido && a.prioridad === 'inmediato'; }).length; }
  // Notificación al teléfono (service worker). En la versión en línea llegará también con la app cerrada (push).
  function notificarNuevos() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !navigator.serviceWorker || !yoId()) return;
    var clave = 'astra-notificados-' + yoId(), vistos = [];
    try { vistos = JSON.parse(localStorage.getItem(clave) || '[]'); } catch (e) { vistos = []; }
    var nuevos = misAvisos().filter(function (a) { return a.prioridad === 'inmediato' && vistos.indexOf(a.id) < 0; });
    if (!nuevos.length) return;
    navigator.serviceWorker.ready.then(function (reg) {
      nuevos.forEach(function (a) { reg.showNotification('ASTRA · ' + a.tipo.replace(/_/g, ' ').toLowerCase(), { body: a.texto, tag: a.id, data: { url: location.href.split('#')[0] + '#/c/' + a.ast } }); });
    });
    try { localStorage.setItem(clave, JSON.stringify(vistos.concat(nuevos.map(function (a) { return a.id; })))); } catch (e) { /* sin almacenamiento */ }
  }

  // ---------- Panel de Prevención (D-023) ----------
  function vControl() {
    var P = C.panel(db(), ui.zona || null), html = '<h1>Panel de control</h1>' + X().mensaje() +
      '<form class="fila" data-c-zona><select name="zona" style="max-width:320px"><option value="">Todas las zonas</option>' + db().zonas.map(function (z) { return '<option value="' + z.id + '"' + (ui.zona === z.id ? ' selected' : '') + '>' + h(z.nombre) + '</option>'; }).join('') + '</select><button>Ver</button></form>';
    var cuenta = function (e) { return P.asts.filter(function (a) { return a.estado === e; }).length; };
    html += '<div class="kpis">' + [['En borrador', cuenta('BORRADOR')], ['En revisión', cuenta('EN_REVISION') + cuenta('OBSERVADA')], ['Aprobadas', cuenta('APROBADA')], ['Revisión documental', P.brechas.length], ['Personas incorporadas', P.incorporados], ['Firmadas', P.firmados], ['Sin terminar de responder', P.sinResponder]].map(function (k) { return '<div class="kpi"><div class="n">' + k[1] + '</div><div class="suave">' + k[0] + '</div></div>'; }).join('') + '</div>';
    html += '<h2>Requisitos pendientes por nivel</h2><p class="suave">No se suman: declarar, verificar en ficha y revisar en terreno son cosas distintas.</p><div class="niveles">' + ['declarado', 'sistema', 'responsable'].map(function (n) {
      return '<div class="tarjeta"><b>' + h(C.NIVEL_TXT[n]) + '</b> <span class="n-grande">' + P.faltantes[n].length + '</span>' + P.faltantes[n].map(function (x) { return '<div class="mini-ast"><a href="#/c/' + x.ast.id + '">' + h(x.f.persona ? A.nombre(db(), x.f.persona) : 'AST') + '</a> · ' + h(x.f.nombre) + ' · ' + h(areaDe(x.ast).nombre.split(' ·')[0]) + ' ' + chip(x.f.estado === 'GESTIONADO' ? 'EN_REVISION' : 'NO_CUMPLE') + '</div>'; }).join('') + '</div>';
    }).join('') + '</div>';
    var obsA = P.observaciones.filter(function (x) { return x.o.estado !== 'CERRADA'; }), obsC = P.observaciones.filter(function (x) { return x.o.estado === 'CERRADA'; });
    html += '<h2>Observaciones</h2><div class="tarjeta"><b>Abiertas o por revisar: ' + obsA.length + '</b>' + obsA.map(function (x) { return '<div class="mini-ast"><a href="#/c/' + x.ast.id + '">' + h(x.ast.nombre) + '</a> · ' + h(x.o.texto) + ' ' + chip(x.o.estado === 'RESPONDIDA' ? 'EN_REVISION' : 'NO_CUMPLE') + '</div>'; }).join('') + '<br><b>Resueltas: ' + obsC.length + '</b></div>';
    html += '<h2>Requieren intervención</h2><div class="tarjeta">' +
      P.brechas.map(function (a) { return '<div class="mini-ast">📚 <a href="#/c/' + a.id + '">' + h(a.descripcion) + '</a> · ' + h(a.brecha.tipo.replace(/_/g, ' ').toLowerCase()) + '</div>'; }).join('') +
      P.permisos.map(function (x) { return '<div class="mini-ast">📄 <a href="#/c/' + x.ast.id + '">' + h(x.ast.nombre) + '</a> · ' + h(x.p.nombre) + ' · ' + x.p.estado.toLowerCase().replace(/_/g, ' ') + '</div>'; }).join('') +
      P.config.map(function (a) { return '<div class="mini-ast">⚙️ <a href="#/c/' + a.id + '">' + h(a.nombre) + '</a> · configuración pendiente: ' + a.aprobaciones.filter(function (x) { return !x.persona; }).map(function (x) { return C.CALIDAD[x.calidad]; }).join(', ') + '</div>'; }).join('') +
      (P.brechas.length + P.permisos.length + P.config.length ? '' : '<span class="suave">Nada.</span>') + '</div>';
    html += window.ASTRA_VT ? window.ASTRA_VT.seccionControl(ui.zona || null) : '';
    html += '<h2>AST por área</h2>' + db().areas.filter(function (ar) { return !ui.zona || ar.zona === ui.zona; }).map(function (ar) {
      var l = astsCuadrillaArea(ar.id, false);
      return '<div class="tarjeta"><b>' + h(ar.nombre) + '</b> · ' + l.length + ' AST' + l.map(function (a) { return '<div class="mini-ast"><a href="#/c/' + a.id + '">' + a.id + ' ' + h(a.nombre || a.descripcion) + '</a>' + subc(a) + ' ' + est(a.estado) + ' <span class="suave">' + a.integrantes.filter(function (i) { return i.estado === 'FIRMADO'; }).length + '/' + a.integrantes.length + ' firmados</span></div>'; }).join('') + '</div>';
    }).join('');
    return html;
  }

  // ---------- Biblioteca documental (D-025) ----------
  function vBiblioteca() {
    var B = db().biblioteca, p = yo();
    return '<h1>Biblioteca documental</h1>' + X().mensaje() + (B.ficticia ? '<div class="mensaje aviso-zona">Documentos <b>ficticios</b> con la estructura de los reales. Se reemplazan por los procedimientos, la matriz y los permisos de la empresa (D-027).</div>' : '') +
      '<h2>Documentos cargados</h2><div class="tarjeta tabla"><table><tr><th>Código</th><th>Tipo</th><th>Título</th><th>Versión</th></tr>' + B.documentos.map(function (d) { return '<tr><td>' + h(d.id) + '</td><td>' + h(d.tipo.replace('_', ' ')) + '</td><td>' + h(d.titulo) + '</td><td>' + h(d.version) + '</td></tr>'; }).join('') + '</table>' +
      (B.documentoPendiente ? '<p>Falta cargar: <b>' + h(B.documentoPendiente.id) + '</b> ' + h(B.documentoPendiente.titulo) + (p.rol === 'prevencion' ? ' <button data-c-cargar="' + B.documentoPendiente.id + '">Cargar (demo)</button>' : '') + '</p>' : '') + '</div>' +
      '<h2>Fichas de tarea</h2>' + B.fichas.map(function (f) {
        var br = C.brechaDe(db(), f);
        return '<div class="tarjeta"><b>' + h(f.id) + ' · ' + h(f.nombre) + '</b> ' + chip(f.estado === 'VALIDADA' ? 'VIGENTE' : 'EN_REVISION') + ' <span class="suave">' + f.estado.toLowerCase().replace('_', ' ') + (f.validadaPor ? ' por ' + h(A.nombre(db(), f.validadaPor)) : '') + '</span><br><span class="suave">Referencias: ' + f.referencias.join(', ') + ' · ' + f.requisitos.length + ' requisitos · ' + f.preguntas.length + ' pregunta(s) de condición' + (f.permisos.length ? ' · permiso: ' + f.permisos.map(function (x) { return x.nombre; }).join(', ') : '') + '</span>' +
          (br ? '<div class="mensaje mal">' + h(br.detalle) + '</div>' : '') + '</div>';
      }).join('') +
      '<h2>Firma de los trabajadores por empresa</h2><div class="tarjeta">' + db().empresas.map(function (e) {
        return '<div class="fila" style="justify-content:space-between;padding:6px 0"><span>' + h(e.nombre) + '</span>' + (p.rol === 'prevencion' ? '<select data-c-firma="' + e.id + '"><option value="RUT"' + (e.firma === 'RUT' ? ' selected' : '') + '>Firma con RUT</option><option value="PIN"' + (e.firma === 'PIN' ? ' selected' : '') + '>Firma con PIN personal</option></select>' : '<b>' + (e.firma === 'PIN' ? 'PIN personal' : 'RUT') + '</b>') + '</div>';
      }).join('') + '<p class="suave">D-029: lo decide cada empresa. El RUT es lo más simple; el PIN se crea en el primer ingreso.</p></div>';
  }

  // ---------- Configuración de la empresa (D-031) ----------
  function vConfiguracion() {
    var D = db(), p = yo(), total = C.puede(D, p.id, 'configurar', null, null);
    var opPersonas = function (sel) { return D.personas.filter(function (x) { return x.rut || x.codigo; }).map(function (x) { return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + h(x.nombre) + ' · ' + h(x.cargo) + '</option>'; }).join(''); };
    var ambitoTxt = function (r) { return r.area ? A.porId(D.areas, r.area).nombre : r.zona ? A.porId(D.zonas, r.zona).nombre + ' (toda la zona)' : A.porId(D.empresas, r.empresa).nombre; };
    var html = '<h1>Configuración de la empresa</h1>' + X().mensaje() +
      '<p class="suave">Se llena con la empresa usando la plantilla <code>06_implementacion/LEVANTAMIENTO_EMPRESA_v0.1.md</code>. Tener un cargo o la app instalada no da permisos: los da esta configuración.</p>';
    // Estructura
    html += '<h2>Estructura: ' + h(D.faena.nombre) + ' → zonas → áreas</h2>' + D.zonas.map(function (z) {
      return '<div class="tarjeta"><b>' + h(z.nombre) + '</b>' + D.areas.filter(function (a) { return a.zona === z.id; }).map(function (a) {
        return '<div class="mini-ast"><span>' + h(a.nombre) + (a.temporal ? ' <span class="chip aviso">temporal · ' + h(a.ubicacion) + '</span>' : '') + (a.diagnostico ? '' : ' <span class="chip mal">sin diagnóstico</span>') + '</span><span class="suave">encargado: ' + (C.responsablesDe(D, a.id, 'encargado_area').map(function (x) { return h(A.nombre(D, x)); }).join(', ') || '<b>sin asignar</b>') + ' · <a href="#/lamina/' + a.id + '">lámina</a></span></div>';
      }).join('') + '</div>';
    }).join('');
    if (C.puede(D, p.id, 'configurar_areas', null, 'e-principal') || D.asignaciones.some(function (a) { return a.persona === p.id && a.permisos.indexOf('configurar_areas') >= 0; })) {
      html += '<form class="tarjeta" data-c-temporal><b>Nueva área temporal</b> <span class="suave">(p. ej. mantención de maquinaria en terreno)</span><div class="grilla" style="margin-top:8px"><select name="zona">' + D.zonas.map(function (z) { return '<option value="' + z.id + '">' + h(z.nombre) + '</option>'; }).join('') + '</select><input name="nombre" placeholder="Nombre (p. ej. Excavadora km 3)"><input name="ubicacion" placeholder="Ubicación"><select name="encargado">' + opPersonas(p.id) + '</select></div>' +
        '<label class="campo">Trabajos permitidos</label>' + D.biblioteca.fichas.filter(function (f) { return f.estado === 'VALIDADA'; }).map(function (f) { return '<label class="opcion"><input type="checkbox" name="trabajos" value="' + f.id + '"> ' + h(f.nombre) + '</label>'; }).join('') +
        '<label class="campo">Peligros identificados (uno por línea)</label><textarea name="peligros"></textarea><button class="primario" style="margin-top:8px">Crear área temporal</button></form>';
    }
    if (!total) return html + '<p class="suave">Responsables, permisos y avisos de prueba los configura Prevención.</p>';
    // Responsables
    html += '<h2>Responsables por área, zona o empresa</h2><div class="tarjeta tabla"><table><tr><th>Ámbito</th><th>Responsabilidad</th><th>Persona</th><th>Turno / reemplazo</th><th></th></tr>' + D.responsables.map(function (r) {
      var key = JSON.stringify({ area: r.area || null, zona: r.zona || null, empresa: r.empresa || null, calidad: r.calidad, persona: r.persona }).replace(/"/g, '&quot;');
      return '<tr><td>' + h(ambitoTxt(r)) + '</td><td>' + h(C.CALIDAD[r.calidad]) + '</td><td>' + nombreEmp(r.persona) + '</td><td>' + (r.turno ? 'turno ' + h(r.turno) : '') + (r.reemplazaA ? 'reemplaza a ' + h(A.nombre(D, r.reemplazaA)) + (A.porId(D.personas, r.reemplazaA).ausente ? ' <span class="chip ok">activo</span>' : ' <span class="suave">(en espera)</span>') : '') + '</td><td><button data-c-quitar="' + key + '">Quitar</button></td></tr>';
    }).join('') + '</table></div>' +
      '<form class="tarjeta" data-c-responsable><b>Asignar responsable</b><div class="grilla" style="margin-top:8px"><select name="ambito">' + D.areas.map(function (a) { return '<option value="area:' + a.id + '">' + h(a.nombre) + '</option>'; }).join('') + D.zonas.map(function (z) { return '<option value="zona:' + z.id + '">' + h(z.nombre) + ' (toda la zona)</option>'; }).join('') + D.empresas.filter(function (e) { return e.tipo === 'contratista'; }).map(function (e) { return '<option value="empresa:' + e.id + '">' + h(e.nombre) + '</option>'; }).join('') + '</select>' +
      '<select name="calidad">' + Object.keys(C.CALIDAD).map(function (k) { return '<option value="' + k + '">' + h(C.CALIDAD[k]) + '</option>'; }).join('') + '</select><select name="persona">' + opPersonas() + '</select><input name="turno" placeholder="Turno (opcional)"><select name="reemplaza"><option value="">No es reemplazo</option>' + opPersonas('') + '</select></div><button class="primario" style="margin-top:8px">Asignar</button></form>';
    // Ausencias
    var conResp = D.personas.filter(function (x) { return D.responsables.some(function (r) { return r.persona === x.id && !r.reemplazaA; }); });
    html += '<h2>Ausencias</h2><div class="tarjeta">' + conResp.map(function (x) { return '<div class="mini-ast"><span>' + h(x.nombre) + (x.ausente ? ' <span class="chip aviso">ausente</span>' : '') + '</span><button data-c-ausente="' + x.id + '" data-valor="' + (x.ausente ? '0' : '1') + '">' + (x.ausente ? 'Volvió' : 'Marcar ausente') + '</button></div>'; }).join('') + '</div>';
    // Cargo, permisos y alcance
    html += '<h2>Personas: cargo, permisos y alcance</h2><div class="tarjeta tabla"><table><tr><th>Persona</th><th>Cargo</th><th>Permisos</th><th>Alcance</th></tr>' + D.asignaciones.map(function (a) {
      var per = A.porId(D.personas, a.persona); return '<tr><td>' + nombreEmp(a.persona) + '</td><td>' + h(per.cargo) + '</td><td>' + a.permisos.map(function (x) { return C.PERMISO_TXT[x]; }).join(', ') + '</td><td>' + h(C.textoAlcance(D, a.alcance)) + '</td></tr>';
    }).join('') + '</table></div>' +
      '<form class="tarjeta" data-c-asignar><b>Agregar permisos</b><div class="grilla" style="margin-top:8px"><select name="persona">' + opPersonas() + '</select><select name="alcance">' + D.empresas.map(function (e) { return '<option value="' + (e.tipo === 'contratista' ? 'contrato:' : 'empresa:') + e.id + '">' + (e.tipo === 'contratista' ? 'Contrato ' : 'Empresa ') + h(e.nombre) + '</option>'; }).join('') + D.zonas.map(function (z) { return '<option value="zona:' + z.id + '">' + h(z.nombre) + '</option>'; }).join('') + D.areas.map(function (a) { return '<option value="area:' + a.id + '">' + h(a.nombre) + '</option>'; }).join('') + '</select></div>' +
      C.PERMISOS.map(function (x) { return '<label class="opcion" style="display:inline-block;margin-right:12px"><input type="checkbox" name="permisos" value="' + x + '"> ' + C.PERMISO_TXT[x] + '</label>'; }).join('') + '<br><button class="primario" style="margin-top:8px">Agregar</button></form>';
    // Puesta en marcha: aviso de prueba
    var deben = D.personas.filter(function (x) { return D.responsables.some(function (r) { return r.persona === x.id; }); });
    html += '<h2>Puesta en marcha: avisos de prueba</h2><p class="suave">Cada responsable debe recibir un aviso de prueba antes de quedar activo (D-031 §3).</p><div class="tarjeta">' + deben.map(function (x) {
      var ap = x.avisoPrueba; return '<div class="mini-ast"><span>' + h(x.nombre) + ' · ' + h(x.cargo) + '</span><span>' + (ap && ap.recibido ? '<span class="chip ok">recibido ' + hora(ap.recibido).slice(11, 16) + '</span>' : ap ? '<span class="chip aviso">enviado, sin confirmar</span>' : '<span class="chip mal">sin probar</span>') + ' <button data-c-prueba-enviar="' + x.id + '">Enviar aviso de prueba</button></span></div>';
    }).join('') + '</div>';
    html += window.ASTRA_VN ? window.ASTRA_VN.seccionConfig() : '';
    html += '<h2>Reglas</h2><div class="tarjeta">Trabajo en varias áreas: cada área involucrada suma la firma de <b>' + D.config.multiArea.map(function (c) { return C.CALIDAD[c]; }).join(', ') + '</b>.<br>Firma de trabajadores: ' + D.empresas.map(function (e) { return h(e.nombre) + ' → ' + (e.firma === 'PIN' ? 'PIN personal' : 'RUT'); }).join(' · ') + ' (se cambia en la biblioteca).<br>Canales: app ✔ · WhatsApp ✖ · SMS ✖ (preparados, apagados en el prototipo).</div>';
    return html;
  }

  // ---------- Charla de 5 minutos (P10) ----------
  function vCharla() {
    var p = yo(), sel = ui.charlaArea || db().areas.filter(function (a) { return a.diagnostico; })[0].id;
    var hoyCh = db().charlas.filter(function (c) { return c.area === sel; }).slice(-1)[0];
    var html = '<h1>Charla de 5 minutos</h1>' + X().mensaje() + '<form data-c-charla class="fila"><select name="area" style="flex:1">' + db().areas.filter(function (a) { return a.diagnostico; }).map(function (a) { return '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' + h(a.nombre) + '</option>'; }).join('') + '</select><button class="primario">Armar charla de hoy</button></form>' +
      '<p class="suave">Se arma con los riesgos y controles de las AST abiertas del área, desde sus documentos. Nada genérico.</p>';
    if (!hoyCh) return html;
    html += '<div class="tarjeta"><b>' + hoyCh.id + ' · ' + h(areaDe({ area: hoyCh.area }).nombre) + '</b> <span class="suave">dada por ' + h(A.nombre(db(), hoyCh.por)) + ' · ' + hora(hoyCh.en) + ' · AST: ' + hoyCh.asts.join(', ') + '</span><ol class="grande-t">' +
      hoyCh.puntos.map(function (x) { return '<li><b>' + h(x.riesgo) + '</b>: ' + h(x.control) + ' <span class="cita">' + h(x.cita) + '</span></li>'; }).join('') + '</ol><button class="acento enorme" data-c-charla-voz="' + hoyCh.id + '">🔊 Leer en voz alta</button></div>';
    var invitados = [];
    hoyCh.asts.forEach(function (id) { A.porId(db().asts, id).integrantes.forEach(function (i) { if (invitados.indexOf(i.persona) < 0) invitados.push(i.persona); }); });
    html += '<h2>Asistencia</h2><p class="suave">Cada asistente confirma con su credencial en este teléfono. Asistir no habilita para trabajar.</p>' + invitados.map(function (pid) {
      var as = hoyCh.asistentes.filter(function (x) { return x.persona === pid; })[0], per = A.porId(db().personas, pid);
      return '<div class="tarjeta fila" style="justify-content:space-between"><span><b>' + h(per.nombre) + '</b></span>' + (as ? '<span class="chip ok">✔ ' + h(as.mecanismo) + '</span>' : '<form class="fila" data-c-asistir="' + pid + '" data-ch="' + hoyCh.id + '"><input name="cred" placeholder="' + (C.modoFirma(db(), per) === 'PIN' ? 'PIN' : 'RUT') + '" style="width:150px"><button>Confirmar</button></form>') + '</div>';
    }).join('');
    return html;
  }

  // ---------- Enrutador del modo principal ----------
  function ruta(partes) {
    var d = db();
    var vt = window.ASTRA_VT ? window.ASTRA_VT.ruta(partes) : null;
    if (vt !== null) return vt;
    var vl = window.ASTRA_VL ? window.ASTRA_VL.ruta(partes) : null;
    if (vl !== null) return vl;
    var vn = window.ASTRA_VN ? window.ASTRA_VN.ruta(partes) : null;
    if (vn !== null) return vn;
    var vd = window.ASTRA_VD ? window.ASTRA_VD.ruta(partes) : null;
    if (vd !== null) return vd;
    var ve = window.ASTRA_VE ? window.ASTRA_VE.ruta(partes) : null;
    if (ve !== null) return ve;
    if (partes[1] === 'a' && partes[3]) {
      var a = d.areas.filter(function (x) { return x.qr === partes[2]; })[0];
      if (!a || !a.diagnostico) return null;
      if (partes[3] === 'unirme') return vUnirme(a);
      if (partes[3] === 'crear') return vCrear(a);
      if (partes[3] === 'equipo') return A.MANDO.indexOf(yo().rol) >= 0 ? vEquipo(a) : '<div class="mensaje mal">El ingreso de equipo es para capataz, supervisor o jefe de terreno.</div>';
    }
    if (partes[1] === 'c') return vAst(partes[2], partes[3], partes[4]);
    if (partes[1] === 'ast') { var x = A.porId(d.asts, partes[2]); if (x && x.modo === 'cuadrilla') return vAst(partes[2]); }
    if (partes[1] === 'avisos') return vAvisos();
    if (partes[1] === 'cambio') return vCambio();
    if (partes[1] === 'control') return vControl();
    if (partes[1] === 'biblioteca') return vBiblioteca();
    if (partes[1] === 'charla') return vCharla();
    if (partes[1] === 'configuracion') return vConfiguracion();
    return null;
  }

  // ---------- Eventos de la interfaz ----------
  function ir(hash) { if (location.hash === hash) X().render(); else location.hash = hash; }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-c-quitar],[data-c-ausente],[data-c-prueba-enviar],[data-c-unirse],[data-c-escuchar],[data-c-informado],[data-c-devolver],[data-c-ficha],[data-c-ninguna],[data-c-paso],[data-c-derivar],[data-c-dictar],[data-c-ev],[data-c-aprobar],[data-c-permiso],[data-c-confirmar],[data-c-cerrar],[data-c-leer],[data-c-activar],[data-c-cargar],[data-c-charla-voz],[data-crear-critica],[data-c-part],[data-c-cambio-cancelar],[data-c-pendiente],[data-c-iniciar]');
    if (!b) return;
    var ds = b.dataset;
    if (ds.cLeer) {
      var av = A.porId(db().avisos, ds.cLeer); if (av) { av.leido = true; X().guardar(); }
      if (ds.cPrueba && !(yo().avisoPrueba || {}).recibido) { e.preventDefault(); act('C_CONFIRMAR_PRUEBA', null, {}, 'Aviso de prueba confirmado: las notificaciones te llegan.'); X().render(); }
      return;
    }
    e.preventDefault();
    if (ds.crearCritica) { var ar = A.porId(db().areas, ds.crearCritica), r0 = A.aplicar(db(), { tipo: 'CREAR', actor: yoId(), datos: { area: ar.id, qr: ar.qr, confirmaArea: true } }); X().guardar(); if (r0.ok) ir('#/ast/' + r0.ast.id); else { X().setMsg({ ok: false, texto: r0.motivo }); X().render(); } return; }
    if (ds.cUnirse) {
      var ast = A.porId(db().asts, ds.cUnirse);
      if (!confirm('¿Está seguro que se va a registrar en la AST «' + ast.nombre + '»?')) return;
      var r = actCambio('C_UNIRSE', ast.id, { confirmado: true }, 'Te registraste. Ahora escucha el resumen.', '#/c/' + ast.id + '/yo');
      if (!r) return;
      return r.ok ? ir('#/c/' + ast.id + '/yo') : X().render();
    }
    if (ds.cEscuchar) { var a1 = A.porId(db().asts, ds.cEscuchar); ui.escuchado[a1.id] = hablar(resumenTexto(a1)); if (!ui.escuchado[a1.id]) X().setMsg({ ok: false, texto: 'Este teléfono no tiene voz disponible: lee el resumen.' }); X().render(); return; }
    if (ds.cInformado) { if (actCambio('C_INFORMADO', ds.cInformado, { medio: ui.escuchado[ds.cInformado] ? 'voz' : 'lectura' }, 'Registrado que recibiste la información.', location.hash)) X().render(); return; }
    if (ds.cPart) {
      var pausa = ds.cPart === 'C_PAUSAR_PARTICIPACION';
      if (!confirm(pausa ? '¿Pausas tu participación? No estarás habilitado aquí hasta que vuelvas y lo confirmes.' : '¿Terminaste tu parte en esta AST? Para volver tendrás que incorporarte de nuevo.')) return;
      act(ds.cPart, ds.ast, {}, pausa ? 'Participación pausada. Queda la hora en tu jornada.' : 'Participación finalizada. La AST sigue para los demás.'); X().render(); return;
    }
    if (b.hasAttribute('data-c-cambio-cancelar')) { ui.cambio = null; X().setMsg({ ok: false, texto: 'No se hizo el cambio: tu participación anterior sigue vigente.' }); ir('#/'); return; }
    if (b.hasAttribute('data-c-devolver')) { var vuelta = ui.turno ? '#/a/' + A.porId(db().areas, A.porId(db().asts, ui.turno.ast).area).qr + '/equipo' : '#/'; ui.turno = null; try { speechSynthesis.cancel(); } catch (x) { /* nada */ } ir(vuelta); return; }
    if (ds.cPaso) { ui.crear.paso = +ds.cPaso; X().render(); return; }
    if (b.hasAttribute('data-c-pendiente')) {
      // D-043 §3: sin documentación suficiente o con contradicción, queda pendiente de revisión (no se inventan requisitos)
      var w = ui.crear, area = A.porId(db().areas, w.area);
      var c = act('C_CREAR', null, { area: area.id, qr: area.qr, confirmaArea: true, descripcion: w.desc });
      if (!c.ok) return X().render();
      var det = w.id.sinCobertura ? 'El trabajo descrito no está cubierto por los procedimientos vigentes.' : w.id.pendientes.map(function (x) { return x.nombre + ': ' + x.motivo; }).join(' ');
      actCambio('C_ELEGIR_TAREA', c.ast.id, { fichas: w.id.sinCobertura ? [] : w.id.pendientes.map(function (x) { return x.ficha; }), pendiente: w.id.sinCobertura ? null : det }, 'Registrada para revisión de Prevención.', '#/c/' + c.ast.id);
      ui.crear = null; return ir('#/c/' + c.ast.id);
    }
    if (ds.cIniciar) { var ri = act('C_INICIAR_TRABAJO', ds.cIniciar, {}, 'Trabajo iniciado. Guarda el teléfono.'); X().render(); return; }
    if (b.hasAttribute('data-c-dictar')) {
      var R = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!R) { X().setMsg({ ok: false, texto: 'Este navegador no permite dictar. Usa el micrófono del teclado del teléfono.' }); X().render(); return; }
      var rec = new R(); rec.lang = 'es-CL'; rec.onresult = function (ev) { var t = document.querySelector('form[data-c-describir] textarea'); t.value = (t.value + ' ' + ev.results[0][0].transcript).trim(); ui.crear.desc = t.value; }; rec.start(); return;
    }
    if (ds.cEv) { act(ds.cEv, ds.ast, {}, ds.cEv === 'C_ENVIAR_REVISION' ? 'AST enviada a revisión. Se avisó a los responsables.' : 'Listo'); X().render(); return; }
    if (ds.cAprobar) { act('C_APROBAR', ds.ast, { calidad: ds.cAprobar, area: ds.area }, 'Aprobación firmada.'); X().render(); return; }
    if (ds.cPermiso) { act(ds.cPermiso, ds.ast, { permiso: ds.p }, 'Permiso actualizado.'); X().render(); return; }
    if (ds.cConfirmar) { act('C_CONFIRMAR', ds.ast, { faltante: ds.cConfirmar }, 'Cumplimiento confirmado. El trabajador debe volver a marcar y firmar.'); X().render(); return; }
    if (ds.cCerrar) { var mot = prompt('Motivo de la anulación'); if (mot) { act('C_CERRAR', ds.cCerrar, { anular: true, texto: mot }); X().render(); } return; }
    if (b.hasAttribute('data-c-activar')) {
      if (!('Notification' in window)) return;
      Notification.requestPermission().then(function () { if (navigator.serviceWorker) navigator.serviceWorker.register('sw.js').then(function () { notificarNuevos(); }); X().render(); });
      return;
    }
    if (ds.cQuitar) { var q = JSON.parse(ds.cQuitar); q.quitar = true; act('C_RESPONSABLE', null, q, 'Responsable quitado.'); X().render(); return; }
    if (ds.cAusente) { act('C_AUSENCIA', null, { persona: ds.cAusente, ausente: ds.valor === '1' }, ds.valor === '1' ? 'Marcado ausente: entra su reemplazo.' : 'De vuelta: deja de actuar el reemplazo.'); X().render(); return; }
    if (ds.cPruebaEnviar) { act('C_AVISO_PRUEBA', null, { persona: ds.cPruebaEnviar }, 'Aviso de prueba enviado.'); X().render(); return; }
    if (ds.cCargar) { act('C_CARGAR_DOCUMENTO', null, { documento: ds.cCargar }, 'Documento cargado. Revisa las AST en revisión documental.'); X().render(); return; }
    if (ds.cCharlaVoz) { var ch = A.porId(db().charlas, ds.cCharlaVoz); hablar('Charla de cinco minutos. ' + ch.puntos.map(function (x, i) { return (i + 1) + '. ' + x.riesgo + '. ' + x.control + '.'; }).join(' ')); return; }
  });
  document.addEventListener('change', function (e) {
    if (e.target.dataset && e.target.dataset.cFirma) { act('C_CONFIGURAR_FIRMA', null, { empresa: e.target.dataset.cFirma, modo: e.target.value }, 'Forma de firma actualizada.'); X().render(); }
  });
  // Recuadro de firma (P-024): dibuja con el dedo o el mouse y guarda la imagen en el campo «trazo»
  document.addEventListener('pointerdown', function (e) {
    var c = e.target.closest && e.target.closest('canvas[data-firma-pad]'); if (!c) return;
    e.preventDefault();
    try { c.setPointerCapture(e.pointerId); } catch (er) { /* sin captura */ }
    var ctx = c.getContext('2d'), r = c.getBoundingClientRect();
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#14233f';
    var pt = function (ev) { return [(ev.clientX - r.left) * c.width / r.width, (ev.clientY - r.top) * c.height / r.height]; };
    var p0 = pt(e); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]);
    var mv = function (ev) { var q = pt(ev); ctx.lineTo(q[0], q[1]); ctx.stroke(); c._largo = (c._largo || 0) + 1; };
    var up = function () {
      c.removeEventListener('pointermove', mv); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up);
      var inp = c.parentNode.querySelector('input[name=trazo]'); if (inp && c._largo > 8) inp.value = c.toDataURL('image/png');
    };
    c.addEventListener('pointermove', mv); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-firma-borrar]'); if (!b) return;
    var pad = b.closest('.firma-pad'), c = pad && pad.querySelector('canvas[data-firma-pad]'); if (!c) return;
    c.getContext('2d').clearRect(0, 0, c.width, c.height); c._largo = 0;
    var inp = pad.querySelector('input[name=trazo]'); if (inp) inp.value = '';
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, ds = f.dataset;
    var es = function (k) { return f.hasAttribute('data-c-' + k); };
    if (!Object.keys(ds).some(function (k) { return /^c[A-Z]/.test(k); })) return;
    e.preventDefault();
    var fd = new FormData(f), val = function (k) { return (fd.get(k) || '').toString().trim(); }, todos = function (k) { return fd.getAll(k).map(String); };
    if (es('describir')) {
      ui.crear.desc = val('desc');
      if (ui.crear.desc.length < 8) { X().setMsg({ ok: false, texto: 'Cuenta el trabajo con un poco más de detalle: qué harás y con qué equipos o herramientas.' }); return X().render(); }
      // D-043 §3: la app identifica todos los procedimientos aplicables; el trabajador no elige procedimientos
      ui.crear.id = C.identificar(db(), ui.crear.desc, ui.crear.area); ui.crear.respuestas = {}; ui.crear.paso = 2; return X().render();
    }
    if (es('operacion')) {
      var w = ui.crear, idn = w.id, faltan = idn.preguntas.filter(function (q) { return !fd.get(q.id); });
      idn.preguntas.forEach(function (q) { if (fd.get(q.id)) w.respuestas[q.id] = fd.get(q.id) === 'si'; });
      if (faltan.length) { X().setMsg({ ok: false, texto: 'Responde: ' + faltan[0].texto }); return X().render(); }
      var unidades = {}; idn.unidades.forEach(function (u) { unidades[u.id] = fd.get('unidad:' + u.id) || u.elegida; });
      var ar = A.porId(db().areas, w.area);
      var c = act('C_CREAR', null, { area: ar.id, qr: ar.qr, confirmaArea: true, descripcion: w.desc, involucradas: todos('invol') });
      if (!c.ok) return X().render();
      ui.crear = null;
      var t = actCambio('C_ELEGIR_TAREA', c.ast.id, { fichas: idn.fichas, respuestas: w.respuestas, unidades: unidades, jornadas: fd.get('plazo') === 'si' ? Number(fd.get('jornadas') || 2) : 1 }, 'AST armada. Ahora responde tus requisitos.', '#/c/' + c.ast.id + '/yo');
      if (!t) return;
      if (!t.ok) return ir('#/c/' + c.ast.id);
      return ir(A.porId(db().asts, c.ast.id).estado === 'REVISION_DOCUMENTAL' ? '#/c/' + c.ast.id : '#/c/' + c.ast.id + '/yo');
    }
    if (es('labores')) {
      var labores = todos('labor'), roles = [];
      if (!labores.length) { X().setMsg({ ok: false, texto: 'Marca al menos una parte del trabajo.' }); return X().render(); }
      var astL = A.porId(db().asts, ds.cLabores), rolesL = C.rolesDe(C.fichasDe(db(), astL)), sinR = rolesL.filter(function (r) { return r.fichas.some(function (f) { return labores.indexOf(f) >= 0; }) && !fd.get('rol:' + r.id); });
      if (sinR.length) { X().setMsg({ ok: false, texto: 'Responde: ' + sinR[0].texto }); return X().render(); }
      rolesL.forEach(function (r) { if (fd.get('rol:' + r.id) === 'si') roles.push(r.id); });
      act('C_DECLARAR', ds.cLabores, { labores: labores, roles: roles, respuestas: {}, parcial: true }, 'Listo: ahora tus requisitos, en pasos cortos.'); return X().render();
    }
    if (ds.cInspeccion) { act('C_INSPECCION_EQUIPO', ds.cInspeccion, { unidad: ds.unidad, items: todos('it').map(Number), observacion: val('obs') || null }, 'Inspección registrada y vinculada a la AST.'); return X().render(); }
    if (ds.cDeclarar) {
      var resp = {}; fd.forEach(function (v, k) { resp[k] = String(v); });
      var r = act('C_DECLARAR', ds.cDeclarar, { respuestas: resp, parcial: !!ds.parcial }, 'Respuestas guardadas.');
      if (r.ok && r.bloqueo) X().setMsg({ ok: false, texto: r.bloqueo });
      else if (r.ok && r.pendientes && r.pendientes.length && !ds.parcial) X().setMsg({ ok: false, texto: 'Faltan ' + r.pendientes.length + ' respuesta(s): ' + r.pendientes.map(function (x) { return x.nombre; }).join(', ') + '. Sin respuesta no cuenta como cumplido.' });
      else if (r.ok && r.pendientes && r.pendientes.length) X().setMsg(null);
      else if (r.ok) X().setMsg({ ok: true, texto: 'Respondiste todo. Revisa el resumen y confirma.' });
      window.scrollTo(0, 0); return X().render();
    }
    if (es('cambio')) {
      var wc = ui.cambio, faltan2 = wc.otras.filter(function (o) { return !fd.get(o.ast); });
      if (faltan2.length) { X().setMsg({ ok: false, texto: 'Indica si finalizaste o pausaste: ' + faltan2[0].nombre }); return X().render(); }
      var dat2 = Object.assign({}, wc.datos, { anteriores: wc.otras.map(function (o) { return { ast: o.ast, accion: val(o.ast) }; }) });
      var rc = act(wc.tipo, wc.ast, dat2, wc.textoOk);
      if (!rc.ok) return X().render();
      ui.cambio = null; return ir(wc.destino || '#/c/' + wc.ast);
    }
    if (ds.cVolver) {
      if (!fd.get('cambio')) { X().setMsg({ ok: false, texto: 'Indica si cambiaron las condiciones.' }); return X().render(); }
      var rv = actCambio('C_REANUDAR_PARTICIPACION', ds.cVolver, { confirmado: true, condicionesCambiaron: val('cambio') === 'si' }, 'Volviste a la tarea.', '#/c/' + ds.cVolver + '/yo');
      if (rv && rv.ok && C.integrante(A.porId(db().asts, ds.cVolver), yoId()).estado !== 'FIRMADO') X().setMsg({ ok: false, texto: 'Volviste, pero algo cambió desde tu pausa: responde y firma de nuevo.' });
      if (rv) X().render(); return;
    }
    if (ds.cFirmar) {
      if (!fd.get('soyyo')) { X().setMsg({ ok: false, texto: 'Confirma que eres tú antes de registrar.' }); return X().render(); }
      if (!val('trazo')) { X().setMsg({ ok: false, texto: 'Firma con el dedo en el recuadro antes de registrar.' }); return X().render(); }
      var rf = act('C_FIRMAR', ds.cFirmar, { credencial: val('cred'), confirmado: true, trazo: val('trazo') }, 'Registrado.');
      if (rf.ok) X().setMsg({ ok: true, texto: C.estadoTexto(db(), A.porId(db().asts, ds.cFirmar)) || 'AST registrada. Pendiente de verificación del encargado del área' });
      window.scrollTo(0, 0); return X().render();
    }
    if (es('crearpin')) {
      var quien = ds.turno || (ui.turno ? ui.turno.persona : yoId()), r2 = C.aplicar(db(), { tipo: 'C_CREAR_PIN', actor: quien, datos: { rut: val('rut'), pin: val('pin') } });
      X().setMsg(r2.ok ? { ok: true, texto: 'PIN creado. Úsalo para firmar.' } : { ok: false, texto: r2.motivo }); X().guardar(); return X().render();
    }
    if (ds.cTomar) {
      var per = A.porId(db().personas, ds.cTomar);
      if (!C.credencialOk(db(), per, val('cred'))) { X().setMsg({ ok: false, texto: (C.modoFirma(db(), per) === 'PIN' ? 'PIN' : 'RUT') + ' incorrecto. Cada uno usa su propia credencial.' }); return X().render(); }
      ui.turno = { persona: per.id, credencial: val('cred'), ast: ds.ast }; return X().render();
    }
    if (es('equipo')) {
      ui.equipo.ast = val('ast');
      var r3 = act('C_INGRESAR_EQUIPO', val('ast'), { ruts: val('ruts').split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean) }, 'Equipo ingresado. Nadie quedó firmado: cada uno completa su parte.');
      if (r3.ok) ui.equipo.resultados = r3.resultados; return X().render();
    }
    if (ds.cCondiciones) { act('C_DECLARAR_CONDICIONES', ds.cCondiciones, { marcadas: todos('c') }, 'Condiciones guardadas.'); return X().render(); }
    if (ds.cAprobarp) { act('C_APROBAR', ds.ast, { calidad: ds.cAprobarp, area: ds.area, presencial: fd.get('presencial') === 'on' }, 'Aprobación presencial firmada.'); return X().render(); }
    if (ds.cObservar) { act('C_OBSERVAR', ds.ast, { calidad: ds.cObservar, area: ds.area, texto: val('texto') }, 'Observación enviada al creador y al encargado del área.'); return X().render(); }
    if (ds.cResponder) { act('C_RESPONDER_OBS', ds.ast, { obs: ds.cResponder, texto: val('texto') }, 'Respuesta enviada: vuelve a revisión.'); return X().render(); }
    if (ds.cRevisar) { act('C_REVISAR_PERMISO', ds.ast, { permiso: ds.cRevisar, condiciones: todos('k').map(Number) }, 'Condiciones del permiso verificadas.'); return X().render(); }
    if (ds.cGestionar) { act('C_GESTIONAR', ds.ast, { faltante: ds.cGestionar, texto: val('texto') }, 'Gestión registrada. Falta confirmar el cumplimiento.'); return X().render(); }
    if (ds.cReanudar) { act('C_REANUDAR', ds.cReanudar, { causa: val('causa'), control: val('control') }, 'Reanudada.'); return X().render(); }
    if (ds.cAmpliar) { var ra = act('C_AMPLIAR', ds.cAmpliar, { descripcion: val('descripcion'), motivo: val('motivo') }, 'Etapa agregada: cada uno revisa y firma lo nuevo.'); if (ra.ok && ra.brecha) X().setMsg({ ok: false, texto: 'No hay procedimiento vigente para eso: quedó en revisión documental. La etapa en curso sigue igual.' }); return X().render(); }
    if (ds.cEvaldia) {
      var sn = function (k) { return fd.get(k) === null ? null : fd.get(k) === 'si'; };
      if (sn('cambioArea') === null || sn('cambioTarea') === null || sn('condicionesIguales') === null) { X().setMsg({ ok: false, texto: 'Responde las tres preguntas.' }); return X().render(); }
      act('C_EVALUACION_DIARIA', ds.cEvaldia, { cambioArea: sn('cambioArea'), cambioTarea: sn('cambioTarea'), condicionesIguales: sn('condicionesIguales'), diferencia: val('diferencia') }, 'Evaluación del día guardada.'); return X().render();
    }
    if (ds.cRegdia) { act('C_REGISTRO_DIARIO', ds.cRegdia, { confirmado: fd.get('conf') === 'on', credencial: val('cred') }, 'Te registraste hoy en la AST.'); return X().render(); }
    if (ds.cCerrarf) { act('C_CERRAR', ds.cCerrarf, { texto: val('texto') }, 'AST cerrada.'); return X().render(); }
    if (ds.cCharla !== undefined && es('charla')) { ui.charlaArea = val('area'); act('C_CHARLA_CREAR', null, { area: val('area') }, 'Charla armada desde los documentos.'); return X().render(); }
    if (es('zona')) { ui.zona = val('zona') || null; return X().render(); }
    if (es('temporal')) {
      var rt = act('C_CREAR_AREA_TEMPORAL', null, { zona: val('zona'), nombre: val('nombre'), ubicacion: val('ubicacion'), trabajos: todos('trabajos'), peligros: val('peligros').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean), encargado: val('encargado') }, 'Área temporal creada con su QR y diagnóstico.');
      return X().render();
    }
    if (es('responsable')) {
      var amb = val('ambito').split(':'), dat = { calidad: val('calidad'), persona: val('persona'), turno: val('turno') || null, reemplazaA: val('reemplaza') || null };
      dat[amb[0]] = amb[1];
      act('C_RESPONSABLE', null, dat, 'Responsable asignado.'); return X().render();
    }
    if (es('asignar')) {
      var al = val('alcance').split(':'), alc = {};
      if (al[0] === 'empresa') alc.empresa = al[1]; else if (al[0] === 'contrato') alc.contrato = al[1]; else if (al[0] === 'zona') alc.zonas = [al[1]]; else alc.areas = [al[1]];
      act('C_ASIGNAR', null, { persona: val('persona'), permisos: todos('permisos'), alcance: alc }, 'Permisos asignados.'); return X().render();
    }
    if (ds.cAsistir) {
      var ev = { tipo: 'C_CHARLA_CONFIRMAR', actor: ds.cAsistir, datos: { charla: ds.ch }, dispositivoDe: yoId(), credencial: val('cred') };
      var r4 = C.aplicar(db(), ev); X().setMsg(r4.ok ? { ok: true, texto: 'Asistencia confirmada.' } : { ok: false, texto: r4.motivo }); X().guardar(); return X().render();
    }
  });

  window.ASTRA_VC = { ruta: ruta, areaHub: areaHub, noLeidos: noLeidos, notificarNuevos: notificarNuevos, salirTurno: function () { ui.turno = null; } };
})();
