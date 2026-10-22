"""Editorial extension: disorder lists and explicitly limited teaching maps.

Every aspect carries its own basis and references. These are curated teaching
selections, never inferred from a person's symptoms or from a statistical atlas.
"""


def enrich(source, condition, S, C, N):
    indexed = 'Metadados e trechos indexados da publicação consultados em 22/10/2026. Acesso direto a parte das páginas PubMed/PMC bloqueado por verificação do site; não houve leitura integral nem revisão sistemática própria.'
    refs = [
        ('anxiety-circuits', 'Duval E.R., Javanbakht A., Liberzon I.', 'Neural circuits in anxiety and stress disorders: a focused review', '2015', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4315464/', 'Participação de sistemas de ameaça e regulação em ansiedade; não sustenta um circuito único por diagnóstico.', '10.2147/TCRM.S48528'),
        ('anxiety-meta', 'Etkin A., Wager T.D.', 'Functional neuroimaging of anxiety: a meta-analysis of emotional processing in PTSD, social anxiety disorder, and specific phobia', '2007', 'https://pubmed.ncbi.nlm.nih.gov/17898336/', 'Achados de grupo em amígdala e ínsula; diferenças pré-frontais/cinguladas no TEPT dependem da tarefa. Não inclui TAG ou pânico na análise final.', '10.1176/appi.ajp.2007.07030504'),
        ('panic-circuits', 'Goddard A.W.', 'The Neurobiology of Panic: A Chronic Stress Disorder', '2017', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7219873/', 'Estudos de pânico envolvem ínsula, amígdala, cíngulo e sistemas de defesa. Direção dos resultados depende do paradigma.', ''),
        ('depression-net', 'Kaiser R.H., Andrews-Hanna J.R., Wager T.D., Pizzagalli D.A.', 'Large-Scale Network Dysfunction in Major Depressive Disorder: A Meta-analysis of Resting-State Functional Connectivity', '2015', 'https://pubmed.ncbi.nlm.nih.gov/25785575/', 'Síntese de conectividade de redes de controle, atenção e processos internos na depressão, sem marcador diagnóstico individual.', ''),
        ('ocd-circuits', 'Goodman W.K., Storch E.A., Sheth S.A.', 'Harmonizing the Neurobiology and Treatment of Obsessive-Compulsive Disorder', '2021', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8091795/', 'Modelo de circuitos córtico-estriado-tálamo-corticais no TOC; resposta a medicamentos não demonstra deficiência de serotonina.', '10.1176/appi.ajp.2020.20111601'),
        ('adhd-task', 'Cortese S. et al.', 'Toward systems neuroscience of ADHD: a meta-analysis of 55 fMRI studies', '2012', 'https://pubmed.ncbi.nlm.nih.gov/22983386/', 'Diferenças relacionadas a tarefas em múltiplos sistemas de atenção e controle; não um foco único de TDAH.', ''),
        ('adhd-null', 'Cortese S. et al.', 'Systematic Review and Meta-analysis: Resting-State Functional Magnetic Resonance Imaging Studies of Attention-Deficit/Hyperactivity Disorder', '2021', 'https://pubmed.ncbi.nlm.nih.gov/32946973/', 'Ausência de convergência espacial significativa na meta-análise de conectividade em repouso; contraponto a mapas excessivamente certos.', ''),
        ('autism-net', 'Hull J.V. et al.', 'Resting-State Functional Connectivity in Autism Spectrum Disorders: A Review', '2017', 'https://pubmed.ncbi.nlm.nih.gov/28101064/', 'Heterogeneidade e debate sobre conectividade no autismo. Não autoriza um desenho único de cérebro autista.', ''),
        ('bipolar-net', 'Schumer M.C. et al.', 'Prefrontal, parietal, and limbic condition-dependent differences in bipolar disorder: a large-scale meta-analysis of functional neuroimaging studies', '2023', 'https://pubmed.ncbi.nlm.nih.gov/36782061/', 'Diferenças pré-frontais, parietais e límbicas dependentes da condição experimental; não uma assinatura estável de todos os episódios.', '10.1038/s41380-023-01974-8'),
        ('cross-network', 'Sha Z., Wager T.D., Mechelli A., He Y.', 'Common Dysfunction of Large-Scale Neurocognitive Networks Across Psychiatric Disorders', '2019', 'https://pubmed.ncbi.nlm.nih.gov/30612699/', 'Alterações compartilhadas entre diagnósticos em redes de modo padrão, frontoparietal e saliência; sobreposição limita especificidade.', '10.1016/j.biopsych.2018.11.011'),
        ('eating-net', 'Steward T. et al.', 'Neural Network Alterations Across Eating Disorders: A Narrative Review of fMRI Studies', '2018', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6187750/', 'Pesquisa de recompensa, controle e percepção corporal em transtornos alimentares. Revisão narrativa; nutrição e estado clínico dificultam inferências causais.', ''),
        ('borderline-meta', 'Schulze L. et al.', 'Neural Correlates of Disturbed Emotion Processing in Borderline Personality Disorder: A Multimodal Meta-Analysis', '2016', 'https://pubmed.ncbi.nlm.nih.gov/25935068/', 'Processamento emocional em amígdala, cíngulo posterior e regiões pré-frontais em estudos de grupo; não mede personalidade ou caráter.', ''),
        ('insomnia-null', 'Tahmasian M. et al.', 'A lack of consistent brain alterations in insomnia disorder: An activation likelihood estimation meta-analysis', '2018', 'https://pubmed.ncbi.nlm.nih.gov/30093361/', 'Síntese sem convergência consistente, preservada como contraponto histórico à análise posterior de 2023.', ''),
        ('insomnia-update', 'Reimann G.M. et al.', 'Convergent abnormality in the subgenual anterior cingulate cortex in insomnia disorder: A revisited neuroimaging meta-analysis of 39 studies', '2023', 'https://pubmed.ncbi.nlm.nih.gov/37481961/', 'Análise ampliada encontrou convergência no cíngulo anterior subgenual; não é evidência de lesão em cada pessoa. Essa subdivisão não está delimitada no desenho.', '10.1016/j.smrv.2023.101821'),
        ('dissociation-net', 'Modesti M.N., Rapisarda L., Capriotti G., Del Casale A.', 'Functional Neuroimaging in Dissociative Disorders: A Systematic Review', '2022', 'https://pubmed.ncbi.nlm.nih.gov/36143190/', 'Pequeno conjunto heterogêneo de estudos envolvendo pré-frontal, cíngulo, ínsula e outras regiões. Não comprova trauma ou identidades por imagem.', '10.3390/jpm12091405'),
        ('gambling-meta', 'Raimo S., Cropano M., Trojano L., Santangelo G.', 'The neural basis of gambling disorder: An activation likelihood estimation meta-analysis', '2021', 'https://pubmed.ncbi.nlm.nih.gov/33275954/', 'Associações em circuitos pré-frontais, estriatais e límbicos no jogo problemático; não determina a decisão de uma pessoa.', '10.1016/j.neubiorev.2020.11.027'),
        ('gad-clinical', 'National Institute of Mental Health (NIMH)', 'Generalized Anxiety Disorder: What You Need to Know', 's.d.', 'https://www.nimh.nih.gov/health/publications/generalized-anxiety-disorder-gad', 'Preocupação persistente, tensão, sono e prejuízo cotidiano em TAG; descrição educativa sem critérios proprietários.', ''),
        ('social-clinical', 'National Institute of Mental Health (NIMH)', 'Social Anxiety Disorder: What You Need to Know', 's.d.', 'https://www.nimh.nih.gov/health/publications/social-anxiety-disorder-more-than-just-shyness', 'Medo de avaliação social, evitação e manifestações corporais; timidez não é automaticamente transtorno.', ''),
        ('agora-clinical', 'National Health Service (NHS)', 'Overview — Agoraphobia', 's.d.', 'https://www.nhs.uk/mental-health/conditions/agoraphobia/overview/', 'Medo de situações nas quais escapar ou obter ajuda parece difícil; não se limita a espaços abertos.', ''),
        ('eating-clinical', 'National Institute of Mental Health (NIMH)', 'Eating Disorders: What You Need to Know', 's.d.', 'https://www.nimh.nih.gov/health/publications/eating-disorders', 'Distinções educativas entre anorexia, bulimia e compulsão alimentar; gravidade não pode ser estimada pela aparência.', ''),
        ('binge-clinical', 'National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK)', 'Binge Eating Disorder', '2021', 'https://www.niddk.nih.gov/health-information/weight-management/binge-eating-disorder', 'Perda de controle recorrente ao comer e interação de fatores pessoais e sociais; não permite deduzir diagnóstico do peso.', ''),
        ('blood-vomit', 'National Health Service (NHS)', 'Vomiting blood', '2025', 'https://www.nhs.uk/symptoms/vomiting-blood/', 'Sangue no vômito requer avaliação urgente; confusão, desmaio ou mal-estar associados são sinais de emergência. Não é protocolo específico de bulimia.', ''),
        ('borderline-clinical', 'National Institute of Mental Health (NIMH)', 'Borderline Personality Disorder', 's.d.', 'https://www.nimh.nih.gov/health/topics/borderline-personality-disorder', 'Instabilidade emocional e relacional, condições coexistentes e contexto de risco; sem julgamento moral.', ''),
        ('insomnia-clinical', 'National Heart, Lung, and Blood Institute (NHLBI)', 'Insomnia — What Is Insomnia?', '2022', 'https://www.nhlbi.nih.gov/health/insomnia', 'Dificuldade para iniciar ou manter sono apesar de oportunidade; impacto diurno e necessidade de avaliação contextual.', ''),
        ('gambling-clinical', 'World Health Organization (WHO)', 'Gambling', '2024', 'https://www.who.int/news-room/fact-sheets/detail/gambling', 'Danos financeiros, relacionais e à saúde; publicidade e disponibilidade fazem parte do contexto, além da biologia.', ''),
    ]
    access_notes = {
        'ocd-circuits': 'Página PMC, resumo e trechos sobre circuitos consultados; não se incluem recomendações terapêuticas do artigo.',
        'borderline-meta': 'Resumo e metadados PubMed consultados em 22/10/2026; resultados em amígdala, cíngulo posterior e pré-frontal dorsolateral conferidos. Não houve leitura integral.',
        'insomnia-update': 'Resumo PubMed consultado em 22/10/2026; convergência subgenual e análise adicional de conectividade conferidas. Não houve leitura integral.',
        'bipolar-net': 'PDF público do artigo consultado em 22/10/2026: resumo, resultados de tarefas cognitivas e emocionais. Identificadas regiões parietais/orbitofrontais e agrupamento amígdala-hipocampo; não houve auditoria dos dados primários. https://d-nb.info/1316281078/34',
        'binge-clinical': 'Página NIDDK consultada em 22/10/2026, seções de definição e causas; última revisão da página: maio de 2021.',
        'blood-vomit': 'Trecho indexado da página NHS consultado em 22/10/2026; sinais de urgência e revisão de 18/08/2025 conferidos.',
    }
    for row in refs:
        source(*row, access=access_notes.get(row[0], indexed))

    def topic(id, name, summary, established, mechanism, myth, patient, references, networks, differential, red):
        condition(id, name, summary, established,
                  'As associações neurais são de grupos ou modelos de função. Não mostram a causa do quadro em uma pessoa.',
                  mechanism, differential, red, myth, patient, networks, references)

    topic('gad-topic', 'Ansiedade generalizada (TAG)', 'Preocupação persistente em diferentes áreas da vida.',
          'Preocupação difícil de manejar pode coexistir com tensão, sono ruim e dificuldade de concentração.',
          'Antecipação e tentativas de evitar incerteza podem restringir atividades.',
          'Preocupar-se não demonstra uma amígdala permanentemente ligada.',
          'Quando muitas situações parecem ameaçadoras, pensar no futuro pode se tornar cansativo. Sua história e seu contexto importam.',
          'gad-clinical anxiety-circuits', 'threat executive autonomic',
          'Sono, substâncias e condições médicas também podem produzir inquietação.',
          'Sintomas físicos novos ou intensos exigem avaliação, sem atribuição automática à ansiedade.')
    topic('social-topic', 'Ansiedade social', 'Medo de avaliação nas relações e situações sociais.',
          'O medo de julgamento pode levar à evitação e a prejuízo cotidiano.',
          'Atenção à própria apresentação e antecipação de avaliação podem alimentar evitação.',
          'Timidez e introversão não são, por si, transtornos.',
          'O receio de ser julgado pode tornar encontros difíceis, mesmo quando você deseja se aproximar.',
          'social-clinical anxiety-meta', 'threat salience attention',
          'Considere contexto cultural, desenvolvimento e experiências reais de rejeição.',
          'Isolamento grave ou risco de autoagressão precisam de avaliação cuidadosa.')
    topic('phobia-topic', 'Fobias específicas', 'Medo e evitação ligados a situações ou objetos.',
          'Medo persistente pode limitar atividades e gerar sofrimento.',
          'Pistas de ameaça e aprendizagem de evitação ajudam a estudar o problema.',
          'Intensidade do medo não pode ser lida pela cor de uma região.',
          'Uma situação pode provocar medo muito intenso. Isso não significa fraqueza ou que seu cérebro esteja estragado.',
          'anxiety anxiety-meta extinction', 'threat salience',
          'Diferenciar risco real e prejuízo exige contexto, não uma imagem.',
          'Desmaio, lesão ou sintomas físicos novos merecem avaliação apropriada.')
    topic('agoraphobia-topic', 'Agorafobia', 'Quando escapar ou receber ajuda parece difícil.',
          'Pode envolver transporte, multidões ou sair de casa; não é apenas medo de espaços abertos.',
          'Antecipação de dificuldade e evitação podem estreitar a rotina.',
          'Agorafobia não exige que toda situação provoque uma crise de pânico.',
          'Alguns lugares parecem difíceis de enfrentar porque sair ou pedir ajuda parece complicado.',
          'agora-clinical anxiety-circuits', 'threat interoception memory',
          'Pânico e condições médicas podem coexistir; uma condição não explica automaticamente a outra.',
          'Restrição intensa de acesso a necessidades básicas requer apoio profissional.')
    topic('anorexia-topic', 'Anorexia nervosa', 'Restrição alimentar, corpo e risco à saúde.',
          'Restrição e medo de ganhar peso podem comprometer seriamente a saúde.',
          'Valor atribuído à alimentação, regras e percepção corporal interagem.',
          'Não é escolha estética nem demonstração de disciplina.',
          'O sofrimento com alimentação e corpo merece cuidado respeitoso.',
          'eating-clinical eating-net', 'reward interoception executive',
          'Estado nutricional e outras condições precisam de avaliação médica.',
          'Desmaio, confusão ou deterioração física importante exigem avaliação urgente.')
    topic('bulimia-topic', 'Bulimia nervosa', 'Compulsões alimentares e comportamentos compensatórios.',
          'Episódios de perda de controle e compensação podem causar complicações médicas.',
          'Regras alimentares, alívio e sofrimento podem formar ciclos.',
          'A aparência corporal não indica a gravidade.',
          'Esses ciclos podem trazer vergonha, mas merecem ajuda sem julgamento.',
          'eating-clinical eating-net blood-vomit', 'reward interoception executive',
          'A diferenciação requer história e avaliação das complicações físicas.',
          'Sangue no vômito pede avaliação urgente; com desmaio, confusão ou mal-estar, atendimento de emergência.')
    topic('binge-topic', 'Transtorno de compulsão alimentar', 'Perda de controle ao comer, com sofrimento.',
          'Compulsões recorrentes diferem de comer demais ocasionalmente.',
          'Pistas alimentares, restrição, emoções e consequências podem interagir.',
          'Não pode ser deduzido do peso nem reduzido à falta de vontade.',
          'Perder o controle ao comer pode ser doloroso. Você merece compreensão.',
          'binge-clinical eating-net', 'reward executive interoception',
          'Considere outros transtornos alimentares e condições coexistentes.',
          'Comprometimento físico importante ou risco de autoagressão pedem avaliação imediata.')
    topic('borderline-topic', 'Transtorno de personalidade borderline', 'Emoções, vínculos e experiência de si.',
          'Pode envolver instabilidade emocional, relacional e da autoimagem; há grande diversidade.',
          'Respostas intensas e dificuldades de regulação precisam ser compreendidas em contexto.',
          'O diagnóstico não significa manipulação nem determina o caráter.',
          'Emoções e relações podem se tornar muito dolorosas. Um rótulo não resume você.',
          'borderline-clinical borderline-meta', 'threat default executive',
          'História longitudinal, trauma, humor e condições coexistentes importam.',
          'Autoagressão, risco de suicídio ou crise grave exigem avaliação imediata.')
    topic('insomnia-topic', 'Transtorno de insônia', 'Dificuldade de dormir apesar de oportunidade.',
          'Iniciar ou manter o sono pode ficar difícil e afetar o funcionamento diurno.',
          'Vigilância, preocupação com o sono e contexto podem se influenciar.',
          'Insônia não equivale a um centro do sono desligado.',
          'Uma noite difícil não significa dano permanente. Quando se repete, vale compreender o conjunto.',
          'insomnia-clinical insomnia-null insomnia-update sleep', 'autonomic executive salience',
          'Apneia, ritmos, humor e substâncias precisam ser considerados.',
          'Sonolência perigosa ou vários dias quase sem dormir com desorganização requerem avaliação.')
    topic('gambling-topic', 'Transtorno do jogo', 'Apostas, aprendizagem e prejuízos cotidianos.',
          'Apostas podem comprometer finanças, relações e saúde.',
          'Pistas, expectativa e consequências interagem com acesso e publicidade.',
          'Perseguir perdas não torna uma futura vitória mais provável.',
          'Quando apostar começa a dominar a vida, o sofrimento merece ajuda sem julgamento.',
          'gambling-clinical gambling-meta reward', 'reward executive salience',
          'Considere episódios de humor, substâncias e circunstâncias financeiras sem coletar dados no app.',
          'Risco de suicídio ou crise grave exige atendimento imediato.')

    N.append(dict(id='cstc', name='Circuitos córtico-estriado-talâmicos', color='#d8b4f4', kind='Vias + modelo de ensino',
                  nodes=['ofc', 'basal', 'thalamus', 'acc'],
                  text='Alças entre córtex, estriado, outras estruturas dos núcleos da base e tálamo participam da seleção de ações. Há circuitos paralelos.',
                  patient='Escolher e mudar ações envolve vários caminhos que trabalham juntos.',
                  limit='O estriado não é todo o conjunto de núcleos da base. Relés, subdivisões e trajetos físicos foram omitidos. Não existe uma única alça do TOC.',
                  sources=['ocd-circuits'], level='Anatomia geral estabelecida; modelos clínicos em desenvolvimento'))

    # A relation is pedagogical even when its basis is a physical circuit.
    # Explicit pairs prevent accidental chains inferred from arbitrary node order.
    def aspect(id, label, nets, nodes, links, text, patient, refs, basis='research', limit='Achados variam entre tarefas, amostras e pessoas; não mostram causa ou intensidade individual.'):
        return dict(id=id, label=label, networks=nets.split(), nodes=nodes.split(),
                    links=[p.split(':') for p in links.split()], text=text, patient=patient,
                    sources=refs.split(), basis=basis, level={'research':'Em desenvolvimento', 'model':'Modelo de função', 'anatomy':'Anatomia geral estabelecida; aplicação clínica em desenvolvimento'}[basis], limit=limit)

    def model(id, label, nets, nodes, links, text, patient, refs, limit='Função geral usada para ensino. Não há uma alteração específica demonstrada por este desenho.'):
        return aspect(id, label, nets, nodes, links, text, patient, refs, 'model', limit)

    profiles = {}
    def profile(id, group, aspects, limitation, name=None):
        c=next(c for c in C if c['id']==id)
        if name: c['name']=name
        c['category']=group
        c['map']=dict(aspects=aspects, limitation=limitation, reviewed='2026-10-22')
        c['networks']=list(dict.fromkeys(c['networks']+[n for a in aspects for n in a['networks']]))
        c['sources']=list(dict.fromkeys(c['sources']+[s for a in aspects for s in a['sources']]))
        profiles[id]=c

    profile('gad-topic','Ansiedade',[
        aspect('anticipation','Antecipação e ameaça','threat salience','amygdala acc vmpfc','amygdala:acc amygdala:vmpfc','Estudos investigam relações frontoamigdalares durante processamento emocional.','Antecipar perigo envolve mais de uma região.','anxiety-circuits'),
        model('attention','Atenção e preocupação','executive','dlpfc parietal','dlpfc:parietal','Manter e deslocar o foco depende de redes de controle.','Preocupações podem disputar espaço com outras tarefas.','control gad-clinical'),
        model('body','Corpo e regulação','autonomic interoception','insula acc brainstem','insula:acc acc:brainstem','Sistemas centrais integram sinais corporais e ajustes autonômicos.','Sensações e contexto participam do que parece ameaçador.','autonomic intero')],
        'O TAG não tem um mapa único. Estas funções também participam da vida cotidiana e de outros quadros.')
    profile('panic-topic','Ansiedade',[
        aspect('body','Sensações e alarme','interoception salience','insula acc brainstem','insula:acc acc:brainstem','Ínsula e cíngulo aparecem em estudos de provocação e percepção corporal no pânico.','Sinais corporais e medo podem se alimentar.','panic-circuits'),
        aspect('threat','Antecipação de ameaça','threat','amygdala vmpfc','amygdala:vmpfc','Respostas amigdalares e pré-frontais dependem do tipo de tarefa.','Esperar uma crise também pode assustar.','panic-circuits'),
        model('context','Contexto e aprendizagem','memory threat','hippocampus vmpfc amygdala','hippocampus:amygdala hippocampus:vmpfc','A aprendizagem de contexto ajuda a discutir a evitação.','Lugares e lembranças podem mudar o que parece seguro.','extinction memory')],
        'O mapa não distingue pânico de problemas cardíacos, respiratórios ou outras causas. Não reduz a crise à amígdala.', 'Transtorno de pânico')
    profile('social-topic','Ansiedade',[
        aspect('evaluation','Ameaça social','threat salience','amygdala insula','amygdala:insula','A meta-análise de tarefas emocionais encontrou associações em amígdala e ínsula.','Ser observado pode parecer ameaçador.','anxiety-meta'),
        model('self','Pensar sobre si','default','vmpfc pcc','vmpfc:pcc','Rede de modo padrão é um exemplo de sistemas envolvidos em processos internos.','Pensar sobre como somos vistos usa várias redes.','dmn'),
        model('focus','Foco e contexto','executive attention','dlpfc parietal','dlpfc:parietal','Controle do foco é apresentado como função geral, não como defeito do transtorno.','A atenção pode ficar presa a sinais de julgamento.','control social-clinical')],
        'O estudo de 2007 não representa todas as situações sociais. Atividade dessas áreas não revela o que alguém pensa.')
    profile('phobia-topic','Ansiedade',[
        aspect('cue','Pistas de ameaça','threat salience','amygdala insula','amygdala:insula','Respostas a estímulos temidos envolvem regiões compartilhadas com outros processos.','Uma pista pode evocar uma reação intensa.','anxiety-meta'),
        model('learning','Aprendizagem e contexto','threat memory','amygdala hippocampus vmpfc','amygdala:hippocampus amygdala:vmpfc','O modelo de aprendizagem inclui contexto e novas relações de segurança.','Aprender algo novo não apaga automaticamente a história.','extinction memory')],
        'Não há um circuito cerebral exclusivo de cada objeto temido. As linhas não simulam exposição ou tratamento.')
    profile('agoraphobia-topic','Ansiedade',[
        model('safety','Segurança e contexto','threat memory','amygdala hippocampus vmpfc','amygdala:hippocampus hippocampus:vmpfc','Modelo geral para conversar sobre ameaça e contexto; não é um achado específico de agorafobia.','A possibilidade de sair ou obter ajuda muda o sentido de um lugar.','agora-clinical extinction memory'),
        model('body','Sensações e antecipação','interoception autonomic','insula acc brainstem','insula:acc acc:brainstem','Sinais internos e ajustes corporais são funções gerais relevantes à conversa.','O receio das sensações pode participar da evitação.','intero autonomic agora-clinical')],
        'Nesta edição não se apresenta uma assinatura neural específica de agorafobia. O destaque é exclusivamente didático.')
    profile('depression-topic','Humor',[
        aspect('internal','Pensamento interno','default','vmpfc pcc parietal','vmpfc:pcc pcc:parietal','Estudos de repouso investigam diferenças na coordenação da rede de modo padrão.','Pensamentos podem ficar difíceis de interromper.','depression-net'),
        aspect('control','Atenção e controle','executive','dlpfc parietal','dlpfc:parietal','A rede frontoparietal aparece em sínteses de conectividade da depressão.','Organizar uma tarefa pode exigir mais esforço.','depression-net'),
        model('reward','Interesse e ação','reward','basal ofc brainstem','brainstem:basal basal:ofc','Circuitos de aprendizagem por resultados ajudam a explicar a função, sem medir anedonia.','Interesse e disposição dependem de vários fatores.','reward addiction')],
        'Ruminação não é sinônimo de atividade de modo padrão. Estado clínico e métodos alteram os resultados.', 'Transtornos depressivos')
    profile('ocd-topic','Obsessões e compulsões',[
        aspect('loops','Ações e repetição','cstc','ofc basal thalamus','ofc:basal basal:thalamus thalamus:ofc','Alças córtico-estriado-talâmicas são um modelo importante na pesquisa do TOC.','Mudar uma ação envolve muitos caminhos, não um interruptor.','ocd-circuits','anatomy','A via inclui relés não desenhados. Núcleos da base são mostrados em conjunto; não é um trajeto completo nem uma única alça.'),
        model('control','Metas e flexibilidade','executive','dlpfc parietal','dlpfc:parietal','Funções de controle ajudam a discutir flexibilidade sem medir capacidade individual.','A dificuldade não se resume a querer parar.','control'),
        aspect('salience','Relevância e desconforto','salience','insula acc','insula:acc','Saliência e controle também aparecem em pesquisas transdiagnósticas.','Algo pode parecer urgente mesmo sem exigir uma ação.','cross-network')],
        'O modelo das alças é incompleto. Imagens não distinguem obsessão, intenção ou caráter.', 'Transtorno obsessivo-compulsivo (TOC)')
    profile('ptsd-topic','Trauma e estresse',[
        aspect('threat','Ameaça e regulação','threat salience','amygdala insula acc vmpfc','amygdala:insula amygdala:acc amygdala:vmpfc','Meta-análise de tarefas emocionais encontrou diferenças límbicas e pré-frontais em grupos com TEPT.','Lembretes podem provocar reações de perigo.','anxiety-meta'),
        model('memory','Memória e contexto','memory threat','hippocampus vmpfc','hippocampus:vmpfc','Memória contextual é apresentada como mecanismo geral de aprendizagem.','Lembrar e estar em perigo agora são experiências diferentes.','memory extinction'),
        model('stress','Corpo e estresse','stress autonomic','hypothalamus brainstem','hypothalamus:brainstem','Sistemas de estresse ligam cérebro, corpo e ambiente.','O corpo pode continuar mobilizado por muito tempo.','stress autonomic')],
        'Estes achados não comprovam que um trauma ocorreu nem explicam toda reação após trauma.', 'Transtorno de estresse pós-traumático (TEPT)')
    profile('adhd-topic','Neurodesenvolvimento',[
        aspect('attention','Atenção e controle','executive attention','dlpfc parietal','dlpfc:parietal','Estudos de tarefas apontam múltiplos sistemas, com resultados heterogêneos.','Manter uma meta depende também da tarefa e do ambiente.','adhd-task'),
        model('reward','Motivação e resultados','reward','basal ofc','basal:ofc','Aprendizagem por consequências é uma função geral, não uma leitura de dopamina.','Interesse e consequências mudam o envolvimento com uma tarefa.','reward'),
        model('internal','Foco interno e externo','default executive','pcc vmpfc dlpfc','pcc:vmpfc vmpfc:dlpfc','Uma meta-análise de repouso não encontrou convergência espacial consistente; este painel é didático.','Oscilar o foco não permite localizar um defeito.','adhd-null dmn')],
        'A ausência de convergência em repouso é explícita. Nenhuma combinação de regiões diagnostica TDAH.', 'TDAH')
    profile('bipolar-topic','Humor',[
        aspect('emotion','Processamento emocional','threat memory','amygdala hippocampus','amygdala:hippocampus','Tarefas emocionais mostraram um agrupamento de resultados na amígdala, estendendo-se ao hipocampo.','Mudanças de humor envolvem redes e contexto.','bipolar-net'),
        aspect('cognition','Cognição e tarefas','executive reward','ofc parietal','ofc:parietal','Análises de tarefas cognitivas encontraram diferenças parietais e orbitofrontais; a convergência depende da comparação.','Atenção e organização podem variar ao longo dos episódios.','bipolar-net'),
        model('drive','Motivação e ritmos','reward stress','basal ofc hypothalamus','basal:ofc ofc:hypothalamus','Funções de recompensa e regulação ilustram dimensões clínicas, sem medir mania.','Energia, sono e rotina precisam ser entendidos ao longo do tempo.','reward stress bipolar')],
        'Mania, depressão e períodos estáveis não têm um mesmo padrão fixo; o mapa não separa bipolar I e II.', 'Transtornos bipolares')
    profile('psychosis-topic','Psicoses',[
        aspect('salience','Relevância e interpretação','salience','insula acc','insula:acc','Redes de saliência aparecem em comparações entre diagnósticos.','Atribuir importância às experiências envolve vários sistemas.','cross-network'),
        aspect('control','Controle e coordenação','executive default','dlpfc parietal pcc vmpfc','dlpfc:parietal pcc:vmpfc','Interações entre controle e modo padrão são estudadas em grupos, com sobreposição diagnóstica.','Pensamento, foco e percepção podem mudar de formas diferentes.','cross-network')],
        'Psicose é uma síndrome com várias causas. O mesmo desenho não explica cada alucinação ou crença.', 'Esquizofrenia e outras psicoses')
    profile('autism-topic','Neurodesenvolvimento',[
        aspect('internal','Coordenação de redes','default','vmpfc pcc parietal','vmpfc:pcc pcc:parietal','A literatura de conectividade é heterogênea; não há padrão único no espectro.','Pessoas autistas têm perfis diversos.','autism-net'),
        model('sensory','Percepção e atenção','attention','temporal occipital parietal','temporal:parietal occipital:parietal','Áreas amplas ilustram integração sensorial geral; não delimitam diferenças de cada pessoa.','Sons, imagens e demandas podem ser vividos de maneiras diferentes.','yeo autism'),
        model('body','Sinais do corpo','interoception','insula acc','insula:acc','Interocepção é uma função humana geral, não uma medida de empatia.','Necessidades corporais e de suporte merecem atenção.','intero autism')],
        'Diferença não equivale a lesão. O atlas não representa um cérebro autista padrão nem estabelece necessidades individuais.', 'Autismo (TEA)')
    profile('substance-topic','Substâncias e comportamentos',[
        aspect('reward','Reforçamento e pistas','reward','brainstem basal ofc','brainstem:basal basal:ofc','Modelos incluem sistemas mesencefálicos e corticoestriatais de recompensa.','Pistas e consequências podem fortalecer a repetição.','addiction'),
        aspect('stress','Estresse e alívio','stress threat','amygdala hypothalamus brainstem','amygdala:hypothalamus hypothalamus:brainstem','Estresse e desconforto também participam dos modelos de dependência.','Buscar alívio pode se tornar parte do ciclo.','addiction'),
        aspect('control','Metas e escolhas','executive','dlpfc acc','dlpfc:acc','Sistemas de controle interagem com aprendizagem e contexto.','Condições de vida também afetam as possibilidades de mudança.','addiction')],
        'Substâncias, fases e trajetórias diferem. Estriado ventral e núcleos do mesencéfalo não estão separados no desenho.', 'Transtornos por uso de substâncias')
    profile('dissociation-topic','Dissociação',[
        aspect('integration','Integração da experiência','executive salience','dlpfc acc insula','dlpfc:acc acc:insula','Pequenos estudos relatam regiões pré-frontais, cinguladas e insulares, sem assinatura uniforme.','Sentir-se distante de si merece compreensão cuidadosa.','dissociation-net'),
        model('memory','Memória e contexto','memory','hippocampus temporal','hippocampus:temporal','Sistemas de memória ilustram uma função geral; não recuperam nem confirmam lembranças.','Uma lacuna de memória pode ter diferentes explicações.','memory dissociation')],
        'A revisão reúne diagnósticos e tarefas diferentes, com amostras pequenas. Nenhuma imagem comprova trauma ou identidades.', 'Transtornos dissociativos')
    profile('anorexia-topic','Alimentação',[
        aspect('value','Valor e alimentação','reward','ofc basal','ofc:basal','Revisões investigam avaliação e aprendizagem por recompensa em transtornos alimentares.','Alimentação envolve corpo, aprendizagem e contexto.','eating-net'),
        model('body','Corpo e percepção','interoception attention','insula parietal','insula:parietal','O esquema aproxima sinais internos e representação corporal; áreas amplas não são um mapa de autoimagem.','Perceber o corpo não é como olhar uma fotografia.','intero'),
        model('rules','Regras e flexibilidade','executive','dlpfc parietal','dlpfc:parietal','Controle e mudança de regras são funções gerais usadas para ensino.','Regras rígidas podem restringir a vida.','control')],
        'Desnutrição pode afetar resultados cerebrais. Não se pode separar causa, consequência e compensação por este mapa.')
    profile('bulimia-topic','Alimentação',[
        aspect('reward','Resultados e impulso','reward','ofc basal','ofc:basal','Estudos examinam respostas a recompensa e pistas alimentares.','Alívio e consequências podem participar dos ciclos.','eating-net'),
        model('body','Sinais e desconforto','interoception salience','insula acc','insula:acc','Sinais corporais e saliência são funções gerais, não marcadores de bulimia.','Sensações e emoções precisam ser compreendidas em contexto.','intero seeley'),
        model('control','Metas e ação','executive','dlpfc parietal','dlpfc:parietal','Controle executivo ilustra coordenação de ações, sem julgar força de vontade.','Uma dificuldade não define seu caráter.','control')],
        'Estudos variam conforme estado nutricional e tarefas. O brilho não mostra gravidade ou risco médico.')
    profile('binge-topic','Alimentação',[
        aspect('reward','Pistas e recompensa','reward','basal ofc','basal:ofc','Circuitos de recompensa são estudados em compulsão alimentar; resultados não são um teste individual.','Pistas e expectativas podem mudar o que se torna atraente.','eating-net'),
        model('control','Contexto e controle','executive interoception','dlpfc insula acc','dlpfc:acc insula:acc','Este conjunto reúne funções gerais de controle e sinais internos para ensino.','Fome, emoções, restrição e ambiente podem se combinar.','control intero')],
        'Compulsão alimentar não é inferida do peso. Sem estimativa de fome, impulsividade ou quantidade a comer.')
    profile('borderline-topic','Personalidade',[
        aspect('emotion','Emoção e contexto','threat default','amygdala pcc dlpfc','amygdala:dlpfc amygdala:pcc','Meta-análise de processamento emocional relatou diferenças em regiões límbicas e corticais.','Reações intensas envolvem relações entre sistemas.','borderline-meta'),
        model('regulation','Regulação e metas','executive salience','dlpfc acc insula','dlpfc:acc acc:insula','Saliência e controle ilustram funções gerais; não representam traços morais.','Regulação depende também de relações, apoio e aprendizagem.','control seeley')],
        'Os resultados de grupo não definem personalidade, intenção ou prognóstico de uma pessoa.')
    profile('insomnia-topic','Sono',[
        aspect('affect','Sono e processamento afetivo','salience','acc vmpfc','acc:vmpfc','A síntese de 2018 não encontrou convergência; a de 2023 encontrou um resultado no cíngulo subgenual e investigou sua conectividade com regiões mediais pré-frontais.','A pesquisa ainda está construindo explicações, sem um mapa definitivo.','insomnia-null insomnia-update','research','A subdivisão subgenual não está delimitada. Cíngulo e pré-frontal medial são localizações amplas; conectividade adicional não significa alteração de toda área destacada.'),
        model('arousal','Regulação e vigilância','autonomic stress','hypothalamus brainstem','hypothalamus:brainstem','Regulação corporal é uma dimensão geral, não uma assinatura específica da insônia.','Dormir envolve ajustes de muitos sistemas.','autonomic stress'),
        model('daytime','Atenção durante o dia','executive','dlpfc parietal','dlpfc:parietal','Redes de controle ajudam a explicar demandas cognitivas após noites difíceis.','Sono ruim pode tornar tarefas mais cansativas.','control insomnia-clinical')],
        'Sínteses diferem. O mapa não estima qualidade do sono nem demonstra dano cerebral.')
    profile('gambling-topic','Substâncias e comportamentos',[
        aspect('reward','Expectativa e resultados','reward','basal ofc vmpfc','basal:ofc basal:vmpfc','Meta-análise investiga associações pré-frontais, estriatais e límbicas no transtorno do jogo.','Expectativas e resultados podem alimentar a repetição.','gambling-meta'),
        model('control','Escolhas e contexto','executive salience','dlpfc acc insula','dlpfc:acc acc:insula','Controle e saliência são funções gerais; acesso e publicidade também importam.','O ambiente participa das escolhas, junto com a história de aprendizagem.','control seeley gambling-clinical')],
        'As linhas não calculam risco de dependência. Diferenças de grupo não determinam a próxima decisão.')

    # A stable, human-selected order; no severity ranking or personalized sorting.
    order = ['gad-topic','panic-topic','social-topic','phobia-topic','agoraphobia-topic',
             'depression-topic','bipolar-topic','ocd-topic','ptsd-topic','adhd-topic',
             'autism-topic','psychosis-topic','substance-topic','gambling-topic',
             'anorexia-topic','bulimia-topic','binge-topic','borderline-topic',
             'dissociation-topic','insomnia-topic']
    C[:] = [profiles[id] for id in order] + [c for c in C if c['id'] not in profiles]
