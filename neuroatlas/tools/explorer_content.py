"""Original educational navigation and fictional stories; no diagnostic inference."""
def enrich_explorer(D):
    regions={r['id']:r for r in D['regions']}
    for c in D['conditions']:
        if not c.get('map'): continue
        for a in c['map']['aspects']:
            a['highlights']={n:{'basis':'teaching-selection','why':regions[n]['function'],
                'sources':regions[n]['sources'], 'contextSources':a['sources'],
                'limit':'Função geral e seleção editorial para este recorte. A área ampla não identifica um foco alterado em cada pessoa nem prova um mecanismo específico deste diagnóstico.'} for n in a['nodes']}
            a['connections']=[{'pair':p,'basis':'teaching','why':f"Relação de ensino entre {regions[p[0]]['short']} e {regions[p[1]]['short']} para acompanhar o recorte «{a['label']}».",
                'sources':a['sources'],'limit':'A fonte contextualiza o recorte; não valida esta linha como conexão direta medida. O traço não é fibra, direção causal, força de conexão ou hiperatividade. Relés e subdivisões foram omitidos.'} for p in a['links']]
    def F(id,name,summary,patient,nodes,nets,refs,members):
        return dict(id=id,name=name,summary=summary,patient=patient,nodes=nodes.split(),networks=nets.split(),sources=refs.split(),
                    members=[dict(condition=c+'-topic',aspect=a) for c,a in members])
    D['functions']=[
      F('attention','Atenção e metas','Manter uma tarefa, selecionar informação e lidar com distrações.','A atenção varia com a tarefa, o ambiente e o momento. Isso não revela sozinho um diagnóstico.','dlpfc parietal','executive attention','control', [('adhd','attention'),('depression','control'),('gad','attention'),('social','focus'),('insomnia','daytime'),('psychosis','control')]),
      F('threat','Ameaça e segurança','Relevância, aprendizagem e contexto das respostas defensivas.','Experiências podem mudar o que parece seguro ou ameaçador. Nenhuma região explica sozinha o medo.','amygdala hippocampus vmpfc','threat memory','fear fear-debate extinction',[('panic','threat'),('phobia','learning'),('ptsd','threat'),('gad','anticipation'),('social','evaluation'),('agoraphobia','safety')]),
      F('body','Corpo e regulação','Sinais internos e ajustes autonômicos em redes distribuídas.','Perceber o corpo depende de vários sistemas e do contexto. Uma sensação não identifica, por si só, sua causa.','insula acc brainstem hypothalamus','interoception autonomic','intero autonomic stress',[('panic','body'),('gad','body'),('agoraphobia','body'),('autism','body'),('bulimia','body'),('ptsd','stress')]),
      F('reward','Recompensa e motivação','Expectativas, resultados e seleção de ações.','Aprendemos com resultados e expectativas. Motivação não é uma quantidade de dopamina.','basal ofc brainstem','reward','reward',[('depression','reward'),('adhd','reward'),('substance','reward'),('gambling','reward'),('anorexia','value'),('bulimia','reward'),('binge','reward'),('bipolar','drive')]),
      F('memory','Memória e contexto','Codificar, recuperar e relacionar experiências.','Lembrar envolve vários sistemas e pode mudar com o contexto. Uma dificuldade de memória tem muitas explicações possíveis.','hippocampus temporal vmpfc','memory','memory sleep-memory extinction',[('panic','context'),('phobia','learning'),('agoraphobia','safety'),('ptsd','memory'),('dissociation','memory'),('bipolar','emotion')]),
      F('flexibility','Repetição e flexibilidade','Hábitos, regras e ajustes de ações diante de mudanças.','Repetir e mudar ações dependem da situação e da aprendizagem. Comportamentos parecidos podem ter sentidos muito diferentes.','ofc basal thalamus dlpfc parietal','cstc executive','ocd-circuits control',[('ocd','loops'),('ocd','control'),('anorexia','rules'),('substance','control'),('gambling','control'),('binge','control')]),
      F('sleep','Sono e vigília','Regulação do estado de alerta e suas relações com a atenção.','Sono e estado de alerta interagem com nossas experiências. Este desenho não mede o sono nem explica sozinho a insônia.','hypothalamus brainstem dlpfc parietal','autonomic executive','anatomy sleep-memory control',[('insomnia','arousal'),('insomnia','daytime'),('bipolar','drive')]),
      F('internal','Experiência interna','Pensar sobre si, lembrar e coordenar foco interno e externo.','Pensamentos internos fazem parte da vida. O significado deles depende da pessoa, da história e do contexto.','vmpfc pcc parietal','default','dmn yeo',[('depression','internal'),('social','self'),('adhd','internal'),('autism','internal'),('psychosis','control'),('borderline','emotion'),('dissociation','integration')])
    ]
    # Stories illustrate ordinary experiences, never attribute a diagnosis or a measured brain state.
    scenes=[
      ('attention','Uma leitura interrompida','Uma pessoa fictícia tenta ler enquanto chegam avisos.',[
        ('Situação','Ao abrir um texto, uma notificação aparece. A cena inventada não representa uma avaliação de atenção.','dlpfc parietal'),
        ('Corpo','A pessoa percebe cansaço e tensão nos ombros. Esses sinais não revelam uma causa única.','insula acc'),
        ('Atenção','A leitura e a notificação competem pelo foco. As regiões destacadas são exemplos de sistemas participantes.','dlpfc parietal'),
        ('Ação','Na história, a pessoa alterna entre o texto e o aviso. Isso descreve uma escolha fictícia, não uma recomendação.','dlpfc parietal'),
        ('Consequência','Ao voltar ao texto, precisa reencontrar o ponto da leitura. Contexto, experiência e sono também influenciam esse processo.','hippocampus dlpfc')]),
      ('threat','Um som inesperado','Uma cena cotidiana sobre surpresa e contexto.',[
        ('Situação','Um objeto cai na sala ao lado. Esta é uma cena inventada, sem associação a um diagnóstico.','amygdala hippocampus'),
        ('Corpo','A pessoa nota o coração acelerar por um instante. A sensação não permite medir o que ocorreu em cada região.','insula brainstem'),
        ('Atenção','O som chama a atenção. Respostas defensivas e experiência consciente não são a mesma coisa.','amygdala acc'),
        ('Ação','Na história, a pessoa olha em direção ao som. O desenho não mostra a sequência de disparos neurais.','parietal frontal'),
        ('Consequência','Ao ver o objeto, o contexto ganha outro significado. Novas aprendizagens podem coexistir com as anteriores.','hippocampus vmpfc')]),
      ('reward','Uma nova receita','Expectativa e resultado em uma atividade comum.',[
        ('Situação','Uma pessoa fictícia testa uma receita pela primeira vez. Ela espera um resultado parecido com a fotografia.','ofc basal'),
        ('Corpo','Ao sentir o aroma, percebe sinais do corpo. Fome, cultura e experiência também importam.','insula hypothalamus'),
        ('Atenção','A pessoa observa o aspecto e o aroma do prato. O destaque resume funções, não atividade medida.','parietal ofc'),
        ('Ação','Ela experimenta o resultado na cena inventada. Uma ação cotidiana envolve muitos sistemas além dos mostrados.','basal frontal'),
        ('Consequência','O resultado é diferente do esperado e informa expectativas futuras. Isso não equivale a medir prazer ou dopamina.','ofc basal')]),
      ('memory','Um encontro em novo lugar','Como contexto e atenção participam da memória.',[
        ('Situação','Uma personagem conhece um lugar pela primeira vez. Não há nome, registro ou dado de pessoa real.','hippocampus temporal'),
        ('Corpo','Ela percebe o calor do ambiente. Sinais corporais são parte da experiência, não um teste de memória.','insula'),
        ('Atenção','Uma pintura chama a atenção durante a conversa. Nem todos os detalhes recebem o mesmo foco.','parietal dlpfc'),
        ('Ação','Na história, ela relaciona a pintura a algo já conhecido. A lembrança depende de sistemas distribuídos.','hippocampus temporal'),
        ('Consequência','Mais tarde, a pintura ajuda a recordar o local. Lembrar é reconstruir, e não reproduzir uma gravação perfeita.','hippocampus temporal')]),
      ('flexibility','Um caminho que mudou','Repetição e ajuste em um exemplo cotidiano.',[
        ('Situação','Uma pessoa fictícia chega a um corredor que costuma usar. Hoje há uma placa indicando outro caminho.','hippocampus basal'),
        ('Corpo','Ela percebe uma breve tensão diante da mudança. Isso não é sinal específico de qualquer transtorno.','insula acc'),
        ('Atenção','A placa passa a ser relevante para a tarefa. O destaque não mede o desconforto da personagem.','acc parietal'),
        ('Ação','Ela escolhe uma rota diferente nesta história. Ajustar ações envolve contexto, metas e aprendizagem.','dlpfc basal'),
        ('Consequência','A nova rota passa a fazer parte da experiência. Repetição, por si só, não demonstra compulsão ou diagnóstico.','hippocampus ofc')]),
      ('sleep','Uma manhã após pouco sono','Relações entre vigília e atenção, sem prever desempenho.',[
        ('Situação','Uma personagem dormiu menos que o habitual. A duração exata não é usada como medida ou recomendação.','hypothalamus brainstem'),
        ('Corpo','Ela percebe sonolência ao iniciar a manhã. A sensação pode variar entre pessoas e situações.','brainstem insula'),
        ('Atenção','Uma tarefa parece exigir mais esforço naquela cena. Isso não estima capacidade nem identifica insônia.','dlpfc parietal'),
        ('Ação','Na história, ela relê uma instrução. O exemplo não é uma orientação de tratamento.','dlpfc parietal'),
        ('Consequência','Ela se lembra de parte do que leu, mas perde um detalhe. O exemplo não prevê o efeito de uma noite sobre outra pessoa.','hippocampus temporal')])
    ]
    D['stories']=[dict(id=id,title=title,intro=intro,function=id,steps=[dict(label=l,text=t,nodes=n.split()) for l,t,n in steps],
        sources=next(f['sources'] for f in D['functions'] if f['id']==id),
        limitation='A ordem organiza a narrativa; não é uma cadeia causal entre regiões, um fluxo de impulsos nem uma explicação individual. Os sistemas atuam de modo sobreposto.') for id,title,intro,steps in scenes]
