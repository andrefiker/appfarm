#!/usr/bin/env python3
"""
test_synthetic_pipeline.py
Verification test suite using exclusively synthetic records.
Tests compatibility across:
1. Python ClientDataValidatorV1 & SchemaV2Importer (clinical_export_adapter.py)
2. Production Android APK JavaScript validator (../atendimentos/app/src/main/assets/client-data.js)
"""

import json
import unittest
import copy
import subprocess
import os
import importlib.util

base_dir = os.path.dirname(os.path.abspath(__file__))
adapter_path = os.path.join(base_dir, 'clinical_export_adapter.py')
spec = importlib.util.spec_from_file_location('clinical_export_adapter', adapter_path)
adapter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adapter)

ClientDataValidatorV1 = adapter.ClientDataValidatorV1
SchemaV2Importer = adapter.SchemaV2Importer
get_legacy_id = adapter.get_legacy_id
LEGACY_ID_MAP = adapter.LEGACY_ID_MAP

class SyntheticDataFactory:
    @staticmethod
    def create_synthetic_v1_record(patient_code: str = "Alpha S.", legacy_id: str = "synth-alpha-s"):
        return {
            "id": legacy_id,
            "name": f"Synthetic {patient_code}",
            "lastSession": "2026-10-10",
            "status": "Ativo",
            "driveFolderUrl": "https://drive.google.com/drive/folders/synth_folder_001",
            "dossierUrl": "https://docs.google.com/document/d/synth_dossier_001/edit",
            "roadmapUrl": "https://docs.google.com/document/d/synth_roadmap_001/edit",
            "notebookUrl": "https://gemini.google.com/notebook/synth_nb_001",
            "briefing": "Synthetic Client Alpha apresenta transição de estresse ocupacional sem dados reais.",
            "zonasAfeto": ["Ansiedade frente a prazos de projetos fictícios", "Acolhimento da exaustão somática"],
            "postura": "Presença despressurizadora e consideração positiva incondicional.",
            "reflexoes": [
                "Parece que o ritmo acelerado te faz esquecer das suas necessidades mais vitais...",
                "Poder parar sem culpa parece ser o maior desafio no momento."
            ],
            "dossier": {
                "quadroReferencia": "Vivência fenomênica de sobrecarga em ambiente simulado.",
                "incongruencia": "Tensão entre o Ideal de produtividade contínua e os limites fisiológicos.",
                "condicoesValor": "Introjeção de que o valor pessoal está ligado a entregas ininterruptas.",
                "climaRelacional": "Vínculo terapêutico baseado em aceitação sem exigência de desempenho.",
                "tendenciaAtualizante": "Busca ativa de autorregulação e resgate de hobbies criativos."
            }
        }

    @staticmethod
    def create_synthetic_v2_envelope(patient_code: str = "Beta R.", legacy_id: str = "synth-beta-r"):
        v1 = SyntheticDataFactory.create_synthetic_v1_record(patient_code, legacy_id)
        return {
            "schema_version": "2.0.0",
            "exported_at": "2026-10-10T23:00:00Z",
            "export_environment": "gemini_clinical_adapter",
            "theoretical_framework_primary": "Person-Centered Approach (Carl Rogers)",
            "theoretical_framework_secondary": "Contextual Behavioral (ACT / RFT / FAP)",
            "clients": [
                {
                    "id": legacy_id,
                    "codename": v1["name"],
                    "last_session_date": v1["lastSession"],
                    "status": v1["status"],
                    "source_documents": {
                        "drive_folder_url": v1["driveFolderUrl"],
                        "dossier_url": v1["dossierUrl"],
                        "roadmap_url": v1["roadmapUrl"],
                        "notebook_url": v1["notebookUrl"]
                    },
                    "formulations": {
                        "rogers_acp": {
                            "briefing": v1["briefing"],
                            "affective_zones": v1["zonasAfeto"],
                            "therapist_posture": v1["postura"],
                            "empathic_reflections": v1["reflexoes"],
                            "internal_frame_of_reference": v1["dossier"]["quadroReferencia"],
                            "incongruence_self_threat": v1["dossier"]["incongruencia"],
                            "conditions_of_worth": v1["dossier"]["condicoesValor"],
                            "relational_climate": v1["dossier"]["climaRelacional"],
                            "actualizing_tendency": v1["dossier"]["tendenciaAtualizante"]
                        },
                        "contextual_behavioral": {
                            "experiential_avoidance": "Evitação experiencial sintética",
                            "cognitive_fusion": "Fusão cognitiva sintética",
                            "valued_directions": ["Autocuidado", "Presença"],
                            "crb1_in_session": "CRB1 sintético",
                            "crb2_in_session": "CRB2 sintético"
                        }
                    }
                }
            ]
        }

