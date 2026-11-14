// GENERADO por generar-matriz.js desde MATRIZ_REDUCIDA_traslado_interno_sin_carga_v0.1.json. No editar a mano.
(function (g) { var M = {
 "version": "0.1",
 "estado": "PROPUESTA_NO_APROBADA",
 "tarea": {
  "id_origen": "T01",
  "nombre": "Traslado interno sin carga",
  "equipo": "Manipulador telescópico (equipo del caso: modelo de referencia declarado, placa sin cotejar — D-004)",
  "definicion_operativa_propuesta": "Desplazar el manipulador telescópico vacío (sin carga en el accesorio) entre dos puntos de la faena por una ruta definida, en posición de traslado según el manual aplicable. Si en algún momento se toma carga, se cambia o usa el accesorio para trabajar, se eleva a personas o se interviene el equipo, deja de ser T01 (ver exclusiones y REF-R19).",
  "cobertura_documental": "PENDIENTE_DE_VALIDACION (el JSON fuente: 'requiere confirmar tarea, frente, equipo y reglas aplicables')"
 },
 "requisitos": [
  {
   "id": "R01",
   "idOrigen": "REF-R01",
   "titulo": "Homologación y versión del procedimiento",
   "tipoPrincipal": "BLOQUEA",
   "porEtapa": [
    {
     "etapa": "PREPARAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "prevencion",
   "evidenciaMinima": [
    "Copia controlada vigente",
    "Evidencia verificable de aprobación y homologación",
    "Registro de versión y alcance"
   ],
   "siFalta": "La tarea se muestra como 'procedimiento en revisión' y no se puede crear una AST con esa versión. Tener nombres en el campo 'Aprobó' no basta.",
   "casos": [
    "C01"
   ]
  },
  {
   "id": "R02",
   "idOrigen": "REF-R02",
   "titulo": "Licencia del operador",
   "tipoPrincipal": "BLOQUEA",
   "porEtapa": [
    {
     "etapa": "EMITIR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "INICIAR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "INCORPORAR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "prevencion (función acreditación); el supervisor la ve",
   "evidenciaMinima": [
    "Registro de licencia (clase exigida por la fuente) con vigencia",
    "Fuente de verificación, quién verificó y cuándo"
   ],
   "siFalta": "La persona aparece con 'Licencia: no registrada / pendiente de verificar / vencida' y no puede asignarse como operador; la transición se rechaza con el motivo y queda el intento registrado.",
   "casos": [
    "C02"
   ]
  },
  {
   "id": "R03",
   "idOrigen": "REF-R03",
   "titulo": "Autorización interna para operar",
   "tipoPrincipal": "BLOQUEA",
   "porEtapa": [
    {
     "etapa": "EMITIR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "INICIAR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "INCORPORAR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "prevencion (como autoridad designada en la demo)",
   "evidenciaMinima": [
    "Autorización con persona, alcance (equipo/modelo/frente/tarea) y autoridad emisora",
    "Vigencia definida por la fuente (si no hay, queda null y no se considera vigente)"
   ],
   "siFalta": "'Autorización interna: pendiente'. Nunca se infiere de un curso, una inducción ni una cápsula.",
   "casos": [
    "C02"
   ]
  },
  {
   "id": "R04",
   "idOrigen": "REF-R04",
   "titulo": "Competencia, inducción y difusión",
   "tipoPrincipal": "BLOQUEA",
   "porEtapa": [
    {
     "etapa": "EMITIR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "INCORPORAR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "prevencion",
   "evidenciaMinima": [
    "Competencia específica en el modelo verificada",
    "Inducciones de la empresa principal y del mandante, con versión",
    "Registro de difusión del procedimiento vigente (ver REF-R24)"
   ],
   "siFalta": "Se muestran tres estados separados (competencia / inducción / difusión). Basta uno pendiente para bloquear. Escuchar un audio o ver una cápsula no es aprobación.",
   "casos": [
    "C02",
    "C08"
   ]
  },
  {
   "id": "R05",
   "idOrigen": "REF-R05",
   "titulo": "Tarea y frente efectivamente liberado",
   "tipoPrincipal": "BLOQUEA",
   "porEtapa": [
    {
     "etapa": "EMITIR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "INICIAR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "supervisor",
   "evidenciaMinima": [
    "Orden o asignación de la tarea",
    "Áreas de origen, destino y ruta confirmadas",
    "Liberación del frente con responsable y hora"
   ],
   "siFalta": "Escanear el QR no libera el frente. El requisito queda PENDIENTE y se deriva al encargado de área.",
   "casos": []
  },
  {
   "id": "R06",
   "idOrigen": "REF-R06",
   "titulo": "Modelo, manual y tabla aplicable (para T01: identificación del equipo y manual; la tabla de carga no aplica)",
   "tipoPrincipal": "BLOQUEA",
   "porEtapa": [
    {
     "etapa": "EMITIR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "INICIAR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "prevencion (función responsable técnico) + supervisor",
   "evidenciaMinima": [
    "Identificador del equipo cotejado con la placa (fabricante, modelo, variante, serie)",
    "Manual controlado del fabricante para ese modelo/variante",
    "Versión del procedimiento que nombra al equipo correcto (D01 resuelta)"
   ],
   "siFalta": "Se muestra 'Equipo declarado, placa sin cotejar' y la discrepancia D01. No se puede emitir. Prohibido trasladar manuales, tablas o límites entre fabricantes.",
   "casos": [
    "C04",
    "C11"
   ]
  },
  {
   "id": "R07",
   "idOrigen": "REF-R07",
   "titulo": "Inspección preoperacional y fallas",
   "tipoPrincipal": "BLOQUEA",
   "porEtapa": [
    {
     "etapa": "INICIAR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "CONTINUAR",
     "tipo": "OBLIGA_A_DETENER"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "operador (registra); prevencion como Mantenimiento en la demo (libera fallas)",
   "evidenciaMinima": [
    "Resultado del checklist del turno con su versión",
    "Identificador del equipo",
    "Liberación de cada falla por personal autorizado"
   ],
   "siFalta": "No se puede iniciar. Un checklist incompleto no equivale a equipo liberado. Una falla crítica reportada en marcha dispara DETENER. Las fallas abiertas del equipo se muestran al preparar cualquier AST nueva con ese equipo.",
   "casos": [
    "C09"
   ]
  },
  {
   "id": "R08",
   "idOrigen": "REF-R08",
   "titulo": "Accesorio identificado y compatible (accesorio montado durante el traslado)",
   "tipoPrincipal": "PIDE_EVIDENCIA",
   "porEtapa": [
    {
     "etapa": "EMITIR",
     "tipo": "PIDE_EVIDENCIA"
    },
    {
     "etapa": "INICIAR",
     "tipo": "PIDE_EVIDENCIA"
    },
    {
     "etapa": "CONTINUAR",
     "tipo": "OBLIGA_A_DETENER"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "PIDE_EVIDENCIA"
    }
   ],
   "criticidad": "media",
   "verifica": "operador (registra) + supervisor (ve)",
   "evidenciaMinima": [
    "Identificación del accesorio montado",
    "Compatibilidad documentada con el equipo",
    "Verificación del acople"
   ],
   "siFalta": "Pendiente visible. Si el accesorio no tiene compatibilidad verificada, se marca EN_REVISION. Cambiar de accesorio en marcha obliga a detener y reevaluar (REF-R19); no se reutiliza la evaluación anterior.",
   "casos": [
    "C03"
   ]
  },
  {
   "id": "R10",
   "idOrigen": "REF-R10",
   "titulo": "Terreno, ruta, apoyo y bordes",
   "tipoPrincipal": "BLOQUEA",
   "porEtapa": [
    {
     "etapa": "EMITIR",
     "tipo": "BLOQUEA"
    },
    {
     "etapa": "INICIAR",
     "tipo": "PIDE_EVIDENCIA"
    },
    {
     "etapa": "CONTINUAR",
     "tipo": "OBLIGA_A_DETENER"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "supervisor",
   "evidenciaMinima": [
    "Ruta definida en el levantamiento del área",
    "Evaluación del terreno con autor y fecha",
    "Confirmación en terreno al iniciar (foto opcional)"
   ],
   "siFalta": "Si el área no tiene levantamiento verificado, el requisito queda PENDIENTE y bloquea la emisión. No se inventan pendientes, distancias ni capacidad portante (slope_limits y soil_bearing_capacity siguen en null).",
   "casos": []
  },
  {
   "id": "R11",
   "idOrigen": "REF-R11",
   "titulo": "Personas y zona de exclusión (peatones en la ruta)",
   "tipoPrincipal": "OBLIGA_A_DETENER",
   "porEtapa": [
    {
     "etapa": "INICIAR",
     "tipo": "PIDE_EVIDENCIA"
    },
    {
     "etapa": "CONTINUAR",
     "tipo": "OBLIGA_A_DETENER"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "PIDE_EVIDENCIA"
    }
   ],
   "criticidad": "alta",
   "verifica": "supervisor + operador",
   "evidenciaMinima": [
    "Segregación o demarcación de la ruta según lo definido por la faena",
    "Coordinación con personal de apoyo cuando proceda"
   ],
   "siFalta": "Pendiente visible al iniciar. Una persona en la trayectoria se reporta como condición y dispara DETENER; la detención física no espera al formulario.",
   "casos": []
  },
  {
   "id": "R12",
   "idOrigen": "REF-R12",
   "titulo": "Coordinación entre equipos y actividades",
   "tipoPrincipal": "OBLIGA_A_DETENER",
   "porEtapa": [
    {
     "etapa": "EMITIR",
     "tipo": "PIDE_EVIDENCIA"
    },
    {
     "etapa": "CONTINUAR",
     "tipo": "OBLIGA_A_DETENER"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "supervisor",
   "evidenciaMinima": [
    "Revisión del tablero de trabajos activos en las áreas de la ruta",
    "Zona y ventana temporal afectadas",
    "Responsable y resolución de cada interferencia"
   ],
   "siFalta": "Al emitir: pendiente visible si no se revisó el tablero. En marcha: interferencia no coordinada obliga a detener. Para reanudar se exige la liberación del coordinador; una confirmación unilateral no basta.",
   "casos": [
    "C10"
   ]
  },
  {
   "id": "R13",
   "idOrigen": "REF-R13",
   "titulo": "Comunicaciones y señalero",
   "tipoPrincipal": "OBLIGA_A_DETENER",
   "porEtapa": [
    {
     "etapa": "INICIAR",
     "tipo": "PIDE_EVIDENCIA"
    },
    {
     "etapa": "CONTINUAR",
     "tipo": "OBLIGA_A_DETENER"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "PIDE_EVIDENCIA"
    }
   ],
   "criticidad": "media",
   "verifica": "operador + supervisor",
   "evidenciaMinima": [
    "Canal y método acordados",
    "Prueba de comunicación al iniciar",
    "Identidad y función del señalero cuando la evaluación lo exija"
   ],
   "siFalta": "Pendiente visible. La pérdida de comunicación se reporta y dispara DETENER. La app no afirma detectar la pérdida por sí sola.",
   "casos": [
    "C06"
   ]
  },
  {
   "id": "R14",
   "idOrigen": "REF-R14",
   "titulo": "Protección personal según contexto",
   "tipoPrincipal": "INFORMA",
   "porEtapa": [
    {
     "etapa": "EMITIR",
     "tipo": "INFORMA"
    },
    {
     "etapa": "INCORPORAR",
     "tipo": "INFORMA"
    }
   ],
   "criticidad": "baja",
   "verifica": "supervisor",
   "evidenciaMinima": [
    "Toma de conocimiento de la matriz de EPP aplicable cuando exista"
   ],
   "siFalta": "Se muestra 'Matriz de EPP no cargada' como brecha detectada, sin bloquear. Prevención puede subir su tipo cuando apruebe la matriz.",
   "casos": []
  },
  {
   "id": "R15",
   "idOrigen": "REF-R15",
   "titulo": "Visibilidad, ambiente y servicios",
   "tipoPrincipal": "OBLIGA_A_DETENER",
   "porEtapa": [
    {
     "etapa": "EMITIR",
     "tipo": "PIDE_EVIDENCIA"
    },
    {
     "etapa": "CONTINUAR",
     "tipo": "OBLIGA_A_DETENER"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "PIDE_EVIDENCIA"
    }
   ],
   "criticidad": "alta",
   "verifica": "supervisor",
   "evidenciaMinima": [
    "Servicios en la ruta identificados (aéreos y enterrados)",
    "Observación de visibilidad y clima con hora y autor"
   ],
   "siFalta": "Pendiente visible al emitir. Visibilidad insuficiente o proximidad a un servicio se reporta y dispara DETENER. No se inventan umbrales de viento, lluvia ni distancia (weather_limits y minimum_clearances siguen en null).",
   "casos": []
  },
  {
   "id": "R16",
   "idOrigen": "REF-R16",
   "titulo": "Preparación y prueba de arranque",
   "tipoPrincipal": "BLOQUEA",
   "porEtapa": [
    {
     "etapa": "INICIAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "operador",
   "evidenciaMinima": [
    "Resultado de la preparación y prueba de arranque",
    "Registro de desviaciones"
   ],
   "siFalta": "No se puede iniciar. Si el resultado es anormal, se registra como falla (REF-R07). No se reemplaza la prueba física por una casilla genérica.",
   "casos": []
  },
  {
   "id": "R19",
   "idOrigen": "REF-R19",
   "titulo": "Cambios relevantes durante la tarea",
   "tipoPrincipal": "OBLIGA_A_DETENER",
   "porEtapa": [
    {
     "etapa": "CONTINUAR",
     "tipo": "OBLIGA_A_DETENER"
    },
    {
     "etapa": "REANUDAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "supervisor; prevencion si el cambio es de tarea",
   "evidenciaMinima": [
    "Evento con el cambio y su motivo",
    "Reevaluación vinculada o nueva AST"
   ],
   "siFalta": "Para reanudar se exige la reevaluación registrada. Si el cambio convierte la tarea en otra (p. ej. tomar carga = T02), no se reanuda: se cierra como 'reemplazada' y se abre una AST nueva. La emisión original nunca se edita.",
   "casos": [
    "C03",
    "C05"
   ]
  },
  {
   "id": "R20",
   "idOrigen": "REF-R20",
   "titulo": "Condición crítica y detención",
   "tipoPrincipal": "OBLIGA_A_DETENER",
   "porEtapa": [
    {
     "etapa": "CONTINUAR",
     "tipo": "OBLIGA_A_DETENER"
    }
   ],
   "criticidad": "alta",
   "verifica": "cualquier persona de la faena (todos los roles)",
   "evidenciaMinima": [
    "Registro posterior: actor, hora del dispositivo y del servidor, motivo (puede completarse después)"
   ],
   "siFalta": "Nada bloquea la detención. El motivo se completa después; la app avisa al supervisor y a Prevención.",
   "casos": [
    "C06"
   ]
  },
  {
   "id": "R21",
   "idOrigen": "REF-R21",
   "titulo": "Reinicio después de una detención",
   "tipoPrincipal": "BLOQUEA",
   "porEtapa": [
    {
     "etapa": "REANUDAR",
     "tipo": "BLOQUEA"
    }
   ],
   "criticidad": "alta",
   "verifica": "supervisor",
   "evidenciaMinima": [
    "Causa",
    "Control adoptado",
    "Verificación de la resolución",
    "Autorización del supervisor vinculada a la reevaluación"
   ],
   "siFalta": "La reanudación se rechaza y queda pendiente; la historia de la detención se conserva.",
   "casos": [
    "C07"
   ]
  },
  {
   "id": "R23",
   "idOrigen": "REF-R23",
   "titulo": "Cierre, fallas y entrega de turno",
   "tipoPrincipal": "PIDE_EVIDENCIA",
   "porEtapa": [
    {
     "etapa": "CERRAR",
     "tipo": "PIDE_EVIDENCIA"
    }
   ],
   "criticidad": "media",
   "verifica": "operador (registra) + supervisor (cierra)",
   "evidenciaMinima": [
    "Resultado (completa / parcial / reemplazada)",
    "Estado y ubicación del equipo, horómetro",
    "Fallas, daños y novedades",
    "Comunicación o recepción de la entrega"
   ],
   "siFalta": "Se puede cerrar, pero con pendientes visibles. Una falla abierta sigue abierta en el equipo y aparece en la próxima AST que lo use.",
   "casos": [
    "C09"
   ]
  },
  {
   "id": "R24",
   "idOrigen": "REF-R24",
   "titulo": "Instrucción y compromiso individual",
   "tipoPrincipal": "PIDE_EVIDENCIA",
   "porEtapa": [
    {
     "etapa": "EMITIR",
     "tipo": "PIDE_EVIDENCIA"
    },
    {
     "etapa": "INCORPORAR",
     "tipo": "PIDE_EVIDENCIA"
    }
   ],
   "criticidad": "media",
   "verifica": "prevencion",
   "evidenciaMinima": [
    "Versión del contenido impartido",
    "Persona, relator, fecha y duración",
    "Recepción y, por separado, comprensión según lo que defina Prevención"
   ],
   "siFalta": "Se muestran por separado asistencia, recepción y comprensión. No se infiere instrucción de un formulario vacío ni comprensión de una firma.",
   "casos": [
    "C08"
   ]
  }
 ],
 "excluidos": [
  {
   "id": "R09",
   "titulo": "Datos de carga y configuración",
   "motivo": "No hay carga; si aparece una carga, la tarea pasa a ser T02 y REF-R19 obliga a detener y abrir otra AST."
  },
  {
   "id": "R17",
   "titulo": "Alcance especial: carga suspendida",
   "motivo": "Es la tarea T05, no cubierta por el REF-01 solo; la app la muestra como NO_CUBIERTA y no permite elegirla."
  },
  {
   "id": "R18",
   "titulo": "Alcance especial: elevación de personas",
   "motivo": "Es la tarea T06, no cubierta por el REF-01 solo; se muestra como NO_CUBIERTA, sin botón para habilitarla."
  },
  {
   "id": "R22",
   "titulo": "Abastecimiento e intervención autorizada",
   "motivo": "Es la tarea T07; si hace falta abastecer o intervenir, se detiene o cierra el traslado y se abre otra AST."
  }
 ]
};
if (typeof module !== 'undefined') module.exports = M; else g.ASTRA_MATRIZ = M; })(this);
