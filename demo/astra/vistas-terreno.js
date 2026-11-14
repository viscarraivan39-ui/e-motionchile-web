// ASTRA · pantallas de verificación en terreno, hallazgos, observación preventiva del área y fotos (D-032).
// La lógica está en terreno.js; aquí solo se muestra y se llama. Usa los ayudantes de window.ASTRA_APP.
(function () {
  'use strict';
  var A = window.ASTRA, C = window.ASTRA_C, T = window.ASTRA_T;
  var X = function () { return window.ASTRA_APP; };
  var db = function () { return T.preparar(X().db); }, yoId = function () { return X().persona; }, yo = function () { return A.porId(db().personas, yoId()); };
  var h = function (t) { return X().h(t); }, chip = function (e) { return X().chip(e); }, hora = function (i) { return X().hora(i); };
  var fotos = {}; // fotos en espera por formulario (aún no enviadas)
  var CHIP_V = { DECLARADO: 'info', PENDIENTE_VERIFICACION: 'aviso', VERIFICADO: 'ok', INCUMPLIMIENTO: 'mal', CORREGIDO_VERIFICADO: 'ok', VERIFICADO_SISTEMA: 'ok', NO_APLICA: '' };
  var EST_HZ = { ABIERTO: ['mal', 'abierto'], CORREGIDO_PENDIENTE_VERIFICACION: ['aviso', 'corregido, falta verificar en terreno'], CORREGIDO_VERIFICADO: ['ok', 'corregido y verificado'] };
  var AVISO_PARAR = '<div class="mensaje mal grande-t"><b>Si falta una protección obligatoria y se está operando: detén de forma segura AHORA y avisa.</b> No esperes a llenar esto ni a sacar fotos. Una notificación no detiene una máquina.</div>';
  var AVISO_FOTO = '<p class="suave">📷 Opcional. Solo fotos tomadas ahora con la cámara de la app (no se adjuntan archivos ni fotos de la galería). Saca solo las que muestren algo: una vista general, la condición concreta y, si corresponde, la corrección. Una foto muestra solo lo visible en ese momento y no aprueba nada. Enfoca condiciones y equipos, evita rostros. <b>Nunca fotografíes mientras alguien opera una herramienta ni te expongas para sacarla.</b></p>';
  var camara = { stream: null, clave: null, tipo: null };

  function act(tipo, astId, datos, textoOk) {
    var r = T.aplicar(db(), { tipo: tipo, actor: yoId(), ast: astId || null, datos: datos || {} });
    X().setMsg(r.ok ? { ok: true, texto: textoOk || 'Listo' } : { ok: false, texto: 'No se pudo: ' + r.motivo });
    X().guardar();
    return r;
  }
  function chipV(estado) { return '<span class="chip ' + (CHIP_V[estado] || '') + '">' + h(T.ESTADO_VERIF[estado] || estado) + '</span>'; }
  function nombre(id) { return h(A.nombre(db(), id)); }

  // ---------- Fotos guiadas ----------
  function bloqueFotos(clave, tipos) {
    var l = fotos[clave] || [];
    return '<div class="tarjeta fotos-guiadas"><b>Fotos de apoyo</b>' + AVISO_FOTO +
      '<div class="fila"><select data-t-foto-tipo="' + clave + '">' + tipos.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="boton" data-t-camara="' + clave + '">📷 Tomar fotografía</button></div>' +
      (l.length ? '<div class="miniaturas">' + l.map(function (f, i) { return '<figure><img src="' + f.dataUrl + '" alt="foto ' + (i + 1) + '"><figcaption>' + h(f.tipo) + ' · cámara <button type="button" data-t-foto-quitar="' + clave + '" data-i="' + i + '">✕</button></figcaption></figure>'; }).join('') + '</div>' : '') + '</div>';
  }
  // Cámara en la página: getUserMedia + captura de un cuadro. No existe selector de archivos, así no hay galería.
  function abrirCamara(clave, tipo) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { X().setMsg({ ok: false, texto: 'Este navegador no permite usar la cámara desde la app. Las fotos solo se toman en el momento; no se pueden adjuntar archivos.' }); X().render(); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (st) {
      camara.stream = st; camara.clave = clave; camara.tipo = tipo;
      var cap = document.createElement('div'); cap.className = 'camara-capa'; cap.id = 'camara';
      cap.innerHTML = '<video autoplay playsinline muted></video><p>Encuadra la condición o el equipo. Evita rostros.</p><div class="fila"><button class="primario enorme" data-t-disparar>📷 Tomar fotografía</button><button class="enorme" data-t-cerrar-camara>Cancelar</button></div>';
      document.body.appendChild(cap); cap.querySelector('video').srcObject = st;
    }).catch(function () { X().setMsg({ ok: false, texto: 'No se pudo abrir la cámara (permiso denegado o no disponible). No se pueden adjuntar archivos ni fotos de la galería.' }); X().render(); });
  }
  function cerrarCamara() {
    if (camara.stream) camara.stream.getTracks().forEach(function (t) { t.stop(); });
    camara.stream = null; var c = document.getElementById('camara'); if (c) c.remove();
  }
  function disparar() {
    var v = document.querySelector('#camara video'); if (!v || !v.videoWidth) return;
    var max = 640, esc = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight)), cv = document.createElement('canvas');
    cv.width = Math.round(v.videoWidth * esc); cv.height = Math.round(v.videoHeight * esc);
    cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
    (fotos[camara.clave] = fotos[camara.clave] || []).push({ tipo: camara.tipo, origen: 'camara', dataUrl: cv.toDataURL('image/jpeg', 0.6) });
    cerrarCamara(); conservarYRender();
  }
  // Conserva lo escrito en los formularios de la pantalla al redibujar (p. ej. después de tomar una foto)
  function conservarYRender() {
    var datos = [];
    document.querySelectorAll('main form').forEach(function (f) {
      var sel = Array.prototype.filter.call(f.attributes, function (a) { return a.name.indexOf('data-t-') === 0; }).map(function (a) { return '[' + a.name + '="' + a.value + '"]'; })[0];
      if (!sel) return; var g = []; f.querySelectorAll('input,select,textarea').forEach(function (el) { if (el.name) g.push([el.name, el.type, el.value, el.checked]); });
      datos.push([sel, g]);
    });
    X().render();
    datos.forEach(function (d) {
      var f = document.querySelector('form' + d[0]); if (!f) return;
      d[1].forEach(function (x) { f.querySelectorAll('[name="' + x[0] + '"]').forEach(function (el) { if (el.type === 'radio' || el.type === 'checkbox') { if (el.value === x[2]) el.checked = x[3]; } else el.value = x[2]; }); });
    });
  }
  function verFotos(ids) {
    var l = (ids || []).map(function (id) { return A.porId(db().fotos, id); }).filter(Boolean);
    return l.length ? '<div class="miniaturas">' + l.map(function (f) { return '<figure><img src="' + f.dataUrl + '" alt="foto ' + f.id + '"><figcaption>' + h(f.tipo) + ' · cámara de la app · ' + nombre(f.autor) + ' · recibida ' + hora(f.recibidaEn || f.en).slice(5, 16) + '</figcaption></figure>'; }).join('') + '</div>' : '';
  }

  // ---------- Sección dentro del detalle de una AST ----------
  function seccionAst(ast) {
    var D = db(), me = yo(), html = '';
    if (!ast.ficha) return '';
    var reqs = C.requisitosPersona(D, ast).filter(function (r) { return r.nivel !== 'sistema'; });
    html += '<h2>Verificación en terreno <span class="suave">(presencial, distinta de la aprobación documental)</span></h2>';
    html += ast.integrantes.map(function (i) {
      var filas = reqs.filter(function (r) { return (i.verif || {})[r.id]; }).map(function (r) {
        var v = i.verif[r.id], puede = T.puedeVerificar(D, me, ast, r.verifica) && ['DECLARADO', 'PENDIENTE_VERIFICACION'].indexOf(v.estado) >= 0;
        var puedeHz = T.puedeVerificar(D, me, ast, null) && ['DECLARADO', 'PENDIENTE_VERIFICACION', 'VERIFICADO', 'CORREGIDO_VERIFICADO'].indexOf(v.estado) >= 0;
        return '<div class="mini-ast"><span>' + (r.critico ? '⚠️ ' : '') + h(r.nombre) + (r.verifica === 'especializada' ? ' <span class="suave">(especializada)</span>' : '') + '</span><span>' + chipV(v.estado) + (v.por && v.modo ? ' <span class="suave">' + nombre(v.por) + ' ' + hora(v.en).slice(11, 16) + '</span>' : '') +
          (puede ? ' <a class="boton primario" href="#/v/' + ast.id + '/' + i.persona + '/' + r.id + '">Verificar</a>' : puedeHz && v.estado !== 'PENDIENTE_VERIFICACION' && v.estado !== 'DECLARADO' ? ' <a class="boton" href="#/v/' + ast.id + '/' + i.persona + '/' + r.id + '">Diferencia</a>' : '') + '</span></div>';
      }).join('');
      return filas ? '<details class="tarjeta"' + (i.estado === 'FIRMADO' ? ' open' : '') + '><summary><b>' + nombre(i.persona) + '</b> · ' + T.pendientesVerificacion(D, ast).filter(function (x) { return x.persona === i.persona; }).length + ' crítico(s) por verificar' + (i.bloqueoHallazgo ? ' <span class="chip mal">bloqueado por hallazgo ' + i.bloqueoHallazgo + '</span>' : '') + '</summary>' + filas + '</details>' : '';
    }).join('');
    var hzs = D.hallazgos.filter(function (x) { return x.ast === ast.id; });
    if (hzs.length) html += '<h2>Hallazgos</h2>' + hzs.map(tarjetaHallazgo).join('');
    return html;
  }
  function tarjetaHallazgo(hz) {
    var D = db(), me = yo(), est = EST_HZ[hz.estado] || ['', hz.estado], area = A.porId(D.areas, hz.area);
    var responsable = T.puedeVerificarArea(D, me, hz.area);
    var html = '<div class="tarjeta hallazgo"><b><a href="#/hz/' + hz.id + '">' + hz.id + '</a></b> <span class="chip ' + est[0] + '">' + est[1] + '</span> <span class="suave">' + h(area.nombre) + ' · ' + hora(hz.en).slice(5, 16) + ' · registró ' + nombre(hz.por) + (hz.origen === 'observacion' ? ' (observación preventiva)' : hz.origen === 'reporte' ? ' (reporte)' : '') + '</span>' +
      '<p>' + h(hz.texto) + '</p>' +
      (hz.persona ? '<p class="suave">Persona: ' + nombre(hz.persona) + ' · declaración original: <b>' + h(hz.declaracion ? (hz.declaracion.valor === 'SI' ? 'Sí, cumple' : hz.declaracion.valor) : '—') + '</b> (se conserva) · alcance: ' + h(hz.alcance) + '<br>Posibles causas, sin presumir: ' + h(hz.posiblesCausas.join(', ')) + '.</p>' : '') +
      verFotos(hz.fotos) +
      (hz.correccion ? '<p>✔ Causa: ' + h(hz.correccion.causa) + ' · Medida: ' + h(hz.correccion.accion) + ' <span class="suave">(' + nombre(hz.correccion.por) + ')</span></p>' + verFotos(hz.correccion.fotos) : '') +
      (hz.verificacion ? '<p>✔ Verificado en terreno por ' + nombre(hz.verificacion.por) + ' · ' + hora(hz.verificacion.en).slice(11, 16) + '</p>' : '') +
      (hz.explicacion ? '<p class="suave">Explicación del trabajador: ' + h(hz.explicacion.texto) + '</p>' : '');
    if (responsable && hz.estado === 'ABIERTO') html += '<form data-t-corregir="' + hz.id + '" class="tarjeta"><b>Registrar corrección</b><input name="causa" placeholder="Causa (lo que pasó)"><input name="accion" placeholder="Medida o protección gestionada" style="margin-top:6px">' + bloqueFotos('cor-' + hz.id, [['correccion', 'Corrección realizada']]) + '<button class="primario">Registrar corrección</button></form>' +
      (hz.alcance !== 'area' ? '<form data-t-ampliar="' + hz.area + '" data-hz="' + hz.id + '" class="fila" style="margin-top:6px"><input name="motivo" placeholder="Motivo para detener toda el área" style="flex:1"><button class="peligro">Ampliar detención al área</button></form>' : '');
    if (responsable && hz.estado === 'CORREGIDO_PENDIENTE_VERIFICACION') html += '<form data-t-vercorr="' + hz.id + '" class="tarjeta"><label class="opcion"><input type="checkbox" name="presencial"> Estoy en terreno y comprobé la corrección en persona</label><p class="suave">Una foto o una casilla del trabajador no bastan para desbloquear.</p><button class="primario">Verificar corrección</button></form>';
    if (hz.persona === yoId() && !hz.explicacion) html += '<form data-t-explicar="' + hz.id + '" class="fila"><input name="texto" placeholder="Tu explicación (opcional)" style="flex:1"><button>Agregar mi explicación</button></form>';
    if ((me.rol === 'prevencion' || responsable) && hz.persona && !hz.revisionHumana) html += '<form data-t-derivar="' + hz.id + '" class="fila" style="margin-top:6px"><input name="motivo" placeholder="Si corresponde: motivo para revisión humana" style="flex:1"><button>Derivar a revisión humana</button></form>';
    if (hz.revisionHumana && (me.rol === 'prevencion' || responsable)) html += '<div class="mensaje aviso-zona"><b>Revisión humana pendiente.</b> ' + h(hz.revisionHumana.motivo) + '<br>Antes de decidir, revisar: ' + h(hz.revisionHumana.revisar.join(' · ')) + '. ' + h(hz.revisionHumana.nota) + '</div>';
    return html + '</div>';
  }

  // ---------- Pantalla de verificación de un requisito ----------
  function vVerificar(astId, persona, req) {
    var D = db(), ast = A.porId(D.asts, astId), i = ast && C.integrante(ast, persona);
    var r = ast && C.requisitosPersona(D, ast).filter(function (x) { return x.id === req; })[0];
    if (!i || !r) return '<p>No encontrado.</p>';
    var v = (i.verif || {})[req] || {}, esEpp = r.tipo === 'epp';
    var html = '<h1>Verificación en terreno</h1><p class="suave">' + h(ast.nombre) + ' · ' + nombre(persona) + '</p>' + X().mensaje() + AVISO_PARAR +
      '<div class="tarjeta"><span class="ico">' + (r.icono || '🦺') + '</span> <b class="grande-t">' + h(r.nombre) + '</b> ' + (r.critico ? '<span class="chip mal">crítico</span>' : '') + '<br><span class="cita">' + h(r.cita) + '</span><br>Estado actual: ' + chipV(v.estado) + '<br><span class="suave">Declarado por el trabajador: ' + h((i.respuestas[req] || {}).valor === 'SI' ? 'Sí, cumple' : '—') + '</span></div>';
    if (['DECLARADO', 'PENDIENTE_VERIFICACION'].indexOf(v.estado) >= 0) html += '<form data-t-verificar="' + astId + '" data-persona="' + persona + '" data-req="' + req + '" class="tarjeta"><b>Comprueba en persona</b>' +
      (esEpp ? '<label class="opcion"><input type="checkbox" name="dispone"> Dispone del elemento indicado (exactamente: ' + h(r.nombre) + ')</label><label class="opcion"><input type="checkbox" name="condiciones"> Está en buenas condiciones</label><label class="opcion"><input type="checkbox" name="sabeUsar"> Sabe utilizarlo</label>'
        : '<label class="opcion"><input type="checkbox" name="condiciones"> La condición está como exige el procedimiento</label>') +
      '<label class="opcion destacada-op"><input type="checkbox" name="presencial"> Estoy en terreno, con el trabajador (verificación presencial)</label><button class="primario enorme" name="resultado" value="CUMPLE">Verificado: cumple</button></form>';
    html += '<form data-t-diferencia="' + astId + '" data-persona="' + persona + '" data-req="' + req + '" class="tarjeta"><b>' + h(T.DIFERENCIA) + '</b><p class="suave">No se borra la declaración ni se califica: puede ser una declaración incorrecta, pérdida o daño posterior, uso incorrecto o cambio de tarea.</p>' +
      '<textarea name="texto" placeholder="Qué se encontró (p. ej. está cortando sin pantalla facial)"></textarea><label class="opcion"><input type="checkbox" name="presencial"> Lo vi en terreno</label><label class="opcion"><input type="checkbox" name="area"> Afecta a toda el área: ampliar la detención</label>' +
      bloqueFotos('dif-' + astId + persona + req, [['condicion', 'Condición encontrada'], ['general', 'Vista general']]) + '<button class="peligro enorme">Registrar hallazgo y bloquear su participación</button></form>' +
      '<a class="boton enorme" href="#/c/' + astId + '">Volver a la AST</a>';
    return html;
  }

  // ---------- Primera verificación: chequeo presencial del encargado (D-033) ----------
  function vChequeo(astId) {
    var D = db(), ast = A.porId(D.asts, astId), me = yo();
    if (!ast) return '<p>AST no encontrada.</p>';
    var ap = ast.aprobaciones.filter(function (a) { return a.calidad === 'encargado_area' && a.area === ast.area && a.modo === 'presencial'; })[0];
    var html = '<h1>Verificación del encargado</h1><p class="suave">' + h(ast.nombre) + ' · ' + h(A.porId(D.areas, ast.area).nombre) + ' · ' + h(C.etiquetaEmpresa(D, ast)) + '</p>' + X().mensaje() +
      '<div class="mensaje aviso-zona">' + h(C.estadoTexto(D, ast) || ast.estado) + '</div>';
    if (!ap) return html + '<p>Esta AST no tiene verificación del encargado.</p>';
    (ap.verificaciones || []).forEach(function (v) {
      html += '<div class="tarjeta"><b>Verificación de ' + nombre(v.por) + '</b> · ' + hora(v.en).slice(5, 16) + ' · presencial<ul>' + v.items.map(function (it) { return '<li>' + (it.resultado === 'CUMPLE' ? '✔' : '✖') + ' ' + h(it.texto) + '</li>'; }).join('') + '</ul>' + (v.observaciones ? '<p class="suave">Observaciones: ' + h(v.observaciones) + '</p>' : '') + verFotos(v.fotos) + '</div>';
    });
    if (ap.estado === 'APROBADA') return html + '<a class="boton enorme" href="#/c/' + ast.id + '">Volver a la AST</a>';
    if (C.responsablesDe(D, ast.area, 'encargado_area', ast.empresa).indexOf(me.id) < 0) return html + '<p class="grande-t">La primera verificación la hace el encargado del área: ' + C.responsablesDe(D, ast.area, 'encargado_area', ast.empresa).map(nombre).join(' o ') + '.</p>';
    var firmados = ast.integrantes.filter(function (i) { return i.estado === 'FIRMADO'; });
    html += AVISO_PARAR + '<form data-t-chequeo="' + ast.id + '"><p class="grande-t">Acude al lugar del trabajo y comprueba cada punto. Son los controles de esta tarea según ' + h(ast.referencias.map(function (r) { return r.id + ' v' + r.version; }).join(', ')) + '.</p>' +
      ap.chequeo.map(function (it) {
        return '<div class="preg"><div class="preg-t"><span><b>' + h(it.texto) + '</b>' + (it.critico ? ' <span class="chip mal">crítico</span>' : '') + '<br><span class="suave">' + h(it.detalle) + '</span> <span class="cita">' + h(it.cita) + '</span></span></div>' +
          '<div class="sino"><label class="op-si"><input type="radio" name="' + it.id + '" value="CUMPLE"><span>Cumple</span></label><label class="op-no"><input type="radio" name="' + it.id + '" value="NO_CUMPLE"><span>No cumple</span></label></div>' +
          (it.epp && firmados.length ? '<details class="suave"><summary>Si no cumple: ¿quiénes? (queda un evento por persona)</summary>' + firmados.map(function (i) { return '<label class="opcion"><input type="checkbox" name="per:' + it.id + '" value="' + i.persona + '"> ' + nombre(i.persona) + '</label>'; }).join('') + '</details>' : '') + '</div>';
      }).join('') +
      '<label class="campo grande">Observaciones</label><textarea name="observaciones" placeholder="Lo que viste en terreno"></textarea>' +
      bloqueFotos('chq-' + ast.id, [['general', 'Vista general'], ['condicion', 'Condición concreta']]) +
      '<label class="opcion destacada-op"><input type="checkbox" name="presencial"> Estoy en el lugar del trabajo (verificación presencial)</label>' +
      '<button class="primario enorme">Registrar verificación</button></form><a class="boton enorme" href="#/c/' + ast.id + '">Volver a la AST</a>';
    return html;
  }

  // ---------- Informes de incumplimientos (D-034) ----------
  var CLASE_TXT = { OBSERVADO: 'Incumplimiento observado', DECLARADO: 'Faltante declarado antes de comenzar' };
  var ESTADO_REG = { ABIERTO: 'pendiente', CORREGIDO_PENDIENTE_VERIFICACION: 'corregido, falta verificar', CORREGIDO_VERIFICADO: 'Corregido y verificado', INVALIDADO: 'invalidado (no cuenta)' };
  var filtros = {};
  function vInforme() {
    var D = db(), me = yo();
    if (!D.asignaciones.some(function (a) { return a.persona === me.id && a.permisos.indexOf('ver_historial') >= 0; })) return '<h1>Informes</h1><div class="mensaje mal">El historial de incumplimientos solo lo ven los roles autorizados por la empresa.</div>';
    var regs = T.registros(D, me.id, filtros), turnos = D.config.turnos || [];
    var sel = function (n, ops, v) { return '<select name="' + n + '"><option value="">' + ({ turno: 'Todos los turnos', area: 'Todas las áreas', empresa: 'Todas las empresas', tipo: 'Todo tipo de requisito', clase: 'Observados y declarados' }[n]) + '</option>' + ops.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + h(o[1]) + '</option>'; }).join('') + '</select>'; };
    var html = '<h1>Historial de incumplimientos</h1>' + X().mensaje() + '<p class="suave">Solo para roles autorizados. Informa hechos y recurrencias; no califica conductas ni aplica sanciones: eso lo evalúan los responsables de la empresa.</p>' +
      '<form data-t-filtros class="tarjeta grilla">' + sel('turno', turnos.map(function (t) { return [t.id, t.nombre]; }), filtros.turno) + sel('area', D.areas.map(function (a) { return [a.id, a.nombre]; }), filtros.area) + sel('empresa', D.empresas.map(function (e) { return [e.id, e.nombre]; }), filtros.empresa) +
      sel('tipo', [['epp', 'EPP'], ['condicion', 'Condición del lugar'], ['competencia', 'Competencia']], filtros.tipo) + sel('clase', [['OBSERVADO', CLASE_TXT.OBSERVADO], ['DECLARADO', CLASE_TXT.DECLARADO]], filtros.clase) +
      '<input type="date" name="desde" value="' + (filtros.desde || '') + '"><input type="date" name="hasta" value="' + (filtros.hasta || '') + '"><button class="primario">Filtrar</button></form>';
    var validos = regs.filter(function (r) { return r.valido; });
    html += '<div class="kpis">' + [['Eventos observados', validos.filter(function (r) { return r.clase === 'OBSERVADO'; }).length], ['Requisitos afectados', validos.filter(function (r) { return r.clase === 'OBSERVADO'; }).reduce(function (n, r) { return n + r.requisitos.length; }, 0)], ['Faltantes declarados', validos.filter(function (r) { return r.clase === 'DECLARADO'; }).length], ['Pendientes', validos.filter(function (r) { return r.estado !== 'CORREGIDO_VERIFICADO'; }).length]].map(function (k) { return '<div class="kpi"><div class="n">' + k[1] + '</div><div class="suave">' + k[0] + '</div></div>'; }).join('') + '</div>';
    // Por trabajador (orden alfabético: no es un ranking)
    var personas = []; regs.forEach(function (r) { if (personas.indexOf(r.persona) < 0) personas.push(r.persona); });
    personas.sort(function (a, b) { return A.nombre(D, a).localeCompare(A.nombre(D, b)); });
    html += '<h2>Por trabajador</h2>' + (personas.length ? personas.map(function (pid) {
      var l = regs.filter(function (r) { return r.persona === pid; });
      return '<details class="tarjeta"><summary><b>' + h(T.resumenPersona(D, pid, l, filtros.turno || null)) + '</b> <span class="suave">· ' + h(A.porId(D.empresas, A.porId(D.personas, pid).empresa).nombre) + ' · <a href="#/ficha/' + pid + '">ficha</a></span></summary>' + l.map(filaRegistro).join('') + '</details>';
    }).join('') : '<p class="suave">Sin registros con estos filtros.</p>');
    // Por requisito: recurrencias
    var porReq = {}; regs.filter(function (r) { return r.valido; }).forEach(function (r) { r.requisitos.forEach(function (q) { (porReq[q.nombre] = porReq[q.nombre] || []).push(r); }); });
    html += '<h2>Por requisito (recurrencias)</h2><div class="tarjeta tabla"><table><tr><th>Requisito</th><th>Eventos</th><th>Personas distintas</th><th>Pendientes</th></tr>' + Object.keys(porReq).sort(function (a, b) { return porReq[b].length - porReq[a].length; }).map(function (k) {
      var l = porReq[k], pers = []; l.forEach(function (r) { if (pers.indexOf(r.persona) < 0) pers.push(r.persona); });
      return '<tr><td>' + h(k) + '</td><td>' + l.length + '</td><td>' + pers.length + '</td><td>' + l.filter(function (r) { return r.estado !== 'CORREGIDO_VERIFICADO'; }).length + '</td></tr>';
    }).join('') + '</table></div><div class="fila"><button data-t-csv>Descargar CSV</button></div>';
    return html;
  }
  function filaRegistro(r) {
    var D = db();
    return '<div class="mini-ast registro' + (r.valido ? '' : ' invalido') + '"><span><b>' + (r.hallazgo ? '<a href="#/hz/' + r.id + '">' + r.id + '</a>' : r.id) + '</b> · ' + CLASE_TXT[r.clase] + ' · ' + hora(r.en).slice(5, 16) + ' · ' + h(((D.config.turnos || []).filter(function (t) { return t.id === r.turno; })[0] || {}).nombre || '') + '<br>' +
      h(r.requisitos.map(function (q) { return q.nombre; }).join(', ')) + ' · ' + h(A.porId(D.areas, r.area).nombre) + (r.tarea ? ' · ' + h(r.tarea) : '') + '</span><span>' + chip(r.estado === 'CORREGIDO_VERIFICADO' ? 'CUMPLIDO' : r.estado === 'INVALIDADO' ? 'NO_APLICA' : 'PENDIENTE') + ' <span class="suave">' + ESTADO_REG[r.estado] + '</span></span></div>';
  }
  // Detalle completo de un evento: todos sus antecedentes (D-034 §1, §3–§5)
  function vEvento(id) {
    var D = db(), hz = A.porId(D.hallazgos, id), me = yo();
    if (!hz) return '<p>Evento no encontrado.</p>';
    if (!T.puedeVerHistorial(D, me, hz.area, hz.empresa) && hz.persona !== me.id && !T.puedeVerificarArea(D, me, hz.area)) return '<div class="mensaje mal">Sin acceso a este registro.</div>';
    var ast = hz.ast ? A.porId(D.asts, hz.ast) : null, turno = ((D.config.turnos || []).filter(function (t) { return t.id === hz.turno; })[0] || {}).nombre;
    var html = '<h1>Evento ' + hz.id + '</h1>' + X().mensaje() + '<div class="tarjeta tabla"><table>' +
      [['Trabajador', hz.persona ? nombre(hz.persona) + ' · ' + h(A.porId(D.empresas, hz.empresa).nombre) : '— (condición del área)'], ['Turno, fecha y hora', h(turno || '') + ' · ' + hora(hz.en)], ['Área', h(A.porId(D.areas, hz.area).nombre)], ['Tarea y AST', ast ? h(hz.tarea || '') + ' · <a href="#/c/' + ast.id + '">' + ast.id + '</a>' : '—'],
        ['Momento', hz.fase === 'ejecucion' ? 'Durante la ejecución' : 'En la verificación previa'], ['Requisitos', hz.requisitos.map(function (q) { return h(q.nombre) + (q.cita ? ' <span class="cita">' + h(q.cita) + '</span>' : ''); }).join('<br>') || '—'],
        ['Hecho observado', h(hz.texto)], ['Detectó', nombre(hz.por)], ['Causa', hz.causa ? h(hz.causa.texto) + ' <span class="suave">(' + nombre(hz.causa.por) + ')</span>' : '<b>Pendiente de determinar</b>'],
        ['Acción correctiva', hz.correccion ? h(hz.correccion.accion) + ' · responsable ' + nombre(hz.correccion.responsable || hz.correccion.por) : '—'], ['Estado', h(ESTADO_REG[hz.estado] || hz.estado)],
        ['Verificó la corrección', hz.verificacion ? nombre(hz.verificacion.por) + ' · ' + hora(hz.verificacion.en) : '—'], ['Vinculado a', hz.vinculadoA ? '<a href="#/hz/' + hz.vinculadoA + '">' + hz.vinculadoA + '</a> (se había corregido y volvió a detectarse)' : '—']
      ].map(function (f) { return '<tr><th>' + f[0] + '</th><td>' + f[1] + '</td></tr>'; }).join('') + '</table></div>' + verFotos(hz.fotos);
    if (hz.rectificaciones.length) html += '<div class="tarjeta"><b>Rectificaciones</b>' + hz.rectificaciones.map(function (r) { return '<p class="suave">' + r.tipo + ' · ' + nombre(r.por) + ' · ' + hora(r.en).slice(5, 16) + ' · motivo: ' + h(r.motivo) + (r.campo ? ' · ' + h(r.campo) + ': «' + h(r.antes) + '» → «' + h(r.despues) + '»' : '') + '</p>'; }).join('') + '</div>';
    if (!hz.causa && T.puedeVerificarArea(D, me, hz.area)) html += '<form data-t-causa="' + hz.id + '" class="fila"><input name="causa" placeholder="Causa revisada (p. ej. no se entregó el elemento)" style="flex:1"><button>Registrar causa</button></form>';
    if (hz.persona && T.puedeVerificarArea(D, me, hz.area) && window.ASTRA_L) {
      var caps = D.aprendizaje.capsulas.filter(function (c) { return c.tipo === 'refuerzo' && window.ASTRA_L.usable(D, c, A.porId(D.personas, hz.persona)); });
      html += '<form data-t-refuerzo="' + hz.id + '" class="tarjeta"><b>Asignar cápsula de refuerzo</b> <span class="suave">(no resuelve este hallazgo)</span><div class="fila"><select name="capsula" style="flex:1">' + caps.map(function (c) { return '<option value="' + c.id + '">' + h(c.titulo) + ' · ' + c.duracion + ' s</option>'; }).join('') + '</select><button>Asignar</button></div></form>';
    }
    if (me.rol === 'prevencion' && hz.estado !== 'INVALIDADO') html += '<button class="peligro" data-t-invalidar="' + hz.id + '">Invalidar registro (con motivo)</button>';
    return html + tarjetaHallazgo(hz);
  }

  // ---------- Observación preventiva del área ----------
  function vObservacion(id) {
    var D = db(), ob = A.porId(D.obsArea, id);
    if (!ob) return '<p>Observación no encontrada.</p>';
    var area = A.porId(D.areas, ob.area);
    var html = '<h1>Observación preventiva del área</h1><p class="suave">' + h(area.nombre) + ' · ' + ob.fecha + ' · asignada a ' + nombre(ob.persona) + '</p>' + X().mensaje();
    if (ob.estado !== 'ASIGNADA') return html + '<div class="mensaje ok grande-t">Gracias. Respondida a las ' + hora(ob.respondidaEn).slice(11, 16) + (ob.hallazgo ? '. Lo que marcaste quedó como hallazgo ' + ob.hallazgo + ' para que el encargado lo revise.' : '.') + '</div>';
    if (ob.persona !== yoId()) return html + '<p class="grande-t">Esta observación le tocó a otra persona. Si ves algo inseguro, <a href="#/reportar/' + ob.area + '">repórtalo</a>.</p>';
    return html + '<div class="mensaje aviso-zona grande-t">' + h(T.ORIENTACION) + '</div><form data-t-obs="' + ob.id + '">' + T.PREGUNTAS.map(function (q) {
      return '<div class="preg"><div class="preg-t"><span><b>' + h(q.texto) + '</b></span></div><div class="sino">' +
        '<label class="op-no"><input type="radio" name="' + q.id + '" value="SI"><span>Sí<br><small>' + h(q.si) + '</small></span></label>' +
        '<label class="op-si"><input type="radio" name="' + q.id + '" value="NO"><span>No<br><small>' + h(q.no) + '</small></span></label>' +
        '<label class="op-na"><input type="radio" name="' + q.id + '" value="NPV"><span>No puedo verificar: ' + h(q.npv) + '</span></label></div></div>';
    }).join('') + '<label class="campo grande">Comentario (opcional)</label><textarea name="comentario" placeholder="Qué viste y dónde"></textarea>' +
      bloqueFotos('obs-' + ob.id, [['general', 'Vista general'], ['condicion', 'Condición concreta']]) + '<button class="primario enorme">Enviar observación</button></form>';
  }
  function vReportar(areaId) {
    var D = db(), area = A.porId(D.areas, areaId);
    if (!area) return '<p>Área no encontrada.</p>';
    var asts = D.asts.filter(function (x) { return x.modo === 'cuadrilla' && x.area === areaId && ['CERRADA', 'ANULADA'].indexOf(x.estado) < 0 && x.ficha; });
    return '<h1>Reportar condición insegura</h1><p class="suave">' + h(area.nombre) + ' · cualquiera puede reportar, le haya tocado o no la observación.</p>' + X().mensaje() + AVISO_PARAR +
      '<form data-t-reportar="' + areaId + '"><label class="campo grande">¿Qué ves?</label><textarea name="texto" class="grande" placeholder="Ej.: extensión cruzando el pasillo"></textarea>' +
      (asts.length ? '<label class="campo">¿Está relacionado con un trabajo? (opcional)</label><select name="ast"><option value="">No / no sé</option>' + asts.map(function (x) { return '<option value="' + x.id + '">' + h(x.nombre) + '</option>'; }).join('') + '</select>' : '') +
      bloqueFotos('rep-' + areaId, [['condicion', 'Condición concreta'], ['general', 'Vista general']]) + '<button class="primario enorme">Enviar reporte</button></form>';
  }

  // ---------- Botones del centro del área y del inicio ----------
  function botonesArea(a) {
    var D = db(), mia = D.obsArea.filter(function (o) { return o.area === a.id && o.persona === yoId() && o.estado === 'ASIGNADA'; })[0];
    return (mia ? '<a class="boton-grande destacado" href="#/obs/' + mia.id + '"><span>👁 Observación preventiva del área</span><small>Te tocó hoy · 4 preguntas sobre lo que ves</small></a>' : '') +
      '<a class="boton-grande" href="#/reportar/' + a.id + '"><span>⚠️ Reportar condición insegura</span><small>Cualquiera puede reportar</small></a>';
  }
  function tarjetaInicio() {
    var l = T.observacionDe(db(), yoId());
    return l.map(function (o) { return '<a class="boton-grande destacado" href="#/obs/' + o.id + '"><span>👁 Te tocó la observación preventiva de ' + h(A.porId(db().areas, o.area).nombre) + '</span><small>4 preguntas sobre lo que puedes ver, sin acercarte a nada peligroso</small></a>'; }).join('');
  }
  // Para la pantalla del trabajador: estado de verificación de lo crítico y su hallazgo, sin juicio
  function bloqueTrabajador(ast, personaId) {
    var D = db(), i = C.integrante(ast, personaId);
    if (!i || !i.verif) return '';
    var crit = C.requisitosPersona(D, ast).filter(function (r) { return r.critico && i.verif[r.id]; });
    var hz = i.bloqueoHallazgo ? A.porId(D.hallazgos, i.bloqueoHallazgo) : null;
    return (crit.length ? '<div class="tarjeta"><b>Verificación en terreno de lo crítico</b>' + crit.map(function (r) { return '<div class="mini-ast"><span>' + h(r.nombre) + '</span>' + chipV(i.verif[r.id].estado) + '</div>'; }).join('') + '<p class="suave">Lo verifica en persona el encargado del área o un supervisor capacitado.</p></div>' : '') +
      (hz ? tarjetaHallazgo(hz) : '');
  }
  // Panel de control: terreno por área (sin rankings de personas)
  function seccionControl(zona) {
    var D = db(), areas = D.areas.filter(function (a) { return !zona || a.zona === zona; }), fecha = A.ahora(D).slice(0, 10), me = yo();
    var html = '<h2>Terreno</h2><div class="fila"><button class="primario" data-t-asignar>Asignar observaciones preventivas de hoy</button><span class="suave">Una por área activa, al azar entre quienes aún no participan.</span></div>';
    html += '<div class="tarjeta tabla"><table><tr><th>Área</th><th>Verificaciones pendientes</th><th>Hallazgos abiertos</th><th>Observación de hoy</th></tr>' + areas.map(function (a) {
      var asts = D.asts.filter(function (x) { return x.modo === 'cuadrilla' && x.area === a.id && x.ficha; });
      var pv = asts.reduce(function (n, x) { return n + T.pendientesVerificacion(D, x).length; }, 0);
      var ha = D.hallazgos.filter(function (x) { return x.area === a.id && x.estado !== 'CORREGIDO_VERIFICADO'; }).length;
      var ob = D.obsArea.filter(function (o) { return o.area === a.id && o.fecha === fecha; })[0];
      return '<tr><td>' + h(a.nombre) + '</td><td>' + (pv || '—') + '</td><td>' + (ha ? '<span class="chip mal">' + ha + '</span>' : '—') + '</td><td>' + (ob ? (ob.estado === 'RESPONDIDA' ? '<span class="chip ok">respondida</span>' + (ob.hallazgo ? ' → ' + ob.hallazgo : '') : '<span class="chip aviso">asignada</span>') : '—') + '</td></tr>';
    }).join('') + '</table><p class="suave">Se muestran por área, no por persona: los reportes preventivos no son un ranking.</p></div>';
    var abiertos = D.hallazgos.filter(function (x) { return x.estado !== 'CORREGIDO_VERIFICADO' && (!zona || A.porId(D.areas, x.area).zona === zona); });
    if (abiertos.length) html += '<h3>Hallazgos por resolver</h3>' + abiertos.map(tarjetaHallazgo).join('');
    if (me.rol === 'prevencion') {
      var rh = D.hallazgos.filter(function (x) { return x.revisionHumana && x.revisionHumana.estado === 'PENDIENTE'; });
      if (rh.length) html += '<h3>Revisión humana pendiente (solo Prevención)</h3>' + rh.map(function (x) { return '<div class="mini-ast"><span>' + x.id + ' · ' + h(x.revisionHumana.motivo) + '</span><span class="suave">sin sanción automática</span></div>'; }).join('');
    }
    return html;
  }

  function ruta(partes) {
    if (partes[1] === 'v') return vVerificar(partes[2], partes[3], partes[4]);
    if (partes[1] === 'obs') return vObservacion(partes[2]);
    if (partes[1] === 'reportar') return vReportar(partes[2]);
    if (partes[1] === 've') return vChequeo(partes[2]);
    if (partes[1] === 'informe') return vInforme();
    if (partes[1] === 'hz') return vEvento(partes[2]);
    return null;
  }

  // ---------- Eventos ----------
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-t-csv],[data-t-foto-quitar],[data-t-asignar],[data-t-camara],[data-t-disparar],[data-t-cerrar-camara],[data-t-invalidar]'); if (!b) return;
    e.preventDefault();
    if (b.dataset.tCamara) { var sel = document.querySelector('[data-t-foto-tipo="' + b.dataset.tCamara + '"]'); abrirCamara(b.dataset.tCamara, sel ? sel.value : 'condicion'); return; }
    if (b.hasAttribute('data-t-disparar')) { disparar(); return; }
    if (b.hasAttribute('data-t-cerrar-camara')) { cerrarCamara(); return; }
    if (b.dataset.tInvalidar) { var m = prompt('Motivo para invalidar este registro (dejará de contar como incumplimiento válido):'); if (m) { act('T_INVALIDAR', null, { hallazgo: b.dataset.tInvalidar, motivo: m }, 'Registro invalidado, con su motivo.'); X().render(); } return; }
    if (b.dataset.tFotoQuitar) { fotos[b.dataset.tFotoQuitar].splice(+b.dataset.i, 1); conservarYRender(); return; }
    if (b.hasAttribute('data-t-csv')) {
      var D1 = db(), rs = T.registros(D1, yoId(), filtros);
      var csv = 'id;clase;trabajador;empresa;turno;fecha;area;tarea;ast;requisitos;detecto;causa;accion;estado;verifico;valido\n' + rs.map(function (r) { return [r.id, r.clase, A.nombre(D1, r.persona), A.porId(D1.empresas, r.empresa).nombre, r.turno, r.en, A.porId(D1.areas, r.area).nombre, r.tarea || '', r.ast || '', r.requisitos.map(function (q) { return q.nombre; }).join(' + '), A.nombre(D1, r.por), r.causa ? r.causa.texto : 'Pendiente de determinar', r.correccion ? (r.correccion.accion || r.correccion.texto || '') : '', r.estado, r.verificacion ? A.nombre(D1, r.verificacion.por) : '', r.valido ? 'sí' : 'no'].map(function (x) { return String(x).replace(/;/g, ','); }).join(';'); }).join('\n');
      var u = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), el = document.createElement('a'); el.href = u; el.download = 'astra-incumplimientos.csv'; el.click(); setTimeout(function () { URL.revokeObjectURL(u); }, 1000); return;
    }
    if (b.hasAttribute('data-t-asignar')) {
      var r = act('T_ASIGNAR_OBSERVACIONES', null, {}, 'Observaciones asignadas.');
      if (r.ok) X().setMsg({ ok: true, texto: r.creadas.length ? 'Asignadas: ' + r.creadas.map(function (o) { return A.porId(db().areas, o.area).nombre + ' → ' + A.nombre(db(), o.persona); }).join(' · ') : 'Hoy ya están asignadas o no hay áreas activas con trabajadores.' });
      X().render();
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, ds = f.dataset;
    if (!Object.keys(ds).some(function (k) { return /^t[A-Z]/.test(k); })) return;
    e.preventDefault();
    var fd = new FormData(f), val = function (k) { return (fd.get(k) || '').toString().trim(); }, si = function (k) { return fd.get(k) === 'on'; };
    var tomar = function (clave) { var l = fotos[clave] || []; delete fotos[clave]; return l; };
    if (ds.tChequeo) {
      var D0 = db(), astC = A.porId(D0.asts, ds.tChequeo), apC = astC.aprobaciones.filter(function (a) { return a.calidad === 'encargado_area' && a.modo === 'presencial'; })[0];
      var resC = {}, perC = {}; apC.chequeo.forEach(function (it) { if (fd.get(it.id)) resC[it.id] = fd.get(it.id); var l = fd.getAll('per:' + it.id); if (l.length) perC[it.id] = l; });
      var rc = act('T_VERIFICAR_ENCARGADO', ds.tChequeo, { presencial: si('presencial'), resultados: resC, personas: perC, observaciones: val('observaciones') || null, fotos: tomar('chq-' + ds.tChequeo) }, 'Verificación registrada.');
      if (rc.ok) X().setMsg(rc.evento.datos.resultado === 'INCUMPLIMIENTO' ? { ok: false, texto: 'Incumplimiento obligatorio registrado. La AST sigue bloqueada hasta corregir y verificar de nuevo. Se avisó a Prevención.' } : { ok: true, texto: rc.evento.datos.estado });
      return X().render();
    }
    if (ds.tFiltros !== undefined && f.hasAttribute('data-t-filtros')) { filtros = {}; ['turno', 'area', 'empresa', 'tipo', 'clase', 'desde', 'hasta'].forEach(function (k) { if (val(k)) filtros[k] = val(k); }); return X().render(); }
    if (ds.tCausa) { act('T_CAUSA', null, { hallazgo: ds.tCausa, causa: val('causa') }, 'Causa registrada.'); return X().render(); }
    if (ds.tRefuerzo) { var hzR = A.porId(db().hallazgos, ds.tRefuerzo), rr = window.ASTRA_L.aplicar(db(), { tipo: 'L_ASIGNAR_REFUERZO', actor: yoId(), datos: { persona: hzR.persona, capsula: val('capsula'), hallazgo: hzR.id } }); X().setMsg(rr.ok ? { ok: true, texto: 'Cápsula de refuerzo asignada' + (rr.asignacion.adicional ? ' (contenido adicional: supera lo contratado)' : '') + '. El hallazgo sigue su propio curso.' } : { ok: false, texto: rr.motivo }); X().guardar(); return X().render(); }
    if (ds.tVerificar) {
      act('T_VERIFICAR', ds.tVerificar, { persona: ds.persona, req: ds.req, presencial: si('presencial'), resultado: 'CUMPLE', checks: { dispone: si('dispone'), condiciones: si('condiciones'), sabeUsar: si('sabeUsar') } }, 'Verificado en terreno.');
      return X().render();
    }
    if (ds.tDiferencia) {
      var r = act('T_VERIFICAR', ds.tDiferencia, { persona: ds.persona, req: ds.req, presencial: si('presencial'), resultado: 'DIFERENCIA', texto: val('texto'), alcanceArea: si('area'), fotos: tomar('dif-' + ds.tDiferencia + ds.persona + ds.req) }, 'Hallazgo registrado. Participación bloqueada. Se avisó al encargado del área y a Prevención.');
      if (r.ok) { location.hash = '#/c/' + ds.tDiferencia; return; } return X().render();
    }
    if (ds.tCorregir) { act('T_CORREGIR', null, { hallazgo: ds.tCorregir, causa: val('causa'), accion: val('accion'), fotos: tomar('cor-' + ds.tCorregir) }, 'Corrección registrada. Falta verificarla en terreno.'); return X().render(); }
    if (ds.tVercorr) { act('T_VERIFICAR_CORRECCION', null, { hallazgo: ds.tVercorr, presencial: si('presencial') }, 'Corrección verificada. Si la AST está detenida, la reanuda el responsable.'); return X().render(); }
    if (ds.tAmpliar) { act('T_AMPLIAR_DETENCION', null, { area: ds.tAmpliar, motivo: val('motivo'), hallazgo: ds.hz }, 'Detención ampliada a todas las AST del área. Actúa en terreno: el aviso no detiene las máquinas.'); return X().render(); }
    if (ds.tExplicar) { act('T_EXPLICACION', null, { hallazgo: ds.tExplicar, texto: val('texto') }, 'Tu explicación quedó registrada.'); return X().render(); }
    if (ds.tDerivar) { act('T_DERIVAR', null, { hallazgo: ds.tDerivar, motivo: val('motivo') }, 'Derivado a revisión humana. La app no aplica sanciones.'); return X().render(); }
    if (ds.tObs) {
      var resp = {}; T.PREGUNTAS.forEach(function (q) { if (fd.get(q.id)) resp[q.id] = fd.get(q.id); });
      act('T_RESPONDER_OBSERVACION', null, { obs: ds.tObs, respuestas: resp, comentario: val('comentario') || null, fotos: tomar('obs-' + ds.tObs) }, 'Observación enviada. Gracias.');
      return X().render();
    }
    if (ds.tReportar) { var r2 = act('T_REPORTAR', val('ast') || null, { area: ds.tReportar, ast: val('ast') || null, texto: val('texto'), fotos: tomar('rep-' + ds.tReportar) }, 'Reporte enviado al encargado del área y a Prevención.'); return X().render(); }
  });

  window.ASTRA_VT = { cerrarCamara: cerrarCamara, ruta: ruta, seccionAst: seccionAst, botonesArea: botonesArea, tarjetaInicio: tarjetaInicio, bloqueTrabajador: bloqueTrabajador, seccionControl: seccionControl, tarjetaHallazgo: tarjetaHallazgo };
})();
