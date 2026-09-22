/* R13.3 - Detalhamento de categoria delegado ao motor canonico.
   Evita duas fontes de verdade para mes, recorrencias e totais. */
(()=>{
 function delegate(category){
   if(window.FinanceIntegrity&&typeof window.FinanceIntegrity.openCategory==='function'){
     return window.FinanceIntegrity.openCategory(category);
   }
   console.warn('[CategoryDetail] Motor canonico ainda nao disponivel',category);
 }
 window.CategoryDetailLegacy={open:delegate};
})();
