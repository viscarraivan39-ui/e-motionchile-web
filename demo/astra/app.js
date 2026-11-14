// ASTRA · interfaz del prototipo demo. Toda la lógica de reglas vive en motor.js; aquí solo se muestra y se llama.
(function () {
  'use strict';
  var A = window.ASTRA, CLAVE = 'astra-demo-v1', CLAVE_P = 'astra-demo-persona', CLAVE_E = 'astra-escenario';
  var db, persona, ui = { msg: null, editar: false };

  // ---------- Estado persistente (localStorage con respaldo en memoria) ----------
  // D-041 / D-044: demo original, escenario «Constructora Demostración» u obra modelo «Edificio Los Aromos»
  function modoGuardado() {
    try { var v = localStorage.getItem(CLAVE_E); if (v === 'om') return 'obra'; if (v === '1') return 'escenario'; } catch (e) { /* sin almacenamiento */ }
    return 'demo';
  }
  function modoDe(d) { if (!d || !d.escenario) return 'demo'; return d.escenario.tipo === 'obra_modelo' ? 'obra' : 'escenario'; }
  function esObra() { return modoDe(db) === 'obra'; }
  function esAuditor(p) { return !!p && ['prevencion', 'jefe_terreno', 'mandante'].indexOf(p.rol) >= 0; }
  function baseNueva() {
    var m = modoGuardado(), b;
    if (m === 'obra' && window.ASTRA_OM) {
      b = window.ASTRA_OM.construir();
      // La flota extra de Checkmaq pertenece al escenario DEMO (EMP-DEMO-003). La obra modelo ya trae sus equipos.
      b.flotaCheckmaq = 1;
    } else if (m === 'escenario' && window.ASTRA_E) b = window.ASTRA_E.construir();
    else b = window.ASTRA_N.preparar(window.ASTRA_D.preparar(window.ASTRA_L.preparar(window.ASTRA_T.preparar(window.ASTRA_C.preparar(A.semilla())))));
    return window.ASTRA_M ? window.ASTRA_M.preparar(b) : b; // Checkmaq: máquinas con QR, checklist y semáforo
  }
  function franja() {
    return '<div class="franja"><span>' + (db && db.escenario ? 'SIMULACIÓN — PROTOTIPO · ' + h(A.porId(db.empresas, db.escenario.codigo).nombre) + ' (' + db.escenario.codigo + '). No es documentación aprobada para una obra real.' : 'DEMO — datos ficticios y reglas propuestas, no aprobadas por Prevención. No usar en faena.') + '</span></div>';
  }
  function cargar() {
    try { var s = localStorage.getItem(CLAVE); if (s) db = JSON.parse(s); } catch (e) { db = null; }
    // Si los datos guardados son de una versión anterior del modo principal, o de otro escenario, se parte de cero
    if (!db || !db.esDemo || (db.biblioteca && db.versionC !== window.ASTRA_C.VERSION) || modoDe(db) !== modoGuardado()) db = baseNueva();
    window.ASTRA_C.preparar(db); window.ASTRA_T.preparar(db); window.ASTRA_L.preparar(db); window.ASTRA_D.preparar(db); window.ASTRA_N.preparar(db); if (window.ASTRA_S) window.ASTRA_S.preparar(db); if (window.ASTRA_M) window.ASTRA_M.preparar(db);
    try { persona = localStorage.getItem(CLAVE_P) || null; } catch (e) { persona = null; }
    if (persona && !A.porId(db.personas, persona)) persona = null;
  }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(db)); if (persona) localStorage.setItem(CLAVE_P, persona); else localStorage.removeItem(CLAVE_P); } catch (e) { /* sin almacenamiento: la demo sigue en memoria */ } }
  function nombreTrabajo(t) { var x = A.porId(db.tareas, t) || (db.biblioteca && A.porId(db.biblioteca.fichas, t)); return x ? x.nombre : t; }
  function nivel() { return A.NIVEL[yo().rol]; }
  function esMando() { return A.MANDO.indexOf(yo().rol) >= 0; }
  function ident(p) { return p.rut ? 'RUT ' + A.rutMascara(p.rut) : p.codigo ? 'Código ' + p.codigo : (p.ingreso ? 'N° ' + p.ingreso : ''); }
  function yo() { return A.porId(db.personas, persona); }

  // ---------- Utilidades de vista ----------
  function h(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function chip(estado) {
    var cl = { CUMPLIDO: 'ok', VIGENTE: 'ok', APROBADA: 'ok', PUBLICADA: 'ok', RESUELTA: 'ok', NO_CUMPLE: 'mal', VENCIDA: 'mal', ABIERTA: 'mal', NO_REGISTRADA: 'mal', PENDIENTE: 'aviso', PENDIENTE_VERIFICAR: 'aviso', EN_REVISION: 'aviso', NO_DISPONIBLE: 'aviso', INFORMA: 'info', NO_APLICA: '' }[estado];
    return '<span class="chip ' + (cl || '') + '">' + h(String(estado).replace(/_/g, ' ').toLowerCase()) + '</span>';
  }
  function est(e) { return '<span class="estado e-' + e + '">' + e.replace('_', ' ') + '</span>'; }
  // Horas siempre en la hora local de la faena (Chile), no en UTC
  function hora(iso) { return iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/Santiago', hour12: false }).slice(0, 19) : '—'; }
  function puede(tipo) { return A.PERMISOS[tipo] && A.PERMISOS[tipo].indexOf(yo().rol) >= 0; }
  function aviso(texto) {
    var t = document.createElement('div'); t.className = 'aviso-toast'; t.textContent = texto; document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3200);
  }
  function mensaje() {
    if (!ui.msg) return '';
    var m = ui.msg; ui.msg = null;
    return '<div class="mensaje ' + (m.ok ? 'ok' : 'mal') + '"><b>' + h(m.texto) + '</b>' +
      (m.faltantes && m.faltantes.length ? '<ul>' + m.faltantes.map(function (f) { return '<li><b>REF-' + h(f.id) + '</b> ' + h(f.titulo || '') + ' — ' + h(f.detalle) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
  }
  function ejecutar(tipo, ast, datos, textoOk) {
    var r = A.aplicar(db, { tipo: tipo, actor: persona, ast: ast, datos: datos || {} });
    ui.msg = r.ok ? { ok: true, texto: textoOk || 'Listo: ' + tipo.toLowerCase().replace(/_/g, ' ') } : { ok: false, texto: 'Rechazado: ' + r.motivo, faltantes: r.faltantes };
    guardar(); render();
    return r;
  }

  // ---------- Cabecera ----------
  function cabecera(ruta) {
    var p = yo();
    var opciones = db.personas.map(function (x) { return '<option value="' + x.id + '"' + (x.id === persona ? ' selected' : '') + '>' + h(x.nombre) + ' · ' + x.rol + '</option>'; }).join('');
    var nl = window.ASTRA_VC.noLeidos(), campana = ['#/avisos', '🔔' + (nl ? ' ' + nl : '')];
    var menu = nivel() === 'servicio' ? [['#/documentos', 'Documentos'], campana] : nivel() === 'base' ? [['#/', 'Inicio'], ['#/mis', 'Mis trabajos'], ['#/ficha', 'Mi ficha']].concat(window.ASTRA_VM && window.ASTRA_VM.usaMaquinas(p) ? [['#/maquinas', 'Máquinas']] : [], [campana])
      : [['#/', 'Inicio'], campana, ['#/control', 'Control'], ['#/tablero', 'En vivo'], ['#/maquinas', 'Máquinas'], ['#/charla', 'Charla'], ['#/panel', 'Revisión'], ['#/traza', 'Trazabilidad'], ['#/laminas', 'Láminas']];
    if (p.rol === 'prevencion') menu.splice(3, 0, ['#/biblioteca', 'Biblioteca']);
    if (nivel() !== 'base' && nivel() !== 'servicio') { if (db.asignaciones && db.asignaciones.some(function (x) { return x.persona === p.id && x.permisos.indexOf('ver_historial') >= 0; })) menu.splice(3, 0, ['#/informe', 'Informes']); menu.push(['#/aprendizaje', 'Aprendizaje']); }
    if (['prevencion', 'administrador', 'medio_ambiente'].indexOf(p.rol) >= 0) menu.push(['#/documentos', 'Documentos']);
    if (db.escenario && nivel() !== 'base' && nivel() !== 'servicio') menu.push(['#/escenario', 'Escenario']);
    if (esAuditor(p) && esObra()) menu.push(['#/cumplimiento', 'Cumplimiento'], ['#/miper', 'MIPER'], ['#/accidentes', 'Accidentes']);
    if (p.rol === 'prevencion' || p.rol === 'jefe_terreno') menu.push(['#/configuracion', 'Configuración'], ['#/prevencion', p.rol === 'prevencion' ? 'Tarea crítica' : 'Áreas']);
    return franja() +
      '<header class="barra"><a class="marca" href="#/">ASTRA<small>Análisis de Seguridad y Trazabilidad de Riesgos en Actividades</small></a>' +
      '<span class="quien"><b>' + h(p.nombre) + '</b> · ' + p.rol.replace('_', ' ') + ' · ' + h(ident(p)) + '</span>' +
      '<select id="persona" aria-label="Cambiar persona (demo)" title="Cambiar persona (solo demo)">' + opciones + '</select><button id="salir" class="salir">Salir</button>' +
      '<label class="senal"><input type="checkbox" id="sinsenal"' + (db.sinSenal ? ' checked' : '') + '> sin señal' + (db.cola.length ? ' (' + db.cola.length + ' en cola)' : '') + '</label>' +
      '<nav class="menu">' + menu.map(function (m) { return '<a href="' + m[0] + '"' + (('#' + ruta).indexOf(m[0]) === 0 && (m[0] !== '#/' || ruta === '/') ? ' class="activo"' : '') + '>' + m[1] + '</a>'; }).join('') + '</nav></header>';
  }

  // ---------- Ingreso con RUT o número de ingreso (D-015) ----------
  function vIngresar() {
    var mq = location.hash.match(/^#\/a\/([0-9a-f]+)/), aq = mq && db.areas.filter(function (x) { return x.qr === mq[1]; })[0];
    var mx = location.hash.match(/^#\/m\/([0-9a-f]+)/), mm = mx && window.ASTRA_M ? window.ASTRA_M.unidad(db, mx[1]) : null;
    return franja() +
      '<main class="ingreso"><div class="marca-grande">ASTRA</div><p class="suave">Análisis de Seguridad y Trazabilidad de Riesgos en Actividades</p>' + mensaje() +
      (aq ? '<div class="mensaje ok grande-t">' + h(window.ASTRA_C.tituloArea(aq)) + '<br><span class="suave">Identifícate para seguir en esta área.</span></div>' : '') +
      (mm ? '<div class="mensaje ok grande-t">' + h(mm.nombre) + ' (' + h(mm.codigo) + ')<br><span class="suave">Identifícate para hacer el checklist o reportar una falla.</span></div>' : '') +
      '<form data-ingresar class="tarjeta"><label class="campo grande" for="ident">Tu RUT o número de ingreso</label><input id="ident" name="ident" type="text" inputmode="text" autocomplete="off" placeholder="' + (esObra() ? 'MOD-003' : db.escenario ? 'DEMO-011' : '11.111.111-1 o ING-001') + '" class="grande">' +
      '<button class="primario enorme">Entrar</button></form>' + tarjetaModo() +
      '<details class="tarjeta"><summary><b>Personas ' + (esObra() ? 'de la obra modelo' : db.escenario ? 'del escenario' : 'de la demo') + '</b> (' + (esObra() ? 'código MOD y PIN de prueba' : db.escenario ? 'código DEMO y PIN de prueba' : 'RUT de prueba') + ')</summary>' + listaPersonas() + '</details></main>';
  }
  function tarjetaModo() {
    if (esObra()) return '<div class="tarjeta"><b>Obra modelo cargada:</b> ' + h(A.porId(db.empresas, db.escenario.codigo).nombre) + ' · ' + h(db.escenario.obra.nombre) + ' (SIMULACIÓN — PROTOTIPO). 63 personas ficticias. Se entra con el código MOD (Prevención: MOD-003, jefe de terreno: MOD-002, mandante: MOD-007) y el PIN de prueba indicado.<br><button type="button" data-escenario="0" style="margin-top:8px">Volver a la demo original</button></div>';
    if (db.escenario) return '<div class="tarjeta"><b>Escenario cargado:</b> ' + h(A.porId(db.empresas, db.escenario.codigo).nombre) + ' · ' + h(db.escenario.obra.nombre) + ' (SIMULACIÓN — PROTOTIPO). Se entra con el código DEMO; en este modo de prueba la firma usa el PIN de prueba indicado.<br><button type="button" data-escenario="0" style="margin-top:8px">Volver a la demo original</button></div>';
    return '<div class="tarjeta"><b>Escenario de prueba completo</b><br><span class="suave">Constructora Demostración SpA: edificio de 5 pisos, 50 personas DEMO, matriz, procedimientos y 17 casos de prueba.</span><br><button type="button" data-escenario="1" style="margin-top:8px">Cargar escenario Constructora Demostración (SIMULACIÓN — PROTOTIPO)</button></div>' +
      '<div class="tarjeta"><b>Obra modelo — Edificio Los Aromos</b><br><span class="suave">Constructora Los Aromos: 63 personas ficticias, MIPER de 53 filas, 31 procedimientos y el cumplimiento al día.</span><br><button type="button" data-escenario="om" style="margin-top:8px">Cargar obra modelo Edificio Los Aromos (SIMULACIÓN — PROTOTIPO)</button></div>';
  }
  function listaPersonas() {
    var gente = db.personas.filter(function (x) { return x.rut || x.codigo || (db.escenario && x.ingreso); });
    if (esObra()) return gente.map(function (x) {
      return '<div class="persona-demo"><button type="button" data-entrar="' + x.id + '">' + h(x.nombre) + '</button><span class="suave">' + x.rol.replace(/_/g, ' ') + ' · ' + h(x.cargo) + (x.codigo ? ' · ' + h(x.codigo) + ' · PIN ' + h(x.pin) : '') + '</span></div>';
    }).join('');
    return '<div class="tabla"><table>' + gente.map(function (x) {
      return '<tr><td><button data-entrar="' + x.id + '">' + h(x.nombre) + '</button></td><td>' + x.rol.replace('_', ' ') + '<br><span class="suave">' + h(x.cargo) + '</span></td><td class="hash">' + (x.codigo ? x.codigo + '<br>PIN ' + x.pin : x.rut ? x.rut + '<br>' + x.ingreso : x.ingreso) + '</td></tr>';
    }).join('') + '</table></div>';
  }
  function misAst() {
    return db.asts.filter(function (a) { return a.creadaPor === persona || (a.participantes || []).some(function (x) { return x.persona === persona; }) || (a.integrantes || []).some(function (x) { return x.persona === persona; }); });
  }
  function tarjetaAst(a) {
    var t = a.modo === 'cuadrilla' ? (a.nombre || a.descripcion) : a.tarea ? A.porId(db.tareas, a.tarea).nombre : 'Tarea por definir';
    return '<a class="tarjeta enlace grande-t" href="#/' + (a.modo === 'cuadrilla' ? 'c' : 'ast') + '/' + a.id + '"><div class="fila" style="justify-content:space-between"><b>' + h(t) + '</b>' + est(a.estado) + '</div><span class="suave">' + a.id + ' · ' + h(A.porId(db.areas, a.area).nombre) + '</span></a>';
  }
  function botonesAreas() {
    return db.areas.filter(function (a) { return a.activa !== false; }).map(function (a) {
      return '<a class="boton-grande" href="#/a/' + a.qr + '"><span>📷 ' + h(a.nombre) + '</span><small>' + (a.zona && db.zonas ? h(A.porId(db.zonas, a.zona).nombre) + ' · ' : '') + (a.diagnostico ? A.tableroArea(db, persona, a.id).length + ' trabajo(s) activo(s)' : 'área no implementada') + '</small></a>';
    }).join('');
  }
  // Lector de QR dentro de la app (BarcodeDetector). Al leer el QR de una lámina abre esa área, sin listas.
  function escanear() {
    var caja = document.getElementById('escaner');
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices) { ui.msg = { ok: false, texto: 'Este navegador no lee QR dentro de la app. Usa la cámara del teléfono sobre el QR de la lámina: se abre ASTRA directo en el área.' }; render(); return; }
    var det = new window.BarcodeDetector({ formats: ['qr_code'] }), video = document.createElement('video'), activo = true;
    video.setAttribute('playsinline', ''); video.style.width = '100%'; caja.innerHTML = ''; caja.appendChild(video);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (st) {
      video.srcObject = st; video.play();
      var parar = function () { activo = false; st.getTracks().forEach(function (t) { t.stop(); }); };
      var mirar = function () {
        if (!activo) return;
        det.detect(video).then(function (cs) {
          var m = cs.map(function (c) { return (c.rawValue || '').match(/#\/(a|m)\/([0-9a-f]{16,})/); }).filter(Boolean)[0];
          if (m) { parar(); location.hash = '#/' + m[1] + '/' + m[2]; } else setTimeout(mirar, 300);
        }).catch(function () { setTimeout(mirar, 500); });
      };
      mirar();
    }).catch(function () { ui.msg = { ok: false, texto: 'No se pudo abrir la cámara.' }; render(); });
  }
  function vInicioBase() {
    var p = yo(), activas = misAst().filter(function (a) { return ['CERRADA', 'ANULADA'].indexOf(a.estado) < 0; });
    return '<h1 class="saludo">Hola, ' + h(p.nombre.split(' ')[0]) + '</h1>' + mensaje() + window.ASTRA_VT.tarjetaInicio() + window.ASTRA_VL.tarjeta() +
      '<div class="mensaje aviso-zona">📵 Usa el teléfono <b>solo en la zona de llenado</b>, junto a la lámina. Durante el trabajo, guárdalo.</div>' +
      '<h2>1. Escanea el QR del área</h2><button class="primario enorme" data-escanear>📷 Escanear el QR del área</button><div id="escaner"></div>' +
      '<p class="suave">También puedes leer el QR con la cámara del teléfono: se abre ASTRA directo en esa área.</p>' +
      '<details class="tarjeta"><summary>Demo: simular el QR de un área</summary>' + botonesAreas() + '</details>' +
      '<h2>2. Mis trabajos de hoy</h2>' + (activas.length ? activas.map(tarjetaAst).join('') : '<p class="suave grande-t">No tienes trabajos activos.</p>');
  }
  function vInicioMando() {
    var p = yo(), mias = db.asts.filter(function (a) { return a.empresa === p.empresa; });
    var firmar = mias.filter(function (a) { return a.modo !== 'cuadrilla' && ['PREPARADA', 'VERIFICADA', 'EN_REEVALUACION', 'DETENIDA'].indexOf(a.estado) >= 0; });
    var C = window.ASTRA_C, misAprob = db.asts.filter(function (a) { return a.modo === 'cuadrilla' && ['REGISTRADA', 'EN_REVISION'].indexOf(a.estado) >= 0 && a.aprobaciones.some(function (x) { return !(x.calidad === 'encargado_area' && x.modo === 'presencial') && C.responsablesDe(db, x.area, x.calidad, a.empresa).indexOf(p.id) >= 0 && x.estado === 'PENDIENTE' && !a.aprobaciones.some(function (y) { return y.orden < x.orden && y.estado !== 'APROBADA'; }); }); });
    var misFalt = db.asts.filter(function (a) { return a.modo === 'cuadrilla' && (C.responsablesDe(db, a.area, 'encargado_area', a.empresa).indexOf(p.id) >= 0 || p.rol === 'prevencion') && a.faltantes.some(function (f) { return f.estado !== 'CONFIRMADO'; }); });
    var T = window.ASTRA_T;
    var misEnc = db.asts.filter(function (a) { return a.modo === 'cuadrilla' && a.estado === 'REGISTRADA' && a.aprobaciones.some(function (x) { return x.calidad === 'encargado_area' && x.modo === 'presencial' && x.estado !== 'APROBADA' && C.responsablesDe(db, x.area, 'encargado_area', a.empresa).indexOf(p.id) >= 0 && !a.aprobaciones.some(function (y) { return y.orden < x.orden && y.estado !== 'APROBADA'; }); }); });
    var misVerif = db.asts.filter(function (a) { return a.modo === 'cuadrilla' && misEnc.indexOf(a) < 0 && T.pendientesVerificacion(db, a).some(function (x) { return T.puedeVerificar(db, p, a, x.verifica); }); });
    var misPerm = db.asts.filter(function (a) { return a.modo === 'cuadrilla' && a.permisos.some(function (x) { return (x.estado === 'SOLICITADO' && C.responsablesDe(db, a.area, x.revisaCalidad, a.empresa).indexOf(p.id) >= 0) || (x.estado === 'EN_REVISION' && C.responsablesDe(db, a.area, x.autorizaCalidad, a.empresa).indexOf(p.id) >= 0); }); });
    var sinDiag = db.areas.filter(function (a) { return !a.diagnostico; });
    var html = '<h1>Hola, ' + h(p.nombre.split(' ')[0]) + ' <span class="suave">(' + p.rol.replace('_', ' ') + ')</span></h1>' +
      '<div class="grilla"><a class="tarjeta enlace" href="#/tablero"><b>📊 Tablero en vivo</b><br><span class="suave">AST por área, en tiempo real</span></a><a class="tarjeta enlace" href="#/panel"><b>🗂 Revisión</b><br><span class="suave">Todas las AST, habilitaciones, pendientes</span></a>' +
      '<a class="tarjeta enlace" href="#/control"><b>🧭 Panel de control</b><br><span class="suave">Faltantes por nivel, observaciones, permisos</span></a>' +
      '<a class="tarjeta enlace" href="#/avisos"><b>🔔 Avisos</b><br><span class="suave">' + window.ASTRA_VC.noLeidos() + ' por atender</span></a>' +
      '<a class="tarjeta enlace" href="#/charla"><b>🗣 Charla de 5 minutos</b><br><span class="suave">Desde los documentos de las AST del área</span></a>' +
      (p.rol === 'prevencion' ? '<a class="tarjeta enlace" href="#/biblioteca"><b>📚 Biblioteca documental</b><br><span class="suave">Procedimientos, matriz, permisos, fichas</span></a><a class="tarjeta enlace" href="#/prevencion"><b>🦺 Prevención (tarea crítica)</b><br><span class="suave">Equipos, habilitaciones, diagnóstico de áreas</span></a>' : '') + '</div>' +
      (esAuditor(p) && esObra() ? '<h2>Obra modelo</h2><div class="grilla"><a class="tarjeta enlace" href="#/cumplimiento"><b>Auditor de cumplimiento</b><br><span class="suave">Semáforo por obligación, con la norma citada</span></a><a class="tarjeta enlace" href="#/miper"><b>Matriz MIPER</b><br><span class="suave">Riesgo puro y residual, filtros y jerarquía</span></a><a class="tarjeta enlace" href="#/accidentes"><b>Accidentes</b><br><span class="suave">Estadísticas, estado y plazos</span></a></div>' : '');
    var fila = function (a, que) { return '<a class="tarjeta enlace" href="#/c/' + a.id + '"><div class="fila" style="justify-content:space-between"><b>' + h(a.nombre) + '</b>' + est(a.estado) + '</div><span class="suave">' + a.id + ' · ' + h(A.porId(db.areas, a.area).nombre) + ' · ' + que + '</span>' + (C.esSubcontrato(db, a) ? ' <span class="chip aviso">' + h(C.etiquetaEmpresa(db, a)) + '</span>' : '') + '</a>'; };
    html += window.ASTRA_VN.tarjetasInicio();
    if (misEnc.length + misAprob.length + misFalt.length + misPerm.length + misVerif.length) html += '<h2>Te toca</h2>' + misEnc.map(function (a) { return fila(a, '<b>verificación presencial del encargado</b> (AST registrada)').replace('#/c/' + a.id, '#/ve/' + a.id); }).join('') + misVerif.map(function (a) { return fila(a, 'verificar en terreno lo crítico (' + T.pendientesVerificacion(db, a).length + ')'); }).join('') + misAprob.map(function (a) { return fila(a, 'revisar y firmar'); }).join('') + misPerm.map(function (a) { return fila(a, 'permiso especial'); }).join('') + misFalt.map(function (a) { return fila(a, 'faltantes por resolver'); }).join('');
    if (p.rol !== 'prevencion') {
      html += '<h2>Te esperan (' + firmar.length + ')</h2>' + (firmar.length ? firmar.map(function (a) {
        var que = { PREPARADA: 'verificar', VERIFICADA: 'emitir', DETENIDA: 'abrir reevaluación', EN_REEVALUACION: 'reevaluar y reanudar' }[a.estado];
        return '<a class="tarjeta enlace" href="#/ast/' + a.id + '"><div class="fila" style="justify-content:space-between"><b>' + a.id + ' · ' + h(a.tarea ? A.porId(db.tareas, a.tarea).nombre : 'por preparar') + '</b>' + est(a.estado) + '</div><span class="suave">Por ' + que + ' · creada por ' + h(A.nombre(db, a.creadaPor)) + '</span></a>';
      }).join('') : '<p class="suave">Nada pendiente.</p>');
    }
    if (sinDiag.length && (p.rol === 'prevencion' || p.rol === 'jefe_terreno')) html += '<h2>Áreas sin diagnóstico</h2>' + sinDiag.map(function (a) { return '<a class="tarjeta enlace" href="#/prevencion">' + h(a.nombre) + ' · <b>no implementada</b>: falta levantamiento y diagnóstico</a>'; }).join('');
    html += '<h2>Escanear un área</h2>' + botonesAreas() + '<p class="suave" style="margin-top:16px"><a href="#/guion">Guion de la demo</a></p>';
    return html;
  }
  function vMis() {
    var t = misAst().slice().reverse();
    return '<h1>Mis trabajos</h1>' + (t.length ? t.map(tarjetaAst).join('') : '<p class="suave grande-t">Aún no tienes trabajos. Escanea el QR de un área para crear uno.</p>');
  }
  // ---------- Guion de la demo ----------
  function vInicio() {
    var p = yo();
    return '<h1>Guion de la demo</h1><p class="suave">Estás como <b>' + h(p.nombre) + '</b> (' + p.rol + ' · ' + h(p.cargo) + '). Cambia de persona arriba para seguir la demo.</p>' +
      '<h2>Escanear el QR de un área</h2><p class="suave">En terreno se escanea la lámina con la cámara. Aquí, toca el área.</p><div class="grilla">' +
      db.areas.map(function (a) {
        var activas = A.tableroArea(db, persona, a.id).length;
        return '<a class="tarjeta" style="text-decoration:none;color:inherit" href="#/a/' + a.qr + '"><b>' + h(a.nombre) + '</b><br><span class="suave">' + activas + ' AST activa(s) · levantamiento ' + (a.levantamiento ? 'verificado' : '<b>sin verificar</b>') + '</span></a>';
      }).join('') + '</div>' +
      '<h2>Guion de la demo (≈ 4 min)</h2><ol class="pasos">' +
      '<li><b>Mario</b> (maestro eléctrico, trabajador base) entra con su RUT 99.999.999-9 y crea la AST en A1: todos pueden crear (D-014). Elige T01, operador Jorge, ruta A1 + A2. En A3 no puede: el área no tiene diagnóstico (D-016).</li>' +
      '<li>Abre en otra ventana a <b>Ana</b> (jefa de terreno) en «En vivo»: la AST aparece al tiro (D-017).</li>' +
      '<li><b>Carlos</b> intenta verificar: <b>rechazado por R06</b> (placa sin cotejar, sin manual, discrepancia D01). Ese bloqueo es el producto.</li>' +
      '<li><b>Elena</b> (Prevención) coteja la placa, asocia el manual y resuelve D01.</li>' +
      '<li><b>Carlos</b> confirma frente, tablero y visibilidad; <b>Jorge</b> registra el accesorio; Carlos verifica.</li>' +
      '<li><b>Jorge</b> y <b>Carlos</b> toman conocimiento; Carlos <b>emite</b> (queda congelada con hash).</li>' +
      '<li><b>Jorge</b> registra preoperacional y prueba de arranque; Carlos confirma frente y ruta; Jorge <b>inicia</b>.</li>' +
      '<li><b>Rosa</b>, que no es participante, ve un peatón y mantiene presionado <b>DETENER</b>. La app no le pide nada más.</li>' +
      '<li><b>Carlos</b> abre la reevaluación, registra causa y control, revisa los requisitos y <b>reanuda</b>.</li>' +
      '<li><b>Jorge</b> cierra y anota una falla: queda abierta y visible en el equipo. Revisa la <b>trazabilidad</b> con hash.</li></ol>' +
      '<div class="fila no-imprimir"><button id="reiniciar" class="peligro">Reiniciar la demo</button><span class="suave">Vuelve los datos ficticios al estado inicial.</span></div>';
  }

  // ---------- Área (después de escanear el QR) ----------
  function vArea(qr) {
    var a = db.areas.filter(function (x) { return x.qr === qr; })[0];
    if (!a) return '<div class="mensaje mal"><b>QR no reconocido.</b> Si estás en faena: detén el trabajo y avisa al supervisor.</div>';
    if (!a.diagnostico) return '<h1>' + h(a.nombre) + '</h1><div class="mensaje mal grande-t"><b>Área no implementada.</b> Falta el levantamiento y diagnóstico (qué trabajos se pueden hacer y qué peligros tiene). No se pueden crear trabajos aquí. Avisa al jefe de terreno.</div>' +
      A.tableroArea(db, persona, a.id).map(function (t) { return '<div class="tarjeta">' + h(t.tarea) + ' ' + est(t.estado) + botonDetener(t.id, true) + '</div>'; }).join('');
    if (a.activa === false) return '<h1>' + h(window.ASTRA_C.tituloArea(a)) + '</h1><div class="mensaje mal grande-t">Esta área no está activa en la etapa actual de la obra. No se pueden crear trabajos aquí; avisa al jefe de terreno.</div>';
    // D-043 §1: escanear el QR (que está en la lámina, en la zona de llenado) ya identifica el área: no se vuelve a preguntar
    ui.areaConfirmada = a.id;
    return window.ASTRA_VC.areaHub(a);
    var lista = A.tableroArea(db, persona, a.id);
    var html = '<h1>' + h(a.nombre) + '</h1><p class="suave">Lámina v' + a.qrVersion + ' · diagnóstico verificado por ' + h(A.nombre(db, a.diagnostico.verificadoPor)) + '</p>' +
      '<div class="tarjeta"><b>Peligros del área</b><ul>' + a.diagnostico.peligros.map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul><b>Trabajos permitidos:</b> ' + a.diagnostico.trabajos.map(function (t) { return t + ' ' + h(nombreTrabajo(t)); }).join(' · ') + '</div>';
    html += '<h2>Trabajos activos en el área</h2>';
    if (!lista.length) html += '<p class="suave">No hay AST activas.</p>';
    lista.forEach(function (t) {
      html += '<div class="tarjeta"><div class="fila" style="justify-content:space-between"><div><b>' + h(t.tarea) + '</b> ' + est(t.estado) + '<br>' +
        (t.propia ? '<a href="#/ast/' + t.id + '">' + t.id + ' · abrir</a>' : '<span class="suave">' + h(t.empresa) + ' · ventana ' + h(t.ventana) + ' · contacto: ' + h(t.contacto) + '</span><br><span class="chip info">tablero compartido: sin participantes ni evidencias (C10)</span>') +
        '</div></div><div style="margin-top:10px">' + botonDetener(t.id, true) + '</div></div>';
    });
    if (puede('CREAR')) html += '<h2>Nuevo trabajo</h2><button class="primario enorme" data-crear="' + a.id + '">＋ Crear AST en ' + h(a.nombre) + '</button>';
    return html;
  }

  // ---------- AST ----------
  function filaReq(ast, r, etapa) {
    var p = yo(), registrable = { R05: 1, R07: 1, R08: 1, R10: 1, R11: 1, R12: 1, R13: 1, R15: 1, R16: 1, R23: 1 }[r.id] && !(r.id === 'R10' && r.tipo === 'BLOQUEA') && !(r.id === 'R07' && etapa === 'REANUDAR');
    var quien = { R05: 'supervisor', R10: 'supervisor', R12: 'supervisor', R15: 'supervisor' }[r.id] ? ['supervisor'] : ['operador', 'supervisor'];
    var form = '';
    if (registrable && r.estado !== 'CUMPLIDO' && quien.indexOf(p.rol) >= 0) {
      form = '<form data-evid="' + r.id + '" data-etapa="' + etapa + '"><input type="text" name="texto" placeholder="Qué se revisó / evidencia (o motivo si no está disponible)">' +
        '<button class="primario" name="accion" value="REGISTRADA">Registrar</button>' + (r.tipo === 'PIDE_EVIDENCIA' ? '<button name="accion" value="NO_DISPONIBLE">No disponible</button>' : '') + '</form>';
    } else if (registrable && r.estado !== 'CUMPLIDO') {
      form = '<div class="det">Lo registra: ' + quien.join(' o ') + '.</div>';
    } else if (!registrable && (r.estado === 'NO_CUMPLE' || r.estado === 'PENDIENTE')) {
      form = '<div class="det">Lo resuelve: ' + h(r.verifica) + (/prevencion/.test(r.verifica) ? ' → <a href="#/prevencion">Prevención</a>' : '') + '</div>';
    }
    return '<div class="req' + (r.bloquea ? ' bloquea' : '') + '"><div><span class="tipo">REF-' + r.id + ' · ' + r.tipo.replace(/_/g, ' ') + ' · criticidad ' + r.criticidad + '</span><div class="titulo">' + h(r.titulo) + '</div></div><div>' + chip(r.estado) + '</div><div class="det">' + h(r.detalle) + '</div>' + form + '</div>';
  }
  function checklist(ast, etapa, ctx) {
    var res = A.evaluar(db, ast, etapa, ctx), b = res.filter(function (r) { return r.bloquea; }).length;
    return '<div class="tarjeta"><div class="fila" style="justify-content:space-between"><b>Requisitos de la etapa ' + etapa + '</b>' + (b ? '<span class="chip mal">' + b + ' bloquean</span>' : '<span class="chip ok">nada bloquea</span>') + '</div>' + res.map(function (r) { return filaReq(ast, r, etapa); }).join('') + '</div>';
  }
  function resumenAst(ast) {
    var eq = A.porId(db.equipos, ast.equipo), acc = A.porId(db.accesorios, ast.accesorio), t = A.porId(db.tareas, ast.tarea);
    var fallas = ast.equipo ? A.fallasAbiertas(db, ast.equipo) : [];
    return '<div class="tarjeta"><table>' +
      '<tr><th>Tarea</th><td>' + (t ? t.id + ' · ' + h(t.nombre) : '—') + (ast.version ? ' <span class="suave">(' + db.procedimiento.codigo + ' ' + ast.version + ')</span>' : '') + '</td></tr>' +
      '<tr><th>Equipo</th><td>' + (eq ? eq.codigo + ' · declarado ' + h(eq.declarado.fabricante + ' ' + eq.declarado.modelo) + ' · placa ' + (eq.verificado.placaVerificadaPor ? 'cotejada' : '<b>sin cotejar</b>') : '—') + (fallas.length ? ' <span class="chip mal">' + fallas.length + ' falla(s) abierta(s)</span>' : '') + '</td></tr>' +
      '<tr><th>Accesorio</th><td>' + (acc ? acc.codigo + ' · ' + h(acc.tipo) + (acc.compatVerificadaPor ? '' : ' <span class="chip aviso">compatibilidad sin verificar</span>') : '—') + '</td></tr>' +
      '<tr><th>Ruta</th><td>' + ast.ruta.map(function (a) { return h(A.porId(db.areas, a).nombre); }).join(' → ') + '</td></tr>' +
      '<tr><th>Participantes</th><td>' + (ast.participantes.length ? ast.participantes.map(function (x) { return h(A.nombre(db, x.persona)) + ' <span class="suave">(' + x.funcion + ')</span>' + (ast.conocimiento[x.persona] ? ' ✔' : ''); }).join('<br>') : '—') + '</td></tr>' +
      (ast.hashEmision ? '<tr><th>Emisión</th><td class="hash">congelada · ' + ast.hashEmision + '</td></tr>' : '') +
      (ast.detenciones.length ? '<tr><th>Detenciones</th><td>' + ast.detenciones.map(function (d) { return hora(d.ocurridoEn) + ' · ' + h(A.nombre(db, d.por)) + ' · ' + h(d.motivo || 'sin motivo aún') + (d.complemento ? ' · ' + h(d.complemento) : ''); }).join('<br>') + '</td></tr>' : '') +
      '</table></div>';
  }
  function formPreparar(ast, tipo) {
    var p = yo(), mismos = db.personas.filter(function (x) { return x.empresa === p.empresa; });
    var ops = mismos.filter(function (x) { return x.rol === 'operador'; }), sups = mismos.filter(function (x) { return A.MANDO.indexOf(x.rol) >= 0; }), sen = mismos.filter(function (x) { return x.funciones.indexOf('senalero') >= 0; });
    var eq = db.equipos[0], discs = db.discrepancias.filter(function (d) { return d.estado === 'ABIERTA'; }), fallas = A.fallasAbiertas(db, eq.id);
    var opPre = A.operadorDe(ast) || (p.rol === 'operador' ? p.id : ops[0].id), diag = A.porId(db.areas, ast.area).diagnostico;
    return '<form id="preparar" data-tipo="' + tipo + '" class="tarjeta"><b>Preparar la AST</b>' +
      '<label class="campo">Tarea</label>' + db.tareas.map(function (t) {
        var enArea = !diag || diag.trabajos.indexOf(t.id) >= 0, ok = t.cobertura === 'CUBIERTA' && enArea;
        var nota = !enArea ? 'El diagnóstico del área no permite este trabajo' : t.nota;
        return '<label class="opcion"><input type="radio" name="tarea" value="' + t.id + '"' + (ok ? (ast.tarea === t.id || !ast.tarea ? ' checked' : '') : ' disabled') + '> ' + t.id + ' · ' + h(t.nombre) + ' ' + chip(enArea ? t.cobertura : 'NO_CUMPLE') + (ok ? '' : '<br><span class="suave" style="margin-left:22px">' + h(nota) + '</span>') + '</label>';
      }).join('') +
      '<label class="campo">Equipo</label><select name="equipo"><option value="' + eq.id + '">' + eq.codigo + ' · ' + h(eq.tipo) + ' · declarado ' + h(eq.declarado.fabricante + ' ' + eq.declarado.modelo) + '</option></select>' +
      (discs.length ? '<div class="mensaje mal" style="margin-top:6px">' + discs.map(function (d) { return '<b>' + d.id + '</b> ' + h(d.descripcion); }).join('<br>') + '</div>' : '') +
      (fallas.length ? '<div class="mensaje mal" style="margin-top:6px"><b>Fallas abiertas del equipo:</b> ' + fallas.map(function (f) { return f.id + ' ' + h(f.descripcion); }).join(' · ') + '</div>' : '') +
      '<label class="campo">Accesorio montado</label><select name="accesorio">' + db.accesorios.map(function (a) { return '<option value="' + a.id + '"' + (ast.accesorio === a.id ? ' selected' : '') + '>' + a.codigo + ' · ' + h(a.tipo) + (a.compatVerificadaPor ? '' : ' (compatibilidad sin verificar)') + '</option>'; }).join('') + '</select>' +
      '<label class="campo">Ruta (áreas que cruza)</label>' + db.areas.map(function (a) { return '<label style="display:block"><input type="checkbox" name="ruta" value="' + a.id + '"' + (ast.ruta.indexOf(a.id) >= 0 ? ' checked' : '') + '> ' + h(a.nombre) + (a.levantamiento ? '' : ' <span class="chip aviso">sin levantamiento</span>') + '</label>'; }).join('') +
      '<label class="campo">Operador</label><select name="operador">' + ops.map(function (x) { return '<option value="' + x.id + '"' + (x.id === opPre ? ' selected' : '') + '>' + h(x.nombre) + '</option>'; }).join('') + '</select>' +
      '<label class="campo">Mando a cargo (supervisor, capataz o jefe de terreno)</label><select name="supervisor">' + sups.map(function (x) { return '<option value="' + x.id + '">' + h(x.nombre) + '</option>'; }).join('') + '</select>' +
      '<label class="campo">Señalero (opcional)</label><select name="senalero"><option value="">— sin señalero —</option>' + sen.map(function (x) { return '<option value="' + x.id + '">' + h(x.nombre) + '</option>'; }).join('') + '</select>' +
      '<div class="fila" style="margin-top:12px"><button class="primario">' + (tipo === 'PREPARAR' ? 'Preparar' : 'Guardar cambios (anula la verificación)') + '</button>' + (tipo !== 'PREPARAR' ? '<button type="button" data-cancelar-edicion>Cancelar</button>' : '') + '</div></form>';
  }
  function vAst(id) {
    var ast = A.astVisible(db, persona, id), p = yo();
    if (!ast) {
      var ajena = A.porId(db.asts, id);
      return '<h1>' + h(id) + '</h1><div class="mensaje mal"><b>Sin acceso:</b> esta AST es de otra empresa. Solo ves su resumen en el tablero del área' + (ajena ? ' (<a href="#/a/' + A.porId(db.areas, ajena.area).qr + '">ir al área</a>)' : '') + '.</div>' + (ajena && A.ACTIVOS.indexOf(ajena.estado) >= 0 ? botonDetener(id) : '');
    }
    var html = '<div class="fila" style="justify-content:space-between"><h1 style="margin:0">' + ast.id + '</h1>' + est(ast.estado) + '</div>' +
      '<p class="suave">' + h(A.porId(db.areas, ast.area).nombre) + ' · creada por ' + h(A.nombre(db, ast.creadaPor)) + ' (' + h(ident(A.porId(db.personas, ast.creadaPor))) + ')' + (ast.reemplazaA ? ' · reemplaza a <a href="#/ast/' + ast.reemplazaA + '">' + ast.reemplazaA + '</a>' : '') + (nivel() === 'base' ? '' : ' · <a href="#/traza/' + ast.id + '">trazabilidad</a>') + '</p>' + mensaje();
    var esPart = ast.participantes.some(function (x) { return x.persona === persona; });
    switch (ast.estado) {
      case 'BORRADOR':
        html += puede('PREPARAR') ? formPreparar(ast, 'PREPARAR') : '<p class="suave">Espera a que el operador o el supervisor la prepare.</p>';
        if (puede('ANULAR')) html += botonMotivo('ANULAR', 'Anular (motivo)');
        break;
      case 'PREPARADA':
        if (ui.editar) { html += formPreparar(ast, 'EDITAR_PREPARACION'); break; }
        html += resumenAst(ast) + checklist(ast, 'EMITIR') + '<div class="fila">' + (puede('VERIFICAR') ? '<button class="primario" data-ev="VERIFICAR">Verificar</button>' : '<span class="suave">Verifica el supervisor.</span>') +
          (puede('EDITAR_PREPARACION') ? '<button data-editar>Editar preparación</button>' : '') + '</div>' + (puede('ANULAR') ? botonMotivo('ANULAR', 'Anular (motivo)') : '');
        break;
      case 'VERIFICADA':
        html += resumenAst(ast) + '<div class="tarjeta"><b>Toma de conocimiento</b><p class="suave">Cada participante confirma por sí mismo. Antes de confirmar, lee qué obliga a detener:</p><ul>' +
          Object.keys(A.CONDICIONES).map(function (k) { return '<li>' + h(A.CONDICIONES[k].texto) + '</li>'; }).join('') + '<li>EPP: matriz no cargada (informa, REF-R14).</li></ul>' +
          (esPart && !ast.conocimiento[persona] ? '<button class="acento" data-ev="TOMAR_CONOCIMIENTO">Tomé conocimiento</button>' : '') +
          (puede('EMITIR') ? ' <button class="primario" data-ev="EMITIR">Emitir AST</button>' : '') + '</div>' +
          (puede('EDITAR_PREPARACION') ? '<button data-editar>Editar preparación</button>' : '');
        break;
      case 'EMITIDA':
        html += resumenAst(ast) + checklist(ast, 'INICIAR') + (puede('INICIAR') ? '<button class="primario" data-ev="INICIAR">INICIAR el trabajo</button>' : '') + accionesPersonas(ast) + (puede('ANULAR') ? botonMotivo('ANULAR', 'Anular (motivo)') : '');
        break;
      case 'EN_EJECUCION':
        if (nivel() === 'base' && !ui.verTodo) {
          html += '<div class="guarda"><div class="icono">📵</div><h2>Trabajo en marcha</h2><p>Guarda el teléfono.<br>Si algo cambia o ves peligro: <b>detén de palabra</b> y, cuando sea seguro, mantén presionado DETENER.</p>' +
            '<button class="enorme" data-ver-todo>Estoy en la zona de llenado: reportar o cerrar</button></div>';
          break;
        }
        html += resumenAst(ast) + '<div class="tarjeta"><b>Reportar una condición</b><p class="suave">Todas obligan a detener: al reportarla, la AST queda DETENIDA.</p><div class="fila">' +
          Object.keys(A.CONDICIONES).map(function (k) { return '<button class="peligro" data-cond="' + k + '">' + h(A.CONDICIONES[k].texto) + '</button>'; }).join('') + '</div>' +
          '<label class="campo">Si es cambio de accesorio, ¿cuál se montó?</label><select id="accNuevo">' + db.accesorios.filter(function (a) { return a.id !== ast.accesorio; }).map(function (a) { return '<option value="' + a.id + '">' + a.codigo + ' · ' + h(a.tipo) + '</option>'; }).join('') + '</select></div>' +
          (puede('REPORTAR_FALLA') ? '<form class="tarjeta" data-falla><b>Reportar falla del equipo</b><p class="suave">En marcha, una falla sin clasificar obliga a detener (R07).</p><input type="text" name="texto" placeholder="Qué falla"><button class="peligro" style="margin-top:6px">Reportar falla</button></form>' : '') +
          accionesPersonas(ast) + (puede('CERRAR') ? formCerrar() : '');
        break;
      case 'DETENIDA':
        html += resumenAst(ast) + '<form class="tarjeta" data-complemento><b>Complementar la detención</b> <span class="suave">(motivo, detalle; no es obligatorio para detener)</span><input type="text" name="texto" placeholder="Qué pasó"><button style="margin-top:6px">Agregar</button></form>' +
          (puede('ABRIR_REEVALUACION') ? '<button class="acento" data-ev="ABRIR_REEVALUACION">Abrir reevaluación</button>' : '<p class="suave">Desde DETENIDA solo se sale con una reevaluación del supervisor o Prevención.</p>');
        break;
      case 'EN_REEVALUACION':
        html += resumenAst(ast) + '<form class="tarjeta" data-reeval><b>Reevaluación</b><label class="campo">Causa</label><input type="text" name="causa" value="' + h(ast.reeval && ast.reeval.causa || '') + '"><label class="campo">Control adoptado</label><input type="text" name="control" value="' + h(ast.reeval && ast.reeval.control || '') + '">' +
          (ast.cambios.length ? '<label style="display:block;margin-top:8px"><input type="checkbox" name="cambios"' + (ast.cambios.every(function (c) { return c.evaluado; }) ? ' checked' : '') + '> Reevalué los cambios: ' + ast.cambios.map(function (c) { return h(c.texto); }).join(', ') + '</label>' : '') +
          (puede('REGISTRAR_REEVALUACION') ? '<button class="primario" style="margin-top:8px">Guardar reevaluación</button>' : '') + '</form>' +
          (ast.haIniciado ? checklist(ast, 'REANUDAR') : '') +
          '<div class="fila">' + (puede('REANUDAR') ? '<button class="primario" data-ev="REANUDAR">Reanudar</button>' : '') +
          (puede('REEMPLAZAR') ? botonMotivo('REEMPLAZAR', 'Reemplazar por AST nueva') : '') +
          (!ast.haIniciado && puede('ANULAR') ? botonMotivo('ANULAR', 'Anular (motivo)') : '') + '</div>' +
          (ast.haIniciado && puede('CERRAR') ? formCerrar() : '');
        break;
      default:
        html += resumenAst(ast) + '<div class="tarjeta"><b>Resultado:</b> ' + h(ast.resultado.tipo) + ' · ' + h(ast.resultado.texto) + (ast.resultado.horometro ? ' · horómetro ' + h(ast.resultado.horometro) : '') +
          (ast.resultado.pendientes && ast.resultado.pendientes.length ? '<div class="mensaje mal"><b>Pendientes (no se ocultan):</b><ul>' + ast.resultado.pendientes.map(function (x) { return '<li>' + h(x) + '</li>'; }).join('') + '</ul></div>' : '') +
          (ast.reemplazadaPor ? '<p>Reemplazada por <a href="#/ast/' + ast.reemplazadaPor + '">' + ast.reemplazadaPor + '</a></p>' : '') + '</div>';
    }
    if (A.ACTIVOS.indexOf(ast.estado) >= 0) html += botonDetener(ast.id);
    return html;
  }
  function accionesPersonas(ast) {
    if (!puede('INCORPORAR_PERSONA')) return '';
    var fuera = db.personas.filter(function (x) { return x.empresa === ast.empresa && ['operador', 'trabajador'].indexOf(x.rol) >= 0 && !ast.participantes.some(function (y) { return y.persona === x.id; }); });
    return '<form class="tarjeta" data-incorporar><b>Sumar persona</b> <span class="suave">(evalúa la etapa INCORPORAR para esa persona)</span><div class="fila" style="margin-top:6px"><select name="persona" style="flex:1">' + fuera.map(function (x) { return '<option value="' + x.id + '">' + h(x.nombre) + '</option>'; }).join('') + '</select><select name="funcion" style="flex:1"><option value="senalero">señalero</option><option value="ayudante">ayudante</option></select><button class="primario">Sumar</button></div></form>';
  }
  function formCerrar() {
    return '<form class="tarjeta" data-cerrar><b>Cerrar la AST</b> <span class="suave">(terminar la tarea; los pendientes quedan visibles)</span><label class="campo">Resultado y estado del equipo</label><input type="text" name="resultado" placeholder="Ej.: equipo estacionado en A2, sin novedad"><label class="campo">Horómetro</label><input type="text" name="horometro"><label class="campo">Fallas detectadas (una por línea)</label><textarea name="fallas"></textarea><button class="primario" style="margin-top:8px">Cerrar AST</button></form>';
  }
  function botonMotivo(tipo, texto) { return '<form class="fila" data-motivo="' + tipo + '" style="margin-top:8px"><input type="text" name="motivo" placeholder="Motivo" style="flex:1 1 200px"><button>' + h(texto) + '</button></form>'; }
  function botonDetener(astId, mini) {
    var html = '<button class="detener' + (mini ? ' mini' : '') + '" data-detener="' + astId + '"><span class="carga"></span><span style="position:relative">DETENER<small>Mantén presionado 1 segundo · no pide nada más' + (db.sinSenal ? ' · sin señal: se guarda en el teléfono' : '') + '</small></span></button>';
    return mini ? html : '<div class="detener-dock">' + html + '</div>';
  }

  // ---------- Tablero en vivo (escritorio, D-017) ----------
  function vTablero() {
    var p = yo(), ahoraMs = Date.now(), mias = db.asts.filter(function (a) { return a.empresa === p.empresa; });
    var ultimo = {}; db.eventos.forEach(function (e) { if (e.ast) ultimo[e.ast] = e; });
    var reciente = function (a) { var e = ultimo[a.id]; return e && (ahoraMs - Date.parse(e.registradoEn)) < 120000; };
    var hoyS = new Date().toISOString().slice(0, 10), evHoy = db.eventos.filter(function (e) { return e.registradoEn.slice(0, 10) === hoyS; });
    var cuenta = function (t) { return evHoy.filter(function (e) { return e.tipo === t; }).length; };
    var html = '<div class="fila" style="justify-content:space-between"><h1 style="margin:0">Tablero en vivo · ' + h(db.faena.nombre) + '</h1><span class="vivo">● en vivo</span></div>' +
      '<div class="kpis">' + [['AST activas', mias.filter(function (a) { return A.ACTIVOS.indexOf(a.estado) >= 0; }).length], ['Creadas hoy', cuenta('CREAR')], ['Emitidas hoy', cuenta('EMITIR')], ['Detenciones hoy', cuenta('DETENER')], ['Bloqueos (no partieron)', cuenta('TRANSICION_RECHAZADA')], ['Fallas abiertas', db.fallas.filter(function (f) { return !f.liberadaPor; }).length]]
        .map(function (k) { return '<div class="kpi"><div class="n">' + k[1] + '</div><div class="suave">' + k[0] + '</div></div>'; }).join('') + '</div>';
    html += '<div class="areas-vivo">' + db.areas.slice().sort(function (x, y) { return (x.zona || '').localeCompare(y.zona || ''); }).map(function (a, i, l) {
      var cab = (i === 0 || l[i - 1].zona !== a.zona) && a.zona ? '<h3 class="zona-tit">' + h(A.porId(db.zonas, a.zona).nombre) + ' · ' + db.asts.filter(function (x) { var ar = A.porId(db.areas, x.area); return ar && ar.zona === a.zona && ['CERRADA', 'ANULADA'].indexOf(x.estado) < 0; }).length + ' AST activas</h3>' : '';
      var t = A.tableroArea(db, persona, a.id), act = t.filter(function (x) { return x.propia && reciente(x.ast); }).length;
      return cab + '<div class="tarjeta area-vivo' + (act ? ' latiendo' : '') + '"><div class="fila" style="justify-content:space-between"><b>' + h(a.nombre) + '</b><span class="n-grande">' + t.length + '</span></div>' +
        (!a.diagnostico ? '<span class="chip mal">no implementada</span>' : '<span class="suave">AST activas' + (act ? ' · <b class="vivo">' + act + ' actualizándose</b>' : '') + '</span>') +
        t.map(function (x) { return '<div class="fila mini-ast' + (x.propia && reciente(x.ast) ? ' nueva' : '') + '">' + (x.propia ? '<a href="#/ast/' + x.id + '">' + x.id + '</a> ' + h(x.tarea) : h(x.tarea) + ' <span class="suave">· ' + h(x.empresa) + '</span>') + ' ' + est(x.estado) + '</div>'; }).join('') + '</div>';
    }).join('') + '</div>';
    html += '<h2>Actividad</h2><div class="tarjeta feed">' + db.eventos.slice(-20).reverse().map(function (e) {
      return '<div class="evento' + (e.tipo === 'TRANSICION_RECHAZADA' ? ' rechazo' : e.tipo === 'DETENER' ? ' alto' : '') + '"><span class="suave">' + hora(e.registradoEn).slice(11) + '</span> <b>' + e.tipo.replace(/_/g, ' ') + '</b> ' + (e.ast ? '<a href="#/ast/' + e.ast + '">' + e.ast + '</a> ' : '') + '<span class="suave">' + h(e.actor ? A.nombre(db, e.actor) : 'sistema') + (e.estadoNuevo ? ' · ' + e.estadoNuevo : '') + '</span></div>';
    }).join('') + '</div><p class="suave">Abre otra ventana con un trabajador y crea una AST: aparece aquí al tiro. En la versión en línea esto lo hace Supabase Realtime entre teléfonos y computadores.</p>' +
      '<div class="fila"><button data-informe>Descargar informe del día (CSV)</button></div>';
    return html;
  }

  // ---------- Supervisor ----------
  function vPanel() {
    var p = yo(), mias = db.asts.filter(function (a) { return a.empresa === p.empresa; });
    var conteo = A.ESTADOS.map(function (e) { var n = mias.filter(function (a) { return a.estado === e; }).length; return n ? est(e) + ' ' + n : ''; }).filter(Boolean).join(' &nbsp; ');
    var det = mias.filter(function (a) { return a.estado === 'DETENIDA' || a.estado === 'EN_REEVALUACION'; });
    var html = '<h1>Revisión</h1><div class="tarjeta">' + (conteo || 'Sin AST') + '</div>';
    html += '<h2>Detenciones abiertas</h2>' + (det.length ? det.map(function (a) { var d = a.detenciones[a.detenciones.length - 1]; return '<div class="tarjeta"><a href="#/ast/' + a.id + '">' + a.id + '</a> ' + est(a.estado) + '<br><span class="suave">' + hora(d.ocurridoEn) + ' · ' + h(A.nombre(db, d.por)) + ' · ' + h(d.motivo || 'sin motivo aún') + '</span></div>'; }).join('') : '<p class="suave">Ninguna.</p>');
    html += '<h2>Todas las AST</h2><div class="tarjeta tabla"><table><tr><th>AST</th><th>Estado</th><th>Tarea</th><th>Área</th><th>Pendientes visibles</th></tr>' + mias.slice().reverse().map(function (a) {
      var etapa = { PREPARADA: 'EMITIR', VERIFICADA: 'EMITIR', EMITIDA: 'INICIAR', EN_REEVALUACION: 'REANUDAR' }[a.estado];
      var pend = etapa ? A.evaluar(db, a, etapa).filter(function (r) { return r.bloquea || r.visiblePendiente; }).map(function (r) { return r.id; }) : (a.resultado && a.resultado.pendientes ? a.resultado.pendientes.map(function () { return '●'; }) : []);
      return '<tr><td><a href="#/ast/' + a.id + '">' + a.id + '</a></td><td>' + est(a.estado) + '</td><td>' + h(a.tarea ? A.porId(db.tareas, a.tarea).nombre : '—') + '</td><td>' + h(A.porId(db.areas, a.area).nombre) + '</td><td>' + (pend.length ? pend.join(' ') : '—') + '</td></tr>';
    }).join('') + '</table></div>';
    html += '<h2>Personas: habilitaciones por separado</h2>' + tablaPersonas(false);
    html += '<h2>Tablero compartido por área</h2>' + db.areas.map(function (a) {
      var t = A.tableroArea(db, persona, a.id);
      return '<div class="tarjeta"><b>' + h(a.nombre) + '</b>' + (t.length ? '<ul>' + t.map(function (x) { return '<li>' + h(x.tarea) + ' · ' + x.estado.replace('_', ' ') + (x.propia ? ' · propia' : ' · ' + h(x.empresa) + ' · ' + h(x.contacto)) + '</li>'; }).join('') + '</ul>' : '<span class="suave"> · sin trabajos activos</span>') + '</div>';
    }).join('');
    return html;
  }
  function tablaPersonas(acciones) {
    var p = yo();
    return '<div class="tarjeta tabla"><table><tr><th>Persona</th><th>Licencia</th><th>Competencia</th><th>Autorización interna</th><th>Inducción</th><th>Difusión (asist. · recep. · compr.)</th></tr>' +
      db.personas.filter(function (x) { return x.empresa === p.empresa && x.rol !== 'administrador'; }).map(function (x) {
        var r = A.resumenHabilitacion(db, x), d = r.difusion;
        var acc = '';
        if (acciones && r.autorizacion === 'PENDIENTE') acc += '<form data-autorizar="' + x.id + '" class="fila" style="margin-top:4px"><input type="text" name="alcance" placeholder="Alcance: equipo, modelo, frente, tarea"><button>Verificar autorización</button></form>';
        if (acciones && x.hab.instruccion && x.hab.instruccion.comprension === 'APROBADA' && !x.hab.instruccion.verificadoPor) acc += '<button data-verif-instr="' + x.id + '" style="margin-top:4px">Verificar instrucción</button>';
        return '<tr><td><b>' + h(x.nombre) + '</b><br><span class="suave">' + x.rol.replace('_', ' ') + ' · ' + h(ident(x)) + '</span>' + acc + '</td><td>' + chip(r.licencia) + '</td><td>' + chip(r.competencia) + '</td><td>' + chip(r.autorizacion) + '</td><td>' + chip(r.induccion) + '</td><td>' +
          (d.asistencia ? '✔' : '✖') + ' · ' + (d.recepcion ? '✔' : '✖') + ' · ' + chip(d.comprension) + (d.verificada ? '' : ' <span class="chip aviso">sin verificar</span>') + '</td></tr>';
      }).join('') + '</table></div>';
  }

  // ---------- Prevención ----------
  function vPrevencion() {
    var p = yo(), eq = db.equipos[0];
    var html = '<h1>' + (p.rol === 'prevencion' ? 'Prevención' : 'Áreas y equipos') + '</h1>' + mensaje() + (p.rol !== 'prevencion' ? '<div class="mensaje mal">Estás como ' + h(p.nombre) + ' (' + p.rol.replace('_', ' ') + '): puedes registrar el diagnóstico de áreas; lo demás lo hace Prevención.</div>' : '');
    if (eq) {
    html += '<h2>Equipo ' + eq.codigo + '</h2><div class="tarjeta"><table><tr><th></th><th>Declarado</th><th>Verificado (null hasta cotejar)</th></tr>' +
      ['fabricante', 'modelo', 'variante', 'serie', 'anio'].map(function (k) { return '<tr><td>' + k + '</td><td>' + h(eq.declarado[k] || '—') + '</td><td>' + (eq.verificado[k] ? h(eq.verificado[k]) : '<span class="chip aviso">null</span>') + '</td></tr>'; }).join('') +
      '<tr><td>manual</td><td>—</td><td>' + (eq.manual ? h(eq.manual.codigo) : '<span class="chip aviso">null</span>') + '</td></tr></table>' +
      (!eq.verificado.placaVerificadaPor ? '<form data-placa class="tarjeta"><b>Cotejar placa</b> <span class="suave">Escribe lo que dice la placa. La app no sugiere valores.</span><div class="grilla"><input type="text" name="fabricante" placeholder="Fabricante en placa"><input type="text" name="modelo" placeholder="Modelo en placa"><input type="text" name="serie" placeholder="N° de serie"></div><button class="primario" style="margin-top:6px">Registrar cotejo</button></form>' : '') +
      (!eq.manual ? '<form data-manual class="fila" style="margin-top:8px"><input type="text" name="codigo" placeholder="Código del manual controlado" style="flex:1"><button>Asociar manual</button></form>' : '') + '</div>';
    html += '<h3>Discrepancias</h3>' + db.discrepancias.map(function (d) { return '<div class="tarjeta"><b>' + d.id + '</b> ' + chip(d.estado) + '<br>' + h(d.descripcion) + (d.estado === 'ABIERTA' ? '<form data-resolver="' + d.id + '" class="fila" style="margin-top:6px"><input type="text" name="resolucion" placeholder="Resolución y fuente" style="flex:1"><button>Resolver</button></form>' : '<br><span class="suave">Resolución: ' + h(d.resolucion) + '</span>'); }).join('');
    html += '<h3>Fallas</h3>' + (db.fallas.length ? db.fallas.map(function (f) { return '<div class="tarjeta">' + f.id + ' · ' + h(f.descripcion) + ' ' + chip(f.liberadaPor ? 'RESUELTA' : 'ABIERTA') + ' <span class="suave">reportó ' + h(A.nombre(db, f.reportadaPor)) + '</span>' + (!f.liberadaPor ? ' <button data-liberar="' + f.id + '">Liberar (Mantenimiento)</button>' : ''); }).join('</div>') + '</div>' : '<p class="suave">Sin fallas registradas.</p>');
    html += '<h3>Accesorios</h3>' + db.accesorios.map(function (a) { return '<div class="tarjeta">' + a.codigo + ' · ' + h(a.tipo) + ' ' + chip(a.compatVerificadaPor ? 'VIGENTE' : 'PENDIENTE_VERIFICAR') + (!a.compatVerificadaPor ? ' <button data-compat="' + a.id + '">Verificar compatibilidad</button>' : '') + '</div>'; }).join('');
    } else html += '<p class="suave">El modo «tarea crítica» (manipulador telescópico T01) no forma parte de este escenario: no hay equipos cargados.</p>';
    html += '<h2>Habilitaciones</h2>' + tablaPersonas(true);
    html += '<h2>Áreas: levantamiento y diagnóstico</h2><p class="suave">Un área no se implementa (ni se instala su lámina) sin diagnóstico: qué trabajos se pueden hacer y qué peligros tiene (D-016).</p>' + db.areas.map(function (a) {
      if (a.diagnostico) return '<div class="tarjeta"><b>' + h(a.nombre) + '</b> ' + chip('VIGENTE') + ' · <a href="#/lamina/' + a.id + '">lámina</a><br><span class="suave">Trabajos: ' + a.diagnostico.trabajos.join(', ') + ' · Peligros: ' + h(a.diagnostico.peligros.join('; ')) + '</span></div>';
      return '<form class="tarjeta" data-diagnostico="' + a.id + '"><b>' + h(a.nombre) + '</b> ' + chip('PENDIENTE') + '<label class="campo">Trabajos que se pueden realizar</label>' + db.tareas.map(function (t) { return '<label class="opcion"><input type="checkbox" name="trabajos" value="' + t.id + '"> ' + t.id + ' · ' + h(t.nombre) + '</label>'; }).join('') +
        '<label class="campo">Peligros identificados (uno por línea)</label><textarea name="peligros"></textarea><button class="primario" style="margin-top:8px">Registrar diagnóstico</button></form>';
    }).join('');
    html += '<h2>Procedimiento ' + db.procedimiento.codigo + '</h2>' + db.procedimiento.versiones.map(function (v) { return '<div class="tarjeta">v' + v.version + ' ' + chip(v.estado) + ' · aprobó: ' + h(v.aprobadoPor) + ' · evidencia: ' + (v.evidenciaAprobacion ? h(v.evidenciaAprobacion) : '<b>no hay</b>') + (v.estado !== 'PUBLICADA' ? ' <button data-publicar="' + v.id + '">Publicar</button>' : '') + '</div>'; }).join('');
    html += '<h3>Tareas y cobertura</h3><div class="tarjeta">' + db.tareas.map(function (t) { return t.id + ' · ' + h(t.nombre) + ' ' + chip(t.cobertura) + ' <span class="suave">' + h(t.nota) + '</span>'; }).join('<br>') + '</div>';
    html += '<h3>Matriz reducida T01 (v' + A.MATRIZ.version + ', ' + A.MATRIZ.estado.replace(/_/g, ' ').toLowerCase() + ')</h3><div class="tarjeta tabla"><table><tr><th>Req.</th><th>Título</th><th>Etapas</th><th>Crit.</th></tr>' + A.MATRIZ.requisitos.map(function (r) { return '<tr><td>' + r.id + '</td><td>' + h(r.titulo) + '</td><td>' + r.porEtapa.map(function (e) { return e.etapa + ': ' + e.tipo.replace(/_/g, ' ').toLowerCase(); }).join('<br>') + '</td><td>' + r.criticidad + '</td></tr>'; }).join('') + '</table></div>';
    return html;
  }

  // ---------- Trazabilidad ----------
  function vTraza(id) {
    var evs = db.eventos.filter(function (e) { return !id || e.ast === id; });
    var c = A.verificarCadena(db);
    return '<h1>Trazabilidad' + (id ? ' · ' + h(id) : '') + '</h1>' +
      '<div class="tarjeta"><b>Cadena de hash:</b> ' + (c.ok ? '<span class="chip ok">íntegra · ' + c.eventos + ' eventos</span>' : '<span class="chip mal">alterada en el evento ' + c.rotaEn + '</span>') +
      '<div class="fila" style="margin-top:8px"><button data-exportar="json">Exportar JSON</button><button data-exportar="csv">Exportar CSV</button>' + (id ? '<a class="boton" href="#/ast/' + h(id) + '">Volver a la AST</a>' : '') + '</div>' +
      '<p class="suave">Cada evento guarda el hash del anterior: si alguien edita o borra uno, la cadena se rompe. Hora del dispositivo y del servidor se guardan por separado (C06).</p></div>' +
      '<div class="tarjeta">' + evs.slice().reverse().map(function (e) {
        var det = e.datos.motivo || e.datos.texto || e.datos.resultado || '';
        if (e.tipo === 'TRANSICION_RECHAZADA') det = 'Intentó ' + e.datos.intento + ': ' + e.datos.motivo + (e.datos.faltantes.length ? ' — ' + e.datos.faltantes.join(' · ') : '');
        return '<div class="evento' + (e.tipo === 'TRANSICION_RECHAZADA' ? ' rechazo' : e.tipo === 'DETENER' ? ' alto' : '') + '"><div class="fila" style="justify-content:space-between"><b>#' + e.n + ' ' + e.tipo.replace(/_/g, ' ') + '</b><span class="suave">' + (e.estadoNuevo ? (e.estadoPrevio || '∅') + ' → ' + e.estadoNuevo : (e.estadoPrevio || '')) + '</span></div>' +
          '<div class="suave">' + h(e.actor ? A.nombre(db, e.actor) : 'sistema') + (e.rol ? ' · ' + e.rol : '') + (e.ast && !id ? ' · <a href="#/ast/' + e.ast + '">' + e.ast + '</a>' : '') + ' · ' + hora(e.ocurridoEnDispositivo) + (e.ocurridoEnDispositivo !== e.registradoEn ? ' (servidor ' + hora(e.registradoEn) + ')' : '') + '</div>' +
          (det ? '<div>' + h(det) + '</div>' : '') + '<div class="hash suave">' + e.hash.slice(0, 16) + '… ← ' + e.hashPrevio.slice(0, 8) + '…</div></div>';
      }).join('') + '</div>';
  }

  // ---------- Láminas (componente físico, D-011) ----------
  function urlArea(a) { return location.href.split('#')[0] + '#/a/' + a.qr; }
  function vLaminas() {
    return '<h1>Láminas de área</h1><p class="suave">Cada área lleva una lámina resistente a la intemperie con su QR y la ficha de pasos. Si se reimprime, sube la versión.</p>' +
      db.areas.map(function (a) { return '<div class="tarjeta"><b>' + h(a.nombre) + '</b> · lámina v' + a.qrVersion + ' · <a href="#/lamina/' + a.id + '">ver e imprimir</a></div>'; }).join('');
  }
  function vLamina(id) {
    var a = A.porId(db.areas, id);
    if (!a) return '<p>Área desconocida.</p>';
    return '<div class="fila no-imprimir" style="margin-bottom:10px"><button class="primario" onclick="window.print()">Imprimir lámina</button><a class="boton" href="#/laminas">Volver</a></div>' +
      '<div class="lamina"><div class="cab"><div><div style="font-weight:900;letter-spacing:.14em;font-size:22px">ASTRA</div><div style="font-size:12px">Faena Demo Valle Alto</div></div><div style="text-align:right"><div style="font-size:24px;font-weight:900">' + h(a.nombre) + '</div><div style="font-size:12px">Lámina v' + a.qrVersion + '</div></div></div>' +
      '<div class="cuerpo"><div><div class="qr" id="qr"></div><p style="text-align:center;font-size:12px;margin:6px 0 0">Escanea con la cámara del teléfono</p><p class="hash" style="text-align:center;font-size:9px">' + h(urlArea(a)) + '</p></div>' +
      '<div><b>Antes de trabajar aquí</b><ol class="pasos"><li>Entra a la zona de llenado, escanea el QR y confirma el área.</li><li>Revisa los trabajos activos del área y quién los coordina.</li><li>Abre o súmate a la AST de tu tarea. Si la app dice que falta algo, <b>no partas</b>.</li><li>Revisa la ruta, la zona de exclusión y la comunicación con el señalero.</li><li>Ante cualquier cambio o condición peligrosa: <b>DETÉN</b> y avisa.</li></ol>' +
      '<b>Detén el trabajo si:</b><ul style="margin:4px 0;padding-left:18px;font-size:13px">' + Object.keys(A.CONDICIONES).map(function (k) { return '<li>' + h(A.CONDICIONES[k].texto) + '</li>'; }).join('') + '</ul></div></div>' +
      (a.diagnostico ? '<div class="peligros"><b>Peligros de esta área:</b> ' + h(a.diagnostico.peligros.join(' · ')) + '<br><b>Trabajos permitidos:</b> ' + a.diagnostico.trabajos.map(function (t) { return h(nombreTrabajo(t)); }).join(' · ') + '</div>' : '<div class="alto">ÁREA NO IMPLEMENTADA: FALTA DIAGNÓSTICO</div>') +
      '<div class="zona">📵 ZONA DE LLENADO — el teléfono se usa solo aquí, para llenar la AST. Durante el trabajo, guárdalo.</div>' +
      '<div class="alto">SI NO TIENES LA APP: DETÉN EL TRABAJO Y AVISA AL SUPERVISOR</div>' +
      '<div class="pie"><span>Supervisor de turno: Carlos Demo · radio canal 1</span><span>DEMO — no usar en faena</span></div></div>';
  }
  function dibujarQR() {
    var cont = document.getElementById('qr'); if (!cont) return;
    var a = db.areas.filter(function (x) { return location.hash.indexOf(x.id) > 0; })[0]; if (!a) return;
    if (window.qrcode) { var q = window.qrcode(0, 'M'); q.addData(urlArea(a)); q.make(); cont.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); }
    else cont.innerHTML = '<div style="border:2px dashed #999;padding:30px;text-align:center">QR (sin conexión para generarlo)<br><code>' + h(a.qr) + '</code></div>';
  }

  // ---------- Cápsula ASTRA (D-011) ----------
  var CAPSULA = {
    id: 'CAP-T01-01', titulo: 'Traslado interno sin carga: lo que detiene el trabajo', min: 3, version: 'PT-DEMO-07 v1',
    partes: [
      ['Qué es T01', 'Mover el manipulador telescópico vacío entre dos puntos, por una ruta definida y en posición de traslado. Si tomas carga, cambias el accesorio o elevas personas, ya no es T01: se detiene y se abre otra AST.'],
      ['Antes de partir', 'Preoperacional y prueba de arranque registradas, frente liberado por el supervisor, ruta revisada, zona de exclusión y comunicación con el señalero. Si la app dice que falta algo, no se parte.'],
      ['En marcha', 'Cualquier persona puede detener. Un peatón en la ruta, perder la comunicación, un terreno distinto, otra actividad no coordinada o poca visibilidad obligan a detener. La detención no espera un formulario.'],
      ['Para reanudar', 'El supervisor registra la causa y el control adoptado, y vuelve a revisar los requisitos. Nadie reanuda solo con «ya está bien».']
    ],
    preguntas: [
      ['Vas en traslado y te piden llevar un pallet. ¿Qué haces?', ['Lo llevo con cuidado', 'Detengo: deja de ser T01 y se abre otra AST', 'Aviso al terminar'], 1],
      ['¿Quién puede detener el traslado?', ['Solo el supervisor', 'Solo el operador', 'Cualquier persona de la faena'], 2],
      ['Se cortó la radio con el señalero. ¿Qué corresponde?', ['Seguir despacio', 'Detener y avisar', 'Tocar la bocina'], 1]
    ]
  };
  function vCapsula() {
    var p = yo(), reg = db.capsulas.filter(function (c) { return c.persona === persona; }).slice(-1)[0];
    return '<h1>Cápsula ASTRA</h1><p class="suave">' + CAPSULA.id + ' · ' + CAPSULA.min + ' min · ligada a ' + CAPSULA.version + '. Reemplaza la charla integral de esta tarea: queda registrada la asistencia, la recepción y la comprensión <b>por separado</b>. <b>No habilita</b>: Prevención verifica la instrucción (D-002).</p>' +
      mensaje() + '<div class="tarjeta"><h2 style="margin-top:0">' + h(CAPSULA.titulo) + '</h2>' + CAPSULA.partes.map(function (x, i) { return '<h3>' + (i + 1) + '. ' + h(x[0]) + '</h3><p>' + h(x[1]) + '</p>'; }).join('') + '</div>' +
      '<form class="tarjeta" data-capsula><b>Comprensión (3 preguntas)</b>' + CAPSULA.preguntas.map(function (q, i) { return '<label class="campo">' + h(q[0]) + '</label>' + q[1].map(function (o, j) { return '<label style="display:block"><input type="radio" name="q' + i + '" value="' + j + '"> ' + h(o) + '</label>'; }).join(''); }).join('') +
      '<button class="primario" style="margin-top:10px">Registrar como ' + h(p.nombre) + '</button></form>' +
      (reg ? '<div class="tarjeta">Último registro de ' + h(p.nombre) + ': ' + reg.buenas + '/' + reg.total + ' · ' + hora(reg.en) + '</div>' : '');
  }

  // ---------- Enrutador ----------
  function render() {
    var ruta = location.hash.replace(/^#/, '') || '/', partes = ruta.split('/'), cuerpo;
    if (!persona) { document.body.className = 'simple'; document.getElementById('app').innerHTML = vIngresar(); return; }
    document.body.className = nivel() === 'base' ? 'simple' : '';
    // D-013: las pantallas de mando no se abren para el nivel base, aunque se escriba la dirección
    if (nivel() === 'base' && ['tablero', 'panel', 'prevencion', 'traza', 'laminas', 'lamina', 'guion', 'control', 'biblioteca', 'charla', 'configuracion', 'informe', 'aprendizaje', 've', 'escenario', 'etiquetas-maq', 'cumplimiento', 'miper', 'accidentes'].indexOf(partes[1]) >= 0) {
      ui.msg = { ok: false, texto: 'Esa pantalla es para supervisión y Prevención.' };
      history.replaceState(null, '', '#/'); ruta = '/'; partes = ['', ''];
    }
    // El equipo del servicio documental es externo a la faena: solo documentos y avisos
    if (nivel() === 'servicio' && ['documentos', 'avisos'].indexOf(partes[1]) < 0) { history.replaceState(null, '', '#/documentos'); partes = ['', 'documentos']; ruta = '/documentos'; }
    var vk = window.ASTRA_VK ? window.ASTRA_VK.ruta(partes) : null, vm = vk !== null ? null : (window.ASTRA_VM ? window.ASTRA_VM.ruta(partes) : null), vc = vk !== null ? vk : (vm !== null ? vm : window.ASTRA_VC.ruta(partes));
    if (vc !== null) cuerpo = vc;
    else if (partes[1] === 'a') cuerpo = vArea(partes[2]);
    else if (partes[1] === 'mis') cuerpo = vMis();
    else if (partes[1] === 'tablero') cuerpo = vTablero();
    else if (partes[1] === 'guion') cuerpo = vInicio();
    else if (partes[1] === 'ast') cuerpo = vAst(partes[2]);
    else if (partes[1] === 'panel') cuerpo = vPanel();
    else if (partes[1] === 'prevencion') cuerpo = vPrevencion();
    else if (partes[1] === 'traza') cuerpo = vTraza(partes[2]);
    else if (partes[1] === 'laminas') cuerpo = vLaminas();
    else if (partes[1] === 'lamina') cuerpo = vLamina(partes[2]);
    else if (partes[1] === 'capsula') cuerpo = vCapsula();
    else cuerpo = nivel() === 'base' ? vInicioBase() : vInicioMando();
    document.getElementById('app').innerHTML = cabecera(ruta) + '<main>' + cuerpo + '</main>';
    dibujarQR(); if (window.ASTRA_VM) window.ASTRA_VM.dibujar();
    window.ASTRA_VC.notificarNuevos();
  }
  function astActual() { var m = location.hash.match(/#\/ast\/([^/]+)/); return m ? m[1] : null; }
  function datosForm(f) { var o = {}; new FormData(f).forEach(function (v, k) { if (o[k] !== undefined) o[k] = [].concat(o[k], v); else o[k] = v; }); return o; }

  // ---------- Eventos de la interfaz ----------
  document.addEventListener('change', function (e) {
    if (e.target.id === 'persona') { persona = e.target.value; ui.editar = false; guardar(); render(); aviso('Ahora eres ' + yo().nombre + ' (' + yo().rol + ')'); }
    if (e.target.id === 'sinsenal') {
      db.sinSenal = e.target.checked;
      if (!db.sinSenal && db.cola.length) { var n = A.sincronizar(db); aviso('Volvió la señal: ' + n + ' detención(es) enviada(s) con su hora original'); }
      guardar(); render();
    }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('button, [data-confirmar]'); if (!b) return;
    var id = astActual();
    if (b.id === 'salir') { persona = null; ui = { msg: null, editar: false }; guardar(); location.hash = '#/'; render(); return; }
    if (b.dataset.entrar) { persona = b.dataset.entrar; guardar(); if (!/^#\/(a|m)\//.test(location.hash)) location.hash = '#/'; render(); return; }
    if (b.dataset.escenario) {
      try { if (b.dataset.escenario === '0') localStorage.removeItem(CLAVE_E); else localStorage.setItem(CLAVE_E, b.dataset.escenario === 'om' ? 'om' : '1'); } catch (x) { /* sin almacenamiento */ }
      db = baseNueva(); persona = null; ui = { msg: { ok: true, texto: b.dataset.escenario === 'om' ? 'Obra modelo cargada: SIMULACIÓN — PROTOTIPO.' : b.dataset.escenario === '1' ? 'Escenario cargado: SIMULACIÓN — PROTOTIPO.' : 'Volviste a la demo original.' }, editar: false }; guardar(); location.hash = '#/'; render(); return;
    }
    if (b.hasAttribute('data-ver-todo')) { ui.verTodo = true; render(); return; }
    if (b.hasAttribute('data-informe')) {
      var filas = db.asts.map(function (a) { return [a.id, a.tarea || '', A.porId(db.areas, a.area).nombre, a.estado, A.nombre(db, a.creadaPor), a.detenciones.length, (a.resultado && a.resultado.pendientes || []).length].join(';'); });
      var u = URL.createObjectURL(new Blob(['ast;tarea;area;estado;creada_por;detenciones;pendientes\n' + filas.join('\n')], { type: 'text/csv' })), el = document.createElement('a');
      el.href = u; el.download = 'astra-informe-' + new Date().toISOString().slice(0, 10) + '.csv'; el.click(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); return;
    }
    if (b.id === 'reiniciar') { if (confirm('¿Reiniciar la demo? Se borran todas las AST y eventos de prueba.')) { db = baseNueva(); ui = { msg: null, editar: false }; guardar(); location.hash = '#/'; render(); } return; }
    if (b.dataset.confirmar) { ui.areaConfirmada = b.dataset.confirmar; render(); return; }
    if (b.hasAttribute('data-escanear')) { escanear(); return; }
    if (b.dataset.crear) {
      var area = A.porId(db.areas, b.dataset.crear);
      var r = A.aplicar(db, { tipo: 'CREAR', actor: persona, datos: { area: area.id, qr: area.qr, confirmaArea: true } });
      guardar(); if (r.ok) location.hash = '#/ast/' + r.ast.id; else { ui.msg = { ok: false, texto: r.motivo }; render(); }
      return;
    }
    if (b.dataset.ev) { ejecutar(b.dataset.ev, id); return; }
    if (b.hasAttribute('data-editar')) { ui.editar = true; render(); return; }
    if (b.hasAttribute('data-cancelar-edicion')) { ui.editar = false; render(); return; }
    if (b.dataset.cond) {
      var d = { condicion: b.dataset.cond }; if (b.dataset.cond === 'CAMBIO_ACCESORIO') d.accesorio = document.getElementById('accNuevo').value;
      ejecutar('REPORTAR_CONDICION', id, d, 'Condición reportada: la AST quedó DETENIDA. Se avisó al supervisor y a Prevención.'); return;
    }
    if (b.dataset.liberar) { ejecutar('LIBERAR_FALLA', null, { falla: b.dataset.liberar, critica: false }); return; }
    if (b.dataset.compat) { ejecutar('VERIFICAR_COMPATIBILIDAD', null, { accesorio: b.dataset.compat }); return; }
    if (b.dataset.publicar) { ejecutar('PUBLICAR_VERSION', null, { version: b.dataset.publicar }); return; }
    if (b.dataset.verifInstr) { ejecutar('VERIFICAR_HABILITACION', null, { persona: b.dataset.verifInstr, tipo: 'instruccion' }); return; }
    if (b.dataset.exportar) {
      var evs = db.eventos, txt, tipo;
      if (b.dataset.exportar === 'json') { txt = JSON.stringify({ exportado: new Date().toISOString(), cadena: A.verificarCadena(db), eventos: evs }, null, 2); tipo = 'application/json'; }
      else { txt = 'n;tipo;ast;actor;rol;estado_previo;estado_nuevo;ocurrido_dispositivo;registrado;hash\n' + evs.map(function (x) { return [x.n, x.tipo, x.ast, x.actor, x.rol, x.estadoPrevio, x.estadoNuevo, x.ocurridoEnDispositivo, x.registradoEn, x.hash].join(';'); }).join('\n'); tipo = 'text/csv'; }
      var url = URL.createObjectURL(new Blob([txt], { type: tipo })), a = document.createElement('a');
      a.href = url; a.download = 'astra-bitacora.' + b.dataset.exportar; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, d = datosForm(f), id = astActual(); e.preventDefault();
    if (f.hasAttribute('data-ingresar')) {
      var quien = A.buscarPorIdentificador(db, d.ident);
      if (!quien) { ui.msg = { ok: false, texto: (/[0-9]/.test(d.ident || '') && !/^[A-Za-z]/.test(d.ident) && !A.rutValido(d.ident) ? 'RUT inválido: revisa el dígito verificador' : 'No encontramos ese RUT o número de ingreso en la faena') }; render(); return; }
      // D-043 §1: si llegó por el QR de un área, después de identificarse sigue directo en esa área
      persona = quien.id; guardar(); if (!/^#\/(a|m)\//.test(location.hash)) location.hash = '#/'; render(); return;
    }
    if (f.dataset.diagnostico) {
      ejecutar('DIAGNOSTICAR_AREA', null, { area: f.dataset.diagnostico, trabajos: [].concat(d.trabajos || []), peligros: (d.peligros || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean) }, 'Diagnóstico registrado: el área queda implementada');
      return;
    }
    if (f.id === 'preparar') {
      var part = [{ persona: d.operador, funcion: 'operador' }, { persona: d.supervisor, funcion: 'supervisor' }];
      if (d.senalero) part.push({ persona: d.senalero, funcion: 'senalero' });
      var r = ejecutar(f.dataset.tipo, id, { tarea: d.tarea, equipo: d.equipo, accesorio: d.accesorio, ruta: [].concat(d.ruta || []), participantes: part });
      if (r.ok) { ui.editar = false; render(); }
      return;
    }
    if (f.dataset.evid) {
      var accion = e.submitter ? e.submitter.value : 'REGISTRADA';
      ejecutar('REGISTRAR_EVIDENCIA', id, { req: f.dataset.evid, etapa: f.dataset.etapa, tipo: accion, texto: d.texto }, 'REF-' + f.dataset.evid + (accion === 'NO_DISPONIBLE' ? ' declarado no disponible (queda visible)' : ' registrado'));
      return;
    }
    if (f.hasAttribute('data-falla')) { ejecutar('REPORTAR_FALLA', id, { texto: d.texto || 'Falla sin descripción' }, 'Falla registrada. En marcha obliga a detener (R07).'); return; }
    if (f.hasAttribute('data-complemento')) { ejecutar('COMPLEMENTAR_DETENCION', id, { texto: d.texto }); return; }
    if (f.hasAttribute('data-reeval')) { ejecutar('REGISTRAR_REEVALUACION', id, { causa: d.causa, control: d.control, cambiosEvaluados: !!d.cambios }, 'Reevaluación guardada'); return; }
    if (f.hasAttribute('data-incorporar')) { ejecutar('INCORPORAR_PERSONA', id, { persona: d.persona, funcion: d.funcion }); return; }
    if (f.hasAttribute('data-cerrar')) { ejecutar('CERRAR', id, { resultado: d.resultado, horometro: d.horometro, fallas: (d.fallas || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean) }, 'AST cerrada. Los pendientes quedan visibles.'); return; }
    if (f.dataset.motivo) { ejecutar(f.dataset.motivo, id, { motivo: d.motivo }); return; }
    if (f.hasAttribute('data-placa')) { if (!d.fabricante || !d.modelo) { ui.msg = { ok: false, texto: 'Escribe fabricante y modelo tal como aparecen en la placa' }; render(); return; } ejecutar('VERIFICAR_PLACA', null, { equipo: 'eq-01', fabricante: d.fabricante, modelo: d.modelo, serie: d.serie || null }); return; }
    if (f.hasAttribute('data-manual')) { ejecutar('ASOCIAR_MANUAL', null, { equipo: 'eq-01', codigo: d.codigo }); return; }
    if (f.dataset.resolver) { ejecutar('RESOLVER_DISCREPANCIA', null, { discrepancia: f.dataset.resolver, resolucion: d.resolucion }); return; }
    if (f.dataset.autorizar) { ejecutar('VERIFICAR_HABILITACION', null, { persona: f.dataset.autorizar, tipo: 'autorizacion', alcance: d.alcance }); return; }
    if (f.hasAttribute('data-capsula')) {
      var resp = CAPSULA.preguntas.map(function (q, i) { return String(d['q' + i]) === String(q[2]); });
      ejecutar('REGISTRAR_CAPSULA', null, { capsula: CAPSULA.id, respuestas: resp }, 'Cápsula registrada: ' + resp.filter(Boolean).length + '/' + resp.length + '. No habilita: falta que Prevención la verifique.');
    }
  });
  // DETENER: mantener presionado ~1 s (evita toques accidentales). Nunca pide formulario.
  var temporizador = null;
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest('[data-detener]'); if (!b) return;
    b.classList.add('cargando');
    temporizador = setTimeout(function () {
      b.classList.remove('cargando'); temporizador = null;
      var ev = { tipo: 'DETENER', actor: persona, ast: b.dataset.detener, datos: {} };
      if (navigator.vibrate) navigator.vibrate(200);
      if (db.sinSenal) { A.detenerSinSenal(db, ev); aviso('Sin señal: detención guardada en el teléfono. Detén físicamente y avisa; se enviará al volver la conexión.'); }
      else if ((A.porId(db.asts, ev.ast) || {}).modo === 'cuadrilla') { var rc = window.ASTRA_C.aplicar(db, { tipo: 'C_DETENER', actor: persona, ast: ev.ast, datos: {} }); aviso(rc.ok ? 'DETENIDA. Se avisó al encargado del área y a Prevención.' : rc.motivo); }
      else { var r = A.aplicar(db, ev); aviso(r.ok ? 'DETENIDA. Se avisó al supervisor y a Prevención. Puedes agregar el motivo después.' : r.motivo); }
      guardar(); render();
    }, 900);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) {
    document.addEventListener(t, function (e) {
      if (!temporizador) return; var b = e.target.closest && e.target.closest('[data-detener]');
      if (t === 'pointerleave' && !(e.target.dataset && e.target.dataset.detener)) return;
      clearTimeout(temporizador); temporizador = null;
      document.querySelectorAll('.detener.cargando').forEach(function (x) { x.classList.remove('cargando'); });
      if (b && t === 'pointerup') aviso('Mantén presionado 1 segundo para detener');
    }, true);
  });
  window.addEventListener('hashchange', function () { ui.editar = false; ui.verTodo = false; render(); window.scrollTo(0, 0); });
  // «En vivo» entre ventanas (D-017): otra pestaña escribió en la base → recargar y redibujar si no se está escribiendo
  window.addEventListener('storage', function (e) {
    if (e.key !== CLAVE || !e.newValue) return;
    try { db = JSON.parse(e.newValue); } catch (x) { return; }
    var foco = document.activeElement; if (foco && /INPUT|TEXTAREA|SELECT/.test(foco.tagName) && foco.id !== 'persona') return;
    render();
  });
  setInterval(function () { if (/#\/tablero/.test(location.hash) && !document.hidden) render(); }, 5000);

  window.ASTRA_APP = {
    get db() { return db; }, get persona() { return persona; }, get ui() { return ui; },
    h: h, chip: chip, est: est, hora: hora, mensaje: mensaje, botonDetener: botonDetener, ident: ident, nivel: nivel,
    setMsg: function (m) { ui.msg = m; }, guardar: guardar, render: render
  };
  cargar(); render();
})();
