// ASTRA · servicio de documentación preventiva y ciclo de vida de los documentos (D-040).
// Borrador → revisión técnica → revisión de la empresa → correcciones → aprobación → publicación y vigencia.
// Solo un documento vigente sirve de referencia. Un borrador nunca cubre una brecha. Entregar un documento no garantiza
// por sí solo el cumplimiento de todas las obligaciones de la empresa.
(function (g) {
  'use strict';
  var A = (typeof module !== 'undefined') ? require('./motor.js') : g.ASTRA;
  var C = (typeof module !== 'undefined') ? require('./cuadrilla.js') : g.ASTRA_C;
  var L = (typeof module !== 'undefined') ? require('./aprendizaje.js') : g.ASTRA_L;
  var porId = A.porId;
  var ESTADO_DOC = { BORRADOR: 'Borrador', REVISION_TECNICA: 'Revisión técnica', REVISION_EMPRESA: 'Revisión de la empresa', CORRECCIONES: 'Correcciones', APROBADO: 'Aprobado (aún no vigente)', VIGENTE: 'Vigente', REEMPLAZADO: 'Reemplazado por una versión posterior' };
  var TIPOS = { procedimiento: 'Procedimiento de trabajo', matriz: 'Matriz de peligros y riesgos', protocolo: 'Protocolo', instructivo: 'Instructivo', lista: 'Lista de verificación', formacion: 'Material de inducción o capacitación', formato_permiso: 'Formato de permiso', estandar: 'Estándar' };
  var NOTA = 'Documento elaborado como apoyo a la gestión preventiva de la empresa. Su entrega no garantiza por sí sola el cumplimiento de todas sus obligaciones.';
  // El equipo del servicio es externo a la faena: solo ve la documentación
  A.NIVEL.servicio_doc = 'servicio'; A.NIVEL.servicio_tec = 'servicio';
  C.AVISOS.SOLICITUD_DOC = 'inmediato'; C.ACCION.SOLICITUD_DOC = 1; C.AVISOS.DOCUMENTO = 'inmediato'; C.ACCION.DOCUMENTO = 1; C.AVISOS.CAMBIO_DOCUMENTO = 'resumen';

  function preparar(db) {
    if (db.servicios) return db;
    // D-040 §7: tres servicios contratables por separado o combinados, cada uno con su alcance
    db.servicios = { 'e-principal': { plataforma: true, capsulas: true, documental: true }, 'e-contratista': { plataforma: true, capsulas: true, documental: false }, 'e-mandante': { plataforma: false, capsulas: false, documental: false } };
    db.biblioteca.documentos.forEach(function (d) { if (!d.estado) { d.estado = 'VIGENTE'; d.origen = 'empresa'; d.vigenteDesde = d.fecha; d.aprobacion = { nombre: '(aprobado por la empresa antes de ASTRA)', cargo: null, fecha: d.fecha, version: d.version }; } });
    db.solicitudesDoc = []; db.comunicacionesDoc = [];
    // Equipo del servicio (no son personal de la faena: no entran a la nómina ni a cuadrillas)
    db.personas.push({ id: 'p-redaccion', rut: '49.000.006-2', ingreso: 'ASTRA-01', nombre: 'Redacción ASTRA', empresa: 'e-principal', rol: 'servicio_doc', funciones: [], cargo: 'Servicio documental · elaboración', hab: {}, comp: {}, pin: null, ausente: false, funcionTerreno: null, enNominaTerreno: false });
    db.personas.push({ id: 'p-revisor', rut: '49.000.007-0', ingreso: 'ASTRA-02', nombre: 'Revisión técnica ASTRA', empresa: 'e-principal', rol: 'servicio_tec', funciones: [], cargo: 'Experto en prevención de riesgos (revisión técnica competente)', hab: {}, comp: {}, pin: null, ausente: false, funcionTerreno: null, enNominaTerreno: false });
    db.aprobadoresDoc = { 'e-principal': [{ persona: 'p-elena', cargo: 'Jefa de Prevención de Riesgos' }, { persona: 'p-ana', cargo: 'Jefa de terreno' }] };
    return db;
  }
  // Prevención de la empresa dueña del documento (por zona o, si no hay, quien tenga el rol en esa empresa)
  function empresaResp(db, empresa) {
    var z = db.responsables.filter(function (r) { return r.calidad === 'prevencion'; }).map(function (r) { return r.persona; }).filter(function (pid) { var p = porId(db.personas, pid); return p && p.empresa === empresa; });
    return z.length ? z.filter(function (x, i) { return z.indexOf(x) === i; }) : db.personas.filter(function (p) { return p.rol === 'prevencion' && p.empresa === empresa; }).map(function (p) { return p.id; });
  }
  function empresaDoc(db, doc) { return doc.empresa || (porId(db.empresas, 'e-principal') ? 'e-principal' : db.empresas.filter(function (e) { return e.tipo === 'principal'; })[0].id); }
  function versiones(db, id) { return db.biblioteca.documentos.filter(function (x) { return x.id === id; }); }
  function vigente(db, id) { return versiones(db, id).filter(function (x) { return x.estado === 'VIGENTE'; })[0] || null; }
  function enCurso(db, id) { return versiones(db, id).filter(function (x) { return ['VIGENTE', 'REEMPLAZADO'].indexOf(x.estado) < 0; })[0] || null; }

  // D-040 §2: la brecha detectada queda registrada y se avisa al responsable; detectar no es contratar
  function registrarBrecha(db, ast, br, actor) {
    preparar(db);
    var falt = br.tipo === 'DOCUMENTO_FALTANTE' ? (br.detalle.match(/cargados: (.*)\./) || [null, ''])[1] : null;
    var sol = { id: 'SD-' + String(db.solicitudesDoc.length + 1).padStart(3, '0'), empresa: ast.empresa, origen: 'brecha', ast: ast.id, tipoBrecha: br.tipo, detalle: br.detalle, documento: falt || null,
      tipo: br.tipo === 'SIN_TAREA' ? 'nuevo' : br.tipo === 'CONTRADICCION' ? 'actualizacion' : 'nuevo', alcance: null, estado: 'REGISTRADA', contratada: false, en: A.ahora(db), por: actor ? actor.id : null, historial: [] };
    db.solicitudesDoc.push(sol);
    C.avisar(db, empresaResp(db, ast.empresa), 'SOLICITUD_DOC', 'Brecha documental registrada (' + sol.id + '): ' + br.detalle + ' La empresa decide si la resuelve internamente o con el servicio documental.', ast);
    return sol;
  }
  C.alBrecha = function (db, ast, br, actor) { registrarBrecha(db, ast, br, actor); };

  function aplicar(db, ev) {
    preparar(db);
    var d = ev.datos = ev.datos || {}, actor = porId(db.personas, ev.actor);
    var rech = function (m) { A.registrar(db, { tipo: 'TRANSICION_RECHAZADA', actor: ev.actor, datos: { intento: ev.tipo, motivo: m, faltantes: [] } }); return { ok: false, motivo: m }; };
    var ok = function (datos, extra) { var e = A.registrar(db, { tipo: ev.tipo, actor: ev.actor, datos: datos }); return Object.assign({ ok: true, evento: e }, extra || {}); };
    if (!actor) return rech('Persona desconocida');
    var esEmpresa = actor.rol === 'prevencion' || actor.rol === 'administrador';
    var doc = d.documento && d.version ? versiones(db, d.documento).filter(function (x) { return x.version === String(d.version); })[0] : null;
    var hist = function (x, estado, nota) { x.historial = x.historial || []; x.historial.push({ estado: estado, por: actor.id, en: A.ahora(db), nota: nota || null }); };
    switch (ev.tipo) {
      case 'D_SOLICITUD': {
        if (!esEmpresa) return rech('Las solicitudes las registra el responsable de la empresa');
        if (!d.titulo || !d.alcance) return rech('Indica el documento y su alcance');
        var s = { id: 'SD-' + String(db.solicitudesDoc.length + 1).padStart(3, '0'), empresa: actor.empresa, origen: 'manual', tipo: d.documento ? 'actualizacion' : 'nuevo', documento: d.documento || null, titulo: d.titulo, alcance: d.alcance, estado: 'REGISTRADA', contratada: false, en: A.ahora(db), por: actor.id, historial: [] };
        db.solicitudesDoc.push(s);
        return ok({ solicitud: s.id, titulo: d.titulo }, { solicitud: s });
      }
      case 'D_ENCARGAR': {
        // La empresa decide encargar la solicitud al servicio (requiere tenerlo contratado)
        var so = porId(db.solicitudesDoc, d.solicitud);
        if (!so || !esEmpresa) return rech('La encarga el responsable de la empresa');
        if (!(db.servicios[so.empresa] || {}).documental) return rech('La empresa no tiene contratado el servicio de documentación: puede resolverla internamente');
        if (!d.alcance && !so.alcance) return rech('Define el alcance de la solicitud');
        so.alcance = d.alcance || so.alcance; so.contratada = true; so.estado = 'ENCARGADA'; hist(so, 'ENCARGADA');
        return ok({ solicitud: so.id, alcance: so.alcance });
      }
      case 'D_BORRADOR': {
        // D-040 §3: con antecedentes reales; lo no comprobado se marca así
        if (actor.rol !== 'servicio_doc') return rech('El borrador lo elabora el equipo del servicio documental');
        var sol = d.solicitud ? porId(db.solicitudesDoc, d.solicitud) : null;
        if (sol && !sol.contratada) return rech('La solicitud no está encargada al servicio');
        if (!d.documento || !d.titulo || !TIPOS[d.tipo]) return rech('Indica identificación, título y tipo');
        if (enCurso(db, d.documento)) return rech('Ya hay una versión de ' + d.documento + ' en elaboración');
        var ant = d.antecedentes || {};
        if (!['actividades', 'equipos', 'condiciones', 'personal', 'controles'].some(function (k) { return (ant[k] || []).length; })) return rech('El borrador se arma con antecedentes de la empresa (actividades, equipos, condiciones, personal expuesto, controles)');
        var v = vigente(db, d.documento), nueva = { id: d.documento, empresa: sol ? sol.empresa : (v && v.empresa) || actor.empresa, tipo: d.tipo, titulo: d.titulo, version: String(v ? (+v.version + 1) : 1), estado: 'BORRADOR', origen: 'servicio', simulacion: !!db.escenario, solicitud: sol ? sol.id : null, antecedentes: ant,
          noVerificados: Object.keys(ant).reduce(function (l, k) { return l.concat((ant[k] || []).filter(function (x) { return !x.verificado; }).map(function (x) { return x.texto; })); }, []),
          responsables: { elaboro: actor.id, revisionTecnica: null, aprobo: null }, revisionesAdicionales: (d.revisionesAdicionales || []).map(function (c) { return { calidad: c, estado: 'PENDIENTE' }; }), nota: NOTA, historial: [] };
        hist(nueva, 'BORRADOR');
        db.biblioteca.documentos.push(nueva);
        if (sol) { sol.estado = 'EN_ELABORACION'; hist(sol, 'EN_ELABORACION'); }
        return ok({ documento: nueva.id, version: nueva.version, noVerificados: nueva.noVerificados.length }, { documentoNuevo: nueva });
      }
      case 'D_ENVIAR_REVISION_TECNICA': {
        if (!doc || ['BORRADOR', 'CORRECCIONES'].indexOf(doc.estado) < 0 || actor.rol !== 'servicio_doc') return rech('Envía a revisión técnica el equipo de redacción, desde borrador o correcciones');
        doc.estado = 'REVISION_TECNICA'; hist(doc, doc.estado);
        return ok({ documento: doc.id, version: doc.version });
      }
      case 'D_REVISION_TECNICA': {
        if (!doc || doc.estado !== 'REVISION_TECNICA') return rech('El documento no está en revisión técnica');
        if (actor.rol !== 'servicio_tec') return rech('La revisión técnica la hace un profesional competente');
        if (actor.id === doc.responsables.elaboro) return rech('Quien elaboró no hace la revisión técnica');
        if (d.resultado === 'OBSERVA') { if (!d.nota) return rech('Indica las observaciones'); doc.estado = 'CORRECCIONES'; hist(doc, doc.estado, d.nota); return ok({ documento: doc.id, resultado: 'OBSERVA', nota: d.nota }); }
        doc.estado = 'REVISION_EMPRESA'; doc.responsables.revisionTecnica = { por: actor.id, en: A.ahora(db) }; hist(doc, doc.estado);
        C.avisar(db, empresaResp(db, empresaDoc(db, doc)), 'DOCUMENTO', doc.id + ' v' + doc.version + ' «' + doc.titulo + '» está listo para la revisión de la empresa.' + (doc.noVerificados.length ? ' Tiene ' + doc.noVerificados.length + ' antecedente(s) sin comprobar marcados como tales.' : ''), null);
        return ok({ documento: doc.id, resultado: 'OK' });
      }
      case 'D_PEDIR_AJUSTES': {
        if (!doc || doc.estado !== 'REVISION_EMPRESA' || !esEmpresa) return rech('Los ajustes los pide la empresa durante su revisión');
        if (!d.nota) return rech('Indica los ajustes');
        doc.estado = 'CORRECCIONES'; hist(doc, doc.estado, d.nota);
        return ok({ documento: doc.id, nota: d.nota });
      }
      case 'D_REVISION_ADICIONAL': {
        var ra = doc && doc.revisionesAdicionales.filter(function (x) { return x.calidad === d.calidad; })[0];
        if (!ra) return rech('Esa revisión adicional no corresponde');
        if (C.responsablesDe(db, null, d.calidad, empresaDoc(db, doc)).indexOf(actor.id) < 0 && !(d.calidad === 'medio_ambiente' && actor.rol === 'medio_ambiente')) return rech('La hace el responsable de esa revisión');
        ra.estado = 'COMPLETADA'; ra.por = actor.id; ra.en = A.ahora(db);
        return ok({ documento: doc.id, revision: d.calidad });
      }
      case 'D_APROBAR': {
        // D-040 §4: aprueba una persona autorizada de la empresa; queda nombre, cargo, fecha y versión
        if (!doc || doc.estado !== 'REVISION_EMPRESA') return rech('Se aprueba después de la revisión técnica y la revisión de la empresa');
        var aut = (db.aprobadoresDoc[actor.empresa] || []).filter(function (x) { return x.persona === actor.id; })[0];
        if (!aut) return rech('Aprueba una persona autorizada por la empresa');
        if (doc.revisionesAdicionales.some(function (x) { return x.estado !== 'COMPLETADA'; })) return rech('Faltan revisiones adicionales: ' + doc.revisionesAdicionales.filter(function (x) { return x.estado !== 'COMPLETADA'; }).map(function (x) { return x.calidad; }).join(', '));
        doc.estado = 'APROBADO'; doc.aprobacion = { nombre: actor.nombre, cargo: aut.cargo, fecha: A.ahora(db).slice(0, 10), version: doc.version, por: actor.id };
        doc.responsables.aprobo = actor.id; hist(doc, doc.estado);
        return ok({ documento: doc.id, version: doc.version, aprobo: actor.nombre, cargo: aut.cargo });
      }
      case 'D_PUBLICAR': {
        // D-040 §5–§6: entra en vigencia; la versión anterior queda reemplazada; se revisa lo afectado y se comunica
        if (!doc || doc.estado !== 'APROBADO') return rech('Solo se publica un documento aprobado');
        if (!esEmpresa) return rech('La publicación la hace la empresa');
        var anterior = vigente(db, doc.id);
        if (anterior) { anterior.estado = 'REEMPLAZADO'; anterior.reemplazadoPor = doc.version; hist(anterior, 'REEMPLAZADO'); }
        doc.estado = 'VIGENTE'; doc.vigenteDesde = d.vigenteDesde || A.ahora(db).slice(0, 10); hist(doc, 'VIGENTE');
        if (db.biblioteca.documentoPendiente && db.biblioteca.documentoPendiente.id === doc.id) db.biblioteca.documentoPendiente = null;
        var imp = impacto(db, doc.id, !!anterior);
        db.solicitudesDoc.forEach(function (x) { if ((x.documento === doc.id || x.id === doc.solicitud) && x.estado !== 'RESUELTA') { x.estado = 'RESUELTA'; hist(x, 'RESUELTA'); } });
        return ok({ documento: doc.id, version: doc.version, vigenteDesde: doc.vigenteDesde, fichas: imp.fichas, capsulas: imp.capsulas, comunicados: imp.personas.length }, { impacto: imp });
      }
      case 'D_REVALIDAR_FICHA': {
        var fi = C.ficha(db, d.ficha);
        if (!fi || fi.estado !== 'REVISION_POR_CAMBIO') return rech('La ficha no está en revisión por cambio');
        if (actor.rol !== 'prevencion') return rech('Revalida la ficha Prevención');
        if (fi.referencias.some(function (r) { return !C.documento(db, r); })) return rech('La ficha cita documentos que no están vigentes');
        fi.estado = 'VALIDADA'; fi.validadaPor = actor.id; fi.validadaEn = A.ahora(db).slice(0, 10);
        fi.versionesBase = fi.referencias.map(function (r) { return r + ' v' + C.documento(db, r).version; });
        return ok({ ficha: fi.id, versiones: fi.versionesBase });
      }
    }
    return rech('Evento desconocido: ' + ev.tipo);
  }

  // Lo afectado por una nueva versión: fichas de tarea (y sus listas de verificación), cápsulas y comunicación (§6)
  function impacto(db, docId, esCambio) {
    var fichas = esCambio ? db.biblioteca.fichas.filter(function (f) { return f.estado === 'VALIDADA' && f.referencias.indexOf(docId) >= 0; }) : [];
    fichas.forEach(function (f) { f.estado = 'REVISION_POR_CAMBIO'; f.motivoRevision = 'Cambió ' + docId; });
    var caps = esCambio && L ? L.porCambioDeFuente(db, docId) : [];
    // Comunicación a quienes trabajan con ese documento hoy (participantes de AST abiertas que lo citan)
    var personas = [];
    db.asts.filter(function (a) { return a.modo === 'cuadrilla' && ['CERRADA', 'ANULADA'].indexOf(a.estado) < 0 && (a.referencias || []).some(function (r) { return r.id === docId; }); }).forEach(function (a) {
      a.integrantes.forEach(function (i) { if (personas.indexOf(i.persona) < 0) personas.push(i.persona); });
    });
    var v = vigente(db, docId);
    if (personas.length) C.avisar(db, personas, 'CAMBIO_DOCUMENTO', 'Entró en vigencia ' + docId + ' v' + v.version + ' «' + v.titulo + '». Tu AST actual sigue con la versión con que se armó; las nuevas usarán esta. Pregunta a tu encargado qué cambió.', null);
    if (fichas.length) C.avisar(db, empresaResp(db, empresaDoc(db, v)), 'DOCUMENTO', 'Cambió ' + docId + ': ' + fichas.length + ' ficha(s) de tarea quedan en revisión (' + fichas.map(function (f) { return f.id; }).join(', ') + ') y no se pueden usar hasta revalidarlas.', null);
    var com = { documento: docId, version: v.version, en: A.ahora(db), fichas: fichas.map(function (f) { return f.id; }), capsulas: caps.map(function (c) { return c.id; }), personas: personas };
    db.comunicacionesDoc.push(com);
    return com;
  }

  var D = { preparar: preparar, aplicar: aplicar, registrarBrecha: registrarBrecha, versiones: versiones, vigente: vigente, impacto: impacto, ESTADO_DOC: ESTADO_DOC, TIPOS: TIPOS, NOTA: NOTA };
  if (typeof module !== 'undefined') module.exports = D; else g.ASTRA_D = D;
})(this);
