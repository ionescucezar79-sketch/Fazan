# Genereaza definitiile pentru joc din TSV-urile extrase cu extrage_tabele.py.
# Utilizare (in folderul cu TSV-uri si out/fazan_jucabil.txt): python genereaza_definitii.py <director_iesire>
import collections, json, re, os, sys
DEST=sys.argv[1] if len(sys.argv)>1 else 'out/def'
SURSE={'1':"DEX '98",'2':"DEX '96"}
# 1. definitii active din surse distribuibile
defs={}
for l in open('Definition.tsv',encoding='utf8',errors='replace'):
    r=l.rstrip('\n').split('\t')
    if len(r)<6 or not r[0].isdigit(): continue
    if r[2] in SURSE and r[5]=='0': defs[r[0]]=(r[2],r[4])
# 2. entry -> definitii (ordonate)
ent_def=collections.defaultdict(list)
for l in open('EntryDefinition.tsv',encoding='utf8'):
    r=l.rstrip('\n').split('\t')
    if r[2] in defs: ent_def[r[1]].append((int(r[4]),int(r[2])))
lex_ent=collections.defaultdict(list)
for l in open('EntryLexeme.tsv',encoding='utf8'):
    r=l.rstrip('\n').split('\t'); lex_ent[r[2]].append((int(r[3]),r[1]))
lex={}
for l in open('Lexeme.tsv',encoding='utf8'):
    r=l.rstrip('\n').split('\t'); lex[r[0]]=r[2]
play=set(w for w in open('out/fazan_jucabil.txt',encoding='utf8').read().split())

def curata(t):
    t=re.sub(r'\{\{.*?\}\}','',t)            # note de subsol
    t=t.replace("\\'",'\x00').replace("'",'').replace('\x00',"'")  # accentul
    t=re.sub(r'[@$#%_^]','',t)
    t=t.replace('\\','')
    t=re.sub(r'\[[^\]]*\]','',t) if t.startswith('[') else t
    t=re.sub(r'(?<=[a-zăâîșțA-ZĂÂÎȘȚ])[1-9]\b','',t)  # indicii de omonim (casă1)
    t=t.replace('**','◊').replace(' * ',' ♦ ')
    t=re.sub(r'\s+',' ',t).strip()
    return t
CAT={'s. m.':'substantiv masculin','s. f.':'substantiv feminin','s. n.':'substantiv neutru','adj.':'adjectiv','adv.':'adverb','vb.':'verb','v. tr.':'verb tranzitiv','v. intr.':'verb intranzitiv','v. refl.':'verb reflexiv','interj.':'interjecție','prep.':'prepoziție','conj.':'conjuncție','pron.':'pronume','num.':'numeral','s. m. și f.':'substantiv masculin și feminin'}
def scurteaza(raw, lemma):
    t=curata(raw)
    # scoate cuvantul-titlu si formele de dupa el, pana la categoria gramaticala
    m=re.search(r'\b(s\. m\. și f\.|s\. m\.|s\. f\.|s\. n\.|adj\.|adv\.|vb\.|v\. tr\.|v\. intr\.|v\. refl\.|interj\.|prep\.|conj\.|pron\.|num\.)', t)
    cat=None
    if m and m.start()<120:
        cat=CAT.get(m.group(1)); t=t[m.end():].strip(' ,;')
    # taie etimologia de la final ("– Din fr. ...", "– Lat. ...")
    t=re.split(r'\s[–-]\s(?=(Din|Lat|Cf|Et\. nec|Formație|Pref|Probabil|Onomatopee|Comp|De la|Sl|Tc|Fr|Ngr|Magh|Germ|It|Rus|Engl|Bg|Sb|Ucr|Pol|Alb)\b)',t)[0]
    t=t.strip(' ,;:')
    t=re.sub(r'^\(?[IVX]+\.\)?\s*','',t)
    if len(t)>420:
        cut=t[:420]; p=max(cut.rfind('. '),cut.rfind('; '))
        t=(cut[:p+1] if p>150 else cut.rsplit(' ',1)[0])+' …'
    return cat,t

def best_def(lexid):
    cands=[]
    for er,e in sorted(lex_ent.get(lexid,[])):
        for dr,d in sorted(ent_def.get(e,[])):
            s,raw=defs[str(d)]
            cands.append((0 if s=='1' else 1, er, dr, raw, s))
    if not cands: return None
    cands.sort(key=lambda x:x[:3]); return cands[0]

N=str.maketrans('ăâîșț','aaist'); norm=lambda s:s.translate(N)
L={}; F={}; cover=0
formlex=collections.defaultdict(set)
for l in open('InflectedForm.tsv',encoding='utf8'):
    r=l.rstrip('\n').split('\t')
    if r[2] in play: formlex[r[2]].add(r[4])
for form,lids in formlex.items():
    alese=[]
    for lid in lids:
        b=best_def(lid)
        if not b: continue
        lemma=lex[lid].lower()
        if lemma not in L:
            cat,txt=scurteaza(b[3],lemma)
            if len(txt)<3: continue
            L[lemma]={'c':cat,'t':txt,'s':SURSE[b[4]]} if cat else {'t':txt,'s':SURSE[b[4]]}
        if lemma not in alese: alese.append(lemma)
    if not alese: continue
    alese.sort(key=lambda x:(x!=form, x))   # forma exacta prima
    alese=alese[:3]
    if alese!=[form]: F[form]=alese
    cover+=1
print('forme cu definitie',cover,'din',len(play),f'({cover/len(play):.0%})','leme',len(L))
grup=collections.defaultdict(lambda:{'L':{},'F':{}})
for lemma,d in L.items(): grup[norm(lemma)[:3]]['L'][lemma]=d
for f,lemma in F.items(): grup[norm(f)[:3]]['F'][f]=lemma
os.makedirs(DEST,exist_ok=True)
for p,g in grup.items(): json.dump(g,open(f'{DEST}/{p}.json','w',encoding='utf8'),ensure_ascii=False,separators=(',',':'))
for w in ['fazan','fazanului','casă','ornamentalilor','țigăniseră','mergeau','știință','uluind','calitatea']:
    for lm in F.get(w,[w]): print(w,'->',lm,'|',str(L.get(lm))[:130])
