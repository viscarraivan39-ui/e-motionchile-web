// ASTRA · pantallas del módulo Checkmaq: flota, ficha de la máquina (se abre con su QR: #/m/<qr>), checklist con
// horómetro y fotos, reporte de falla, reparación, validación del retorno, mantención y etiquetas imprimibles.
// La lógica está en maquinas.js; aquí solo se muestra y se llama. Usa los ayudantes de window.ASTRA_APP.
(function () {
  'use strict';
  var A = window.ASTRA, M = window.ASTRA_M;
  var X = function () { return window.ASTRA_APP; };
  var db = function () { return M.preparar(X().db); }, yoId = function () { return X().persona; }, yo = function () { return A.porId(db().personas, yoId()); };
  var h = function (t) { return X().h(t); }, hora = function (i) { return X().hora(i).slice(11, 16); };
  var n = function (x) { return x == null ? '—' : Number(x).toLocaleString('es-CL'); };
  var AVISO_PARAR = '<div class="mensaje mal"><b>Si la falla es peligrosa: detén la máquina de forma segura AHORA y avisa.</b> No esperes a llenar esto ni a sacar fotos.</div>';

  function act(tipo, datos, textoOk) {
    var r = M.aplicar(db(), { tipo: tipo, actor: yoId(), datos: datos || {} });
    X().setMsg(r.ok ? { ok: true, texto: textoOk || 'Listo' } : { ok: false, texto: 'No se pudo: ' + r.motivo });
    X().guardar();
    return r;
  }
  function url(u) { return location.href.split('#')[0] + '#/m/' + u.qr; }
  function sem(s, grande) { var x = M.SEMAFORO[s]; return '<span class="chip ' + x.chip + (grande ? ' sem-grande' : '') + '">' + x.icono + ' ' + h(x.txt) + '</span>'; }
  function lineaMant(m) { return !m ? '' : m.vencida ? '<b class="txt-mal">Mantención vencida hace ' + n(-m.faltan) + ' h</b>' : m.alerta ? '<b class="txt-aviso">Faltan ' + n(m.faltan) + ' h para la mantención</b>' : 'Próxima mantención a las ' + n(m.proxima) + ' h (faltan ' + n(m.faltan) + ' h)'; }
  function esMando() { return A.MANDO.indexOf(yo().rol) >= 0; }
  function usaMaquinas(p) { return M.esMecanico(p) || Object.keys(p.comp || {}).some(function (k) { return /^operador_/.test(k); }); }

  // ---------- Flota ----------
  function vFlota() {
    var D = db(), f = M.flota(D), r = M.resumen(D), p = yo();
    if (!f.length) return '<h1>Máquinas y equipos</h1><div class="mensaje">Esta demo no tiene máquinas registradas. Carga el escenario «Constructora Demostración» en la pantalla de ingreso para ver Checkmaq con su flota.</div>';
    var html = '<h1>Máquinas y equipos <span class="suave" style="font-size:14px">· Checkmaq</span></h1>' + X().mensaje() +
      '<div class="tarjeta fila-chips">' + ['VERDE', 'AMARILLO', 'NARANJA', 'ROJO'].map(function (s) { return '<span class="chip ' + M.SEMAFORO[s].chip + '">' + M.SEMAFORO[s].icono + ' ' + r[s] + ' ' + h(M.SEMAFORO[s].txt.toLowerCase()) + '</span>'; }).join(' ') +
      (r.sinChecklist ? ' <span class="chip aviso">📋 ' + r.sinChecklist + ' máquina(s) sin checklist de hoy</span>' : '') + '</div>' +
      '<p class="suave">Cada máquina tiene su QR en la cabina. El operador lo escanea, marca el horómetro y hace el checklist: sin checklist al día, verde o amarillo, la máquina no entra a una AST.</p>';
    html += f.map(function (x) {
      var u = x.u, c = x.checklistHoy;
      return '<a class="tarjeta maq sem-' + x.semaforo.toLowerCase() + '" href="#/m/' + u.qr + '"><div class="maq-cab"><b>' + h(u.codigo) + '</b> ' + sem(x.semaforo) + '</div>' +
        '<div>' + h(u.nombre) + ' <span class="suave">· ' + (u.familia === 'maquinaria' ? 'maquinaria' : 'equipo') + ' · ' + h(A.porId(D.empresas, u.empresa) ? A.porId(D.empresas, u.empresa).nombre : u.empresa) + '</span></div>' +
        '<div class="suave">' + (u.horometro != null ? 'Horómetro ' + n(u.horometro) + ' h · ' : '') + (c ? 'Checklist de hoy ✔ (' + h(A.nombre(D, c.por)) + ', ' + hora(c.en) + ')' : '<b>Sin checklist de hoy</b>') + '</div>' +
        (x.mantencion ? '<div class="suave">' + lineaMant(x.mantencion) + '</div>' : '') +
        (x.abiertas.length ? '<div class="suave">⚠ ' + x.abiertas.length + ' incidencia(s) abierta(s)</div>' : '') +
        (x.asts.length ? '<div class="suave">En ' + x.asts.length + ' AST activa(s)</div>' : '') + '</a>';
    }).join('');
    if (esMando()) html += '<p><a class="boton" href="#/etiquetas-maq">🏷️ Imprimir etiquetas QR</a></p>';
    if (p.rol === 'prevencion' || p.rol === 'jefe_terreno') html += '<form data-m-alta class="tarjeta"><b>Dar de alta una máquina o equipo</b>' +
      '<div class="fila"><select name="tipo">' + Object.keys(M.PLANTILLAS).map(function (t) { return '<option value="' + t + '">' + h(t.replace(/_/g, ' ')) + '</option>'; }).join('') + '</select>' +
      '<input name="codigo" placeholder="Código, p. ej. RETRO-05" required maxlength="12"><input name="horometro" type="number" min="0" placeholder="Horómetro (si tiene)"></div>' +
      '<p class="suave">Al darla de alta se genera su QR y su etiqueta para la cabina.</p><button class="primario">Dar de alta</button></form>';
    return html;
  }

  // ---------- Ficha de la máquina (lo que abre el QR) ----------
  function vFicha(qr) {
    var D = db(), u = M.unidad(D, qr), p = yo();
    if (!u) return '<div class="mensaje mal"><b>QR no reconocido.</b> Si la máquina tiene una falla, no la uses y avisa al supervisor.</div>';
    var s = M.calcular(u), c = M.checklistHoy(D, u), m = M.mantencion(u), ab = M.abiertas(u), asts = M.astsQueUsan(D, u);
    var html = '<div class="maq-ficha sem-' + s.toLowerCase() + '"><div class="suave">' + (u.familia === 'maquinaria' ? 'Máquina' : 'Equipo') + ' · ' + h(u.codigo) + '</div><h1 style="margin:2px 0 8px">' + h(u.nombre) + '</h1>' + sem(s, true) +
      (M.BLOQUEAN.indexOf(s) >= 0 ? '<p><b>No se usa.</b> ' + h(M.motivoSemaforo(u)) + '</p>' : s === 'AMARILLO' ? '<p>Puede operar. Observación: ' + h(M.motivoSemaforo(u)) + '</p>' : '') + '</div>' + X().mensaje();
    html += '<div class="tarjeta"><table class="datos">' +
      (u.horometro != null ? '<tr><th>Horómetro</th><td>' + n(u.horometro) + ' h</td></tr>' : '') +
      (m ? '<tr><th>Mantención</th><td>' + lineaMant(m) + '</td></tr>' : '') +
      '<tr><th>Checklist de hoy</th><td>' + (c ? '✔ ' + h(A.nombre(D, c.por)) + ' a las ' + hora(c.en) + ' · ' + sem(c.resultado || 'VERDE') : '<b>Falta</b>: sin checklist la máquina no entra a una AST') + '</td></tr>' +
      (u.competencia ? '<tr><th>Opera</th><td>Quien tenga «' + h(u.competencia.replace(/_/g, ' ')) + '» vigente en su ficha</td></tr>' : '') + '</table></div>';
    var puedeCk = M.BLOQUEAN.indexOf(s) < 0 || M.esMecanico(p) || p.rol === 'prevencion';
    html += '<div class="fila acciones-maq">' + (puedeCk ? '<a class="boton-grande" href="#/m/' + u.qr + '/checklist"><span>📋 Hacer checklist</span><small>horómetro + revisión antes de operar</small></a>' : '') +
      '<a class="boton-grande alerta" href="#/m/' + u.qr + '/falla"><span>⚠ Reportar falla</span><small>a media jornada o al ver algo raro</small></a></div>';
    if (ab.length) html += '<h2>Incidencias abiertas</h2>' + ab.map(function (i) { return tarjetaIncidencia(D, u, i, p); }).join('');
    if ((u.incidencias || []).some(function (i) { return i.estado === 'REPARADA'; }) && M.puedeValidar(D, p, u)) html += '<form data-m-validar="' + u.id + '" class="tarjeta"><b>Validar el retorno a operación</b>' +
      '<p class="suave">Revisa la máquina en terreno. Quien reparó no valida su propio trabajo. Al validar, las AST detenidas por esta falla pueden reanudarse con causa y control.</p>' +
      '<label class="opcion"><input type="checkbox" name="presencial"> Estoy frente a la máquina y revisé la reparación</label><input name="observacion" placeholder="Observación (opcional)"><button class="primario">Validar retorno</button></form>';
    if (M.esMecanico(p) && u.mantencion) html += '<form data-m-mantencion="' + u.id + '" class="tarjeta"><b>Registrar mantención</b> <span class="suave">(cada ' + n(u.mantencion.intervalo) + ' h)</span>' +
      '<div class="fila"><input name="horometro" type="number" min="' + (u.horometro || 0) + '" value="' + (u.horometro || 0) + '"><input name="detalle" placeholder="Qué se hizo (aceite, filtros…)" required></div><button>Registrar mantención</button></form>';
    if (asts.length) html += '<h2>AST que la usan</h2>' + asts.map(function (a) { return '<a class="tarjeta" style="display:block;text-decoration:none;color:inherit" href="#/c/' + a.id + '"><b>' + h(a.nombre || a.id) + '</b> ' + X().chip(a.estado) + '<br><span class="suave">' + h(A.porId(D.areas, a.area) ? A.porId(D.areas, a.area).nombre : a.area) + '</span></a>'; }).join('');
    var hist = (u.checklists || []).slice(-6).reverse();
    if (hist.length) html += '<h2>Historial de checklists</h2><div class="tarjeta">' + hist.map(function (x) {
      var fallas = (x.respuestas || []).filter(function (r) { return r.valor === 'FALLA'; });
      return '<div class="evento"><b>' + h(x.en.slice(0, 10)) + ' ' + hora(x.en) + '</b> · ' + h(A.nombre(D, x.por)) + (x.horometro != null ? ' · ' + n(x.horometro) + ' h' : '') + ' · ' + sem(x.resultado || 'VERDE') +
        (fallas.length ? '<div class="suave">Fallas: ' + fallas.map(function (r) { return h(r.texto); }).join(', ') + '</div>' : '') + (x.migrado ? '<div class="suave">Inspección del registro anterior</div>' : '') + '</div>';
    }).join('') + '</div>';
    if ((u.mantenciones || []).length) html += '<h2>Mantenciones</h2><div class="tarjeta">' + u.mantenciones.slice().reverse().map(function (x) { return '<div class="evento">' + h(x.en.slice(0, 10)) + ' · ' + n(x.horometro) + ' h · ' + h(x.detalle) + ' · ' + h(A.nombre(D, x.por)) + '</div>'; }).join('') + '</div>';
    if (esMando()) html += '<p class="no-imprimir"><a href="#/etiquetas-maq/' + u.qr + '">🏷️ Imprimir la etiqueta de esta máquina</a> · <a href="#/maquinas">Ver toda la flota</a></p>';
    return html;
  }
  function tarjetaIncidencia(D, u, i, p) {
    var f = i.foto && A.porId(D.fotos || [], i.foto);
    var html = '<div class="tarjeta"><b>' + h(i.descripcion) + '</b> <span class="chip ' + M.SEMAFORO[{ observacion: 'AMARILLO', prioritaria: 'NARANJA', fuera_servicio: 'ROJO' }[i.severidad]].chip + '">' + h(M.SEVERIDAD_TXT[i.severidad]) + '</span> <span class="chip">' + h(M.EST_INC[i.estado]) + '</span>' +
      '<div class="suave">Reportó ' + h(A.nombre(D, i.reportadaPor)) + ' · ' + h(i.en.slice(0, 10)) + ' ' + hora(i.en) + ' · ' + h(i.origen) + '</div>' +
      (f ? '<img class="foto-mini" src="' + f.dato + '" alt="Foto de la falla">' : '') +
      (i.estado === 'REPARADA' ? '<div><b>Diagnóstico:</b> ' + h(i.diagnostico) + '<br><b>Reparación:</b> ' + h(i.reparacion) + ' <span class="suave">(' + h(A.nombre(D, i.reparadaPor)) + ')</span></div>' : '');
    if (i.estado === 'ABIERTA' && M.esMecanico(p)) html += '<form data-m-reparar="' + i.id + '"><input name="diagnostico" placeholder="Diagnóstico" required><input name="reparacion" placeholder="Qué se reparó" required>' +
      '<label class="campo">Foto de la reparación (opcional)</label><input type="file" name="foto" accept="image/*" capture="environment"><button>Registrar reparación</button></form>';
    return html + '</div>';
  }

  // ---------- Checklist ----------
  function vChecklist(qr, astId) {
    var D = db(), u = M.unidad(D, qr), pl = u && M.plantilla(u);
    if (!u || !pl) return '<div class="mensaje mal">Máquina sin plantilla de checklist.</div>';
    return '<h1>Checklist · ' + h(u.codigo) + '</h1><p class="suave">' + h(u.nombre) + ' · plantilla ' + h(pl.cita) + '</p>' + X().mensaje() +
      '<form data-m-checklist="' + u.id + '"' + (astId ? ' data-ast="' + h(astId) + '"' : '') + '>' +
      (u.familia === 'maquinaria' ? '<div class="tarjeta"><label class="campo grande" for="horo">¿Qué marca el horómetro?</label><input id="horo" name="horometro" type="number" min="0" step="0.1" inputmode="decimal" class="grande" required placeholder="' + n(u.horometro) + '">' +
        '<p class="suave">Último registro: ' + n(u.horometro) + ' h. Si es menor, revísalo o explica por qué.</p><input name="motivoHorometro" placeholder="Motivo si el horómetro bajó o saltó mucho (opcional)"></div>' : '') +
      '<div class="tarjeta"><b>Revisa la máquina y marca cada punto</b><p class="suave">Los puntos con ⛔ son críticos: si fallan, la máquina queda fuera de servicio. Cada falla lleva una foto.</p>' +
      pl.items.map(function (i) {
        return '<div class="item-ck" data-item="' + i.id + '"><div><b>' + (i.critico ? '⛔ ' : '') + h(i.texto) + '</b></div><div class="fila">' +
          ['OK', 'FALLA', 'NA'].map(function (v) { return v === 'NA' && i.critico ? '' : '<label class="opcion-ck"><input type="radio" name="r:' + i.id + '" value="' + v + '" required> ' + { OK: '✔ Bien', FALLA: '✖ Falla', NA: 'No aplica' }[v] + '</label>'; }).join('') + '</div>' +
          '<div class="si-falla"><input name="nota:' + i.id + '" placeholder="¿Qué tiene?"><input type="file" name="foto:' + i.id + '" accept="image/*" capture="environment"></div></div>';
      }).join('') + '</div>' +
      '<div class="tarjeta"><input name="observacion" placeholder="Observación general (opcional)">' +
      '<label class="opcion"><input type="checkbox" name="declaro"> Declaro que revisé la máquina en persona y que lo marcado es verdad.</label>' +
      '<button class="primario enorme">Registrar checklist</button></div></form>';
  }
  function vFalla(qr) {
    var D = db(), u = M.unidad(D, qr); if (!u) return '<div class="mensaje mal">Máquina no encontrada.</div>';
    return '<h1>Reportar falla · ' + h(u.codigo) + '</h1>' + AVISO_PARAR + X().mensaje() +
      '<form data-m-falla="' + u.id + '" class="tarjeta"><label class="campo">¿Qué falla?</label><input name="descripcion" required placeholder="Ej.: pierde aceite el brazo, no frena bien">' +
      '<label class="campo">¿Se puede seguir usando?</label>' + Object.keys(M.SEVERIDAD_TXT).map(function (k) { return '<label class="opcion"><input type="radio" name="severidad" value="' + k + '" required> ' + h(M.SEVERIDAD_TXT[k]) + '</label>'; }).join('') +
      '<p class="suave">«Fuera de servicio» detiene al tiro las AST que usan esta máquina y avisa a Prevención y mantención.</p>' +
      '<label class="campo">Foto (opcional)</label><input type="file" name="foto" accept="image/*" capture="environment"><button class="primario">Enviar reporte</button></form>';
  }

  // ---------- Etiquetas imprimibles ----------
  function vEtiquetas(qr) {
    var D = db(), lista = M.flota(D).map(function (x) { return x.u; }).filter(function (u) { return !qr || u.qr === qr; });
    return '<div class="no-imprimir"><h1>Etiquetas QR de máquinas y equipos</h1><p class="suave">Adhesivo vinílico en la cabina, junto al horómetro (equipos menores: etiqueta o tarjeta colgante). El QR solo lleva un código; el estado se ve en la app, no en el papel.</p><button onclick="window.print()" class="primario">🖨️ Imprimir</button></div>' +
      '<div class="etiquetas">' + lista.map(function (u) {
        return '<div class="etiqueta"><div class="qr-maq" data-qr="' + h(url(u)) + '"></div><div><div class="et-cod">' + h(u.codigo) + '</div><div>' + h(u.nombre) + '</div><div class="et-pie">ASTRA · Checkmaq<br>Escanea antes de operar: checklist y horómetro</div></div></div>';
      }).join('') + '</div>';
  }
  function dibujar() {
    document.querySelectorAll('[data-qr]').forEach(function (el) {
      if (el.firstChild) return;
      if (window.qrcode) { var q = window.qrcode(0, 'M'); q.addData(el.dataset.qr); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 1, scalable: true }); }
      else el.innerHTML = '<div class="suave" style="border:1px dashed #999;padding:8px;font-size:9px">QR sin conexión</div>';
    });
  }

  function ruta(partes) {
    if (partes[1] === 'maquinas') return vFlota();
    if (partes[1] === 'etiquetas-maq') return vEtiquetas(partes[2]);
    if (partes[1] === 'm' && partes[2]) {
      if (partes[3] === 'checklist') return vChecklist(partes[2], partes[4]);
      if (partes[3] === 'falla') return vFalla(partes[2]);
      return vFicha(partes[2]);
    }
    return null;
  }

  // ---------- Formularios ----------
  function leerFoto(file) {
    return new Promise(function (ok) {
      if (!file || !file.size) return ok(null);
      var r = new FileReader(); r.onload = function () {
        // Se reduce a 1024 px para no llenar el almacenamiento del teléfono
        var img = new Image(); img.onload = function () { var k = Math.min(1, 1024 / Math.max(img.width, img.height)), cv = document.createElement('canvas'); cv.width = img.width * k; cv.height = img.height * k; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); ok(cv.toDataURL('image/jpeg', 0.7)); };
        img.onerror = function () { ok(r.result); }; img.src = r.result;
      }; r.readAsDataURL(file);
    });
  }
  document.addEventListener('change', function (e) {
    var r = e.target; if (!r.name || r.name.indexOf('r:') !== 0) return;
    var item = r.closest('.item-ck'); if (item) item.classList.toggle('con-falla', r.value === 'FALLA');
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, ds = f.dataset;
    if (!Object.keys(ds).some(function (k) { return /^m[A-Z]/.test(k); })) return;
    e.preventDefault();
    var fd = new FormData(f), val = function (k) { return (fd.get(k) || '').toString().trim(); }, si = function (k) { return fd.get(k) === 'on'; };
    var D = db();
    if (ds.mChecklist) {
      var u = M.unidad(D, ds.mChecklist), pl = M.plantilla(u), resp = {}, notas = {}, pend = [];
      pl.items.forEach(function (i) { if (fd.get('r:' + i.id)) resp[i.id] = fd.get('r:' + i.id); if (val('nota:' + i.id)) notas[i.id] = val('nota:' + i.id); if (resp[i.id] === 'FALLA') pend.push(i.id); });
      Promise.all(pend.map(function (id) { return leerFoto(fd.get('foto:' + id)); })).then(function (fs) {
        var fotos = {}; pend.forEach(function (id, k) { if (fs[k]) fotos[id] = fs[k]; });
        var datos = { unidad: u.id, respuestas: resp, notas: notas, fotos: fotos, observacion: val('observacion') || null, declaro: si('declaro') };
        if (u.familia === 'maquinaria') { datos.horometro = val('horometro'); if (val('motivoHorometro')) datos.motivoHorometro = val('motivoHorometro'); }
        var r = act('M_CHECKLIST', datos, 'Checklist registrado.');
        if (r.ok) {
          X().setMsg(M.BLOQUEAN.indexOf(r.semaforo) >= 0 ? { ok: false, texto: M.SEMAFORO[r.semaforo].icono + ' ' + u.nombre + ' queda ' + M.SEMAFORO[r.semaforo].txt.toLowerCase() + '. No se usa. Se avisó a Prevención y mantención.' + (r.detenidas.length ? ' Se detuvieron ' + r.detenidas.length + ' AST.' : '') }
            : { ok: true, texto: M.SEMAFORO[r.semaforo].icono + ' Checklist registrado: ' + M.SEMAFORO[r.semaforo].txt.toLowerCase() + '.' + (r.mantencion && r.mantencion.alerta ? ' Faltan ' + r.mantencion.faltan + ' h para la mantención.' : '') });
          X().guardar(); location.hash = ds.ast ? '#/c/' + ds.ast : '#/m/' + u.qr; return;
        }
        X().render(); window.scrollTo(0, 0);
      });
      return;
    }
    if (ds.mFalla) {
      leerFoto(fd.get('foto')).then(function (foto) {
        var r = act('M_REPORTAR_FALLA', { unidad: ds.mFalla, descripcion: val('descripcion'), severidad: val('severidad'), foto: foto }, 'Falla reportada.');
        if (r.ok) { if (r.detenidas.length) X().setMsg({ ok: false, texto: 'Falla registrada. Se detuvieron ' + r.detenidas.length + ' AST que usan la máquina. Actúa en terreno: el aviso no detiene la máquina.' }); X().guardar(); location.hash = '#/m/' + M.unidad(db(), ds.mFalla).qr; return; }
        X().render();
      });
      return;
    }
    if (ds.mReparar) { leerFoto(fd.get('foto')).then(function (foto) { act('M_REPARAR', { incidencia: ds.mReparar, diagnostico: val('diagnostico'), reparacion: val('reparacion'), foto: foto }, 'Reparación registrada. Falta que un responsable valide el retorno.'); X().render(); }); return; }
    if (ds.mValidar) { act('M_VALIDAR_RETORNO', { unidad: ds.mValidar, presencial: si('presencial'), observacion: val('observacion') || null }, 'Retorno validado: la máquina vuelve a operación.'); return X().render(); }
    if (ds.mMantencion) { act('M_MANTENCION', { unidad: ds.mMantencion, horometro: val('horometro'), detalle: val('detalle') }, 'Mantención registrada.'); return X().render(); }
    if (f.hasAttribute('data-m-alta')) { var ra = act('M_ALTA', { tipo: val('tipo'), codigo: val('codigo'), horometro: val('horometro') }, 'Alta registrada. Imprime su etiqueta.'); if (ra.ok) { location.hash = '#/etiquetas-maq/' + ra.unidad.qr; return; } return X().render(); }
  });

  window.ASTRA_VM = { ruta: ruta, dibujar: dibujar, usaMaquinas: usaMaquinas, url: url };
})();
