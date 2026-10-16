const assert = require('node:assert/strict');
const {test} = require('node:test');
const {validateClients,safeUrl,getLegacyId} = require('../app/src/main/assets/client-data.js');

const person = () => ({id:'synthetic-1',name:'Pessoa Exemplo',lastSession:'2026-10-01',status:'Ativo',
 driveFolderUrl:'https://drive.google.com/drive/folders/example', dossierUrl:'https://docs.google.com/document/d/example/edit',
 roadmapUrl:'https://docs.google.com/document/d/example2/edit',notebookUrl:'https://notebooklm.google.com',
 briefing:'Exemplo fictício',postura:'Acolher',zonasAfeto:['Tema'],reflexoes:['Reflexão'],
 dossier:{quadroReferencia:'x',incongruencia:'x',condicoesValor:'x',climaRelacional:'x',tendenciaAtualizante:'x'}});

const envelopeV2 = () => ({
  schema_version: '2.0.0',
  exported_at: '2026-10-16T12:00:00Z',
  export_environment: 'gemini_clinical_adapter',
  theoretical_framework_primary: 'Person-Centered Approach (Carl Rogers)',
  theoretical_framework_secondary: 'Contextual Behavioral (ACT / RFT / FAP)',
  clients: [
    {
      id: 'synth-client-omega-01',
      codename: 'Synthetic Client Omega',
      last_session_date: '2026-10-15',
      status: 'Ativo',
      source_documents: {
        drive_folder_url: 'https://drive.google.com/drive/folders/synth_folder_omega',
        dossier_url: 'https://docs.google.com/document/d/synth_dossier_omega/edit',
        roadmap_url: 'https://docs.google.com/document/d/synth_roadmap_omega/edit',
        notebook_url: 'https://gemini.google.com/notebook/synth_nb_omega'
      },
      formulations: {
        rogers_acp: {
          briefing: 'Briefing sintético de presença',
          affective_zones: ['Zona afetiva 1', 'Zona afetiva 2'],
          therapist_posture: 'Presença despressurizadora',
          empathic_reflections: ['Reflexão empática 1'],
          internal_frame_of_reference: 'Quadro interno sintético',
          incongruence_self_threat: 'Incongruência sintética',
          conditions_of_worth: 'Condições de valor sintéticas',
          relational_climate: 'Clima relacional seguro',
          actualizing_tendency: 'Tendência atualizante ativa'
        },
        contextual_behavioral: {
          experiential_avoidance: 'Evitação experiencial sintética',
          cognitive_fusion: 'Fusão cognitiva sintética',
          valued_directions: ['Autocuidado', 'Presença'],
          crb1_in_session: 'CRB1 sintético',
          crb2_in_session: 'CRB2 sintético'
        }
      }
    }
  ]
});

test('imports a valid synthetic roster and strips unknown fields', () => {
 const input = person(); input.extra='private'; const [record]=validateClients([input]);
 assert.equal(record.extra,undefined); assert.equal(record.name,'Pessoa Exemplo');
});

test('rejects duplicate IDs, unsafe links and malformed data', () => {
 assert.throws(() => validateClients([person(),person()]));
 for (const link of ['javascript:alert(1)','http://docs.google.com','https://docs.google.com.evil.test/x','#']) {
   const input=person(); input.dossierUrl=link; assert.throws(() => validateClients([input]));
 }
 assert.equal(safeUrl('https://drive.google.com/drive/folders/example'),true);
 assert.throws(() => validateClients({}));
});

test('JSON import/export preserves the clinical schema', () => {
 const data=validateClients([person()]); assert.deepEqual(validateClients(JSON.parse(JSON.stringify(data))), data);
});

test('normalizes Schema v2.0.0 envelope into validated client records and preserves contextualBehavioral', () => {
 const [record] = validateClients(envelopeV2());
 assert.equal(record.id, 'synth-client-omega-01');
 assert.equal(record.name, 'Synthetic Client Omega');
 assert.equal(record.lastSession, '2026-10-15');
 assert.equal(record.dossier.quadroReferencia, 'Quadro interno sintético');
 assert.equal(record.contextualBehavioral.crb2_in_session, 'CRB2 sintético');
 assert.deepEqual(record.contextualBehavioral.valued_directions, ['Autocuidado', 'Presença']);
});

test('derives stable legacy slug ID when Schema v2 client omits explicit id and rejects unsupported schema_version', () => {
 const env = envelopeV2();
 delete env.clients[0].id;
 const [record] = validateClients(env);
 assert.equal(record.id, getLegacyId('Synthetic Client Omega'));
 assert.equal(record.id, 'synthetic-client-omega');

 const badEnv = envelopeV2();
 badEnv.schema_version = '9.9.9';
 assert.throws(() => validateClients(badEnv), /Schema v2 inválido/);
});
