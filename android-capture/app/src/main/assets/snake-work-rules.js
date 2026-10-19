/* Snake Finance - pure classification rules for notification drafts.
 * No transaction is created by this module. Values are hints, not proof.
 */
(function(root){
  'use strict';
  function classify(input){
    const text=String(input.text||'').toLowerCase();
    const account=String(input.account||'').toLowerCase();
    const amount=Number(input.amountCents);
    const weekday=Number(input.weekday);
    const hour=Number(input.hour);
    const workday=[2,3,4].includes(weekday);
    if(!Number.isSafeInteger(amount)||amount<=0)return null;
    if(/estacionamento|parking|zona azul/.test(text)&&workday&&hour>=5&&hour<13&&amount===600&&['c6','xp'].includes(account))
      return {category:'trab',sub:'Estacionamento',confidence:'high'};
    if(/almo[cç]o|restaurante|refei[cç][aã]o/.test(text)&&workday&&account==='caju')
      return {category:'trab',sub:'Refeição',confidence:'high'};
    if(/abastec|combust[ií]vel|posto de gasolina/.test(text)&&account==='caju')
      return {category:'trab',sub:'Combustível',confidence:'high'};
    if(/abastec|combust[ií]vel|posto de gasolina/.test(text)&&['c6','xp','carbon'].includes(account))
      return {category:'abs',sub:'Uso pessoal',confidence:'medium'};
    return null;
  }
  root.SnakeWorkRules=Object.freeze({classify});
})(typeof window!=='undefined'?window:globalThis);
