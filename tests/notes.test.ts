import assert from 'node:assert/strict';
import test from 'node:test';
import { collectNotes, filterNotes } from '../src/features/notes/selectors';
import type { Client, Lead } from '../src/types';
test('anotações de cliente convertido prevalecem sem duplicar a mesma nota do lead', () => {
  const note=JSON.stringify([{id:'note-1',text:'Vistoria',createdAt:'2026-10-14T12:00:00Z',proposalCode:'PROP-REAL',images:['foto']}]);
  const client={id:'c',name:'Cliente',notes:note} as Client;
  const lead={id:'l',name:'Interessado',status:'ganho',clientId:'c',notes:note} as Lead;
  const notes=collectNotes([lead],[client]);assert.equal(notes.length,1);assert.equal(notes[0].targetType,'client');assert.equal(notes[0].targetId,'c');
  assert.equal(filterNotes(notes,{typeFilter:'all',onlyWithImages:true,proposalFilter:'with_proposal',searchTerm:'prop-real',sortBy:'recent'}).length,1);
  assert.equal(filterNotes(notes,{typeFilter:'lead',onlyWithImages:false,proposalFilter:'all',searchTerm:'',sortBy:'recent'}).length,0);
});
