(function(){
"use strict";
var LS=window.localStorage,D=window.DC_I18N||{},EN={poll_you:"You picked:"};
function get(k){try{return LS.getItem(k)}catch(e){return null}}
function set(k,v){try{LS.setItem(k,v)}catch(e){}}
var nodes=document.querySelectorAll("[data-i18n]");
for(var i=0;i<nodes.length;i++){var n=nodes[i],k=n.getAttribute("data-i18n");if(!(k in EN))EN[k]=n.textContent}
function t(k,l){return (D[l]&&D[l][k])||EN[k]||""}
var cur="en";
function apply(l){
 if(l!=="en"&&!D[l])l="en";cur=l;
 document.documentElement.lang=l;
 for(var i=0;i<nodes.length;i++){var n=nodes[i];n.textContent=t(n.getAttribute("data-i18n"),l)}
 var s=document.getElementById("lang");if(s)s.value=l;
 renderPoll();
}
var sel=document.getElementById("lang");
if(sel)sel.addEventListener("change",function(){set("dc-lang",sel.value);apply(sel.value)});
/* poll: votes live only in this browser's localStorage */
var qs=document.querySelectorAll(".q[data-q]");
function votes(){try{return JSON.parse(get("dc-poll")||"{}")||{}}catch(e){return {}}}
function renderPoll(){
 var v=votes();
 for(var i=0;i<qs.length;i++){
  var q=qs[i],id=q.getAttribute("data-q"),b=q.querySelectorAll(".opt"),pick=null;
  for(var j=0;j<b.length;j++){var on=v[id]===b[j].getAttribute("data-v");b[j].setAttribute("aria-pressed",on?"true":"false");if(on)pick=b[j].textContent}
  q.querySelector(".res").textContent=pick?t("poll_you",cur)+" "+pick+" ✓":"";
 }
}
for(var i=0;i<qs.length;i++)(function(q){
 q.addEventListener("click",function(e){var b=e.target.closest(".opt");if(!b)return;var v=votes();v[q.getAttribute("data-q")]=b.getAttribute("data-v");set("dc-poll",JSON.stringify(v));renderPoll()});
})(qs[i]);
var clr=document.getElementById("poll-clear");
if(clr)clr.addEventListener("click",function(){try{LS.removeItem("dc-poll")}catch(e){}renderPoll()});
/* active bottom-nav item */
var bl=document.querySelectorAll(".bnav a");
if(bl.length&&"IntersectionObserver" in window){
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var id="#"+e.target.id;for(var j=0;j<bl.length;j++){var on=bl[j].getAttribute("href")===id;bl[j].classList.toggle("on",on);if(on)bl[j].setAttribute("aria-current","true");else bl[j].removeAttribute("aria-current")}}})},{rootMargin:"-45% 0px -50% 0px"});
 ["home","finds","events","business","contact"].forEach(function(id){var el=document.getElementById(id);if(el)io.observe(el)});
}
var m=/[?&]lang=(en|af|xh|zu)\b/.exec(location.search);
apply(m?m[1]:(get("dc-lang")||"en"));
})();
