// ASTRA · motor del prototipo demo v0.1
// Ciclo de vida (05_producto/CICLO_DE_VIDA_AST_v0.1.md), reglas de la matriz reducida T01 y bitácora con hash.
// Todo vive en un objeto `db` serializable: en el navegador se guarda en localStorage, en las pruebas en memoria.
// Este archivo es la referencia para la futura función SQL `aplicar_evento` de Supabase.
(function (g) {
  'use strict';
  var MATRIZ = (typeof module !== 'undefined') ? require('./matriz.js') : g.ASTRA_MATRIZ;

  // ---------- Vocabulario cerrado ----------
  var ESTADOS = ['BORRADOR', 'PREPARADA', 'VERIFICADA', 'EMITIDA', 'EN_EJECUCION', 'DETENIDA', 'EN_REEVALUACION', 'CERRADA', 'ANULADA'];
  var ACTIVOS = ESTADOS.slice(0, 7);
  var ETAPAS = ['PREPARAR', 'EMITIR', 'INICIAR', 'INCORPORAR', 'CONTINUAR', 'REANUDAR', 'CERRAR'];
  // D-013: base = trabajador, operador · elevado = capataz, supervisor, jefe_terreno («mando») y prevencion
  var BASE = ['trabajador', 'operador'], MANDO = ['capataz', 'supervisor', 'jefe_terreno'];
  var TODOS = BASE.concat(MANDO, ['prevencion', 'medio_ambiente', 'mandante', 'jefatura']);
  var NIVEL = { trabajador: 'base', operador: 'base', capataz: 'elevado', supervisor: 'elevado', jefe_terreno: 'elevado', prevencion: 'elevado', medio_ambiente: 'elevado', mandante: 'elevado', jefatura: 'elevado', administrador: 'tecnico' };
  var PERMISOS = {
    // D-014: todos crean y preparan; crear no autoriza nada
    CREAR: TODOS, PREPARAR: TODOS, EDITAR_PREPARACION: TODOS,
    VERIFICAR: MANDO, EMITIR: MANDO, INICIAR: ['operador'].concat(MANDO),
    DETENER: TODOS, REPORTAR_CONDICION: TODOS, TOMAR_CONOCIMIENTO: TODOS, COMPLEMENTAR_DETENCION: TODOS,
    ABRIR_REEVALUACION: MANDO.concat('prevencion'), REGISTRAR_REEVALUACION: MANDO.concat('prevencion'),
    REANUDAR: MANDO, REEMPLAZAR: MANDO.concat('prevencion'), ANULAR: MANDO.concat('prevencion'),
    CERRAR: ['operador'].concat(MANDO), REGISTRAR_EVIDENCIA: BASE.concat(MANDO),
    REPORTAR_FALLA: BASE.concat(MANDO), INCORPORAR_PERSONA: MANDO, RETIRAR_PERSONA: MANDO,
    // datos maestros (fuera del ciclo de la AST, también quedan en la bitácora)
    VERIFICAR_PLACA: ['prevencion'], ASOCIAR_MANUAL: ['prevencion'], RESOLVER_DISCREPANCIA: ['prevencion'],
    LIBERAR_FALLA: ['prevencion'], VERIFICAR_COMPATIBILIDAD: ['prevencion'], VERIFICAR_HABILITACION: ['prevencion'],
    PUBLICAR_VERSION: ['prevencion'], DIAGNOSTICAR_AREA: ['prevencion', 'jefe_terreno'],
    REGISTRAR_CAPSULA: TODOS
  };
  // Quién puede registrar la evidencia o verificación de cada requisito dentro de una AST
  var VERIFICADOR = {
    R05: MANDO, R10: MANDO, R12: MANDO, R15: MANDO, R11: ['operador'].concat(MANDO),
    R07: ['operador'].concat(MANDO), R16: ['operador'].concat(MANDO), R08: ['operador'].concat(MANDO),
    R13: ['operador'].concat(MANDO), R23: ['operador'].concat(MANDO)
  };
  // Condiciones que se pueden reportar en marcha (etapa CONTINUAR): todas obligan a detener
  var CONDICIONES = {
    PEATON_EN_RUTA: { req: 'R11', texto: 'Persona en la ruta o en la zona de exclusión' },
    PERDIDA_COMUNICACION: { req: 'R13', texto: 'Pérdida de comunicación con el operador o el señalero' },
    TERRENO: { req: 'R10', texto: 'Terreno, borde o pendiente distinta a lo previsto' },
    INTERFERENCIA: { req: 'R12', texto: 'Interferencia con otro equipo o actividad no coordinada' },
    VISIBILIDAD: { req: 'R15', texto: 'Visibilidad insuficiente o servicio cercano (línea, ducto)' },
    CAMBIO_ACCESORIO: { req: 'R08', texto: 'Cambio de accesorio durante la tarea' },
    CAMBIO_TAREA: { req: 'R19', texto: 'La tarea cambió (p. ej. hay que tomar carga)' },
    CONDICION_CRITICA: { req: 'R20', texto: 'Otra condición crítica' }
  };

  // ---------- Utilidades ----------
  var K = [], H0 = [];
  (function () {
    var primos = [], n = 2;
    while (primos.length < 64) { var p = true; for (var i = 0; i < primos.length; i++) if (n % primos[i] === 0) { p = false; break; } if (p) primos.push(n); n++; }
    var frac = function (x) { return ((x - Math.floor(x)) * 4294967296) >>> 0; };
    for (var j = 0; j < 64; j++) K[j] = frac(Math.cbrt(primos[j]));
    for (var k = 0; k < 8; k++) H0[k] = frac(Math.sqrt(primos[k]));
  })();
  function rot(x, n) { return (x >>> n) | (x << (32 - n)); }
  function sha256(texto) {
    var b = new TextEncoder().encode(texto), l = b.length, nb = ((l + 9 + 63) >> 6) << 6;
    var m = new Uint8Array(nb); m.set(b); m[l] = 0x80;
    var dv = new DataView(m.buffer); dv.setUint32(nb - 4, (l * 8) >>> 0); dv.setUint32(nb - 8, Math.floor(l / 536870912));
    var H = H0.slice(), w = new Uint32Array(64);
    for (var i = 0; i < nb; i += 64) {
      for (var t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
      for (t = 16; t < 64; t++) {
        var x = w[t - 15], y = w[t - 2];
        w[t] = (w[t - 16] + (rot(x, 7) ^ rot(x, 18) ^ (x >>> 3)) + w[t - 7] + (rot(y, 17) ^ rot(y, 19) ^ (y >>> 10))) >>> 0;
      }
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], gg = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & gg)) + K[t] + w[t]) >>> 0;
        var t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
        h = gg; gg = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0;
      }
      H = [a, bb, c, d, e, f, gg, h].map(function (v, k) { return (v + H[k]) >>> 0; });
    }
    return H.map(function (v) { return v.toString(16).padStart(8, '0'); }).join('');
  }
  // RUT chileno (D-015): valida dígito verificador (módulo 11). Acepta con o sin puntos.
  function limpiarRut(r) { return String(r || '').replace(/[^0-9kK]/g, '').toUpperCase(); }
  function rutValido(r) {
    var c = limpiarRut(r); if (c.length < 2) return false;
    var cuerpo = c.slice(0, -1), dv = c.slice(-1), suma = 0, m = 2;
    for (var i = cuerpo.length - 1; i >= 0; i--) { suma += +cuerpo[i] * m; m = m === 7 ? 2 : m + 1; }
    var res = 11 - (suma % 11), esperado = res === 11 ? '0' : res === 10 ? 'K' : String(res);
    return dv === esperado;
  }
  // Fuera de la ficha el RUT se muestra enmascarado: 11.111.***-1
  function rutMascara(r) {
    var c = limpiarRut(r); if (c.length < 2) return '—';
    var cu = c.slice(0, -1), miles = cu.slice(0, -6), medio = cu.slice(-6, -3);
    return (miles ? miles + '.' : '') + medio + '.***-' + c.slice(-1);
  }
  function buscarPorIdentificador(db, texto) {
    var t = String(texto || '').trim().toUpperCase(), c = limpiarRut(t);
    return db.personas.filter(function (p) { return (p.rut && c.length > 1 && limpiarRut(p.rut) === c) || (p.ingreso && p.ingreso.toUpperCase() === t); })[0] || null;
  }
  function clon(o) { return JSON.parse(JSON.stringify(o)); }
  function porId(lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return null; }
  function fecha(base, dias) { var d = new Date(base); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); }
  function ahora(db) { return db.relojFijo || new Date().toISOString(); }
  function hoy(db) { return ahora(db).slice(0, 10); }

  // ---------- Datos ficticios (MVP_ALCANCE §6) ----------
  function semilla(opciones) {
    opciones = opciones || {};
    var base = opciones.hoy || new Date().toISOString().slice(0, 10);
    var vig = function (dias) { return { vence: fecha(base, dias), verificadoPor: 'p-elena', verificadoEn: base }; };
    var habCompleta = function () {
      return {
        licencia: Object.assign({ clase: 'Clase exigida por la fuente (demo)' }, vig(200)),
        competencia: Object.assign({ fabricante: 'Marca A', modelo: 'MT-60' }, vig(300)),
        autorizacion: Object.assign({ estado: 'VIGENTE', autoridad: 'Gerencia de faena (demo)', alcance: 'Manipulador telescópico · Faena Demo Valle Alto · T01' }, vig(180)),
        induccion: Object.assign({ impartidaPor: 'principal' }, vig(300)),
        instruccion: { asistencia: true, recepcion: true, comprension: 'APROBADA', verificadoPor: 'p-elena', verificadoEn: base }
      };
    };
    var habBasica = function () {
      return { induccion: Object.assign({ impartidaPor: 'principal' }, vig(300)), instruccion: { asistencia: true, recepcion: true, comprension: 'APROBADA', verificadoPor: 'p-elena', verificadoEn: base } };
    };
    var luis = habCompleta(); luis.autorizacion = { estado: 'PENDIENTE', autoridad: null, alcance: null, vence: null, verificadoPor: null, verificadoEn: null };
    var marta = habCompleta(); marta.licencia.vence = fecha(base, -10);
    var rosa = habBasica(); rosa.instruccion = { asistencia: true, recepcion: true, comprension: 'NO_EVALUADA', verificadoPor: null, verificadoEn: null };
    var db = {
      esDemo: true, version: 1, creadoEn: base, relojFijo: opciones.reloj || null, sinSenal: false, cola: [],
      empresas: [
        { id: 'e-principal', nombre: 'Empresa Demo Principal SpA', tipo: 'principal' },
        { id: 'e-contratista', nombre: 'Contratista Demo Sur Ltda.', tipo: 'contratista' },
        { id: 'e-mandante', nombre: 'Mandante Demo S.A.', tipo: 'mandante' }
      ],
      faena: { id: 'f-valle', nombre: 'Faena Demo Valle Alto', empresas: ['e-principal', 'e-contratista', 'e-mandante'] },
      areas: [
        { id: 'a1', nombre: 'A1 · Patio de acopio', qr: '7f3a9c2e51d84b06a1e2c9f04b7d3e58', qrVersion: 1, levantamiento: { verificadoPor: 'p-elena', verificadoEn: base },
          diagnostico: { trabajos: ['T01', 'T02', 'T07'], peligros: ['Tránsito de equipos y peatones', 'Piso irregular con acopios', 'Caída de material desde acopios'], verificadoPor: 'p-elena', verificadoEn: base } },
        { id: 'a2', nombre: 'A2 · Camino interno tramo 1', qr: 'c41e8b7a09f2463d9e5a1b2c3d4e5f60', qrVersion: 1, levantamiento: { verificadoPor: 'p-elena', verificadoEn: base },
          diagnostico: { trabajos: ['T01', 'T02'], peligros: ['Camino angosto con tránsito mixto', 'Cunetas y bordes sin protección', 'Cuadrillas de otras empresas'], verificadoPor: 'p-elena', verificadoEn: base } },
        { id: 'a3', nombre: 'A3 · Plataforma norte', qr: '9d0b6e3f2a1c48e7b5d4c3a2f1e0d9c8', qrVersion: 1, levantamiento: null, diagnostico: null }
      ],
      personas: [
        { id: 'p-jorge', rut: '11.111.111-1', ingreso: 'ING-001', nombre: 'Jorge Demo', empresa: 'e-principal', rol: 'operador', funciones: [], cargo: 'Operador de manipulador', hab: habCompleta() },
        { id: 'p-luis', rut: '22.222.222-2', ingreso: 'ING-002', nombre: 'Luis Demo', empresa: 'e-principal', rol: 'operador', funciones: [], cargo: 'Operador de manipulador', hab: luis },
        { id: 'p-marta', rut: '33.333.333-3', ingreso: 'ING-003', nombre: 'Marta Demo', empresa: 'e-principal', rol: 'operador', funciones: [], cargo: 'Operadora de manipulador', hab: marta },
        { id: 'p-rosa', rut: '44.444.444-4', ingreso: 'ING-004', nombre: 'Rosa Demo', empresa: 'e-principal', rol: 'trabajador', funciones: ['senalero'], cargo: 'Señalera / rigger', hab: rosa },
        { id: 'p-carlos', rut: '55.555.555-5', ingreso: 'ING-005', nombre: 'Carlos Demo', empresa: 'e-principal', rol: 'supervisor', funciones: ['encargado_area'], cargo: 'Supervisor de turno', hab: habBasica() },
        { id: 'p-elena', rut: '66.666.666-6', ingreso: 'ING-006', nombre: 'Elena Demo', empresa: 'e-principal', rol: 'prevencion', funciones: ['acreditacion', 'responsable_tecnico', 'mantenimiento'], cargo: 'Prevención de riesgos', hab: habBasica() },
        { id: 'p-pedro', rut: '77.777.777-7', ingreso: 'ING-007', nombre: 'Pedro Demo', empresa: 'e-principal', rol: 'capataz', funciones: [], cargo: 'Capataz de cuadrilla', hab: habBasica() },
        { id: 'p-ana', rut: '88.888.888-8', ingreso: 'ING-008', nombre: 'Ana Demo', empresa: 'e-principal', rol: 'jefe_terreno', funciones: ['encargado_area'], cargo: 'Jefa de terreno', hab: habBasica() },
        { id: 'p-mario', rut: '99.999.999-9', ingreso: 'ING-009', nombre: 'Mario Demo', empresa: 'e-principal', rol: 'trabajador', funciones: [], cargo: 'Maestro eléctrico', hab: habBasica() },
        { id: 'p-contratista', rut: '10.000.000-8', ingreso: 'CON-001', nombre: 'Coordinación Contratista Demo', empresa: 'e-contratista', rol: 'supervisor', funciones: [], cargo: 'Coordinador contratista', hab: habBasica() },
        { id: 'p-admin', nombre: 'Administración técnica', empresa: 'e-principal', rol: 'administrador', funciones: [], cargo: 'Cuenta técnica (no es persona de faena)', hab: {} }
      ],
      equipos: [{
        id: 'eq-01', codigo: 'EQ-DEMO-01', tipo: 'Manipulador telescópico', empresa: 'e-principal',
        declarado: { fabricante: 'Marca A', modelo: 'MT-60', declaradoPor: 'Empresa Demo Principal SpA' },
        verificado: { fabricante: null, modelo: null, variante: null, serie: null, anio: null, placaVerificadaPor: null, placaVerificadaEn: null },
        manual: null
      }],
      accesorios: [
        { id: 'acc-01', codigo: 'ACC-DEMO-01', tipo: 'Horquillas', equipo: 'eq-01', compatVerificadaPor: 'p-elena', compatVerificadaEn: base },
        { id: 'acc-02', codigo: 'ACC-DEMO-02', tipo: 'Plumín', equipo: 'eq-01', compatVerificadaPor: null, compatVerificadaEn: null }
      ],
      discrepancias: [{
        id: 'D01', equipo: 'eq-01', estado: 'ABIERTA', resueltaPor: null, resolucion: null,
        descripcion: 'El procedimiento PT-DEMO-07 v1 nombra a otro fabricante; el equipo se declara modelo de referencia. No se trasladan tablas, límites ni manuales entre fabricantes.'
      }],
      fallas: [],
      procedimiento: {
        codigo: 'PT-DEMO-07', titulo: 'Operación de manipulador telescópico (ficticio)',
        versiones: [
          { id: 'v1', version: 1, estado: 'PUBLICADA', aprobadoPor: 'Comité demo', evidenciaAprobacion: 'EV-DEMO-APROB-v1', nombraFabricante: 'Otro fabricante' },
          { id: 'v2', version: 2, estado: 'EN_REVISION', aprobadoPor: 'Nombres en el campo «Aprobó»', evidenciaAprobacion: null, nombraFabricante: 'Otro fabricante' }
        ]
      },
      tareas: [
        { id: 'T01', nombre: 'Traslado interno sin carga', cobertura: 'CUBIERTA', nota: 'Solo demo: reglas propuestas, no aprobadas' },
        { id: 'T02', nombre: 'Traslado con carga', cobertura: 'PENDIENTE_VALIDACION', nota: 'Falta la tabla de carga del modelo exacto (manual controlado)' },
        { id: 'T07', nombre: 'Abastecimiento o mantenimiento', cobertura: 'PENDIENTE_VALIDACION', nota: 'Falta validar el alcance con Prevención' },
        { id: 'T05', nombre: 'Carga suspendida', cobertura: 'NO_CUBIERTA', nota: 'El procedimiento general no cubre esta actividad; se requieren fuentes específicas' },
        { id: 'T06', nombre: 'Elevación de personas', cobertura: 'NO_CUBIERTA', nota: 'El procedimiento general no cubre esta actividad; se requieren fuentes específicas' }
      ],
      capsulas: [],
      asts: [], eventos: [], seq: 0
    };
    // AST del contratista en A2 (para el tablero compartido, C10). Se crea por la bitácora, como cualquier otra.
    var ext = nuevaAst(db, { empresa: 'e-contratista', area: 'a2', creadaPor: 'p-contratista' });
    ext.tareaLibre = 'Limpieza manual de cunetas'; ext.estado = 'EN_EJECUCION'; ext.haIniciado = true; ext.emitida = true;
    ext.ventana = '08:00–13:00'; ext.contacto = 'Coordinación Contratista Demo · radio canal 3';
    ext.participantes = [{ persona: 'p-contratista', funcion: 'supervisor' }];
    registrar(db, { tipo: 'SEMILLA', ast: ext.id, actor: 'p-admin', estadoPrevio: null, estadoNuevo: 'EN_EJECUCION', datos: { nota: 'AST ficticia del contratista cargada por la semilla de la demo' } });
    return db;
  }

  function nuevaAst(db, o) {
    db.seq++;
    var ast = {
      id: 'AST-' + String(db.seq).padStart(4, '0'), empresa: o.empresa, faena: db.faena.id, area: o.area, creadaPor: o.creadaPor,
      estado: 'BORRADOR', tarea: null, version: null, equipo: null, accesorio: null, ruta: [], participantes: [],
      evid: {}, conocimiento: {}, haIniciado: false, emitida: false, snapshot: null, hashEmision: null,
      detenciones: [], ciclo: 0, reeval: null, cambios: [], resultado: null, reemplazaA: o.reemplazaA || null, reemplazadaPor: null
    };
    db.asts.push(ast);
    return ast;
  }

  // ---------- Bitácora ----------
  function registrar(db, ev) {
    var previo = db.eventos.length ? db.eventos[db.eventos.length - 1].hash : '0'.repeat(64);
    var e = {
      n: db.eventos.length + 1, tipo: ev.tipo, ast: ev.ast || null, area: ev.area || null, actor: ev.actor || null,
      rol: ev.actor ? (porId(db.personas, ev.actor) || {}).rol || null : null,
      estadoPrevio: ev.estadoPrevio || null, estadoNuevo: ev.estadoNuevo || null, datos: ev.datos || {},
      ocurridoEnDispositivo: ev.ocurridoEn || ahora(db), registradoEn: ahora(db), hashPrevio: previo
    };
    e.hash = sha256(JSON.stringify(e));
    db.eventos.push(e);
    return e;
  }
  function verificarCadena(db) {
    var previo = '0'.repeat(64);
    for (var i = 0; i < db.eventos.length; i++) {
      var e = clon(db.eventos[i]), h = e.hash; delete e.hash;
      if (e.hashPrevio !== previo || sha256(JSON.stringify(e)) !== h) return { ok: false, rotaEn: i + 1 };
      previo = h;
    }
    return { ok: true, eventos: db.eventos.length };
  }

  // ---------- Habilitaciones ----------
  function estadoLicencia(db, p) {
    var l = p.hab.licencia;
    if (!l) return 'NO_REGISTRADA';
    if (!l.verificadoPor) return 'PENDIENTE_VERIFICAR';
    if (!l.vence || l.vence < hoy(db)) return 'VENCIDA';
    return 'VIGENTE';
  }
  function estadoVigencia(db, h) {
    if (!h) return 'NO_REGISTRADA';
    if (h.estado === 'PENDIENTE') return 'PENDIENTE';
    if (!h.verificadoPor) return 'PENDIENTE_VERIFICAR';
    if (!h.vence || h.vence < hoy(db)) return 'VENCIDA';
    return 'VIGENTE';
  }
  function estadoDifusion(p) {
    var i = p.hab.instruccion;
    if (!i) return { asistencia: false, recepcion: false, comprension: 'SIN_REGISTRO', verificada: false, ok: false };
    var ok = i.asistencia === true && i.recepcion === true && i.comprension === 'APROBADA' && !!i.verificadoPor;
    return { asistencia: i.asistencia === true, recepcion: i.recepcion === true, comprension: i.comprension, verificada: !!i.verificadoPor, ok: ok };
  }
  function resumenHabilitacion(db, p) {
    return {
      licencia: estadoLicencia(db, p), competencia: estadoVigencia(db, p.hab.competencia), autorizacion: estadoVigencia(db, p.hab.autorizacion),
      induccion: estadoVigencia(db, p.hab.induccion), difusion: estadoDifusion(p)
    };
  }

  // ---------- Evaluación de requisitos ----------
  function reglasDe(etapa) {
    var r = [];
    MATRIZ.requisitos.forEach(function (q) { q.porEtapa.forEach(function (pe) { if (pe.etapa === etapa) r.push({ req: q, tipo: pe.tipo }); }); });
    return r;
  }
  function claveEvid(ast, req, etapa) { return req + ':' + etapa + (etapa === 'REANUDAR' ? ':' + ast.ciclo : ''); }
  function evidencia(ast, req, etapa) { return ast.evid[claveEvid(ast, req, etapa)] || null; }
  function fallasAbiertas(db, equipoId) { return db.fallas.filter(function (f) { return f.equipo === equipoId && !f.liberadaPor; }); }
  function operadorDe(ast) { var o = ast.participantes.filter(function (x) { return x.funcion === 'operador'; })[0]; return o ? o.persona : null; }

  // Devuelve el estado de un requisito en una etapa: CUMPLIDO · PENDIENTE · NO_CUMPLE · EN_REVISION · NO_DISPONIBLE · NO_APLICA · INFORMA
  function evaluarUno(db, ast, req, tipo, etapa, ctx) {
    var id = req.id, ev = evidencia(ast, id, etapa);
    var personas = ctx && ctx.persona ? [ctx.persona] : ast.participantes.slice();
    var desdeEvidencia = function (detallePend) {
      if (ev && ev.tipo === 'REGISTRADA') return { estado: 'CUMPLIDO', detalle: ev.texto + ' — ' + nombre(db, ev.por) };
      if (ev && ev.tipo === 'NO_DISPONIBLE') return { estado: 'NO_DISPONIBLE', detalle: 'Declarada no disponible: ' + ev.texto };
      return { estado: 'PENDIENTE', detalle: detallePend };
    };
    if (tipo === 'INFORMA') return { estado: 'INFORMA', detalle: 'Matriz de EPP no cargada: brecha detectada, no bloquea.' };
    switch (id) {
      case 'R01': {
        var v = porId(db.procedimiento.versiones, ast.version || 'v1');
        if (v && v.estado === 'PUBLICADA' && v.evidenciaAprobacion) return { estado: 'CUMPLIDO', detalle: db.procedimiento.codigo + ' v' + v.version + ' publicada con evidencia de aprobación' };
        return { estado: 'NO_CUMPLE', detalle: 'Procedimiento en revisión: falta evidencia verificable de aprobación' };
      }
      case 'R02': case 'R03': {
        var ops = personas.filter(function (x) { return x.funcion === 'operador'; });
        if (!ops.length) return ctx && ctx.persona ? { estado: 'NO_APLICA', detalle: 'No se incorpora como operador' } : { estado: 'NO_CUMPLE', detalle: 'La AST no tiene operador asignado' };
        var p = porId(db.personas, ops[0].persona);
        var e = id === 'R02' ? estadoLicencia(db, p) : estadoVigencia(db, p.hab.autorizacion);
        var etiqueta = id === 'R02' ? 'Licencia' : 'Autorización interna';
        return { estado: e === 'VIGENTE' ? 'CUMPLIDO' : 'NO_CUMPLE', detalle: p.nombre + ' · ' + etiqueta + ': ' + e.toLowerCase().replace(/_/g, ' '), persona: p.id };
      }
      case 'R04': {
        var faltas = [];
        personas.forEach(function (x) {
          var p = porId(db.personas, x.persona), h = resumenHabilitacion(db, p), f = [];
          if (x.funcion === 'operador' && h.competencia !== 'VIGENTE') f.push('competencia ' + h.competencia.toLowerCase().replace(/_/g, ' '));
          if (h.induccion !== 'VIGENTE') f.push('inducción ' + h.induccion.toLowerCase().replace(/_/g, ' '));
          if (!h.difusion.ok) f.push('difusión incompleta (comprensión ' + String(h.difusion.comprension).toLowerCase().replace(/_/g, ' ') + (h.difusion.verificada ? '' : ', sin verificar') + ')');
          if (f.length) faltas.push(p.nombre + ': ' + f.join(', '));
        });
        return faltas.length ? { estado: 'NO_CUMPLE', detalle: faltas.join(' · ') } : { estado: 'CUMPLIDO', detalle: 'Competencia, inducción y difusión vigentes y verificadas' };
      }
      case 'R05': return desdeEvidencia('El supervisor debe confirmar que el frente está liberado (escanear el QR no lo libera)');
      case 'R06': {
        var eq = porId(db.equipos, ast.equipo);
        if (!eq) return { estado: 'NO_CUMPLE', detalle: 'Sin equipo identificado' };
        var f6 = [];
        if (!eq.verificado.placaVerificadaPor) f6.push('equipo declarado, placa sin cotejar');
        if (!eq.manual) f6.push('falta manual controlado del modelo');
        db.discrepancias.filter(function (d) { return d.equipo === eq.id && d.estado === 'ABIERTA'; }).forEach(function (d) { f6.push('discrepancia ' + d.id + ' abierta: no se trasladan tablas ni límites entre fabricantes'); });
        return f6.length ? { estado: 'NO_CUMPLE', detalle: f6.join(' · ') } : { estado: 'CUMPLIDO', detalle: 'Placa cotejada, manual asociado, sin discrepancias abiertas' };
      }
      case 'R07': {
        var abiertas = fallasAbiertas(db, ast.equipo);
        if (abiertas.length) return { estado: 'NO_CUMPLE', detalle: abiertas.length + ' falla(s) abierta(s) en el equipo sin liberar por Mantenimiento' };
        if (etapa === 'REANUDAR') return { estado: 'CUMPLIDO', detalle: 'Sin fallas abiertas' };
        return desdeEvidencia('Falta registrar la inspección preoperacional');
      }
      case 'R08': {
        var acc = porId(db.accesorios, ast.accesorio);
        var r8 = desdeEvidencia('Registrar el accesorio montado' + (acc ? ' (' + acc.codigo + ')' : ''));
        if (acc && !acc.compatVerificadaPor && r8.estado === 'CUMPLIDO') return { estado: 'EN_REVISION', detalle: acc.codigo + ': compatibilidad sin verificar (pendiente visible)' };
        return r8;
      }
      case 'R10': {
        if (tipo === 'PIDE_EVIDENCIA') return desdeEvidencia('Registrar revisión de la ruta al iniciar');
        var sinLev = ast.ruta.map(function (a) { return porId(db.areas, a); }).filter(function (a) { return a && !(a.levantamiento && a.levantamiento.verificadoPor); });
        if (sinLev.length) return { estado: 'NO_CUMPLE', detalle: 'Sin levantamiento verificado: ' + sinLev.map(function (a) { return a.nombre; }).join(', ') };
        if (!ast.ruta.length) return { estado: 'NO_CUMPLE', detalle: 'Ruta no declarada' };
        return { estado: 'CUMPLIDO', detalle: 'Ruta con levantamiento verificado' };
      }
      case 'R11': return desdeEvidencia('Registrar zona de exclusión revisada (sin peatones en la ruta)');
      case 'R12':
        if (tipo === 'BLOQUEA') return desdeEvidencia('Falta la liberación del coordinador del área (una confirmación unilateral no basta)');
        return desdeEvidencia('Revisar el tablero compartido del área');
      case 'R13': return desdeEvidencia('Registrar canal de comunicación y señalero (si aplica)');
      case 'R15': return desdeEvidencia('Registrar visibilidad y servicios cercanos revisados');
      case 'R16': return desdeEvidencia('Falta registrar la prueba de arranque');
      case 'R19': {
        var pend = ast.cambios.filter(function (c) { return !c.evaluado; });
        if (pend.length) return { estado: 'NO_CUMPLE', detalle: 'Cambio sin reevaluar: ' + pend.map(function (c) { return c.texto; }).join(', ') };
        var accN = ast.cambios.filter(function (c) { return c.accesorio; }).map(function (c) { return porId(db.accesorios, c.accesorio); }).filter(function (a) { return a && !a.compatVerificadaPor; });
        if (accN.length) return { estado: 'NO_CUMPLE', detalle: accN[0].codigo + ': compatibilidad sin verificar; no se reutiliza la evaluación anterior' };
        return { estado: 'CUMPLIDO', detalle: ast.cambios.length ? 'Cambios reevaluados' : 'Sin cambios relevantes' };
      }
      case 'R21': {
        var re = ast.reeval;
        if (re && re.causa && re.control) return { estado: 'CUMPLIDO', detalle: 'Causa: ' + re.causa + ' · Control: ' + re.control };
        return { estado: 'NO_CUMPLE', detalle: 'Falta registrar causa y control adoptado de la detención' };
      }
      case 'R23': return desdeEvidencia('Registrar resultado, estado del equipo y novedades');
      case 'R24': {
        var det = personas.map(function (x) {
          var p = porId(db.personas, x.persona), d = estadoDifusion(p);
          return { p: p, d: d };
        });
        var malos = det.filter(function (o) { return !o.d.ok; });
        if (!malos.length) return { estado: 'CUMPLIDO', detalle: 'Asistencia, recepción y comprensión registradas por separado' };
        return { estado: 'EN_REVISION', detalle: malos.map(function (o) { return o.p.nombre + ': asistencia ' + (o.d.asistencia ? '✔' : '✖') + ' · recepción ' + (o.d.recepcion ? '✔' : '✖') + ' · comprensión ' + (o.d.comprension === 'APROBADA' && o.d.verificada ? '✔' : '✖'); }).join(' · ') };
      }
      default: return { estado: 'PENDIENTE', detalle: 'Sin evaluador definido' };
    }
  }
  function evaluar(db, ast, etapa, ctx) {
    return reglasDe(etapa).map(function (r) {
      var res = evaluarUno(db, ast, r.req, r.tipo, etapa, ctx);
      var bloquea = (r.tipo === 'BLOQUEA' && res.estado !== 'CUMPLIDO' && res.estado !== 'NO_APLICA') || (r.tipo === 'PIDE_EVIDENCIA' && res.estado === 'PENDIENTE');
      return { id: r.req.id, titulo: r.req.titulo, tipo: r.tipo, criticidad: r.req.criticidad, verifica: r.req.verifica, estado: res.estado, detalle: res.detalle, bloquea: bloquea, visiblePendiente: !bloquea && ['NO_DISPONIBLE', 'EN_REVISION', 'NO_CUMPLE', 'PENDIENTE'].indexOf(res.estado) >= 0 };
    });
  }

  // ---------- Aplicar eventos ----------
  function nombre(db, id) { var p = porId(db.personas, id); return p ? p.nombre : id; }
  function rechazar(db, ev, motivo, faltantes) {
    registrar(db, { tipo: 'TRANSICION_RECHAZADA', ast: ev.ast, actor: ev.actor, estadoPrevio: ev._estado || null, datos: { intento: ev.tipo, motivo: motivo, faltantes: (faltantes || []).map(function (f) { return 'REF-' + f.id + ': ' + f.detalle; }) } });
    return { ok: false, motivo: motivo, faltantes: faltantes || [] };
  }
  function exito(db, ev, ast, previo, datos, extra) {
    var e = registrar(db, { tipo: ev.tipo, ast: ast ? ast.id : null, area: ev.area || (ast ? ast.area : null), actor: ev.actor, estadoPrevio: previo, estadoNuevo: ast ? ast.estado : null, datos: datos || ev.datos || {}, ocurridoEn: ev.ocurridoEn });
    return Object.assign({ ok: true, evento: e, ast: ast }, extra || {});
  }

  function aplicar(db, ev) {
    ev.datos = ev.datos || {};
    var actor = porId(db.personas, ev.actor);
    var ast = ev.ast ? porId(db.asts, ev.ast) : null;
    ev._estado = ast ? ast.estado : null;
    if (!actor) return rechazar(db, ev, 'Persona desconocida');
    if (!PERMISOS[ev.tipo]) return rechazar(db, ev, 'Evento fuera del vocabulario cerrado: ' + ev.tipo);
    if (PERMISOS[ev.tipo].indexOf(actor.rol) < 0) return rechazar(db, ev, 'El rol ' + actor.rol + ' no puede ' + ev.tipo.toLowerCase().replace(/_/g, ' '));
    if (ast && ast.empresa !== actor.empresa && ['DETENER', 'REPORTAR_CONDICION'].indexOf(ev.tipo) < 0) return rechazar(db, ev, 'La AST pertenece a otra empresa');
    var previo = ast ? ast.estado : null, d = ev.datos;
    var exigir = function (estados) { return ast && estados.indexOf(ast.estado) >= 0; };
    var bloqueos = function (etapa, ctx) { return evaluar(db, ast, etapa, ctx).filter(function (r) { return r.bloquea; }); };

    switch (ev.tipo) {
      // ----- datos maestros -----
      case 'PUBLICAR_VERSION': {
        var v = porId(db.procedimiento.versiones, d.version);
        if (!v) return rechazar(db, ev, 'Versión desconocida');
        if (!v.evidenciaAprobacion) return rechazar(db, ev, 'Falta evidencia verificable de aprobación (tener nombres en «Aprobó» no basta)', [{ id: 'R01', detalle: 'v' + v.version + ' sin evidencia de aprobación' }]);
        db.procedimiento.versiones.forEach(function (x) { if (x.estado === 'PUBLICADA') x.estado = 'RETIRADA'; });
        v.estado = 'PUBLICADA';
        return exito(db, ev, null, null, { version: v.id });
      }
      case 'VERIFICAR_PLACA': {
        var eq = porId(db.equipos, d.equipo);
        Object.assign(eq.verificado, { fabricante: d.fabricante, modelo: d.modelo, variante: d.variante || null, serie: d.serie || null, anio: d.anio || null, placaVerificadaPor: actor.id, placaVerificadaEn: hoy(db) });
        return exito(db, ev, null, null, { equipo: eq.codigo, fabricante: d.fabricante, modelo: d.modelo, serie: d.serie || null });
      }
      case 'ASOCIAR_MANUAL': {
        var eq2 = porId(db.equipos, d.equipo);
        if (!eq2.verificado.placaVerificadaPor) return rechazar(db, ev, 'Primero hay que cotejar la placa: el manual se asocia al modelo verificado, no al declarado');
        eq2.manual = { codigo: d.codigo, asociadoPor: actor.id, en: hoy(db) };
        return exito(db, ev, null, null, { equipo: eq2.codigo, manual: d.codigo });
      }
      case 'RESOLVER_DISCREPANCIA': {
        var dis = porId(db.discrepancias, d.discrepancia);
        if (!d.resolucion) return rechazar(db, ev, 'La resolución de una discrepancia exige un texto con la fuente');
        dis.estado = 'RESUELTA'; dis.resueltaPor = actor.id; dis.resolucion = d.resolucion;
        return exito(db, ev, null, null, { discrepancia: dis.id, resolucion: d.resolucion });
      }
      case 'LIBERAR_FALLA': {
        var fa = porId(db.fallas, d.falla);
        if (actor.funciones.indexOf('mantenimiento') < 0) return rechazar(db, ev, 'Solo Mantenimiento libera fallas');
        fa.liberadaPor = actor.id; fa.liberadaEn = ahora(db); fa.critica = d.critica === undefined ? fa.critica : d.critica;
        return exito(db, ev, null, null, { falla: fa.id });
      }
      case 'VERIFICAR_COMPATIBILIDAD': {
        var ac = porId(db.accesorios, d.accesorio);
        ac.compatVerificadaPor = actor.id; ac.compatVerificadaEn = hoy(db);
        return exito(db, ev, null, null, { accesorio: ac.codigo });
      }
      case 'VERIFICAR_HABILITACION': {
        var pe = porId(db.personas, d.persona), h = pe.hab[d.tipo];
        if (!h) return rechazar(db, ev, 'No hay registro de ' + d.tipo + ' para verificar');
        if (d.tipo === 'autorizacion') { if (!d.alcance) return rechazar(db, ev, 'La autorización interna exige alcance (equipo, modelo, frente, tarea)'); h.estado = 'VIGENTE'; h.alcance = d.alcance; h.autoridad = d.autoridad || 'Autoridad designada (demo)'; h.vence = d.vence || null; }
        if (d.tipo === 'instruccion') { if (h.comprension !== 'APROBADA') return rechazar(db, ev, 'No se verifica una instrucción sin comprensión aprobada (una firma no es comprensión)'); }
        h.verificadoPor = actor.id; h.verificadoEn = hoy(db);
        return exito(db, ev, null, null, { persona: pe.nombre, tipo: d.tipo });
      }
      case 'DIAGNOSTICAR_AREA': {
        // D-016: sin trabajos permitidos y peligros identificados, el área no se implementa
        var ar = porId(db.areas, d.area);
        if (!d.trabajos || !d.trabajos.length) return rechazar(db, ev, 'El diagnóstico exige indicar qué trabajos se pueden realizar en el área');
        if (!d.peligros || !d.peligros.length) return rechazar(db, ev, 'El diagnóstico exige identificar los peligros del área');
        ar.levantamiento = { verificadoPor: actor.id, verificadoEn: hoy(db) };
        ar.diagnostico = { trabajos: d.trabajos, peligros: d.peligros, verificadoPor: actor.id, verificadoEn: hoy(db) };
        return exito(db, ev, null, null, { area: ar.nombre, trabajos: d.trabajos, peligros: d.peligros });
      }
      case 'REGISTRAR_CAPSULA': {
        // La cápsula registra asistencia, recepción y comprensión. NO habilita: Prevención debe verificar la instrucción.
        var buenas = (d.respuestas || []).filter(function (x) { return x; }).length, total = (d.respuestas || []).length;
        var aprobada = total > 0 && buenas === total;
        var previa = actor.hab.instruccion;
        if (previa && previa.verificadoPor && previa.comprension === 'APROBADA') {
          // Reinstrucción de alguien ya verificado: queda registrada, no reemplaza la instrucción vigente
          db.capsulas.push({ persona: actor.id, capsula: d.capsula, buenas: buenas, total: total, en: ahora(db), reinstruccion: true });
          return exito(db, ev, null, null, { capsula: d.capsula, buenas: buenas, total: total, reinstruccion: true, nota: 'No equivale a habilitación (D-002, D-011)' });
        }
        actor.hab.instruccion = { asistencia: true, recepcion: true, comprension: aprobada ? 'APROBADA' : 'REPROBADA', verificadoPor: null, verificadoEn: null, capsula: d.capsula };
        db.capsulas.push({ persona: actor.id, capsula: d.capsula, buenas: buenas, total: total, en: ahora(db) });
        return exito(db, ev, null, null, { capsula: d.capsula, buenas: buenas, total: total, comprension: aprobada ? 'APROBADA' : 'REPROBADA', nota: 'No equivale a habilitación (D-002, D-011)' });
      }

      // ----- ciclo de la AST -----
      case 'CREAR': {
        var area = porId(db.areas, d.area);
        if (!area || d.qr !== area.qr) return rechazar(db, ev, 'QR de área no válido');
        if (!d.confirmaArea) return rechazar(db, ev, 'Falta confirmar «estoy en la zona de llenado de esta área»');
        if (!area.diagnostico) return rechazar(db, ev, 'Área no implementada: falta el levantamiento y diagnóstico (trabajos permitidos y peligros)');
        var nueva = nuevaAst(db, { empresa: actor.empresa, area: area.id, creadaPor: actor.id });
        nueva.ruta = [area.id];
        return exito(db, Object.assign({}, ev, { area: area.id }), nueva, null, { area: area.nombre, creadaPor: actor.nombre, identificador: actor.rut ? rutMascara(actor.rut) : actor.ingreso });
      }
      case 'PREPARAR': case 'EDITAR_PREPARACION': {
        if (ev.tipo === 'PREPARAR' && !exigir(['BORRADOR'])) return rechazar(db, ev, 'Solo se prepara una AST en borrador');
        if (ev.tipo === 'EDITAR_PREPARACION' && !exigir(['PREPARADA', 'VERIFICADA'])) return rechazar(db, ev, 'Solo se edita una AST preparada o verificada');
        var tarea = porId(db.tareas, d.tarea);
        if (!tarea) return rechazar(db, ev, 'Tarea desconocida');
        if (tarea.cobertura !== 'CUBIERTA') return rechazar(db, ev, tarea.cobertura === 'NO_CUBIERTA' ? 'Tarea no cubierta: ' + tarea.nota : 'Tarea pendiente de validación: ' + tarea.nota);
        var arOrigen = porId(db.areas, ast.area);
        if (arOrigen.diagnostico && arOrigen.diagnostico.trabajos.indexOf(tarea.id) < 0) return rechazar(db, ev, 'El diagnóstico de ' + arOrigen.nombre + ' no permite la tarea ' + tarea.id + ' (' + tarea.nombre + ')');
        var vPub = db.procedimiento.versiones.filter(function (x) { return x.estado === 'PUBLICADA'; })[0];
        ast.version = vPub ? vPub.id : null;
        var b0 = bloqueos('PREPARAR');
        if (b0.length) return rechazar(db, ev, 'No se puede preparar', b0);
        if (!(d.participantes || []).some(function (x) { return x.funcion === 'operador'; })) return rechazar(db, ev, 'Falta asignar operador');
        ast.tarea = tarea.id; ast.equipo = d.equipo; ast.accesorio = d.accesorio || null; ast.ruta = d.ruta && d.ruta.length ? d.ruta : [ast.area];
        ast.participantes = d.participantes; ast.conocimiento = {}; ast.estado = 'PREPARADA';
        return exito(db, ev, ast, previo, { tarea: tarea.id, version: ast.version, equipo: d.equipo, accesorio: d.accesorio || null, ruta: ast.ruta, participantes: ast.participantes });
      }
      case 'REGISTRAR_EVIDENCIA': {
        if (!exigir(ACTIVOS)) return rechazar(db, ev, 'La AST no está activa');
        if (ETAPAS.indexOf(d.etapa) < 0) return rechazar(db, ev, 'Etapa fuera del vocabulario');
        var regla = reglasDe(d.etapa).filter(function (r) { return r.req.id === d.req; })[0];
        if (!regla) return rechazar(db, ev, 'REF-' + d.req + ' no se pide en la etapa ' + d.etapa);
        if (VERIFICADOR[d.req] && VERIFICADOR[d.req].indexOf(actor.rol) < 0) return rechazar(db, ev, 'REF-' + d.req + ' lo registra: ' + VERIFICADOR[d.req].join(' o '));
        if (d.tipo === 'NO_DISPONIBLE' && regla.tipo === 'BLOQUEA') return rechazar(db, ev, 'REF-' + d.req + ' bloquea: no se puede declarar «no disponible»');
        if (d.tipo === 'NO_DISPONIBLE' && !d.texto) return rechazar(db, ev, 'Declarar «no disponible» exige motivo');
        ast.evid[claveEvid(ast, d.req, d.etapa)] = { tipo: d.tipo || 'REGISTRADA', texto: d.texto || 'Registrado', por: actor.id, en: ahora(db) };
        if (ast.estado === 'VERIFICADA' && d.etapa === 'EMITIR') { ast.estado = 'PREPARADA'; ast.conocimiento = {}; }
        return exito(db, ev, ast, previo);
      }
      case 'VERIFICAR': {
        if (!exigir(['PREPARADA'])) return rechazar(db, ev, 'Solo se verifica una AST preparada');
        var b1 = bloqueos('EMITIR');
        if (b1.length) return rechazar(db, ev, 'Faltan requisitos para emitir', b1);
        ast.estado = 'VERIFICADA';
        return exito(db, ev, ast, previo, { pendientesVisibles: evaluar(db, ast, 'EMITIR').filter(function (r) { return r.visiblePendiente; }).map(function (r) { return r.id; }) });
      }
      case 'TOMAR_CONOCIMIENTO': {
        if (!exigir(['VERIFICADA', 'EMITIDA', 'EN_EJECUCION'])) return rechazar(db, ev, 'No hay nada que tomar en conocimiento en este estado');
        if (!ast.participantes.some(function (x) { return x.persona === actor.id; })) return rechazar(db, ev, 'Solo los participantes toman conocimiento, cada uno por sí mismo');
        ast.conocimiento[actor.id] = ahora(db);
        return exito(db, ev, ast, previo);
      }
      case 'EMITIR': {
        if (!exigir(['VERIFICADA'])) return rechazar(db, ev, 'Solo se emite una AST verificada');
        var b2 = bloqueos('EMITIR');
        if (b2.length) { ast.estado = 'PREPARADA'; registrar(db, { tipo: 'INVALIDAR', ast: ast.id, actor: null, estadoPrevio: 'VERIFICADA', estadoNuevo: 'PREPARADA', datos: { motivo: 'Cambió una condición entre la verificación y la emisión' } }); return rechazar(db, ev, 'La reevaluación al emitir falló', b2); }
        var sinTomar = ast.participantes.filter(function (x) { return !ast.conocimiento[x.persona]; });
        if (sinTomar.length) return rechazar(db, ev, 'Falta la toma de conocimiento de: ' + sinTomar.map(function (x) { return nombre(db, x.persona); }).join(', '));
        ast.estado = 'EMITIDA'; ast.emitida = true;
        ast.snapshot = clon({ ast: Object.assign({}, ast, { snapshot: null }), requisitos: evaluar(db, ast, 'EMITIR'), emitidaPor: actor.id, en: ahora(db) });
        ast.hashEmision = sha256(JSON.stringify(ast.snapshot));
        return exito(db, ev, ast, previo, { hashEmision: ast.hashEmision });
      }
      case 'INICIAR': {
        if (!exigir(['EMITIDA'])) return rechazar(db, ev, 'Solo se inicia una AST emitida');
        if (actor.rol === 'operador' && operadorDe(ast) !== actor.id) return rechazar(db, ev, 'Solo el operador asignado puede iniciar');
        var b3 = bloqueos('INICIAR');
        if (b3.length) return rechazar(db, ev, 'Faltan requisitos para iniciar', b3);
        ast.estado = 'EN_EJECUCION'; ast.haIniciado = true;
        return exito(db, ev, ast, previo);
      }
      case 'DETENER': case 'REPORTAR_CONDICION': {
        // Nunca se rechaza (D-002 §4). Si la AST ya terminó, queda como condición del área.
        var cond = d.condicion ? CONDICIONES[d.condicion] : null;
        if (!ast || ACTIVOS.indexOf(ast.estado) < 0) {
          return exito(db, Object.assign({}, ev, { tipo: 'CONDICION_DE_AREA', area: d.area || (ast && ast.area) }), null, null, { reporte: cond ? cond.texto : (d.motivo || 'Detención reportada'), astTerminada: ast ? ast.id : null });
        }
        if (d.condicion === 'CAMBIO_ACCESORIO') { ast.cambios.push({ texto: 'Cambio de accesorio a ' + (porId(db.accesorios, d.accesorio) || {}).codigo, accesorio: d.accesorio, evaluado: false }); ast.accesorio = d.accesorio; }
        if (d.condicion === 'CAMBIO_TAREA') ast.cambios.push({ texto: d.motivo || 'La tarea cambió', evaluado: false, cambiaTarea: true });
        var rep = { por: actor.id, ocurridoEn: ev.ocurridoEn || ahora(db), registradoEn: ahora(db), condicion: d.condicion || null, req: cond ? cond.req : 'R20', motivo: cond ? cond.texto : (d.motivo || null), estadoPrevio: ast.estado };
        ast.detenciones.push(rep);
        if (ast.estado !== 'DETENIDA') { ast.estado = 'DETENIDA'; ast.ciclo++; ast.reeval = null; }
        return exito(db, Object.assign({}, ev, { tipo: 'DETENER' }), ast, previo, { condicion: d.condicion || null, req: rep.req, motivo: rep.motivo, esParticipante: ast.participantes.some(function (x) { return x.persona === actor.id; }), avisoA: ['supervisor', 'prevencion'] });
      }
      case 'COMPLEMENTAR_DETENCION': {
        if (!exigir(['DETENIDA', 'EN_REEVALUACION'])) return rechazar(db, ev, 'No hay detención que complementar');
        var ult = ast.detenciones[ast.detenciones.length - 1];
        ult.complemento = (ult.complemento ? ult.complemento + ' · ' : '') + d.texto;
        return exito(db, ev, ast, previo);
      }
      case 'ABRIR_REEVALUACION': {
        if (!exigir(['DETENIDA'])) return rechazar(db, ev, 'Solo se abre reevaluación desde DETENIDA');
        ast.estado = 'EN_REEVALUACION'; ast.reeval = { abiertaPor: actor.id, causa: null, control: null };
        return exito(db, ev, ast, previo);
      }
      case 'REGISTRAR_REEVALUACION': {
        if (!exigir(['EN_REEVALUACION'])) return rechazar(db, ev, 'No hay reevaluación abierta');
        if (d.causa) ast.reeval.causa = d.causa;
        if (d.control) ast.reeval.control = d.control;
        if (d.cambiosEvaluados) ast.cambios.forEach(function (c) { c.evaluado = true; });
        return exito(db, ev, ast, previo);
      }
      case 'REANUDAR': {
        if (!exigir(['EN_REEVALUACION'])) return rechazar(db, ev, 'Desde DETENIDA solo se sale abriendo la reevaluación');
        if (ast.cambios.some(function (c) { return c.cambiaTarea; })) return rechazar(db, ev, 'El cambio convierte la tarea en otra: no se reanuda, se reemplaza por una AST nueva', [{ id: 'R19', detalle: 'Cambio de tarea' }]);
        var destino = ast.haIniciado ? 'EN_EJECUCION' : (ast.emitida ? 'EMITIDA' : 'PREPARADA');
        var b4 = destino === 'EN_EJECUCION' ? bloqueos('REANUDAR') : evaluar(db, ast, 'REANUDAR').filter(function (r) { return r.bloquea && r.id === 'R21'; });
        if (b4.length) return rechazar(db, ev, 'Faltan requisitos para reanudar', b4);
        var mismo = ast.detenciones.some(function (x) { return x.por === actor.id; });
        ast.estado = destino;
        return exito(db, ev, ast, previo, { causa: ast.reeval.causa, control: ast.reeval.control, mismoQueDetuvo: mismo, reanudaciones: db.eventos.filter(function (e) { return e.ast === ast.id && e.tipo === 'REANUDAR'; }).length + 1 });
      }
      case 'REEMPLAZAR': {
        if (!exigir(['EN_REEVALUACION'])) return rechazar(db, ev, 'Solo se reemplaza desde la reevaluación');
        var nv = nuevaAst(db, { empresa: ast.empresa, area: ast.area, creadaPor: actor.id, reemplazaA: ast.id });
        nv.ruta = [ast.area];
        ast.estado = 'CERRADA'; ast.resultado = { tipo: 'REEMPLAZADA', texto: d.motivo || 'Reemplazada por ' + nv.id }; ast.reemplazadaPor = nv.id;
        return exito(db, ev, ast, previo, { nueva: nv.id, motivo: d.motivo || null }, { nueva: nv });
      }
      case 'CERRAR': {
        if (!(exigir(['EN_EJECUCION']) || (exigir(['EN_REEVALUACION']) && ast.haIniciado))) return rechazar(db, ev, 'Solo se cierra una AST que inició (si no inició, se anula)');
        if (actor.rol === 'operador' && operadorDe(ast) !== actor.id) return rechazar(db, ev, 'Solo el operador asignado o el supervisor cierran');
        if (d.resultado) ast.evid[claveEvid(ast, 'R23', 'CERRAR')] = { tipo: 'REGISTRADA', texto: d.resultado, por: actor.id, en: ahora(db) };
        var b5 = bloqueos('CERRAR');
        if (b5.length) return rechazar(db, ev, 'Falta registrar el cierre (o declararlo no disponible con motivo)', b5);
        (d.fallas || []).forEach(function (txt) { db.fallas.push({ id: 'F-' + String(db.fallas.length + 1).padStart(3, '0'), equipo: ast.equipo, ast: ast.id, descripcion: txt, critica: null, reportadaPor: actor.id, reportadaEn: ahora(db), liberadaPor: null }); });
        ast.estado = 'CERRADA';
        var pend = fallasAbiertas(db, ast.equipo).map(function (f) { return f.id + ' ' + f.descripcion; })
          .concat(Object.keys(ast.evid).filter(function (k) { return ast.evid[k].tipo === 'NO_DISPONIBLE'; }).map(function (k) { return 'Evidencia no disponible ' + k.split(':')[0]; }));
        ast.resultado = { tipo: 'COMPLETA', texto: d.resultado || '', horometro: d.horometro || null, pendientes: pend };
        return exito(db, ev, ast, previo, { resultado: d.resultado || null, horometro: d.horometro || null, pendientes: pend });
      }
      case 'ANULAR': {
        if (!exigir(['BORRADOR', 'PREPARADA', 'VERIFICADA', 'EMITIDA', 'EN_REEVALUACION'])) return rechazar(db, ev, 'No se puede anular en este estado');
        if (ast.haIniciado) return rechazar(db, ev, 'Una AST que ya inició no se anula: se cierra');
        if (!d.motivo) return rechazar(db, ev, 'Anular exige motivo');
        ast.estado = 'ANULADA'; ast.resultado = { tipo: 'ANULADA', texto: d.motivo };
        return exito(db, ev, ast, previo);
      }
      case 'REPORTAR_FALLA': {
        if (!exigir(ACTIVOS)) return rechazar(db, ev, 'La AST no está activa');
        var falla = { id: 'F-' + String(db.fallas.length + 1).padStart(3, '0'), equipo: ast.equipo, ast: ast.id, descripcion: d.texto, critica: null, reportadaPor: actor.id, reportadaEn: ahora(db), liberadaPor: null };
        db.fallas.push(falla);
        var r = exito(db, ev, ast, previo, { falla: falla.id, texto: d.texto });
        // Una falla en marcha, crítica o sin clasificar, obliga a detener (R07)
        if (ast.estado === 'EN_EJECUCION') return aplicar(db, { tipo: 'DETENER', ast: ast.id, actor: actor.id, datos: { motivo: 'Falla ' + falla.id + ': ' + d.texto } });
        if (ast.estado === 'VERIFICADA') { ast.estado = 'PREPARADA'; registrar(db, { tipo: 'INVALIDAR', ast: ast.id, estadoPrevio: 'VERIFICADA', estadoNuevo: 'PREPARADA', datos: { motivo: 'Se abrió una falla del equipo' } }); }
        return r;
      }
      case 'INCORPORAR_PERSONA': {
        if (!exigir(['EMITIDA', 'EN_EJECUCION'])) return rechazar(db, ev, 'Se incorporan personas a una AST emitida o en ejecución');
        var nuevo = { persona: d.persona, funcion: d.funcion || 'ayudante' };
        if (ast.participantes.some(function (x) { return x.persona === d.persona; })) return rechazar(db, ev, 'Ya es participante');
        var b6 = bloqueos('INCORPORAR', { persona: nuevo });
        if (b6.length) return rechazar(db, ev, 'No se puede incorporar a ' + nombre(db, d.persona), b6);
        ast.participantes.push(nuevo);
        return exito(db, ev, ast, previo, nuevo);
      }
      case 'RETIRAR_PERSONA': {
        if (!exigir(['EMITIDA', 'EN_EJECUCION'])) return rechazar(db, ev, 'Estado no válido');
        if (operadorDe(ast) === d.persona) return rechazar(db, ev, 'No se retira al operador: se detiene y reevalúa');
        ast.participantes = ast.participantes.filter(function (x) { return x.persona !== d.persona; });
        return exito(db, ev, ast, previo, { persona: d.persona });
      }
    }
    return rechazar(db, ev, 'Evento no implementado: ' + ev.tipo);
  }

  // DETENER sin señal: se guarda en el teléfono con su hora y se envía al volver la conexión (ambas horas quedan).
  function detenerSinSenal(db, ev) { ev.ocurridoEn = ahora(db); ev.tipo = 'DETENER'; db.cola.push(ev); return { ok: true, enCola: db.cola.length }; }
  function sincronizar(db) { var n = 0; while (db.cola.length) { aplicar(db, db.cola.shift()); n++; } return n; }

  // ---------- Consultas con «RLS» simulada ----------
  function astVisible(db, personaId, astId) {
    var p = porId(db.personas, personaId), a = porId(db.asts, astId);
    return (p && a && p.empresa === a.empresa) ? a : null;
  }
  function tableroArea(db, personaId, areaId) {
    var p = porId(db.personas, personaId);
    return db.asts.filter(function (a) {
      var activa = a.modo === 'cuadrilla' ? ['CERRADA', 'ANULADA'].indexOf(a.estado) < 0 : ACTIVOS.indexOf(a.estado) >= 0;
      return activa && (a.area === areaId || (a.ruta || []).indexOf(areaId) >= 0);
    }).map(function (a) {
      var tarea = a.modo === 'cuadrilla' ? (a.nombre || 'AST por armar') : a.tarea ? porId(db.tareas, a.tarea).nombre : (a.tareaLibre || 'Tarea por definir');
      if (p && p.empresa === a.empresa) return { propia: true, id: a.id, tarea: tarea, estado: a.estado, ast: a };
      var emp = porId(db.empresas, a.empresa);
      return { propia: false, id: a.id, tarea: tarea, estado: a.estado, empresa: emp.nombre, ventana: a.ventana || '—', contacto: a.contacto || '—' };
    });
  }

  var API = {
    BASE: BASE, MANDO: MANDO, NIVEL: NIVEL, rutValido: rutValido, rutMascara: rutMascara, buscarPorIdentificador: buscarPorIdentificador,
    ESTADOS: ESTADOS, ACTIVOS: ACTIVOS, ETAPAS: ETAPAS, PERMISOS: PERMISOS, CONDICIONES: CONDICIONES, MATRIZ: MATRIZ,
    semilla: semilla, aplicar: aplicar, evaluar: evaluar, resumenHabilitacion: resumenHabilitacion, fallasAbiertas: fallasAbiertas,
    verificarCadena: verificarCadena, sha256: sha256, detenerSinSenal: detenerSinSenal, sincronizar: sincronizar,
    astVisible: astVisible, registrar: registrar, ahora: ahora, tableroArea: tableroArea, porId: porId, nombre: nombre, operadorDe: operadorDe, evidencia: evidencia, reglasDe: reglasDe
  };
  if (typeof module !== 'undefined') module.exports = API; else g.ASTRA = API;
})(this);
