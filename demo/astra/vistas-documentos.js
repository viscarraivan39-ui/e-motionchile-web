// ASTRA · pantallas del servicio de documentación preventiva (D-040): solicitudes, ciclo de vida de cada documento,
// impacto de una nueva versión y servicios contratados. La lógica está en documentos.js.
(function () {
  'use strict';
  var A = window.ASTRA, C = window.ASTRA_C, D = window.ASTRA_D;
  var X = function () { return window.ASTRA_APP; };
  var db = function () { return D.preparar(X().db); }, yoId = function () { return X().persona; }, yo = function () { return A.porId(db().personas, yoId()); };
  var h = function (t) { return X().h(t); }, hora = function (i) { return X().hora(i); };
  var CH = { BORRADOR: 'info', REVISION_TECNICA: 'aviso', REVISION_EMPRESA: 'aviso', CORRECCIONES: 'mal', APROBADO: 'aviso', VIGENTE: 'ok', REEMPLAZADO: '' };
  var SOL = { REGISTRADA: 'Registrada (la empresa decide cómo resolverla)', ENCARGADA: 'Encargada al servicio documental', EN_ELABORACION: 'En elaboración', RESUELTA: 'Resuelta: documento vigente' };
  var CAT = { actividades: 'Actividades', equipos: 'Equipos y herramientas', condiciones: 'Condiciones del lugar', personal: 'Personal expuesto', controles: 'Controles existentes' };
  var abierto = null; // documento con el formulario de borrador abierto (id de solicitud o 'nuevo')

  function esEmpresa(p) { return p.rol === 'prevencion' || p.rol === 'administrador'; }
  function chipDoc(e) { return '<span class="chip ' + (CH[e] || '') + '">' + h(D.ESTADO_DOC[e]) + '</span>'; }

  // Acciones que le tocan a quien mira, según el estado del documento
  function acciones(doc, p) {
    var k = 'data-doc="' + doc.id + '" data-ver="' + doc.version + '"', out = '';
    if (p.rol === 'servicio_doc' && ['BORRADOR', 'CORRECCIONES'].indexOf(doc.estado) >= 0) out += '<button ' + k + ' data-d-ev="D_ENVIAR_REVISION_TECNICA">Enviar a revisión técnica</button>';
    if (p.rol === 'servicio_tec' && doc.estado === 'REVISION_TECNICA') out += '<form class="fila" data-d-tecnica ' + k + '><input name="nota" placeholder="Observaciones (si las hay)" style="flex:1"><button name="r" value="OK">Sin observaciones</button><button name="r" value="OBSERVA">Observar</button></form>';
    if (doc.estado === 'REVISION_EMPRESA') {
      doc.revisionesAdicionales.filter(function (x) { return x.estado !== 'COMPLETADA' && (p.rol === x.calidad || C.responsablesDe(db(), null, x.calidad, 'e-principal').indexOf(p.id) >= 0); }).forEach(function (x) { out += '<button ' + k + ' data-d-adicional="' + x.calidad + '">Completar revisión de ' + h(C.CALIDAD[x.calidad] || x.calidad) + '</button>'; });
      if (esEmpresa(p)) out += '<form class="fila" data-d-ajustes ' + k + '><input name="nota" placeholder="Ajustes que pide la empresa" style="flex:1"><button>Pedir ajustes</button></form>';
      if ((db().aprobadoresDoc[p.empresa] || []).some(function (x) { return x.persona === p.id; })) out += '<button class="primario" ' + k + ' data-d-ev="D_APROBAR">Aprobar como ' + h((db().aprobadoresDoc[p.empresa].filter(function (x) { return x.persona === p.id; })[0]).cargo) + '</button>';
    }
    if (doc.estado === 'APROBADO' && esEmpresa(p)) out += '<button class="primario" ' + k + ' data-d-ev="D_PUBLICAR">Publicar: entra en vigencia</button>';
    return out ? '<div class="fila" style="margin-top:8px;flex-wrap:wrap;gap:6px">' + out + '</div>' : '';
  }
  function tarjetaDoc(doc, p) {
    var ap = doc.aprobacion, rt = doc.responsables && doc.responsables.revisionTecnica;
    return '<div class="tarjeta"><div class="fila" style="justify-content:space-between"><b>' + h(doc.id) + ' v' + h(doc.version) + ' · ' + h(doc.titulo) + '</b>' + chipDoc(doc.estado) + '</div>' +
      '<span class="suave">' + h(D.TIPOS[doc.tipo] || doc.tipo) + (doc.origen === 'servicio' ? ' · servicio documental' : ' · documento de la empresa') + (doc.solicitud ? ' · solicitud ' + doc.solicitud : '') + (doc.vigenteDesde ? ' · vigente desde ' + doc.vigenteDesde : '') + (doc.reemplazadoPor ? ' · reemplazado por v' + doc.reemplazadoPor : '') + '</span>' +
      (doc.noVerificados && doc.noVerificados.length ? '<div class="mensaje aviso-zona">Antecedentes sin comprobar (marcados así en el documento): ' + doc.noVerificados.map(h).join('; ') + '</div>' : '') +
      (rt ? '<br><span class="suave">Revisión técnica: ' + h(A.nombre(db(), rt.por)) + ' · ' + hora(rt.en).slice(0, 16) + '</span>' : '') +
      (doc.revisionesAdicionales && doc.revisionesAdicionales.length ? '<br><span class="suave">Revisiones adicionales: ' + doc.revisionesAdicionales.map(function (x) { return h(C.CALIDAD[x.calidad] || x.calidad) + ' ' + (x.estado === 'COMPLETADA' ? '✔' : 'pendiente'); }).join(', ') + '</span>' : '') +
      (ap ? '<br><span class="suave">Aprobó: ' + h(ap.nombre) + (ap.cargo ? ', ' + h(ap.cargo) : '') + ' · ' + h(ap.fecha) + ' · versión ' + h(ap.version) + '</span>' : '') +
      (doc.historial && doc.historial.length ? '<details><summary class="suave">Historial (' + doc.historial.length + ')</summary>' + doc.historial.map(function (x) { return '<div class="mini-ast"><span>' + h(D.ESTADO_DOC[x.estado] || x.estado) + (x.nota ? ' — ' + h(x.nota) : '') + '</span><span class="suave">' + h(A.nombre(db(), x.por)) + ' · ' + hora(x.en).slice(0, 16) + '</span></div>'; }).join('') + '</details>' : '') +
      (doc.origen === 'servicio' ? '<p class="suave" style="margin-top:6px">' + h(doc.nota) + '</p>' : '') + acciones(doc, p) + '</div>';
  }
  function formBorrador(sol) {
    return '<form data-d-borrador="' + (sol ? sol.id : '') + '" class="tarjeta"><b>Elaborar borrador' + (sol ? ' · ' + sol.id : '') + '</b><p class="suave">Con antecedentes reales de la empresa. Un antecedente por línea; empieza la línea con <b>?</b> si aún no está comprobado (quedará marcado en el documento).</p>' +
      '<div class="grilla"><input name="documento" placeholder="Código (p. ej. PROT-CAL-01)" value="' + h(sol && sol.documento || '') + '"><input name="titulo" placeholder="Título" value="' + h(sol && sol.titulo || '') + '"><select name="tipo">' + Object.keys(D.TIPOS).map(function (k) { return '<option value="' + k + '">' + h(D.TIPOS[k]) + '</option>'; }).join('') + '</select></div>' +
      Object.keys(CAT).map(function (k) { return '<label class="campo">' + CAT[k] + '</label><textarea name="' + k + '" rows="2"></textarea>'; }).join('') +
      '<label class="opcion"><input type="checkbox" name="ma"> Requiere además revisión de medio ambiente</label><button class="primario" style="margin-top:8px">Guardar borrador</button></form>';
  }

  function vDocumentos() {
    var Db = db(), p = yo();
    if (!esEmpresa(p) && ['servicio_doc', 'servicio_tec', 'medio_ambiente'].indexOf(p.rol) < 0) return '<div class="mensaje mal">Esta pantalla es para Prevención, la administración y el equipo del servicio documental.</div>';
    var html = '<h1>Documentación preventiva</h1>' + X().mensaje() +
      '<div class="mensaje aviso-zona">Solo un documento <b>vigente</b> sirve de referencia para una AST o una cápsula. Un borrador o un documento aprobado pero no publicado no cubre una brecha. ' + h(D.NOTA) + '</div>';
    // Servicios contratados (D-040 §7)
    html += '<h2>Servicios contratados</h2><div class="tarjeta tabla"><table><tr><th>Empresa</th><th>Plataforma ASTRA</th><th>Cápsulas</th><th>Documentación</th></tr>' + Db.empresas.map(function (e) {
      var s = Db.servicios[e.id] || {}; return '<tr><td>' + h(e.nombre) + '</td>' + ['plataforma', 'capsulas', 'documental'].map(function (k) { return '<td>' + (p.rol === 'administrador' ? '<input type="checkbox" data-d-servicio="' + e.id + '" data-k="' + k + '"' + (s[k] ? ' checked' : '') + '>' : (s[k] ? '✔' : '—')) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</table><p class="suave">Se contratan por separado o combinados. Detectar una brecha no implica contratar el servicio.</p></div>';
    // Solicitudes
    var sols = Db.solicitudesDoc.filter(function (s) { return esEmpresa(p) ? s.empresa === p.empresa || p.rol === 'administrador' : s.contratada; });
    html += '<h2>Solicitudes (' + sols.length + ')</h2>' + (sols.length ? sols.map(function (s) {
      var tiene = (Db.servicios[s.empresa] || {}).documental;
      return '<div class="tarjeta"><div class="fila" style="justify-content:space-between"><b>' + s.id + ' · ' + h(s.titulo || s.documento || 'Documento faltante') + '</b><span class="chip ' + (s.estado === 'RESUELTA' ? 'ok' : s.estado === 'REGISTRADA' ? 'mal' : 'aviso') + '">' + h(SOL[s.estado]) + '</span></div>' +
        '<span class="suave">' + (s.origen === 'brecha' ? 'Detectada en ' + s.ast + ': ' + h(s.detalle) : 'Pedida por ' + h(A.nombre(Db, s.por))) + ' · ' + hora(s.en).slice(0, 16) + (s.alcance ? '<br>Alcance: ' + h(s.alcance) : '') + '</span>' +
        (s.estado === 'REGISTRADA' && esEmpresa(p) ? (tiene ? '<form class="fila" data-d-encargar="' + s.id + '" style="margin-top:6px"><input name="alcance" placeholder="Alcance del encargo" value="' + h(s.alcance || '') + '" style="flex:1"><button>Encargar al servicio documental</button></form>' : '<p class="suave">La empresa no tiene contratado el servicio documental: puede resolverla internamente cargando el documento vigente.</p>') : '') +
        (p.rol === 'servicio_doc' && s.estado === 'ENCARGADA' ? (abierto === s.id ? formBorrador(s) : '<button data-d-abrir="' + s.id + '">Elaborar borrador</button>') : '') + '</div>';
    }).join('') : '<p class="suave">Sin solicitudes.</p>');
    if (esEmpresa(p)) html += '<form data-d-solicitud class="tarjeta"><b>Nueva solicitud</b> <span class="suave">(documento nuevo o actualización de uno existente)</span><div class="grilla" style="margin-top:6px"><input name="titulo" placeholder="Documento que se necesita"><select name="documento"><option value="">Documento nuevo</option>' + vigentes(Db).map(function (d) { return '<option value="' + d.id + '">Actualizar ' + h(d.id) + ' v' + h(d.version) + '</option>'; }).join('') + '</select></div><input name="alcance" placeholder="Alcance: actividades, áreas, equipos" style="margin-top:6px"><button style="margin-top:6px">Registrar solicitud</button></form>';
    if (p.rol === 'servicio_doc') html += abierto === 'nuevo' ? formBorrador(null) : '<button data-d-abrir="nuevo">Elaborar borrador de una actualización</button>';
    // En curso
    var curso = Db.biblioteca.documentos.filter(function (d) { return ['VIGENTE', 'REEMPLAZADO'].indexOf(d.estado) < 0; });
    html += '<h2>En elaboración y revisión (' + curso.length + ')</h2>' + (curso.length ? curso.map(function (d) { return tarjetaDoc(d, p); }).join('') : '<p class="suave">Nada en curso.</p>');
    // Impacto de cambios: fichas por revalidar y comunicaciones (D-040 §6)
    var porRevalidar = Db.biblioteca.fichas.filter(function (f) { return f.estado === 'REVISION_POR_CAMBIO'; });
    if (porRevalidar.length) html += '<h2>Fichas en revisión por cambio de documento</h2>' + porRevalidar.map(function (f) { return '<div class="tarjeta fila" style="justify-content:space-between"><span><b>' + f.id + ' · ' + h(f.nombre) + '</b><br><span class="suave">' + h(f.motivoRevision || '') + ' · no se puede usar en AST nuevas hasta revalidarla (pasos, riesgos y lista de verificación)</span></span>' + (p.rol === 'prevencion' ? '<button data-d-revalidar="' + f.id + '">Revalidar</button>' : '') + '</div>'; }).join('');
    if (Db.comunicacionesDoc.length) html += '<h2>Comunicaciones de cambios</h2><div class="tarjeta">' + Db.comunicacionesDoc.slice().reverse().map(function (c) { return '<div class="mini-ast"><span>' + h(c.documento) + ' v' + h(c.version) + ' · ' + hora(c.en).slice(0, 16) + '</span><span class="suave">' + c.personas.length + ' trabajador(es) avisado(s) · fichas: ' + (c.fichas.join(', ') || '—') + ' · cápsulas: ' + (c.capsulas.join(', ') || '—') + '</span></div>'; }).join('') + '</div>';
    // Vigentes e historial de versiones
    html += '<h2>Vigentes</h2>' + vigentes(Db).map(function (d) { var ant = D.versiones(Db, d.id).filter(function (x) { return x.estado === 'REEMPLAZADO'; }); return '<div class="mini-ast tarjeta"><span><b>' + h(d.id) + ' v' + h(d.version) + '</b> · ' + h(d.titulo) + '</span><span class="suave">' + (d.vigenteDesde ? 'desde ' + d.vigenteDesde : '') + (ant.length ? ' · anteriores: ' + ant.map(function (x) { return 'v' + x.version; }).join(', ') : '') + '</span></div>'; }).join('');
    return html;
  }
  function vigentes(Db) { return Db.biblioteca.documentos.filter(function (d) { return d.estado === 'VIGENTE'; }); }

  function ruta(partes) { return partes[1] === 'documentos' ? vDocumentos() : null; }

  function act(tipo, datos, txt) { var r = D.aplicar(db(), { tipo: tipo, actor: yoId(), datos: datos }); X().setMsg(r.ok ? { ok: true, texto: typeof txt === 'function' ? txt(r) : txt } : { ok: false, texto: 'No se pudo: ' + r.motivo }); X().guardar(); return r; }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-d-ev],[data-d-adicional],[data-d-abrir],[data-d-revalidar]'); if (!b) return; e.preventDefault();
    var ds = b.dataset, dv = { documento: ds.doc, version: ds.ver };
    if (ds.dEv === 'D_PUBLICAR' && !confirm('¿Publicar ' + ds.doc + ' v' + ds.ver + '? La versión anterior queda reemplazada, se revisan las fichas y cápsulas que la citan y se avisa a los trabajadores.')) return;
    if (ds.dEv) act(ds.dEv, dv, function (r) { return ds.dEv === 'D_PUBLICAR' ? 'Vigente. Fichas en revisión: ' + (r.impacto.fichas.join(', ') || 'ninguna') + ' · cápsulas en revisión: ' + (r.impacto.capsulas.join(', ') || 'ninguna') + ' · trabajadores avisados: ' + r.impacto.personas.length + '.' : ds.dEv === 'D_APROBAR' ? 'Aprobado. Queda registrado nombre, cargo, fecha y versión. Falta publicarlo.' : 'Enviado a revisión técnica.'; });
    if (ds.dAdicional) act('D_REVISION_ADICIONAL', Object.assign(dv, { calidad: ds.dAdicional }), 'Revisión adicional completada.');
    if (ds.dAbrir) abierto = ds.dAbrir;
    if (ds.dRevalidar) act('D_REVALIDAR_FICHA', { ficha: ds.dRevalidar }, 'Ficha revalidada con las versiones vigentes.');
    X().render();
  });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!t.dataset || !t.dataset.dServicio) return;
    var s = db().servicios[t.dataset.dServicio] = db().servicios[t.dataset.dServicio] || {}; s[t.dataset.k] = t.checked;
    X().setMsg({ ok: true, texto: 'Servicios actualizados.' }); X().guardar(); X().render();
  });
  document.addEventListener('submit', function (e) {
    var f = e.target, ds = f.dataset; if (!Object.keys(ds).some(function (k) { return /^d[A-Z]/.test(k); })) return;
    e.preventDefault(); var fd = new FormData(f), v = function (k) { return (fd.get(k) || '').toString().trim(); };
    var dv = { documento: ds.doc, version: ds.ver };
    if (f.hasAttribute('data-d-tecnica')) { var res = e.submitter ? e.submitter.value : 'OK'; act('D_REVISION_TECNICA', Object.assign(dv, { resultado: res, nota: v('nota') || null }), res === 'OK' ? 'Revisión técnica sin observaciones: pasa a la revisión de la empresa.' : 'Observado: vuelve a correcciones.'); }
    else if (f.hasAttribute('data-d-ajustes')) act('D_PEDIR_AJUSTES', Object.assign(dv, { nota: v('nota') }), 'Ajustes pedidos: vuelve a correcciones y luego a revisión técnica.');
    else if (ds.dEncargar) act('D_ENCARGAR', { solicitud: ds.dEncargar, alcance: v('alcance') }, 'Solicitud encargada al servicio documental.');
    else if (f.hasAttribute('data-d-solicitud')) act('D_SOLICITUD', { titulo: v('titulo'), documento: v('documento') || null, alcance: v('alcance') }, 'Solicitud registrada.');
    else if (f.hasAttribute('data-d-borrador')) {
      var ant = {}; Object.keys(CAT).forEach(function (k) { ant[k] = v(k).split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return x[0] === '?' ? { texto: x.slice(1).trim(), verificado: false } : { texto: x, verificado: true }; }); });
      var r = act('D_BORRADOR', { solicitud: ds.dBorrador || null, documento: v('documento'), titulo: v('titulo'), tipo: v('tipo'), antecedentes: ant, revisionesAdicionales: fd.get('ma') ? ['medio_ambiente'] : [] }, function (x) { return 'Borrador ' + x.documentoNuevo.id + ' v' + x.documentoNuevo.version + ' guardado' + (x.documentoNuevo.noVerificados.length ? ' con ' + x.documentoNuevo.noVerificados.length + ' antecedente(s) sin comprobar' : '') + '.'; });
      if (r.ok) abierto = null;
    }
    X().render();
  });

  window.ASTRA_VD = { ruta: ruta };
})();
