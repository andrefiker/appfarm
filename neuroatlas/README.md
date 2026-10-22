# NEUROATLAS 1.0.1

Referência educacional offline, em PT-BR, para psicólogos e explicações gerais a adultos. Proprietário: André Fiker. Não é instrumento diagnóstico, exame, orientador de tratamento ou dispositivo médico. Não há certificação clínica nem revisão independente por especialista.

## Entrega

| Recurso | Versão 1.0.1 |
|---|---|
| Atlas original | 21 regiões; lateral, medial, inferior e dois cortes coronais |
| Redes | 10 projeções conceituais, com distinção entre via, conectividade e modelo |
| Biblioteca | 18 temas clínicos; mecanismos, incertezas, mitos e contexto de encaminhamento |
| Ensinar | 6 módulos: estresse, ameaça/extinção, atenção, recompensa, memória e três sistemas |
| Evidências | 39 referências offline com autoria, ano, DOI/URL, escopo e extensão da consulta |
| Leitura | Modo clínico e vista para paciente; temas claro/escuro; texto ampliado |
| Navegação | Busca sem acentos, zoom/pinça/arraste, glossário, favoritos e recentes |
| Privacidade | Zero permissões Android; sem rede, conta, anúncios, métricas ou registros clínicos |

O armazenamento contém apenas preferências e IDs de favoritos/recentes. Consultas de busca e controles das demonstrações não são persistidos. Não insira informações pessoais ou de pacientes na busca. O aplicativo não possui campos para casos, diagnósticos pessoais, imagens ou notas.

## Estrutura e arquitetura

- `android/`: Activity nativa mínima e WebView; sem Gradle, dependências de interface ou SDK de terceiros.
- `web/`: interface, conteúdo e SVG originais, todos incluídos no APK.
- `tools/make-content.py`: fonte editorial; gera `web/data.js` e `docs/bibliography.json`.
- `tools/build.sh`: compilação, empacotamento, alinhamento e assinatura.
- `tests/`: integridade de conteúdo, interações de navegador, anatomia/geometria, toque e auditoria do APK.
- `docs/` e `qa/`: escopo, licenças, fontes e resultados separados por tipo de teste.

`https://appassets.androidplatform.net/` é uma origem virtual interceptada pelo próprio aplicativo, não um servidor acessado. `INTERNET` não é solicitada; WebView bloqueia rede, arquivos externos, conteúdo externo, cookies e depuração. A ponte JavaScript só altera as cores das barras do sistema. O conteúdo não faz chamadas externas, inclusive a serviços de IA.

## Compatibilidade e instalação

**Correção 1.0.1:** o APK 1.0.0 entregue continha `resources.arsc` comprimido e desalinhado, o que impede sua instalação em Android 11+ com este target SDK. Use 1.0.1; detalhes e regressão em `docs/INSTALLATION-FIX.md`. A assinatura original foi preservada.

Pacote `com.andrefiker.neuroatlas`, versionName `1.0.1`, versionCode `2`. Android 8.0/API 26 ou superior; target/compile API 35. Requer Android System WebView 92+ para os recursos web usados; somente Chromium 131 foi executado nesta entrega. Não contém código nativo por arquitetura, portanto não depende de ABI de CPU.

Transfira o APK ao aparelho, abra-o e permita a instalação apenas para o aplicativo usado para abrir o arquivo, se o Android solicitar. A primeira abertura não precisa de rede. Confira o SHA-256 e o certificado no relatório antes de instalar. Instalação em emulador ou telefone não foi executada neste ambiente: ver `docs/QA.md`.

## Compilar

Ferramentas: Android Build Tools 35.0.0, platform `android-35/android.jar`, OpenJDK 17, Python 3, Bash. A entrega foi compilada com Eclipse Compiler for Java 3.38.0 (`ECJ_JAR`); um JDK com `javac` também é aceito, mas pode gerar bytes diferentes. Versões e hashes em `qa/toolchain.json`. Nenhum download é feito pelo script.

