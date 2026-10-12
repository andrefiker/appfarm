import json
from pathlib import Path
r=Path(__file__).parent
t=(r/'web/index.in.html').read_text()
for key,name in [('STYLE','style.css'),('MODEL','model.js'),('APP','app.js')]:t=t.replace('__'+key+'__',(r/'web'/name).read_text())
snapshot=r/'web/snapshot.json'
data=json.loads((snapshot if snapshot.exists() else r/'web/demo.json').read_text())
t=t.replace('__DATA__',json.dumps(data,ensure_ascii=False).replace('<','\\u003c'))
(r/'web/index.html').write_text(t)
print('Built self-contained offline HTML')
