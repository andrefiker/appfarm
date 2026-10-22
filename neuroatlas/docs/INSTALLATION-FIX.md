# Correção de instalação — NEUROATLAS 1.0.1

Data: 22/10/2026. Pacote: `com.andrefiker.neuroatlas`. versionCode: `2`.

## Falha e causa identificada

O proprietário enviou uma captura mostrando “App not installed” ao tentar instalar a versão 1.0.0. O código exato do instalador não está disponível. A inspeção do APK entregue identificou um defeito que impede a instalação com target SDK 35: `resources.arsc` estava comprimido (DEFLATE) e seus dados começavam fora de um limite de quatro bytes.

A documentação oficial do Android exige a tabela de recursos sem compressão e alinhada em quatro bytes para aplicativos com target API 30 ou superior no Android 11+. Fonte verificada em 22/10/2026: [Android Developers — Compressed resource files](https://developer.android.com/about/versions/11/behavior-changes-11#compressed-resource-files).

O normalizador determinístico do ZIP introduziu o erro ao recomprimir todos os arquivos. A verificação anterior de assinatura e `zipalign -c` passou, mas era incompleta: o zipalign não rejeita uma entrada comprimida por esse motivo. Portanto, os resultados anteriores de pacote não comprovavam instalabilidade. A captura do proprietário é evidência de falha real, não um teste aprovado.

## Correção

- Preservar `resources.arsc` como `ZIP_STORED`; executar zipalign depois da normalização.
- Verificar compressão e deslocamento real do cabeçalho local antes e depois de assinar. O build falha se a regra não for satisfeita.
- Acrescentar quatro testes de regressão e auditar o APK assinado, incluindo continuidade do certificado.
- Incrementar versão para 1.0.1 / código 2. Nome do APK deriva do manifesto; rótulos da interface seguem a versão do conteúdo.

Nenhuma mudança no conteúdo clínico, ilustrações, permissões ou código Java. A mesma chave privada dedicada assina ambas as versões.

## Evidências

| Verificação | 1.0.0 | 1.0.1 |
|---|---|---|
| Método ZIP de resources.arsc | 8 — DEFLATE | 0 — sem compressão |
| Deslocamento real dos dados | 47146; resto 2 ao dividir por 4 | 47156; múltiplo de 4 |
| Nova regra de pacote | Rejeitado | Aprovado |
| Assinatura v2/v3 | Válida | Válida, mesmo certificado |
| Instalação no telefone | Falhou, captura do proprietário | Aguardando confirmação |

O teste do normalizador falhou antes da correção (esperado método 0, obtido 8) e passou depois. Outros testes rejeitam tabelas comprimidas ou desalinhadas e aceitam uma tabela correta. A nova regra também foi aplicada aos dois APKs reais: `qa/install-fix-results.json`. Os nove grupos de conteúdo passam. Dois builds limpos de 1.0.1 produziram bytes idênticos: `qa/reproducibility.json`.

SHA-256 do APK 1.0.1:

`d0e2d1df762672f9ca94519bf6e6cb153296315abdc8684a92c77b2165acb11a`

SHA-256 do certificado:

`d68626fa70e1de06bdc47dbcb969e8f00f7d0ce7923614ef715eb0797b58e54a`

## Instalação, atualização e limites

Use `NEUROATLAS-v1.0.1.apk`. O pacote e a chave permanecem os mesmos, permitindo atualização compatível se uma versão anterior estiver instalada. Não é necessário apagar dados para corrigir este defeito de empacotamento. A instalação e a primeira abertura em modo avião ainda precisam ser confirmadas no aparelho; nenhum emulador ou telefone está conectado a este ambiente.

O APK 1.0.0 deve ser mantido somente como evidência da regressão, não como opção de instalação ou rollback. Para recuperar conteúdo antigo, reconstrua-o mantendo o empacotamento corrigido, o mesmo certificado e um versionCode maior que o instalado. Preserve o backup privado de assinatura já entregue; não o inclua no repositório.

Esta correção é de engenharia. Não acrescenta certificação ou validação clínica independente.
