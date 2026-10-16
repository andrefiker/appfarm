(function (root) {
  'use strict';
  const fields = ['id','name','lastSession','status','driveFolderUrl','dossierUrl','roadmapUrl','notebookUrl','briefing','postura'];
  const dossierFields = ['quadroReferencia','incongruencia','condicoesValor','climaRelacional','tendenciaAtualizante'];
  const cbStringFields = ['experiential_avoidance','cognitive_fusion','crb1_in_session','crb2_in_session'];
  const hosts = new Set(['drive.google.com','docs.google.com','meet.google.com','notebooklm.google.com','gemini.google.com']);
  const LEGACY_ID_MAP = {};

  function getLegacyId(codename) {
    if (LEGACY_ID_MAP[codename]) return LEGACY_ID_MAP[codename];
    return String(codename || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  function safeUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && hosts.has(url.hostname) && !url.username && !url.password; }
    catch (_) { return false; }
  }

  function normalizeV2Client(c, idx) {
    if (!c || typeof c !== 'object' || Array.isArray(c)) throw Error('Paciente inválido');
    const codename = (typeof c.codename === 'string' && c.codename.trim()) ? c.codename : (typeof c.name === 'string' ? c.name : '');
    const id = (typeof c.id === 'string' && c.id.trim()) ? c.id : getLegacyId(codename || ('client-' + idx));
    const formulations = (c.formulations && typeof c.formulations === 'object') ? c.formulations : {};
    const acp = (formulations.rogers_acp && typeof formulations.rogers_acp === 'object') ? formulations.rogers_acp : {};
    const cb = (formulations.contextual_behavioral && typeof formulations.contextual_behavioral === 'object') ? formulations.contextual_behavioral : null;
    const sourceDocs = (c.source_documents && typeof c.source_documents === 'object') ? c.source_documents : {};
    const dossierIn = (c.dossier && typeof c.dossier === 'object') ? c.dossier : {};

    const normalized = {
      id,
      name: codename,
      lastSession: c.last_session_date ?? c.lastSession ?? '',
      status: c.status ?? 'Ativo',
      driveFolderUrl: sourceDocs.drive_folder_url ?? c.driveFolderUrl ?? '',
      dossierUrl: sourceDocs.dossier_url ?? c.dossierUrl ?? '',
      roadmapUrl: sourceDocs.roadmap_url ?? c.roadmapUrl ?? '',
      notebookUrl: sourceDocs.notebook_url ?? c.notebookUrl ?? 'https://notebooklm.google.com',
      briefing: acp.briefing ?? c.briefing ?? '',
      postura: acp.therapist_posture ?? c.postura ?? '',
      zonasAfeto: acp.affective_zones ?? c.zonasAfeto,
      reflexoes: acp.empathic_reflections ?? c.reflexoes,
      dossier: {
        quadroReferencia: acp.internal_frame_of_reference ?? dossierIn.quadroReferencia ?? '',
        incongruencia: acp.incongruence_self_threat ?? dossierIn.incongruencia ?? '',
        condicoesValor: acp.conditions_of_worth ?? dossierIn.condicoesValor ?? '',
        climaRelacional: acp.relational_climate ?? dossierIn.climaRelacional ?? '',
        tendenciaAtualizante: acp.actualizing_tendency ?? dossierIn.tendenciaAtualizante ?? ''
      }
    };
    if (cb) normalized.contextualBehavioral = cb;
    return normalized;
  }

  function validateClients(rawData) {
    let data = rawData;
    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
      if (rawData.schema_version !== '2.0.0' || !Array.isArray(rawData.clients)) throw Error('Schema v2 inválido');
      data = rawData.clients.map(normalizeV2Client);
    }
    if (!Array.isArray(data) || data.length > 100) throw Error('Lista inválida');
    const ids = new Set();
    return data.map(c => {
      if (!c || typeof c !== 'object' || Array.isArray(c)) throw Error('Paciente inválido');
      if (!fields.every(k => typeof c[k] === 'string' && c[k].length <= 20000)) throw Error('Campo ausente');
      if (!/^[a-z0-9_-]{1,80}$/i.test(c.id) || !c.name.trim() || ids.has(c.id)) throw Error('ID ou nome inválido');
      ids.add(c.id);
      for (const key of ['driveFolderUrl','dossierUrl','roadmapUrl','notebookUrl']) if (!safeUrl(c[key])) throw Error('Link inválido');
      if (!Array.isArray(c.zonasAfeto) || !Array.isArray(c.reflexoes) ||
          ![c.zonasAfeto,c.reflexoes].every(a => a.length <= 100 && a.every(s => typeof s === 'string' && s.length <= 20000))) throw Error('Lista de texto inválida');
      if (!c.dossier || !dossierFields.every(k => typeof c.dossier[k] === 'string' && c.dossier[k].length <= 20000)) throw Error('Dossiê inválido');

      const clean = Object.fromEntries([...fields.map(k => [k,c[k]]), ['zonasAfeto',c.zonasAfeto],
        ['reflexoes',c.reflexoes], ['dossier',Object.fromEntries(dossierFields.map(k => [k,c.dossier[k]]))]]);

      if (c.contextualBehavioral && typeof c.contextualBehavioral === 'object' && !Array.isArray(c.contextualBehavioral)) {
        const cbOut = {};
        for (const k of cbStringFields) {
          if (typeof c.contextualBehavioral[k] === 'string' && c.contextualBehavioral[k].length <= 20000) cbOut[k] = c.contextualBehavioral[k];
        }
        if (Array.isArray(c.contextualBehavioral.valued_directions) &&
            c.contextualBehavioral.valued_directions.length <= 100 &&
            c.contextualBehavioral.valued_directions.every(s => typeof s === 'string' && s.length <= 20000)) {
          cbOut.valued_directions = c.contextualBehavioral.valued_directions;
        }
        if (Object.keys(cbOut).length > 0) clean.contextualBehavioral = cbOut;
      }
      return clean;
    });
  }

  root.validateClients = validateClients;
  root.getLegacyId = getLegacyId;
  if (typeof module !== 'undefined') module.exports = {validateClients,safeUrl,getLegacyId};
})(typeof window === 'undefined' ? globalThis : window);
