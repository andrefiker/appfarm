(function (root) {
  'use strict';
  const fields = ['id','name','lastSession','status','driveFolderUrl','dossierUrl','roadmapUrl','notebookUrl','briefing','postura'];
  const dossierFields = ['quadroReferencia','incongruencia','condicoesValor','climaRelacional','tendenciaAtualizante'];
  const hosts = new Set(['drive.google.com','docs.google.com','meet.google.com','notebooklm.google.com']);
  function safeUrl(value) {
    try { const url = new URL(value); return url.protocol === 'https:' && hosts.has(url.hostname) && !url.username && !url.password; }
    catch (_) { return false; }
  }
  function validateClients(data) {
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
      return Object.fromEntries([...fields.map(k => [k,c[k]]), ['zonasAfeto',c.zonasAfeto],
        ['reflexoes',c.reflexoes], ['dossier',Object.fromEntries(dossierFields.map(k => [k,c.dossier[k]]))]]);
    });
  }
  root.validateClients = validateClients;
  if (typeof module !== 'undefined') module.exports = {validateClients,safeUrl};
})(typeof window === 'undefined' ? globalThis : window);
