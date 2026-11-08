import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export class TestD1 {
  constructor() {
    this.db = new DatabaseSync(':memory:'); this.db.exec('PRAGMA foreign_keys=ON');
    for(const name of ['0000_swift_phalanx','0001_lovely_medusa','0002_unified_evidence','0003_gene_catalog'])this.db.exec(readFileSync(new URL('../../drizzle/'+name+'.sql',import.meta.url),'utf8'));
  }
  prepare(sql) {
    const state={params:[]},db=this.db;
    const statement={bind(...params){state.params=params;return statement},
      async all(){return {results:db.prepare(sql).all(...state.params)}},
      async first(){return db.prepare(sql).get(...state.params)||null},
      async run(){const r=db.prepare(sql).run(...state.params);return {success:true,meta:{changes:Number(r.changes)}}}};
    return statement;
  }
  async batch(statements) {
    this.db.exec('BEGIN');
    try{const result=[];for(let i=0;i<statements.length;i++) {if(i===this.failAt)throw Error('Injected transaction failure');result.push(await statements[i].run());}this.db.exec('COMMIT');return result;}
    catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  count(table){return this.db.prepare('SELECT count(*) AS n FROM '+table).get().n;}
  close(){this.db.close();}
}
