import gzip, sys, re, json
TABLES={'Lexeme','InflectedForm','Inflection','Source','Definition','EntryDefinition','EntryLexeme'}
def tuples(s):
    i=s.index(' VALUES ')+8; n=len(s)
    while i<n:
        if s[i]!='(': i+=1; continue
        i+=1; row=[]; buf=[]; inq=False; isnull=False
        while True:
            c=s[i]
            if inq:
                if c=='\\': buf.append({'n':'\n','t':'\t','0':'\0','r':'\r'}.get(s[i+1],s[i+1])); i+=2; continue
                if c=="'": inq=False; i+=1; continue
                buf.append(c); i+=1; continue
            if c=="'": inq=True; i+=1; continue
            if c==',' : row.append(''.join(buf)); buf=[]; i+=1; continue
            if c==')': row.append(''.join(buf)); i+=1; break
            buf.append(c); i+=1
        yield row
out={t:open(f'{t}.tsv','w',encoding='utf8') for t in TABLES}
cnt={t:0 for t in TABLES}
with gzip.open('/mnt/user-data/uploads/dex-database_sql.gz','rt',encoding='utf8',errors='replace') as f:
    for line in f:
        if not line.startswith('INSERT INTO `'): continue
        t=line[13:line.index('`',13)]
        if t not in TABLES: continue
        for r in tuples(line):
            out[t].write('\t'.join(x.replace('\t',' ') for x in r)+'\n'); cnt[t]+=1
print(cnt)