```bash
cd neuroatlas
python3 tools/make-content.py
node tests/content.cjs
python3 tests/apk-layout.py
export BT=/caminho/android-sdk/build-tools/35.0.0
export ANDROID_JAR=/caminho/android-sdk/platforms/android-35/android.jar
export ECJ_JAR=/caminho/ecj-3.38.0.jar
export NEURO_KEYSTORE=/pasta-privada/neuroatlas-release.p12
export NEURO_PASS_FILE=/pasta-privada/signing-password.txt
bash tools/build.sh
python3 tests/package.py
```

Saída: `build/NEUROATLAS-v1.0.1.apk`. Alias `neuroatlas`, PKCS12 com a mesma senha para chave e repositório. O script limpa somente diretórios de classes/dex gerados, usa D8 release com uma thread e normaliza ordem e metadados do ZIP antes de assinar. Mantém `resources.arsc` sem compressão e verifica seu deslocamento real de dados em múltiplo de 4 antes e depois da assinatura. A saída deriva de `versionName` no manifesto. Não copie a chave nem sua senha para este repositório.

## Testes de interface

Playwright Core e Chrome for Testing 131 foram ferramentas de QA, não dependências distribuídas. Os testes abrem um servidor somente em loopback dentro do próprio processo de teste.

```bash
export PLAYWRIGHT_PATH=/caminho/node_modules/playwright-core
export CHROME_PATH=/caminho/chrome
node tests/browser.cjs
node tests/anatomy-touch.cjs
```

Esta execução usou `--headless=old --single-process --no-zygote` porque o lançamento normal do navegador não pôde criar IPC Unix no ambiente. Em uma máquina convencional, esses parâmetros podem ser substituídos pelo headless padrão. Os testes não simulam uma instalação Android nem constituem validação clínica.

## Atualizações e rollback

1. Preserve o pacote e a chave privada dedicada. Há backup privado separado; o código e o APK não contêm a chave.
2. Para atualizar, incremente `android:versionCode`, ajuste `versionName` no manifesto e `version` em `tools/make-content.py`; gere novamente o conteúdo. O nome da saída e a auditoria de pacote seguem o manifesto. Refaça a revisão das fontes e os testes. Assine com o mesmo certificado.
3. Instale sobre a versão anterior para manter preferências/favoritos. Se a chave for perdida, uma atualização compatível não poderá ser assinada; será necessário outro pacote ou reinstalação, perdendo os dados locais.
4. A base de rollback do repositório é `0db2815c14b727031d63e7c14ef0a75255690e90`. A branch `feat/neuroatlas-v1-20261022` adiciona somente `neuroatlas/`; nenhum merge em `main` é necessário para usar os arquivos.
5. Para reverter uma futura atualização Android, reconstrua o conteúdo da versão conhecida com versionCode **maior** que o instalado, usando a mesma chave. O Android normalmente bloqueia downgrades. Desinstalar/reinstalar apaga as preferências, favoritos e recentes.
6. Guarde o APK 1.0.1 e seu SHA-256 como ponto de retorno verificável. Não volte ao APK 1.0.0 defeituoso; para recuperar seu conteúdo, mantenha a correção de empacotamento e incremente versionCode. Não publique o backup de assinatura.

## Omissões deliberadas

Farmacologia e classes de medicamentos; exportação de diagramas; inglês; 3D; MRI/tractografia; subdivisões histológicas, territórios vasculares e tratos completos. As redes são exemplos representativos, não uma cartografia exaustiva. Não há análise de exames, escalas, testes cognitivos ou recomendações individuais.

Leia `docs/EVIDENCE-REVIEW.md`, `docs/SOURCE-VERIFICATION.md`, `docs/QA.md` e `LICENSE-ASSETS.md` antes de usar ou modificar o conteúdo.