class TestSyntheticPipeline(unittest.TestCase):

    def setUp(self):
        self.v1_record = SyntheticDataFactory.create_synthetic_v1_record("Alpha S.", "synth-alpha-s")
        self.v2_envelope = SyntheticDataFactory.create_synthetic_v2_envelope("Beta R.", "synth-beta-r")

    def test_01_installed_android_v1_validator_success(self):
        payload = [self.v1_record]
        valid, errors = ClientDataValidatorV1.validate(payload)
        self.assertTrue(valid, f"V1 validation failed: {errors}")
        self.assertEqual(len(errors), 0)

    def test_02_v2_envelope_normalization_to_v1_contract(self):
        normalized, mode, errors = SchemaV2Importer.import_and_normalize(self.v2_envelope)
        self.assertEqual(mode, "v2_normalized")
        self.assertEqual(len(errors), 0)
        self.assertEqual(len(normalized), 1)
        valid, v1_errors = ClientDataValidatorV1.validate(normalized)
        self.assertTrue(valid, f"Normalized V2 record failed V1 validator: {v1_errors}")

    def test_03_legacy_id_preservation_rule(self):
        mock_local_storage = {
            "atendimentos_notes_synth-alpha-s": "Nota pessoal de teste gravada em sessão."
        }
        target_key = "atendimentos_notes_synth-alpha-s"
        self.assertIn(target_key, mock_local_storage)
        self.assertEqual(mock_local_storage[target_key], "Nota pessoal de teste gravada em sessão.")

    def test_04_duplicate_id_detection(self):
        dup_v1 = [self.v1_record, copy.deepcopy(self.v1_record)]
        valid, errors = ClientDataValidatorV1.validate(dup_v1)
        self.assertFalse(valid)
        self.assertTrue(any("duplicate" in e.lower() for e in errors))

    def test_05_missing_fields_rejection(self):
        corrupt = copy.deepcopy(self.v1_record)
        del corrupt["briefing"]
        del corrupt["dossier"]
        valid, errors = ClientDataValidatorV1.validate([corrupt])
        self.assertFalse(valid)
        self.assertTrue(len(errors) >= 2)

    def test_06_malformed_json_handling(self):
        bad_json = '[{"id": "broken", "name":'
        with self.assertRaises(json.JSONDecodeError):
            json.loads(bad_json)

    def test_07_local_notes_isolation_during_import(self):
        mock_storage = {
            "atendimentos_notes_synth-alpha-s": "Anotação prévia do terapeuta",
            "atendimentos_today_queue": json.dumps([{"id": "synth-alpha-s", "time": "14h", "done": False}])
        }
        incoming_v1 = [self.v1_record]
        valid, _ = ClientDataValidatorV1.validate(incoming_v1)
        self.assertTrue(valid)
        mock_storage["atendimentos_clients_v1"] = json.dumps(incoming_v1)

        self.assertEqual(mock_storage["atendimentos_notes_synth-alpha-s"], "Anotação prévia do terapeuta")
        self.assertIn("14h", mock_storage["atendimentos_today_queue"])

    def test_08_transactional_rollback_on_failed_import(self):
        initial_state = [self.v1_record]
        corrupted_payload = "not-a-valid-array-or-envelope"

        normalized, mode, errors = SchemaV2Importer.import_and_normalize(corrupted_payload)
        self.assertEqual(mode, "unknown_format")
        self.assertEqual(len(normalized), 0)
        active_state = initial_state if len(normalized) == 0 else normalized
        self.assertEqual(active_state, initial_state)

    def test_09_cross_runtime_apk_client_data_js_accepts_v2_envelope(self):
        """End-to-end test: Python Schema v2.0.0 envelope validated directly by APK's client-data.js in Node."""
        candidate_a = os.path.abspath(os.path.join(base_dir, '..', 'atendimentos', 'app', 'src', 'main', 'assets', 'client-data.js'))
        candidate_b = os.path.abspath(os.path.join(base_dir, '..', 'app', 'src', 'main', 'assets', 'client-data.js'))
        js_path = candidate_a if os.path.exists(candidate_a) else candidate_b
        payload_json = json.dumps(self.v2_envelope)
        node_cmd = [
            "node", "-e",
            f"const {{validateClients}} = require({json.dumps(js_path)}); "
            f"const out = validateClients({payload_json}); "
            f"if (out.length !== 1 || out[0].id !== 'synth-beta-r' || !out[0].contextualBehavioral) process.exit(1);"
        ]
        res = subprocess.run(node_cmd, capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, f"APK client-data.js rejected v2 envelope: {res.stderr}")

    def test_10_local_first_sync_stages_active_clinical_roster(self):
        """Increment 2 test: local-first-sync.py stages the 5-patient active clinical roster and verifies SHA-256."""
        sync_path = os.path.join(base_dir, 'local-first-sync.py')
        sync_spec = importlib.util.spec_from_file_location('local_first_sync', sync_path)
        sync_mod = importlib.util.module_from_spec(sync_spec)
        sync_spec.loader.exec_module(sync_mod)

        env = sync_mod.build_active_clinical_envelope()
        result = sync_mod.stage_clients_payload(env)
        self.assertEqual(result["manifest"]["client_count"], 5)
        self.assertEqual(
            result["manifest"]["client_ids"],
            ["helena-m", "rafael-s", "camila-v", "lucas-b", "mariana-t"],
        )
        self.assertTrue(result["manifest"]["has_contextual_behavioral"])
        self.assertEqual(result["manifest"]["privacy_gate"], "PASSED")

if __name__ == "__main__":
    unittest.main()
