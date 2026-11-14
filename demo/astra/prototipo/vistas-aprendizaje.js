// ASTRA · pantallas del servicio de cápsulas (D-035) y de la ficha del trabajador (D-035 §8).
// La lógica está en aprendizaje.js. El avance de aprendizaje y los incumplimientos se muestran siempre por separado.
(function () {
  'use strict';
  var A = window.ASTRA, C = window.ASTRA_C, T = window.ASTRA_T, L = window.ASTRA_L;
  var X = function () { return window.ASTRA_APP; };
  var db = function () { return L.preparar(T.preparar(X().db)); }, yoId = function () { return X().persona; }, yo = function () { return A.porId(db().personas, yoId()); };
  var h = function (t) { return X().h(t); }, chip = function (e) { return X().chip(e); }, hora = function (i) { return X().hora(i); };
  var reproductor = null; // { capsula, asignacion, parte, inicio, acumulado, timer }
  var SEGURO = '<div class="mensaje aviso-zona">📵 Mira las cápsulas en un momento y lugar seguros: nunca mientras operas una herramienta, conduces o haces una tarea que requiera atención.</div>';

  function min(s) { return (Math.round(s / 6) / 10).toString().replace('.', ','); }
  // Registra el día efectivo de trabajo una vez por día (al identificarse o escanear el QR)
  function ingresoDelDia() {
    var D = db(), p = yo(); if (!p || !(p.rut || p.codigo)) return;
    var ct = D.aprendizaje.contratos[p.empresa]; if (!ct || !ct.activo) return;
    var c = L.prog(D, p.id).ciclos.slice(-1)[0], hoy = A.ahora(D).slice(0, 10);
    if (c && c.dias.indexOf(hoy) >= 0) return;
    L.aplicar(D, { tipo: 'L_INGRESO', actor: p.id, datos: {} }); X().guardar();
  }
  function tarjeta() {
    var D = db(), p = yo(); if (!p) return '';
    ingresoDelDia();
    var sig = L.siguiente(D, p.id), av = L.avance(D, p.id);
    if (!av) return '';
    return sig ? '<a class="boton-grande destacado" href="#/cap/' + sig.id + '"><span>🎓 Tienes una cápsula: «' + h(L.capsula(D, sig.capsula).titulo) + '»</span><small>' + L.capsula(D, sig.capsula).duracion + ' segundos · ' + (sig.motivo === 'refuerzo' ? 'refuerzo' + (sig.adicional ? ' (adicional)' : '') : av.completadas + ' de ' + av.total + ' del ciclo') + ' · mírala en un lugar seguro</small></a>'
      : '<p class="suave">🎓 ' + h(L.textoAvance(av)) + '</p>';
  }

  // ---------- Reproductor: partes una a una, sin adelantar; pregunta al final (criterio D-035) ----------
  function vCapsula(asigId) {
    var D = db(), p = yo(), c, asig = null;
    var cic = L.prog(D, p.id).ciclos.slice(-1)[0];
    if (asigId.indexOf('AS-') === 0) { asig = cic && cic.asignaciones.filter(function (x) { return x.id === asigId; })[0]; c = asig && L.capsula(D, asig.capsula); }
    else c = L.capsula(D, asigId); // inducción o capacitación (fuera de los minutos contratados)
    if (!c) return '<p>Cápsula no encontrada.</p>';
    if (!reproductor || reproductor.capsula !== c.id || reproductor.asig !== (asig && asig.id)) reproductor = { capsula: c.id, asig: asig && asig.id, parte: 0, inicio: Date.now(), acumulado: 0 };
    var r = reproductor, porParte = Math.ceil(c.duracion / c.partes.length), transcurrido = (Date.now() - r.inicio) / 1000;
    var html = '<h1>' + h(c.titulo) + '</h1><p class="suave">' + h(L.TIPO_TXT[c.tipo]) + ' · ' + c.duracion + ' s · ' + h(c.procedimiento) + ' · versión ' + h(c.version) + '</p>' + X().mensaje() + SEGURO;
    if (asig && asig.completada) html += '<div class="mensaje ok">Ya la completaste. Puedes repasarla; no suma minutos nuevos.</div>';
    if (r.parte < c.partes.length) {
      return html + '<div class="capsula-parte"><div class="paso">' + (r.parte + 1) + ' / ' + c.partes.length + '</div><p>' + h(c.partes[r.parte]) + '</p></div>' +
        '<button class="enorme" data-l-voz>🔊 Escuchar</button><button class="primario enorme" data-l-siguiente data-espera="' + porParte + '">Siguiente</button><p class="suave" id="l-espera"></p>';
    }
    var tiempoOk = (Date.now() - r.inicio) / 1000 >= c.duracion;
    html += '<div class="tarjeta"><b>Terminaste las ' + c.partes.length + ' partes.</b>' + (tiempoOk ? '' : ' <span class="suave">Espera unos segundos más para completar la duración.</span>') + '</div>';
    html += '<form data-l-completar="' + c.id + '"' + (asig ? ' data-asig="' + asig.id + '"' : '') + '>' +
      (c.pregunta ? '<div class="preg"><div class="preg-t"><b>' + h(c.pregunta.texto) + '</b></div><div class="sino">' + c.pregunta.opciones.map(function (o, i) { return '<label class="op-si"><input type="radio" name="resp" value="' + i + '"><span>' + h(o) + '</span></label>'; }).join('') + '</div></div>' : '') +
      '<button class="primario enorme">Terminar cápsula</button></form><p class="suave">Completar una cápsula no demuestra por sí solo la competencia práctica para una tarea.</p>';
    return html;
  }

  // ---------- Ficha del trabajador: cuatro apartados separados, sin nota única (D-035 §8) ----------
  function vFicha(pid) {
    var D = db(), me = yo(), p = A.porId(D.personas, pid || yoId());
    if (!p) return '<p>Persona no encontrada.</p>';
    var propia = p.id === me.id, autorizado = D.asignaciones.some(function (a) { return a.persona === me.id && a.permisos.indexOf('ver_historial') >= 0; });
    if (!propia && !autorizado && A.MANDO.indexOf(me.rol) < 0 && me.rol !== 'prevencion') return '<div class="mensaje mal">Sin acceso a esta ficha.</div>';
    var av = L.avance(D, p.id), pr = L.prog(D, p.id), html = '<h1>Ficha de ' + h(p.nombre) + '</h1><p class="suave">' + h(p.cargo) + ' · ' + h(A.porId(D.empresas, p.empresa).nombre) + ' · ' + h(X().ident(p)) + '</p>' + X().mensaje();
    html += '<div class="mensaje aviso-zona">Cada apartado se mira por separado: terminar las cápsulas no compensa un incumplimiento de seguridad.</div>';
    // 1. Aprendizaje
    html += '<h2>🎓 Aprendizaje</h2><div class="tarjeta">' + (av ? h(L.textoAvance(av)) + (av.refuerzos.length ? '<br>Refuerzos asignados: ' + av.refuerzos.length + ' (' + av.refuerzosPendientes.length + ' pendientes' + (av.adicionales ? ', ' + av.adicionales + ' como contenido adicional' : '') + ')' : '') +
      '<ul>' + av.disponibles.concat(av.refuerzosPendientes).map(function (x) { return '<li>' + h(L.capsula(D, x.capsula).titulo) + (propia ? ' · <a href="#/cap/' + x.id + '">ver</a>' : '') + '</li>'; }).join('') + '</ul>' : 'Sin ciclo de aprendizaje (servicio no contratado o aún sin ingreso).') + '</div>';
    // 2. Inducciones y capacitaciones
    var hab = A.resumenHabilitacion(D, p), comps = Object.keys(p.comp || {}).map(function (k) { return [p.comp[k].nombre, C.compVigente(D, p, k), p.comp[k].vence]; });
    var inds = D.aprendizaje.capsulas.filter(function (c) { return c.tipo === 'induccion'; }), caps = D.aprendizaje.capsulas.filter(function (c) { return c.tipo === 'capacitacion_practica'; });
    html += '<h2>📋 Inducciones y capacitaciones</h2><div class="tarjeta">' +
      '<div class="mini-ast"><span>Inducción de la empresa</span>' + chip(hab.induccion) + '</div>' +
      inds.map(function (c) { var hecho = pr.inducciones[c.id]; return '<div class="mini-ast"><span>' + h(c.titulo) + '</span><span>' + (hecho ? chip('VIGENTE') + ' <span class="suave">' + hora(hecho.en).slice(0, 10) + '</span>' : chip('PENDIENTE') + (propia ? ' <a href="#/cap/' + c.id + '">hacer</a>' : '')) + '</span></div>'; }).join('') +
      caps.map(function (c) { var x = pr.practicas[c.id] || {}; return '<div class="mini-ast"><span>' + h(c.titulo) + '</span><span>' + (x.teoria ? 'teoría ✔ · ' : (propia ? '<a href="#/cap/' + c.id + '">teoría</a> · ' : 'teoría pendiente · ')) + (x.practica ? 'práctica ' + chip(x.practica.resultado === 'APROBADA' ? 'VIGENTE' : 'NO_CUMPLE') : x.teoria && !propia ? '<button data-l-practica="' + p.id + '" data-cap="' + c.id + '">Registrar evaluación práctica</button>' : 'práctica pendiente') + '</span></div>'; }).join('') +
      comps.map(function (c) { return '<div class="mini-ast"><span>' + h(c[0]) + '</span>' + chip(c[1] ? 'VIGENTE' : 'VENCIDA') + '</div>'; }).join('') +
      D.aprendizaje.capsulas.filter(function (c) { return c.tipo === 'acreditacion'; }).map(function (c) { var x = (pr.acreditaciones || {})[c.id], hoy = A.ahora(D).slice(0, 10); return '<div class="mini-ast"><span>' + h(c.titulo) + ' <span class="suave">(acreditación)</span></span><span>' + (x ? chip(x.vence >= hoy ? 'VIGENTE' : 'VENCIDA') + ' <span class="suave">' + h(x.entidad) + ' · vence ' + x.vence + '</span>' : chip('PENDIENTE')) + (me.rol === 'prevencion' && !propia ? ' <button data-l-acreditar="' + p.id + '" data-cap="' + c.id + '">Registrar</button>' : '') + '</span></div>'; }).join('') +
      '<p class="suave">Ver una cápsula no acredita: la acreditación la registra Prevención con la entidad y la fecha del curso.</p></div>';
    // 3. AST
    var asts = D.asts.filter(function (a) { return a.modo === 'cuadrilla' && a.integrantes.some(function (i) { return i.persona === p.id; }); });
    html += '<h2>🦺 AST</h2><div class="tarjeta">' + (asts.length ? asts.map(function (a) { var i = C.integrante(a, p.id); return '<div class="mini-ast"><span><a href="#/c/' + a.id + '">' + a.id + '</a> · ' + h(a.nombre) + '</span><span class="suave">' + h(i.estado.toLowerCase().replace(/_/g, ' ')) + ' · ' + h(C.estadoTexto(D, a) || a.estado) + '</span></div>'; }).join('') : '<span class="suave">Sin participaciones.</span>') + '</div>';
    // Jornada de hoy (D-038): actividad declarada en la app, no ubicación
    var N = window.ASTRA_N;
    if (N) {
      var ep = N.estadoPersona(D, p.id, N.local(A.ahora(D)).fecha), EV = { INCORPORACION: 'se incorporó', PAUSA: 'pausó', FINALIZACION: 'finalizó', REANUDACION: 'volvió' }, marcas = [];
      ep.participaciones.forEach(function (x) { x.historial.forEach(function (ev) { marcas.push({ en: ev.en, txt: EV[ev.evento] + ' · ' + x.ast + ' ' + (x.astNombre || '') + ' · ' + A.porId(D.areas, x.area).nombre + (ev.cambios ? ' (con cambios: volvió a responder y firmar)' : '') }); }); });
      marcas.sort(function (a, b) { return a.en < b.en ? -1 : 1; });
      html += '<h2>🕒 Jornada de hoy</h2><div class="tarjeta">' + (marcas.length ? marcas.map(function (m) { return '<div class="mini-ast"><span><b>' + hora(m.en).slice(11, 16) + '</b> ' + h(m.txt) + '</span></div>'; }).join('') +
        '<p class="suave">Ahora: ' + h(N.ESTADO_TXT[ep.estado]) + (ep.ast ? ' (' + ep.ast + ')' : '') + '. Es la actividad declarada en ASTRA, no un seguimiento de ubicación.</p>' : '<span class="suave">Sin actividad registrada hoy.</span>') + '</div>';
    }
    // 4. Observaciones preventivas (solo autorizados o la propia persona)
    var regs = T.registros(D, me.id, { persona: p.id }), validos = regs.filter(function (r) { return r.valido && r.clase === 'OBSERVADO'; });
    var corr = validos.filter(function (r) { return r.estado === 'CORREGIDO_VERIFICADO'; }).length;
    html += '<h2>👁 Observaciones preventivas</h2><div class="tarjeta">' + (propia || autorizado ? (validos.length + ' evento' + (validos.length === 1 ? '' : 's') + '; ' + corr + ' corregido' + (corr === 1 ? '' : 's') + ' y ' + (validos.length - corr) + ' pendiente' + (validos.length - corr === 1 ? '' : 's') + '.' +
      regs.map(function (r) { return '<div class="mini-ast"><span>' + (r.hallazgo ? '<a href="#/hz/' + r.id + '">' + r.id + '</a>' : r.id) + ' · ' + h(r.requisitos.map(function (q) { return q.nombre; }).join(', ')) + '</span><span class="suave">' + (r.clase === 'DECLARADO' ? 'faltante declarado' : 'observado') + ' · ' + h(r.estado.toLowerCase().replace(/_/g, ' ')) + '</span></div>'; }).join('')) : '<span class="suave">Solo lo ven roles autorizados.</span>') + '</div>';
    return html;
  }

  // ---------- Seguimiento de la empresa: por trabajador, cuadrilla, área y ciclo (D-035 §10) ----------
  function vPanel() {
    var D = db(), me = yo();
    if (A.NIVEL[me.rol] !== 'elevado') return '<div class="mensaje mal">El seguimiento del aprendizaje es para responsables.</div>';
    var trabajadores = D.personas.filter(function (p) { return (p.rut || p.codigo) && A.NIVEL[p.rol] === 'base' && D.aprendizaje.progreso[p.id]; });
    var html = '<h1>Aprendizaje</h1>' + X().mensaje() + '<p class="suave">Avance de cápsulas, separado del seguimiento de incumplimientos. Un trabajador con cápsulas pendientes no queda bloqueado para trabajar.</p>';
    html += '<a class="tarjeta enlace" href="#/capsulas"><b>📚 Biblioteca de cápsulas</b><br><span class="suave">' + D.aprendizaje.capsulas.filter(function (c) { return c.estado === 'PUBLICADA'; }).length + ' publicadas · ' + D.aprendizaje.capsulas.filter(function (c) { return c.estado !== 'PUBLICADA' && c.estado !== 'RETIRADA'; }).length + ' sin publicar (en revisión o con contradicción)</span></a>';
    html += '<h2>Contratos</h2><div class="tarjeta">' + D.empresas.map(function (e) {
      var ct = D.aprendizaje.contratos[e.id];
      return '<div class="mini-ast"><span>' + h(e.nombre) + '</span><span>' + (ct && ct.activo ? ct.minutos + ' min por trabajador cada ' + ct.diasCiclo + ' días de trabajo' : 'sin servicio') + '</span></div>';
    }).join('') + (me.rol === 'prevencion' ? '<form data-l-contrato class="fila" style="margin-top:8px"><select name="empresa">' + D.empresas.map(function (e) { return '<option value="' + e.id + '">' + h(e.nombre) + '</option>'; }).join('') + '</select><input name="minutos" type="number" min="1" placeholder="Minutos" style="width:110px"><input name="dias" type="number" min="1" value="14" style="width:90px"><button>Guardar contrato</button></form>' : '') + '</div>';
    html += '<h2>Por trabajador</h2><div class="tarjeta tabla"><table><tr><th>Trabajador</th><th>Ciclo</th><th>Cápsulas</th><th>Minutos</th><th>Refuerzos pendientes</th></tr>' + trabajadores.map(function (p) {
      var av = L.avance(D, p.id); if (!av) return '';
      return '<tr><td><a href="#/ficha/' + p.id + '">' + h(p.nombre) + '</a><br><span class="suave">' + h(p.cargo) + '</span></td><td>' + av.ciclo + ' · día ' + av.dia + '/' + av.diasCiclo + '</td><td>' + av.completadas + ' de ' + av.total + '</td><td>' + min(av.segundos) + ' de ' + min(av.presupuesto) + '</td><td>' + (av.refuerzosPendientes.length || '—') + '</td></tr>';
    }).join('') + '</table></div>';
    var grupo = function (titulo, grupos) {
      return '<h2>' + titulo + '</h2><div class="tarjeta">' + grupos.map(function (g) {
        var avs = g.personas.map(function (pid) { return L.avance(D, pid); }).filter(Boolean);
        if (!avs.length) return '';
        var comp = avs.reduce(function (n, a) { return n + a.completadas; }, 0), tot = avs.reduce(function (n, a) { return n + a.total; }, 0);
        return '<div class="mini-ast"><span>' + g.nombre + '</span><span>' + avs.length + ' persona(s) · ' + comp + ' de ' + tot + ' cápsulas</span></div>';
      }).join('') + '</div>';
    };
    var cuadrillas = D.asts.filter(function (a) { return a.modo === 'cuadrilla' && a.ficha && ['CERRADA', 'ANULADA'].indexOf(a.estado) < 0; }).map(function (a) { return { nombre: '<a href="#/c/' + a.id + '">' + a.id + '</a> ' + h(a.nombre), personas: a.integrantes.map(function (i) { return i.persona; }) }; });
    html += grupo('Por cuadrilla (AST abiertas)', cuadrillas);
    html += grupo('Por área', D.areas.map(function (ar) { var ps = []; D.asts.filter(function (a) { return a.modo === 'cuadrilla' && a.area === ar.id; }).forEach(function (a) { a.integrantes.forEach(function (i) { if (ps.indexOf(i.persona) < 0) ps.push(i.persona); }); }); return { nombre: h(ar.nombre), personas: ps }; }));
    return html;
  }

  // ---------- Biblioteca de cápsulas: fuentes, versión, revisión competente (D-039) ----------
  function vBibliotecaCap() {
    var D = db(), me = yo(), revisor = D.aprendizaje.revisores.indexOf(me.id) >= 0;
    if (A.NIVEL[me.rol] !== 'elevado') return '<div class="mensaje mal">La biblioteca de cápsulas es para responsables.</div>';
    var CH = { PUBLICADA: 'ok', EN_REVISION: 'aviso', REVISION_POR_CAMBIO: 'aviso', CONTRADICCION: 'mal', RETIRADA: '' };
    var html = '<h1>Biblioteca de cápsulas</h1>' + X().mensaje() + '<p class="suave">Solo se asigna lo <b>publicado</b> tras la revisión competente. Contenido común para todos; contenido específico por cargo, función, área o tarea. Una cápsula no reemplaza capacitaciones prácticas ni acreditaciones.</p>' +
      (revisor ? '' : '<p class="suave">Publica, retira o marca contradicciones el responsable competente: ' + D.aprendizaje.revisores.map(function (x) { return h(A.nombre(D, x)); }).join(', ') + '.</p>');
    ['CONTRADICCION', 'REVISION_POR_CAMBIO', 'EN_REVISION', 'PUBLICADA', 'RETIRADA'].forEach(function (e) {
      var l = D.aprendizaje.capsulas.filter(function (c) { return c.estado === e; }); if (!l.length) return;
      html += '<h2>' + h(L.ESTADO_CAP[e]) + ' (' + l.length + ')</h2>' + l.map(function (c) {
        var alc = c.comun ? 'Común a todos' : [].concat(c.cargos.map(function (x) { return 'cargo ' + x; }), (c.funciones || []).map(function (x) { return 'función ' + x; }), (c.roles || []).map(function (x) { return 'rol ' + x; }), c.fichas.map(function (x) { return 'tarea ' + x; })).join(', ') || 'General';
        return '<div class="tarjeta"><div class="fila" style="justify-content:space-between"><b>' + c.id + ' · ' + h(c.titulo) + '</b><span class="chip ' + CH[c.estado] + '">' + h(L.ESTADO_CAP[c.estado]) + '</span></div>' +
          '<span class="suave">' + h(L.TIPO_TXT[c.tipo]) + ' · ' + h(alc) + ' · versión ' + h(c.version) + ' · revisión ' + h(c.fechaRevision || '—') + (c.revisadaPor ? ' por ' + h(A.nombre(D, c.revisadaPor)) : '') + '</span>' +
          '<ul>' + c.fuentes.map(function (f) { return '<li>' + h(L.FUENTE_TXT[f.tipo] || f.tipo) + ': ' + h(f.ref ? f.ref + ' · ' : '') + h(f.titulo || '') + (f.version ? ' v' + h(f.version) : '') + (f.condicionesUso ? ' <span class="suave">(' + h(f.condicionesUso) + ')</span>' : '') + '</li>'; }).join('') + '</ul>' +
          (c.contradiccion ? '<div class="mensaje mal">' + h(c.contradiccion) + '</div>' : '') +
          (revisor ? '<form data-l-revisar="' + c.id + '" class="fila"><select name="accion">' + (c.estado !== 'PUBLICADA' ? '<option value="PUBLICAR">Publicar (revisé fuentes y contenido)</option>' : '') + '<option value="CONTRADICCION">Marcar contradicción entre fuentes</option>' + (c.estado !== 'RETIRADA' ? '<option value="RETIRAR">Retirar</option>' : '') + '</select><input name="nota" placeholder="' + (c.estado === 'CONTRADICCION' ? 'Cómo se resolvió (obligatorio para publicar)' : 'Nota') + '" style="flex:1"><button>Guardar</button></form>' : '') + '</div>';
      }).join('');
    });
    return html;
  }

  function ruta(partes) {
    if (partes[1] === 'capsulas') return vBibliotecaCap();
    if (partes[1] === 'cap') return vCapsula(partes[2]);
    if (partes[1] === 'ficha') return vFicha(partes[2]);
    if (partes[1] === 'aprendizaje') return vPanel();
    return null;
  }

  function hablar(t) { try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(t); u.lang = 'es-CL'; speechSynthesis.speak(u); } catch (e) { /* sin voz */ } }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-l-siguiente],[data-l-voz],[data-l-practica],[data-l-acreditar]'); if (!b) return;
    e.preventDefault();
    var r = reproductor;
    if (b.hasAttribute('data-l-voz') && r) { hablar(L.capsula(db(), r.capsula).partes[r.parte]); return; }
    if (b.hasAttribute('data-l-siguiente') && r) {
      // Sin adelantar: cada parte exige su tiempo mínimo
      var minimo = +b.dataset.espera, desdeParte = (Date.now() - (r.marcaParte || r.inicio)) / 1000;
      if (desdeParte < minimo) { var el = document.getElementById('l-espera'); if (el) el.textContent = 'Lee con calma: faltan ' + Math.ceil(minimo - desdeParte) + ' s para seguir.'; return; }
      r.parte++; r.marcaParte = Date.now(); X().render(); return;
    }
    if (b.dataset.lAcreditar) {
      var ent = prompt('Entidad que dictó el curso (p. ej. organismo administrador)'); if (!ent) return;
      var fe = prompt('Fecha del curso (AAAA-MM-DD)', A.ahora(db()).slice(0, 10)); if (!fe) return;
      var ra = L.aplicar(db(), { tipo: 'L_ACREDITAR', actor: yoId(), datos: { persona: b.dataset.lAcreditar, capsula: b.dataset.cap, entidad: ent, fecha: fe } });
      X().setMsg(ra.ok ? { ok: true, texto: 'Acreditación registrada, vence ' + ra.evento.datos.vence + '.' } : { ok: false, texto: ra.motivo }); X().guardar(); X().render(); return;
    }
    if (b.dataset.lPractica) {
      var ok = confirm('¿La evaluación práctica fue presencial y la persona demostró la operación segura? Aceptar = aprobada, Cancelar = no registrar.');
      if (!ok) return;
      var res = L.aplicar(db(), { tipo: 'L_VERIFICAR_PRACTICA', actor: yoId(), datos: { persona: b.dataset.lPractica, capsula: b.dataset.cap, aprobada: true, presencial: true } });
      X().setMsg(res.ok ? { ok: true, texto: 'Evaluación práctica registrada.' } : { ok: false, texto: res.motivo }); X().guardar(); X().render();
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.hasAttribute('data-l-completar')) {
      e.preventDefault();
      var c = L.capsula(db(), f.dataset.lCompletar), fd = new FormData(f), r = reproductor;
      var res = L.aplicar(db(), { tipo: 'L_COMPLETAR', actor: yoId(), datos: { capsula: c.id, asignacion: f.dataset.asig || null, partesVistas: r ? r.parte : 0, segundos: r ? (Date.now() - r.inicio) / 1000 : 0, respuesta: fd.get('resp') === null ? undefined : +fd.get('resp') } });
      X().setMsg(res.ok ? { ok: true, texto: res.evento.datos.repetida ? 'Repaso registrado (no suma minutos nuevos).' : c.tipo === 'capacitacion_practica' ? 'Teoría completa. Falta la evaluación práctica presencial.' : 'Cápsula completada.' } : { ok: false, texto: res.motivo });
      X().guardar();
      if (res.ok) { reproductor = null; location.hash = c.tipo === 'refuerzo' ? '#/ficha' : '#/ficha'; return; }
      if (/Vuelve a ver/.test(res.motivo || '')) reproductor = null;
      X().render(); return;
    }
    if (f.dataset.lRevisar) {
      e.preventDefault();
      var fr = new FormData(f), ac = fr.get('accion'), nt = (fr.get('nota') || '').toString().trim();
      var rr = L.aplicar(db(), { tipo: 'L_REVISAR', actor: yoId(), datos: { capsula: f.dataset.lRevisar, accion: ac, nota: ac !== 'PUBLICAR' ? nt : null, resolucion: ac === 'PUBLICAR' && nt ? nt : null } });
      X().setMsg(rr.ok ? { ok: true, texto: 'Cápsula ' + L.ESTADO_CAP[rr.evento.datos.estado].toLowerCase() + '.' } : { ok: false, texto: rr.motivo }); X().guardar(); X().render(); return;
    }
    if (f.hasAttribute('data-l-contrato')) {
      e.preventDefault();
      var fd2 = new FormData(f), r2 = L.aplicar(db(), { tipo: 'L_CONTRATO', actor: yoId(), datos: { empresa: fd2.get('empresa'), minutos: +fd2.get('minutos'), diasCiclo: +fd2.get('dias') } });
      X().setMsg(r2.ok ? { ok: true, texto: 'Contrato guardado. Rige desde el próximo ciclo de cada trabajador.' } : { ok: false, texto: r2.motivo }); X().guardar(); X().render();
    }
  });

  window.ASTRA_VL = { ruta: ruta, tarjeta: tarjeta, ingresoDelDia: ingresoDelDia };
})();
