import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {JSDOM} from 'jsdom';
import axe from 'axe-core';
registerHooks({load(url,c,next){if(url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText};return next(url,c);}});
const {default:SavedEvidence,SavedEvidenceResults}=await import('../components/SavedEvidence.tsx');
const assertion={id:'test',version:'test',subject:{id:'HGNC:1',name:'Test gene <script>alert(1)</script>',category:'gene'},object:{id:'GO:1',name:'Test process',category:'process'},predicate:'related_to',provider:'Test provider',sourceId:'source',sourceUrl:'https://example.org/source',retrievedAt:'2026-11-07',classification:'provider_assertion',stance:'reported',review:'unreviewed',publications:['PMID:123'],sources:['fixture'],urls:[],provenance:[],context:{species:null,tissue:null,population:null,direction:null,statistics:null,limitations:['Unreviewed']},original:null,originalHash:'test',retention:'references_only',license:null};
const data={gene:'IL2RA',assertions:[assertion],documents:[],collectionRecords:[],coverage:{assertions:1,documents:0,lastRetrieved:'2026-11-07',bounded:false},limitations:['Metadata only'],discoveries:[{id:'d',hypothesis:'Candidate test question',designation:'candidate hypothesis',entities:[assertion.subject,assertion.object],relationships:['test'],supporting:[assertion],contradictory:[],gaps:['Unknown species'],uncertainty:'No therapeutic conclusion',alreadyReported:'Unknown',questions:['Check the source'],priority:{total:1,factors:[{name:'Source to inspect',points:1}],meaning:'Review priority, not efficacy'}}]};
test('saved-evidence controls and expanded discovery content pass axe semantic rules',async()=>{
 const markup=renderToStaticMarkup(React.createElement(React.Fragment,null,React.createElement(SavedEvidence,{gene:'IL2RA'}),React.createElement(SavedEvidenceResults,{data})));
 const dom=new JSDOM('<!doctype html><html lang="en"><head><title>Test</title></head><body><main><h1>Connected research</h1>'+markup+'</main></body></html>',{runScripts:'outside-only'});
 for(const detail of dom.window.document.querySelectorAll('details'))detail.open=true;
 assert.equal(dom.window.document.querySelectorAll('script').length,0);
 for(const select of dom.window.document.querySelectorAll('select'))assert(select.closest('label'));
 dom.window.eval(axe.source);
 // jsdom has no layout. Contrast/responsive/focus appearance require the separate browser check.
 const result=await dom.window.axe.run(dom.window.document,{rules:{'color-contrast':{enabled:false}}});
 assert.equal(result.violations.length,0,JSON.stringify(result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.html)}))));
 dom.window.close();
});

const {CatalogResults}=await import('../components/GeneCatalog.tsx');
test('gene catalog can be explored with buttons and has accessible coverage labels',async()=>{
 const markup=renderToStaticMarkup(React.createElement(CatalogResults,{onSelect:()=>{},data:{genes:[{id:'ENSEMBL:ENSG00000134460',symbol:'IL2RA',status:'pending',last_seen:'2026-11-08',document:{predicates:['effector_gene_of'],sources:['Fixture predicted genes'],query:'MATCH example',endpoint:'https://example.org'},detail:[]}],coverage:{genes:1,updated:0,partial:0,failed:0,provider:'PanKgraph',sources:[{source:'Fixture predicted genes',genes:1}],backgroundEnabled:false,lastPage:'2026-11-08',lastComplete:null},limitations:['Coverage is incomplete.']}}));
 const dom=new JSDOM('<!doctype html><html lang="en"><head><title>Catalog</title></head><body><main><h1>Atlas</h1><h2>Gene catalog</h2>'+markup+'</main></body></html>',{runScripts:'outside-only'});
 assert.equal(dom.window.document.querySelector('button').textContent,'Explore IL2RA →');
 assert.match(dom.window.document.body.textContent,/Last completed catalog scan: Not yet recorded/);
 for(const d of dom.window.document.querySelectorAll('details'))d.open=true;
 dom.window.eval(axe.source);const result=await dom.window.axe.run(dom.window.document,{rules:{'color-contrast':{enabled:false}}});assert.equal(result.violations.length,0,JSON.stringify(result.violations));dom.window.close();
});
